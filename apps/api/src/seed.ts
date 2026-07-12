import { eq, inArray } from 'drizzle-orm'
import { menus, friends, friendTypes, siteSettings } from '@blog/db'
import { defaultSettings, settingKeys } from '@blog/shared'

// 幂等初始化默认数据：导航菜单、聚合菜单、友链、站点设置
export async function seedDefaults(db: any) {
  // 导航菜单（首次插入；已有则按 label 同步为 iconify 图标，避免默认 emoji）
  const nav = await db.select({ id: menus.id }).from(menus).where(eq(menus.type, 'NAV')).limit(1)
  const navDefaults = [
    { label: '首页', href: '/', icon: 'material-symbols:home-outline-rounded', sortOrder: 0 },
    { label: '文章', href: '/posts', icon: 'solar:book-broken', sortOrder: 1 },
    { label: '留言', href: '/comments', icon: 'boxicons:message', sortOrder: 2 },
    { label: '友链', href: '/link', icon: 'line-md:link', sortOrder: 3 },
    { label: '关于', href: '/about', icon: 'ix:about', sortOrder: 4 },
  ]
  if (nav.length === 0) {
    for (const item of navDefaults) {
      await db.insert(menus).values({ id: crypto.randomUUID(), ...item, type: 'NAV', visible: true })
    }
  } else {
    for (const item of navDefaults) {
      await db.update(menus).set({ icon: item.icon }).where(eq(menus.label, item.label))
    }
  }

  // 聚合菜单（每次重建，保证图标菜单内容最新）
  await db.delete(menus).where(inArray(menus.label, ['我的网站', '友情链接']))
  const g1 = await db.insert(menus).values({ id: crypto.randomUUID(), label: '我的网站', type: 'GROUP', visible: true, sortOrder: 0 }).returning()
  for (const item of [
    { label: '个人主页', href: '/', icon: 'lucide:home', sortOrder: 0 },
    { label: '博客', href: '/posts', icon: 'lucide:file-text', sortOrder: 1 },
  ]) {
    await db.insert(menus).values({ id: crypto.randomUUID(), ...item, type: 'GROUP', visible: true, parentId: g1[0].id })
  }

  const g2 = await db.insert(menus).values({ id: crypto.randomUUID(), label: '友情链接', type: 'GROUP', visible: true, sortOrder: 1 }).returning()
  for (const item of [
    { label: 'Astro', href: 'https://astro.build', icon: 'lucide:globe', sortOrder: 0, target: '_blank' },
    { label: 'Hono', href: 'https://hono.dev', icon: 'lucide:zap', sortOrder: 1, target: '_blank' },
    { label: 'Cloudflare', href: 'https://cloudflare.com', icon: 'lucide:cloud', sortOrder: 2, target: '_blank' },
    { label: 'Tailwind', href: 'https://tailwindcss.com', icon: 'lucide:palette', sortOrder: 3, target: '_blank' },
  ]) {
    await db.insert(menus).values({ id: crypto.randomUUID(), ...item, type: 'GROUP', visible: true, parentId: g2[0].id })
  }

  // 友链（仅首次）
  const f = await db.select({ id: friends.id }).from(friends).limit(1)
  if (f.length === 0) {
    const type = await db.insert(friendTypes).values({ id: crypto.randomUUID(), name: '技术伙伴', sort: 10, isVisible: true }).returning()
    const defaults = [
      { name: 'Astro', url: 'https://astro.build', description: '现代静态站点生成器', avatar: 'https://astro.build/assets/press/astro-icon-dark.png', sort: 4 },
      { name: 'Hono', url: 'https://hono.dev', description: 'Ultrafast web framework', avatar: 'https://hono.dev/images/logo.svg', sort: 3 },
      { name: 'Cloudflare', url: 'https://cloudflare.com', description: '连接云', avatar: 'https://www.cloudflare.com/favicon.ico', sort: 2 },
      { name: 'Tailwind CSS', url: 'https://tailwindcss.com', description: '实用优先的 CSS 框架', avatar: 'https://tailwindcss.com/favicons/apple-touch-icon.png', sort: 1 },
    ]
    for (const item of defaults) {
      await db.insert(friends).values({ id: crypto.randomUUID(), ...item, typeId: type[0].id })
    }
  }

  // 站点设置（仅首次，逐条插入避免 D1 单语句变量上限）
  const s = await db.select({ id: siteSettings.id }).from(siteSettings).limit(1)
  if (s.length === 0) {
    for (const key of settingKeys) {
      await db.insert(siteSettings).values({ id: crypto.randomUUID(), key, value: String(defaultSettings[key]) })
    }
  }
}
