import type { App } from '../app'
import { collectSchema, visitorLogQuerySchema } from '../schemas'
import { recordVisitFromCollect } from '../utils/visitor'

export function registerVisitorRoutes(app: App) {
  // ============ 访客追踪（公开，无需登录） ============

  app.post('/api/collect', async ({ body, request, set }) => {
    const data = collectSchema.parse(body)
    // 异步写入，快速返回 204
    recordVisitFromCollect(data, request).catch(() => {})
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
}
