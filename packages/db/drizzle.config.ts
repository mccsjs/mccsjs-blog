import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './migrations',
  // D1 迁移通过 `wrangler d1 migrations apply` 执行，这里仅用于 drizzle-kit 类型生成参考
})
