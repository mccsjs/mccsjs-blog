import type { App } from '../app'
import { menuSchema } from '../schemas'
import { buildMenuTree } from '../utils/menu'

export function registerMenuRoutes(app: App) {
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
}
