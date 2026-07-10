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
    var isCrossOrigin = COLLECT_URL.indexOf('http') === 0

    // 同域优先 sendBeacon（页面卸载也可靠）；跨域必须用 fetch(keepalive)，
    // 因为 sendBeacon 无法发送 CORS 预检，跨域带 application/json 会静默失败。
    if (!isCrossOrigin && navigator.sendBeacon) {
      navigator.sendBeacon(COLLECT_URL, blob)
    } else {
      fetch(COLLECT_URL, {
        method: 'POST',
        body: blob,
        keepalive: true,
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
      }).catch(function () {})
    }
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
