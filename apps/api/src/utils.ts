import Bowser from 'bowser'

// slug 自动生成规则：
// - 不填写：按 CRC32 + hex 自动生成（crc32(title + 时间戳) → 8 位小写十六进制）
// - 填写：严格使用用户填写的值（唯一性校验在路由层处理，绝不二次改写）

// CRC32 查表（IEEE 802.3 标准多项式 0xEDB88320）
const CRC_TABLE: number[] = (() => {
  const t = new Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(input: string): number {
  // 按 UTF-8 字节计算，与通用 crc32 工具（zlib 等）语义一致
  const bytes = new TextEncoder().encode(input)
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// 返回 8 位小写十六进制字符串（如 "a1b2c3d4"）
export function crc32Hex(input: string): string {
  return crc32(input).toString(16).padStart(8, '0')
}

// 不填写 slug 时：CRC32 + hex 自动生成。输入含时间戳以保证唯一；
// 极小概率碰撞时追加自增序号（仍为 hex 风格）。
export async function generateCrc32Slug(
  exists: (slug: string) => Promise<boolean>,
  base: string
): Promise<string> {
  const seed = `${base || 'post'}-${Date.now()}`
  const slug = crc32Hex(seed)
  if (!(await exists(slug))) return slug
  for (let i = 1; i < 10; i++) {
    const candidate = crc32Hex(`${seed}-${i}`)
    if (!(await exists(candidate))) return candidate
  }
  return crc32Hex(`${seed}-${Math.floor(Math.random() * 0xffff)}`)
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
