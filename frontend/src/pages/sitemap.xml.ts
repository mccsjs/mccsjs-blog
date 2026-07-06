import type { APIRoute } from 'astro';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PUBLIC_API_URL)
  || (typeof process !== 'undefined' && process.env && process.env.PUBLIC_API_URL)
  || '';

const STATIC_PAGES = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: 'posts', priority: '0.9', changefreq: 'daily' },
  { path: 'archive', priority: '0.8', changefreq: 'weekly' },
  { path: 'categories', priority: '0.7', changefreq: 'weekly' },
  { path: 'tags', priority: '0.7', changefreq: 'weekly' },
  { path: 'link', priority: '0.6', changefreq: 'weekly' },
];

export const GET: APIRoute = async ({ url }) => {
  const base = url.origin;

  // 动态文章页面
  let postUrls: { path: string; lastmod: string }[] = [];
  try {
    const res = await fetch((API_URL || '') + '/api/posts');
    if (res.ok) {
      const posts = await res.json();
      postUrls = posts.map((p: any) => ({
        path: `posts/${p.slug}`,
        lastmod: new Date(p.updatedAt || p.createdAt).toISOString(),
      }));
    }
  } catch {}

  // 动态分类页面
  let categoryUrls: { path: string }[] = [];
  try {
    const res = await fetch((API_URL || '') + '/api/categories');
    if (res.ok) {
      const cats = await res.json();
      categoryUrls = cats.map((c: any) => ({ path: `categories/${c.slug}` }));
    }
  } catch {}

  // 动态标签页面
  let tagUrls: { path: string }[] = [];
  try {
    const res = await fetch((API_URL || '') + '/api/tags');
    if (res.ok) {
      const tags = await res.json();
      tagUrls = tags.map((t: any) => ({ path: `tags/${t.slug}` }));
    }
  } catch {}

  const urls = [
    ...STATIC_PAGES.map((p) => ({
      loc: `${base}/${p.path}`.replace(/\/$/, '') || base,
      priority: p.priority,
      changefreq: p.changefreq,
    })),
    ...postUrls.map((p) => ({
      loc: `${base}/${p.path}`,
      priority: '0.6',
      lastmod: p.lastmod,
    })),
    ...categoryUrls.map((c) => ({
      loc: `${base}/${c.path}`,
      priority: '0.5',
    })),
    ...tagUrls.map((t) => ({
      loc: `${base}/${t.path}`,
      priority: '0.5',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${escapeXml(u.lastmod)}</lastmod>` : ''}
    ${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}
    ${u.priority ? `<priority>${u.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
