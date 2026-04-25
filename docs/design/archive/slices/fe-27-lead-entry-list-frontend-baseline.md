# FE-27 线索登记与线索列表前端入口实施基线

- Gate Status: `Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `frontend + navigation-config`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-27`
- Upstream Runtime Inputs:
  - `EX-31` G4: `Lead` 最小事实源、读写 API 与 generated client
  - `EX-32` G4: `Lead -> Project` 转化命令和 Project 来源映射，供后续 `FE-28` 使用
  - `FE-16A` / `FE-16D`: 项目管理入口、业务中文、route guard 和权限可见性基线

## 1. 范围

本次目标:

1. 新增销售线索前端入口 `/leads`，服务“先登记线索，再推进到正式 Project”的签约前起点。
2. 新增 `LeadStore`，只消费 generated `LeadApi` 和 DTO，不新造 wire contract。
3. 新增线索列表 / 登记 / 有效化 / 关闭的最小 UI，基于 `LeadListView`、`LeadDetailView`、`CreateLeadRequest`、`UpdateLeadRequest`、`QualifyLeadRequest` 和 `CloseLeadRequest`。
4. 对齐 PrimeNG / Poseidon demo 现有模式：表格采用 `p-table` caption / global filter / column filter / clear filter / paginator / rowHover / scroll，表单采用 PrimeNG Dialog、InputText、Textarea、Select、Button、Tag、Message。
5. 补齐登录后入口链：`/leads` route guard、sidebar 动态菜单项和项目管理页进入线索登记的按钮 / 链接。
6. 保留 `Project` 转化体验给 `FE-28`，本片只让销售能创建、查看、确认有效和关闭线索。

本次明确不做:

1. 不实现 `Lead -> Project` 前端转化动作，不调用 `leadControllerConvertToProject`。
2. 不修改 `Lead` 后端 API、持久化结构、OpenAPI route surface 或命令语义。
3. 不把项目列表“新建项目”入口彻底改为线索引导；该正式替换归属 `FE-28`。
4. 不新增完整 CRM 字段、预计金额、客户主数据或销售评分。
5. 不关闭父级 `EX17-E2-LEAD-BOOTSTRAP`；最终浏览器证据和直接 Project create UX 清理归属 `FE-29`。

## 2. 正式输入

| Input Type                | Document / Source                                                                  | Status    | Notes                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------- |
| Lead route governance     | `docs/design/archive/slices/ex-30-lead-route-governance-baseline.md`               | `Done`    | 冻结 `/leads` API、Lead 状态和 Project bootstrap 关闭路径。             |
| Lead runtime              | `docs/design/archive/slices/ex-31-lead-minimal-fact-source-g4-closeout.md`         | `Done`    | `LeadApi`、DTO、权限和 generated client 已提交。                        |
| Convert runtime           | `docs/design/archive/slices/ex-32-lead-to-project-conversion-g4-closeout.md`       | `Done`    | 本片不消费转化命令，但 `FE-28` 可依赖。                                 |
| Frontend entry baseline   | `docs/design/archive/slices/fe-16a-project-list-entry-create-frontend-baseline.md` | `Done`    | 项目管理入口必须是业务推进入口，不回退到旧 pipeline。                   |
| Route guard baseline      | `docs/design/fe-16d-project-route-guard-browser-validation-baseline.md`            | `Done`    | 直接路由必须用业务权限 guard，菜单权限不能替代 route guard。            |
| Table / form UI baseline  | `apps/poms-admin/src/app/demo/uikit/tabledemo.ts` + Poseidon form/dialog patterns  | `Fact`    | 表格和筛选交互不得用原生控件或 Tailwind-only 拼装替代 PrimeNG 组件。    |
| Navigation runtime fact   | `apps/poms-api/src/app/features/navigation/navigation.constants.ts`                | `Current` | 当前缺 `/leads` 动态菜单项和 `nav:leads:view`；本片必须显式补齐或留痕。 |
| Shared permission SSOT    | `libs/shared/contracts/src/lib/shared-contracts.ts`                                | `Current` | 当前已有 `lead:read/write`，但缺导航可见性权限 `nav:leads:view`。       |
| Generated client fact     | `libs/shared/api-client/api/lead.service.ts`                                       | `Current` | 已含 list / get / create / update / qualify / close / convert methods。 |
| Admin data-access exports | `libs/admin/data-access/src/index.ts`                                              | `Current` | 已导出 `LeadApi` 与 Lead DTO 类型；仍缺正式 `LeadStore`。               |

## 3. 本次 SSOT

| Concern               | SSOT                                               | Implementation Rule                                                                           |
| --------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Lead list data        | `LeadListView[]` from `LeadApi.leadControllerList` | 前端不得从 Project 反推线索，也不得本地伪造状态。                                             |
| Lead detail data      | `LeadDetailView`                                   | 列表行打开详情 / 操作面板时按 id 读取详情，展示 converted summary 但不提供转 Project 动作。   |
| Lead create form      | `CreateLeadRequest`                                | 只提交 `leadCode`、`leadName`、`customerName`、`sourceChannel`、`ownerOrgId`、`ownerUserId`。 |
| Lead state actions    | `qualifyLead` / `closeLead`                        | `registered` 可确认有效或关闭；`qualified` 可关闭；`converted` 只读；关闭需原因。             |
| Route guard           | `lead:read` / `lead:write`                         | `/leads` 直接访问必须要求 `lead:read`；创建 / 有效化 / 关闭按钮按 `lead:write` 显隐。         |
| Navigation visibility | `nav:leads:view` + backend navigation SSOT         | sidebar 菜单项由 `NAVIGATION_TREE` 输出，不在前端静态硬编码绕过动态导航事实源。               |
| Table UX              | UIKit table demo                                   | 使用 `p-table` caption、global filter、column filter、clear、paginator、rowHover、scroll。    |
| Visual consistency    | Poseidon + PrimeNG                                 | 页面使用现有 layout、PrimeNG 组件和共享 feedback；不新增一套 Tailwind-only 控件体系。         |
| Product copy          | 用户业务中文                                       | 不出现 API、DTO、wire contract、bootstrap 等实现词。                                          |

## 4. 路由、导航与权限边界

| Surface              | Path / Key                | Guard / Permission                 | Implementation Decision                                             |
| -------------------- | ------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| Admin route          | `/leads`                  | `lead:read`                        | 新增 route，直接 URL 可访问且受 `permissionGuard` 保护。            |
| Dynamic navigation   | `nav-leads` / `leads`     | `nav:leads:view`                   | 新增 backend navigation SSOT 项，放在“业务管理”下，靠近“项目管理”。 |
| Create button        | `/leads` page             | `lead:write`                       | 有权限显示“登记线索”，无权限展示只读说明。                          |
| Qualify / close      | row action / detail panel | `lead:write`                       | 只按状态展示可执行动作；状态不允许时不显示或禁用并给业务原因。      |
| Project entry bridge | `/projects` page          | `lead:write` for lead-create entry | 项目管理页新增“登记线索”入口；不在本片替换“新建项目”的最终语义。    |
| Static fallback menu | `AppMenu.#staticFallback` | best-effort fallback               | 可补 `/leads` fallback 项，但真实登录后以 dynamic navigation 为准。 |

Public API route impact:

- No new HTTP route or backend command route.
- Shared permission vocabulary will add `nav:leads:view`; this requires OpenAPI / generated client sync because permission enums are exposed in API schemas.

## 5. 页面与组件边界

| Component / Store  | Location                                                            | Responsibility                                                                               |
| ------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `LeadStore`        | `libs/admin/data-access/src/lib/lead/lead.store.ts`                 | list/detail/create/update/qualify/close signals and async methods around generated `LeadApi` |
| `LeadList`         | `apps/poms-admin/src/app/features/lead/lead-list.ts`                | `/leads` primary page: summary, table, filter, create dialog, detail/action panel            |
| `appRoutes`        | `apps/poms-admin/src/app.routes.ts`                                 | `/leads` route with `permissionGuard` and `lead:read`                                        |
| `AppMenu` fallback | `apps/poms-admin/src/app/layout/components/app.menu.ts`             | fallback menu includes leads only for local static fallback consistency                      |
| Navigation SSOT    | `apps/poms-api/src/app/features/navigation/navigation.constants.ts` | dynamic menu emits `/leads` item                                                             |
| Permission SSOT    | `libs/shared/contracts/src/lib/shared-contracts.ts`                 | add `nav:leads:view` metadata and generated client propagation                               |

UI requirements:

1. 表格首屏必须展示线索编号、线索标题、客户、状态、来源、负责人、主责组织、更新时间和继续处理入口。
2. 列表 summary 可展示总数、待确认有效、已有效、已转项目、已关闭。
3. 创建表单使用 PrimeNG dialog / inputs，必填项为线索编号、线索标题、客户名称。
4. 状态用 `p-tag`，动作使用 PrimeNG Button / Menu，不直接堆多个原生按钮。
5. 空态、加载态、错误态使用现有 `WorkspaceFeedback` 或 PrimeNG Message，不写 raw spinner。

## 6. 测试与校验要求

| Check                      | Required Command                                                                                                                             | Notes                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Admin route unit           | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes.spec.ts`                                                         | 新增 `/leads` route guard 断言。                                        |
| Admin feature unit         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`                                                                  | 覆盖列表展示、创建按钮权限、状态动作显隐和请求 body。                   |
| Admin data-access unit     | `corepack pnpm nx test admin-data-access --runInBand --testPathPatterns=lead.store` if target exists, otherwise poms-admin focused mock test | 覆盖 store 对 generated `LeadApi` 的调用和 reload。                     |
| API navigation tests       | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=navigation`                                                                   | 覆盖 dynamic nav 输出 `/leads`。                                        |
| API lint                   | `corepack pnpm nx lint poms-api`                                                                                                             | 因本片触碰 backend navigation config。                                  |
| Admin lint                 | `corepack pnpm nx lint poms-admin`                                                                                                           | Angular template / TS 检查。                                            |
| Admin build                | `corepack pnpm nx build poms-admin`                                                                                                          | PrimeNG imports、lazy route 和 generated types 编译。                   |
| OpenAPI / generated client | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check`   | 因新增 `nav:leads:view` permission enum。                               |
| Browser E2E                | `deferred to FE-29` unless selectors or route flow prove risky                                                                               | 本片以 unit / route / build 收口；登录后完整菜单 journey 归属 `FE-29`。 |
| Markdown format            | `corepack pnpm run format:md:check`                                                                                                          | 本片触碰 docs。                                                         |
| Diff hygiene               | `git diff --check`                                                                                                                           | 收口前必跑。                                                            |

## 7. 例外与风险

| Exception ID                       | Level | Scope                                                       | Approved By                | Cleanup Owner | Cleanup Due | Notes                                                                                  |
| ---------------------------------- | ----- | ----------------------------------------------------------- | -------------------------- | ------------- | ----------- | -------------------------------------------------------------------------------------- |
| `FE27-E1-NO-CONVERT-ACTION`        | `E1`  | 本片不提供转 Project 按钮，即使 `EX-32` runtime 已存在。    | `Solo worktree checkpoint` | `Codex`       | `FE-28` G4  | 防止把登记 / 有效化入口和转项目体验混成一个不可验证切片。                              |
| `FE27-E2-BROWSER-JOURNEY-DEFERRED` | `E1`  | 本片不以 Playwright 完整登录菜单 journey 作为 G4 必要条件。 | `Solo worktree checkpoint` | `Codex`       | `FE-29` G4  | `FE-27` 仍需 route/unit/build 证据；最终菜单/按钮/直达 URL 浏览器矩阵在 `FE-29` 完成。 |

Risk controls:

1. 若不新增 `nav:leads:view`，动态菜单无法真实展示线索入口，FE-29 的“从菜单进入”会变成假验证。
2. 若 `/leads` route 只靠菜单显隐保护，直接 URL 会绕过入口控制；必须使用 `permissionGuard + lead:read`。
3. 若线索状态动作在前端本地猜测过多，容易和后端状态机漂移；按钮显隐只能做用户体验优化，后端仍是最终 guard。
4. 若使用自绘 table / select / dialog，会再次引入 FE-17 已治理过的项目管理 UI 漂移。

## 8. G1 结论

- Gate Status: `Pass`
- 结论: `FE-27` 具备可编码输入，可进入实现。
- Public API route impact: `None`
- Shared contract impact: `nav:leads:view` permission enum extension, expected and must be regenerated.
- Required trace before Done: tracker row、G3 checkpoint、validation evidence、G4 close-out evidence。
