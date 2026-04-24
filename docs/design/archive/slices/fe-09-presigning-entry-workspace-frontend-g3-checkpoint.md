# FE-09 签约前总入口与连续上下文前端实现 G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: Phase 2 frontend workspace / `L1`
- Owner: `Codex`
- Slice Type: `frontend-dominant / existing-query-projection`
- Checkpoint Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-09`
- G1 Baseline: `docs/design/archive/slices/fe-09-presigning-entry-workspace-frontend-baseline.md`

## 1. Delivered Scope

- 已交付:
  1. 新增 `/projects/:id/workspace/pre-signing` 内部路由和 `ProjectPreSigningOverview` 页面。
  2. 项目工作区 guidance 的 `pre-signing-workspace` entry 已从禁用占位改为后端投影的真实入口，不由前端硬拼可用性。
  3. `ProjectWorkspaceStore` 新增 current `ContractReadinessDetail` 读侧状态、loading、error 和 `loadPreSigningOverview(projectId)`。
  4. 签约前页展示当前阶段、缺口、下一步、责任归口、阻断项、L1 候选工作区入口和签约就绪承接包摘要。
  5. 当前承接包 404 被投影为“尚未形成承接包”的业务 gap，不作为页面错误。
  6. E2E 已覆盖 admin 登录后从项目详情进入工作区，再从工作区入口进入签约前主线，以及直接访问 `/pre-signing`。
- 明确未交付:
  1. 未实现 `技术与成本`、`招投标 / 商务竞标`、`报价与毛利评审`、`签约就绪` 详细工作区页面。
  2. 未新增 public API route、shared contract、OpenAPI schema、generated client 或 persistence。
  3. 未实现商业放行差异复核、承接包初始化、报价 / 投标写动作。
  4. 未关闭 `FE-10` / `FE-11` 的详细事实源与页面缺口。

## 2. Changed Surface

| Area                     | Files                                                                                                      | Result                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Frontend route           | `apps/poms-admin/src/app.routes.ts`、`apps/poms-admin/src/app.routes.spec.ts`                              | 新增 `pre-signing` 子路由，权限为 `project:read` |
| Frontend page            | `apps/poms-admin/src/app/features/project/project-pre-signing-overview.ts`                                 | 新增签约前总入口页面                             |
| Frontend store           | `libs/admin/data-access/src/lib/project/project-workspace.store.ts`、`libs/admin/data-access/src/index.ts` | 新增 current readiness 读侧状态与 API 注入       |
| Backend query projection | `apps/poms-api/src/app/features/project/project-query.service.ts`                                          | 既有 guidance entry 改为真实 `/pre-signing` 入口 |
| Unit tests               | admin / api focused specs                                                                                  | 覆盖 page、store、route 和 guidance projection   |
| Browser journey          | `apps/poms-admin-e2e/src/project-workspace.journey.spec.ts`                                                | 覆盖真实登录入口链与直接路由                     |

## 3. Validation Evidence

| Check                      | Command / Evidence                                                                                                                               | Result                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Diff hygiene               | `git diff --check`                                                                                                                               | Pass                                                        |
| Page unit test             | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pre-signing-overview`                                                   | Pass, 1 suite / 3 tests                                     |
| Store unit test            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`                                                        | Pass, 1 suite / 14 tests                                    |
| Route unit test            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`                                                                     | Pass, 1 suite / 3 tests                                     |
| Shell unit test            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace-shell`                                                        | Pass, 1 suite / 4 tests                                     |
| API focused test           | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`                                                    | Pass, 1 suite / 14 tests                                    |
| Admin lint                 | `corepack pnpm nx lint poms-admin`                                                                                                               | Pass                                                        |
| Admin data-access lint     | `corepack pnpm nx lint admin-data-access`                                                                                                        | Pass                                                        |
| API lint                   | `corepack pnpm nx lint poms-api`                                                                                                                 | Pass                                                        |
| Admin build                | `corepack pnpm nx build poms-admin`                                                                                                              | Pass, initial total `943.54 kB`, no bundle warning          |
| API build                  | `corepack pnpm nx build poms-api`                                                                                                                | Pass                                                        |
| E2E seed                   | `corepack pnpm nx run poms-api:seeder-run`                                                                                                       | Pass                                                        |
| Workspace journey E2E      | `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | Pass, 5 tests                                               |
| OpenAPI / generated client | N/A                                                                                                                                              | Not required; no public API / DTO / generated client change |
| Migration / schema check   | N/A                                                                                                                                              | Not required; no persistence change                         |

## 4. Drift And Exceptions

- Drift classification: `none`
- Public API route drift: `none`
- Generated client drift: `none`
- Runtime route change: internal frontend route only

| Exception ID                               | G3 Status                  | Notes                                                                                |
| ------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------ |
| `FE09-E1-DETAIL-WORKSPACES-DEFERRED`       | Accepted / remains open    | FE-09 只交付总入口；详细工作区继续归属 `FE-10` / `FE-11`                             |
| `FE09-E2-GUIDANCE-PROJECTION-IN-FE-SLICE`  | Resolved in implementation | 既有 guidance query 已输出真实 `pre-signing-workspace` route，未新增 API / DTO / DDL |
| `FE09-E3-READINESS-PARTIAL-STAGE-COVERAGE` | Accepted / remains open    | readiness 只解释签约就绪末端，不替代技术、投标、报价详细事实源                       |

## 5. G3 Decision

- Gate Status: `Pass`
- Commit readiness: `yes`
- Can mark tracker `Done`: `no`
- Reason:
  1. G3 已满足运行时代码、focused tests、lint、build 和 browser journey 证据。
  2. G4 仍需等待本地提交完成后，再写回 close-out 并把 tracker 标记为 `Done`。
- Next:
  1. 提交当前 FE-09 runtime + G1/G3 证据。
  2. 提交后执行 FE-09 G4 close-out。
  3. FE-09 G4 完成后再决定是否进入 `FE-10`。
