// EdgeOne Pages Node Functions catch-all
// 挂载 Elysia WinterTC handler（backend 生产环境导出 default.fetch）
import app from '../dist/index.mjs'

export async function onRequest(ctx: { request: Request }): Promise<Response> {
  return app.fetch(ctx.request)
}

export default {
  fetch(request: Request): Promise<Response> {
    return app.fetch(request)
  },
}
