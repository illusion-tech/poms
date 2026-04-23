# FE-23 项目生命周期完成事实前端接入验证实施基线包

- Gate Status: `Pass`
- Parent: `FE-22`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-23`

## 1. 范围

- 本次目标:
  1. 验证项目详情页现有生命周期投影逻辑可以消费 `EX-24` 新增的 `stage='completed'` 权威事件。
  2. 为 `sourceType='project-completion-record'` 的 `stage-completed` 事件补显式前端单测，断言 `completedAtLabel` 与 tooltip 展示正确。
  3. 收紧 `completed` 生命周期节点文案，使其只表达“完成结论”，不提前混入归档语义。
- 本次明确不做:
  1. 不新增页面、路由、菜单入口、权限判断或新的交互层。
  2. 不新增或修改 API、OpenAPI、generated client、DTO、store 读取协议。
  3. 不伪造归档事实；归档语义仍由 `EX-25` / `FE-24` 单独冻结与呈现。
  4. 不新增 E2E；本片不改变入口链、guard 或页面跳转行为。
- 下游可依赖的交付边界:
  1. `ProjectDetail.lifecycleItems(project, timeline)` 已被显式验证可消费完成事实。
  2. `completed` 节点的用户文案与 `project-lifecycle-design.md` 中“形成业务完成结论”保持一致。
  3. 前端继续只展示后端返回的真实完成事件，不推断其它缺失阶段。
- 不允许下游依赖的留白:
  1. 本片不代表“项目归档”已经进入主生命周期节点。
  2. 本片不承诺工作区首页、提成页或其它页面已经显式展示完成事实。

## 2. 正式输入

| Input Type          | Document / Source                                                                              | Section / Anchor                  | Status    | Notes                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- | --------- | ----------------------------------------------------------------------- |
| Business design     | `docs/design/project-lifecycle-design.md`                                                      | `§6 completed`                    | Active    | `completed` 只表达完成结论，不等价于归档。                              |
| FE baseline         | `docs/design/archive/slices/fe-22-project-lifecycle-real-milestone-frontend-baseline.md`       | `ProjectTimelineView` consumption | Done      | 现有详情页已具备 timeline 读侧与 milestone 投影能力。                   |
| FE close-out        | `docs/design/archive/slices/fe-22-project-lifecycle-real-milestone-frontend-g3-g4-closeout.md` | exceptions / validation           | Done      | 延续 `FE22-E1-PARTIAL-STAGE-COVERAGE`，但本片关闭其中 completed 部分。  |
| Backend fact source | `docs/design/ex-24-project-completion-fact-source-timeline-baseline.md`                        | `ProjectCompletionRecord`         | Pass      | `ProjectTimelineView` 已新增 `sourceType='project-completion-record'`。 |
| Generated client    | `libs/shared/api-client/model/project-timeline-event.ts`                                       | generated model                   | Generated | 前端继续消费生成类型，不手写 wire contract。                            |
| Existing page       | `apps/poms-admin/src/app/features/project/project-detail.ts`                                   | lifecycle mapping                 | Fact      | `lifecycleMilestoneDetail` 已按 `stage-completed` 泛化处理。            |

## 3. 本次 SSOT

| Concern                     | SSOT                                                              | Implementation Rule                                                               |
| --------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Business semantics          | `project-lifecycle-design.md` + `ProjectTimelineView.events`      | `completed` 节点只表达完成事实；归档保持 out-of-scope。                           |
| Public route canonical path | Existing `GET /projects/{projectId}/timeline`                     | FE 不改 route surface。                                                           |
| Route / command naming      | Existing generated `projectControllerGetTimeline`                 | 本片不新增 store / service API。                                                  |
| DTO / contract naming       | generated `ProjectTimelineView` / `ProjectTimelineEvent`          | 前端不创建镜像 DTO。                                                              |
| Date / time semantics       | `occurredAt: ISO datetime`                                        | 继续格式化为本地 `yyyy-MM-dd HH:mm`。                                             |
| Identifier semantics        | `sourceType='project-completion-record'`, `sourceId`, `actorName` | UI 只展示业务文案、时间、操作人、依据，不暴露裸 UUID。                            |
| Status machine              | `ProjectDetailView.stageSummary`                                  | 阶段状态仍由详情页主状态机决定；timeline 只补真实完成细节。                       |
| User-facing copy            | `project-lifecycle-design.md` `completed` stage meaning           | `completed` 节点描述不得写成“归档”，避免把 `FE-24` 尚未冻结的语义提前混入主节点。 |

## 4. 命令与接口边界

| Route / Component | Store / Service                    | Request DTO / Contract     | Response DTO / Contract | Guard / Permission              | Design Source     | Result |
| ----------------- | ---------------------------------- | -------------------------- | ----------------------- | ------------------------------- | ----------------- | ------ |
| `ProjectDetail`   | `ProjectStore.loadProjectTimeline` | generated path `projectId` | `ProjectTimelineView`   | existing backend `project:read` | `FE-22` + `EX-24` | frozen |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/timeline`
- Current implemented route(s): already delivered by `EX-22`, extended by `EX-24` event payload
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-22` + `EX-24`
- Blocker / exception: N/A; this frontend slice does not change public route surface.

## 5. 读侧边界

| Query / View                   | Consumer                          | Fields                                                                               | Filter / Sort  | Permission Boundary    | Design Source     | Result |
| ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------ | -------------- | ---------------------- | ----------------- | ------ |
| `ProjectTimelineView`          | `ProjectDetail` lifecycle section | `events[].stage/eventType/sourceType/occurredAt/resultLabel/evidenceLabel/actorName` | single project | backend `project:read` | `EX-24`           | frozen |
| `ProjectLifecycleTimelineItem` | `ProjectLifecycleTimeline`        | `completedAtLabel / tooltip / description`                                           | stage mapping  | no new permission      | `FE-21` + `FE-22` | frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result  |
| ----- | --------- | ------------------- | ------------------- | ------------- |
| N/A   | N/A       | N/A                 | N/A                 | frontend-only |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result      |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ----------- |
| N/A   | N/A                   | N/A             | N/A    | Existing generated client | Not touched |

## 7. 一致性结论

- Document -> code:
  - 本片关闭 `FE22-E1-PARTIAL-STAGE-COVERAGE` 中 completed milestone 的前端显式验证缺口。
- ADR-015 inventory -> route:
  - `N/A` for FE change；仅消费已 aligned route。
- Migration -> entity:
  - `N/A`。
- Entity -> contract:
  - `N/A`；前端只消费 generated model。
- Route -> command:
  - `ProjectStore.loadProjectTimeline` 继续复用既有 generated client。
- Query -> view:
  - `ProjectDetail.lifecycleItems(project, timeline)` 必须能把 `project-completion-record` 事件映射到 `completed` 节点。
- Guard / permission:
  - 不新增前端权限判断；后端 `project:read` 决定可读性。
- OpenAPI / generated client:
  - 不在本片重新生成；直接消费 `EX-24` 已同步结果。

## 8. 测试与校验

| Check                  | Required | Command / Evidence                                                               | Result       | Gap / Reason                                  |
| ---------------------- | -------- | -------------------------------------------------------------------------------- | ------------ | --------------------------------------------- |
| Admin data-access lint | Yes      | `corepack pnpm nx lint admin-data-access`                                        | Pending      | 确认 `EX-24` 类型同步未破坏 frontend consumer |
| Admin lint             | Yes      | `corepack pnpm nx lint poms-admin`                                               | Pending      | `project-detail.ts/spec.ts` 变更              |
| Admin build            | Yes      | `corepack pnpm nx build poms-admin`                                              | Pending      | 验证前端消费新 timeline event                 |
| Focused unit test      | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail` | Pending      | 显式覆盖 `completed` stage event              |
| E2E                    | No       | N/A                                                                              | Not required | 不改入口链、权限、菜单或路由行为              |
| OpenAPI / client diff  | No       | N/A                                                                              | Not required | `EX-24` 已完成                                |
| Diff hygiene           | Yes      | `git diff --check`                                                               | Pending      | G3 执行                                       |

## 9. 例外与风险

| Exception ID                     | Level | Scope                    | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                 |
| -------------------------------- | ----- | ------------------------ | ----------- | ------------- | ----------- | --------------------------------------------------------------------- |
| `FE22-E1-PARTIAL-STAGE-COVERAGE` | Low   | 归档事实仍未进入前端呈现 | Codex       | `FE-24`       | `FE-24`     | 本片关闭 completed 部分，剩余 gap 收敛为 archive milestone 呈现问题。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-24`
- Conditions:
  1. 只做现有详情页 completed milestone 的消费验证和语义收紧。
  2. 不改 API / route / permission / 页面结构。
  3. 不把 archive 语义提前混入 `completed` 生命周期节点。
  4. 通过 focused unit + build + lint 证明现有通用投影逻辑可稳定消费 `EX-24` 事件。
