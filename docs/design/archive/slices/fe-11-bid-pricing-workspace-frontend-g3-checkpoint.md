# FE-11 招投标与报价评审承接前端实现 G3 Checkpoint

* Gate Status: `G3 Pass / Awaiting same-batch G4`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `frontend-only`
* G3 Reviewer: `Codex`
* G3 Date: `2026-04-24`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-11`
* G1 Inputs:
  * `docs/design/archive/slices/fe-11-bid-pricing-workspace-frontend-baseline.md`
  * `docs/design/archive/slices/fe-11-bid-pricing-workspace-frontend-g1-unblock-addendum.md`
  * `docs/design/archive/slices/ex-27-presigning-bid-commercial-fact-source-g3-checkpoint.md`
  * `docs/design/archive/slices/ex-28-presigning-pricing-margin-fact-source-g3-checkpoint.md`

## 1. Delivered Boundary

`FE-11` 已完成读取与解释型前端实现：

1. 新增 `/projects/:id/workspace/bid-commercial` 与 `/projects/:id/workspace/pricing-margin` 内部路由，权限均为 `project:read`。
2. 新增 `ProjectBidCommercialWorkspace`，读取 `ProjectBidCommercialWorkspaceView`，展示竞标形态、阶段、决策、结果、材料项、时间线、阻断项、下一步和责任归口。
3. 新增 `ProjectPricingMarginWorkspace`，读取 `ProjectPricingMarginWorkspaceView`，展示报价版本、报价金额、税务 / 回款条件、毛利判断、放行结论、成本版本引用、竞标引用、条件项、阻断项和签约承接判断。
4. `ProjectWorkspaceStore` 新增 bid-commercial / pricing-margin state、loading、error、load method 和 404/403 友好错误映射。
5. 签约前总入口卡片从“待接入”改为可进入，并保持从项目工作区连续导航。
6. E2E 覆盖登录后从项目详情进入工作区，再从工作区入口进入签约前主线、技术与成本、招投标 / 商务竞标、报价与毛利评审，并覆盖新增页面的 direct URL。

## 2. Out Of Scope

1. 不新增后端 route、DTO、OpenAPI schema、generated client 或 persistence。
2. 不实现竞标过程创建、报价评审创建、审批放行或商业放行基线生成写动作。
3. 不把 `ContractReadinessDetail` 或技术成本事实反推为报价 / 毛利结论。
4. 不关闭 `EX-27`、`EX-28` 或本批 G4；这些仍等待用户提交后统一收口。

## 3. Validation Evidence

| Check                                                                                                                                                   | Result | Notes                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-bid-commercial-workspace.spec.ts`                                              | Pass   | `1 suite / 3 tests`，覆盖正式事实、空缺口、错误态。                                                            |
| `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pricing-margin-workspace.spec.ts`                                              | Pass   | `1 suite / 3 tests`，覆盖报价评审事实、空缺口、错误态。                                                        |
| `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store.spec.ts`                                                       | Pass   | `1 suite / 20 tests`，覆盖 bid / pricing load 和 404 error mapping。                                           |
| `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pre-signing-overview.spec.ts`                                                  | Pass   | `1 suite / 3 tests`，覆盖签约前入口卡片。                                                                      |
| `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes.spec.ts`                                                                    | Pass   | `1 suite / 3 tests`，覆盖新增路由权限。                                                                        |
| `corepack pnpm nx lint admin-data-access`                                                                                                               | Pass   | 无新增 lint warning。                                                                                          |
| `corepack pnpm nx lint poms-admin`                                                                                                                      | Pass   | 无新增 lint warning。                                                                                          |
| `corepack pnpm nx build poms-admin`                                                                                                                     | Pass   | Initial total `957.54 kB`，未出现 bundle budget warning；新增页面为 lazy route。                               |
| `corepack pnpm nx run shared-api-client:check`                                                                                                          | Pass   | generated client 与 OpenAPI 同步；仍有既有 OpenAPI generator `propertyNames` warnings，未由本片新增。          |
| `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts -g ...` | Pass   | 新增 pre-signing 旅程单例通过；此前一次完整运行因 Windows `ERR_NO_BUFFER_SPACE` 环境问题失败，未进入页面断言。 |
| `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts`        | Pass   | `5 tests`，覆盖登录后真实入口链、跨工作区导航和权限拒绝。                                                      |

`git diff --check` 与 Markdown 格式检查将在本 checkpoint 写入后统一执行。

## 4. Drift And Exceptions

| Item                                        | Classification | Status | Notes                                                                              |
| ------------------------------------------- | -------------- | ------ | ---------------------------------------------------------------------------------- |
| `FE11-E1-MISSING-BID-PROJECTION`            | `resolved`     | Closed | `EX-27` 本地 `G3` 已提供正式 `ProjectBidCommercialWorkspaceView`。                 |
| `FE11-E2-MISSING-PRICING-MARGIN-PROJECTION` | `resolved`     | Closed | `EX-28` 本地 `G3` 已提供正式 `ProjectPricingMarginWorkspaceView`。                 |
| `FE11-E3-SAME-BATCH-UPSTREAM-G3`            | `accepted E2`  | Open   | `FE-11` 可到本地 `G3`，但 `G4` 必须等 `EX-27`、`EX-28` 与 `FE-11` 同批提交后关闭。 |
| E2E first-run `ERR_NO_BUFFER_SPACE`         | `tool-noise`   | Closed | 清理残留 test-server 后单例与完整 journey 均通过。                                 |

## 5. G3 Decision

* Can move tracker to `Review / G3`: `yes`
* Can commit with same batch: `yes`
* Can mark `Done / G4`: `no`
* Required before G4:
  1. 用户提交本批 `EX-27`、`EX-28`、`FE-11` 代码与文档。
  2. 提交后复核工作树状态。
  3. 将 `EX-27`、`EX-28`、`FE-11` 分别做 G4 close-out。
