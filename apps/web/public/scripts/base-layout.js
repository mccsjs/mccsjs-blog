(function() {
  var progressTimeout1 = null;
  var progressTimeout2 = null;
  var transitionTimeout = null;

  function clearAllTransitionTimeouts() {
    if (progressTimeout1) { clearTimeout(progressTimeout1); progressTimeout1 = null; }
    if (progressTimeout2) { clearTimeout(progressTimeout2); progressTimeout2 = null; }
    if (transitionTimeout) { clearTimeout(transitionTimeout); transitionTimeout = null; }
  }

  // 评论头像（weavatar）加载失败时移除 <img>，露出底层字母头像。
  // 用捕获阶段监听 error（img 的 error 不冒泡），比内联 onerror 更 CSP 友好。
  if (!window.__scAvatarErrBound) {
    document.addEventListener('error', function (e) {
      var t = e.target;
      if (t && t.tagName === 'IMG' && t.classList && t.classList.contains('sc-avatar-img')) {
        t.remove();
      }
    }, true);
    window.__scAvatarErrBound = true;
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

  // ================= 本站自研评论区 =================
  function scEscapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function scAvatarColor(name) {
    var palette = ['#c98a5e', '#b3894f', '#a86b52', '#8a9a5b', '#7c9aa6', '#a97b8e', '#c0894a', '#6f8f7a'];
    var h = 0;
    var s = String(name || '?');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  // 由邮箱生成 weavatar 头像地址。
  // weavatar 的 HASH 必须是「邮箱的 SHA256（或 MD5）哈希」，不是原始邮箱——
  // 直接在 URL 放原始邮箱会被当作未知哈希，返回 404（也就不会去查 QQ 头像）。
  // 浏览器端用 crypto.subtle.digest 计算 SHA256（localhost / https 均为安全上下文）。
  // 再附 d=404：用户没头像时返回 404 → 由全局 error 监听移除 <img> 露出底层字母头像。
  function scSha256Hex(str) {
    if (!crypto || !crypto.subtle || !crypto.subtle.digest) return Promise.resolve(null);
    try {
      var data = new TextEncoder().encode(str);
      return crypto.subtle.digest('SHA-256', data).then(function (buf) {
        var bytes = new Uint8Array(buf);
        var hex = '';
        for (var i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
        return hex;
      }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }

  var scAvatarHashCache = {};
  function scAvatarHash(email) {
    var e = String(email || '').trim().toLowerCase();
    if (!e) return Promise.resolve(null);
    if (scAvatarHashCache[e]) return scAvatarHashCache[e];
    var p = scSha256Hex(e).then(function (h) {
      return h ? ('https://weavatar.com/avatar/' + h + '?s=80&d=404') : null;
    });
    scAvatarHashCache[e] = p;
    return p;
  }

  // 渲染后把 <img.sc-avatar-img[data-email]> 异步填上 weavatar 地址（SHA256）。
  // 失败时（非安全上下文拿不到 crypto.subtle）保留底层字母头像。
  function scApplyAvatars(scope) {
    if (!scope) return;
    var imgs = scope.querySelectorAll('img.sc-avatar-img[data-email]');
    if (!imgs.length) return;
    var seen = {};
    var emails = [];
    for (var i = 0; i < imgs.length; i++) {
      var em = imgs[i].getAttribute('data-email');
      if (em && !seen[em]) { seen[em] = true; emails.push(em); }
    }
    emails.forEach(function (em) {
      scAvatarHash(em).then(function (url) {
        if (!url) return;
        for (var j = 0; j < imgs.length; j++) {
          if (imgs[j].getAttribute('data-email') === em && !imgs[j].getAttribute('src')) {
            imgs[j].setAttribute('src', url);
          }
        }
      });
    });
  }

  function scFormatTime(sec) {
    if (!sec) return '';
    var d = new Date(sec * 1000);
    if (isNaN(d.getTime())) return '';
    var now = Date.now();
    var diff = Math.floor((now - d.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }

  // ===== 点赞本地去重（与后端计数分离，防止重复点赞） =====
  function scGetLiked() {
    try { return new Set(JSON.parse(localStorage.getItem('sc-liked') || '[]')); } catch (e) { return new Set(); }
  }
  function scIsLiked(id) { return scGetLiked().has(String(id)); }
  function scSetLiked(id, v) {
    var s = scGetLiked();
    if (v) s.add(String(id)); else s.delete(String(id));
    try { localStorage.setItem('sc-liked', JSON.stringify(Array.from(s))); } catch (e) {}
  }

  // 设备信息图标（按文本匹配 iconify 图标）
  function scDeviceIcon(kind, text) {
    var t = (text || '').toLowerCase()
    if (kind === 'region') return 'jam:gps'
    if (kind === 'os') {
      if (t.indexOf('windows') >= 0) return 'mdi:microsoft-windows'
      if (t.indexOf('mac') >= 0 || t.indexOf('ios') >= 0) return 'mdi:apple'
      if (t.indexOf('android') >= 0) return 'mdi:android'
      if (t.indexOf('linux') >= 0) return 'mdi:linux'
      return 'mdi:devices'
    }
    if (kind === 'browser') {
      if (t.indexOf('edge') >= 0) return 'logos:microsoft-edge'
      if (t.indexOf('chrome') >= 0) return 'mdi:google-chrome'
      if (t.indexOf('firefox') >= 0) return 'mdi:firefox'
      if (t.indexOf('safari') >= 0) return 'mdi:apple-safari'
      if (t.indexOf('opera') >= 0) return 'mdi:opera'
      return 'mdi:web'
    }
    return 'mdi:help-circle'
  }

  // 设备信息采集：UA 与 IP 地区（前端上报，后端 bowser 解析 UA）
  var scCachedUa = ''      // 修正版本号后的 UA（页面加载时异步填充）
  var scRegionCache = ''   // IP 归属（省/国家，页面加载时异步填充）

  function scPrefetchUa() {
    try {
      var nav = navigator
      var ua = nav.userAgent
      if (nav.userAgentData && typeof nav.userAgentData.getHighEntropyValues === 'function') {
        nav.userAgentData.getHighEntropyValues(['platform', 'platformVersion'])
          .then(function (hv) {
            var platform = nav.userAgentData.platform
            var pv = (hv && hv.platformVersion) || ''
            var major = parseInt(pv.split('.')[0], 10)
            if (platform === 'Windows' && major >= 13) {
              ua = ua.replace(/Windows NT 10\.0/i, 'Windows NT 11.0')
            } else if (platform === 'macOS' && major >= 11) {
              ua = ua.replace(/Mac OS X 10_[0-9]+_[0-9]+/i, 'Mac OS X ' + pv.replace(/\./g, '_'))
            }
            scCachedUa = ua
          })
          .catch(function () { scCachedUa = nav.userAgent })
      } else {
        scCachedUa = ua
      }
    } catch (e) {
      scCachedUa = navigator.userAgent
    }
  }

  function scGetUserAgent() {
    return scCachedUa || navigator.userAgent
  }

  // 前端异步获取 IP 归属（xxapi 国内 API 优先，失败降级国际，失败留空）
  function scPrefetchRegion() {
    scRegionCache = ''
    // xxapi 国内 API：返回 address 字段精确到市级，如 "中国江苏省南京市"
    // fetch 必须显式设置 User-Agent 才会被服务端读取
    fetch('https://v2.xxapi.cn/api/ua', {
      cache: 'no-store',
      headers: { 'User-Agent': scGetUserAgent() }
    })
      .then(function (r) { return r && r.ok ? r.json() : null })
      .then(function (d) {
        if (d && d.code === 200 && d.data && d.data.address) {
          scRegionCache = String(d.data.address).replace(/^中国/, '').replace(/(省|市|自治区|特别行政区)$/, '')
          return
        }
        // 兜底：vore.top
        return fetch('https://api.vore.top/api/IPdata', { cache: 'no-store' })
          .then(function (r2) { return r2 && r2.ok ? r2.json() : null })
          .then(function (d2) {
            if (d2 && d2.ipdata) {
              var r3 = d2.ipdata.region || d2.ipdata.info2 || d2.ipdata.info1 || ''
              if (typeof r3 === 'string' && r3) { scRegionCache = r3.replace(/(省|市|自治区|特别行政区)$/, ''); return }
            }
            return fetch('https://ipapi.co/json/', { cache: 'no-store' })
              .then(function (r3) { return r3 && r3.ok ? r3.json() : null })
              .then(function (d3) { if (d3 && d3.region) scRegionCache = d3.region })
          })
      })
      .catch(function () { scRegionCache = '' })
  }

  // 单条评论渲染（root=true 为根评论，false 为回复）
  // 楼中楼模型（对齐 cwd/twikoo）：根评论 + 其下扁平回复列表（最多 2 层）。
  // 每条评论（含嵌套回复）都带「回复」按钮；回复任意层时新评论挂到根评论下，
  // 并标注「回复 @直接父作者」。
  function scRenderComment(c, isRoot) {
    var name = c.author || '匿名';
    var initial = (name.trim().charAt(0) || '?').toUpperCase();
    var color = scAvatarColor(name);
    // 邮箱头像（weavatar）：有邮箱时叠加在字母头像之上；src 由 scApplyAvatars 异步填充 SHA256 哈希后的地址，
    // 加载失败（含 404）由全局 error 监听移除 <img>，露出底层字母头像。
    var avatarImg = c.email ? '<img class="sc-avatar-img" data-email="' + scEscapeHtml(c.email) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '';
    var nameHtml = scEscapeHtml(name);
    if (c.website) {
      nameHtml = '<a href="' + scEscapeHtml(c.website) + '" target="_blank" rel="nofollow noopener noreferrer">' + scEscapeHtml(name) + '</a>';
    }
    var badge = c.isAdmin ? '<span class="sc-badge sc-badge-admin">' + scEscapeHtml(SC_ADMIN_BADGE) + '</span>' : '';
    var replyTo = (c.replyToAuthor) ? '<span class="sc-reply-to"> 回复 ' + scEscapeHtml(c.replyToAuthor) + '</span>' : '';
    var extras = [];
    if (c.region) extras.push('<span class="sc-extra"><iconify-icon class="sc-extra-icon" icon="' + scDeviceIcon('region', c.region) + '"></iconify-icon>' + scEscapeHtml(c.region) + '</span>');
    if (c.os) extras.push('<span class="sc-extra"><iconify-icon class="sc-extra-icon" icon="' + scDeviceIcon('os', c.os) + '"></iconify-icon>' + scEscapeHtml(c.os) + '</span>');
    if (c.browser) extras.push('<span class="sc-extra"><iconify-icon class="sc-extra-icon" icon="' + scDeviceIcon('browser', c.browser) + '"></iconify-icon>' + scEscapeHtml(c.browser) + '</span>');
    var extrasHtml = extras.length ? '<div class="sc-extras">' + extras.join('') + '</div>' : '';
    // 优先使用服务端已净化的 Markdown HTML，否则退化为纯文本
    var contentHtml = c.contentHtml || scEscapeHtml(c.content || '').replace(/\n/g, '<br>');
    var likes = (typeof c.likes === 'number' && c.likes > 0) ? c.likes : 0;
    var liked = scIsLiked(c.id);
    return (
      '<div class="sc-item' + (isRoot ? '' : ' sc-reply') + '" data-id="' + scEscapeHtml(c.id) + '">' +
        '<div class="sc-avatar" style="background:' + color + '">' + scEscapeHtml(initial) + avatarImg + '</div>' +
        '<div class="sc-body">' +
          '<div class="sc-item-head">' +
            '<span class="sc-item-name">' + nameHtml + '</span>' +
            badge +
            replyTo +
            '<span class="sc-item-time">' + scFormatTime(c.createdAt) + '</span>' +
          '</div>' +
          '<div class="sc-item-content">' + contentHtml + '</div>' +
          extrasHtml +
          '<div class="sc-item-foot">' +
            '<button type="button" class="sc-like' + (liked ? ' sc-like-on' : '') + '" data-id="' + scEscapeHtml(c.id) + '" aria-label="点赞">' +
              '<svg viewBox="0 0 24 24" class="sc-like-icon" aria-hidden="true"><path d="M12 21l-1.45-1.32C5.4 14.97 2 11.9 2 8.05 2 5.3 4.16 3.2 6.9 3.2c1.5 0 2.94.72 3.85 1.86C11.66 3.92 13.1 3.2 14.6 3.2 17.34 3.2 19.5 5.3 19.5 8.05c0 3.85-3.4 6.92-8.55 11.63L12 21z"/></svg>' +
              (likes > 0 ? '<span class="sc-like-count">' + likes + '</span>' : '') +
            '</button>' +
            '<button type="button" class="sc-reply-btn" data-id="' + scEscapeHtml(c.id) + '">回复</button>' +
          '</div>' +
          '<div class="sc-reply-box" hidden></div>' +
        '</div>' +
      '</div>'
    );
  }

  function scRenderComments(root, apiUrl, postId, payload) {
    var list = root.querySelector('.sc-list');
    var countEl = root.querySelector('.sc-count');
    var pager = root.querySelector('.sc-pager');
    var roots = (payload && payload.data) || [];
    if (countEl) countEl.textContent = (payload && typeof payload.total === 'number') ? payload.total : roots.length;
    if (!roots.length) {
      list.innerHTML = '<div class="sc-empty">还没有评论，快来抢沙发吧～</div>';
      if (pager) pager.hidden = true;
      return;
    }
    var html = roots.map(function (c) {
      var thread = scRenderComment(c, true);
      if (c.replies && c.replies.length) {
        thread += '<div class="sc-replies">' + c.replies.map(function (r) { return scRenderComment(r, false); }).join('') + '</div>';
      }
      return '<div class="sc-thread">' + thread + '</div>';
    }).join('');
    if (root && root._scOwoMap) html = scApplyOwo(html, root._scOwoMap);
    list.innerHTML = html;
    // 头像地址需要 SHA256（异步计算），渲染后再填充
    scApplyAvatars(list);

    if (pager && payload && payload.totalPages > 1) {
      pager.hidden = false;
      var cur = payload.page || 1;
      var tp = payload.totalPages || 1;
      var parts = [];
      parts.push('<button type="button" class="sc-pager-btn" data-page="' + (cur - 1) + '"' + (cur <= 1 ? ' disabled' : '') + '>上一页</button>');
      var start = Math.max(1, cur - 2), end = Math.min(tp, cur + 2);
      for (var i = start; i <= end; i++) {
        parts.push('<button type="button" class="sc-pager-btn' + (i === cur ? ' sc-pager-current' : '') + '" data-page="' + i + '">' + i + '</button>');
      }
      parts.push('<button type="button" class="sc-pager-btn" data-page="' + (cur + 1) + '"' + (cur >= tp ? ' disabled' : '') + '>下一页</button>');
      pager.innerHTML = parts.join('');
    } else if (pager) {
      pager.hidden = true;
    }
  }

  function scLoadComments(root, apiUrl, postId, page) {
    page = page || 1;
    var list = root.querySelector('.sc-list');
    list.innerHTML = '<div class="sc-loading">加载评论中…</div>';
    fetch(apiUrl + '/api/comments?postId=' + encodeURIComponent(postId) + '&page=' + page + '&limit=20')
      .then(function (r) { return r.ok ? r.json() : { data: [], total: 0, page: 1, totalPages: 1 }; })
      .then(function (payload) {
        root._scPage = page;
        scRenderComments(root, apiUrl, postId, payload);
      })
      .catch(function () {
        list.innerHTML = '<div class="sc-empty">评论加载失败，请稍后重试。</div>';
      });
  }

  function scSetLikeCount(btn, n) {
    var countEl = btn.querySelector('.sc-like-count');
    if (n > 0) {
      if (!countEl) { countEl = document.createElement('span'); countEl.className = 'sc-like-count'; btn.appendChild(countEl); }
      countEl.textContent = n;
    } else if (countEl) {
      countEl.remove();
    }
  }

  function scToggleLike(root, apiUrl, postId, btn) {
    var id = btn.getAttribute('data-id');
    if (!id) return;
    var liked = scIsLiked(id);
    var countEl = btn.querySelector('.sc-like-count');
    var current = countEl ? (parseInt(countEl.textContent, 10) || 0) : 0;
    var method = liked ? 'DELETE' : 'POST';
    var next = liked ? Math.max(0, current - 1) : current + 1;

    // 乐观更新
    scSetLiked(id, !liked);
    btn.classList.toggle('sc-like-on', !liked);
    scSetLikeCount(btn, next);

    fetch(apiUrl + '/api/comments/' + encodeURIComponent(id) + '/like', { method: method })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && typeof d.likes === 'number') scSetLikeCount(btn, d.likes);
      })
      .catch(function () {
        // 网络失败回滚
        scSetLiked(id, liked);
        btn.classList.toggle('sc-like-on', liked);
        scSetLikeCount(btn, current);
      });
  }

  function scOpenReply(root, apiUrl, postId, btn) {
    var id = btn.getAttribute('data-id');
    var item = btn.closest('.sc-item');
    var box = item ? item.querySelector('.sc-reply-box') : null;
    if (!box) return;
    if (box.dataset.open === '1') { box.hidden = true; box.innerHTML = ''; box.dataset.open = '0'; return; }
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('sc-user') || '{}'); } catch (e) {}
    var form = root.querySelector('.sc-form');
    var author = saved.author || (form && form.author ? form.author.value : '');
    var email = saved.email || (form && form.email ? form.email.value : '');
    var website = saved.website || (form && form.website ? form.website.value : '');
    box.innerHTML =
      '<form class="sc-reply-form" novalidate>' +
        '<div class="sc-meta">' +
          '<input class="sc-input" name="author" type="text" placeholder="昵称 *" maxlength="100" value="' + scEscapeHtml(author) + '" required />' +
          '<input class="sc-input" name="email" type="email" placeholder="邮箱 *" maxlength="200" value="' + scEscapeHtml(email) + '" required />' +
          '<input class="sc-input" name="website" type="text" placeholder="网站（可选）" maxlength="500" value="' + scEscapeHtml(website) + '" />' +
        '</div>' +
        '<textarea class="sc-textarea" name="content" placeholder="写下你的回复，支持 Markdown…" maxlength="5000" rows="3" required></textarea>' +
        '<div class="sc-actions">' +
          '<span class="sc-tip" role="status" aria-live="polite"></span>' +
          '<span class="sc-reply-btns">' +
            '<button type="button" class="sc-reply-cancel">取消</button>' +
            '<button type="submit" class="sc-submit">回复</button>' +
          '</span>' +
        '</div>' +
      '</form>';
    box.hidden = false;
    box.dataset.open = '1';
    var rform = box.querySelector('.sc-reply-form');
    var rtip = rform.querySelector('.sc-tip');
    scInitEmoji(rform);
    // 博主已登录：回复框预填管理员身份并锁定昵称/邮箱
    if (scIsAdminLoggedIn()) scApplyAdminToForm(rform, scGetAdminInfo() || {}, true);

    rform.querySelector('.sc-reply-cancel').addEventListener('click', function () {
      box.hidden = true; box.innerHTML = ''; box.dataset.open = '0';
    });
    rform.addEventListener('submit', function (e) {
      e.preventDefault();
      var rauth = (rform.author.value || '').trim();
      var remail = (rform.email.value || '').trim();
      var rweb = (rform.website.value || '').trim();
      var rcontent = (rform.content.value || '').trim();
      if (!rauth || !remail || !rcontent) { rtip.textContent = '昵称、邮箱和回复内容不能为空'; rtip.className = 'sc-tip sc-tip-error'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(remail)) { rtip.textContent = '请填写有效的邮箱地址'; rtip.className = 'sc-tip sc-tip-error'; return; }
      var submitBtn = rform.querySelector('.sc-submit');
      submitBtn.disabled = true; rtip.textContent = '提交中…'; rtip.className = 'sc-tip';
      try { localStorage.setItem('sc-user', JSON.stringify({ author: rauth, email: remail, website: rweb })); } catch (e) {}
      fetch(apiUrl + '/api/comments', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, scAdminAuthHeader()),
        body: JSON.stringify({ postId: postId, parentId: id, author: rauth, email: remail, website: rweb || undefined, content: rcontent, ua: scGetUserAgent(), region: scRegionCache || undefined }),
      })
        .then(function (r) { if (!r.ok) return r.json().then(function (d) { throw new Error(d && d.error ? d.error : '提交失败'); }); return r.json(); })
        .then(function () { box.hidden = true; box.innerHTML = ''; box.dataset.open = '0'; scLoadComments(root, apiUrl, postId, root._scPage || 1); })
        .catch(function (err) { rtip.textContent = (err && err.message) || '提交失败，请稍后重试'; rtip.className = 'sc-tip sc-tip-error'; })
        .finally(function () { submitBtn.disabled = false; });
    });
  }

  // 博主身份徽章文字（管理端「评论设置」配置，默认「博主」）；
  // 由 scInitAdmin 从 /api/comment-admin 读取后更新，渲染评论徽章时读取。
  var SC_ADMIN_BADGE = '博主';

  // ===== 评论区博主身份（Twikoo 式「设置」按钮登录） =====
  var SC_ADMIN_TOKEN = 'sc_admin_token'
  var SC_ADMIN_INFO = 'sc_admin_info'

  function scB64urlDecode(s) {
    var p = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/') + p
    var bin = atob(b64)
    var bytes = new Uint8Array(bin.length)
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    try { return new TextDecoder().decode(bytes) } catch (e) { return bin }
  }
  function scGetAdminToken() {
    try {
      var t = localStorage.getItem(SC_ADMIN_TOKEN)
      if (!t) return null
      var parts = t.split('.')
      if (parts.length !== 3) return null
      try {
        var p = JSON.parse(scB64urlDecode(parts[1]))
        if (p.exp && p.exp < Math.floor(Date.now() / 1000)) {
          localStorage.removeItem(SC_ADMIN_TOKEN)
          localStorage.removeItem(SC_ADMIN_INFO)
          return null
        }
      } catch (e) {}
      return t
    } catch (e) { return null }
  }
  function scGetAdminInfo() {
    try { return JSON.parse(localStorage.getItem(SC_ADMIN_INFO) || 'null') } catch (e) { return null }
  }
  function scSetAdmin(token, info) {
    try { localStorage.setItem(SC_ADMIN_TOKEN, token); localStorage.setItem(SC_ADMIN_INFO, JSON.stringify(info)) } catch (e) {}
  }
  function scClearAdmin() {
    try { localStorage.removeItem(SC_ADMIN_TOKEN); localStorage.removeItem(SC_ADMIN_INFO) } catch (e) {}
  }
  function scIsAdminLoggedIn() { return !!scGetAdminToken() }
  function scAdminAuthHeader() {
    var t = scGetAdminToken()
    return t ? { Authorization: 'Bearer ' + t } : {}
  }
  function scApplyAdminToForm(form, info, lock) {
    if (!form) return
    if (lock && info) {
      if (form.author) { form.author.value = info.name || ''; form.author.readOnly = true; form.author.classList.add('sc-locked') }
      if (form.email) { form.email.value = info.email || ''; form.email.readOnly = true; form.email.classList.add('sc-locked') }
    } else {
      if (form.author) { form.author.readOnly = false; form.author.classList.remove('sc-locked') }
      if (form.email) { form.email.readOnly = false; form.email.classList.remove('sc-locked') }
    }
  }

  function scOpenAdminModal(root, apiUrl, refresh) {
    var mask = root.querySelector('.sc-admin-mask')
    if (!mask) {
      mask = document.createElement('div')
      mask.className = 'sc-admin-mask'
      mask.innerHTML =
        '<div class="sc-admin-modal" role="dialog" aria-modal="true" aria-label="博主身份登录">' +
          '<div class="sc-admin-modal-head">' +
            '<span>博主身份登录</span>' +
            '<button type="button" class="sc-admin-modal-close" aria-label="关闭">×</button>' +
          '</div>' +
          '<p class="sc-admin-modal-desc">请输入管理端「评论设置」中配置的管理员邮箱与密码</p>' +
          '<input class="sc-input sc-admin-email" type="email" placeholder="管理员邮箱 *" autocomplete="username" />' +
          '<input class="sc-input sc-admin-pass" type="password" placeholder="密码 *" autocomplete="current-password" />' +
          '<div class="sc-admin-modal-tip" role="status"></div>' +
          '<div class="sc-admin-modal-actions">' +
            '<button type="button" class="sc-admin-cancel">取消</button>' +
            '<button type="button" class="sc-admin-login">登录</button>' +
          '</div>' +
        '</div>'
      root.appendChild(mask)
      function close() { mask.hidden = true }
      mask.querySelector('.sc-admin-modal-close').addEventListener('click', close)
      mask.querySelector('.sc-admin-cancel').addEventListener('click', close)
      mask.addEventListener('click', function (e) { if (e.target === mask) close() })
      mask.querySelector('.sc-admin-login').addEventListener('click', submitLogin)
    }
    function submitLogin() {
      var emailEl = mask.querySelector('.sc-admin-email')
      var passEl = mask.querySelector('.sc-admin-pass')
      var tip = mask.querySelector('.sc-admin-modal-tip')
      var loginBtn = mask.querySelector('.sc-admin-login')
      var email = (emailEl.value || '').trim()
      var password = (passEl.value || '').trim()
      if (!email || !password) { tip.textContent = '请输入邮箱和密码'; tip.className = 'sc-admin-modal-tip sc-tip-error'; return }
      loginBtn.disabled = true
      tip.textContent = '登录中…'
      tip.className = 'sc-admin-modal-tip'
      fetch(apiUrl + '/api/comment-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d } }) })
        .then(function (res) {
          if (!res.ok) throw new Error((res.d && res.d.error) || '登录失败')
          scSetAdmin(res.d.token, { name: res.d.name, email: res.d.email })
          mask.hidden = true
          emailEl.value = ''
          passEl.value = ''
          refresh()
        })
        .catch(function (err) { tip.textContent = (err && err.message) || '登录失败'; tip.className = 'sc-admin-modal-tip sc-tip-error' })
        .finally(function () { loginBtn.disabled = false })
    }
    mask.hidden = false
    var emailEl = mask.querySelector('.sc-admin-email')
    if (emailEl) emailEl.focus()
  }

  function scInitAdmin(root, apiUrl, postId) {
    var adminBtn = root.querySelector('.sc-admin-btn')
    var statusEl = root.querySelector('.sc-admin-status')
    if (!adminBtn || !statusEl) return

    function refresh() {
      var enabled = root._scAdminEnabled === true
      var logged = scIsAdminLoggedIn()
      adminBtn.hidden = !(enabled && !logged)
      if (logged) {
        var info = scGetAdminInfo() || { name: '博主' }
        statusEl.hidden = false
        statusEl.innerHTML =
          '<span class="sc-admin-badge">博主（' + scEscapeHtml(info.name || '博主') + '）已登录</span>' +
          '<button type="button" class="sc-admin-logout">退出</button>'
        root.classList.add('sc-admin-on')
        var form = root.querySelector('.sc-form')
        scApplyAdminToForm(form, info, true)
      } else {
        statusEl.hidden = true
        statusEl.innerHTML = ''
        root.classList.remove('sc-admin-on')
        var form2 = root.querySelector('.sc-form')
        scApplyAdminToForm(form2, null, false)
      }
    }

    fetch(apiUrl + '/api/comment-admin')
      .then(function (r) { return r.ok ? r.json() : { enabled: false } })
      .then(function (d) {
        root._scAdminEnabled = !!(d && d.enabled);
        SC_ADMIN_BADGE = (d && d.badge) || '博主';
        // 评论可能已先于本请求渲染，立即同步已渲染徽章的文字
        var badgeEls = root.querySelectorAll('.sc-badge-admin');
        for (var bi = 0; bi < badgeEls.length; bi++) badgeEls[bi].textContent = SC_ADMIN_BADGE;
        refresh();
      })
      .catch(function () { root._scAdminEnabled = false; refresh() })

    adminBtn.addEventListener('click', function () { scOpenAdminModal(root, apiUrl, refresh) })
    statusEl.addEventListener('click', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('sc-admin-logout')) {
        scClearAdmin()
        refresh()
      }
    })
    refresh()
  }

  // ===== 表情包（与 Twikoo OwO 兼容：图片表情存 :text: 短代码，文字表情直接存原文） =====
  function scEscapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function scAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var scOwoTpl = document.createElement('div');
  function scGetImgSrc(html) {
    try { scOwoTpl.innerHTML = html; var img = scOwoTpl.querySelector('img'); return img ? (img.getAttribute('src') || img.src) : ''; } catch (e) { return ''; }
  }
  function scGetFilename(url) {
    return String(url).split('#')[0].split('?')[0].split('/').pop();
  }

  var scOwoCache = {};
  function scGetOwoUrl(emojiCdn) {
    if (emojiCdn && emojiCdn.trim()) return emojiCdn.trim();
    return location.origin + '/owo.json';
  }
  function scGetOwo(emojiCdn) {
    var url = scGetOwoUrl(emojiCdn);
    if (scOwoCache[url]) return scOwoCache[url];
    var p = fetch(url, { cache: 'force-cache', priority: 'low' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var groups = [];
        var map = {};
        Object.keys(data).forEach(function (gname) {
          var g = data[gname];
          if (!g || !Array.isArray(g.container)) return;
          var type = g.type || 'text';
          var items = g.container.map(function (it) {
            var icon = it.icon || '';
            var text = it.text || '';
            var src = scGetImgSrc(icon);
            if (!text && src) text = scGetFilename(src);
            if (src) map[text] = src;
            return { text: text, type: type, icon: icon, src: src };
          });
          groups.push({ name: gname, type: type, items: items });
        });
        return { groups: groups, map: map };
      });
    scOwoCache[url] = p;
    return p;
  }

  // 将正文中的 :text: 短代码替换为图片（与 Twikoo 渲染规则一致）
  function scApplyOwo(html, map) {
    if (!map) return html;
    var keys = Object.keys(map);
    if (!keys.length) return html;
    var re = new RegExp(':(?:' + keys.map(scEscapeRegex).join('|') + '):', 'g');
    return html.replace(re, function (m) {
      var k = m.slice(1, -1);
      var src = map[k];
      if (!src) return m;
      return '<img class="sc-owo" loading="lazy" src="' + scAttr(src) + '" alt=":' + scAttr(k) + ':">';
    });
  }
  function scApplyOwoAll(root) {
    if (!root || !root._scOwoMap) return;
    root.querySelectorAll('.sc-item-content').forEach(function (el) {
      el.innerHTML = scApplyOwo(el.innerHTML, root._scOwoMap);
    });
  }

  function scInsertEmoji(textarea, item) {
    if (!textarea) return;
    var pos = textarea.selectionEnd || 0;
    var val = textarea.value;
    // 图片表情插入 :text: 短代码（与 Twikoo 一致）；文字/颜文字直接插入原文
    var insert = (item.type === 'image' && item.text) ? (':' + item.text + ': ') : (item.icon || item.text || '');
    textarea.value = val.slice(0, pos) + insert + val.slice(pos);
    var np = pos + insert.length;
    try { textarea.focus(); textarea.setSelectionRange(np, np); } catch (e) {}
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 仅渲染指定分组的表情到面板（保证任意时刻只有一个分组的 img 在 DOM 中）
  function scRenderEmojiPack(panel, gi, textarea) {
    var allGroups = panel._allGroups;
    if (!allGroups || !allGroups[gi]) return;
    var g = allGroups[gi];
    var body = panel.querySelector('.sc-emoji-body');
    if (!body) return;
    body.innerHTML = '';
    var pack = document.createElement('div');
    pack.className = 'sc-emoji-pack sc-emoji-pack-active';
    pack.setAttribute('data-pack', String(gi));
    g.items.forEach(function (it) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sc-emoji-item';
      btn.title = it.text;
      if (it.src) {
        btn.innerHTML = '<img class="sc-owo-opt" src="' + scAttr(it.src) + '" alt="' + scAttr(it.text) + '">';
      } else {
        btn.textContent = it.icon || it.text || '';
      }
      btn.addEventListener('click', function () {
        scInsertEmoji(textarea, it);
        try {
          var rec = JSON.parse(localStorage.getItem('sc-emoji-recent') || '[]');
          rec = rec.filter(function (x) { return x !== it.text; });
          rec.unshift(it.text);
          if (rec.length > 16) rec = rec.slice(0, 16);
          localStorage.setItem('sc-emoji-recent', JSON.stringify(rec));
        } catch (e2) {}
        panel.hidden = true;
      });
      pack.appendChild(btn);
    });
    body.appendChild(pack);
  }

  function scBuildEmojiPanel(panel, textarea, owo) {
    var groups = owo.groups || [];
    // 最近使用（从 localStorage 还原完整 item）
    var recentItems = [];
    try {
      var recent = JSON.parse(localStorage.getItem('sc-emoji-recent') || '[]');
      recent.forEach(function (t) {
        for (var i = 0; i < groups.length; i++) {
          for (var j = 0; j < groups[i].items.length; j++) {
            if (groups[i].items[j].text === t) { recentItems.push(groups[i].items[j]); break; }
          }
        }
      });
    } catch (e) {}
    var allGroups = groups;
    if (recentItems.length) {
      allGroups = [{ name: '最近', type: 'recent', items: recentItems }].concat(groups);
    }

    panel._textarea = textarea;
    panel._allGroups = allGroups;
    panel._owo = owo;

    var body = document.createElement('div');
    body.className = 'sc-emoji-body';

    // 拦截鼠标滚轮：在面板内滚动时阻止页面跟着滚
    body.addEventListener('wheel', function (e) {
      var canScrollUp = body.scrollTop > 0;
      var canScrollDown = body.scrollTop < body.scrollHeight - body.clientHeight - 1;
      if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
        e.preventDefault();
        e.stopPropagation();
        body.scrollTop += e.deltaY;
      }
    }, { passive: false });

    panel.appendChild(body);

    var bar = document.createElement('div');
    bar.className = 'sc-emoji-bar';
    allGroups.forEach(function (g, gi) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'sc-emoji-tab' + (gi === 0 ? ' sc-emoji-tab-active' : '');
      tab.setAttribute('data-pack', String(gi));
      tab.textContent = g.name;
      tab.addEventListener('click', function () {
        bar.querySelectorAll('.sc-emoji-tab').forEach(function (t) { t.classList.toggle('sc-emoji-tab-active', t === tab); });
        scRenderEmojiPack(panel, gi, textarea);
      });
      bar.appendChild(tab);
    });
    panel.appendChild(bar);

    // 首次打开面板只渲染第一个分组（DOM 中只存在这一组）
    scRenderEmojiPack(panel, 0, textarea);
  }

  function scInitEmoji(form) {
    if (!form || form.dataset.emojiReady === '1') return;
    form.dataset.emojiReady = '1';
    var root = form.closest('#self-comments');
    var emojiCdn = root ? (root.getAttribute('data-emoji-cdn') || '') : '';

    var btn = form.querySelector('.sc-emoji-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sc-emoji-btn';
      btn.setAttribute('aria-label', '插入表情');
      btn.title = '表情';
      var actions = form.querySelector('.sc-actions');
      if (actions) actions.insertBefore(btn, actions.firstChild);
      else form.insertBefore(btn, form.firstChild);
    }
    // 每次初始化都强制刷新图标（避免 swup 复用旧节点时图标不更新）
    btn.innerHTML = '<iconify-icon icon="mingcute:emoji-line" width="19" height="19"></iconify-icon>';

    var panel = document.createElement('div');
    panel.className = 'sc-emoji-panel';
    panel.hidden = true;
    form.appendChild(panel);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!panel.hidden) { panel.hidden = true; return; }
      // 定位到按钮正下方
      var rect = btn.getBoundingClientRect();
      var panelH = panel.offsetHeight || 280;
      // 如果下方空间不够，翻到按钮上方
      if (rect.bottom + 6 + panelH > window.innerHeight && rect.top > panelH + 6) {
        panel.style.top = (rect.top - panelH - 6) + 'px';
      } else {
        panel.style.top = (rect.bottom + 6) + 'px';
      }
      panel.style.left = rect.left + 'px';
      scGetOwo(emojiCdn).then(function (owo) {
        if (!panel._built) { panel.innerHTML = ''; scBuildEmojiPanel(panel, form.querySelector('textarea'), owo); panel._built = true; }
        // 首屏评论可能还是短代码文本，点开表情时顺手把历史表情补渲染成图片
        if (root && root._scOwoMap !== owo.map) { root._scOwoMap = owo.map; scApplyOwoAll(root); }
        panel.hidden = false;
      }).catch(function () {
        panel.innerHTML = '<div class="sc-emoji-empty">表情包加载失败</div>';
        panel.hidden = false;
        panel._built = true;
      });
    });

    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        panel.hidden = true;
      }
    });

    // 页面滚动时关闭表情面板
    window.addEventListener('scroll', function () {
      if (!panel.hidden) panel.hidden = true;
    }, { passive: true });
  }

  function initSelfComments() {
    var root = document.getElementById('self-comments');
    if (!root) return;
    if (root.dataset.scInited === '1') return;
    root.dataset.scInited = '1';

    // 异步采集设备信息（UA 版本修正 + IP 归属），不阻塞渲染
    scPrefetchUa();
    scPrefetchRegion();

    var apiUrl = root.getAttribute('data-api-url') || '';
    var postId = root.getAttribute('data-post-id') || '';
    var form = root.querySelector('.sc-form');
    var tip = root.querySelector('.sc-tip');
    var submitBtn = root.querySelector('.sc-submit');

    // 恢复上次填写的昵称/邮箱/网站
    try {
      var saved = JSON.parse(localStorage.getItem('sc-user') || '{}');
      ['author', 'email', 'website'].forEach(function (k) {
        if (saved[k] && form[k]) form[k].value = saved[k];
      });
    } catch (e) {}

    scLoadComments(root, apiUrl, postId, 1);

    // 表情包完全懒加载：页面刷新时不请求 owo.json，也不预渲染历史评论里的 :text: 短代码。
    // 只有点击表情按钮时才会拉取 owo.json 并构建面板，同时把当前页历史评论短代码补渲染成图片。

    // 主表单绑定表情按钮
    scInitEmoji(form);

    // 列表内事件委托：点赞 / 回复 / 翻页
    root.addEventListener('click', function (e) {
      var likeBtn = e.target.closest('.sc-like');
      if (likeBtn) { scToggleLike(root, apiUrl, postId, likeBtn); return; }
      var replyBtn = e.target.closest('.sc-reply-btn');
      if (replyBtn) { scOpenReply(root, apiUrl, postId, replyBtn); return; }
      var pagerBtn = e.target.closest('[data-page]');
      if (pagerBtn && !pagerBtn.disabled) {
        var p = parseInt(pagerBtn.getAttribute('data-page'), 10);
        if (p) scLoadComments(root, apiUrl, postId, p);
        return;
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var author = (form.author.value || '').trim();
      var email = (form.email.value || '').trim();
      var website = (form.website.value || '').trim();
      var content = (form.content.value || '').trim();

      if (!author || !email || !content) {
        tip.textContent = '昵称、邮箱和评论内容不能为空';
        tip.className = 'sc-tip sc-tip-error';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        tip.textContent = '请填写有效的邮箱地址';
        tip.className = 'sc-tip sc-tip-error';
        return;
      }

      submitBtn.disabled = true;
      tip.textContent = '提交中…';
      tip.className = 'sc-tip';

      try {
        localStorage.setItem('sc-user', JSON.stringify({ author: author, email: email, website: website }));
      } catch (e2) {}

      fetch(apiUrl + '/api/comments', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, scAdminAuthHeader()),
        body: JSON.stringify({
          postId: postId,
          author: author,
          email: email,
          website: website || undefined,
          content: content,
          ua: scGetUserAgent(),
          region: scRegionCache || undefined,
        }),
      })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (d) { throw new Error(d && d.error ? d.error : '提交失败'); });
          return r.json();
        })
        .then(function () {
          form.content.value = '';
          tip.textContent = '评论发表成功！';
          tip.className = 'sc-tip sc-tip-ok';
          scLoadComments(root, apiUrl, postId, 1);
          setTimeout(function () { if (tip) { tip.textContent = ''; tip.className = 'sc-tip'; } }, 2500);
        })
        .catch(function (err) {
          tip.textContent = (err && err.message) || '提交失败，请稍后重试';
          tip.className = 'sc-tip sc-tip-error';
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
      });

      // 博主身份（设置按钮 / 登录 / 状态）
      scInitAdmin(root, apiUrl, postId)
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
      initTwikooComments(); // 评论区（Twikoo）
      initSelfComments(); // 评论区（自研）
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
  initTwikooComments(); // 评论区（Twikoo）
  initSelfComments(); // 评论区（自研）
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
    initTwikooComments(); // 评论区（Twikoo）
    initSelfComments(); // 评论区（自研）
    initFancybox();
    initReadingProgress();
    initPostToc();
  });
})();
