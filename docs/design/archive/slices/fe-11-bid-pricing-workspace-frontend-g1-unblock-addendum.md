# FE-11 招投标与报价评审承接前端实现 G1 解锁补充记录

* Gate Status: `Pass with same-batch dependency`
* Parent Baseline: `docs/design/archive/slices/fe-11-bid-pricing-workspace-frontend-baseline.md`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `frontend-only`
* G1 Reviewer: `Codex`
* G1 Date: `2026-04-24`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-11`
* Required Same-Batch Inputs: `EX-27`、`EX-28`

## 1. Decision

`FE-11` 可以进入前端实现，但只能基于同一批本地 `G3` 输入推进：

1. `EX-27` 已在本地完成 `G3`，提供 `ProjectBidCommercialWorkspaceView`、`ProjectBidCommercialProcessSummary`、材料项、时间线项和 generated client。
2. `EX-28` 已在本地完成 `G3`，提供 `ProjectPricingMarginWorkspaceView`、`ProjectPricingMarginReviewSummary`、条件项、技术成本版本引用、竞标过程引用和 generated client。
3. `FE-11` 本轮只做读取与解释型前端，不新增后端 public route、DTO、wire contract 或写动作。
4. `FE-11` 不得进入 `G4`，直到 `EX-27`、`EX-28` 与 `FE-11` 所属批次提交后再统一关闭。

## 2. Frozen Frontend Boundary

| Area                   | Frozen Boundary                                           | Notes                                      |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------ |
| Bid route              | `/projects/:id/workspace/bid-commercial`                  | `project:read` 权限，项目工作区子路由      |
| Pricing route          | `/projects/:id/workspace/pricing-margin`                  | `project:read` 权限，项目工作区子路由      |
| Bid page component     | `ProjectBidCommercialWorkspace`                           | 读取 `ProjectBidCommercialWorkspaceView`   |
| Pricing page component | `ProjectPricingMarginWorkspace`                           | 读取 `ProjectPricingMarginWorkspaceView`   |
| Store method           | `loadBidCommercialWorkspace(projectId)`                   | 使用 generated `ProjectApi`                |
| Store method           | `loadPricingMarginWorkspace(projectId)`                   | 使用 generated `ProjectApi`                |
| Entry behavior         | `FE-09` 签约前入口卡片开放竞标与报价跳转                  | 不再展示“待接入”                           |
| E2E behavior           | 从项目详情 / 工作区 / 签约前入口进入，不只验证 direct URL | 覆盖真实按钮或链接入口                     |
| Write actions          | Out of scope                                              | 竞标过程创建、报价评审创建仍由后端切片提供 |

## 3. Same-Batch Exception

| Exception                        | Level | Scope                                                                  | Risk                                                     | Owner   | Due            |
| -------------------------------- | ----- | ---------------------------------------------------------------------- | -------------------------------------------------------- | ------- | -------------- |
| `FE11-E3-SAME-BATCH-UPSTREAM-G3` | `E2`  | `FE-11` 可消费 `EX-27` / `EX-28` 本地 `G3` generated client 和投影类型 | 若本批未一起提交，`FE-11` 不能单独进入 `G4` 或独立提交。 | `Codex` | 本批提交前关闭 |

## 4. Validation Requirements

`FE-11` 到 `G3` 时至少需要：

1. `git diff --check`
2. `corepack pnpm nx lint admin-data-access`
3. `corepack pnpm nx lint poms-admin`
4. `corepack pnpm nx build poms-admin`
5. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`
6. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-bid-commercial`
7. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pricing-margin`
8. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pre-signing-overview`
9. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`
10. `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts`
11. `corepack pnpm nx run shared-api-client:check`

## 5. G1 Result

* Can enter frontend implementation: `yes`
* Can mark tracker `Doing`: `yes`
* Can mark tracker `Done`: `no`
* Drift classification: `none`
* Public API route surface: unchanged by `FE-11`; public route changes belong to `EX-27` / `EX-28`
