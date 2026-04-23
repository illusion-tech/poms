# EX-23 项目验收事实源与生命周期时间线投影实施基线包

- Gate Status: `Pass`
- Parent: Phase 2 frontend workspace / project lifecycle experience
- Owner: `Codex`
- Slice Type: `api / command + persistence + frontend verification`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-23`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-23`

## 1. 范围

- 本次目标:
  - 新增 `AcceptanceRecord` 最小事实源，作为项目验收完成时间的权威来源。
  - 新增项目子集合路由：`POST /projects/{projectId}/acceptance-records`、`GET /projects/{projectId}/acceptance-records`。
  - 将最新有效验收记录投影到既有 `ProjectTimelineView.events`，供项目详情生命周期组件展示真实验收完成时间。
  - 补充前端单测，证明 `acceptance-record` timeline event 可被现有 `ProjectDetail` 生命周期映射消费。
- 本次明确不做:
  - 不实现项目 `completed` 业务完成结论。
  - 不实现项目归档事实。
  - 不把 `TodoItem.completedAt`、`ConfirmationRecord.confirmedAt` 或提成 / 最终结算快照伪装成项目验收、完成或归档事实。
  - 不新增前端页面、菜单或按钮入口。
- 下游可依赖的交付边界:
  - 后续前端可继续通过 `ProjectTimelineView` 消费 `stage='acceptance'`、`eventType='stage-completed'`、`sourceType='acceptance-record'` 的真实验收事件。
- 不允许下游依赖的留白:
  - `completed` 和归档时间仍没有权威事实源。

## 2. 正式输入

| Input Type                | Document / Source                                   | Section / Anchor             | Status               | Notes                                                                |
| ------------------------- | --------------------------------------------------- | ---------------------------- | -------------------- | -------------------------------------------------------------------- |
| Business design           | `project-lifecycle-design.md`                       | 阶段定义 / acceptance        | frozen               | `AcceptanceRecord` 是验收阶段主要输出。                              |
| Command design            | `interface-command-design.md`                       | `confirmAcceptance`          | frozen for semantics | 本片采用项目子集合 create 表达最小确认落库。                         |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                   | 验收引用 / 第二阶段前置      | partial              | 本片只落最小 `CreateAcceptanceRecordRequest` 与 summary。            |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                  | project / acceptance records | aligned              | 本片已新增并实现两条 route。                                         |
| Query boundary            | `query-view-boundary-design.md`、`EX-22`            | `ProjectTimelineView`        | aligned              | 继续复用既有 timeline query。                                        |
| Data model / table freeze | `table-structure-freeze-design.md`                  | `acceptance_record`          | frozen minimum       | `project_id`、`acceptance_type`、`status`、`confirmed_at` 必须落库。 |
| Schema / DDL              | `Migration20260423130000_ex23_acceptance_record.ts` | `acceptance_record`          | frozen               | 不额外加入 ORM metadata 未声明的 DB check。                          |
| ADR                       | `ADR-015`                                           | nested project subcollection | aligned              | project-scoped collection create/list。                              |

## 3. 本次 SSOT

| Concern                     | SSOT                               | Implementation Rule                                          |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Business semantics          | `project-lifecycle-design.md`      | 验收完成必须来自 `AcceptanceRecord`。                        |
| Public route canonical path | `api-route-canonical-inventory.md` | 使用 `/projects/{projectId}/acceptance-records`。            |
| Route / command naming      | `ProjectController`                | `createAcceptanceRecord`、`listAcceptanceRecords`。          |
| DTO / contract naming       | `shared-contracts.ts`              | `AcceptanceRecordSummary`、`CreateAcceptanceRecordRequest`。 |
| Table / column naming       | `table-structure-freeze-design.md` | `acceptance_record` snake_case 字段。                        |
| Date / time semantics       | `AcceptanceRecord.confirmedAt`     | `datetime`，表示验收确认时间。                               |
| Identifier semantics        | `AcceptanceRecord.id`              | 系统内 UUID；timeline `sourceId` 指向该记录。                |
| Money / decimal semantics   | N/A                                | 本片不涉及金额。                                             |
| Status machine              | `AcceptanceRecord.status`          | 当前只创建 `confirmed`，后续 void/replace 另开切片。         |

## 4. 命令与接口边界

| Route / Controller                              | Command / Service                           | Request DTO / Contract          | Response DTO / Contract     | Guard / Permission | Design Source                                                       | Result                         |
| ----------------------------------------------- | ------------------------------------------- | ------------------------------- | --------------------------- | ------------------ | ------------------------------------------------------------------- | ------------------------------ |
| `POST /projects/{projectId}/acceptance-records` | `ProjectService.createAcceptanceRecord`     | `CreateAcceptanceRecordRequest` | `AcceptanceRecordSummary`   | `project:write`    | `interface-command-design.md`、`api-route-canonical-inventory.md`   | aligned                        |
| `GET /projects/{projectId}/acceptance-records`  | `ProjectQueryService.listAcceptanceRecords` | N/A                             | `AcceptanceRecordSummary[]` | `project:read`     | `query-view-boundary-design.md`、`api-route-canonical-inventory.md` | aligned                        |
| `GET /projects/{projectId}/timeline`            | `ProjectQueryService.getProjectTimeline`    | N/A                             | `ProjectTimelineView`       | `project:read`     | `EX-22`                                                             | extended with acceptance event |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `POST /projects/{projectId}/acceptance-records`
  - `GET /projects/{projectId}/acceptance-records`
- Current implemented route(s): same as canonical.
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-23`
- Blocker / exception: none for this slice.

## 5. 读侧边界

| Query / View           | Consumer                             | Fields                                                                                | Filter / Sort                                | Permission Boundary | Design Source                          | Result  |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------- | -------------------------------------- | ------- |
| `ProjectTimelineView`  | `ProjectDetail` / lifecycle timeline | `stage='acceptance'`、`eventType='stage-completed'`、`sourceType='acceptance-record'` | latest accepted/conditional confirmed record | `project:read`      | `EX-22`、`project-lifecycle-design.md` | aligned |
| `AcceptanceRecordList` | future read pages                    | acceptance summary fields                                                             | newest first                                 | `project:read`      | `table-structure-freeze-design.md`     | aligned |

## 6. 持久化边界

| Table               | Migration                                           | Entity / Repository                      | DDL / Freeze Source                | Check Result           |
| ------------------- | --------------------------------------------------- | ---------------------------------------- | ---------------------------------- | ---------------------- |
| `acceptance_record` | `Migration20260423130000_ex23_acceptance_record.ts` | `AcceptanceRecord` / `ProjectRepository` | `table-structure-freeze-design.md` | `migration-check` pass |

| Field               | Design Type / Meaning | Migration / DDL                 | Entity             | Shared Contract / OpenAPI | Result  |
| ------------------- | --------------------- | ------------------------------- | ------------------ | ------------------------- | ------- |
| `project_id`        | Project owner         | uuid FK                         | `projectId`        | `projectId`               | aligned |
| `acceptance_type`   | 阶段 / 最终验收类型   | varchar(64)                     | `acceptanceType`   | enum                      | aligned |
| `acceptance_result` | 验收结论              | varchar(32)                     | `acceptanceResult` | enum                      | aligned |
| `status`            | 记录状态              | varchar(32) default `confirmed` | `status`           | enum                      | aligned |
| `confirmed_at`      | 验收确认时间          | timestamptz                     | `confirmedAt`      | datetime                  | aligned |
| `confirmed_by`      | 确认人                | uuid nullable                   | `confirmedBy`      | uuid nullable             | aligned |

## 7. 一致性结论

- Document -> code: aligned.
- ADR-015 inventory -> route: aligned.
- Migration -> entity: aligned; `migration-check` pass.
- Entity -> contract: aligned.
- Route -> command: aligned.
- Query -> view: aligned.
- Guard / permission: aligned with existing `project:read` / `project:write`.
- OpenAPI / generated client: aligned after generation and check.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                            | Result       | Gap / Reason                                        |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------- |
| Lint                             | yes      | `nx lint poms-api`、`nx lint admin-data-access`、`nx lint poms-admin`                                                         | pass         | none                                                |
| Build                            | yes      | `nx build poms-api`、`nx build poms-admin`                                                                                    | pass         | admin initial total `934.58 kB`                     |
| Unit tests                       | yes      | `nx test poms-api --runInBand --testPathPatterns=project`、`nx test poms-admin --runInBand --testPathPatterns=project-detail` | pass         | none                                                |
| API / integration tests          | no       | N/A                                                                                                                           | not required | route/controller/service unit coverage added        |
| E2E                              | no       | N/A                                                                                                                           | not required | no menu, route guard, or browser navigation change  |
| OpenAPI generation / client diff | yes      | `nx run shared-api-client:generate`、`nx run shared-api-client:check`                                                         | pass         | generator metadata warnings are existing tool noise |
| Migration / schema check         | yes      | `nx run poms-api:migration-up`、`nx run poms-api:migration-check`                                                             | pass         | local DB was advanced to latest migration           |

## 9. 例外与风险

| Exception ID                       | Level | Scope                                  | Approved By | Cleanup Owner | Cleanup Due | Notes                                                        |
| ---------------------------------- | ----- | -------------------------------------- | ----------- | ------------- | ----------- | ------------------------------------------------------------ |
| `EX23-E1-COMPLETED-ARCHIVE-SOURCE` | low   | `completed` / archive milestone events | Codex       | TBD           | TBD         | 本片只关闭 acceptance 完成时间；完成结论和归档事实另开切片。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-23`
- Conditions: 本片只允许使用 `AcceptanceRecord.confirmedAt` 表示验收完成时间，不允许从当前阶段、待办完成、通用确认或提成结算快照推断项目完成事实。
