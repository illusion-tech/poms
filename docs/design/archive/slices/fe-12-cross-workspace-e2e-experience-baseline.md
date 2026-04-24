# FE-12 前端跨工作区入口链、权限、E2E 与体验收口实施基线包

- Gate Status: `Pass`
- Parent: Phase 2 frontend workspace
- Owner: `Codex`
- Slice Type: `frontend-only / governance validation`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-12`

## 1. 范围

- 本次目标:
  1. 把 `FE-06 ~ FE-11` 已交付页面串成一条可验证的项目级连续工作区入口链。
  2. 验证登录后从菜单、项目列表、项目详情按钮、工作区首页 entry、工作区 nav 和页面内 action link 进入，而不是只验证 URL 直达。
  3. 覆盖 admin / viewer / anonymous 三类关键权限路径：可进入、禁用提示、route guard 拒绝和 login returnUrl。
  4. 覆盖 `L1` 签约前、`L3` 合同承接 / 冻结、`L4` 经营读取、`L5` 提成解释 / 结算 / 操作之间的关键解释链路。
  5. 增加至少一组移动视口 / 响应式 smoke 与 role-based locator 检查，确保主工作区入口和关键页在窄屏下仍可进入、可读、可返回。
- 本次明确不做:
  1. 不新增、修改或删除 public API route、shared contract、OpenAPI schema、generated client 或 persistence。
  2. 不新增新页面，不改变 `FE-06 ~ FE-11` 已冻结的信息架构。
  3. 不重写业务权限模型、后端角色种子或 seeder 业务事实。
  4. 不做全站视觉回归，不引入截图基线系统；本片只做项目工作区主链路的浏览器级 smoke / journey。
- 下游可依赖的交付边界:
  1. 项目工作区与提成工作区关键入口均有登录后真实入口链 E2E 证据。
  2. 受限用户对财务、提成治理、最终结算、规则解释、冻结绑定、操作页的拒绝访问有浏览器级证据。
  3. `L1` 签约前三页、`L3` 合同承接 / 冻结、`L4` 经营总览 / 偏差风险、`L5` 阶段解释 / 最终结算 / 规则解释 / 操作页之间的关键跳转有证据。
  4. 移动视口下工作区首页、签约前主线和提成解释页至少有可进入、可读、可返回的 smoke 证据。
- 不允许下游依赖的留白:
  1. 不允许把本片视为全部页面的像素级视觉评审。
  2. 不允许把前端隐藏入口当作权限证明；敏感页必须验证直接 URL 被 guard 拦截。
  3. 不允许通过本地常量或测试专用文案伪造业务事实；断言必须来自已存在页面和 seeded 数据。

## 2. 正式输入

| Input Type          | Document / Source                                              | Section / Anchor     | Status   | Notes                                                  |
| ------------------- | -------------------------------------------------------------- | -------------------- | -------- | ------------------------------------------------------ |
| Governance baseline | `fe-00-phase2-frontend-workspace-governance-baseline.md`       | 全文                 | Pass     | 冻结前端执行线的 G1 / G3 / G4 规则                     |
| Earlier E2E slice   | `fe-05-frontend-workspace-e2e-permission-baseline.md`          | 全文                 | Done     | 第一批 `L4/L5` E2E 与权限矩阵基线                      |
| L5 pages            | `fe-06-final-settlement-rule-explanation-frontend-baseline.md` | 全文                 | Done     | 最终结算 / 规则解释读取页                              |
| L3 pages            | `fe-07-contract-handover-workspace-frontend-baseline.md`       | 全文                 | Done     | 合同承接工作区                                         |
| L3 pages            | `fe-08-commission-freeze-binding-frontend-baseline.md`         | 全文                 | Done     | 冻结与责任边界读取页                                   |
| L1 pages            | `fe-09-pre-signing-workspace-frontend-baseline.md`             | 全文                 | Done     | 签约前主线入口                                         |
| L1 pages            | `fe-10-technical-cost-workspace-frontend-g3-g4-closeout.md`    | 全文                 | Local G4 | 技术与成本读取页；本治理批次需提交后进入 FE-12 实现    |
| L1 pages            | `fe-11-bid-pricing-workspace-frontend-g3-g4-closeout.md`       | 全文                 | Done     | 招投标 / 商务竞标、报价与毛利评审读取页                |
| Route guard         | `fe-16d-project-route-guard-browser-validation-baseline.md`    | 全文                 | Done     | 项目页 route guard、viewer/admin/anonymous 浏览器矩阵  |
| Shared UI baseline  | `fe-17-project-management-primeng-table-g3-g4-closeout.md`     | 全文                 | Done     | PrimeNG / shared workspace UI 约束                     |
| Shared UI baseline  | `fe-18-project-context-workspace-component-baseline.md`        | 全文                 | Done     | 项目上下文与工作区共享组件                             |
| Shared UI baseline  | `fe-20-l4-l5-read-page-fact-grid-baseline.md`                  | 全文                 | Done     | L4 / L5 事实栅格与反馈组件                             |
| Runtime route fact  | `apps/poms-admin/src/app.routes.ts`                            | project / commission | Fact     | 当前前端 route guard 与内部路由矩阵                    |
| Runtime E2E fact    | `apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts`      | 全文                 | Fact     | 当前 smoke 已覆盖部分 direct URL 与权限拒绝            |
| Runtime E2E fact    | `apps/poms-admin-e2e/src/project-workspace.journey.spec.ts`    | 全文                 | Fact     | 当前 journey 已覆盖项目列表、详情、工作区、L1/L3/L4/L5 |

## 3. 本次 SSOT

| Concern           | SSOT                                              | Implementation Rule                                                        |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| 项目主上下文      | `/projects/:id/workspace` + `ProjectDetailView`   | 所有跳转必须保留同一 `projectId`，不跨项目拼接路径                         |
| 工作区入口可用性  | `ProjectWorkspaceGuidanceView.recommendedEntries` | 首页 entry 是否可进入、禁用原因和显示文案以后端 guidance 为准              |
| 路由权限          | `apps/poms-admin/src/app.routes.ts`               | E2E 只验证已实现 route guard，不在测试里重新定义权限                       |
| 页面解释事实      | 既有 generated-client-backed view                 | 断言页面真实事实、gap、阻断和下一步，不断言测试专用隐藏字段                |
| 用户入口          | 菜单 / 列表按钮 / 详情按钮 / 首页 entry / nav     | 每类主入口至少覆盖一个真实点击链路；direct URL 只作为补充                  |
| 受限访问          | `permissionGuard` + access page                   | viewer / anonymous 需要验证 URL、returnUrl 和“无权访问”业务中文            |
| 响应式 / 可访问性 | Playwright viewport + role-based locator          | 移动视口下仍使用 role / heading / link / button 定位，不依赖脆弱 CSS 路径  |
| Generated client  | 当前已生成客户端                                  | 本片不触碰 OpenAPI 或 generated client；若发现缺口，派生后端 / contract 片 |

## 4. 命令与接口边界

| Route / Page                                 | Expected Entry Evidence                          | Guard / Permission                                                                      | Design Source       | Result |
| -------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------- | ------ |
| `/projects`                                  | 菜单“项目管理”                                   | `project:read`                                                                          | `FE-16D`            | Frozen |
| `/projects/:id`                              | 项目列表“详情”按钮                               | `project:read`                                                                          | `FE-16B` / `FE-16D` | Frozen |
| `/projects/:id/workspace`                    | 项目列表“工作区”按钮、详情页“项目工作区”按钮     | `project:read`                                                                          | `FE-01` / `FE-16C`  | Frozen |
| `/projects/:id/workspace/pre-signing`        | 工作区首页“签约前主线” entry、工作区 nav         | `project:read`                                                                          | `FE-09`             | Frozen |
| `/projects/:id/workspace/technical-cost`     | 工作区首页“技术与成本” entry、签约前页 action    | `project:read`                                                                          | `FE-10`             | Frozen |
| `/projects/:id/workspace/bid-commercial`     | 工作区首页“招投标 / 商务竞标” entry、签约前页    | `project:read`                                                                          | `FE-11`             | Frozen |
| `/projects/:id/workspace/pricing-margin`     | bid-commercial 页 action、工作区首页 entry       | `project:read`                                                                          | `FE-11`             | Frozen |
| `/projects/:id/workspace/contract-handover`  | 工作区首页“合同承接” entry、工作区 nav           | `project:read`                                                                          | `FE-07`             | Frozen |
| `/projects/:id/workspace/operating-overview` | 工作区首页“经营总览” entry、L5 页面 action       | `project:read + contract:finance:manage`                                                | `FE-02` / `FE-05`   | Frozen |
| `/projects/:id/workspace/variance-risk`      | 工作区首页“偏差与风险” entry                     | `project:read + contract:finance:manage`                                                | `FE-02` / `FE-05`   | Frozen |
| `/projects/:id/commission/freeze-binding`    | commission nav                                   | `project:read + commission:assignments:manage`                                          | `FE-08`             | Frozen |
| `/projects/:id/commission/gate-overview`     | 工作区首页“提成阶段解释” entry、operation button | `project:read + contract:finance:manage`                                                | `FE-03`             | Frozen |
| `/projects/:id/commission/final-settlement`  | 工作区首页 / rule-explanation / commission nav   | `project:read + commission:payouts:manage`                                              | `FE-06`             | Frozen |
| `/projects/:id/commission/rule-explanation`  | 工作区首页 / final-settlement / commission nav   | `project:read + commission:payouts:manage`                                              | `FE-06`             | Frozen |
| `/projects/:id/commission/operations`        | 工作区首页“提成操作” entry、L5 页面 action       | `project:read + commission:rule-versions:manage + commission:calculations:manage + ...` | `FE-01` / `FE-17`   | Frozen |

### 4.1 公共路由补充信息

- Canonical inventory document: `N/A`
- Canonical route(s): `N/A`
- Current implemented route(s): `N/A`
- Inventory status: `N/A`
- Route governance source: `N/A`
- Blocker / exception: `N/A`

本片只验证前端内部路由和浏览器入口，不触及 public API route surface。

## 5. 读侧边界

| Query / View                          | Consumer                                     | Fields / Evidence                                  | Filter / Sort | Permission Boundary          | Design Source      | Result |
| ------------------------------------- | -------------------------------------------- | -------------------------------------------------- | ------------- | ---------------------------- | ------------------ | ------ |
| `ProjectWorkspaceGuidanceView`        | workspace shell / home / E2E entry selection | `recommendedEntries`、禁用原因、下一步、责任归口   | `N/A`         | `project:read`               | `FE-16C` / `EX-19` | Frozen |
| `ProjectPreSigningOverview`           | pre-signing page                             | 当前阶段、阻断原因、签约前候选工作区、就绪承接 gap | `N/A`         | `project:read`               | `FE-09`            | Frozen |
| `ProjectTechnicalCostWorkspaceView`   | technical-cost page                          | 技术结论、范围、风险、成本、税务口径、缺包 gap     | `N/A`         | `project:read`               | `FE-10` / `EX-26`  | Frozen |
| `ProjectBidCommercialWorkspaceView`   | bid-commercial page                          | 竞标形态、材料、结果、阻断、下一步                 | `N/A`         | `project:read`               | `FE-11` / `EX-27`  | Frozen |
| `ProjectPricingMarginWorkspaceView`   | pricing-margin page                          | 报价、成本引用、回款、毛利判断、签约就绪承接       | `N/A`         | `project:read`               | `FE-11` / `EX-28`  | Frozen |
| Contract handover read views          | contract-handover page                       | 合同集合、移交基线、回款初始化、阻断事项           | `N/A`         | `project:read`               | `FE-07` / `EX-08`  | Frozen |
| L4 operating / variance read views    | operating-overview / variance-risk pages     | 当前状态、缺口、下一步、偏差风险                   | `N/A`         | `contract:finance:manage`    | `FE-02` / `EX-13`  | Frozen |
| L5 commission read views              | gate / final / rule pages                    | gate 结论、最终结算状态、规则解释、阻断与依据链    | `N/A`         | finance / payout manage 权限 | `FE-03` / `FE-06`  | Frozen |
| Commission operation read/write views | commission operations page                   | 计算结果、发放记录、调整记录、阶段解释返回         | `N/A`         | commission governance manage | `FE-17`            | Frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source  | Check Result |
| ----- | --------- | ------------------- | -------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | 本片不改 persistence | N/A          |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | N/A    |

## 7. 一致性结论

- Document -> code: `FE-06 ~ FE-11` 页面均已落地；`FE-12` 只统一验证跨页链路、权限和体验回归，不改变页面语义。
- ADR-015 inventory -> route: `N/A`，不触及 public API route。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: 不涉及 command。
- Query -> view: E2E 断言必须来自当前页面消费的 query view 或 business gap，不写测试专用假文案。
- Guard / permission: route guard 矩阵以 `app.routes.ts` 为事实；viewer direct URL 拒绝必须有浏览器证据。
- OpenAPI / generated client: 不改；若实施中发现缺失字段或接口，不在前端补假数据，派生后端 / contract 治理切片。

## 8. 测试与校验

| Check                            | Required    | Command / Evidence                                                                                                                                                                                       | Result  | Gap / Reason                                 |
| -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------- |
| Diff hygiene                     | Yes         | `git diff --check`                                                                                                                                                                                       | Pending | `G3` / `G4` 都需要                           |
| Markdown format                  | Yes         | `corepack pnpm run format:md:check`                                                                                                                                                                      | Pending | 本片含治理文档                               |
| Admin lint                       | Yes         | `corepack pnpm nx lint poms-admin`                                                                                                                                                                       | Pending | 若只改 E2E 也需确认前端工程无新增 lint drift |
| Admin build                      | Yes         | `corepack pnpm nx build poms-admin`                                                                                                                                                                      | Pending | 确认 route / template 未因引用变化破坏       |
| Admin unit tests                 | Conditional | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes.spec.ts` 或相关 touched specs                                                                                                | Pending | 若触及 route / component / shared UI 必跑    |
| E2E smoke + journey              | Yes         | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts` | Pending | 本片核心证据                                 |
| Mobile viewport smoke            | Yes         | 在 `project-workspace.journey.spec.ts` 或独立 spec 中覆盖至少一个 mobile viewport 项目工作区主链路                                                                                                       | Pending | 不做像素截图基线                             |
| OpenAPI generation / client diff | No          | `N/A`                                                                                                                                                                                                    | N/A     | 不改 public API / contract                   |
| Migration / schema check         | No          | `N/A`                                                                                                                                                                                                    | N/A     | 不改 persistence                             |

## 9. 新增 / 调整测试点

| Test Target                         | Required Assertion                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `project-workspace.journey.spec.ts` | admin 从“项目管理”菜单、项目列表、项目详情按钮进入项目工作区                               |
| `project-workspace.journey.spec.ts` | admin 从工作区首页进入 `pre-signing`、`technical-cost`、`bid-commercial`、`pricing-margin` |
| `project-workspace.journey.spec.ts` | admin 从 `bid-commercial` 进入 `pricing-margin`，从 L5 页面返回 L4 / operation             |
| `project-workspace.journey.spec.ts` | admin 覆盖 `contract-handover` 和 `freeze-binding` 两条 L3 链路                            |
| `project-workspace.journey.spec.ts` | viewer 可进项目列表 / 详情 / 工作区，但无法进入财务、提成治理和 payout 受限页              |
| `project-workspace.smoke.spec.ts`   | anonymous 直接访问项目列表 / 工作区保留 returnUrl                                          |
| mobile viewport E2E                 | 工作区首页 entry、工作区 nav、关键返回按钮在窄屏下仍可用                                   |
| route / access unit tests           | 若本片调整 route guard 或 access page，补对应 unit 断言                                    |

## 10. 例外与风险

| Exception ID                 | Level | Scope                     | Approved By | Cleanup Owner | Cleanup Due           | Notes                                                                            |
| ---------------------------- | ----- | ------------------------- | ----------- | ------------- | --------------------- | -------------------------------------------------------------------------------- |
| `FE12-E1-G4-DOCS-SAME-BATCH` | low   | `EX-26` / `FE-10` G4 留痕 | `Codex`     | `Codex`       | FE-12 G2 前或同批提交 | `EX-26` / `FE-10` G4 close-out 已本地补齐；进入 FE-12 实现前必须随本基线一起提交 |

风险:

1. E2E 断言过度绑定具体布局类名会在 UI 组件化后变脆，实施时优先使用 role、heading、link、button 和业务文本。
2. 如果 seeder 缺少某阶段事实，页面应断言业务 gap，而不是在测试里伪造“已完成”事实。
3. 移动视口 smoke 只证明关键链路可用，不等同于完整视觉验收；若发现明显布局问题，应派生 UI 修复片或在本片 G3 checkpoint 记录 drift。

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-25`
- Conditions:
  1. `FE-12` 可以进入 `Doing`，但需先提交或同批提交 `EX-26` / `FE-10` 的 G4 close-out 文档与本基线。
  2. 本片不新增后端 API、generated client、migration 或业务权限模型。
  3. 实施时以现有 `project-workspace.smoke.spec.ts` / `project-workspace.journey.spec.ts` 为主，优先补缺口，不新建重复 suite。
  4. 若发现接口或事实源缺口，停止前端伪造并派生后端 / contract 治理切片。
