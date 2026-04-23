# FE-23 项目生命周期完成事实前端接入验证 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `frontend-only`
- Owner: `Codex`
- Date: `2026-04-24`
- Baseline: `docs/design/archive/slices/fe-23-project-lifecycle-completion-milestone-frontend-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `FE-23`
- Commit: `810e7dc feat(project): 新增项目完成事实源与时间线投影`

## 1. Delivered Scope

- 项目详情生命周期继续复用 `ProjectTimelineView` 既有读侧，不新增页面、store API 或路由行为。
- `ProjectDetail` 的 `completed` 节点文案已收紧为“形成业务完成结论”，与 `project-lifecycle-design.md` 的阶段定义保持一致。
- 新增 `project-detail.spec.ts` 显式断言：
  - `stage='completed'`
  - `eventType='stage-completed'`
  - `sourceType='project-completion-record'`
  - `completedAtLabel / tooltip / evidence / actor` 均可正确投影
- 本片已把 `FE22-E1-PARTIAL-STAGE-COVERAGE` 中 completed milestone 的前端验证缺口关闭，剩余缺口只保留 archive milestone 呈现。

## 2. Out Of Scope

- 未新增或修改 API、OpenAPI、generated client、DTO、权限 guard 或路由。
- 未新增页面、菜单入口、按钮链路或 E2E。
- 未把 archive 语义并入主生命周期节点；该问题仍由 `EX-25` / `FE-24` 处理。
- 未扩展项目工作区首页、提成页或其它页面的完成态呈现。

## 3. Validation

| Check                  | Result       | Evidence                                                                                            |
| ---------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| Admin data-access lint | Pass         | `corepack pnpm nx lint admin-data-access`                                                           |
| Admin lint             | Pass         | `corepack pnpm nx lint poms-admin`                                                                  |
| Admin build            | Pass         | `corepack pnpm nx build poms-admin`，initial total `938.24 kB`，无新 bundle warning                 |
| Focused unit test      | Pass         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`，1 suite / 7 tests |
| E2E                    | Not required | 不改入口链、权限、菜单或路由行为                                                                    |
| OpenAPI / client diff  | Not required | 沿用 `EX-24` 已生成结果                                                                             |
| Diff hygiene           | Pass         | `git diff --check`，仅既有 `project.dto.ts` CRLF normalization warning                              |

## 4. Alignment

| Boundary                   | Result | Notes                                                                                            |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Document -> code           | Pass   | 实现范围与 FE-23 G1 baseline 一致，仅验证 completed milestone 消费并收紧语义。                   |
| Query -> view              | Pass   | `ProjectDetail.lifecycleItems(project, timeline)` 已显式验证可消费 `project-completion-record`。 |
| UI copy -> business design | Pass   | `completed` 节点不再写成“归档”，与 `project-lifecycle-design.md` `§6 completed` 对齐。           |
| Guard / permission         | Pass   | 前端未新增权限判断；后端 `project:read` 继续负责读取边界。                                       |
| OpenAPI / generated client | Pass   | 本片未改 contract，只消费 `EX-24` 已同步模型。                                                   |
| FE-22 exception carryover  | Pass   | `FE22-E1` 已缩小为 archive milestone coverage gap，不再包含 completed milestone。                |

## 5. Drift Classification

- `Document -> code`: no drift
- `Frontend consumer -> generated client`: no drift
- `CRLF normalization warning on project.dto.ts`: `tool-noise`
- `Archive milestone still missing`: accepted remaining scope, not drift for this slice

## 6. Exceptions

| Exception ID                     | Status           | Notes                                                                                           |
| -------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| `FE22-E1-PARTIAL-STAGE-COVERAGE` | Partially closed | completed milestone 已由 `EX-24` + `FE-23` 关闭，剩余仅 archive milestone 呈现待 `FE-24` 收口。 |

## 7. G4 Conclusion

- `FE-23` delivered boundary matches the G1 baseline.
- 该切片已可被后续前端切片依赖：项目详情页对 completed fact source 的消费方式已冻结并验证。
- 生命周期产物已归档：
  - `docs/design/archive/slices/fe-23-project-lifecycle-completion-milestone-frontend-baseline.md`
  - `docs/design/archive/slices/fe-23-project-lifecycle-completion-milestone-frontend-g3-g4-closeout.md`
- 下一步前端缺口只剩 `EX-25` / `FE-24`：冻结 archive 事实语义，并决定它是附属 milestone 还是完成态详情的一部分。
