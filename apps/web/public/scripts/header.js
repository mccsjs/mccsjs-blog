(function() {
  if (window.__headerInit) return;
  window.__headerInit = true;

  let _navAbort = null;

  // ========= 模块级：抽屉关闭 =========
  function closeDrawer() {
    var mobileOverlay = document.getElementById('nav-mobile-overlay');
    var mobileDrawer = document.getElementById('nav-mobile-drawer');
    if (mobileOverlay) mobileOverlay.classList.remove('open');
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  // 事件委托：捕获阶段拦截 .nav-mobile-link 点击，在 swup 之前关闭抽屉
  document.addEventListener('click', function(e) {
    var link = e.target.closest('.nav-mobile-link');
    if (link) closeDrawer();
  }, true);

  // swup 页面切换后强制关闭抽屉
  function ensureSwupHook() {
    if (!window.swup || !window.swup.hooks) return;
    if (window.__headerSwupHook && window.__headerSwupHook === window.swup) return;
    window.swup.hooks.on('page:view', closeDrawer);
    window.__headerSwupHook = window.swup;
  }
  ensureSwupHook();
  if (!window.swup || !window.swup.hooks) {
    var swupAttempts = 0;
    var swupTimer = setInterval(function() {
      swupAttempts++;
      if (window.swup && window.swup.hooks) {
        clearInterval(swupTimer);
        ensureSwupHook();
      } else if (swupAttempts >= 40) {
        clearInterval(swupTimer);
      }
    }, 50);
  }

  // ========= initNav：导航核心逻辑 =========
  function initNav() {
    if (_navAbort) _navAbort.abort();
    _navAbort = new AbortController();
    var signal = _navAbort.signal;

    var topRow = document.getElementById('nav-top-row');
    var hoverBorder = document.getElementById('nav-hover-border');
    var navCenter = document.getElementById('nav-center');
    var mobileToggle = document.getElementById('nav-mobile-toggle');
    var mobileOverlay = document.getElementById('nav-mobile-overlay');
    var mobileDrawer = document.getElementById('nav-mobile-drawer');
    var mobileClose = document.getElementById('nav-mobile-close');

    if (!topRow) return;

    // ===== 1. 滚动收缩 =====
    var SCROLL_IN = 80;
    var SCROLL_OUT = 40;
    var scrolled = false;

    function onScroll() {
      var y = window.scrollY;
      if (!scrolled && y > SCROLL_IN) {
        scrolled = true;
        topRow.classList.add('scrolled');
      } else if (scrolled && y < SCROLL_OUT) {
        scrolled = false;
        topRow.classList.remove('scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true, signal: signal });
    onScroll();

    // ===== 2. hover 滑动边框 =====
    var _hoverAbort = null;

    function cleanupHover() {
      if (_hoverAbort) { _hoverAbort.abort(); _hoverAbort = null; }
    }

    function initHover() {
      cleanupHover();
      if (!hoverBorder || !navCenter) return;

      _hoverAbort = new AbortController();
      var sig = _hoverAbort.signal;

      var navItems = navCenter.querySelectorAll(':scope > .nav-dropdown-wrapper, :scope > .nav-link-item');

      function positionBorder(item) {
        var rect = item.getBoundingClientRect();
        var cRect = navCenter.getBoundingClientRect();
        var width = rect.width + 'px';
        var height = rect.height + 'px';
        var left = (rect.left - cRect.left) + 'px';
        var top = ((cRect.height - rect.height) / 2) + 'px';

        hoverBorder.style.width = width;
        hoverBorder.style.height = height;
        hoverBorder.style.left = left;
        hoverBorder.style.top = top;
      }

      function detectActive() {
        var path = window.location.pathname.replace(/\/$/, '') || '/';
        var hasActive = false;
        navItems.forEach(function(item) {
          var link = item.querySelector('a, button[data-dropdown-trigger]');
          if (!link) return;
          var href = (link.getAttribute('href') || '').replace(/\/$/, '') || '/';
          if (href === path || (path !== '/' && href !== '/' && path.startsWith(href))) {
            item.classList.add('nav-item-active');
            hasActive = true;
            positionBorder(item);
          } else {
            item.classList.remove('nav-item-active');
          }
        });
        if (hasActive) {
          navCenter.classList.add('nav-has-active');
        } else {
          navCenter.classList.remove('nav-has-active');
        }
      }

      navItems.forEach(function(item) {
        item.addEventListener('mouseenter', function() { positionBorder(item); }, { signal: sig });
      });

      navCenter.addEventListener('mouseleave', function() {
        var active = navCenter.querySelector('.nav-item-active');
        if (active) {
          positionBorder(active);
        } else {
          hoverBorder.style.opacity = '0';
        }
      }, { signal: sig });

      navCenter.addEventListener('mouseenter', function() {
        hoverBorder.style.opacity = '1';
      }, { signal: sig });

      detectActive();
      document.addEventListener('astro:page-load', detectActive, { signal: sig });
    }

    initHover();

    // ===== 3. 下拉菜单 =====
    var openDropdown = null;

    topRow.querySelectorAll('[data-dropdown-trigger]').forEach(function(btn) {
      var wrapper = btn.closest('.nav-dropdown-wrapper');

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (openDropdown && openDropdown !== wrapper) {
          openDropdown.classList.remove('open');
        }

        if (wrapper.classList.contains('open')) {
          wrapper.classList.remove('open');
          openDropdown = null;
        } else {
          wrapper.classList.add('open');
          openDropdown = wrapper;
        }
      }, { signal: signal });
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.nav-dropdown-wrapper')) {
        if (openDropdown) {
          openDropdown.classList.remove('open');
          openDropdown = null;
        }
      }
    }, { signal: signal });

    // ===== 4. 移动端抽屉 =====
    function openDrawer() {
      if (mobileOverlay) mobileOverlay.classList.add('open');
      if (mobileDrawer) mobileDrawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    if (mobileToggle) mobileToggle.addEventListener('click', openDrawer, { signal: signal });
    if (mobileClose) mobileClose.addEventListener('click', closeDrawer, { signal: signal });
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeDrawer, { signal: signal });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeDrawer();
    }, { signal: signal });

    // ===== 5. 图标菜单下拉 =====
    var aggTrigger = document.getElementById('nav-aggregate-trigger');
    var aggDropdown = document.getElementById('nav-aggregate-dropdown');
    if (aggTrigger && aggDropdown) {
      var aggTimer = 0;

      function openAggDropdown() {
        clearTimeout(aggTimer);
        aggDropdown.classList.add('open');
      }

      function closeAggDropdown() {
        aggTimer = window.setTimeout(function() {
          aggDropdown.classList.remove('open');
        }, 150);
      }

      function toggleAggDropdown(e) {
        e.preventDefault();
        e.stopPropagation();
        if (aggDropdown.classList.contains('open')) {
          aggDropdown.classList.remove('open');
        } else {
          aggDropdown.classList.add('open');
        }
      }

      aggTrigger.addEventListener('pointerdown', toggleAggDropdown, { signal: signal });
      aggTrigger.addEventListener('mouseenter', openAggDropdown, { signal: signal });
      aggTrigger.addEventListener('mouseleave', closeAggDropdown, { signal: signal });
      aggDropdown.addEventListener('mouseenter', openAggDropdown, { signal: signal });
      aggDropdown.addEventListener('mouseleave', closeAggDropdown, { signal: signal });

      document.addEventListener('click', function(e) {
        if (!aggTrigger.contains(e.target) && !aggDropdown.contains(e.target)) {
          aggDropdown.classList.remove('open');
        }
      }, { signal: signal });
    }
  }

  initNav();
  document.addEventListener('astro:page-load', initNav);

  // ========= 主题切换 =========
  // 确保 iconify-icon 已加载
  if (!customElements.get('iconify-icon')) {
    var iconScript = document.createElement('script');
    iconScript.src = 'https://code.iconify.design/3/3.1.0/iconify.min.js';
    iconScript.defer = true;
    document.head.appendChild(iconScript);
  }

  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      var root = document.documentElement;
      var isDark = root.classList.contains('dark');

      if (!document.startViewTransition) {
        // 不支持 View Transitions API 的浏览器，直接切换
        if (isDark) {
          root.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        } else {
          root.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        }
        return;
      }

      // 使用 View Transitions API 硬件加速无缝切换
      document.startViewTransition(function() {
        if (isDark) {
          root.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        } else {
          root.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        }
      });
    });
  }

  // ========= 搜索 =========
  var API_BASE = window.__API_URL__ || ''
  var API_PREFIX = API_BASE ? API_BASE + '/api' : '/api'
  var searchAbort = null;
  var searchResults = [];
  var searchActiveIdx = -1;

  var searchOverlay = document.getElementById('search-overlay');
  var searchInput = document.getElementById('search-input');
  var searchResultsEl = document.getElementById('search-results');
  var searchHint = document.getElementById('search-hint');
  var searchClose = document.getElementById('search-close');
  var searchBtn = document.getElementById('nav-search-btn');

  function openSearch() {
    if (searchOverlay) searchOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function() { if (searchInput) searchInput.focus(); }, 50);
  }

  function closeSearch() {
    if (searchOverlay) searchOverlay.classList.remove('open');
    document.body.style.overflow = '';
    if (searchInput) searchInput.value = '';
    if (searchResultsEl) searchResultsEl.innerHTML = '';
    if (searchHint) searchHint.style.display = '';
    searchResults = [];
    searchActiveIdx = -1;
  }

  if (searchBtn) searchBtn.addEventListener('click', openSearch);
  if (searchClose) searchClose.addEventListener('click', closeSearch);
  if (searchOverlay) {
    searchOverlay.addEventListener('click', function(e) {
      if (e.target === searchOverlay) closeSearch();
    });
  }

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (searchOverlay && searchOverlay.classList.contains('open')) {
        closeSearch();
      } else {
        openSearch();
      }
      return;
    }
    if (!searchOverlay || !searchOverlay.classList.contains('open')) return;
    if (e.key === 'Escape') {
      closeSearch();
    }
  });

  var searchTimer = 0;
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimer);
      searchTimer = window.setTimeout(doSearch, 300);
    });

    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        searchActiveIdx = Math.min(searchActiveIdx + 1, searchResults.length - 1);
        updateActiveItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        searchActiveIdx = Math.max(searchActiveIdx - 1, 0);
        updateActiveItem();
      } else if (e.key === 'Enter' && searchActiveIdx >= 0) {
        e.preventDefault();
        var post = searchResults[searchActiveIdx];
        if (post) {
          closeSearch();
          window.location.href = '/posts/' + post.slug;
        }
      }
    });
  }

  function doSearch() {
    var q = (searchInput && searchInput.value.trim()) || '';
    if (!q) {
      if (searchResultsEl) searchResultsEl.innerHTML = '';
      if (searchHint) searchHint.style.display = '';
      searchResults = [];
      searchActiveIdx = -1;
      return;
    }
    if (searchHint) searchHint.style.display = 'none';

    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();

    fetch(API_PREFIX + '/posts/search?q=' + encodeURIComponent(q), {
      signal: searchAbort.signal,
    })
      .then(function(res) {
        if (!res.ok) return;
        return res.json();
      })
      .then(function(data) {
        if (!data) return;
        searchResults = data;
        searchActiveIdx = -1;
        renderResults(q);
      })
      .catch(function() {});
  }

  function renderResults(q) {
    if (!searchResultsEl) return;
    if (searchResults.length === 0) {
      searchResultsEl.innerHTML = '<div class="search-empty">没有找到相关文章</div>';
      return;
    }

    function escapeHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function highlight(s) {
      var escaped = escapeHtml(s);
      var escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return escaped.replace(new RegExp('(' + escapedQ + ')', 'gi'), '<mark>$1</mark>');
    }

    searchResultsEl.innerHTML = searchResults.map(function(post, i) {
      var activeClass = i === searchActiveIdx ? ' active' : '';
      return '<a href="/posts/' + post.slug + '" class="search-result-item' + activeClass + '" data-idx="' + i + '">' +
        '<div class="search-result-title">' + highlight(post.title) + '</div>' +
        (post.excerpt ? '<div class="search-result-excerpt">' + highlight(post.excerpt) + '</div>' : '') +
        '<div class="search-result-meta">' + new Date(+post.createdAt * 1000).toLocaleDateString('zh-CN') + '</div>' +
        '</a>';
    }).join('');

    searchResultsEl.querySelectorAll('.search-result-item').forEach(function(el) {
      el.addEventListener('click', function() { closeSearch(); });
      el.addEventListener('mouseenter', function() {
        searchActiveIdx = parseInt(el.dataset.idx || '0');
        updateActiveItem();
      });
    });
  }

  function updateActiveItem() {
    if (!searchResultsEl) return;
    searchResultsEl.querySelectorAll('.search-result-item').forEach(function(el, i) {
      if (i === searchActiveIdx) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
    var active = searchResultsEl.querySelector('.search-result-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }
})();
