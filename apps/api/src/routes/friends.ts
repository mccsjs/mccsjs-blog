import { Hono } from 'hono'
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm'
import { friends, friendTypes, rssArticles, siteSettings } from '@blog/db'
import { friendTypeSchema, friendSchema } from '@blog/shared'
import { requireAuth } from '../auth'
import type { DB } from '../db'
import {
  autoScreenshot,
  enrichFriendScreenshot,
  discoverRSSFeed,
  dualCheck,
  refreshAllFeeds,
} from '../utils/extras'

export function friendRoutes() {
  const app = new Hono()

  // ============ 友链分组（friend-types） ============

  app.get('/api/admin/friend-types', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const types = await db
      .select()
      .from(friendTypes)
      .orderBy(desc(friendTypes.sort))
    const result = await Promise.all(
      types.map(async (t) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(friends)
          .where(eq(friends.typeId, t.id))
        return { ...t, count }
      }),
    )
    return c.json(result)
  })

  app.post('/api/admin/friend-types', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = friendTypeSchema.parse(await c.req.json())
    const [t] = await db.insert(friendTypes).values({ id: crypto.randomUUID(), ...data }).returning()
    c.status(201)
    return c.json(t)
  })

  app.put('/api/admin/friend-types/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const id = c.req.param('id')
    const data = friendTypeSchema.partial().parse(await c.req.json())
    const [t] = await db.update(friendTypes).set(data).where(eq(friendTypes.id, id)).returning()
    return c.json(t)
  })

  app.delete('/api/admin/friend-types/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(friendTypes).where(eq(friendTypes.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  // ============ 友链（管理端 CRUD） ============

  app.get('/api/admin/friends', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const keyword = c.req.query('keyword') ?? undefined
    const typeId = c.req.query('typeId') ?? undefined

    const where = and(
      keyword
        ? or(
            like(friends.name, `%${keyword}%`),
            like(friends.url, `%${keyword}%`),
            like(friends.description, `%${keyword}%`),
          )
        : undefined,
      typeId ? eq(friends.typeId, typeId) : undefined,
    )

    const list = await db.query.friends.findMany({
      where,
      with: { type: true },
      orderBy: [desc(friends.sort), asc(friends.createdAt)],
    })
    return c.json(list.map(enrichFriendScreenshot))
  })

  // 管理端 RSS 文章列表（注册在 :id 之前）
  app.get('/api/admin/friends/feed', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '20') || 20))
    const list = await db.query.rssArticles.findMany({
      orderBy: [desc(rssArticles.publishedAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: { friend: true },
    })
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(rssArticles)
    return c.json({
      list: list.map((a) => ({
        id: a.id,
        friend_name: a.friend?.name ?? '',
        friend_url: a.friend?.url ?? '',
        title: a.title,
        link: a.link,
        published_at: a.publishedAt ? new Date(a.publishedAt * 1000).toISOString() : null,
        created_at: new Date(a.createdAt * 1000).toISOString(),
      })),
      total,
      page,
      page_size: pageSize,
    })
  })

  app.post('/api/admin/friends/check-all', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const token = (c.env as any).XXAPI_TOKEN as string | undefined
    const list = await db.select().from(friends).where(eq(friends.isInvalid, false))
    const results: any[] = []
    for (const f of list) {
      const [accessible, latency] = await dualCheck(f.url, token)
      await db.update(friends).set({ accessible, latency }).where(eq(friends.id, f.id))
      results.push({ id: f.id, name: f.name, accessible, latency })
    }
    return c.json({ total: list.length, results })
  })

  app.post('/api/admin/friends/refresh-feeds', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const result = await refreshAllFeeds(db)
    return c.json({ message: '刷新完成', ...result })
  })

  app.get('/api/admin/friends/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const friend = await db.query.friends.findFirst({
      where: eq(friends.id, c.req.param('id')),
      with: { type: true },
    })
    if (!friend) return c.json({ error: 'Not Found' }, 404)
    return c.json(enrichFriendScreenshot(friend))
  })

  app.post('/api/admin/friends', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = friendSchema.parse(await c.req.json())
    const { typeId, ...rest } = data

    if (!rest.isInvalid && !rest.screenshot && rest.url) {
      rest.screenshot = autoScreenshot(rest.url)
    }
    if ((rest.rssUrl === undefined || rest.rssUrl === null) && rest.url) {
      const discovered = await discoverRSSFeed(rest.url)
      if (discovered) rest.rssUrl = discovered
    }
    rest.rssUrl = rest.rssUrl ?? null

    const [f] = await db
      .insert(friends)
      .values({ ...rest, typeId: typeId ?? null })
      .returning()
    const full = await db.query.friends.findFirst({
      where: eq(friends.id, f.id),
      with: { type: true },
    })
    c.status(201)
    return c.json(enrichFriendScreenshot(full))
  })

  app.patch('/api/admin/friends/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const id = c.req.param('id')
    const data = friendSchema.partial().parse(await c.req.json())
    const { typeId, ...rest } = data

    // 截图被清空且未标记失效：自动生成
    if (rest.screenshot === '' && !rest.isInvalid) {
      const cur = await db.query.friends.findFirst({ where: eq(friends.id, id) })
      const url = rest.url || cur?.url
      if (url) rest.screenshot = autoScreenshot(url)
    }
    // URL 变化时尝试自动发现 RSS
    if (rest.rssUrl === undefined && rest.url) {
      const cur = await db.query.friends.findFirst({ where: eq(friends.id, id) })
      if (cur && cur.url !== rest.url) {
        const discovered = await discoverRSSFeed(rest.url)
        if (discovered) rest.rssUrl = discovered
      }
    }

    const updateData: any = {}
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) updateData[k] = v
    }
    if (typeId !== undefined) updateData.typeId = typeId ?? null

    const [f] = await db.update(friends).set(updateData).where(eq(friends.id, id)).returning()
    const full = await db.query.friends.findFirst({
      where: eq(friends.id, id),
      with: { type: true },
    })
    return c.json(enrichFriendScreenshot(full))
  })

  app.delete('/api/admin/friends/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(friends).where(eq(friends.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  // 单条测速
  app.post('/api/admin/friends/:id/check', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const id = c.req.param('id')
    const friend = await db.select().from(friends).where(eq(friends.id, id)).limit(1)
    if (friend.length === 0) return c.json({ error: 'Not Found' }, 404)
    if (friend[0].isInvalid) return c.json({ error: '友链已标记失效，跳过测速' }, 400)
    const token = (c.env as any).XXAPI_TOKEN as string | undefined
    const [accessible, latency] = await dualCheck(friend[0].url, token)
    await db.update(friends).set({ accessible, latency }).where(eq(friends.id, id))
    return c.json({ accessible, latency })
  })

  // 推荐 / 取消推荐
  app.post('/api/admin/friends/:id/recommend', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const id = c.req.param('id')
    const friend = await db.select().from(friends).where(eq(friends.id, id)).limit(1)
    if (friend.length === 0) return c.json({ error: 'Not Found' }, 404)
    const [updated] = await db
      .update(friends)
      .set({ recommended: !friend[0].recommended })
      .where(eq(friends.id, id))
      .returning()
    return c.json({ id: updated.id, recommended: updated.recommended })
  })

  // ============ 友链（公开） ============

  app.get('/api/friends', async (c) => {
    const db: DB = c.get('db')
    const types = await db.query.friendTypes.findMany({
      where: eq(friendTypes.isVisible, true),
      with: { friends: { orderBy: [desc(friends.sort), asc(friends.createdAt)] } },
      orderBy: [desc(friendTypes.sort)],
    })
    const groups = types
      .filter((t) => t.friends.length > 0)
      .map((t) => ({
        type_id: t.id,
        type_name: t.name,
        type_sort: t.sort,
        friends: t.friends.map(enrichFriendScreenshot),
      }))
    return c.json({ groups })
  })

  app.get('/api/friends/recommended', async (c) => {
    const db: DB = c.get('db')
    const list = await db.query.friends.findMany({
      where: and(eq(friends.recommended, true), eq(friends.isInvalid, false)),
      orderBy: [desc(friends.sort), asc(friends.createdAt)],
    })
    return c.json(
      list.map(enrichFriendScreenshot).map((f) => ({
        id: f.id,
        name: f.name,
        url: f.url,
        avatar: f.avatar || f.screenshot || '',
        screenshot: f.screenshot || '',
      })),
    )
  })

  // 公开 RSS 文章列表（朋友圈）
  app.get('/api/friends/feed', async (c) => {
    const db: DB = c.get('db')
    const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(c.req.query('pageSize') || '21') || 21))
    const list = await db.query.rssArticles.findMany({
      orderBy: [desc(rssArticles.publishedAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: { friend: true },
    })
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(rssArticles)
    return c.json({
      code: 0,
      data: {
        list: list.map((a) => ({
          id: a.id,
          friend_id: a.friendId,
          friend_name: a.friend?.name ?? '',
          friend_url: a.friend?.url ?? '',
          friend_avatar: a.friend?.avatar ?? '',
          title: a.title,
          link: a.link,
          published_at: a.publishedAt ? new Date(a.publishedAt * 1000).toISOString() : null,
        })),
        total,
        page,
        page_size: pageSize,
      },
    })
  })

  // ============ 上传（本地 R2；未配置绑定返回 501） ============

  app.post('/api/upload', requireAuth, async (c) => {
    const bucket = (c.env as any).BUCKET as R2Bucket | undefined
    if (!bucket) return c.json({ error: '上传未启用：请配置 R2 存储桶绑定' }, 501)

    const form = await c.req.parseBody({ all: true })
    const file = form['file']
    if (!(file instanceof File)) return c.json({ error: 'No file provided' }, 400)

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) return c.json({ error: 'Invalid file type' }, 400)
    if (file.size > 5 * 1024 * 1024) return c.json({ error: 'File too large' }, 400)

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const key = `uploads/${name}`
    await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
    return c.json({ url: `/${key}` })
  })

  // ============ 图床代理（Cloudflare-ImgBed） ============

  app.post('/api/imgbed/upload', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const rows = await db.select().from(siteSettings)
    const map = new Map(rows.map((r) => [r.key, r.value]))
    const imgbedUrl = (map.get('imgbedUrl') ?? '').trim()
    const imgbedToken = (map.get('imgbedToken') ?? '').trim()
    if (!imgbedUrl || !imgbedToken) {
      return c.json({ error: '图床未配置：请在「系统设置 → 图床设置」填写图床地址与 API Token' }, 400)
    }

    const form = await c.req.parseBody({ all: true })
    const file = form['file']
    if (!(file instanceof File)) return c.json({ error: 'No file provided' }, 400)

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) return c.json({ error: '仅支持 jpeg / png / webp / gif 图片' }, 400)
    if (file.size > 5 * 1024 * 1024) return c.json({ error: '图片不能超过 5MB' }, 400)

    let target: URL
    try {
      target = new URL(imgbedUrl)
    } catch {
      return c.json({ error: '图床地址格式不正确' }, 400)
    }
    const base = target.pathname.replace(/\/+$/, '')
    target.pathname = `${base}/upload`.replace(/\/{2,}/g, '/')
    target.searchParams.set('returnFormat', 'full')

    const fd = new FormData()
    fd.set('file', file, file.name)
    const upstream = await fetch(target.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${imgbedToken}` },
      body: fd,
    })
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return c.json({ error: `图床上传失败 (${upstream.status}): ${text.slice(0, 200)}` }, 502)
    }
    const data: any = await upstream.json().catch(() => null)
    if (!data) return c.json({ error: '图床返回格式异常' }, 502)
    const item = Array.isArray(data) ? data[0] : data
    const url = item?.publicUrl || item?.src
    if (!url) return c.json({ error: '图床未返回图片地址' }, 502)
    return c.json({ url })
  })

  return app
}
