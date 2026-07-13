import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { categories } from '@blog/db'
import { categorySchema } from '@blog/shared'
import { requireAuth } from '../auth'
import { isUniqueError } from './shared'
import type { DB } from '../db'

// ============ 分类 ============
export function categoriesRouter() {
  const app = new Hono()

  app.get('/categories', async (c) => {
    const db: DB = c.get('db')
    const rows = await db.select().from(categories).orderBy(categories.name)
    return c.json(rows)
  })

  app.post('/categories', requireAuth, async (c) => {
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

  app.patch('/categories/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = categorySchema.partial().parse(await c.req.json())
    const [cat] = await db.update(categories).set(data).where(eq(categories.id, c.req.param('id'))).returning()
    return c.json(cat)
  })

  app.delete('/categories/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(categories).where(eq(categories.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  return app
}
