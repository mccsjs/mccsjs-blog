import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { siteSettings } from '@blog/db'
import {
  settingsUpdateSchema,
  defaultSettings,
  settingKeys,
  type SettingKey,
} from '@blog/shared'
import { requireAuth, hashPassword, verifyPassword, signCommentAdminToken } from '../../auth'
import { sendTestEmail } from '../../utils/email'
import { SECRET_KEYS, getSiteSetting } from './shared'
import type { DB } from '../../db'

// ============ 站点设置 ============
export function settingsRouter() {
  const app = new Hono()

  app.get('/settings', async (c) => {
    const db: DB = c.get('db')
    const rows = await db.select().from(siteSettings)
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value
    const settings = Object.fromEntries(settingKeys.map((key) => [key, map[key] ?? defaultSettings[key]])) as Record<SettingKey, string>
    // 密码哈希 / 邮件密钥绝不随设置接口返回
    const safe = Object.fromEntries(Object.entries(settings).filter(([k]) => !SECRET_KEYS.includes(k))) as Record<SettingKey, string>
    return c.json(safe)
  })

  app.put('/settings', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = settingsUpdateSchema.parse(await c.req.json())
    const entries = Object.entries(data).filter(([, v]) => v !== undefined) as [SettingKey, string][]
    for (const [key, value] of entries) {
      // 敏感字段（密码 / 邮件密钥）：空字符串表示「不修改（保留原值）」，直接跳过
      if (SECRET_KEYS.includes(key)) {
        if (!value) continue
        if (key === 'adminPassword') {
          const hashed = await hashPassword(value)
          await db
            .insert(siteSettings)
            .values({ id: crypto.randomUUID(), key, value: hashed })
            .onConflictDoUpdate({ target: siteSettings.key, set: { value: hashed } })
        } else {
          // mailApiKey / mailGatewayToken：明文存储（仅服务端发送使用，绝不随 GET 返回）
          await db
            .insert(siteSettings)
            .values({ id: crypto.randomUUID(), key, value })
            .onConflictDoUpdate({ target: siteSettings.key, set: { value } })
        }
        continue
      }
      await db
        .insert(siteSettings)
        .values({ id: crypto.randomUUID(), key, value })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value } })
    }
    const rows = await db.select().from(siteSettings)
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value
    const settings = Object.fromEntries(settingKeys.map((key) => [key, map[key] ?? defaultSettings[key]])) as Record<SettingKey, string>
    const safe = Object.fromEntries(Object.entries(settings).filter(([k]) => !SECRET_KEYS.includes(k))) as Record<SettingKey, string>
    return c.json(safe)
  })

  // ============ 评论区博主身份 ============
  // 公开：是否已配置博主身份（决定是否在前端显示「设置」按钮）
  app.get('/comment-admin', async (c) => {
    const db: DB = c.get('db')
    const email = await getSiteSetting(db, 'adminEmail')
    const name = await getSiteSetting(db, 'adminName')
    const badge = await getSiteSetting(db, 'adminBadge')
    return c.json({ enabled: !!(email && name), badge: badge || '博主' })
  })

  // 公开：博主登录（校验管理端配置的管理员邮箱 + 密码），成功返回无状态 Token
  app.post('/comment-admin/login', async (c) => {
    const db: DB = c.get('db')
    const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}))
    const email = (body.email || '').trim()
    const password = (body.password || '').trim()
    if (!email || !password) return c.json({ error: '邮箱和密码必填' }, 400)
    const adminEmail = await getSiteSetting(db, 'adminEmail')
    const adminName = await getSiteSetting(db, 'adminName')
    const adminPwHash = await getSiteSetting(db, 'adminPassword')
    if (!adminEmail || !adminName || !adminPwHash) {
      return c.json({ error: '管理员身份尚未在管理端「评论设置」中配置' }, 400)
    }
    if (email !== adminEmail) return c.json({ error: '邮箱或密码错误' }, 401)
    const ok = await verifyPassword(password, adminPwHash)
    if (!ok) return c.json({ error: '邮箱或密码错误' }, 401)
    const token = await signCommentAdminToken(
      { sub: adminEmail, name: adminName, exp: Math.floor(Date.now() / 1000) + 7 * 86400 },
      adminPwHash
    )
    return c.json({ token, name: adminName, email: adminEmail })
  })

  // ============ 邮件通知测试（管理端）============
  app.post('/admin/test-email', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const body = await c.req.json<{ email?: string }>().catch(() => ({}))
    const to = (body.email || '').trim()
    if (!to) return c.json({ error: '请输入收件人邮箱地址' }, 400)
    const result = await sendTestEmail(db, to)
    return result.ok ? c.json({ ok: true, message: result.message }) : c.json({ ok: false, message: result.message }, 500)
  })

  return app
}
