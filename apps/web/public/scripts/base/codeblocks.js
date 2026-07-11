import { registerInit } from './registry.js';
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
registerInit('codeblocks', function () {
  wrapTables();
  initCodeCopyButtons();
  initCodeLineNumbers();
  initCodeLangLabels();
});
