import { prisma } from '../../db';
import { logger, Logger } from '../../utils/logger';

const XXAPI_TOKEN = process.env.XXAPI_TOKEN || '';

// API 测速（调用第三方 API）
async function apiCheck(targetURL: string, log: Logger): Promise<[boolean, number]> {
  const apiURL = 'https://v2.xxapi.cn/api/speed?url=' + encodeURIComponent(targetURL);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(apiURL, {
      signal: controller.signal,
      headers: { Authorization: 'Bearer ' + XXAPI_TOKEN },
    });
    clearTimeout(timeout);
    if (!resp.ok) return [false, 0];
    const result = await resp.json() as { code: number; data: string };
    if (result.code !== 200) return [false, 0];
    const latencyStr = result.data.replace('ms', '');
    const latency = parseInt(latencyStr) || 0;
    return [true, latency];
  } catch (e) {
    log.warn('[友链测速] API 测速失败', { url: targetURL, error: e instanceof Error ? e.message : e });
    return [false, 0];
  }
}

// 直连测速
async function checkAccessibility(targetURL: string, log: Logger): Promise<[boolean, number]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const start = Date.now();
    const resp = await fetch(targetURL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    const accessible = resp.status >= 200 && resp.status < 400;
    return [accessible, elapsed];
  } catch (e) {
    log.warn('[友链测速] 直连测速失败', { url: targetURL, error: e instanceof Error ? e.message : e });
    return [false, 0];
  }
}

// 双策略测速：优先 API，失败则直连
async function dualCheck(targetURL: string, log: Logger): Promise<[number, number]> {
  const [ok1, lat1] = await apiCheck(targetURL, log);
  if (ok1 && lat1 > 0) return [0, lat1];

  const [ok2, lat2] = await checkAccessibility(targetURL, log);
  if (ok2) return [0, lat2];

  return [1, lat1 || lat2];
}

export function registerFriendCheckRoutes(app: any) {
  // 测速单个友链
  app.post('/api/admin/friends/:id/check', async ({ prisma, params, user, set, logger }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const friend = await prisma.friend.findUnique({ where: { id: params.id } });
    if (!friend) { set.status = 404; return { error: 'Not Found' }; }
    if (friend.isInvalid) { set.status = 400; return { error: '友链已标记失效，跳过测速' }; }
    const log = logger.child({ friendId: params.id, name: friend.name });
    const [accessible, latency] = await dualCheck(friend.url, log);
    await prisma.friend.update({
      where: { id: params.id },
      data: { accessible, latency },
    });
    log.info('[友链测速] 单链测速完成', { accessible, latency });
    return { accessible, latency };
  }, { auth: true });

  // 测速所有友链
  app.post('/api/admin/friends/check-all', async ({ prisma, user, set, logger }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const friends = await prisma.friend.findMany({ where: { isInvalid: false } });
    const results = [];
    for (const f of friends) {
      const [accessible, latency] = await dualCheck(f.url, logger.child({ friendId: f.id }));
      await prisma.friend.update({
        where: { id: f.id },
        data: { accessible, latency },
      });
      results.push({ id: f.id, name: f.name, accessible, latency });
    }
    logger.info('[友链测速] 批量测速完成', { total: friends.length });
    return { total: friends.length, results };
  }, { auth: true });
}

// 友链自动测速：每天 0 点和 12 点执行
export function scheduleFriendAutoCheck() {
  const taskLogger = logger.child({ task: 'friend-check' });

  const run = async () => {
    try {
      const friends = await prisma.friend.findMany({ where: { isInvalid: false } });
      if (!friends.length) return;
      for (const f of friends) {
        const [accessible, latency] = await dualCheck(f.url, taskLogger.child({ friendId: f.id }));
        await prisma.friend.update({
          where: { id: f.id },
          data: { accessible, latency },
        });
      }
      taskLogger.info('[友链测速] 定时任务完成', { total: friends.length });
    } catch (e) {
      taskLogger.error('[友链测速] 定时任务失败', e instanceof Error ? e : undefined, { error: e });
    }
  };

  const now = new Date();
  const next12 = new Date(now);
  next12.setHours(12, 0, 0, 0);
  const next0 = new Date(now);
  next0.setHours(0, 0, 0, 0);
  next0.setDate(next0.getDate() + 1);
  const delay = now < next12 ? next12.getTime() - now.getTime() : next0.getTime() - now.getTime();

  setTimeout(() => {
    run();
    setInterval(run, 12 * 60 * 60 * 1000);
  }, delay);

  taskLogger.info('[友链测速] 定时任务已安排', { firstRunInMs: delay });
}
