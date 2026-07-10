import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { users, sessions } from '@blog/db'
import type { DB } from './db'
import type { Context } from 'hono'

const SESSION_COOKIE = 'sid'
const SESSION_DAYS = 30

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10)
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash)
}

export interface AuthUser {
  id: string
  email: string | null
  name: string | null
}

export async function login(
  db: DB,
  email: string,
  password: string,
  adminEmail: string,
  adminPassword: string,
  ip?: string,
  ua?: string
) {
  const existing = await db.select().from(users).limit(1)
  if (existing.length === 0) {
    // 首次：用预设管理员账号完成初始化
    if (email !== adminEmail || password !== adminPassword) {
      return { error: '系统尚未初始化，请使用预设管理员账号登录以完成初始化', status: 400 }
    }
    const id = crypto.randomUUID()
    await db.insert(users).values({
      id,
      email,
      name: 'Admin',
      password: await hashPassword(password),
      emailVerified: true,
    })
    return createSession(db, id, ip, ua)
  }
  const user = existing[0]
  if (!user.password || !(await verifyPassword(password, user.password))) {
    return { error: '邮箱或密码错误', status: 401 }
  }
  return createSession(db, user.id, ip, ua)
}

async function createSession(db: DB, userId: string, ip?: string, ua?: string) {
  const id = crypto.randomUUID()
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400
  await db.insert(sessions).values({ id, userId, expiresAt, ipAddress: ip ?? null, userAgent: ua ?? null })
  return { sessionId: id, expiresAt }
}

export async function getSessionUser(db: DB, sessionId?: string): Promise<AuthUser | null> {
  if (!sessionId) return null
  const s = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)
  if (s.length === 0) return null
  if (s[0].expiresAt < Math.floor(Date.now() / 1000)) {
    await db.delete(sessions).where(eq(sessions.id, sessionId)).catch(() => {})
    return null
  }
  const u = await db.select().from(users).where(eq(users.id, s[0].userId)).limit(1)
  if (u.length === 0) return null
  return { id: u[0].id, email: u[0].email, name: u[0].name }
}

export function setSessionCookie(c: Context, sessionId: string, expiresAt: number) {
  const maxAge = expiresAt - Math.floor(Date.now() / 1000)
  c.header('Set-Cookie', `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`)
}

export function clearSessionCookie(c: Context) {
  c.header('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

export function getSessionCookie(c: Context): string | undefined {
  const raw = c.req.header('Cookie')
  if (!raw) return undefined
  const m = raw.match(/(?:^|;\s*)sid=([^;]+)/)
  return m ? m[1] : undefined
}

export async function requireAuth(c: Context, next: () => Promise<void>) {
  const sid = getSessionCookie(c)
  const db = c.get('db')
  const user = await getSessionUser(db, sid)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('user', user)
  await next()
}

// ============ 评论区「博主身份」Token（HMAC-SHA256，无状态） ============
// 密钥使用管理员密码哈希（仅服务端可知），Token 有效期 7 天；改密码即失效，需重新登录。
function b64urlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  const binary = atob(b64)
  // atob 返回二进制字符串（每 char = 1 byte）；中文等多字节 UTF-8 必须用 TextDecoder 还原，
  // 否则每个 UTF-8 字节会被当作 Latin-1 字符导致 mojibake（如"大家长"→ ä¸šå®¶é•¿）
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}
async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return b64urlEncode(sig)
}

export interface CommentAdminToken {
  sub: string // 管理员邮箱
  name: string // 管理员昵称
  exp: number // 过期时间戳（秒）
}

export async function signCommentAdminToken(payload: CommentAdminToken, secret: string): Promise<string> {
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64urlEncode(JSON.stringify(payload))
  const sig = await hmacSha256(secret, `${header}.${body}`)
  return `${header}.${body}.${sig}`
}

export async function verifyCommentAdminToken(token: string, secret: string): Promise<CommentAdminToken | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const expected = await hmacSha256(secret, `${header}.${body}`)
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(b64urlDecode(body)) as CommentAdminToken
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
