---
kind: logging_system
name: 日志系统 — 基于原生 console 的轻量输出
category: logging_system
scope:
    - '**'
source_files:
    - backend/src/index.ts
    - backend/_init_db.ts
    - backend/scripts/seed.ts
    - backend/prisma/register-user.mjs
    - frontend/src/pages/link.astro
    - scripts/import-friends.mjs
---

本仓库未引入任何第三方日志框架（如 pino、winston、bun.log 等），后端与前端/脚本全部使用 JavaScript/TypeScript 原生的 `console` API 进行输出，属于最基础的“无结构化日志”方案。

- 后端（backend/src/index.ts）：在启动、错误处理、友链测速定时任务、默认数据初始化等关键路径使用 `console.log` / `console.error` 打印状态信息；错误统一通过全局异常处理器以 `[HTTP 状态码] error` 前缀输出。
- 初始化与种子脚本（_init_db.ts、scripts/seed.ts、prisma/register-user.mjs）：仅用 `console.log` / `console.error` 报告执行结果。
- 前端（frontend/*.astro、admin/*.tsx）：几乎不主动输出日志，仅在 highlight.js 不可用时 `console.warn` 提示，其余均为 UI 渲染逻辑。
- 工具脚本（scripts/import-friends.mjs、frontend/scripts/defer-css.mjs）：使用 `console.log` 输出导入进度与统计。

约定与约束
- 无统一的 logger 实例或中间件，所有模块自行调用 `console.*`。
- 没有日志级别管理（info/debug/warn/error 混用）、无结构化字段（JSON 序列化）、无日志收集/聚合 sink。
- 开发期直接输出到标准输出，生产环境依赖运行容器（如 Docker）的标准输出捕获。

开发者建议
- 如需改进，可在 backend/src 下新增独立 logger 模块（例如基于 bun.log 或 pino），提供 `logger.info/warn/error` 并在全局异常处理器中复用，再逐步替换现有 `console.*` 调用。