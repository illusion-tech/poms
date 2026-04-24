# FE-20 L4/L5 读取页事实栅格组件化 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `frontend-only`
- Owner: `Codex`
- Date: 2026-04-23
- Baseline: `docs/design/fe-20-l4-l5-read-page-fact-grid-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `FE-20`

## 1. Delivered Scope

- 新增共享 `WorkspaceFactGrid`：
  - 支持 label / value / detail / icon / severity / emphasis。
  - 使用 PrimeNG `p-tag` 统一状态标签表达。
  - 使用组件内响应式 grid 样式，避免每个页面重复维护 Tailwind 小框。
- 迁移五个 L4/L5 读取 / 解释页面的核心事实块：
  - `ProjectOperatingOverview`
  - `ProjectVarianceRisk`
  - `ProjectCommissionGateOverview`
  - `ProjectCommissionFinalSettlement`
  - `ProjectCommissionRuleExplanation`
- 这些页面的错误反馈迁移到 `WorkspaceFeedback`。

## 2. Out Of Scope

- 未修改 API、OpenAPI、generated client、DTO、route surface、权限 guard 或 store 读取语义。
- 未改页面跳转和动作权限判断。
- 未重构提成操作页和表格型 UI。

## 3. Drift 判断

| Area                       | Result         | Notes                                                                     |
| -------------------------- | -------------- | ------------------------------------------------------------------------- |
| Document -> code           | `Pass`         | 实现范围与 `FE-20` G1 基线一致。                                          |
| Query -> view              | `Pass`         | 仍只消费既有 `ProjectWorkspaceStore` view。                               |
| Guard / permission         | `Pass`         | 未改变权限语义。                                                          |
| OpenAPI / generated client | `Not required` | 未触及 contract。                                                         |
| Bundle                     | `Pass`         | `poms-admin` build 通过，initial total `931.61 kB`，无新 bundle warning。 |

## 4. Validation

| Check       | Result | Evidence                                                                                                                                                                                                             |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diff check  | `Pass` | `git diff --check`                                                                                                                                                                                                   |
| Lint        | `Pass` | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                   |
| Build       | `Pass` | `corepack pnpm nx build poms-admin`                                                                                                                                                                                  |
| Unit tests  | `Pass` | `corepack pnpm nx test poms-admin --runInBand`（12 suites / 38 tests）                                                                                                                                               |
| E2E fixture | `Pass` | `corepack pnpm nx run poms-api:seeder-run`                                                                                                                                                                           |
| E2E         | `Pass` | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts`（7 passed） |

## 5. Notes

- Playwright webServer 仍输出 `Starting inspector on localhost:9229 failed: address already in use`，但 7 条测试全部通过，判定为本机调试端口环境噪声。
- `FE20-E1-OPERATION-PAGE-SCOPE` 截至 `FE-20 G4` 保留：提成操作页与表格型 UI 不在本片内。

## 6. G4 Conclusion

- `FE-20` delivered boundary matches the baseline.
- L4/L5 读取 / 解释型页面的核心事实块已进入共享 `WorkspaceFactGrid` 基线。
- 后续操作型页面可在独立切片中继续治理表单、动作、表格和确认流。

## 7. Post-G4 Exception Closure

- 2026-04-25: `FE20-E1-OPERATION-PAGE-SCOPE` 已由 `FE-17` 运行证据关闭。
- Closure evidence: `docs/design/archive/slices/fe-20-operation-page-scope-exception-closure.md`
- Supporting evidence: `docs/design/archive/slices/fe-17-project-management-primeng-table-g3-g4-closeout.md`
