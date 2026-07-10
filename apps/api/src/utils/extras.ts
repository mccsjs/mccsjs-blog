// Cloudflare Workers 兼容工具集合（替代原 backend 的 screenshot/feed/friend-check）
// 设计原则：纯 fetch + 轻量解析，避免 rss-parser / node-cron / puppeteer 等 Workers 不友好依赖。

import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { friends, friendTypes, rssArticles } from '@blog/db'
import type { DB } from '../db'

// ============ 友链截图（基于 WordPress mshots API，纯 URL，无需浏览器） ============

export function autoScreenshot(url: string): string {
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=400&h=300`
}

// 友链无截图时动态生成 mshots URL（仅返回时补充，不落库）
export function enrichFriendScreenshot<
  T extends { url: string; screenshot: string | null; isInvalid: boolean },
>(friend: T): T {
  if (!friend.isInvalid && !friend.screenshot && friend.url) {
    return { ...friend, screenshot: autoScreenshot(friend.url) }
  }
  return friend
}

// ============ RSS 自动发现 ============

export async function discoverRSSFeed(siteUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const resp = await fetch(siteUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MccsjsBlog/1.0)' },
    })
    clearTimeout(timeout)

    if (!resp.ok) return null

    const html = await resp.text()

    // 解析 <link type="application/rss+xml|atom+xml|feed+json" href="...">
    const linkRegex =
      /<link[^>]+type\s*=\s*["'](application\/(rss|atom)\+xml|application\/feed\+json)["'][^>]+href\s*=\s*["']([^"']+)["']/gi
    const matches = [...html.matchAll(linkRegex)]
    if (matches.length > 0) {
      const href = matches[0][3]
      if (href.startsWith('http')) return href
      const base = new URL(siteUrl)
      if (href.startsWith('/')) return base.origin + href
      return base.origin + '/' + href
    }

    // 尝试常见 RSS 路径
    const commonPaths = [
      '/feed', '/rss.xml', '/atom.xml', '/index.xml', '/feed.xml', '/rss',
      '/posts/index.xml', '/blog/rss', '/blog/feed',
    ]
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
        if (
          testResp.ok &&
          (contentType.includes('xml') ||
            contentType.includes('rss') ||
            contentType.includes('atom') ||
            contentType.includes('json'))
        ) {
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

// ============ 轻量 RSS / Atom 解析（不依赖 rss-parser） ============

function textOf(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!m) return null
  let v = m[1].trim()
  v = v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
  return v || null
}

function atomLink(block: string): string | null {
  const links = [...block.matchAll(/<link\b([^>]*)>/gi)]
  for (const lm of links) {
    const attrs = lm[1]
    const rel = /rel=["']([^"']+)["']/i.exec(attrs)
    if (rel && rel[1] !== 'alternate' && rel[1] !== 'self') continue
    const href = /href=["']([^"']+)["']/i.exec(attrs)
    if (href) return href[1]
  }
  return null
}

function parseDate(s: string | null): number | null {
  if (!s) return null
  const t = Date.parse(s)
  return isNaN(t) ? null : Math.floor(t / 1000)
}

export interface FeedItem {
  title: string
  link: string
  publishedAt: number | null
}

export function parseFeedXml(xml: string): FeedItem[] {
  const items: FeedItem[] = []

  // RSS 2.0
  const rssBlocks = xml.match(/<item\b[^>]*>([\s\S]*?)<\/item>/gi) || []
  for (const block of rssBlocks) {
    const title = textOf(block, 'title')
    const link = textOf(block, 'link')
    const pub = textOf(block, 'pubDate') || textOf(block, 'isoDate') || textOf(block, 'dc:date')
    if (title && link) items.push({ title, link, publishedAt: parseDate(pub) })
  }

  // Atom（RSS 无结果时再试）
  if (items.length === 0) {
    const atomBlocks = xml.match(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi) || []
    for (const block of atomBlocks) {
      const title = textOf(block, 'title')
      const link = atomLink(block)
      const pub = textOf(block, 'published') || textOf(block, 'updated') || textOf(block, 'issued')
      if (title && link) items.push({ title, link, publishedAt: parseDate(pub) })
    }
  }

  return items
}

// ============ RSS 刷新 ============

export async function refreshFriendFeed(
  db: DB,
  friendId: string,
  rssUrl: string,
): Promise<number> {
  let xml: string
  try {
    const resp = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MccsjsBlog/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) return 0
    xml = await resp.text()
  } catch {
    return 0
  }

  const items = parseFeedXml(xml)
  if (items.length === 0) return 0

  let newCount = 0
  for (const it of items) {
    const existing = await db
      .select({ id: rssArticles.id })
      .from(rssArticles)
      .where(eq(rssArticles.link, it.link))
      .limit(1)
    if (existing.length > 0) continue
    await db.insert(rssArticles).values({
      id: crypto.randomUUID(),
      friendId,
      title: it.title,
      link: it.link,
      publishedAt: it.publishedAt,
    })
    newCount++
  }

  // 更新友链 RSS 最后更新时间
  const latest = await db
    .select({ publishedAt: rssArticles.publishedAt })
    .from(rssArticles)
    .where(eq(rssArticles.friendId, friendId))
    .orderBy(desc(rssArticles.publishedAt))
    .limit(1)
  if (latest.length) {
    await db
      .update(friends)
      .set({ rssLatime: latest[0].publishedAt ?? Math.floor(Date.now() / 1000) })
      .where(eq(friends.id, friendId))
  }

  return newCount
}

export async function refreshAllFeeds(db: DB): Promise<{ total: number; newArticles: number }> {
  const list = await db
    .select()
    .from(friends)
    .where(isNotNull(friends.rssUrl))
  if (list.length === 0) return { total: 0, newArticles: 0 }
  let newArticles = 0
  for (const f of list) {
    if (!f.rssUrl) continue
    newArticles += await refreshFriendFeed(db, f.id, f.rssUrl)
  }
  return { total: list.length, newArticles }
}

// ============ 友链测速 ============

const XXAPI_BASE = 'https://v2.xxapi.cn/api/speed?url='

export async function apiCheck(targetURL: string, token?: string): Promise<[boolean, number]> {
  if (!token) return [false, 0]
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const resp = await fetch(XXAPI_BASE + encodeURIComponent(targetURL), {
      signal: controller.signal,
      headers: { Authorization: 'Bearer ' + token },
    })
    clearTimeout(timeout)
    if (!resp.ok) return [false, 0]
    const result = (await resp.json()) as { code: number; data: string }
    if (result.code !== 200) return [false, 0]
    const latency = parseInt((result.data || '').replace('ms', '')) || 0
    return [true, latency]
  } catch {
    return [false, 0]
  }
}

export async function checkAccessibility(targetURL: string): Promise<[boolean, number]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const start = Date.now()
    const resp = await fetch(targetURL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)' },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    const elapsed = Date.now() - start
    const accessible = resp.status >= 200 && resp.status < 400
    return [accessible, elapsed]
  } catch {
    return [false, 0]
  }
}

export async function dualCheck(targetURL: string, token?: string): Promise<[number, number]> {
  const [ok1, lat1] = await apiCheck(targetURL, token)
  if (ok1 && lat1 > 0) return [0, lat1]

  const [ok2, lat2] = await checkAccessibility(targetURL)
  if (ok2) return [0, lat2]

  return [1, lat1 || lat2]
}

export async function runFriendAutoCheck(db: DB, token?: string): Promise<number> {
  const list = await db.select().from(friends).where(eq(friends.isInvalid, false))
  for (const f of list) {
    const [accessible, latency] = await dualCheck(f.url, token)
    await db.update(friends).set({ accessible, latency }).where(eq(friends.id, f.id))
  }
  return list.length
}
