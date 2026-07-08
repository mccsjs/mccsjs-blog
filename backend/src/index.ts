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

// 本地开发：常驻监听 + 初始化默认数据 + 启动定时任务
// 生产 / Serverless：不监听，改为导出 fetch handler（平台 Cron 打 /api/cron/* 端点触发定时任务）
if (process.env.NODE_ENV !== 'production') {
  app.listen(process.env.PORT || 4000)
  console.log(`🦊 Backend running at ${app.server?.hostname}:${app.server?.port}`)

  // 初始化默认导航菜单
  seedDefaultMenus()
  seedDefaultAggregateMenus()
  seedDefaultFriends()
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
