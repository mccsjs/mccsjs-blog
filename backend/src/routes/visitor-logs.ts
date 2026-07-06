import { prisma } from '../db';
import { auth } from '../auth';
import { maybeLogVisitor } from '../utils/visitor';
import { Logger } from '../utils/logger';

export function registerVisitorLogRoutes(app: any) {
  // 公开：记录访客（前端调用）
  app.post('/api/collect', async ({ body, request, logger }: any) => {
    const { page } = body;
    await maybeLogVisitor(request, page || '/', prisma, logger);
    return { success: true };
  });

  // 管理：获取访客日志列表
  app.get('/api/admin/visitor-logs', async ({ prisma, user, set, query, logger }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const page = typeof query.page === 'string' ? Math.max(1, parseInt(query.page)) : 1;
    const pageSize = typeof query.pageSize === 'string'
      ? Math.max(1, Math.min(100, parseInt(query.pageSize))) : 20;
    const [logs, total] = await Promise.all([
      prisma.visitorLog.findMany({
        orderBy: { visitedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.visitorLog.count(),
    ]);
    logger.debug('[访客日志] 列表查询', { page, pageSize, total });
    return { list: logs, total, page, pageSize };
  }, { auth: true });

  // 管理：访客统计概览
  app.get('/api/admin/visitor-stats', async ({ prisma, user, set, logger }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [totalVisits, todayVisits, weekVisits, monthVisits, topPages] = await Promise.all([
      prisma.visitorLog.count(),
      prisma.visitorLog.count({ where: { visitedAt: { gte: today } } }),
      prisma.visitorLog.count({ where: { visitedAt: { gte: weekAgo } } }),
      prisma.visitorLog.count({ where: { visitedAt: { gte: monthAgo } } }),
      prisma.$queryRaw<Array<{ page: string; cnt: bigint }>>`
        SELECT page, COUNT(*) as cnt
        FROM visitor_logs
        WHERE visited_at >= ${weekAgo}
        GROUP BY page
        ORDER BY cnt DESC
        LIMIT 10
      `,
    ]);

    logger.debug('[访客统计] 查询完成');
    return {
      totalVisits,
      todayVisits,
      weekVisits,
      monthVisits,
      topPages: topPages.map((p: any) => ({ page: p.page, count: Number(p.cnt) })),
    };
  }, { auth: true });

  // 公开：网站统计卡片数据（无需登录）
  app.get('/api/stats', async ({ prisma, logger }: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalVisits,
      totalVisitors,
      todayVisits,
      weekVisits,
      monthVisits,
      topCountries,
      topOs,
      topBrowsers,
    ] = await Promise.all([
      prisma.visitorLog.count(),
      prisma.visitorLog.groupBy({ by: ['visitorId'], _count: { visitorId: true } }).then((r) => r.length),
      prisma.visitorLog.count({ where: { visitedAt: { gte: today } } }),
      prisma.visitorLog.count({ where: { visitedAt: { gte: weekAgo } } }),
      prisma.visitorLog.count({ where: { visitedAt: { gte: monthAgo } } }),
      prisma.$queryRaw<Array<{ country: string | null; cnt: bigint }>>`
        SELECT country, COUNT(*) as cnt FROM visitor_logs
        WHERE country IS NOT NULL AND country != ''
        GROUP BY country ORDER BY cnt DESC LIMIT 5
      `,
      prisma.$queryRaw<Array<{ os: string | null; cnt: bigint }>>`
        SELECT os, COUNT(*) as cnt FROM visitor_logs
        WHERE os IS NOT NULL AND os != ''
        GROUP BY os ORDER BY cnt DESC LIMIT 5
      `,
      prisma.$queryRaw<Array<{ browser: string | null; cnt: bigint }>>`
        SELECT browser, COUNT(*) as cnt FROM visitor_logs
        WHERE browser IS NOT NULL AND browser != ''
        GROUP BY browser ORDER BY cnt DESC LIMIT 5
      `,
    ]);

    logger.debug('[公开统计] 查询完成');

    const clean = (row: any) => ({
      name: row.country ?? row.os ?? row.browser ?? '未知',
      count: Number(row.cnt),
    });

    return {
      code: 0,
      data: {
        totalVisits,
        totalVisitors,
        todayVisits,
        weekVisits,
        monthVisits,
        topCountries: topCountries.map(clean),
        topOs: topOs.map(clean),
        topBrowsers: topBrowsers.map(clean),
      },
    };
  });
}
