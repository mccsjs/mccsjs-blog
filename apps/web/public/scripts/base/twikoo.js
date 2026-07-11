import { registerInit } from './registry.js';
  // Twikoo 评论区初始化（按需加载 twikoo 库）
  function loadTwikooScript(callback) {
    if (typeof twikoo !== 'undefined') { callback(); return; }
    if (window.__twikooLoading) { setTimeout(function() { loadTwikooScript(callback); }, 200); return; }
    window.__twikooLoading = true;
    var script = document.createElement('script');
    script.src = 'https://s4.zstatic.net/npm/twikoo@1.7.13/dist/twikoo.min.js';
    script.onload = function() { callback(); };
    script.onerror = function() {
      window.__twikooLoading = false;
      // 加载失败也标记，避免无限重试
      var el = document.getElementById('tcomment');
      if (el) el.dataset.twikooFailed = '1';
    };
    document.head.appendChild(script);
  }

  function initTwikooComments() {
    var el = document.getElementById('tcomment');
    if (!el) return; // 当前页面没有评论区
    var envId = el.getAttribute('data-twikoo-env-id') || 'https://twikoo.seln.cn';

    // 清理旧实例和容器
    if (typeof twikoo !== 'undefined') {
      try { twikoo.destroy(); } catch (e) {}
    }
    el.innerHTML = '';
    delete el.dataset.twikooFailed;

    // 如果 Twikoo 已经加载过，强制重新加载脚本，避免 Swup 切换 head 后 Twikoo 注入的 CSS 丢失
    if (typeof twikoo !== 'undefined') {
      delete window.twikoo;
      var oldScript = document.querySelector('script[src*="twikoo@"]');
      if (oldScript) oldScript.parentNode.removeChild(oldScript);
      window.__twikooLoading = false;
    }

    // 加载脚本并初始化
    loadTwikooScript(function() {
      twikoo.init({
        envId: envId,
        el: '#tcomment',
        path: location.pathname,
        lang: 'zh-CN',
      });
    });
  }
registerInit('twikoo', initTwikooComments);
