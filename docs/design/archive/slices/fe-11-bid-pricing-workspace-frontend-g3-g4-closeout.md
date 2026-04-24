# FE-11 招投标与报价评审承接前端实现 G3/G4 Close-out

* Close-out Status: `Pass`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `frontend-only`
* G4 Reviewer: `Codex`
* Close-out Date: `2026-04-25`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-11`
* Runtime Commit: `a0e9de1 feat(project): 接入签约前项目三类工作区与事实源能力`

## 1. Delivered Scope

已交付：

1. `/projects/:id/workspace/bid-commercial` 与 `/projects/:id/workspace/pricing-margin` 两个项目工作区内部路由。
2. `ProjectBidCommercialWorkspace` 读取页，展示竞标形态、阶段、决策、结果、材料项、时间线、阻断项、下一步和责任归口。
3. `ProjectPricingMarginWorkspace` 读取页，展示报价版本、金额、税务 / 回款条件、毛利判断、放行结论、成本版本引用、竞标引用、条件项、阻断项和签约承接判断。
4. `ProjectWorkspaceStore` 的 bid-commercial / pricing-margin state、loading、error、load method 和 404 / 403 友好错误映射。
5. 签约前总入口卡片开放真实跳转，不再展示“待接入”。
6. Playwright 覆盖登录后从项目详情、工作区、签约前入口和 direct URL 进入新增页面。

明确未交付：

1. 不新增后端 public route、DTO、OpenAPI schema、generated client 或 persistence。
2. 不实现竞标过程创建、报价评审创建、审批放行或商业放行基线生成写动作。
3. 不把 `ContractReadinessDetail` 或技术成本事实反推为报价 / 毛利结论。

## 2. Alignment

| Concern              | Conclusion                                                                            | Result |
| -------------------- | ------------------------------------------------------------------------------------- | ------ |
| Document -> code     | `FE-11` 只交付招投标 / 报价评审读取与解释型工作区，不扩大为写侧流程                   | Pass   |
| API / client -> view | 页面通过 `EX-27` / `EX-28` generated client 类型和 store 方法消费正式投影             | Pass   |
| Entry chain          | 签约前总入口与工作区 guidance 均指向真实 route，未由前端硬拼可用性                    | Pass   |
| Guard / permission   | 两个 route 使用 `project:read`，写动作仍留在后续切片                                  | Pass   |
| E2E                  | 覆盖登录后真实入口链，不只验证 direct URL                                             | Pass   |
| Same-batch exception | `EX-27`、`EX-28`、`FE-11` 已在同一提交中落地，`FE11-E3-SAME-BATCH-UPSTREAM-G3` 可关闭 | Pass   |

## 3. Validation Evidence

`FE-11` 的 G3 checkpoint 已记录并通过：

1. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-bid-commercial-workspace.spec.ts`
2. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pricing-margin-workspace.spec.ts`
3. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store.spec.ts`
4. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pre-signing-overview.spec.ts`
5. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes.spec.ts`
6. `corepack pnpm nx lint admin-data-access`
7. `corepack pnpm nx lint poms-admin`
8. `corepack pnpm nx build poms-admin`
9. `corepack pnpm nx run shared-api-client:check`
10. `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts`
11. `corepack pnpm run format:md:check`
12. `git diff --check`

提交后复核：

1. `git log -1 --oneline --decorate` 确认运行提交为 `a0e9de1`。
2. `git status --short` 在 G4 文档变更前为空。

## 4. Drift And Exceptions

| Item                                        | Status | Close-out                                                                  |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `FE11-E1-MISSING-BID-PROJECTION`            | Closed | `EX-27` 已提供正式 bid-commercial workspace projection，并被本片消费。     |
| `FE11-E2-MISSING-PRICING-MARGIN-PROJECTION` | Closed | `EX-28` 已提供正式 pricing-margin workspace projection，并被本片消费。     |
| `FE11-E3-SAME-BATCH-UPSTREAM-G3`            | Closed | `EX-27`、`EX-28`、`FE-11` 已同批提交到 `a0e9de1`。                         |
| E2E first-run `ERR_NO_BUFFER_SPACE`         | Closed | 已按 `tool-noise` 处理，清理残留 test-server 后单例与完整 journey 均通过。 |

## 5. G4 Decision

* Can mark tracker `Done`: `yes`
* Can downstream depend on this slice: `yes`
* Parent status:
  1. `FE-11` 可以关闭为 `Done / G4`。
  2. `L1` 的签约前总入口、技术与成本、招投标 / 商务竞标、报价与毛利评审读取主线已具备可依赖前端基线。
  3. `FE-12` 可以进入跨工作区入口链、权限、E2E 与体验收口的 G1 冻结。
