# FE-18 项目上下文与工作区体验组件化 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `frontend-only`
- Owner: `Codex`
- Date: 2026-04-23
- Baseline: `docs/design/fe-18-project-context-workspace-component-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `FE-18`

## 1. Delivered Scope

- 新增共享项目上下文头部 `ProjectContextHeader`：
  - 基于 Poseidon `p-toolbar` 模式承载页面标题、返回入口、阶段 / 状态标签和页面动作。
  - 已接入项目详情与项目工作区壳层。
- 新增共享生命周期组件 `ProjectLifecycleTimeline`：
  - 基于 PrimeNG `p-timeline` 表达项目阶段线。
  - 项目详情页用它把“对象事实”与“连续推进状态”区分开。
- 新增共享工作区指令面板 `WorkspaceCommandPanel`：
  - 统一呈现当前阶段、当前重点、下一步、当前缺口和责任归口。
  - 项目工作区壳层不再手写五个局部信息格。
- 新增共享反馈组件 `WorkspaceFeedback`：
  - 基于 PrimeNG `p-message` 承载工作区错误 / 提示。
  - 项目详情只读账号提示和工作区 guidance 错误已迁移。
- 更新项目详情与工作区壳层单测：
  - 覆盖生命周期提示和共享指令面板标题。

## 2. Out Of Scope

- 未修改 API、OpenAPI、generated client、public route surface、权限 guard 或业务动作判定。
- 未重做项目列表表格；该部分归属 `FE-17`。
- 未一次性重构合同、提成、签约前所有页面；保留 low 例外 `FE18-E1-PARTIAL-PAGE-COVERAGE`。

## 3. Drift 判断

| Area                       | Result         | Notes                                                                     |
| -------------------------- | -------------- | ------------------------------------------------------------------------- |
| Document -> code           | `Pass`         | 实现范围与 `FE-18` G1 基线一致。                                          |
| Query -> view              | `Pass`         | 仍只消费 `ProjectDetailView` / `ProjectWorkspaceGuidanceView`。           |
| Guard / permission         | `Pass`         | 没有改 route guard、`allowedActions` 或后端 entry availability。          |
| OpenAPI / generated client | `Not required` | 未触及 contract。                                                         |
| Bundle                     | `Pass`         | `poms-admin` build 通过，initial total `931.90 kB`，无新 bundle warning。 |

## 4. Validation

| Check       | Result | Evidence                                                                                                                                                                                                             |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diff check  | `Pass` | `git diff --check`                                                                                                                                                                                                   |
| Lint        | `Pass` | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                   |
| Build       | `Pass` | `corepack pnpm nx build poms-admin`                                                                                                                                                                                  |
| Unit tests  | `Pass` | `corepack pnpm nx test poms-admin --runInBand`（11 suites / 35 tests）                                                                                                                                               |
| E2E fixture | `Pass` | `corepack pnpm nx run poms-api:seeder-run`                                                                                                                                                                           |
| E2E         | `Pass` | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts`（7 passed） |

## 5. Notes

- 首轮验证发现两处实现问题，已在本片内修复：
  - `p-timeline` 的 `value` 需要可变数组，不能直接绑定 readonly 数组。
  - `WorkspaceCommandPanel` 内部 `#title` 模板变量遮蔽了同名输入，导致标题渲染为 `[object Object]`；已把输入改为 `heading / caption`。
- Playwright webServer 输出过 `Starting inspector on localhost:9229 failed: address already in use`，但 7 条测试全部通过，判定为本机调试端口环境噪声，不影响 G4。

## 6. G4 Conclusion

- `FE-18` delivered boundary matches the baseline.
- Downstream frontend slices can rely on the shared project context, lifecycle, command panel and feedback components.
- 截至 `FE-18` G4，`FE18-E1-PARTIAL-PAGE-COVERAGE` remained a low-risk follow-up for broader project-management page adoption.

## 7. Post-G4 Exception Closure

- Closure Date: `2026-04-25`
- Closure Record: `docs/design/archive/slices/fe-18-partial-page-coverage-exception-closure.md`

| Exception ID                    | Status | Closure Evidence                                                                                                                                        |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FE18-E1-PARTIAL-PAGE-COVERAGE` | Closed | 后续 `FE-19`、`FE-20`、`FE-08~12` 与 `FE-25` 已把共享 workspace UI 铺到提成壳层、工作区首页、L4/L5 读取页、签约前详细工作区、冻结绑定和跨工作区入口链。 |
