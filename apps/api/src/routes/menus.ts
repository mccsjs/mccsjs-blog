import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { menus } from '@blog/db'
import { menuSchema } from '@blog/shared'
import { requireAuth } from '../auth'
import type { DB } from '../db'

// 把扁平菜单列表构建成树（支持 children 嵌套）
function buildMenuTree(list: any[]): any[] {
  const map = new Map<string, any>()
  const roots: any[] = []

  const sorted = [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return (a.createdAt ?? 0) - (b.createdAt ?? 0)
  })

  for (const m of sorted) {
    map.set(m.id, { ...m, children: [] })
  }
  for (const m of sorted) {
    const node = map.get(m.id)!
    if (m.parentId && map.has(m.parentId)) {
      map.get(m.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function menuRoutes() {
  const app = new Hono()

  // 公开：返回菜单树（可选按 type 过滤）
  app.get('/api/menus', async (c) => {
    const db: DB = c.get('db')
    const type = c.req.query('type')
    let rows = await db.select().from(menus)
    if (type) {
      rows = rows.filter((r: any) => r.type === type)
    }
    return c.json(buildMenuTree(rows))
  })

  app.post('/api/menus', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = menuSchema.parse(await c.req.json())
    if (data.parentId) {
      const parent = await db
        .select({ id: menus.id })
        .from(menus)
        .where(eq(menus.id, data.parentId))
        .limit(1)
      if (parent.length === 0) return c.json({ error: 'Parent menu not found' }, 400)
    }
    const [m] = await db.insert(menus).values({ id: crypto.randomUUID(), ...data }).returning()
    c.status(201)
    return c.json(m)
  })

  app.patch('/api/menus/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const id = c.req.param('id')
    const data = menuSchema.partial().parse(await c.req.json())
    if (data.parentId) {
      if (data.parentId === id) return c.json({ error: 'Cannot set self as parent' }, 400)
      const parent = await db
        .select({ id: menus.id })
        .from(menus)
        .where(eq(menus.id, data.parentId))
        .limit(1)
      if (parent.length === 0) return c.json({ error: 'Parent menu not found' }, 400)
    }
    const [m] = await db.update(menus).set(data).where(eq(menus.id, id)).returning()
    return c.json(m)
  })

  app.delete('/api/menus/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(menus).where(eq(menus.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  return app
}
