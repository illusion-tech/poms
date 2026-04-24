# FE-10 技术确认与前期成本估算工作区前端 G3 Checkpoint

日期：2026-04-24

## Slice

* Slice：`FE-10`
* 类型：`frontend-dominant / generated-client-backed read workspace`
* 当前结论：`G3 Pass`，但未进入 `G4`；本批代码按会话约定与 `EX-26` 后端事实源一起提交后再关闭。
* 上游输入：`EX-26` local `G3` 的签约前技术与成本版本包事实源、workspace query view、OpenAPI 与 generated client。

## Formal Inputs

* `docs/design/archive/slices/fe-10-technical-cost-workspace-frontend-baseline.md`
* `docs/design/archive/slices/ex-26-presigning-technical-cost-fact-source-baseline.md`
* `docs/design/archive/slices/ex-26-presigning-technical-cost-fact-source-g3-checkpoint.md`
* `docs/design/phase2-presigning-technical-cost-workspace.md`
* `docs/design/phase2-presigning-workspace-information-architecture.md`
* `docs/design/phase2-development-execution-tracker.md`

## Delivered Boundary

* 新增 `/projects/:id/workspace/technical-cost` 前端内部路由，权限为 `project:read`。
* 新增 `ProjectTechnicalCostWorkspace` 读取页：
  * 展示技术结论、版本口径、范围边界、风险 / 保留意见、前期成本与税务口径。
  * 缺少当前版本包时展示 actionable gap，不伪造技术结论或成本数据。
  * 金额只按后端 query view 返回值格式化展示，不做汇率换算或二次重算。
* `ProjectWorkspaceStore` 新增 `loadTechnicalCostWorkspace(projectId)`、loading / error / missing-state 投影和 readonly signals。
* `ProjectPreSigningOverview` 的 `技术与成本` entry 已从占位说明切换为真实 route。
* `ProjectWorkspaceGuidanceView` 的 recommended entries 新增 `technical-cost-workspace`，使工作区首页具备真实入口。
* E2E 覆盖 admin 登录后从项目详情进入工作区，再通过真实入口进入签约前主线和技术与成本页；viewer 权限拒绝链继续覆盖。

## Out Of Scope

* 不新增技术与成本写入口、审批、回退、报价放行或投标结果登记。
* 不解决多币种和汇率换算；首版继续沿用 `EX26-E1-SINGLE-CURRENCY-FIRST-SLICE`。
* 不把执行期实际成本接口复用为签约前估算成本。
* 不关闭 `FE-11` 的投标 / 报价 / 毛利评审详细工作区缺口。

## Alignment

| Concern               | Conclusion                                                                                                       | Result |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| Document -> code      | FE-10 只交付技术与成本读取工作区，不扩大为完整 L1 全流程                                                         | Pass   |
| API / client -> store | 页面通过 generated `ProjectService.projectControllerGetProjectTechnicalCostWorkspace` 读取，不新造 wire contract | Pass   |
| Query -> view         | 缺包返回业务 gap；有包时才展示 scope / risk / cost / tax 明细                                                    | Pass   |
| Guard / permission    | 前端 route 使用 `project:read`，写动作仍由 EX-26 后续或新切片冻结                                                | Pass   |
| FE-09 entry -> route  | 签约前入口卡片和工作区首页 entry 都指向真实 `technical-cost` route                                               | Pass   |
| Sensitive data        | 当前页面只读展示 EX-26 query view；未增加敏感写入口或扩权页面                                                    | Pass   |

## Drift Review

* `existing-baseline-drift`：本轮验证时 `corepack pnpm nx build poms-api` 被 `webpack-cli build --node-env=production` 阻断；当前 `webpack-cli 7.0.2` 只接受 `--config-node-env`。
* Remediation：已将 `apps/poms-api/project.json` 的 production/development args 修正为 `--config-node-env=production|development`；随后 `poms-api` build 通过。
* `test-selector-drift`：新增技术与成本页后 E2E 中两个文本断言因同页重复 heading / feedback 文案触发 Playwright strict mode。
* Remediation：已改为 role-based / exact locator，保留用户真实入口链验证，不放宽为 URL-only。
* Public API route drift：无残留；`EX-26` routes 已写入 authoritative inventory。
* Generated client drift：无残留；`shared-api-client:check` 通过。
* Persistence drift：无残留；`migration-check` 通过。

## Validation

* `git diff --check`：通过；仅有 `libs/api/contracts/src/lib/project/project.dto.ts` 的 CRLF -> LF 提示。
* `corepack pnpm nx lint poms-api`：通过。
* `corepack pnpm nx build poms-api`：通过。
* `corepack pnpm nx lint poms-admin`：通过。
* `corepack pnpm nx lint admin-data-access`：通过。
* `corepack pnpm nx build poms-admin`：通过；initial total `948.58 kB`，无 bundle warning。
* `corepack pnpm nx run shared-api-client:check`：通过。
* `corepack pnpm nx run poms-api:migration-check`：通过。
* `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.service.spec.ts`：通过，`19 tests`。
* `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`：通过，`17 tests`。
* `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-technical-cost-workspace.spec.ts`：通过，`3 tests`。
* `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store.spec.ts`：通过，`16 tests`。
* `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pre-signing-overview.spec.ts`：通过，`3 tests`。
* `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes.spec.ts`：通过，`3 tests`。
* `corepack pnpm exec playwright install chromium`：通过，补齐本机缺失的 Chromium v1217。
* `POMS_E2E_PORT_SEED=434 corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts`：通过，`5 tests`。

## G4 Gate

`FE-10` 尚未 G4。进入 G4 需要：

* 本批 `EX-26` 后端事实源、generated client 与 `FE-10` 前端页一起提交。
* tracker 从 `Review` 更新为 `Done / G4`。
* 明确 `FE-11` 可依赖 `ProjectTechnicalCostWorkspaceView` 的当前版本包、范围、风险、成本和税务摘要，但不得把它当作报价评审结论。
