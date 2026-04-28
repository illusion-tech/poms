# FE-44 残余敏感字段投影与浏览器权限矩阵验证 G3 Checkpoint

- Task ID: `FE-44`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation / browser regression / governance validation
- Baseline: `docs/design/archive/slices/fe-44-residual-sensitive-browser-matrix-baseline.md`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-44`

---

## 1. 实施结果

本片已按 G1 基线完成 `L4` / `L5` residual sensitive review 与 targeted browser matrix：

1. `ProjectWorkspaceStore` focused spec 中的 `CommissionFinalSettlementView` / `CommissionRuleExplanationView` fixture 已改为当前 generated projection 字段，不再构造 `taxImpactSummary`、`taxImpactPendingAmount`、`nextActionSummary` 等旧 scalar 字段。
2. `frontend-permission-visibility.matrix.spec.ts` 扩展 `L4` / `L5` targeted browser matrix：
   - admin 从登录后项目菜单 / 项目列表 / 工作区入口进入经营总览、偏差风险和提成阶段解释；
   - admin direct URL 进入最终结算与规则解释；
   - `full` projection 展示真实 `value`；
   - `masked` projection 展示后端 `displayText`，不回退旧 scalar；
   - residual scalar 解释字段按 G1 判定正常展示；
   - viewer direct URL 对 `L4` / `L5` 受限页进入 `/auth/access`；
   - anonymous direct URL 对 `L4` / `L5` 受保护页进入 `/auth/login` 并保留 returnUrl。
3. 本片未新增后端 API、DTO、generated client、permission key、guard、DDL、entity 或 migration。

---

## 2. Residual 字段复审结论

| 字段组                  | 字段                                                                                           | G3 结论                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `L4` 数据成熟度说明     | `allocationStabilitySummary`、`unmappedCostSummary`                                            | 保留 scalar；当前语义为经营解释 / 缺口状态。  |
| `L4` 推荐动作说明       | `recommendedActionSummary`                                                                     | 保留 scalar；当前语义为任务建议，不承载金额。 |
| `L5` 最终结算条件说明   | `retentionRequirementSummary`、`retentionReceiptSummary`、`departureExceptionSummary`          | 保留 scalar；当前语义为结算条件与状态摘要。   |
| `L5` 规则解释阻塞与结论 | `blockingReasonCategory`、`blockingReasonCode`、`blockingReasonSummary`、`gateDecisionSummary` | 保留 scalar；当前语义为 gate 归因与阻断解释。 |

`EX37C2-R1-NON-AMOUNT-NARRATIVE-SCOPE` 可以在本片关闭：当前前端可见的 residual scalar 不属于第一批金额、税务、毛利、提成分配或下一步提成敏感字段包。若后续业务确认这些叙述会包含人员隐私、客户未公开条款或可逆推出金额的信息，应另开后端 projection 切片直接改 wire contract。

---

## 3. 变更文件

| 文件                                                                                         | 变更                                                                                       |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts`                   | 同步 L5 final settlement / rule explanation 的 projection-only fixture。                   |
| `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`                      | 增加 `L4` / `L5` projection full / masked 渲染、入口链、viewer 和 anonymous route matrix。 |
| `docs/design/archive/slices/fe-44-residual-sensitive-browser-matrix-baseline.md`             | 新增 G1 baseline。                                                                         |
| `docs/design/archive/slices/fe-44-residual-sensitive-browser-matrix-g3-checkpoint.md`        | 本 G3 checkpoint。                                                                         |
| `docs/design/phase2-development-execution-tracker.md`、`docs/design/poms-design-progress.md` | 回写 gate、进度与开放风险。                                                                |

---

## 4. 验证结果

| Check                      | Command                                                                                                                                                                             | Result                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Focused store spec         | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand`                                                  | Passed, 26 tests                                                      |
| `poms-admin` lint          | `corepack pnpm nx lint poms-admin`                                                                                                                                                  | Passed                                                                |
| `poms-admin` build         | `corepack pnpm nx build poms-admin`                                                                                                                                                 | Passed                                                                |
| Targeted Playwright matrix | `POMS_E2E_PORT_SEED=544 corepack pnpm exec playwright test apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | Passed, 7 tests                                                       |
| `poms-admin-e2e` lint      | Project config inspection                                                                                                                                                           | Not configured; no lint target in `apps/poms-admin-e2e/project.json`. |
| Markdown check             | `corepack pnpm run format:md:check`                                                                                                                                                 | Passed                                                                |
| Diff whitespace            | `git diff --check`                                                                                                                                                                  | Passed                                                                |

---

## 5. Drift 与例外

| Item                             | Status          | Decision                                                                     |
| -------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| `EX37C2-R1-NON-AMOUNT-NARRATIVE` | Closed at G3    | residual scalar 字段已复审为非第一批敏感金额 / 提成字段包。                  |
| `EX37C2-R2-EVENT-VOLUME`         | Open downstream | 逐字段 masked event 批量降噪属于后端审计优化，不由 `FE-44` 关闭。            |
| `FE44-R1-FOCUSED-BROWSER-MATRIX` | Closed at G3    | targeted browser matrix 覆盖本片入口链、projection 和权限边界，足够支撑 G3。 |
| Public API / generated client    | No change       | 未改 route、DTO、OpenAPI 或 generated client。                               |
| Persistence / migration          | No change       | 未改 DDL、entity、repository 或 migration。                                  |
| Compatibility strategy           | Not applicable  | 当前仍处开发期；本片不保留兼容层，不做旧 scalar fallback。                   |

---

## 6. G3 结论

`FE-44` 已达到提交前 G3 条件，可以进入本地提交。

提交落地后再执行 `G4` close-out，并同步判断 `EX-37C` 父任务是否可关闭。
