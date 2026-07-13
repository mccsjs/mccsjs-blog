import { scIsLiked, scSetLiked } from './shared.js';

function scSetLikeCount(btn, n) {
  var countEl = btn.querySelector('.sc-like-count');
  if (n > 0) {
    if (!countEl) { countEl = document.createElement('span'); countEl.className = 'sc-like-count'; btn.appendChild(countEl); }
    countEl.textContent = n;
  } else if (countEl) {
    countEl.remove();
  }
}

export function scToggleLike(root, apiUrl, postId, btn) {
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
