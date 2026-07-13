import { Hono } from 'hono'
import { and, desc, eq, inArray, like, sql } from 'drizzle-orm'
import { posts, categories, tags, postTags } from '@blog/db'
import { postCreateSchema, postUpdateSchema } from '@blog/shared'
import { generateCrc32Slug } from '../utils'
import { requireAuth } from '../auth'
import { shapePost } from './shared'
import type { DB } from '../db'

// ============ 文章 ============
export function postsRouter() {
  const app = new Hono()

  // 列表（公开：仅已发布；admin=true：全部）。支持 categorySlug / tagSlug 过滤
  app.get('/posts', async (c) => {
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
  app.get('/posts/search', async (c) => {
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
  app.get('/posts/:slug', async (c) => {
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
  app.post('/posts', requireAuth, async (c) => {
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
  app.patch('/posts/:id', requireAuth, async (c) => {
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
  app.delete('/posts/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(posts).where(eq(posts.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  return app
}
