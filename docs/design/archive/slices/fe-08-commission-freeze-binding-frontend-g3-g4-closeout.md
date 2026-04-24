# FE-08 提成冻结与责任边界绑定前端实现 G3/G4 Close-out

- Close-out Status: `Pass`
- Parent: Phase 2 frontend workspace / `L3`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G4 Reviewer: `Codex`
- Close-out Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-08`

## 1. Delivered Scope

- 已交付:
  1. 新增 `/projects/:id/commission/freeze-binding` 独立读取页，承担 `L3-S2` 冻结与责任边界解释职责。
  2. `ProjectWorkspaceStore` 新增冻结绑定读侧状态，集中读取 current role assignment summary、role assignment detail 与 project handover detail。
  3. 提成工作区 shell 新增“冻结与责任边界”入口，并与前端 route guard 一起对齐后端真实权限边界 `project:read + commission:assignments:manage`。
  4. 页面使用 `SectionCard`、`WorkspaceCommandPanel`、`WorkspaceFactGrid`、`WorkspaceFeedback` 与 PrimeNG `p-table` 呈现冻结状态、参与人权重、回款判断口径、收口链引用、下一步和 `L5` 影响。
  5. 单测与 Playwright journey 已覆盖 admin 从真实导航进入、viewer 直接访问被拒绝、缺少当前冻结版本时的 gap 表达。
- 明确未交付:
  1. 未新增 public API route、OpenAPI、generated client、DTO 或后端权限键。
  2. 未实现冻结写动作、争议提交 / 仲裁、替代冻结版本链浏览。
  3. 未把冻结页提升为 workspace 首页入口；跨工作区入口整合继续留给 `FE-12`。

## 2. Formal Inputs And Artifacts

| Artifact        | Path                                                                                    | Status   |
| --------------- | --------------------------------------------------------------------------------------- | -------- |
| G1 baseline     | `docs/design/archive/slices/fe-08-commission-freeze-binding-frontend-baseline.md`       | Archived |
| G3 checkpoint   | `docs/design/archive/slices/fe-08-commission-freeze-binding-frontend-g3-checkpoint.md`  | Archived |
| G3/G4 close-out | `docs/design/archive/slices/fe-08-commission-freeze-binding-frontend-g3-g4-closeout.md` | Current  |
| Tracker         | `docs/design/phase2-development-execution-tracker.md`                                   | Updated  |

## 3. Alignment

| Concern                | Conclusion                                                                                              | Result |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | ------ |
| Document -> code       | `FE-08` 已按基线落成独立读取页，不与 operations 写侧混片                                                | Pass   |
| Route / API surface    | 仅新增前端内部 route；无 public API route 变化                                                          | Pass   |
| Query -> view          | 页面只消费 current role assignment summary/detail + handover detail，不从下游结算或规则解释反推冻结结果 | Pass   |
| DTO / contract         | 复用 existing generated client DTO；未新造 wire contract                                                | Pass   |
| Guard / permission     | 前端 guard 与 shell tab 已对齐后端 `commission:assignments:manage` 读取边界                             | Pass   |
| Missing-state behavior | current role assignment 缺失时显示 gap；403 仍显示权限错误                                              | Pass   |
| Component consistency  | 使用 shared workspace UI 和 PrimeNG table，未回退到手写表格 / 手写 tab                                  | Pass   |

## 4. Validation Evidence

| Check                      | Command / Evidence                                                                                                                               | Result                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Diff hygiene               | `git diff --check`                                                                                                                               | Pass                                            |
| Admin data-access lint     | `corepack pnpm nx lint admin-data-access`                                                                                                        | Pass                                            |
| Admin lint                 | `corepack pnpm nx lint poms-admin`                                                                                                               | Pass                                            |
| Admin build                | `corepack pnpm nx build poms-admin`                                                                                                              | Pass, initial total `942.37 kB`, no new warning |
| Page unit test             | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-commission-freeze-binding`                                              | Pass, `1 suite / 3 tests`                       |
| Shell unit test            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-commission-shell`                                                       | Pass, `1 suite / 3 tests`                       |
| Route guard unit test      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`                                                                     | Pass, `1 suite / 3 tests`                       |
| Store unit test            | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`                                                        | Pass, `1 suite / 12 tests`                      |
| E2E seed                   | `corepack pnpm nx run poms-api:seeder-run`                                                                                                       | Pass                                            |
| Workspace journey E2E      | `corepack pnpm exec playwright test apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | Pass, `4 passed`                                |
| OpenAPI / generated client | N/A                                                                                                                                              | Not required; no public API surface change      |

## 5. Drift And Exceptions

- Drift classification: `none`
- Existing baseline drift: `none`
- New drift introduced: `none`

| Exception ID                              | Status | Close-out                                                                                                                         |
| ----------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `FE08-E1-DISPUTE-CHAIN-QUERY-SCOPE`       | Closed | `FE-08` 明确保留 current binding 读取职责，不扩展示争议 / 替代冻结版本链；若需要 project-scope 当前争议摘要，应另开后端治理切片。 |
| `FE08-E2-PERMISSION-BOUNDARY-NO-WIDENING` | Closed | 前端已按后端真实 `commission:assignments:manage` 读取边界实现，没有本地放宽。                                                     |

## 6. G4 Decision

- Can mark tracker `Done`: `yes`
- Downstream dependency status:
  1. `FE-12` 可依赖 `FE-08` 已稳定的提成 shell 入口、route guard、store 读取边界与 journey E2E 模式。
  2. `FE-09` 不直接依赖 `FE-08` runtime，但可复用本片的读取型工作区结构和 G3 evidence 模式。
- Next recommended slice:
  - `FE-09` should enter `G1` next if the current priority is continuing the planned phase sequence into `L1`.
  - `FE-12` should remain `Todo` until `FE-09` to `FE-11` stabilize, because its dependency list explicitly includes those slices.
