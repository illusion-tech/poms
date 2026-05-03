# EX-59 后端与 shared contracts 枚举回归扫描扩展基线

- Task ID: `EX-59`
- Slice type: `governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-59`
- Public route surface: no new, changed or removed public route
- Status: `G1`
- G1 Date: 2026-05-04

## 1. Background

`EX-58A` 和 `EX-60` 已经把大量 contracts / frontend 闭合枚举收敛为 shared SSOT；但 `check:enum-like-strings` 原先主要扫描 Admin、data-access 和 generated client，无法阻止后端 service/entity/spec 或 shared contracts 重新出现 enum-like 字符串字面量。

`EX-59` 的目标是扩展扫描覆盖面并建立可回归的显式分类，不在本片直接替换全部后端历史枚举债。

## 2. Scope

| Area           | Decision                                                                                                                                        |                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Scan roots     | 继续扫描 Admin / data-access / generated client，新增 `apps/poms-api/src/app/features`、`libs/api/contracts/src`、`libs/shared/contracts/src`。 |                             |
| New rule       | 新增 `inline-string-union`，捕捉 `type XxxStatus = 'a'                                                                                          | 'b'` 一类后端本地闭合枚举。 |
| New rule       | 新增 `inline-z-enum`，捕捉 `z.enum([...])` 直接内联数组。                                                                                       |                             |
| Baseline guard | allowlist 增加可选 `maxMatches`，对当前后端历史债建立数量上限，防止新增同类裸字符串被宽泛 pathPrefix 静默吞掉。                                 |                             |
| Classification | 当前发现要么进入显式 allowlist，要么后续创建治理切片；本片不替代运行时 contracts 重构。                                                         |                             |

## 3. Scanner Changes

| Change                    | Purpose                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| Add backend root          | 覆盖 service、repository、controller、entity、spec 中的 enum-like 字符串。        |
| Add shared contract root  | 覆盖 shared contracts 内的 inline `z.enum` 和低层 helper 例外。                   |
| Add API contract root     | 为后续 DTO / OpenAPI contract 文件防回退预留扫描面。                              |
| Add `inline-string-union` | 捕捉 entity-local string union，推动迁移到 shared named schema / value object。   |
| Add `inline-z-enum`       | 捕捉直接写 code literal 的 zod enum；派生子集只能从已命名 Value object 常量构造。 |
| Add `maxMatches`          | 允许历史债分类，同时让新增 finding 导致 CI 失败。                                 |

## 4. Initial Finding Classification

| Allowlist ID | Rule                   | Scope                                 | Baseline Count | Cleanup Owner                 |
| ------------ | ---------------------- | ------------------------------------- | -------------- | ----------------------------- |
| `EX59-A1`    | `inline-string-union`  | Backend feature files                 | 33             | Future backend enum hardening |
| `EX59-A2`    | `enum-like-comparison` | Backend feature files                 | 115            | Future backend enum hardening |
| `EX59-A3`    | `enum-like-fixture`    | Backend feature files                 | 812            | Future backend enum hardening |
| `EX59-A5`    | `string-as-const`      | Backend feature files                 | 19             | Future backend enum hardening |
| `EX59-A4`    | `record-string-string` | Project cost focused spec helper      | 1              | `EX-59`                       |
| `EX59-A6`    | `record-string-string` | Shared generic `enumObjectValues`     | 1              | `EX-60`                       |
| `EX59-A7`    | `inline-z-enum`        | Shared derived customer status schema | 1              | `EX-60`                       |

The expanded scan currently reports `1184` total findings, all classified by `29` allowlist entries.

## 5. Non-goals

- 不在本片批量替换后端 service/spec 里的全部状态字面量。
- 不改变 enum code value。
- 不引入中文枚举 code value、旧值兼容、fallback 或 mapping。
- 不修改 OpenAPI 或 generated client。
- 不改变 runtime behavior。

## 6. Follow-up Governance

后端治理必须拆为更小切片，按业务边界替换：

| Follow-up Area              | Target                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Backend entity local unions | 从 shared contracts 的 named schema / Value object 派生，不在 entity 文件本地定义。 |
| Backend service comparisons | 改用 shared `Value` object 或 metadata definitions 派生常量。                       |
| Backend typed fixtures      | 建立测试 fixture helper，用 shared constants 生成对象，减少 spec 中裸字符串。       |
| Swagger schema literals     | 区分 OpenAPI 技术类型 `type: 'string'` 和业务 enum 字段，避免误扫或误治理。         |

## 7. Validation Plan

| Check                                       | Purpose                                   |
| ------------------------------------------- | ----------------------------------------- |
| `corepack pnpm run check:enum-like-strings` | 验证扩展后的扫描器和 allowlist baseline。 |
| `corepack pnpm run format:md:check`         | 文档表格格式回归。                        |
| `git diff --check`                          | 补丁 whitespace 检查。                    |

## 8. G1 Decision

`EX-59` 可以进入实现：它只改治理工具、allowlist 和文档，不改变运行时代码或 public route。
