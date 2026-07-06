import { z } from 'zod';
import { prisma } from '../db';
import { auth } from '../auth';

function buildMenuTree(menus: any[]) {
  const map = new Map<string, any>();
  const roots: any[] = [];

  for (const m of menus) {
    map.set(m.id, { ...m, children: [] });
  }
  for (const m of map.values()) {
    if (m.parentId) {
      map.get(m.parentId)?.children.push(m);
    } else {
      roots.push(m);
    }
  }
  return roots;
}

const menuSchema = z.object({
  label: z.string().min(1).max(50),
  href: z.string().max(500).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  type: z.enum(['NAV', 'GROUP', 'AGGREGATE']),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  target: z.string().max(20).nullable().optional(),
});

export function registerMenuRoutes(app: any) {
  // 公开：获取导航菜单（NAV 类型，树形结构）
  app.get('/api/menus', async ({ prisma, query }: any) => {
    const type = typeof query.type === 'string' ? query.type : 'NAV';
    const menus = await prisma.menu.findMany({
      where: { type, isVisible: true },
      orderBy: { sortOrder: 'asc' },
    });
    return type === 'NAV' ? buildMenuTree(menus) : menus;
  });

  // 管理：获取所有菜单
  app.get('/api/admin/menus', async ({ prisma, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    return prisma.menu.findMany({ orderBy: { sortOrder: 'asc' } });
  }, { auth: true });

  // 管理：创建菜单项
  app.post('/api/admin/menus', async ({ prisma, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = menuSchema.parse(body);
    return prisma.menu.create({ data });
  }, { auth: true });

  // 管理：更新菜单项
  app.patch('/api/admin/menus/:id', async ({ prisma, params, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = menuSchema.partial().parse(body);
    return prisma.menu.update({ where: { id: params.id }, data });
  }, { auth: true });

  // 管理：删除菜单项
  app.delete('/api/admin/menus/:id', async ({ prisma, params, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    await prisma.menu.deleteMany({
      where: { OR: [{ id: params.id }, { parentId: params.id }] },
    });
    set.status = 204;
    return null;
  }, { auth: true });
}
