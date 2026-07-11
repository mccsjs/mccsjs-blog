import { Hono } from 'hono'
import { and, asc, desc, eq, inArray, like, sql } from 'drizzle-orm'
import { posts, categories, tags, postTags, comments, siteSettings } from '@blog/db'
import {
  postCreateSchema,
  postUpdateSchema,
  commentCreateSchema,
  categorySchema,
  tagSchema,
  settingsUpdateSchema,
  defaultSettings,
  settingKeys,
  type SettingKey,
} from '@blog/shared'
import { generateCrc32Slug, getClientIp, resolveClientInfo } from '../utils'
import { notifyOnNewComment } from '../utils/email'
import { requireAuth, verifyPassword, hashPassword, signCommentAdminToken, verifyCommentAdminToken } from '../auth'
import { renderCommentHtml } from '../markdown'
import type { DB } from '../db'

// 绝不随设置接口返回 / 空值表示「不修改（保留原值）」的敏感字段
const SECRET_KEYS = ['adminPassword', 'mailApiKey', 'mailGatewayToken', 'mailSmtpPass']

// 把关系查询结果转换成前端期望的形状：tags 取实际标签对象
function shapePost(p: any) {
  const { tags, ...rest } = p
  return { ...rest, tags: (tags ?? []).map((t: any) => t.tag ?? t) }
}

// Drizzle 抛 DrizzleQueryError，"UNIQUE" 在 cause.message 里
function isUniqueError(e: any): boolean {
  return /UNIQUE/i.test(`${e?.message ?? ''} ${e?.cause?.message ?? ''}`)
}

// 读取单条站点设置（博主身份相关配置）
async function getSiteSetting(db: DB, key: string): Promise<string> {
  const row = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1)
  return row[0]?.value ?? ''
}

export function contentRoutes() {
  const app = new Hono()

  // ============ 文章 ============

  // 列表（公开：仅已发布；admin=true：全部）。支持 categorySlug / tagSlug 过滤
  app.get('/api/posts', async (c) => {
    const db: DB = c.get('db')
    const admin = c.req.query('admin') === 'true'
    const categorySlug = c.req.query('categorySlug') ?? undefined
    const tagSlug = c.req.query('tagSlug') ?? undefined

    let categoryId: string | undefined
    if (categorySlug) {
      const cat = await db.query.categories.findFirst({ where: eq(categories.slug, categorySlug) })
      if (!cat) return c.json([])
      categoryId = cat.id
    }

    let allowedIds: string[] | undefined
    if (tagSlug) {
      const tag = await db.query.tags.findFirst({ where: eq(tags.slug, tagSlug) })
      if (!tag) return c.json([])
      const rows = await db.select({ postId: postTags.postId }).from(postTags).where(eq(postTags.tagId, tag.id))
      allowedIds = rows.map((r) => r.postId)
      if (allowedIds.length === 0) return c.json([])
    }

    const result = await db.query.posts.findMany({
      where: (p: any, { and, eq }: any) =>
        and(
          admin ? undefined : eq(p.published, true),
          categoryId ? eq(p.categoryId, categoryId) : undefined,
          allowedIds ? inArray(p.id, allowedIds) : undefined
        ),
      with: { author: true, category: true, tags: { with: { tag: true } } },
      orderBy: (p: any, { desc }: any) => [desc(p.createdAt)],
    })
    return c.json(result.map((p: any) => {
      const { content, ...rest } = shapePost(p)
      return rest
    }))
  })

  // 搜索（公开，仅已发布）
  app.get('/api/posts/search', async (c) => {
    const db: DB = c.get('db')
    const q = (c.req.query('q') ?? '').trim()
    if (!q) return c.json([])
    const result = await db.query.posts.findMany({
      where: (p: any, { and, eq, or, like }: any) =>
        and(eq(p.published, true), or(like(p.title, `%${q}%`), like(p.content, `%${q}%`))),
      with: { author: true, category: true, tags: { with: { tag: true } } },
      orderBy: (p: any, { desc }: any) => [desc(p.createdAt)],
      limit: 20,
    })
    return c.json(result.map((p: any) => {
      const { content, ...rest } = shapePost(p)
      return rest
    }))
  })

  // 单篇（按 slug）。admin=true 可看草稿；非 admin 自增阅读量
  app.get('/api/posts/:slug', async (c) => {
    const db: DB = c.get('db')
    const admin = c.req.query('admin') === 'true'
    const slug = c.req.param('slug')
    const post = await db.query.posts.findFirst({
      where: eq(posts.slug, slug),
      with: { author: true, category: true, tags: { with: { tag: true } } },
    })
    if (!post) return c.json({ error: 'Not Found' }, 404)
    if (!post.published && !admin) return c.json({ error: 'Not Found' }, 404)
    if (!admin) {
      await db.update(posts).set({ views: sql`${posts.views} + 1` }).where(eq(posts.id, post.id))
    }
    return c.json(shapePost(post))
  })

  // 创建（admin）
  app.post('/api/posts', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = postCreateSchema.parse(await c.req.json())
    let slug = data.slug
    if (!slug) {
      // 不填写：按 CRC32 + hex 自动生成
      slug = await generateCrc32Slug(async (s) => !!(await db.query.posts.findFirst({ where: eq(posts.slug, s) })), data.title)
    } else {
      // 填写：严格按照填写的来，仅校验唯一性
      const existing = await db.query.posts.findFirst({ where: eq(posts.slug, slug) })
      if (existing) return c.json({ error: 'Slug already exists' }, 409)
    }
    const { tagIds, ...rest } = data
    const [p] = await db.insert(posts).values({ ...rest, slug, authorId: c.get('user').id }).returning()
    if (tagIds && tagIds.length > 0) {
      await db.insert(postTags).values(tagIds.map((tagId: string) => ({ postId: p.id, tagId })))
    }
    const full = await db.query.posts.findFirst({
      where: eq(posts.id, p.id),
      with: { author: true, category: true, tags: { with: { tag: true } } },
    })
    c.status(201)
    return c.json(shapePost(full))
  })

  // 更新（admin）
  app.patch('/api/posts/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const id = c.req.param('id')
    const { categoryId, tagIds, ...rest } = postUpdateSchema.parse(await c.req.json())
    await db.update(posts).set({ ...rest, categoryId: categoryId ?? undefined }).where(eq(posts.id, id))
    if (tagIds) {
      await db.delete(postTags).where(eq(postTags.postId, id))
      if (tagIds.length > 0) {
        await db.insert(postTags).values(tagIds.map((tagId: string) => ({ postId: id, tagId })))
      }
    }
    const full = await db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: { author: true, category: true, tags: { with: { tag: true } } },
    })
    return c.json(shapePost(full))
  })

  // 删除（admin）
  app.delete('/api/posts/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(posts).where(eq(posts.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  // ============ 分类 ============
  app.get('/api/categories', async (c) => {
    const db: DB = c.get('db')
    const rows = await db.select().from(categories).orderBy(categories.name)
    return c.json(rows)
  })

  app.post('/api/categories', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = categorySchema.parse(await c.req.json())
    try {
      const [cat] = await db.insert(categories).values(data).returning()
      c.status(201)
      return c.json(cat)
    } catch (e: any) {
      if (isUniqueError(e)) return c.json({ error: '该分类已存在' }, 409)
      throw e
    }
  })

  app.patch('/api/categories/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = categorySchema.partial().parse(await c.req.json())
    const [cat] = await db.update(categories).set(data).where(eq(categories.id, c.req.param('id'))).returning()
    return c.json(cat)
  })

  app.delete('/api/categories/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(categories).where(eq(categories.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  // ============ 标签 ============
  app.get('/api/tags', async (c) => {
    const db: DB = c.get('db')
    const rows = await db.select().from(tags).orderBy(tags.name)
    return c.json(rows)
  })

  app.post('/api/tags', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = tagSchema.parse(await c.req.json())
    try {
      const [tag] = await db.insert(tags).values(data).returning()
      c.status(201)
      return c.json(tag)
    } catch (e: any) {
      if (isUniqueError(e)) return c.json({ error: '该标签已存在' }, 409)
      throw e
    }
  })

  app.patch('/api/tags/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = tagSchema.partial().parse(await c.req.json())
    const [tag] = await db.update(tags).set(data).where(eq(tags.id, c.req.param('id'))).returning()
    return c.json(tag)
  })

  app.delete('/api/tags/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(tags).where(eq(tags.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  // ============ 评论 ============
  app.get('/api/comments', async (c) => {
    const db: DB = c.get('db')
    const postId = c.req.query('postId') ?? undefined
    const admin = c.req.query('admin') === 'true'
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20))
    const adminEmail = c.env.ADMIN_EMAIL || ''

    const rows = await db
      .select()
      .from(comments)
      .where(
        and(
          postId ? eq(comments.postId, postId) : undefined,
          admin ? undefined : eq(comments.visible, true)
        )
      )
      .orderBy(desc(comments.createdAt))

    // 管理端：保持历史纯数组契约（评论管理 / 仪表盘直接 .map/.filter/.length）
    if (admin) return c.json(rows)

    // 公开端：组装二级嵌套 + 服务端渲染 Markdown + 博主标识
    const byId = new Map<string, any>()
    const roots: any[] = []
    const items = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        contentHtml: await renderCommentHtml(r.content),
        isAdmin: !!r.isAdmin || (!!adminEmail && r.email === adminEmail),
        replies: [] as any[],
      }))
    )
    items.forEach((item) => byId.set(item.id, item))
    byId.forEach((item) => {
      if (item.parentId && byId.has(item.parentId)) {
        const parent = byId.get(item.parentId)
        // 标注「回复 @直接父作者」（楼中楼展示用）
        item.replyToAuthor = parent.author
        // 向上回溯到根评论，把回复挂到根评论的 replies（楼中楼：恒为 2 层，对齐 cwd/twikoo）
        let rootId: string = item.parentId
        let cur = parent
        while (cur && cur.parentId && byId.has(cur.parentId)) {
          rootId = cur.parentId
          cur = byId.get(cur.parentId)!
        }
        const root = byId.get(rootId)
        if (root && !root.parentId) {
          root.replies.push(item)
        } else {
          // 回溯到的 root 仍有更上层（直接父的父不在本次查询/分页内）→ 挂到直接父，
          // 避免新回复被误判为独立根卡片（仍正确显示为直接父楼下的二级嵌套回复）
          parent.replies.push(item)
        }
      } else {
        roots.push(item)
      }
    })
    // 回复按时间正序展示
    roots.forEach((r) => r.replies.sort((a: any, b: any) => a.createdAt - b.createdAt))

    const total = roots.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const paged = roots.slice((safePage - 1) * pageSize, safePage * pageSize)

    return c.json({
      data: paged,
      total,
      page: safePage,
      pageSize,
      totalPages,
    })
  })

  app.post('/api/comments', async (c) => {
    const db: DB = c.get('db')
    const data = commentCreateSchema.parse(await c.req.json())
    const post = await db.query.posts.findFirst({ where: eq(posts.id, data.postId) })
    if (!post) return c.json({ error: 'Post not found' }, 404)

    // 回复必须指向同一篇文章下已存在的评论
    let parentId: string | null = data.parentId ?? null
    let parent: any = null
    if (parentId) {
      parent = await db.query.comments.findFirst({ where: eq(comments.id, parentId) })
      if (!parent || parent.postId !== data.postId) {
        parentId = null
        parent = null
      }
    }

    const ip = getClientIp(c)
    // 优先用前端上报的 UA（含 Win11/macOS 版本修正），否则退回请求头
    const ua = data.ua?.trim() || c.req.header('user-agent') || ''
    const { os, browser } = resolveClientInfo(ua)
    const region = data.region?.trim() || null

    // 博主身份校验：前端「设置」按钮登录后，发评论时携带 Authorization: Bearer <token>
    let isAdmin = false
    let adminName = ''
    let adminEmailCfg = ''
    const authHeader = c.req.header('Authorization') || ''
    if (authHeader.startsWith('Bearer ')) {
      const adminEmail = await getSiteSetting(db, 'adminEmail')
      const adminPwHash = await getSiteSetting(db, 'adminPassword')
      if (adminEmail && adminPwHash) {
        const payload = await verifyCommentAdminToken(authHeader.slice(7), adminPwHash)
        if (payload && payload.sub === adminEmail) {
          isAdmin = true
          adminName = payload.name || ''
          adminEmailCfg = adminEmail
        }
      }
    }

    // 防冒充：使用博主邮箱发表评论，必须先以博主身份登录（携带有效 Token）。
    // 仅以邮箱为锚点——邮箱是博主身份唯一标识，昵称可随意填写，单靠昵称拦不住真冒充；
    // 博主登录后邮箱被强制覆盖为 adminEmailCfg 且带 Token，isAdmin=true，不受此限制。
    // 邮箱比对前做归一化（去空格+小写），对齐 Twikoo equalsMail，防止 Admin@qq.com 之类绕过。
    if (!isAdmin) {
      const cfgEmail = (await getSiteSetting(db, 'adminEmail'))?.trim().toLowerCase()
      const inputEmail = data.email?.trim().toLowerCase()
      if (cfgEmail && inputEmail && inputEmail === cfgEmail) {
        return c.json({ error: '该邮箱属于博主身份，请先点击「设置」以博主身份登录后再发表评论' }, 403)
      }
    }

    const website =
      data.website && data.website.trim()
        ? /^https?:\/\//i.test(data.website.trim())
          ? data.website.trim()
          : `https://${data.website.trim()}`
        : null

    const { ua: _ua, ...restData } = data
    const [comment] = await db
      .insert(comments)
      .values({
        ...restData,
        // 博主身份登录后，评论作者/邮箱以管理端配置为准，并标记 isAdmin
        author: isAdmin ? adminName : restData.author,
        email: isAdmin ? adminEmailCfg : restData.email,
        parentId,
        website,
        ip,
        region,
        os,
        browser,
        visible: true,
        isAdmin,
      })
      .returning()

    // 触发邮箱提醒（不阻断评论主流程：任何异常仅记录日志，不影响评论返回）
    try {
      await notifyOnNewComment(db, {
        comment: comment as { id: string; author: string; email: string; content: string },
        post,
        parent,
        baseUrl: new URL(c.req.url).origin,
      })
    } catch (e) {
      console.error('[email notify] 发送失败（已忽略）:', e)
    }

    c.status(201)
    return c.json(comment)
  })

  // 点赞 / 取消点赞（公开，前端以 localStorage 去重 + 乐观更新）
  app.post('/api/comments/:id/like', async (c) => {
    const db: DB = c.get('db')
    const id = c.req.param('id')
    const [row] = await db.update(comments).set({ likes: sql`${comments.likes} + 1` }).where(eq(comments.id, id)).returning()
    if (!row) return c.json({ error: 'Comment not found' }, 404)
    return c.json({ id, likes: row.likes })
  })

  app.delete('/api/comments/:id/like', async (c) => {
    const db: DB = c.get('db')
    const id = c.req.param('id')
    const [row] = await db
      .update(comments)
      .set({ likes: sql`MAX(0, ${comments.likes} - 1)` })
      .where(eq(comments.id, id))
      .returning()
    if (!row) return c.json({ error: 'Comment not found' }, 404)
    return c.json({ id, likes: row.likes })
  })

  app.patch('/api/comments/:id/visible', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const body = await c.req.json<{ visible?: boolean }>().catch(() => ({}))
    const visible = typeof body === 'object' && body !== null && 'visible' in body ? Boolean(body.visible) : true
    const [comment] = await db.update(comments).set({ visible }).where(eq(comments.id, c.req.param('id'))).returning()
    return c.json(comment)
  })

  app.delete('/api/comments/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(comments).where(eq(comments.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  // ============ 站点设置 ============
  app.get('/api/settings', async (c) => {
    const db: DB = c.get('db')
    const rows = await db.select().from(siteSettings)
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value
    const settings = Object.fromEntries(settingKeys.map((key) => [key, map[key] ?? defaultSettings[key]])) as Record<SettingKey, string>
    // 密码哈希 / 邮件密钥绝不随设置接口返回
    const safe = Object.fromEntries(Object.entries(settings).filter(([k]) => !SECRET_KEYS.includes(k))) as Record<SettingKey, string>
    return c.json(safe)
  })

  app.put('/api/settings', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = settingsUpdateSchema.parse(await c.req.json())
    const entries = Object.entries(data).filter(([, v]) => v !== undefined) as [SettingKey, string][]
    for (const [key, value] of entries) {
      // 敏感字段（密码 / 邮件密钥）：空字符串表示「不修改（保留原值）」，直接跳过
      if (SECRET_KEYS.includes(key)) {
        if (!value) continue
        if (key === 'adminPassword') {
          const hashed = await hashPassword(value)
          await db
            .insert(siteSettings)
            .values({ id: crypto.randomUUID(), key, value: hashed })
            .onConflictDoUpdate({ target: siteSettings.key, set: { value: hashed } })
        } else {
          // mailApiKey / mailGatewayToken：明文存储（仅服务端发送使用，绝不随 GET 返回）
          await db
            .insert(siteSettings)
            .values({ id: crypto.randomUUID(), key, value })
            .onConflictDoUpdate({ target: siteSettings.key, set: { value } })
        }
        continue
      }
      await db
        .insert(siteSettings)
        .values({ id: crypto.randomUUID(), key, value })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value } })
    }
    const rows = await db.select().from(siteSettings)
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value
    const settings = Object.fromEntries(settingKeys.map((key) => [key, map[key] ?? defaultSettings[key]])) as Record<SettingKey, string>
    const safe = Object.fromEntries(Object.entries(settings).filter(([k]) => !SECRET_KEYS.includes(k))) as Record<SettingKey, string>
    return c.json(safe)
  })

  // ============ 评论区博主身份 ============
  // 公开：是否已配置博主身份（决定是否在前端显示「设置」按钮）
  app.get('/api/comment-admin', async (c) => {
    const db: DB = c.get('db')
    const email = await getSiteSetting(db, 'adminEmail')
    const name = await getSiteSetting(db, 'adminName')
    const badge = await getSiteSetting(db, 'adminBadge')
    return c.json({ enabled: !!(email && name), badge: badge || '博主' })
  })

  // 公开：博主登录（校验管理端配置的管理员邮箱 + 密码），成功返回无状态 Token
  app.post('/api/comment-admin/login', async (c) => {
    const db: DB = c.get('db')
    const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}))
    const email = (body.email || '').trim()
    const password = (body.password || '').trim()
    if (!email || !password) return c.json({ error: '邮箱和密码必填' }, 400)
    const adminEmail = await getSiteSetting(db, 'adminEmail')
    const adminName = await getSiteSetting(db, 'adminName')
    const adminPwHash = await getSiteSetting(db, 'adminPassword')
    if (!adminEmail || !adminName || !adminPwHash) {
      return c.json({ error: '管理员身份尚未在管理端「评论设置」中配置' }, 400)
    }
    if (email !== adminEmail) return c.json({ error: '邮箱或密码错误' }, 401)
    const ok = await verifyPassword(password, adminPwHash)
    if (!ok) return c.json({ error: '邮箱或密码错误' }, 401)
    const token = await signCommentAdminToken(
      { sub: adminEmail, name: adminName, exp: Math.floor(Date.now() / 1000) + 7 * 86400 },
      adminPwHash
    )
    return c.json({ token, name: adminName, email: adminEmail })
  })

  return app
}
