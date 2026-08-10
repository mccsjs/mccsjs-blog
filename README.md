# mccsjsblog

基于 [Astro](https://astro.build) 的纯静态博客。内容以 Markdown 存储，构建时生成静态 HTML，评论接入 Twikoo，统计接入不蒜子，可部署到 GitHub Pages 等任意静态托管。

## 技术栈

- **Astro 7** — 静态站点生成
- **Swup** — SPA 式无刷新页面过渡
- **Tailwind CSS 4** — 样式
- **markdown-it + highlight.js** — 文章渲染与代码高亮
- **Twikoo** — 第三方评论
- **不蒜子 (busuanzi)** — 站点 PV / UV 统计

## 目录结构

```text
/
├── public/                 # 静态资源与全局脚本
├── src/
│   ├── components/
│   │   ├── layout/         # 页面骨架组件（Header / Footer / Breadcrumb / PostCard 等）
│   │   ├── widget/         # 侧栏组件（SiteInfoCard / VisitorStats）
│   │   ├── comment/        # 评论区（TwikooComments）
│   │   └── common/         # 通用组件（CopyrightCard）
│   ├── config/             # 站点配置（siteConfig / commentConfig / friendsConfig / navBarConfig / footerConfig）
│   ├── content/
│   │   └── posts/          # 文章（Markdown，frontmatter 定义元数据）
│   ├── layouts/            # 页面布局
│   ├── pages/              # 路由页面
│   ├── styles/             # 全局样式
│   ├── types/              # TypeScript 类型
│   └── utils/              # 数据访问与工具函数
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

- **写文章**：在 `src/content/posts/` 新增 Markdown 文件，frontmatter 字段见 `src/content.config.ts`。
- **友链**：编辑 `src/config/friendsConfig.ts`。
- **导航菜单**：编辑 `src/config/navBarConfig.ts`。
- **页脚 / 格言**：编辑 `src/config/footerConfig.ts`。
- **评论（Twikoo）**：在 `src/config/commentConfig.ts` 填入你的环境 ID（`envId`）。
- **站点信息**：编辑 `src/config/siteConfig.ts`。

## 部署（GitHub Pages）

推送 `main` / `master` 分支即自动构建部署（见 `.github/workflows/deploy.yml`）。子路径部署时在仓库 Settings → Secrets and variables → Actions 设置：

- `SITE_URL`：站点域名，如 `https://yourname.github.io`
- `ASTRO_BASE`：子路径，如仓库为 `yourname/mccsjsblog` 则填 `/mccsjsblog/`；根路径则留空
