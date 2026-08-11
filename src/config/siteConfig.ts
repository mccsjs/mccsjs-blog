// 站点配置（原 api /api/settings 导出，纯静态化后在此维护）
export const siteConfig = {
  title: 'mccsjs',
  // 站点正式域名，决定全站 canonical/og:url/sitemap/robots 的绝对地址。
  // 留空时回退 SITE_URL 环境变量，两者皆空为 localhost。
  url: 'https://blog.mccsjs.cn',
  description: '一个使用 Astro构建的个人博客',
  // 站点图标（favicon/logo/OG 图共用）：src/assets 图片
  favicon: 'images/favicon.svg',
  siteStartDate: '2023-01-22',
  postsPerPage: 9,
  // SEO：站点级 keywords（<meta name="keywords">，可留空）
	keywords: [
		"mccsjs",
		"AI",
		"Astro",
		"博客",
		"hexo",
		"静态博客",
	],
  // SEO：每篇文章构建期生成 1200×630 OG 分享图（satori + sharp）
  generateOgImages: true,
  // 友链页 markdown 区块
  linkMarkdown: '',
  // hero（src/assets/images）
  heroImage: 'images/hero.webp',
  // 管理员（关于页标识）
  // 分类与标签：不再手写配置，由文章 frontmatter 自动聚合（见 utils/data.ts 的 getCategories/getTags）
  // 站长资料（首页侧栏资料卡）：avatar 留空则用名称首字母
  author: {
    name: 'mccsjs',
    bio: '分享技术，记录生活',
    avatar: '',
  },
  // 首页 hero 社交图标栏：JSON 数组 [{icon, href}]，icon 为 simpleicons 名或完整 URL；留空则隐藏
  titleIcons: '',
} as const;
