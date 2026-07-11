import { eq, inArray } from 'drizzle-orm'
import { createTransport } from 'nodemailer'
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
import { isValidEmail, DEFAULT_REPLY_TPL, DEFAULT_ADMIN_TPL } from './email-tpl'

export type { MailConfig, SmtpConfig, NotifyParams, BuiltNotification } from './email-notify'

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
      secure: (map.mailSmtpSecure ?? defaultSettings.mailSmtpSecure) !== '0',
    }
  }

  const provider = (map.mailProvider ?? defaultSettings.mailProvider) === 'gateway' ? 'gateway' : 'resend'
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

// 实际发送：SMTP 优先（nodemailer 直连），失败自动回退 HTTP 网关。
// 任何异常最终由调用方（路由 try/catch）兜底，不阻断评论主流程。
async function sendMail(cfg: MailConfig, input: SendInput): Promise<void> {
  let lastError: Error | null = null

  // 1. SMTP 直连（优先）
  if (cfg.smtp && cfg.smtp.user && cfg.smtp.pass) {
    try {
      const transporter = createTransport({
        host: cfg.smtp.host,
        port: cfg.smtp.port,
        secure: cfg.smtp.secure,
        auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
      })
      const fromDisplay = cfg.fromName || cfg.siteTitle || ''
      const smtpFrom = fromDisplay
        ? `"${fromDisplay}" <${cfg.smtp.user}>`
        : cfg.smtp.user
      await transporter.sendMail({
        from: smtpFrom,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      })
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
