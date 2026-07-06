import { z } from 'zod';
import { prisma } from '../db';
import { auth } from '../auth';

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  description: z.string().max(200).default(''),
  color: z.string().max(20).default('#FBBF24'),
});

export function registerCategoryRoutes(app: any) {
  app.get('/api/categories', async ({ prisma }: any) =>
    prisma.category.findMany({ orderBy: { name: 'asc' } })
  );

  app.post('/api/categories', async ({ prisma, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = categorySchema.parse(body);
    return prisma.category.create({ data });
  }, { auth: true });

  app.patch('/api/categories/:id', async ({ prisma, params, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = categorySchema.partial().parse(body);
    return prisma.category.update({ where: { id: params.id }, data });
  }, { auth: true });

  app.delete('/api/categories/:id', async ({ prisma, params, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    await prisma.category.delete({ where: { id: params.id } });
    set.status = 204;
    return null;
  }, { auth: true });
}
