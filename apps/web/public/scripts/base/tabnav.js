// TabNav 样式注入保障（对抗 Swup updateHead 替换 <head>）
  // ===== TabNav 样式注入保障（对抗 Swup updateHead 替换 <head>） =====
  // Swup 配置了 updateHead: { persistAssets: true }，每次页面切换会替换 <head>
  // 只保留 <link rel="stylesheet"> 和 <script src="...">，动态注入的 <style> 会被删除
  var __tabNavCSS = [
    '.tab-nav{position:relative;display:flex;align-items:center;justify-content:center;gap:2px;width:fit-content;margin:0 auto 2.5rem;padding:5px;border-radius:50px;background:oklch(1 0 0/0.72);border:1px solid oklch(0 0 0/0.06);box-shadow:0 1px 3px oklch(0 0 0/0.04)}',
    '.dark .tab-nav{background:oklch(0.15 0 0/0.72);border-color:oklch(1 0 0/0.06);box-shadow:0 1px 3px oklch(0 0 0/0.12)}',
    '#tab-hover-border{position:absolute;height:2.25rem;border-radius:9999px;border:1.5px solid oklch(0.35 0 0);background:transparent;opacity:0;pointer-events:none;z-index:0;transition:left .25s cubic-bezier(.25,.46,.45,.94),width .25s cubic-bezier(.25,.46,.45,.94)}',
    '.dark #tab-hover-border{border-color:oklch(0.6 0 0)}',
    '.tab-nav:hover #tab-hover-border,.tab-nav.has-active #tab-hover-border{opacity:1}',
    '.tab-item{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;padding:6px 18px;border-radius:50px;font-size:14px;font-weight:500;color:oklch(0.35 0 0);text-decoration:none;white-space:nowrap;transition:color .15s ease;line-height:1;font-family:inherit}',
    '.dark .tab-item{color:oklch(0.55 0 0)}',
    '.tab-item:hover{color:oklch(0.1 0 0)}',
    '.dark .tab-item:hover{color:oklch(0.95 0 0)}',
    '.tab-item.active{font-weight:600;color:oklch(0.15 0 0)}',
    '.dark .tab-item.active{color:oklch(0.92 0 0)}'
  ].join('');
  var __tabNavStyleId = '__tab-nav-styles';

  function ensureTabNavStyles() {
    if (!document.getElementById(__tabNavStyleId)) {
      var s = document.createElement('style');
      s.id = __tabNavStyleId;
      s.textContent = __tabNavCSS;
      document.head.appendChild(s);
    }
  }
  ensureTabNavStyles();

  // MutationObserver：监听 <head> 子节点变化（Swup 替换时），样式被删则立即补回
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var removed = mutations[i].removedNodes;
        for (var j = 0; j < removed.length; j++) {
          if (removed[j].id === __tabNavStyleId) { ensureTabNavStyles(); return; }
        }
      }
    }).observe(document.head, { childList: true });
  }

  // Swup 事件双重保障
  function hookSwup() {
    if (!window.swup || !window.swup.hooks) return;
    window.swup.hooks.on('visit:end', ensureTabNavStyles);
    window.swup.hooks.on('page:view', ensureTabNavStyles);
  }
  hookSwup();
  if (!window.swup) { var _t = setInterval(function() { if (window.swup) { clearInterval(_t); hookSwup(); } }, 100); }
  document.addEventListener('astro:page-load', ensureTabNavStyles);
