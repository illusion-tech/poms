# FE-22 项目生命周期真实里程碑前端接入实施基线包

- Gate Status: `Pass`
- Parent: `FE-21`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-23`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-22`

## 1. 范围

- 本次目标:
  1. 在 `ProjectStore` 中新增 `ProjectTimelineView` 读取状态，调用 generated `ProjectApi.projectControllerGetTimeline`。
  2. 项目详情页进入时并行读取项目详情和 timeline。
  3. 将真实里程碑事件映射到 `ProjectLifecycleTimelineItem.completedAtLabel/detail/tooltip`。
  4. 当 timeline 读取失败时，保留阶段线可读，并用统一 `WorkspaceFeedback` 提示完成时间暂不可用。
- 本次明确不做:
  1. 不新增或修改 API、OpenAPI、generated client、DTO、权限 guard 或路由。
  2. 不伪造验收、完成、归档等 `ProjectTimelineView` 未返回的阶段完成时间。
  3. 不改 `ProjectLifecycleTimeline` 的视觉结构、响应式策略或 PrimeNG 组件基线。
  4. 不新增 E2E；本片不改变入口链、权限路径或路由行为。
- 下游可依赖的交付边界:
  1. 项目详情页的生命周期已完成节点能展示来自 `ProjectTimelineView` 的真实时间和来源说明。
  2. 没有权威事件的阶段只显示原有状态，不显示推断完成时间。
  3. timeline query 失败不会阻断项目详情主体展示。
- 不允许下游依赖的留白:
  1. 当前只覆盖项目详情页，不覆盖工作区壳层或提成壳层。
  2. 当前只展示 `EX-22` 返回的真实动作事实，不声明完整阶段历史已经具备。

## 2. 正式输入

| Input Type          | Document / Source                                                           | Section / Anchor               | Status    | Notes                                                    |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------ | --------- | -------------------------------------------------------- |
| UI baseline         | `docs/design/fe-21-project-lifecycle-timeline-responsive-g3-g4-closeout.md` | `ProjectLifecycleTimelineItem` | Done      | 组件已预留 `detail / completedAtLabel / tooltip`。       |
| Backend fact source | `docs/design/ex-22-project-timeline-view-g3-g4-closeout.md`                 | `ProjectTimelineView`          | Done      | `GET /projects/{projectId}/timeline` 已生成 client。     |
| Generated client    | `libs/shared/api-client/api/project.service.ts`                             | `projectControllerGetTimeline` | Generated | 本片只消费，不手写 wire contract。                       |
| Experience design   | `docs/design/phase2-lifecycle-experience-blueprint.md`                      | lifecycle continuity           | Active    | 生命周期应解释已完成关键动作。                           |
| Existing page       | `apps/poms-admin/src/app/features/project/project-detail.ts`                | lifecycle section              | Fact      | 当前只按 `ProjectDetailView.stageSummary` 推导阶段状态。 |

## 3. 本次 SSOT

| Concern                     | SSOT                                                     | Implementation Rule                                            |
| --------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| Business semantics          | `ProjectTimelineView.events`                             | 只使用 `isAuthoritative` event，按 stage 映射到生命周期节点。  |
| Public route canonical path | Existing `GET /projects/{projectId}/timeline`            | FE 不改 route surface。                                        |
| Route / command naming      | Generated `projectControllerGetTimeline`                 | Store 通过 generated client 调用。                             |
| DTO / contract naming       | Generated `ProjectTimelineView` / `ProjectTimelineEvent` | 前端不新造 wire contract。                                     |
| Date / time semantics       | `occurredAt: ISO datetime`                               | UI 格式化为本地 `yyyy-MM-dd HH:mm`。                           |
| Identifier semantics        | `sourceId / actorUserId`                                 | UI 不显示裸 UUID；tooltip 只展示业务文案、来源 label、操作人。 |
| Status machine              | Existing `ProjectDetailView.stageSummary`                | 阶段状态仍由原有详情页逻辑推导；timeline 只补细节。            |

## 4. 命令与接口边界

| Route / Component | Store / Service                    | Request DTO / Contract     | Response DTO / Contract | Guard / Permission              | Design Source | Result |
| ----------------- | ---------------------------------- | -------------------------- | ----------------------- | ------------------------------- | ------------- | ------ |
| `ProjectDetail`   | `ProjectStore.loadProjectTimeline` | generated path `projectId` | `ProjectTimelineView`   | existing backend `project:read` | `EX-22`       | frozen |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/timeline`
- Current implemented route(s): already delivered by `EX-22`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-22`
- Blocker / exception: N/A; this frontend slice does not change public route surface.

## 5. 读侧边界

| Query / View                   | Consumer                          | Fields                                | Filter / Sort  | Permission Boundary    | Design Source | Result |
| ------------------------------ | --------------------------------- | ------------------------------------- | -------------- | ---------------------- | ------------- | ------ |
| `ProjectTimelineView`          | `ProjectDetail` lifecycle section | `events`                              | single project | backend `project:read` | `EX-22`       | frozen |
| `ProjectLifecycleTimelineItem` | `ProjectLifecycleTimeline`        | `detail / completedAtLabel / tooltip` | stage mapping  | no new permission      | `FE-21`       | frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result  |
| ----- | --------- | ------------------- | ------------------- | ------------- |
| N/A   | N/A       | N/A                 | N/A                 | frontend-only |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result      |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ----------- |
| N/A   | N/A                   | N/A             | N/A    | Existing generated client | Not touched |

## 7. 一致性结论

- Document -> code:
  - 本片关闭 `FE21-E1-COMPLETION-TIME-SOURCE` 的前端消费缺口。
- ADR-015 inventory -> route:
  - `N/A` for FE change；仅消费 `EX-22` 已 aligned route。
- Migration -> entity:
  - `N/A`。
- Entity -> contract:
  - `N/A`；前端只消费 generated model。
- Route -> command:
  - `ProjectStore.loadProjectTimeline` 只调用 generated client。
- Query -> view:
  - `ProjectDetail.lifecycleItems(project, timeline)` 只把 authoritative events 投影到节点细节。
- Guard / permission:
  - 不新增前端权限判断；后端 `project:read` 决定可读性。
- OpenAPI / generated client:
  - 不再生成；沿用 `EX-22` 生成结果。

## 8. 测试与校验

| Check                       | Required | Command / Evidence                             | Result       | Gap / Reason               |
| --------------------------- | -------- | ---------------------------------------------- | ------------ | -------------------------- |
| Admin data-access lint      | Yes      | `corepack pnpm nx lint admin-data-access`      | Pending      | Store touch                |
| Admin lint                  | Yes      | `corepack pnpm nx lint poms-admin`             | Pending      | Component touch            |
| Admin build                 | Yes      | `corepack pnpm nx build poms-admin`            | Pending      | Verify bundle no warning   |
| Admin unit tests            | Yes      | `corepack pnpm nx test poms-admin --runInBand` | Pending      | Store + detail page tests  |
| E2E                         | No       | N/A                                            | Not required | 不改入口链、权限或路由行为 |
| OpenAPI / client generation | No       | N/A                                            | Not required | `EX-22` 已完成             |
| Diff hygiene                | Yes      | `git diff --check`                             | Pending      | G3 执行                    |

## 9. 例外与风险

| Exception ID                     | Level | Scope              | Approved By | Cleanup Owner              | Cleanup Due        | Notes                                        |
| -------------------------------- | ----- | ------------------ | ----------- | -------------------------- | ------------------ | -------------------------------------------- |
| `FE22-E1-PARTIAL-STAGE-COVERAGE` | Low   | 部分阶段无完成时间 | Codex       | Future timeline fact owner | 后续阶段事实源切片 | UI 只展示 backend 返回事件，不推断缺失阶段。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-23`
- Conditions:
  1. 只做 frontend-only consumption。
  2. 不改 API / generated client / route / permission。
  3. 不伪造 `ProjectTimelineView` 未返回的阶段完成时间。
  4. timeline 失败不得阻断项目详情主体渲染。
