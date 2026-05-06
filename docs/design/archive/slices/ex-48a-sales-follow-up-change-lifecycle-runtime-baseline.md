# EX-48A Sales Follow Up Change Lifecycle Runtime Baseline

- Task ID: `EX-48A`
- Slice type: `cross-layer-high-risk`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-48A`
- Public route surface: implements planned `POST /sales-follow-up-records/{id}:replace` and `POST /sales-follow-up-records/{id}:void`.
- Status: `G4`
- G1 Date: 2026-05-01
- G4 Date: 2026-05-01

## 1. Scope

本片承接 `EX-48` 已冻结的销售跟进记录替代 / 作废治理基线:

1. 为 `SalesFollowUpRecord` 增加 lifecycle 字段和约束。
2. 落地 `replaceSalesFollowUpRecord`，用追加式新记录替代旧记录。
3. 落地 `voidSalesFollowUpRecord`，用状态作废替代物理删除。
4. 扩展 shared contracts、API DTO、OpenAPI 与 generated client。
5. 默认列表继续只返回 `active`，审计历史通过 `lifecycleScope=all` 显式读取。
6. 记录 replace / void 运行时审计事件。

## 2. Out Of Scope

1. 不新增前端按钮、弹窗、历史筛选或浏览器验证；由 `FE-50` 承接。
2. 不处理 `nextFollowUpAt` 进入工作台 / 待办 / 通知；由 `EX-49` 承接。
3. 不引入审批、restore / revert、物理删除或全文审计差异视图。
4. 不改变销售跟进创建入口、客户 / 线索 / 项目锚点规则和既有权限 key。

## 3. SSOT

| Concern                     | Source Of Truth                                          | Runtime Rule                                                                                   |
| --------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Business semantics          | `EX-48` baseline                                         | 跟进正文更正不得原地覆盖；使用 replacement chain。                                             |
| Public route canonical path | `docs/design/api-route-canonical-inventory.md`           | `POST /sales-follow-up-records/{id}:replace`、`POST /sales-follow-up-records/{id}:void`。      |
| State machine               | `SalesFollowUpRecordStatus`                              | `active -> superseded` 或 `active -> voided`；`superseded` / `voided` 为终态。                 |
| Concurrency                 | `rowVersion` + request `expectedVersion`                 | replace / void 必须校验目标记录当前版本。                                                      |
| Anchor immutability         | `customerId` / `leadId` / `projectId` on original record | replacement 沿用旧记录锚点，不允许通过替代把记录迁移到其他客户、线索或项目。                   |
| Read default                | `SalesFollowUpRecordListQuery.lifecycleScope`            | 默认 `active`；显式传 `all` 才包含 `superseded` / `voided`。                                   |
| Audit                       | `RuntimeAuditService`                                    | replace 记录 `sales_follow_up.replaced`；void 记录 `sales_follow_up.voided`，携带 request id。 |
| Generated client            | `libs/shared/api-client` generated from current OpenAPI  | 前端后续只消费 generated client 的 request / response model，不手写路径或 DTO。                |

## 4. API / DTO Boundary

| Capability                   | Route                                        | Request Contract                    | Response Contract            | HTTP Code | Guard                                                    | Status    |
| ---------------------------- | -------------------------------------------- | ----------------------------------- | ---------------------------- | --------- | -------------------------------------------------------- | --------- |
| `listSalesFollowUpRecords`   | `GET /sales-follow-up-records`               | `SalesFollowUpRecordListQuery`      | `SalesFollowUpRecordList`    | `200`     | any of `customer:read` / `lead:read` / `project:read`    | Extended  |
| `createSalesFollowUpRecord`  | `POST /sales-follow-up-records`              | `CreateSalesFollowUpRecordRequest`  | `SalesFollowUpRecordSummary` | `201`     | any of `customer:write` / `lead:write` / `project:write` | Existing  |
| `replaceSalesFollowUpRecord` | `POST /sales-follow-up-records/{id}:replace` | `ReplaceSalesFollowUpRecordRequest` | `SalesFollowUpRecordSummary` | `200`     | any of `customer:write` / `lead:write` / `project:write` | Delivered |
| `voidSalesFollowUpRecord`    | `POST /sales-follow-up-records/{id}:void`    | `VoidSalesFollowUpRecordRequest`    | `SalesFollowUpRecordSummary` | `200`     | any of `customer:write` / `lead:write` / `project:write` | Delivered |

### DTO Additions

- `SalesFollowUpRecordStatus`: `active` / `superseded` / `voided`
- `SalesFollowUpRecordLifecycleScope`: `active` / `all`
- `ReplaceSalesFollowUpRecordRequest`
  - follow-up content fields
  - `ownerOrgId`
  - `ownerUserId`
  - `replacementReason`
  - `expectedVersion`
- `VoidSalesFollowUpRecordRequest`
  - `reason`
  - `comment?`
  - `expectedVersion`
- `SalesFollowUpRecordSummary`
  - `status`
  - `supersedesId`
  - `replacedById`
  - `replacementReason`
  - `voidedAt`
  - `voidedBy`
  - `voidedByName`
  - `voidReason`

## 5. Persistence Boundary

Migration: `Migration20260501100000_ex48a_sales_follow_up_change_lifecycle`

| Field                   | DDL / Rule                                        | Entity / Contract Field     | Status    |
| ----------------------- | ------------------------------------------------- | --------------------------- | --------- |
| `status`                | `varchar(32)` default `active`, check enum values | `status`                    | Delivered |
| `supersedes_record_id`  | nullable self FK, indexed, unique when present    | `supersedesId`              | Delivered |
| `replaced_by_record_id` | nullable self FK, indexed, unique when present    | `replacedById`              | Delivered |
| `replacement_reason`    | nullable `text`                                   | `replacementReason`         | Delivered |
| `voided_at`             | nullable `timestamptz`                            | `voidedAt`                  | Delivered |
| `voided_by`             | nullable `uuid`                                   | `voidedBy` / `voidedByName` | Delivered |
| `void_reason`           | nullable `text`                                   | `voidReason`                | Delivered |
| `row_version`           | existing optimistic version                       | `rowVersion`                | Existing  |

Indexes:

- `idx_sales_follow_up_status_occurred` on `status, occurred_at desc`
- `idx_sales_follow_up_supersedes`
- `idx_sales_follow_up_replaced_by`
- `uq_sales_follow_up_supersedes_once`
- `uq_sales_follow_up_replaced_by_once`

## 6. Command Semantics

### Replace

1. Target record must exist and be `active`.
2. `expectedVersion` must match target `rowVersion`.
3. Existing record becomes `superseded` and receives `replacedByRecordId`.
4. New record becomes `active`, receives `supersedesRecordId`, and inherits original `customerId` / `leadId` / `projectId`.
5. New record can update follow-up content, owner, occurred time, outcome and next follow-up time.
6. Runtime audit event `sales_follow_up.replaced` records before / after snapshot and replacement reason.

### Void

1. Target record must exist and be `active`.
2. `expectedVersion` must match target `rowVersion`.
3. Record becomes `voided`, receives `voidedAt`, `voidedBy` and `voidReason`.
4. Runtime audit event `sales_follow_up.voided` records before / after snapshot and reason.
5. No public API performs physical deletion.

## 7. Read Semantics

1. `GET /sales-follow-up-records` defaults to active records only.
2. `lifecycleScope=all` includes `active` / `superseded` / `voided` for audit and future frontend history display.
3. `superseded` and `voided` records do not participate in default panels, reminders or next-action calculation.
4. Sort remains `occurredAt desc, createdAt desc`.

## 8. Route Inventory Alignment

| Capability                   | Canonical Route                              | Current Implemented Route                    | Inventory Status |
| ---------------------------- | -------------------------------------------- | -------------------------------------------- | ---------------- |
| `replaceSalesFollowUpRecord` | `POST /sales-follow-up-records/{id}:replace` | `POST /sales-follow-up-records/{id}:replace` | `aligned`        |
| `voidSalesFollowUpRecord`    | `POST /sales-follow-up-records/{id}:void`    | `POST /sales-follow-up-records/{id}:void`    | `aligned`        |

`EX48-E1-NO-RUNTIME` is closed by this slice. `FE-50` remains open for frontend action entry.

## 9. Tests And Checks

Required and completed:

- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=sales-follow-up` passed, 2 suites / 15 tests.
- `corepack pnpm nx run poms-api:openapi` passed.
- `corepack pnpm nx run shared-api-client:generate` passed.
- `corepack pnpm nx run shared-api-client:check` passed; OpenAPI generator `propertyNames` warnings are existing tool noise.
- `corepack pnpm nx run poms-api:migration-up` passed; migration applied to local development database.
- `corepack pnpm nx run poms-api:migration-check` passed.
- `corepack pnpm nx lint poms-api` passed.
- `corepack pnpm nx build poms-api` passed.
- `corepack pnpm nx lint poms-admin` passed.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-follow-up-panel` passed.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list` passed.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-list` passed.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail` passed.
- `corepack pnpm nx build poms-admin` passed with existing initial bundle budget warning.
- `$env:PORT='3345'; corepack pnpm nx e2e poms-api-e2e --runInBand --testPathPatterns=lead-workflow` passed, 1 suite / 2 tests.
- `corepack pnpm nx lint poms-api-e2e` is not available because `poms-api-e2e` has no lint target.

## 10. Drift And Exceptions

| ID                               | Type         | Scope                          | Decision                                                                                           |
| -------------------------------- | ------------ | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `EX48A-D1-OPENAPI-WARNING-NOISE` | `tool-noise` | OpenAPI generated client check | Existing `propertyNames` generator warnings did not produce client drift and the check passed.     |
| `EX48A-E1-NO-FRONTEND-ACTION`    | `E1`         | Admin frontend                 | Replace / void UI waits for `FE-50` so generated client can be consumed from a stable API surface. |
| `EX48A-E2-NO-REMINDER-CLEANUP`   | `E1`         | Reminder / todo integration    | Reminder semantics remain governed by `EX-49`; current default list hides non-active records.      |

## 11. G4 Closeout

Status: `Done`

Delivered:

1. `sales_follow_up_record` lifecycle columns, self references, enum check and indexes are migrated and entity-aligned.
2. Replace and void command routes are implemented with optimistic concurrency, state validation and runtime audit.
3. Shared contracts, API DTOs, OpenAPI and generated client include lifecycle scope, status and request models.
4. Default list excludes `superseded` / `voided`; `lifecycleScope=all` returns the full chain for future frontend history display.
5. Route inventory rows are aligned.

Next executable slices:

1. `FE-50`: expose replace / void actions in `SalesFollowUpPanel`.
2. `EX-49`: freeze `nextFollowUpAt` reminder and todo semantics after non-active records are introduced.
