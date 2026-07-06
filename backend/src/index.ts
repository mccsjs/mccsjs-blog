import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { z } from 'zod'
import { auth } from './auth'
import { prisma } from './db'
import RssParser from 'rss-parser'
import cron from 'node-cron'
import pLimit from 'p-limit'

// ─── Visitor Log ────────────────────────────────────────────────────────────

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]!.trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return null
}

function visitorIdHash(ip: string | null, ua: string): string {
  const raw = `${ip || 'unknown'}|${ua || ''}`
  let h = 0
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

const VISITOR_LOG_DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 分钟去重

async function maybeLogVisitor(request: Request, page: string) {
  // 仅记录公开页面 GET 请求
  if (request.method !== 'GET') return
  if (page.startsWith('/api/') || page.startsWith('/uploads/') || page.startsWith('/_') || page.includes('.')) return

  const ip = getClientIp(request)
  const ua = request.headers.get('user-agent') || ''
  const referrer = request.headers.get('referer') || null
  const vid = visitorIdHash(ip, ua)

  // 去重：同一访客同一页面 5 分钟内不重复记录
  try {
    const since = new Date(Date.now() - VISITOR_LOG_DEDUP_WINDOW_MS)
    const recent = await prisma.visitorLog.findFirst({
      where: { visitorId: vid, page, createdAt: { gte: since } },
      select: { id: true },
    })
    if (recent) return
  } catch {
    // 去重查询失败不影响主流程
  }

  // 复用已有解析逻辑获取 os/browser
  const { region, os, browser } = await resolveClientInfo(ip, ua)

  try {
    await prisma.visitorLog.create({
      data: { visitorId: vid, ip: ip || undefined, page, region, os, browser, referrer: referrer || undefined },
    })
  } catch {
    // 写入失败不影响主流程
  }
}



async function resolveClientInfo(ip: string | null, ua: string) {
  const result = { region: null as string | null, os: null as string | null, browser: null as string | null }
  if (!ip) return result

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json() as { status: string; regionName?: string }
      if (data.status === 'success' && data.regionName) {
        result.region = data.regionName
      }
    }
  } catch {
    // ignore
  }

  result.os = parseOs(ua)
  result.browser = parseBrowser(ua)
  return result
}

function parseOs(ua: string): string | null {
  if (!ua) return null
  if (/Windows NT 10\.0/.test(ua) && /Windows 11/.test(ua)) return 'Windows 11'
  if (/Windows NT 10\.0/.test(ua)) return 'Windows 10'
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1'
  if (/Windows NT 6\.2/.test(ua)) return 'Windows 8'
  if (/Windows NT 6\.1/.test(ua)) return 'Windows 7'
  if (/Macintosh/.test(ua) && /Mac OS X (\d+)[._](\d+)/.test(ua)) {
    const [, major, minor] = /Mac OS X (\d+)[._](\d+)/.exec(ua) || []
    return `macOS ${major}.${minor}`
  }
  if (/Android/.test(ua)) {
    const m = /Android (\d+(?:\.\d+)?)/.exec(ua)
    return m ? `Android ${m[1]}` : 'Android'
  }
  if (/iPhone|iPad|iPod/.test(ua)) {
    const m = /OS (\d+)[._](\d+)/.exec(ua)
    return m ? `iOS ${m[1]}.${m[2]}` : 'iOS'
  }
  if (/Linux/.test(ua)) return 'Linux'
  return null
}

function parseBrowser(ua: string): string | null {
  if (!ua) return null
  const m =
    /(Edge|Edg|OPR|Opera|Chrome|Safari|Firefox)\/([\d.]+)/.exec(ua)
  if (!m) return null
  const name = m[1]
  const version = m[2]
  if (name === 'Edg' || name === 'Edge') return `Edge ${version}`
  if (name === 'OPR' || name === 'Opera') return `Opera ${version}`
  if (name === 'Chrome') return `Chrome ${version}`
  if (name === 'Safari') return `Safari ${version}`
  if (name === 'Firefox') return `Firefox ${version}`
  return `${name} ${version}`
}

// CRC32 实现（标准 IEEE 多项式 0xEDB88320）
const crc32Table = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32Hex(input: string): string {
  let crc = 0xffffffff
  for (let i = 0; i < input.length; i++) {
    crc = crc32Table[(crc ^ input.charCodeAt(i)) & 0xff]! ^ (crc >>> 8)
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

// 基于 CRC32 + HEX 生成唯一 slug；若冲突则追加随机后缀重试
async function generateUniqueSlug(prisma: any, seed?: string): Promise<string> {
  const base = seed || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let slug = crc32Hex(base)
  let attempts = 0
  while (attempts < 10) {
    const existing = await prisma.post.findUnique({ where: { slug } })
    if (!existing) return slug
    attempts++
    slug = crc32Hex(`${base}-${attempts}-${Math.random().toString(36).slice(2, 6)}`)
  }
  // 兜底：追加时间戳
  return `${crc32Hex(base)}-${Date.now().toString(36)}`
}

const postListInclude = { author: true, category: true, tags: true } as const

const postCreateSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/i, 'slug 只能包含字母、数字和连字符').optional(),
  content: z.string().min(1),
  excerpt: z.string().default(''),
  coverImage: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().url().nullable().optional()
  ),
  published: z.boolean().optional(),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).optional(),
})

const postUpdateSchema = postCreateSchema.partial().omit({ slug: true })

const commentCreateSchema = z.object({
  postId: z.string().min(1),
  author: z.string().min(1).max(100),
  email: z.string().email().max(200),
  website: z.string().max(500).optional().nullable(),
  content: z.string().min(1).max(5000),
})

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/i, 'slug 只能包含字母、数字和连字符'),
})

const tagSchema = categorySchema

const defaultSettings = {
  siteTitle: 'My Blog',
  siteDescription: '一个使用 Astro + React + Tailwind CSS 构建的现代博客',
  siteLogo: '',
  favicon: '',
  icp: '',
  footerText: '',
  postsPerPage: '10',
  twikooEnvId: '',
  fontCssUrl: '',
  fontFamily: '',
  backgroundImage: '',
  linkMarkdown: '',
} as const

type SettingKey = keyof typeof defaultSettings

const settingKeys = Object.keys(defaultSettings) as SettingKey[]

const settingsUpdateSchema = z.object(
  Object.fromEntries(settingKeys.map((key) => [key, z.string().optional()])) as {
    [K in SettingKey]: z.ZodOptional<z.ZodString>
  }
)

const betterAuthPlugin = new Elysia({ name: 'better-auth' })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ headers, set }) {
        const session = await auth.api.getSession({ headers })
        if (!session) {
          set.status = 401
          return { user: null as never, session: null as never }
        }
        return { user: session.user, session: session.session }
      },
    },
  })

const app = new Elysia()
  .use(
    cors({
      origin: process.env.NODE_ENV === 'production'
        ? [
            process.env.FRONTEND_URL,
            process.env.ADMIN_URL,
          ].filter(Boolean) as string[]
        : true, // 开发环境：反射请求来源，支持所有 localhost 端口
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .use(staticPlugin({ prefix: '/uploads', assets: 'uploads' }))
  .use(betterAuthPlugin)
  .derive(() => ({ prisma }))
  .onError(({ code, error, set }) => {
    console.error(`[${code}]`, error)
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Validation failed', issues: error.all || [error.message] }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not found' }
    }
    set.status = 500
    return { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }
  })
  .onBeforeHandle(({ request, path }) => {
    // 异步记录访客日志，不阻塞请求
    maybeLogVisitor(request, path).catch(() => {})
  })

app.get('/', () => ({ status: 'ok', service: 'elysiajs-blog' }))
app.get('/health', () => ({ status: 'ok' }))

// ============ 访客追踪（公开，无需登录） ============

const collectSchema = z.object({
  type: z.enum(['pageview', 'duration', 'event']).default('pageview'),
  url: z.string().min(1),
  referrer: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  visitor_id: z.string().optional().nullable(),
  duration: z.number().int().nonnegative().optional(),
  article_id: z.string().optional().nullable(),
  event_name: z.string().optional().nullable(),
  event_data: z.any().optional(),
})

function visitorIdHash(ip: string | null, ua: string): string {
  const raw = `${ip || 'unknown'}|${ua || ''}`
  let h = 0
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

async function recordVisitFromCollect(body: z.infer<typeof collectSchema>, request: Request) {
  const ip = getClientIp(request)
  const ua = body.user_agent || request.headers.get('user-agent') || ''
  const vid = body.visitor_id || visitorIdHash(ip, ua)
  const page = body.url.replace(/^https?:\/\/[^/]+/, '') || '/'
  const referrer = body.referrer || request.headers.get('referer') || null

  // 去重：5 分钟内同一访客同一页面不重复记录
  try {
    const since = new Date(Date.now() - VISITOR_LOG_DEDUP_WINDOW_MS)
    const recent = await prisma.visitorLog.findFirst({
      where: { visitorId: vid, page, createdAt: { gte: since } },
      select: { id: true },
    })
    if (recent) return
  } catch { /* ignore */ }

  const { region, os, browser } = await resolveClientInfo(ip, ua)

  try {
    await prisma.visitorLog.create({
      data: {
        visitorId: vid,
        ip: ip || undefined,
        page,
        region,
        os,
        browser,
        referrer: referrer || undefined,
      },
    })
  } catch { /* ignore */ }
}

app.post('/api/collect', async ({ body, request, set }) => {
  const data = collectSchema.parse(body)
  // 异步写入，快速返回 204
  recordVisitFromCollect(data, request).catch(() => {})
  set.status = 204
  return null
})

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
  return post
}, { auth: true })

app.delete('/api/posts/:id', async ({ prisma, params, user, set }) => {
  if (!user) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
  await prisma.post.delete({ where: { id: params.id } })
  set.status = 204
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
  return prisma.category.update({ where: { id: params.id }, data })
}, { auth: true })

app.delete('/api/categories/:id', async ({ prisma, params, user, set }) => {
  if (!user) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
  await prisma.category.delete({ where: { id: params.id } })
  set.status = 204
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
  return prisma.tag.update({ where: { id: params.id }, data })
}, { auth: true })

app.delete('/api/tags/:id', async ({ prisma, params, user, set }) => {
  if (!user) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
  await prisma.tag.delete({ where: { id: params.id } })
  set.status = 204
  return null
}, { auth: true })

// Comments
app.get('/api/comments', async ({ prisma, query }) => {
  const postId = typeof query.postId === 'string' ? query.postId : undefined
  const admin = query.admin === 'true'
  return prisma.comment.findMany({
    where: { postId, visible: admin ? undefined : true },
    orderBy: { createdAt: 'desc' },
  })
})

app.post('/api/comments', async ({ prisma, body, request, set }) => {
  const data = commentCreateSchema.parse(body)
  const post = await prisma.post.findUnique({ where: { id: data.postId } })
  if (!post) {
    set.status = 404
    return { error: 'Post not found' }
  }

  const ip = getClientIp(request)
  const ua = request.headers.get('user-agent') || ''
  const { region, os, browser } = await resolveClientInfo(ip, ua)

  const comment = await prisma.comment.create({
    data: {
      ...data,
      website:
        data.website && data.website.trim()
          ? /^https?:\/\//i.test(data.website.trim())
            ? data.website.trim()
            : `https://${data.website.trim()}`
          : null,
      ip,
      region,
      os,
      browser,
      visible: true,
    },
  })
  set.status = 201
  return comment
})

app.patch('/api/comments/:id/visible', async ({ prisma, params, body, user, set }) => {
  if (!user) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
  const visible = typeof body === 'object' && body !== null && 'visible' in body ? Boolean(body.visible) : true
  return prisma.comment.update({ where: { id: params.id }, data: { visible } })
}, { auth: true })

app.delete('/api/comments/:id', async ({ prisma, params, user, set }) => {
  if (!user) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
  await prisma.comment.delete({ where: { id: params.id } })
  set.status = 204
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
  return settings
}, { auth: true })

// Visitor Logs (Admin)
const visitorLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  keyword: z.string().optional(),
  path: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

app.get('/api/admin/visitor-logs', async ({ prisma, user, set, query }) => {
  if (!user) { set.status = 401; return { error: 'Unauthorized' } }

  const parsed = visitorLogQuerySchema.safeParse(query)
  if (!parsed.success) {
    set.status = 422
    return { error: 'Invalid query', issues: parsed.error.issues }
  }
  const { page, pageSize, keyword, path, dateFrom, dateTo } = parsed.data

  const where: any = {}
  if (path) where.page = { contains: path }
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  const [logs, total] = await Promise.all([
    prisma.visitorLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.visitorLog.count({ where }),
  ])

  // 关键词过滤在内存中做（对 ip / referrer / visitorId）
  let result = logs
  if (keyword) {
    const kw = keyword.toLowerCase()
    result = result.filter((l) =>
      (l.ip && l.ip.includes(kw)) ||
      (l.referrer && l.referrer.toLowerCase().includes(kw)) ||
      l.visitorId.includes(kw) ||
      l.page.includes(kw)
    )
  }

  return {
    list: result.map((l) => ({
      id: l.id,
      visitorId: l.visitorId,
      ip: l.ip,
      page: l.page,
      region: l.region,
      os: l.os,
      browser: l.browser,
      referrer: l.referrer,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  }
}, { auth: true })

// Visitor stats (Admin) - 概览数据
app.get('/api/admin/visitor-stats', async ({ prisma, user, set }) => {
  if (!user) { set.status = 401; return { error: 'Unauthorized' } }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [todayCount, totalCount, topPages, recentLogs] = await Promise.all([
    prisma.visitorLog.count({ where: { createdAt: { gte: today } } }),
    prisma.visitorLog.count(),
    prisma.visitorLog.groupBy({
      by: ['page'],
      _count: { page: true },
      orderBy: { _count: { page: 'desc' } },
      take: 10,
    }),
    prisma.visitorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    todayCount,
    totalCount,
    topPages: topPages.map((p) => ({ page: p.page, count: p._count.page })),
    recentLogs: recentLogs.map((l) => ({
      visitorId: l.visitorId,
      page: l.page,
      region: l.region,
      createdAt: l.createdAt.toISOString(),
    })),
  }
}, { auth: true })

// Menus
function buildMenuTree(menus: { id: string; label: string; href: string | null; icon: string | null; type: string; parentId: string | null; sortOrder: number; visible: boolean; target: string | null; createdAt: Date; updatedAt: Date }[]) {
  const map = new Map<string, any>()
  const roots: any[] = []

  const sorted = [...menus].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  for (const menu of sorted) {
    const node = { ...menu, children: [] }
    map.set(menu.id, node)
  }

  for (const menu of sorted) {
    const node = map.get(menu.id)
    if (menu.parentId && map.has(menu.parentId)) {
      const parent = map.get(menu.parentId)
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

const menuSchema = z.object({
  label: z.string().min(1),
  href: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  type: z.enum(['NAV', 'FOOTER', 'GROUP']),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
  target: z.string().optional().nullable(),
})

app.get('/api/menus', async ({ prisma, query }) => {
  const type = typeof query.type === 'string' ? query.type : undefined
  const menus = await prisma.menu.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return buildMenuTree(menus)
})

app.post('/api/menus', async ({ prisma, body, user, set }) => {
  if (!user) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
  const data = menuSchema.parse(body)
  if (data.parentId) {
    const parent = await prisma.menu.findUnique({ where: { id: data.parentId } })
    if (!parent) {
      set.status = 400
      return { error: 'Parent menu not found' }
    }
  }
  const menu = await prisma.menu.create({ data })
  return menu
}, { auth: true })

app.patch('/api/menus/:id', async ({ prisma, params, body, user, set }) => {
  if (!user) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
  const data = menuSchema.partial().parse(body)
  if (data.parentId) {
    const parent = await prisma.menu.findUnique({ where: { id: data.parentId } })
    if (!parent) {
      set.status = 400
      return { error: 'Parent menu not found' }
    }
    if (data.parentId === params.id) {
      set.status = 400
      return { error: 'Cannot set self as parent' }
    }
  }
  const menu = await prisma.menu.update({ where: { id: params.id }, data })
  return menu
}, { auth: true })

app.delete('/api/menus/:id', async ({ prisma, params, user, set }) => {
  if (!user) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
  await prisma.menu.delete({ where: { id: params.id } })
  set.status = 204
  return null
}, { auth: true })

// 自动生成友链网站截图（基于 WordPress mshots API）
function autoScreenshot(url: string): string {
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=400&h=300`
}

// 如果友链没有截图，动态生成 mshots URL（不存库，仅返回时补充）
function enrichFriendScreenshot<T extends { url: string; screenshot: string | null; isInvalid: boolean }>(friend: T): T {
  if (!friend.isInvalid && !friend.screenshot && friend.url) {
    return { ...friend, screenshot: autoScreenshot(friend.url) }
  }
  return friend
}

// === Friend Types ===
const friendTypeSchema = z.object({
  name: z.string().min(1).max(50),
  sort: z.number().int().default(0),
  isVisible: z.boolean().default(true),
})

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
const friendSchema = z.object({
  name: z.string().min(1).max(50),
  url: z.string().min(1).max(255),
  description: z.string().max(500).default(''),
  avatar: z.string().max(500).default(''),
  screenshot: z.string().max(500).default(''),
  sort: z.number().int().min(1).max(10).default(5),
  isInvalid: z.boolean().default(false),
  typeId: z.string().nullable().optional(),
  rssUrl: z.preprocess((val) => (val === '' ? null : val), z.string().url().nullable().optional()),
})

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

const XXAPI_TOKEN = process.env.XXAPI_TOKEN || ''

async function apiCheck(targetURL: string): Promise<[boolean, number]> {
  const apiURL = 'https://v2.xxapi.cn/api/speed?url=' + encodeURIComponent(targetURL)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const resp = await fetch(apiURL, {
      signal: controller.signal,
      headers: { Authorization: 'Bearer ' + XXAPI_TOKEN },
    })
    clearTimeout(timeout)
    if (!resp.ok) return [false, 0]
    const result = await resp.json() as { code: number; data: string }
    if (result.code !== 200) return [false, 0]
    const latencyStr = result.data.replace('ms', '')
    const latency = parseInt(latencyStr) || 0
    return [true, latency]
  } catch {
    return [false, 0]
  }
}

async function checkAccessibility(targetURL: string): Promise<[boolean, number, Response | null]> {
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
    return [accessible, elapsed, resp]
  } catch {
    return [false, 0, null]
  }
}

async function dualCheck(targetURL: string): Promise<[number, number]> {
  const [ok1, lat1] = await apiCheck(targetURL)
  if (ok1 && lat1 > 0) return [0, lat1]

  const [ok2, lat2, _] = await checkAccessibility(targetURL)
  if (ok2) return [0, lat2]

  return [1, lat1 || lat2]
}

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

// 友链自动测速：每天 0 点和 12 点执行
function scheduleFriendAutoCheck() {
  const run = async () => {
    try {
      const friends = await prisma.friend.findMany({ where: { isInvalid: false } })
      if (!friends.length) return
      for (const f of friends) {
        const [accessible, latency] = await dualCheck(f.url)
        await prisma.friend.update({
          where: { id: f.id },
          data: { accessible, latency },
        })
      }
      console.log(`[友链测速] 完成，共 ${friends.length} 个友链`)
    } catch (e) {
      console.error('[友链测速] 失败', e)
    }
  }

  const now = new Date()
  const next12 = new Date(now)
  next12.setHours(12, 0, 0, 0)
  const next0 = new Date(now)
  next0.setHours(0, 0, 0, 0)
  next0.setDate(next0.getDate() + 1)
  const delay = now < next12 ? next12.getTime() - now.getTime() : next0.getTime() - now.getTime()

  setTimeout(() => {
    run()
    setInterval(run, 12 * 60 * 60 * 1000)
  }, delay)

  console.log('[友链测速] 已安排定时任务：每天 0:00 / 12:00')
}

// === RSS Feed 抓取 ===

// 自动发现友链的 RSS 地址
async function discoverRSSFeed(siteUrl: string): Promise<string | null> {
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
      const href = matches[0][3]
      // 相对路径转绝对路径
      if (href.startsWith('http')) return href
      const base = new URL(siteUrl)
      if (href.startsWith('/')) return base.origin + href
      return base.origin + '/' + href
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
async function parseFriendFeed(friendId: string, rssUrl: string): Promise<{ title: string; link: string; publishedAt: Date | null }[]> {
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
async function refreshFriendFeed(friendId: string, rssUrl: string): Promise<number> {
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
async function refreshAllFeeds(): Promise<{ total: number; newArticles: number }> {
  const friends = await prisma.friend.findMany({ where: { rssUrl: { not: null } } })
  if (friends.length === 0) return { total: 0, newArticles: 0 }
  const limit = pLimit(5)
  let newArticles = 0
  const tasks = friends.map((f) => limit(async () => { if (!f.rssUrl) return 0; const count = await refreshFriendFeed(f.id, f.rssUrl!); newArticles += count; return count }))
  await Promise.all(tasks)
  return { total: friends.length, newArticles }
}

// RSS 定时刷新：每天凌晨 3 点执行
function scheduleRssRefresh() {
  cron.schedule('0 3 * * *', async () => {
    console.log('[RSS刷新] 开始...')
    try {
      const result = await refreshAllFeeds()
      console.log(`[RSS刷新] 完成，共 ${result.total} 个友链，${result.newArticles} 篇新文章`)
    } catch (e) { console.error('[RSS刷新] 失败', e) }
  }, { timezone: 'Asia/Shanghai' })
  console.log('[RSS刷新] 定时任务已安排：每天 03:00')
}

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

app.listen(process.env.PORT || 4000)

console.log(`🦊 Backend running at ${app.server?.hostname}:${app.server?.port}`)

// 初始化默认导航菜单
seedDefaultMenus()
seedDefaultAggregateMenus()
seedDefaultFriends()
scheduleFriendAutoCheck()
scheduleRssRefresh()

async function seedDefaultMenus() {
  const existing = await prisma.menu.findFirst({ where: { type: 'NAV' } })
  if (existing) return // 已有导航菜单，跳过

  const defaults = [
    { label: '首页', href: '/',        icon: '🏠', sortOrder: 0 },
    { label: '文章', href: '/posts',   icon: '📝', sortOrder: 1 },
    { label: '归档', href: '/archive', icon: '📦', sortOrder: 2 },
    { label: '标签', href: '/tags',    icon: '🏷️', sortOrder: 3 },
    { label: '分类', href: '/categories', icon: '📂', sortOrder: 4 },
  ]

  for (const item of defaults) {
    await prisma.menu.create({
      data: { ...item, type: 'NAV', visible: true },
    })
  }

  console.log('🌱 默认导航菜单已初始化（首页/文章/归档/标签/分类）')
}

async function seedDefaultAggregateMenus() {
  // 每次启动都重新同步聚合菜单内容
  await prisma.menu.deleteMany({ where: { OR: [{ label: '我的网站' }, { label: '友情链接' }] } })

  // 创建分组 1：我的网站
  const group1 = await prisma.menu.create({
    data: { label: '我的网站', type: 'GROUP', visible: true, sortOrder: 0 },
  })
  const children1 = [
    { label: '个人主页', href: '/', icon: 'lucide:home', sortOrder: 0 },
    { label: '博客', href: '/posts', icon: 'lucide:file-text', sortOrder: 1 },
  ]
  for (const item of children1) {
    await prisma.menu.create({
      data: { ...item, type: 'GROUP', visible: true, parentId: group1.id },
    })
  }

  // 创建分组 2：友情链接
  const group2 = await prisma.menu.create({
    data: { label: '友情链接', type: 'GROUP', visible: true, sortOrder: 1 },
  })
  const children2 = [
    { label: 'Astro', href: 'https://astro.build', icon: 'lucide:globe', sortOrder: 0, target: '_blank' },
    { label: 'Elysia', href: 'https://elysiajs.com', icon: 'lucide:zap', sortOrder: 1, target: '_blank' },
    { label: 'Prisma', href: 'https://prisma.io', icon: 'lucide:database', sortOrder: 2, target: '_blank' },
    { label: 'Tailwind', href: 'https://tailwindcss.com', icon: 'lucide:palette', sortOrder: 3, target: '_blank' },
  ]
  for (const item of children2) {
    await prisma.menu.create({
      data: { ...item, type: 'GROUP', visible: true, parentId: group2.id },
    })
  }

  console.log('🌱 默认聚合菜单已初始化（我的网站/友情链接）')
}

async function seedDefaultFriends() {
  const existing = await prisma.friend.findFirst()
  if (existing) return

  const type = await prisma.friendType.create({
    data: { name: '技术伙伴', sort: 10, isVisible: true },
  })

  const defaults = [
    { name: 'Astro', url: 'https://astro.build', description: '现代静态站点生成器', avatar: 'https://astro.build/assets/press/astro-icon-dark.png', sort: 4 },
    { name: 'Elysia', url: 'https://elysiajs.com', description: '高性能 Bun Web 框架', avatar: 'https://elysiajs.com/assets/elysia.svg', sort: 3 },
    { name: 'Prisma', url: 'https://prisma.io', description: '下一代 Node.js ORM', avatar: 'https://prisma.io/images/apple-touch-icon.png', sort: 2 },
    { name: 'Tailwind CSS', url: 'https://tailwindcss.com', description: '实用优先的 CSS 框架', avatar: 'https://tailwindcss.com/favicons/apple-touch-icon.png', sort: 1 },
  ]

  for (const item of defaults) {
    await prisma.friend.create({ data: { ...item, typeId: type.id } })
  }

  console.log('🌱 默认友链已初始化')
}

export type App = typeof app
