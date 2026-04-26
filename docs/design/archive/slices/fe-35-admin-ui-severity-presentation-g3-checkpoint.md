# FE-35 Admin UI Severity 与业务状态展示治理 G3 检查点

- Gate Status: `G3 = Pass / G4 Pending Commit`
- Task ID: `FE-35`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- G3 Date: `2026-04-26`
- Baseline: `docs/design/archive/slices/fe-35-admin-ui-severity-presentation-baseline.md`

## 1. Delivered Boundary

已完成:

1. 新增 `shared/ui/ui-severity.ts`，集中定义 `UiTagSeverity`、`UiMessageSeverity`、`UiToastSeverity`、`UiButtonSeverity`。
2. 新增 `shared/ui/status-presentation.ts`，集中维护项目阶段、项目状态、合同状态、审批状态、确认状态、线索状态、归档状态与提成操作状态的 label / tag severity。
3. 收紧 presentation helper 类型边界：默认 helper 只接受 `as const` 推导的已知字面量 union；后端 DTO 仍为普通 `string` 的字段改用显式 `*OrFallback` helper。
4. `project-presentation.ts` 中 L4/L5 / commission 读取页 helper 同步收紧，`actionLevel`、`freezeVersionStatus`、`baselineSelectionSource` 等 generated enum 字段继续走严格 helper，`signalLevel`、最终结算状态、规则阶段和 gate 决策等 plain string 字段走 `*OrFallback`。
5. 迁移以下 POMS 业务页面到共享 helper:
   - `project-list`
   - `project-detail`
   - `project-contract-handover`
   - `lead-list`
   - `contract-list`
   - `contract-detail`
   - `dashboard/workbench`
   - `project-commission`
6. `project-presentation.ts` 继续承载 L4/L5 / commission 读取页 presentation helper，并从 shared UI 类型 / 项目状态 helper 复用基础能力。
7. `ProjectContextHeader`、`WorkspaceFeedback`、`WorkspaceActionLink`、`ProjectLifecycleTimeline` 改用共享 UI severity primitive types。
8. 新增 `status-presentation.spec.ts` 覆盖核心状态映射和 fallback。

未纳入:

1. Poseidon demo / uikit 示例。
2. landing / cms / mail / chat / files 等非 POMS 主业务模板页的历史字面量清理。
3. Toast / Message 文案治理或消息 helper 封装。
4. API、DTO、generated client、permission、store、route、E2E 行为。

## 2. Consistency Evidence

| Edge                   | Result | Evidence                                                                                                                |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Document -> code       | Pass   | 实现遵循 FE-35 G1：只治理 POMS 业务页面 display mapping 与 UI primitive type。                                          |
| DTO / contract -> view | Pass   | helper 默认输入已收紧为 known literal union；DTO plain string 调用 `*OrFallback`，不改变 generated client 或 contract。 |
| Query -> view          | Pass   | 页面读取、过滤、路由和 store 行为不变；只移动 label / severity 映射位置。                                               |
| Guard / permission     | Pass   | 未改变权限显隐、guard 或 action 判断。                                                                                  |
| Visual consistency     | Pass   | 项目 / 线索 / 合同 / 归档 / 提成操作状态现在由共享 helper 输出统一 tag severity。                                       |

## 3. Validation

| Check                     | Required | Result | Evidence                                                                                                            |
| ------------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| Status presentation tests | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=status-presentation --watch=false`，4 tests passed |
| Admin full unit tests     | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --watch=false`，23 suites / 112 tests passed                          |
| Admin lint                | Yes      | Pass   | `corepack pnpm nx lint poms-admin`                                                                                  |
| Admin build               | Yes      | Pass   | `corepack pnpm nx build poms-admin`；initial total `971.54 kB`，无 bundle warning                                   |
| Markdown format check     | Yes      | Pass   | `corepack pnpm run format:md:check`                                                                                 |
| Diff whitespace           | Yes      | Pass   | `git diff --check`                                                                                                  |
| OpenAPI / client check    | No       | N/A    | Frontend-only；无 OpenAPI / generated client 变更。                                                                 |
| Migration check           | No       | N/A    | 无 DDL。                                                                                                            |
| E2E                       | No       | N/A    | 本片不改变交互结构、路由入口或权限行为；单测 / build 覆盖 presentation helper 迁移风险。                            |

## 4. Drift

| Item                          | Classification            | Result                                                                                              |
| ----------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| `FE35-D1-LOOSE-HELPER-INPUTS` | `new-real-drift`          | 初版 helper 默认接收 `string / null / undefined`，已修复为 strict helper + explicit `*OrFallback`。 |
| Focused test watch-mode retry | `tool-noise`              | 初次 targeted test 未显式关闭 watch mode 导致工具超时；追加 `--watch=false` 后 4 tests passed。     |
| Demo / template severity debt | `existing-baseline-drift` | 保留在 `FE35-E1` / `FE35-E2` 例外中，不影响 POMS 主业务页面一致性。                                 |

## 5. Exceptions

| Exception ID                      | G1 Status | G3 Status          | Notes                                         |
| --------------------------------- | --------- | ------------------ | --------------------------------------------- |
| `FE35-E1-DEMO-SEVERITY-LITERALS`  | Low       | Accepted / remains | Poseidon demo / uikit 保留 PrimeNG 示例写法。 |
| `FE35-E2-NON-POMS-TEMPLATE-PAGES` | Low       | Accepted / remains | 非主业务模板页待产品化或清理模板时再治理。    |

## 6. G3 Conclusion

`FE-35` 本地实现满足 G3。提交后可做 G4 close-out，将 tracker 标记为 `Done`。
