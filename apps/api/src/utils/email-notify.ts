// 纯逻辑层：根据评论上下文 + 邮件配置，决定「发给谁 / 发什么」。
// 不依赖数据库或网络，便于单独测试。模板渲染、校验均来自 ./email-tpl。
import {
  isValidEmail,
  renderTemplate,
  textToHtml,
  DEFAULT_REPLY_TPL,
  DEFAULT_ADMIN_TPL,
  REPLY_SUBJECT,
  ADMIN_SUBJECT,
} from './email-tpl'

// 邮件配置（由 loadMailConfig 从 siteSettings 组装）
export interface MailConfig {
  provider: 'resend' | 'gateway'
  apiKey: string
  gatewayUrl: string
  gatewayToken: string
  fromEmail: string
  fromName: string
  templateReply: string
  templateAdmin: string
  siteTitle: string
  adminEmail: string
  siteUrl: string
}

// 触发通知所需的上下文
export interface NotifyParams {
  comment: { id: string; author: string; email: string; content: string }
  post: { title: string; slug: string }
  parent?: { author: string; email: string; content: string } | null
  baseUrl: string
}

export interface BuiltNotification {
  to: string
  subject: string
  text: string
  html: string
}

// 核心决策：有 parent → 回复通知（发给父评论邮箱）；无 parent → 新评论通知（发给博主）。
// 返回 null 表示无需发送（配置缺失/收件人非法/回复自己）。
export function buildNotification(p: NotifyParams, cfg: MailConfig): BuiltNotification | null {
  // 优先用配置的站点地址（siteUrl），否则退回请求来源
  const baseUrl = (cfg.siteUrl || '').trim() || p.baseUrl
  const commentUrl = `${baseUrl.replace(/\/+$/, '')}/post/${p.post.slug}#comment-${p.comment.id}`

  const commonVars: Record<string, string> = {
    siteTitle: cfg.siteTitle,
    postTitle: p.post.title,
    author: p.comment.author,
    email: p.comment.email,
    content: p.comment.content,
    commentUrl,
  }

  let to = ''
  let tpl = ''
  let subjectTpl = ''
  const vars: Record<string, string> = { ...commonVars }

  if (p.parent) {
    // 回复通知：发给父评论邮箱。若父评论无邮箱则不通知任何人。
    if (!p.parent.email || !isValidEmail(p.parent.email)) return null
    to = p.parent.email
    tpl = cfg.templateReply
    subjectTpl = REPLY_SUBJECT
    vars.parentAuthor = p.parent.author
    vars.parentContent = p.parent.content
  } else {
    // 新评论通知：发给博主
    to = cfg.adminEmail
    tpl = cfg.templateAdmin
    subjectTpl = ADMIN_SUBJECT
  }

  if (!to || !isValidEmail(to)) return null
  // 不通知自己（回复自己的评论 / 博主给自己的新评论发通知）
  if (to.trim().toLowerCase() === p.comment.email.trim().toLowerCase()) return null

  const text = renderTemplate(tpl, vars)
  const html = textToHtml(text)
  return {
    to,
    subject: renderTemplate(subjectTpl, vars),
    text,
    html,
  }
}
