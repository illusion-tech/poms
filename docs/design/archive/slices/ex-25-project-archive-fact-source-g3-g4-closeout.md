# EX-25 项目归档事实源与时间线里程碑 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `api / command + persistence + query + generated client`
- Owner: `Codex`
- Date: `2026-04-24`
- Baseline: `docs/design/archive/slices/ex-25-project-archive-fact-source-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-25`
- Commit: `2fde77b feat(project): 新增项目归档事实源与时间线里程碑`

## 1. Delivered Scope

- 新增 `project_archive_record` 表、`ProjectArchiveRecord` entity 与 project repository 访问方法。
- 新增 shared contract / API DTO / generated client:
  - `CreateProjectArchiveRecordRequest`
  - `ProjectArchiveRecordSummary`
  - `ProjectArchiveRecordList`
- 新增:
  - `POST /projects/{projectId}/archive-records`
  - `GET /projects/{projectId}/archive-records`
- `ProjectTimelineView` 新增 `sourceType='project-archive-record'` 的 archive milestone 投影：
  - `eventType='milestone'`
  - `stage` 锚定 `completed` / `closed-lost` / `closed-terminated`
  - 不新增第九个主生命周期节点
- 创建归档记录时显式要求终态来源真实存在：
  - `completed` 项目必须回溯到最新有效 `ProjectCompletionRecord`
  - `closed-lost` / `closed-terminated` 项目必须依赖有效关闭事实

## 2. Out Of Scope

- 未实现前端运行时呈现；该部分转交 `FE-24`。
- 未新增菜单、路由入口、按钮或 E2E 入口链路。
- 未实现 archive record 的撤销、替代或版本链。
- 未把 `Project.closedAt`、最终结算结果、文档上传或人工备注伪装成 archive fact。
- 未把 archive 回写为 `Project.stage` 或 `Project.status`。

## 3. Validation

| Check                  | Result | Evidence                                                                                          |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Backend unit tests     | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`，36 suites / 447 tests    |
| Backend lint           | Pass   | `corepack pnpm nx lint poms-api`                                                                  |
| Backend build          | Pass   | `corepack pnpm nx build poms-api`                                                                 |
| OpenAPI                | Pass   | `corepack pnpm nx run poms-api:openapi`                                                           |
| Generated client       | Pass   | `corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` |
| Migration              | Pass   | `corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check`     |
| Admin data-access lint | Pass   | `corepack pnpm nx lint admin-data-access`                                                         |
| Admin lint             | Pass   | `corepack pnpm nx lint poms-admin`                                                                |
| Admin build            | Pass   | `corepack pnpm nx build poms-admin`，initial total `940.57 kB`                                    |
| Diff hygiene           | Pass   | `git diff --check` 无 whitespace error，仅 `project.dto.ts` 既有 CRLF normalization warning       |

## 4. Alignment

| Boundary                   | Result | Notes                                                                                                                     |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | archive 语义、route grammar、timeline milestone 规则与 `EX-25` baseline 对齐。                                            |
| ADR-015 inventory -> route | Pass   | 两条 archive route 已按 canonical inventory 收口为 `aligned`。                                                            |
| Migration -> entity        | Pass   | `project_archive_record` migration、entity、repository 与 `migration-check` 对齐。                                        |
| Entity -> contract         | Pass   | entity 字段与 shared contract / OpenAPI / generated client 对齐。                                                         |
| Route -> command           | Pass   | controller 调用 `ProjectService.createProjectArchiveRecord`；query 调用 `ProjectQueryService.listProjectArchiveRecords`。 |
| Query -> view              | Pass   | timeline 只投影最新有效 archive record，并固定为终态附属 milestone。                                                      |
| Guard / permission         | Pass   | read/write 复用现有 `project:read` / `project:write`。                                                                    |
| Frontend carryover         | Pass   | `FE-24` 将消费 milestone 事件，不再要求新增 lifecycle stage。                                                             |

## 5. Drift Classification

- `Migration comment mismatch on project_archive_record.evidence_summary`: `new-real-drift`，已在本片内修正后通过 `migration-check`。
- OpenAPI generator schema warnings: `tool-noise`；既有 generator warning，不影响 `shared-api-client:check`。
- CRLF normalization warning on `project.dto.ts`: `tool-noise`；无 whitespace error。
- Archive frontend presentation gap: accepted downstream scope，已转交 `FE-24`，不属于本片 drift。

## 6. Exceptions

| Exception ID                            | Status             | Notes                                                                   |
| --------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `EX25-E1-FE24-RUNTIME-OUT-OF-SCOPE`     | Closed by `FE-24`  | 项目详情终态 archive panel 已消费 timeline archive milestone。          |
| `EX25-E2-MILESTONE-NOT-NEW-STAGE`       | Closed             | 后端语义与 timeline 投影已冻结，后续前端只可消费 milestone。            |
| `EX25-E3-ARCHIVE-REVERSAL-OUT-OF-SCOPE` | Tracked in `EX-34` | archive record 撤销 / 替代版本链已拆入 tracker，进入编码前需另做 `G1`。 |

## 7. G4 Conclusion

- `G3 = Pass`。
- 当前代码、迁移、契约、OpenAPI、generated client 与 admin 回归验证已对齐。
- `G4 = Pass`：runtime 已提交 `2fde77b`，本切片可由后续前端 slice 直接依赖。
- 前端后续只剩 `FE-24`：在不新增第九个 lifecycle node 的前提下呈现 archive fact。
