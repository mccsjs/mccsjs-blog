import type { APIRoute } from 'astro';
import { friendsConfig } from '../config/friendsConfig';

// 不参与友链检测的分组（已失联站点等），按需调整
const EXCLUDE_TYPES = new Set(['已失联']);

export const GET: APIRoute = () => {
  const friends = friendsConfig
    .filter((f) => !(f.type && EXCLUDE_TYPES.has(f.type)))
    .map((f) => [f.name, f.url, f.avatar]);

  const body = JSON.stringify({ friends }, null, 2);
  return new Response(body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
