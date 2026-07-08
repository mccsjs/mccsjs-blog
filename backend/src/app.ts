import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { staticPlugin } from '@elysiajs/static'
import { ZodError } from 'zod'
import { auth } from './auth'
import { prisma } from './db'
import { maybeLogVisitor } from './utils/visitor'

const betterAuthPlugin = new Elysia({ name: 'better-auth' })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ headers, set }) {
        const session = await auth.api.getSession({ headers })
        if (!session) {
          set.status = 401
          return { user: null as never, session: null as never }
        }
        return { user: session.user, session: session.session }
      },
    },
  })

export const app = new Elysia()
  .use(
    cors({
      origin: process.env.NODE_ENV === 'production'
        ? (
            [
              process.env.FRONTEND_URL,
              process.env.ADMIN_URL,
              'https://blog.seln.cn',
              'https://ad.seln.cn',
            ].filter(Boolean) as string[]
          )
        : true, // 开发环境：反射请求来源，支持所有 localhost 端口
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  )
  .use(staticPlugin({ prefix: '/uploads', assets: 'uploads' }))
  .use(betterAuthPlugin)
  .derive(() => ({ prisma }))
  .onError(({ code, error, set }) => {
    console.error(`[${code}]`, error)
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Validation failed', issues: error.all || [error.message] }
    }
    if (error instanceof ZodError) {
      set.status = 422
      return { error: 'Validation failed', issues: error.issues }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not found' }
    }
    set.status = 500
    return { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }
  })
  .onBeforeHandle(({ request, path }) => {
    // 异步记录访客日志，不阻塞请求
    maybeLogVisitor(request, path).catch(() => {})
  })

// 仅开发环境挂载 API 文档（Scalar UI）
// 官方已弃用 @elysiajs/swagger，改用 @elysiajs/openapi（provider 默认 scalar）
if (process.env.NODE_ENV !== 'production') {
  app.use(
    openapi({
      provider: 'scalar',
      path: '/docs',
      documentation: {
        info: {
          title: 'MccsjsBlog API',
          version: '1.0.0',
          description: 'MccsjsBlog 后端接口文档（仅开发环境）',
        },
      },
    })
  )
}

export type App = typeof app
