import type { App } from '../app'
import { runFriendAutoCheck } from '../utils/friend-check'
import { refreshAllFeeds } from '../utils/feed'

// 平台 Cron 触发端点：serverless 环境无常驻进程，定时任务改为 HTTP 端点由外部调度
export function registerCronRoutes(app: App) {
  const cronSecret = process.env.CRON_SECRET
  const authorized = (headers: Headers) => {
    if (!cronSecret) return true // 未配置 CRON_SECRET 时放行（仅本地 dev 用）
    const auth = headers.get('authorization') || ''
    return auth === `Bearer ${cronSecret}`
  }

  app.post('/api/cron/friend-check', async ({ headers, set }) => {
    if (!authorized(headers)) {
      set.status = 401
      return { error: 'unauthorized' }
    }
    await runFriendAutoCheck()
    return { ok: true, task: 'friend-check' }
  })

  app.post('/api/cron/rss-refresh', async ({ headers, set }) => {
    if (!authorized(headers)) {
      set.status = 401
      return { error: 'unauthorized' }
    }
    const result = await refreshAllFeeds()
    return { ok: true, task: 'rss-refresh', ...result }
  })
}
