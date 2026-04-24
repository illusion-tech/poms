# FE-08 提成冻结与责任边界绑定前端实现 Local G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: Phase 2 frontend workspace / `L3`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- Checkpoint Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-08`

## 1. 范围

- 本次完成:
  1. 在提成工作区新增独立读取页 `/projects/:id/commission/freeze-binding`。
  2. `ProjectWorkspaceStore` 新增 FE-08 读侧：current role assignment summary、freeze binding detail、handover detail、loading / error / missing-state 投影。
  3. 提成工作区 shell 新增“冻结与责任边界”统一入口，并把前端 guard 对齐到后端现有 `project:read + commission:assignments:manage` 边界。
  4. 页面以 `SectionCard`、`WorkspaceFactGrid`、`WorkspaceFeedback`、`WorkspaceCommandPanel` 和 PrimeNG `p-table` 呈现冻结状态、参与人 / 权重、回款判断模式、收口链引用、下一步与 `L5` 影响。
  5. 浏览器级验证已覆盖 admin 从真实入口点击进入、viewer 直接访问拒绝。
- 本次明确不做:
  1. 不新增或修改 public API route、OpenAPI、generated client、DTO、后端权限键。
  2. 不实现冻结写动作、争议提交 / 仲裁、替代版本链浏览。
  3. 不把 FE-08 塞进 workspace 首页占位入口；当前入口保持在提成 shell 内。

## 2. 正式输入

| Input Type            | Document / Source                                                                        | Section / Anchor                                            | Status  | Notes                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| Frontend baseline     | `docs/design/fe-08-commission-freeze-binding-frontend-baseline.md`                       | 全文                                                        | Pass    | 本片 `G1` 输入冻结。                                                           |
| Prior frontend slice  | `docs/design/archive/slices/fe-07-contract-to-handover-read-workspace-g3-g4-closeout.md` | 全文                                                        | G4      | FE-08 延续 `L3` 共享 UI、workspace store 与 E2E 入口模式。                     |
| Runtime shell fact    | `apps/poms-admin/src/app/features/commission/project-commission-shell.ts`                | `tabs()`                                                    | Fact    | 新 tab 在现有 shell 内落地。                                                   |
| Runtime route fact    | `apps/poms-admin/src/app.routes.ts`                                                      | `projects/:id/commission/*`                                 | Fact    | FE-08 新增内部 route，不触发 public API governance。                           |
| Existing client query | `libs/shared/api-client/api/commission.service.ts`                                       | `commissionControllerGetCurrentRoleAssignment`              | aligned | current role assignment singleton query 已存在。                               |
| Existing client query | `libs/shared/api-client/api/commission-role-assignments.service.ts`                      | `commissionRoleAssignmentControllerGetRoleAssignmentDetail` | aligned | freeze detail query 已存在。                                                   |
| Backend permission    | `apps/poms-api/src/app/features/commission/commission.controller.ts`                     | `getCurrentRoleAssignment`                                  | Fact    | project-scope current assignment 读取受 `commission:assignments:manage` 保护。 |
| Backend permission    | `apps/poms-api/src/app/features/commission/commission-role-assignment.controller.ts`     | `getRoleAssignmentDetail`                                   | Fact    | detail 读取同样受 `commission:assignments:manage` 保护。                       |

## 3. 一致性结论

| Concern                | Conclusion                                                                                                         | Result |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| Document -> code       | FE-08 作为独立读取页已落地，未与 operations 写侧混片                                                               | Pass   |
| Query -> view          | 页面只消费 current role assignment summary/detail + handover detail；未从 final-settlement / rule-explanation 反推 | Pass   |
| Route / API surface    | 仅新增前端内部 route `/projects/:id/commission/freeze-binding`，无 public API 变化                                 | Pass   |
| DTO / contract         | 无新 wire contract，本片直接复用 generated client DTO                                                              | Pass   |
| Guard / permission     | 前端 guard 与 shell tab 已对齐后端真实边界 `project:read + commission:assignments:manage`                          | Pass   |
| Missing-state behavior | current role assignment 缺失时页面给出 gap，不误报 error；403 仍进入明确错误态                                     | Pass   |
| Component consistency  | 页面使用共享 workspace UI + PrimeNG table，不回退到原生表格或手写块                                                | Pass   |

## 4. 测试与校验

| Check                  | Required   | Command / Evidence                                                                                                                                                                            | Result | Gap / Reason                                  |
| ---------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------- |
| Diff hygiene           | Yes        | `git diff --check`                                                                                                                                                                            | Pass   |                                               |
| Admin data-access lint | If touched | `corepack pnpm nx lint admin-data-access`                                                                                                                                                     | Pass   |                                               |
| Admin lint             | Yes        | `corepack pnpm nx lint poms-admin`                                                                                                                                                            | Pass   |                                               |
| Admin build            | Yes        | `corepack pnpm nx build poms-admin`                                                                                                                                                           | Pass   | initial total `942.37 kB`，无新 warning       |
| Focused unit tests     | Yes        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-commission-freeze-binding`                                                                                           | Pass   | `1 suite / 3 tests`                           |
| Shell / route tests    | Yes        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-commission-shell`                                                                                                    | Pass   | `1 suite / 3 tests`                           |
| Route guard tests      | Yes        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`                                                                                                                  | Pass   | `1 suite / 3 tests`                           |
| Store tests            | If touched | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`                                                                                                     | Pass   | `1 suite / 12 tests`                          |
| E2E                    | Yes        | `corepack pnpm nx run poms-api:seeder-run` + `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | Pass   | `4 passed`，覆盖 admin 入口点击与 viewer 拒绝 |
| OpenAPI / client diff  | No         | N/A                                                                                                                                                                                           | N/A    | 本片不改 public API surface                   |

## 5. Drift 与例外

- Drift classification: `none`
- Existing baseline drift: `none`
- New drift introduced: `none`

| Exception ID                              | Level | Scope                     | Approved By | Cleanup Owner | Cleanup Due | Notes                                                         |
| ----------------------------------------- | ----- | ------------------------- | ----------- | ------------- | ----------- | ------------------------------------------------------------- |
| `FE08-E1-DISPUTE-CHAIN-QUERY-SCOPE`       | Low   | 冻结后争议 / 替代版本展示 | Codex       | `FE-08`       | `FE-08 G4`  | 当前页面仍只到 current binding，不扩展示争议 / 替代版本链。   |
| `FE08-E2-PERMISSION-BOUNDARY-NO-WIDENING` | Low   | 读取权限边界              | Codex       | `FE-08`       | `FE-08 G4`  | 本轮已按后端真实边界实现前端 guard，未做本地放宽；G4 时关闭。 |

## 6. 决策

- Can commit to main: `yes`
- Can mark tracker `Done`: `no`
- Remaining action:
  1. 提交当前 runtime 与 checkpoint 改动后，补 `FE-08` `G4 close-out`。
  2. `FE-08` 完成后，再决定是否把冻结入口提升到跨工作区导航收口片 `FE-12`，而不是在本片继续扩范围。
