// 腾讯云 EdgeOne Web 函数（Node.js 运行时）入口
// EdgeOne Web 函数约定入口为 `handleRequest(request, context)`，接收标准 Fetch Request 并返回 Fetch Response
// 同时导出 default.fetch 以兼容 WinterTC 风格调用
import server from './src/index'

export async function handleRequest(request: Request, context: unknown): Promise<Response> {
  return server.fetch(request)
}

export default { fetch: handleRequest }
