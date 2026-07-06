import { Request } from 'bun';

/**
 * 从 Request 中解析客户端 IP
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

/**
 * 基于 IP + UA 生成稳定 visitorId（用于去重）
 */
export function visitorIdHash(ip: string | null, ua: string): string {
  const raw = `${ip || 'unknown'}|${ua || ''}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * 解析 User-Agent 中的操作系统信息
 */
export function parseOs(ua: string): string | null {
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua) && !/android/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS';
  return null;
}

/**
 * 解析 User-Agent 中的浏览器信息
 */
export function parseBrowser(ua: string): string | null {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome\//i.test(ua) && !/safari\//i.test(ua)) return 'Chrome';
  if (/safari\//i.test(ua)) return 'Safari';
  if (/msie|trident/i.test(ua)) return 'IE';
  return null;
}

/**
 * 综合解析客户端信息（IP + UA → 地理位置 + 系统 + 浏览器）
 * 需要 process.env.XXAPI_TOKEN 和 process.env.XXAPI_SK（可选）
 */
const XXAPI_TOKEN = process.env.XXAPI_TOKEN || '';

export async function resolveClientInfo(ip: string | null, ua: string) {
  let country: string | null = null;
  let region: string | null = null;
  let city: string | null = null;
  let isp: string | null = null;

  if (ip && XXAPI_TOKEN) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch('https://v2.xxapi.cn/api/ip/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + XXAPI_TOKEN,
        },
        body: JSON.stringify({ ip, type: 'json' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (resp.ok) {
        const result = await resp.json() as any;
        if (result.code === 200 && result.data) {
          country = result.data.country || null;
          region = result.data.region || null;
          city = result.data.city || null;
          isp = result.data.isp || null;
        }
      }
    } catch {
      // 静默失败，不影响主流程
    }
  }

  return {
    ip,
    ua,
    country,
    region,
    city,
    isp,
    os: parseOs(ua),
    browser: parseBrowser(ua),
  };
}

/**
 * 记录访客日志（如果当天已有相同 visitorId 则跳过）
 */
export async function maybeLogVisitor(request: Request, page: string, prisma: any) {
  try {
    const ip = getClientIp(request);
    const ua = request.headers.get('user-agent') || '';
    const visitorId = visitorIdHash(ip, ua);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await prisma.visitorLog.findFirst({
      where: {
        visitorId,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    if (!existing) {
      const info = await resolveClientInfo(ip, ua);
      await prisma.visitorLog.create({
        data: {
          ...info,
          page,
          visitedAt: new Date(),
        },
      });
    }
  } catch (e) {
    console.error('[访客日志] 记录失败', e);
  }
}
