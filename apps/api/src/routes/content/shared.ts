import type { DB } from '../../db'
import { siteSettings } from '@blog/db'
import { eq } from 'drizzle-orm'
import { type SettingKey } from '@blog/shared'

// 绝不随设置接口返回 / 空值表示「不修改（保留原值）」的敏感字段
export const SECRET_KEYS = ['adminPassword', 'mailApiKey', 'mailGatewayToken', 'mailSmtpPass']

// 把关系查询结果转换成前端期望的形状：tags 取实际标签对象
export function shapePost(p: any) {
  const { tags, ...rest } = p
  return { ...rest, tags: (tags ?? []).map((t: any) => t.tag ?? t) }
}

// Drizzle 抛 DrizzleQueryError，"UNIQUE" 在 cause.message 里
export function isUniqueError(e: any): boolean {
  return /UNIQUE/i.test(`${e?.message ?? ''} ${e?.cause?.message ?? ''}`)
}

// 读取单条站点设置（博主身份相关配置）
export async function getSiteSetting(db: DB, key: string): Promise<string> {
  const row = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1)
  return row[0]?.value ?? ''
}
