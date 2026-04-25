# FE-24 项目归档事实前端呈现与 `FE22-E1` 收口 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `frontend-only`
- Owner: `Codex`
- Date: `2026-04-24`
- Baseline: `docs/design/archive/slices/fe-24-project-archive-milestone-frontend-baseline.md`
- Checkpoint: `docs/design/archive/slices/fe-24-project-archive-milestone-frontend-g3-checkpoint.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `FE-24`
- Commit: `af9020b feat(project): 接入项目归档里程碑前端呈现`

## 1. Delivered Scope

- 项目详情页在生命周期线下方新增终态附属 `archive panel`，不新增第九个 lifecycle node。
- `ProjectDetail.archiveSummary(project, timeline)` 只消费 authoritative archive milestone：
  - `sourceType='project-archive-record'`
  - `eventType='milestone'`
  - `stage in ('completed', 'closed-lost', 'closed-terminated')`
- 有归档事实时展示：
  - 归档结论
  - 归档时间
  - 锚定终态
  - 操作人
  - 证据摘要
- 终态无 archive fact 时显示“尚未形成归档记录”的非阻断反馈。
- timeline 读取失败时显示“归档事实暂时不可用”，不把读取失败误报成业务缺口。
- 视觉层复用 `SectionCard`、`WorkspaceFactGrid`、`WorkspaceFeedback` 与 PrimeNG `p-tag`，没有再手写一套局部样式体系。

## 2. Out Of Scope

- 未新增或修改 API、OpenAPI、generated client、DTO、权限 guard、路由、菜单或按钮入口链。
- 未修改 `ProjectLifecycleTimeline` 的 stage 集合与 `completed` 节点主语义。
- 未新增 E2E；本片不改变入口链、权限或路由行为。
- 未把 archive 行为铺到项目工作区、提成页或其它读取页。

## 3. Validation

| Check                  | Result       | Evidence                                                                                             |
| ---------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| Diff hygiene           | Pass         | `git diff --check`                                                                                   |
| Admin data-access lint | Not required | 未改 `admin-data-access`                                                                             |
| Admin lint             | Pass         | `corepack pnpm nx lint poms-admin`                                                                   |
| Admin build            | Pass         | `corepack pnpm nx build poms-admin`，initial total `940.57 kB`，无新 bundle warning                  |
| Focused unit test      | Pass         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`，1 suite / 10 tests |
| Shared component test  | Not required | 未修改 `ProjectLifecycleTimeline` shared component                                                   |
| E2E                    | Not required | 不改入口链、菜单、路由或权限                                                                         |
| OpenAPI / client diff  | Not required | 本片只消费 `EX-25` 已同步模型                                                                        |

## 4. Alignment

| Boundary                  | Result | Notes                                                                                       |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Document -> code          | Pass   | archive 仍按 `EX-25` 结论作为 terminal-state attached milestone，不新增主生命周期阶段。     |
| Query -> view             | Pass   | 页面只从 `ProjectTimelineView.events` 读取 authoritative archive event。                    |
| UI structure -> baseline  | Pass   | panel 落在生命周期线下方，未塞入 `ProjectLifecycleTimeline`。                               |
| Missing-state behavior    | Pass   | terminal 无 archive fact 时给 gap feedback；timeline 失败时给 unavailable feedback。        |
| Guard / permission        | Pass   | 前端未新增权限判断；后端 `project:read` 继续负责读取边界。                                  |
| FE-22 carryover exception | Pass   | `FE22-E1-PARTIAL-STAGE-COVERAGE` 的 archive 部分已由 `EX-25` + `FE-24` 关闭。               |
| Component consistency     | Pass   | 延续 Poseidon / PrimeNG 模式，复用共享 fact grid / feedback，而不是把事实展示散落到页面里。 |

## 5. Drift Classification

- `Document -> code`: no drift
- `Frontend consumer -> generated client`: no drift
- `timeline unavailable -> gap feedback split`: no drift
- `bundle size / warnings`: no new warning introduced

## 6. Exceptions

| Exception ID                             | Status | Notes                                                                                   |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `FE24-E1-NO-NINTH-LIFECYCLE-NODE`        | Closed | 已按附属 panel 方案交付，未扩展 lifecycle node。                                        |
| `FE24-E2-TERMINAL-GAP-FEEDBACK-REQUIRED` | Closed | 已显式区分“无归档事实”和“时间线暂不可用”两类状态。                                      |
| `EX22-E1-PARTIAL-STAGE-COVERAGE`         | Closed | `EX-22` 最初记录的验收 / 完成 / 归档覆盖缺口已分别由 `EX-23~25` 与 `FE-23~24` 收口。    |
| `FE22-E1-PARTIAL-STAGE-COVERAGE`         | Closed | `acceptance` / `completed` / `archive` 三段缺口已分别由 `EX-23~25` 与 `FE-23~24` 收口。 |

## 7. G4 Conclusion

- `FE-24` delivered boundary matches the G1 baseline and G3 checkpoint.
- 项目生命周期主线与终态附属事实的语义边界已经冻结：完成是 `completed` 节点，归档是 terminal milestone panel。
- `EX22-E1-PARTIAL-STAGE-COVERAGE` 已作为 `FE22-E1-PARTIAL-STAGE-COVERAGE` 的早期 EX 侧记录同步关闭。
- `FE22-E1-PARTIAL-STAGE-COVERAGE` 已可正式关闭。
- 生命周期产物已归档：
  - `docs/design/archive/slices/fe-24-project-archive-milestone-frontend-baseline.md`
  - `docs/design/archive/slices/fe-24-project-archive-milestone-frontend-g3-checkpoint.md`
  - `docs/design/archive/slices/fe-24-project-archive-milestone-frontend-g3-g4-closeout.md`
