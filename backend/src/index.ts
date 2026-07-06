import { Elysia } from 'elysia';
import { prisma } from './db';
import { withRequestId, logger } from './utils/logger';

console.error('=== BACKEND STARTING ===');
console.error('Node version:', process.version);
console.error('Bun version:', typeof Bun !== 'undefined' ? Bun.version : 'not bun');

const app = new Elysia()
  .use(withRequestId)
  .get('/', () => ({ status: 'ok', service: 'elysiajs-blog' }))
  .get('/health', () => ({ status: 'ok' }))
  .get('/api/stats', async () => {
    const [totalVisits, totalVisitors] = await Promise.all([
      prisma.visitorLog.count(),
      prisma.visitorLog.groupBy({ by: ['visitorId'], _count: { visitorId: true } }).then((r: any[]) => r.length),
    ]);
    return { totalVisits, totalVisitors };
  });

app.listen(process.env.PORT || 4000);
logger.info(`🦊 Backend running at ${app.server?.hostname}:${app.server?.port}`);
