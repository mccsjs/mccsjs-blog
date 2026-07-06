import { z } from 'zod';
import { prisma } from '../db';
import { auth } from '../auth';
import { generateUniqueSlug } from '../utils/slug';

const postSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  excerpt: z.string().max(500).default(''),
  cover: z.string().max(500).default(''),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  visible: z.boolean().default(true),
});

export function registerPostRoutes(app: any) {
  // Posts - 公开列表
  app.get('/api/posts', async ({ prisma, query }: any) => {
    const page = typeof query.page === 'string' ? Math.max(1, parseInt(query.page)) : 1;
    const pageSize = typeof query.pageSize === 'string'
      ? Math.max(1, Math.min(50, parseInt(query.pageSize)))
      : 10;
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { visible: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { categories: { include: { category: true } }, tags: { include: { tag: true } } },
      }),
      prisma.post.count({ where: { visible: true } }),
    ]);
    return { list: posts, total, page, pageSize };
  });

  // 文章搜索（必须放在 /:slug 前面）
  app.get('/api/posts/search', async ({ prisma, query }: any) => {
    const keyword = typeof query.keyword === 'string' ? query.keyword : '';
    if (!keyword) return { list: [], total: 0 };
    const posts = await prisma.post.findMany({
      where: {
        visible: true,
        OR: [
          { title: { contains: keyword } },
          { content: { contains: keyword } },
          { excerpt: { contains: keyword } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { categories: { include: { category: true } }, tags: { include: { tag: true } } },
    });
    return { list: posts, total: posts.length };
  });

  // 文章详情
  app.get('/api/posts/:slug', async ({ prisma, params, query }: any) => {
    const post = await prisma.post.findUnique({
      where: { slug: params.slug },
      include: { categories: { include: { category: true } }, tags: { include: { tag: true } } },
    });
    if (!post || (!post.visible && !query.preview)) {
      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
    }
    return post;
  });

  // 创建文章（管理）
  app.post('/api/posts', async ({ prisma, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = postSchema.parse(body);
    const slug = await generateUniqueSlug(prisma, data.title);
    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        excerpt: data.excerpt,        cover: data.cover,
        visible: data.visible,
        categories: { create: data.categories.map((id: string) => ({ category: { connect: { id } } })) },
        tags: { create: data.tags.map((id: string) => ({ tag: { connect: { id } } })) },
      },
    });
    return post;
  }, { auth: true });

  // 更新文章（管理）
  app.patch('/api/posts/:id', async ({ prisma, params, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = postSchema.partial().parse(body);
    return prisma.post.update({
      where: { id: params.id },
      data: {
        ...data,
        categories: data.categories
          ? { deleteMany: {}, create: data.categories.map((id: string) => ({ category: { connect: { id } } })) }
          : undefined,
        tags: data.tags
          ? { deleteMany: {}, create: data.tags.map((id: string) => ({ tag: { connect: { id } } })) }
          : undefined,
      },
    });
  }, { auth: true });

  // 删除文章（管理）
  app.delete('/api/posts/:id', async ({ prisma, params, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    await prisma.post.delete({ where: { id: params.id } });
    set.status = 204;
    return null;
  }, { auth: true });
}
