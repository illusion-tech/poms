# EX-06 执行期成本记录第一批纠偏 Checkpoint

- Checkpoint Status: `Block`
- Parent: `EX-06`
- Owner: `Codex`
- Slice Type: `persistence + api-command + contract`
- G3 Reviewer: `Solo worktree checkpoint`
- Checkpoint Date: `2026-04-11`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-06`

---

## 1. 触发背景与范围

- 触发原因: EX-06 已开工后，发现已实现代码与冻结表 / DDL / 契约之间存在第一批真实 drift，无法直接进入 `G3 = Pass`。
- 本次目标: 修复 EX-06 第一批高风险真实偏差，并把剩余未交付范围从父任务中拆清。
- 本次明确不做: 不在本批补齐采购、发票、费用、付款事实的完整来源映射命令与读侧追溯。
- 本次纠偏后可恢复的可信边界: `internal_cost_rate_version` 版本链、`ProjectActualCostRecord` 契约类型、LABOR 登记 / 替代写侧可追溯性。
- 仍不允许下游依赖的留白: 非 LABOR 来源映射范围仍不得作为 EX-06 完成证据。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor | Status   | Notes                                      |
| ------------------------- | ----------------------------------------------------------------- | ---------------- | -------- | ------------------------------------------ |
| Business design           | `phase2-project-actual-cost-records.md`                           | 6.3A - 6.3E      | Accepted | LABOR 成本率版本、期间拆分、替代链规则     |
| Source mapping design     | `phase2-cost-source-to-project-record-mapping.md`                 | 3.5              | Accepted | LABOR 必须引用有效 `rateVersionId`         |
| Command design            | `interface-command-design.md`                                     | EX-06 commands   | Accepted | 成本率发布、LABOR 登记、LABOR 替代         |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | B5               | Accepted | 成本率与人力成本字段包                     |
| Query boundary            | `query-view-boundary-design.md`                                   | cost detail view | Accepted | 详情默认受敏感字段权限边界约束             |
| Data model / table freeze | `table-structure-freeze-design.md`                                | 7.5              | Accepted | `rate_key`、`version`、`status`、替代链    |
| Schema / DDL              | `schema-ddl-design.md`                                            | 8.5              | Accepted | `rate_key + version` 与当前有效唯一性约束  |
| ADR                       | `../adr/012-data-persistence-technology-selection.md`             | SQL-first        | Accepted | DDL / migration 优先，不以下游代码漂移为准 |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | gates            | Accepted | 本切片按 `G1 / G3 / G4` 留痕               |

---

## 3. Drift 清单与本次 SSOT

| Concern                   | Drift / SSOT                         | Corrective Rule                                          |
| ------------------------- | ------------------------------------ | -------------------------------------------------------- |
| Business semantics        | `phase2-project-actual-cost-records` | LABOR 记录必须引用唯一有效成本率版本                     |
| Route / command naming    | `interface-command-design`           | 保留专用命令，不用普通协作页字段包写入                   |
| DTO / contract naming     | Entity / DDL + OpenAPI design        | 日期、来源 ID、替代链命名必须与持久化语义一致            |
| Table / column naming     | `table-structure-freeze-design`      | 补齐 `rate_key`、`version`、`status` 与当前有效约束      |
| Date / time semantics     | DDL                                  | `date` 字段在 contract 中使用 date 语义，不使用 datetime |
| Identifier semantics      | DDL                                  | 外部来源 ID 使用 `varchar(64)` 语义，不强制 UUID         |
| Money / decimal semantics | Entity / DDL                         | 金额字段写入计算结果，不允许 LABOR 金额默认为 `0`        |
| Status machine            | Design docs                          | 成本率版本使用 active / superseded；成本记录使用现有状态 |

---

## 4. 当前阻断结论

当前 `G3 = Block`，原因如下：

1. 非 LABOR 来源映射命令和读侧追溯仍未实现。
2. 修复前的成本率版本链缺少 `rate_key`、`version`、`status` 和当前有效约束。
3. 修复前的共享契约把多个 `date` / `varchar(64)` 字段表达成了 `datetime` / `uuid`。
4. 修复前的 LABOR 写侧没有校验费率覆盖期间，也没有计算金额和正确落替代链字段。

本 checkpoint 只允许第一批修复进入验证，不允许据此关闭 EX-06 父任务。

---

## 5. 本次纠偏范围与修复结果

本批已修复范围：

1. `internal_cost_rate_version` 补齐 `rate_key`、`version`、`status`、`is_current`、版本唯一约束与当前有效约束。
2. 共享契约已把成本记录 `date` 字段改为 date-only 语义，把来源 ID 改为 `varchar(64)` 语义，并统一替代链字段为 `supersedesRecordId`。
3. LABOR 登记 / 替代写侧已校验费率版本覆盖整个人力期间，并按 `HOUR` / `DAY` 计算金额。
4. LABOR 写侧已落 `rateVersionId`、`supersedesRecordId`、`internalCostRate`、`laborAmount` 与来源摘要。

本批未修复范围：

1. 采购 / 发票 / 费用 / 付款事实的完整来源映射命令。
2. 项目实际成本读侧对全部来源对象的统一追溯。

| Concern      | Before                                                       | After                                      | Result |
| ------------ | ------------------------------------------------------------ | ------------------------------------------ | ------ |
| 成本率版本链 | 缺 `rate_key`、`version`、`status` 与当前有效约束            | 已补齐版本链字段与唯一约束                 | Pass   |
| 共享契约类型 | 多个 `date` / `varchar(64)` 被错误表达为 `datetime` / `uuid` | 已改回 date-only 与外部来源 ID 语义        | Pass   |
| LABOR 金额   | 金额未计算，默认写 `0`                                       | 已按 `HOUR` / `DAY` 正确计算并落库         | Pass   |
| LABOR 替代链 | 替代字段命名与实体不一致                                     | 已统一为 `supersedesRecordId` 并正确持久化 | Pass   |

---

## 6. 测试与校验

| Check                            | Required | Command / Evidence                                      | Result | Gap / Reason                                                     |
| -------------------------------- | -------- | ------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                       | Pass   |                                                                  |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api`                        | Pass   |                                                                  |
| API / integration tests          | Yes      | `project-cost.service.spec.ts`                          | Pass   | controller / route 收口由 `poms-api-e2e` 覆盖                    |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e`                 | Pass   |                                                                  |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` + client update | Pass   |                                                                  |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-check`         | Pass   | `git diff --check` 另行通过，generated `FILES` 仅有 CRLF warning |

---

## 7. 残余阻断与后续切片

已解除的阻断：

1. 第一批真实偏差修复已完成并完成真实数据库环境校验，可作为独立 corrective slice 收口。
2. `migration-check` 已通过，说明本轮 migration、DDL 与 ORM metadata 已重新对齐；本批不再存在新增 schema drift。
3. `poms-api-e2e` 已通过，说明第一批修复未破坏当前 API 主路径、seed 初始化与合同到成本记录的现有最小闭环。

仍存在的阻断：

1. 采购 / 发票 / 费用 / 付款事实的来源映射命令仍未实现。
2. 项目实际成本读侧追溯接口仍未实现。

后续子切片：

1. `EX-06B1`：`PAYMENT_FACT` 映射与 finance-scoped 读侧。
2. `EX-06B2A / EX-06B2 / EX-06B3A / EX-06B3 / EX-06B4`：继续分解非 LABOR 来源主对象、映射命令与读侧追溯。

---

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                                    |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前 checkpoint 无单独例外；EX-06 父任务仍保持未完成，不以“已修第一批 drift”替代完整交付 |

---

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Block`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-11`
- Conditions:
  1. 第一批 corrective slice 已收口，且 migration / entity / contract / LABOR 写侧已重新对齐。
  2. EX-06 父任务不得据此进入 `Done` / `G4`。
  3. 后续来源映射与统一读侧追溯必须拆为独立可执行子切片继续推进。
