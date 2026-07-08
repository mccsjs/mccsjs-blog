import type { App } from '../app'
import { collectSchema, visitorLogQuerySchema } from '../schemas'
import { recordVisitFromCollect } from '../utils/visitor'

export function registerVisitorRoutes(app: App) {
  // ============ 访客追踪（公开，无需登录） ============

  app.post('/api/collect', async ({ body, request, set }) => {
    const parsed = collectSchema.safeParse(body)
    if (!parsed.success) {
      console.error('[collect] invalid body:', body, parsed.error.issues)
      set.status = 204
      return null
    }
    // 异步写入，快速返回 204
    recordVisitFromCollect(parsed.data, request).catch((e) => console.error('[collect] record error:', e))
    set.status = 204
    return null
  })

  // Visitor Logs (Admin)
  app.get('/api/admin/visitor-logs', async ({ prisma, user, set, query }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }

    const parsed = visitorLogQuerySchema.safeParse(query)
    if (!parsed.success) {
      set.status = 422
      return { error: 'Invalid query', issues: parsed.error.issues }
    }
    const { page, pageSize, keyword, path, dateFrom, dateTo } = parsed.data

    const where: any = {}
    if (path) where.page = { contains: path }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const [logs, total] = await Promise.all([
      prisma.visitorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.visitorLog.count({ where }),
    ])

    // 关键词过滤在内存中做（对 ip / referrer / visitorId）
    let result = logs
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = result.filter((l) =>
        (l.ip && l.ip.includes(kw)) ||
        (l.referrer && l.referrer.toLowerCase().includes(kw)) ||
        l.visitorId.includes(kw) ||
        l.page.includes(kw)
      )
    }

    return {
      list: result.map((l) => ({
        id: l.id,
        visitorId: l.visitorId,
        ip: l.ip,
        page: l.page,
        region: l.region,
        os: l.os,
        browser: l.browser,
        referrer: l.referrer,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  }, { auth: true })

  // Visitor stats (Admin) - 概览数据
  app.get('/api/admin/visitor-stats', async ({ prisma, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todayCount, totalCount, topPages, recentLogs] = await Promise.all([
      prisma.visitorLog.count({ where: { createdAt: { gte: today } } }),
      prisma.visitorLog.count(),
      prisma.visitorLog.groupBy({
        by: ['page'],
        _count: { page: true },
        orderBy: { _count: { page: 'desc' } },
        take: 10,
      }),
      prisma.visitorLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    return {
      todayCount,
      totalCount,
      topPages: topPages.map((p) => ({ page: p.page, count: p._count.page })),
      recentLogs: recentLogs.map((l) => ({
        visitorId: l.visitorId,
        page: l.page,
        region: l.region,
        createdAt: l.createdAt.toISOString(),
      })),
    }
  }, { auth: true })

  // Visitor trend (Admin) - 访问趋势（按日 / 按月）
  app.get('/api/admin/visitor-trend', async ({ prisma, user, set, query }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }

    const range = query.range === 'month' ? 'month' : 'day'
    const now = new Date()
    const from =
      range === 'month'
        ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)

    const logs = await prisma.visitorLog.findMany({
      where: { createdAt: { gte: from } },
      select: { visitorId: true, createdAt: true },
    })

    const buckets = new Map<string, { pv: number; uv: Set<string> }>()
    for (const l of logs) {
      const d = new Date(l.createdAt)
      const key =
        range === 'month'
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!buckets.has(key)) buckets.set(key, { pv: 0, uv: new Set() })
      const b = buckets.get(key)!
      b.pv++
      b.uv.add(l.visitorId)
    }

    const data: { date: string; label: string; pv: number; uv: number }[] = []
    if (range === 'month') {
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const b = buckets.get(key)
        data.push({ date: key, label: `${d.getMonth() + 1}月`, pv: b?.pv ?? 0, uv: b?.uv.size ?? 0 })
      }
    } else {
      for (let i = 0; i < 30; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const b = buckets.get(key)
        data.push({ date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, pv: b?.pv ?? 0, uv: b?.uv.size ?? 0 })
      }
    }

    return { range, data }
  }, { auth: true })
}
