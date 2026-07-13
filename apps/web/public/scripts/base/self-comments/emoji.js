import { scEscapeRegex, scAttr, scGetImgSrc, scGetFilename } from './shared.js';

// ===== 表情包（与 Twikoo OwO 兼容：图片表情存 :text: 短代码，文字表情直接存原文） =====
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
export function scApplyOwo(html, map) {
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
export function scApplyOwoAll(root) {
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
/* ===== 表情包悬停预览（放大浮层） ===== */
function scGetEmojiPreview() {
  var el = document.getElementById('sc-emoji-preview');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sc-emoji-preview';
    el.className = 'sc-emoji-preview';
    el.innerHTML =
      '<div class="sc-emoji-preview-inner">' +
        '<img class="sc-emoji-preview-img" alt="预览">' +
      '</div>';
    document.body.appendChild(el);
  }
  return el;
}
function scShowEmojiPreview(panel, btn, src) {
  var pv = scGetEmojiPreview();
  var img = pv.querySelector('.sc-emoji-preview-img');
  img.src = src;
  pv._panel = panel;
  pv.classList.add('sc-emoji-preview-show');
  scMoveEmojiPreview(panel, null, btn);
}
function scHideEmojiPreview(panel) {
  var pv = document.getElementById('sc-emoji-preview');
  if (!pv || pv._panel !== panel) return;
  pv.classList.remove('sc-emoji-preview-show');
  pv._panel = null;
}
function scMoveEmojiPreview(panel, evt, btn) {
  var pv = document.getElementById('sc-emoji-preview');
  if (!pv || !pv.classList.contains('sc-emoji-preview-show') || pv._panel !== panel) return;
  var target = btn || (evt && evt.target && evt.target.closest ? evt.target.closest('.sc-emoji-item') : null);
  if (!target) { scHideEmojiPreview(panel); return; }
  var rect = target.getBoundingClientRect();
  /* 大图预览：居中于表情项上方 */
  pv.style.left = (rect.left + rect.width / 2) + 'px';
  pv.style.top = (rect.top - 12) + 'px';   /* 负 margin + transform 会把它推到上方 */
}

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
    /* ---- 悬停预览 ---- */
    if (it.src) {
      btn.addEventListener('mouseenter', function () { scShowEmojiPreview(panel, btn, it.src); });
      btn.addEventListener('mouseleave', function () { scHideEmojiPreview(panel); });
      btn.addEventListener('mousemove', function (e) { scMoveEmojiPreview(panel, e); });
    }
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

export function scInitEmoji(form) {
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
  // 挂到 body 而非 form 内部，避免祖先 transform/filter/perspect 破坏 position:fixed 的视口基准
  document.body.appendChild(panel);

  // 根据按钮位置精确定位面板（面板须已在 DOM 中且有实际尺寸）
  function repositionPanel() {
    var rect = btn.getBoundingClientRect();
    var pH = panel.offsetHeight || 280;
    var top;
    if (rect.bottom + 6 + pH > window.innerHeight && rect.top > pH + 6) {
      top = rect.top - pH - 6;
    } else {
      top = rect.bottom + 6;
    }
    // 防止面板顶部溢出视口（放到按钮上方时，超高面板可能为负）
    if (top < 8) top = 8;
    panel.style.top = top + 'px';
    var pW = panel.offsetWidth || Math.min(420, window.innerWidth - 32);
    var left = rect.left;
    // 防止面板右侧溢出视口
    if (left + pW > window.innerWidth) {
      left = window.innerWidth - pW - 8;
    }
    if (left < 8) left = 8;
    panel.style.left = left + 'px';
  }

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!panel.hidden) { panel.hidden = true; return; }
    // 先用估算高度预定位
    repositionPanel();
    scGetOwo(emojiCdn).then(function (owo) {
      if (!panel._built) { panel.innerHTML = ''; scBuildEmojiPanel(panel, form.querySelector('textarea'), owo); panel._built = true; }
      // 面板构建完毕后用真实尺寸重新定位（修复嵌套回复框内偏移问题）
      repositionPanel();
      // 首屏评论可能还是短代码文本，点开表情时顺手把历史表情补渲染成图片
      if (root && root._scOwoMap !== owo.map) { root._scOwoMap = owo.map; scApplyOwoAll(root); }
      panel.hidden = false;
      _panelOpenScrollY = window.scrollY;
    }).catch(function () {
      panel.innerHTML = '<div class="sc-emoji-empty">表情包加载失败</div>';
      repositionPanel();
      panel.hidden = false;
      _panelOpenScrollY = window.scrollY;
      panel._built = true;
    });
  });

  document.addEventListener('click', function (e) {
    if (panel.hidden) return;
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      panel.hidden = true;
    }
  });

  // 页面滚动时关闭表情面板（加阈值：小幅度滚动不触发，避免太敏感）
  var _panelOpenScrollY = 0;
  window.addEventListener('scroll', function () {
    if (panel.hidden) return;
    if (Math.abs(window.scrollY - _panelOpenScrollY) > 40) {
      panel.hidden = true;
      _panelOpenScrollY = 0;
    }
  }, { passive: true });
}
