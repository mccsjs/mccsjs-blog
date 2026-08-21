/* 朋友圈 / 友链检测
   数据源：Friend-Circle-Lite（fc.mccsjs.cn）
   - /fc 页：拉 all.json 渲染朋友圈文章卡片
   - /link 页：拉 link.json 渲染友链可达性胶囊
   BaseLayout 常驻加载，监听 swup:page-view / astro:page-load 跨切页初始化 */
(function () {
  'use strict';

  var API_DEFAULT = 'https://fc.mccsjs.cn/';
  var TTL = 5 * 60 * 1000; // 数据缓存 5 分钟
  var PAGE_SIZE = 15; // 朋友圈每页数量
  var cache = {};

  function apiBase() {
    var root = document.getElementById('fc-root');
    if (root && root.dataset.api) return root.dataset.api;
    var cfg = document.getElementById('fc-link-config');
    if (cfg && cfg.dataset.api) return cfg.dataset.api;
    return API_DEFAULT;
  }

  function fetchJson(url) {
    return fetch(url, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function getJson(key, file) {
    var c = cache[key];
    if (c && c.d && Date.now() - c.t < TTL) return Promise.resolve(c.d);
    if (c && c.p) return c.p;
    var p = fetchJson(apiBase() + file)
      .then(function (d) {
        cache[key] = { d: d, t: Date.now(), p: null };
        return d;
      })
      .catch(function (e) {
        cache[key] = { d: null, t: 0, p: null };
        throw e;
      });
    cache[key] = { d: null, t: 0, p: p };
    return p;
  }

  function normUrl(u) {
    return String(u || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  }

  /* ---------- 友链检测胶囊 ---------- */
  function initPills() {
    var pills = document.querySelectorAll('[data-friend-pill]');
    if (!pills.length) return;
    getJson('link', 'link.json').then(function (data) {
      var byName = {};
      var byUrl = {};
      (data.link_data || []).forEach(function (it) {
        byName[it.name] = it;
        if (it.link) byUrl[normUrl(it.link)] = it;
      });
      pills.forEach(function (el) {
        var item = byName[el.getAttribute('data-name')] || byUrl[normUrl(el.getAttribute('data-url'))];
        if (!item) {
          el.style.display = 'none';
          return;
        }
        var cls;
        var txt;
        if (item.reachable) {
          // 测速胶囊：3 秒内绿、3 秒后黄，显示延迟秒数
          var lat = item.latency != null && item.latency > 0 ? item.latency : 0;
          cls = lat < 3 ? 'bg-green-500/90 text-white' : 'bg-yellow-400/90 text-yellow-900';
          txt = lat > 0 ? lat.toFixed(2) + 's' : '可达';
        } else {
          // 不可达：红色 + 感叹号
          cls = 'bg-red-500/90 text-white';
          txt = '！';
        }
        el.style.display = '';
        el.className = 'absolute top-1 left-1 flex items-center gap-0.5 rounded-full px-1 py-px text-[9px] font-medium shadow-sm ' + cls;
        el.textContent = txt;
      });
    }).catch(function () {
      pills.forEach(function (el) { el.style.display = 'none'; });
    });
  }

  /* ---------- 朋友圈文章 ---------- */
  function makeCard(a) {
    var el = document.createElement('a');
    el.className = 'group flex flex-col overflow-hidden rounded-2xl border border-[rgb(var(--card-border))] bg-[rgb(var(--card-bg))] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-[rgb(var(--card-border))] dark:bg-[rgb(var(--card-bg))]';
    el.href = a.link || '#';
    el.target = '_blank';
    el.rel = 'noopener noreferrer';

    var bg = document.createElement('div');
    bg.className = 'relative h-24 w-full overflow-hidden bg-gray-100 dark:bg-gray-800';
    var av = document.createElement('img');
    av.className = 'h-full w-full object-cover opacity-40';
    av.src = a.avatar || '';
    av.alt = '';
    av.loading = 'lazy';
    av.decoding = 'async';
    av.onerror = function () { av.style.display = 'none'; };
    bg.appendChild(av);
    el.appendChild(bg);

    var body = document.createElement('div');
    body.className = 'flex flex-1 flex-col gap-1.5 p-3';
    var title = document.createElement('h3');
    title.className = 'line-clamp-2 text-sm font-semibold leading-snug text-[rgb(var(--fg))] group-hover:text-yellow-700 dark:text-[rgb(var(--fg))] dark:group-hover:text-yellow-300';
    title.textContent = a.title || '(无标题)';
    body.appendChild(title);

    var meta = document.createElement('div');
    meta.className = 'mt-auto flex items-center gap-2 pt-1';
    var metaImg = document.createElement('img');
    metaImg.className = 'h-5 w-5 shrink-0 rounded-full object-cover';
    metaImg.src = a.avatar || '';
    metaImg.loading = 'lazy';
    metaImg.onerror = function () { metaImg.style.visibility = 'hidden'; };
    meta.appendChild(metaImg);
    var author = document.createElement('span');
    author.className = 'truncate text-xs text-[rgb(var(--fg-muted))] dark:text-[rgb(var(--fg-muted))]';
    author.textContent = a.author || '未知';
    meta.appendChild(author);
    var date = document.createElement('time');
    date.className = 'ml-auto shrink-0 text-xs text-[rgb(var(--fg-muted))] dark:text-[rgb(var(--fg-muted))]';
    date.textContent = (a.created || '').substring(0, 10);
    meta.appendChild(date);
    body.appendChild(meta);

    el.appendChild(body);
    return el;
  }

  function initCircle() {
    var root = document.getElementById('fc-root');
    if (!root) return;
    var statsEl = document.getElementById('fc-stats');
    var listEl = document.getElementById('fc-list');
    var moreBtn = document.getElementById('fc-more');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (statsEl) statsEl.innerHTML = '正在加载朋友圈…';
    if (moreBtn) moreBtn.hidden = true;

    getJson('all', 'all.json').then(function (data) {
      var articles = data.article_data || [];
      var stats = data.statistical_data;

      if (statsEl && stats) {
        var items = [
          ['友链', stats.friends_num],
          ['活跃', stats.active_num],
          ['异常', stats.error_num],
          ['文章', stats.article_num],
        ];
        statsEl.innerHTML = items.map(function (it) {
          return '<span class="rounded-full border border-[rgb(var(--card-border))] bg-[rgb(var(--card-bg))] px-3 py-1 text-xs">' + it[0] + ' <b class="text-[rgb(var(--fg))]">' + (it[1] != null ? it[1] : '-') + '</b></span>';
        }).join('') +
          '<span class="text-xs text-[rgb(var(--fg-muted))]">更新于 ' + (stats.last_updated_time || '') + '</span>';
      }

      var start = 0;
      function renderMore() {
        var next = articles.slice(start, start + PAGE_SIZE);
        next.forEach(function (a) { listEl.appendChild(makeCard(a)); });
        start += next.length;
        if (moreBtn) moreBtn.hidden = start >= articles.length;
      }
      if (moreBtn) {
        moreBtn.onclick = renderMore;
        moreBtn.textContent = '再来亿点';
      }
      if (!articles.length && statsEl) statsEl.innerHTML = '暂时没有朋友圈文章';
      renderMore();
    }).catch(function () {
      if (statsEl) statsEl.innerHTML = '加载失败，请稍后重试';
    });
  }

  function boot() {
    initPills();
    initCircle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('swup:page-view', boot);
  document.addEventListener('astro:page-load', boot);
})();
