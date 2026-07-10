import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { prisma } from './db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'sqlite', usePlural: false }),
  secret: process.env.BETTER_AUTH_SECRET || 'change-me',
  baseURL: process.env.BASE_URL || 'http://localhost:4000',
  emailAndPassword: { enabled: true },
  trustedOrigins: process.env.NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL || 'http://localhost:4321',
        process.env.ADMIN_URL || 'http://localhost:5173',
      ].filter(Boolean)
    : ['*'],
  // 个人博客：仅允许注册一个管理员账户
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          const count = await prisma.user.count()
          if (count > 0) {
            throw new Error('本站仅允许注册一个管理员账户，如需重置请联系站长')
          }
        },
      },
    },
  },
})
