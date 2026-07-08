// Vercel Node.js 函数入口
// 平台以 Node 运行时调用此文件：所有 /api/* 请求都进 Elysia 的 app.handle
// 真正的路由注册、CORS、Prisma 都在 src/index.ts（import 时即执行注册，且 NODE_ENV=production 下不会 listen）
import server from './src/index'

export const config = { runtime: 'nodejs' }

// Vercel Node 函数接收标准 Fetch Request，返回 Fetch Response
export default function handler(request: Request): Promise<Response> {
  return server.fetch(request)
}
