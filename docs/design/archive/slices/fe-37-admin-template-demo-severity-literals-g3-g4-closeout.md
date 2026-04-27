# FE-37 Admin 模板 / Demo Severity 字面量清理 G3/G4 收口

- Gate Status: `G4 = Done`
- Task ID: `FE-37`
- Owner: `Codex`
- Slice Type: `process-only / docs-only`
- Close-out Date: `2026-04-28`
- Governance Commit: `44e656a`
- Baseline: `docs/design/archive/slices/fe-37-admin-template-demo-severity-literals-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-37-admin-template-demo-severity-literals-g3-checkpoint.md`

## 1. Delivered Boundary

已交付:

1. 正式复核 `FE35-E1-DEMO-SEVERITY-LITERALS` 与 `FE35-E2-NON-POMS-TEMPLATE-PAGES`。
2. 将 `FE-37` 定义为 process-only / docs-only 收口切片，不做 runtime 代码迁移。
3. 冻结 severity literal 后续治理规则:
   - POMS 业务状态 / 阶段 / 状态机映射必须使用严格 presentation helper。
   - 组件局部 UI intent 可以继续直接使用 PrimeNG literal。
   - Poseidon demo / uikit 示例保留 PrimeNG literal API 示例。
   - 非 POMS 模板页等到产品化或模板清理时再治理。
4. `FE-37` G1 baseline 与 G3 checkpoint 已提交，提交号为 `44e656a`。
5. tracker 与 progress 已在本次 G4 回写中准备关闭 `FE35-E1` / `FE35-E2`。

未交付且按基线保持:

1. 不批量修改 `apps/poms-admin/src/app/demo/**`。
2. 不批量修改 `cms`、`files`、`tasklist`、dashboard widget、layout right menu 等非 POMS 主业务模板页。
3. 不改 public API、OpenAPI、generated client、DTO、权限、store、route、E2E 或 runtime UI 行为。
4. 不把所有 PrimeNG `severity` prop 都抽象成 POMS 业务 helper；只治理业务状态映射。

## 2. Validation

G3 验证证据见 FE-37 G3 checkpoint。

补充 G4 证据:

| Check             | Result | Evidence                                                                    |
| ----------------- | ------ | --------------------------------------------------------------------------- |
| Governance commit | Pass   | `44e656a` 已提交 FE-37 G1 baseline、G3 checkpoint、tracker 与 progress 回写 |
| Tracker update    | Pass   | `FE-37` 标记为 `Done / G4`，例外列清空                                      |
| Progress update   | Pass   | `poms-design-progress.md` 已补 G4 收口记录                                  |
| Exception close   | Pass   | `FE35-E1` / `FE35-E2` 已由 FE-37 正式关闭                                   |

## 3. Drift And Exceptions

| Item                                  | G4 Status | Evidence                                                                       |
| ------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `FE35-E1-DEMO-SEVERITY-LITERALS`      | Closed    | Demo / uikit 保留 PrimeNG literal API 示例，后续只在产品化或模板移除时再处理。 |
| `FE35-E2-NON-POMS-TEMPLATE-PAGES`     | Closed    | 非 POMS 模板页保留至产品化或模板清理时再治理。                                 |
| Demo / template severity literal debt | Accepted  | 分类为 `existing-baseline-drift`，不影响 POMS 主业务状态展示一致性。           |
| New runtime drift introduced          | None      | 本片不改运行时代码。                                                           |

## 4. Conclusion

`FE-37` 已完成提交后 G4 收口。Admin 主业务页面的业务状态展示继续由 `FE-35` 的严格 helper 约束；Poseidon demo / uikit 与非 POMS 模板页中的 PrimeNG severity literal 不再作为开放阻塞项，而是作为已归档范围边界处理。

后续若某个模板页转为 POMS 正式业务页面，应另开产品化切片，在冻结页面职责、数据来源、权限和状态语义后再迁移 severity 映射。
