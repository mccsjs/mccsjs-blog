import { registerInit } from '../registry.js';
import { scPrefetchUa, scPrefetchRegion, scGetUserAgent, getRegion } from './shared.js';
import { scLoadComments } from './render.js';
import { scToggleLike } from './likes.js';
import { scOpenReply } from './reply.js';
import { scInitAdmin, scAdminAuthHeader } from './admin.js';
import { scInitEmoji } from './emoji.js';

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

export function initSelfComments() {
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
        region: getRegion() || undefined,
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
    scInitAdmin(root, apiUrl, postId);
}

registerInit('self-comments', initSelfComments);
