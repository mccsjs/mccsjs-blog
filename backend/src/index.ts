import { app } from './app'
import { registerContentRoutes } from './routes/content'
import { registerVisitorRoutes } from './routes/visitor'
import { registerMenuRoutes } from './routes/menus'
import { registerFriendRoutes } from './routes/friends'
import { seedDefaultMenus, seedDefaultAggregateMenus, seedDefaultFriends } from './seed'
import { scheduleFriendAutoCheck } from './utils/friend-check'
import { scheduleRssRefresh } from './utils/feed'

app.get('/', () => ({ status: 'ok', service: 'elysiajs-blog' }))
app.get('/health', () => ({ status: 'ok' }))

registerContentRoutes(app)
registerVisitorRoutes(app)
registerMenuRoutes(app)
registerFriendRoutes(app)

app.listen(process.env.PORT || 4000)

console.log(`🦊 Backend running at ${app.server?.hostname}:${app.server?.port}`)

// 初始化默认导航菜单
seedDefaultMenus()
seedDefaultAggregateMenus()
seedDefaultFriends()
scheduleFriendAutoCheck()
scheduleRssRefresh()

export type { App } from './app'
