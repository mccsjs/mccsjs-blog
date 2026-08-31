// 统一数据访问层：纯静态化后所有内容/配置从本地集合与配置读取，不再调用 api。
import { getCollection, type CollectionEntry } from 'astro:content';
import { siteConfig } from '../config/siteConfig';
import { fmImageConfig } from '../config/fmImageConfig';
import { commentConfig } from '../config/commentConfig';
import { friendsConfig, type FriendConfigItem } from '../config/friendsConfig';
import { navBarConfig } from '../config/navBarConfig';
import { footerConfig } from '../config/footerConfig';
import type { Post, Category, Tag, MenuItem, SiteSettings } from '../types';

export { siteConfig } from '../config/siteConfig';

export interface FriendItem {
  id: string;
  name: string;
  url: string;
  description: string;
  avatar: string;
  screenshot: string;
  accessible: number;
  latency: number;
  type?: string;
  recommended?: boolean;
  speedtest?: boolean;
}

// 随机封面：seed 哈希 → 第一个 API + seed 参数（同文同图，客户端失败时按序切换）
function getSeedHash(seed: string): number {
  return Math.abs(seed.split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0));
}
function appendSeedParam(apiUrl: string, hash: number): string {
  if (!hash) return apiUrl;
  const sep = apiUrl.includes('?') ? '&' : '?';
  return `${apiUrl}${sep}v=${hash}`;
}
function pickCoverApi(seed: string): string {
  const { randomCoverImage } = fmImageConfig;
  if (!randomCoverImage.enable || !randomCoverImage.apis.length) return '';
  return appendSeedParam(randomCoverImage.apis[0], getSeedHash(seed));
}

function toUnixSeconds(value: string, fallback: string): string {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? String(Math.floor(timestamp / 1000)) : fallback;
}

function mapPost(entry: CollectionEntry<'posts'>): Post {
  const d = entry.data;
  const slug = d.slug || entry.id;
  // 封面：显式 fm='api' 或未配置 fm 时走随机 API；否则用配置值
  const rawFm = (d.fm || '').trim();
  const coverImage = rawFm ? (rawFm === 'api' ? pickCoverApi(slug) : rawFm) : pickCoverApi(slug);
  const categoryName = (d.fl || '').trim();
  const category: Category = categoryName
    ? { id: categoryName, name: categoryName, slug: categoryName }
    : { id: '', name: '', slug: '' };
  const tagList: Tag[] = (d.tags || []).map((ts: string) => {
    const name = ts.trim();
    return { id: name, name, slug: name };
  });
  const createdAt = String(Math.floor(new Date(d.date).getTime() / 1000));
  const updatedAt = d.updated ? toUnixSeconds(d.updated, createdAt) : createdAt;
  return {
    id: entry.id,
    slug,
    title: d.title,
    content: entry.body ?? '',
    excerpt: d.zy ?? '',
    coverImage,
    published: !d.cg,
    views: 0,
    createdAt,
    updatedAt,
    digest: entry.digest,
    author: { id: '', name: d.zz || siteConfig.adminName || 'admin', email: '', avatar: '' },
    category,
    tags: tagList,
  };
}

export async function getAllPosts(): Promise<Post[]> {
  const entries = await getCollection('posts', ({ data }) => !data.cg && !data.hide);
  const posts = entries.map(mapPost);
  posts.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  return posts;
}

// 路由用：包含 hide 文章（可直达链接），仅排除 cg 草稿
export async function getAllPostsForRoutes(): Promise<Post[]> {
  const entries = await getCollection('posts', ({ data }) => !data.cg);
  return entries.map(mapPost);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const entries = await getCollection('posts');
  const entry = entries.find((e) => (e.data.slug || e.id) === slug);
  return entry ? mapPost(entry) : null;
}

export async function getCategories(): Promise<Category[]> {
  const posts = await getAllPosts();
  const count: Record<string, number> = {};
  for (const p of posts) {
    const name = p.category?.name?.trim();
    if (name) count[name] = (count[name] || 0) + 1;
  }
  return Object.keys(count).map((name) => ({ id: name, name, slug: name, count: count[name] }));
}

export async function getTags(): Promise<Tag[]> {
  const posts = await getAllPosts();
  const count: Record<string, number> = {};
  for (const p of posts) {
    for (const t of p.tags) {
      const name = t.name.trim();
      if (name) count[name] = (count[name] || 0) + 1;
    }
  }
  return Object.keys(count).map((name) => ({ id: name, name, slug: name }));
}

export function getFriends(): FriendItem[] {
  return (friendsConfig as FriendConfigItem[]).map((f) => ({
    id: f.name,
    name: f.name,
    url: f.url,
    description: f.description,
    avatar: f.avatar,
    screenshot: f.screenshot || (f.url ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(f.url)}?w=400&h=300` : ''),
    accessible: 0,
    latency: 0,
    type: f.type,
    recommended: f.recommended,
    speedtest: f.speedtest,
  }));
}

export function getMenus(type: string): MenuItem[] {
  // 图标菜单（GROUP）：分组 + 子项，Header 左上角 logo 按钮展开
  if (type === 'GROUP') {
    return navBarConfig.group.map((g) => ({
      id: g.id,
      label: g.label,
      href: null,
      icon: null,
      type,
      parentId: null,
      sortOrder: 0,
      visible: true,
      target: null,
      createdAt: '',
      updatedAt: '',
      children: (g.children || []).map((c) => ({
        id: c.id,
        label: c.label,
        href: c.href,
        icon: c.icon,
        type,
        parentId: g.id,
        sortOrder: 0,
        visible: true,
        target: c.target || null,
        createdAt: '',
        updatedAt: '',
        children: [],
      })),
    }));
  }
  const list = type === 'NAV' ? navBarConfig.nav : type === 'FOOTER' ? footerConfig.menus : [];
  return list.map((m) => ({
    id: m.id,
    label: m.label,
    href: m.href,
    icon: m.icon,
    type,
    parentId: null,
    sortOrder: m.sortOrder ?? 0,
    visible: true,
    target: null,
    createdAt: '',
    updatedAt: '',
    children: [],
  }));
}

export function getSiteSettings(): SiteSettings {
  return {
    siteTitle: siteConfig.title,
    siteDescription: siteConfig.description,
    siteLogo: siteConfig.favicon.src, // favicon 兼作站点图标
    favicon: siteConfig.favicon.src,
    icp: siteConfig.icp,
    footerText: siteConfig.footerText,
    siteStartDate: siteConfig.siteStartDate,
    postsPerPage: String(siteConfig.postsPerPage),
    twikooEnvId: commentConfig.envId,
    fontCssUrl: siteConfig.fontCssUrl,
    fontFamily: siteConfig.fontFamily,
    backgroundImage: siteConfig.backgroundImage,
    heroType: siteConfig.heroType,
    heroImage: siteConfig.heroImage,
    heroVideo: siteConfig.heroVideo,
    friendCircleApi: siteConfig.friendCircleApi,
    linkMarkdown: siteConfig.linkMarkdown,
    showMotto: footerConfig.showMotto,
    mottoTitle: footerConfig.mottoTitle,
    mottoText: footerConfig.mottoText,
    mottoCtaText: footerConfig.mottoCtaText,
    mottoCtaUrl: footerConfig.mottoCtaUrl,
    mottoCtaTarget: footerConfig.mottoCtaTarget,
    footerBadges: footerConfig.footerBadges,
    adminName: siteConfig.adminName,
    adminEmail: siteConfig.adminEmail,
    adminBadge: siteConfig.adminBadge,
    keywords: siteConfig.keywords.join(', '),
    generateOgImages: siteConfig.generateOgImages,
  };
}
