// llms.txt：面向 LLM 的站点说明（llmstxt.org 规范），构建期自动生成
import type { APIContext } from 'astro';
import { getAllPosts, siteConfig } from '../utils/data';

// 摘要清洗：去 HTML 标签、压缩空白、截断
function cleanExcerpt(text: string, max = 120): string {
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>[\]()!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

export async function GET(context: APIContext) {
  const origin = context.url.origin;
  const posts = await getAllPosts();

  const lines: string[] = [];
  lines.push(`# ${siteConfig.title}`);
  lines.push('');
  lines.push(
    `> ${siteConfig.description}。作者：${siteConfig.author?.name || siteConfig.title}（${siteConfig.author?.bio || '记录生活'}）。`
  );
  lines.push('');
  lines.push('## 主要页面');
  lines.push(`- [首页](${origin}/): 博客首页，展示最新文章`);
  lines.push(`- [归档](${origin}/archive): 全部文章按时间归档`);
  lines.push(`- [分类](${origin}/categories): 按分类浏览文章`);
  lines.push(`- [标签](${origin}/tags): 按标签浏览文章`);
  lines.push(`- [友链](${origin}/link): 友情链接`);
  lines.push(`- [留言板](${origin}/comments): 访客留言`);
  lines.push(`- [关于](${origin}/about): 站长信息`);
  lines.push('');
  lines.push('## 内容索引');
  for (const p of posts) {
    const date = new Date(+p.createdAt * 1000).toISOString().slice(0, 10);
    const cat = p.category?.name ? `【${p.category.name}】` : '';
    const excerpt = p.excerpt ? cleanExcerpt(p.excerpt) : '';
    const desc = `${date} ${cat}${excerpt}`.trim();
    lines.push(`- [${p.title}](${origin}/posts/${p.slug}): ${desc}`);
  }
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
