# EX-23 项目验收事实源与生命周期时间线投影 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `api / command + persistence + frontend verification`
- Owner: `Codex`
- Date: `2026-04-23`
- Baseline: `docs/design/archive/slices/ex-23-acceptance-record-timeline-fact-source-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-23`
- Commit: `791e490 feat(project): 新增项目验收事实源与时间线投影`

## 1. Delivered Scope

- 新增 `acceptance_record` 表、`AcceptanceRecord` entity 与 project repository 访问方法。
- 新增 `AcceptanceRecordSummary`、`AcceptanceRecordList`、`CreateAcceptanceRecordRequest` shared contract / API DTO / generated client。
- 新增:
  - `GET /projects/{projectId}/acceptance-records`
  - `POST /projects/{projectId}/acceptance-records`
- `ProjectTimelineView` 新增 `sourceType='acceptance-record'`，并从最新有效 `AcceptanceRecord.confirmedAt` 投影 `acceptance` 阶段完成事件。
- 前端不改运行时 UI，只补 `ProjectDetail` 单测验证 `acceptance-record` event 可映射成完成时间和 tooltip。

## 2. Out Of Scope

- 未实现项目 `completed` 业务完成事实源。
- 未实现项目归档事实源。
- 未新增前端页面、菜单、按钮、路由或权限行为。
- 未将 `TodoItem.completedAt`、`ConfirmationRecord.confirmedAt`、最终结算快照或 `Project.currentStage` 用作项目验收 / 完成事实。

## 3. Validation

| Check                  | Result | Evidence                                                                                                                                                                                                           |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend unit tests     | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`，36 suites / 430 tests                                                                                                                     |
| Backend lint           | Pass   | `corepack pnpm nx lint poms-api`                                                                                                                                                                                   |
| Backend build          | Pass   | `corepack pnpm nx build poms-api`                                                                                                                                                                                  |
| OpenAPI                | Pass   | `corepack pnpm nx run poms-api:openapi`                                                                                                                                                                            |
| Generated client       | Pass   | `corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check`                                                                                                                  |
| Migration              | Pass   | `corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check`                                                                                                                      |
| Admin data-access lint | Pass   | `corepack pnpm nx lint admin-data-access`                                                                                                                                                                          |
| Admin lint             | Pass   | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                 |
| Admin build            | Pass   | `corepack pnpm nx build poms-admin`，initial total `934.58 kB`                                                                                                                                                     |
| Focused frontend test  | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`，1 suite / 6 tests                                                                                                                |
| Diff hygiene           | Pass   | `git -c core.pager=cat diff --check --no-ext-diff --no-textconv -- . ':!libs/shared/api-spec/openapi.json' ':!libs/shared/api-client'` 仅 CRLF normalization warning；generated files 分段 `git diff --check` pass |

## 4. Alignment

| Boundary                   | Result | Notes                                                                                                             |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | `AcceptanceRecord` 来自正式生命周期设计与表结构冻结文档。                                                         |
| ADR-015 inventory -> route | Pass   | 两条 acceptance route 已在 canonical inventory 标为 `aligned`。                                                   |
| Migration -> entity        | Pass   | 去掉 metadata 未声明的 check constraint 后，`migration-check` pass。                                              |
| Entity -> contract         | Pass   | entity 字段与 shared contract / OpenAPI summary 对齐。                                                            |
| Route -> command           | Pass   | controller 调用 `ProjectService.createAcceptanceRecord`，query 调用 `ProjectQueryService.listAcceptanceRecords`。 |
| Query -> view              | Pass   | timeline 只消费 `AcceptanceRecord.confirmedAt`。                                                                  |
| Guard / permission         | Pass   | read/write 复用现有 `project:read` / `project:write`。                                                            |
| OpenAPI / generated client | Pass   | `shared-api-client:check` pass。                                                                                  |

## 5. Drift Classification

- `FE22-E1-PARTIAL-STAGE-COVERAGE`: partially reduced. `acceptance` 阶段已有权威事实源；`completed` / 归档仍保留缺口。
- `EX23-MIGRATION-CHECK-DRIFT`: resolved. 初始 migration 额外加入 ORM metadata 未声明的 check constraint，并漏掉 `id` 列注释；已按 ORM diff 修正并通过 `migration-check`。
- OpenAPI generator schema warning: `tool-noise`;生成器对 zod metadata 的既有 warning，不影响 `shared-api-client:check`。
- CRLF normalization warning: `tool-noise`;无 whitespace error。

## 6. Exceptions

| Exception ID                       | Status   | Notes                                                  |
| ---------------------------------- | -------- | ------------------------------------------------------ |
| `EX23-E1-COMPLETED-ARCHIVE-SOURCE` | Accepted | 本片只实现验收事实源；项目完成结论和归档事实另开切片。 |

## 7. G4 Conclusion

- `G3 = Pass`。
- 当前代码、契约、OpenAPI、generated client、迁移与前端验证已对齐。
- `G4 = Pass`：实现已提交 `791e490`，tracker 已关闭为 `Done`，切片生命周期产物已归档。
- `completed` 与归档事实源仍保留为后续切片，不属于本片交付边界。
