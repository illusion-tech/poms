# FE-24 项目归档事实前端呈现 Local G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: Phase 2 project lifecycle milestone continuation
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- Checkpoint Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-24`

## 1. 范围

- 本次完成:
  1. 在项目详情页生命周期线下方新增终态 archive 附属 panel。
  2. panel 只消费 `ProjectTimelineView.events` 中 `sourceType='project-archive-record'` + `eventType='milestone'` 的 authoritative 事件。
  3. 终态无 archive fact 时给出非阻断缺口反馈；timeline 读取失败时给出“暂时不可用”，不误报缺口。
  4. 沿用 `SectionCard`、`WorkspaceFactGrid`、`WorkspaceFeedback` 与 PrimeNG `p-tag`，不新造一套局部视觉体系。
- 本次明确不做:
  1. 不新增 route、API、OpenAPI、generated client、store、guard、E2E。
  2. 不把 archive 做成第九个 lifecycle node。
  3. 不修改 `ProjectLifecycleTimeline` 的 stage 集合与 `completed` 节点主语义。

## 2. 正式输入

| Input Type            | Document / Source                                                                              | Section / Anchor            | Status | Notes                                            |
| --------------------- | ---------------------------------------------------------------------------------------------- | --------------------------- | ------ | ------------------------------------------------ |
| Frontend baseline     | `docs/design/fe-24-project-archive-milestone-frontend-baseline.md`                             | 全文                        | Pass   | 本片 `G1` 输入冻结。                             |
| Backend delivered     | `docs/design/archive/slices/ex-25-project-archive-fact-source-g3-g4-closeout.md`               | delivered scope / alignment | G4     | archive fact route、contract、timeline 已完成。  |
| Frontend carryover    | `docs/design/archive/slices/fe-22-project-lifecycle-real-milestone-frontend-g3-g4-closeout.md` | `FE22-E1`                   | G4     | archive 不能作为第九个 lifecycle node。          |
| Current detail screen | `apps/poms-admin/src/app/features/project/project-detail.ts`                                   | lifecycle line              | Fact   | 详情页为本片唯一 runtime surface。               |
| Shared UI pattern     | `apps/poms-admin/src/app/shared/ui/workspace-fact-grid.ts`                                     | 全文                        | Fact   | archive facts 走共享事实栅格，而不是手写新卡片。 |

## 3. 一致性结论

| Concern                | Conclusion                                                               | Result |
| ---------------------- | ------------------------------------------------------------------------ | ------ |
| Document -> code       | archive 仍是 terminal-state attached milestone，没有新增生命周期 stage   | Pass   |
| Query -> view          | 前端只消费已有 `ProjectTimelineView.events`                              | Pass   |
| Route / API surface    | 无新增或变更                                                             | N/A    |
| DTO / contract         | 无前端本地派生 wire contract                                             | Pass   |
| Guard / permission     | 继续依赖详情页既有读取边界，不新增 guard                                 | Pass   |
| Missing-state behavior | terminal 无 archive fact 显式提示缺口；timeline 失败时不误报“尚未归档”   | Pass   |
| Component consistency  | 采用 `SectionCard` + `WorkspaceFactGrid` + `WorkspaceFeedback` + `p-tag` | Pass   |

## 4. 测试与校验

| Check                  | Required   | Command / Evidence                                                                  | Result       | Gap / Reason                            |
| ---------------------- | ---------- | ----------------------------------------------------------------------------------- | ------------ | --------------------------------------- |
| Diff hygiene           | Yes        | `git diff --check`                                                                  | Pass         |                                         |
| Admin data-access lint | If touched | `corepack pnpm nx lint admin-data-access`                                           | Not required | 本片未改 `admin-data-access`            |
| Admin lint             | Yes        | `corepack pnpm nx lint poms-admin`                                                  | Pass         |                                         |
| Admin build            | Yes        | `corepack pnpm nx build poms-admin`                                                 | Pass         | initial total `940.57 kB`，无新 warning |
| Focused unit tests     | Yes        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`    | Pass         | `1 suite / 10 tests`                    |
| Shared component tests | If touched | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-lifecycle` | Not required | 未修改 shared lifecycle component       |
| E2E                    | No         | N/A                                                                                 | Not required | 未改入口链、菜单、路由或权限            |

## 5. Drift 与例外

- Drift classification: `none`
- Existing baseline drift: `none`
- New drift introduced: `none`

| Exception ID                             | Level | Scope                    | Approved By | Cleanup Owner | Cleanup Due | Notes                                             |
| ---------------------------------------- | ----- | ------------------------ | ----------- | ------------- | ----------- | ------------------------------------------------- |
| `FE24-E1-NO-NINTH-LIFECYCLE-NODE`        | Low   | archive 呈现结构         | Codex       | `FE-24`       | `FE-24 G4`  | 已按 panel 方案实现，待 commit 后关闭。           |
| `FE24-E2-TERMINAL-GAP-FEEDBACK-REQUIRED` | Low   | 终态无归档事实的缺口表达 | Codex       | `FE-24`       | `FE-24 G4`  | 已实现 gap / unavailable 分流，待 `G4` 一并关闭。 |

## 6. 决策

- Can commit to main: `yes`
- Can mark tracker `Done`: `no`
- Remaining action:
  1. 提交本轮前端代码与治理文档。
  2. 提交后补 `G3/G4 close-out`，将基线 / checkpoint 生命周期产物迁入 `archive/slices/`。
