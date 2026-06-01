# EX-71B 客户工作台推荐动作与动态时间线实施基线包

- Gate Status: `G1 Pass`
- Parent: `FE-64`
- Owner: Codex
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: User-approved customer workspace second-phase continuation
- G1 Date: 2026-06-01
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-71B`

## 1. 范围

- 本次目标: 在既有 `GET /customers/{id}/workspace-overview` read model 中补充客户工作台推荐动作和客户动态时间线，让页面从静态聚合概览推进为可操作工作台。
- 本次明确不做: 不新增 route；不新增写命令；不新增表、字段、migration 或权限；不在 Admin 前端重新拼接跨业务对象聚合；不展示合同金额等敏感金额字段；不重做线索 / 项目 / 合同详情页。
- 下游可依赖的交付边界: `CustomerWorkspaceOverviewView` 输出 `recommendedActions` 和 `timeline`，Admin 客户工作台只消费该 read model 渲染动作入口和动态事实。
- 不允许下游依赖的留白: 不允许把推荐动作规则复制到前端；不允许以客户工作台名义创建新的机会级销售情报写侧语义；不允许保留前端散落多接口拼装客户动态。

## 2. 正式输入

| Input Type                | Document / Source                                   | Section / Anchor                        | Status  | Notes                                               |
| ------------------------- | --------------------------------------------------- | --------------------------------------- | ------- | --------------------------------------------------- |
| Business design           | User request                                        | 客户工作台第二阶段                      | frozen  | 客户详情应升级为长期经营工作台，需要更强动作导向    |
| Command design            | N/A                                                 | N/A                                     | N/A     | 仍为 query-only read model；无写命令                |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts` | Customer workspace overview schemas     | frozen  | 扩展 `recommendedActions` 和 `timeline`             |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`      | `customer.getCustomerWorkspaceOverview` | aligned | 不新增 route；扩展既有 route 响应契约               |
| Query boundary            | `CustomerService.getCustomerWorkspaceOverview`      | read aggregation                        | frozen  | Service 负责动作规则和时间线编排                    |
| Data model / table freeze | Existing customer workspace source tables           | existing columns                        | frozen  | 只读既有 `lead` / `project` / `contract` / 协同记录 |
| Schema / DDL              | N/A                                                 | N/A                                     | N/A     | 本片不改 migration；migration check 非必需          |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`       | noun sub-resource                       | pass    | 继续复用 `workspace-overview` 只读名词型客户子资源  |

## 3. 本次 SSOT

| Concern                     | SSOT                                       | Implementation Rule                                                                         |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Business semantics          | `CustomerWorkspaceOverviewView`            | 客户工作台负责客户级经营事实、推荐动作和动态，不替代业务对象详情页                          |
| Public route canonical path | `GET /customers/{id}/workspace-overview`   | 不新增 route；只扩展响应 DTO                                                                |
| Route / command naming      | `CustomerController.getWorkspaceOverview`  | Controller 仍只做 guard / DTO 暴露并委托 service                                            |
| DTO / contract naming       | `CustomerWorkspaceActionItem` / `Timeline` | 推荐动作和动态时间线使用 customer workspace 前缀，避免污染业务对象 DTO                      |
| Table / column naming       | Existing tables                            | 不新增表、字段或索引；查询只读既有列                                                        |
| Date / time semantics       | ISO datetime                               | `timeline.occurredAt` 与源对象更新时间 / 创建时间 / 发生时间一致，输出 ISO datetime         |
| Identifier semantics        | UUID                                       | 可打开的 target / source id 使用系统 UUID；不可直达的客户级动作允许 `targetObjectId = null` |
| Money / decimal semantics   | N/A                                        | 不输出合同金额、预计金额或其他敏感金额                                                      |
| Status machine              | Existing enums                             | 只读取既有线索、项目、合同、讨论和跟进状态；不新增状态机                                    |

## 4. 命令与接口边界

| Route / Controller                       | Command / Service                              | Request DTO / Contract | Response DTO / Contract         | Guard / Permission | Design Source | Result |
| ---------------------------------------- | ---------------------------------------------- | ---------------------- | ------------------------------- | ------------------ | ------------- | ------ |
| `GET /customers/{id}/workspace-overview` | `CustomerService.getCustomerWorkspaceOverview` | path `id`              | `CustomerWorkspaceOverviewView` | `customer:read`    | EX-71A/EX-71B | modify |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /customers/{id}/workspace-overview`
- Current implemented route(s): `GET /customers/{id}/workspace-overview`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-71A` + `EX-71B`
- Blocker / exception: none. This slice changes response contract only; public path and permission stay unchanged.

## 5. 读侧边界

| Query / View                    | Consumer                 | Fields                                                                                                                  | Filter / Sort                                   | Permission Boundary | Design Source | Result |
| ------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------- | ------------- | ------ |
| `CustomerWorkspaceOverviewView` | Admin customer workspace | existing overview fields plus `recommendedActions`, `timeline`                                                          | by customer id                                  | `customer:read`     | EX-71B        | modify |
| `CustomerWorkspaceActionItem`   | Admin action strip       | `key`, `intent`, `title`, `description`, `targetObjectType`, `targetObjectId`, `targetTitle`, `priority`                | service rule order; limited top actions         | `customer:read`     | EX-71B        | add    |
| `CustomerWorkspaceTimelineItem` | Admin timeline           | `key`, `eventType`, `sourceType`, `sourceId`, `occurredAt`, `title`, `description`, `actorName`, target fields, `isKey` | merged from workspace source lists; desc; limit | `customer:read`     | EX-71B        | add    |

## 6. 持久化边界

| Table                    | Migration | Entity / Repository               | DDL / Freeze Source | Check Result |
| ------------------------ | --------- | --------------------------------- | ------------------- | ------------ |
| `customer`               | N/A       | `Customer` / `CustomerRepository` | Existing EX-42      | unchanged    |
| `lead`                   | N/A       | existing read projection          | Existing EX-70A/70B | unchanged    |
| `project`                | N/A       | existing read projection          | Existing EX-32      | unchanged    |
| `contract`               | N/A       | existing read projection          | Existing contract   | unchanged    |
| `sales_follow_up_record` | N/A       | existing read projection          | Existing EX-44      | unchanged    |
| `business_discussion_*`  | N/A       | existing read projection          | Existing EX-61C     | unchanged    |

| Field / Object                | Design Type / Meaning          | Migration / DDL | Entity | Shared Contract / OpenAPI               | Result |
| ----------------------------- | ------------------------------ | --------------- | ------ | --------------------------------------- | ------ |
| `recommendedActions`          | service-derived action list    | N/A             | N/A    | new schema / generated client type      | add    |
| `timeline`                    | service-derived event list     | N/A             | N/A    | new schema / generated client type      | add    |
| `timeline.occurredAt`         | ISO datetime                   | existing        | N/A    | `z.iso.datetime()`                      | add    |
| `targetObjectId` / `sourceId` | system UUID or nullable target | existing        | N/A    | `z.uuid()` / nullable where appropriate | add    |

## 7. DRY / SOLID 约束

- `DRY-1`: 推荐动作生成只在 `CustomerService.getCustomerWorkspaceOverview` 组装层实现，Admin 前端只按 intent 渲染和跳转。
- `DRY-2`: 客户动态时间线由后端复用 EX-71A projection 输出，不在前端二次跨表查询或排序。
- `DRY-3`: 动作 intent、timeline event type 和 source type 在 shared contracts 中集中定义并生成客户端类型。
- `SOLID-1`: Controller 只暴露既有 route；不承载推荐规则或时间线排序。
- `SOLID-2`: Repository 只提供可复用 projection；service 负责 read model 组合。
- `SOLID-3`: Admin component 只呈现 action / timeline，并把 intent 映射到既有路由或本页锚点。
- `SOLID-4`: 客户工作台不新增写侧业务规则；写入仍归属既有跟进、讨论、项目、合同模块。

## 8. 一致性结论

- Document -> code: G1 freezes an additive response-contract enhancement on the existing customer workspace overview route.
- ADR-015 inventory -> route: no path change; inventory row updated to mention EX-71B response expansion.
- Migration -> entity: N/A; no DDL change.
- Entity -> contract: source projections map existing table fields to generated action and timeline view types.
- Route -> command: `CustomerController.getWorkspaceOverview` continues to delegate to `CustomerService`.
- Query -> view: Admin customer workspace consumes `recommendedActions` and `timeline` from `CustomerWorkspaceOverviewView`.
- Guard / permission: unchanged `customer:read`.
- OpenAPI / generated client: expected additive diff: new schemas and response fields.

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                                                                       | Result | Gap / Reason           |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- | ------ | ---------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`                                     | Pass   | 2026-06-01             |
| Build                            | Yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                   | Pass   | 2026-06-01             |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=customer`; Admin customer-workspace tests | Pass   | API 10; Admin 3        |
| API / integration tests          | Yes      | customer focused specs                                                                                   | Pass   | service/controller     |
| E2E / browser                    | Yes      | Playwright smoke on `http://127.0.0.1:4300/customers/:id`                                                | Pass   | 4 actions; 11 events   |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:generate/check`         | Pass   | generated synchronized |
| Migration / schema check         | No       | N/A                                                                                                      | N/A    | No persistence change  |
| Markdown / diff sanity           | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                                  | Pass   | 2026-06-01             |

## 10. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes         |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception. |

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: User direct continuation request
- Approved At: 2026-06-01
- Conditions: Implement as additive response-contract enhancement on the existing route; do not add persistence, write commands, permissions, separate frontend aggregation, compatibility aliases, or sensitive amount fields.

## 12. G3 结论

- Gate Status: `Pass`
- Completed At: 2026-06-01
- Scope Delivered: 扩展 `CustomerWorkspaceOverviewView` 契约，新增 `CustomerWorkspaceActionItem`、`CustomerWorkspaceTimelineItem` 及 generated client 类型；后端由 `CustomerService.getCustomerWorkspaceOverview` 统一生成推荐动作和客户动态；Admin 客户工作台渲染推荐动作、客户动态，并把 intent 映射到既有路由或本页跟进 / 讨论锚点。
- Drift Classification: none. Route path、权限、持久化边界、OpenAPI / generated client、service read model 与 Admin view 均与 G1 baseline 一致。
- Browser Evidence: 新端口本地 smoke 使用 `http://127.0.0.1:4300/customers/11000000-0000-4000-8000-000000000001`，`workspace-overview` 返回 4 个推荐动作和 11 条客户动态；页面显示“推荐动作”和“客户动态”，无经营概览错误、console error 或 page error。
- Known Notes: 原 `localhost:4200` dev server 为旧进程，未包含本次前后端更新；已使用 `3334/4300` 临时干净 dev server 验证当前代码并在 smoke 后关闭。

## 13. G4 结论

- Gate Status: `Pass`
- Completed At: 2026-06-01
- Completion Carrier: 本地 runtime commit 承载本片代码、契约、generated client、OpenAPI、Admin 接入、测试和治理文档。
- Downstream Reliance: 后续客户工作台第三阶段可以依赖 `CustomerWorkspaceOverviewView.recommendedActions` 和 `timeline` 作为客户级动作入口与动态事实源；仍不得在 Admin 前端重新拼接跨表聚合或新增客户工作台专用写侧状态。
