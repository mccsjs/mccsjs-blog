import type { App } from '../app'

// 图床上传代理
// 管理端文章编辑器插入图片 / 拖拽 / 粘贴图片时，调用本路由将文件转发到用户自建的
// Cloudflare-ImgBed（D:\新建文件夹\CloudFlare-ImgBed），由图床完成存储后把公开访问 URL 回传。
// 鉴权 Token 只存于后端 SiteSetting（imgbedToken），不落浏览器，避免泄露。
export function registerImgbedRoutes(app: App) {
  app.post('/api/imgbed/upload', async ({ request, prisma, user, set }) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    // 读取图床配置
    const settings = await prisma.siteSetting.findMany()
    const map = new Map(settings.map((s) => [s.key, s.value]))
    const imgbedUrl = (map.get('imgbedUrl') ?? '').trim()
    const imgbedToken = (map.get('imgbedToken') ?? '').trim()
    if (!imgbedUrl || !imgbedToken) {
      set.status = 400
      return { error: '图床未配置：请在「系统设置 → 图床设置」填写图床地址与 API Token' }
    }

    // 解析上传文件
    const form = await request.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      set.status = 400
      return { error: 'No file provided' }
    }

    // 允许图片与视频类型，分别限制大小（视频放宽到 50MB）
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-m4v']
    const isImage = imageTypes.includes(file.type)
    const isVideo = videoTypes.includes(file.type)
    if (!isImage && !isVideo) {
      set.status = 400
      return { error: '仅支持 jpeg / png / webp / gif 图片，或 mp4 / webm / ogg / mov 视频' }
    }
    const maxBytes = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxBytes) {
      set.status = 400
      return { error: isVideo ? '视频不能超过 50MB' : '图片不能超过 5MB' }
    }

    // 组装图床上传地址：保留用户在地址里填的 query（如 uploadChannel=cfr2），并强制 returnFormat=full
    let target: URL
    try {
      target = new URL(imgbedUrl)
    } catch {
      set.status = 400
      return { error: '图床地址格式不正确' }
    }
    const base = target.pathname.replace(/\/+$/, '')
    target.pathname = `${base}/upload`.replace(/\/{2,}/g, '/')
    target.searchParams.set('returnFormat', 'full')

    // 转发到图床（Token 走 Bearer，multipart body 原样透传）
    const upstream = await fetch(target.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${imgbedToken}` },
      body: form,
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      set.status = 502
      return { error: `图床上传失败 (${upstream.status}): ${text.slice(0, 200)}` }
    }

    let data: unknown
    try {
      data = await upstream.json()
    } catch {
      set.status = 502
      return { error: '图床返回格式异常' }
    }

    const item = Array.isArray(data) ? data[0] : (data as Record<string, unknown>)
    const url = (item?.publicUrl as string) || (item?.src as string)
    if (!url) {
      set.status = 502
      return { error: '图床未返回媒体地址' }
    }

    return { url }
  }, { auth: true })
}
