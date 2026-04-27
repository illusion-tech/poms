# FE-34 招投标 / 商务竞标写入体验产品化 G3 Checkpoint

- Gate Status: `G3 = Pass`
- Task ID: `FE-34`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Checkpoint Date: `2026-04-27`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-34`

## 1. Implementation Summary

本地实现已按 `G1` 基线完成第一版写入体验:

1. `ProjectWorkspaceStore` 新增:
   - `createBidCommercialProcess(projectId, request)`
   - `createPricingMarginReview(projectId, request)`
   - `savingBidCommercial`
   - `savingPricingMargin`
2. `bid-commercial` 工作区新增:
   - `allowedActions` 控制的创建 / 编辑入口
   - PrimeNG dialog 表单
   - 当前记录编辑预填
   - `materialItems` 与 `timelineItems` 数组项新增 / 删除
   - submit 后通过 store 调用 existing POST 并刷新 workspace projection
3. `pricing-margin` 工作区新增:
   - `allowedActions` 与技术成本前置事实控制的创建 / 编辑入口
   - PrimeNG dialog 表单
   - 当前评审编辑预填
   - `conditionItems` 数组项新增 / 删除
   - submit 后通过 store 调用 existing POST 并刷新 workspace projection
4. 前端 edit 语义已落到实现: 预填当前记录并通过 existing POST 提交新 current version；不使用 PATCH / PUT。
5. Summary enum -> create-request enum 没有放宽为 plain string；实现使用显式转换函数，保留已知字面量边界。

## 2. Scope Check

| G1 Scope Item                           | G3 Result | Evidence                                                                                           |
| --------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| 不新增后端 API / DTO / generated client | Pass      | 仅消费现有 `ProjectApi` create/workspace methods；未改 shared API client。                         |
| Bid create / edit 写入入口              | Pass      | `project-bid-commercial-workspace.ts` 新增写入卡片、dialog、DTO 请求组装和 store submit。          |
| Pricing create / edit 写入入口          | Pass      | `project-pricing-margin-workspace.ts` 新增写入卡片、dialog、DTO 请求组装和 store submit。          |
| `allowedActions` 控制写入口             | Pass      | 页面分别检查 `create-bid-commercial-process` / `create-pricing-margin-review`。                    |
| Pricing 上游事实前置                    | Pass      | `technicalCostPackage` 缺失时禁用写入口并给出说明。                                                |
| 提交后刷新 projection                   | Pass      | Store create wrapper 调 POST 后调用对应 `load*Workspace()`。                                       |
| Page/store 单测                         | Pass      | Focused Jest tests 已覆盖入口显隐、预填 submit 和 store refresh。                                  |
| 登录后入口链验证                        | Pass      | Playwright 从登录 -> 项目详情按钮 -> 工作区 -> bid/pricing 写入弹窗 -> submit 完成 targeted 验证。 |

## 3. Validation

| Check             | Command / Evidence                                                                                                                                                       | Result                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Bid page unit     | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-bid-commercial-workspace`                                                                       | Passed                                               |
| Pricing page unit | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pricing-margin-workspace`                                                                       | Passed                                               |
| Store unit        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`                                                                                | Passed                                               |
| Admin lint        | `corepack pnpm nx lint poms-admin`                                                                                                                                       | Passed                                               |
| Data-access lint  | `corepack pnpm nx lint admin-data-access`                                                                                                                                | Passed                                               |
| Admin build       | `corepack pnpm nx build poms-admin`                                                                                                                                      | Passed                                               |
| Targeted E2E      | `POMS_E2E_PORT_SEED=434 POMS_E2E_LOOPBACK_HOST=127.0.0.1 playwright ... project-workspace.journey.spec.ts -g "admin can open bid and pricing write dialogs" --workers=1` | Passed                                               |
| Markdown check    | `corepack pnpm run format:md:check`                                                                                                                                      | Passed before G3 doc; rerun required after this doc. |
| Diff hygiene      | `git diff --check`                                                                                                                                                       | Passed before G3 doc; rerun required after this doc. |

## 4. Exceptions And Closure Readiness

| Exception ID                         | G3 Status            | Notes                                                                                                              |
| ------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `FE30-E1-BID-WRITE-ENTRY-DEFERRED`   | Ready to close at G4 | Bid / pricing write entry is now implemented and validated locally; close after commit evidence is available.      |
| `FE34-E1-APPEND-ONLY-EDIT-SEMANTICS` | Ready to close at G4 | Edit copy and implementation use replacement-version semantics through existing POST.                              |
| `FE34-E2-PRICING-UPSTREAM-FACTS`     | Ready to close at G4 | Pricing write CTA requires `technicalCostPackage`; absence produces read-only explanation.                         |
| `FE34-E3-HISTORY-LIST-NOT-PRIMARY`   | Accepted boundary    | FE-34 focuses on current write entry and refresh; version history list remains a future audit/history enhancement. |

## 5. G3 Decision

`FE-34` can remain in `Doing` and move toward `G4` after the current implementation is committed.

G4 close-out must record:

1. Commit hash.
2. Final validation rerun after any last corrections.
3. `FE30-E1` and FE-34 exception closure status.
