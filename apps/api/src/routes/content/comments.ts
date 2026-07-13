import { Hono } from 'hono'
import { and, desc, eq, sql } from 'drizzle-orm'
import { comments, posts } from '@blog/db'
import { commentCreateSchema } from '@blog/shared'
import { requireAuth, verifyCommentAdminToken } from '../../auth'
import { getClientIp, resolveClientInfo } from '../../utils'
import { renderCommentHtml } from '../../markdown'
import { notifyOnNewComment, sendTestEmail } from '../../utils/email'
import { getSiteSetting } from './shared'
import type { DB } from '../../db'

// ============ 评论 ============
export function commentsRouter() {
  const app = new Hono()

  app.get('/comments', async (c) => {
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

  app.post('/comments', async (c) => {
    const db: DB = c.get('db')
    const data = commentCreateSchema.parse(await c.req.json())
    const post = await db.query.posts.findFirst({ where: eq(posts.id, data.postId) })
    // 评论以 postId 作为讨论线程分组键：文章页传真实文章 id，友链 / 留言板等独立页传固定页面键
    // （如 'link' / 'comments'），这类页并非文章，不应因此返回 404。
    const threadPost = post || { id: data.postId, title: data.postId, slug: data.postId }

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
        // 文章页用真实 post；友链 / 留言板等非文章页回落 threadPost（post 为 null 时）
        post: post || threadPost,
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
  app.post('/comments/:id/like', async (c) => {
    const db: DB = c.get('db')
    const id = c.req.param('id')
    const [row] = await db.update(comments).set({ likes: sql`${comments.likes} + 1` }).where(eq(comments.id, id)).returning()
    if (!row) return c.json({ error: 'Comment not found' }, 404)
    return c.json({ id, likes: row.likes })
  })

  app.delete('/comments/:id/like', async (c) => {
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

  app.patch('/comments/:id/visible', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const body = await c.req.json<{ visible?: boolean }>().catch(() => ({}))
    const visible = typeof body === 'object' && body !== null && 'visible' in body ? Boolean(body.visible) : true
    const [comment] = await db.update(comments).set({ visible }).where(eq(comments.id, c.req.param('id'))).returning()
    return c.json(comment)
  })

  app.delete('/comments/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(comments).where(eq(comments.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  return app
}
