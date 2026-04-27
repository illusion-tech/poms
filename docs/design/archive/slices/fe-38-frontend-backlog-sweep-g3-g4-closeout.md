# FE-38 前端 Backlog Sweep 与后续切片建档 G3/G4 收口

- Task ID: `FE-38`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend governance / docs-only
- Runtime Commit: `9955cb8 docs(governance): 完成 FE-38 前端待办梳理基线`

---

## 1. 交付边界

`FE-38` 是 process-only / docs-only 切片，不修改 runtime code、public API、权限、generated client、store 或 E2E。

本片完成:

1. 盘点正式前端入口、导航、工作台、顶栏待办、提成深链、合同列表和 E2E 覆盖现状。
2. 新增 `FE-39` 到 `FE-42` 四个后续 frontend backlog 切片。
3. 明确 Poseidon demo / uikit 与非 POMS 模板页当前不进入新切片，继续遵循 `FE-37` 的产品化时再治理边界。

---

## 2. G4 判定

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| Committed boundary | Pass | `9955cb8` 已提交 `FE-38` G1/G3 sweep、tracker 和 progress 回写。 |
| Tracker update | Pass | `FE-38` 标记为 `Done / G4`；`FE-39` 到 `FE-42` 保持 `Todo / G0`。 |
| Runtime drift | Pass | 本片不改 runtime code，无 API / route / permission / data-access drift。 |
| Downstream readiness | Pass | `FE-39` 可作为下一片进入 `G1`；`FE-40`、`FE-41`、`FE-42` 已有 tracker 行但仍需各自 G1 冻结。 |

---

## 3. 验证记录

提交前验证已在 `fe-38-frontend-backlog-sweep-g1-g3.md` 记录:

1. `corepack pnpm exec prettier --check docs/design/phase2-development-execution-tracker.md docs/design/poms-design-progress.md docs/design/archive/slices/fe-38-frontend-backlog-sweep-g1-g3.md`
2. `git diff --check`

本次 G4 仅补文档 close-out，并重新执行 docs-only 校验。

---

## 4. 例外与风险

| ID | 状态 | 说明 |
| --- | --- | --- |
| 无 | N/A | `FE-38` 不保留开放例外。 |

---

## 5. 后续入口

下一步建议进入 `FE-39` 的 `G1`:

1. `/dashboard` 是登录后的默认入口。
2. 工作台和顶栏待办当前存在 target routing 行为不一致。
3. `FE-40` 的提成待办深链应依赖 `FE-39` 先冻结共享待办导航 helper 或统一入口策略。

`FE-38` 可以关闭为 `Done / G4`。
