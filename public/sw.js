// 随机封面缓存：按 seed（v 参数）缓存 API 返回的图，同文同图、刷新不重复下载
const CACHE = 'fm-covers-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // 只处理随机封面 API
  if (!(url.hostname.includes('alcy.cc') || url.hostname.includes('uapis.cn'))) return;
  const seed = url.searchParams.get('v') || 'default';
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(seed);
      if (hit) return hit;
      const resp = await fetch(event.request);
      if (resp.ok) cache.put(seed, resp.clone());
      return resp;
    })
  );
});
