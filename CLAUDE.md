# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

POMS（Project Oriented Management System）是一个面向项目型软件销售场景的管理平台，落实《销售规范流程制度（试行）》与《销售提成方案制度（试行）》。Nx Monorepo，包管理器为 pnpm。

当前依赖声明为 Nx 23、pnpm 12、TypeScript 6、Angular 22 和 NestJS 12；版本以 `package.json` 与 `pnpm-lock.yaml` 为准，pnpm 版本由 `packageManager` 固定。

## Common Commands

```bash
# 前端开发服务器（http://localhost:4200）
pnpm start

# 后端开发服务器
pnpm nx serve poms-api

# 构建（前端）
pnpm build

# 单元测试（前端）
pnpm test

# Lint（前端）
pnpm lint

# Prettier 格式化
pnpm format

# 后端构建与检查
pnpm nx build poms-api
pnpm nx test poms-api
pnpm nx lint poms-api

# 接口与数据库
pnpm nx run poms-api:openapi           # 从后端代码生成 OpenAPI 规范
pnpm nx run shared-api-client:generate # 先生成 OpenAPI，再生成 Angular 客户端
pnpm nx run shared-api-client:check    # 检查生成客户端与当前规范的一致性
pnpm nx run poms-api:migration-check   # 检查实体模型与数据库 schema 是否存在需迁移的差异
pnpm nx run poms-api:seeder-run        # 运行开发环境种子数据

# Markdown 表格格式检查（Deno）
pnpm run format:md:check               # 检查 docs/
deno run --allow-read tools/format-md-tables.ts --check README.md CLAUDE.md

# Nx 工作区辅助
pnpm nx graph                        # 可视化依赖图
pnpm nx affected -t test              # 测试具有 test target 的受影响项目
```

## Architecture

### Monorepo Structure

```
apps/
  poms-admin/        # Angular 22 前端管理后台
  poms-admin-e2e/    # Playwright E2E 测试
  poms-api/          # NestJS 12 后端 API
  poms-api-e2e/      # 后端 E2E 测试
libs/
  admin/data-access/ # 前端数据访问层：Stores + API 客户端集成
  api/contracts/     # 后端领域 DTO 与 Zod 校验契约
  shared/api-client/ # 自动生成的 OpenAPI 客户端（勿手动修改）
  shared/api-spec/   # OpenAPI 规范文件
  shared/contracts/  # 前后端共享业务合约（PermissionKey、状态枚举等）
  vendor/nestjs-zod/ # 仓库内维护的 NestJS / Zod 适配库
```

### Frontend (poms-admin)

- **框架**：Angular 22，独立组件（Standalone API），在 `app.config.ts` 中配置 `provideZonelessChangeDetection()`
- **UI**：PrimeNG 22 + Tailwind CSS 4 + SCSS；组件主题通过 `@primeuix/themes` 的 Aura preset 定制，布局沿用 Poseidon 资源
- **状态管理**：Angular Signals（`signal()` / `computed()`）管理状态，RxJS 处理 HTTP 等异步数据
- **Stores**：均为可注入服务，位于 `@poms/admin-data-access`：`AuthStore`、`ProjectStore`、`ProjectWorkspaceStore`、`CommissionStore`、`ContractStore`、`PlatformStore`
- **HTTP 层**：使用 `libs/shared/api-client` 中的自动生成客户端；`providePomsApiClient()` 配置 `withCredentials: true` 并注册 `pomsCsrfInterceptor`，由浏览器携带会话 Cookie，写请求通过 `X-CSRF-Token` 传递 CSRF token
- **会话恢复与失效**：`AuthStore.initialize()` 查询当前会话；`authSessionExpiredInterceptor` 对已识别的会话失效类 `401` 清理前端状态，并在非认证页面跳转登录页，保留经过校验的返回地址
- **路由**：顶级守卫 `authGuard`（认证检查）+ `permissionGuard`（基于 `PermissionKey` 的权限检查）

### Backend (poms-api)

- **框架**：NestJS 12，全局 API 前缀 `/api`，Swagger UI 在 `/api-docs`
- **ORM**：MikroORM 7（PostgreSQL）
- **验证**：请求与响应 DTO 使用 Zod 4，通过仓库内的 `@poms/vendor-nestjs-zod` 适配；全局注册 `ZodValidationPipe` 与 `ZodSerializerInterceptor`，配合 Swagger 生成 OpenAPI Schema
- **认证与授权**：`AuthModule` 按顺序注册全局 `SessionAuthGuard`、`AuthCsrfGuard`、`PermissionsGuard`，分别校验会话、CSRF 与权限

### TypeScript Path Aliases

常用别名（定义在 `tsconfig.base.json`）：

| 别名                      | 指向                                 |
| ------------------------- | ------------------------------------ |
| `@poms/admin-data-access` | `libs/admin/data-access/src/`        |
| `@poms/shared-api-client` | `libs/shared/api-client/`            |
| `@poms/shared-contracts`  | `libs/shared/contracts/src/`         |
| `@poms/api-contracts`     | `libs/api/contracts/src/`            |
| `@poms/vendor-nestjs-zod` | `libs/vendor/nestjs-zod/src/`        |
| `@poms/admin/features/*`  | `apps/poms-admin/src/app/features/*` |
| `@poms/admin/core/*`      | `apps/poms-admin/src/app/core/*`     |

### Module Boundary Rules

ESLint 强制执行以下分层约束（`@nx/enforce-module-boundaries`）：

- `scope:admin` 库只能依赖 `scope:admin` 和 `scope:shared`
- `scope:api` 库只能依赖 `scope:api` 和 `scope:shared`
- `scope:shared` 库只能内部自引用
- `type:data-access` 只能依赖 `type:generated` 和 `type:contracts`
- `type:generated`（`shared/api-client`）不能依赖任何其他库

### OpenAPI Workflow

后端 DTO / Zod Schema 与 Swagger 装饰器 → `pnpm nx run poms-api:openapi` 生成 `libs/shared/api-spec/openapi.json` → `pnpm nx run shared-api-client:generate` 生成 Angular 客户端。`generate` 与 `check` 任务均依赖 OpenAPI 生成；`libs/shared/api-client/` 是生成产物，勿手动修改。

### Code Style

- **缩进**：4 空格
- **引号**：单引号
- **分号**：需要
- **尾随逗号**：不要
- **行宽**：250（Prettier）

### Authentication and Permissions

Admin Web 使用服务端会话认证。`poms_session` 是 HttpOnly Cookie，会话 token 及 CSRF token 在服务端以哈希保存；会话支持空闲超时、绝对超时和撤销。前端不保存或注入 Bearer JWT。

认证接口均带 `/api` 前缀：

- `GET /api/auth/csrf-token`：获取 CSRF token，并设置 `poms_csrf` Cookie；前端将响应 token 存入 `PomsCsrfTokenStore`。
- `POST /api/auth/sessions`：账号密码登录，返回 `CurrentAuthSessionView`，同时设置会话与 CSRF Cookie。
- `GET /api/auth/session`：恢复或查询当前会话；`AuthStore` 据此加载用户、导航和待办。
- `POST /api/auth/session:logout`：撤销当前会话并清除认证 Cookie。
- `POST /api/auth/external-login-sessions`：将外部登录回调取得的一次性票据换成同一套服务端会话。

`pomsCsrfInterceptor` 对非 `GET` / `HEAD` / `OPTIONS` 请求，在尚未设置请求头且能获取 token 时添加 `X-CSRF-Token`；优先读取 token store，再尝试读取 `poms_csrf` Cookie。登录前获取 CSRF token，接受新会话后重新获取。

后端 `AuthCsrfGuard` 对 `POST` / `PUT` / `PATCH` / `DELETE` 校验 CSRF 请求头与 Cookie 一致；非公开接口还校验 token 与当前会话绑定。`@Public()` 仅跳过会话与权限要求，公开写接口（包括登录）仍需通过 CSRF 校验。Swagger 使用 `pomsSession` Cookie 和 `pomsCsrf` 请求头安全定义。

`PermissionKey` 是由 `@poms/shared-contracts` 中的 `PERMISSION_KEYS` 派生的类型。前端 `permissionGuard` 按路由的 `requiredPermissions` 与 `requiredPermissionsMode`（`any` / `all`）检查权限；后端 `PermissionsGuard` 执行默认拒绝策略：非公开路由必须显式声明 `@Authenticated()`、`@HasPermissions()` 或 `@HasAnyPermissions()`。前端守卫不替代后端授权。

### Database Migrations

迁移文件位于 `apps/poms-api/src/migrations/`，使用 MikroORM 迁移机制。按持久化治理要求先编写可审阅的 migration，再同步 entity；合并前运行 `pnpm nx run poms-api:migration-check` 检查模型与数据库 schema 差异。待执行迁移由 MikroORM 的 `migration:pending` 单独查询，不能用 `migration-check` 代替。

### Business Domains

核心功能域：**项目管理**（project）、**提成管理**（commission）、**合同管理**（contract）、**平台管理**（platform/用户/角色/组织）。业务规则文档位于 `docs/` 目录。

## Implementation Governance

本仓库执行正式的设计到实现治理模型（详见 `docs/design/implementation-governance-gates.md`）。

### Gate 模型（G0–G4）

每个工程切片必须按顺序通过以下闸口：

- **G0 立项**：确认切片名、最小交付边界、正式输入文档、tracker 行（`Task ID / Subtask ID`）、明确不做范围。若涉及公共 API route，必须先在 `docs/design/api-route-canonical-inventory.md` 中冻结 authoritative inventory 行。
- **G1 冻结**：形成实施基线包（模板：`docs/reference/implementation-baseline-package-template.md`），冻结 SSOT（命名、类型、日期、标识符、金额、状态机）。未通过 G1 的切片只能停留在 `Todo`。
- **G2 开工**：阅读基线包后再写代码。持久化切片须先写 migration SQL，再写 entity；接口切片须先固定 DTO 语义，再写 controller。
- **G3 合并**：提交风险分层证据（见下方校验矩阵），分类所有 drift，记录所有例外。个人开发使用 local checkpoint，多人协作使用 PR checklist（`.github/pull_request_template.md`）。
- **G4 完成**：代码已合并 + 文档已回写 + tracker 已更新 + 切片生命周期产物（`*-baseline.md`、`*-closeout.md`、`*-checkpoint.md`）已 `git mv` 至 `docs/design/archive/slices/`，才允许标记 `Done`。子切片完成不等于父任务完成。

### 切片类型与 G3 最小校验

| 切片类型                     | 必跑校验                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `docs-only` / `process-only` | `git diff --check`，`pnpm run format:md:check`，无行为变更声明                             |
| `refactor-only`              | 相关项目 lint，相关单测或构建，外部行为不变声明                                            |
| `query-only`                 | query/view 对照，相关项目 lint，API/service 测试                                           |
| `frontend-only`              | 前端 lint，`corepack pnpm nx build poms-admin`，OpenAPI client 影响说明                    |
| `api / command`              | authoritative inventory 行，route-command-DTO 对照，后端 lint，API 测试，OpenAPI 生成 diff |
| `persistence`                | migration-entity-DDL-contract 对照，后端 lint，`migration-check`，drift 归类               |
| `cross-layer-high-risk`      | 以上全部适用，显式判断是否需要 E2E                                                         |

### Drift 分类（只允许以下五类）

`new-real-drift` / `existing-baseline-drift` / `accepted-db-specific-difference` / `tool-noise` / `design-change-required`

不得用"测试通过""前端没用到""后面再补"代替 drift 分类。

### 默认阻断 G3 的情形

- 持久化切片无 migration-entity-DDL-contract 对照
- api/command 切片无 route-command-DTO 对照
- 公共 API route surface 变化但无 authoritative inventory 行
- `migration-check` 失败且未分类
- 字段命名/日期类型/金额精度/版本链语义漂移未修复
- 受影响项目存在 lint target 但无 lint 结果
- 例外缺少批准人/cleanup owner/cleanup due

### 个人开发（Solo Worktree Mode）

不需要为形式创建 PR，但 gate 要求不降低。commit 前至少形成 local checkpoint（详见 `docs/reference/solo-worktree-governance.md`），commit message 中记录 G3 结论摘要。

## Commit Messages

使用 `poms-conventional-commits` skill（`.agents/skills/poms-conventional-commits/SKILL.md`）起草和审查 commit message。

**格式**：`<type>(<scope>): <中文动宾短语>`，英文 type/scope，中文 subject 和 body，subject 不以标点结尾。

**主要 type**：`feat` / `fix` / `test` / `docs` / `refactor` / `chore` / `build` / `ci`

**优先使用业务域 scope**（而非技术层 scope）：

| Scope              | 负责范围                                     |
| ------------------ | -------------------------------------------- |
| `project`          | 项目列表/详情/工作区/创建/更新               |
| `commission`       | 提成规则/计算/发放/结算/留存/规则说明        |
| `contract`         | 合同主数据/激活/条款快照/合同就绪            |
| `contract-finance` | 收款/付款/应付/发票/采购承诺/财务台账        |
| `project-cost`     | 经营快照/实际成本/税务/经营信号/提成门关概览 |
| `project-handover` | 交付/基线重算/收款判断冻结/交付汇总          |
| `approval`         | 审批记录/待办/确认                           |
| `platform`         | 用户/角色/组织单元/权限/平台治理             |
| `auth`             | 登录/会话/当前用户                           |
| `profile`          | 当前用户自助个人中心                         |
| `workspace`        | 项目工作区 shell/导航                        |
| `admin`            | 前端 shell/路由/布局/导航                    |
| `governance`       | 实施治理规则/skills/模板/策略                |

跨层切片（同时触及 API/admin/contracts/generated client/docs）使用业务 scope，不拆成多个技术 scope。

**Body 建议包含**：新增/变更的公共 API route、DTO/契约/OpenAPI/generated client 变化、持久化/迁移/实体变化、guard/权限/状态机变化、测试覆盖、文档回写摘要。
