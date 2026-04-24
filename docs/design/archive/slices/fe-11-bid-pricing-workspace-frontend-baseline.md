# FE-11 招投标与报价评审承接前端实现基线包

* Gate Status: `Blocked`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `frontend-dominant / blocked-by-missing-query-contract`
* G1 Reviewer: `Codex`
* G1 Date: `2026-04-24`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-11`
* Required Upstream Slices: `EX-27`、`EX-28`

## 1. Scope

* FE-11 原始目标:
  1. 在签约前主线下新增 `招投标 / 商务竞标` 与 `报价与毛利评审` 的读取型工作区。
  2. 在同一项目上下文中解释竞标形态、当前阶段、决策、结果、报价、成本、回款条件与毛利判断。
  3. 承接 `FE-09` 签约前总入口与 `FE-10` 技术与成本版本包，并自然进入签约就绪。
* 本次 G1 实际结论:
  1. `FE-11` 不能直接进入前端实现。
  2. 当前仓内只有项目详情的 `currentBidSummary` 占位字段，后端实现固定返回 `bidStatus = not_configured`，没有正式 `BidProcess` 或项目级竞标工作区投影。
  3. `ContractReadinessDetail` 解释的是签约就绪承接包，不能替代报价与毛利评审工作区的当前报价、毛利判断、成本绑定、税务条件和回款条件事实。
  4. `CommercialReleaseBaselineSummary` 能表达商业放行基线摘要和差异复核状态，但当前只有 create / get by id / diff-history；缺少项目级 current pricing-margin workspace query，也缺少正式报价评审对象。
  5. `FE-10` 提供技术与成本输入，但不能被前端扩展成竞标结果或报价放行结论。
* 本次明确不允许:
  1. 不允许在前端用静态文案、本地常量或 `not_configured` 占位拼出竞标工作区。
  2. 不允许把 `ProjectTechnicalCostWorkspaceView` 的成本结论当作报价 / 毛利评审结论。
  3. 不允许只读取 `ContractReadinessDetail` 后反向推断报价评审页。
  4. 不允许新增前端 route 后展示“待接入”壳页冒充 FE-11 交付。

## 2. Formal Inputs

| Input Type       | Document / Source                                                     | Section / Anchor       | Status   | Notes                                                        |
| ---------------- | --------------------------------------------------------------------- | ---------------------- | -------- | ------------------------------------------------------------ |
| Business roadmap | `docs/design/phase2-experience-optimization-roadmap.md`               | `L1-S3`                | accepted | FE-11 目标是招投标与报价评审承接                             |
| IA design        | `docs/design/phase2-presigning-workspace-information-architecture.md` | `§5.4`、`§5.5`、`§7`   | review   | 定义竞标、报价、毛利与签约就绪的连续关系                     |
| Bid design       | `docs/design/phase2-presigning-bid-commercial-workspace.md`           | `§3`、`§4`、`§5`、`§7` | review   | 竞标形态、阶段、决策、材料、时间线和结果流转                 |
| Pricing design   | `docs/design/phase2-presigning-pricing-margin-workspace.md`           | `§3`、`§4`、`§5`、`§7` | review   | 报价摘要、成本绑定、回款条件、税务条件、毛利判断和放行结论   |
| Templates        | `docs/design/phase2-presigning-workspace-templates.md`                | `§5`、`§6`、`§7`       | review   | 风险、阻断、关键结论、成本、税务与报价模板                   |
| Prior frontend   | `FE-09`                                                               | G4                     | done     | 提供签约前总入口、入口链和 E2E 模式                          |
| Prior frontend   | `FE-10`                                                               | G3                     | review   | 提供技术与成本读取页和当前成本版本引用，等待同批 G4          |
| Existing backend | `EX-05` / `EX-15E1`                                                   | contract readiness     | done     | 提供商业放行基线和签约就绪承接包，但不是完整报价评审工作区   |
| Runtime fact     | `apps/poms-api/src/app/features/project/project-query.service.ts`     | `currentBidSummary`    | fact     | 当前竞标摘要固定为 `not_configured`                          |
| Runtime fact     | `libs/shared/contracts/src/lib/shared-contracts.ts`                   | project / readiness    | fact     | 缺少 bid workspace 和 pricing-margin workspace project query |

## 3. Current SSOT And Gap

| Concern            | Current SSOT / Fact                             | FE-11 Need                                                 | Result               |
| ------------------ | ----------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| 签约前总入口       | `FE-09` `/projects/:id/workspace/pre-signing`   | 可从入口进入竞标与报价页                                   | Available as shell   |
| 技术与成本输入     | `FE-10` / `ProjectTechnicalCostWorkspaceView`   | 报价 / 竞标可引用成本版本、范围、风险和税务成本            | Available after G4   |
| 竞标当前事实       | `ProjectDetailBidSummary` 占位字段              | 竞标形态、阶段、决策、材料齐备度、结果、阻断项、责任归口   | Missing              |
| 竞标多形态统一骨架 | N/A                                             | 公开招标 / 邀标 / 比选 / 商务竞标 / 竞争性谈判统一 view    | Missing              |
| 当前报价评审事实   | N/A                                             | 报价版本、含税 / 未税金额、税务条件、回款条件、毛利判断    | Missing              |
| 成本绑定关系       | `EX-26` current technical-cost package          | 报价必须显式引用成本版本与技术范围                         | Partially available  |
| 商业放行基线       | `CommercialReleaseBaselineSummary` by id        | 项目级 current pricing-margin workspace 和正式报价评审对象 | Partially available  |
| 签约就绪承接       | `ContractReadinessDetail` project current query | 报价放行后进入签约就绪                                     | Available downstream |
| 权限边界           | `project:read` / `project:write`                | read-only 工作区读取、后续写动作另行冻结                   | Partially available  |

## 4. Required Upstream Backend Slices

新增 `EX-27`：`签约前招投标 / 商务竞标事实源与读取投影落地`。

`EX-27` 至少需要冻结并实现：

1. public route inventory row 和 canonical grammar。
2. 竞标形态、阶段、决策、结果、材料 / 任务、时间线、阻断项、责任归口和 allowed actions 的 shared contract / DTO。
3. project-scoped current workspace query，例如候选 `ProjectBidCommercialWorkspaceView`。
4. 不投标 / 直接商务路径的显式状态，不允许前端靠缺数据推断“不适用”。
5. guard / permission boundary；首版读取候选 `project:read`，写动作另开或在 EX-27 G1 冻结。

新增 `EX-28`：`签约前报价与毛利评审事实源与读取投影落地`。

`EX-28` 至少需要冻结并实现：

1. public route inventory row 和 canonical grammar。
2. 报价评审、当前报价摘要、成本版本引用、税务条件、回款条件、毛利判断、放行结论和阻断项的 shared contract / DTO。
3. project-scoped current workspace query，例如候选 `ProjectPricingMarginWorkspaceView`。
4. 与 `ProjectTechnicalCostPackage`、`CommercialReleaseBaselineSummary`、`ContractReadinessDetail` 的引用边界。
5. summary snapshot / projection level / export policy 的承接规则，避免页面临时拼装审批摘要。

## 5. Candidate Frontend Boundary After Unblock

`EX-27` / `EX-28` 完成前，以下内容只作为 FE-11 候选边界，不可作为编码输入：

| Area                   | Candidate Boundary                                                    | Status  |
| ---------------------- | --------------------------------------------------------------------- | ------- |
| Bid route              | `/projects/:id/workspace/bid-commercial`                              | blocked |
| Pricing route          | `/projects/:id/workspace/pricing-margin`                              | blocked |
| Bid page component     | `ProjectBidCommercialWorkspace`                                       | blocked |
| Pricing page component | `ProjectPricingMarginWorkspace`                                       | blocked |
| Store method           | `loadBidCommercialWorkspace(projectId)`                               | blocked |
| Store method           | `loadPricingMarginWorkspace(projectId)`                               | blocked |
| Entry behavior         | FE-09 bid / pricing entries become routerLink when fact sources exist | blocked |
| First UX scope         | read / explain only; no bid decision or quote approval write actions  | blocked |

## 6. Review Carryovers

| Carryover                             | Source                  | FE-11 Impact                                             | Required Handling                                       |
| ------------------------------------- | ----------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `EX18-E1-BID-SUMMARY`                 | Project detail baseline | 项目详情竞标摘要仍是占位，不足以支持工作区               | `EX-27` 必须形成正式 project-scoped bid projection      |
| `FE16B-E1-BID-SUMMARY`                | Project detail frontend | 前端不能把详情页占位字段扩展成竞标工作区                 | FE-11 等 EX-27 后再实现                                 |
| `FE09-E3` readiness partial coverage  | FE-09 close-out         | readiness 只覆盖签约就绪末端，不覆盖竞标和报价评审全过程 | `EX-28` 必须提供报价 / 毛利专用投影                     |
| `EX26-E1` single currency first slice | EX-26 baseline          | 报价和毛利可能涉及多币种 / 汇率，不能由 FE-11 临时决定   | `EX-28` G1 决定首版金额 / 币种 / 税务口径或记录正式例外 |

## 7. Validation Requirements After Unblock

FE-11 进入实现并到 G3 时至少需要：

| Check                      | Required Command / Evidence                                                                                                                      | Notes                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Diff hygiene               | `git diff --check`                                                                                                                               | 必跑                                                              |
| Admin data-access lint     | `corepack pnpm nx lint admin-data-access`                                                                                                        | 新增 store method / API injection 时必跑                          |
| Admin lint                 | `corepack pnpm nx lint poms-admin`                                                                                                               | 页面 / route / template 必跑                                      |
| Admin build                | `corepack pnpm nx build poms-admin`                                                                                                              | 校验 generated DTO、standalone imports 和 template 类型           |
| Page unit tests            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-bid-commercial`、`project-pricing-margin`                               | 覆盖事实显示、缺口、错误、入口切换                                |
| Store unit tests           | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`                                                        | 覆盖 bid / pricing load、403/404/error、success                   |
| Route / shell unit test    | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`、`project-pre-signing-overview`                                     | 覆盖 route guard 和 FE-09 entry card                              |
| Browser journey            | `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | 覆盖登录后从项目详情 -> 工作区 -> 签约前 -> 竞标 / 报价，不只 URL |
| OpenAPI / generated client | `corepack pnpm nx run shared-api-client:check`                                                                                                   | 若 upstream 同批改动未提交，FE-11 必须确认 generated client       |

## 8. G1 Decision

* Gate Status: `Blocked`
* Can enter frontend implementation: `no`
* Can mark tracker `Doing`: `no`
* Tracker action:
  1. 新增 `EX-27` 作为竞标 / 商务竞标事实源前置切片。
  2. 新增 `EX-28` 作为报价 / 毛利评审事实源前置切片。
  3. 将 `FE-11` 标记为 `Blocked`，Gate 记录为 `G1 04-24`。
* Unblock conditions:
  1. `EX-27` 完成 G1/G3/G4，或至少提供可冻结的 bid-commercial public API / DTO / generated client 输入。
  2. `EX-28` 完成 G1/G3/G4，或至少提供可冻结的 pricing-margin public API / DTO / generated client 输入。
  3. FE-11 route、store selector、权限、入口链与 E2E baseline 经 G1 再确认。
