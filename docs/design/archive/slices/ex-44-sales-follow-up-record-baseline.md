# EX-44 Sales Follow Up Record 实施基线包

- Gate Status: `Pass`
- Parent: Lead / Customer / Project sales continuity
- Owner: Codex
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: User-approved direction in current workspace thread
- G1 Date: 2026-04-30
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-44`

## 1. 范围

- 本次目标:
  1. 新增共享 `SalesFollowUpRecord` 跟进事实源，覆盖线索阶段、转项目后项目阶段和客户级销售跟进。
  2. 新增 `GET /sales-follow-up-records` 和 `POST /sales-follow-up-records`，支持按 `customerId`、`leadId`、`projectId` 读取同一事实表。
  3. 前端先在线索详情内展示跟进时间线，并允许登记跟进记录；线索已转项目时，新记录默认挂到项目上下文。
  4. 保持 `Lead -> Project` 转化时不迁移历史跟进记录，通过查询同时拉取来源线索与转入项目记录形成连续视图。
- 本次明确不做:
  1. 不实现跟进记录修改、撤销、删除或替代链。
  2. 不把销售跟进混入 `ProjectTimelineView` 生命周期里程碑。
  3. 不接入项目详情、客户详情的完整前端入口；本片只交付共享 API 和线索页面消费。
  4. 不实现提醒、日程、消息通知或评分评级。
- 下游可依赖的交付边界:
  - `sales_follow_up_record.customer_id` 是必填客户总线。
  - `lead_id` 与 `project_id` 是可选上下文锚点；转项目前记录挂 `lead_id`，转项目后记录挂 `project_id`。
  - 同一查询可通过多个锚点返回连续跟进视图。
- 不允许下游依赖的留白:
  - 当前没有记录撤销 / 更正语义。
  - 当前没有提醒任务和下一次跟进待办。

## 2. 正式输入

| Input Type                | Document / Source                                                  | Section / Anchor                       | Status | Notes                                                  |
| ------------------------- | ------------------------------------------------------------------ | -------------------------------------- | ------ | ------------------------------------------------------ |
| Business design           | `docs/design/ex-43-lead-source-and-profile-enrichment-baseline.md` | Out Of Scope / future follow-up record | Frozen | 原 `LeadFollowUpRecord` 后续项升级为共享销售跟进记录。 |
| Command design            | Current user decision                                              | "线索在转项目之后，依然是需要销售跟进" | Frozen | 跟进不能绑定在 Lead 私有表。                           |
| DTO / OpenAPI design      | This baseline                                                      | Sections 3-5                           | Frozen | 新增 shared contract / OpenAPI / generated client。    |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                     | `EX-44 Sales Follow Up Record`         | Frozen | 新增顶层 collection routes。                           |
| Query boundary            | This baseline                                                      | Section 5                              | Frozen | 查询至少带一个客户/线索/项目锚点。                     |
| Data model / table freeze | This baseline                                                      | Section 6                              | Frozen | `customer_id` 必填，`lead_id/project_id` 可空。        |
| Schema / DDL              | Migration planned in this slice                                    | `sales_follow_up_record`               | Frozen | FK restrict / set null 按主对象语义落地。              |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                      | collection route grammar               | Frozen | 顶层共享记录集合使用 `/sales-follow-up-records`。      |

## 3. 本次 SSOT

| Concern                     | SSOT                | Implementation Rule                                                |
| --------------------------- | ------------------- | ------------------------------------------------------------------ |
| Business semantics          | This baseline       | 销售跟进是客户维度的高频销售活动事实，不是项目生命周期 milestone。 |
| Public route canonical path | Route inventory     | `GET /sales-follow-up-records`、`POST /sales-follow-up-records`。  |
| Route / command naming      | This baseline       | list / create only; no update/delete in this slice.                |
| DTO / contract naming       | Shared contracts    | `SalesFollowUpRecordSummary`、`CreateSalesFollowUpRecordRequest`。 |
| Table / column naming       | Migration           | `sales_follow_up_record` with snake_case columns.                  |
| Date / time semantics       | Shared contracts    | `occurredAt` and `nextFollowUpAt` are ISO datetime values.         |
| Identifier semantics        | Existing entity IDs | Customer / Lead / Project / Owner IDs are internal UUIDs.          |
| Money / decimal semantics   | N/A                 | No money fields in this slice.                                     |
| Status machine              | N/A                 | Follow-up records are append-only in this slice.                   |

## 4. 命令与接口边界

| Route / Controller              | Command / Service           | Request DTO / Contract             | Response DTO / Contract      | Guard / Permission                                       | Design Source | Result      |
| ------------------------------- | --------------------------- | ---------------------------------- | ---------------------------- | -------------------------------------------------------- | ------------- | ----------- |
| `GET /sales-follow-up-records`  | `listSalesFollowUpRecords`  | `SalesFollowUpRecordListQuery`     | `SalesFollowUpRecordList`    | any of `customer:read` / `lead:read` / `project:read`    | This baseline | Implemented |
| `POST /sales-follow-up-records` | `createSalesFollowUpRecord` | `CreateSalesFollowUpRecordRequest` | `SalesFollowUpRecordSummary` | any of `customer:write` / `lead:write` / `project:write` | This baseline | Implemented |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /sales-follow-up-records`, `POST /sales-follow-up-records`
- Current implemented route(s): `GET /sales-follow-up-records`, `POST /sales-follow-up-records`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + this baseline
- Blocker / exception: none

## 5. 读侧边界

| Query / View              | Consumer                    | Fields                                                                           | Filter / Sort                                                                           | Permission Boundary                                  | Design Source | Result      |
| ------------------------- | --------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------- | ----------- |
| `SalesFollowUpRecordList` | Lead detail follow-up panel | customer / lead / project / owner / occurred / next / summary / detail / outcome | filters: `customerId` / `leadId` / `projectId`; sort: `occurredAt desc, createdAt desc` | any read permission across customer / lead / project | This baseline | Implemented |

## 6. 持久化边界

| Table                    | Migration                                             | Entity / Repository                               | DDL / Freeze Source | Check Result |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------- | ------------------- | ------------ |
| `sales_follow_up_record` | `Migration20260430120000_ex44_sales_follow_up_record` | `SalesFollowUpRecord` / `SalesFollowUpRepository` | This baseline       | Pass         |

| Field                            | Design Type / Meaning         | Migration / DDL                | Entity           | Shared Contract / OpenAPI             | Result      |
| -------------------------------- | ----------------------------- | ------------------------------ | ---------------- | ------------------------------------- | ----------- |
| `customer_id`                    | required customer anchor      | `uuid not null` FK customer    | `customerId`     | `customerId: uuid`                    | Implemented |
| `lead_id`                        | optional lead context         | `uuid null` FK lead            | `leadId`         | `leadId: uuid nullable`               | Implemented |
| `project_id`                     | optional project context      | `uuid null` FK project         | `projectId`      | `projectId: uuid nullable`            | Implemented |
| `follow_up_type`                 | activity channel              | enum check                     | `followUpType`   | `SalesFollowUpType`                   | Implemented |
| `occurred_at`                    | actual follow-up datetime     | `timestamptz not null`         | `occurredAt`     | ISO datetime                          | Implemented |
| `summary` / `detail`             | user-entered content          | text fields                    | same             | string / nullable string              | Implemented |
| `outcome`                        | follow-up outcome             | enum check                     | `outcome`        | `SalesFollowUpOutcome`                | Implemented |
| `next_follow_up_at`              | optional next action datetime | `timestamptz null`             | `nextFollowUpAt` | ISO datetime nullable                 | Implemented |
| `owner_user_id` / `owner_org_id` | responsible actor snapshot    | nullable UUID FKs / references | same             | nullable UUID + display names on read | Implemented |

## 7. 一致性结论

- Document -> code: implemented for shared table, API, generated client, admin store and lead-detail timeline entry.
- ADR-015 inventory -> route: aligned by inventory rows.
- Migration -> entity: pass; descending occurred-at indexes are represented by entity index expressions.
- Entity -> contract: pass.
- Route -> command: pass.
- Query -> view: pass for lead detail consumer.
- Guard / permission: reuse existing customer / lead / project read-write permission families.
- OpenAPI / generated client: generated and checked.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                           | Result  | Gap / Reason                                                                                  |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`                                                                                         | Pass    | Cross-layer slice                                                                             |
| Build                            | Yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                                                                       | Pass    | Cross-layer slice                                                                             |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=sales-follow-up`; `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list` | Pass    | New service/controller/store/UI                                                               |
| API / integration tests          | Yes      | `$env:PORT='3345'; corepack pnpm nx e2e poms-api-e2e --runInBand --testPathPatterns=lead-workflow`                                                           | Pass    | Default port 3333 was occupied; reran focused E2E on 3345.                                    |
| E2E                              | Optional | Browser UI check                                                                                                                                             | Not run | In-app browser was at login; no credential entry was performed without explicit confirmation. |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:check`                                                                      | Pass    | New public routes                                                                             |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check`                                                                | Pass    | New table                                                                                     |

## 9. 例外与风险

| Exception ID                           | Level | Scope                                                              | Approved By    | Cleanup Owner | Cleanup Due                      | Notes                                                        |
| -------------------------------------- | ----- | ------------------------------------------------------------------ | -------------- | ------------- | -------------------------------- | ------------------------------------------------------------ |
| `EX44-E1-NO-PROJECT-CUSTOMER-FRONTEND` | Low   | Project/customer detail pages do not yet consume follow-up records | User direction | Codex         | Future project/customer UI slice | API is shared; this slice consumes it only from lead detail. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: User direction in current thread
- Approved At: 2026-04-30
- Conditions: implement as shared sales follow-up fact source; do not create Lead-only follow-up table.
