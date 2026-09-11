# GOV-18 NestJS 12 家族升级实施基线

- Gate Status: `Pass`
- Parent: N/A
- Owner: Codex
- Slice Type: `api / command`（后端框架家族升级，行为等价验证）
- G1 Reviewer: Codex
- G1 Date: 2026-09-12
- GitHub Issue: `#53`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `GOV-18`

## 1. 范围

- 本次目标:
  - 8 个 `@nestjs/*` 包升级到 12 线:`common`/`core`/`platform-express` 11.2.3 → `^12.0.1`;`jwt` 11.0.2 → `^12.0.1`;`passport` 11.0.5 → `^12.0.0`;`swagger` 11.3.0 → `^12.0.1`;`schematics`(dev) 11.1.0 → `^12.0.0`;`testing`(dev) 11.1.19 → `^12.0.1`。
  - vendored `@poms/vendor-nestjs-zod` 的依赖声明同步:`@nestjs/common`/`@nestjs/swagger` → `^12`。
  - 允许的源码适配：仅限 NestJS 12 编译/类型要求的机械调整（如 vendored `pipe.ts` 的 `PipeTransform` 签名精化）；逐项记录。
  - 验证：openapi 重生成 diff 逐项归类 + `shared-api-client:check` 零类型变化（硬闸）；双应用 lint/build/test；`migration-check`；`format:md:check`。
- 本次明确不做:
  - prettier 3.9 / @swc 1.16 / @swc-node 1.12 搭车（避免格式化/工具链噪音混入框架升级，归 Angular 批或微切片）。
  - 不升 `@mikro-orm/*` core 系（GOV14-E1 继续 pin 7.0.11；wrapper ^7.1.0 peer 已兼容 12）。
  - 不改业务代码逻辑、契约语义、公共路由。
  - 不部署测试环境（注意：运行时 Node 需 >=20.19/22.12——部署侧约束记录，非本片执行项）。
- 下游可依赖的交付边界:
  - API 在 NestJS 12 下行为等价（以 806 测试 + 矩阵为证）；OpenAPI 产物与 11 线差异全部归类且 client 零类型变化。
- 不允许下游依赖的留白:
  - 不承诺 ESM 输出切换（保持 CommonJS）。
  - 不承诺 nest CLI 工作流（仓库用 nx）。

## 2. 正式输入

| Input Type      | Document / Source                         | Section / Anchor                  | Status | Notes                                                                                                                                                                         |     |            |
| --------------- | ----------------------------------------- | --------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------- |
| Business design | GitHub issue `#53`                        | 背景 / G0 边界                    | Pass   | 批次表第三批。                                                                                                                                                                |     |            |
| 官方迁移指南    | docs.nestjs.com/migration-guide           | v11→v12                           | Pass   | ESM-only+CJS require(esm)；Node 门槛（运行 >=20.19/22.12，schematics >=24.15，本机 24.19 ✓）；生命周期钩子排序、Pipe 签名精化、HTTP 错误映射重构；GraphQL/NATS/CLI 项不适用。 |     |            |
| peer 矩阵       | npm view（2026-09-12）                    | platform-express/swagger 12 peers | Pass   | express 为 platform-express 自带依赖；swagger 12 无阻碍 peer。                                                                                                                |     |            |
| 前置状态        | GOV-17 收口                               | —                                 | Pass   | zod ^4.6.1 + vendored 库已适配；`@mikro-orm/nestjs` ^7.1.0 peer `^11.0.5 \                                                                                                    | \   | ^12.0.0`。 |
| 升级基线对照    | EX-80A 的 NestJS 11.2.3 对齐（issue #42） | —                                 | Pass   | 家族错位教训：本次一次性同步全部 8 包。                                                                                                                                       |     |            |

## 3. 本次 SSOT

| Concern                     | SSOT                                            | Implementation Rule                                                             |
| --------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| Business semantics          | 既有产品行为                                    | 升级不得改变业务行为（806 测试拦截；生命周期排序/错误映射变化按官方语义接受）。 |
| OpenAPI 契约语义            | HEAD `openapi.json` + `shared-api-client:check` | diff 逐项归类；client 零类型变化为硬闸。                                        |
| 依赖版本                    | package.json                                    | 8 包一次性同步 12 线，禁止部分升级。                                            |
| Public route canonical path | N/A                                             | 路由不变。                                                                      |

## 4. 命令与接口边界

N/A——不新增或修改 route/command/DTO/guard；框架内部行为变化以矩阵等价验证。

## 5. 读侧边界

N/A。

## 6. 持久化边界

N/A——mikro-orm 不动，`migration-check` 确认无影响。

## 7. 一致性结论

- OpenAPI / generated client: swagger 12 输出差异逐项归类；client 零类型变化（硬闸）。
- 模块解析: ESM-only 包经 Node require(esm)（本机 24.19）由 ts-node/jest/webpack 三条路径验证。
- 生命周期/错误映射: 官方语义变化，以测试矩阵等价为准。
- 其余边界 N/A。

## 8. 测试与校验

| Check                    | Required | Command / Evidence                                                    | Result                     | Gap / Reason                                                                              |
| ------------------------ | -------- | --------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| OpenAPI generation       | 是       | `corepack pnpm nx run poms-api:openapi`                               | 通过                       | **产物与 HEAD 字节一致（零 diff）**——swagger 12 生成器输出无变化。                        |
| Client diff              | 是       | `corepack pnpm nx run shared-api-client:check`                        | 通过                       | 完全同步、零类型变化（硬闸守住）。                                                        |
| Lint                     | 是       | `corepack pnpm nx lint poms-api` / `poms-admin` / `vendor-nestjs-zod` | 通过                       | vendored 库源码与 NestJS 12 兼容，无需适配。                                              |
| Build                    | 是       | `corepack pnpm nx build poms-api` / `poms-admin`                      | 通过                       | webpack 对 ESM-only 依赖打包正常。                                                        |
| Unit tests               | 是       | `corepack pnpm nx test poms-api` / `poms-admin`                       | API 806/806；Admin 358/359 | Admin 唯一失败为既有 UTC 时区断言（EX-79A 已记录）；生命周期/错误映射语义变化无测试回归。 |
| Migration / schema check | 是       | `corepack pnpm nx run poms-api:migration-check`                       | 通过                       | —                                                                                         |
| Markdown format          | 是       | `corepack pnpm run format:md:check`                                   | 通过                       | —                                                                                         |

## 9. 例外与风险

| Exception ID | Level | Scope                                    | Approved By | Cleanup Owner           | Cleanup Due | Notes                                   |
| ------------ | ----- | ---------------------------------------- | ----------- | ----------------------- | ----------- | --------------------------------------- |
| 风险         | —     | 生命周期钩子排序 / HTTP 错误映射行为变化 | —           | 测试矩阵拦截            | —           | 官方语义变化，矩阵外差异 → corrective。 |
| 风险         | —     | swagger 12 生成器输出变化                | —           | diff 归类 + client 硬闸 | —           | client 非零变化 → 阻断评估。            |
| 部署提示     | —     | 运行时 Node >=20.19/22.12                | —           | 测试环境发布时确认      | 发布时      | 非本片执行项。                          |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: Codex（用户会话指令授权）
- Approved At: 2026-09-12
- Conditions: client 非零类型变化即阻断；8 包必须一次性同步。

## 11. 实施记录

### 升级落地

- 8 包一次性同步：`common`/`core`/`platform-express` 11.2.3 → 12.0.1、`jwt` 11.0.2 → 12.0.1、`passport` 11.0.5 → 12.0.0、`swagger` 11.3.0 → 12.0.1、`schematics` 11.1.0 → 12.0.0、`testing` 11.1.19 → 12.0.1。
- vendored `@poms/vendor-nestjs-zod` 依赖声明 `@nestjs/common`/`@nestjs/swagger` → `^12.0.1`；**源码零适配**（lint/build/test 全过，上游代码与 NestJS 12 兼容）。

### 唯一适配：jest 与 ESM-only 包

**现象**：升级后 API 测试 68/72 套件失败，`Must use import to load ES Module: @nestjs/core/index.js`——jest 30 的 CJS 沙箱无法 require ESM-only 的 @nestjs 12。

**根因**（jest-runtime@30.5.1 源码确认）：原生 `require(esm)` 能力判定为 `vm.SourceTextModule.prototype.hasAsyncGraph`（Node >=24.9 且带 `--experimental-vm-modules` 时才存在）。错误提示中的"Node v24.9+"只是必要条件，flag 仍需显式提供。

**修复**：新增 `apps/poms-api/jest/global-setup.js`，在 globalSetup（主进程、worker spawn 前）注入 `NODE_OPTIONS=--experimental-vm-modules`，worker 继承后获得该能力。标准命令 `corepack pnpm nx test poms-api` 零手工 env 通过（806/806）。

**已知边界**：`--runInBand` 模式下测试运行于主进程，本注入不生效，需显式 env 前缀（global-setup.js 注释与本文档双记录）。

### swagger 12 输出

与 11.3.0 + 本仓库管线组合相比**字节一致**（585 schemas / 237 paths，结构化深度 diff 零差异）；`shared-api-client:check` 证明 client 零类型变化。
