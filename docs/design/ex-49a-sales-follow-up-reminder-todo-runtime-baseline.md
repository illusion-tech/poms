# EX-49A Sales Follow Up Reminder Todo Runtime Baseline

- Task ID: `EX-49A`
- Slice type: `api / command`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-49A`
- Public route surface: no new public route; extends behavior behind existing sales follow-up commands and `GET /me/todos`.
- Status: `G4`
- G1 Date: 2026-05-01
- G4 Date: 2026-05-01

## 1. Scope

本片承接 `EX-49` 已冻结的销售跟进提醒治理口径:

1. 在 `createSalesFollowUpRecord` 成功后，根据 active 记录的 `nextFollowUpAt` 和 `ownerUserId` 派生销售跟进提醒 `TodoItem`。
2. 在 `replaceSalesFollowUpRecord` 成功后，取消旧记录提醒，并按替代记录重新派生提醒。
3. 在 `voidSalesFollowUpRecord` 成功后，取消被作废记录提醒。
4. 扩展 `GET /me/todos` 的后端摘要装配，让 `Project` / `Lead` / `Customer` 销售跟进待办返回 `targetTitle` 和下次跟进节点名。
5. 不改变 shared contract schema，不新增 generated client，不新增迁移。

## 2. Out Of Scope

1. 不新增 public route、DTO、OpenAPI operation 或 generated client。
2. 不新增 `NotificationRecord`、邮件、短信、日历、外部 IM 或 scheduler。
3. 不做前端导航和页面聚焦；由 `FE-51` 承接。
4. 不新增团队待办、主管下属提醒、批量延期、SLA 或逾期报表。
5. 不新增 `scheduled` 待办状态，也不新增手动完成提醒命令。

## 3. Formal Inputs

| Input                 | Source                                                                    | Status  | Rule                                                                                         |
| --------------------- | ------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| Reminder governance   | `docs/design/ex-49-sales-follow-up-reminder-todo-governance-baseline.md`  | G4      | 以 active `SalesFollowUpRecord` 为提醒事实源，统一派生到 `TodoItem`。                        |
| Follow-up lifecycle   | `docs/design/ex-48a-sales-follow-up-change-lifecycle-runtime-baseline.md` | G4      | `superseded` / `voided` 记录不得保留 active reminder。                                       |
| Follow-up fact source | `docs/design/ex-44-sales-follow-up-record-baseline.md`                    | G4      | `nextFollowUpAt` 是销售跟进记录上的可空 datetime。                                           |
| Unified todo route    | `docs/design/api-route-canonical-inventory.md` / `GET /me/todos`          | aligned | 复用既有当前用户待办查询，不新增路由。                                                       |
| Todo DTO              | `TodoItemSummary`                                                         | frozen  | 复用既有 `sourceType`、`sourceId`、`targetObjectType`、`targetObjectId`、`dueAt`、摘要字段。 |

## 4. Runtime Mapping

| Field              | Runtime Value                                                                        |
| ------------------ | ------------------------------------------------------------------------------------ |
| `sourceType`       | `SalesFollowUpRecord`                                                                |
| `sourceId`         | current `sales_follow_up_record.id`                                                  |
| `todoType`         | `sales_follow_up_reminder`                                                           |
| `businessDomain`   | `sales`                                                                              |
| `targetObjectType` | `Project` when `projectId` exists; else `Lead` when `leadId` exists; else `Customer` |
| `targetObjectId`   | `projectId ?? leadId ?? customerId`                                                  |
| `projectId`        | `projectId ?? null`                                                                  |
| `title`            | `销售跟进提醒：{targetTitle}`                                                        |
| `summary`          | trimmed `record.summary`, never `record.detail`                                      |
| `assigneeUserId`   | `record.ownerUserId`                                                                 |
| `status`           | `open`                                                                               |
| `priority`         | `high` when `nextFollowUpAt <= now`, else `normal`                                   |
| `dueAt`            | `record.nextFollowUpAt`                                                              |

## 5. Command Semantics

### Create

1. Persist the new active record.
2. If the record has `ownerUserId`, close existing open / processing sales follow-up reminder todos in the same owner + target stream whose `sourceId` differs from the new record.
3. If the record has both `ownerUserId` and `nextFollowUpAt`, upsert one open reminder todo for the new record.
4. If `nextFollowUpAt` is null, do not create a new todo.

### Replace

1. Persist old record as `superseded` and replacement as `active`.
2. Cancel open / processing reminder todos whose source is the superseded record.
3. Apply the create semantics to the replacement record.

### Void

1. Persist the active record as `voided`.
2. Cancel open / processing reminder todos whose source is the voided record.
3. Do not recreate an older fallback reminder.

## 6. Query Semantics

`GET /me/todos` must continue returning only current-user open / processing todos.

新增摘要装配:

| Target Type | Repository Source | `targetTitle` | `currentNodeName`            |
| ----------- | ----------------- | ------------- | ---------------------------- |
| `Project`   | `Project`         | `projectName` | `下次跟进：yyyy-MM-dd HH:mm` |
| `Lead`      | `Lead`            | `leadName`    | `下次跟进：yyyy-MM-dd HH:mm` |
| `Customer`  | `Customer`        | `displayName` | `下次跟进：yyyy-MM-dd HH:mm` |

`allowedActions` remains empty for sales follow-up reminder todos.

`currentNodeName` uses the POMS China business timezone (`UTC+8`) for stable backend rendering; `dueAt` remains the authoritative ISO datetime for frontend localization.

## 7. Persistence Boundary

No DDL change.

This slice reuses:

- `todo_item.source_type`
- `todo_item.source_id`
- `todo_item.todo_type`
- `todo_item.business_domain`
- `todo_item.target_object_type`
- `todo_item.target_object_id`
- `todo_item.project_id`
- `todo_item.due_at`
- existing unique index `uq_todo_item_open_source`

## 8. Tests And Checks

Required and completed:

- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=sales-follow-up` passed, 3 suites / 19 tests.
- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=approval.service` passed, 1 suite / 28 tests.
- `corepack pnpm nx lint poms-api` passed.
- `corepack pnpm nx build poms-api` passed.
- `corepack pnpm nx test poms-api --runInBand` passed, 46 suites / 561 tests.
- `corepack pnpm run format:md`
- `corepack pnpm run format:md:check`
- `git diff --check`

Not required:

- OpenAPI / generated client, because no public schema changes are made.
- Migration check, because no DDL changes are made.
- `poms-admin` lint / build / tests, because no frontend runtime files are changed.

## 9. Drift And Exceptions

| ID                               | Type              | Scope                  | Decision                                                                                                           |
| -------------------------------- | ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `EX49A-E1-NO-FRONTEND-DEEPLINK`  | accepted boundary | frontend entry         | `FE-51` owns todo navigation, query params and target page focus.                                                  |
| `EX49A-E2-NO-DDL-CHANGE`         | accepted boundary | persistence            | Existing `todo_item` fields and unique index are sufficient; no migration is required.                             |
| `EX49A-E3-NO-PUSH-NOTIFICATION`  | accepted boundary | notification           | Topbar / workbench continue to consume personal todos only; push-style notification remains future governance.     |
| `EX49A-E4-BACKEND-TODO-TIMEZONE` | accepted boundary | todo summary rendering | Backend `currentNodeName` uses UTC+8 for stable China-business display; frontend will still localize from `dueAt`. |

## 10. G4 Closeout

Status: `Done`

Delivered:

1. `createSalesFollowUpRecord` now syncs same-stream reminders and creates an open reminder when `nextFollowUpAt` exists.
2. `replaceSalesFollowUpRecord` cancels the superseded record reminder and derives the replacement reminder.
3. `voidSalesFollowUpRecord` cancels the voided record reminder without recreating fallback reminders.
4. `GET /me/todos` now enriches sales reminders for Project / Lead / Customer targets.
5. No public route, contract schema, generated client or migration changes were introduced.

Next executable slice:

1. `FE-51`: consume sales follow-up reminder todos in frontend navigation and target pages.
