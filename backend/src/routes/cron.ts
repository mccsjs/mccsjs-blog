import type { App } from '../app'
import { runFriendAutoCheck } from '../utils/friend-check'
import { refreshAllFeeds } from '../utils/feed'

// 平台 Cron 触发端点：serverless 环境无常驻进程，定时任务改为 HTTP 端点由外部调度
export function registerCronRoutes(app: App) {
  const cronSecret = process.env.CRON_SECRET
  // 鉴权兼容多种调用方式：
  // 1) Authorization: Bearer <secret>（标准）
  // 2) ?cron_secret=<secret>（EdgeOne Schedules 只能发 JSON body / query，无法自定义 header）
  // 3) body: { "secret": "<secret>" }
  const authorized = async (headers: Headers, request: Request): Promise<boolean> => {
    if (!cronSecret) return true // 未配置 CRON_SECRET 时放行（仅本地 dev 用）
    const auth = headers.get('authorization') || ''
    if (auth === `Bearer ${cronSecret}`) return true
    const url = new URL(request.url)
    if (url.searchParams.get('cron_secret') === cronSecret) return true
    try {
      const ct = headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const body = await request.clone().json()
        if (body?.secret === cronSecret) return true
      }
    } catch { /* ignore */ }
    return false
  }

  app.post('/api/cron/friend-check', async ({ headers, request, set }) => {
    if (!(await authorized(headers, request))) {
      set.status = 401
      return { error: 'unauthorized' }
    }
    await runFriendAutoCheck()
    return { ok: true, task: 'friend-check' }
  })

  app.post('/api/cron/rss-refresh', async ({ headers, request, set }) => {
    if (!(await authorized(headers, request))) {
      set.status = 401
      return { error: 'unauthorized' }
    }
    const result = await refreshAllFeeds()
    return { ok: true, task: 'rss-refresh', ...result }
  })
}
