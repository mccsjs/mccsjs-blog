import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@blog/db'

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type DB = ReturnType<typeof createDb>
