# EX-58B 枚举代码值风格统一 direct cutover 收口

- Task ID: `EX-58B`
- Slice type: `contract / persistence / refactor`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-58B`
- Public route surface: no new, changed or removed public route.
- Status: `G4`
- G4 Date: 2026-05-03

## 1. Delivered Scope

本片完成非外部口径 enum / dictionary code value 的开发期 direct cutover：

1. 将 `void`、snake case、UPPER_SNAKE、PascalCase target type 等混合代码值统一为小写 / kebab-case / lower domain code。
2. 同步 shared contracts、OpenAPI、generated API client、Admin data-access re-export 和 Admin presentation helper。
3. 同步 API entity check constraint、service / repository / controller / spec、seed 与 e2e support 中的代码值。
4. 新增 direct cutover migration：`Migration20260503160000_ex58b_enum_code_value_direct_cutover`。
5. 已执行本地开发库 `migration-up`，并修正本地 schema 与 ORM 元数据一致。

本片不做旧值兼容映射、双写、运行时 fallback 或中文枚举值保留；历史数据在 `up` 中一次性转为目标代码值，`down` 仅清理本片约束以服务开发回滚。

## 2. Drift Handling

| Drift                                                                                        | Classification            | Resolution                                                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `CommissionPayout` / `CommissionAdjustment` test mock entity class names were over-replaced. | `new-real-drift`          | Restored spec-only ORM entity name checks to class names while keeping business code values as kebab-case.   |
| `receipt_record.status` / `payment_record.status` defaults were introduced by migration.     | `new-real-drift`          | Changed EX-58B migration to `drop default`; local dev DB was synchronized with `schema:update --run --safe`. |
| Admin build reports initial bundle budget warning.                                           | `existing-baseline-drift` | No scope change in this slice; build passed with the same existing warning profile.                          |
| `git diff --check` reports CRLF normalization warnings on two e2e files.                     | `tool-noise`              | No whitespace errors; warnings are Git line-ending normalization notices on touched test files.              |

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
| `corepack pnpm nx test poms-api`                  | Passed, 46 suites / 561 tests                       |
| `corepack pnpm nx test poms-admin --watch=false`  | Passed, 29 suites / 164 tests                       |
| `corepack pnpm nx run poms-api:migration-up`      | Passed on local development database                |
| `corepack pnpm nx run poms-api:migration-check`   | Passed                                              |
| `corepack pnpm run format:md:check`               | Passed                                              |
| `git diff --check`                                | Passed, with CRLF normalization warnings            |

## 4. G4 Conclusion

- Gate Status: `Pass`
- Delivered boundary matches the `EX-58B` baseline.
- This slice is safe as an input for `EX-58C`, `FE-53` and `EX-59`.
- Parent `EX-58` remains open until configuration dictionary governance and core status history governance are completed.
