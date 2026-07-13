// 跨模块共享状态：用对象命名空间承载可变状态，避免「ESM 导入绑定不可被重赋值」的运行时错误。
// 仅在本文件内修改 state 的字段，其它模块通过 state.xxx 读取（live binding 自动同步）。
export const state = {
  adminBadge: '博主',
  guestBadges: {},
  cachedUa: '',
  regionCache: '',
};

const scAvatarHashCache = {};

// ===== 纯工具函数 =====

// HTML 转义
export function scEscapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 由昵称推导头像底色（字母头像背景）
export function scAvatarColor(name) {
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
// 再附 d=mp：用户没头像时返回 weavatar 默认人像图（mystery-person），始终是一张圆角图片，不会露出底层彩色框。
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

function scAvatarHash(email) {
  var e = String(email || '').trim().toLowerCase();
  if (!e) return Promise.resolve(null);
  if (scAvatarHashCache[e]) return scAvatarHashCache[e];
  var p = scSha256Hex(e).then(function (h) {
    return h ? ('https://weavatar.com/avatar/' + h + '?s=80&d=mp') : null;
  });
  scAvatarHashCache[e] = p;
  return p;
}

// 渲染后把 <img.sc-avatar-img[data-email]> 异步填上 weavatar 地址（SHA256）。
// 失败时（非安全上下文拿不到 crypto.subtle）保留底层字母头像。
export function scApplyAvatars(scope) {
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

export function scFormatTime(sec) {
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
const scLikedKey = 'sc-liked';
export function scGetLiked() {
  try { return new Set(JSON.parse(localStorage.getItem(scLikedKey) || '[]')); } catch (e) { return new Set(); }
}
export function scIsLiked(id) { return scGetLiked().has(String(id)); }
export function scSetLiked(id, v) {
  var s = scGetLiked();
  if (v) s.add(String(id)); else s.delete(String(id));
  try { localStorage.setItem(scLikedKey, JSON.stringify(Array.from(s))); } catch (e) {}
}

// 设备信息图标（按文本匹配 iconify 图标）
export function scDeviceIcon(kind, text) {
  var t = (text || '').toLowerCase();
  if (kind === 'region') return 'jam:gps';
  if (kind === 'os') {
    if (t.indexOf('windows') >= 0) return 'mdi:microsoft-windows';
    if (t.indexOf('mac') >= 0 || t.indexOf('ios') >= 0) return 'mdi:apple';
    if (t.indexOf('android') >= 0) return 'mdi:android';
    if (t.indexOf('linux') >= 0) return 'mdi:linux';
    return 'mdi:devices';
  }
  if (kind === 'browser') {
    if (t.indexOf('edge') >= 0) return 'logos:microsoft-edge';
    if (t.indexOf('chrome') >= 0) return 'mdi:google-chrome';
    if (t.indexOf('firefox') >= 0) return 'mdi:firefox';
    if (t.indexOf('safari') >= 0) return 'mdi:apple-safari';
    if (t.indexOf('opera') >= 0) return 'mdi:opera';
    return 'mdi:web';
  }
  return 'mdi:help-circle';
}

// ===== 表情包短代码替换用到的纯工具 =====
export function scEscapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function scAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
export function scGetImgSrc(html) {
  try { var d = document.createElement('div'); d.innerHTML = html; var img = d.querySelector('img'); return img ? (img.getAttribute('src') || img.src) : ''; } catch (e) { return ''; }
}
export function scGetFilename(url) {
  return String(url).split('#')[0].split('?')[0].split('/').pop();
}

// ===== 设备信息（UA 与 IP 地区，前端上报，后端 bowser 解析 UA） =====

// 前端异步采集 UA 版本修正
export function scPrefetchUa() {
  try {
    var nav = navigator;
    var ua = nav.userAgent;
    if (nav.userAgentData && typeof nav.userAgentData.getHighEntropyValues === 'function') {
      nav.userAgentData.getHighEntropyValues(['platform', 'platformVersion'])
        .then(function (hv) {
          var platform = nav.userAgentData.platform;
          var pv = (hv && hv.platformVersion) || '';
          var major = parseInt(pv.split('.')[0], 10);
          if (platform === 'Windows' && major >= 13) {
            ua = ua.replace(/Windows NT 10\.0/i, 'Windows NT 11.0');
          } else if (platform === 'macOS' && major >= 11) {
            ua = ua.replace(/Mac OS X 10_[0-9]+_[0-9]+/i, 'Mac OS X ' + pv.replace(/\./g, '_'));
          }
          state.cachedUa = ua;
        })
        .catch(function () { state.cachedUa = nav.userAgent; });
    } else {
      state.cachedUa = ua;
    }
  } catch (e) {
    state.cachedUa = navigator.userAgent;
  }
}

export function scGetUserAgent() {
  return state.cachedUa || navigator.userAgent;
}

// 前端异步获取 IP 归属（xxapi 国内 API 优先，失败降级国际，失败留空）
export function scPrefetchRegion() {
  state.regionCache = '';
  // xxapi 国内 API：返回 address 字段精确到市级，如 "中国江苏省南京市"
  // fetch 必须显式设置 User-Agent 才会被服务端读取
  fetch('https://v2.xxapi.cn/api/ua', {
    cache: 'no-store',
    headers: { 'User-Agent': scGetUserAgent() },
  })
    .then(function (r) { return r && r.ok ? r.json() : null; })
    .then(function (d) {
      if (d && d.code === 200 && d.data && d.data.address) {
        state.regionCache = String(d.data.address).replace(/^中国/, '').replace(/(省|市|自治区|特别行政区)$/, '');
        return;
      }
      // 兜底：vore.top
      return fetch('https://api.vore.top/api/IPdata', { cache: 'no-store' })
        .then(function (r2) { return r2 && r2.ok ? r2.json() : null; })
        .then(function (d2) {
          if (d2 && d2.ipdata) {
            var r3 = d2.ipdata.region || d2.ipdata.info2 || d2.ipdata.info1 || '';
            if (typeof r3 === 'string' && r3) { state.regionCache = r3.replace(/(省|市|自治区|特别行政区)$/, ''); return; }
          }
          return fetch('https://ipapi.co/json/', { cache: 'no-store' })
            .then(function (r3) { return r3 && r3.ok ? r3.json() : null; })
            .then(function (d3) { if (d3 && d3.region) state.regionCache = d3.region; });
        });
    })
    .catch(function () { state.regionCache = ''; });
}

export function getRegion() {
  return state.regionCache;
}
