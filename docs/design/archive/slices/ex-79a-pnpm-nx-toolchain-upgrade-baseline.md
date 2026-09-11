# EX-79A pnpm 12 与 nx 22.7 工具链升级实施基线

- Gate Status: `Pass`
- Parent: N/A
- Owner: Codex
- Slice Type: `process-only`（构建工具链，无产品代码）
- G1 Reviewer: Codex
- G1 Date: 2026-09-11
- GitHub Issue: `#40`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-79A`

## 1. 范围

- 本次目标:
  - `package.json` 的 `packageManager` 从 `pnpm@10.33.2` 锁定到 `pnpm@12.3.4`（npm latest，Rust 重写版）。
  - `pnpm-workspace.yaml` 按迁移指南将 `onlyBuiltDependencies` 迁移为 `allowBuilds` 映射（11 个允许构建的依赖一一对应，值全部为 `true`），并移除已废弃旧键。
  - 11 个 nx 包（`nx` + 10 个 `@nx/*`）从 `22.6.5` 升级到 `22.7.12`（22 线内最高版本），使多文档 `pnpm-lock.yaml` 可被解析（Windows CRLF 修复 nx#35828 自 22.7.8 发布）。
  - 保留 nx 在 `pnpm install` 时自动写入的 `minimumReleaseAgeExclude`（nx 22.7.12 发布不足 pnpm 12 供应链最小发布年龄门槛，由 nx 自动豁免）。
  - 通过 lint / build / test 验证矩阵，确认工具链行为等价。
- 本次明确不做:
  - 不升级任何业务依赖（第一批次依赖维护归 `EX-80A` 及后续切片）。
  - 不升级 nx 23（另行评估）。
  - 不修改产品代码、API、OpenAPI、generated client、migration、权限或 UI。
  - 不做测试环境部署。
- 下游可依赖的交付边界:
  - `corepack pnpm nx <target>` 全部命令在 pnpm 12.3.4 + nx 22.7.12 下可执行。
  - `pnpm install` 幂等完成且构建脚本按 `allowBuilds` 白名单执行。
- 不允许下游依赖的留白:
  - 不承诺 pnpm 12 全部新特性（如 supply-chain policy）的配置调优。
  - 不承诺 TypeScript 7 / Angular 22 / NestJS 12 等大版本依赖兼容性。

## 2. 正式输入

| Input Type       | Document / Source                  | Section / Anchor        | Status | Notes                                                                |
| ---------------- | ---------------------------------- | ----------------------- | ------ | -------------------------------------------------------------------- |
| Business design  | GitHub issue `#40`                 | 背景 / G0 边界          | Pass   | 用户指令：pnpm 升级到最新版。                                        |
| pnpm 迁移指南    | https://pnpm.io/migration          | v11/v12 破坏性变更      | Pass   | `allowBuilds` 合并、`npm_config_*` 不读、`pmOnFail` 取代三个旧设置。 |
| pnpm 12 发布说明 | https://pnpm.io/blog/releases/12.0 | lockfile 兼容性         | Pass   | 锁文件版本仍为 `9.0`，多文档 env 文档为有意行为。                    |
| nx 修复记录      | nrwl/nx#35828、PR#36419            | 多文档解析 Windows 修复 | Pass   | 修复 2026-07-21 合入，22.7.8（2026-07-30）起发布；选定 22.7.12。     |
| Command design   | N/A                                | N/A                     | N/A    | 不新增写命令。                                                       |
| DTO / OpenAPI    | N/A                                | N/A                     | N/A    | 不改 API 契约。                                                      |
| Route inventory  | N/A                                | N/A                     | N/A    | 不触及 public route surface。                                        |

## 3. 本次 SSOT

| Concern                     | SSOT                              | Implementation Rule                                  |
| --------------------------- | --------------------------------- | ---------------------------------------------------- |
| Business semantics          | GitHub issue `#40`                | 工具链行为等价，不改变业务行为。                     |
| Public route canonical path | N/A                               | 不触及 public route。                                |
| Route / command naming      | N/A                               | 不新增 route / command。                             |
| DTO / contract naming       | N/A                               | 不触及契约。                                         |
| Table / column naming       | N/A                               | 不触及数据库。                                       |
| Date / time semantics       | N/A                               | 不触及日期语义。                                     |
| Identifier semantics        | N/A                               | 不触及标识符语义。                                   |
| Money / decimal semantics   | N/A                               | 不触及金额语义。                                     |
| Status machine              | N/A                               | 不触及状态机。                                       |
| 包管理器版本                | `package.json#packageManager`     | pnpm 版本唯一锚点，hash 由 corepack 生成。           |
| 构建脚本白名单              | `pnpm-workspace.yaml#allowBuilds` | 与原 `onlyBuiltDependencies` 11 项一一对应，无增减。 |

## 4. 命令与接口边界

N/A——本切片不触及任何 route、command、DTO、guard。

## 5. 读侧边界

N/A——本切片不触及任何 query / view。

## 6. 持久化边界

N/A——本切片不触及任何 migration、entity、DDL。

## 7. 一致性结论

- Document -> code: N/A，无产品代码变更。
- ADR-015 inventory -> route: N/A，不触及路由。
- Migration -> entity: N/A。
- Entity -> contract: N/A。
- Route -> command: N/A。
- Query -> view: N/A。
- Guard / permission: N/A。
- OpenAPI / generated client: 本切片不重新生成；`pnpm-lock.yaml` 中相关依赖版本不变，生成产物不受影响。
- 锁文件格式: `lockfileVersion 9.0` 不变；新增前置 `packageManagerDependencies` 文档为 pnpm 12 有意行为，nx 22.7.12 已验证可解析（`nx show projects` 8 个项目全部识别）。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                               | Result     | Gap / Reason                                                                                                                                                                     |
| -------------------------------- | -------- | ------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint                             | 是       | `corepack pnpm nx lint poms-api` / `poms-admin`  | 通过       | —                                                                                                                                                                                |
| Build                            | 是       | `corepack pnpm nx build poms-api` / `poms-admin` | 通过       | —                                                                                                                                                                                |
| Unit tests                       | 是       | `corepack pnpm nx test poms-api`                 | 通过       | —                                                                                                                                                                                |
| Unit tests                       | 是       | `corepack pnpm nx test poms-admin`               | 358/359    | 唯一失败 `project-detail.spec.ts:955` 为既有 UTC 时区敏感断言（夹具 `2026-04-24T15:20:00.000Z` 在 UTC+8 渲染为 04-25），`TZ=UTC` 复跑 24/24 通过；与工具链无关，属既有基线问题。 |
| API / integration tests          | 否       | —                                                | N/A        | process-only 切片，无产品行为变更。                                                                                                                                              |
| E2E                              | 否       | —                                                | N/A        | 同上。                                                                                                                                                                           |
| OpenAPI generation / client diff | 否       | —                                                | N/A        | 依赖版本不变。                                                                                                                                                                   |
| Migration / schema check         | 否       | —                                                | N/A        | 不触及持久化。                                                                                                                                                                   |
| Markdown format                  | 是       | `corepack pnpm run format:md:check`              | 见 G3 记录 | 本基线与 tracker 变更后执行。                                                                                                                                                    |

## 9. 例外与风险

| Exception ID             | Level       | Scope                                                       | Approved By                 | Cleanup Owner                           | Cleanup Due | Notes                                          |
| ------------------------ | ----------- | ----------------------------------------------------------- | --------------------------- | --------------------------------------- | ----------- | ---------------------------------------------- |
| EX79A-E1                 | lightweight | G1 基线留痕晚于实现（用户会话内直接指令先行完成实现与验证） | 用户（wangzishi，会话指令） | 本切片 G4 前补齐 issue / 基线 / tracker | 2026-09-11  | 实现内容与本文档一致，无范围漂移。             |
| 既有问题（非本切片例外） | —           | `project-detail.spec.ts:955` 时区敏感断言在 UTC+8 主机失败  | —                           | 建议单独开 BUG 切片                     | —           | 修复方向：断言改为 UTC 渲染或测试环境固定 TZ。 |

## 10. G1 结论

- Gate Status: `Pass`（回溯冻结，见 EX79A-E1）
- Approved By: Codex（会话内用户指令授权）
- Approved At: 2026-09-11
- Conditions: 提交前完成 `format:md:check`；PR 携带 G3 矩阵证据；不混入任何业务依赖升级。
