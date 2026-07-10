import { Hono } from 'hono'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { visitorLogs } from '@blog/db'
import { collectSchema, visitorLogQuerySchema } from '@blog/shared'
import { requireAuth } from '../auth'
import { getClientIp, resolveClientInfo } from '../utils'
import type { DB } from '../db'

const DEDUP_MS = 5 * 60 * 1000

// 'YYYY-MM-DD' -> unix 秒（endOfDay=true 时取当天 23:59:59.999）
function toSec(s: string, endOfDay = false): number | null {
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return Math.floor(d.getTime() / 1000)
}

function dayKey(sec: number): string {
  const d = new Date(sec * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function monthKey(sec: number): string {
  const d = new Date(sec * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function hashVisitor(ip: string | null, ua: string): string {
  const raw = `${ip || 'unknown'}|${ua || ''}`
  let h = 0
  for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

// 异步记录访客（写入失败不影响主流程）
async function recordCollect(db: DB, body: any, c: any) {
  const ip = getClientIp(c)
  const ua = body.user_agent || c.req.header('user-agent') || ''
  const vid = body.visitor_id || hashVisitor(ip, ua)
  const page = (body.url || '').replace(/^https?:\/\/[^/]+/, '') || '/'
  const referrer = body.referrer || c.req.header('referer') || null

  // 5 分钟内同访客同页面去重
  try {
    const since = Math.floor((Date.now() - DEDUP_MS) / 1000)
    const recent = await db
      .select({ id: visitorLogs.id })
      .from(visitorLogs)
      .where(and(eq(visitorLogs.visitorId, vid), eq(visitorLogs.page, page), gte(visitorLogs.createdAt, since)))
      .limit(1)
    if (recent.length > 0) return
  } catch {
    /* ignore */
  }

  const { region, os, browser } = await resolveClientInfo(ip, ua)
  try {
    await db.insert(visitorLogs).values({
      id: crypto.randomUUID(),
      visitorId: vid,
      ip: ip || null,
      page,
      region,
      os,
      browser,
      referrer: referrer || null,
    })
  } catch {
    /* ignore */
  }
}

export function visitorRoutes() {
  const app = new Hono()

  // 访客追踪（公开，快速返回 204；写入通过 waitUntil 保活，避免 Workers 丢弃异步任务）
  app.post('/api/collect', async (c) => {
    const db: DB = c.get('db')
    const body = collectSchema.parse(await c.req.json().catch(() => ({})))
    c.executionCtx?.waitUntil(recordCollect(db, body, c))
    c.status(204)
    return c.body(null)
  })

  // 访客日志（管理，分页 + 关键词）
  app.get('/api/admin/visitor-logs', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const parsed = visitorLogQuerySchema.safeParse(c.req.query())
    if (!parsed.success) {
      return c.json({ error: 'Invalid query', issues: parsed.error.issues }, 422)
    }
    const { page, pageSize, keyword, path, dateFrom, dateTo } = parsed.data
    const fromSec = dateFrom ? toSec(dateFrom) : null
    const toSecEnd = dateTo ? toSec(dateTo, true) : null

    const where = and(
      path ? like(visitorLogs.page, `%${path}%`) : undefined,
      fromSec != null ? gte(visitorLogs.createdAt, fromSec) : undefined,
      toSecEnd != null ? lte(visitorLogs.createdAt, toSecEnd) : undefined,
    )

    const [logs, [{ total }]] = await Promise.all([
      db
        .select()
        .from(visitorLogs)
        .where(where)
        .orderBy(desc(visitorLogs.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: sql<number>`count(*)` }).from(visitorLogs).where(where),
    ])

    let result = logs
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = result.filter(
        (l) =>
          (l.ip && l.ip.toLowerCase().includes(kw)) ||
          (l.referrer && l.referrer.toLowerCase().includes(kw)) ||
          l.visitorId.toLowerCase().includes(kw) ||
          (l.page && l.page.toLowerCase().includes(kw)),
      )
    }

    return c.json({
      list: result.map((l) => ({
        id: l.id,
        visitorId: l.visitorId,
        ip: l.ip,
        page: l.page,
        region: l.region,
        os: l.os,
        browser: l.browser,
        referrer: l.referrer,
        createdAt: new Date(l.createdAt * 1000).toISOString(),
      })),
      total,
      page,
      pageSize,
    })
  })

  // 概览统计
  app.get('/api/admin/visitor-stats', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todaySec = Math.floor(todayStart.getTime() / 1000)

    const [todayCount, totalCount, topPages, recentLogs] = await Promise.all([
      db.$count(visitorLogs, gte(visitorLogs.createdAt, todaySec)),
      db.$count(visitorLogs),
      db
        .select({ page: visitorLogs.page, count: sql<number>`count(*)` })
        .from(visitorLogs)
        .groupBy(visitorLogs.page)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(10),
      db
        .select({
          visitorId: visitorLogs.visitorId,
          page: visitorLogs.page,
          region: visitorLogs.region,
          createdAt: visitorLogs.createdAt,
        })
        .from(visitorLogs)
        .orderBy(desc(visitorLogs.createdAt))
        .limit(5),
    ])

    return c.json({
      todayCount,
      totalCount,
      topPages: topPages.map((p) => ({ page: p.page, count: p.count })),
      recentLogs: recentLogs.map((l) => ({
        visitorId: l.visitorId,
        page: l.page,
        region: l.region,
        createdAt: new Date(l.createdAt * 1000).toISOString(),
      })),
    })
  })

  // 访问趋势（按日 / 按月）
  app.get('/api/admin/visitor-trend', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const range = c.req.query('range') === 'month' ? 'month' : 'day'
    const now = new Date()
    const from =
      range === 'month'
        ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
    const fromSec = Math.floor(from.getTime() / 1000)

    const logs = await db
      .select({ visitorId: visitorLogs.visitorId, createdAt: visitorLogs.createdAt })
      .from(visitorLogs)
      .where(gte(visitorLogs.createdAt, fromSec))

    const buckets = new Map<string, { pv: number; uv: Set<string> }>()
    for (const l of logs) {
      const key = range === 'month' ? monthKey(l.createdAt) : dayKey(l.createdAt)
      if (!buckets.has(key)) buckets.set(key, { pv: 0, uv: new Set() })
      const b = buckets.get(key)!
      b.pv++
      b.uv.add(l.visitorId)
    }

    const data: any[] = []
    if (range === 'month') {
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
        const key = monthKey(Math.floor(d.getTime() / 1000))
        const b = buckets.get(key)
        data.push({ date: key, label: `${d.getMonth() + 1}月`, pv: b?.pv ?? 0, uv: b?.uv.size ?? 0 })
      }
    } else {
      for (let i = 0; i < 30; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i)
        const key = dayKey(Math.floor(d.getTime() / 1000))
        const b = buckets.get(key)
        data.push({ date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, pv: b?.pv ?? 0, uv: b?.uv.size ?? 0 })
      }
    }

    return c.json({ range, data })
  })

  return app
}
