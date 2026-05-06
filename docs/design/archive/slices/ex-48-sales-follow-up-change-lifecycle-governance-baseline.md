# EX-48 Sales Follow Up Change Lifecycle Governance Baseline

- Gate Status: `Pass`
- Parent: Lead / Customer / Project sales continuity
- Owner: Codex
- Slice Type: `docs-only`
- G1 Reviewer: User-approved direction in current workspace thread
- G1 Date: 2026-05-01
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-48`

## 1. 范围

- 本次目标:
  1. 冻结销售跟进记录的修改、作废和替代链语义，避免后续把跟进正文做原地覆盖。
  2. 冻结新增 public routes: `POST /sales-follow-up-records/{id}:replace` 与 `POST /sales-follow-up-records/{id}:void`。
  3. 冻结 summary / query / command DTO 扩展方向、状态机、并发版本、审计字段和权限边界。
  4. 回写 route inventory，并拆出后端运行时与前端入口后续切片。
- 本次明确不做:
  1. 不写 migration、entity、controller、service、OpenAPI 或 generated client 运行时代码。
  2. 不新增前端按钮、弹窗、历史列表或浏览器验证。
  3. 不处理 `nextFollowUpAt` 提醒 / 待办；该能力仍由 `EX-49` 治理。
  4. 不引入审批流、restore / revert、物理删除或全文审计差异视图。
- 下游可依赖的交付边界:
  - 销售跟进更正使用追加式 replacement，新记录成为 `active`，旧记录变为 `superseded`。
  - 销售跟进撤回使用 `void`，记录变为 `voided`，不允许物理删除。
  - replace / void 必须携带 `expectedVersion`，来源于当前记录 `rowVersion`。
  - replacement 不能改变原记录的客户、线索、项目锚点，只能更正跟进内容、时间、方式、结果、下一次跟进和责任人。
- 不允许下游依赖的留白:
  - 当前代码仍只有 list/create；planned route 未实现前不能在 UI 中接入 replace / void。
  - 当前没有附件、提醒、审批和评论式讨论联动。

## 2. 正式输入

| Input Type                | Document / Source                                                      | Section / Anchor               | Status | Notes                                                         |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------ | ------ | ------------------------------------------------------------- |
| Business design           | `docs/design/ex-44-sales-follow-up-record-baseline.md`                 | Out Of Scope                   | Frozen | EX-44 明确未覆盖修改 / 撤销 / 删除或替代链。                  |
| Frontend entry            | `docs/design/fe-47-customer-project-sales-follow-up-entry-baseline.md` | G4 delivered scope             | Frozen | 客户 / 项目详情已有读取 / 创建入口，后续动作需复用同一面板。  |
| Command design            | This baseline                                                          | Sections 3-5                   | Frozen | replace / void 是 item-level command，不是普通 PATCH。        |
| DTO / OpenAPI design      | This baseline                                                          | Sections 4-6                   | Frozen | 后续运行时 slice 消费。                                       |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                         | `EX-44 Sales Follow Up Record` | Frozen | 两条新 command route 以 `planned` 写入。                      |
| Query boundary            | This baseline                                                          | Section 5                      | Frozen | list 默认只返回 active，可用 lifecycle scope 查看历史。       |
| Data model / table freeze | This baseline + current `SalesFollowUpRecord` entity                   | Section 6                      | Frozen | 当前已有 `rowVersion`，需补 status / supersedes / void 字段。 |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                          | item action route grammar      | Frozen | 使用 `{id}:replace` 和 `{id}:void`。                          |

## 3. 本次 SSOT

| Concern                     | SSOT                                  | Implementation Rule                                                                                   |
| --------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Business semantics          | This baseline                         | 销售跟进是可追溯业务事实；正文更正不得原地覆盖。                                                      |
| Public route canonical path | Route inventory                       | `POST /sales-follow-up-records/{id}:replace`、`POST /sales-follow-up-records/{id}:void`。             |
| Route / command naming      | This baseline                         | `replaceSalesFollowUpRecord` / `voidSalesFollowUpRecord`。                                            |
| DTO / contract naming       | Shared contracts                      | 新增 `ReplaceSalesFollowUpRecordRequest`、`VoidSalesFollowUpRecordRequest` 与 lifecycle fields。      |
| Table / column naming       | Future migration                      | `status`、`supersedes_record_id`、`replaced_by_record_id`、`replacement_reason`、`voided_*`。         |
| Date / time semantics       | Shared contracts                      | `occurredAt`、`nextFollowUpAt`、`voidedAt` 都是 ISO datetime。                                        |
| Identifier semantics        | sales follow-up record `id`           | path `{id}` 是被替代 / 被作废记录 identity；body 不重复该 id。                                        |
| Money / decimal semantics   | N/A                                   | 本片不涉及金额。                                                                                      |
| Status machine              | This baseline                         | `active -> superseded` 或 `active -> voided`；`superseded` / `voided` 为终态。                        |
| Concurrency                 | Existing `rowVersion`                 | replace / void request 必须包含 `expectedVersion`，后端按目标记录 `rowVersion` 校验。                 |
| Anchor immutability         | Current `customerId/leadId/projectId` | replacement 沿用原记录锚点，不允许把一条跟进记录从客户 A 改到客户 B，或从线索上下文移动到项目上下文。 |

## 4. 命令与接口边界

| Route / Controller                           | Command / Service            | Request DTO / Contract                                                                                      | Response DTO / Contract      | Guard / Permission                                       | Design Source   | Result   |
| -------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------- | --------------- | -------- |
| `GET /sales-follow-up-records`               | `listSalesFollowUpRecords`   | `SalesFollowUpRecordListQuery`: existing anchors + future `lifecycleScope?`                                 | `SalesFollowUpRecordList`    | any of `customer:read` / `lead:read` / `project:read`    | `EX-44` + EX-48 | Frozen   |
| `POST /sales-follow-up-records`              | `createSalesFollowUpRecord`  | `CreateSalesFollowUpRecordRequest`                                                                          | `SalesFollowUpRecordSummary` | any of `customer:write` / `lead:write` / `project:write` | `EX-44`         | Existing |
| `POST /sales-follow-up-records/{id}:replace` | `replaceSalesFollowUpRecord` | `ReplaceSalesFollowUpRecordRequest`: follow-up fields, owner fields, `replacementReason`, `expectedVersion` | `SalesFollowUpRecordSummary` | any of `customer:write` / `lead:write` / `project:write` | This baseline   | Planned  |
| `POST /sales-follow-up-records/{id}:void`    | `voidSalesFollowUpRecord`    | `VoidSalesFollowUpRecordRequest`: `reason`, `comment?`, `expectedVersion`                                   | `SalesFollowUpRecordSummary` | any of `customer:write` / `lead:write` / `project:write` | This baseline   | Planned  |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `POST /sales-follow-up-records/{id}:replace`
  - `POST /sales-follow-up-records/{id}:void`
- Current implemented route(s): `GET /sales-follow-up-records`, `POST /sales-follow-up-records`
- Inventory status: `planned` for replace / void; existing list / create remain `aligned`
- Route governance source: `ADR-015` + this baseline
- Blocker / exception: runtime code must not start until these route rows are consumed by the runtime slice.

## 5. 读侧边界

| Query / View              | Consumer                                   | Fields                                                                                                                                        | Filter / Sort                                                                                                            | Permission Boundary                                  | Design Source | Result  |
| ------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------- | ------- |
| `SalesFollowUpRecordList` | Lead / customer / project follow-up panels | existing summary fields + `status`、`supersedesId`、`replacedById`、`replacementReason`、`voidedAt`、`voidedBy`、`voidedByName`、`voidReason` | anchors remain required; `lifecycleScope=active` default, `all` includes history; sort `occurredAt desc, createdAt desc` | any read permission across customer / lead / project | This baseline | Planned |

读侧规则:

1. 默认列表只返回 `active`，避免普通用户在主流程里误读已作废或已替代记录。
2. 需要审计历史时，前端显式传 `lifecycleScope=all`，并用状态标签区分 `active`、`superseded`、`voided`。
3. `superseded` 记录展示为历史更正，不参与“下一次跟进”或提醒事实。
4. `voided` 记录展示作废原因和操作信息，不参与任何后续提醒、评分或待办计算。

## 6. 持久化边界

| Table                    | Migration               | Entity / Repository                               | DDL / Freeze Source | Check Result |
| ------------------------ | ----------------------- | ------------------------------------------------- | ------------------- | ------------ |
| `sales_follow_up_record` | Future EX-48A migration | `SalesFollowUpRecord` / `SalesFollowUpRepository` | This baseline       | Planned      |

| Field                   | Design Type / Meaning              | Migration / DDL                         | Entity / Contract                                 | Result   |
| ----------------------- | ---------------------------------- | --------------------------------------- | ------------------------------------------------- | -------- |
| `status`                | `active` / `superseded` / `voided` | varchar check + index                   | `SalesFollowUpRecordStatus`                       | Planned  |
| `supersedes_record_id`  | replacement points to old record   | nullable self FK + index                | `supersedesId` nullable UUID                      | Planned  |
| `replaced_by_record_id` | old record points to replacement   | nullable self FK + unique where present | `replacedById` nullable UUID                      | Planned  |
| `replacement_reason`    | reason on replacement record       | text nullable                           | string nullable                                   | Planned  |
| `voided_at`             | void action datetime               | timestamptz nullable                    | ISO datetime nullable                             | Planned  |
| `voided_by`             | void actor id                      | uuid nullable                           | UUID nullable + optional display name             | Planned  |
| `void_reason`           | reason/comment for void action     | text nullable                           | string nullable                                   | Planned  |
| `row_version`           | optimistic concurrency             | existing integer version                | existing `rowVersion` + request `expectedVersion` | Existing |

状态机:

1. `active` is the only current state.
2. replace can only target `active`; it creates a new `active` record and marks the target `superseded`.
3. void can only target `active`; it marks the target `voided`.
4. `superseded` and `voided` records cannot be replaced or voided again.
5. create starts with `active` and no `supersedesId`.

## 7. 一致性结论

- Document -> code: current code remains list/create only; EX-48A must consume this baseline.
- ADR-015 inventory -> route: planned rows are added under `EX-44 Sales Follow Up Record`.
- Migration -> entity: future migration must be written before entity / contract changes.
- Entity -> contract: planned lifecycle fields must appear in entity, mapper, shared contract, OpenAPI and generated client together.
- Route -> command: controller must expose item-action routes; replacement identity lives in path `{id}`.
- Query -> view: future list query gains lifecycle scope while keeping existing anchor requirement.
- Guard / permission: route-level any-permission guard is acceptable only with service-level anchor validation; backend remains final authorization boundary.
- OpenAPI / generated client: runtime slice must regenerate and check both.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                  | Result       | Gap / Reason                    |
| -------------------------------- | -------- | ----------------------------------- | ------------ | ------------------------------- |
| Lint                             | No       | N/A                                 | Not required | Docs-only governance slice.     |
| Build                            | No       | N/A                                 | Not required | No runtime code changed.        |
| Unit tests                       | No       | N/A                                 | Not required | No runtime code changed.        |
| API / integration tests          | No       | N/A                                 | Not required | No runtime route implemented.   |
| E2E                              | No       | N/A                                 | Not required | No UI changed.                  |
| OpenAPI generation / client diff | No       | N/A                                 | Not required | Route rows are planned only.    |
| Migration / schema check         | No       | N/A                                 | Not required | No migration changed.           |
| Markdown format                  | Yes      | `corepack pnpm run format:md:check` | Pass         | Docs table formatting is clean. |
| Diff whitespace                  | Yes      | `git diff --check`                  | Pass         | No whitespace errors.           |

## 9. 例外与风险

| Exception ID                      | Level | Scope                                  | Approved By    | Cleanup Owner | Cleanup Due | Notes                                                                  |
| --------------------------------- | ----- | -------------------------------------- | -------------- | ------------- | ----------- | ---------------------------------------------------------------------- |
| `EX48-E1-NO-RUNTIME`              | Low   | This slice freezes baseline only       | User direction | EX-48A owner  | EX-48A G4   | 后端运行时由 EX-48A 承接，不能把 planned route 当作已实现 route 使用。 |
| `EX48-E2-NO-FRONTEND-ACTION`      | Low   | No edit / void UI in this slice        | User direction | FE-50 owner   | FE-50 G4    | 前端入口必须等 generated client 稳定后再接入。                         |
| `EX48-E3-NO-REMINDER-INTEGRATION` | Low   | `nextFollowUpAt` reminder remains open | User direction | EX-49 owner   | EX-49 G4    | 作废 / 替代后的提醒清理规则由 EX-49 冻结。                             |

## 10. G1 / G4 结论

- Gate Status: `Pass`
- Approved By: User direction in current thread
- Approved At: 2026-05-01
- Conditions:
  1. EX-48A 先写 migration，再同步 entity / contract / controller。
  2. route implementation 后将 inventory status 从 `planned` 改为 `aligned`。
  3. FE-50 前端提交 replace / void 时必须使用当前记录 `rowVersion` 作为 `expectedVersion`，不能手填或省略。
