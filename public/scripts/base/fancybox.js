// 图库点击时按需加载 Fancybox（首屏不再下载 fancybox.umd.js/css）
(function () {
  var opening = false;
  function loadFancybox(cb) {
    var tasks = 0, done = 0;
    function finish() { if (++done >= tasks) cb(); }
    if (!window.Fancybox) {
      tasks++;
      var s = document.createElement('script');
      s.src = '/fancybox.umd.js';
      s.onload = finish;
      s.onerror = finish;
      document.head.appendChild(s);
    }
    if (!document.querySelector('link[data-fb-css]')) {
      tasks++;
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = '/fancybox.css';
      l.setAttribute('data-fb-css', '1');
      l.onload = finish;
      l.onerror = finish;
      document.head.appendChild(l);
    }
    if (!tasks) cb();
  }
  // 与原版 post.js 一致：bind 声明式绑定后，重新派发点击让 Fancybox 打开
  function openFancybox(trigger) {
    try { Fancybox.destroy(); } catch (err) {}
    Fancybox.bind('[data-fancybox]', { Carousel: { infinite: false } });
    opening = true;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    setTimeout(function () { opening = false; }, 0);
  }
  // 捕获阶段优先处理并阻断传播，避免 Swup 把图片链接当 SPA 导航拦截
  document.addEventListener('click', function (e) {
    if (opening) return;
    var t = e.target;
    while (t && t.nodeType === 1 && !t.closest) t = t.parentNode;
    var trigger = t && t.closest ? t.closest('[data-fancybox]') : null;
    if (!trigger) return;
    var href = trigger.getAttribute('href') || trigger.href || '';
    e.preventDefault();
    e.stopPropagation();
    if (window.Fancybox) {
      openFancybox(trigger);
      return;
    }
    loadFancybox(function () {
      if (!window.Fancybox) {
        if (href) window.location.href = href;
        return;
      }
      openFancybox(trigger);
    });
  }, true);
})();
