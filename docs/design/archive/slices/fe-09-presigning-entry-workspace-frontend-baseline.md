# FE-09 L1-S1 项目签约前总入口与连续上下文前端实现基线包

- Gate Status: `Pass`
- Parent: Phase 2 frontend workspace / `L1`
- Owner: `Codex`
- Slice Type: `frontend-dominant / existing-query-projection`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-09`

## 1. 范围

- 本次目标:
  1. 新增项目级签约前总入口内部路由 `/projects/:id/workspace/pre-signing`。
  2. 在现有项目工作区壳层中接入“签约前主线”入口，用户能从工作区导航 / 推荐入口进入，而不是只能直接输 URL。
  3. 页面默认回答“当前阶段 / 下一步 / 当前缺口 / 责任归口”，并展示统一阻断说明、签约前关键工作区入口和当前签约就绪承接状态。
  4. 前端优先消费现有 `ProjectWorkspaceGuidanceView`、`ProjectDetailView` 和 `ContractReadinessDetail` generated client DTO，不新造 wire contract。
  5. 仅允许对既有 `ProjectWorkspaceGuidanceView.recommendedEntries` 做 query projection 调整，把当前禁用的 `pre-signing-workspace` entry 改为可用路由；不新增 public API route、DTO 字段、OpenAPI schema 或 persistence。
- 本次明确不做:
  1. 不实现 `技术与成本`、`招投标 / 商务竞标`、`报价与毛利评审`、`签约就绪` 等详细工作区页面；这些继续归属 `FE-10` / `FE-11` 或后续 L1 子片。
  2. 不新增、修改或删除 contract-readiness public route surface。
  3. 不实现商业放行基线、差异复核、承接包初始化、报价或投标写动作。
  4. 不把对象详情页改造成签约前总览页；项目详情仍是对象事实页，签约前总入口归属项目工作区。
  5. 不在前端绕过后端 `recommendedEntries.enabled / disabledReason` 自行放宽入口可用性。
- 下游可依赖的交付边界:
  1. `/projects/:id/workspace/pre-signing` 内部路由、route guard、壳层导航 entry 和项目工作区推荐入口稳定。
  2. `ProjectWorkspaceStore` 可提供签约前总入口所需的 guidance + current contract readiness 读侧状态。
  3. FE-10 / FE-11 可复用本片的页面结构、入口卡、阻断说明和缺口表达模式继续铺开详细工作区。
- 不允许下游依赖的留白:
  1. 不得把 FE-09 当作 L1 六工作区全部完成证据。
  2. 未实现的详细工作区入口只能显示为待接入 / 禁用状态，不得跳到不存在页面。
  3. 若实现时发现 `ProjectWorkspaceGuidanceView` 与 `ContractReadinessDetail` 无法表达页面所需字段，必须停止并拆后端治理切片，不能在前端本地推导正式结论。

## 2. 正式输入

| Input Type          | Document / Source                                                              | Section / Anchor                                         | Status              | Notes                                                                |
| ------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------- | -------------------------------------------------------------------- |
| Business design     | `docs/design/phase2-experience-optimization-roadmap.md`                        | `L1-S1`                                                  | accepted            | 签约前总入口要显示当前阶段、下一步和阻断原因                         |
| Business design     | `docs/design/phase2-presigning-workspace-information-architecture.md`          | `§3`、`§4`、`§5.1`                                       | accepted            | 一个项目一个签约前工作区；所有工作区回答 4 个问题                    |
| Business design     | `docs/design/phase2-presigning-project-overview-workspace.md`                  | `§2`、`§3`、`§4`、`§6`、`§7`                             | accepted            | 项目总览是签约前主链默认首页，只做摘要、导航与统一解释               |
| Handoff design      | `docs/design/phase2-presigning-workspace-handoff-map.md`                       | `§3.3`、`§4.6`、`§5`                                     | accepted            | 项目总览横向承接摘要、下一步、阻断项、责任人与入口                   |
| Template design     | `docs/design/phase2-presigning-workspace-templates.md`                         | `§6`、`§7`、`§8`                                         | accepted            | 阻断项和关键结论摘要字段口径                                         |
| Frontend foundation | `docs/design/archive/slices/fe-01-project-workspace-shell-routing-baseline.md` | full document                                            | done                | 已有项目级 workspace shell 和内部路由模式                            |
| Guidance source     | `docs/design/archive/slices/ex-19-project-workspace-guidance-baseline.md`      | `EX19-E1-PRESIGNING-ENTRY`                               | done with exception | 当前签约前 entry 被禁用；FE-09 是 cleanup owner                      |
| Runtime fact        | `apps/poms-api/src/app/features/project/project-query.service.ts`              | `buildWorkspaceEntries`                                  | fact                | `pre-signing-workspace` 现在 `route = null`、`enabled = false`       |
| Runtime fact        | `libs/shared/api-client/api/contract-readiness.service.ts`                     | `contractReadinessControllerGetCurrentContractReadiness` | fact                | 已有 `GET /projects/{projectId}/contract-readiness` generated client |
| Runtime fact        | `apps/poms-admin/src/app.routes.ts`                                            | `/projects/:id/workspace` children                       | fact                | 可新增 `pre-signing` 子路由并复用 `project:read` guard               |

## 3. 本次 SSOT

| Concern                         | SSOT                                               | Implementation Rule                                                                                                                                |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 项目级主上下文                  | `/projects/:id/workspace/pre-signing`              | 签约前总入口在项目工作区内，不放回对象详情页或合同页                                                                                               |
| 当前阶段 / 缺口 / 下一步 / 责任 | `ProjectWorkspaceGuidanceView`                     | 页面只投影 guidance，不用前端 switch 重新生成业务结论                                                                                              |
| 工作区入口可用性                | `ProjectWorkspaceGuidanceView.recommendedEntries`  | 壳层导航和首页推荐入口以后端 entry 为准；前端不硬拼可用性                                                                                          |
| 签约就绪承接状态                | `ContractReadinessDetail`                          | 只读当前承接包状态、guard decision、阻断摘要、items 与 allowedActions                                                                              |
| 缺失承接包                      | 404 current readiness                              | 作为“尚未形成签约就绪承接包”的 gap 展示，不等同于页面错误                                                                                          |
| 内部路由命名                    | kebab-case route segment                           | 本片冻结 `/pre-signing`，后续详细页候选在其下继续扩展                                                                                              |
| 权限边界                        | route guard `project:read` + 后端 entry projection | 不把签约前只读入口提升到 `project:write`；写动作入口以后续子片判断                                                                                 |
| UI / component                  | shared workspace UI + PrimeNG / Poseidon patterns  | 使用 `ProjectContextHeader`、`WorkspaceCommandPanel`、`WorkspaceFactGrid`、`WorkspaceFeedback`、`WorkspaceActionLink`，不手写新 tab 或自绘按钮体系 |

## 4. 命令与接口边界

| Route / API                                    | Consumer                                         | Request          | Response                       | Guard / Permission     | Result                                     |
| ---------------------------------------------- | ------------------------------------------------ | ---------------- | ------------------------------ | ---------------------- | ------------------------------------------ |
| `/projects/:id/workspace/pre-signing`          | `ProjectPreSigningOverview`                      | route param `id` | page projection                | `project:read`         | frozen internal frontend route             |
| `GET /projects/{projectId}/workspace-guidance` | `ProjectWorkspaceStore.loadGuidance` / shell nav | path `projectId` | `ProjectWorkspaceGuidanceView` | backend `project:read` | existing route; projection update in scope |
| `GET /projects/{projectId}/contract-readiness` | `ProjectWorkspaceStore.loadPreSigningOverview`   | path `projectId` | `ContractReadinessDetail`      | backend `project:read` | existing route; read-only consumption      |
| `GET /projects/{id}`                           | `ProjectStore.loadProject`                       | path `id`        | `ProjectDetailView`            | backend `project:read` | context-only                               |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `GET /projects/{projectId}/workspace-guidance`
  - `GET /projects/{projectId}/contract-readiness`
  - `GET /projects/{id}`
- Current implemented route(s):
  - `GET /projects/:projectId/workspace-guidance`
  - `GET /projects/:projectId/contract-readiness`
  - `GET /projects/:id`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-19` + `EX-05` / `EX-15E1`
- Blocker / exception:
  - No public API route blocker at G1.
  - If implementation needs a new field on `ProjectWorkspaceGuidanceView` or `ContractReadinessDetail`, stop and open a backend governance slice before coding that field.

## 5. 读侧边界

| Query / View                   | Consumer                     | Required Fields                                                                                                                                                 | Display Rule                                                                             | Result                     |
| ------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- |
| `ProjectWorkspaceGuidanceView` | shell / pre-signing page     | `currentStageLabel`、`statusLabel`、`headline`、`currentFocus`、`currentGap`、`nextStep`、`ownerLabel`、`blockingReasons`、`basisSummary`、`recommendedEntries` | 作为签约前总入口的连续上下文事实源                                                       | frozen                     |
| `ProjectWorkspaceEntryView`    | shell nav / entry cards      | `key`、`label`、`description`、`route`、`enabled`、`disabledReason`、`actionKey`                                                                                | `pre-signing-workspace` route must be `/projects/:id/workspace/pre-signing` when enabled | projection update in scope |
| `ContractReadinessDetail`      | readiness summary section    | `packageStatus`、`guardDecision`、`currentEffectiveDecisionSummary`、`blockingReasonSummary`、`missingPrerequisiteCount`、`items`、`allowedActions`             | 解释当前是否具备签约就绪承接包；不执行初始化命令                                         | frozen existing DTO        |
| `ContractReadinessItem`        | blockers / checklist section | `label`、`summary`、`status`、`responsibleRole`、`navigationHint`、`sortOrder`                                                                                  | 以状态、责任角色和 navigation hint 展示缺口；不生成新业务结论                            | frozen existing DTO        |
| `ProjectDetailView`            | context header               | `id`、`projectCode`、`projectName`                                                                                                                              | 只作为项目上下文，不参与签约前判断推导                                                   | context-only               |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source                  | Check Result         |
| ----- | --------- | ------------------- | ------------------------------------ | -------------------- |
| `N/A` | `N/A`     | `N/A`               | frontend + existing query projection | 本片不改 persistence |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result         |
| ----- | --------------------- | --------------- | ------ | ------------------------- | -------------- |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | 本片不新增字段 |

## 7. 一致性结论

- Document -> code:
  - L1 设计要求项目总览横向承接摘要、阻断项、下一步和责任人；FE-09 只冻结总入口，不扩成六个详细工作区。
- ADR-015 inventory -> route:
  - 本片不新增 public API route；现有 guidance / readiness routes 均已在 inventory 中 aligned。
- Migration -> entity:
  - `N/A`，不改 DDL。
- Entity -> contract:
  - `N/A`，不改 shared contract / OpenAPI schema。
- Route -> command:
  - 本片不触发写命令；readiness 初始化、商业放行差异复核等命令均 out of scope。
- Query -> view:
  - `ProjectWorkspaceGuidanceView` 是连续上下文事实源；`ContractReadinessDetail` 只补签约就绪承接状态。
- Guard / permission:
  - 前端 route guard 使用 `project:read`；后端 query projection 继续用 `allowedActions` / permission 生成 entry enabled 与 disabledReason。
- OpenAPI / generated client:
  - 预期无 OpenAPI / generated client 变化；如变化，必须运行 `shared-api-client:check` 并解释原因。

## 8. 测试与校验要求

### 8.1 本次 G1 校验

| Check                  | Required | Command / Evidence | Result       | Gap / Reason                   |
| ---------------------- | -------- | ------------------ | ------------ | ------------------------------ |
| Diff hygiene           | yes      | `git diff --check` | pending      | G1 文档和 tracker 更新后执行   |
| Lint                   | no       | N/A                | not-required | 本次只冻结基线，不改运行时代码 |
| Build                  | no       | N/A                | not-required | 本次只冻结基线，不改运行时代码 |
| Unit tests             | no       | N/A                | not-required | 本次只冻结基线，不改运行时代码 |
| E2E                    | no       | N/A                | not-required | 运行时代码阶段执行             |
| OpenAPI / client check | no       | N/A                | not-required | G1 不改 contract               |

### 8.2 后续实现 G3 必跑

| Check                      | Required Command                                                                                                                                          | Notes                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Diff hygiene               | `git diff --check`                                                                                                                                        | 收口前必跑                                                          |
| API focused test           | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`                                                             | 覆盖 guidance entry 从 disabled 到 enabled 的投影调整               |
| API lint                   | `corepack pnpm nx lint poms-api`                                                                                                                          | 若触及 `project-query.service.ts` 必跑                              |
| Admin data-access lint     | `corepack pnpm nx lint admin-data-access`                                                                                                                 | 若 `ProjectWorkspaceStore` 增加 readiness 读取必跑                  |
| Admin unit tests           | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pre-signing`、`project-workspace.store`、`project-workspace-shell`、`app.routes` | 覆盖页面、store、壳层入口和 route guard                             |
| Admin lint                 | `corepack pnpm nx lint poms-admin`                                                                                                                        | Angular template / TS 检查                                          |
| Admin build                | `corepack pnpm nx build poms-admin`                                                                                                                       | 校验 standalone imports、PrimeNG modules 和 generated DTO 类型      |
| Browser journey            | `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts`          | 覆盖登录后从项目详情 / 工作区入口进入 pre-signing，并覆盖直接 route |
| OpenAPI / generated client | `corepack pnpm nx run shared-api-client:check`                                                                                                            | 仅当 OpenAPI 或 generated client 意外变化时必跑                     |

## 9. 例外与风险

| Exception ID                               | Level | Scope                                        | Approved By | Cleanup Owner          | Cleanup Due  | Notes                                                                                     |
| ------------------------------------------ | ----- | -------------------------------------------- | ----------- | ---------------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `FE09-E1-DETAIL-WORKSPACES-DEFERRED`       | `low` | L1 详细工作区页面                            | `Codex`     | `FE-10 / FE-11 owners` | 后续 L1 子片 | FE-09 只交付总入口、摘要和候选入口；未实现详细工作区必须显示禁用原因或待接入状态          |
| `FE09-E2-GUIDANCE-PROJECTION-IN-FE-SLICE`  | `low` | backend guidance entry projection            | `Codex`     | `FE-09 owner`          | FE-09 G4     | 为避免前端硬拼入口，本片允许调整既有 guidance query 输出；不得新增 public API / DTO / DDL |
| `FE09-E3-READINESS-PARTIAL-STAGE-COVERAGE` | `low` | `ContractReadinessDetail` 只覆盖签约就绪末端 | `Codex`     | `FE-10 / FE-11 owners` | 后续 L1 子片 | 当前 readiness query 不能替代技术、投标、报价等详细事实源；页面只用它解释签约就绪状态     |

- 风险:
  1. 若只新增前端 route 但不更新 backend guidance entry，用户仍无法从真实入口进入，只能直接 URL 访问。
  2. 若在前端本地构造 `pre-signing-workspace` 可用性，会违反 `EX-19` 后端 guidance SSOT。
  3. 若把 readiness items 当作完整 L1 工作流事实源，会掩盖 `FE-10` / `FE-11` 的详细事实缺口。
  4. 若为了“入口完整”跳转到未实现详细页，会制造新的死链。

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-24`
- Conditions:
  1. FE-09 可进入实现，但必须同时处理现有 guidance query 的 `pre-signing-workspace` projection，不允许前端硬拼入口。
  2. 冻结内部路由为 `/projects/:id/workspace/pre-signing`。
  3. 页面只消费 existing generated client DTO；新增 DTO / API 字段时必须暂停并拆后端治理切片。
  4. G3 必须证明登录后可从项目详情或工作区入口进入 pre-signing，不接受只验证直接 URL。
  5. FE-09 G4 不关闭 FE-10 / FE-11；详细工作区继续按 tracker 逐片推进。
