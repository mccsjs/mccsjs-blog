import type { App } from '../app'
import {
  postListInclude,
  postCreateSchema,
  postUpdateSchema,
  categorySchema,
  tagSchema,
  defaultSettings,
  settingKeys,
  settingsUpdateSchema,
  type SettingKey,
} from '../schemas'
import { generateUniqueSlug } from '../utils/visitor'
import { triggerDeploy } from '../utils/deploy'

export function registerContentRoutes(app: App) {
  // Posts
  app.get('/api/posts', async ({ prisma, query }) => {
    const admin = query.admin === 'true'
    const categorySlug = typeof query.categorySlug === 'string' ? query.categorySlug : undefined
    const tagSlug = typeof query.tagSlug === 'string' ? query.tagSlug : undefined
    const where: any = admin ? {} : { published: true }
    if (categorySlug) {
      where.category = { slug: categorySlug }
    }
    if (tagSlug) {
      where.tags = { some: { slug: tagSlug } }
    }
    const posts = await prisma.post.findMany({
      where,
      include: postListInclude,
      orderBy: { createdAt: 'desc' },
    })
    return posts.map(({ content, ...rest }) => rest)
  })

  // 文章搜索（必须放在 /:slug 前面）
  app.get('/api/posts/search', async ({ prisma, query }) => {
    const q = typeof query.q === 'string' ? query.q.trim() : ''
    if (!q) return []
    const posts = await prisma.post.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
        ],
      },
      include: postListInclude,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return posts.map(({ content, ...rest }) => rest)
  })

  app.get('/api/posts/:slug', async ({ prisma, params, query, set }) => {
    const admin = query.admin === 'true'
    const post = await prisma.post.findUnique({
      where: { slug: params.slug },
      include: postListInclude,
    })
    if (!post) {
      set.status = 404
      return { error: 'Not Found' }
    }
    if (!post.published && !admin) {
      set.status = 404
      return { error: 'Not Found' }
    }
    if (!admin) {
      await prisma.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } })
    }
    return post
  })

  app.post('/api/posts', async ({ prisma, body, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const data = postCreateSchema.parse(body)

    // slug 为空时基于 CRC32+HEX 自动生成；非空则校验唯一性
    let slug = data.slug
    if (!slug) {
      slug = await generateUniqueSlug(prisma, `${data.title}-${Date.now()}`)
    } else {
      const existing = await prisma.post.findUnique({ where: { slug } })
      if (existing) {
        set.status = 409
        return { error: 'Slug already exists' }
      }
    }

    const post = await prisma.post.create({
      data: {
        ...data,
        slug,
        authorId: user.id,
        tags: { connect: (data.tagIds ?? []).map((id) => ({ id })) },
      },
      include: postListInclude,
    })
    set.status = 201
    triggerDeploy() // 新建文章 → 触发博客重建
    return post
  }, { auth: true })

  app.patch('/api/posts/:id', async ({ prisma, params, body, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const { categoryId, tagIds, ...rest } = postUpdateSchema.parse(body)
    const post = await prisma.post.update({
      where: { id: params.id },
      data: {
        ...rest,
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        tags: tagIds ? { set: tagIds.map((id) => ({ id })) } : undefined,
      },
      include: postListInclude,
    })
    triggerDeploy() // 修改文章 → 触发博客重建
    return post
  }, { auth: true })

  app.delete('/api/posts/:id', async ({ prisma, params, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    await prisma.post.delete({ where: { id: params.id } })
    set.status = 204
    triggerDeploy() // 删除文章 → 触发博客重建
    return null
  }, { auth: true })

  // Categories
  app.get('/api/categories', async ({ prisma }) => prisma.category.findMany({ orderBy: { name: 'asc' } }))

  app.post('/api/categories', async ({ prisma, body, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const data = categorySchema.parse(body)
    try {
      const category = await prisma.category.create({ data })
      set.status = 201
      triggerDeploy() // 新建分类 → 触发博客重建
      return category
    } catch (e: any) {
      if (e?.code === 'P2002') {
        set.status = 409
        return { error: '该分类已存在' }
      }
      throw e
    }
  }, { auth: true })

  app.patch('/api/categories/:id', async ({ prisma, params, body, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const data = categorySchema.partial().parse(body)
    triggerDeploy() // 修改分类 → 触发博客重建
    return prisma.category.update({ where: { id: params.id }, data })
  }, { auth: true })

  app.delete('/api/categories/:id', async ({ prisma, params, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    await prisma.category.delete({ where: { id: params.id } })
    set.status = 204
    triggerDeploy() // 删除分类 → 触发博客重建
    return null
  }, { auth: true })

  // Tags
  app.get('/api/tags', async ({ prisma }) => prisma.tag.findMany({ orderBy: { name: 'asc' } }))

  app.post('/api/tags', async ({ prisma, body, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const data = tagSchema.parse(body)
    try {
      const tag = await prisma.tag.create({ data })
      set.status = 201
      triggerDeploy() // 新建标签 → 触发博客重建
      return tag
    } catch (e: any) {
      if (e?.code === 'P2002') {
        set.status = 409
        return { error: '该标签已存在' }
      }
      throw e
    }
  }, { auth: true })

  app.patch('/api/tags/:id', async ({ prisma, params, body, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const data = tagSchema.partial().parse(body)
    triggerDeploy() // 修改标签 → 触发博客重建
    return prisma.tag.update({ where: { id: params.id }, data })
  }, { auth: true })

  app.delete('/api/tags/:id', async ({ prisma, params, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    await prisma.tag.delete({ where: { id: params.id } })
    set.status = 204
    triggerDeploy() // 删除标签 → 触发博客重建
    return null
  }, { auth: true })

  // Settings
  app.get('/api/settings', async ({ prisma }) => {
    const rows = await prisma.siteSetting.findMany()
    const map = new Map(rows.map((row) => [row.key, row.value]))
    const settings = Object.fromEntries(
      settingKeys.map((key) => [key, map.get(key) ?? defaultSettings[key]])
    ) as Record<SettingKey, string>
    return settings
  })

  app.put('/api/settings', async ({ prisma, body, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const data = settingsUpdateSchema.parse(body)
    const entries = Object.entries(data).filter(([, value]) => value !== undefined) as [
      SettingKey,
      string,
    ][]

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    )

    const rows = await prisma.siteSetting.findMany()
    const map = new Map(rows.map((row) => [row.key, row.value]))
    const settings = Object.fromEntries(
      settingKeys.map((key) => [key, map.get(key) ?? defaultSettings[key]])
    ) as Record<SettingKey, string>
    triggerDeploy() // 站点设置（含 hero 图）变更 → 触发博客重建
    return settings
  }, { auth: true })
}
