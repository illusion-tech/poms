# FE-19 项目管理共享体验组件铺开 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `frontend-only`
- Owner: `Codex`
- Date: 2026-04-23
- Baseline: `docs/design/fe-19-project-management-component-adoption-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `FE-19`

## 1. Delivered Scope

- 提成工作区壳层已迁移到共享组件:
  - `ProjectContextHeader` 承载标题、项目编号、阶段 / 状态标签、返回项目工作区动作。
  - `WorkspaceCommandPanel` 统一展示当前阶段、下一步、当前缺口与责任归口。
  - `WorkspaceFeedback` 用于项目未找到反馈。
- 项目工作区首页已迁移到共享组件:
  - `WorkspaceCommandPanel` 展示当前阶段、当前缺口、下一步、责任归口与当前依据。
  - `WorkspaceFeedback` 展示阻断事项和 guidance 读取中的提示。
- 新增 `ProjectCommissionShell` 单测:
  - 覆盖共享上下文 / 指令面板渲染。
  - 覆盖提成操作权限不足时的禁用入口文案。
  - 覆盖返回项目工作区跳转。

## 2. Out Of Scope

- 未修改 API、OpenAPI、generated client、DTO、public route surface 或权限 guard。
- 未迁移 `ProjectCommissionShell` 的本地 `projectWorkspaceGuide` 事实源。
- 未重构提成操作表格；该部分已在 `FE-17` 完成。
- 未纳入合同详情、签约前工作区或所有历史提示框。

## 3. Drift 判断

| Area                       | Result         | Notes                                                                     |
| -------------------------- | -------------- | ------------------------------------------------------------------------- |
| Document -> code           | `Pass`         | 实现范围与 `FE-19` G1 基线一致。                                          |
| Query -> view              | `Pass`         | 仍只消费既有 `ProjectDetailView` / `ProjectWorkspaceGuidanceView`。       |
| Guard / permission         | `Pass`         | 保留现有 permission checks，未改变权限语义。                              |
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
- `FE19-E1-COMMISSION-GUIDANCE-SOURCE` 截至 `FE-19 G4` 保留：提成壳层后续若要改为正式后端 guidance，应另开 query / governance 切片。

## 6. G4 Conclusion

- `FE-19` delivered boundary matches the baseline.
- 项目详情、项目工作区壳层、项目工作区首页、提成工作区壳层现在共享同一套上下文、指令和反馈组件基线。
- 后续 UI 切片可继续向合同详情、签约前工作区和更多历史提示框铺开。

## 7. Post-G4 Exception Closure

- 2026-04-25: `FE19-E1-COMMISSION-GUIDANCE-SOURCE` 已由 `FE-25` 关闭。
- Closure evidence: `docs/design/archive/slices/fe-25-commission-shell-guidance-source-g3-g4-closeout.md`
- Runtime commit: `9f85604 feat(commission): 收敛提成壳层到 workspace guidance 事实源`
