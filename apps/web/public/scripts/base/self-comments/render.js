import { scEscapeHtml, scAvatarColor, scApplyAvatars, scDeviceIcon, scFormatTime, scIsLiked, state } from './shared.js';
import { scApplyOwo } from './emoji.js';

// 单条评论渲染（root=true 为根评论，false 为回复）
// 楼中楼模型（对齐 cwd/twikoo）：根评论 + 其下扁平回复列表（最多 2 层）。
// 每条评论（含嵌套回复）都带「回复」按钮；回复任意层时新评论挂到根评论下，
// 并标注「回复 @直接父作者」。
export function scRenderComment(c, isRoot) {
  var name = c.author || '匿名';
  var initial = (name.trim().charAt(0) || '?').toUpperCase();
  var color = scAvatarColor(name);
  // 邮箱头像（weavatar）：有邮箱时叠加在字母头像之上；src 由 scApplyAvatars 异步填充 SHA256 哈希后的地址，
  // 缺真实头像时 weavatar 返回默认人像图（d=mp），加载成功即为圆角图片，不会露出底层彩色框。
  var avatarImg = c.email ? '<img class="sc-avatar-img" data-email="' + scEscapeHtml(c.email) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '';
  var nameHtml = scEscapeHtml(name);
  if (c.website) {
    nameHtml = '<a href="' + scEscapeHtml(c.website) + '" target="_blank" rel="nofollow noopener noreferrer">' + scEscapeHtml(name) + '</a>';
  }
  var badge = '';
  if (c.isAdmin) badge += '<span class="sc-badge sc-badge-admin">' + scEscapeHtml(state.adminBadge) + '</span>';
  // 自定义访客徽章：若该邮箱在管理员设置的映射中、且非管理员（管理员已显示博主徽章，不重复叠加），追加独立徽章
  var gb = (!c.isAdmin) && state.guestBadges[(c.email || '').trim().toLowerCase()];
  if (gb) badge += '<span class="sc-badge sc-badge-guest">' + scEscapeHtml(gb) + '</span>';
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
      '<div class="sc-avatar">' + scEscapeHtml(initial) + avatarImg + '</div>' +
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

export function scRenderComments(root, apiUrl, postId, payload) {
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

export function scLoadComments(root, apiUrl, postId, page) {
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
