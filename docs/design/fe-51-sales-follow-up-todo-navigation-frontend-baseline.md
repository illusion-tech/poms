# FE-51 Sales Follow Up Todo Navigation Frontend Baseline

- Task ID: `FE-51`
- Slice type: `frontend-only`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `FE-51`
- Public route surface: no new route; uses existing `/projects/:id`, `/leads`, `/customers` with query params.
- Status: `G4`
- G1 Date: 2026-05-01
- G4 Date: 2026-05-01

## 1. Scope

本片承接 `EX-49A` 已交付的销售跟进提醒 `TodoItem`:

1. 扩展 `todo-navigation`，让 `SalesFollowUpRecord` / `sales_follow_up_reminder` 可进入 Project / Lead / Customer 上下文。
2. 工作台和顶栏继续复用统一 helper；工作台补充显示 `currentNodeName`，让下次跟进时间可见。
3. `/projects/:id` 读取 `followUpId` / `todoId` query params，并在销售跟进区域提示用户从提醒进入。
4. `/leads?leadId=...&followUpId=...&todoId=...` 自动打开线索详情，并在详情中提示用户从提醒进入。
5. `/customers?customerId=...&followUpId=...&todoId=...` 自动打开客户详情，并在详情中提示用户从提醒进入。

## 2. Out Of Scope

1. 不新增或修改后端 API、DTO、OpenAPI、generated client、DDL 或 permission key。
2. 不生成、完成、延期或转派待办；这些已由 `EX-49A` 后端命令语义控制。
3. 不做团队提醒、主管视图、逾期报表或 push notification。
4. 不把 `TodoItemSummary.targetObjectType` 改成 enum；继续使用前端显式白名单。
5. 不做复杂滚动定位或高亮具体历史记录；本片只保证进入正确业务上下文并提示处理语义。

## 3. Formal Inputs

| Input                | Source                                                                   | Status   | Rule                                                                                |
| -------------------- | ------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------- |
| Reminder runtime     | `docs/design/ex-49a-sales-follow-up-reminder-todo-runtime-baseline.md`   | G4       | 后端已派生 `TodoItem` 并补 `targetTitle` / `currentNodeName`。                      |
| Reminder governance  | `docs/design/ex-49-sales-follow-up-reminder-todo-governance-baseline.md` | G4       | 前端必须用 Project / Lead / Customer query params 进入上下文。                      |
| Existing todo helper | `apps/poms-admin/src/app/shared/navigation/todo-navigation.ts`           | Existing | 所有待办入口继续走统一白名单解析。                                                  |
| Workbench / topbar   | `FE-39`                                                                  | Existing | 不新建入口组件；复用 `resolveTodoNavigationTarget`。                                |
| Follow-up panels     | `FE-47` / `FE-50`                                                        | Existing | Customer / Lead / Project 详情页已有 `SalesFollowUpPanel`，本片只补提醒入口上下文。 |

## 4. Navigation Mapping

| Todo Target | Required Todo Fields                             | Frontend Route                                                          |
| ----------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `Project`   | `targetObjectId`, `sourceId`, `id`               | `/projects/:targetObjectId?followUpId=:sourceId&todoId=:id`             |
| `Lead`      | `targetObjectId`, `sourceId`, `id`               | `/leads?leadId=:targetObjectId&followUpId=:sourceId&todoId=:id`         |
| `Customer`  | `targetObjectId`, `sourceId`, `id`               | `/customers?customerId=:targetObjectId&followUpId=:sourceId&todoId=:id` |
| Other todos | Existing `Contract` / `Commission*` helper rules | unchanged                                                               |

Only `sourceType=SalesFollowUpRecord` and `todoType=sales_follow_up_reminder` receive `followUpId` / `todoId`.

## 5. Page Behavior

| Page      | Behavior                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Workbench | Show `currentNodeName` when present and navigate through the helper.                                  |
| Topbar    | Already shows `currentNodeName`; only inherits helper mapping.                                        |
| Project   | Read `followUpId` / `todoId`, show contextual feedback above project sales follow-up panel.           |
| Lead list | Read `leadId`, open detail dialog, show contextual feedback above lead sales follow-up panel.         |
| Customer  | Read `customerId`, open detail dialog, show contextual feedback above customer sales follow-up panel. |

When a query-opened customer or lead dialog closes, the page should clear `customerId` / `leadId` / `followUpId` / `todoId` from the URL with `replaceUrl` to avoid immediate re-open on refresh.

## 6. Tests And Checks

Required and completed:

- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=todo-navigation` passed, 1 suite / 9 tests.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-list` passed, 1 suite / 2 tests.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list` passed, 1 suite / 14 tests.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail` passed, 1 suite / 23 tests.
- `corepack pnpm nx lint poms-admin` passed.
- `corepack pnpm nx build poms-admin` passed with existing initial bundle budget warning.
- `corepack pnpm run format:md`
- `corepack pnpm run format:md:check`
- `git diff --check`

Not required:

- Backend tests, because this slice changes only frontend runtime and docs.
- OpenAPI / generated client checks, because no API contract changes are made.
- Migration checks, because no DDL changes are made.

## 7. Drift And Exceptions

| ID                                    | Type              | Scope                   | Decision                                                                                                     |
| ------------------------------------- | ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `FE51-E1-NO-BACKEND-CHANGE`           | accepted boundary | API / DTO / DDL         | `EX-49A` already delivered reminder todos; this slice consumes existing `TodoItemSummary` only.              |
| `FE51-E2-NO-RECORD-LEVEL-HIGHLIGHT`   | accepted boundary | frontend focus          | Target pages show reminder context above the sales follow-up panel but do not scroll to or highlight a row.  |
| `FE51-E3-BUILD-BUDGET-WARNING`        | existing baseline | frontend build evidence | `poms-admin` build retains the known initial bundle budget warning; this slice does not introduce a failure. |
| `FE51-E4-TODO-NAVIGATION-CACHE-RERUN` | tool-noise        | focused test evidence   | Initial parallel run timed out for `todo-navigation`; the isolated rerun passed from matching cached output. |

## 8. G4 Closeout

Status: `Done`

Delivered:

1. `todo-navigation` now maps sales follow-up reminders to Project / Lead / Customer targets with `followUpId` and `todoId` query params.
2. Workbench todo cards display `currentNodeName` so the next follow-up datetime is visible outside the topbar.
3. Customer and Lead list pages open detail dialogs from `customerId` / `leadId` query params and clear the reminder query when closed.
4. Project detail reads reminder query params and shows contextual feedback above the project sales follow-up panel.
5. No backend route, contract, generated client, migration or permission changes were introduced.

Next executable slice:

1. Continue with the next tracker item after the user commits `FE-51`.
