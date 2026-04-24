# FE-10 技术确认与前期成本估算工作区前端 G3/G4 Close-out

* Close-out Status: `Pass`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `frontend-dominant / generated-client-backed read workspace`
* G4 Reviewer: `Codex`
* Close-out Date: `2026-04-25`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-10`
* Runtime Commit: `a0e9de1 feat(project): 接入签约前项目三类工作区与事实源能力`

## 1. Delivered Scope

已交付：

1. `/projects/:id/workspace/technical-cost` 项目工作区内部路由，权限为 `project:read`。
2. `ProjectTechnicalCostWorkspace` 读取页，展示技术结论、版本口径、范围边界、风险 / 保留意见、前期成本与税务口径。
3. `ProjectWorkspaceStore.loadTechnicalCostWorkspace(projectId)`、loading / error / missing-state 投影和 readonly signals。
4. 签约前总入口与工作区首页均可真实进入技术与成本页。
5. Playwright 覆盖登录后从项目详情进入工作区，再从真实入口进入签约前主线和技术与成本页。

明确未交付：

1. 不新增技术与成本写入口、审批、回退、报价放行或投标结果登记。
2. 不解决多币种和汇率换算；首版沿用 `EX26-E1-SINGLE-CURRENCY-FIRST-SLICE`。
3. 不把执行期实际成本接口复用为签约前估算成本。
4. 不关闭 `FE-11` 的投标 / 报价 / 毛利评审详细工作区缺口；该缺口已由后续 `EX-27`、`EX-28`、`FE-11` 关闭。

## 2. Alignment

| Concern               | Conclusion                                                                                                       | Result |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| Document -> code      | `FE-10` 只交付技术与成本读取工作区，不扩大为完整 L1 全流程                                                       | Pass   |
| API / client -> store | 页面通过 generated `ProjectService.projectControllerGetProjectTechnicalCostWorkspace` 读取，不新造 wire contract | Pass   |
| Query -> view         | 缺包返回业务 gap；有包时才展示 scope / risk / cost / tax 明细                                                    | Pass   |
| Guard / permission    | 前端 route 使用 `project:read`，写动作仍由后续切片冻结                                                           | Pass   |
| Entry chain           | 签约前入口卡片和工作区首页 entry 都指向真实 `technical-cost` route                                               | Pass   |
| Sensitive data        | 当前页面只读展示 `EX-26` query view；未增加敏感写入口或扩权页面                                                  | Pass   |

## 3. Validation Evidence

`FE-10` 的 G3 checkpoint 已记录并通过：

1. `git diff --check`
2. `corepack pnpm nx lint poms-api`
3. `corepack pnpm nx build poms-api`
4. `corepack pnpm nx lint poms-admin`
5. `corepack pnpm nx lint admin-data-access`
6. `corepack pnpm nx build poms-admin`
7. `corepack pnpm nx run shared-api-client:check`
8. `corepack pnpm nx run poms-api:migration-check`
9. `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.service.spec.ts`
10. `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`
11. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-technical-cost-workspace.spec.ts`
12. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store.spec.ts`
13. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pre-signing-overview.spec.ts`
14. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes.spec.ts`
15. `POMS_E2E_PORT_SEED=434 corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts`

提交后复核：

1. `git show --name-only --oneline --no-renames a0e9de1` 确认运行提交包含 technical-cost 前端页、route、store 和 E2E。
2. `git status --short` 在本 G4 文档变更前为空。

## 4. Drift And Exceptions

| Item                     | Status            | Close-out                                                                                 |
| ------------------------ | ----------------- | ----------------------------------------------------------------------------------------- |
| `EX26-E1`                | Closed as blocker | 页面只展示后端返回金额，不进行多币种、汇率换算或前端重算。                                |
| `FE10-D1-BUILD-ARG`      | Closed            | `webpack-cli 7.0.2` build arg drift 已修复为 `--config-node-env`，`poms-api` build 通过。 |
| `FE10-D2-E2E-STRICTNESS` | Closed            | Playwright strict locator drift 已改为 role-based / exact locator，保留真实入口链验证。   |
| `FE-11` dependency       | Closed            | 后续 `FE-11` 已消费 technical-cost 当前版本包、范围、风险、成本和税务摘要。               |

## 5. G4 Decision

* Can mark tracker `Done`: `yes`
* Can downstream depend on this slice: `yes`
* Parent status:
  1. `FE-10` 可以关闭为 `Done / G4`。
  2. `FE-12` 可以依赖 technical-cost 入口、route guard、store 读取和 E2E 入口链。
