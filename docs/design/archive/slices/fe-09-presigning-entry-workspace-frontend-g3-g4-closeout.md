# FE-09 签约前总入口与连续上下文前端实现 G3/G4 Close-out

* Close-out Status: `Pass`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `frontend-dominant / existing-query-projection`
* G4 Reviewer: `Codex`
* Close-out Date: `2026-04-24`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-09`
* Runtime Commit: `fa9c727 feat(project): 新增项目签约前主线工作区与承接状态入口`

## 1. Delivered Scope

* 已交付:
  1. 新增 `/projects/:id/workspace/pre-signing` 内部路由和 `ProjectPreSigningOverview` 读取页。
  2. 项目工作区 guidance 的 `pre-signing-workspace` entry 已从禁用占位改为后端投影的真实入口，用户可从项目详情进入工作区后继续进入签约前主线。
  3. `ProjectWorkspaceStore` 新增 current `ContractReadinessDetail` 读侧状态、loading / error / missing-state 投影与 `loadPreSigningOverview(projectId)`。
  4. 页面展示当前阶段、阻断原因、下一步、责任归口、签约前候选工作区入口和签约就绪承接包摘要。
  5. 当前承接包 404 被投影为“尚未形成签约就绪承接包”的业务 gap，不作为页面错误。
  6. 单测和 Playwright journey 已覆盖登录后真实入口链、直接路由、route guard、store 读取和后端 guidance projection。
* 明确未交付:
  1. 未实现 `技术与成本`、`招投标 / 商务竞标`、`报价与毛利评审`、`签约就绪` 详细工作区页面。
  2. 未新增 public API route、shared contract、OpenAPI schema、generated client、DTO 或 persistence。
  3. 未实现商业放行差异复核、承接包初始化、报价 / 投标写动作。
  4. 未关闭 `FE-10` / `FE-11` 的详细事实源与页面缺口。

## 2. Formal Inputs And Artifacts

| Artifact        | Path                                                                                     | Status   |
| --------------- | ---------------------------------------------------------------------------------------- | -------- |
| G1 baseline     | `docs/design/archive/slices/fe-09-presigning-entry-workspace-frontend-baseline.md`       | Archived |
| G3 checkpoint   | `docs/design/archive/slices/fe-09-presigning-entry-workspace-frontend-g3-checkpoint.md`  | Archived |
| G3/G4 close-out | `docs/design/archive/slices/fe-09-presigning-entry-workspace-frontend-g3-g4-closeout.md` | Current  |
| Tracker         | `docs/design/phase2-development-execution-tracker.md`                                    | Updated  |
| Progress board  | `docs/design/poms-design-progress.md`                                                    | Updated  |

## 3. Alignment

| Concern                | Conclusion                                                                                                              | Result |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| Document -> code       | `FE-09` 已按基线落成签约前总入口，不把本片伪装成完整 L1 六工作区交付                                                    | Pass   |
| Route / API surface    | 仅新增前端内部 route，并调整既有 guidance query projection；无 public API route / DTO / OpenAPI / generated client 变化 | Pass   |
| Query -> view          | 页面消费 guidance + current readiness；不从 readiness items 反推技术、投标、报价详细事实                                | Pass   |
| DTO / contract         | 复用 existing generated client DTO；未新造 wire contract                                                                | Pass   |
| Guard / permission     | 前端 route guard 使用 `project:read`，后端 entry projection 继续作为入口可用性事实源                                    | Pass   |
| Missing-state behavior | current readiness 404 显示为业务 gap；403 / 其他错误仍显示错误反馈                                                      | Pass   |
| Entry-chain behavior   | E2E 覆盖 admin 登录后从项目详情进入工作区，再从真实入口进入 `pre-signing`，不只验证直接 URL                             | Pass   |

## 4. Validation Evidence

| Check                      | Command / Evidence                                                                                                                               | Result                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Diff hygiene               | `git diff --check`                                                                                                                               | Pass                                               |
| Page unit test             | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pre-signing-overview`                                                   | Pass, `1 suite / 3 tests`                          |
| Store unit test            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`                                                        | Pass, `1 suite / 14 tests`                         |
| Route unit test            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`                                                                     | Pass, `1 suite / 3 tests`                          |
| Shell unit test            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace-shell`                                                        | Pass, `1 suite / 4 tests`                          |
| API focused test           | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`                                                    | Pass, `1 suite / 14 tests`                         |
| Admin lint                 | `corepack pnpm nx lint poms-admin`                                                                                                               | Pass                                               |
| Admin data-access lint     | `corepack pnpm nx lint admin-data-access`                                                                                                        | Pass                                               |
| API lint                   | `corepack pnpm nx lint poms-api`                                                                                                                 | Pass                                               |
| Admin build                | `corepack pnpm nx build poms-admin`                                                                                                              | Pass, initial total `943.54 kB`, no bundle warning |
| API build                  | `corepack pnpm nx build poms-api`                                                                                                                | Pass                                               |
| E2E seed                   | `corepack pnpm nx run poms-api:seeder-run`                                                                                                       | Pass                                               |
| Workspace journey E2E      | `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | Pass, `5 tests`                                    |
| OpenAPI / generated client | N/A                                                                                                                                              | Not required; no public API / DTO / client change  |
| Migration / schema check   | N/A                                                                                                                                              | Not required; no persistence change                |

## 5. Drift And Exceptions

* Drift classification: `none`
* Public API route drift: `none`
* Generated client drift: `none`
* Persistence drift: `none`

| Exception ID                               | Status                      | Close-out                                                                                       |
| ------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------- |
| `FE09-E1-DETAIL-WORKSPACES-DEFERRED`       | Remains downstream boundary | `FE-09` 只交付签约前总入口；技术 / 投标 / 报价详细工作区继续归属 `FE-10` / `FE-11`。            |
| `FE09-E2-GUIDANCE-PROJECTION-IN-FE-SLICE`  | Closed                      | 既有 guidance query 已输出真实 `pre-signing-workspace` route，且未新增 public API / DTO / DDL。 |
| `FE09-E3-READINESS-PARTIAL-STAGE-COVERAGE` | Remains downstream boundary | readiness 只解释签约就绪末端，不替代技术确认、投标、报价与毛利评审事实源。                      |

## 6. G4 Decision

* Can mark tracker `Done`: `yes`
* Parent task status:
  1. `FE-09` 可以关闭为 `Done`。
  2. `L1` 不可因 `FE-09` 关闭而整体视为完成；`FE-10`、`FE-11` 仍是 L1 详细工作区主线。
  3. `FE-12` 继续等待 `FE-09` 到 `FE-11` 全部稳定后再统一冻结跨工作区入口链与 E2E baseline。
* Downstream dependency status:
  1. `FE-10` 可依赖 `/projects/:id/workspace/pre-signing` 入口、ProjectWorkspaceStore 读取模式、gap / error 投影和 E2E 入口验证方式。
  2. `FE-11` 可依赖签约前总入口作为连续上下文承接点，但不得把 current readiness 当作投标 / 报价详细事实源。
* Next recommended slice:
  * `FE-10` should enter `G1` next if the current priority remains completing `L1` in planned order.
