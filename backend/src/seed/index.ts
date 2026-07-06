import { prisma } from '../db';
import { logger } from '../utils/logger';

export async function seedDefaultMenus() {
  const existing = await prisma.menu.findFirst({ where: { type: 'NAV' } });
  if (existing) return;

  const defaults = [
    { label: '首页', href: '/',        icon: '🏠', sortOrder: 0 },
    { label: '文章', href: '/posts',   icon: '📝', sortOrder: 1 },
    { label: '归档', href: '/archive', icon: '📦', sortOrder: 2 },
    { label: '标签', href: '/tags',    icon: '🏷️', sortOrder: 3 },
    { label: '分类', href: '/categories', icon: '📂', sortOrder: 4 },
  ];

  for (const item of defaults) {
    await prisma.menu.create({ data: { ...item, type: 'NAV', visible: true } });
  }

  logger.info('[Seed] 默认导航菜单已初始化', { items: defaults.map(d => d.label) });
}

export async function seedDefaultAggregateMenus() {
  // 每次启动都重新同步聚合菜单内容
  await prisma.menu.deleteMany({
    where: { OR: [{ label: '我的网站' }, { label: '友情链接' }] },
  });

  // 创建分组 1：我的网站
  const group1 = await prisma.menu.create({
    data: { label: '我的网站', type: 'GROUP', visible: true, sortOrder: 0 },
  });
  const children1 = [
    { label: '个人主页', href: '/',        icon: 'lucide:home', sortOrder: 0 },
    { label: '博客',   href: '/posts', icon: 'lucide:file-text', sortOrder: 1 },
  ];
  for (const item of children1) {
    await prisma.menu.create({
      data: { ...item, type: 'GROUP', visible: true, parentId: group1.id },
    });
  }

  // 创建分组 2：友情链接
  const group2 = await prisma.menu.create({
    data: { label: '友情链接', type: 'GROUP', visible: true, sortOrder: 1 },
  });
  const children2 = [
    { label: 'Astro',  href: 'https://astro.build',       icon: 'lucide:globe', sortOrder: 0, target: '_blank' },
    { label: 'Elysia', href: 'https://elysiajs.com',      icon: 'lucide:zap', sortOrder: 1, target: '_blank' },
    { label: 'Prisma', href: 'https://prisma.io',        icon: 'lucide:database', sortOrder: 2, target: '_blank' },
    { label: 'Tailwind', href: 'https://tailwindcss.com', icon: 'lucide:palette', sortOrder: 3, target: '_blank' },
  ];
  for (const item of children2) {
    await prisma.menu.create({
      data: { ...item, type: 'GROUP', visible: true, parentId: group2.id },
    });
  }

  logger.info('[Seed] 默认聚合菜单已初始化', { groups: ['我的网站', '友情链接'] });
}

export async function seedDefaultFriends() {
  const existing = await prisma.friend.findFirst();
  if (existing) return;

  const type = await prisma.friendType.create({
    data: { name: '技术伙伴', sort: 10, isVisible: true },
  });

  const defaults = [
    { name: 'Astro',       url: 'https://astro.build',       description: '现代静态站点生成器',             avatar: 'https://astro.build/assets/press/astro-icon-dark.png' },
    { name: 'Elysia',     url: 'https://elysiajs.com',     description: '高性能 Bun Web 框架',             avatar: 'https://elysiajs.com/assets/elysia.svg' },
    { name: 'Prisma',      url: 'https://prisma.io',        description: '下一代 Node.js ORM',                avatar: 'https://prisma.io/images/apple-touch-icon.png' },
    { name: 'Tailwind CSS', url: 'https://tailwindcss.com', description: '实用优先的 CSS 框架',                avatar: 'https://tailwindcss.com/favicons/apple-touch-icon.png' },
  ];

  for (const item of defaults) {
    await prisma.friend.create({ data: { ...item, typeId: type.id } });
  }

  logger.info('[Seed] 默认友链已初始化', { count: defaults.length });
}
