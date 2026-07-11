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

export const DEFAULT_REPLY_TPL =
  '您有一条新回复｜{{siteTitle}}\n\n' +
  '{{parentAuthor}} 你好：\n\n' +
  '{{author}} 在《{{postTitle}}》中回复了你的评论。\n\n' +
  'Ta 的留言：\n{{content}}\n\n' +
  '你原来的评论：\n{{parentContent}}\n\n' +
  '查看回复：{{commentUrl}}\n\n' +
  '—— {{siteTitle}}'

export const DEFAULT_ADMIN_TPL =
  '《{{postTitle}}》收到新评论｜{{siteTitle}}\n\n' +
  '{{author}}（{{email}}）在《{{postTitle}}》发表了新评论：\n\n' +
  '{{content}}\n\n' +
  '查看评论：{{commentUrl}}\n\n' +
  '—— {{siteTitle}}'

export const REPLY_SUBJECT = '{{author}} 回复了你在《{{postTitle}}》的评论'
export const ADMIN_SUBJECT = '《{{postTitle}}》收到新评论'
