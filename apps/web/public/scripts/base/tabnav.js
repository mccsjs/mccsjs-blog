// TabNav 完整保障：CSS 注入 + 边框定位（对抗 Swup 切页）
//
// 本文件通过 entry.js 以 <script type="module"> 加载，位于 #swup-container 外部，
// 因此跨 Swup 切页持久存在。负责：
//   1) CSS 样式注入（Swup updateHead 会删 <head> 内联 <style>）
//   2) #tab-hover-border 滑动边框定位到 active tab
//   3) hover 委托 + resize 重定位
//
// 注意：TabNav.astro 的 <script is:inline> 也包含同样逻辑（首屏兜底），
//       但它在 #swup-container 内部，切页后不可靠。本文件是跨切页的主保障。

// ====== 1. CSS 样式注入 ======
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

// MutationObserver：监听 <head> 变化，样式被删立即补回
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

// ====== 2. 边框定位逻辑 ======

// 将滑动边框定位到目标 tab 上；布局未就绪时 rAF 重试，避免「细竖线」
function positionBorder(item, hoverBorder) {
  var attempts = 0;
  function tryPos() {
    var w = item.offsetWidth;
    var l = item.offsetLeft;
    if (w > 0) {
      hoverBorder.style.width = w + 'px';
      hoverBorder.style.left = l + 'px';
      return true;
    }
    if (attempts < 20) { attempts++; requestAnimationFrame(tryPos); }
    return false;
  }
  return tryPos();
}

// 定位边框到 active tab 并标记 .has-active 使其可见
function repositionActive(tabNav, hoverBorder) {
  var active = tabNav.querySelector('.tab-item.active');
  if (!active) { tabNav.classList.remove('has-active'); return; }
  tabNav.classList.add('has-active');
  positionBorder(active, hoverBorder);
  // 字体加载后宽度可能变化，再定位一次
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() { positionBorder(active, hoverBorder); });
  }
}

// 完整初始化：定位 active + hover 委托 + resize 监听（幂等，可重复调用）
var _tabnavInited = false;

function initTabNavBorder() {
  var tabNav = document.getElementById('tab-nav');
  var hoverBorder = document.getElementById('tab-hover-border');
  if (!tabNav || !hoverBorder) return;

  // 定位 active（核心：让滑动边框显示在正确的 tab 上）
  repositionActive(tabNav, hoverBorder);

  // 事件委托只注册一次
  if (_tabnavInited) return;
  _tabnavInited = true;

  tabNav.addEventListener('mouseover', function(e) {
    var item = e.target.closest('.tab-item');
    if (item && tabNav.contains(item)) positionBorder(item, hoverBorder);
  });
  tabNav.addEventListener('mouseleave', function() {
    var active = tabNav.querySelector('.tab-item.active');
    if (active) positionBorder(active, hoverBorder);
  });
  window.addEventListener('resize', function() {
    var active = document.querySelector('#tab-nav .tab-item.active');
    if (active) {
      var hb = document.getElementById('tab-hover-border');
      if (hb) positionBorder(active, hb);
    }
  }, { passive: true });
}

// ====== 3. 统一触发入口（CSS + 定位一起执行） ======

function fullInit() {
  ensureTabNavStyles();
  initTabNavBorder();
}

// 首屏立即执行
fullInit();

// Swup 事件保障（CSS + 定位双重修复）
function hookSwup() {
  if (!window.swup || !window.swup.hooks) return;
  window.swup.hooks.on('visit:end', fullInit);
  window.swup.hooks.on('page:view', fullInit);
}
hookSwup();
if (!window.swup) {
  var _t = setInterval(function() {
    if (window.swup) { clearInterval(_t); hookSwup(); }
  }, 100);
}

// astro:page-load（首屏 + 每次 Swup 切页都会触发）
document.addEventListener('astro:page-load', fullInit);
