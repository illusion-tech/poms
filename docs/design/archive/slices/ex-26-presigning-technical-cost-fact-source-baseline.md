# EX-26 签约前技术与成本事实源与读取投影实施基线包

* Gate Status: `Pass`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `api / command + persistence + query projection`
* G1 Reviewer: `Codex`
* G1 Date: `2026-04-24`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-26`
* Downstream Frontend: `FE-10`

## 1. 范围

* 本次目标:
  1. 新增签约前 `技术与成本` 的最小正式事实源 `ProjectTechnicalCostPackage`。
  2. 以版本包表达技术可行性、范围边界、风险 / 保留意见、前期成本清单、税务成本和成本估算版本。
  3. 新增项目子集合 create / list route，以及项目级 current workspace query，供 `FE-10` 读取。
  4. 同步 shared contract、OpenAPI、generated client、migration、entity、service、query、guard 和 backend tests。
* 本次明确不做:
  1. 不实现前端 `FE-10` 页面。
  2. 不实现草稿编辑、审批、正式报价放行或投标结果登记。
  3. 不实现完整多币种换算和汇率快照引擎；首版要求同一 package 内所有金额使用同一 `currencyCode`。
  4. 不实现受控回退请求对象；范围变化通过新技术与成本 package 版本表达，正式回退链另开切片。
  5. 不复用执行期 `ProjectActualCostRecord` 作为签约前估算成本事实源。
* 下游可依赖的交付边界:
  1. `FE-10` 可通过 generated client 读取 `ProjectTechnicalCostWorkspaceView`。
  2. `FE-10` 可把 FE-09 的 `technical-cost` entry 从 disabled card 转为真实路由。
  3. `FE-11` 可引用当前 package 的 `version`、范围摘要、成本摘要和税务摘要，但不得把它当作报价评审结论。

## 2. 正式输入

| Input Type                | Document / Source                                                                        | Section / Anchor             | Status   | Notes                                           |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------- | -------- | ----------------------------------------------- |
| Business roadmap          | `docs/design/phase2-experience-optimization-roadmap.md`                                  | `L1-S2`                      | accepted | 技术确认与前期成本估算是 L1 关键能力            |
| Workspace design          | `docs/design/phase2-presigning-technical-cost-workspace.md`                              | `§3`、`§4`、`§6`、`§7`       | review   | 冻结页面需要消费的业务事实                      |
| IA design                 | `docs/design/phase2-presigning-workspace-information-architecture.md`                    | `§5.3`、`§7`                 | review   | 技术与成本输出进入投标、报价和签约就绪          |
| Handoff map               | `docs/design/phase2-presigning-workspace-handoff-map.md`                                 | `§4.2`、`§5`、`§6`           | review   | 阻断项和复用事实口径                            |
| Template design           | `docs/design/phase2-presigning-workspace-templates.md`                                   | `§3`、`§4`、`§5`、`§6`、`§7` | review   | 成本清单、税务成本、风险、阻断项和关键结论模板  |
| Query boundary            | `docs/design/query-view-boundary-design.md`                                              | `§2`、`§4`、`§5.1`           | active   | 查询返回视图模型，不直接透出写模型              |
| Command / DTO boundary    | `docs/design/interface-command-design.md`、`docs/design/interface-openapi-dto-design.md` | command / DTO rules          | active   | create route 只承载形成新版本包，不混入审批动作 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                           | planned rows                 | planned  | 本片新增 planned rows，进入实现前必须消费       |
| Frontend blocker          | `docs/design/archive/slices/fe-10-technical-cost-workspace-frontend-baseline.md`         | G1 decision                  | blocked  | FE-10 等待本片输出 generated client             |

## 3. 本次 SSOT

| Concern                     | SSOT                                            | Implementation Rule                                                                                                   |
| --------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Business object             | `ProjectTechnicalCostPackage`                   | 代表一次签约前技术与成本结论版本，不是执行期实际成本。                                                                |
| Public route canonical path | `api-route-canonical-inventory.md` planned rows | 使用 project-scoped collection create/list + stable query subresource。                                               |
| Route / command naming      | 本基线包                                        | `createProjectTechnicalCostPackage`、`listProjectTechnicalCostPackages`、`getProjectTechnicalCostWorkspace`           |
| DTO / contract naming       | 本基线包                                        | `CreateProjectTechnicalCostPackageRequest`、`ProjectTechnicalCostPackageSummary`、`ProjectTechnicalCostWorkspaceView` |
| Table / column naming       | 本基线包                                        | `project_technical_cost_package` 及子表，snake\_case。                                                                |
| Money semantics             | `currencyCode` + decimal money fields           | 首版同一 package 内单币种；金额字段使用 numeric/decimal，前端不做换算。                                               |
| Tax semantics               | `taxCostAmount` / `taxAssumptionSummary`        | 税务成本必须显式字段化，不允许只写进备注。                                                                            |
| Version chain               | `version`、`isCurrent`、`supersedesId`          | 新 package 可替代旧 package，旧版本不可覆盖。                                                                         |
| Guard / permission          | `project:read` / `project:write`                | 读取 query 用 `project:read`，创建新版本包用 `project:write`。                                                        |

## 4. 命令与接口边界

| Route / Controller                                   | Command / Service                                      | Request DTO / Contract                     | Response DTO / Contract              | Guard / Permission | Result  |
| ---------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ | ------------------------------------ | ------------------ | ------- |
| `POST /projects/{projectId}/technical-cost-packages` | `ProjectService.createProjectTechnicalCostPackage`     | `CreateProjectTechnicalCostPackageRequest` | `ProjectTechnicalCostPackageSummary` | `project:write`    | planned |
| `GET /projects/{projectId}/technical-cost-packages`  | `ProjectQueryService.listProjectTechnicalCostPackages` | N/A                                        | `ProjectTechnicalCostPackageList`    | `project:read`     | planned |
| `GET /projects/{projectId}/technical-cost-workspace` | `ProjectQueryService.getProjectTechnicalCostWorkspace` | N/A                                        | `ProjectTechnicalCostWorkspaceView`  | `project:read`     | planned |

### 4.1 公共路由补充信息

* Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
* Canonical route(s):
  * `POST /projects/{projectId}/technical-cost-packages`
  * `GET /projects/{projectId}/technical-cost-packages`
  * `GET /projects/{projectId}/technical-cost-workspace`
* Current implemented route(s): `N/A`
* Target implemented route(s): same as canonical.
* Inventory status: `planned`
* Route governance source: `ADR-015` + `EX-26`
* Blocker / exception: implementation must not start without these planned rows.

## 5. DTO / Contract Boundary

| Contract                                   | Required Fields                                                                                                                       | Excluded Fields                                           | Notes                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `CreateProjectTechnicalCostPackageRequest` | technical conclusion fields, scope items, risk items, cost items, tax fields, `currencyCode`, `effectiveAt`, `versionChangeReason`    | `projectId`、`version`、`isCurrent`、`status`             | `projectId` comes from route; version/current/status are service-owned. |
| `ProjectTechnicalCostPackageSummary`       | package id, project id, version/current status, conclusion summary, scope summary, risk summary, cost totals, tax summary, timestamps | full item detail only when listed separately in workspace | Used by list and downstream references.                                 |
| `ProjectTechnicalCostWorkspaceView`        | current package, scope items, risk items, cost items, blockers, next step, owner label, allowed actions                               | approval detail、pricing decision、bid result             | FE-10 main read model.                                                  |
| `ProjectTechnicalCostPackageList`          | `items`                                                                                                                               | pagination metadata                                       | First implementation can return project-scoped list newest first.       |

Required enums:

* `TechnicalFeasibilityDecision`: `feasible` / `conditional-feasible` / `not-recommended` / `infeasible`.
* `TechnicalScopeItemType`: `in-scope` / `out-of-scope` / `assumption`.
* `PresigningRiskLevel`: `R1` / `R2` / `R3` / `R4`.
* `PresigningRiskStatus`: `open` / `mitigating` / `accepted` / `closed`.
* `CostEstimateConfidenceLevel`: `high` / `medium` / `low`.
* `TaxReviewStatus`: `confirmed` / `pending` / `not-required`.
* `ProjectTechnicalCostPackageStatus`: `effective` / `superseded`.

## 6. 读侧边界

| Query / View                        | Consumer       | Fields                                                                         | Filter / Sort              | Permission Boundary | Result  |
| ----------------------------------- | -------------- | ------------------------------------------------------------------------------ | -------------------------- | ------------------- | ------- |
| `ProjectTechnicalCostWorkspaceView` | `FE-10`        | current package + scope/risk/cost/tax/detail items + blockers + allowedActions | current package by project | `project:read`      | planned |
| `ProjectTechnicalCostPackageList`   | future history | package summaries                                                              | newest first               | `project:read`      | planned |

Projection rules:

* If no current package exists, `GET /projects/{projectId}/technical-cost-workspace` returns a view with `currentPackage = null` and blocker summary, not `404`.
* `allowedActions` must not imply pricing / bid write authority.
* The view must not pull execution-period actual costs into presigning estimates.
* FE-10 displays all money values as provided; no frontend recalculation or currency conversion.

## 7. 持久化边界

| Table                            | Migration | Entity / Repository                          | DDL / Freeze Source | Check Result |
| -------------------------------- | --------- | -------------------------------------------- | ------------------- | ------------ |
| `project_technical_cost_package` | TBD       | `ProjectTechnicalCostPackage` / project repo | frozen here         | planned      |
| `project_technical_scope_item`   | TBD       | `ProjectTechnicalScopeItem`                  | frozen here         | planned      |
| `project_technical_risk_item`    | TBD       | `ProjectTechnicalRiskItem`                   | frozen here         | planned      |
| `project_technical_cost_item`    | TBD       | `ProjectTechnicalCostItem`                   | frozen here         | planned      |

Minimum package fields:

| Field                                  | Design Type / Meaning                          | DDL / Contract Rule                                 |
| -------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `project_id`                           | project owner                                  | uuid FK                                             |
| `version`                              | package version                                | int, unique with `project_id`                       |
| `is_current`                           | current version marker                         | boolean, partial unique current per project         |
| `supersedes_id`                        | superseded package                             | uuid nullable FK                                    |
| `status`                               | package status                                 | `effective` / `superseded`                          |
| `technical_feasibility_decision`       | feasibility conclusion                         | varchar(32)                                         |
| `technical_conclusion_summary`         | conclusion summary                             | text                                                |
| `allow_next_stage`                     | whether bid/pricing can proceed                | boolean                                             |
| `currency_code`                        | package currency                               | varchar(16), first version expects `CNY` by default |
| `total_estimated_amount_excluding_tax` | estimate total before tax                      | numeric(18,2)                                       |
| `total_tax_cost_amount`                | explicit tax cost                              | numeric(18,2)                                       |
| `total_estimated_amount_including_tax` | estimate total including tax                   | numeric(18,2)                                       |
| `tax_assumption_summary`               | tax assumption / impact summary                | text nullable                                       |
| `tax_review_status`                    | tax review state                               | varchar(32)                                         |
| `highest_risk_level`                   | max risk level                                 | varchar(8)                                          |
| `blocker_count`                        | derived blocker count persisted for quick list | int                                                 |
| `effective_at`                         | package effective datetime                     | timestamptz                                         |
| `created_by`                           | operator user                                  | uuid nullable                                       |
| `row_version`                          | optimistic lock                                | int default 1                                       |

Child-table rules:

* scope items are typed as `in-scope` / `out-of-scope` / `assumption`.
* risk items must carry category, level, status, owner role and `blocksNextStage`.
* cost items must carry category, basis, quantity/unit fields where applicable, money fields, confidence and uncertainty flag.
* all child records belong to an immutable package version; replacing a package creates a new parent and new child records.

## 8. Guard / Permission / State Rules

| Rule                        | Required Behavior                                                               |
| --------------------------- | ------------------------------------------------------------------------------- |
| Create permission           | `project:write`                                                                 |
| List / workspace permission | `project:read`                                                                  |
| Project state               | reject create for closed projects; read still allowed for history               |
| Version replacement         | creating a new package marks the previous current package as `superseded`       |
| Money consistency           | all cost items in one package must use the package `currencyCode`               |
| Tax visibility              | tax cost must be explicit even when tax review is pending                       |
| Downstream blocker          | `allowNextStage=false` or hard risk/blockers must surface in workspace blockers |

## 9. 一致性目标

* Document -> code: pending implementation.
* ADR-015 inventory -> route: planned and frozen.
* Migration -> entity: pending implementation.
* Entity -> contract: pending implementation.
* Route -> command: pending implementation.
* Query -> view: pending implementation.
* Guard / permission: pending implementation.
* OpenAPI / generated client: pending implementation.

## 10. 测试与校验

| Check                            | Required | Command / Evidence                                                                            | Result   | Gap / Reason                                     |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| Diff whitespace                  | yes      | `git diff --check`                                                                            | pending  | baseline writeback                               |
| API lint                         | yes      | `corepack pnpm nx lint poms-api`                                                              | pending  | required once code changes begin                 |
| API build                        | yes      | `corepack pnpm nx build poms-api`                                                             | pending  | required once code changes begin                 |
| API unit tests                   | yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`                       | pending  | must cover create/list/workspace projection      |
| OpenAPI generation / client diff | yes      | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:check`       | pending  | required because DTO and generated client change |
| Migration / schema check         | yes      | `corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check` | pending  | required because new tables are planned          |
| Admin frontend                   | no       | N/A                                                                                           | deferred | belongs to `FE-10` after generated client exists |

## 11. 例外与风险

| Exception ID                            | Level  | Scope                          | Approved By | Cleanup Owner                         | Cleanup Due                    | Notes                                                                   |
| --------------------------------------- | ------ | ------------------------------ | ----------- | ------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| `EX26-E1-SINGLE-CURRENCY-FIRST-SLICE`   | medium | 多币种和汇率换算               | Codex       | future pricing / multi-currency owner | before broad quotation rollout | 首版保留 `currencyCode`，但不支持同 package 多币种换算。                |
| `EX26-E2-ROLLBACK-REQUEST-OUT-OF-SCOPE` | medium | 受控回退请求和工作区重开结果链 | Codex       | future presigning rollback owner      | before `FE-12` final close-out | 本片用版本替代表达重估结果，不落正式 rollback request / reopen record。 |

## 12. G1 结论

* Gate Status: `Pass`
* Approved By: `Codex`
* Approved At: `2026-04-24`
* Conditions:
  1. EX-26 可以进入实现，但必须先消费本基线与 `api-route-canonical-inventory.md` 的 planned rows。
  2. 首版只能形成签约前技术与成本版本包，不得复用执行期实际成本记录。
  3. 金额字段必须显式 `currencyCode`、税额和含税 / 未税口径；前端不得自行换算。
  4. `FE-10` 在本片 G4 前保持 `Blocked`。
