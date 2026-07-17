import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PUBLIC_API_URL)
  || (typeof process !== 'undefined' && process.env && process.env.PUBLIC_API_URL)
  || '';

export async function GET(context: APIContext) {
  let posts: any[] = [];
  try {
    const res = await fetch(`${API_URL}/api/posts`);
    if (res.ok) posts = await res.json();
  } catch {}

  const resp = await rss({
    title: 'mccsjs',
    description: '一个使用 Astro + React + Tailwind CSS 构建的博客',
    site: context.url.origin,
    items: posts.map((post) => ({
      title: post.title,
      description: post.excerpt || '',
      pubDate: new Date(+post.createdAt * 1000),
      link: `/posts/${post.slug}`,
      categories: post.tags?.map((t: any) => t.name) || [],
    })),
    customData: `<language>zh-CN</language>
    <generator>Astro</generator>`,
  });

  // 注入 XSL 样式表引用：浏览器打开时渲染美化页面，阅读器/爬虫仍拿到标准 XML
  const xml = await resp.text();
  const styled = xml.replace(
    /^<\?xml[^>]*\?>/,
    '$&\n<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>'
  );
  return new Response(styled, { headers: resp.headers });
}
