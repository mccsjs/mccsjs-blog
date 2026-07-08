# MccsjsBlog 上线部署指南（EdgeOne Pages · 三域名）

> 适用：博客 `blog.seln.cn` / 管理端 `ad.seln.cn` / 后端 `api.seln.cn`（均已 ICP 备案）
> 生成日期：2026-07-08

---

## 0. 为什么是「控制台」而不是 MCP 连接器

WorkBuddy 已连接的 `edgeone-pages` MCP 连接器有 **硬限制**，无法完成三域名 + 密钥的部署：

| 限制 | 影响 |
|------|------|
| 始终复用**单一项目** `makers-oapuuwnnauns`，无法建多项目/改名 | 三端不能同时走 MCP，否则互相覆盖 |
| **无法设自定义域名** | `blog/ad/api.seln.cn` 都得在控制台绑 |
| **无法设环境变量** | 后端密钥 / 管理端 `VITE_API_URL` 都得在控制台填 |
| `fullstack` 构建**易超时**（error -32001） | 后端不能走 MCP |
| 偶发 `localPath does not exist`（连接器侧瞬断） | 重试无效 |

**结论**：博客（纯静态，无需 env）已用 MCP 上线，但需控制台绑域名；**管理端 + 后端必须走 EdgeOne 控制台**，且三者为独立项目。

---

## 1. 博客 → `blog.seln.cn`（MCP 已上线，仅绑域名）

博客构建产物 `frontend/dist` 已内联 `window.__API_URL__ = "https://api.seln.cn"`，运行期请求正确指向后端。

1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) → **边缘站点 / Pages** → 找到项目 `makers-oapuuwnnauns`（即 mccsjsblog）。
2. **域名管理 / 自定义域名** → 添加 `blog.seln.cn`。
3. 按提示在域名 registrar 加 **CNAME** 解析到控制台给出的目标地址。
4. 等待自动签发 SSL 证书（几分钟）。
5. 访问 `https://blog.seln.cn`，确认首页星空、文章列表、分类/标签/友链正常；DevTools → Network 里接口应发往 `api.seln.cn`。

> 若要重新构建：本地 `PUBLIC_RUNTIME_API_URL=https://api.seln.cn bun run build` 后，用 MCP 重新部署即可（预览 token 约 20 分钟过期，绑域名后无此问题）。

---

## 2. 管理端 → `ad.seln.cn`（控制台新建 Pages 项目，静态 SPA）

1. EdgeOne 控制台 → **Pages** → **新建项目** → 从 Git 仓库导入 → 选 `mccsjs/mccsjs-blog`。
2. 构建配置：
   - **根目录（Root Directory）**：`admin`
   - **安装命令**：`npm install`
   - **构建命令**：`npm run build`（即 `vite build`）
   - **输出目录**：`dist`
   - **Node 版本**：18+（建议 20）
3. **环境变量（构建时注入，`VITE_` 前缀会内联进产物）**：
   - `VITE_API_URL` = `https://api.seln.cn`
4. 部署 → 得到 `*.edgeone.app` 预览地址，自测登录/发文/图床上传。
5. **域名管理** → 绑 `ad.seln.cn`（CNAME + 自动 SSL）。
6. **SPA 刷新兜底**：`admin/dist/404.html` 已复制自 `index.html`，子路由刷新不会 404。

---

## 3. 后端 → `api.seln.cn`（控制台新建 fullstack 项目，Node Functions）

代码已 serverless 化并通过本地验证（`/health`→200、`/api/cron/friend-check`→200）。

1. EdgeOne 控制台 → **Pages** → **新建项目** → 从 Git 导入 → 选 `mccsjs/mccsjs-blog`。
2. 构建配置：
   - **根目录**：`backend`
   - **安装命令**：`npm install`
   - **构建命令**：`npm run build`（esbuild 打包出 `dist/index.mjs`）
   - **输出目录**：`dist`
   - **Node 版本**：18+（建议 20）
3. **环境变量（运行时注入，必填）**：
   | 变量 | 值 |
   |------|-----|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `libsql://mccsjsblog-mccsjs1.aws-ap-northeast-1.turso.io` |
   | `TURSO_AUTH_TOKEN` | `<数据库级 token，见下方说明>` |
   | `BETTER_AUTH_SECRET` | `<随机长串>` |
   | `BETTER_AUTH_URL` | `https://api.seln.cn` |
   | `FRONTEND_URL` | `https://blog.seln.cn` |
   | `ADMIN_URL` | `https://ad.seln.cn` |
   | `CRON_SECRET` | `<定时任务密钥，可选>` |
   | `DEPLOY_WEBHOOK_URL` | `https://pages-api.cloud.tencent.com/v1/webhook/6f3d47bd39617c791d86c2da097dacc0bd3fa064ecb9267ee764d43793b66359`（博客部署钩子；后端在文章/分类/标签/设置变更后 POST 它触发博客重建，实现改内容自动更新首页） |
   | 其他 | 邮件/图床 token 等按需 |
4. **Node Functions**：项目根的 `node-functions/[[...slug]].ts` 会被识别为 catch-all，自动挂载 `dist/index.mjs` 的 WinterTC handler（`export default { fetch }`）。
5. **定时任务**（已在 `backend/edgeone.json` 配置，控制台通常自动读取；如手动建）：
   - 友链检测：`POST /api/cron/friend-check`，`0 */6 * * *`
   - RSS 刷新：`POST /api/cron/rss-refresh`，`0 */3 * * *`
   - 时区 `Asia/Shanghai`；调用鉴权三选一：`Authorization: Bearer <CRON_SECRET>` / query `?cron_secret=<CRON_SECRET>` / JSON body `{ "secret": "<CRON_SECRET>" }`
6. **域名管理** → 绑 `api.seln.cn`。
7. 验证：
   ```bash
   curl https://api.seln.cn/health      # -> ok
   curl https://api.seln.cn/api/settings # -> 200 JSON
   ```

> **Turso 数据库级 token 获取**：Turso 控制台给的是「账户级 API Token」（payload 含 `org_id`），**不能直接连库**。需自助换数据库级 token：
> `POST https://api.turso.tech/v1/organizations/mccsjs1/databases/mccsjsblog/auth/tokens?authorization=full-access`
> （`org=mccsjs1`，`db=mccsjsblog`，`authorization` 填账户级 token）——返回的才是 `TURSO_AUTH_TOKEN`。

---

## 4. 上线后验证清单

- [ ] `blog.seln.cn` 首页/文章/分类/标签/友链正常，Network 接口走 `api.seln.cn`
- [ ] `ad.seln.cn` 能登录、发文、上传图床
- [ ] `api.seln.cn/health` → `ok`；`/api/settings` → 200
- [ ] 定时任务日志无 500（友链检测 / RSS 刷新）

---

## 5. 已修复的坑（勿回退）

| 坑 | 修复（commit `51f3a5e`） |
|----|--------------------------|
| `backend/deploy/.env`（含密钥）被 git 跟踪 | `git rm -r` 移出索引（仅 .gitignore 拦不住已跟踪文件） |
| `node-functions/[[...slug]].ts` 被 Windows 拆成嵌套目录 | 用 Node 脚本生成正确文件名 |
| `esbuild` 未声明依赖 + 输出路径不符 | 写进 `devDependencies`；输出改 `dist/index.mjs`；banner 加 `createRequire`/`__dirname`/`__filename` ESM shim |
| 前端 Astro7 与 `@edgeone/astro@1.1.4` 不兼容（peer 锁 `astro@^5`） | 前端走纯静态 SSG，不用 SSR adapter |
| 运行期 API 地址混用构建期 localhost | `PUBLIC_RUNTIME_API_URL` 构建期内联为 `window.__API_URL__` |

---

## 6. 本地复验命令（供参考）

```bash
# 后端 handler 本地冒烟
cd backend
NODE_ENV=production DATABASE_URL=libsql://x.turso.io TURSO_AUTH_TOKEN=x \
  node -e "import('./dist/index.mjs').then(m=>m.default.fetch(new Request('http://localhost/health')).then(r=>r.text().then(t=>console.log(r.status,t))))"

# 前端构建（内联线上 API）
cd frontend
PUBLIC_RUNTIME_API_URL=https://api.seln.cn bun run build
```
