# FE-21 项目生命周期响应式与细节提示实施基线包

- Gate Status: `Pass`
- Parent: `FE-18`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: 2026-04-23
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-21`

## 1. 范围

- 本次目标:
  - 修正 `ProjectLifecycleTimeline` 在可一行展示时未居中的视觉问题。
  - 将生命周期在桌面端保持横向阶段线，窄屏端切换为纵向阶段线，避免蛇形折行。
  - 统一阶段 marker、标题、描述与状态标签的视觉中心轴。
  - 为已完成节点预留 PrimeNG Tooltip 细节提示能力，支持后续展示完成时间等权威事实。
- 本次明确不做:
  - 不修改后端 API、OpenAPI、generated client、DTO、权限 guard、route surface 或 store 读取语义。
  - 不新增阶段完成时间事实源，不在前端伪造完成时间。
  - 不把项目生命周期替换为新的业务状态机。
  - 不扩展到工作区导航、表格、操作页或其它页面组件。
- 下游可依赖的交付边界:
  - 后续项目管理页面可继续复用 `ProjectLifecycleTimeline` 作为项目阶段概览组件。
  - 组件支持可选的节点细节提示字段；真实完成时间接入仍需另行确认数据来源。
- 不允许下游依赖的留白:
  - `completedAtLabel` 等细节字段只作为展示能力，不代表当前项目详情 DTO 已提供阶段完成时间。
  - 浏览器级视觉回归截图不在本片内建立为强制门禁。

## 2. 正式输入

| Input Type      | Document / Source                                       | Section / Anchor           | Status     | Notes                                                                 |
| --------------- | ------------------------------------------------------- | -------------------------- | ---------- | --------------------------------------------------------------------- |
| UI baseline     | `fe-18-project-context-workspace-component-baseline.md` | `ProjectLifecycleTimeline` | `Accepted` | 生命周期组件来自 FE-18。                                              |
| UI demo         | `apps/poms-admin/src/app/demo/uikit/timelinedemo.ts`    | Horizontal / vertical      | `Accepted` | 纵向沿用 PrimeNG Timeline；横向由组件自有 rail 保证节点文字同列居中。 |
| UI demo         | `apps/poms-admin/src/app/demo/uikit/overlaydemo.ts`     | Tooltip                    | `Accepted` | 节点短提示采用 PrimeNG Tooltip。                                      |
| Business design | `phase2-lifecycle-experience-blueprint.md`              | Project lifecycle          | `Accepted` | 生命周期只做阶段概览，不重写业务流程。                                |
| User review     | 当前会话审查意见                                        | FE-21                      | `Accepted` | 居中、overflow、垂直对齐、完成节点提示。                              |

## 3. 本次 SSOT

| Concern                     | SSOT                                                        | Implementation Rule                                                                             |
| --------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Business semantics          | Existing `ProjectDetailView.stageSummary`                   | 当前阶段、阻断与已完成推导仍由现有详情页 helper 负责。                                          |
| Public route canonical path | N/A                                                         | 不触及 public route surface。                                                                   |
| Route / command naming      | Existing Angular routes                                     | 不改路由结构。                                                                                  |
| DTO / contract naming       | Existing generated client / data-access exports             | 不新增 wire contract。                                                                          |
| Date / time semantics       | N/A for current consumer                                    | 完成时间仅预留 display label 字段；当前不消费真实时间。                                         |
| Identifier semantics        | Existing project ID / stage keys                            | 不改变 stage key。                                                                              |
| Status machine              | `ProjectLifecycleItemState` + existing stage/status helpers | 不新增业务状态，只改善展示状态、tooltip 和响应式布局。                                          |
| UI component baseline       | Component rail + PrimeNG `Timeline` / `Tag` / `Tooltip`     | 横向用组件自有 rail 保证节点文字同列居中；纵向保留 PrimeNG Timeline；不新增非 PrimeNG overlay。 |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source | Result                    |
| ------------------ | ----------------- | ---------------------- | ----------------------- | ------------------ | ------------- | ------------------------- |
| N/A                | N/A               | N/A                    | Existing project detail | Existing           | FE-18         | Read-only projection only |

### 4.1 公共路由补充信息

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): N/A
- Inventory status: `aligned`
- Route governance source: N/A
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View                 | Consumer        | Fields                                                     | Filter / Sort | Permission Boundary | Design Source  | Result   |
| ---------------------------- | --------------- | ---------------------------------------------------------- | ------------- | ------------------- | -------------- | -------- |
| Existing `ProjectDetailView` | `ProjectDetail` | `stageSummary.currentStage` / `status` / `blockingReasons` | N/A           | Existing            | FE-16B / FE-18 | Existing |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| N/A   | N/A       | N/A                 | N/A                 | Not touched  |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result      |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ----------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | Not touched |

## 7. 一致性结论

- Document -> code: `Pass`，本片只调整共享 UI 组件。
- ADR-015 inventory -> route: `N/A`。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: `N/A`。
- Query -> view: `Pass`，不改变 `ProjectDetailView` 语义。
- Guard / permission: `Pass`，不改变权限判定。
- OpenAPI / generated client: `N/A`。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                             | Result         | Gap / Reason                                                       |
| -------------------------------- | -------- | ---------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| Diff check                       | Yes      | `git diff --check`                             | `Pass`         | 见 `fe-21-project-lifecycle-timeline-responsive-g3-g4-closeout.md` |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`             | `Pass`         | 见 `fe-21-project-lifecycle-timeline-responsive-g3-g4-closeout.md` |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`            | `Pass`         | initial total `930.67 kB`，无新 bundle warning                     |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runInBand` | `Pass`         | 13 suites / 42 tests；新增生命周期组件单测                         |
| E2E                              | No       | N/A                                            | `Not required` | 不改入口链、权限、路由或业务流程                                   |
| OpenAPI generation / client diff | No       | N/A                                            | `Not required` | No API / contract change                                           |
| Migration / schema check         | No       | N/A                                            | `Not required` | No persistence change                                              |

## 9. 例外与风险

| Exception ID                     | Level | Scope                      | Approved By | Cleanup Owner | Cleanup Due               | Notes                                        |
| -------------------------------- | ----- | -------------------------- | ----------- | ------------- | ------------------------- | -------------------------------------------- |
| `FE21-E1-COMPLETION-TIME-SOURCE` | Low   | 当前不展示真实阶段完成时间 | Codex       | Codex         | 后续阶段历史 / query 切片 | 本片只预留 UI 字段，不伪造事实。             |
| `FE21-E2-VISUAL-SNAPSHOT-GAP`    | Low   | 不新增浏览器截图级视觉回归 | Codex       | Codex         | 后续前端视觉回归治理切片  | 本片用单测、lint、build 验证结构与可构建性。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-04-23
- Conditions:
  - 只做 frontend-only 组件响应式和提示能力增强。
  - 不改 API、权限、路由、DTO、generated client 或 store 读取语义。
  - 完成时间等细节仅在权威字段存在时展示。
