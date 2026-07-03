const fs = require('fs');
const path = 'D:/codex/mccsjsblog/frontend/src/layouts/BaseLayout.astro';
let c = fs.readFileSync(path, 'utf8');

// 找到 content:replace 钩子的回调函数，在其中加入 TOC 初始化
const oldHook = `    window.swup.hooks.on('content:replace', () => {
      window.scrollTo(0, 0);
      document.getElementById('nav-top-row')?.classList.remove('scrolled');
    });`;

const newHook = `    window.swup.hooks.on('content:replace', () => {
      window.scrollTo(0, 0);
      document.getElementById('nav-top-row')?.classList.remove('scrolled');
      // 初始化目录
      var attempt = 0;
      function tryToc() {
        attempt++;
        var tocNav = document.getElementById('toc-list');
        if (tocNav) {
          if (tocNav.dataset.tocReady) return;
          tocNav.dataset.tocReady = '1';
          var tocLinks = tocNav.querySelectorAll('.toc-link');
          var articleEl = document.querySelector('.post-article');
          if (!articleEl || !tocLinks.length) return;
          var headings = Array.from(articleEl.querySelectorAll('h1,h2,h3')).filter(el => el.id);
          var lastIdx = -1;
          function findH() {
            var t = 100, b = -1, bt = -Infinity;
            for (var i = 0; i < headings.length; i++) {
              var r = headings[i].getBoundingClientRect();
              if (r.top <= t && r.top > bt) { bt = r.top; b = i; }
            }
            return b >= 0 ? b : 0;
          }
          function upd() {
            var idx = findH();
            if (idx === lastIdx) return;
            lastIdx = idx;
            tocNav.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
            var tid = '#' + headings[idx].id;
            var tl = null;
            for (var j = 0; j < tocLinks.length; j++) { if (tocLinks[j].getAttribute('href') === tid) { tl = tocLinks[j]; break; } }
            if (!tl) return;
            tl.classList.add('active');
            var p = tl.parentElement;
            while (p && p !== tocNav) { if (p.classList.contains('toc-item')) p.classList.add('active'); p = p.parentElement; }
            var tc = tocNav.closest('[id="post-toc"]') && tocNav.closest('[id="post-toc"]').querySelector('[class*="overflow"]');
            if (tc && tl.offsetTop > tc.clientHeight * 0.5) tc.scrollTo({ top: tl.offsetTop - tc.clientHeight / 3, behavior: 'smooth' });
          }
          window.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
          upd();
          tocNav.addEventListener('click', function(e) {
            var t = e.target.closest('.toc-link');
            if (!t) return;
            e.preventDefault();
            var href = t.getAttribute('href');
            if (!href) return;
            var dest = document.querySelector(href);
            if (dest) dest.scrollIntoView({ behavior: 'smooth' });
          });
        } else if (attempt < 30) {
          requestAnimationFrame(tryToc);
        }
      }
      requestAnimationFrame(tryToc);
    });`;

if (c.includes(oldHook)) {
  c = c.replace(oldHook, newHook);
  fs.writeFileSync(path, c, 'utf8');
  console.log('✅ swup 钩子已更新，集成了 TOC 初始化');
} else {
  console.log('❌ 未找到匹配的钩子，请手动检查');
}
