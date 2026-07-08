// 内容变更后触发前端（博客）重新部署
// 通过 EdgeOne Pages 的 deploy webhook 实现：POST 该 URL 即触发一次重建，
// 构建时会重新从 api.seln.cn 拉取最新数据生成静态页。
//
// 关键设计：
// - 仅在生产环境（NODE_ENV==='production'）触发，避免本地开发误触线上重建
// - 15 秒内多次保存只触发一次，防止编辑时连发多个 build 把构建队列挤爆
// - fire-and-forget，失败时仅记录日志，绝不影响主接口返回

let lastTrigger = 0
const DEDUPE_MS = 15_000

export function triggerDeploy() {
  if (process.env.NODE_ENV !== 'production') return
  const url = process.env.DEPLOY_WEBHOOK_URL
  if (!url) return

  const now = Date.now()
  if (now - lastTrigger < DEDUPE_MS) return
  lastTrigger = now

  fetch(url, { method: 'POST' })
    .then(() => console.log('[deploy webhook] blog rebuild triggered'))
    .catch((e) => console.error('[deploy webhook] trigger failed:', e?.message || e))
}
