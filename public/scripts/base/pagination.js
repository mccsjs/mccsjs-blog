// 分页：posts 页 SSR 分页条交互。document 委托，SWUP 切页后依然有效
(function () {
  var currentPage = 1;

  function getPerPage() {
    var pager = document.getElementById('posts-pagination');
    var n = pager && Number(pager.dataset.perPage);
    return n || 9;
  }

  function getState() {
    var grid = document.getElementById('posts-grid');
    var pager = document.getElementById('posts-pagination');
    if (!grid || !pager) return null;
    var items = grid.querySelectorAll('.post-item');
    if (!items.length) return null;
    var total = Math.max(1, Math.ceil(items.length / getPerPage()));
    return { grid: grid, pager: pager, items: items, total: total };
  }

  var ACTIVE = ['border-[rgb(var(--primary))]', 'bg-[rgb(var(--primary))]', 'text-white'];
  var DISABLED = ['opacity-40', 'pointer-events-none'];

  function setPage(page) {
    var st = getState();
    if (!st) return;
    var perPage = getPerPage();
    currentPage = Math.min(Math.max(1, page), st.total);
    var start = (currentPage - 1) * perPage;
    var end = start + perPage;
    for (var k = 0; k < st.items.length; k++) {
      st.items[k].classList.toggle('hidden', Number(st.items[k].dataset.index) < start || Number(st.items[k].dataset.index) >= end);
    }
    var btns = st.pager.querySelectorAll('button');
    for (var b = 0; b < btns.length; b++) {
      var btn = btns[b];
      ACTIVE.forEach(function (c) { btn.classList.remove(c); });
      DISABLED.forEach(function (c) { btn.classList.remove(c); });
      btn.disabled = false;
      var bp = Number(btn.dataset.page);
      var nav = btn.dataset.nav;
      if (nav === 'prev') {
        if (currentPage === 1) { btn.disabled = true; DISABLED.forEach(function (c) { btn.classList.add(c); }); }
      } else if (nav === 'next') {
        if (currentPage === st.total) { btn.disabled = true; DISABLED.forEach(function (c) { btn.classList.add(c); }); }
      } else if (!isNaN(bp) && bp === currentPage) {
        ACTIVE.forEach(function (c) { btn.classList.add(c); });
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#posts-pagination button');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    var nav = btn.dataset.nav;
    if (nav === 'prev') setPage(currentPage - 1);
    else if (nav === 'next') setPage(currentPage + 1);
    else setPage(Number(btn.dataset.page));
  });
})();
