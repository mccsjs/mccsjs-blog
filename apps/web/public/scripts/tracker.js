/**
 * 访客追踪脚本
 * 自动追踪 PV（页面浏览），兼容 swup 页面切换
 * 通过 sendBeacon / fetch keepalive 发送到 /api/collect
 *
 * 配置方式（按优先级）：
 * 1. window.__API_URL__ — 页面中通过 <script> 标签注入
 * 2. 相对路径 /api/collect — 默认，适合前后端同域名部署
 */
(function () {
  if (window.__trackerInit) return
  window.__trackerInit = true

  var API_URL = (window.__API_URL__ || '').replace(/\/+$/, '')
  var COLLECT_URL = API_URL ? API_URL + '/api/collect' : '/api/collect'

  // 生成访客 ID（基于 localStorage 持久化）
  function getVisitorId() {
    var key = '__vid'
    var vid = localStorage.getItem(key)
    if (!vid) {
      vid = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem(key, vid)
    }
    return vid
  }

  function getPageUrl() {
    return location.pathname + location.search
  }

  function getReferrer() {
    if (document.referrer && document.referrer.includes(location.hostname)) {
      return document.referrer
    }
    return document.referrer || ''
  }

  // 文章阅读量自增：当前路径为 /posts/:slug 时，向 /api/posts/:slug/view 发 beacon
  // 对齐旧博客「真实阅读才 +1」的语义；同一次会话内同一篇文章只计一次，避免 Swup 初始加载重复触发
  var lastViewSlug = null
  function getArticleSlug(path) {
    var m = path.match(/^\/posts\/([^/?#]+)/)
    return m ? m[1] : null
  }
  function maybeCountView() {
    var slug = getArticleSlug(getPageUrl())
    if (!slug) {
      lastViewSlug = null // 离开文章页后重置，便于再次进入时计数
      return
    }
    if (slug === lastViewSlug) return
    lastViewSlug = slug
    var viewUrl = (API_URL ? API_URL + '/api/posts/' : '/api/posts/') + slug + '/view'
    if (navigator.sendBeacon) {
      navigator.sendBeacon(viewUrl, new Blob([JSON.stringify({})], { type: 'application/json' }))
    } else {
      fetch(viewUrl, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(function () {})
    }
  }

  function send(type, extra) {
    var vid = getVisitorId()
    var payload = {
      type: type,
      url: getPageUrl(),
      referrer: getReferrer(),
      user_agent: navigator.userAgent,
      visitor_id: vid,
    }
    if (extra) {
      Object.assign(payload, extra)
    }

    var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })

    if (navigator.sendBeacon) {
      navigator.sendBeacon(COLLECT_URL, blob)
    } else {
      fetch(COLLECT_URL, {
        method: 'POST',
        body: blob,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(function () {})
    }

    // 文章阅读量自增（仅在真实浏览文章页时触发）
    maybeCountView()
  }

  // 首屏加载时发送
  send('pageview')

  // swup 页面切换后发送
  function setupSwupTracker() {
    if (!window.swup || !window.swup.hooks) return
    if (window.__swupTrackerAttached && window.__swupTrackerAttached === window.swup) return
    window.__swupTrackerAttached = window.swup

    window.swup.hooks.on('visit:start', function () {
      send('duration', { duration: 0 })
    })

    window.swup.hooks.on('page:view', function () {
      send('pageview')
    })
  }

  setupSwupTracker()
  if (!window.swup || !window.swup.hooks) {
    var attempts = 0
    var timer = setInterval(function () {
      attempts++
      if (window.swup && window.swup.hooks) {
        clearInterval(timer)
        setupSwupTracker()
      } else if (attempts >= 50) {
        clearInterval(timer)
      }
    }, 50)
  }
})()
