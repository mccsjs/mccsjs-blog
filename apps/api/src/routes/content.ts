import { Hono } from 'hono'
import { postsRouter } from './content/posts'
import { categoriesRouter } from './content/categories'
import { tagsRouter } from './content/tags'
import { commentsRouter } from './content/comments'
import { settingsRouter } from './content/settings'

export function contentRoutes() {
  const app = new Hono()
  // 各资源路由拆到 routes/content/* 子模块，统一挂到 /api 前缀下，
  // 注册的相对路径（如 /posts）与挂载前缀拼接后与原 routes 完全一致。
  app.route('/api', postsRouter())
  app.route('/api', categoriesRouter())
  app.route('/api', tagsRouter())
  app.route('/api', commentsRouter())
  app.route('/api', settingsRouter())
  return app
}
