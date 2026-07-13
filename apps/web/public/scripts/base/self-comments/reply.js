import { scEscapeHtml, getRegion, scGetUserAgent } from './shared.js';
import { scInitEmoji } from './emoji.js';
import { scIsAdminLoggedIn, scGetAdminInfo, scApplyAdminToForm, scAdminAuthHeader } from './admin.js';
import { scLoadComments } from './render.js';

export function scOpenReply(root, apiUrl, postId, btn) {
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
    try { localStorage.setItem('sc-user', JSON.stringify({ author: rauth, email: remail, website: rweb })); } catch (e2) {}
    fetch(apiUrl + '/api/comments', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, scAdminAuthHeader()),
      body: JSON.stringify({ postId: postId, parentId: id, author: rauth, email: remail, website: rweb || undefined, content: rcontent, ua: scGetUserAgent(), region: getRegion() || undefined }),
    })
      .then(function (r) { if (!r.ok) return r.json().then(function (d) { throw new Error(d && d.error ? d.error : '提交失败'); }); return r.json(); })
      .then(function () { box.hidden = true; box.innerHTML = ''; box.dataset.open = '0'; scLoadComments(root, apiUrl, postId, root._scPage || 1); })
      .catch(function (err) { rtip.textContent = (err && err.message) || '提交失败，请稍后重试'; rtip.className = 'sc-tip sc-tip-error'; })
      .finally(function () { submitBtn.disabled = false; });
  });
}
