// 动态 OG 分享图：构建期用 satori + sharp 为每篇文章生成 1200×630 PNG（对齐 Firefly）
import type { APIContext, GetStaticPaths } from 'astro';
import * as fs from 'node:fs';
import satori from 'satori';
import { woff2 } from 'fonteditor-core';
import type { Post } from '../../types';
import { getAllPosts, siteConfig } from '../../utils/data';

export const prerender = true;

// 磁盘路径解析：public（/ 或 /public/ 前缀）与 src/assets（无 / 前缀）两类
// satori 只支持 ttf/otf/woff1，woff2 需先 init wasm 再 decode 成 ttf
async function woff2ToTtf(buf: Buffer): Promise<Buffer> {
  await woff2.init();
  return Buffer.from(woff2.decode(buf));
}

export const getStaticPaths: GetStaticPaths = async () => {
  if (!siteConfig.generateOgImages) return [];
  const posts = await getAllPosts();
  return posts.map((post) => ({
    params: { slug: `${post.slug}.png` },
    props: { post },
  }));
};

// 字体缓存：使用本地 public/font 下的字体（转 ttf），无需外网
let fontCache: { regular: Buffer | null; bold: Buffer | null } | null = null;
async function getFonts() {
  if (fontCache) return fontCache;
  const out = { regular: null as Buffer | null, bold: null as Buffer | null };
  try {
    const ttf = await woff2ToTtf(fs.readFileSync('./public/font/b.woff2'));
    out.regular = ttf;
    out.bold = ttf; // 同一字体兼作粗体，避免依赖 Google Fonts
    console.log('[OG] 使用本地字体 public/font/b.woff2（已转 ttf）');
  } catch (e) {
    console.warn('[OG] 本地字体转换失败，OG 图中文字体缺失：', (e as Error).message);
  }
  fontCache = out;
  return out;
}

// sharp 懒加载 + 图片转 PNG base64（带缓存，避免同一图标重复处理）
let sharpPromise: Promise<typeof import('sharp')['default']> | null = null;
function getSharp() {
  if (!sharpPromise) sharpPromise = import('sharp').then((m) => m.default);
  return sharpPromise;
}
const convertedCache = new Map<string, string>();
async function imageToPngBase64(filePath: string): Promise<string> {
  if (convertedCache.has(filePath)) return convertedCache.get(filePath)!;
  const sharp = await getSharp();
  try {
    const png = await sharp(fs.readFileSync(filePath)).png().toBuffer();
    const result = `data:image/png;base64,${png.toString('base64')}`;
    convertedCache.set(filePath, result);
    return result;
  } catch (e) {
    console.warn('[OG] 图片处理失败，使用透明占位图：', (e as Error).message);
    const sharp2 = await getSharp();
    const transparent = await sharp2({ create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .png()
      .toBuffer();
    const result = `data:image/png;base64,${transparent.toString('base64')}`;
    convertedCache.set(filePath, result);
    return result;
  }
}

export async function GET({ props }: APIContext<{ post: Post }>): Promise<Response> {
  const { post } = props;
  const { regular, bold } = await getFonts();

  // 站点图标：读取 siteConfig.favicon（兼作 logo），用源文件磁盘路径绘制
  const iconFsPath = (siteConfig.favicon as { fsPath?: string }).fsPath ?? null;
  const iconBase64 = iconFsPath ? await imageToPngBase64(iconFsPath) : null;

  const primaryColor = '#d97706'; // amber-600，站点强调色
  const textColor = '#f3f4f6';
  const subtleColor = '#9ca3af';
  const backgroundColor = '#1a1b2e';

  const pubDate = new Date(+post.createdAt * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const description = (post.excerpt || '').slice(0, 120);

  const template = {
    type: 'div',
    props: {
      style: {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor,
        fontFamily: '"Noto Sans SC", sans-serif',
        padding: '60px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '20px' },
            children: [
              iconBase64 && { type: 'img', props: { src: iconBase64, width: 48, height: 48, style: { borderRadius: '10px' } } },
              {
                type: 'div',
                props: {
                  style: { fontSize: '32px', fontWeight: 600, color: subtleColor },
                  children: siteConfig.title,
                },
              },
            ].filter(Boolean),
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flexGrow: 1,
              gap: '20px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'flex-start' },
                  children: [
                    { type: 'div', props: { style: { width: '10px', height: '68px', backgroundColor: primaryColor, borderRadius: '6px', marginTop: '14px' } } },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '64px',
                          fontWeight: 700,
                          lineHeight: 1.2,
                          color: textColor,
                          marginLeft: '25px',
                          display: '-webkit-box',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineClamp: 3,
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        },
                        children: post.title,
                      },
                    },
                  ],
                },
              },
              description && {
                type: 'div',
                props: {
                  style: {
                    fontSize: '30px',
                    lineHeight: 1.5,
                    color: subtleColor,
                    paddingLeft: '35px',
                    display: '-webkit-box',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineClamp: 2,
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  },
                  children: description,
                },
              },
            ].filter(Boolean),
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
            children: [
              { type: 'div', props: { style: { fontSize: '26px', fontWeight: 600, color: textColor }, children: siteConfig.title } },
              { type: 'div', props: { style: { fontSize: '26px', color: subtleColor }, children: pubDate } },
            ],
          },
        },
      ],
    },
  };

  const fonts = [];
  if (regular) fonts.push({ name: 'Noto Sans SC', data: regular, weight: 400 as const, style: 'normal' as const });
  if (bold) fonts.push({ name: 'Noto Sans SC', data: bold, weight: 700 as const, style: 'normal' as const });
  if (!fonts.length) console.warn('[OG] 无可用字体，生成的中文可能显示为空白');

  const svg = await satori(template as never, { width: 1200, height: 630, fonts });
  const sharp = await getSharp();
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
