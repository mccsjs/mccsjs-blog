(function() {
  var progressTimeout1 = null;
  var progressTimeout2 = null;
  var transitionTimeout = null;

  function clearAllTransitionTimeouts() {
    if (progressTimeout1) { clearTimeout(progressTimeout1); progressTimeout1 = null; }
    if (progressTimeout2) { clearTimeout(progressTimeout2); progressTimeout2 = null; }
    if (transitionTimeout) { clearTimeout(transitionTimeout); transitionTimeout = null; }
  }

  // 文章表格横向滚动包裹
  function wrapTables() {
    document.querySelectorAll('.post-content table').forEach(function(table) {
      if (table.parentElement && table.parentElement.classList.contains('post-table-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'post-table-wrap';
      if (table.parentElement) {
        table.parentElement.insertBefore(wrap, table);
      }
      wrap.appendChild(table);
    });
  }

  // 代码块复制按钮（放在 .code-tool-bar 里）
  // 只处理友链页；文章页由 [slug].astro 自行处理
  function initCodeCopyButtons() {
    var containers = ['#link-markdown-section pre'];
    containers.forEach(function(selector) {
      document.querySelectorAll(selector).forEach(function(pre) {
        // 找或创建 tool-bar
        var bar = pre.querySelector('.code-tool-bar');
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'code-tool-bar';
          // 插入到 pre 的最前面
          pre.insertBefore(bar, pre.firstChild);
        }
        if (bar.querySelector('.code-copy-btn')) return;
        if (!pre.querySelector('code')) return;

        var btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.type = 'button';
        btn.innerHTML = '<iconify-icon icon="ci:copy" width="14" height="14"></iconify-icon><span>复制</span>';

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var code = pre.querySelector('code');
          var text = (code && code.querySelector('.code-line-content'))
            ? (code.querySelector('.code-line-content').textContent || '')
            : (code ? (code.textContent || '') : '');
          navigator.clipboard.writeText(text).then(function() {
            btn.classList.add('copied');
            btn.innerHTML = '<iconify-icon icon="ci:check" width="14" height="14" style="color:#22c55e"></iconify-icon><span style="color:#22c55e">已复制</span>';
            setTimeout(function() {
              btn.classList.remove('copied');
              btn.innerHTML = '<iconify-icon icon="ci:copy" width="14" height="14"></iconify-icon><span>复制</span>';
            }, 2000);
          }).catch(function() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch(_) {}
            document.body.removeChild(ta);
            btn.classList.add('copied');
            btn.innerHTML = '<iconify-icon icon="ci:check" width="14" height="14" style="color:#22c55e"></iconify-icon><span style="color:#22c55e">已复制</span>';
            setTimeout(function() {
              btn.classList.remove('copied');
              btn.innerHTML = '<iconify-icon icon="ci:copy" width="14" height="14"></iconify-icon><span>复制</span>';
            }, 2000);
          });
        });

        bar.appendChild(btn);
      });
    });
  }

  // 代码块行号（保留 highlight.js 高亮标签，不破坏语法着色）
  function initCodeLineNumbers() {
    var containers = ['#link-markdown-section pre'];
    containers.forEach(function(selector) {
      document.querySelectorAll(selector).forEach(function(pre) {
        var code = pre.querySelector('code');
        if (!code || code.classList.contains('has-line-numbers')) return;

        // 用 innerHTML 保留 highlight.js 的 <span class="hljs-xxx"> 标签
        var rawHtml = code.innerHTML;
        if (!rawHtml.includes('\n') || rawHtml.split('\n').length < 2) return;

        // 按换行符拆分，保留每行的 HTML 标签
        var lines = rawHtml.replace(/\r\n/g, '\n').trimEnd().split('\n');
        // 移除末尾空行
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
        if (lines.length < 2) return;

        code.classList.add('has-line-numbers');

        // 行号列
        var lineNumDiv = document.createElement('div');
        lineNumDiv.className = 'code-line-numbers';
        for (var i = 1; i <= lines.length; i++) {
          var numSpan = document.createElement('span');
          numSpan.textContent = i;
          lineNumDiv.appendChild(numSpan);
        }
        code.insertBefore(lineNumDiv, code.firstChild);

        // 给每行包裹 .code-line，保留原始 HTML
        var codeContent = document.createElement('span');
        codeContent.className = 'code-line-content';
        for (var j = 0; j < lines.length; j++) {
          var lineSpan = document.createElement('span');
          lineSpan.className = 'code-line';
          lineSpan.innerHTML = lines[j] || '&nbsp;';
          codeContent.appendChild(lineSpan);
        }

        // 移除行号之外的内容，替换为包裹后的内容
        while (code.lastChild !== lineNumDiv) { code.removeChild(code.lastChild); }
        code.appendChild(codeContent);

        // 存储纯文本用于复制功能
        code.setAttribute('data-raw', lines.join('\n'));
      });
    });
  }

  // 代码块语言标签（放在 .code-tool-bar 里）
  function initCodeLangLabels() {
    var langMap = {
      js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
      html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less',
      json: 'JSON', yml: 'YAML', yaml: 'YAML', toml: 'TOML', xml: 'XML',
      sql: 'SQL', bash: 'Bash', shell: 'Shell', sh: 'Shell', zsh: 'Zsh',
      py: 'Python', python: 'Python', rb: 'Ruby', java: 'Java', kt: 'Kotlin',
      go: 'Go', rs: 'Rust', c: 'C', cpp: 'C++', cs: 'C#',
      php: 'PHP', swift: 'Swift', dart: 'Dart',
      lua: 'Lua', r: 'R', m: 'MATLAB',
      md: 'Markdown', mdx: 'MDX', tex: 'LaTeX',
      dockerfile: 'Dockerfile', docker: 'Docker', nginx: 'Nginx',
      git: 'Git', diff: 'Diff', patch: 'Patch',
      txt: 'Text', text: 'Text',
    };
    // 只处理友链页；文章页由 [slug].astro 自行处理
    var selectors = ['#link-markdown-section pre'];
    selectors.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(pre) {
        if (pre.querySelector('.code-lang')) return;
        var code = pre.querySelector('code');
        if (!code) return;

        // 从 class 里找 language-xxx
        var lang = '';
        (code.className || '').split(/\s+/).forEach(function(cls) {
          var m = cls.match(/^language-(.+)$/);
          if (m) lang = m[1].toLowerCase();
        });
        if (!lang) return;

        // 找或创建 tool-bar
        var bar = pre.querySelector('.code-tool-bar');
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'code-tool-bar';
          pre.insertBefore(bar, pre.firstChild);
        }

        var label = document.createElement('span');
        label.className = 'code-lang';
        label.textContent = langMap[lang] || lang.toUpperCase();
        bar.insertBefore(label, bar.firstChild);
      });
    });
  }

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
    // 如果已经初始化过（有子元素），跳过
    if (el.children.length > 0 && !el.dataset.twikooFailed) return;
    if (typeof twikoo === 'undefined') {
      // 按需加载 twikoo 库，加载完成后自动重试
      loadTwikooScript(function() {
        initTwikooComments();
      });
      return;
    }
    try { twikoo.destroy(); } catch (e) {}
    twikoo.init({
      envId: envId,
      el: '#tcomment',
      path: location.pathname,
      lang: 'zh-CN',
    });
  }

  // 文章页代码块工具栏（语言标签 + 复制按钮 + 行号 + 展开收起）
  // 处理 .post-content pre，在 Swup 切页后也能正常初始化
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

  function setup() {
    if (!window.swup || !window.swup.hooks) return;

    window.swup.hooks.on('link:click', function() {
      document.documentElement.classList.add('is-page-transitioning');
    });

    window.swup.hooks.on('visit:start', function() {
      clearAllTransitionTimeouts();
      document.documentElement.classList.add('is-page-transitioning');
      var progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.classList.remove('finishing', 'done');
        void progressBar.offsetWidth;
        progressBar.classList.add('loading');
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
      var topRow = document.getElementById('nav-top-row');
      if (topRow) topRow.classList.remove('scrolled');
    });

    window.swup.hooks.on('visit:end', function() {
      var progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.classList.remove('loading');
        progressBar.classList.add('finishing');
        progressTimeout1 = setTimeout(function() {
          progressBar.classList.remove('finishing');
          progressBar.classList.add('done');
          progressTimeout2 = setTimeout(function() { progressBar.classList.remove('done'); }, 300);
        }, 200);
      }
      transitionTimeout = setTimeout(function() {
        document.documentElement.classList.remove('is-page-transitioning');
      }, 400);
    });

    window.swup.hooks.on('page:view', function() {
      wrapTables();
      initCodeCopyButtons();
      initCodeLineNumbers();
      initCodeLangLabels();
      initPostCodeBlocks(); // 文章页代码块工具栏/行号/展开收起
      initTwikooComments(); // 评论区
      initFancybox();
      initReadingProgress();
      initPostToc();
      document.dispatchEvent(new CustomEvent('swup:page-view'));
    });
  }

  function resetScrollAndNav() {
    window.scrollTo(0, 0);
    var nav = document.getElementById('nav-top-row');
    if (nav) nav.classList.remove('scrolled');
  }

  // 首次执行
  wrapTables();
  initCodeCopyButtons();
  initCodeLineNumbers();
  initCodeLangLabels();
  initPostCodeBlocks(); // 文章页代码块
  initTwikooComments(); // 评论区
  initFancybox();
  initReadingProgress();
  initPostToc();

  if (window.swup && window.swup.hooks) {
    setup();
  } else {
    document.addEventListener('swup:enable', setup);
  }

  document.addEventListener('astro:page-load', function() {
    resetScrollAndNav();
    wrapTables();
    initCodeCopyButtons();
    initCodeLineNumbers();
    initCodeLangLabels();
    initPostCodeBlocks(); // 文章页代码块
    initTwikooComments(); // 评论区
    initFancybox();
    initReadingProgress();
    initPostToc();
  });
})();
