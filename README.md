# mccsjsblog

基于 [Astro](https://astro.build) 的**纯静态**博客。文章以 Markdown 书写，构建期生成静态 HTML，通过 Swup 实现 SPA 式无刷新翻页；评论与留言板接入 Twikoo，统计接入不蒜子，可部署到 GitHub Pages 等任意静态托管。

> 本项目为纯静态站点（SSG），无后端、无数据库。所有页面在 `astro build` 时预渲染为 HTML。

## 技术栈

- **Astro 7** — 静态站点生成（SSG），`output: "static"`
- **React 19** — 仅留言板（`/comments`）等交互组件使用，经 `@astrojs/react` 集成
- **Swup**（`@swup/astro`）— SPA 式页面过渡
- **Tailwind CSS 4**（Vite 插件）— 样式
- **Astro Markdown + Shiki 双主题** — 文章渲染与代码高亮（`@astrojs/markdown-satteri`）
- **Lenis** — 平滑滚动
- **Twikoo** — 第三方评论 + 留言板
- **不蒜子 (busuanzi)** — 站点 PV / UV 统计
- **satori + sharp** — 文章 OG 分享图生成
- **iconify-icon / lucide-react** — 图标

## 功能特性

- **文章**：Markdown 内容集合（`src/content/posts/`），支持分类、标签、封面、摘要；封面构建期本地化（远程图下载并压成 webp 存 `public/covers`）。
- **评论**：每篇文章底部 Twikoo 评论区。
- **留言板**：独立 `/comments` 页，Twikoo 驱动，支持表情包（OwO，`public/owo.json`）。
- **友链**：`/link` 页，数据来自 `friendsConfig.ts`；未设置截图的友链自动用 mshots 生成截图。
- **统计**：不蒜子站点 PV / UV，文章页阅读数。
- **RSS / Sitemap**：美化输出，构建期生成。
- **OG 图**：基于 satori 的文章分享卡片。

## 目录结构

```text
/
├── public/                 # 静态资源、全局脚本、表情包 owo.json
├── src/
│   ├── components/
│   │   ├── chat/           # 留言板（React 组件 + Twikoo 客户端 + 表情）
│   │   ├── comment/        # 评论区（TwikooComments.astro）
│   │   ├── common/         # 通用组件（ImageWrapper / CopyrightCard）
│   │   ├── layout/         # 页面骨架（Header / Footer / Breadcrumb / PostCard / FloatingBar …）
│   │   └── widget/         # 侧栏组件（SiteInfoCard / VisitorStats）
│   ├── config/             # 站点配置（见下）
│   ├── content/posts/      # 文章（Markdown）
│   ├── layouts/            # 页面布局（BaseLayout）
│   ├── pages/              # 路由页面（含 comments / link / fc 等）
│   ├── styles/             # 全局样式
│   ├── types/              # TypeScript 类型
│   └── utils/              # 数据访问与工具（data.ts / coverLocalize.ts / markdown.ts）
├── astro.config.mjs
└── package.json
```

## 开发

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # 输出到 dist/
pnpm preview    # 本地预览构建产物
```

## 内容与配置

- **写文章**：在 `src/content/posts/` 新增 `.md` 文件。frontmatter 字段使用缩写约定：

  | 字段 | 含义 | 说明 |
  | --- | --- | --- |
  | `title` | 标题 | 必填 |
  | `slug` | 路径 | 可选，默认取文件名 |
  | `date` | 日期 | 必填 |
  | `fl` | 分类 | 可选，从文章自动聚合，无需手写配置 |
  | `tags` | 标签 | 数组，自动聚合 |
  | `zy` | 摘要 | 可选 |
  | `fm` | 封面 | 可选，远程图会本地化 |
  | `zz` | 作者 | 可选 |
  | `cg` | 草稿 | 可选，`true` 则不发布 |

  > 分类 / 标签不再手写配置，新增时只需在文章里写 `fl:` / `tags:`，即自动生成对应页面。

- **站点配置**：`src/config/` 下的 `siteConfig.ts`、`commentConfig.ts`、`friendsConfig.ts`、`navBarConfig.ts`、`footerConfig.ts`、`messageConfig.ts`、`fmImageConfig.ts`。
- **表情包**：`public/owo.json`（OwO 格式）。
- **统一数据出口**：`src/utils/data.ts`（`getPosts` / `getFriends` / `getCategories` / `getTags` 等）。

## 部署（GitHub Pages）

推送 `main` 分支即自动构建部署（见 `.github/workflows/deploy.yml`）。子路径部署时在仓库 **Settings → Secrets and variables → Actions → Variables** 设置：

- `SITE_URL`：站点域名，如 `https://yourname.github.io`
- `ASTRO_BASE`：子路径，如仓库为 `yourname/mccsjsblog` 则填 `/mccsjsblog/`；根路径则留空

`astro.config.mjs` 的 `base` 读取 `ASTRO_BASE`，部署产物含 `.nojekyll`。
