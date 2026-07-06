import { prisma } from '../db';
import { auth } from '../auth';

export function registerUploadRoutes(app: any) {
  app.post('/api/upload', async ({ request, user, set }: any) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      set.status = 400;
      return { error: 'No file provided' };
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      set.status = 400;
      return { error: 'Invalid file type' };
    }
    if (file.size > 5 * 1024 * 1024) {
      set.status = 400;
      return { error: 'File too large' };
    }

    const ext = file.name.split('.').pop() || 'bin';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `uploads/${name}`;
    await Bun.write(path, file);
    return { url: `/uploads/${name}` };
  }, { auth: true });
}
