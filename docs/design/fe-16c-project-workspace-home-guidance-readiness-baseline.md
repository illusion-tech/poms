# FE-16C 项目工作区首页与壳层业务引导 G1 Readiness 基线

- Gate Status: `Block`
- Parent: `FE-16`
- Owner: `Codex`
- Slice Type: `frontend-only / readiness`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-16C`

## 1. 范围

- 本次目标:
  1. 在进入工作区首页 / 壳层前端整改前，确认是否已有稳定事实源支撑“当前阶段、为什么停在这里、下一步做什么、谁来做”。
  2. 审查当前 `/projects/:id/workspace`、`ProjectWorkspaceHome` 与 `projectWorkspaceGuide` 是否仍存在本地拼业务结论的问题。
  3. 冻结 `FE-16C` 当前阻断结论，避免继续把阶段枚举、权限集合或实现说明当成用户工作引导。
- 本次明确不做:
  1. 不直接改动 `apps/poms-admin/src/app/features/project/project-workspace-shell.ts`。
  2. 不直接改动 `apps/poms-admin/src/app/features/project/project-workspace-home.ts`。
  3. 不在前端本地继续用 `stage/status/allowedActions` 拼“下一步 / 当前缺口 / 责任归口”。
  4. 不把 `ProjectDetailView.stageSummary.blockingReasons` 误当成完整工作流摘要。
  5. 不新增或修改 public API route surface。
- 下游可依赖的交付边界:
  1. `FE-16C` 当前不能进入前端实现。
  2. 工作区连续工作引导需要正式 query / contract 事实源，不能由前端 helper 代替。
  3. 当前 `ProjectDetailView` 可作为项目主体上下文，但不是完整 `workspace guidance`。
- 不允许下游依赖的留白:
  1. 当前 `/projects/:id/workspace` 仍不能被视为稳定产品体验。
  2. 当前工作区首页仍展示“已落地入口 / 本轮边界 / 暂不覆盖”等实现说明，不符合用户可见文案要求。
  3. 当前 `projectWorkspaceGuide` 仍按阶段静态拼下一步、缺口和责任归口，属于待关闭 drift。

## 2. 正式输入

| Input Type              | Document / Source                                                         | Section / Anchor        | Status  | Notes                                                                                               |
| ----------------------- | ------------------------------------------------------------------------- | ----------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| Business design         | `docs/design/phase2-lifecycle-experience-blueprint.md`                    | `§2.3`、`§3`、`§4.1`    | active  | 冻结“连续工作优先于单点页面”以及系统必须回答的四个问题                                              |
| Business design         | `docs/design/phase2-user-task-map.md`                                     | `§4.1`                  | active  | 销售用户需要快速知道下一步、卡点和责任边界                                                          |
| Query boundary          | `docs/design/query-view-boundary-design.md`                               | `§5.1`                  | active  | 当前只有 `ProjectDetailView`、`ProjectTimelineView`、各业务子视图；没有正式 workspace guidance view |
| Corrective source       | `docs/design/fe-16-project-management-frontend-corrective-checkpoint.md`  | `§3`、`§7`              | active  | 明确当前动作、缺口、下一步和可用性必须来自稳定 query，前端只能投影                                  |
| Prior frontend baseline | `docs/design/fe-01-project-workspace-shell-routing-baseline.md`           | `§5`                    | history | 旧口径曾允许壳层投影“当前阶段 / 下一步 / 缺口 / 责任人”，但已被 FE-16 corrective 收紧               |
| Current detail baseline | `docs/design/fe-16b-project-detail-business-actions-frontend-baseline.md` | `§11`                   | done    | `ProjectDetailView` 已可用于详情页，但明确不提供完整连续工作引导                                    |
| Runtime fact            | `apps/poms-admin/src/app/features/project/project-workspace-shell.ts`     | `workspaceGuide`        | fact    | 当前壳层仍用 `projectWorkspaceGuide(project)` 本地拼当前步骤、下一步、缺口、责任                    |
| Runtime fact            | `apps/poms-admin/src/app/features/project/project-workspace-home.ts`      | template                | fact    | 当前首页仍展示实现状态说明和页面范围说明                                                            |
| Runtime fact            | `apps/poms-admin/src/app/features/project/project-presentation.ts`        | `projectWorkspaceGuide` | fact    | 当前 helper 直接按 `currentStage/status` 静态派生业务结论，并包含 legacy 阶段词                     |

## 3. 本次 SSOT

| Concern        | SSOT                        | Readiness Rule                                                                  |
| -------------- | --------------------------- | ------------------------------------------------------------------------------- |
| 连续工作引导   | 尚缺正式 query / contract   | `FE-16C` 不能用前端 helper 代替事实源                                           |
| 项目主体上下文 | `ProjectDetailView`         | 可展示项目名称、阶段、状态、负责人、组织和动作边界                              |
| 下一步动作     | 待 `EX-19` 冻结             | 不能从 `currentStage` switch/case 静态推导                                      |
| 当前缺口       | 待 `EX-19` 冻结             | 不能把 `stageSummary.blockingReasons` 当完整缺口清单                            |
| 责任归口       | 待 `EX-19` 冻结             | 不能显示“用户 {uuid} / 组织 {uuid}”或前端写死角色组                             |
| 用户文案       | FE-16 corrective checkpoint | 工作区首页不得再输出“已落地 / 本轮边界 / 暂不覆盖 / generated client”等实现说明 |
| 路由与权限     | FE-16D                      | 本片不收口直接 URL 和浏览器权限矩阵                                             |

## 4. 命令与接口边界

| Route / Controller        | Command / Service                      | Request DTO / Contract | Response DTO / Contract                        | Guard / Permission                          | Design Source    | Result                                |
| ------------------------- | -------------------------------------- | ---------------------- | ---------------------------------------------- | ------------------------------------------- | ---------------- | ------------------------------------- |
| `/projects/:id/workspace` | Angular internal route                 | `N/A`                  | `N/A`                                          | 当前已有 route guard，最终验证归属 `FE-16D` | `FE-01`、`FE-16` | `blocked-for-content`                 |
| `GET /projects/{id}`      | `ProjectQueryService.getProjectDetail` | path `id`              | `ProjectDetailView`                            | `project:read`                              | `EX-18`          | `insufficient-for-workspace-guidance` |
| `TBD`                     | `ProjectWorkspaceGuidance` query       | path `projectId`       | `ProjectWorkspaceGuidanceView` 或等效 contract | `project:read` + 对象可见性                 | `EX-19`          | `missing`                             |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - 当前可用: `GET /projects/{id}`
  - 待冻结: `EX-19` 决定是否新增 `GET /projects/{projectId}/workspace-guidance`，或扩展既有 `ProjectDetailView`
- Current implemented route(s): `GET /projects/:id`
- Inventory status:
  - `GET /projects/{id}` 已 aligned，但 response contract 不含完整工作区引导。
  - workspace guidance 尚无 authoritative inventory row。
- Route governance source: `ADR-015` + 待建 `EX-19`
- Blocker / exception:
  - `FE16C-BLOCKER-WORKSPACE-GUIDANCE`：缺正式连续工作引导事实源。

## 5. 读侧边界

| Query / View                                | Consumer          | Fields                                                                            | Filter / Sort | Permission Boundary                    | Design Source             | Result                     |
| ------------------------------------------- | ----------------- | --------------------------------------------------------------------------------- | ------------- | -------------------------------------- | ------------------------- | -------------------------- |
| `ProjectDetailView`                         | 工作区壳层        | 项目名称、编码、阶段、状态、负责人、组织、`allowedActions`                        | 单项目        | `project:read`                         | `EX-18`                   | `partial`                  |
| `ProjectWorkspaceGuidanceView` 或等效字段组 | 工作区壳层 / 首页 | 当前阶段说明、当前阻断 / 缺口、建议下一步、责任归口、推荐入口、禁用原因、依据快照 | 单项目        | `project:read` + action-level boundary | 待 `EX-19` 冻结           | `missing`                  |
| `L4 / L5` 子页视图                          | 工作区导航目标    | 经营总览、偏差风险、gate 解释、最终结算、规则解释                                 | 单项目        | 既有子页权限                           | `FE-02`、`FE-03`、`FE-06` | `available-as-destination` |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result                    |
| ----- | --------- | ------------------- | ------------------- | ------------------------------- |
| `N/A` | `N/A`     | `N/A`               | `N/A`               | 本 readiness 不触达 persistence |

## 7. 一致性结论

- Document -> code:
  - `new-real-drift`：FE-16 要求工作区首页只承接业务导航和当前工作建议，当前页面仍展示实现说明。
  - `new-real-drift`：FE-16 要求下一步、缺口、可用性来自稳定 query，当前壳层仍用 `projectWorkspaceGuide` 本地 switch 派生。
- ADR-015 inventory -> route:
  - 现有 `GET /projects/{id}` 已 aligned。
  - workspace guidance 若新增 public route，必须先由 `EX-19` 补 authoritative inventory。
- Route -> command:
  - 当前没有 workspace guidance query / service。
- Query -> view:
  - 当前 `ProjectDetailView` 只能支持主体上下文和动作按钮，不能满足 `FE-16C` 完成定义。
- Guard / permission:
  - 当前工作区导航仍主要按 `AuthStore` 权限本地判断；对象动作与推荐入口需要后端 fact 参与。
  - 浏览器级 route guard 仍归属 `FE-16D`。
- OpenAPI / generated client:
  - 缺 workspace guidance contract；本片不能直接进入 Angular 编码。

## 8. 测试与校验

| Check                            | Required | Command / Evidence | Result         | Gap / Reason                             |
| -------------------------------- | -------- | ------------------ | -------------- | ---------------------------------------- |
| Lint                             | `no`     | N/A                | `not-required` | readiness docs-only                      |
| Build                            | `no`     | N/A                | `not-required` | 未改运行时代码                           |
| Unit tests                       | `no`     | N/A                | `not-required` | 未改运行时代码                           |
| API / integration tests          | `no`     | N/A                | `not-required` | 后端前置切片未开始                       |
| E2E                              | `no`     | N/A                | `not-required` | 浏览器验证归属后续 `FE-16D`              |
| OpenAPI generation / client diff | `no`     | N/A                | `not-required` | 本片不改 contract                        |
| Migration / schema check         | `no`     | N/A                | `not-required` | 本片不改 persistence                     |
| Diff hygiene                     | `yes`    | `git diff --check` | `pass`         | 2026-04-21 已通过，仅有既有 CRLF warning |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                            |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------------------------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 本片不放行例外；直接阻断前端编码 |

## 10. G1 结论

- Gate Status: `Block`
- Approved By: `Codex`
- Approved At: `2026-04-21`
- Conditions:
  1. `FE-16C` 不进入前端实现。
  2. 新增后端前置切片 `EX-19`，先冻结并实现项目工作区连续工作引导事实源。
  3. `EX-19` 至少需要输出当前阶段说明、当前阻断 / 缺口、建议下一步、责任归口、推荐入口、禁用原因和依据快照。
  4. `EX-19` 完成后再刷新 `FE-16C` G1，并清理 `projectWorkspaceGuide` 这类前端本地业务结论 helper。
