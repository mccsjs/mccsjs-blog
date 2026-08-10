import type { APIRoute } from 'astro';
import { getAllPosts, getCategories, getTags } from '../utils/data';

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
  const posts = await getAllPosts();
  const postUrls: { path: string; lastmod: string }[] = posts.map((p) => ({
    path: `posts/${p.slug}`,
    lastmod: new Date(+p.updatedAt * 1000).toISOString(),
  }));

  // 动态分类页面
  const categoryUrls = (await getCategories()).map((c) => ({ path: `categories/${c.slug}` }));

  // 动态标签页面
  const tagUrls = (await getTags()).map((t) => ({ path: `tags/${t.slug}` }));

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
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
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
