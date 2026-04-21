# FE-16B 项目详情业务化与动作守卫纠偏实施基线

- Gate Status: `Pass`
- Parent: `FE-16`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-21`
- Refresh Basis: `EX-18 G4 close-out 2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-16B`

## 1. 范围

- 本次目标:
  1. 将 `/projects/:id` 详情页从旧 `ProjectSummary` 消费方式改为正式 `ProjectDetailView`。
  2. 用用户能理解的中文展示项目主体、当前阶段、负责人 / 归属组织、合同摘要、审批摘要、确认状态和可用业务动作。
  3. 将详情页上的“进入工作区”“编辑基本信息”“提成相关入口”等动作改为由后端 `allowedActions` 控制。
  4. 将 `ProjectStore.selectedProject` 的详情态收口到 `ProjectDetailView | null`，避免详情页继续拿列表摘要当详情事实。
  5. 处理 `PATCH /projects/{id}` 仍返回 `ProjectSummary` 的运行态差异，更新后必须重新拉取详情或保持详情态不被摘要降级。
- 本次明确不做:
  1. 不新增或修改 public API route、OpenAPI path 或后端 controller。
  2. 不修改 `ProjectDetailView` shared contract、DTO 或后端 query 实现。
  3. 不在前端本地推导“下一步动作”“是否阻断”“能否进入下游”等业务结论。
  4. 不重做项目工作区首页的连续工作引导，该范围归属 `FE-16C`。
  5. 不收口全局路由守卫和浏览器权限矩阵，该范围归属 `FE-16D`。
  6. 不伪造投标事实。`EX18-E1-BID-SUMMARY` 尚未关闭前，投标摘要只能表达“暂未接入正式事实源”。
- 下游可依赖的交付边界:
  1. `GET /projects/{id}` 已返回正式 `ProjectDetailView`。
  2. `FE-16B` 完成后，项目详情页不再以 `ProjectSummary` 作为详情事实源。
  3. 详情页动作入口必须以 `ProjectDetailView.allowedActions` 为准，不再静态展示。
- 不允许下游依赖的留白:
  1. `BidProcess` 详情事实源仍未形成，本片不能补算或伪造投标状态。
  2. 对象数据范围与直接路由访问仍以后端校验为权威，前端路由级验证留给 `FE-16D`。
  3. 本片不提供完整的下一步工作建议，连续工作引导留给 `FE-16C`。

## 2. 正式输入

| Input Type        | Document / Source                                                          | Section / Anchor                                    | Status  | Notes                                                                    |
| ----------------- | -------------------------------------------------------------------------- | --------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| Business design   | `docs/design/phase2-user-task-map.md`                                      | `§4`、`§5`                                          | active  | 冻结销售、商务、财务、负责人和管理层在项目详情页的主要任务诉求           |
| Business design   | `docs/design/project-lifecycle-design.md`                                  | `§5`、`§6`                                          | active  | 冻结正式项目阶段和状态语义，不回退到 legacy pipeline 说法                |
| Query boundary    | `docs/design/query-view-boundary-design.md`                                | `§5.1 / ProjectDetailView`                          | active  | 冻结详情视图字段、摘要对象、`summarySnapshotId` 与 `allowedActions`      |
| Authorization     | `docs/design/business-authorization-matrix.md`                             | `§3`、`§5.1`、`§5.10`、`§5.13`                      | active  | 冻结平台权限与业务对象动作授权分工，按钮显隐必须以对象动作边界为准       |
| Corrective source | `docs/design/fe-16-project-management-frontend-corrective-checkpoint.md`   | `§3`、`§7`                                          | active  | 冻结项目管理前端纠偏原则和“用户可见内容只说业务中文”约束                 |
| Backend baseline  | `docs/design/ex-18-project-detail-view-action-boundary-baseline.md`        | `G4 close-out`                                      | done    | `ProjectDetailView`、OpenAPI、generated client 与 route inventory 已回写 |
| Historical G1     | `docs/design/fe-16b-project-detail-business-actions-readiness-baseline.md` | full document                                       | history | 记录 `EX-18` 前的 Block 结论，当前不再作为实现基线                       |
| Runtime fact      | `libs/shared/api-client/api/project.service.ts`                            | `projectControllerGetById`                          | fact    | generated client 已返回 `ProjectDetailView`                              |
| Runtime fact      | `libs/admin/data-access/src/lib/project/project.store.ts`                  | `selectedProject` / `loadProject` / `updateProject` | fact    | 当前 store 仍声明为 `ProjectSummary`，本片必须修正                       |
| Runtime fact      | `apps/poms-admin/src/app/features/project/project-detail.ts`               | template / actions                                  | fact    | 当前页面仍是基础字段 + 静态按钮，需改为业务详情视图                      |

## 3. 本次 SSOT

| Concern              | SSOT                                                             | Implementation Rule                                                             |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Detail view contract | `ProjectDetailView` from generated client                        | 详情页和 `selectedProject` 必须消费正式详情视图，不再把 `ProjectSummary` 当详情 |
| Business semantics   | `ProjectDetailView.stageSummary` + `project-lifecycle-design.md` | 用户看到业务阶段、状态、阻断原因和更新时间，不显示内部枚举原值                  |
| Action authorization | `ProjectDetailView.allowedActions`                               | 工作区、编辑、提成入口等按钮只按后端动作边界展示                                |
| Contract summary     | `currentContractSummary`                                         | 只展示合同事实摘要，不在前端重算签约结论或金额口径                              |
| Approval summary     | `currentApprovalSummary`                                         | 展示审批摘要快照元数据和结论，不重新裁剪审批链                                  |
| Confirmation summary | `currentConfirmationSummary`                                     | 无确认记录时显示业务中文空态，不暴露 `null` 或内部字段名                        |
| Bid summary          | `currentBidSummary`                                              | `not_configured` 只显示“投标详情暂未接入正式事实源”，不得制造投标结论           |
| Update flow          | `PATCH /projects/{id}` + refetch detail                          | 更新基本信息成功后重新加载 `ProjectDetailView`，避免摘要响应覆盖详情态          |
| User language        | FE-16 corrective checkpoint                                      | 页面不出现 `workspace`、`gate`、`allowedActions`、`snapshot` 等用户难懂词       |

## 4. 命令与接口边界

| Route / API                                                 | Consumer                           | Request                         | Response                     | Guard / Permission                            | Result                          |
| ----------------------------------------------------------- | ---------------------------------- | ------------------------------- | ---------------------------- | --------------------------------------------- | ------------------------------- |
| `GET /projects/{id}` / `projectControllerGetById`           | `ProjectStore.loadProject`、详情页 | path `id`                       | `ProjectDetailView`          | 后端 `project:read` + 对象可见性              | `aligned`                       |
| `PATCH /projects/{id}` / `projectControllerUpdateBasicInfo` | 详情页编辑基本信息                 | `UpdateProjectBasicInfoRequest` | `ProjectSummary`             | 后端 `project:write` + 对象动作授权待持续收口 | `aligned-with-refresh-required` |
| `/projects/:id`                                             | Angular detail route               | route param `id`                | 页面消费 `ProjectDetailView` | 当前路由级 guard 收口留给 `FE-16D`            | `in-scope-page`                 |
| `/projects/:id/workspace`                                   | 工作区入口按钮                     | route navigation                | N/A                          | 按 `allowedActions` 显隐入口                  | `button-scope-only`             |
| `/projects/:id/commission/operations`                       | 提成入口按钮                       | route navigation                | N/A                          | 按 `allowedActions` 显隐入口                  | `button-scope-only`             |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{id}`、`PATCH /projects/{id}`
- Current implemented route(s): `GET /projects/:id`、`PATCH /projects/:id`
- Inventory status:
  - `GET /projects/{id}` 已由 `EX-18` 回写为 `ProjectDetailView` 实现态。
  - 本片不新增 route surface。
- Route governance source: `ADR-015` + `EX-18`
- Blocker / exception:
  - 无本片 route blocker。
  - `EX18-E1-BID-SUMMARY` 继续限制投标摘要的表达范围。

## 5. 读侧边界

| Query / View                                   | Consumer        | Required Fields                                                                                                                                                                                    | Display Rule                            | Result              |
| ---------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------- |
| `ProjectDetailView`                            | `/projects/:id` | 主体字段、owner、org、stageSummary、currentBidSummary、currentContractSummary、currentApprovalSummary、currentConfirmationSummary、summarySnapshotId、projectionLevel、allowedActions、generatedAt | 作为详情页唯一业务事实源                | `aligned`           |
| `ProjectDetailView.allowedActions`             | 详情页动作区    | `view-project-workspace`、`edit-project-basic-info`、`manage-project-commission` 等对象动作                                                                                                        | 控制按钮显隐，不展示内部动作 key        | `aligned`           |
| `ProjectDetailView.stageSummary`               | 当前阶段区      | 阶段、状态、阻断原因、最后推进时间                                                                                                                                                                 | 用业务中文表达，不前端补算下一阶段      | `aligned`           |
| `ProjectDetailView.currentContractSummary`     | 合同摘要区      | 合同数量、生效合同、签署金额、合同状态                                                                                                                                                             | 无合同则显示“暂未形成正式合同”          | `aligned`           |
| `ProjectDetailView.currentApprovalSummary`     | 审批摘要区      | 快照 ID、结论、来源、生成时间                                                                                                                                                                      | 无摘要则显示“暂无审批摘要”              | `aligned`           |
| `ProjectDetailView.currentConfirmationSummary` | 确认摘要区      | 确认状态、确认时间、参与方摘要                                                                                                                                                                     | 无确认则显示“暂未形成确认记录”          | `aligned`           |
| `ProjectDetailView.currentBidSummary`          | 投标摘要区      | `bidStatus`、更新时间                                                                                                                                                                              | `not_configured` 只显示正式事实源未接入 | `exception-limited` |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result                           |
| ----- | --------- | ------------------- | ------------------- | -------------------------------------- |
| `N/A` | `N/A`     | `N/A`               | `N/A`               | 本片为 frontend-only，不触达持久化结构 |

## 7. 一致性结论

- Document -> code:
  - `EX-18` 已完成后端详情视图。
  - 当前前端详情页与 store 仍停留在旧 `ProjectSummary` 消费方式，属于本片需要关闭的 implementation drift。
- ADR-015 inventory -> route:
  - `GET /projects/{id}` 和 `PATCH /projects/{id}` route path 已对齐。
  - 本片不新增 route surface。
- Entity -> contract:
  - 本片不改 entity / shared contract。
  - `ProjectDetailView` 已由 `EX-18` 进入 shared contract 与 generated client。
- Route -> command:
  - `GET /projects/{id}` 可直接消费。
  - `PATCH /projects/{id}` 返回摘要，前端必须在成功后重新加载详情。
- Query -> view:
  - 详情页只能投影 `ProjectDetailView`。
  - 不允许用 `stage/status/allowedActions` 在前端本地推导复杂业务结论。
- Guard / permission:
  - 本片收口详情页动作按钮的 `allowedActions` 显隐。
  - 路由级守卫、菜单入口、直接 URL 和浏览器矩阵留给 `FE-16D`。
- OpenAPI / generated client:
  - 已具备 `ProjectDetailView`，本片预期不再运行 OpenAPI 生成。

## 8. 测试与校验要求

### 8.1 本次 G1 refresh 校验

| Check                            | Required | Command / Evidence | Result         | Gap / Reason                             |
| -------------------------------- | -------- | ------------------ | -------------- | ---------------------------------------- |
| Lint                             | `no`     | N/A                | `not-required` | docs-only G1 refresh                     |
| Build                            | `no`     | N/A                | `not-required` | 未改运行时代码                           |
| Unit tests                       | `no`     | N/A                | `not-required` | 未改运行时代码                           |
| API / integration tests          | `no`     | N/A                | `not-required` | 不改后端                                 |
| E2E                              | `no`     | N/A                | `not-required` | 浏览器级权限验证归属 `FE-16D`            |
| OpenAPI generation / client diff | `no`     | N/A                | `not-required` | `EX-18` 已完成 generated client          |
| Migration / schema check         | `no`     | N/A                | `not-required` | frontend-only                            |
| Diff hygiene                     | `yes`    | `git diff --check` | `pass`         | 2026-04-21 已通过，仅有既有 CRLF warning |

### 8.2 后续实现 G3 必跑

| Check            | Required Command                               | Notes                                          |
| ---------------- | ---------------------------------------------- | ---------------------------------------------- |
| Admin lint       | `corepack pnpm nx lint poms-admin`             | 页面实现变更必跑                               |
| Admin build      | `corepack pnpm nx build poms-admin`            | 校验 generated client 与 Angular template 类型 |
| Admin unit tests | `corepack pnpm nx test poms-admin --runInBand` | 必须覆盖详情视图、动作显隐和编辑刷新           |
| Data-access lint | `corepack pnpm nx lint admin-data-access`      | `ProjectStore` 类型变更必跑                    |
| Diff hygiene     | `git diff --check`                             | 保持文档与代码无空白问题                       |

### 8.3 后续实现新增 / 调整测试点

| Test Target                               | Required Assertion                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `project-detail.spec.ts`                  | 渲染 `ProjectDetailView` 的阶段、合同、审批、确认摘要，不显示原始内部 key        |
| `project-detail.spec.ts`                  | `allowedActions` 缺少编辑动作时不显示编辑入口                                    |
| `project-detail.spec.ts`                  | `allowedActions` 缺少提成动作时不显示提成入口                                    |
| `project-detail.spec.ts`                  | `currentBidSummary.bidStatus = not_configured` 时显示业务中文空态                |
| `project.store.spec.ts` 或现有 store 测试 | `updateProject` 成功后重新加载详情，`selectedProject` 不被 `ProjectSummary` 降级 |

## 9. 例外与风险

| Exception ID           | Level | Scope            | Approved By | Cleanup Owner                                       | Cleanup Due          | Notes                                                                                                                   |
| ---------------------- | ----- | ---------------- | ----------- | --------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `FE16B-E1-BID-SUMMARY` | `E1`  | 项目详情投标摘要 | `Codex`     | `BidProcessDetailView / presigning workspace owner` | 后续投标过程详情切片 | 继承 `EX18-E1-BID-SUMMARY`。当前无正式 `BidProcess` query，本片只能渲染“投标详情暂未接入正式事实源”，不得伪造投标结论。 |

- 风险:
  1. 当前 `/projects/:id` route 尚无最终浏览器权限矩阵验证，必须在 `FE-16D` 关闭。
  2. `PATCH /projects/{id}` 返回 `ProjectSummary`，若实现时直接写回 `selectedProject`，会再次造成详情态降级。
  3. 详情页如果为了“显得完整”本地拼接下一步建议，会越过 `FE-16C` 和 query/view 边界。

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-21`
- Conditions:
  1. `FE-16B` 可以进入前端实现。
  2. 实现必须先把 `ProjectStore.selectedProject` 改为 `ProjectDetailView | null`，并处理更新后详情重新加载。
  3. 项目详情页必须只消费 `ProjectDetailView` 和 `allowedActions`，不得本地推导业务结论。
  4. 用户可见文案必须使用业务中文，不展示内部枚举、英文术语或实现说明。
  5. 若实现中发现 `ProjectDetailView` 缺少详情页必需事实，停止前端兜底，重新拆后端 query / contract 切片。
  6. 路由 guard、菜单入口、直接 URL 和浏览器权限验证仍由 `FE-16D` 收口。

## 11. G3 / G4 关闭结论

- Gate Status: `Done`
- Closed By: `Codex`
- Closed At: `2026-04-21`
- Delivered:
  1. `ProjectStore.selectedProject` 已从 `ProjectSummary` 收口为 `ProjectDetailView`，`updateProject` 成功后会重新加载详情，避免 `PATCH /projects/{id}` 的摘要响应降级详情态。
  2. `/projects/:id` 详情页已按 `ProjectDetailView` 重做，展示负责人、归属组织、阶段、阻断原因、合同情况、审批依据、确认情况和投标空态。
  3. 详情页“项目工作区 / 提成操作 / 编辑基本信息”已按 `allowedActions` 显隐，并在方法层避免未授权动作导航。
  4. 编辑基本信息只提交项目名称与客户名称；项目名称会 trim，客户名称允许清空为 `null`。
  5. 新增 `project-detail.spec.ts` 覆盖详情事实展示、内部 key 不外露、动作显隐与编辑提交；新增 `project-store.spec.ts` 覆盖更新后重拉详情。
- Validation:

| Check                      | Command / Evidence                             | Result         | Notes                                                                                                                 |
| -------------------------- | ---------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| Admin lint                 | `corepack pnpm nx lint poms-admin`             | `pass`         | 首轮曾因 app 测试直接依赖 generated client 触发 module-boundary error；已通过 data-access re-export `ProjectApi` 修复 |
| Admin build                | `corepack pnpm nx build poms-admin`            | `pass`         | Angular template 与 generated `ProjectDetailView` 类型校验通过                                                        |
| Admin unit tests           | `corepack pnpm nx test poms-admin --runInBand` | `pass`         | 7 suites / 22 tests                                                                                                   |
| Data-access lint           | `corepack pnpm nx lint admin-data-access`      | `pass`         | `ProjectStore` 与 data-access public export 通过                                                                      |
| OpenAPI / generated client | N/A                                            | `not-required` | 本片不改 contract / route surface                                                                                     |
| Migration / schema check   | N/A                                            | `not-required` | frontend-only                                                                                                         |
| Browser E2E                | N/A                                            | `not-required` | 路由 guard、菜单入口、直接 URL 与浏览器权限矩阵归属 `FE-16D`                                                          |

- Drift classification:
  1. `new-real-drift` 已修复：前端详情态仍使用 `ProjectSummary`，现在已收口为 `ProjectDetailView`。
  2. `new-real-drift` 已修复：详情页动作按钮原先静态展示，现在由 `allowedActions` 控制。
  3. `new-real-drift` 已修复：`updateProject` 原先会把 `ProjectSummary` 写回 `selectedProject`，现在改为更新后重新加载详情。
  4. `tool-noise` 未新增：本片未运行 OpenAPI generation，也未触碰 generated client。
- Downstream:
  1. `FE-16C` 可以继续基于 `ProjectDetailView` 已可用的项目上下文推进工作区首页纠偏。
  2. `FE-16D` 仍需统一验证菜单入口、直接路由、按钮守卫和浏览器权限矩阵。
