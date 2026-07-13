import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { tags } from '@blog/db'
import { tagSchema } from '@blog/shared'
import { requireAuth } from '../../auth'
import { isUniqueError } from './shared'
import type { DB } from '../../db'

// ============ 标签 ============
export function tagsRouter() {
  const app = new Hono()

  app.get('/tags', async (c) => {
    const db: DB = c.get('db')
    const rows = await db.select().from(tags).orderBy(tags.name)
    return c.json(rows)
  })

  app.post('/tags', requireAuth, async (c) => {
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

  app.patch('/tags/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    const data = tagSchema.partial().parse(await c.req.json())
    const [tag] = await db.update(tags).set(data).where(eq(tags.id, c.req.param('id'))).returning()
    return c.json(tag)
  })

  app.delete('/tags/:id', requireAuth, async (c) => {
    const db: DB = c.get('db')
    await db.delete(tags).where(eq(tags.id, c.req.param('id')))
    c.status(204)
    return c.body(null)
  })

  return app
}
