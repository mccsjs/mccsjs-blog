# 一步一步把博客/管理端/后端上线（小白点击版）

> 不用懂技术，照着点、把框里要填的字复制粘贴进去就行。
> 你已经有的东西：博客代码已部署到 EdgeOne；三个域名 `blog.seln.cn` / `ad.seln.cn` / `api.seln.cn` 都已备案。

---

## 准备：你需要两样登录权限
1. **EdgeOne 控制台**：https://console.cloud.tencent.com/edgeone （用你腾讯云账号登录）
2. **你的域名解析后台**：`seln.cn` 是在哪儿解析的？（腾讯云 DNSPod / 阿里云 / Cloudflare / 其他）——待会儿要加一条 CNAME 记录。

---

## 第一步：让博客 `blog.seln.cn` 能打开（博客已部署，只差绑域名）

1. 打开 https://console.cloud.tencent.com/edgeone 并登录。
2. 左侧菜单点 **「边缘站点」→「Pages」**，找到项目 **`mccsjsblog`**（就是之前部署上去的那个）。
3. 点进这个项目，切到顶部的 **「域名管理」** 标签。
4. 点 **「添加自定义域名」**，输入框里填 `blog.seln.cn`，确定。
5. 页面会显示**一条 CNAME 记录**（形如：主机记录 `blog`，记录值 `xxxx.edgeone.net`）。**复制"记录值"那串**。
6. 去你的域名解析后台加这条 CNAME（怎么加看下方「去哪加 CNAME」）：
   - 类型：`CNAME`
   - 主机记录：`blog`
   - 记录值：粘贴第 5 步复制的那串
7. 回到 EdgeOne 页面点 **「验证」**。等几分钟（偶尔要久一点），状态变成「已生效」，SSL 证书会自动签发。
8. 浏览器打开 **https://blog.seln.cn** ，应该就能看到博客了。

### 去哪加 CNAME（第 6 步）
- **腾讯云 DNSPod**：控制台 →「云解析 DNS」→ 找 `seln.cn` →「添加记录」→ 类型选 CNAME，主机记录填 `blog`，记录值粘贴。
- **阿里云**：控制台 →「云解析 DNS」→ `seln.cn` →「添加解析」→ 同理。
- **Cloudflare / 其他**：进对应后台加一条 CNAME 记录，字段一样。

---

## 第二步：管理端 `ad.seln.cn`

1. EdgeOne 控制台 →「Pages」→ **「新建项目」** → 选「从 Git 仓库导入」→ 选 GitHub 仓库 **`mccsjs/mccsjs-blog`**。
2. 构建配置填：
   - 根目录（Root Directory）：`admin`
   - 安装命令：`npm install`
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - Node 版本：选 **18 或以上**
3. 找到 **「环境变量」**（构建前填），加一条：
   - 名称：`VITE_API_URL`
   - 值：`https://api.seln.cn`
4. 点「部署」，等它构建完，会给一个预览地址，先自己点开登录试试。
5. 同第一步的「域名管理」→「添加自定义域名」→ 填 `ad.seln.cn` → 加 CNAME → 验证。

---

## 第三步：后端 `api.seln.cn`

1. 「Pages」→「新建项目」→ Git 导入 → `mccsjs/mccsjs-blog`。
2. 构建配置：
   - 根目录：`backend`
   - 安装命令：`npm install`
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - Node 版本：18 或以上
3. **环境变量**（运行时，必填，逐条加）：
   | 名称 | 值 |
   |------|-----|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `libsql://mccsjsblog-mccsjs1.aws-ap-northeast-1.turso.io` |
   | `TURSO_AUTH_TOKEN` | 你的 Turso 数据库级 token（见下方「拿 Turso token」） |
   | `BETTER_AUTH_SECRET` | 随便一段长随机串（比如 32 位字母数字） |
   | `BETTER_AUTH_URL` | `https://api.seln.cn` |
   | `FRONTEND_URL` | `https://blog.seln.cn` |
   | `ADMIN_URL` | `https://ad.seln.cn` |
   | `CRON_SECRET` | 可选，一段随机串 |
   | `DEPLOY_WEBHOOK_URL` | `https://pages-api.cloud.tencent.com/v1/webhook/6f3d47bd39617c791d86c2da097dacc0bd3fa064ecb9267ee764d43793b66359`（博客 deploy webhook，管理端改内容后端自动触发博客重建；不设则不自动更新） |
4. 部署 →「域名管理」→ 添加 `api.seln.cn` → 加 CNAME → 验证。
5. 验证：浏览器打开 **https://api.seln.cn/health** ，页面应显示 `ok`。

---

## 拿 Turso 数据库级 token
Turso 控制台给的是「账户级」token，不能直接连库，要换「数据库级」：
1. 打开 https://turso.tech → 登录 → 你的数据库 `mccsjsblog`。
2. 用账户级 token 调接口换数据库级 token：
   ```
   POST https://api.turso.tech/v1/organizations/mccsjs1/databases/mccsjsblog/auth/tokens?authorization=full-access
   ```
   请求头 `authorization: <你的账户级 token>`。
3. 返回里的 `token` 字段就是 `TURSO_AUTH_TOKEN`。

---

## 卡住了怎么办
每一步如果不知道点哪个、或报错了，把**屏幕截图**或**看到的文字**发我，我告诉你下一步点哪。我会一直跟着。
