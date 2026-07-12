// Worker 原生可用的 SMTP 发送客户端，基于 cloudflare:sockets（TCP）。
//
// 为什么不用 nodemailer：本项目 API 运行在 Cloudflare Worker 上，运行时没有
// Node 的 net/tls 原生模块，nodemailer 的 SMTP 传输无法建立连接（在 Worker
// 边缘节点上必然失败）。Cloudflare 提供 cloudflare:sockets 这个 TCP 接口，
// 我们用它在 Worker 里直接实现 SMTP 握手。
//
// 设计对齐 FlecBlog（Go gomail）邮件发送逻辑：
//   - 加密方式 none / ssl / starttls（ssl=465 隐式 TLS，starttls=587 升级，
//     none=25 明文，后两者由 Cloudflare 的 secureTransport 直接处理）
//   - 发件人地址解析：显示名 + 地址；地址缺省回退到 SMTP 登录账号
//   - 认证用 AUTH LOGIN（base64 用户名/密码）
import { connect } from 'cloudflare:sockets'

export type SmtpSecure = 'none' | 'ssl' | 'starttls'

export interface SmtpSendConfig {
  host: string
  port: number
  secure: SmtpSecure
  user: string
  pass: string
}

export interface SmtpSendInput {
  from: string // 发件人邮箱（通常为 SMTP 登录账号）
  fromName: string // 显示名
  to: string
  subject: string
  text: string
  html: string
}

// UTF-8 字符串 -> base64（Worker 环境）
function b64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

// 把 base64 文本按 76 字符折行，符合 SMTP 规范
function wrap64(s: string): string {
  const out: string[] = []
  for (let i = 0; i < s.length; i += 76) out.push(s.slice(i, i + 76))
  return out.join('\r\n')
}

function secureTransportOf(secure: SmtpSecure): 'on' | 'starttls' | 'off' {
  if (secure === 'ssl') return 'on'
  if (secure === 'starttls') return 'starttls'
  return 'off'
}

export async function sendSmtpMail(cfg: SmtpSendConfig, msg: SmtpSendInput): Promise<void> {
  const socket = connect(`${cfg.host}:${cfg.port}`, { secureTransport: secureTransportOf(cfg.secure) })
  const writer = socket.writable.getWriter()
  const reader = socket.readable.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let closed = false

  const close = () => {
    if (closed) return
    closed = true
    try {
      writer.close().catch(() => {})
    } catch {}
    try {
      reader.cancel().catch(() => {})
    } catch {}
  }

  const writeLine = async (line: string) => {
    await writer.write(new TextEncoder().encode(line + '\r\n'))
  }

  // 读取一行（到 \r\n 为止），返回不含 \r\n 的文本
  const readLine = async (): Promise<string> => {
    while (true) {
      const idx = buffer.indexOf('\r\n')
      if (idx >= 0) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        return line
      }
      const { value, done } = await reader.read()
      if (done) throw new Error('SMTP 连接在对端响应前被关闭')
      if (value && value.length) buffer += decoder.decode(value, { stream: true })
    }
  }

  // 读取一个 SMTP 回复（可能多行，以「NNN 」结尾），返回状态码与末行文本
  const readReply = async (): Promise<{ code: number; text: string }> => {
    let code = 0
    let text = ''
    while (true) {
      const line = await readLine()
      const m = /^(\d{3})([- ])(.*)$/.exec(line)
      if (!m) throw new Error('SMTP 响应格式异常: ' + JSON.stringify(line))
      code = parseInt(m[1], 10)
      text = m[3]
      if (m[2] === ' ') break // 末行（空格分隔）
    }
    return { code, text }
  }

  try {
    // 1. 服务就绪 220
    let r = await readReply()
    if (r.code !== 220) throw new Error('SMTP 握手失败: ' + r.code + ' ' + r.text)

    // 2. EHLO
    await writeLine('EHLO ' + (cfg.host || 'localhost'))
    r = await readReply()
    if (r.code !== 250) throw new Error('EHLO 失败: ' + r.code + ' ' + r.text)

    // 3. AUTH LOGIN（base64 用户名 / 密码）
    await writeLine('AUTH LOGIN')
    r = await readReply()
    if (r.code !== 334) throw new Error('AUTH 初始化失败: ' + r.code + ' ' + r.text)
    await writeLine(b64(cfg.user))
    r = await readReply()
    if (r.code !== 334) throw new Error('AUTH 用户名失败: ' + r.code + ' ' + r.text)
    await writeLine(b64(cfg.pass))
    r = await readReply()
    if (r.code !== 235) throw new Error('AUTH 失败（账号或授权码错误）: ' + r.code + ' ' + r.text)

    // 4. 信封：MAIL FROM / RCPT TO（用登录账号作为信封发件人，兼容性最好）
    await writeLine('MAIL FROM:<' + (cfg.user || msg.from) + '>')
    r = await readReply()
    if (r.code !== 250) throw new Error('MAIL FROM 失败: ' + r.code + ' ' + r.text)
    await writeLine('RCPT TO:<' + msg.to + '>')
    r = await readReply()
    if (r.code !== 250) throw new Error('RCPT TO 失败: ' + r.code + ' ' + r.text)

    // 5. DATA：构建 MIME 多部分邮件（正文 base64，规避换行/点号转义问题）
    await writeLine('DATA')
    r = await readReply()
    if (r.code !== 354) throw new Error('DATA 失败: ' + r.code + ' ' + r.text)

    const boundary = '----=_Part_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2)
    const fromHeader = msg.fromName ? `"${msg.fromName}" <${msg.from}>` : msg.from
    const subjectHeader = '=?UTF-8?B?' + b64(msg.subject) + '?='
    const dateHeader = new Date().toUTCString().replace('GMT', '+0000')

    let data = ''
    data += 'From: ' + fromHeader + '\r\n'
    data += 'To: ' + msg.to + '\r\n'
    data += 'Subject: ' + subjectHeader + '\r\n'
    data += 'Date: ' + dateHeader + '\r\n'
    data += 'MIME-Version: 1.0\r\n'
    data += 'Content-Type: multipart/alternative; boundary="' + boundary + '"\r\n'
    data += '\r\n'
    data += '--' + boundary + '\r\n'
    data += 'Content-Type: text/plain; charset=UTF-8\r\n'
    data += 'Content-Transfer-Encoding: base64\r\n'
    data += '\r\n'
    data += wrap64(b64(msg.text)) + '\r\n'
    data += '--' + boundary + '\r\n'
    data += 'Content-Type: text/html; charset=UTF-8\r\n'
    data += 'Content-Transfer-Encoding: base64\r\n'
    data += '\r\n'
    data += wrap64(b64(msg.html)) + '\r\n'
    data += '--' + boundary + '--\r\n'

    // 以 \r\n.\r\n 结束 DATA 阶段
    await writeLine(data + '\r\n.')
    r = await readReply()
    if (r.code !== 250) throw new Error('邮件提交失败: ' + r.code + ' ' + r.text)

    // 6. QUIT
    await writeLine('QUIT')
    await readReply().catch(() => {})
  } finally {
    close()
  }
}
