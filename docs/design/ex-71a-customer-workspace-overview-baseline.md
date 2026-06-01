# EX-71A 客户工作台聚合读模型实施基线包

- Gate Status: `G4 Pass`
- Parent: `FE-64`
- Owner: Codex
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: User-approved second-phase customer workspace plan
- G1 Date: 2026-06-01
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-71A`

## 1. 范围

- 本次目标: 新增客户工作台后端聚合读模型，让客户工作台首屏一次读取客户经营概览、活跃线索、进行中项目、近期合同、最近跟进和最近讨论。
- 本次明确不做: 不新增表或 migration；不新增写入命令；不改变客户、线索、项目、合同、讨论、跟进的生命周期；不展示合同金额等敏感金额字段；不把工作台聚合逻辑留在 Admin 前端拼接。
- 下游可依赖的交付边界: `GET /customers/{id}/workspace-overview` 是客户工作台聚合概览唯一读模型；Admin 客户工作台可以依赖该接口渲染首屏经营摘要和有限列表。
- 不允许下游依赖的留白: 不允许把客户经营聚合继续散落为前端多接口串行查询；不允许在客户工作台创造机会级销售情报写入入口；不允许把合同敏感金额放入本接口。

## 2. 正式输入

| Input Type                | Document / Source                                                                   | Section / Anchor                        | Status  | Notes                                           |
| ------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- | ------- | ----------------------------------------------- |
| Business design           | User request                                                                        | 客户工作台第二阶段                      | frozen  | 客户详情升级为真正工作台，而不是列表弹窗详情    |
| Command design            | N/A                                                                                 | N/A                                     | N/A     | Query-only public route; no write command       |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`                                 | Customer workspace overview schemas     | frozen  | 新增 `CustomerWorkspaceOverviewView`            |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                      | `customer.getCustomerWorkspaceOverview` | aligned | 新增 canonical route before coding              |
| Query boundary            | `CustomerService.getCustomerWorkspaceOverview`                                      | read aggregation                        | frozen  | Service owns read model orchestration           |
| Data model / table freeze | Existing `customer`, `lead`, `project`, `contract`, discussion and follow-up tables | existing columns                        | frozen  | 不新增 DDL                                      |
| Schema / DDL              | N/A                                                                                 | N/A                                     | N/A     | 本片不改 migration；migration check 非必需      |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                       | noun sub-resource                       | pass    | `workspace-overview` 作为客户下名词型读侧子资源 |

## 3. 本次 SSOT

| Concern                     | SSOT                                      | Implementation Rule                                                                   |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Business semantics          | `CustomerWorkspaceOverviewView`           | 表达客户经营概览和近期事实，不替代各业务对象详情页                                    |
| Public route canonical path | `GET /customers/{id}/workspace-overview`  | `id` 是客户 UUID；`workspace-overview` 是只读名词型子资源                             |
| Route / command naming      | `CustomerController.getWorkspaceOverview` | Controller 只做 guard / DTO 暴露并委托 service                                        |
| DTO / contract naming       | `CustomerWorkspaceOverviewView`           | 聚合字段使用 customer workspace 前缀，避免污染既有 `CustomerDetailView`               |
| Table / column naming       | Existing tables                           | 不新增表、字段或索引；查询只读现有列                                                  |
| Date / time semantics       | ISO datetime                              | `generatedAt`, `updatedAt`, `createdAt`, `occurredAt`, `signedAt` 均输出 ISO datetime |
| Identifier semantics        | UUID                                      | customer / lead / project / contract / discussion / follow-up id 均为系统 UUID        |
| Money / decimal semantics   | N/A                                       | 本接口不输出合同金额、预计金额或其他敏感金额                                          |
| Status machine              | Existing enums                            | 只读取现有 `LeadStatus`, `ProjectStatus`, `ContractStatus`，不新增状态                |

## 4. 命令与接口边界

| Route / Controller                       | Command / Service                              | Request DTO / Contract | Response DTO / Contract         | Guard / Permission | Design Source | Result |
| ---------------------------------------- | ---------------------------------------------- | ---------------------- | ------------------------------- | ------------------ | ------------- | ------ |
| `GET /customers/{id}/workspace-overview` | `CustomerService.getCustomerWorkspaceOverview` | path `id`              | `CustomerWorkspaceOverviewView` | `customer:read`    | EX-71A        | add    |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /customers/{id}/workspace-overview`
- Current implemented route(s): N/A before G2
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-71A`
- Blocker / exception: none.

## 5. 读侧边界

| Query / View                      | Consumer                 | Fields                                                                                                               | Filter / Sort                                              | Permission Boundary | Design Source | Result |
| --------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------- | ------------- | ------ |
| `CustomerWorkspaceOverviewView`   | Admin customer workspace | `summary`, `activeLeads`, `activeProjects`, `recentContracts`, `recentFollowUps`, `recentDiscussions`, `generatedAt` | by customer id; lists limited by recency                   | `customer:read`     | EX-71A        | add    |
| `CustomerWorkspaceSummary`        | Admin metrics/guidance   | active / total counts and latest interaction timestamps                                                              | same query                                                 | `customer:read`     | EX-71A        | add    |
| `CustomerWorkspaceLeadItem`       | Admin active opportunity | lead id/no/name/status/rating/urgency/owner/updatedAt                                                                | status in `registered`, `qualified`; updated desc; limit 5 | `customer:read`     | EX-71A        | add    |
| `CustomerWorkspaceProjectItem`    | Admin active projects    | project id/no/name/status/currentStage/owner/plannedSignAt/updatedAt                                                 | non-closed active project statuses; updated desc; limit 5  | `customer:read`     | EX-71A        | add    |
| `CustomerWorkspaceContractItem`   | Admin recent contracts   | contract id/no/status/project id/name/signedAt/updatedAt                                                             | customer via project; updated desc; limit 5                | `customer:read`     | EX-71A        | add    |
| `CustomerWorkspaceFollowUpItem`   | Admin recent follow-ups  | follow-up id/summary/outcome/occurredAt/nextFollowUpAt/owner                                                         | active records; occurred desc; limit 5                     | `customer:read`     | EX-71A        | add    |
| `CustomerWorkspaceDiscussionItem` | Admin recent discussions | comment id/thread id/target/title/type/body/isKeyConclusion/createdAt                                                | customer discussions; created desc; limit 5                | `customer:read`     | EX-71A        | add    |

## 6. 持久化边界

| Table                    | Migration | Entity / Repository               | DDL / Freeze Source | Check Result |
| ------------------------ | --------- | --------------------------------- | ------------------- | ------------ |
| `customer`               | N/A       | `Customer` / `CustomerRepository` | Existing EX-42      | unchanged    |
| `lead`                   | N/A       | SQL read projection               | Existing EX-31/70A  | unchanged    |
| `project`                | N/A       | SQL read projection               | Existing EX-32      | unchanged    |
| `contract`               | N/A       | SQL read projection               | Existing contract   | unchanged    |
| `sales_follow_up_record` | N/A       | SQL read projection               | Existing EX-44      | unchanged    |
| `business_discussion_*`  | N/A       | SQL read projection               | Existing EX-61C     | unchanged    |

| Field / Object                  | Design Type / Meaning      | Migration / DDL | Entity | Shared Contract / OpenAPI          | Result |
| ------------------------------- | -------------------------- | --------------- | ------ | ---------------------------------- | ------ |
| `CustomerWorkspaceOverviewView` | aggregate read model       | N/A             | N/A    | new schema / generated client type | add    |
| `summary.*Count`                | nonnegative integer counts | existing        | N/A    | `z.number().int().nonnegative()`   | add    |
| `generatedAt`                   | query generation timestamp | N/A             | N/A    | ISO datetime                       | add    |
| list item ids                   | system UUIDs               | existing        | N/A    | `z.uuid()`                         | add    |

## 7. DRY / SOLID 约束

- `DRY-1`: 客户工作台聚合只在 `CustomerService.getCustomerWorkspaceOverview` / repository projection 中实现，不在 Admin 前端重复拼接。
- `DRY-2`: DTO schema 在 shared contracts 定义，API DTO 和 generated client 从同一契约生成。
- `DRY-3`: 线索 / 项目 / 合同状态仍复用现有枚举，不新增客户工作台专用状态枚举。
- `SOLID-1`: Controller 只处理 route、权限和 OpenAPI response；不放查询逻辑。
- `SOLID-2`: Repository 只做数据库 projection；service 负责组装 read model。
- `SOLID-3`: Admin store 只消费 generated `CustomerApi`，不手写 URL。
- `SOLID-4`: 客户工作台组件只负责呈现 overview，不承担跨表查询语义。

## 8. 一致性结论

- Document -> code: G1 freezes one new customer workspace overview route and DTO.
- ADR-015 inventory -> route: inventory already records `GET /customers/{id}/workspace-overview`.
- Migration -> entity: N/A; no DDL change.
- Entity -> contract: projections map existing table columns to new read-only contract.
- Route -> command: `CustomerController.getWorkspaceOverview` delegates to `CustomerService`.
- Query -> view: Admin customer workspace consumes `CustomerWorkspaceOverviewView`.
- Guard / permission: unchanged `customer:read`.
- OpenAPI / generated client: expected additive diff: new operation and new schemas.

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                                                                     | Result | Gap / Reason                    |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ | ------ | ------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`                                   | Pass   | 2026-06-01                      |
| Build                            | Yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                 | Pass   | 2026-06-01                      |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=customer`; Admin customer focused tests | Pass   | API 10 tests; Admin 2 tests     |
| API / integration tests          | Yes      | customer controller/service focused specs                                                              | Pass   | New route and service covered   |
| E2E / browser                    | Yes      | Browser smoke on `/customers/:id`                                                                      | Pass   | Overview visible; no page error |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:generate/check`       | Pass   | Generated client synchronized   |
| Migration / schema check         | No       | N/A                                                                                                    | N/A    | No persistence change           |
| Markdown / diff sanity           | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                                | Pass   | 2026-06-01                      |

## 10. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes         |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception. |

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: User direct request
- Approved At: 2026-06-01
- Conditions: Implement as an additive read-model route; do not add persistence, write commands, frontend URL handcrafting, compatibility aliases, or sensitive amount fields.

## 12. G3 结论

- Gate Status: `Pass`
- Completed At: 2026-06-01
- Scope Delivered: 新增 `CustomerWorkspaceOverviewView` 契约、`GET /customers/{id}/workspace-overview` 路由、后端只读 projection、generated client、Admin `CustomerStore` 消费入口和客户工作台经营概览区。
- Drift Classification: none. Route inventory、OpenAPI、generated client、service / repository projection 和 Admin view 均与 G1 baseline 一致。
- Browser Evidence: `/customers/11000000-0000-4000-8000-000000000001` 显示客户工作台、经营概览、生成时间、进行中项目、近期合同和近期协同；未显示经营概览错误或页面错误。
- Known Notes: 本地验收期间重启 API 后前端 dev server 代理曾指向旧 API 目标，已通过重启 Admin dev server 并固定 `POMS_API_PROXY_TARGET=http://127.0.0.1:3333` 解决；不属于代码漂移。

## 13. G4 结论

- Gate Status: `Pass`
- Completed At: 2026-06-01
- Completion Carrier: 本地 runtime commit 承载本片代码、契约、generated client、OpenAPI、Admin 接入、测试和治理文档。
- Downstream Reliance: 后续客户工作台第二阶段功能可以依赖 `GET /customers/{id}/workspace-overview` 作为客户经营概览 read model；仍不得通过 Admin 前端重新拼接跨表聚合。
