import { z } from 'zod';
import { prisma } from '../db';
import { auth } from '../auth';
import { generateUniqueSlug } from '../utils/slug';

const postSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  excerpt: z.string().max(500).default(''),
  cover: z.string().max(500).default(''),
  categoryId: z.string(),
  tagIds: z.array(z.string()).default([]),
  published: z.boolean().default(false),
});

export function registerPostRoutes(app: any) {
  // Posts - 公开列表
  app.get('/api/posts', async ({ query }: any) => {
    const page = typeof query.page === 'string' ? Math.max(1, parseInt(query.page)) : 1;
    const pageSize = typeof query.pageSize === 'string'
      ? Math.max(1, Math.min(50, parseInt(query.pageSize)))
      : 10;
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, tags: true, comments: true },
      }),
      prisma.post.count({ where: { published: true } }),
    ]);
    return { list: posts, total, page, pageSize };
  });

  // 文章搜索（必须放在 /:slug 前面）
  app.get('/api/posts/search', async ({ query }: any) => {
    const keyword = typeof query.keyword === 'string' ? query.keyword : '';
    if (!keyword) return { list: [], total: 0 };
    const posts = await prisma.post.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: keyword } },
          { content: { contains: keyword } },
          { excerpt: { contains: keyword } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { category: true, tags: true },
    });
    return { list: posts, total: posts.length };
  });

  // 文章详情
  app.get('/api/posts/:slug', async ({ params, query }: any) => {
    const post = await prisma.post.findUnique({
      where: { slug: params.slug },
      include: { category: true, tags: true, comments: { where: { parentId: null } } },
    });
    if (!post || (!post.published && !query.preview)) {
      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
    }
    return post;
  });

  // 创建文章（管理）
  app.post('/api/posts', async ({ body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = postSchema.parse(body);
    const slug = await generateUniqueSlug(prisma, data.title);
    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        excerpt: data.excerpt,
        coverImage: data.cover || null,
        published: data.published,
        categoryId: data.categoryId,
        tags: { connect: data.tagIds.map((id: string) => ({ id })) },
      },
    });
    return post;
  }, { auth: true });

  // 更新文章（管理）
  app.patch('/api/posts/:id', async ({ params, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = postSchema.partial().parse(body);
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.cover !== undefined) updateData.coverImage = data.cover;
    if (data.published !== undefined) updateData.published = data.published;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.tagIds !== undefined) {
      updateData.tags = { set: data.tagIds.map((id: string) => ({ id })) };
    }
    return prisma.post.update({
      where: { id: params.id },
      data: updateData,
    });
  }, { auth: true });

  // 删除文章（管理）
  app.delete('/api/posts/:id', async ({ params, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    await prisma.post.delete({ where: { id: params.id } });
    set.status = 204;
    return null;
  }, { auth: true });
}
