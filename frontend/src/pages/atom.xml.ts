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

  const siteUrl = context.url.origin;

  const feedUpdated = posts.length > 0
    ? new Date(posts[0].updatedAt || posts[0].createdAt).toISOString()
    : new Date().toISOString();

  const entries = posts.map((post) => {
    const url = `${siteUrl}/posts/${post.slug}`;
    const updated = new Date(post.updatedAt || post.createdAt).toISOString();
    return `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${escapeXml(url)}" />
    <id>${escapeXml(url)}</id>
    <updated>${updated}</updated>
    <published>${new Date(post.createdAt).toISOString()}</published>
    <author><name>mccsjs</name></author>
    ${post.excerpt ? `<summary type="html">${escapeXml(post.excerpt)}</summary>` : ''}
    ${post.tags?.map((t: any) => `<category term="${escapeXml(t.name)}" />`).join('\n    ') || ''}
  </entry>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>mccsjs</title>
  <subtitle>一个使用 Astro + React + Tailwind CSS 构建的现代博客</subtitle>
  <link href="${siteUrl}/atom.xml" rel="self" />
  <link href="${siteUrl}" />
  <id>${siteUrl}/</id>
  <updated>${feedUpdated}</updated>
  <author><name>mccsjs</name></author>
${entries}
</feed>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
