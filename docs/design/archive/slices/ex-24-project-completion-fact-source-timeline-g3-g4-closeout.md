# EX-24 项目完成事实源与生命周期时间线投影 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `api / command + persistence + frontend verification`
- Owner: `Codex`
- Date: `2026-04-24`
- Baseline: `docs/design/archive/slices/ex-24-project-completion-fact-source-timeline-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-24`
- Commit: `810e7dc feat(project): 新增项目完成事实源与时间线投影`

## 1. Delivered Scope

- 新增 `project_completion_record` 表、`ProjectCompletionRecord` entity 与 project repository 访问方法。
- 新增 `ProjectCompletionRecordSummary`、`ProjectCompletionRecordList`、`CreateProjectCompletionRecordRequest` shared contract / API DTO / generated client。
- 新增:
  - `GET /projects/{projectId}/completion-records`
  - `POST /projects/{projectId}/completion-records`
- `ProjectTimelineView` 新增 `sourceType='project-completion-record'`，并从最新有效 `ProjectCompletionRecord.completedAt` 投影 `completed` 阶段完成事件。
- 创建完成记录时显式要求引用同项目有效验收记录，并同步将 `Project.currentStage/status` 推进到 `completed`。
- 前端运行时消费已由同一提交内的 `FE-23` 完成验证：项目详情页 completed milestone 可展示真实完成时间和 tooltip。

## 2. Out Of Scope

- 未实现项目归档事实源。
- 未新增前端页面、菜单、按钮、路由或写侧操作入口。
- 未将 `Project.currentStage/status`、`AcceptanceRecord.confirmedAt`、最终结算快照、待办完成时间或人工备注伪装成项目归档事实。
- 未自动推进提成结算、归档或关闭流程。

## 3. Validation

| Check                  | Result | Evidence                                                                                                                                                          |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend unit tests     | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`，36 suites / 438 tests                                                                    |
| Backend lint           | Pass   | `corepack pnpm nx lint poms-api`                                                                                                                                  |
| Backend build          | Pass   | `corepack pnpm nx build poms-api`                                                                                                                                 |
| OpenAPI                | Pass   | `corepack pnpm nx run poms-api:openapi`                                                                                                                           |
| Generated client       | Pass   | `corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check`                                                                 |
| Migration              | Pass   | `corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check`                                                                     |
| Admin data-access lint | Pass   | `corepack pnpm nx lint admin-data-access`                                                                                                                         |
| Admin lint             | Pass   | `corepack pnpm nx lint poms-admin`                                                                                                                                |
| Admin build            | Pass   | `corepack pnpm nx build poms-admin`，initial total `938.24 kB`                                                                                                    |
| Focused frontend tests | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`、`corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-store` |
| Diff hygiene           | Pass   | `git diff --check` 仅 CRLF normalization warning，无 whitespace error                                                                                             |

## 4. Alignment

| Boundary                   | Result | Notes                                                                                                                           |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | `ProjectCompletionRecord` 来自正式生命周期设计、命令设计与表结构冻结文档。                                                      |
| ADR-015 inventory -> route | Pass   | 两条 completion route 已在 canonical inventory 标为 `aligned`。                                                                 |
| Migration -> entity        | Pass   | migration、entity、repository 与 `migration-check` 对齐。                                                                       |
| Entity -> contract         | Pass   | entity 字段与 shared contract / OpenAPI summary 对齐。                                                                          |
| Route -> command           | Pass   | controller 调用 `ProjectService.createProjectCompletionRecord`，query 调用 `ProjectQueryService.listProjectCompletionRecords`。 |
| Query -> view              | Pass   | timeline 只消费最新有效 `ProjectCompletionRecord.completedAt`。                                                                 |
| Guard / permission         | Pass   | read/write 复用现有 `project:read` / `project:write`。                                                                          |
| OpenAPI / generated client | Pass   | `shared-api-client:check` pass。                                                                                                |

## 5. Drift Classification

- `FE22-E1-PARTIAL-STAGE-COVERAGE`: further reduced. `completed` 阶段已有权威事实源并已由 `FE-23` 完成前端验证；仅 archive milestone 仍保留缺口。
- `EX24-E2-FRONTEND-RUNTIME-OUT-OF-SCOPE`: resolved by `FE-23` in the same commit chain.
- OpenAPI generator schema warning: `tool-noise`;生成器对 zod metadata 的既有 warning，不影响 `shared-api-client:check`。
- CRLF normalization warning: `tool-noise`;无 whitespace error。

## 6. Exceptions

| Exception ID                            | Status   | Notes                                                                       |
| --------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `EX24-E1-ARCHIVE-SOURCE-OUT-OF-SCOPE`   | Accepted | 本片只实现 completed 事实源；项目归档事实与阶段语义另开 `EX-25`。           |
| `EX24-E2-FRONTEND-RUNTIME-OUT-OF-SCOPE` | Closed   | completed milestone 前端运行时验证已由 `FE-23` 在 commit `810e7dc` 中关闭。 |

## 7. G4 Conclusion

- `G3 = Pass`。
- 当前代码、迁移、契约、OpenAPI、generated client 与前端消费验证已对齐。
- `G4 = Pass`：实现已提交 `810e7dc`，tracker 可关闭为 `Done`，切片生命周期产物已归档。
- 项目归档事实与时间线语义仍保留为后续 `EX-25`，不属于本片交付边界。
