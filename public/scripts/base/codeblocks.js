import { registerInit } from './registry.js';

// 文章表格横向滚动包裹
function wrapTables() {
  document.querySelectorAll('.post-content table, .prose table').forEach(function (table) {
    if (table.parentElement && table.parentElement.classList.contains('post-table-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'post-table-wrap';
    if (table.parentElement) {
      table.parentElement.insertBefore(wrap, table);
    }
    wrap.appendChild(table);
  });
}

// 代码块复制按钮
function initCodeCopyButtons() {
  document.querySelectorAll('#link-markdown-section pre').forEach(function (pre) {
    var bar = pre.querySelector('.code-tool-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'code-tool-bar';
      pre.insertBefore(bar, pre.firstChild);
    }
    if (bar.querySelector('.code-copy-btn')) return;
    var code = pre.querySelector('code');
    if (!code) return;

    var btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.type = 'button';
    btn.innerHTML = '<iconify-icon icon="ci:copy" width="14" height="14"></iconify-icon><span>复制</span>';

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var text = code.textContent || '';
      navigator.clipboard.writeText(text).then(
        function () {
          showCopied(btn);
        },
        function () {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand('copy');
          } catch (_) {}
          document.body.removeChild(ta);
          showCopied(btn);
        }
      );
    });

    bar.appendChild(btn);
  });
}

function showCopied(btn) {
  btn.classList.add('copied');
  btn.innerHTML = '<iconify-icon icon="ci:check" width="14" height="14" style="color:#22c55e"></iconify-icon><span style="color:#22c55e">已复制</span>';
  setTimeout(function () {
    btn.classList.remove('copied');
    btn.innerHTML = '<iconify-icon icon="ci:copy" width="14" height="14"></iconify-icon><span>复制</span>';
  }, 2000);
}

// 代码块语言标签
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
  document.querySelectorAll('#link-markdown-section pre').forEach(function (pre) {
    if (pre.querySelector('.code-lang')) return;
    var code = pre.querySelector('code');
    if (!code) return;

    // 优先从 code 的 language-xxx 读，其次从 pre 的 data-language（Shiki 输出）
    var lang = '';
    (code.className || '').split(/\s+/).forEach(function (cls) {
      var m = cls.match(/^language-(.+)$/);
      if (m) lang = m[1].toLowerCase();
    });
    if (!lang) {
      var dl = pre.getAttribute('data-language');
      if (dl) lang = dl.toLowerCase();
    }
    if (!lang) return;

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
}

registerInit('codeblocks', function () {
  wrapTables();
  initCodeCopyButtons();
  initCodeLangLabels();
});
