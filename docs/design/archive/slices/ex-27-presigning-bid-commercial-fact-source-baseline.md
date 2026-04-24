# EX-27 签约前招投标 / 商务竞标事实源与读取投影实施基线包

* Gate Status: `Pass`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `api / command + persistence + query projection`
* G1 Reviewer: `Codex`
* G1 Date: `2026-04-24`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-27`
* Downstream Frontend: `FE-11`

## 1. 范围

* 本次目标:
  1. 新增签约前 `招投标 / 商务竞标` 的最小正式事实源 `ProjectBidCommercialProcess`。
  2. 以 project-scoped current process 表达竞标形态、阶段、决策、材料齐备度、结果、阻断项、责任归口和时间线摘要。
  3. 新增项目子集合 create / list route，以及项目级 current workspace query，供 `FE-11` 读取。
  4. 同步 shared contract、OpenAPI、generated client、migration、entity、service、query、guard 和 backend tests。
* 本次明确不做:
  1. 不实现 `FE-11` 前端页面。
  2. 不实现正式投标文件库、附件上传、外部招标平台同步或复杂评标过程。
  3. 不实现报价 / 毛利评审；该部分归属 `EX-28`。
  4. 不把 `ProjectDetailView.currentBidSummary` 占位字段扩展为完整工作区；详情摘要可在后续读取当前 process 时再纠偏。
  5. 不用 `ContractReadinessDetail` 反向推断竞标结果。
* 下游可依赖的交付边界:
  1. `FE-11` 可通过 generated client 读取 `ProjectBidCommercialWorkspaceView`。
  2. `FE-11` 可把 FE-09 的 `bid-commercial` entry 从 disabled / gap 状态切到真实路由。
  3. `EX-28` 可引用当前竞标 process 的结果、直接商务路径状态和阻断项，但不得把它当作报价评审结论。

## 2. 正式输入

| Input Type                | Document / Source                                                                        | Section / Anchor       | Status   | Notes                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- | -------- | ----------------------------------------------------- |
| Business roadmap          | `docs/design/phase2-experience-optimization-roadmap.md`                                  | `L1-S3`                | accepted | 招投标与报价评审承接是 L1 签约前主线能力              |
| Workspace design          | `docs/design/phase2-presigning-bid-commercial-workspace.md`                              | `§3`、`§4`、`§5`、`§7` | review   | 冻结竞标 / 商务竞标工作区结构                         |
| IA design                 | `docs/design/phase2-presigning-workspace-information-architecture.md`                    | `§5.4`、`§7`           | review   | 竞标结果进入报价评审或签约就绪判断                    |
| Handoff map               | `docs/design/phase2-presigning-workspace-handoff-map.md`                                 | `§4.3`、`§5`、`§6`     | review   | 阻断项、引用链和后续报价承接                          |
| Template design           | `docs/design/phase2-presigning-workspace-templates.md`                                   | `§5`、`§6`、`§7`       | review   | 风险、阻断、关键结论、材料齐备度和下一步模板          |
| Query boundary            | `docs/design/query-view-boundary-design.md`                                              | `§2`、`§4`、`§5.1`     | active   | 查询返回 view model，不直接透出写模型                 |
| Command / DTO boundary    | `docs/design/interface-command-design.md`、`docs/design/interface-openapi-dto-design.md` | command / DTO rules    | active   | create route 只承载形成新竞标过程版本，不混入报价动作 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                           | planned rows           | planned  | 本片新增 planned rows，进入实现前必须消费             |
| Frontend blocker          | `docs/design/archive/slices/fe-11-bid-pricing-workspace-frontend-baseline.md`            | G1 decision            | blocked  | FE-11 等待本片输出 generated client                   |

## 3. 本次 SSOT

| Concern                     | SSOT                                                 | Implementation Rule                                                                                                   |
| --------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Business object             | `ProjectBidCommercialProcess`                        | 代表一次签约前招投标 / 商务竞标过程版本，也可表达直接商务路径或不适用状态。                                           |
| Public route canonical path | `api-route-canonical-inventory.md` planned rows      | 使用 project-scoped collection create/list + stable query subresource。                                               |
| Route / command naming      | 本基线包                                             | `createProjectBidCommercialProcess`、`listProjectBidCommercialProcesses`、`getProjectBidCommercialWorkspace`          |
| DTO / contract naming       | 本基线包                                             | `CreateProjectBidCommercialProcessRequest`、`ProjectBidCommercialProcessSummary`、`ProjectBidCommercialWorkspaceView` |
| Table / column naming       | 本基线包                                             | `project_bid_commercial_process` 及子表，snake_case。                                                                 |
| Direct commercial path      | `bidMode = direct-commercial`                        | 直接商务报价必须显式记录，不允许前端靠无竞标数据推断。                                                                |
| Not applicable path         | `bidMode = not-required` + `decision = not-required` | 不适用也应是正式事实状态，便于 FE-11 和 EX-28 解释路径。                                                              |
| Version chain               | `version`、`isCurrent`、`supersedesId`               | 新 process 可替代旧 process，旧版本不可覆盖。                                                                         |
| Guard / permission          | `project:read` / `project:write`                     | 读取 query 用 `project:read`，创建新过程版本用 `project:write`。                                                      |

## 4. 命令与接口边界

| Route / Controller                                    | Command / Service                                       | Request DTO / Contract                     | Response DTO / Contract              | Guard / Permission | Result  |
| ----------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ | ------------------------------------ | ------------------ | ------- |
| `POST /projects/{projectId}/bid-commercial-processes` | `ProjectService.createProjectBidCommercialProcess`      | `CreateProjectBidCommercialProcessRequest` | `ProjectBidCommercialProcessSummary` | `project:write`    | planned |
| `GET /projects/{projectId}/bid-commercial-processes`  | `ProjectQueryService.listProjectBidCommercialProcesses` | N/A                                        | `ProjectBidCommercialProcessList`    | `project:read`     | planned |
| `GET /projects/{projectId}/bid-commercial-workspace`  | `ProjectQueryService.getProjectBidCommercialWorkspace`  | N/A                                        | `ProjectBidCommercialWorkspaceView`  | `project:read`     | planned |

### 4.1 公共路由补充信息

* Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
* Canonical route(s):
  * `POST /projects/{projectId}/bid-commercial-processes`
  * `GET /projects/{projectId}/bid-commercial-processes`
  * `GET /projects/{projectId}/bid-commercial-workspace`
* Current implemented route(s): `N/A`
* Target implemented route(s): same as canonical.
* Inventory status: `planned`
* Route governance source: `ADR-015` + `EX-27`
* Blocker / exception: implementation must not start without these planned rows.

## 5. DTO / Contract Boundary

| Contract                                   | Required Fields                                                                                                       | Excluded Fields                               | Notes                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `CreateProjectBidCommercialProcessRequest` | bid mode, current stage, decision, result, summary fields, owner role, effective time, material items, timeline items | `projectId`、`version`、`isCurrent`、`status` | `projectId` comes from route; version/current/status are service-owned. |
| `ProjectBidCommercialProcessSummary`       | process id, project id, version/current status, mode, stage, decision, result, summaries, blocker count, timestamps   | full material / timeline detail               | Used by list and downstream references.                                 |
| `ProjectBidCommercialMaterialItemView`     | label, status, responsible role, due date, blocker flag, navigation hint, sort order                                  | file attachment bytes                         | Tracks material readiness without implementing file storage.            |
| `ProjectBidCommercialTimelineItemView`     | event label, summary, event status, occurred / due datetime, responsible role, sort order                             | external platform payload                     | Provides lightweight traceability for FE-11.                            |
| `ProjectBidCommercialWorkspaceView`        | current process, material items, timeline items, blockers, next step, owner label, allowed actions                    | quote / margin decision                       | FE-11 bid-commercial main read model.                                   |
| `ProjectBidCommercialProcessList`          | `items`                                                                                                               | pagination metadata                           | First implementation can return project-scoped list newest first.       |

Required enums:

* `BidCommercialMode`: `public-tender` / `invitation` / `comparison` / `commercial-negotiation` / `competitive-negotiation` / `direct-commercial` / `not-required`.
* `BidCommercialStage`: `not-started` / `preparation` / `submitted` / `negotiating` / `result-confirmed` / `closed`.
* `BidCommercialDecision`: `pending` / `participate` / `no-bid` / `not-required`.
* `BidCommercialResultStatus`: `pending` / `won` / `lost` / `cancelled` / `not-applicable`.
* `BidCommercialMaterialStatus`: `missing` / `in-progress` / `ready` / `not-required`.
* `BidCommercialTimelineStatus`: `pending` / `done` / `cancelled`.
* `ProjectBidCommercialProcessStatus`: `effective` / `superseded`.

## 6. 读侧边界

| Query / View                        | Consumer       | Fields                                                                         | Filter / Sort              | Permission Boundary | Result  |
| ----------------------------------- | -------------- | ------------------------------------------------------------------------------ | -------------------------- | ------------------- | ------- |
| `ProjectBidCommercialWorkspaceView` | `FE-11`        | current process + materials + timeline + blockers + next step + allowedActions | current process by project | `project:read`      | planned |
| `ProjectBidCommercialProcessList`   | future history | process summaries                                                              | newest first               | `project:read`      | planned |

Projection rules:

* If no current process exists, `GET /projects/{projectId}/bid-commercial-workspace` returns a view with `currentProcess = null` and blocker summary, not `404`.
* `bidMode = direct-commercial` and `bidMode = not-required` are valid current process states, not missing data.
* `allowedActions` must not imply pricing / margin approval authority.
* The view must not pull quotation / margin conclusions into the bid-commercial workspace.

## 7. 持久化边界

| Table                                  | Migration | Entity / Repository                          | DDL / Freeze Source | Check Result |
| -------------------------------------- | --------- | -------------------------------------------- | ------------------- | ------------ |
| `project_bid_commercial_process`       | TBD       | `ProjectBidCommercialProcess` / project repo | frozen here         | planned      |
| `project_bid_commercial_material_item` | TBD       | `ProjectBidCommercialMaterialItem`           | frozen here         | planned      |
| `project_bid_commercial_timeline_item` | TBD       | `ProjectBidCommercialTimelineItem`           | frozen here         | planned      |

Minimum process fields:

| Field              | Design Type / Meaning                 | DDL / Contract Rule                         |
| ------------------ | ------------------------------------- | ------------------------------------------- |
| `project_id`       | project owner                         | uuid FK                                     |
| `version`          | process version                       | int, unique with `project_id`               |
| `is_current`       | current version marker                | boolean, partial unique current per project |
| `supersedes_id`    | superseded process                    | uuid nullable FK                            |
| `status`           | process status                        | `effective` / `superseded`                  |
| `bid_mode`         | bidding / commercial mode             | varchar(64)                                 |
| `current_stage`    | process stage                         | varchar(64)                                 |
| `decision`         | whether to participate / no-bid / N/A | varchar(64)                                 |
| `result_status`    | final or current result               | varchar(64)                                 |
| `decision_summary` | decision explanation                  | text nullable                               |
| `result_summary`   | result explanation                    | text nullable                               |
| `process_summary`  | current process summary               | text                                        |
| `owner_role`       | responsible role                      | varchar(128) nullable                       |
| `blocker_count`    | derived blocker count                 | int                                         |
| `effective_at`     | process effective datetime            | timestamptz                                 |
| `created_by`       | operator user                         | uuid nullable                               |
| `row_version`      | optimistic lock                       | int default 1                               |

Child-table rules:

* material items carry status, due date, responsible role, blocker flag and navigation hint.
* timeline items carry event label, event status, occurred / due datetime and summary.
* all child records belong to an immutable process version; replacing a process creates a new parent and new child records.

## 8. Guard / Permission / State Rules

| Rule                        | Required Behavior                                                               |
| --------------------------- | ------------------------------------------------------------------------------- |
| Create permission           | `project:write`                                                                 |
| List / workspace permission | `project:read`                                                                  |
| Project state               | reject create for closed projects; read still allowed for history               |
| Version replacement         | creating a new process marks the previous current process as `superseded`       |
| No-bid / N/A semantics      | no-bid and not-required are explicit facts and must not be represented as null  |
| Downstream blocker          | material blockers, pending decision or negative result must surface in blockers |

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

| Check                            | Required | Command / Evidence                                                                      | Result   | Gap / Reason                                     |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| Diff whitespace                  | yes      | `git diff --check`                                                                      | pending  | baseline writeback                               |
| Markdown formatting              | yes      | `corepack pnpm run format:md:check`                                                     | pending  | docs touched                                     |
| API lint                         | yes      | `corepack pnpm nx lint poms-api`                                                        | pending  | required once code changes begin                 |
| API build                        | yes      | `corepack pnpm nx build poms-api`                                                       | pending  | required once code changes begin                 |
| API unit tests                   | yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`                 | pending  | must cover create/list/workspace projection      |
| OpenAPI generation / client diff | yes      | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:check` | pending  | required because DTO and generated client change |
| Migration / schema check         | yes      | `corepack pnpm nx run poms-api:migration-check`                                         | pending  | required because new tables are planned          |
| Admin frontend                   | no       | N/A                                                                                     | deferred | belongs to `FE-11` after generated client exists |

## 11. 例外与风险

| Exception ID                           | Level  | Scope                        | Approved By | Cleanup Owner            | Cleanup Due                         | Notes                                                                 |
| -------------------------------------- | ------ | ---------------------------- | ----------- | ------------------------ | ----------------------------------- | --------------------------------------------------------------------- |
| `EX27-E1-NO-FILE-STORAGE-FIRST-SLICE`  | medium | 投标文件库 / 附件            | Codex       | future bid process owner | before broad bid material rollout   | 首版只记录材料齐备度和引用提示，不接入文件上传或附件存储。            |
| `EX27-E2-PROJECT-DETAIL-SUMMARY-DEFER` | low    | 项目详情 `currentBidSummary` | Codex       | FE-11 / future summary   | before FE-11 G4 or separate summary | 本片优先提供工作区投影；项目详情摘要是否改读当前 process 可后续纠偏。 |

## 12. G1 结论

* Gate Status: `Pass`
* Approved By: `Codex`
* Approved At: `2026-04-24`
* Conditions:
  1. EX-27 可以进入实现，但必须先消费本基线与 `api-route-canonical-inventory.md` 的 planned rows。
  2. 首版只形成竞标 / 商务竞标过程事实源，不得混入报价 / 毛利评审。
  3. 直接商务路径和不适用路径必须显式表达，不得由前端缺数据推断。
  4. `FE-11` 在 `EX-27` 与 `EX-28` 均完成前保持 `Blocked`。
