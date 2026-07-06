import type { App } from '../app'
import { friendTypeSchema, friendSchema } from '../schemas'
import { enrichFriendScreenshot, autoScreenshot } from '../utils/screenshot'
import { discoverRSSFeed, refreshAllFeeds } from '../utils/feed'
import { dualCheck } from '../utils/friend-check'

export function registerFriendRoutes(app: App) {
  // === Friend Types ===
  app.get('/api/admin/friend-types', async ({ prisma, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const types = await prisma.friendType.findMany({
      include: { _count: { select: { friends: true } } },
      orderBy: { sort: 'desc' },
    })
    return types.map(({ _count, ...t }) => ({ ...t, count: _count.friends }))
  }, { auth: true })

  app.post('/api/admin/friend-types', async ({ prisma, body, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const data = friendTypeSchema.parse(body)
    return prisma.friendType.create({ data })
  }, { auth: true })

  app.put('/api/admin/friend-types/:id', async ({ prisma, params, body, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const data = friendTypeSchema.partial().parse(body)
    return prisma.friendType.update({ where: { id: params.id }, data })
  }, { auth: true })

  app.delete('/api/admin/friend-types/:id', async ({ prisma, params, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    await prisma.friendType.delete({ where: { id: params.id } })
    set.status = 204
    return null
  }, { auth: true })

  // === Friends (Admin) ===
  app.get('/api/admin/friends', async ({ prisma, user, set, query }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const keyword = typeof query.keyword === 'string' ? query.keyword : undefined
    const typeId = typeof query.typeId === 'string' ? query.typeId : undefined

    const where: any = {}
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { url: { contains: keyword } },
        { description: { contains: keyword } },
      ]
    }
    if (typeId) where.typeId = typeId

    return prisma.friend.findMany({
      where,
      include: { type: true },
      orderBy: [{ sort: 'desc' }, { createdAt: 'asc' }],
    }).then((friends) => friends.map(enrichFriendScreenshot))
  }, { auth: true })

  app.get('/api/admin/friends/:id', async ({ prisma, params, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const friend = await prisma.friend.findUnique({ where: { id: params.id }, include: { type: true } })
    if (!friend) { set.status = 404; return { error: 'Not Found' } }
    return enrichFriendScreenshot(friend)
  }, { auth: true })

  app.post('/api/admin/friends', async ({ prisma, body, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const data = friendSchema.parse(body)
    const { typeId, ...rest } = data
    if (!rest.isInvalid && !rest.screenshot && rest.url) {
      rest.screenshot = autoScreenshot(rest.url)
    }
    // 自动发现 RSS
    if (!rest.rssUrl && rest.url) {
      const discovered = await discoverRSSFeed(rest.url)
      if (discovered) rest.rssUrl = discovered
    }
    return prisma.friend.create({ data: { ...rest, type: typeId ? { connect: { id: typeId } } : undefined }, include: { type: true } })
  }, { auth: true })

  app.put('/api/admin/friends/:id', async ({ prisma, params, body, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const data = friendSchema.partial().parse(body)
    const { typeId, ...rest } = data
    // 截图被清空时，若未标记失效且有 URL 则自动生成
    if (rest.screenshot === '' && !rest.isInvalid) {
      const friend = await prisma.friend.findUnique({ where: { id: params.id } })
      const url = rest.url || friend?.url
      if (url) rest.screenshot = autoScreenshot(url)
    }
    // 自动发现 RSS：如果 rssUrl 未提供且 URL 有变化，则尝试自动发现
    if (rest.rssUrl === undefined && rest.url) {
      const friend = await prisma.friend.findUnique({ where: { id: params.id } })
      if (friend && friend.url !== rest.url) {
        const discovered = await discoverRSSFeed(rest.url)
        if (discovered) rest.rssUrl = discovered
      }
    }
    return prisma.friend.update({
      where: { id: params.id },
      data: { ...rest, type: typeId !== undefined ? (typeId ? { connect: { id: typeId } } : { disconnect: true }) : undefined },
      include: { type: true },
    })
  }, { auth: true })

  app.delete('/api/admin/friends/:id', async ({ prisma, params, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    await prisma.friend.delete({ where: { id: params.id } })
    set.status = 204
    return null
  }, { auth: true })

  // === Friends (Public) ===
  app.get('/api/friends', async ({ prisma }) => {
    const types = await prisma.friendType.findMany({
      where: { isVisible: true },
      include: {
        friends: {
          orderBy: [{ sort: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { sort: 'desc' },
    })

    return {
      groups: types.filter((t) => t.friends.length > 0).map((t) => ({
        type_id: t.id,
        type_name: t.name,
        type_sort: t.sort,
        friends: t.friends.map(enrichFriendScreenshot),
      })),
    }
  })

  // === Friend Speed Check ===
  app.post('/api/admin/friends/:id/check', async ({ prisma, params, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const friend = await prisma.friend.findUnique({ where: { id: params.id } })
    if (!friend) { set.status = 404; return { error: 'Not Found' } }
    if (friend.isInvalid) { set.status = 400; return { error: '友链已标记失效，跳过测速' } }
    const [accessible, latency] = await dualCheck(friend.url)
    await prisma.friend.update({
      where: { id: params.id },
      data: { accessible, latency },
    })
    return { accessible, latency }
  }, { auth: true })

  app.post('/api/admin/friends/check-all', async ({ prisma, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const friends = await prisma.friend.findMany({ where: { isInvalid: false } })
    const results = []
    for (const f of friends) {
      const [accessible, latency] = await dualCheck(f.url)
      await prisma.friend.update({
        where: { id: f.id },
        data: { accessible, latency },
      })
      results.push({ id: f.id, name: f.name, accessible, latency })
    }
    return { total: friends.length, results }
  }, { auth: true })

  // === RSS Feed API ===

  // 公开接口：获取朋友圈文章列表
  app.get('/api/friends/feed', async ({ prisma, query }) => {
    const page = typeof query.page === 'string' ? Math.max(1, parseInt(query.page)) : 1
    const pageSize = typeof query.pageSize === 'string' ? Math.max(1, Math.min(50, parseInt(query.pageSize))) : 21
    const [articles, total] = await Promise.all([
      prisma.rssArticle.findMany({ orderBy: { publishedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { friend: true } }),
      prisma.rssArticle.count(),
    ])
    return {
      code: 0,
      data: {
        list: articles.map((a) => ({ id: a.id, friend_id: a.friendId, friend_name: a.friend.name, friend_url: a.friend.url, friend_avatar: a.friend.avatar, title: a.title, link: a.link, published_at: a.publishedAt?.toISOString() || null })),
        total, page, page_size: pageSize
      }
    }
  })

  // 管理接口：手动刷新所有 RSS
  app.post('/api/admin/friends/refresh-feeds', async ({ user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const result = await refreshAllFeeds()
    return { message: '刷新完成', ...result }
  }, { auth: true })

  // 管理接口：获取 RSS 文章列表
  app.get('/api/admin/friends/feed', async ({ prisma, query, user, set }) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' } }
    const page = typeof query.page === 'string' ? Math.max(1, parseInt(query.page)) : 1
    const pageSize = typeof query.pageSize === 'string' ? Math.max(1, Math.min(100, parseInt(query.pageSize))) : 20
    const [articles, total] = await Promise.all([
      prisma.rssArticle.findMany({ orderBy: { publishedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { friend: true } }),
      prisma.rssArticle.count(),
    ])
    return { list: articles.map((a) => ({ id: a.id, friend_name: a.friend.name, friend_url: a.friend.url, title: a.title, link: a.link, published_at: a.publishedAt?.toISOString() || null, created_at: a.createdAt.toISOString() })), total, page, page_size: pageSize }
  }, { auth: true })

  // Uploads
  app.post('/api/upload', async ({ request, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const form = await request.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      set.status = 400
      return { error: 'No file provided' }
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      set.status = 400
      return { error: 'Invalid file type' }
    }
    if (file.size > 5 * 1024 * 1024) {
      set.status = 400
      return { error: 'File too large' }
    }

    const ext = file.name.split('.').pop() || 'bin'
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path = `uploads/${name}`
    await Bun.write(path, file)
    return { url: `/uploads/${name}` }
  }, { auth: true })
}
