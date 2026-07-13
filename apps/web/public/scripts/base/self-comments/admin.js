import { scEscapeHtml, state } from './shared.js';

// ===== 评论区博主身份（Twikoo 式「设置」按钮登录） =====
var SC_ADMIN_TOKEN = 'sc_admin_token';
var SC_ADMIN_INFO = 'sc_admin_info';

function scB64urlDecode(s) {
  var p = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  var b64 = s.replace(/-/g, '+').replace(/_/g, '/') + p;
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  try { return new TextDecoder().decode(bytes); } catch (e) { return bin; }
}
function scGetAdminToken() {
  try {
    var t = localStorage.getItem(SC_ADMIN_TOKEN);
    if (!t) return null;
    var parts = t.split('.');
    if (parts.length !== 3) return null;
    try {
      var p = JSON.parse(scB64urlDecode(parts[1]));
      if (p.exp && p.exp < Math.floor(Date.now() / 1000)) {
        localStorage.removeItem(SC_ADMIN_TOKEN);
        localStorage.removeItem(SC_ADMIN_INFO);
        return null;
      }
    } catch (e) {}
    return t;
  } catch (e) { return null; }
}
function scGetAdminInfo() {
  try { return JSON.parse(localStorage.getItem(SC_ADMIN_INFO) || 'null'); } catch (e) { return null; }
}
function scSetAdmin(token, info) {
  try { localStorage.setItem(SC_ADMIN_TOKEN, token); localStorage.setItem(SC_ADMIN_INFO, JSON.stringify(info)); } catch (e) {}
}
function scClearAdmin() {
  try { localStorage.removeItem(SC_ADMIN_TOKEN); localStorage.removeItem(SC_ADMIN_INFO); } catch (e) {}
}
function scIsAdminLoggedIn() { return !!scGetAdminToken(); }
function scAdminAuthHeader() {
  var t = scGetAdminToken();
  return t ? { Authorization: 'Bearer ' + t } : {};
}
function scApplyAdminToForm(form, info, lock) {
  if (!form) return;
  if (lock && info) {
    if (form.author) { form.author.value = info.name || ''; form.author.readOnly = true; form.author.classList.add('sc-locked'); }
    if (form.email) { form.email.value = info.email || ''; form.email.readOnly = true; form.email.classList.add('sc-locked'); }
  } else {
    if (form.author) { form.author.readOnly = false; form.author.classList.remove('sc-locked'); }
    if (form.email) { form.email.readOnly = false; form.email.classList.remove('sc-locked'); }
  }
}

function scOpenAdminModal(root, apiUrl, refresh) {
  var mask = root.querySelector('.sc-admin-mask');
  if (!mask) {
    mask = document.createElement('div');
    mask.className = 'sc-admin-mask';
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
      '</div>';
    root.appendChild(mask);
    function close() { mask.hidden = true; }
    mask.querySelector('.sc-admin-modal-close').addEventListener('click', close);
    mask.querySelector('.sc-admin-cancel').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    mask.querySelector('.sc-admin-login').addEventListener('click', submitLogin);
  }
  function submitLogin() {
    var emailEl = mask.querySelector('.sc-admin-email');
    var passEl = mask.querySelector('.sc-admin-pass');
    var tip = mask.querySelector('.sc-admin-modal-tip');
    var loginBtn = mask.querySelector('.sc-admin-login');
    var email = (emailEl.value || '').trim();
    var password = (passEl.value || '').trim();
    if (!email || !password) { tip.textContent = '请输入邮箱和密码'; tip.className = 'sc-admin-modal-tip sc-tip-error'; return; }
    loginBtn.disabled = true;
    tip.textContent = '登录中…';
    tip.className = 'sc-admin-modal-tip';
    fetch(apiUrl + '/api/comment-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error((res.d && res.d.error) || '登录失败');
        scSetAdmin(res.d.token, { name: res.d.name, email: res.d.email });
        mask.hidden = true;
        emailEl.value = '';
        passEl.value = '';
        refresh();
      })
      .catch(function (err) { tip.textContent = (err && err.message) || '登录失败'; tip.className = 'sc-admin-modal-tip sc-tip-error'; })
      .finally(function () { loginBtn.disabled = false; });
  }
  mask.hidden = false;
  var emailEl = mask.querySelector('.sc-admin-email');
  if (emailEl) emailEl.focus();
}

export function scInitAdmin(root, apiUrl, postId) {
  var adminBtn = root.querySelector('.sc-admin-btn');
  var statusEl = root.querySelector('.sc-admin-status');
  if (!adminBtn || !statusEl) return;

  function refresh() {
    var enabled = root._scAdminEnabled === true;
    var logged = scIsAdminLoggedIn();
    adminBtn.hidden = !(enabled && !logged);
    if (logged) {
      var info = scGetAdminInfo() || { name: '博主' };
      statusEl.hidden = false;
      statusEl.innerHTML =
        '<span class="sc-admin-badge">' + scEscapeHtml(state.adminBadge) + '（' + scEscapeHtml(info.name || '博主') + '）已登录</span>' +
        '<button type="button" class="sc-admin-logout">退出</button>';
      root.classList.add('sc-admin-on');
      var form = root.querySelector('.sc-form');
      scApplyAdminToForm(form, info, true);
    } else {
      statusEl.hidden = true;
      statusEl.innerHTML = '';
      root.classList.remove('sc-admin-on');
      var form2 = root.querySelector('.sc-form');
      scApplyAdminToForm(form2, null, false);
    }
  }

  fetch(apiUrl + '/api/comment-admin')
    .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
    .then(function (d) {
      root._scAdminEnabled = !!(d && d.enabled);
      state.adminBadge = (d && d.badge) || '博主';
      // 评论可能已先于本请求渲染，立即同步已渲染徽章的文字
      var badgeEls = root.querySelectorAll('.sc-badge-admin');
      for (var bi = 0; bi < badgeEls.length; bi++) badgeEls[bi].textContent = state.adminBadge;
      refresh();
    })
    .catch(function () { root._scAdminEnabled = false; refresh(); });

  // 拉取自定义访客徽章映射（email -> 徽章文字），渲染评论时追加独立徽章
  fetch(apiUrl + '/api/guest-badges')
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (d) {
      state.guestBadges = d || {};
      // 评论可能已先于本请求渲染，遍历已渲染评论注入缺失的访客徽章（仿博主徽章同步模式）
      var items = root.querySelectorAll('.sc-item');
      for (var i = 0; i < items.length; i++) {
        var img = items[i].querySelector('.sc-avatar-img');
        var em = img ? (img.getAttribute('data-email') || '').trim().toLowerCase() : '';
        var gb = state.guestBadges[em];
        // 管理员已显示博主徽章，跳过叠加访客徽章
        if (gb && !items[i].querySelector('.sc-badge-admin') && !items[i].querySelector('.sc-badge-guest')) {
          var head = items[i].querySelector('.sc-item-head');
          if (head) {
            var span = document.createElement('span');
            span.className = 'sc-badge sc-badge-guest';
            span.textContent = gb;
            // 插入到名字后面、回复标签前面（紧跟在管理员徽章之后）
            var refNode = head.querySelector('.sc-reply-to') || head.querySelector('.sc-item-time');
            head.insertBefore(span, refNode);
          }
        }
      }
      refresh();
    })
    .catch(function () { state.guestBadges = {}; refresh(); });

  adminBtn.addEventListener('click', function () { scOpenAdminModal(root, apiUrl, refresh); });
  statusEl.addEventListener('click', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('sc-admin-logout')) {
      scClearAdmin();
      refresh();
    }
  });
  refresh();
}
