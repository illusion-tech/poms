# FE-35 Admin UI Severity 与业务状态展示治理 G3/G4 收口

- Gate Status: `G4 = Done`
- Task ID: `FE-35`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Close-out Date: `2026-04-27`
- Runtime Commit: `48ffdf7`
- Baseline: `docs/design/archive/slices/fe-35-admin-ui-severity-presentation-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-35-admin-ui-severity-presentation-g3-checkpoint.md`

## 1. Delivered Boundary

已交付:

1. `shared/ui/ui-severity.ts` 已集中定义 PrimeNG severity values/types，并从 `as const` 值列表推导类型。
2. `shared/ui/status-presentation.ts` 已集中维护项目、合同、审批、确认、线索、归档和提成操作状态的 label / tag severity。
3. 默认 presentation helper 已收紧为已知字面量 union；后端 DTO 仍为 plain string 的字段必须显式调用 `*OrFallback`。
4. 项目、合同、线索、工作台和提成操作相关页面已迁移到共享 presentation helper。
5. `ProjectContextHeader`、`WorkspaceFeedback`、`WorkspaceActionLink`、`ProjectLifecycleTimeline` 已改用共享 UI severity primitive types。
6. `status-presentation.spec.ts` 已覆盖核心状态映射、fallback 以及 compile-time known-code 调用路径。

未交付且仍按基线保持:

1. 不治理 Poseidon demo / uikit 示例页中的 PrimeNG severity 字面量。
2. 不批量治理 landing / cms / mail / chat / files 等非 POMS 主业务模板页。
3. 不改 public API、generated client、权限、store、route、E2E 行为或业务 command。

## 2. Validation

验证证据见 FE-35 G3 checkpoint。

补充 G4 证据:

| Check           | Result | Evidence                                    |
| --------------- | ------ | ------------------------------------------- |
| Runtime commit  | Pass   | `48ffdf7` 已提交 FE-35 运行时代码与 G3 证据 |
| Tracker update  | Pass   | `FE-35` 标记为 `Done / G4`                  |
| Progress update | Pass   | `poms-design-progress.md` 已补 G4 收口记录  |

## 3. Drift And Exceptions

| Item                              | G4 Status | Evidence                                                                                     |
| --------------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| `FE35-D1-LOOSE-HELPER-INPUTS`     | Closed    | 默认 helper 已收紧为 strict known literal union；plain string DTO 字段显式走 `*OrFallback`。 |
| `FE35-E1-DEMO-SEVERITY-LITERALS`  | Accepted  | Demo / uikit 示例不属于本片 POMS 主业务页面治理范围。                                        |
| `FE35-E2-NON-POMS-TEMPLATE-PAGES` | Accepted  | landing / cms / mail / chat / files 等模板页待产品化或清理模板时再治理。                     |

## 4. Conclusion

`FE-35` 已完成提交后 G4 收口。后续 POMS 主业务页面新增状态展示时，应优先复用共享 severity primitive types 与 strict presentation helper；只有 DTO 字段仍为 plain string 时才使用显式 `*OrFallback`。
