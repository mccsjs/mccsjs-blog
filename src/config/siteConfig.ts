// 站点配置（原 api /api/settings 导出，纯静态化后在此维护）
import avatarImg from '../assets/img/ico.jpg';
import faviconImg from '../assets/img/lemon.png';

export const siteConfig = {
  title: 'mccsjs',
  // 站点正式域名，决定全站 canonical/og:url/sitemap/robots 的绝对地址。
  // 留空时回退 SITE_URL 环境变量，两者皆空为 localhost。
  url: 'https://mccsjs.cn',
  description: '一个使用 Astro构建的个人博客',
  // 站点图标（favicon/logo/OG 图共用）：src/assets 图片
  favicon: faviconImg,
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
    bio: '记录生活',
    avatar: avatarImg,
    // 侧栏资料卡社交图标：{ name, url, icon }
    // icon 支持：内置名 github/wechat/qq/bilibili/email/rss/twitter；
    // 或本地图片路径 /images/social/xxx.svg；或完整 URL
    socials: [
      { name: 'GitHub', url: 'https://github.com/mccsjs', icon: 'line-md:github-twotone' },
      { name: '微信', url: '#', icon: 'selfhst:wechat' },
      { name: 'QQ', url: 'https://qm.qq.com/q/OgwOvLXbSc', icon: 'thesvg-color:qq' },
      { name: 'Bilibili', url: 'https://space.bilibili.com/209190096', icon: 'thesvg-color:bilibili' },
      { name: '邮箱', url: 'mailto:3505591664@qq.com', icon: 'material-icon-theme:email' },
    ],
  },
  // 首页 hero 社交图标栏：JSON 数组 [{icon, href}]，icon 为 simpleicons 名或完整 URL；留空则隐藏
  titleIcons: '',
  // 侧栏公告卡：域名信息（逐行展示，label 后接可点击域名）
  announcementLinks: [
    { label: '主域名', url: 'https://mccsjs.cn' },
    // { label: 'vercel', url: 'https://hexo.seln.cn' },
    { label: '博客1.0', url: 'https://sych.eu.org' },
    { label: '博客2.0', url: 'https://hexo.seln.cn' },
  ],
  // 侧栏公告卡附加正文（支持简单 HTML），可选；不填则不显示
  announcement: '',
} as const;
