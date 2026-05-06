# FE-50 Sales Follow Up Change Lifecycle Frontend Baseline

- Task ID: `FE-50`
- Slice type: `frontend-only`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `FE-50`
- Public route surface: no new or changed public API route.
- Status: `G4`
- G1 Date: 2026-05-01
- G4 Date: 2026-05-01

## 1. Scope

本片承接 `EX-48A` 已落地的 generated client:

1. 在共享 `SalesFollowUpPanel` 中展示 `active` / `superseded` / `voided` 状态。
2. 为 active 记录提供“更正”和“作废”入口。
3. 更正时调用 `replace` API 生成新版本，旧记录进入 `superseded`。
4. 作废时调用 `void` API，记录原因和可选备注。
5. 提交 replace / void 时统一带 `expectedVersion=rowVersion`。
6. 增加“显示历史”开关，默认只读 active，显式查询 `lifecycleScope=all` 时显示历史链。
7. 线索详情迁移为复用共享 `SalesFollowUpPanel`，使客户 / 线索 / 项目详情使用同一套跟进入口。

## 2. Out Of Scope

1. 不新增 API、DTO、DDL、OpenAPI 或 generated client。
2. 不做销售跟进提醒、工作台待办或通知入口；由 `EX-49` 承接。
3. 不做审批流、restore / revert、物理删除或批量操作。
4. 不做浏览器深度验证；本片以 focused component tests、lint 和 build 作为前端证据。

## 3. SSOT

| Concern           | Source Of Truth                                                   | Frontend Rule                                                         |
| ----------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Runtime lifecycle | `EX-48A` baseline and generated client                            | 前端只消费 generated enum、request 和 controller method，不手写路径。 |
| Default list      | `SalesFollowUpRecordListQuery.lifecycleScope`                     | 默认传 `active`；显示历史时传 `all`。                                 |
| Concurrency       | `SalesFollowUpRecordSummary.rowVersion`                           | replace / void request 必须提交当前记录 `rowVersion`。                |
| Record anchors    | `SalesFollowUpPanel` `customerId` / `leadId` / `projectId` inputs | 更正沿用旧记录锚点；创建时仍按当前上下文生成客户 / 线索 / 项目记录。  |
| Permission        | Existing `canWrite` input from host page                          | 只有可写上下文展示更正 / 作废 / 创建入口。                            |

## 4. UI Behavior

### Shared Panel

- Header 增加“显示历史”开关。
- active 记录显示正常卡片、下次跟进时间、`更正` 和 `作废` 按钮。
- superseded / voided 记录以弱化样式展示，只读且不展示下一次跟进动作。
- 历史记录展示更正原因、作废原因和作废人信息。
- “更正”复用原创建表单，但标题、上下文文案、提交按钮和必填字段切换为更正语义。
- “作废”使用独立确认弹窗，要求填写作废原因。

### Lead Detail

- 线索详情不再维护专用销售跟进表单和列表。
- 线索详情复用 `SalesFollowUpPanel`:
  - 未转项目时传入 `customerId + leadId`。
  - 已转项目时传入 `customerId + leadId + projectId`，用于连续查看来源线索和项目阶段的跟进记录。

## 5. Data Access Boundary

`SalesFollowUpStore` 增加:

- `lifecycleScope?: SalesFollowUpRecordLifecycleScope` list filter。
- `replaceFollowUp(id, request)`。
- `voidFollowUp(id, request)`。

`@poms/admin-data-access` 对外导出 generated request / enum / status 类型，供前端组件消费。

## 6. Tests And Checks

Required and completed:

- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-follow-up-panel` passed, 1 suite / 5 tests.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list` passed, 1 suite / 13 tests.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-list` passed, 1 suite / 1 test.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail` passed, 1 suite / 22 tests.
- `corepack pnpm nx lint poms-admin` passed.
- `corepack pnpm nx build poms-admin` passed with existing initial bundle budget warning.

Document hygiene:

- `corepack pnpm run format:md` passed.
- `corepack pnpm run format:md:check` passed.
- `git diff --check` passed.

## 7. Drift And Exceptions

| ID                              | Type         | Scope       | Decision                                                                                                       |
| ------------------------------- | ------------ | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `FE50-D1-BUNDLE-BUDGET-WARNING` | existing     | Admin build | `poms-admin` build passes; the existing initial bundle budget warning remains outside this slice.              |
| `FE50-D2-JSDOM-STYLE-NOISE`     | test-env     | Lead spec   | `lead-list` spec stubs `getComputedStyle` to avoid jsdom selector parsing failure during PrimeNG dialog focus. |
| `FE50-E1-NO-REMINDERS`          | out-of-scope | Reminder UX | `nextFollowUpAt` reminder and workbench todo semantics remain governed by `EX-49`.                             |

## 8. G4 Closeout

Status: `Done`

Delivered:

1. Shared sales follow-up panel can list active records by default and include historical records on demand.
2. Active records can be replaced or voided from the frontend with optimistic concurrency.
3. Historical records expose lifecycle status and reasons without allowing repeat mutation.
4. Lead detail now consumes the same shared panel as customer and project detail.
5. Focused tests cover list lifecycle scope, replace, void and host-page integration.

Next executable slices:

1. `EX-49`: freeze sales follow-up reminder and workbench todo semantics.
2. `EX-54`: freeze lead score history and manual override governance when scoring needs audit history.
