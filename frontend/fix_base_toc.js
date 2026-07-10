const fs = require('fs');
const path = 'D:/codex/mccsjsblog/frontend/src/layouts/BaseLayout.astro';
let c = fs.readFileSync(path, 'utf8');

// 找到 content:replace 钩子的回调函数，在其中加入 TOC 初始化
const oldCallback = `window.swup.hooks.on('content:replace', () => {
      window.scrollTo(0, 0);
      document.getElementById('nav-top-row')?.classList.remove('scrolled');
    })`;

const newCallback = `window.swup.hooks.on('content:replace', () => {
      window.scrollTo(0, 0);
      document.getElementById('nav-top-row')?.classList.remove('scrolled');
      // 初始化目录
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          var tocNav = document.getElementById('toc-list');
          if (!tocNav || tocNav.dataset.tocReady) return;
          tocNav.dataset.tocReady = '1';
          var tocLinks = tocNav.querySelectorAll('.toc-link');
          var articleEl = document.querySelector('.post-article');
          if (!articleEl || !tocLinks.length) return;
          var headings = Array.from(articleEl.querySelectorAll('h1,h2,h3')).filter(el => el.id);
          var lastActiveIndex = -1;
          function findCurrentHeading() {
            var threshold = 100;
            var bestIdx = -1, bestTop = -Infinity;
            for (var i = 0; i < headings.length; i++) {
              var rect = headings[i].getBoundingClientRect();
              if (rect.top <= threshold && rect.top > bestTop) { bestTop = rect.top; bestIdx = i; }
            }
            return bestIdx >= 0 ? bestIdx : 0;
          }
          function updateToc() {
            var idx = findCurrentHeading();
            if (idx === lastActiveIndex) return;
            lastActiveIndex = idx;
            tocNav.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
            var targetId = '#' + headings[idx].id;
            var targetLink = null;
            for (var j = 0; j < tocLinks.length; j++) {
              if (tocLinks[j].getAttribute('href') === targetId) { targetLink = tocLinks[j]; break; }
            }
            if (!targetLink) return;
            targetLink.classList.add('active');
            var parent = targetLink.parentElement;
            while (parent && parent !== tocNav) {
              if (parent.classList.contains('toc-item')) parent.classList.add('active');
              parent = parent.parentElement;
            }
            var tocContainer = tocNav.closest('[id="post-toc"]') && tocNav.closest('[id="post-toc"]').querySelector('[class*="overflow"]');
            if (tocContainer && targetLink.offsetTop > tocContainer.clientHeight * 0.5) {
              tocContainer.scrollTo({ top: targetLink.offsetTop - tocContainer.clientHeight / 3, behavior: 'smooth' });
            }
          }
          window.addEventListener('scroll', () => { requestAnimationFrame(updateToc); }, { passive: true });
          updateToc();
          tocNav.addEventListener('click', function(e) {
            var t = e.target.closest('.toc-link');
            if (!t) return;
            e.preventDefault();
            var href = t.getAttribute('href');
            if (!href) return;
            var dest = document.querySelector(href);
            if (dest) dest.scrollIntoView({ behavior: 'smooth' });
          });
        });
      });
    })`;

if (c.includes(oldCallback)) {
  c = c.replace(oldCallback, newCallback);
  fs.writeFileSync(path, c, 'utf8');
  console.log('✅ BaseLayout swup hook 已更新，集成了 TOC 初始化');
} else {
  console.log('❌ 未找到匹配的回调函数，请手动检查');
}
