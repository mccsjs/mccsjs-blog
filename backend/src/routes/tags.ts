import { z } from 'zod';
import { prisma } from '../db';
import { auth } from '../auth';

const tagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  color: z.string().max(20).default('#FBBF24'),
});

export function registerTagRoutes(app: any) {
  app.get('/api/tags', async () =>
    prisma.tag.findMany({ orderBy: { name: 'asc' } })
  );

  app.post('/api/tags', async ({ body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = tagSchema.parse(body);
    return prisma.tag.create({ data });
  }, { auth: true });

  app.patch('/api/tags/:id', async ({ params, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = tagSchema.partial().parse(body);
    return prisma.tag.update({ where: { id: params.id }, data });
  }, { auth: true });

  app.delete('/api/tags/:id', async ({ params, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    await prisma.tag.delete({ where: { id: params.id } });
    set.status = 204;
    return null;
  }, { auth: true });
}
