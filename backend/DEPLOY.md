# 后端部署指南（已迁出 EdgeOne Pages）

后端（ElysiaJS + Bun）现已 **Docker 化**，数据库使用 Turso（libSQL HTTP 模式，**无原生模块依赖**），可部署到任意支持 Docker / Node 的平台，构建链与平台无关，彻底避开 EdgeOne 的 esbuild / cron / 函数目录坑。

> ⚠️ **关于国内访问速度**：下面主推的 Railway 是海外节点，国内读者访问会比腾讯系略慢。若你更在意国内速度，直接看文末「腾讯轻量服务器方案」——代码与配置完全通用，只是换个部署目标。

---

## 一、所需环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | Turso 数据库连接地址（`libsql://xxx.turso.io`） |
| `TURSO_AUTH_TOKEN` | ✅ | Turso 数据库级 token |
| `BETTER_AUTH_SECRET` | ✅ | better-auth 密钥，请用随机长字符串（如 `openssl rand -base64 32`） |
| `CRON_SECRET` | 建议 | `/api/cron/*` 端点保护密钥（不设则放行） |
| `FRONTEND_URL` | 建议 | 前端地址，生产设为 `https://blog.seln.cn`（用于 CORS + auth） |
| `ADMIN_URL` | 建议 | 管理端地址，生产设为 `https://ad.seln.cn` |
| `BASE_URL` | 建议 | 后端自身地址，生产设为 `https://api.seln.cn`（better-auth 用） |
| `DEPLOY_WEBHOOK_URL` | 可选 | 前端重建部署钩子（内容更新后自动触发前端重建） |
| `XXAPI_TOKEN` | 可选 | 友链自动检查用的第三方 token |
| `NODE_ENV` / `RUN_MODE` / `PORT` | 自动 | 已由 Dockerfile 默认设为 `production` / `server` / `4000`，无需手动填 |

> 以下变量由 Dockerfile 注入，平台侧**不用管**：`NODE_ENV`、`RUN_MODE`、`PORT`。

---

## 二、主方案：Railway（最方便，全程网页，连 GitHub 自动部署）

1. 打开 https://railway.app ，用 GitHub 登录。
2. **New Project → Deploy from GitHub repo**，选择 `mccsjs/mccsjs-blog` 仓库。
3. 展开 **Root Directory**，填入 `backend`（指定只部署后端子目录）。
4. Railway 会自动检测到 `backend/Dockerfile` 并用它构建，无需额外配置。
5. 进入项目 **Variables**，点击 **New Variable** 逐个添加上方表格里的必填/建议变量（不含 `NODE_ENV/RUN_MODE/PORT`）。
6. 点击 **Deploy**，等待构建完成（首次约 1–2 分钟）。
7. 部署成功后 Railway 会给出一个形如 `xxx.up.railway.app` 的默认域名。
8. **绑自定义域名**：项目 **Settings → Domains → Add Domain**，填入 `api.seln.cn`，按提示到 DNSPod（或你的 DNS 服务商）添加一条 **CNAME 记录**，主机 `api` 指向 Railway 给出的目标地址。
9. 验证：浏览器访问 `https://api.seln.cn/health`，返回 `{"status":"ok"}` 即成功。

> 之后每次 `git push` 到 `main`，Railway 会自动重新构建部署。

---

## 三、国内备选：腾讯轻量应用服务器（Docker 部署，速度最优）

适合在意国内访问速度的场景。代码与上面的 Dockerfile 完全通用。

1. 在腾讯云购买「轻量应用服务器」（系统选 Ubuntu 22.04 / Debian 12）。
2. 服务器上安装 Docker：
   ```bash
   curl -fsSL https://get.daocloud.io/docker | sh
   # 或用官方脚本：curl -fsSL https://get.docker.com | sh
   ```
3. 拉取代码并构建运行：
   ```bash
   git clone git@github.com:mccsjs/mccsjs-blog.git
   cd mccsjs-blog/backend
   docker build -t mccsjs-backend .
   docker run -d --name backend -p 4000:4000 --restart unless-stopped \
     -e DATABASE_URL="libsql://..." \
     -e TURSO_AUTH_TOKEN="..." \
     -e BETTER_AUTH_SECRET="..." \
     -e FRONTEND_URL="https://blog.seln.cn" \
     -e ADMIN_URL="https://ad.seln.cn" \
     -e BASE_URL="https://api.seln.cn" \
     -e CRON_SECRET="..." \
     mccsjs-backend
   ```
4. 安装 Nginx 做反代 + HTTPS（证书用 acme.sh / 腾讯云免费证书）：
   ```nginx
   server {
     listen 443 ssl;
     server_name api.seln.cn;
     ssl_certificate     /path/fullchain.pem;
     ssl_certificate_key /path/privkey.pem;
     location / {
       proxy_pass http://127.0.0.1:4000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```
5. 在 DNSPod 把 `api.seln.cn` 解析为服务器 **A 记录**（指向服务器公网 IP）。
6. 验证同上：`https://api.seln.cn/health` 返回 ok。

---

## 四、前端 / 管理端配合

- 前端 `blog.seln.cn` 与管理端 `ad.seln.cn` 仍各自独立部署（EdgeOne Pages 或静态托管均可）。
- 只要 `api.seln.cn` 指向新后端，`FRONTEND_URL` / `ADMIN_URL` CORS 已放行，无需改前端代码。
- 若配置了 `DEPLOY_WEBHOOK_URL`，后端在内容更新时会自动触发前端重建。
