import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { eq, and } from 'drizzle-orm'
import { ZodError } from 'zod'
import { sessions, users } from '@blog/db'
import { createDb } from './db'
import type { DB } from './db'
import { login, setSessionCookie, clearSessionCookie, getSessionCookie, getSessionUser, requireAuth, verifyPassword, hashPassword } from './auth'
import { seedDefaults } from './seed'
import { contentRoutes } from './routes/content'
import { menuRoutes } from './routes/menus'
import { friendRoutes } from './routes/friends'
import { visitorRoutes } from './routes/visitor'
import { refreshAllFeeds, runFriendAutoCheck } from './utils/extras'

type Bindings = {
  DB: D1Database
  ADMIN_EMAIL: string
  ADMIN_PASSWORD: string
  SESSION_SECRET: string
  ASSETS_PUBLIC_URL: string
  // 可选：上传用 R2 存储桶、友链测速用第三方 API Token
  BUCKET?: R2Bucket
  XXAPI_TOKEN?: string
}
type Variables = {
  db: DB
  user: { id: string; email: string | null; name: string | null }
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use(
  '*',
  cors({
    origin: ['http://localhost:4321', 'http://localhost:5173'],
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use('*', async (c, next) => {
  c.set('db', createDb(c.env.DB))
  await next()
})

// 全局错误处理：Zod 校验失败 -> 400；其余 -> 500
app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: '参数校验失败', issues: err.issues }, 400)
  }
  console.error('[unhandled]', err)
  return c.json({ error: '服务器内部错误' }, 500)
})

app.get('/health', (c) => c.json({ status: 'ok' }))
app.get('/', (c) => c.json({ status: 'ok', service: 'mccsjsblog-api' }))

// 登录 / 初始化（首次登录即用预设管理员账号创建）
app.post('/api/admin/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}))
  const email = body.email ?? ''
  const password = body.password ?? ''
  if (!email || !password) return c.json({ error: '邮箱和密码必填' }, 400)
  const db = c.get('db')
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  const ua = c.req.header('user-agent')
  const result = await login(db, email, password, c.env.ADMIN_EMAIL, c.env.ADMIN_PASSWORD, ip, ua)
  if ('error' in result) return c.json({ error: result.error }, result.status as number)
  setSessionCookie(c, result.sessionId, result.expiresAt)
  return c.json({ ok: true })
})

// 当前登录用户
app.get('/api/admin/me', async (c) => {
  const sid = getSessionCookie(c)
  const user = await getSessionUser(c.get('db'), sid)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ user })
})

// 修改当前管理员资料（昵称 / 邮箱 / 密码）
// 改邮箱或修改密码都需要校验当前密码；邮箱需保持唯一。
app.put('/api/admin/profile', requireAuth, async (c) => {
  const db = c.get('db')
  const me = c.get('user') // { id, email, name }
  const body = await c.req
    .json<{ name?: string; email?: string; currentPassword?: string; newPassword?: string }>()
    .catch(() => ({}))

  const { name, email, currentPassword, newPassword } = body

  const cur = await db.select().from(users).where(eq(users.id, me.id)).limit(1)
  if (cur.length === 0) return c.json({ error: '用户不存在' }, 404)
  const curUser = cur[0]

  const nextEmail = email?.trim().toLowerCase()
  const emailChanged = !!nextEmail && nextEmail !== (curUser.email ?? '').toLowerCase()
  const changingPassword = !!newPassword

  // 改邮箱或改密码都必须校验当前密码
  if ((emailChanged || changingPassword) && !currentPassword) {
    return c.json({ error: '修改账号或密码需先填写当前密码' }, 400)
  }
  if ((emailChanged || changingPassword) && !(await verifyPassword(currentPassword!, curUser.password ?? ''))) {
    return c.json({ error: '当前密码错误' }, 401)
  }
  if (changingPassword && newPassword!.length < 6) {
    return c.json({ error: '新密码至少 6 位' }, 400)
  }

  const updates: Partial<typeof users.$inferInsert> = {
    updatedAt: Math.floor(Date.now() / 1000),
  }
  if (name !== undefined && name.trim()) updates.name = name.trim()
  if (nextEmail && emailChanged) {
    const exist = await db.select({ id: users.id }).from(users).where(eq(users.email, nextEmail)).limit(1)
    if (exist.length && exist[0].id !== me.id) return c.json({ error: '该邮箱已被占用' }, 409)
    updates.email = nextEmail
  }
  if (changingPassword) updates.password = await hashPassword(newPassword!)

  await db.update(users).set(updates).where(eq(users.id, me.id))

  const updated = await db.select().from(users).where(eq(users.id, me.id)).limit(1)
  return c.json({ user: { id: updated[0].id, email: updated[0].email, name: updated[0].name } })
})

// 登出
app.post('/api/admin/logout', async (c) => {
  const sid = getSessionCookie(c)
  if (sid) await c.get('db').delete(sessions).where(eq(sessions.id, sid)).catch(() => {})
  clearSessionCookie(c)
  return c.json({ ok: true })
})

// 初始化默认数据（菜单 / 友链 / 站点设置），需管理员登录，幂等
app.post('/api/admin/seed', requireAuth, async (c) => {
  await seedDefaults(c.get('db'))
  return c.json({ ok: true })
})

// ===== 挂载各业务路由 =====
// 内容路由（文章 / 分类 / 标签 / 评论 / 设置）
app.route('/', contentRoutes())
// 菜单
app.route('/', menuRoutes())
// 友链 / 图床 / 上传
app.route('/', friendRoutes())
// 访客追踪
app.route('/', visitorRoutes())

// ===== 定时任务（Cron Triggers，见 wrangler.toml [triggers]） =====
// 0 3 * * * → 刷新所有 RSS；0 0 * * * / 0 12 * * * → 友链自动测速
export default {
  fetch: app.fetch,
  scheduled: async (controller, env: Bindings, ctx: ExecutionContext) => {
    const db = createDb(env.DB)
    if (controller.cron === '0 3 * * *') {
      ctx.waitUntil(refreshAllFeeds(db))
    } else {
      ctx.waitUntil(runFriendAutoCheck(db, env.XXAPI_TOKEN))
    }
  },
}
