import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllPosts, siteConfig } from '../utils/data';
import { renderMarkdown } from '../utils/markdown';

export async function GET(context: APIContext) {
  const posts = await getAllPosts();
  const origin = context.url.origin;

  // 渲染每篇正文为 HTML（Sätteri + Shiki），图片/链接相对路径绝对化
  const items = [];
  for (const post of posts) {
    let content = '';
    try {
      const looksLikeHtml = /^\s*</.test(post.content) && /<\/[a-z]+>/i.test(post.content);
      const html = looksLikeHtml ? post.content : (await renderMarkdown(post.content)).html;
      content = html.replace(/(src|href)="\/(?!\/)/g, `$1="${origin}/`);
    } catch {
      content = '';
    }
    items.push({
      title: post.title,
      description: post.excerpt || '',
      content,
      pubDate: new Date(+post.createdAt * 1000),
      link: `${origin}/posts/${post.slug}`,
      categories: post.tags?.map((t) => t.name) || [],
    });
  }

  const resp = await rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: origin,
    items,
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
