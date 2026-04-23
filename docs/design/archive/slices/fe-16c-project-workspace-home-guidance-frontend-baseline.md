# FE-16C 项目工作区首页与壳层业务引导纠偏实施基线

- Gate Status: `Pass`
- Parent: `FE-16`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-21`
- Refresh Basis: `EX-19 G4 close-out 2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-16C`

## 1. 范围

- 本次目标:
  1. 将 `/projects/:id/workspace` 壳层与首页从前端本地 `projectWorkspaceGuide(stage/status)` 推导改为消费正式 `ProjectWorkspaceGuidanceView`。
  2. 在 `ProjectWorkspaceStore` 增加 guidance 读取状态，使用 generated client `ProjectApi.projectControllerGetWorkspaceGuidance`。
  3. 壳层首屏直接展示后端给出的阶段 / 状态中文、当前重点、当前缺口、下一步、责任归口和依据快照。
  4. 首页只渲染 `recommendedEntries`，入口标题、说明、禁用原因和可用状态均以后端 guidance 为准。
  5. 清理工作区首页中的“已落地入口 / 本轮边界 / 暂不覆盖 / generated client”等实现视角文案。
- 本次明确不做:
  1. 不新增、修改或删除 public API route、shared contract、OpenAPI schema 或 generated client。
  2. 不修改 `ProjectWorkspaceGuidanceView` 字段语义；如发现字段缺口，必须停止并回到 `EX-19` 或新后端切片。
  3. 不改 L4 / L5 子页事实源，包括经营总览、偏差风险、提成阶段解释、最终结算、规则解释和提成操作。
  4. 不实现签约前 L1 工作区或移交 L3 工作区；这些入口只能投影后端禁用原因。
  5. 不收口菜单入口、直接 URL、跨路由 guard 和浏览器权限矩阵，该范围仍归属 `FE-16D`。
  6. 不把 `ProjectCommissionShell` 的旧阶段引导一并纳入本片；若后续审查认定漂移，单独派生 commission 壳层纠偏。
- 下游可依赖的交付边界:
  1. `FE-16C` 完成后，项目工作区壳层 / 首页的“下一步 / 当前缺口 / 责任归口 / 推荐入口”不再由前端本地推导。
  2. 用户在工作区首页看到的是业务中文工作建议，不再看到研发状态说明。
  3. `ProjectWorkspaceStore` 暴露 guidance 信号、loading、error 与 `loadGuidance(projectId)`，供壳层和首页共享。
- 不允许下游依赖的留白:
  1. `recommendedEntries.route` 为 `null` 或 `enabled = false` 时，前端不得兜底跳转或自行构造目标路由。
  2. 前端不得用 `AuthStore.permissions` 覆盖后端 `recommendedEntries.enabled / disabledReason`。
  3. 本片不证明直接 URL 权限矩阵完整，`FE-16D` 仍需浏览器级验证。

## 2. 正式输入

| Input Type           | Document / Source                                                          | Section / Anchor                        | Status  | Notes                                                                   |
| -------------------- | -------------------------------------------------------------------------- | --------------------------------------- | ------- | ----------------------------------------------------------------------- |
| Business design      | `docs/design/phase2-lifecycle-experience-blueprint.md`                     | `§2.3`、`§4.1`                          | active  | 工作区必须回答当前到哪、为什么停在这里、下一步做什么、谁来做            |
| Business design      | `docs/design/phase2-user-task-map.md`                                      | `§4.1`                                  | active  | 销售用户需要快速推进项目、明确卡点和责任边界                            |
| Expression rules     | `docs/design/phase2-commission-rule-explanation-language.md`               | `§4`、`§6`、`§7`、`§9`                  | active  | 阻断原因必须解释原因、影响、下一步，用户可见内容用中文表达              |
| Corrective source    | `docs/design/fe-16-project-management-frontend-corrective-checkpoint.md`   | `§3`、`§7`                              | active  | 工作区首页只承接业务导航和当前工作建议，不输出研发状态说明              |
| Historical readiness | `docs/design/fe-16c-project-workspace-home-guidance-readiness-baseline.md` | full document                           | history | 记录 `EX-19` 前的 Block 结论                                            |
| Backend baseline     | `docs/design/ex-19-project-workspace-guidance-baseline.md`                 | `G3 / G4`                               | done    | `ProjectWorkspaceGuidanceView`、route、OpenAPI、generated client 已完成 |
| Query boundary       | `docs/design/query-view-boundary-design.md`                                | `§5.1 / ProjectWorkspaceGuidanceView`   | active  | guidance view 是工作区连续引导唯一事实源                                |
| Route inventory      | `docs/design/api-route-canonical-inventory.md`                             | project domain                          | aligned | `GET /projects/{projectId}/workspace-guidance` 已 aligned               |
| Runtime fact         | `libs/shared/api-client/api/project.service.ts`                            | `projectControllerGetWorkspaceGuidance` | fact    | generated client 已可读取 guidance                                      |
| Runtime fact         | `libs/admin/data-access/src/lib/project/project-workspace.store.ts`        | current store                           | fact    | 当前 store 管理子页读取状态，需新增 guidance 状态                       |
| Runtime fact         | `apps/poms-admin/src/app/features/project/project-workspace-shell.ts`      | `workspaceGuide` / `tabs`               | fact    | 当前壳层仍本地推导下一步和入口可用性                                    |
| Runtime fact         | `apps/poms-admin/src/app/features/project/project-workspace-home.ts`       | template / entries                      | fact    | 当前首页仍展示实现说明并按本地权限拼入口                                |

## 3. 本次 SSOT

| Concern                 | SSOT                                                           | Implementation Rule                                                                       |
| ----------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Guidance fact           | `ProjectWorkspaceGuidanceView` from generated client           | 壳层和首页只投影该 view，不再本地 switch `stage/status`                                   |
| Guidance loading        | `ProjectWorkspaceStore`                                        | store 持有 guidance、loading、error，壳层负责按 route projectId 触发加载                  |
| Header business labels  | `currentStageLabel`、`statusLabel`、`headline`、`currentFocus` | 页面显示后端中文，不调用本地 `projectStageLabel/projectStatusLabel` 作为主表达            |
| Current gap / next step | `currentGap`、`nextStep`、`blockingReasons`                    | 不从 `ProjectDetailView.stageSummary` 或 `AuthStore` 派生                                 |
| Owner label             | `ownerLabel`                                                   | 不显示裸 UUID，不调用 `projectOwnerSummary`                                               |
| Entry availability      | `recommendedEntries.enabled / disabledReason`                  | 导航卡和壳层 tab 以后端结果为准；权限不足显示后端原因                                     |
| Entry navigation        | `recommendedEntries.route`                                     | `route = null` 时只显示禁用说明，不构造 routerLink                                        |
| Evidence snapshot       | `basisSummary`                                                 | 展示为“依据已生成 / 暂无依据快照”等业务中文，不暴露技术字段名                             |
| User language           | FE-16 corrective checkpoint                                    | 不出现 `workspace`、`generated client`、`gate`、`snapshot`、`allowedActions` 等用户难懂词 |
| Angular state           | Angular 21 Signals                                             | 继续使用 standalone component + signals/computed，不引入新全局状态框架                    |

## 4. 命令与接口边界

| Route / API                                                                              | Consumer                             | Request          | Response                       | Guard / Permission                                    | Result          |
| ---------------------------------------------------------------------------------------- | ------------------------------------ | ---------------- | ------------------------------ | ----------------------------------------------------- | --------------- |
| `GET /projects/{projectId}/workspace-guidance` / `projectControllerGetWorkspaceGuidance` | `ProjectWorkspaceStore.loadGuidance` | path `projectId` | `ProjectWorkspaceGuidanceView` | 后端 `project:read` + guidance entry-level projection | `aligned`       |
| `GET /projects/{id}` / `projectControllerGetById`                                        | `ProjectStore.loadProject`           | path `id`        | `ProjectDetailView`            | 后端 `project:read`                                   | `context-only`  |
| `/projects/:id/workspace`                                                                | `ProjectWorkspaceShell`              | route param `id` | 壳层 + 子路由                  | 当前 route guard，最终矩阵归属 `FE-16D`               | `in-scope-page` |
| `/projects/:id/workspace` home child                                                     | `ProjectWorkspaceHome`               | inherited state  | guidance entries               | 以后端 `recommendedEntries` 为准                      | `in-scope-page` |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/workspace-guidance`、`GET /projects/{id}`
- Current implemented route(s): `GET /projects/:projectId/workspace-guidance`、`GET /projects/:id`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-19`
- Blocker / exception:
  - 无 route blocker。
  - 本片不改 public route surface。

## 5. 读侧边界

| Query / View                   | Consumer                         | Required Fields                                                                                                                                                                             | Display Rule                                              | Result                            |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| `ProjectWorkspaceGuidanceView` | 壳层 / 首页                      | `projectId`、`currentStageLabel`、`statusLabel`、`headline`、`currentFocus`、`currentGap`、`nextStep`、`ownerLabel`、`blockingReasons`、`basisSummary`、`recommendedEntries`、`generatedAt` | 作为工作区连续引导唯一事实源                              | `aligned`                         |
| `ProjectWorkspaceEntryView`    | 壳层导航 / 首页入口卡            | `key`、`label`、`description`、`route`、`enabled`、`disabledReason`、`actionKey`                                                                                                            | 标签和禁用原因直接展示为业务中文；`route = null` 不可点击 | `aligned`                         |
| `ProjectWorkspaceBasisSummary` | 首页依据提示                     | `summarySnapshotId`、`projectionLevel`、`exportPolicy`、`generatedAt`                                                                                                                       | 只显示业务化依据状态，不展示字段名                        | `aligned`                         |
| `ProjectDetailView`            | 壳层项目名 / 项目编号 / 返回详情 | `projectName`、`projectCode`、`id`                                                                                                                                                          | 只作为项目上下文，不再承担下一步推导                      | `context-only`                    |
| L4 / L5 子页视图               | 子路由页面                       | 经营总览、偏差风险、提成解释、最终结算、规则解释                                                                                                                                            | 继续由现有子页 store 加载，不在本片重做                   | `out-of-scope-stable-destination` |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result           |
| ----- | --------- | ------------------- | ------------------- | ---------------------- |
| `N/A` | `N/A`     | `N/A`               | `frontend-only`     | 本片不触达 persistence |

## 7. 一致性结论

- Document -> code:
  - `EX-19` 已补齐正式 guidance query；当前前端仍使用本地 helper 与实现说明，属于本片要关闭的 implementation drift。
- ADR-015 inventory -> route:
  - `GET /projects/{projectId}/workspace-guidance` 已 aligned；本片不改 route。
- Entity -> contract:
  - 本片不改 entity / shared contract；直接消费 generated `ProjectWorkspaceGuidanceView`。
- Route -> command:
  - `ProjectWorkspaceStore.loadGuidance(projectId)` 调用 generated client；component 不直接拼 API。
- Query -> view:
  - 壳层和首页只能投影 guidance；不再从 `stage/status/AuthStore` 生成下一步、缺口、责任或入口可用性。
- Guard / permission:
  - 后端仍是最终授权；本片只投影 `recommendedEntries` 的可用性。
  - 直接 URL、菜单入口和跨页 guard 浏览器矩阵留给 `FE-16D`。
- OpenAPI / generated client:
  - `EX-19` 已生成并通过 check；本片预期不运行 OpenAPI 生成。

## 8. 测试与校验要求

### 8.1 本次 G1 refresh 校验

| Check                            | Required | Command / Evidence | Result         | Gap / Reason                    |
| -------------------------------- | -------- | ------------------ | -------------- | ------------------------------- |
| Lint                             | `no`     | N/A                | `not-required` | docs-only G1 refresh            |
| Build                            | `no`     | N/A                | `not-required` | 未改运行时代码                  |
| Unit tests                       | `no`     | N/A                | `not-required` | 未改运行时代码                  |
| API / integration tests          | `no`     | N/A                | `not-required` | 不改后端                        |
| E2E                              | `no`     | N/A                | `not-required` | 浏览器级权限矩阵归属 `FE-16D`   |
| OpenAPI generation / client diff | `no`     | N/A                | `not-required` | `EX-19` 已完成 generated client |
| Migration / schema check         | `no`     | N/A                | `not-required` | frontend-only                   |
| Diff hygiene                     | `yes`    | `git diff --check` | `pass`         | 2026-04-21 已通过               |

### 8.2 后续实现 G3 必跑

| Check            | Required Command                               | Notes                                              |
| ---------------- | ---------------------------------------------- | -------------------------------------------------- |
| Admin lint       | `corepack pnpm nx lint poms-admin`             | 壳层 / 首页 template 变更必跑                      |
| Admin build      | `corepack pnpm nx build poms-admin`            | 校验 Angular template 与 generated client 类型     |
| Admin unit tests | `corepack pnpm nx test poms-admin --runInBand` | 必须覆盖 store guidance、壳层文案、首页入口投影    |
| Data-access lint | `corepack pnpm nx lint admin-data-access`      | `ProjectWorkspaceStore` 增加 ProjectApi 依赖后必跑 |
| Diff hygiene     | `git diff --check`                             | 保持文档与代码无空白问题                           |

### 8.3 后续实现新增 / 调整测试点

| Test Target                       | Required Assertion                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `project-workspace.store.spec.ts` | `loadGuidance(projectId)` 调用 `projectControllerGetWorkspaceGuidance`，写入 guidance 并清空错误 |
| `project-workspace.store.spec.ts` | 404 / 403 guidance error 映射为用户可读中文                                                      |
| `project-workspace.store.spec.ts` | `clear()` 清理 guidance、loading 与 error                                                        |
| `project-workspace-shell.spec.ts` | 壳层显示 `headline/currentFocus/currentGap/nextStep/ownerLabel`，不显示本地 helper 旧文案        |
| `project-workspace-shell.spec.ts` | tab 可用性和禁用原因来自 `recommendedEntries`                                                    |
| `project-workspace-home.spec.ts`  | 首页只渲染 guidance entries，不显示“已落地入口 / 本轮边界 / 暂不覆盖”                            |
| `project-workspace-home.spec.ts`  | `route = null` 或 `enabled = false` 的 entry 不渲染可点击链接                                    |

## 9. 例外与风险

| Exception ID                            | Level | Scope                                                         | Approved By | Cleanup Owner                             | Cleanup Due    | Notes                                                                              |
| --------------------------------------- | ----- | ------------------------------------------------------------- | ----------- | ----------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `FE16C-E1-COMMISSION-SHELL-GUIDE`       | `low` | `ProjectCommissionShell` 仍可能使用旧 `projectWorkspaceGuide` | `Codex`     | `FE-16D` 或后续 commission shell 纠偏切片 | 后续前端审查   | 本片只关闭 `/projects/:id/workspace` 壳层和首页漂移；commission 独立壳层不塞入本片 |
| `FE16C-E2-PRESIGNING-HANDOVER-DISABLED` | `low` | 签约前 / 移交工作区入口                                       | `EX-19`     | L1 / L3 workspace owner                   | 后续工作区切片 | 本片只投影后端禁用原因，不实现缺失工作区                                           |

- 风险:
  1. 若实现时用 `AuthStore.permissions` 覆盖 `recommendedEntries`，会重新引入前端本地授权推导漂移。
  2. 若首页为了“更完整”继续保留实现说明，会违反 FE-16 用户文案约束。
  3. `recommendedEntries.route` 当前是前端路由字符串；实现必须只用于导航，不得把它当后端资源标识。

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-21`
- Conditions:
  1. `EX-19` 已解除事实源阻断，`FE-16C` 可进入前端实现。
  2. 壳层与首页必须消费 `ProjectWorkspaceGuidanceView`，不得继续调用 `projectWorkspaceGuide(stage/status)` 生成业务结论。
  3. `ProjectWorkspaceStore` 负责 guidance 状态与错误映射，component 不直接调用 generated API。
  4. 用户可见文案只说业务中文，不出现研发状态说明和难懂英文术语。
  5. 浏览器级权限矩阵、菜单入口和直接 URL 验证继续归属 `FE-16D`。

## 11. G3 / G4 收口

- Gate Status: `Pass`
- Closed By: `Codex`
- Closed At: `2026-04-21`

### 11.1 实现结果

- `ProjectWorkspaceStore` 已新增 `guidance / loadingGuidance / guidanceError / hasGuidance` 与 `loadGuidance(projectId)`，统一通过 generated client `ProjectApi.projectControllerGetWorkspaceGuidance` 读取工作区引导。
- `/projects/:id/workspace` 壳层已改为展示 `ProjectWorkspaceGuidanceView` 的阶段、状态、标题、当前重点、当前缺口、下一步、责任归口、依据状态与推荐入口；不再调用 `projectWorkspaceGuide(stage/status)` 或用 `AuthStore.permissions` 推入口可用性。
- 工作区首页已改为只展示后端 `recommendedEntries` 与 guidance 业务事实，清理“已落地入口 / 本轮边界 / 暂不覆盖 / generated client”等实现视角文案。
- `route = null` 或 `enabled = false` 的推荐入口只显示后端禁用原因，不构造前端兜底跳转。
- `ProjectCommissionShell` 旧引导仍按 `FE16C-E1-COMMISSION-SHELL-GUIDE` 例外留给后续前端纠偏；菜单入口、直接 URL 和浏览器权限矩阵仍归属 `FE-16D`。

### 11.2 验证证据

| Check            | Command                                        | Result | Evidence                   |
| ---------------- | ---------------------------------------------- | ------ | -------------------------- |
| Admin unit tests | `corepack pnpm nx test poms-admin --runInBand` | `pass` | 9 suites / 31 tests        |
| Admin lint       | `corepack pnpm nx lint poms-admin`             | `pass` | All files pass linting     |
| Data-access lint | `corepack pnpm nx lint admin-data-access`      | `pass` | All files pass linting     |
| Admin build      | `corepack pnpm nx build poms-admin`            | `pass` | production build completed |
| Diff hygiene     | `git diff --check`                             | `pass` | 2026-04-21 收口前通过      |

### 11.3 新增测试覆盖

| Test Target                       | Coverage                                                               |
| --------------------------------- | ---------------------------------------------------------------------- |
| `project-workspace.store.spec.ts` | guidance 读取、404 中文错误映射、`clear()` 清理 guidance 状态          |
| `project-workspace-shell.spec.ts` | 壳层加载 guidance、渲染后端引导事实、以后端 entry route / enabled 导航 |
| `project-workspace-home.spec.ts`  | 首页只渲染 guidance entry，禁用入口不可点击，不再展示实现视角文案      |

### 11.4 G4 结论

- `FE-16C` 可标记为 `Done`。
- 下游可依赖 `/projects/:id/workspace` 壳层和首页使用 `ProjectWorkspaceGuidanceView` 作为连续工作引导唯一事实源。
- 下游不得把本片当作浏览器级权限矩阵完成证据；`FE-16D` 仍需继续收口 route guard、菜单入口、直接 URL 和人工浏览器验证。
