import { eq, inArray } from 'drizzle-orm'
import { siteSettings } from '@blog/db'
import { defaultSettings } from '@blog/shared'
import type { DB } from '../db'
import {
  type MailConfig,
  type SmtpConfig,
  type NotifyParams,
  type BuiltNotification,
  buildNotification,
} from './email-notify'
import { sendSmtpMail } from './smtp'
import { isValidEmail, DEFAULT_REPLY_TPL, DEFAULT_ADMIN_TPL } from './email-tpl'

export type { MailConfig, SmtpConfig, NotifyParams, BuiltNotification } from './email-notify'

// 把存储的 mailSmtpSecure 值统一映射为 none/ssl/starttls。
// 旧前端存的是 '1'/'0' 布尔；新前端存的是 'ssl'/'starttls'/'none'。
function mapToSecure(raw: string): 'none' | 'ssl' | 'starttls' {
  const v = (raw || '').trim().toLowerCase()
  if (v === 'none') return 'none'
  if (v === 'starttls' || v === '0') return 'starttls'
  return 'ssl' // 'ssl' / '1' / 缺省 → SSL
}

// 读取并校验邮件配置；任何不达标都返回 null（即不发邮件，安全降级）
export async function loadMailConfig(db: DB): Promise<MailConfig | null> {
  const keys = [
    'mailEnabled',
    'mailProvider',
    'mailApiKey',
    'mailGatewayUrl',
    'mailGatewayToken',
    'mailSmtpHost',
    'mailSmtpPort',
    'mailSmtpUser',
    'mailSmtpPass',
    'mailSmtpSecure',
    'mailFromEmail',
    'mailFromName',
    'mailTemplateReply',
    'mailTemplateAdmin',
    'siteTitle',
    'adminEmail',
    'siteUrl',
  ]
  const rows = await db
    .select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(inArray(siteSettings.key as any, keys))
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value

  const enabled = (map.mailEnabled ?? defaultSettings.mailEnabled) === 'true'
  if (!enabled) return null

  // SMTP 配置：user + pass 都填才生效
  const smtpUser = map.mailSmtpUser ?? defaultSettings.mailSmtpUser
  const smtpPass = map.mailSmtpPass ?? defaultSettings.mailSmtpPass
  let smtp: SmtpConfig | undefined
  if (smtpUser && smtpPass) {
    smtp = {
      host: map.mailSmtpHost || defaultSettings.mailSmtpHost,
      port: parseInt(map.mailSmtpPort || defaultSettings.mailSmtpPort, 10) || 465,
      user: smtpUser,
      pass: smtpPass,
      // 加密方式：none / ssl / starttls。
      // 旧值兼容：'1'(或 ssl) → ssl；'0'(或 starttls) → starttls；none → none。
      secure: mapToSecure(map.mailSmtpSecure ?? defaultSettings.mailSmtpSecure),
    }
  }

  const rawProvider = (map.mailProvider ?? defaultSettings.mailProvider) || 'none'
  const provider: 'resend' | 'gateway' | 'none' =
    rawProvider === 'gateway' ? 'gateway' : rawProvider === 'none' ? 'none' : 'resend'
  const fromEmail = map.mailFromEmail ?? defaultSettings.mailFromEmail
  const apiKey = map.mailApiKey ?? ''
  const gatewayUrl = map.mailGatewayUrl ?? ''
  const gatewayToken = map.mailGatewayToken ?? ''

  // 至少有一条路可用（SMTP 或网关）
  const hasSmtp = !!(smtp && smtp.user && smtp.pass)
  const hasResend = provider === 'resend' && !!apiKey
  const hasGateway = provider === 'gateway' && !!(gatewayUrl && gatewayToken)
  if (!hasSmtp && !hasResend && !hasGateway) return null

  return {
    smtp,
    provider,
    apiKey,
    gatewayUrl,
    gatewayToken,
    fromEmail,
    fromName: map.mailFromName ?? defaultSettings.mailFromName,
    templateReply: map.mailTemplateReply || defaultSettings.mailTemplateReply || DEFAULT_REPLY_TPL,
    templateAdmin: map.mailTemplateAdmin || defaultSettings.mailTemplateAdmin || DEFAULT_ADMIN_TPL,
    siteTitle: map.siteTitle ?? defaultSettings.siteTitle,
    adminEmail: map.adminEmail ?? defaultSettings.adminEmail,
    siteUrl: map.siteUrl ?? defaultSettings.siteUrl,
  }
}

interface SendInput {
  to: string
  subject: string
  text: string
  html: string
}

// 实际发送：SMTP 直连优先（基于 cloudflare:sockets，兼容 Cloudflare Worker），
// 失败自动回退 HTTP 网关。任何异常最终由调用方（路由 try/catch）兜底，不阻断评论主流程。
async function sendMail(cfg: MailConfig, input: SendInput): Promise<void> {
  let lastError: Error | null = null

  // 1. SMTP 直连（优先）
  if (cfg.smtp && cfg.smtp.user && cfg.smtp.pass) {
    try {
      const fromAddr = cfg.fromEmail || cfg.smtp.user
      await sendSmtpMail(
        {
          host: cfg.smtp.host,
          port: cfg.smtp.port,
          secure: cfg.smtp.secure,
          user: cfg.smtp.user,
          pass: cfg.smtp.pass,
        },
        {
          from: fromAddr,
          fromName: cfg.fromName || cfg.siteTitle || '',
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html,
        },
      )
      return // SMTP 成功，直接返回
    } catch (e: any) {
      lastError = e
      console.error('[mail] SMTP 发送失败，尝试回退到备用网关:', e?.message || String(e))
      // 继续尝试备用网关
    }
  }

  // 2. 备用 HTTP 网关（Resend 或自建）
  const gatewayFromEmail = cfg.fromEmail || cfg.smtp?.user || ''
  const from = cfg.fromName
    ? `"${cfg.fromName}" <${gatewayFromEmail}>`
    : gatewayFromEmail

  if (cfg.provider === 'resend' && cfg.apiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Resend 发送失败 (${res.status})${lastError ? '（SMTP 已失败）' : ''}: ${body.slice(0, 200)}`)
    }
    return
  }

  if (cfg.provider === 'gateway' && cfg.gatewayUrl && cfg.gatewayToken) {
    const res = await fetch(cfg.gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.gatewayToken}` },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text, html: input.html }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`邮件网关发送失败 (${res.status})${lastError ? '（SMTP 已失败）' : ''}: ${body.slice(0, 200)}`)
    }
    return
  }

  // 备用网关也没配置 → 如果 SMTP 失败了就是最终失败
  if (lastError) throw lastError
}

// 评论写入后调用：先按配置组装通知，再发送。异常不应阻断评论主流程（路由已 try/catch）。
export async function notifyOnNewComment(db: DB, p: NotifyParams): Promise<void> {
  const cfg = await loadMailConfig(db)
  if (!cfg) return
  const built = buildNotification(p, cfg)
  if (!built) return
  await sendMail(cfg, built)
}

/** 从管理端触发的测试发信：加载当前邮件配置，向指定地址发送一封测试邮件。 */
export async function sendTestEmail(db: DB, to: string): Promise<{ ok: boolean; message: string }> {
  const cfg = await loadMailConfig(db)
  if (!cfg) return { ok: false, message: '邮件未启用或未完成 SMTP/网关配置，请先保存邮件设置。' }
  try {
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    const subject = `【测试】${cfg.siteTitle || '博客'} SMTP 发信验证`
    const text =
      '这是一封测试邮件，用于验证博客后台的邮件通知配置是否正常。\n\n' +
      `站点名称：${cfg.siteTitle}\n` +
      `收件人：${to}\n` +
      `发送时间：${now}\n\n` +
      '收到此邮件即说明邮件配置已生效。'
    const html = `<div style="font-family:sans-serif;max-width:480px;padding:16px;border:1px solid #e5e5e5;border-radius:12px">` +
      `<h3 style="margin:0 0 12px;color:#16a34a">✅ 邮件通知测试成功</h3>` +
      '<p>这是一封测试邮件，用于验证博客后台的邮件通知配置。</p><ul>' +
      `<li>站点名称：<b>${cfg.siteTitle}</b></li>` +
      `<li>收件人：<b>${to}</b></li>` +
      `<li>发送时间：${now}</li></ul>` +
      '<p style="color:#888;font-size:13px">收到此邮件即说明邮件配置已生效。</p></div>'
    await sendMail(cfg, { to, subject, text, html })
    return { ok: true, message: `测试邮件已成功发送至 ${to}` }
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) || '未知错误' }
  }
}
