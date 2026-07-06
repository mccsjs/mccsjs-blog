import { prisma } from '../../db';
import RssParser from 'rss-parser';
import pLimit from 'p-limit';
import { logger, Logger } from '../../utils/logger';

const rssParser = new RssParser();

// 自动发现友链的 RSS 地址
export async function discoverRSSFeed(siteUrl: string, log: Logger): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(siteUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MccsjsBlog/1.0)' },
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const html = await resp.text();

    // 解析 <link type="application/rss+xml" href="...">
    const linkRegex = /<link[^>]+type\s*=\s*["'](application\/(rss|atom)\+xml|application\/feed\+json)["'][^>]+href\s*=\s*["']([^"']+)["']/gi;
    const matches = [...html.matchAll(linkRegex)];

    if (matches.length > 0) {
      const href = matches[0][3];
      if (href.startsWith('http')) return href;
      const base = new URL(siteUrl);
      if (href.startsWith('/')) return base.origin + href;
      return base.origin + '/' + href;
    }

    // 尝试常见 RSS 路径
    const commonPaths = ['/feed', '/rss.xml', '/atom.xml', '/index.xml', '/feed.xml', '/rss', '/posts/index.xml', '/blog/rss', '/blog/feed'];
    const base = new URL(siteUrl);

    for (const path of commonPaths) {
      try {
        const rssUrl = base.origin + path;
        const testResp = await fetch(rssUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MccsjsBlog/1.0)' },
        });
        const contentType = testResp.headers.get('content-type') || '';
        if (testResp.ok && (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom') || contentType.includes('json'))) {
          return rssUrl;
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch (e) {
    log.warn('[RSS发现] 失败', { url: siteUrl, error: e instanceof Error ? e.message : e });
    return null;
  }
}

// 解析单个友链的 RSS/Atom feed
async function parseFriendFeed(friendId: string, rssUrl: string, log: Logger): Promise<{ title: string; link: string; publishedAt: Date | null }[]> {
  try {
    const feed = await rssParser.parseURL(rssUrl);
    const articles: { title: string; link: string; publishedAt: Date | null }[] = [];
    for (const item of feed.items || []) {
      if (!item.link) continue;
      let publishedAt: Date | null = null;
      if (item.isoDate) publishedAt = new Date(item.isoDate);
      if (!publishedAt && item.pubDate) publishedAt = new Date(item.pubDate);
      articles.push({ title: item.title || '无标题', link: item.link, publishedAt });
    }
    log.debug('[RSS解析] 成功', { friendId, rssUrl, count: articles.length });
    return articles;
  } catch (e) {
    log.error('[RSS解析] 失败', e instanceof Error ? e : undefined, { rssUrl });
    return [];
  }
}

// 刷新单个友链的 RSS（写入数据库）
async function refreshFriendFeed(friendId: string, rssUrl: string, log: Logger): Promise<number> {
  const articles = await parseFriendFeed(friendId, rssUrl, log);
  if (articles.length === 0) return 0;
  let newCount = 0;
  for (const article of articles) {
    try {
      await prisma.rssArticle.create({
        data: { friendId, title: article.title, link: article.link, publishedAt: article.publishedAt },
      });
      newCount++;
    } catch (e: any) {
      if (e?.code === 'P2002') continue; // 唯一约束冲突（已存在），跳过
      throw e;
    }
  }
  // 更新友链的 RSS 最后更新时间
  const latest = await prisma.rssArticle.findFirst({
    where: { friendId },
    orderBy: { publishedAt: 'desc' },
  });
  if (latest) {
    await prisma.friend.update({
      where: { id: friendId },
      data: { rssLatime: latest.publishedAt || new Date() },
    });
  }
  return newCount;
}

// 刷新所有配置了 RSS 的友链（并发控制）
async function refreshAllFeeds(log: Logger): Promise<{ total: number; newArticles: number }> {
  const friends = await prisma.friend.findMany({ where: { rssUrl: { not: null } } });
  if (friends.length === 0) return { total: 0, newArticles: 0 };
  const limit = pLimit(5);
  let newArticles = 0;
  const tasks = friends.map((f: any) =>
    limit(async () => {
      if (!f.rssUrl) return 0;
      const count = await refreshFriendFeed(f.id, f.rssUrl!, log.child({ friendId: f.id }));
      newArticles += count;
      return count;
    })
  );
  await Promise.all(tasks);
  return { total: friends.length, newArticles };
}

export function registerRssRoutes(app: any) {
  // 公开接口：获取朋友圈文章列表
  app.get('/api/friends/feed', async ({ prisma, query, logger }: any) => {
    const page = typeof query.page === 'string' ? Math.max(1, parseInt(query.page)) : 1;
    const pageSize = typeof query.pageSize === 'string'
      ? Math.max(1, Math.min(50, parseInt(query.pageSize))) : 21;
    const [articles, total] = await Promise.all([
      prisma.rssArticle.findMany({
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { friend: true },
      }),
      prisma.rssArticle.count(),
    ]);
    return {
      code: 0,
      data: {
        list: articles.map((a: any) => ({
          id: a.id,
          friend_id: a.friendId,
          friend_name: a.friend.name,
          friend_url: a.friend.url,
          friend_avatar: a.friend.avatar,
          title: a.title,
          link: a.link,
          published_at: a.publishedAt?.toISOString() || null,
        })),
        total,
        page,
        page_size: pageSize,
      },
    };
  });

  // 管理接口：手动刷新所有 RSS
  app.post('/api/admin/friends/refresh-feeds', async ({ user, set, logger }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const result = await refreshAllFeeds(logger);
    logger.info('[RSS刷新] 手动刷新完成', { total: result.total, newArticles: result.newArticles });
    return { message: '刷新完成', ...result };
  }, { auth: true });

  // 管理接口：获取 RSS 文章列表
  app.get('/api/admin/friends/feed', async ({ prisma, query, user, set, logger }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const page = typeof query.page === 'string' ? Math.max(1, parseInt(query.page)) : 1;
    const pageSize = typeof query.pageSize === 'string'
      ? Math.max(1, Math.min(100, parseInt(query.pageSize))) : 20;
    const [articles, total] = await Promise.all([
      prisma.rssArticle.findMany({
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { friend: true },
      }),
      prisma.rssArticle.count(),
    ]);
    return {
      list: articles.map((a: any) => ({
        id: a.id,
        friend_name: a.friend.name,
        friend_url: a.friend.url,
        title: a.title,
        link: a.link,
        published_at: a.publishedAt?.toISOString() || null,
        created_at: a.createdAt.toISOString(),
      })),
      total,
      page,
      page_size: pageSize,
    };
  }, { auth: true });
}

// RSS 定时刷新：每天凌晨 3 点执行
export function scheduleRssRefresh() {
  const taskLogger = logger.child({ task: 'rss-refresh' });

  const run = async () => {
    taskLogger.info('[RSS刷新] 定时任务开始');
    try {
      const result = await refreshAllFeeds(taskLogger);
      taskLogger.info('[RSS刷新] 定时任务完成', { total: result.total, newArticles: result.newArticles });
    } catch (e) {
      taskLogger.error('[RSS刷新] 定时任务失败', e instanceof Error ? e : undefined, { error: e });
    }
  };

  // 计算距离明天凌晨 3 点还有多久
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(3, 0, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  const delay = nextRun.getTime() - now.getTime();

  setTimeout(() => {
    run();
    setInterval(run, 24 * 60 * 60 * 1000);
  }, delay);

  taskLogger.info('[RSS刷新] 定时任务已安排', { firstRunInMinutes: Math.round(delay / 1000 / 60) });
}
