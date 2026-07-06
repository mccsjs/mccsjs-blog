import type { APIRoute } from 'astro';

const getRobotsTxt = (sitemapURL: URL) =>
  `User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ url }) => {
  const sitemapURL = new URL('sitemap.xml', url.origin);
  return new Response(getRobotsTxt(sitemapURL));
};
