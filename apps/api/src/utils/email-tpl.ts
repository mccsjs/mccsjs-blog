// 纯函数模块：模板渲染 / 邮箱校验 / 文本转 HTML。无外部依赖，便于单独测试。
// 设计说明：CF Worker 运行在无原生 socket 的环境，无法直连 SMTP；
// 因此本站邮箱提醒统一走「HTTP 邮件网关」发送（Resend 或任意兼容 POST JSON 的网关）。

// 允许常规邮箱与本地域名（如 admin@localhost 这类博主标识场景）
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$|^[^@\s]+@localhost$/i

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test((email || '').trim())
}

export function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 将 {{var}} 占位符替换为变量值；缺失的变量替换为空串（不会抛错）
export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return (tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : ''
  )
}

// 纯文本 -> 简单 HTML：转义后按空行分段、段内换行转 <br>
export function textToHtml(text: string): string {
  const escaped = escapeHtml(text || '')
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

// 富 HTML -> 纯文本：去掉 style/script/标签，还原常见实体，用于邮件 text 部分
export function stripHtml(html: string): string {
  return (html || '')
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// 回复通知模板（富 HTML，对齐 FlecBlog 的 comment_reply.tmpl 视觉）
// 变量：parentAuthor(被回复者昵称) / author(回复者昵称) / postTitle(文章标题)
//       content(回复内容) / commentUrl(完整回复链接) / siteTitle(站点名)
export const DEFAULT_REPLY_TPL = `<div style="background:#f5f5f5;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.6;">
  <div style="background:#ffffff;max-width:800px;margin:0 auto;border-radius:15px;border:1px solid #39c5bb;overflow:hidden;box-shadow:0 0 20px rgba(0,0,0,0.12);">
    <header style="overflow:hidden;">
      <img src="https://seln.cn/img/1.jpg" alt="" style="width:100%;display:block;" />
    </header>
    <div style="padding:5px 20px;background-color:rgba(70,225,198,0.05);">
      <div style="border-radius:30px;position:relative;color:#ffffff;float:left;z-index:999;background:#39c5bb;padding:10px 30px;margin:-25px auto 0;box-shadow:5px 5px 5px rgba(0,0,0,0.3);">亲爱的 {{parentAuthor}}：</div>
      <br />
      <center><h3 style="margin:18px 0 8px;">您收到了新的回复</h3></center>
      <hr style="width:200px;border:0;border-bottom:1px solid #e5e5e5;margin:12px auto;" />
      <br />
      <p>您好！<strong>{{author}}</strong> 回复了您在 <strong>“{{postTitle}}”</strong> 的评论：</p>
      <div style="border-radius:8px;border:1px solid #ddd;background-color:#f5f5f5;margin:15px 0;padding:20px;">{{content}}</div>
      <p>快去看看吧！</p>
      <div style="text-align:center;">
        <a href="{{commentUrl}}" style="color:#ffffff;text-decoration:none;display:inline-block;min-height:28px;line-height:28px;padding:0 13px;outline:0;background:#39c5bb;font-size:13px;text-align:center;font-weight:400;border:0;border-radius:999em;" target="_blank">点击去查看回复&gt;&gt;</a>
        <p> </p>
      </div>
      <div style="text-align:center;margin-top:3rem;color:#b3b3b1;">
        <hr style="width:165px;border:0;border-bottom:1px solid #e5e5e5;margin:5px auto;" />&copy;&nbsp;{{siteTitle}}
        <p> </p>
      </div>
    </div>
  </div>
</div>`

export const DEFAULT_ADMIN_TPL =
  '《{{postTitle}}》收到新评论｜{{siteTitle}}\n\n' +
  '{{author}}（{{email}}）在《{{postTitle}}》发表了新评论：\n\n' +
  '{{content}}\n\n' +
  '查看评论：{{commentUrl}}\n\n' +
  '—— {{siteTitle}}'

export const REPLY_SUBJECT = '{{author}} 回复了你在《{{postTitle}}》的评论'
export const ADMIN_SUBJECT = '《{{postTitle}}》收到新评论'
