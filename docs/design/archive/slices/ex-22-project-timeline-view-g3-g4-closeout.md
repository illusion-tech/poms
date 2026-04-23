# EX-22 项目生命周期阶段里程碑事实源查询 G3/G4 Close-out

- Gate Status: `Pass`
- Closed At: `2026-04-23`
- Owner: `Codex`
- Slice Type: `api / query`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-22`
- Baseline: `docs/design/ex-22-project-timeline-view-baseline.md`

## 1. Delivered Scope

- 新增 `GET /projects/{projectId}/timeline`。
- 新增 `ProjectTimelineView` / `ProjectTimelineEvent` shared contract、API DTO、OpenAPI schema 和 generated client。
- `ProjectQueryService.getProjectTimeline` 按真实动作事实输出：
  - 项目创建: `Project.createdAt / createdBy`
  - 合同签约: 最早有 `signedAt` 的 `Contract`
  - 项目移交: 最新 confirmed `ProjectHandover.confirmedAt / confirmedBy`
  - 项目关闭: `Project.closedAt / updatedBy / closedReason`
- `admin-data-access` 已导出 generated `ProjectTimelineView` / `ProjectTimelineEvent` 类型。

## 2. Out Of Scope

- 不新增 DDL、migration、审计写侧或阶段事件表。
- 不伪造验收、正式执行完成、项目归档等当前没有独立事实源的完成时间。
- 不修改项目详情页或 `ProjectLifecycleTimeline` 消费逻辑；前端展示归属后续 `FE-22`。

## 3. Validation

| Check                    | Result       | Evidence                                                                                                                   |
| ------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| API unit tests           | Pass         | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`，36 suites / 424 tests                             |
| API lint                 | Pass         | `corepack pnpm nx lint poms-api`                                                                                           |
| API build                | Pass         | `corepack pnpm nx build poms-api`，含 `shared-contracts:build`                                                             |
| OpenAPI generation       | Pass         | `corepack pnpm nx run poms-api:openapi`                                                                                    |
| Generated client         | Pass         | `corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check`                          |
| Admin data-access lint   | Pass         | `corepack pnpm nx lint admin-data-access`                                                                                  |
| Admin lint               | Pass         | `corepack pnpm nx lint poms-admin`                                                                                         |
| Admin build              | Pass         | `corepack pnpm nx build poms-admin`，initial total `931.63 kB`，无新 bundle warning                                        |
| Diff hygiene             | Pass         | `git diff --check`，仅 `libs/api/contracts/src/lib/project/project.dto.ts` CRLF normalization warning，无 whitespace error |
| Migration / schema check | Not required | 本片不改 DDL / entity schema，仅新增 repository read path                                                                  |

## 4. Alignment

| Boundary                   | Result | Notes                                                                                   |
| -------------------------- | ------ | --------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | 与 `ProjectTimelineView` query boundary 一致，只输出动作事实。                          |
| ADR-015 inventory -> route | Pass   | `GET /projects/{projectId}/timeline` 已进入 authoritative inventory。                   |
| Route -> query             | Pass   | controller 只委派 `ProjectQueryService.getProjectTimeline`。                            |
| Entity -> contract         | Pass   | contract 不新增 entity 字段，view 从既有 entity 事实派生。                              |
| Query -> view              | Pass   | service 负责 actor、阶段标签、source 映射和 chronological sort。                        |
| Guard / permission         | Pass   | route 使用 `project:read`，不输出敏感金额或内部审批 payload。                           |
| OpenAPI / generated client | Pass   | 新 route、schema、`ProjectApi.projectControllerGetTimeline` 和 generated model 已同步。 |

## 5. Drift Classification

- OpenAPI / generated client diff: expected slice output.
- OpenAPI generator schema `id` warnings: `tool-noise`，仓内既有 Zod OpenAPI metadata warning 模式，本轮新增 schema 进入同类 warning，generation/check 均通过。
- CRLF normalization warning: `tool-noise`，`git diff --check` 无 whitespace error。
- Persistence drift: none; no DDL or entity schema change.

## 6. Exceptions

| Exception ID                            | Status   | Notes                                                                |
| --------------------------------------- | -------- | -------------------------------------------------------------------- |
| `EX22-E1-PARTIAL-STAGE-COVERAGE`        | Accepted | 当前只输出既有真实动作事实；验收 / 完成 / 归档时间需后续事实源切片。 |
| `EX22-E1-FRONTEND-CONSUMPTION-DEFERRED` | Accepted | 后端事实源完成；项目生命周期 UI 接入归属后续 `FE-22`。               |

## 7. G4 Decision

- `EX-22` delivered boundary matches the G1 baseline.
- `G4 = Pass` for backend fact source and generated client readiness.
- `FE21-E1-COMPLETION-TIME-SOURCE` 的后端 query / DTO 缺口已关闭；前端仍需 `FE-22` 接入 `ProjectLifecycleTimeline`，不能宣称真实完成时间已展示。
