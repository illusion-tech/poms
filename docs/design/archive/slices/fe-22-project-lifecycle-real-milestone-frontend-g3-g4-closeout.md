# FE-22 项目生命周期真实里程碑前端接入 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `frontend-only`
- Owner: `Codex`
- Date: `2026-04-23`
- Baseline: `docs/design/fe-22-project-lifecycle-real-milestone-frontend-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `FE-22`

## 1. Delivered Scope

- `ProjectStore` 新增 timeline state:
  - `selectedProjectTimeline`
  - `loadingTimeline`
  - `timelineError`
  - `loadProjectTimeline(projectId)`
- 项目详情页进入时并行读取:
  - `ProjectDetailView`
  - `ProjectTimelineView`
- `ProjectDetail.lifecycleItems(project, timeline)` 将 authoritative events 映射到生命周期节点:
  - `stage-completed` -> `completedAtLabel` + tooltip
  - `stage-entered` -> `detail` + tooltip
- timeline 读取失败时显示 `WorkspaceFeedback`，但不阻断项目详情主体和阶段线。

## 2. Out Of Scope

- 未修改 API、OpenAPI、generated client、DTO、权限 guard 或路由。
- 未修改 `ProjectLifecycleTimeline` 视觉结构、响应式策略或 PrimeNG 组件基线。
- 未伪造 `ProjectTimelineView` 未返回的验收、完成或归档时间。
- 未新增 E2E；本片不改变入口链、权限或路由行为。

## 3. Validation

| Check                      | Result       | Evidence                                                                                                                         |
| -------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Admin data-access lint     | Pass         | `corepack pnpm nx lint admin-data-access`                                                                                        |
| Admin lint                 | Pass         | `corepack pnpm nx lint poms-admin`                                                                                               |
| Admin build                | Pass         | `corepack pnpm nx build poms-admin`，initial total `932.28 kB`，无新 bundle warning                                              |
| Admin unit tests           | Pass         | `corepack pnpm nx test poms-admin --runInBand`，13 suites / 45 tests                                                             |
| Focused project tests      | Pass         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project`，13 suites / 45 tests                                  |
| Diff hygiene               | Pass         | `git diff --check`，仅 `libs/admin/data-access/src/lib/project/project.store.ts` CRLF normalization warning，无 whitespace error |
| E2E                        | Not required | 不改入口链、权限、菜单或路由行为                                                                                                 |
| OpenAPI / generated client | Not required | 沿用 `EX-22` 已生成结果                                                                                                          |

## 4. Alignment

| Boundary                   | Result | Notes                                                                         |
| -------------------------- | ------ | ----------------------------------------------------------------------------- |
| Document -> code           | Pass   | 实现范围与 FE-22 G1 baseline 一致。                                           |
| Route -> store             | Pass   | Store 只调用 generated `ProjectApi.projectControllerGetTimeline`。            |
| Query -> view              | Pass   | 页面只投影 authoritative timeline events，不推断缺失阶段。                    |
| Guard / permission         | Pass   | 前端未新增权限判断；后端 `project:read` 继续负责读取边界。                    |
| UI component baseline      | Pass   | 复用 `ProjectLifecycleTimeline` 已有 `completedAtLabel/detail/tooltip` 能力。 |
| OpenAPI / generated client | Pass   | 本片未改 contract，沿用 `EX-22` generated client。                            |

## 5. Drift Classification

- `FE21-E1-COMPLETION-TIME-SOURCE`: closed by `EX-22` + `FE-22` for currently available authoritative events.
- Partial stage coverage: `accepted partial coverage` under `FE22-E1-PARTIAL-STAGE-COVERAGE`; missing stages remain blank rather than fabricated.
- CRLF normalization warning: `tool-noise`; no whitespace error.
- E2E omission: not required for this frontend-only display enrichment because no entry, route, guard or permission behavior changed.

## 6. Exceptions

| Exception ID                     | Status   | Notes                                                                   |
| -------------------------------- | -------- | ----------------------------------------------------------------------- |
| `FE22-E1-PARTIAL-STAGE-COVERAGE` | Accepted | 仅展示 backend 返回的真实事件；验收 / 完成 / 归档时间待后续事实源切片。 |

## 7. G4 Conclusion

- `FE-22` delivered boundary matches the G1 baseline.
- 项目详情页现在可以展示 `ProjectTimelineView` 已提供的真实项目生命周期里程碑细节。
- 后续若要补齐验收、完成、归档等阶段完成时间，应先新增后端事实源，再做前端投影，不在 UI 推断。
