// 归档页分页初始化。
// 由 entry.js 在每次页面切换后主动调用，避免依赖 Swup 是否重新执行页面内联脚本。
(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMonthDay(value) {
    var date = new Date(Number(value) * 1000);
    return String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function initArchive() {
    var root = document.getElementById('archive-root');
    if (!root || root.dataset.archiveInlineReady === '1' || root.dataset.archiveReady === '1') return;

    var dataEl = document.getElementById('archive-data');
    var contentEl = document.getElementById('archive-content');
    var prevBtn = document.getElementById('archive-prev');
    var nextBtn = document.getElementById('archive-next');
    var pageInfoEl = document.getElementById('archive-page-info');
    if (!dataEl || !contentEl || !prevBtn || !nextBtn || !pageInfoEl) return;

    var posts;
    try {
      posts = JSON.parse(dataEl.dataset.posts || '[]');
    } catch (_) {
      posts = [];
    }
    var totalPages = Number(dataEl.dataset.totalPages) || 1;
    var perPage = Number(dataEl.dataset.perPage) || 10;
    var currentPage = 1;
    root.dataset.archiveReady = '1';

    function renderPage(page) {
      currentPage = Math.min(Math.max(1, page), totalPages);
      var start = (currentPage - 1) * perPage;
      var paged = posts.slice(start, start + perPage);
      var grouped = {};
      paged.forEach(function (post) {
        var year = new Date(Number(post.createdAt) * 1000).getFullYear().toString();
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(post);
      });
      var years = Object.keys(grouped).sort(function (a, b) { return Number(b) - Number(a); });
      var html = '<div class="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 sm:left-6"></div>';
      html += '<div class="space-y-12">';

      years.forEach(function (year) {
        html += '<section class="relative"><div class="flex items-center gap-4 mb-6">';
        html += '<div class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-sm font-bold text-white shadow-sm sm:h-10 sm:w-10">' + escapeHtml(year.slice(2)) + '</div>';
        html += '<h2 class="text-2xl font-bold text-[rgb(var(--fg))] dark:text-[rgb(var(--fg))]">' + escapeHtml(year) + '</h2>';
        html += '<span class="text-sm text-[rgb(var(--fg-muted))] dark:text-[rgb(var(--fg-muted))]">' + grouped[year].length + ' 篇</span></div>';
        html += '<div class="ml-12 space-y-3 sm:ml-16">';
        grouped[year].forEach(function (post) {
          html += '<a href="/posts/' + escapeHtml(post.slug) + '" class="group flex items-start gap-4 rounded-xl border border-[rgb(var(--card-border))] bg-[rgb(var(--card-bg))] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-[rgb(var(--card-border))] dark:bg-[rgb(var(--card-bg))]">';
          html += '<time class="shrink-0 pt-0.5 text-sm font-medium text-[rgb(var(--fg-muted))] dark:text-[rgb(var(--fg-muted))]">' + escapeHtml(formatMonthDay(post.createdAt)) + '</time>';
          html += '<div class="min-w-0 flex-1"><h3 class="truncate text-base font-semibold text-[rgb(var(--fg))] group-hover:text-yellow-600 dark:text-[rgb(var(--fg))] dark:group-hover:text-yellow-400">' + escapeHtml(post.title) + '</h3>';
          html += '<div class="mt-1 flex items-center gap-2 text-xs text-[rgb(var(--fg-muted))] dark:text-[rgb(var(--fg-muted))]"><span class="rounded-full bg-yellow-50 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">' + escapeHtml(post.category) + '</span>';
          if (post.tags.length > 0) html += '<span class="truncate">' + post.tags.map(function (tag) { return '#' + escapeHtml(tag); }).join(' ') + '</span>';
          html += '</div></div></a>';
        });
        html += '</div></section>';
      });
      html += '</div>';
      contentEl.innerHTML = html;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;
      pageInfoEl.textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页';
    }

    prevBtn.onclick = function () { if (currentPage > 1) renderPage(currentPage - 1); };
    nextBtn.onclick = function () { if (currentPage < totalPages) renderPage(currentPage + 1); };
    renderPage(1);
  }

  window.__archiveInit = initArchive;
}());

export var initArchive = window.__archiveInit;
