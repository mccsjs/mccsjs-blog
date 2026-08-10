import type { APIRoute } from 'astro';
import { getAllPosts } from '../utils/data';

// 纯静态搜索索引：构建期生成 search-index.json，前端本地过滤，替代后端搜索接口
export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  const index = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt || '',
    createdAt: p.createdAt,
    tags: p.tags.map((t) => t.name),
    category: p.category?.name || '',
    content: (p.content || '').slice(0, 3000),
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
