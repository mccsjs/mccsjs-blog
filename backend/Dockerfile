# 使用 Bun 官方镜像（后端代码以 Bun 编写，原生兼容，无需打包）
FROM oven/bun:1

WORKDIR /app

# 先安装依赖（利用 Docker 层缓存）
COPY package.json bun.lockb* ./
RUN bun install --production

# 复制源码
COPY . .

# 运行环境：常驻 server 模式
ENV NODE_ENV=production
ENV RUN_MODE=server
ENV PORT=4000

EXPOSE 4000

# 由 index.ts 依据 RUN_MODE=server 进入常驻监听 + 启动定时任务
CMD ["bun", "run", "src/index.ts"]
