import { prisma } from '../db'

const XXAPI_TOKEN = process.env.XXAPI_TOKEN || ''

export async function apiCheck(targetURL: string): Promise<[boolean, number]> {
  const apiURL = 'https://v2.xxapi.cn/api/speed?url=' + encodeURIComponent(targetURL)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const resp = await fetch(apiURL, {
      signal: controller.signal,
      headers: { Authorization: 'Bearer ' + XXAPI_TOKEN },
    })
    clearTimeout(timeout)
    if (!resp.ok) return [false, 0]
    const result = await resp.json() as { code: number; data: string }
    if (result.code !== 200) return [false, 0]
    const latencyStr = result.data.replace('ms', '')
    const latency = parseInt(latencyStr) || 0
    return [true, latency]
  } catch {
    return [false, 0]
  }
}

export async function checkAccessibility(targetURL: string): Promise<[boolean, number, Response | null]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const start = Date.now()
    const resp = await fetch(targetURL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)' },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    const elapsed = Date.now() - start
    const accessible = resp.status >= 200 && resp.status < 400
    return [accessible, elapsed, resp]
  } catch {
    return [false, 0, null]
  }
}

export async function dualCheck(targetURL: string): Promise<[number, number]> {
  const [ok1, lat1] = await apiCheck(targetURL)
  if (ok1 && lat1 > 0) return [0, lat1]

  const [ok2, lat2, _] = await checkAccessibility(targetURL)
  if (ok2) return [0, lat2]

  return [1, lat1 || lat2]
}

// 友链自动测速（可执行函数，供平台 Cron 端点调用）
export async function runFriendAutoCheck() {
  try {
    const friends = await prisma.friend.findMany({ where: { isInvalid: false } })
    if (!friends.length) return
    for (const f of friends) {
      const [accessible, latency] = await dualCheck(f.url)
      await prisma.friend.update({
        where: { id: f.id },
        data: { accessible, latency },
      })
    }
    console.log(`[友链测速] 完成，共 ${friends.length} 个友链`)
  } catch (e) {
    console.error('[友链测速] 失败', e)
  }
}

// 友链自动测速：每天 0 点和 12 点执行（仅本地开发调度，serverless 下由 /api/cron/friend-check 触发）
export function scheduleFriendAutoCheck() {
  const run = () => runFriendAutoCheck()

  const now = new Date()
  const next12 = new Date(now)
  next12.setHours(12, 0, 0, 0)
  const next0 = new Date(now)
  next0.setHours(0, 0, 0, 0)
  next0.setDate(next0.getDate() + 1)
  const delay = now < next12 ? next12.getTime() - now.getTime() : next0.getTime() - now.getTime()

  setTimeout(() => {
    run()
    setInterval(run, 12 * 60 * 60 * 1000)
  }, delay)

  console.log('[友链测速] 已安排定时任务：每天 0:00 / 12:00')
}
