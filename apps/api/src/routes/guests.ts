import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { comments, guestBadges } from '@blog/db'
import { requireAuth } from '../auth'
import type { DB } from '../db'

// 访客（评论者）聚合 + 自定义徽章
export function guestRoutes() {
  const app = new Hono()

  // 管理端：聚合所有评论者为「访客」，按 email 归一化去重
  // 返回昵称（最新）、网站、是否博主、评论数、最近评论时间、自定义徽章
  app.get('/api/admin/guests', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const keyword = (c.req.query('keyword') || '').trim().toLowerCase()
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '50', 10) || 50))

    // 用 SQL 窗口函数按 email 聚合（每个邮箱取最新一条 + 评论总数），避免把全部评论拉进内存
    const ranked = db
      .select({
        email: comments.email,
        author: comments.author,
        website: comments.website,
        isAdmin: comments.isAdmin,
        createdAt: comments.createdAt,
        rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${comments.email} ORDER BY ${comments.createdAt} DESC)`.as('rn'),
      })
      .from(comments)
      .as('ranked')

    const rows = await db
      .select({
        email: ranked.email,
        author: ranked.author,
        website: ranked.website,
        isAdmin: ranked.isAdmin,
        lastCommentAt: ranked.createdAt,
        commentCount: sql<number>`COUNT(*) OVER (PARTITION BY ${ranked.email})`.as('commentCount'),
        badge: guestBadges.badge,
      })
      .from(ranked)
      .leftJoin(guestBadges, eq(guestBadges.email, ranked.email))
      .where(eq(ranked.rn, 1))

    const list = rows.map((r: any) => ({
      email: r.email,
      name: r.author,
      website: r.website || '',
      isAdmin: !!r.isAdmin,
      lastCommentAt: r.lastCommentAt,
      commentCount: r.commentCount,
      badge: r.badge || '',
    }))

    // 关键词过滤（昵称 / 邮箱 / 网站）
    const filtered = keyword
      ? list.filter(
          (e) =>
            (e.name || '').toLowerCase().includes(keyword) ||
            (e.email || '').toLowerCase().includes(keyword) ||
            (e.website || '').toLowerCase().includes(keyword)
        )
      : list

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

    return c.json({ list: paged, total, page: safePage, pageSize, totalPages })
  })

  // 管理端：设置 / 清除某访客（按 email）的自定义徽章
  // badge 为空串 = 清除
  app.put('/api/admin/guests/:email/badge', requireAuth, async (c) => {
    const db: DB = c.get('db')
    // Hono 已对 path param 做 URL-decode，无需再 decode
    const email = (c.req.param('email') || '').trim().toLowerCase()
    if (!email) return c.json({ error: '邮箱不能为空' }, 400)
    const body = await c.req.json<{ badge?: string }>().catch(() => ({}))
    // 去除控制字符并限制长度，避免超长 / 恶意 badge 入库后在评论区渲染
    const badge = (body.badge ?? '')
      .trim()
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .slice(0, 30)

    if (!badge) {
      await db.delete(guestBadges).where(eq(guestBadges.email, email))
    } else {
      const exist = await db.select().from(guestBadges).where(eq(guestBadges.email, email)).limit(1)
      if (exist.length) {
        await db.update(guestBadges).set({ badge, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(guestBadges.email, email))
      } else {
        await db.insert(guestBadges).values({ id: crypto.randomUUID(), email, badge, updatedAt: Math.floor(Date.now() / 1000) })
      }
    }
    return c.json({ ok: true, email, badge })
  })

  // 公开：返回所有自定义访客徽章的 email→badge 映射（供评论区渲染）
  app.get('/api/guest-badges', async (c) => {
    const db: DB = c.get('db')
    const rows = await db.select({ email: guestBadges.email, badge: guestBadges.badge }).from(guestBadges)
    const map: Record<string, string> = {}
    rows.forEach((r: any) => {
      if (r.email && r.badge) map[r.email.trim().toLowerCase()] = r.badge
    })
    return c.json(map)
  })

  return app
}
