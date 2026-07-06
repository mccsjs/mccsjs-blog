import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
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
        ? [
            process.env.FRONTEND_URL,
            process.env.ADMIN_URL,
          ].filter(Boolean) as string[]
        : true, // 开发环境：反射请求来源，支持所有 localhost 端口
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
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

export type App = typeof app
