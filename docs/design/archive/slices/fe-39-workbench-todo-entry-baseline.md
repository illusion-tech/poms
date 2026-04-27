# FE-39 工作台业务入口产品化与待办入口一致性实施基线包

- Task ID: `FE-39`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-39`
- Upstream: `FE-38`

---

## 1. 背景

`FE-38` 已确认 `/dashboard` 是正式登录默认入口，但当前待办入口存在行为漂移：

1. `apps/poms-admin/src/app/features/dashboard/workbench.ts` 支持 `Contract`、`Project`、`CommissionPayout`、`CommissionAdjustment`，但提成待办跳到 `/projects/:id/commission`，不是具体 operations 页。
2. `apps/poms-admin/src/app/layout/components/app.topbar.ts` 只支持 `Contract` 和 `Project`，不支持提成待办。
3. `TodoItemSummary.targetObjectType` 在 shared contract / generated client 中仍是 `string`，前端不能假设任意字符串可导航。

`FE-39` 的目标是先把工作台与顶栏待办入口统一到同一个显式白名单解析器，并补真实登录入口验证。提成操作页内部的行级解释、滚动、审批上下文和高亮体验继续由 `FE-40` 承接。

---

## 2. G1 范围

### In Scope

1. 新增共享待办导航解析器，建议路径为 `apps/poms-admin/src/app/shared/navigation/todo-navigation.ts`。
2. 解析器只支持当前已知 target:
   - `Contract` -> `/contracts/:id`
   - `Project` -> `/projects/:id`
   - `CommissionPayout` -> `/projects/:projectId/commission/operations?payoutId=:targetObjectId`
   - `CommissionAdjustment` -> `/projects/:projectId/commission/operations?adjustmentId=:targetObjectId`
3. 当 `sourceType === 'ApprovalRecord'` 时，保留 `approvalRecordId=:sourceId` query param。
4. `projectId` 缺失或 target 类型未知时，解析器必须返回不可导航状态，UI 不得静默跳转到错误页面。
5. `Workbench` 与 `AppTopbar` 统一消费该解析器，不再各自维护不同 `if / else`。
6. `/dashboard` 继续作为 POMS 业务工作台，保留现有 `ProjectStore` 和 `AuthStore.myTodos()` 数据输入，补稳定空态、加载态和入口动作验证。
7. 补充 focused unit tests 和登录后真实入口 E2E，至少覆盖从菜单进入工作台、从工作台待办进入目标、从顶栏待办进入目标。

### Out Of Scope

1. 不新增后端 API、DTO、generated client、permission key 或 DDL。
2. 不把 `TodoItemSummary.targetObjectType` 改成后端 enum；本片只在前端用显式白名单收敛。
3. 不重做 `ProjectCommission` operations 页的行级定位、滚动、审批上下文和缺口解释；这些由 `FE-40` 处理。
4. 不处理合同列表 TableDemo 基线；该范围属于 `FE-41`。
5. 不处理跨页面权限 / 敏感字段完整矩阵；该范围属于 `FE-42`。
6. 不治理 Poseidon demo / uikit 或非 POMS 模板页。

---

## 3. 正式输入

| 输入                  | 文件 / 证据                                                                                              | 当前事实                                                                                         | FE-39 使用方式                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Tracker               | `phase2-development-execution-tracker.md`                                                                | `FE-39` 已由 `FE-38` 创建为 `Todo / G0`。                                                        | 本基线通过后转为 `Doing / G1`。                        |
| 前置 sweep            | `fe-38-frontend-backlog-sweep-g1-g3.md`                                                                  | 已确认工作台 / 顶栏待办行为不一致。                                                              | 作为 FE-39 问题来源。                                  |
| Todo contract         | `libs/shared/contracts/src/lib/shared-contracts.ts`、`libs/shared/api-client/model/todo-item-summary.ts` | `targetObjectType`、`sourceType`、`status` 仍是 plain string；`projectId` 可为 null。            | 前端 helper 必须显式白名单解析并处理不可导航状态。     |
| Auth store            | `libs/admin/data-access/src/lib/auth/auth.store.ts`                                                      | `AuthStore` 在 login / initialize 时加载 `/me/todos`，并提供 `myTodos()` 与 `openTodosCount()`。 | 不新增 store；工作台和顶栏继续消费现有状态。           |
| Workbench             | `apps/poms-admin/src/app/features/dashboard/workbench.ts`                                                | 支持四类 target，但提成 target route 不精确。                                                    | 改为消费共享 helper。                                  |
| Topbar                | `apps/poms-admin/src/app/layout/components/app.topbar.ts`                                                | 只支持 `Contract` / `Project`。                                                                  | 改为消费共享 helper。                                  |
| Commission operations | `apps/poms-admin/src/app/features/commission/project-commission.ts`                                      | 已读取 `payoutId` / `adjustmentId` query params 并设置高亮 signal。                              | FE-39 只保证 URL 进入 operations，体验深化留给 FE-40。 |
| Routes                | `apps/poms-admin/src/app.routes.ts`                                                                      | `/projects/:id/commission/operations` 是提成操作正式子路由。                                     | 作为提成待办导航目标。                                 |

---

## 4. 设计边界

### 4.1 Todo Target 白名单

`FE-39` 不允许把 `targetObjectType: string` 当成开放路由表。实现中应建立本地已知 target 常量或 literal union，例如：

| Target                 | Required fields               | Commands                                               | Query Params                                |
| ---------------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| `Contract`             | `targetObjectId`              | `['/contracts', targetObjectId]`                       | none                                        |
| `Project`              | `targetObjectId`              | `['/projects', targetObjectId]`                        | none                                        |
| `CommissionPayout`     | `targetObjectId`, `projectId` | `['/projects', projectId, 'commission', 'operations']` | `payoutId`, optional `approvalRecordId`     |
| `CommissionAdjustment` | `targetObjectId`, `projectId` | `['/projects', projectId, 'commission', 'operations']` | `adjustmentId`, optional `approvalRecordId` |

未知 target 或缺少 required fields 时，helper 返回 `null` 或 `{ navigable: false }`，由 UI 显示不可跳转状态。

### 4.2 组件职责

| 组件                     | 职责                                                       | 不再承担               |
| ------------------------ | ---------------------------------------------------------- | ---------------------- |
| `todo-navigation` helper | target 白名单、Router commands、query params、不可导航原因 | UI 展示和权限判断      |
| `Workbench`              | 展示近期项目、待办和工作台入口；点击时调用 helper          | 手写 target route 分支 |
| `AppTopbar`              | 展示全局待办；点击时调用 helper                            | 手写 target route 分支 |

### 4.3 权限边界

`FE-39` 不改变权限模型。`/dashboard` 仍只要求登录；目标页面继续由既有 `permissionGuard` 保护。待办导航 helper 只负责构造路由，不绕过 route guard。

### 4.4 Sensitive Field 边界

`FE-39` 不新增敏感字段展示。工作台仍只展示:

1. 项目编号、项目名称、阶段、状态。
2. 待办标题、业务域、目标标题、当前节点。

完整敏感字段矩阵由 `FE-42` 处理。

---

## 5. 文件影响范围

Expected runtime files:

1. `apps/poms-admin/src/app/shared/navigation/todo-navigation.ts`
2. `apps/poms-admin/src/app/shared/navigation/todo-navigation.spec.ts`
3. `apps/poms-admin/src/app/features/dashboard/workbench.ts`
4. `apps/poms-admin/src/app/layout/components/app.topbar.ts`
5. `apps/poms-admin-e2e/src/*workbench*.spec.ts` 或现有 journey spec 中的目标段落

Expected docs:

1. `docs/design/archive/slices/fe-39-workbench-todo-entry-g3-checkpoint.md`
2. `docs/design/archive/slices/fe-39-workbench-todo-entry-g3-g4-closeout.md`
3. `docs/design/phase2-development-execution-tracker.md`
4. `docs/design/poms-design-progress.md`

---

## 6. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/shared/navigation/todo-navigation.spec.ts`
3. `corepack pnpm nx lint poms-admin`
4. `corepack pnpm nx build poms-admin`
5. Targeted Playwright E2E covering:
   - login 后从菜单进入 `/dashboard`
   - 工作台待办进入 Project / Contract / Commission target
   - 顶栏待办进入 Project / Contract / Commission target

Not required unless implementation touches the corresponding layer:

1. `shared-api-client:check`：不改 API / generated client。
2. `poms-api` lint / build / test：不改后端。
3. `migration-check`：不改 DDL。

---

## 7. 例外与风险

| ID                                 | Level | Scope              | Owner | Cleanup Due                            | Decision                                                   |
| ---------------------------------- | ----- | ------------------ | ----- | -------------------------------------- | ---------------------------------------------------------- |
| `FE39-R1-TODO-TARGET-PLAIN-STRING` | Low   | Todo target typing | Codex | 当后端决定把 target 类型收敛为 enum 时 | Accepted for FE-39：前端用显式白名单解析，不扩大后端契约。 |

---

## 8. G1 结论

`FE-39` 可以进入 frontend implementation。

冻结条件:

1. 不新增后端接口或契约。
2. 先实现共享待办导航 helper，再迁移 `Workbench` 和 `AppTopbar`。
3. 提成 target 的 URL 必须进入 `/projects/:id/commission/operations`，但 operations 页内部体验由 `FE-40` 继续深化。
4. 未知 target 或缺少 `projectId` 的提成 target 必须不可导航并可解释，不能静默跳错页面。
