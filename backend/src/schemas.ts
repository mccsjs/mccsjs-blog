import { z } from 'zod'

export const postListInclude = { author: true, category: true, tags: true } as const

export const postCreateSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/i, 'slug 只能包含字母、数字和连字符').optional(),
  content: z.string().min(1),
  excerpt: z.string().default(''),
  coverImage: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().url().nullable().optional()
  ),
  published: z.boolean().optional(),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).optional(),
})

export const postUpdateSchema = postCreateSchema.partial().omit({ slug: true })

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/i, 'slug 只能包含字母、数字和连字符'),
})

export const tagSchema = categorySchema

export const defaultSettings = {
  siteTitle: 'My Blog',
  siteDescription: '一个使用 Astro + React + Tailwind CSS 构建的现代博客',
  siteLogo: '',
  favicon: '',
  icp: '',
  footerText: '',
  siteStartDate: '',
  footerTechInfo: '',
  postsPerPage: '10',
  twikooEnvId: '',
  imgbedUrl: '',
  imgbedToken: '',
  fontCssUrl: '',
  fontFamily: '',
  backgroundImage: '',
  heroImage: '',
  linkMarkdown: '',
  showMotto: 'true',
  mottoTitle: '格言🧬',
  mottoText: '代码如水，逻辑如山；以热爱为引，赴一场与世界的对话。\n这是被称作工程师的人们的故事，是无数个深夜里未竟的旅途。',
  mottoCtaText: '前往了解作者',
  mottoCtaUrl: '/about/',
  mottoCtaTarget: '_self',
  footerBadges: JSON.stringify([
    { title: '框架 Astro', href: 'https://astro.build', img: 'https://img.shields.io/badge/Frame-Astro-7eb8d6?style=flat&logo=astro' },
    { title: '样式 Tailwind CSS', href: 'https://tailwindcss.com', img: 'https://img.shields.io/badge/Style-Tailwind-7eb8d6?style=flat&logo=tailwindcss' },
    { title: '后端 ElysiaJS + Bun', href: 'https://elysiajs.com', img: 'https://img.shields.io/badge/Backend-Elysia%2FBun-d4b896?style=flat&logo=bun' },
    { title: '源码托管于 GitHub', href: 'https://github.com/mccsjs/mccsjs-blog', img: 'https://img.shields.io/badge/Source-GitHub-d4b896?style=flat&logo=github' },
  ]),
} as const

export type SettingKey = keyof typeof defaultSettings

export const settingKeys = Object.keys(defaultSettings) as SettingKey[]

export const settingsUpdateSchema = z.object(
  Object.fromEntries(settingKeys.map((key) => [key, z.string().optional()])) as {
    [K in SettingKey]: z.ZodOptional<z.ZodString>
  }
)

export const collectSchema = z.object({
  type: z.enum(['pageview', 'duration', 'event']).default('pageview'),
  url: z.string().min(1),
  referrer: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  visitor_id: z.string().optional().nullable(),
  duration: z.number().int().nonnegative().optional(),
  article_id: z.string().optional().nullable(),
  event_name: z.string().optional().nullable(),
  event_data: z.any().optional(),
})

export const visitorLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  keyword: z.string().optional(),
  path: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export const menuSchema = z.object({
  label: z.string().min(1),
  href: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  type: z.enum(['NAV', 'FOOTER', 'GROUP']),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
  target: z.string().optional().nullable(),
})

export const friendTypeSchema = z.object({
  name: z.string().min(1).max(50),
  sort: z.number().int().default(0),
  isVisible: z.boolean().default(true),
})

export const friendSchema = z.object({
  name: z.string().min(1).max(50),
  url: z.string().min(1).max(255),
  description: z.string().max(500).default(''),
  avatar: z.string().max(500).default(''),
  screenshot: z.string().max(500).default(''),
  sort: z.number().int().min(1).max(10).default(5),
  isInvalid: z.boolean().default(false),
  recommended: z.boolean().default(false),
  typeId: z.string().nullable().optional(),
  rssUrl: z.preprocess((val) => (val === '' ? null : val), z.string().url().nullable().optional()),
})
