# EX-58D 核心对象状态历史模型治理基线收口

- Task ID: `EX-58D`
- Slice type: `docs-only / governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-58D`
- Public route surface: no new, changed or removed public route.
- Status: `G4`
- G4 Date: 2026-05-03

## 1. Delivered Scope

本片完成 Lead / Project / Contract 核心对象状态历史模型治理基线：

1. 盘点当前 `lead.status`、`project.status/currentStage`、`contract.status` 与现有来源事实。
2. 冻结 current state、transition fact、command result、runtime audit log 的边界。
3. 固定 `lead_status_transition`、`project_lifecycle_transition`、`contract_status_transition` 的目标字段集合和 source command 规则。
4. 明确后续 runtime 切片必须按聚合建表，不做通用事件溯源框架，也不把财务台账强行纳入统一 history。

## 2. Drift Handling

| Drift | Classification | Resolution                                       |
| ----- | -------------- | ------------------------------------------------ |
| N/A   | N/A            | Docs-only baseline; no runtime drift introduced. |

## 3. Validation Evidence

| Check                               | Result |
| ----------------------------------- | ------ |
| `corepack pnpm run format:md:check` | Passed |
| `git diff --check`                  | Passed |

## 4. G4 Conclusion

- Gate Status: `Pass`
- Delivered boundary matches `EX-58D`.
- This closes the EX-58 enum and status governance task family together with `EX-58A`、`EX-58B`、`EX-58C`.
