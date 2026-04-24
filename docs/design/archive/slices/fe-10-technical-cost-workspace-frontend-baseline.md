# FE-10 技术确认与前期成本估算工作区前端实现基线包

* Gate Status: `Blocked`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `frontend-dominant / blocked-by-missing-query-contract`
* G1 Reviewer: `Codex`
* G1 Date: `2026-04-24`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-10`
* Required Upstream Slice: `EX-26`

## 1. Scope

* FE-10 原始目标:
  1. 在签约前主线下新增 `技术与成本` 工作区前端页面。
  2. 展示技术可行性结论、范围边界、排除项、前提条件、风险与保留意见。
  3. 展示前期成本清单、税务成本 / 税负影响、成本估算版本记录。
  4. 让项目级上下文、后续投标 / 报价引用链和当前阻断项可见。
* 本次 G1 实际结论:
  1. `FE-10` 不能直接进入前端实现。
  2. 当前仓内没有可供前端消费的 `技术与成本` generated client、query view、DTO、public route 或稳定后端事实源。
  3. `ProjectWorkspaceGuidanceView` 只能解释当前阶段、缺口、下一步和推荐入口；不能替代技术与成本工作区的正式事实。
  4. `ContractReadinessDetail` 只解释签约就绪末端承接包；不能替代技术确认、范围快照、前期成本估算和税务成本事实源。
* 本次明确不允许:
  1. 不允许在前端用静态文案或本地常量伪造技术结论、成本清单、税务成本或版本链。
  2. 不允许复用执行期 `project-cost` 的实际成本接口来冒充签约前估算成本。
  3. 不允许把 `readiness.items` 当作完整 L1 工作流事实源。
  4. 不允许仅靠 FE-09 的 disabled entry 打开一个空白详情页。

## 2. Formal Inputs

| Input Type       | Document / Source                                                                        | Section / Anchor             | Status   | Notes                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- | ---------------------------- | -------- | ------------------------------------------------------- |
| Business roadmap | `docs/design/phase2-experience-optimization-roadmap.md`                                  | `L1-S2`                      | accepted | FE-10 目标是技术确认与前期成本估算工作区                |
| IA design        | `docs/design/phase2-presigning-workspace-information-architecture.md`                    | `§5.3`、`§7`                 | review   | 工作区必须承接技术判断、范围、风险、成本清单            |
| Workspace design | `docs/design/phase2-presigning-technical-cost-workspace.md`                              | `§3`、`§4`、`§6`、`§7`       | review   | 详细定义技术与成本工作区结构                            |
| Handoff map      | `docs/design/phase2-presigning-workspace-handoff-map.md`                                 | `§4.2`、`§5`、`§6`           | review   | 技术与成本输出进入投标、报价、签约就绪和项目总览        |
| Templates        | `docs/design/phase2-presigning-workspace-templates.md`                                   | `§3`、`§4`、`§5`、`§6`、`§7` | review   | 成本清单、税务成本、风险、阻断项、关键结论模板          |
| Prior frontend   | `docs/design/archive/slices/fe-09-presigning-entry-workspace-frontend-g3-g4-closeout.md` | full document                | done     | FE-09 提供总入口、读取模式和 E2E 入口验证方式           |
| Runtime fact     | `apps/poms-admin/src/app/features/project/project-pre-signing-overview.ts`               | `technical-cost` entry       | fact     | 当前卡片为 disabled，原因是正式事实源尚未形成           |
| Runtime fact     | `apps/poms-api/src/app/features/project/project-query.service.ts`                        | `buildWorkspaceEntries`      | fact     | 当前只提供 `pre-signing-workspace` 总入口               |
| Runtime fact     | `libs/shared/api-client/api`、`libs/shared/api-client/model`                             | generated client files       | fact     | 未发现 technical-cost / feasibility / cost-estimate API |

## 3. Current SSOT And Gap

| Concern             | Current SSOT / Fact                              | FE-10 Need                                                | Result              |
| ------------------- | ------------------------------------------------ | --------------------------------------------------------- | ------------------- |
| 工作区内部路由      | FE-09 冻结 `/projects/:id/workspace/pre-signing` | 候选 `/projects/:id/workspace/pre-signing/technical-cost` | Candidate only      |
| 连续上下文摘要      | `ProjectWorkspaceGuidanceView`                   | 可继续消费当前阶段 / 缺口 / 下一步 / 责任归口             | Available           |
| 技术可行性结论      | N/A                                              | 结论、理由、前置条件、是否允许进入后续阶段                | Missing             |
| 范围边界快照        | N/A                                              | 范围内、范围外、前提条件 / 依赖条件                       | Missing             |
| 风险与保留意见      | N/A                                              | 风险分类、等级、影响范围、是否阻断                        | Missing             |
| 前期成本清单        | N/A                                              | 成本项、金额、依据、不确定性、责任角色                    | Missing             |
| 税务成本 / 税负影响 | N/A                                              | 税务口径、税务成本、风险、是否影响毛利                    | Missing             |
| 成本估算版本链      | N/A                                              | 版本号、更新时间、更新人、变更原因、总额变化摘要          | Missing             |
| 投标 / 报价引用链   | N/A                                              | 后续 FE-11 可稳定引用的成本估算版本和范围快照             | Missing             |
| 权限边界            | `project:read` for read-only workspace           | 读取权限可沿用，但写动作权限需 EX-26 冻结                 | Partially available |

## 4. Required Upstream Backend Slice

新增 `EX-26`：`签约前技术与成本事实源与读取投影落地`。

`EX-26` 至少需要冻结并实现：

1. public route inventory row 和 canonical grammar。
2. 技术可行性、范围快照、风险 / 保留意见、前期成本清单、税务成本、成本估算版本的 shared contract / DTO。
3. query view，例如候选 `ProjectTechnicalCostWorkspaceView`；正式名称由 `EX-26 G1` 冻结。
4. money / currency / tax semantics。当前 review 记录仍有多币种与汇率口径 open finding，不能由前端临时决定。
5. version-chain semantics。成本估算版本不得覆盖历史版本。
6. guard / permission boundary。读取可候选 `project:read`，创建或替换技术与成本事实必须另行冻结写权限。
7. OpenAPI / generated client / backend tests。

## 5. Candidate Frontend Boundary After Unblock

`EX-26` 完成前，以下内容只作为 FE-10 的候选边界，不可作为编码输入：

| Area           | Candidate Boundary                                                     | Status  |
| -------------- | ---------------------------------------------------------------------- | ------- |
| Frontend route | `/projects/:id/workspace/pre-signing/technical-cost`                   | blocked |
| Page component | `ProjectTechnicalCostWorkspace`                                        | blocked |
| Store method   | `ProjectWorkspaceStore.loadTechnicalCostWorkspace(projectId)`          | blocked |
| Store state    | `technicalCostWorkspace`、`loadingTechnicalCost`、`technicalCostError` | blocked |
| Entry behavior | FE-09 `technical-cost` card becomes routerLink when data source exists | blocked |
| First UX scope | read / explain only; no create / replace / approve actions             | blocked |

## 6. Review Carryovers

| Carryover                                  | Source                                                      | FE-10 Impact                                                | Required Handling                                                                    |
| ------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Multi-currency and exchange-rate semantics | `archive/reviews/phase2-review-record-round1.md` / `R1-001` | 前期成本估算与报价承接可能涉及本位币、含税 / 未税和汇率快照 | `EX-26` 必须冻结 money / currency / tax semantics，或明确 MVP 只支持单币种并记录例外 |
| Controlled rollback / re-estimation        | `archive/reviews/phase2-review-record-round3.md` / `R3-001` | 范围重大变更或报价否决后需回到技术与成本重估                | `EX-26` 至少要决定是否返回回退状态、失效结论和待重估责任人                           |
| FE09 detail workspace deferred             | `FE09-E1`                                                   | FE-10 是首个详细工作区补位片                                | FE-10 不能继续只展示 disabled card，必须由 `EX-26` 提供正式事实源                    |
| FE09 readiness partial coverage            | `FE09-E3`                                                   | readiness 不覆盖技术 / 成本事实                             | FE-10 禁止从 readiness 反推技术与成本结论                                            |

## 7. Validation Requirements After Unblock

FE-10 进入实现并到 G3 时至少需要：

| Check                      | Required Command / Evidence                                                                                                                      | Notes                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Diff hygiene               | `git diff --check`                                                                                                                               | 必跑                                                             |
| Admin data-access lint     | `corepack pnpm nx lint admin-data-access`                                                                                                        | 新增 store method / API injection 时必跑                         |
| Admin lint                 | `corepack pnpm nx lint poms-admin`                                                                                                               | 页面 / route / template 必跑                                     |
| Admin build                | `corepack pnpm nx build poms-admin`                                                                                                              | 校验 generated DTO、standalone imports 和 template 类型          |
| Page unit test             | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-technical-cost`                                                         | 覆盖事实显示、缺口、错误、禁用入口转可用                         |
| Store unit test            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`                                                        | 覆盖 load / 404 gap / 403 error / success                        |
| Route / shell unit test    | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`、`project-pre-signing-overview`                                     | 覆盖 route guard 和 FE-09 entry card                             |
| Browser journey            | `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | 覆盖登录后从项目详情 -> 工作区 -> 签约前 -> 技术与成本，不只 URL |
| OpenAPI / generated client | `corepack pnpm nx run shared-api-client:check`                                                                                                   | 若 `EX-26` 同批未提交生成产物，FE-10 必须确认 generated client   |

## 8. G1 Decision

* Gate Status: `Blocked`
* Can enter frontend implementation: `no`
* Can mark tracker `Doing`: `no`
* Tracker action:
  1. 新增 `EX-26` 作为 `FE-10` 前置切片。
  2. 将 `FE-10` 标记为 `Blocked`，Gate 记录为 `G1 04-24`。
* Unblock conditions:
  1. `EX-26` 完成 G1/G3/G4，或至少提供可冻结的 public API / DTO / generated client 输入。
  2. `ProjectTechnicalCostWorkspaceView` 或等价 query view 名称、字段、权限与 money semantics 冻结。
  3. FE-10 内部 route `/projects/:id/workspace/pre-signing/technical-cost` 经 G1 再确认。
  4. FE-09 `technical-cost` entry 可从 disabled card 切到真实 routerLink。
