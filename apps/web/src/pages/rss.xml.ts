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

  return rss({
    title: 'mccsjs',
    description: '一个使用 Astro + React + Tailwind CSS 构建的现代博客',
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
}
