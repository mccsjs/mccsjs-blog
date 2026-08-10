// 封面本地化：构建期下载远程随机图，sharp 压缩为 900×600 webp 存 public/covers，
// 页面加载本地小图（快、可缓存、图固定）；失败回退远程 URL
import * as fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

async function doLocalize(url: string, slug: string): Promise<string> {
  const safeSlug = slug.replace(/[^\w-]/g, '_');
  const outDir = path.join(process.cwd(), 'public', 'covers');
  const outPath = path.join(outDir, `${safeSlug}.webp`);
  try {
    if (!fs.existsSync(outPath)) {
      fs.mkdirSync(outDir, { recursive: true });
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`fetch ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      await sharp(buf).resize(900, 600, { fit: 'cover' }).webp({ quality: 80 }).toFile(outPath);
    }
    return `/covers/${safeSlug}.webp`;
  } catch (e) {
    console.warn('[cover] 本地化失败，回退远程:', url, (e as Error).message);
    return url;
  }
}

export function localizeCover(url: string, slug: string): Promise<string> {
  if (!url) return Promise.resolve('');
  if (cache.has(slug)) return Promise.resolve(cache.get(slug)!);
  if (!pending.has(slug)) {
    pending.set(
      slug,
      doLocalize(url, slug).then((r) => {
        cache.set(slug, r);
        pending.delete(slug);
        return r;
      }),
    );
  }
  return pending.get(slug)!;
}
