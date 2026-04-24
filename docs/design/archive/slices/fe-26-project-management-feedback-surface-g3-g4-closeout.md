# FE-26 项目管理反馈态组件化收口 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Parent: `FE-17`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Date: `2026-04-25`
- Baseline: `docs/design/archive/slices/fe-26-project-management-feedback-surface-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `FE-26`

## 1. Delivered Scope

- `project-list.ts`
  - 新建项目失败态迁移到 `WorkspaceFeedback`。
- `project-detail.ts`
  - 阻断原因、无阻断、关闭原因、审批摘要状态、投标空态、编辑失败和项目未找到迁移到 `WorkspaceFeedback`。
- `project-workspace-shell.ts`
  - 项目未找到迁移到 `WorkspaceFeedback`。
- `project-commission.ts`
  - 提成操作页项目未找到迁移到 `WorkspaceFeedback`。

## 2. Out Of Scope

- 未新增或修改 API、DTO、generated client、DDL、route、权限 guard 或业务动作。
- 未改变 PrimeNG Toast 的操作结果反馈。
- 未改变 table emptymessage/loadingbody。
- 未把普通业务事实卡片强行改为 Message。

## 3. Drift 判断

| Area                     | Result         | Notes                                                          |
| ------------------------ | -------------- | -------------------------------------------------------------- |
| Document -> code         | `Pass`         | 实现范围与 `FE-26` G1 baseline 一致。                          |
| Public API / contract    | `Not required` | 未触及 route、DTO、OpenAPI 或 generated client。               |
| Permission / route guard | `Pass`         | 没有改变任何 guard、`allowedActions` 或入口显隐规则。          |
| UI baseline              | `Pass`         | 页面级反馈态统一走 `WorkspaceFeedback` / PrimeNG `p-message`。 |
| Business behavior        | `Pass`         | 项目创建、编辑、提成操作和导航行为不变。                       |

## 4. Validation

| Check              | Result         | Evidence                                                                                                                                                                                                   |
| ------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused unit tests | `Pass`         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-list.spec.ts --testPathPatterns=project-detail.spec.ts --testPathPatterns=project-workspace-shell.spec.ts`（3 suites / 18 tests） |
| Lint               | `Pass`         | `corepack pnpm nx lint poms-admin`                                                                                                                                                                         |
| Build              | `Pass`         | `corepack pnpm nx build poms-admin`; initial total `955.85 kB`; no new bundle warning                                                                                                                      |
| E2E                | `Not required` | 本片不改路由、入口链、权限或流程。                                                                                                                                                                         |
| Markdown format    | `Pass`         | `corepack pnpm run format:md:check`                                                                                                                                                                        |
| Diff hygiene       | `Pass`         | `git diff --check`                                                                                                                                                                                         |

## 5. Exception Closure

| Exception ID                       | Previous Status | G4 Status | Closure Evidence                                                                                                                                           |
| ---------------------------------- | --------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FE17-E1-FEEDBACK-COMPONENT-SCOPE` | Open            | Closed    | 项目管理范围内剩余页面级 error / warn / not-found / 空事实 feedback surfaces 已迁移到 `WorkspaceFeedback`；普通 fact card 与字段级 validation 保持原职责。 |

## 6. G4 Conclusion

- `FE-26` delivered boundary matches the frozen baseline.
- `FE17-E1-FEEDBACK-COMPONENT-SCOPE` is closed.
- Tracker can mark `FE-26` as `Done / G4 04-25` and clear the `FE-17` exception column.
