# EX-19 项目工作区连续工作引导事实源实施基线

- Gate Status: `Pass`
- Parent: `FE-16C`
- Owner: `Codex`
- Slice Type: `api / query`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-19`

## 1. 范围

- 本次目标:
  1. 冻结并实现项目工作区首页 / 壳层可消费的连续工作引导 query。
  2. 新增 `ProjectWorkspaceGuidanceView` shared contract / API DTO / OpenAPI / generated client。
  3. 新增 canonical query route `GET /projects/{projectId}/workspace-guidance`。
  4. 后端输出当前阶段说明、当前阻断 / 缺口、建议下一步、责任归口、推荐入口、禁用原因和依据快照，供 `FE-16C` 前端只投影、不重算。
- 本次明确不做:
  1. 不修改项目生命周期状态机。
  2. 不新增持久化表、migration 或审计写侧。
  3. 不实现 `ProjectTimelineView`、完整 `BidProcessDetailView` 或 L1 / L3 全量工作区事实。
  4. 不改 `FE-16C` 前端页面；前端实现需在本片完成后重新刷新 G1。
  5. 不收口浏览器级路由 guard、菜单入口和直接 URL 权限矩阵，该范围仍归属 `FE-16D`。
- 下游可依赖的交付边界:
  1. `FE-16C` 可通过 generated client 读取 `ProjectWorkspaceGuidanceView`。
  2. 工作区首页 / 壳层的“下一步 / 当前缺口 / 责任归口 / 推荐入口”来自后端 query。
  3. 当前无完整事实源的签约前 / 移交工作区必须显式返回禁用原因，不由前端猜测。
- 不允许下游依赖的留白:
  1. 本片输出的是当前阶段下的工作区引导，不等于完整工作流引擎。
  2. 推荐入口只覆盖当前已前端化的项目详情、工作区总览、经营总览、偏差风险、提成阶段解释、最终结算、规则解释和提成操作。
  3. `EX18-E1-BID-SUMMARY` 仍然存在，投标过程详情不在本片伪造。

## 2. 正式输入

| Input Type       | Document / Source                                                          | Section / Anchor       | Status | Notes                                                                |
| ---------------- | -------------------------------------------------------------------------- | ---------------------- | ------ | -------------------------------------------------------------------- |
| Frontend blocker | `docs/design/fe-16c-project-workspace-home-guidance-readiness-baseline.md` | `G1 = Block`           | active | 本片解除 `FE-16C` 工作区引导事实源阻断                               |
| Business design  | `docs/design/phase2-lifecycle-experience-blueprint.md`                     | `§2.3`、`§4.1`         | active | 系统必须回答当前走到哪、谁处理下一步、还缺什么、依据是什么           |
| Business design  | `docs/design/phase2-user-task-map.md`                                      | `§4.1`                 | active | 销售人员要快速推进项目、明确下一步、知道卡点和责任边界               |
| Query boundary   | `docs/design/query-view-boundary-design.md`                                | `§5.1`                 | active | 现有 `ProjectDetailView` 不承担工作区引导；本片新增独立 query view   |
| Authorization    | `docs/design/business-authorization-matrix.md`                             | project object actions | active | 后端输出 action-level 可用入口，前端只投影                           |
| Route inventory  | `docs/design/api-route-canonical-inventory.md`                             | project domain         | active | 本片新增 project-scoped noun subresource                             |
| Runtime fact     | `ProjectQueryService.getProjectDetail`                                     | current detail query   | fact   | 可复用项目主体、owner/org、合同摘要、审批摘要、`allowedActions` 计算 |
| Runtime fact     | `projectWorkspaceGuide`                                                    | frontend helper        | fact   | 待 `FE-16C` 清理，不能继续作为业务结论源                             |

## 3. 本次 SSOT

| Concern                     | SSOT                                                           | Implementation Rule                                                                |
| --------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Public route canonical path | `GET /projects/{projectId}/workspace-guidance`                 | 使用项目父资源下名词型子资源，不使用 `/workspace/current`、`/next-step` 或页面后缀 |
| Response contract           | `ProjectWorkspaceGuidanceView`                                 | 不扩展 `ProjectDetailView`，避免详情页与工作区引导职责混合                         |
| Query source                | `ProjectQueryService.getProjectWorkspaceGuidance`              | controller 不拼字段                                                                |
| Project context             | `Project` + owner / org lookup                                 | 负责人和归属组织输出业务姓名 / 组织名，不能输出裸 UUID                             |
| Stage facts                 | `Project.currentStage/status` + `stageSummary.blockingReasons` | 后端把状态码转成业务说明和缺口项                                                   |
| Recommended entries         | 后端 `recommendedEntries`                                      | 前端按 entries 渲染，不再按权限本地拼入口可用性                                    |
| Disabled reason             | 后端 `disabledReason`                                          | 未接入事实源或未授权必须给出用户可读原因                                           |
| Evidence snapshot           | `ApprovalSummarySnapshot` when available                       | 有摘要快照则返回 `summarySnapshotId/projectionLevel/exportPolicy`，无则返回 `null` |

## 4. 命令与接口边界

| Route / Controller                                                                        | Command / Service                                 | Request DTO / Contract | Response DTO / Contract        | Guard / Permission | Design Source                            | Result   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------- | ------------------------------ | ------------------ | ---------------------------------------- | -------- |
| `GET /projects/{projectId}/workspace-guidance` / `ProjectController.getWorkspaceGuidance` | `ProjectQueryService.getProjectWorkspaceGuidance` | path `projectId`       | `ProjectWorkspaceGuidanceView` | `project:read`     | `FE-16C` readiness + lifecycle blueprint | `frozen` |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/workspace-guidance`
- Current implemented route(s): none before this slice
- Inventory status: `planned-ready` at G1, `aligned` after implementation
- Route governance source: `ADR-015` + `EX-19`
- Blocker / exception: no route blocker after this baseline row is added.

## 5. 读侧边界

| Query / View                   | Consumer                      | Fields                                                                                                                                                                                                                | Filter / Sort | Permission Boundary                        | Design Source    | Result   |
| ------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------ | ---------------- | -------- |
| `ProjectWorkspaceGuidanceView` | `FE-16C` workspace shell/home | `projectId`、`currentStage`、`status`、`currentStageLabel`、`statusLabel`、`headline`、`currentFocus`、`currentGap`、`nextStep`、`ownerLabel`、`blockingReasons`、`basisSummary`、`recommendedEntries`、`generatedAt` | 单项目        | `project:read` + action-level entries      | FE-16C readiness | `frozen` |
| `ProjectWorkspaceEntryView`    | `FE-16C` navigation cards     | `key`、`label`、`description`、`route`、`enabled`、`disabledReason`、`actionKey`                                                                                                                                      | N/A           | entry-level action / permission projection | FE-16C readiness | `frozen` |
| `ProjectWorkspaceBasisSummary` | `FE-16C` evidence strip       | `summarySnapshotId`、`projectionLevel`、`exportPolicy`、`generatedAt`                                                                                                                                                 | N/A           | same as detail query                       | `EX-18`          | `frozen` |

## 6. 持久化边界

| Table | Migration | Entity / Repository                                     | DDL / Freeze Source | Check Result         |
| ----- | --------- | ------------------------------------------------------- | ------------------- | -------------------- |
| `N/A` | `N/A`     | 复用 `project`、`contract`、`approval_summary_snapshot` | `N/A`               | 本片不改 persistence |

## 7. 一致性结论

- Document -> code:
  - 本片正式承接 `FE-16C` 的 `workflow summary / next-step query` 缺口。
- ADR-015 inventory -> route:
  - 新增 `GET /projects/{projectId}/workspace-guidance` authoritative row 后才能编码。
- Migration -> entity:
  - `N/A`，本片不改 DDL。
- Entity -> contract:
  - 新增 shared contract `ProjectWorkspaceGuidanceViewSchema`，不新增 entity。
- Route -> command:
  - `ProjectController.getWorkspaceGuidance` 只委派 `ProjectQueryService.getProjectWorkspaceGuidance`。
- Query -> view:
  - 前端后续只投影 `ProjectWorkspaceGuidanceView`，不得继续使用 `projectWorkspaceGuide(stage/status)` 作为业务结论源。
- Guard / permission:
  - controller 使用 `project:read`；推荐入口内部由后端根据 `allowedActions` 与当前已前端化能力返回 enabled / disabledReason。
- OpenAPI / generated client:
  - 本片必须运行 openapi、shared api-client generate/check，并更新 admin consumer 编译。

## 8. 测试与校验

| Check                    | Required | Command / Evidence                                                                                | Result         | Gap / Reason                                             |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------- |
| API lint                 | `yes`    | `corepack pnpm nx lint poms-api`                                                                  | `pass`         | G3 已执行                                                |
| API build                | `yes`    | `corepack pnpm nx build poms-api`                                                                 | `pass`         | G3 已执行                                                |
| API unit tests           | `yes`    | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`                           | `pass`         | 36 suites / 419 tests passed                             |
| OpenAPI generation       | `yes`    | `corepack pnpm nx run poms-api:openapi`                                                           | `pass`         | 新 route / DTO 已生成                                    |
| Generated client         | `yes`    | `corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` | `pass`         | 新 generated client 已同步                               |
| Admin build              | `yes`    | `corepack pnpm nx build poms-admin`                                                               | `pass`         | 确认 generated client 不破坏当前前端                     |
| Admin tests              | `yes`    | `corepack pnpm nx test poms-admin --runInBand`                                                    | `pass`         | 7 suites / 22 tests passed                               |
| Migration / schema check | `no`     | N/A                                                                                               | `not-required` | 不改 persistence                                         |
| Diff hygiene             | `yes`    | `git diff --check`                                                                                | `pass`         | 仅有既有 CRLF normalization warning，无 whitespace error |

## 9. 例外与风险

| Exception ID               | Level | Scope                | Approved By | Cleanup Owner                | Cleanup Due        | Notes                                                                 |
| -------------------------- | ----- | -------------------- | ----------- | ---------------------------- | ------------------ | --------------------------------------------------------------------- |
| `EX19-E1-PRESIGNING-ENTRY` | `low` | 签约前完整工作区入口 | `Codex`     | `FE-09 / L1 workspace owner` | 后续 L1 工作区切片 | 当前 L1 六工作区未前端化，guidance 可返回禁用原因，不伪造签约前详情页 |
| `EX19-E1-HANDOVER-ENTRY`   | `low` | 移交工作区入口       | `Codex`     | `FE-07 / L3 workspace owner` | 后续 L3 工作区切片 | 当前 L3 工作区未前端化，guidance 可返回禁用原因，不伪造移交详情页     |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-21`
- Conditions:
  1. 本片可进入实现。
  2. 先更新 route inventory，再新增 controller route / DTO / contract。
  3. 不新增 DDL。
  4. 若实现中需要完整工作流引擎、ProjectTimeline 或 BidProcess 事实，应停止并拆后续切片，不得在本片扩大范围。

## 11. G3 / G4 收口

- Gate Status: `Done`
- Closed By: `Codex`
- Closed At: `2026-04-21`
- Delivered:
  1. 新增 `GET /projects/{projectId}/workspace-guidance`，controller 仅委派 `ProjectQueryService.getProjectWorkspaceGuidance`。
  2. 新增 `ProjectWorkspaceGuidanceView` / `ProjectWorkspaceEntryView` / `ProjectWorkspaceBasisSummary` shared contract、API DTO、OpenAPI schema 和 generated client。
  3. 后端统一输出阶段 / 状态中文标签、当前重点、当前缺口、下一步、责任归口、阻断原因、依据快照和推荐入口可用性 / 禁用原因。
  4. 签约前与移交工作区仍作为显式禁用入口返回，不伪造尚未接入的 L1 / L3 事实源。
  5. `FE-16C` 的事实源 blocker 已解除，可重新刷新 G1 后进入前端实现。
- Validation:
  1. `corepack pnpm nx lint poms-api` passed。
  2. `corepack pnpm nx build poms-api` passed。
  3. `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project` passed，36 suites / 419 tests。
  4. `corepack pnpm nx run poms-api:openapi` passed。
  5. `corepack pnpm nx run shared-api-client:generate` passed。
  6. `corepack pnpm nx run shared-api-client:check` passed。
  7. `corepack pnpm nx lint poms-admin` passed。
  8. `corepack pnpm nx lint admin-data-access` passed。
  9. `corepack pnpm nx build poms-admin` passed。
  10. `corepack pnpm nx test poms-admin --runInBand` passed，7 suites / 22 tests。
  11. `git diff --check` passed，仅有既有 CRLF normalization warning。
