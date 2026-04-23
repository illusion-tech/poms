# EX-25 项目归档事实源与时间线语义冻结实施基线包

- Gate Status: `Pass`
- Parent: Phase 2 project lifecycle milestone continuation
- Owner: `Codex`
- Slice Type: `api / command + persistence + query semantics freeze`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-25`

## 1. 范围

- 本次目标:
  1. 冻结“项目归档”不是新的主生命周期阶段，而是挂在终态上的附属 milestone。
  2. 冻结最小归档事实源 `ProjectArchiveRecord` 的命名、路由、DTO、持久化和时间线投影边界。
  3. 明确 `Project.closedAt`、人工备注、文档上传、最终结算结果都不能直接等价为归档事实。
  4. 为后续 `FE-24` 提供稳定前端输入，避免把 archive 硬塞进第九个生命周期节点。
- 本次明确不做:
  1. 不进入 runtime 实现，不新增 migration、entity、controller 或 generated client 改动。
  2. 不改前端页面，不新增时间线节点或 tooltip 呈现。
  3. 不把 `completed` 节点文案重新写回“归档”。
  4. 不把 `closed-lost` / `closed-terminated` 的关闭事实替换为归档事实。
- 下游可依赖的交付边界:
  1. `archive` 语义已冻结为 terminal-state attached milestone，而不是 `Project.stage`。
  2. 如进入 `ProjectTimelineView`，应使用既有 `eventType='milestone'`，并锚定到 `completed` / `closed-lost` / `closed-terminated` 之一。
  3. 若进入实现，公开 route 默认采用项目子集合：
     - `POST /projects/{projectId}/archive-records`
     - `GET /projects/{projectId}/archive-records`
- 不允许下游依赖的留白:
  1. 本片不代表 archive runtime 已实现。
  2. 本片不声明 archive 必须占据主生命周期时间线的独立节点。

## 2. 正式输入

| Input Type                | Document / Source                                                                                    | Section / Anchor                          | Status       | Notes                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------ | ------------------------------------------------------------ |
| Business design           | `docs/design/project-lifecycle-design.md`                                                            | `§5.1`、`§6`、`§10`                       | Active       | 主阶段链只有 `completed`，没有 `archive`。                   |
| Existing timeline design  | `docs/design/archive/slices/ex-22-project-timeline-view-baseline.md`                                 | `ProjectTimelineView` / partial coverage  | Done         | `ProjectTimelineEvent` 已允许 `eventType='milestone'`。      |
| Existing gap carryover    | `docs/design/archive/slices/ex-24-project-completion-fact-source-timeline-g3-g4-closeout.md`         | `EX24-E1` / G4 conclusion                 | Done         | completed 已关闭，archive 仍是明确缺口。                     |
| Frontend carryover        | `docs/design/archive/slices/fe-23-project-lifecycle-completion-milestone-frontend-g3-g4-closeout.md` | `FE22-E1` carryover                       | Done         | 前端已明确 archive 不应混入 `completed` 节点。               |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                       | project route rows                        | Planned here | 本片补 planned row，未实现前不得进入 G2。                    |
| Existing runtime fact     | `apps/poms-api/src/app/features/project/project.entity.ts`                                           | `closedAt / closeReason`                  | Fact         | `closedAt` 仅是关闭事实，不是 archive 事实。                 |
| Existing query behavior   | `apps/poms-api/src/app/features/project/project-query.service.ts`                                    | `getProjectTimeline` / workspace guidance | Fact         | 当前文案提到“归档事实”，但尚无独立事实源，不得反向定义语义。 |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                                        | project subcollection                     | Accepted     | 继续采用项目子集合 route grammar。                           |

## 3. 本次 SSOT

| Concern                     | SSOT                                            | Implementation Rule                                                                              |
| --------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Business semantics          | `project-lifecycle-design.md`                   | `archive` 是终态附属里程碑，不是主阶段。                                                         |
| Public route canonical path | `api-route-canonical-inventory.md` planned rows | 如实现，使用 `/projects/{projectId}/archive-records`。                                           |
| Route / command naming      | 本基线包                                        | `createProjectArchiveRecord`、`listProjectArchiveRecords`。                                      |
| DTO / contract naming       | 本基线包                                        | `CreateProjectArchiveRecordRequest`、`ProjectArchiveRecordSummary`、`ProjectArchiveRecordList`。 |
| Table / column naming       | 本基线包                                        | `project_archive_record`，保留 `archive_anchor_*` 字段表达锚定终态。                             |
| Date / time semantics       | `ProjectArchiveRecord.archivedAt`               | `datetime`，表示完成归档动作的业务发生时间。                                                     |
| Identifier semantics        | `ProjectArchiveRecord.id`                       | 系统内 UUID；timeline `sourceId` 指向 archive record。                                           |
| Source traceability         | `archiveAnchorStage/sourceType/sourceId`        | 归档必须回到同一终态事实链，不得脱离完成/关闭事实独立存在。                                      |
| Money / decimal semantics   | N/A                                             | 本片不涉及金额。                                                                                 |
| Status machine              | `ProjectArchiveRecord.status`                   | 第一版仅允许 `recorded`，撤销 / 替代另开切片。                                                   |

## 4. 命令与接口边界

| Route / Controller                           | Command / Service                               | Request DTO / Contract              | Response DTO / Contract       | Guard / Permission | Design Source     | Result  |
| -------------------------------------------- | ----------------------------------------------- | ----------------------------------- | ----------------------------- | ------------------ | ----------------- | ------- |
| `POST /projects/{projectId}/archive-records` | `ProjectService.createProjectArchiveRecord`     | `CreateProjectArchiveRecordRequest` | `ProjectArchiveRecordSummary` | `project:write`    | `EX-25`           | planned |
| `GET /projects/{projectId}/archive-records`  | `ProjectQueryService.listProjectArchiveRecords` | N/A                                 | `ProjectArchiveRecordList`    | `project:read`     | `EX-25`           | planned |
| `GET /projects/{projectId}/timeline`         | `ProjectQueryService.getProjectTimeline`        | N/A                                 | `ProjectTimelineView`         | `project:read`     | `EX-22` + `EX-25` | extend  |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `POST /projects/{projectId}/archive-records`
  - `GET /projects/{projectId}/archive-records`
- Current implemented route(s): `N/A`
- Target implemented route(s): same as canonical
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-25`
- Blocker / exception: 在 `ProjectArchiveRecord` 语义冻结前不得借用 `PATCH /projects/{id}` 或 `Project.closedAt` 伪装归档动作。

## 5. 读侧边界

| Query / View               | Consumer                            | Fields                                                                                                                   | Filter / Sort                  | Permission Boundary | Design Source     | Result  |
| -------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------------- | ----------------- | ------- |
| `ProjectTimelineView`      | `FE-24` future archive presentation | `stage in (completed, closed-lost, closed-terminated)` + `eventType='milestone'` + `sourceType='project-archive-record'` | latest recorded archive record | `project:read`      | `EX-22` + `EX-25` | planned |
| `ProjectArchiveRecordList` | future detail / audit read surfaces | archive summary fields + anchor fields                                                                                   | newest first                   | `project:read`      | `EX-25`           | planned |

Timeline projection rules:

- `archive` 不新增生命周期 stage。
- 归档 timeline 事件必须使用 `eventType='milestone'`，不能复用 `stage-completed`。
- `stage` 必须锚定到项目归档时对应的终态：
  - `completed`
  - `closed-lost`
  - `closed-terminated`
- `occurredAt` 来自 `ProjectArchiveRecord.archivedAt`。
- `sourceType` 规划为 `project-archive-record`。
- 若不存在 archive record，timeline 不得从 `closedAt`、最终结算完成、文档上传或人工备注推断归档 milestone。

## 6. 持久化边界

| Table                    | Migration | Entity / Repository                          | DDL / Freeze Source | Check Result |
| ------------------------ | --------- | -------------------------------------------- | ------------------- | ------------ |
| `project_archive_record` | TBD       | `ProjectArchiveRecord` / `ProjectRepository` | frozen here         | planned      |

| Field                        | Design Type / Meaning      | Migration / DDL | Entity                    | Shared Contract / OpenAPI | Result  |
| ---------------------------- | -------------------------- | --------------- | ------------------------- | ------------------------- | ------- |
| `project_id`                 | archived project owner     | uuid FK         | `projectId`               | `projectId`               | planned |
| `archive_anchor_stage`       | terminal stage anchor      | varchar(32)     | `archiveAnchorStage`      | enum                      | planned |
| `archive_anchor_source_type` | anchor fact source type    | varchar(32)     | `archiveAnchorSourceType` | enum                      | planned |
| `archive_anchor_source_id`   | anchor fact source id      | uuid            | `archiveAnchorSourceId`   | uuid                      | planned |
| `status`                     | archive record state       | varchar(32)     | `status`                  | enum                      | planned |
| `archived_at`                | archive action datetime    | timestamptz     | `archivedAt`              | datetime                  | planned |
| `archived_by`                | archive operator           | uuid nullable   | `archivedBy`              | uuid nullable             | planned |
| `archive_summary`            | archive conclusion summary | text            | `archiveSummary`          | string                    | planned |
| `evidence_summary`           | archive evidence summary   | text            | `evidenceSummary`         | string                    | planned |

First-version anchor rules:

- 当项目处于 `completed` 时，anchor source 必须回到同项目有效 `ProjectCompletionRecord`。
- 当项目处于 `closed-lost` / `closed-terminated` 时，anchor source 固定为 `project` 自身关闭事实。
- `Project.closedAt` 可作为关闭事实的 source datetime，但不是 archive record 的 datetime。

## 7. 一致性结论

- Document -> code:
  - pending implementation；本片先冻结 archive 语义。
- ADR-015 inventory -> route:
  - `planned` and frozen.
- Migration -> entity:
  - pending implementation.
- Entity -> contract:
  - pending implementation.
- Route -> command:
  - planned and frozen.
- Query -> view:
  - archive milestone 走 `eventType='milestone'`，不新增 stage。
- Guard / permission:
  - 延续 `project:read` / `project:write`。
- OpenAPI / generated client:
  - pending implementation.

## 8. 测试与校验

| Check                            | Required    | Command / Evidence                                                           | Result           | Gap / Reason                      |
| -------------------------------- | ----------- | ---------------------------------------------------------------------------- | ---------------- | --------------------------------- |
| Diff whitespace                  | Yes         | `git diff --check`                                                           | Pending          | baseline writeback                |
| API lint                         | Yes         | `corepack pnpm nx lint poms-api`                                             | Pending          | implementation not started        |
| API build                        | Yes         | `corepack pnpm nx build poms-api`                                            | Pending          | implementation not started        |
| API unit tests                   | Yes         | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`      | Pending          | implementation not started        |
| OpenAPI generation / client diff | Yes         | `corepack pnpm nx run poms-api:openapi` + `shared-api-client:generate/check` | Pending          | implementation not started        |
| Migration / schema check         | Yes         | `corepack pnpm nx run poms-api:migration-up` + `migration-check`             | Pending          | implementation not started        |
| Frontend unit / build            | Conditional | `FE-24` slice executes                                                       | Not required now | 当前只做语义冻结，不改 FE runtime |

## 9. 例外与风险

| Exception ID                      | Level | Scope                         | Approved By | Cleanup Owner | Cleanup Due | Notes                                                            |
| --------------------------------- | ----- | ----------------------------- | ----------- | ------------- | ----------- | ---------------------------------------------------------------- |
| `EX25-E1-CLOSEDAT-NOT-ARCHIVE`    | Low   | 关闭事实与归档事实必须分离    | Codex       | `EX-25`       | `EX-25 G4`  | `Project.closedAt` 只能继续表达关闭，不可直接充当 archive fact。 |
| `EX25-E2-MILESTONE-NOT-NEW-STAGE` | Low   | timeline projection semantics | Codex       | `FE-24`       | `FE-24 G1`  | 前端不得把 archive 强行做成第九个 lifecycle node。               |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-24`
- Conditions:
  1. archive 语义冻结为 terminal-state attached milestone。
  2. 若进入实现，必须同时消费本基线和已补录的 route inventory planned row。
  3. 任何 archive timeline 投影都必须走 `eventType='milestone'`，不得把 archive 写回 `stage`。
  4. `Project.closedAt`、人工备注、最终结算结果、文档上传都不得直接冒充 archive fact。
