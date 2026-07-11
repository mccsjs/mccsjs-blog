import { eq, inArray } from 'drizzle-orm'
import { siteSettings } from '@blog/db'
import { defaultSettings } from '@blog/shared'
import type { DB } from '../db'
import {
  type MailConfig,
  type NotifyParams,
  type BuiltNotification,
  buildNotification,
} from './email-notify'
import { isValidEmail, DEFAULT_REPLY_TPL, DEFAULT_ADMIN_TPL } from './email-tpl'

export type { MailConfig, NotifyParams, BuiltNotification } from './email-notify'

// 读取并校验邮件配置；任何不达标都返回 null（即不发邮件，安全降级）
export async function loadMailConfig(db: DB): Promise<MailConfig | null> {
  const keys = [
    'mailEnabled',
    'mailProvider',
    'mailApiKey',
    'mailGatewayUrl',
    'mailGatewayToken',
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
    .where(inArray(siteSettings.key, keys))
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value

  const enabled = (map.mailEnabled ?? defaultSettings.mailEnabled) === 'true'
  if (!enabled) return null

  const provider = (map.mailProvider ?? defaultSettings.mailProvider) === 'gateway' ? 'gateway' : 'resend'
  const fromEmail = map.mailFromEmail ?? defaultSettings.mailFromEmail
  const apiKey = map.mailApiKey ?? ''
  const gatewayUrl = map.mailGatewayUrl ?? ''
  const gatewayToken = map.mailGatewayToken ?? ''

  if (!fromEmail || !isValidEmail(fromEmail)) return null
  if (provider === 'resend' && !apiKey) return null
  if (provider === 'gateway' && (!gatewayUrl || !gatewayToken)) return null

  return {
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

// 实际发送：统一用全局 fetch（Worker 自带），按 provider 选择端点。失败抛错由调用方捕获。
async function sendMail(cfg: MailConfig, input: SendInput): Promise<void> {
  const from = cfg.fromName ? `${cfg.fromName} <${cfg.fromEmail}>` : cfg.fromEmail

  if (cfg.provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Resend 邮件发送失败 (${res.status}): ${body.slice(0, 200)}`)
    }
    return
  }

  // 通用 HTTP 邮件网关：POST JSON，Authorization: Bearer <token>
  const res = await fetch(cfg.gatewayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.gatewayToken}` },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`邮件网关发送失败 (${res.status}): ${body.slice(0, 200)}`)
  }
}

// 评论写入后调用：先按配置组装通知，再发送。异常不应阻断评论主流程（路由已 try/catch）。
export async function notifyOnNewComment(db: DB, p: NotifyParams): Promise<void> {
  const cfg = await loadMailConfig(db)
  if (!cfg) return
  const built = buildNotification(p, cfg)
  if (!built) return
  await sendMail(cfg, built)
}
