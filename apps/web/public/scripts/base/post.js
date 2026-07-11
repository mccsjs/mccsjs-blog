import { registerInit } from './registry.js';
  function initPostCodeBlocks() {
    var langMap = {
      js:'JavaScript',ts:'TypeScript',py:'Python',sh:'Bash',bash:'Bash',md:'Markdown',
      yaml:'YAML',yml:'YAML',json:'JSON',sql:'SQL',html:'HTML',css:'CSS',scss:'SCSS',
      vue:'Vue',jsx:'JSX',tsx:'TSX',go:'Go',rust:'Rust',java:'Java',c:'C','cpp':'C++',
      csharp:'C#',php:'PHP',ruby:'Ruby',swift:'Swift',kotlin:'Kotlin',dart:'Dart',
      xml:'XML',toml:'TOML',ini:'INI',dockerfile:'Docker',plaintext:'Text'
    };

    document.querySelectorAll('.post-content pre').forEach(function(pre) {
      if (pre.dataset.codeProcessed) return;
      pre.dataset.codeProcessed = '1';

      var code = pre.querySelector('code');
      if (!code) return;

      // 1) 语言标签 + 复制按钮 → 工具栏
      var langMatch = code.className.match(/language-(\w+)/);
      var langLabel = langMatch ? langMatch[1] : '';
      var displayLang = langMap[langLabel ? langLabel.toLowerCase() : ''] || (langLabel || '');

      var toolbar = document.createElement('div');
      toolbar.className = 'code-tool-bar';
      if (displayLang) {
        var labelSpan = document.createElement('span');
        labelSpan.className = 'code-lang';
        labelSpan.textContent = displayLang;
        toolbar.appendChild(labelSpan);
      }

      // 复制按钮
      var copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy-btn';
      copyBtn.type = 'button';
      copyBtn.innerHTML = '<svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokecap="round" strokejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg> 复制';
      copyBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var codeContent = code.querySelector('.code-line-content');
        var text = codeContent
          ? (codeContent.innerText || codeContent.textContent || '')
          : (code.innerText || code.textContent || '');
        navigator.clipboard.writeText(text).then(function() {
          copyBtn.innerHTML = '<svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> 已复制';
          copyBtn.classList.add('copied');
          setTimeout(function() {
            copyBtn.innerHTML = '<svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokecap="round" strokejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg> 复制';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });
      toolbar.appendChild(copyBtn);
      pre.insertBefore(toolbar, pre.firstChild);

      // 2) 行号
      var lines = code.innerHTML.split('\n');
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
      if (lines.length > 1) {
        code.classList.add('has-line-numbers');
        var lineNums = document.createElement('span');
        lineNums.className = 'code-line-numbers';
        for (var i = 1; i <= lines.length; i++) {
          var span = document.createElement('span');
          span.textContent = i;
          lineNums.appendChild(span);
        }
        code.insertBefore(lineNums, code.firstChild);

        // 给每行包裹 .code-line（保留高亮标签）
        var codeContent = document.createElement('span');
        codeContent.className = 'code-line-content';
        var nodesToMove = [];
        var foundLineNums = false;
        for (var ci = 0; ci < code.childNodes.length; ci++) {
          var child = code.childNodes[ci];
          if (child === lineNums) { foundLineNums = true; continue; }
          if (foundLineNums) nodesToMove.push(child);
        }
        nodesToMove.forEach(function(n) { codeContent.appendChild(n); });
        code.appendChild(codeContent);
      }

      // 3) 展开/收起（超过10行默认收起）
      if (lines.length > 10 && !pre.querySelector('.code-fold-overlay')) {
        pre.classList.add('code-collapsed');
        var overlay = document.createElement('div');
        overlay.className = 'code-fold-overlay';
        var expandBtn = document.createElement('button');
        expandBtn.className = 'code-expand-btn';
        expandBtn.innerHTML = '<svg style="width:12px;height:12px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" strokecap="round" strokejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>展开';
        expandBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var isExpanded = pre.classList.toggle('code-collapsed');
          expandBtn.innerHTML = isExpanded
            ? '<svg style="width:12px;height:12px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" strokecap="round" strokejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>展开'
            : '<svg style="width:12px;height:12px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" strokecap="round" strokejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>收起';
        });
        overlay.appendChild(expandBtn);
        pre.appendChild(overlay);
      }
    });

    // 复制按钮事件委托（防止重复绑定）
    document.querySelectorAll('.post-content pre .code-copy-btn').forEach(function(btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function() {
        var pre = btn.closest('pre');
        var codeEl = pre ? pre.querySelector('code') : null;
        if (!codeEl) return;
        var cContent = codeEl.querySelector('.code-line-content');
        var text = cContent
          ? (cContent.innerText || cContent.textContent || '')
          : (codeEl.innerText || codeEl.textContent || '');
        navigator.clipboard.writeText(text).then(function() {
          btn.innerHTML = '<svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> 已复制';
          btn.classList.add('copied');
          setTimeout(function() {
            btn.innerHTML = '<svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokecap="round" strokejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg> 复制';
            btn.classList.remove('copied');
          }, 2000);
        });
      });
    });
  }

  // Fancybox 图片灯箱（先销毁旧实例，防止 swup 切换后重复绑定）
  function initFancybox() {
    if (typeof Fancybox === 'undefined') return;
    try { Fancybox.destroy(); } catch(e) {}
    requestAnimationFrame(function() {
      try {
        Fancybox.bind('[data-fancybox="gallery"]', {
          Carousel: { infinite: false }
        });
      } catch(e) {}
    });
  }

  // 阅读进度条
  function initReadingProgress() {
    var progress = document.querySelector('.reading-progress');
    var article = document.querySelector('.post-article');
    if (!progress || !article) return;

    function updateProgress() {
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var scrolled = -rect.top;
      var percent = Math.max(0, Math.min(100, (scrolled / total) * 100));
      progress.style.width = percent + '%';
    }

    // 移除旧监听器，防止重复绑定
    if (window._progressScrollHandler) {
      window.removeEventListener('scroll', window._progressScrollHandler);
    }
    window._progressScrollHandler = updateProgress;
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // 文章目录（TOC）：滚动高亮 + 点击跳转 + 固定定位
  function initPostToc() {
    var tocNav = document.getElementById('toc-list');
    if (!tocNav) return;

    var tocLinks = tocNav.querySelectorAll('.toc-link');
    var article = document.querySelector('.post-article');
    if (!article || !tocLinks.length) return;

    var headings = Array.from(article.querySelectorAll('h1,h2,h3')).filter(function(el) { return el.id; });
    if (!headings.length) return;
    var lastActiveIndex = -1;

    function findCurrentHeading() {
      var threshold = 100;
      var bestIdx = -1;
      var bestTop = -Infinity;
      for (var i = 0; i < headings.length; i++) {
        var rect = headings[i].getBoundingClientRect();
        if (rect.top <= threshold && rect.top > bestTop) {
          bestTop = rect.top;
          bestIdx = i;
        }
      }
      return bestIdx >= 0 ? bestIdx : 0;
    }

    function updateToc() {
      var idx = findCurrentHeading();
      if (idx === lastActiveIndex) return;
      lastActiveIndex = idx;

      // 移除所有 active
      tocNav.querySelectorAll('.active').forEach(function(el) { el.classList.remove('active'); });

      // 找到对应的 toc-link
      var targetId = '#' + headings[idx].id;
      var targetLink = null;
      for (var i = 0; i < tocLinks.length; i++) {
        if (tocLinks[i].getAttribute('href') === targetId) {
          targetLink = tocLinks[i];
          break;
        }
      }
      if (!targetLink) return;

      // 高亮当前链接
      targetLink.classList.add('active');

      // 向上遍历 DOM 树，给所有祖先 li 加 active
      var parent = targetLink.parentElement;
      while (parent && parent !== tocNav) {
        if (parent.classList.contains('toc-item')) {
          parent.classList.add('active');
        }
        parent = parent.parentElement;
      }

      // 滚动目录让当前项居中
      var tocAside = tocNav.closest('[id="post-toc"]');
      var tocContainer = tocAside ? tocAside.querySelector('[class*="overflow"]') : null;
      if (tocContainer && targetLink.offsetTop > tocContainer.clientHeight * 0.5) {
        tocContainer.scrollTo({
          top: targetLink.offsetTop - tocContainer.clientHeight / 3,
          behavior: 'smooth'
        });
      }
    }

    // 节流滚动监听（先清除旧的）
    if (window._tocScrollHandler) {
      window.removeEventListener('scroll', window._tocScrollHandler);
    }
    window._tocScrollHandler = function() {
      if (window._tocScrollTimer) cancelAnimationFrame(window._tocScrollTimer);
      window._tocScrollTimer = requestAnimationFrame(updateToc);
    };
    window.addEventListener('scroll', window._tocScrollHandler, { passive: true });

    // 初始化
    updateToc();

    // 点击目录链接时平滑滚动（先移除旧监听）
    if (window._tocClickHandler) {
      tocNav.removeEventListener('click', window._tocClickHandler);
    }
    window._tocClickHandler = function(e) {
      var target = e.target.closest('.toc-link');
      if (!target) return;
      e.preventDefault();
      var href = target.getAttribute('href');
      if (!href) return;
      var dest = document.getElementById(href.slice(1));
      if (dest) {
        dest.scrollIntoView({ behavior: 'smooth' });
      }
    };
    tocNav.addEventListener('click', window._tocClickHandler);

    // 目录固定定位：CSS sticky 在 grid 布局中不可靠，用 JS 控制
    var tocInner = document.getElementById('post-toc-inner');
    if (tocInner && !tocInner.dataset.tocFixedInit) {
      tocInner.dataset.tocFixedInit = '1';

      // 占位元素
      var placeholder = document.createElement('div');
      placeholder.style.display = 'none';
      tocInner.parentElement.appendChild(placeholder);

      var FIXED_TOP = 100;
      var isFixed = false;

      function updateFixed() {
        var scrollY = window.scrollY || document.documentElement.scrollTop;
        var triggerY = tocInner.parentElement.getBoundingClientRect().top + scrollY - FIXED_TOP;

        if (scrollY >= triggerY && !isFixed) {
          isFixed = true;
          var w = tocInner.offsetWidth;
          tocInner.style.position = 'fixed';
          tocInner.style.top = FIXED_TOP + 'px';
          tocInner.style.width = w + 'px';
          placeholder.style.width = w + 'px';
          placeholder.style.height = tocInner.offsetHeight + 'px';
          placeholder.style.display = 'block';
        } else if (scrollY < triggerY && isFixed) {
          isFixed = false;
          tocInner.style.position = '';
          tocInner.style.top = '';
          tocInner.style.width = '';
          placeholder.style.display = 'none';
        }
      }

      var ticking = false;
      function onScrollFixed() {
        if (!ticking) {
          requestAnimationFrame(function() {
            updateFixed();
            ticking = false;
          });
          ticking = true;
        }
      }

      window.addEventListener('scroll', onScrollFixed, { passive: true });
      window.addEventListener('resize', onScrollFixed, { passive: true });
      updateFixed();
    }
  }
registerInit('post', function () {
  initPostCodeBlocks();
  initFancybox();
  initReadingProgress();
  initPostToc();
});
