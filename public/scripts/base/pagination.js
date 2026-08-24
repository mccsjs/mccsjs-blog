// 分页：posts 页 SSR 分页条交互。document 委托，SWUP 切页后依然有效
(function () {
  var currentPage = 1;

  // 按钮基础类
  var BASE_BTN = 'inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-all duration-200 ';
  var BTN_DEFAULT = 'border-[rgb(var(--card-border))] text-[rgb(var(--fg))] hover:-translate-y-0.5 hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary))]';
  var BTN_ACTIVE = 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white';
  var BTN_DISABLED = 'opacity-40 pointer-events-none';
  var ELL = 'inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm';

  // 截断式页码序列（与 src/pages/posts/index.astro 的 pageList 一致）：首尾 + 当前位置前后各 1
  function pageList(cur, total) {
    if (total <= 7) {
      var all = [];
      for (var i = 1; i <= total; i++) all.push(i);
      return all;
    }
    var set = [1, total, cur - 1, cur, cur + 1].filter(function (p) { return p >= 1 && p <= total; });
    var uniq = Array.from(new Set(set)).sort(function (a, b) { return a - b; });
    var out = [];
    var prev = 0;
    for (var j = 0; j < uniq.length; j++) {
      var p = uniq[j];
      if (p - prev > 1) out.push('…');
      out.push(p);
      prev = p;
    }
    return out;
  }

  function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

  // 根据当前页实时生成完整分页条 HTML（保证切页时页码与省略号同步刷新）
  function buildPagerHTML(cur, total) {
    var prevHidden = cur <= 1;
    var nextHidden = cur >= total;
    var html = '';
    if (!prevHidden) {
      html += '<button type="button" data-nav="prev" class="' + escAttr(BASE_BTN + BTN_DEFAULT) + '">上一页</button>';
    }
    var pages = pageList(cur, total);
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      if (p === '…') {
        html += '<span class="' + escAttr(ELL) + '">…</span>';
      } else {
        var cls = BASE_BTN + (p === cur ? BTN_ACTIVE : BTN_DEFAULT);
        html += '<button type="button" data-page="' + p + '" class="' + escAttr(cls) + '">' + p + '</button>';
      }
    }
    if (!nextHidden) {
      html += '<button type="button" data-nav="next" class="' + escAttr(BASE_BTN + BTN_DEFAULT) + '">下一页</button>';
    }
    return html;
  }

  function getPerPage() {
    var pager = document.getElementById('posts-pagination');
    var n = pager && Number(pager.dataset.perPage);
    return n || 9;
  }

  function getState() {
    var grid = document.getElementById('posts-grid');
    var pager = document.getElementById('posts-pagination');
    if (!grid || !pager) return null;
    var items = grid.querySelectorAll('.post-item');
    if (!items.length) return null;
    var total = Math.max(1, Math.ceil(items.length / getPerPage()));
    return { grid: grid, pager: pager, items: items, total: total };
  }

  function setPage(page) {
    var st = getState();
    if (!st) return;
    var perPage = getPerPage();
    currentPage = Math.min(Math.max(1, page), st.total);
    try { sessionStorage.setItem('posts-page', String(currentPage)); } catch (e) {}
    var start = (currentPage - 1) * perPage;
    var end = start + perPage;
    for (var k = 0; k < st.items.length; k++) {
      st.items[k].classList.toggle('hidden', Number(st.items[k].dataset.index) < start || Number(st.items[k].dataset.index) >= end);
    }
    // 关键修复：按当前页实时重渲分页条，确保省略号随页码变化、当前页按钮始终存在
    st.pager.innerHTML = buildPagerHTML(currentPage, st.total);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#posts-pagination button');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    var nav = btn.dataset.nav;
    if (nav === 'prev') setPage(currentPage - 1);
    else if (nav === 'next') setPage(currentPage + 1);
    else setPage(Number(btn.dataset.page));
  });

  // 返回列表页时恢复离开时的页码（Swup 缓存的是首次 HTML，翻页状态不保留）
  function restorePage() {
    try {
      var saved = Number(sessionStorage.getItem('posts-page') || '');
      if (saved >= 1) setPage(saved);
    } catch (e) {}
  }
  document.addEventListener('astro:page-load', restorePage);
  restorePage();
})();
