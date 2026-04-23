# EX-22 项目生命周期阶段里程碑事实源查询实施基线包

- Gate Status: `Pass`
- Parent: `FE-21`
- Owner: `Codex`
- Slice Type: `api / query`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-23`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-22`

## 1. 范围

- 本次目标:
  1. 新增项目级阶段里程碑查询 `GET /projects/{projectId}/timeline`。
  2. 新增 `ProjectTimelineView` / `ProjectTimelineEvent` shared contract、API DTO、OpenAPI 与 generated client。
  3. 只从既有真实动作事实源输出可追溯阶段时间：项目创建、合同签约、移交确认、项目关闭。
  4. 为后续 `FE-22` 接入 `ProjectLifecycleTimeline.completedAtLabel/detail/tooltip` 提供权威输入。
- 本次明确不做:
  1. 不新增持久化表、migration、审计写侧或项目生命周期状态机。
  2. 不伪造验收确认、正式执行完成、项目完成归档等当前没有独立事实源的完成时间。
  3. 不改项目详情页、工作区壳层或前端 store；前端展示归属后续 `FE-22`。
  4. 不把 `ProjectTimelineView` 扩展成完整工作流引擎或事件溯源账本。
- 下游可依赖的交付边界:
  1. 前端可通过 generated client 读取项目里程碑事件，并仅展示 `isAuthoritative = true` 的已发生事实。
  2. 阶段完成时间必须来自 `occurredAt`，展示文案可来自 `resultLabel` / `evidenceLabel` / `actorName`。
  3. 当前无事实源的阶段不返回事件，不允许前端用当前阶段或状态推断完成时间。
- 不允许下游依赖的留白:
  1. 本片不提供每一个生命周期阶段的完整完成时间。
  2. 本片不提供阶段计划时间、预计完成时间或 SLA。
  3. 本片不替代 `ProjectWorkspaceGuidanceView` 的当前阶段 / 下一步 / 缺口说明职责。

## 2. 正式输入

| Input Type                | Document / Source                                                     | Section / Anchor                         | Status  | Notes                                                                       |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------------------- | ------- | --------------------------------------------------------------------------- |
| Frontend blocker          | `docs/design/fe-21-project-lifecycle-timeline-responsive-baseline.md` | `FE21-E1-COMPLETION-TIME-SOURCE`         | active  | 前端已经具备展示能力，但明确缺少真实完成时间事实源。                        |
| Query boundary            | `docs/design/query-view-boundary-design.md`                           | `ProjectTimelineView`                    | active  | 时间线必须以动作事实为主，不以列表字段拼装。                                |
| Business design           | `docs/design/project-lifecycle-design.md`                             | 生命周期主链路                           | draft   | 项目生命周期阶段语义来自正式项目主链，不重写状态机。                        |
| Experience design         | `docs/design/phase2-lifecycle-experience-blueprint.md`                | lifecycle continuity                     | active  | 用户需要知道项目走到哪里、哪些关键动作已完成。                              |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                        | project domain / `EX-22`                 | aligned | 新增 project-scoped noun subresource `GET /projects/{projectId}/timeline`。 |
| Runtime fact              | `Project` entity                                                      | `createdAt/closedAt/currentStage/status` | fact    | 项目创建与关闭是当前可读项目事实。                                          |
| Runtime fact              | `Contract` entity                                                     | `signedAt/contractNo`                    | fact    | 合同签约时间是当前签约阶段可读事实。                                        |
| Runtime fact              | `ProjectHandover` entity                                              | `status/confirmedAt/confirmedBy`         | fact    | 移交确认时间是当前移交阶段可读事实。                                        |

## 3. 本次 SSOT

| Concern                     | SSOT                                            | Implementation Rule                                                                |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Business semantics          | `query-view-boundary-design.md` + runtime facts | 只输出真实动作事件；没有事实源的阶段不生成事件。                                   |
| Public route canonical path | `GET /projects/{projectId}/timeline`            | 使用项目父资源下名词型子资源，不使用 page suffix 或 action route。                 |
| Route / command naming      | `getProjectTimeline`                            | controller 只委派 query service。                                                  |
| DTO / contract naming       | `ProjectTimelineView` / `ProjectTimelineEvent`  | shared contract 为唯一 wire contract，API DTO 从 shared schema 创建。              |
| Table / column naming       | Existing entities                               | 复用 `project`、`contract`、`project_handover`，不改 DDL。                         |
| Date / time semantics       | `occurredAt: datetime`                          | 所有里程碑时间统一为 ISO datetime，不输出 date-only 阶段完成时间。                 |
| Identifier semantics        | Internal UUID                                   | `projectId/sourceId/actorUserId` 均为系统内 UUID；无来源对象时 `sourceId = null`。 |
| Money / decimal semantics   | N/A                                             | 本片不承载金额。                                                                   |
| Status machine              | Existing `Project.currentStage/status`          | 不新增阶段枚举，不用状态推断缺失完成时间。                                         |

## 4. 命令与接口边界

| Route / Controller                                                     | Command / Service                        | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source                  | Result   |
| ---------------------------------------------------------------------- | ---------------------------------------- | ---------------------- | ----------------------- | ------------------ | ------------------------------ | -------- |
| `GET /projects/{projectId}/timeline` / `ProjectController.getTimeline` | `ProjectQueryService.getProjectTimeline` | path `projectId`       | `ProjectTimelineView`   | `project:read`     | `ProjectTimelineView` boundary | `frozen` |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/timeline`
- Current implemented route(s): none before this slice
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-22`
- Blocker / exception: none after this baseline row is added.

## 5. 读侧边界

| Query / View           | Consumer       | Fields                                                                                                                                                                | Filter / Sort                  | Permission Boundary | Design Source                  | Result   |
| ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------- | ------------------------------ | -------- |
| `ProjectTimelineView`  | Future `FE-22` | `projectId`、`events`、`generatedAt`                                                                                                                                  | 单项目；events by `occurredAt` | `project:read`      | `ProjectTimelineView` boundary | `frozen` |
| `ProjectTimelineEvent` | Future `FE-22` | `eventKey`、`stage`、`stageLabel`、`eventType`、`occurredAt`、`actorUserId`、`actorName`、`resultLabel`、`sourceType`、`sourceId`、`evidenceLabel`、`isAuthoritative` | N/A                            | no sensitive fields | runtime facts                  | `frozen` |

## 6. 持久化边界

| Table              | Migration | Entity / Repository                                       | DDL / Freeze Source | Check Result    |
| ------------------ | --------- | --------------------------------------------------------- | ------------------- | --------------- |
| `project`          | N/A       | `Project` / `ProjectRepository.findById`                  | Existing            | read-only reuse |
| `contract`         | N/A       | `Contract` / `ProjectRepository.findContractsByProjectId` | Existing            | read-only reuse |
| `project_handover` | N/A       | `ProjectHandover` / new read repository method            | Existing            | read-only reuse |

| Field             | Design Type / Meaning            | Migration / DDL | Entity                                                                           | Shared Contract / OpenAPI | Result |
| ----------------- | -------------------------------- | --------------- | -------------------------------------------------------------------------------- | ------------------------- | ------ |
| `occurredAt`      | authoritative milestone datetime | existing        | `Project.createdAt/closedAt`、`Contract.signedAt`、`ProjectHandover.confirmedAt` | `z.iso.datetime()`        | frozen |
| `actorUserId`     | actor UUID when known            | existing        | `createdBy/updatedBy/confirmedBy`                                                | `z.uuid().nullable()`     | frozen |
| `sourceType`      | fact source kind                 | N/A             | source entity kind                                                               | enum                      | frozen |
| `sourceId`        | source row UUID when known       | existing        | source entity `id`                                                               | `z.uuid().nullable()`     | frozen |
| `isAuthoritative` | whether event has trusted source | N/A             | derived from source availability                                                 | `z.boolean()`             | frozen |

## 7. 一致性结论

- Document -> code:
  - 本片正式关闭 `FE21-E1-COMPLETION-TIME-SOURCE` 的后端事实源缺口，但不直接改前端展示。
- ADR-015 inventory -> route:
  - `GET /projects/{projectId}/timeline` 已进入 authoritative inventory，可进入 controller / DTO 实现。
- Migration -> entity:
  - `N/A`，不改 DDL。
- Entity -> contract:
  - 只从既有 entity 读取事实；shared contract 输出 query view，不新增 entity 字段。
- Route -> command:
  - `ProjectController.getTimeline` 只委派 `ProjectQueryService.getProjectTimeline`。
- Query -> view:
  - query service 负责 actor 名称、阶段标签、事件排序和 source 映射；controller 不拼 view。
- Guard / permission:
  - controller 使用 `project:read`；不输出敏感金额、内部审批 payload 或权限矩阵以外字段。
- OpenAPI / generated client:
  - 本片必须运行 openapi、shared api-client generate/check，并确认 admin data-access export / poms-admin build。

## 8. 测试与校验

| Check                    | Required | Command / Evidence                                                                                | Result       | Gap / Reason                   |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------- | ------------ | ------------------------------ |
| API lint                 | Yes      | `corepack pnpm nx lint poms-api`                                                                  | Pending      | G3 执行                        |
| API build                | Yes      | `corepack pnpm nx build poms-api`                                                                 | Pending      | G3 执行                        |
| API unit tests           | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`                           | Pending      | 覆盖 timeline query/controller |
| OpenAPI generation       | Yes      | `corepack pnpm nx run poms-api:openapi`                                                           | Pending      | 新 route / DTO                 |
| Generated client         | Yes      | `corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` | Pending      | 新 generated client            |
| Admin data-access lint   | Yes      | `corepack pnpm nx lint admin-data-access`                                                         | Pending      | 若导出新类型                   |
| Admin build              | Yes      | `corepack pnpm nx build poms-admin`                                                               | Pending      | 确认 client 不破坏前端         |
| Migration / schema check | No       | N/A                                                                                               | Not required | 不改 persistence               |
| Diff hygiene             | Yes      | `git diff --check`                                                                                | Pending      | G3 执行                        |

## 9. 例外与风险

| Exception ID                            | Level | Scope                            | Approved By | Cleanup Owner      | Cleanup Due        | Notes                                                      |
| --------------------------------------- | ----- | -------------------------------- | ----------- | ------------------ | ------------------ | ---------------------------------------------------------- |
| `EX22-E1-PARTIAL-STAGE-COVERAGE`        | Low   | 不是所有生命周期阶段都有完成时间 | Codex       | Future query owner | 后续阶段事实源切片 | 当前只输出既有真实动作事实，不伪造验收 / 完成 / 归档时间。 |
| `EX22-E1-FRONTEND-CONSUMPTION-DEFERRED` | Low   | 前端不在本片消费新 query         | Codex       | `FE-22` owner      | 后续 `FE-22`       | 本片只交付后端 query / contract / client，前端接入另切。   |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-23`
- Conditions:
  1. 先更新 route inventory，再新增 contract / DTO / controller / query。
  2. 不新增 DDL，不写入任何阶段事件。
  3. 只输出真实动作事实；缺失阶段不返回事件，不输出推断完成时间。
  4. OpenAPI / generated client diff 必须作为预期变更记录在 G3。
