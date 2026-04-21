# FE-16B 项目详情业务化与动作守卫纠偏 G1 Readiness 基线

- Gate Status: `Block`
- Parent: `FE-16`
- Owner: `Codex`
- Slice Type: `frontend-only / readiness`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-16B`

> 2026-04-21 update: `EX-18` 已完成并解除本 readiness blocker。本文件保留为历史阻断证据，不作为 `FE-16B` 当前实现基线；进入前端实现前需要基于 `ProjectDetailView` 重新刷新 `FE-16B` G1。

## 1. 范围

- 本次目标:
  1. 在进入详情页前端编码前，核查 `FE-16B` 是否已有可消费的正式读侧输入。
  2. 明确项目详情页不得继续以 `ProjectSummary` 加本地静态文案替代 `ProjectDetailView`。
  3. 冻结前端本片的阻断结论，并派生后端前置切片。
- 本次明确不做:
  1. 不直接改动 `apps/poms-admin/src/app/features/project/project-detail.ts`。
  2. 不在前端本地拼装阶段摘要、合同摘要、审批 / 确认摘要或动作放行结论。
  3. 不把页面级 `project:write` 权限当成对象级 `allowedActions`。
  4. 不新增或修改 public API route surface。
- 下游可依赖的交付边界:
  1. `FE-16B` 当前不能进入前端编码。
  2. `ProjectDetailView` 后端 query / shared contract / generated client 是 `FE-16B` 的硬前置。
  3. `FE-16B` 后续只消费正式详情视图，不继续沿用 `ProjectSummary` 级详情。
- 不允许下游依赖的留白:
  1. 当前 `/projects/:id` 页面仍不能被视为稳定业务详情体验。
  2. 当前详情页按钮“项目工作区 / 提成操作 / 编辑”仍未按对象动作授权与状态前提收口。
  3. 当前 `GET /projects/:id` 返回 `ProjectSummary`，不包含正式详情所需的合同、审批、确认、摘要快照与动作边界。

## 2. 正式输入

| Input Type          | Document / Source                                                   | Section / Anchor                            | Status | Notes                                                                 |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------------- | ------ | --------------------------------------------------------------------- |
| Business design     | `docs/design/phase2-user-task-map.md`                               | `§4`、`§5`                                  | active | 项目详情必须围绕销售、商务、财务、负责人等真实任务链组织              |
| Business design     | `docs/design/project-lifecycle-design.md`                           | `§5`、`§6`                                  | active | 详情页必须表达正式项目主阶段，不回退到 legacy pipeline 阶段           |
| Query boundary      | `docs/design/query-view-boundary-design.md`                         | `§5.1 / ProjectDetailView`                  | active | `ProjectDetailView` 需要主体字段、阶段摘要、当前合同 / 审批 / 确认摘要、摘要快照和 `allowedActions` |
| Authorization       | `docs/design/business-authorization-matrix.md`                      | `§5.1`、`§5.2`                              | active | 查看项目详情、编辑项目与推进动作属于业务对象动作授权                  |
| Corrective source   | `docs/design/fe-16-project-management-frontend-corrective-checkpoint.md` | `§3`、`§7`                              | active | 明确前端不得本地补齐 `ProjectDetailView` 缺失字段                     |
| Runtime fact        | `apps/poms-api/src/app/features/project/project.controller.ts`       | `ProjectController.getById`                 | fact   | 当前 `GET /projects/:id` 返回 `ProjectSummary`                        |
| Runtime fact        | `libs/shared/contracts/src/lib/shared-contracts.ts`                 | `ProjectSummarySchema` / `ProjectListViewSchema` | fact   | 当前 shared contracts 不存在 `ProjectDetailViewSchema`                |
| Runtime fact        | `libs/admin/data-access/src/lib/project/project.store.ts`            | `selectedProject` / `loadProject`           | fact   | 当前前端 store 详情态为 `ProjectSummary`                              |
| Runtime fact        | `apps/poms-admin/src/app/features/project/project-detail.ts`         | template / actions                           | fact   | 当前页面展示基础字段、审计字段，并静态展示工作区 / 提成 / 编辑按钮    |

## 3. 本次 SSOT

| Concern                   | SSOT                                  | Implementation Rule                                                                 |
| ------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| Detail view contract      | `ProjectDetailView`                  | 前端详情页必须消费正式详情视图，不得以 `ProjectSummary` 加本地 helper 替代          |
| Business semantics        | `Project` 正式主阶段链               | 用户看到的是立项、范围、商务、签约、移交、执行、验收等业务阶段                     |
| Action authorization      | 对象级 `allowedActions`              | 编辑、推进、提成、工作区入口必须由对象动作边界和状态前提控制                        |
| Summary source            | 稳定 query / summary snapshot        | 合同、审批、确认、摘要快照不得由前端重算或裁剪                                      |
| User-facing language      | 业务中文表达规则                     | 页面文案只说人话，不暴露 `workspace`、`gate`、`allowedActions` 等内部词              |
| Route surface             | 现有 `GET /projects/{id}` route path | route path 可保持，response contract 需要由后端切片正式收口                         |

## 4. 命令与接口边界

| Route / Controller                         | Command / Service            | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source                         | Result    |
| ------------------------------------------ | ---------------------------- | ---------------------- | ----------------------- | ------------------ | ------------------------------------- | --------- |
| `GET /projects/{id}` / `ProjectController.getById` | `ProjectService.findById`    | path `id`              | 当前 `ProjectSummary`，目标 `ProjectDetailView` | `project:read` + 对象可见性待收口 | `query-view-boundary-design.md`       | `blocked` |
| `PATCH /projects/{id}` / `ProjectController.updateBasicInfo` | `ProjectService.updateBasicInfo` | `UpdateProjectBasicInfoRequest` | 当前 `ProjectSummary` | `project:write` + 对象动作授权待收口 | `business-authorization-matrix.md` | `blocked-for-detail-actions` |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{id}`、`PATCH /projects/{id}`
- Current implemented route(s): `GET /projects/:id`、`PATCH /projects/:id`
- Inventory status:
  - `PATCH /projects/{id}` 已有 inventory 行并与 path 对齐。
  - `GET /projects/{id}` 需要在后端前置切片中补正式详情 capability / response contract 记录。
- Route governance source: `ADR-015` + 后续 `EX-18`
- Blocker / exception: `ProjectDetailView` 尚未形成 shared contract / OpenAPI / generated client。

## 5. 读侧边界

| Query / View        | Consumer               | Fields                                                                 | Filter / Sort | Permission Boundary                         | Design Source                   | Result    |
| ------------------- | ---------------------- | ---------------------------------------------------------------------- | ------------- | ------------------------------------------- | ------------------------------- | --------- |
| `ProjectSummary`    | 当前项目详情页          | 基础项目字段、审计字段                                                  | N/A           | `project:read`                              | runtime fact                    | `insufficient` |
| `ProjectDetailView` | 目标项目详情页          | 主体字段、阶段摘要、当前投标摘要、当前合同摘要、当前审批 / 确认摘要、`summarySnapshotId`、`projectionLevel`、`allowedActions` | N/A           | 对象可见性 + 对象动作授权                   | `query-view-boundary-design.md` | `missing` |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | `N/A`               | 本片只做前端 G1 readiness，不直接落库       |

## 7. 一致性结论

- Document -> code: `new-real-drift`，设计要求 `ProjectDetailView`，当前实现仍为 `ProjectSummary` 级详情。
- ADR-015 inventory -> route: route path 基本符合 grammar，但 `GET /projects/{id}` 详情 capability / response contract 需要在后端切片正式登记。
- Migration -> entity: `N/A`。
- Entity -> contract: 当前 shared contract 没有 `ProjectDetailViewSchema`。
- Route -> command: `GET /projects/{id}` 仍走基础 `findById`，未接入详情聚合 query。
- Query -> view: `blocked`，前端无稳定详情视图可消费。
- Guard / permission: `blocked`，详情页按钮仍不能只依赖页面权限或静态展示。
- OpenAPI / generated client: `blocked`，当前 generated client 的 `projectControllerGetById` 返回 `ProjectSummary`。

## 8. 测试与校验

| Check                            | Required | Command / Evidence | Result         | Gap / Reason                       |
| -------------------------------- | -------- | ------------------ | -------------- | ---------------------------------- |
| Lint                             | `no`     | N/A                | `not-required` | readiness docs-only                |
| Build                            | `no`     | N/A                | `not-required` | 未改运行时代码                     |
| Unit tests                       | `no`     | N/A                | `not-required` | 未改运行时代码                     |
| API / integration tests          | `no`     | N/A                | `not-required` | 后端前置切片未开始                 |
| E2E                              | `no`     | N/A                | `not-required` | 浏览器验证归属后续 FE-16D          |
| OpenAPI generation / client diff | `no`     | N/A                | `not-required` | 本片不改 contract                  |
| Migration / schema check         | `no`     | N/A                | `not-required` | 本片不改持久化                     |
| Diff hygiene                     | `yes`    | `git diff --check` | `pass`         | 2026-04-21 已通过                  |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 本片不放行例外；直接阻断前端编码 |

## 10. G1 结论

- Gate Status: `Block`
- Approved By: `Codex`
- Approved At: `2026-04-21`
- Conditions:
  1. `FE-16B` 不进入前端实现。
  2. 新增后端前置切片 `EX-18`，先冻结并实现 `ProjectDetailView`、对象动作边界、OpenAPI 与 generated client。
  3. `EX-18` 完成后再刷新 `FE-16B` G1，并只按正式 `ProjectDetailView` 改造详情页。
