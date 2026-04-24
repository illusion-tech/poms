# EX-28 签约前报价与毛利评审事实源 G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `FE-11`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G3 Reviewer: `Codex`
- Checkpoint Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` -> `EX-28`

## 1. 范围与结论

- 本次完成: `ProjectPricingMarginReview` 版本事实源、条件项子表、project-scoped create/list routes、current workspace query view、shared contract / DTO / OpenAPI / generated client、admin data-access 类型导出、service/query focused tests、migration。
- 本次不做: 不生成商业放行基线本体、不实现审批引擎、不做前端页面、不做合同差异重审链。
- 下游恢复边界: `FE-11` 可以基于 `GET /projects/{projectId}/pricing-margin-workspace` 读取报价、成本版本引用、竞标 / 直接商务路径、税务与回款条件、毛利判断、审批摘要引用、商业放行基线引用、签约就绪承接和阻断解释。
- 仍不允许依赖: 不允许前端从 `ContractReadinessDetail`、`CommercialReleaseBaselineSummary` by-id 或技术成本工作区反推报价评审结论。

## 2. G3 对齐证据

| Concern                           | Evidence                                                                                                                             | Result |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Route inventory -> route          | `POST/GET /projects/{projectId}/pricing-margin-reviews`、`GET /projects/{projectId}/pricing-margin-workspace` 已实现并回写 inventory | Pass   |
| Migration -> entity               | 主表 `project_pricing_margin_review` 与子表 `project_pricing_margin_condition_item` 已落 entity + migration；`migration-check` 通过  | Pass   |
| Entity -> shared contract         | `ProjectPricingMarginReviewSummary`、`ProjectPricingMarginWorkspaceView`、condition input/view 已进入 shared contract                | Pass   |
| DTO / OpenAPI -> generated client | API DTO 包装 shared schema，OpenAPI 与 generated client 已同步                                                                       | Pass   |
| Command -> service                | create 命令校验当前技术成本版本、竞标 / 直接商务路径、放行审批摘要引用、金额非负与版本 supersede                                     | Pass   |
| Query -> view                     | 缺少 current review 返回业务 gap；有 current review 时返回引用成本包、竞标过程、条件项、阻断、下一步和 ready 状态                    | Pass   |
| Permission boundary               | 读取 `project:read`；创建 `project:write`；workspace allowed actions 已区分 view/create                                              | Pass   |

## 3. Drift 处理

| Drift ID          | Class            | Finding                                                                                   | Resolution                                                                                                                              |
| ----------------- | ---------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `EX28-D1-FK-NAME` | `new-real-drift` | `migration-check` 发现 `commercial_release_baseline_id` FK 名称因 Postgres 长度限制被截断 | entity 与 migration 显式收口到实际约束名 `project_pricing_margin_review_commercial_release_baseline_id_fo`，重跑 `migration-check` 通过 |

## 4. 校验结果

| Check                      | Command / Evidence                                                                                 | Result                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| API focused tests          | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.service.spec.ts`            | Pass, 25 tests                                                                               |
| API query focused tests    | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`      | Pass, 23 tests                                                                               |
| API lint                   | `corepack pnpm nx lint poms-api`                                                                   | Pass                                                                                         |
| API build                  | `corepack pnpm nx build poms-api`                                                                  | Pass                                                                                         |
| OpenAPI / generated client | `corepack pnpm nx run shared-api-client:generate` + `corepack pnpm nx run shared-api-client:check` | Pass; existing generator warnings on older `propertyNames` schemas only                      |
| Migration                  | `corepack pnpm nx run poms-api:migration-up` + `corepack pnpm nx run poms-api:migration-check`     | Pass                                                                                         |
| Admin data-access lint     | `corepack pnpm nx lint admin-data-access`                                                          | Pass                                                                                         |
| Admin lint / build         | `corepack pnpm nx lint poms-admin` + `corepack pnpm nx build poms-admin`                           | Pass; initial total `955.40 kB`, no new bundle warning line                                  |
| Markdown / whitespace      | `corepack pnpm run format:md:check` + `git diff --check`                                           | Pass; CRLF normalization warning on `libs/api/contracts/src/lib/project/project.dto.ts` only |

## 5. G3 结论

- Checkpoint Status: `Pass`
- Commit allowed: Yes, after user review.
- Tracker `Done` allowed: No. `G4` waits for the user commit / chosen close-out workflow.
- Parent `FE-11` status: `FE11-E2-MISSING-PRICING-MARGIN-PROJECTION` is locally resolved by this slice, but `FE-11` should only leave blocked state after `EX-27` and `EX-28` are committed or an explicit same-batch frontend exception is recorded.
