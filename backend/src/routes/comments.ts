import { z } from 'zod';
import { prisma } from '../db';
import { auth } from '../auth';

const commentSchema = z.object({
  postId: z.string(),
  author: z.string().min(1).max(50),
  email: z.string().email(),
  content: z.string().min(1).max(1000),
  parentId: z.string().nullable().optional(),
});

export function registerCommentRoutes(app: any) {
  // 公开：获取评论列表
  app.get('/api/comments', async ({ prisma, query }: any) => {
    const postId = typeof query.postId === 'string' ? query.postId : undefined;
    const where: any = { visible: true };
    if (postId) where.postId = postId;
    return prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { replies: { where: { visible: true }, orderBy: { createdAt: 'asc' } } },
    });
  });

  // 公开：提交评论
  app.post('/api/comments', async ({ prisma, body, request }: any) => {
    const data = commentSchema.parse(body);
    return prisma.comment.create({
      data: {
        ...data,
        parentId: data.parentId || null,
        visible: false, // 默认需审核
      },
    });
  });

  // 管理：切换评论可见性
  app.patch('/api/comments/:id/visible', async ({ prisma, params, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const { visible } = z.object({ visible: z.boolean() }).parse(body);
    return prisma.comment.update({
      where: { id: params.id },
      data: { visible },
    });
  }, { auth: true });

  // 管理：删除评论
  app.delete('/api/comments/:id', async ({ prisma, params, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    await prisma.comment.delete({ where: { id: params.id } });
    set.status = 204;
    return null;
  }, { auth: true });
}
