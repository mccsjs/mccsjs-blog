import { prisma } from '../db';
import { auth } from '../auth';
import { maybeLogVisitor } from '../utils/visitor';

export function registerVisitorLogRoutes(app: any) {
  // 公开：记录访客（前端调用）
  app.post('/api/collect', async ({ body, request }: any) => {
    const { page } = body;
    await maybeLogVisitor(request, page || '/', prisma);
    return { success: true };
  });

  // 管理：获取访客日志列表
  app.get('/api/admin/visitor-logs', async ({ prisma, user, set, query }: any) => {
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
    return { list: logs, total, page, pageSize };
  }, { auth: true });

  // 管理：访客统计概览
  app.get('/api/admin/visitor-stats', async ({ prisma, user, set }: any) => {
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

    return {
      totalVisits,
      todayVisits,
      weekVisits,
      monthVisits,
      topPages: topPages.map((p: any) => ({ page: p.page, count: Number(p.cnt) })),
    };
  }, { auth: true });
}
