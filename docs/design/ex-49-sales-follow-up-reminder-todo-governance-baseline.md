# EX-49 Sales Follow Up Reminder Todo Governance Baseline

- Task ID: `EX-49`
- Slice type: `docs-only / governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-49`
- Public route surface: no new or changed public route in this slice.
- Status: `G4`
- G1 Date: 2026-05-01
- G4 Date: 2026-05-01

## 1. Scope

本片冻结 `SalesFollowUpRecord.nextFollowUpAt` 如何进入工作台、顶栏待办和后续通知链:

1. 确认销售跟进提醒使用既有 `TodoItem` 统一待办表派生，不新增 `SalesFollowUpReminder` 独立业务主表。
2. 冻结提醒事实源、派生条件、幂等键、关闭条件、导航目标和权限边界。
3. 冻结 `create` / `replace` / `void` 销售跟进记录时如何生成、替换或关闭提醒待办。
4. 冻结工作台 / 顶栏进入销售跟进上下文的目标类型和 deep-link 规则。
5. 拆出后续运行时切片 `EX-49A` 与前端切片 `FE-51`。

## 2. Out Of Scope

1. 本片不写运行时代码，不新增 API、DTO、OpenAPI、generated client、migration 或 permission key。
2. 不实现站内消息、推送、邮件、短信、日历或外部 IM 通知。
3. 不新增“手动完成提醒”按钮；销售跟进提醒只能通过新的业务跟进事实完成。
4. 不做主管查看下属提醒、提醒转派、批量延期、SLA 统计或逾期报表。
5. 不改变销售跟进记录的 append-only / replacement / void 生命周期语义。

## 3. Formal Inputs

| Input Type                | Document / Source                                                         | Status   | Notes                                                                                       |
| ------------------------- | ------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| Sales follow-up fact      | `docs/design/ex-44-sales-follow-up-record-baseline.md`                    | Frozen   | `nextFollowUpAt` 是销售跟进记录上的可空 ISO datetime，不是项目生命周期 milestone。          |
| Lifecycle governance      | `docs/design/ex-48a-sales-follow-up-change-lifecycle-runtime-baseline.md` | Frozen   | `superseded` / `voided` 记录不得参与默认列表、提醒或下一步动作计算。                        |
| Frontend lifecycle entry  | `docs/design/fe-50-sales-follow-up-change-lifecycle-frontend-baseline.md` | Frozen   | 共享面板已能更正 / 作废记录并查看历史。                                                     |
| Unified todo              | `todo_item` / `TodoItemSummary`                                           | Existing | 统一待办已有 `sourceType`、`sourceId`、`targetObjectType`、`targetObjectId`、`dueAt` 字段。 |
| Workbench / topbar entry  | `FE-39` baseline and G4 closeout                                          | Existing | 待办入口已统一消费 `todo-navigation` helper，target 仍由前端白名单解析。                    |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                            | N/A      | 本片不新增 public route；后续运行时复用 `GET /me/todos` 与既有 sales-follow-up commands。   |

## 4. SSOT

| Concern            | Source Of Truth                         | Rule                                                                                       |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Reminder source    | Active `SalesFollowUpRecord`            | 只有 `status=active`、`nextFollowUpAt != null`、`ownerUserId != null` 的记录可以派生提醒。 |
| Reminder sink      | `TodoItem`                              | 提醒进入统一待办，不新增平行提醒表。                                                       |
| Due datetime       | `SalesFollowUpRecord.nextFollowUpAt`    | 映射为 `TodoItem.dueAt`，保留 ISO datetime 语义。                                          |
| Assignee           | `SalesFollowUpRecord.ownerUserId`       | 无负责人不生成个人待办；公共池 / 主管分配另行治理。                                        |
| Reminder lifecycle | Sales follow-up command lifecycle       | 新跟进事实完成旧提醒；replace / void 取消对应提醒。                                        |
| Navigation         | `TodoItem.targetObjectType` + source id | target 定位客户 / 线索 / 项目；source 保留具体 `SalesFollowUpRecord` id。                  |
| Security           | `GET /me/todos` + target route guards   | 只返回当前用户待办；打开目标仍受客户 / 线索 / 项目 read guard 限制。                       |

## 5. Reminder Todo Mapping

| Todo Field         | Value                                                                                | Notes                                                   |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `sourceType`       | `SalesFollowUpRecord`                                                                | 指向产生提醒的跟进记录。                                |
| `sourceId`         | `sales_follow_up_record.id`                                                          | 与当前 open todo 唯一约束配合，确保同一记录不重复派生。 |
| `todoType`         | `sales_follow_up_reminder`                                                           | 与审批待办区分。                                        |
| `businessDomain`   | `sales`                                                                              | 工作台展示销售域。                                      |
| `targetObjectType` | `Project` when `projectId` exists; else `Lead` when `leadId` exists; else `Customer` | 按最具体业务上下文定位。                                |
| `targetObjectId`   | `projectId ?? leadId ?? customerId`                                                  | 与 target type 一致。                                   |
| `projectId`        | `projectId ?? null`                                                                  | 项目跟进可直接进入项目详情。                            |
| `title`            | `销售跟进提醒：{targetTitle}`                                                        | target title 来自 Project / Lead / Customer 读模型。    |
| `summary`          | `record.summary` trimmed, optional short prefix `下次跟进`                           | 不展示 `detail`，避免把完整沟通内容推到全局待办。       |
| `currentNodeName`  | `下次跟进：yyyy-MM-dd HH:mm`                                                         | 由 `GET /me/todos` mapper 生成，不需要持久化。          |
| `allowedActions`   | `[]`                                                                                 | 不支持在待办里直接完成；必须回到业务页登记新跟进。      |
| `assigneeUserId`   | `record.ownerUserId`                                                                 | owner 为空时不生成。                                    |
| `status`           | `open`                                                                               | 当前 MVP 不新增 `scheduled` 状态。                      |
| `priority`         | `normal` default; runtime may set `high` when `nextFollowUpAt <= now` during sync    | 逾期高亮优先由前端根据 `dueAt` 解释。                   |
| `dueAt`            | `record.nextFollowUpAt`                                                              | 作为排序和展示的时间事实。                              |

## 6. Stream And Idempotency Rules

销售跟进提醒不是“每条历史记录都长期待办”。它表达某个销售上下文下的下一次动作。

### 6.1 Reminder Stream Key

同一销售提醒流由以下字段确定:

```text
assigneeUserId
targetObjectType = Project | Lead | Customer
targetObjectId = projectId ?? leadId ?? customerId
todoType = sales_follow_up_reminder
```

### 6.2 Create Record

When `createSalesFollowUpRecord` succeeds:

1. Close existing open / processing sales follow-up reminder todos in the same stream whose `sourceId` is not the new record id.
2. If the new record has `nextFollowUpAt` and `ownerUserId`, upsert one open todo for the new record.
3. If the new record has no `nextFollowUpAt`, do not create a new todo; the previous reminder is considered completed by the newly recorded follow-up fact.
4. Existing `uq_todo_item_open_source` remains the per-record idempotency backstop; stream cleanup is command logic, not a new unique index.

### 6.3 Replace Record

When `replaceSalesFollowUpRecord` succeeds:

1. Cancel open / processing todos whose `sourceType=SalesFollowUpRecord` and `sourceId` is the superseded record id.
2. Apply the create-record rule to the replacement record.
3. If replacement changes owner, the old owner todo is canceled and the new owner receives the new todo when `nextFollowUpAt` exists.
4. Superseded records never keep active reminders.

### 6.4 Void Record

When `voidSalesFollowUpRecord` succeeds:

1. Cancel open / processing todos whose `sourceType=SalesFollowUpRecord` and `sourceId` is the voided record id.
2. Do not recreate a fallback todo from an older record automatically.
3. If the sales user still needs a next action, they must create a new follow-up record with `nextFollowUpAt`.

## 7. Completion Semantics

Sales follow-up reminders should not have a standalone “mark done” command in MVP.

Reason:

- A reminder is only evidence that a next action is expected.
- Completing it without a new `SalesFollowUpRecord` would create a gap between dashboard state and customer communication facts.

Therefore:

1. Newer follow-up record in the same stream completes the previous open reminder.
2. Replace cancels the superseded record reminder and creates the replacement reminder if needed.
3. Void cancels the voided record reminder.
4. Closing / converting / deleting target objects does not silently complete reminders unless the corresponding business command explicitly calls reminder cleanup.

## 8. Query And Navigation Boundary

`GET /me/todos` remains the aggregation entry for the current user.

Future `EX-49A` must extend todo summary enrichment for these targets:

| Target Type | Target Title Source    | Navigation Goal                                                             |
| ----------- | ---------------------- | --------------------------------------------------------------------------- |
| `Project`   | `Project.projectName`  | `/projects/:id?followUpId=:sourceId&todoId=:todoId`                         |
| `Lead`      | `Lead.leadName`        | `/leads?leadId=:targetObjectId&followUpId=:sourceId&todoId=:todoId`         |
| `Customer`  | `Customer.displayName` | `/customers?customerId=:targetObjectId&followUpId=:sourceId&todoId=:todoId` |

Future `FE-51` must extend `todo-navigation`:

1. Keep the existing explicit target whitelist.
2. Add `Lead` and `Customer` targets only when the corresponding list pages can consume query params.
3. Add `followUpId` / `todoId` query params for project, lead and customer reminder deep links.
4. Target page should explain that the user entered from a follow-up reminder and focus the sales follow-up panel when practical.

## 9. Permission And Sensitive Data Boundary

1. `GET /me/todos` remains `Authenticated`; it returns only todos assigned to the current user.
2. Target page access remains enforced by route guards:
   - `Project` -> `project:read`
   - `Lead` -> `lead:read`
   - `Customer` -> `customer:read`
3. Reminder todo summaries must not expose `SalesFollowUpRecord.detail`.
4. Reminder creation does not grant target read permission. If a user lacks route permission, the UI must show the existing not-navigable / access-denied path.
5. Manager-level “team follow-up reminder” visibility is out of scope and must not be inferred from personal todos.

## 10. Notification Boundary

Topbar bell and workbench cards are todo surfaces, not a durable notification subsystem.

`EX-49A` may refresh `AuthStore.myTodos()` after follow-up mutations, but it must not create `NotificationRecord`, email, SMS, calendar events or external push records.

If later product work requires push-style notifications, create a separate governance slice with:

1. notification source event,
2. delivery channel,
3. dedupe key,
4. read / delivered state,
5. retry and failure semantics.

## 11. Downstream Slices

| Slice    | Type            | Scope                                                                                                                                                        | Out Of Scope                                                 |
| -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `EX-49A` | `api / command` | Implement sales follow-up reminder todo derivation inside create / replace / void commands and enrich `GET /me/todos` for Project / Lead / Customer targets. | No new public routes, no notification records, no scheduler. |
| `FE-51`  | `frontend-only` | Extend todo navigation and target pages so sales follow-up reminders open Project / Lead / Customer context and surface `dueAt` clearly.                     | No backend reminder generation and no push notification.     |

## 12. Tests And Checks

This slice is docs-only / governance.

Required and completed:

- `corepack pnpm run format:md`
- `corepack pnpm run format:md:check`
- `git diff --check`

Not required for this slice:

- `poms-api` lint / build / tests, because no runtime backend files are changed.
- `poms-admin` lint / build / tests, because no runtime frontend files are changed.
- OpenAPI / generated client checks, because no public contract changes are made.
- Migration check, because no DDL changes are made.

## 13. Risks And Exceptions

| ID                                  | Level | Scope                         | Decision                                                                                                              | Cleanup Owner | Cleanup Due |
| ----------------------------------- | ----- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| `EX49-R1-NO-SCHEDULED-TODO-STATUS`  | Low   | Todo lifecycle                | MVP uses immediate `open` todo with future `dueAt`; no new `scheduled` status until product asks for due-only queues. | `EX-49A`      | runtime G3  |
| `EX49-R2-NO-MANUAL-COMPLETE-ACTION` | Low   | User workflow                 | Reminder completion requires creating a follow-up record; no standalone mark-done command.                            | `FE-51`       | frontend G3 |
| `EX49-R3-NO-PUSH-NOTIFICATION`      | Low   | Notification / external comms | Topbar / workbench todo surfaces are accepted MVP; push channels require a separate governance slice.                 | Future        | TBD         |

## 14. G4 Closeout

Status: `Done`

Delivered:

1. Sales follow-up reminder semantics are frozen on top of existing `TodoItem`.
2. The system has one personal reminder stream per owner and target context.
3. Create / replace / void cleanup rules are explicit and compatible with `EX-48A`.
4. Workbench / topbar navigation requirements are explicit for Project / Lead / Customer targets.
5. Runtime and frontend implementation have been split into `EX-49A` and `FE-51`.
