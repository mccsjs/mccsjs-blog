// 站点脚本统一入口（原 base-layout.js 拆分后的编排器）
// 各功能模块在加载时通过 registry.registerInit 注册自己的初始化函数，
// 本文件负责：导入所有模块（副作用注册）+ 页面切换过渡逻辑 + 在
// 首屏与每次 Swup 切页（astro:page-load）时统一调用 runInits()。
import { runInits } from './registry.js';
import './tabnav.js';        // TabNav 样式注入（自管理，不走 registry）
import './codeblocks.js';    // 友链页代码块
import './twikoo.js';        // Twikoo 评论区
import './self-comments.js'; // 评论区
import './post.js';          // 文章页：代码块工具栏 / 灯箱 / 阅读进度 / TOC

// ===== 页面切换过渡（进度条 + is-page-transitioning） =====
let progressTimeout1 = null;
let progressTimeout2 = null;
let transitionTimeout = null;

function clearAllTransitionTimeouts() {
  if (progressTimeout1) { clearTimeout(progressTimeout1); progressTimeout1 = null; }
  if (progressTimeout2) { clearTimeout(progressTimeout2); progressTimeout2 = null; }
  if (transitionTimeout) { clearTimeout(transitionTimeout); transitionTimeout = null; }
}

function setup() {
  if (!window.swup || !window.swup.hooks) return;

  window.swup.hooks.on('link:click', function () {
    document.documentElement.classList.add('is-page-transitioning');
  });

  window.swup.hooks.on('visit:start', function () {
    clearAllTransitionTimeouts();
    document.documentElement.classList.add('is-page-transitioning');
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.classList.remove('finishing', 'done');
      void progressBar.offsetWidth;
      progressBar.classList.add('loading');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    const topRow = document.getElementById('nav-top-row');
    if (topRow) topRow.classList.remove('scrolled');
  });

  window.swup.hooks.on('visit:end', function () {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.classList.remove('loading');
      progressBar.classList.add('finishing');
      progressTimeout1 = setTimeout(function () {
        progressBar.classList.remove('finishing');
        progressBar.classList.add('done');
        progressTimeout2 = setTimeout(function () { progressBar.classList.remove('done'); }, 300);
      }, 200);
    }
    transitionTimeout = setTimeout(function () {
      document.documentElement.classList.remove('is-page-transitioning');
    }, 400);
  });

  window.swup.hooks.on('page:view', function () {
    runInits();
    document.dispatchEvent(new CustomEvent('swup:page-view'));
  });
}

function resetScrollAndNav() {
  window.scrollTo(0, 0);
  const nav = document.getElementById('nav-top-row');
  if (nav) nav.classList.remove('scrolled');
}

// 首次执行（模块此时已加载完成，各功能 init 均已注册）
runInits();

if (window.swup && window.swup.hooks) {
  setup();
} else {
  document.addEventListener('swup:enable', setup);
}

document.addEventListener('astro:page-load', function () {
  resetScrollAndNav();
  runInits();
});
