---
kind: dependency_management
name: 多包 Monorepo 依赖管理（Bun + pnpm + npm 混用）
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - backend/package.json
    - frontend/package.json
    - admin/package.json
    - shared/package.json
    - backend/pnpm-workspace.yaml
    - frontend/pnpm-workspace.yaml
---

本仓库采用 monorepo 结构，包含 backend、frontend、admin、shared 四个子包以及根级 scripts。依赖管理呈现以下特点：

1. **包管理器混用**：每个子包各自维护独立的 `package.json`，但锁文件存在不一致——backend 与 admin 同时存在 `bun.lock` 与 `pnpm-lock.yaml`/`package-lock.json`；frontend 同时拥有 `package-lock.json` 与 `pnpm-lock.yaml`；shared 使用 `bun.lock`。根目录仅有一个极简的 `package.json`（仅含一个 devDependency `chokidar`），未声明顶层 workspaces。
2. **Workspace 配置分散**：`pnpm-workspace.yaml` 并非放在仓库根目录，而是分别位于 `backend/` 和 `frontend/` 下，且仅用于配置 `allowBuilds`（允许 prisma/esbuild 等原生模块构建），并未定义任何 workspace 包列表，说明 pnpm workspace 并未真正启用。
3. **共享类型包**：`shared/` 包通过 `module: src/index.ts` 暴露 TypeScript 类型入口，供其他子包引用，但未在任一 `package.json` 中以 `workspace:*` 协议声明依赖关系，实际是通过本地路径或独立安装方式消费。
4. **版本策略**：各子包对相同生态库的版本号并不完全一致（例如 zod 在 backend 为 `^4.3.6`、admin 为 `^4.1.5`；react 在 frontend 与 admin 均为 `^19.2.x` 但具体次版本不同），缺乏统一的版本约束。
5. **无私有源/镜像配置**：未发现 `.npmrc`、`.bunfig.toml` 或 `pnpm-config.yaml` 等私有注册表或镜像配置。
6. **忽略规则**：备份脚本中显式忽略 `node_modules`、`pnpm-lock.yaml`、`package-lock.json`，表明这些锁文件不应纳入版本控制。

总体而言，该仓库尚未建立规范的 monorepo 依赖管理体系，各子包各自为政，包管理器选择与锁文件状态不统一，workspace 机制未生效，属于松散的多包结构。