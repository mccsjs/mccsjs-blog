import { z } from 'zod';
import { prisma } from '../../db';
import { auth } from '../../auth';
import { autoScreenshot, enrichFriendScreenshot } from '../../utils/friend-helpers';
import { discoverRSSFeed } from './rss';

const friendTypeSchema = z.object({
  name: z.string().min(1).max(50),
  sort: z.number().int().default(0),
  isVisible: z.boolean().default(true),
});

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
});

export function registerFriendRoutes(app: any) {
  // ============ Friend Types (Admin) ============
  app.get('/api/admin/friend-types', async ({ prisma, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const types = await prisma.friendType.findMany({
      include: { _count: { select: { friends: true } } },
      orderBy: { sort: 'desc' },
    });
    return types.map(({ _count, ...t }: any) => ({ ...t, count: _count.friends }));
  }, { auth: true });

  app.post('/api/admin/friend-types', async ({ prisma, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = friendTypeSchema.parse(body);
    return prisma.friendType.create({ data });
  }, { auth: true });

  app.put('/api/admin/friend-types/:id', async ({ prisma, params, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = friendTypeSchema.partial().parse(body);
    return prisma.friendType.update({ where: { id: params.id }, data });
  }, { auth: true });

  app.delete('/api/admin/friend-types/:id', async ({ prisma, params, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    await prisma.friendType.delete({ where: { id: params.id } });
    set.status = 204;
    return null;
  }, { auth: true });

  // ============ Friends (Admin) ============
  app.get('/api/admin/friends', async ({ prisma, user, set, query }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const keyword = typeof query.keyword === 'string' ? query.keyword : undefined;
    const typeId = typeof query.typeId === 'string' ? query.typeId : undefined;
    const where: any = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { url: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (typeId) where.typeId = typeId;
    return prisma.friend.findMany({
      where,
      include: { type: true },
      orderBy: [{ sort: 'desc' }, { createdAt: 'asc' }],
    }).then((friends: any) => friends.map(enrichFriendScreenshot));
  }, { auth: true });

  app.get('/api/admin/friends/:id', async ({ prisma, params, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const friend = await prisma.friend.findUnique({
      where: { id: params.id },
      include: { type: true },
    });
    if (!friend) { set.status = 404; return { error: 'Not Found' }; }
    return enrichFriendScreenshot(friend);
  }, { auth: true });

  app.post('/api/admin/friends', async ({ prisma, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = friendSchema.parse(body);
    const { typeId, ...rest } = data;
    if (!rest.isInvalid && !rest.screenshot && rest.url) {
      rest.screenshot = autoScreenshot(rest.url);
    }
    // 自动发现 RSS
    if (!rest.rssUrl && rest.url) {
      const discovered = await discoverRSSFeed(rest.url);
      if (discovered) rest.rssUrl = discovered;
    }
    return prisma.friend.create({
      data: {
        ...rest,
        type: typeId ? { connect: { id: typeId } } : undefined,
      },
      include: { type: true },
    });
  }, { auth: true });

  app.put('/api/admin/friends/:id', async ({ prisma, params, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = friendSchema.partial().parse(body);
    const { typeId, ...rest } = data;
    // 截图被清空时，若未标记失效且有 URL 则自动生成
    if (rest.screenshot === '' && !rest.isInvalid) {
      const friend = await prisma.friend.findUnique({ where: { id: params.id } });
      const url = rest.url || friend?.url;
      if (url) rest.screenshot = autoScreenshot(url);
    }
    // 自动发现 RSS
    if (rest.rssUrl === undefined && rest.url) {
      const friend = await prisma.friend.findUnique({ where: { id: params.id } });
      if (friend && friend.url !== rest.url) {
        const discovered = await discoverRSSFeed(rest.url);
        if (discovered) rest.rssUrl = discovered;
      }
    }
    return prisma.friend.update({
      where: { id: params.id },
      data: {
        ...rest,
        type: typeId !== undefined
          ? (typeId ? { connect: { id: typeId } } : { disconnect: true })
          : undefined,
      },
      include: { type: true },
    });
  }, { auth: true });

  app.delete('/api/admin/friends/:id', async ({ prisma, params, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    await prisma.friend.delete({ where: { id: params.id } });
    set.status = 204;
    return null;
  }, { auth: true });

  // ============ Friends (Public) ============
  app.get('/api/friends', async ({ prisma }: any) => {
    const types = await prisma.friendType.findMany({
      where: { isVisible: true },
      include: {
        friends: {
          where: { isInvalid: false },
          orderBy: [{ sort: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { sort: 'desc' },
    });

    return {
      groups: types
        .filter((t: any) => t.friends.length > 0)
        .map((t: any) => ({
          type_id: t.id,
          type_name: t.name,
          type_sort: t.sort,
          friends: t.friends.map(enrichFriendScreenshot),
        })),
    };
  });
}
