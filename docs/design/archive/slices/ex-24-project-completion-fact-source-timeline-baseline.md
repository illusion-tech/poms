# EX-24 项目完成事实源与生命周期时间线投影实施基线包

- Gate Status: `Pass`
- Parent: Phase 2 frontend workspace / project lifecycle experience
- Owner: `Codex`
- Slice Type: `api / command + persistence + query projection`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-24`

## 1. 范围

- 本次目标:
  - 新增 `ProjectCompletionRecord` 最小事实源，作为项目 `completed` 阶段完成时间与完成结论的权威来源。
  - 新增项目子集合路由：`POST /projects/{projectId}/completion-records`、`GET /projects/{projectId}/completion-records`。
  - 将最新有效完成记录投影到既有 `ProjectTimelineView.events`，供项目详情生命周期组件展示真实完成时间。
  - 同步 shared contract、API DTO、OpenAPI schema、generated client 与必要的 admin data-access 类型导出。
- 本次明确不做:
  - 不实现项目归档事实源。
  - 不新增前端页面、菜单、按钮或写侧操作入口。
  - 不把 `Project.currentStage/status`、`AcceptanceRecord.confirmedAt`、最终结算快照、待办完成时间或人工备注伪装成项目完成事实。
  - 不自动推进提成结算、归档或关闭流程。
- 下游可依赖的交付边界:
  - 后续前端可继续通过 `ProjectTimelineView` 消费 `stage='completed'`、`eventType='stage-completed'`、`sourceType='project-completion-record'` 的真实完成事件。
- 不允许下游依赖的留白:
  - 归档是否属于主生命周期阶段尚未冻结，归属 `EX-25`。

## 2. 正式输入

| Input Type                | Document / Source                                 | Section / Anchor                     | Status         | Notes                                                                  |
| ------------------------- | ------------------------------------------------- | ------------------------------------ | -------------- | ---------------------------------------------------------------------- |
| Business design           | `project-lifecycle-design.md`                     | 阶段定义 / `completed`               | frozen         | `completed` 表示业务完成结论，不得由普通编辑逆改。                     |
| Command design            | `interface-command-design.md`                     | `confirmProjectCompletion`           | frozen         | 本片采用项目子集合 create 表达最小完成确认落库。                       |
| DTO / OpenAPI design      | 本基线包 + `shared-contracts.ts` implementation   | `ProjectCompletionRecord*`           | frozen here    | 本片冻结最小 DTO，不沿用旧动作路由草案。                               |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                | project / completion records         | planned        | 两条 public route 已作为 `EX-24` planned row 写入 authoritative 清单。 |
| Query boundary            | `query-view-boundary-design.md`、`EX-22`、`EX-23` | `ProjectTimelineView`                | aligned        | 继续复用既有 timeline query，只扩展事实来源。                          |
| Data model / table freeze | `table-structure-freeze-design.md`                | `project_completion_record`          | frozen minimum | `project_id`、`acceptance_record_id`、`completed_at` 必须落库。        |
| ADR                       | `ADR-015`                                         | nested project subcollection         | aligned        | project-scoped collection create/list。                                |
| Frontend baseline         | `FE-22`                                           | lifecycle real milestone consumption | aligned        | 前端只展示 backend 返回事件，不推断缺失阶段。                          |

## 3. 本次 SSOT

| Concern                     | SSOT                                         | Implementation Rule                                                        |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| Business semantics          | `project-lifecycle-design.md`                | 项目完成必须来自独立完成结论事实。                                         |
| Public route canonical path | `api-route-canonical-inventory.md`           | 使用 `/projects/{projectId}/completion-records`。                          |
| Route / command naming      | `ProjectController`                          | `createProjectCompletionRecord`、`listProjectCompletionRecords`。          |
| DTO / contract naming       | `shared-contracts.ts`                        | `ProjectCompletionRecordSummary`、`CreateProjectCompletionRecordRequest`。 |
| Table / column naming       | `table-structure-freeze-design.md`           | `project_completion_record` snake_case 字段。                              |
| Date / time semantics       | `ProjectCompletionRecord.completedAt`        | `datetime`，表示完成结论确认的业务发生时间。                               |
| Identifier semantics        | `ProjectCompletionRecord.id`                 | 系统内 UUID；timeline `sourceId` 指向该记录。                              |
| Source traceability         | `ProjectCompletionRecord.acceptanceRecordId` | 必须引用同项目有效验收记录。                                               |
| Money / decimal semantics   | N/A                                          | 本片不涉及金额。                                                           |
| Status machine              | `ProjectCompletionRecord.status`             | 当前只创建 `confirmed`，后续 void/replace 另开切片。                       |

## 4. 命令与接口边界

| Route / Controller                              | Command / Service                                  | Request DTO / Contract                 | Response DTO / Contract            | Guard / Permission | Design Source                                                       | Result  |
| ----------------------------------------------- | -------------------------------------------------- | -------------------------------------- | ---------------------------------- | ------------------ | ------------------------------------------------------------------- | ------- |
| `POST /projects/{projectId}/completion-records` | `ProjectService.createProjectCompletionRecord`     | `CreateProjectCompletionRecordRequest` | `ProjectCompletionRecordSummary`   | `project:write`    | `interface-command-design.md`、`api-route-canonical-inventory.md`   | planned |
| `GET /projects/{projectId}/completion-records`  | `ProjectQueryService.listProjectCompletionRecords` | N/A                                    | `ProjectCompletionRecordSummary[]` | `project:read`     | `query-view-boundary-design.md`、`api-route-canonical-inventory.md` | planned |
| `GET /projects/{projectId}/timeline`            | `ProjectQueryService.getProjectTimeline`           | N/A                                    | `ProjectTimelineView`              | `project:read`     | `EX-22`、`EX-23`                                                    | extend  |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `POST /projects/{projectId}/completion-records`
  - `GET /projects/{projectId}/completion-records`
- Current implemented route(s): `N/A`
- Target implemented route(s): same as canonical.
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-24`
- Blocker / exception: none for route surface; implementation must not start before this baseline is consumed.

## 5. DTO / Contract Boundary

| Contract                               | Required Fields                                                                                                                                                             | Excluded Fields                                                 | Notes                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `CreateProjectCompletionRecordRequest` | `acceptanceRecordId`、`completionResult`、`completedAt`、`completionSummary`、`evidenceSummary`                                                                             | `projectId`、`currentStage`、`status`、`sourceType`、`sourceId` | `projectId` comes from route; stage/status are service-owned.           |
| `ProjectCompletionRecordSummary`       | `id`、`projectId`、`acceptanceRecordId`、`completionResult`、`status`、`completedAt`、`completedBy`、`completedByName`、`completionSummary`、`evidenceSummary`、`createdAt` | full acceptance detail、settlement detail、archive detail       | Summary is sufficient for list and timeline projection.                 |
| `ProjectCompletionRecordList`          | `items`                                                                                                                                                                     | pagination metadata                                             | First implementation can return full project-scoped list, newest first. |

Required enum additions:

- `ProjectTimelineEvent.sourceType`: add `project-completion-record`.
- `ProjectCompletionRecordStatus`: `confirmed` only for this slice.
- `ProjectCompletionResult`: `completed` / `conditional-completed`.

## 6. 读侧边界

| Query / View                  | Consumer                             | Fields                                                                                       | Filter / Sort                        | Permission Boundary | Design Source                          | Result  |
| ----------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------- | -------------------------------------- | ------- |
| `ProjectTimelineView`         | `ProjectDetail` / lifecycle timeline | `stage='completed'`、`eventType='stage-completed'`、`sourceType='project-completion-record'` | latest `confirmed` completion record | `project:read`      | `EX-22`、`project-lifecycle-design.md` | planned |
| `ProjectCompletionRecordList` | future read pages / audit            | completion summary fields                                                                    | newest first                         | `project:read`      | `table-structure-freeze-design.md`     | planned |

Timeline projection rules:

- `occurredAt` comes from `ProjectCompletionRecord.completedAt`.
- `sourceId` points to `ProjectCompletionRecord.id`.
- `evidenceLabel` should summarize the referenced acceptance record and completion evidence.
- If no confirmed completion record exists, the timeline must omit the `completed` stage event rather than infer one.

## 7. 持久化边界

| Table                       | Migration | Entity / Repository                             | DDL / Freeze Source                | Check Result |
| --------------------------- | --------- | ----------------------------------------------- | ---------------------------------- | ------------ |
| `project_completion_record` | TBD       | `ProjectCompletionRecord` / `ProjectRepository` | `table-structure-freeze-design.md` | pending      |

| Field                  | Design Type / Meaning  | Migration / DDL                 | Entity               | Shared Contract / OpenAPI | Result  |
| ---------------------- | ---------------------- | ------------------------------- | -------------------- | ------------------------- | ------- |
| `project_id`           | Project owner          | uuid FK                         | `projectId`          | `projectId`               | planned |
| `acceptance_record_id` | Source acceptance fact | uuid FK                         | `acceptanceRecordId` | `acceptanceRecordId`      | planned |
| `completion_result`    | 完成结论               | varchar(32)                     | `completionResult`   | enum                      | planned |
| `status`               | 记录状态               | varchar(32) default `confirmed` | `status`             | enum                      | planned |
| `completed_at`         | 完成确认时间           | timestamptz                     | `completedAt`        | datetime                  | planned |
| `completed_by`         | 确认人                 | uuid nullable                   | `completedBy`        | uuid nullable             | planned |
| `completion_summary`   | 完成结论摘要           | text                            | `completionSummary`  | string                    | planned |
| `evidence_summary`     | 证据摘要               | text                            | `evidenceSummary`    | string                    | planned |

Implementation constraints:

- `acceptance_record_id` must reference an effective record from the same project.
- The first implementation may allow multiple historical records but the timeline must select the newest confirmed record by `completed_at`, then creation time as a deterministic tie-breaker.
- If a future slice adds void/replace semantics, it must add a new governance baseline and migration constraints.

## 8. Guard / Permission / State Rules

| Rule                         | Required Behavior                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Create permission            | `project:write`                                                                                                        |
| List / timeline permission   | `project:read`                                                                                                         |
| Project existence            | route `projectId` must resolve to an existing project.                                                                 |
| Source acceptance            | `acceptanceRecordId` must belong to the same project and be effective.                                                 |
| Closed / terminated projects | creation must reject `closed-lost` / `closed-terminated` projects.                                                     |
| Completion inference         | service/query must not infer completion from `currentStage`, `status`, acceptance, settlement, archive, or todo facts. |

Whether creation also updates `Project.currentStage/status` to `completed` is not implicitly granted by this baseline. If implemented in EX-24, it must be explicit in service tests and must not be driven by frontend state.

## 9. 一致性目标

- Document -> code: pending implementation.
- ADR-015 inventory -> route: planned and frozen.
- Migration -> entity: pending implementation.
- Entity -> contract: pending implementation.
- Route -> command: pending implementation.
- Query -> view: pending implementation.
- Guard / permission: pending implementation.
- OpenAPI / generated client: pending implementation.

## 10. 测试与校验

| Check                            | Required | Command / Evidence                                                                               | Result  | Gap / Reason                                      |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------- |
| Diff whitespace                  | yes      | `git diff --check`                                                                               | pending | implementation not started                        |
| API lint                         | yes      | `corepack pnpm nx lint poms-api`                                                                 | pending | required once code changes begin                  |
| API build                        | yes      | `corepack pnpm nx build poms-api`                                                                | pending | required once code changes begin                  |
| API unit tests                   | yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`                          | pending | must cover create/list/timeline projection guards |
| OpenAPI generation / client diff | yes      | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:generate/check` | pending | required because DTO and generated client change  |
| Migration / schema check         | yes      | `corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check`    | pending | required because new table is planned             |
| Admin data-access lint           | yes      | `corepack pnpm nx lint admin-data-access`                                                        | pending | required if generated types / exports are touched |
| Admin frontend test              | optional | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`                 | pending | may be deferred to `FE-23` if EX-24 stays backend |

## 11. 例外与风险

| Exception ID                            | Level | Scope                         | Approved By | Cleanup Owner | Cleanup Due | Notes                                                             |
| --------------------------------------- | ----- | ----------------------------- | ----------- | ------------- | ----------- | ----------------------------------------------------------------- |
| `EX24-E1-ARCHIVE-SOURCE-OUT-OF-SCOPE`   | low   | archive milestone events      | Codex       | `EX-25`       | `EX-25 G1`  | 本片只关闭 `completed` 完成时间；归档事实源与阶段语义另开切片。   |
| `EX24-E2-FRONTEND-RUNTIME-OUT-OF-SCOPE` | low   | frontend runtime presentation | Codex       | `FE-23`       | `FE-23 G1`  | 本片只保证 contract / generated client 可消费；前端断言另开切片。 |

## 12. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-24`
- Conditions:
  - EX-24 可以进入实现，但必须先消费本基线与 `api-route-canonical-inventory.md` 中 `planned` route row。
  - 任何完成时间展示都必须来自 `ProjectCompletionRecord.completedAt`。
  - `FE22-E1-PARTIAL-STAGE-COVERAGE` 只能在 `EX-24` + `FE-23` + `EX-25` + `FE-24` 链路完成后关闭或重分类。
