# EX-07A 分摊、税务影响与期末快照模型 实施基线包

- Gate Status: `Pass`
- Parent: `EX-07`
- Owner: `Claude`
- Slice Type: `persistence`
- G1 Reviewer: Claude
- G1 Date: 2026-04-14
- Tracker Link / Row: `phase2-development-execution-tracker.md` EX-07A

---

## 1. 范围

- **本次目标**: 建立分摊、税务处理、实时 / 期末快照模型的持久化结构（migration + entity）。涵盖：`shared_cost_allocation_basis`、`shared_cost_allocation_result`、`cost_stage_attribution_snapshot`、`accounting_tax_treatment_snapshot`、`operating_baseline_package`、`change_package_baseline`、`project_operating_snapshot`、`period_closing_snapshot`。
- **本次明确不做**:
  - 命令实现（`confirmSharedCostAllocationBasis` 等）→ EX-07B
  - 查询接口与 query view → EX-07C
  - `operating_restatement_record` → EX-07B
  - `operating_signal_evaluation_result` / `data_maturity_evaluation_result` / `operating_signal_gate_binding` → EX-13
  - `contract_handover_rebaseline_record` 表本身 → EX-08
  - `handover_rebaseline_record_id` FK 约束 → 本切片延迟，已由 EX-08A1 补齐（见例外 EX-07A-E01）
- **下游可依赖的交付边界**: 8 张表的 migration 落地，entity 与 DDL 一致，`migration-check` 通过
- **不允许下游依赖的留白**: `handover_rebaseline_record_id` FK 约束；命令层任何写侧链路

---

## 2. 正式输入

| Input Type                | Document / Source                                              | Section / Anchor         | Status   | Notes                                                     |
| ------------------------- | -------------------------------------------------------------- | ------------------------ | -------- | --------------------------------------------------------- |
| Business design           | `phase2-actual-cost-accumulation-stage-view.md`                | §5 累计口径、§7 阶段视图 | Review   | 三层累计值语义、阶段归属规则                              |
| Business design           | `phase2-estimated-to-actual-cost-bridge.md`                    | §3 基线版本规则          | Review   | `originalBaselineCost` / `changePackageBaselineCost` 语义 |
| Schema / DDL              | `schema-ddl-design.md`                                         | §8.8.1–8.8.3             | Active   | 主键、FK、索引、字段补点                                  |
| Data model / table freeze | `table-structure-freeze-design.md`                             | §8.8（L2 列）            | Active   | 表分层与关系定义                                          |
| ADR                       | `adr/007-phase1-finance-integration-and-recording-boundary.md` |                          | Accepted | 一期只做业务登记，不做强财务联动                          |
| ADR                       | `adr/012-data-persistence-technology-selection.md`             |                          | Accepted | SQL-first migration + MikroORM                            |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                               | Implementation Rule                                                      |
| ------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| Business semantics        | `phase2-actual-cost-accumulation-stage-view.md`    | 三层累计口径 `registered/confirmed/included`；阶段归属锁定语义           |
| Table / column naming     | `schema-ddl-design.md §8.8`                        | snake_case，schema = `poms`                                              |
| Money / decimal semantics | `ex-06d-payable-payment-tax-semantics-baseline.md` | `decimal(18,2)`；不含税 / 税额 / 含税分列；金额字段 `not null default 0` |
| Date / time semantics     | 既有惯例                                           | `date` 用于日期；`timestamptz` / `datetime` 用于时间点                   |
| Identifier semantics      | 既有惯例                                           | 内部 PK 全为 `uuid`；`gen_random_uuid()` 默认值                          |
| Status machine            | `schema-ddl-design.md §8.8`                        | `varchar(32)` 枚举式状态；`active` / `superseded` / `voided` 等          |

---

## 4. 命令与接口边界

N/A — 本切片仅建立持久化结构，不涉及命令或查询接口。

---

## 5. 读侧边界

N/A — 本切片不新增查询接口。

---

## 6. 持久化边界

| Table                               | Migration                           | Entity / Repository                             | DDL / Freeze Source           | Check Result |
| ----------------------------------- | ----------------------------------- | ----------------------------------------------- | ----------------------------- | ------------ |
| `shared_cost_allocation_basis`      | `Migration20260414100000_ex07a_...` | `SharedCostAllocationBasis` entity（本次）      | `schema-ddl-design.md §8.8.1` | 待跑         |
| `shared_cost_allocation_result`     | 同上                                | `SharedCostAllocationResult` entity（本次）     | `schema-ddl-design.md §8.8.1` | 待跑         |
| `cost_stage_attribution_snapshot`   | 同上                                | `CostStageAttributionSnapshot` entity（本次）   | `schema-ddl-design.md §8.8.1` | 待跑         |
| `accounting_tax_treatment_snapshot` | 同上                                | `AccountingTaxTreatmentSnapshot` entity（本次） | `schema-ddl-design.md §8.8.2` | 待跑         |
| `operating_baseline_package`        | 同上                                | `OperatingBaselinePackage` entity（本次）       | `schema-ddl-design.md §8.8.2` | 待跑         |
| `change_package_baseline`           | 同上                                | `ChangePackageBaseline` entity（本次）          | `schema-ddl-design.md §8.8.2` | 待跑         |
| `project_operating_snapshot`        | 同上                                | `ProjectOperatingSnapshot` entity（本次）       | `schema-ddl-design.md §8.8.3` | 待跑         |
| `period_closing_snapshot`           | 同上                                | `PeriodClosingSnapshot` entity（本次）          | `schema-ddl-design.md §8.8.3` | 待跑         |

---

## 7. 一致性结论

- Document -> code: migration 字段与 `schema-ddl-design.md §8.8` 字段补点一一对应
- Migration -> entity: entity 属性名 camelCase 映射 SQL snake_case，通过 `fieldName()` 显式声明
- Entity -> contract / OpenAPI: N/A（本切片无命令/查询接口）
- Route -> command: N/A
- Query / view: N/A
- Guard / permission: N/A
- OpenAPI / generated client: N/A

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                     | Result | Gap / Reason                                        |
| -------------------------------- | -------- | -------------------------------------- | ------ | --------------------------------------------------- |
| Build                            | Yes      | `pnpm nx build poms-api`               | 待跑   |                                                     |
| Unit tests                       | No       | N/A — 本切片无业务逻辑                 | N/A    | persistence-only 切片                               |
| API / integration tests          | No       | N/A — 无接口                           | N/A    |                                                     |
| E2E                              | No       | N/A — 无用户可见页面或命令接口         | N/A    |                                                     |
| OpenAPI generation / client diff | No       | N/A — 无接口变更                       | N/A    |                                                     |
| Migration / schema check         | Yes      | `pnpm nx run poms-api:migration-check` | 待跑   | 全局历史 drift 为既有基线问题，本切片不引入新 drift |

---

## 9. 例外与风险

| Exception ID | Level  | Scope                                                                                                                          | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                                        |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------- | ----------- | -------------------------------------------------------------------------------------------- |
| EX-07A-E01   | Closed | `project_operating_snapshot.handover_rebaseline_record_id`、`period_closing_snapshot.handover_rebaseline_record_id` 的 FK 约束 | Claude      | Codex         | 2026-04-15  | 已由 EX-08A1 补齐到 `contract_handover_rebaseline_record.id` 的 FK，并通过 `migration-check` |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: Claude
- Approved At: 2026-04-14
- Conditions: EX-07A-E01 例外已显式记录；本切片仅落持久化结构，无命令/查询接口，build + migration-check 通过后视为 G4 = Pass
