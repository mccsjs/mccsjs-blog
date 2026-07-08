import { app } from './app'
import { registerContentRoutes } from './routes/content'
import { registerVisitorRoutes } from './routes/visitor'
import { registerMenuRoutes } from './routes/menus'
import { registerFriendRoutes } from './routes/friends'
import { registerImgbedRoutes } from './routes/imgbed'
import { registerCronRoutes } from './routes/cron'
import { seedDefaultMenus, seedDefaultAggregateMenus, seedDefaultFriends } from './seed'
import { scheduleFriendAutoCheck } from './utils/friend-check'
import { scheduleRssRefresh } from './utils/feed'

app.get('/', () => ({ status: 'ok', service: 'elysiajs-blog' }))
app.get('/health', () => ({ status: 'ok' }))

registerContentRoutes(app)
registerVisitorRoutes(app)
registerMenuRoutes(app)
registerFriendRoutes(app)
registerImgbedRoutes(app)
registerCronRoutes(app)

// 启动模式判定：
// - 本地开发（NODE_ENV !== production）：常驻监听 + 初始化 + 定时任务
// - 生产常驻（NODE_ENV=production 且 RUN_MODE=server 或设了 PORT）：常驻监听 + 初始化 + 定时任务（node-cron 内部调度）
// - 生产 Serverless（EdgeOne / Cloudflare 等）：不监听，仅导出 fetch handler，定时任务由平台 Cron 打 /api/cron/* 触发
const isServerMode =
  process.env.NODE_ENV === 'production' &&
  (process.env.RUN_MODE === 'server' || !!process.env.PORT)

if (process.env.NODE_ENV !== 'production' || isServerMode) {
  app.listen(process.env.PORT || 4000)
  console.log(`🦊 Backend running at ${app.server?.hostname}:${app.server?.port}`)

  // 初始化默认导航菜单与好友数据（无论本地还是生产常驻都执行一次）
  seedDefaultMenus()
  seedDefaultAggregateMenus()
  seedDefaultFriends()

  // 常驻模式下由 node-cron 内部调度定时任务，不依赖平台 Cron
  scheduleFriendAutoCheck()
  scheduleRssRefresh()
}

// WinterTC 标准 handler（Vercel / Cloudflare Workers / 腾讯 EdgeOne Web 函数通用）
export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}

export type { App } from './app'
