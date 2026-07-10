import Bowser from 'bowser'

// 轻量工具：slug 生成（替代原 Prisma 版的 generateUniqueSlug，原实现依赖 CRC32）
// 这里用时间 + 随机后缀生成短 slug，保证本地可跑且不引入额外依赖。

function randomSuffix(len = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-龥]+/g, '-') // 保留中文，其余非字母数字替换为连字符
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// 生成基于标题的 slug；若已存在则追加随机后缀
export async function generateUniqueSlug(
  exists: (slug: string) => Promise<boolean>,
  base: string
): Promise<string> {
  let slug = slugify(base) || 'post'
  if (!(await exists(slug))) return slug
  // 已存在，加后缀重试几次
  for (let i = 0; i < 5; i++) {
    const candidate = `${slug}-${randomSuffix(4)}`
    if (!(await exists(candidate))) return candidate
  }
  return `${slug}-${randomSuffix(8)}`
}

// 客户端信息解析（访客日志/评论用）。本地优先用 x-forwarded-for，
// 地域由前端提交时携带（避免 worker 文件系统限制）；OS/浏览器用 bowser 精确解析。
export function getClientIp(c: { req: { header: (k: string) => string | undefined } }): string {
  const xff = c.req.header('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return c.req.header('cf-connecting-ip') ?? 'unknown'
}

export interface ClientInfo {
  os: string | null
  browser: string | null
}

// 用 bowser 解析 UA，得到带版本号的 OS / 浏览器（如 "Windows 11"、"Edge 140.0.0.0"）
export function resolveClientInfo(ua: string): ClientInfo {
  if (!ua) return { os: null, browser: null }
  try {
    const parser = Bowser.getParser(ua)
    const osInfo = parser.getOS()
    const browserInfo = parser.getBrowser()

    let os: string | null = null
    if (osInfo && osInfo.name) {
      const osName = osInfo.name
      // Windows：bowser 给 "NT 10.0"/"NT 11.0"，需提取主版本号（Win11 无 versionName）
      if (/windows/i.test(osName)) {
        const m = /NT\s*(\d+)\.0/i.exec(osInfo.version || '')
        os = m ? `Windows ${m[1]}` : osName
      } else if (osInfo.versionName) {
        os = `${osName} ${osInfo.versionName}`
      } else if (osInfo.version) {
        os = `${osName} ${osInfo.version}`
      } else {
        os = osName
      }
    }

    let browser: string | null = null
    if (browserInfo && browserInfo.name) {
      let name = browserInfo.name
      if (/edge/i.test(name)) name = 'Edge'
      else if (/opera/i.test(name)) name = 'Opera'
      else if (/firefox/i.test(name)) name = 'Firefox'
      else if (/chrome/i.test(name)) name = 'Chrome'
      else if (/safari/i.test(name)) name = 'Safari'
      browser = browserInfo.version ? `${name} ${browserInfo.version}` : name
    }

    return { os, browser }
  } catch {
    return { os: null, browser: null }
  }
}
