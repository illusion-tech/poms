# FE-17 项目管理 PrimeNG 与表格体验基线纠偏 G3 / G4 收口

- Gate Status: `G3 Pass / G4 Pass`
- Parent: `FE-16`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Date: `2026-04-22`
- Baseline: `docs/design/fe-17-project-management-primeng-table-baseline.md`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-17`

## 1. 实现范围核对

| Scope                           | Result | Evidence                                                                                                                      |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 项目列表筛选迁入 table baseline | Pass   | `project-list.ts` 使用 `p-table` caption、global filter、PrimeNG `Select`、clear filter、column filter、rowHover、loadingbody |
| 原生 select 清理                | Pass   | `project-list.ts` 当前无原生 `<select>`                                                                                       |
| 工作区导航共享组件              | Pass   | 新增 `WorkspaceNav`，项目工作区壳层和提成工作区壳层共用                                                                       |
| 页面动作链接共享组件            | Pass   | 新增 `WorkspaceActionLink`，工作区首页、L4 / L5 读取页和提成解释页动作入口迁移                                                |
| Loading 反馈迁移                | Pass   | 新增 `WorkspaceLoading`，项目详情、项目工作区、提成工作区、L4 / L5 读取页和提成操作页迁移到 PrimeNG `ProgressSpinner`         |
| 提成操作表格 baseline           | Pass   | 计算结果、发放记录、异常调整三表具备分页、rowHover、scroll/min-width、caption 搜索、clear filter、loadingbody / emptymessage  |
| 行操作菜单                      | Pass   | 发放 / 调整表用 `p-menu` overflow action，保留现有业务方法                                                                    |

## 2. Review Finding Closure

| Finding                                                          | Priority | Status | Notes                                                                |
| ---------------------------------------------------------------- | -------- | ------ | -------------------------------------------------------------------- |
| Native selects bypass PrimeNG form controls                      | P2       | Closed | 阶段 / 状态筛选改为 PrimeNG `p-select`                               |
| Workspace tabs are hand-rolled anchors                           | P2       | Closed | 项目工作区使用 `WorkspaceNav`                                        |
| Commission workspace repeats the same custom tab pattern         | P2       | Closed | 提成工作区使用同一 `WorkspaceNav`                                    |
| Link actions are styled manually instead of PrimeNG buttons      | P3       | Closed | 代表性工作区入口和 L4 / L5 读取页动作链接改为 `WorkspaceActionLink`  |
| Loading and feedback states use raw icon markup                  | P3       | Closed | 页面级 loading 改为 `WorkspaceLoading` / PrimeNG `ProgressSpinner`   |
| Project table filters are not aligned with UIKit table demo      | P2       | Closed | 项目列表表格使用 caption、global filter、clear filter、column filter |
| Commission operation tables lack table-demo interaction baseline | P2       | Closed | 三张提成操作表补齐 table demo 交互基线                               |
| Dense row actions should use a table action pattern              | P3       | Closed | 发放 / 调整行操作改为 `p-menu`                                       |

## 3. Drift 判断

| Concern                  | Decision                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Public API / contract    | No drift. 未新增或修改 API、OpenAPI、shared contract、generated client                                     |
| Permission / route guard | No drift. 未改变 `FE-16D` 权限矩阵或 route guard                                                           |
| Business behavior        | No drift. 提成操作菜单继续调用原有方法，未改变审批、登记、调整流程                                         |
| UI baseline              | Intended corrective drift. 本片关闭 PrimeNG / table demo 审查漂移                                          |
| Remaining exception      | `FE17-E1-FEEDBACK-COMPONENT-SCOPE` 保留为 low：本片关闭页面级 loading 和动作入口，不全量替换所有业务信息框 |

## 4. 验证结果

| Check                 | Command                                                                                                                                                                                                  | Result                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Diff hygiene          | `git diff --check`                                                                                                                                                                                       | Pass                            |
| Admin lint            | `corepack pnpm nx lint poms-admin`                                                                                                                                                                       | Pass                            |
| Admin build           | `corepack pnpm nx build poms-admin`                                                                                                                                                                      | Pass，未出现新的 bundle warning |
| Admin unit tests      | `corepack pnpm nx test poms-admin --runInBand`                                                                                                                                                           | Pass，11 suites / 35 tests      |
| Workspace browser E2E | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts` | Pass，7 tests                   |

## 5. G4 结论

- Gate Status: `Pass`
- Tracker status: `Done`
- 本片可作为后续项目管理和提成工作区 UI baseline 的稳定输入。
- 截至 `FE-17` G4，后续如继续替换非 loading 的业务提示框，应另起 UI feedback baseline 切片，不回开本片。

## 6. Post-G4 Exception Closure

- Closure Date: `2026-04-25`
- Closure Slice: `FE-26`
- Closure Record: `docs/design/archive/slices/fe-26-project-management-feedback-surface-g3-g4-closeout.md`

| Exception ID                       | Status | Closure Evidence                                                                                                                                           |
| ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FE17-E1-FEEDBACK-COMPONENT-SCOPE` | Closed | 项目管理范围内剩余页面级 error / warn / not-found / 空事实 feedback surfaces 已迁移到 `WorkspaceFeedback`；普通 fact card 与字段级 validation 保持原职责。 |
