# EX-61 Sales Intelligence And Business Discussion G1 Baseline

- Gate Status: `Pass`
- Parent: Sales intelligence / lead-project continuity
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: User-approved direction in current workspace thread
- G1 Date: 2026-05-04
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-61`, `EX-61A`, `EX-61B`, `EX-61C`

## 1. 范围

- 本次目标:
  1. 冻结并实现客户联系人、机会关系人、竞争态势、销售情报记录和轻量情报缺口。
  2. 冻结并实现客户 / 线索 / 项目业务讨论板。
  3. Project 查询讨论时聚合来源 Lead 历史讨论；转项目时不复制、不迁移、不改历史讨论归属。
  4. 更新 public route inventory、shared contracts、OpenAPI、generated client、migration、entity、service、controller 和 focused backend tests。
- 本次明确不做:
  1. 不做主管辅导任务流、必须回复、截止时间、主管确认关闭或销售能力评价。
  2. 不做 AI 自动建议、胜率预测模型或评分硬闸口。
  3. 不采集敏感个人信息，不建设私人画像库。
  4. 不做 FE-54 前端页面入口。
  5. 不提供物理删除公共 API。
- 下游可依赖的交付边界:
  - 联系人基础资料归 `CustomerContact`。
  - 决策链关系、竞争态势、采购流程和情报缺口归 Lead / Project opportunity context。
  - 业务讨论支持 Customer / Lead / Project 三类 target。
  - Project 讨论读侧可连续展示来源 Lead 讨论。
- 不允许下游依赖的留白:
  - 本片没有正式主管督办状态机。
  - 本片没有敏感个人信息字段和私人背景字段。
  - 本片不保证完整销售方法论配置化，只提供轻量缺口计算。

## 2. 正式输入

| Input Type                | Document / Source                              | Section / Anchor                         | Status | Notes                                                     |
| ------------------------- | ---------------------------------------------- | ---------------------------------------- | ------ | --------------------------------------------------------- |
| Business design           | Current user discussion                        | 销售情报、联系人、决策链、竞争态势、讨论 | Frozen | 以业务必要信息和轻量讨论板为 MVP。                        |
| Command design            | This baseline                                  | Section 4                                | Frozen | list/create/update for intelligence；讨论只 list/create。 |
| DTO / OpenAPI design      | This baseline + shared contracts               | Section 4-6                              | Frozen | 后续以 OpenAPI / generated client 校验。                  |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md` | `6.13A EX-61`                            | Frozen | `B10` rows 已新增。                                       |
| Query boundary            | This baseline                                  | Section 5                                | Frozen | Lead / Project 至少一个锚点；联系人按客户锚点。           |
| Data model / table freeze | This baseline                                  | Section 6                                | Frozen | 新增 6 张表。                                             |
| Schema / DDL              | Planned migration                              | `Migration20260504100000_ex61_*`         | Frozen | migration 先于 entity 校验。                              |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`  | resource routes                          | Frozen | 顶层集合 + query anchor。                                 |

## 3. 本次 SSOT

| Concern                     | SSOT                    | Implementation Rule                                            |
| --------------------------- | ----------------------- | -------------------------------------------------------------- |
| Business semantics          | This baseline           | 销售情报是机会推进资料，不是主管辅导任务。                     |
| Public route canonical path | API canonical inventory | 按 `6.13A EX-61` 落地。                                        |
| Route / command naming      | This baseline           | collection list/create，item update；discussion list/create。  |
| DTO / contract naming       | Shared contracts        | `CustomerContactSummary`、`OpportunityStakeholderSummary` 等。 |
| Table / column naming       | Migration               | snake_case table / column。                                    |
| Date / time semantics       | Shared contracts        | timestamp 使用 ISO datetime；无 date-only 字段。               |
| Identifier semantics        | Existing entity IDs     | Customer / Lead / Project / Contact / User 均为内部 UUID。     |
| Money / decimal semantics   | N/A                     | 本片不处理金额。                                               |
| Status machine              | This baseline           | 联系人为 `active/inactive`；讨论为 append-only。               |

## 4. 命令与接口边界

| Route / Controller                            | Command / Service                    | Request DTO / Contract                      | Response DTO / Contract                 | Guard / Permission                                       | Design Source | Result |
| --------------------------------------------- | ------------------------------------ | ------------------------------------------- | --------------------------------------- | -------------------------------------------------------- | ------------- | ------ |
| `GET /customer-contacts`                      | `listCustomerContacts`               | `CustomerContactListQuery`                  | `CustomerContactSummary[]`              | `customer:read`                                          | This baseline | Done   |
| `POST /customer-contacts`                     | `createCustomerContact`              | `CreateCustomerContactRequest`              | `CustomerContactSummary`                | `customer:write`                                         | This baseline | Done   |
| `PATCH /customer-contacts/{id}`               | `updateCustomerContact`              | `UpdateCustomerContactRequest`              | `CustomerContactSummary`                | `customer:write`                                         | This baseline | Done   |
| `GET /opportunity-stakeholders`               | `listOpportunityStakeholders`        | `OpportunityContextQuery`                   | `OpportunityStakeholderSummary[]`       | any of `lead:read` / `project:read`                      | This baseline | Done   |
| `POST /opportunity-stakeholders`              | `createOpportunityStakeholder`       | `CreateOpportunityStakeholderRequest`       | `OpportunityStakeholderSummary`         | any of `lead:write` / `project:write`                    | This baseline | Done   |
| `PATCH /opportunity-stakeholders/{id}`        | `updateOpportunityStakeholder`       | `UpdateOpportunityStakeholderRequest`       | `OpportunityStakeholderSummary`         | any of `lead:write` / `project:write`                    | This baseline | Done   |
| `GET /competitor-intelligence-records`        | `listCompetitorIntelligenceRecords`  | `OpportunityContextQuery`                   | `CompetitorIntelligenceRecordSummary[]` | any of `lead:read` / `project:read`                      | This baseline | Done   |
| `POST /competitor-intelligence-records`       | `createCompetitorIntelligenceRecord` | `CreateCompetitorIntelligenceRecordRequest` | `CompetitorIntelligenceRecordSummary`   | any of `lead:write` / `project:write`                    | This baseline | Done   |
| `PATCH /competitor-intelligence-records/{id}` | `updateCompetitorIntelligenceRecord` | `UpdateCompetitorIntelligenceRecordRequest` | `CompetitorIntelligenceRecordSummary`   | any of `lead:write` / `project:write`                    | This baseline | Done   |
| `GET /sales-discovery-records`                | `listSalesDiscoveryRecords`          | `OpportunityContextQuery`                   | `SalesDiscoveryRecordSummary[]`         | any of `lead:read` / `project:read`                      | This baseline | Done   |
| `POST /sales-discovery-records`               | `createSalesDiscoveryRecord`         | `CreateSalesDiscoveryRecordRequest`         | `SalesDiscoveryRecordSummary`           | any of `lead:write` / `project:write`                    | This baseline | Done   |
| `PATCH /sales-discovery-records/{id}`         | `updateSalesDiscoveryRecord`         | `UpdateSalesDiscoveryRecordRequest`         | `SalesDiscoveryRecordSummary`           | any of `lead:write` / `project:write`                    | This baseline | Done   |
| `GET /sales-intelligence-gaps`                | `getSalesIntelligenceGaps`           | `OpportunityContextQuery`                   | `SalesIntelligenceGapSummary[]`         | any of `lead:read` / `project:read`                      | This baseline | Done   |
| `GET /business-discussions`                   | `listBusinessDiscussionComments`     | `BusinessDiscussionListQuery`               | `BusinessDiscussionCommentSummary[]`    | any of `customer:read` / `lead:read` / `project:read`    | This baseline | Done   |
| `POST /business-discussions`                  | `createBusinessDiscussionComment`    | `CreateBusinessDiscussionCommentRequest`    | `BusinessDiscussionCommentSummary`      | any of `customer:write` / `lead:write` / `project:write` | This baseline | Done   |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): see Section 4.
- Current implemented route(s): same as canonical after this implementation.
- Inventory status: `aligned`
- Route governance source: `ADR-015` + this baseline.
- Blocker / exception: none.

## 5. 读侧边界

| Query / View                       | Consumer                                   | Fields                                             | Filter / Sort                                      | Permission Boundary          | Design Source | Result |
| ---------------------------------- | ------------------------------------------ | -------------------------------------------------- | -------------------------------------------------- | ---------------------------- | ------------- | ------ |
| `CustomerContactList`              | Customer / Lead / Project pages            | contact identity, work contact fields, status      | `customerId`; updated desc                         | `customer:read`              | This baseline | Done   |
| `OpportunityStakeholderList`       | Lead / Project sales intelligence          | role, attitude, influence, access, focus areas     | `leadId` / `projectId`; primary then updated desc  | `lead:read` / `project:read` | This baseline | Done   |
| `CompetitorIntelligenceRecordList` | Lead / Project sales intelligence          | competitor, position, preference, strengths, risks | `leadId` / `projectId`; updated desc               | `lead:read` / `project:read` | This baseline | Done   |
| `SalesDiscoveryRecordList`         | Lead / Project sales intelligence          | procurement, budget, pain point, decision cycle    | `leadId` / `projectId`; updated desc               | `lead:read` / `project:read` | This baseline | Done   |
| `SalesIntelligenceGapList`         | Lead / Project sales intelligence          | missing item, explanation, severity                | computed from current facts                        | `lead:read` / `project:read` | This baseline | Done   |
| `BusinessDiscussionCommentList`    | Customer / Lead / Project discussion panel | discussion type, body, author, stage source        | `customerId` / `leadId` / `projectId`; created asc | target read permissions      | This baseline | Done   |

## 6. 持久化边界

| Table                            | Migration                                                    | Entity / Repository                                            | DDL / Freeze Source | Check Result |
| -------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- | ------------------- | ------------ |
| `customer_contact`               | `Migration20260504100000_ex61_sales_intelligence_discussion` | `CustomerContact` / `SalesIntelligenceRepository`              | This baseline       | Passed       |
| `opportunity_stakeholder`        | same                                                         | `OpportunityStakeholder` / `SalesIntelligenceRepository`       | This baseline       | Passed       |
| `competitor_intelligence_record` | same                                                         | `CompetitorIntelligenceRecord` / `SalesIntelligenceRepository` | This baseline       | Passed       |
| `sales_discovery_record`         | same                                                         | `SalesDiscoveryRecord` / `SalesIntelligenceRepository`         | This baseline       | Passed       |
| `business_discussion_thread`     | same                                                         | `BusinessDiscussionThread` / `BusinessDiscussionRepository`    | This baseline       | Passed       |
| `business_discussion_comment`    | same                                                         | `BusinessDiscussionComment` / `BusinessDiscussionRepository`   | This baseline       | Passed       |

## 7. 一致性结论

- Document -> code: implemented for backend EX-61A / EX-61B / EX-61C.
- ADR-015 inventory -> route: rows added in `6.13A EX-61` and implemented.
- Migration -> entity: `poms-api:migration-up` and `poms-api:migration-check` passed.
- Entity -> contract: backend build, OpenAPI generation and generated client check passed.
- Route -> command: controllers compile and OpenAPI exposes canonical routes.
- Query -> view: focused service tests cover intelligence gaps and Project -> source Lead discussion continuity.
- Guard / permission: customer / lead / project permission families applied on controllers.
- OpenAPI / generated client: generated and checked.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                     | Result       | Gap / Reason                   |
| -------------------------------- | -------- | ------------------------------------------------------ | ------------ | ------------------------------ |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                       | Passed       | No new lint issues.            |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                      | Passed       | New modules compile.           |
| Unit tests                       | Yes      | focused tests and full `poms-api` test                 | Passed       | 567 tests passed.              |
| API / integration tests          | Optional | focused e2e if route wiring risk remains               | Not required | OpenAPI/build covered wiring.  |
| E2E                              | No       | N/A                                                    | Not required | FE-54 is separate.             |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi`, `shared-api-client:generate/check` | Passed       | New routes and client synced.  |
| Migration / schema check         | Yes      | `poms-api:migration-up`, `poms-api:migration-check`    | Passed       | New tables are schema-aligned. |
| Enum-like regression scan        | Yes      | `corepack pnpm run check:enum-like-strings`            | Passed       | No unclassified enum strings.  |

## 9. 例外与风险

| Exception ID                     | Level | Scope          | Approved By    | Cleanup Owner                    | Cleanup Due | Notes                                                            |
| -------------------------------- | ----- | -------------- | -------------- | -------------------------------- | ----------- | ---------------------------------------------------------------- |
| `EX61-R1-NO-SUPERVISOR-WORKFLOW` | Low   | Sales coaching | User direction | Future supervisor coaching slice | TBD         | MVP uses discussion only; no structured coaching task lifecycle. |
| `EX61-R2-NO-PRIVATE-PROFILE`     | Low   | Contact data   | User direction | Codex                            | This slice  | Personal background fields are excluded from contracts and DDL.  |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: User direction in current thread
- Approved At: 2026-05-04
- Conditions: implement EX-61A / EX-61B / EX-61C backend only; FE-54 remains separate.
