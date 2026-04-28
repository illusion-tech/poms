# FE-44 残余敏感字段投影与浏览器权限矩阵验证 G1 Baseline

- Task ID: `FE-44`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation / browser regression / governance validation
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-44`
- Upstream: `EX-37C1`、`EX-37C2`

---

## 1. 背景

`EX-37C1` 已将 `L4` 经营读取视图的第一批 `operating-finance` 字段切为后端 `SensitiveStringFieldProjection`，`EX-37C2` 已将 `L5` 提成读取视图的第一批 `commission-compensation` / `operating-finance` 字段切为 projection-only response。两片均采用开发期 direct cutover，不保留 legacy scalar，不做兼容过渡。

`FE-44` 不再重复 `EX-37C1` / `EX-37C2` 的基础消费实现。当前剩余问题是：

1. 对 `L4` / `L5` 页面仍暴露的非 projection 叙述字段做一次定向敏感性复审，关闭 `EX37C2-R1-NON-AMOUNT-NARRATIVE-SCOPE` 的前端侧判断。
2. 补 targeted browser matrix，证明登录后真实入口链、direct URL guard、projection full / masked 渲染和 anonymous returnUrl 没有漂移。
3. 记录 `EX37C2-R2-EVENT-VOLUME` 的边界：审计事件批量降噪属于后端审计优化，不由前端验证片解决。

---

## 2. G1 范围

### In Scope

1. 残余字段定向复审：
   - `ProjectBusinessOutcomeOverviewView.allocationStabilitySummary`
   - `ProjectBusinessOutcomeOverviewView.unmappedCostSummary`
   - `ProjectVarianceRiskExplanationView.allocationStabilitySummary`
   - `ProjectVarianceRiskExplanationView.unmappedCostSummary`
   - `ProjectVarianceRiskExplanationView.recommendedActionSummary`
   - `BusinessAccountingFeedbackView.allocationStabilitySummary`
   - `BusinessAccountingFeedbackView.unmappedCostSummary`
   - `CommissionFinalSettlementView.retentionRequirementSummary`
   - `CommissionFinalSettlementView.retentionReceiptSummary`
   - `CommissionFinalSettlementView.departureExceptionSummary`
   - `CommissionRuleExplanationView.blockingReasonCategory`
   - `CommissionRuleExplanationView.blockingReasonCode`
   - `CommissionRuleExplanationView.blockingReasonSummary`
   - `CommissionRuleExplanationView.gateDecisionSummary`
2. 浏览器矩阵覆盖：
   - admin 登录后从项目列表 / 工作区入口进入 `L4` 经营总览、偏差风险、`L5` gate / 最终结算 / 规则解释页面；
   - projected `full` 字段显示 `value`；
   - projected `masked` 字段显示 `displayText`，不回退到旧 scalar；
   - viewer 从项目工作区只能看到允许的导航和受限入口说明，direct URL 访问 `L4` / `L5` 受限页进入 `/auth/access`；
   - anonymous direct URL 访问受保护 `L4` / `L5` route 进入 `/auth/login` 并保留 returnUrl。
3. 修正仍以旧 scalar fixture 构造 `CommissionFinalSettlementView` / `CommissionRuleExplanationView` 的前端 focused spec。
4. 写入 `FE-44` G3 checkpoint 与 G4 close-out；若关闭 `FE-44`，同步判断 `EX-37C` 父任务是否可关闭。

### Out Of Scope

1. 不新增、删除或改名后端 public API route。
2. 不改 generated client、shared contract、DTO、permission key、guard、DDL、entity 或 migration。
3. 不把残余叙述字段在前端临时包一层本地遮罩；若定向复审判定某字段应成为敏感字段，必须另开后端 projection 切片，一次性改 contract / API / frontend。
4. 不处理 `EX37C2-R2-EVENT-VOLUME` 的后端审计事件批量降噪。
5. 不重做 `FE-42` / `FE-43` 已覆盖的合同 / 项目详情第一批 `contract-finance` projection。

---

## 3. 正式输入

| 输入                | 文件 / 证据                                                               | FE-44 使用方式                                                    |
| ------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `EX-37C1` G4        | `ex-37c1-l4-operating-finance-sensitive-projection-g4-closeout.md`        | 确认 `L4` 第一批 `operating-finance` 字段已是 projection-only。   |
| `EX-37C2` G4        | `ex-37c2-l5-commission-sensitive-projection-g4-closeout.md`               | 确认 `L5` 第一批提成 / 税务敏感字段已是 projection-only。         |
| Sensitive primitive | `libs/shared/api-client/model/sensitive-string-field-projection.ts`       | 浏览器测试只按 `mode / value / displayText` 判断显示结果。        |
| Route guard         | `apps/poms-admin/src/app.routes.ts`                                       | 固定 viewer / anonymous 的 `L4` / `L5` direct URL 期望。          |
| Workspace UI        | `project-operating-overview.ts`、`project-variance-risk.ts`、`commission` | 确认页面已消费 generated projection 字段，补 targeted browser。   |
| E2E fixture roles   | `dev-platform.fixtures.ts`、`support/auth.ts`                             | 使用 admin / viewer / anonymous 三类身份，不新造临时权限模型。    |
| Existing E2E matrix | `frontend-permission-visibility.matrix.spec.ts`                           | 扩展为 `L4` / `L5` projection 和 route guard 的 targeted matrix。 |

---

## 4. 残余字段判定

| 字段组                   | 字段                                                                                                                       | G1 判定                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `L4` 数据成熟度说明      | `allocationStabilitySummary`、`unmappedCostSummary`                                                                        | 非金额、非税额、非毛利、非提成分配明细；作为经营解释文本保留 scalar。         |
| `L4` 推荐动作说明        | `recommendedActionSummary`                                                                                                 | 不承载金额或人员提成分配；作为任务解释文本保留 scalar。                       |
| `L5` 最终结算条件说明    | `retentionRequirementSummary`、`retentionReceiptSummary`、`departureExceptionSummary`                                      | 当前为结算条件 / 到账 / 例外状态摘要，不是金额字段；作为状态说明保留 scalar。 |
| `L5` 规则解释阻塞与结论  | `blockingReasonCategory`、`blockingReasonCode`、`blockingReasonSummary`、`gateDecisionSummary`                             | 当前为 gate 归因与阻断解释，不承载提成金额；作为规则解释文本保留 scalar。     |
| `L4` / `L5` 已投影敏感值 | 金额、税务影响、毛利、下一步提成影响、下游提成消费摘要、计算 / 发放 / 调整金额、最终结算税务影响、规则解释下一步与税务影响 | 必须继续使用 `SensitiveStringFieldProjection`，前端不得自行推断完整值。       |

结论：本片不新增后端 projection 字段。上述 residual scalar 暂按非敏感解释 / 状态文本保留；如后续业务确认这些文本会包含人员隐私、商业报价、客户未公开条款或可逆推出金额的信息，应另开后端切片直接改 wire contract，不允许前端单方面遮罩。

---

## 5. 浏览器矩阵

| 身份      | 路径 / 入口                                            | 预期                                                                                |
| --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| admin     | 菜单 `项目管理` -> 项目行 `工作区` -> `经营总览`       | 可进入；`full` projection 展示真实文本 / 金额，`masked` projection 展示遮罩文案。   |
| admin     | 工作区 -> `偏差与风险`                                 | 可进入；偏差来源 / 税务影响投影按 response 渲染，非敏感 residual 文本正常展示。     |
| admin     | 工作区 -> `提成阶段解释`                               | 可进入；下一步 / 下游提成消费等 projection 按 response 渲染。                       |
| admin     | direct URL `/projects/:id/commission/final-settlement` | 可进入；税务影响 projection 按 response 渲染，质保金等 residual 文本正常展示。      |
| admin     | direct URL `/projects/:id/commission/rule-explanation` | 可进入；下一步 / 税务影响 projection 按 response 渲染，阻塞结论 residual 正常展示。 |
| viewer    | 菜单 `项目管理` -> 项目行 `工作区`                     | 可进入工作区总览；受限 `L4` / `L5` entry 显示不可进入说明或不暴露可点击入口。       |
| viewer    | direct URL `L4` / `L5` 受限页                          | 进入 `/auth/access`，页面显示 `无权访问`。                                          |
| anonymous | direct URL `L4` / `L5` 受保护页                        | 进入 `/auth/login`，保留 encoded returnUrl。                                        |

---

## 6. 文件范围

Expected runtime / test files:

1. `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`
2. `apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts`

Expected docs:

1. This baseline.
2. `docs/design/archive/slices/fe-44-residual-sensitive-browser-matrix-g3-checkpoint.md`
3. `docs/design/archive/slices/fe-44-residual-sensitive-browser-matrix-g4-closeout.md`
4. `docs/design/phase2-development-execution-tracker.md`
5. `docs/design/poms-design-progress.md`

---

## 7. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm run format:md:check`
3. `corepack pnpm nx lint poms-admin`
4. Focused frontend store spec:
   - `apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts`
5. `corepack pnpm nx build poms-admin`
6. Targeted Playwright:
   - `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`

Not required unless implementation touches the corresponding layer:

1. `poms-api` lint / build / tests.
2. `shared-api-client:check`.
3. `migration-check`.

---

## 8. 例外与风险

| ID                               | Level  | Scope                    | Owner | Cleanup Due      | Decision                                                                 |
| -------------------------------- | ------ | ------------------------ | ----- | ---------------- | ------------------------------------------------------------------------ |
| `EX37C2-R1-NON-AMOUNT-NARRATIVE` | Medium | Sensitive classification | Codex | `FE-44` G4       | 本片通过 residual review 判定当前字段是否继续保留 scalar。               |
| `EX37C2-R2-EVENT-VOLUME`         | Medium | Security event volume    | Codex | 后端审计优化切片 | 逐字段 masked event 降噪不属于前端验证片；本片只记录边界，不关闭该风险。 |
| `FE44-R1-FOCUSED-BROWSER-MATRIX` | Low    | E2E scope                | Codex | `FE-44` G4       | 使用 targeted browser matrix，不跑全量 E2E；全量回归另按发布检查执行。   |

---

## 9. G1 结论

`FE-44` 可以进入 frontend implementation / browser regression。

冻结条件：

1. 残余叙述字段不得在前端临时遮罩；本片只做分类与验证。
2. `L4` / `L5` 已投影字段必须继续按后端 projection 渲染。
3. 浏览器验证必须包含登录后入口链，不只测 direct URL。
4. 本片不做兼容策略；发现真实敏感字段缺口时直接另开后端 projection 切片。
