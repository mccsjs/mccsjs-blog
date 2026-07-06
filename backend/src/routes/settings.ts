import { z } from 'zod';
import { prisma } from '../db';
import { auth } from '../auth';

export function registerSettingsRoutes(app: any) {
  // 公开：获取设置
  app.get('/api/settings', async ({ prisma }: any) => {
    const settings = await prisma.settings.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  });

  // 管理：更新设置
  app.put('/api/settings', async ({ prisma, body, user, set }: any) => {
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }
    const data = z.record(z.string(), z.string()).parse(body);
    for (const [key, value] of Object.entries(data)) {
      const existing = await prisma.settings.findUnique({ where: { key } });
      if (existing) {
        await prisma.settings.update({ where: { key }, data: { value } });
      } else {
        await prisma.settings.create({ data: { key, value } });
      }
    }
    return { success: true };
  }, { auth: true });
}
