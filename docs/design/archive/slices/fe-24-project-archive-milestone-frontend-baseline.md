# FE-24 项目归档事实前端呈现与 `FE22-E1` 收口实施基线包

- Gate Status: `Pass`
- Parent: Phase 2 project lifecycle milestone continuation
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-24`

## 1. 范围

- 本次目标:
  1. 在项目详情页消费 `EX-25` 已落地的 archive milestone 事实。
  2. 明确 archive 不进入第九个 lifecycle node，而是在生命周期线下方作为终态附属 fact panel 呈现。
  3. 终态存在 archive fact 时展示真实归档时间、锚定终态、结论摘要、证据摘要与操作人。
  4. 终态不存在 archive fact 时显式展示“尚未形成归档记录”的缺口反馈，完成 `FE22-E1` 的 archive 部分收口。
- 本次明确不做:
  1. 不新增 API、OpenAPI、generated client、DTO、权限 guard 或路由。
  2. 不把 archive 重新写回 `completed` 节点文案、`completedAtLabel` 或 tooltip 主语义。
  3. 不新增第九个 lifecycle node，不扩展 `ProjectLifecycleTimeline` 的 stage 集合。
  4. 不新增菜单入口、按钮链路或 E2E 导航场景。
- 下游可依赖的交付边界:
  1. 项目详情页存在稳定的 archive 附属呈现区。
  2. archive 呈现只消费 `ProjectTimelineView` authoritative milestone event。
  3. `FE22-E1-PARTIAL-STAGE-COVERAGE` 中 archive gap 将在本片内关闭或重分类完毕。

## 2. 正式输入

| Input Type             | Document / Source                                                                              | Section / Anchor               | Status | Notes                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------ | ------ | ------------------------------------------------------------ |
| Backend delivered fact | `docs/design/archive/slices/ex-25-project-archive-fact-source-g3-g4-closeout.md`               | delivered scope / alignment    | G4     | archive route、contract 与 timeline milestone 已落地。       |
| Backend baseline       | `docs/design/archive/slices/ex-25-project-archive-fact-source-baseline.md`                     | timeline rules / persistence   | G4     | archive 是 terminal-state attached milestone。               |
| Frontend carryover     | `docs/design/archive/slices/fe-22-project-lifecycle-real-milestone-frontend-g3-g4-closeout.md` | `FE22-E1`                      | G4     | archive 不应通过新增 lifecycle node 收口。                   |
| Frontend component     | `apps/poms-admin/src/app/shared/ui/project-lifecycle-timeline.ts`                              | `ProjectLifecycleTimelineItem` | Fact   | 当前组件只表达固定 stage line，不适合追加 archive stage。    |
| Current detail page    | `apps/poms-admin/src/app/features/project/project-detail.ts`                                   | lifecycle line + detail layout | Fact   | archive panel 应插入 lifecycle line 下方、事实卡片上方。     |
| Business design        | `docs/design/project-lifecycle-design.md`                                                      | `§5.1`、`§6`                   | Draft  | 主阶段链止于 `completed`，关闭态独立，未定义 archive stage。 |

## 3. 本次 SSOT

| Concern                  | SSOT                                               | Implementation Rule                                                                 |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Archive semantics        | `EX-25` close-out                                  | archive 只作为终态附属事实，不作为 lifecycle stage。                                |
| Data source              | `ProjectTimelineView.events`                       | 只消费 `sourceType='project-archive-record'` + `eventType='milestone'`。            |
| Rendering location       | 本基线包                                           | 在项目详情页生命周期线下方渲染独立 panel，不塞进 `ProjectLifecycleTimeline` stage。 |
| Component pattern        | `SectionCard` + `WorkspaceFeedback` + PrimeNG tags | 优先复用现有共享组件，必要时新增共享 archive panel 组件。                           |
| Terminal-state semantics | `event.stage`                                      | panel 上的终态标签来自 `completed` / `closed-lost` / `closed-terminated`。          |
| Missing-state behavior   | 本基线包                                           | 终态无 archive fact 时显示缺口反馈，不伪造时间或摘要。                              |
| Permission boundary      | existing backend `project:read`                    | 前端不新增 guard；继续由详情页读取边界承接。                                        |

## 4. 页面与组件边界

| Surface                                                           | Change Type             | Data Source                    | Result  |
| ----------------------------------------------------------------- | ----------------------- | ------------------------------ | ------- |
| `apps/poms-admin/src/app/features/project/project-detail.ts`      | runtime read projection | existing `ProjectTimelineView` | planned |
| `apps/poms-admin/src/app/features/project/project-detail.spec.ts` | unit verification       | component / timeline input     | planned |
| `apps/poms-admin/src/app/shared/ui/...`                           | optional shared panel   | presentation only              | planned |

### 4.1 呈现规则

1. `project.stageSummary.currentStage` 属于以下终态之一时，才考虑显示 archive panel:
   - `completed`
   - `closed-lost`
   - `closed-terminated`
2. 若 timeline 中存在最新 authoritative archive milestone，则显示:
   - 归档时间
   - 锚定终态标签
   - 归档结论摘要
   - 证据摘要
   - 操作人
3. 若项目已到终态但没有 archive milestone，则显示非阻断缺口反馈：
   - summary: `尚未形成归档记录`
   - detail: 当前已完成或已关闭，但还没有正式归档事实
4. 非终态项目不显示 archive panel，也不显示缺口反馈。

### 4.2 视觉与交互规则

- 不新增第九个 timeline 节点。
- 不复写 `ProjectLifecycleTimeline` 的 `completedAtLabel` 主语义；`completed` 节点继续只表达完成事实。
- archive panel 采用项目详情已有事实卡片风格：
  - 外层优先复用 `SectionCard`
  - 状态标签使用 PrimeNG `p-tag`
  - 缺口反馈使用 `WorkspaceFeedback`
- 不新增复杂交互；第一版为纯读取型事实展示。

## 5. 读侧映射规则

| Timeline Predicate                                                                            | UI Meaning           | Notes                        |
| --------------------------------------------------------------------------------------------- | -------------------- | ---------------------------- |
| `sourceType='project-archive-record'` + `eventType='milestone'` + `stage='completed'`         | 完成后的归档结果     | 不替换 completed milestone。 |
| `sourceType='project-archive-record'` + `eventType='milestone'` + `stage='closed-lost'`       | 丢单关闭后的归档结果 | 生命周期主线不新增关闭节点。 |
| `sourceType='project-archive-record'` + `eventType='milestone'` + `stage='closed-terminated'` | 终止关闭后的归档结果 | 生命周期主线不新增关闭节点。 |

Fallback rules:

- 只取最新 archive milestone。
- 不从 `project.closedAt`、`project.updatedAt`、`closedReason` 或其它详情字段反推归档时间。
- 终态无 milestone 时只展示缺口，不展示占位时间。

## 6. 测试与校验

| Check                  | Required   | Command / Evidence                                                                  | Result       |
| ---------------------- | ---------- | ----------------------------------------------------------------------------------- | ------------ |
| Diff whitespace        | Yes        | `git diff --check`                                                                  | Pending      |
| Admin data-access lint | If touched | `corepack pnpm nx lint admin-data-access`                                           | Pending      |
| Admin lint             | Yes        | `corepack pnpm nx lint poms-admin`                                                  | Pending      |
| Admin build            | Yes        | `corepack pnpm nx build poms-admin`                                                 | Pending      |
| Focused unit tests     | Yes        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`    | Pending      |
| Shared component tests | If touched | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-lifecycle` | Pending      |
| E2E                    | No         | 不改入口链、路由、菜单或权限行为                                                    | Not required |
| OpenAPI / client diff  | No         | 本片只消费 `EX-25` 已同步结果                                                       | Not required |

## 7. 例外与风险

| Exception ID                             | Level | Scope                    | Approved By | Cleanup Owner | Cleanup Due | Notes                                                    |
| ---------------------------------------- | ----- | ------------------------ | ----------- | ------------- | ----------- | -------------------------------------------------------- |
| `FE24-E1-NO-NINTH-LIFECYCLE-NODE`        | Low   | archive 呈现结构         | Codex       | `FE-24`       | `FE-24 G4`  | archive 必须落在附属 panel，而不是 timeline 第九节点。   |
| `FE24-E2-TERMINAL-GAP-FEEDBACK-REQUIRED` | Low   | 终态无归档事实的缺口表达 | Codex       | `FE-24`       | `FE-24 G4`  | 终态无 archive fact 时必须显示缺口反馈，不允许静默吞掉。 |

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-24`
- Conditions:
  1. archive panel 的唯一权威输入是 `ProjectTimelineView` archive milestone。
  2. 不新增 lifecycle stage，不修改 `completed` 节点名称或阶段定义。
  3. 终态无 archive fact 时必须显式反馈缺口。
  4. 本片默认优先用共享组件承接，避免在 `project-detail.ts` 里散落一套新样式。
