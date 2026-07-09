import RssParser from 'rss-parser'
import cron from 'node-cron'
import pLimit from 'p-limit'
import { prisma } from '../db'

// 自动发现友链的 RSS 地址
export async function discoverRSSFeed(siteUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    // 1. 从网站首页 HTML 中解析 RSS 链接
    const resp = await fetch(siteUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MccsjsBlog/1.0)' },
    })
    clearTimeout(timeout)

    if (!resp.ok) return null

    const html = await resp.text()

    // 解析 <link type="application/rss+xml" href="..."> 或 <link type="application/atom+xml" href="...">
    const linkRegex = /<link[^>]+type\s*=\s*["'](application\/(rss|atom)\+xml|application\/feed\+json)["'][^>]+href\s*=\s*["']([^"']+)["']/gi
    const matches = [...html.matchAll(linkRegex)]

    if (matches.length > 0) {
      const href = matches[0]?.[3]
      if (href) {
        // 相对路径转绝对路径
        if (href.startsWith('http')) return href
        const base = new URL(siteUrl)
        if (href.startsWith('/')) return base.origin + href
        return base.origin + '/' + href
      }
    }

    // 2. 尝试常见 RSS 路径
    const commonPaths = ['/feed', '/rss.xml', '/atom.xml', '/index.xml', '/feed.xml', '/rss', '/posts/index.xml', '/blog/rss', '/blog/feed']
    const base = new URL(siteUrl)

    for (const path of commonPaths) {
      try {
        const rssUrl = base.origin + path
        const testResp = await fetch(rssUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MccsjsBlog/1.0)' },
        })
        const contentType = testResp.headers.get('content-type') || ''
        if (testResp.ok && (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom') || contentType.includes('json'))) {
          return rssUrl
        }
      } catch {
        continue
      }
    }

    return null
  } catch {
    return null
  }
}

const rssParser = new RssParser()

// 解析单个友链的 RSS/Atom feed
export async function parseFriendFeed(friendId: string, rssUrl: string): Promise<{ title: string; link: string; publishedAt: Date | null }[]> {
  try {
    const feed = await rssParser.parseURL(rssUrl)
    const articles: { title: string; link: string; publishedAt: Date | null }[] = []
    for (const item of feed.items || []) {
      if (!item.link) continue
      let publishedAt: Date | null = null
      // rss-parser 的正确属性：isoDate > pubDate
      if (item.isoDate) publishedAt = new Date(item.isoDate)
      if (!publishedAt && item.pubDate) publishedAt = new Date(item.pubDate)
      articles.push({ title: item.title || '无标题', link: item.link, publishedAt })
    }
    return articles
  } catch (e) {
    console.error(`[RSS解析失败] ${rssUrl}`, e instanceof Error ? e.message : e)
    return []
  }
}

// 刷新单个友链的 RSS（写入数据库）
export async function refreshFriendFeed(friendId: string, rssUrl: string): Promise<number> {
  const articles = await parseFriendFeed(friendId, rssUrl)
  if (articles.length === 0) return 0
  let newCount = 0
  for (const article of articles) {
    try {
      await prisma.rssArticle.create({ data: { friendId, title: article.title, link: article.link, publishedAt: article.publishedAt } })
      newCount++
    } catch (e: any) {
      if (e?.code === 'P2002') continue // 唯一约束冲突（已存在），跳过
      throw e
    }
  }
  // 更新友链的 RSS 最后更新时间
  const latest = await prisma.rssArticle.findFirst({ where: { friendId }, orderBy: { publishedAt: 'desc' } })
  if (latest) await prisma.friend.update({ where: { id: friendId }, data: { rssLatime: latest.publishedAt || new Date() } })
  return newCount
}

// 刷新所有配置了 RSS 的友链（并发控制）
export async function refreshAllFeeds(): Promise<{ total: number; newArticles: number }> {
  const friends = await prisma.friend.findMany({ where: { rssUrl: { not: null } } })
  if (friends.length === 0) return { total: 0, newArticles: 0 }
  const limit = pLimit(5)
  let newArticles = 0
  const tasks = friends.map((f) => limit(async () => { if (!f.rssUrl) return 0; const count = await refreshFriendFeed(f.id, f.rssUrl!); newArticles += count; return count }))
  await Promise.all(tasks)
  return { total: friends.length, newArticles }
}

// RSS 定时刷新：每天凌晨 3 点执行
export function scheduleRssRefresh() {
  cron.schedule('0 3 * * *', async () => {
    console.log('[RSS刷新] 开始...')
    try {
      const result = await refreshAllFeeds()
      console.log(`[RSS刷新] 完成，共 ${result.total} 个友链，${result.newArticles} 篇新文章`)
    } catch (e) { console.error('[RSS刷新] 失败', e) }
  }, { timezone: 'Asia/Shanghai' })
  console.log('[RSS刷新] 定时任务已安排：每天 03:00')
}
