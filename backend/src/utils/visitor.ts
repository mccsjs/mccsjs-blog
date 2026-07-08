import { z } from 'zod'
import { prisma } from '../db'
import { collectSchema } from '../schemas'

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]!.trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return null
}

export function visitorIdHash(ip: string | null, ua: string): string {
  const raw = `${ip || 'unknown'}|${ua || ''}`
  let h = 0
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

export const VISITOR_LOG_DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 分钟去重

export async function maybeLogVisitor(request: Request, page: string) {
  // 仅记录公开页面 GET 请求
  if (request.method !== 'GET') return
  if (page.startsWith('/api/') || page.startsWith('/uploads/') || page.startsWith('/_') || page.includes('.')) return

  const ip = getClientIp(request)
  const ua = request.headers.get('user-agent') || ''
  const referrer = request.headers.get('referer') || null
  const vid = visitorIdHash(ip, ua)

  // 去重：同一访客同一页面 5 分钟内不重复记录
  try {
    const since = new Date(Date.now() - VISITOR_LOG_DEDUP_WINDOW_MS)
    const recent = await prisma.visitorLog.findFirst({
      where: { visitorId: vid, page, createdAt: { gte: since } },
      select: { id: true },
    })
    if (recent) return
  } catch {
    // 去重查询失败不影响主流程
  }

  // 复用已有解析逻辑获取 os/browser
  const { region, os, browser } = await resolveClientInfo(ip, ua)

  try {
    await prisma.visitorLog.create({
      data: { visitorId: vid, ip: ip || undefined, page, region, os, browser, referrer: referrer || undefined },
    })
  } catch {
    // 写入失败不影响主流程
  }
}

export async function resolveClientInfo(ip: string | null, ua: string) {
  const result = { region: null as string | null, os: null as string | null, browser: null as string | null }
  if (!ip) return result

  try {
    const res = await fetch(`https://ip-api.com/json/${ip}?lang=zh-CN`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json() as { status: string; regionName?: string }
      if (data.status === 'success' && data.regionName) {
        result.region = data.regionName
      }
    }
  } catch {
    // ignore
  }

  result.os = parseOs(ua)
  result.browser = parseBrowser(ua)
  return result
}

export function parseOs(ua: string): string | null {
  if (!ua) return null
  if (/Windows NT 10\.0/.test(ua) && /Windows 11/.test(ua)) return 'Windows 11'
  if (/Windows NT 10\.0/.test(ua)) return 'Windows 10'
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1'
  if (/Windows NT 6\.2/.test(ua)) return 'Windows 8'
  if (/Windows NT 6\.1/.test(ua)) return 'Windows 7'
  if (/Macintosh/.test(ua) && /Mac OS X (\d+)[._](\d+)/.test(ua)) {
    const [, major, minor] = /Mac OS X (\d+)[._](\d+)/.exec(ua) || []
    return `macOS ${major}.${minor}`
  }
  if (/Android/.test(ua)) {
    const m = /Android (\d+(?:\.\d+)?)/.exec(ua)
    return m ? `Android ${m[1]}` : 'Android'
  }
  if (/iPhone|iPad|iPod/.test(ua)) {
    const m = /OS (\d+)[._](\d+)/.exec(ua)
    return m ? `iOS ${m[1]}.${m[2]}` : 'iOS'
  }
  if (/Linux/.test(ua)) return 'Linux'
  return null
}

export function parseBrowser(ua: string): string | null {
  if (!ua) return null
  const m =
    /(Edge|Edg|OPR|Opera|Chrome|Safari|Firefox)\/([\d.]+)/.exec(ua)
  if (!m) return null
  const name = m[1]
  const version = m[2]
  if (name === 'Edg' || name === 'Edge') return `Edge ${version}`
  if (name === 'OPR' || name === 'Opera') return `Opera ${version}`
  if (name === 'Chrome') return `Chrome ${version}`
  if (name === 'Safari') return `Safari ${version}`
  if (name === 'Firefox') return `Firefox ${version}`
  return `${name} ${version}`
}

// CRC32 实现（标准 IEEE 多项式 0xEDB88320）
const crc32Table = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

export function crc32Hex(input: string): string {
  let crc = 0xffffffff
  for (let i = 0; i < input.length; i++) {
    crc = crc32Table[(crc ^ input.charCodeAt(i)) & 0xff]! ^ (crc >>> 8)
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

// 基于 CRC32 + HEX 生成唯一 slug；若冲突则追加随机后缀重试
export async function generateUniqueSlug(prisma: any, seed?: string): Promise<string> {
  const base = seed || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let slug = crc32Hex(base)
  let attempts = 0
  while (attempts < 10) {
    const existing = await prisma.post.findUnique({ where: { slug } })
    if (!existing) return slug
    attempts++
    slug = crc32Hex(`${base}-${attempts}-${Math.random().toString(36).slice(2, 6)}`)
  }
  // 兜底：追加时间戳
  return `${crc32Hex(base)}-${Date.now().toString(36)}`
}

export async function recordVisitFromCollect(body: z.infer<typeof collectSchema>, request: Request) {
  const ip = getClientIp(request)
  const ua = body.user_agent || request.headers.get('user-agent') || ''
  const vid = body.visitor_id || visitorIdHash(ip, ua)
  const page = body.url.replace(/^https?:\/\/[^/]+/, '') || '/'
  const referrer = body.referrer || request.headers.get('referer') || null

  // 去重：5 分钟内同一访客同一页面不重复记录
  try {
    const since = new Date(Date.now() - VISITOR_LOG_DEDUP_WINDOW_MS)
    const recent = await prisma.visitorLog.findFirst({
      where: { visitorId: vid, page, createdAt: { gte: since } },
      select: { id: true },
    })
    if (recent) return
  } catch { /* ignore */ }

  const { region, os, browser } = await resolveClientInfo(ip, ua)

  try {
    await prisma.visitorLog.create({
      data: {
        visitorId: vid,
        ip: ip || undefined,
        page,
        region,
        os,
        browser,
        referrer: referrer || undefined,
      },
    })
  } catch { /* ignore */ }
}
