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

  // ===== TabNav 选框定位 =====
  var _tabNavTimers = [];
  function initTabNav() {
    _tabNavTimers.forEach(function(t) { clearTimeout(t); });
    _tabNavTimers = [];
    var nav = document.getElementById('tab-nav');
    var border = document.getElementById('tab-hover-border');
    if (!nav || !border) return;

    border.style.width = '0px';
    border.style.left = '0px';

    var items = nav.querySelectorAll('.tab-item');
    items.forEach(function(item) {
      if (item._tme) { item.removeEventListener('mouseenter', item._tme); }
    });

    function pos(item) {
      (function tryPos(count) {
        count = count || 0;
        requestAnimationFrame(function() {
          var w = item.offsetWidth;
          var l = item.offsetLeft;
          if (w > 0) {
            border.style.width = w + 'px';
            border.style.left = l + 'px';
          } else if (count < 15) {
            _tabNavTimers.push(setTimeout(function() {
              tryPos(count + 1);
            }, 30 + count * 10));
          }
        });
      })();
    }

    var active = nav.querySelector('.tab-item.active');
    if (active) {
      nav.classList.add('has-active');
      pos(active);
    } else {
      nav.classList.remove('has-active');
    }

    items.forEach(function(item) {
      item._tme = function() { pos(item); };
      item.addEventListener('mouseenter', item._tme);
    });

    nav.addEventListener('mouseleave', function() {
      var a = document.querySelector('#tab-nav .tab-item.active');
      var b = document.getElementById('tab-hover-border');
      if (a && b) pos(a);
    });
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
      initTwikooComments(); // 评论区
      initTabNav();        // TabNav 选框
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
  initTwikooComments(); // 评论区
  initTabNav();        // TabNav 选框

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
    initTwikooComments(); // 评论区
    initTabNav();        // TabNav 选框
  });
})();
