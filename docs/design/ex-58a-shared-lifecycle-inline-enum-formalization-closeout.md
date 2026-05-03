# EX-58A 共享生命周期与 inline enum 正式化收口

- Task ID: `EX-58A`
- Slice type: `contract / refactor`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-58A`
- Public route surface: no new, changed or removed public route.
- Status: `G4`
- G4 Date: 2026-05-03

## 1. Delivered Scope

本片完成 shared contracts 中 inline enum 的命名化和 lifecycle 候选 family 建模：

1. 新增共享 lifecycle candidate schemas：`ActiveInactiveStatus`、`VersionLifecycleStatus`、`EffectiveSupersededStatus`、`ReadyBlockedMissingStatus`、`AvailableMissingStatus`、`PendingConfirmedClosedStatus`。
2. 将平台组织成员类型、权限状态 / 来源、导航项类型、审计 / 安全结果与等级、合同承接、项目移交、内部成本率等 projection enum 从 inline `z.enum([...])` 提取为命名 const / schema / value object。
3. 保持所有已存在 API / DB code value 不变；`pending_effective`、`not_started`、`not_frozen`、`void`、UPPER_SNAKE 等值重命名继续由 `EX-58B` 承接。
4. 重新生成 OpenAPI 和 shared API client，让前端消费端使用稳定 generated enum 名称。
5. 同步 Admin data-access re-export、项目合同承接 / 提成冻结绑定页面和 specs 中的旧 inline generated enum 名称。

## 2. Drift Handling

| Drift                                                                            | Classification            | Resolution                                                                                                                           |
| -------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Generated client no longer exports `*SummaryStatusEnum` style inline enum names. | `new-real-drift`          | Admin consumers switched to the new named generated enums, e.g. `ContractHandoverCurrentBaselineStatus` and `ProjectHandoverStatus`. |
| OpenAPI client check reports existing spec warnings for `propertyNames`.         | `existing-baseline-drift` | No action in this slice; `shared-api-client:check` still passed with the existing warning profile.                                   |

## 3. Validation Evidence

| Check                                             | Result                                              |
| ------------------------------------------------- | --------------------------------------------------- |
| `corepack pnpm nx build shared-contracts`         | Passed                                              |
| `corepack pnpm nx run poms-api:openapi`           | Passed                                              |
| `corepack pnpm nx run shared-api-client:generate` | Passed                                              |
| `corepack pnpm nx run shared-api-client:check`    | Passed                                              |
| `corepack pnpm nx build poms-api`                 | Passed                                              |
| `corepack pnpm nx build poms-admin`               | Passed, with existing initial bundle budget warning |
| `corepack pnpm nx lint poms-api`                  | Passed                                              |
| `corepack pnpm nx lint poms-admin`                | Passed                                              |
| `corepack pnpm nx test poms-admin --watch=false`  | Passed, 29 suites / 164 tests                       |
| `corepack pnpm run format:md:check`               | Passed                                              |
| `git diff --check`                                | Passed, with line-ending warning on one Admin file  |

## 4. G4 Conclusion

- Gate Status: `Pass`
- Delivered boundary matches the `EX-58A` baseline.
- This slice is safe as an input for `EX-58B` and `EX-59`.
- Parent `EX-58` remains open until code value direct cutover, dictionary governance, state history governance, frontend follow-up and scan extension are completed.
