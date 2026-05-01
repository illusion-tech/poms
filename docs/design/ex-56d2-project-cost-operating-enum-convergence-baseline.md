# EX-56D2 项目成本与经营快照枚举收口实施基线包

- Gate Status: `Pass`
- Parent: `EX-56D`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-02`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-56D2`

## 1. 范围

- 本次目标:
  - 收敛项目实际成本、经营基线、经营快照、期间关账、经营重述、成本归属、数据成熟度、经营信号、税务处理、共享成本分摊表链中的闭合 enum-like 字段。
  - 建立 shared contract 中的 `as const` 值集、union type、`z.enum` schema 与 value object。
  - 在实体和 migration 中补齐 DB check constraint，并把 service / repository 中的关键业务写入与判断字面量迁移到 value object。
  - 保持现有经营算法、金额计算、权限、路由和前端交互不变。
- 本次明确不做:
  - 不新增、改名或删除 public API route。
  - 不改变经营核算公式、成熟度 / 信号评价算法、提成 gate 判定算法。
  - 不收敛提成计算、发放、调整、最终结算表链；这些由 `EX-56D3` 承接。
  - 不强行枚举 `basisType`、`taxTreatmentType`、`allocationMethod`、`gateStageType`、`gateReviewDecision` 等仍属于业务配置、下游阶段或人工结论文案的开放字段。
- 下游可依赖的交付边界:
  - shared contracts、OpenAPI / generated client、实体 check、迁移与 API 写入路径对本切片闭合枚举保持一致。
  - 开发库现有数据被迁移约束覆盖，后续 `FE-52` 可消费 generated enum。
- 不允许下游依赖的留白:
  - 开放分类字段不会在本切片变成固定字典。
  - `commission-gate-review-record` 及其他提成域字段不作为本切片完成口径。

## 2. 正式输入

| Input Type                | Document / Source                                         | Section / Anchor                          | Status   | Notes                         |
| ------------------------- | --------------------------------------------------------- | ----------------------------------------- | -------- | ----------------------------- |
| Business design           | `docs/design/data-model-prerequisites.md`                 | Operating signal / L4 model prerequisites | Accepted | 表链与稳定结果包来源。        |
| Command design            | `docs/design/interface-command-design.md`                 | `reviewOperatingSignalEvaluation` 等      | Accepted | 不改命令语义，仅收敛字段值。  |
| DTO / OpenAPI design      | `docs/design/interface-openapi-dto-design.md`             | L4 / project-cost DTO                     | Accepted | shared contract 为 DTO SSOT。 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`            | project-cost rows                         | Aligned  | 本切片不触及 route surface。  |
| Query boundary            | `docs/design/query-view-boundary-design.md`               | Operating signal / finance views          | Accepted | Query 字段保持原语义。        |
| Data model / table freeze | `apps/poms-api/src/app/features/project-cost/*.entity.ts` | project-cost entities                     | Accepted | 以现有表结构追加 check。      |
| Schema / DDL              | 开发库取值盘点                                            | 2026-05-02 psql distinct evidence         | Accepted | 现值均在本基线值集内。        |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`             | N/A                                       | N/A      | 无 route 变化。               |

## 3. 本次 SSOT

| Concern                     | SSOT                                                | Implementation Rule                                                    |
| --------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Business semantics          | `EX-56` 枚举治理基线 + 本 G1 基线                   | 只做枚举治理，不改变项目成本 / 经营算法。                              |
| Public route canonical path | `docs/design/api-route-canonical-inventory.md`      | 不新增或改动 route。                                                   |
| Route / command naming      | 现有 controller / service method                    | 不重命名命令。                                                         |
| DTO / contract naming       | `libs/shared/contracts/src/lib/shared-contracts.ts` | `as const` 值集 + type + `z.enum` + Value object。                     |
| Table / column naming       | 现有 entity / migration                             | 追加 check constraint，不改列名。                                      |
| Date / time semantics       | 现有 contract/entity                                | `date` 与 `datetime` 不变。                                            |
| Identifier semantics        | 现有 contract/entity                                | UUID / 外部来源标识不变。                                              |
| Money / decimal semantics   | 现有 contract/entity                                | 金额精度、格式化与计算不变。                                           |
| Status machine              | 本基线枚举表                                        | 状态、模式、动作等级、来源类型、信号等级必须使用 shared value object。 |

## 4. 命令与接口边界

| Route / Controller                                  | Command / Service                          | Request DTO / Contract                 | Response DTO / Contract                     | Guard / Permission | Design Source                   | Result              |
| --------------------------------------------------- | ------------------------------------------ | -------------------------------------- | ------------------------------------------- | ------------------ | ------------------------------- | ------------------- |
| Existing `ProjectCostController` routes             | project actual cost commands               | `CreateProjectActualCostRecordRequest` | `ProjectActualCostRecordSummary/DetailView` | unchanged          | interface docs + current routes | Contract enum only. |
| Existing operating baseline / snapshot routes       | baseline, snapshot, period close, restate  | existing request contracts             | existing summary contracts                  | unchanged          | interface docs + current routes | Contract enum only. |
| Existing cost attribution / tax / allocation routes | attribution, tax treatment, allocation     | existing request contracts             | existing summary/list contracts             | unchanged          | interface docs + current routes | Contract enum only. |
| Existing operating signal routes                    | signal review / gate binding query-command | existing request contracts             | existing signal / gate / L4 view contracts  | unchanged          | interface docs + current routes | Contract enum only. |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): unchanged existing project-cost rows
- Current implemented route(s): unchanged
- Inventory status: `aligned`
- Route governance source: `ADR-015`
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View                            | Consumer    | Fields                                                                  | Filter / Sort | Permission Boundary | Design Source            | Result                                              |
| --------------------------------------- | ----------- | ----------------------------------------------------------------------- | ------------- | ------------------- | ------------------------ | --------------------------------------------------- |
| `ProjectActualCostRecordSummary/Detail` | API / Admin | cost type, source type, record status, labor period type                | unchanged     | unchanged           | shared contract          | enum typed.                                         |
| `OperatingBaselinePackageSummary`       | API / Admin | status, baseline selection source                                       | unchanged     | unchanged           | shared contract          | enum typed.                                         |
| `ProjectOperatingSnapshotSummary`       | API / Admin | snapshot mode, action level, baseline selection source, status          | unchanged     | unchanged           | query boundary           | enum typed.                                         |
| `PeriodClosingSnapshotSummary`          | API / Admin | period snapshot mode, action level, baseline source, status             | unchanged     | unchanged           | query boundary           | enum typed.                                         |
| `OperatingRestatementSummary`           | API / Admin | status                                                                  | unchanged     | unchanged           | query boundary           | enum typed.                                         |
| `SharedCostAllocation*Summary`          | API / Admin | status                                                                  | unchanged     | unchanged           | data model prerequisites | enum typed; basis remains string.                   |
| `CostStageAttributionSnapshotSummary`   | API / Admin | attribution mode, status                                                | unchanged     | unchanged           | query boundary           | enum typed.                                         |
| `AccountingTaxTreatmentSnapshotSummary` | API / Admin | status, deductibility status                                            | unchanged     | unchanged           | data model prerequisites | status typed; type remains string.                  |
| `OperatingSignalEvaluationView`         | API / Admin | formula boundary action, signal level, risk-derived views, action level | unchanged     | unchanged           | query boundary           | enum typed where closed.                            |
| `CommissionGateBindingHistoryView`      | API / Admin | binding action, action level, baseline source, signal/maturity levels   | unchanged     | unchanged           | query boundary           | enum typed where closed; gate stage remains string. |

## 6. 持久化边界

| Table                                  | Migration                                                              | Entity / Repository                      | DDL / Freeze Source          | Check Result                   |
| -------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- | ---------------------------- | ------------------------------ |
| `project_actual_cost_record`           | `Migration20260502120000_ex56d2_project_cost_operating_enum_checks.ts` | `ProjectActualCostRecord` / repository   | current entity + DB evidence | add checks.                    |
| `operating_baseline_package`           | same                                                                   | `OperatingBaselinePackage`               | current entity + DB evidence | add checks.                    |
| `change_package_baseline`              | same                                                                   | `ChangePackageBaseline`                  | current entity + DB evidence | add checks.                    |
| `project_operating_snapshot`           | same                                                                   | `ProjectOperatingSnapshot`               | current entity + DB evidence | add checks.                    |
| `period_closing_snapshot`              | same                                                                   | `PeriodClosingSnapshot`                  | current entity + DB evidence | add checks.                    |
| `operating_restatement_record`         | same                                                                   | `OperatingRestatementRecord`             | current entity + DB evidence | add checks.                    |
| `shared_cost_allocation_basis`         | same                                                                   | `SharedCostAllocationBasis`              | current entity + DB evidence | status checks only.            |
| `shared_cost_allocation_result`        | same                                                                   | `SharedCostAllocationResult`             | current entity + DB evidence | add checks.                    |
| `cost_stage_attribution_snapshot`      | same                                                                   | `CostStageAttributionSnapshot`           | current entity + DB evidence | add checks.                    |
| `accounting_tax_treatment_snapshot`    | same                                                                   | `AccountingTaxTreatmentSnapshot`         | current entity + DB evidence | status + deductibility checks. |
| `data_maturity_evaluation_result`      | same                                                                   | `DataMaturityEvaluationResult`           | current entity + tests       | add checks.                    |
| `operating_signal_evaluation_result`   | same                                                                   | `OperatingSignalEvaluationResult`        | current entity + tests       | add checks.                    |
| `operating_signal_review_record`       | same                                                                   | `OperatingSignalReviewRecord`            | current entity + tests       | add checks.                    |
| `operating_signal_gate_binding`        | same                                                                   | `OperatingSignalToCommissionGateBinding` | current entity + tests       | add checks except gate stage.  |
| `commission_final_settlement_snapshot` | same data maturity handoff field only                                  | `CommissionFinalSettlementSnapshot`      | current entity + tests       | add data maturity check only.  |

| Field                                                                         | Design Type / Meaning            | Migration / DDL                                                                    | Entity                                 | Shared Contract / OpenAPI                                 | Result              |
| ----------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- | ------------------- |
| `project_actual_cost_record.cost_type`                                        | closed cost type                 | check `PROCUREMENT/INVOICE/EXPENSE/PAYMENT_FACT/LABOR`                             | `$type<ProjectActualCostType>`         | `ProjectActualCostTypeSchema`                             | align               |
| `project_actual_cost_record.record_status`                                    | closed lifecycle                 | check `DRAFT/REGISTERED/CONFIRMED/INCLUDED/VOIDED/REPLACED`                        | `$type<ProjectActualCostRecordStatus>` | `ProjectActualCostRecordStatusSchema`                     | align               |
| `project_actual_cost_record.source_type`                                      | closed source mapping            | nullable check `PAYMENT_RECORD/INVOICE_RECORD/EXPENSE_RECORD/PAYABLE_RECORD/LABOR` | nullable typed source                  | `ProjectActualCostSourceTypeSchema.nullable()`            | align               |
| `project_actual_cost_record.labor_period_type`                                | closed labor period              | nullable check `WEEK/MONTH`                                                        | nullable typed period                  | `LaborCostPeriodTypeSchema.nullable()`                    | align               |
| Baseline / snapshot `baseline_selection_source`                               | closed baseline source           | check `original/handover_rebaseline`                                               | typed                                  | `BaselineSelectionSourceSchema`                           | align               |
| Snapshot / period `snapshot_mode`                                             | closed snapshot mode             | check `realtime/period-end/restated` or `period-end`                               | typed                                  | `OperatingSnapshotModeSchema`                             | align               |
| Snapshot / signal `current_action_level`                                      | closed action severity           | check `PROMPT/REVIEW/BLOCK`                                                        | typed                                  | `OperatingSnapshotActionLevelSchema`                      | align               |
| Shared active/superseded/voided status fields                                 | closed lifecycle                 | check `active/superseded/voided`                                                   | typed                                  | dedicated status schemas                                  | align               |
| Pending-capable status fields                                                 | closed lifecycle                 | check `pending/active/superseded/voided`                                           | typed                                  | dedicated status schemas                                  | align               |
| `cost_stage_attribution_snapshot.attribution_mode`                            | closed attribution mode          | check `auto/manual/reclassified`                                                   | typed                                  | `CostStageAttributionModeSchema`                          | align               |
| `data_maturity_level`                                                         | closed maturity code             | check `INSUFFICIENT/PRELIMINARY/MATURE`                                            | typed                                  | `OperatingDataMaturityLevelSchema`                        | align               |
| Signal `signal_level` / `risk_level`                                          | closed signal/risk level         | signal check `ATTENTION/ALERT`; risk check `ATTENTION/RISK`                        | typed                                  | `OperatingSignalLevelSchema` / `OperatingRiskLevelSchema` | align               |
| `formula_boundary_action`                                                     | closed action severity           | check `PROMPT/REVIEW/BLOCK`                                                        | typed                                  | `OperatingSnapshotActionLevelSchema`                      | align               |
| `review_decision`                                                             | closed review decision           | check `APPROVE/MANUAL_CONFIRMED`                                                   | typed                                  | `OperatingSignalReviewDecisionSchema`                     | align               |
| `deductibility_status`                                                        | closed tax deductibility         | check `pending/deductible/non-deductible`                                          | typed                                  | `AccountingTaxDeductibilityStatusSchema`                  | align               |
| `basis_type`, `tax_treatment_type`, `gate_stage_type`, `gate_review_decision` | open taxonomy / downstream stage | no check in this slice                                                             | string                                 | string                                                    | accepted open field |

## 7. 一致性结论

- Document -> code: `Pass`，本片只把既有字段值收敛为 typed enum，不改流程语义。
- ADR-015 inventory -> route: `N/A`，无 public route surface 变化。
- Migration -> entity: `Pass`，`migration-up` / `migration-check` 已通过；本片按开发期 direct cutover 处理，migration 不写兼容映射，非基线数据只能重置或人工修正。
- Entity -> contract: `Pass`，shared contracts、OpenAPI 与 generated client 已同步。
- Route -> command: `N/A`，无命令入口变化。
- Query -> view: `Pass`，view 字段类型改为 enum schema 后语义不变，Admin 展示层单独映射中文 label。
- Guard / permission: `N/A`，不改权限。
- OpenAPI / generated client: `Pass`，新增 generated enum 文件和引用。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                         | Result | Gap / Reason                                                 |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------ |
| Lint                             | yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`                                                                       | pass   | API/Admin touched.                                           |
| Build                            | yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                                                     | pass   | Admin build has existing initial bundle budget warning only. |
| Unit tests                       | yes      | `corepack pnpm nx test poms-api --runInBand`; `corepack pnpm nx test poms-admin --runInBand`                                               | pass   | API 46 suites / 561 tests; Admin 28 suites / 161 tests.      |
| API / integration tests          | targeted | `PORT=3344 corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=operating-signal-workflow.e2e-spec.ts`                      | pass   | Managed harness ran all 12 suites / 70 tests.                |
| E2E                              | optional | same as targeted API e2e                                                                                                                   | pass   | Validates routed operating signal and gate flow.             |
| OpenAPI generation / client diff | yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check` | pass   | Generated enum values are code values.                       |
| Migration / schema check         | yes      | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check`                                              | pass   | Local dev DB migrated to EX-56D2.                            |
| Markdown                         | yes      | `corepack pnpm run format:md:check`; `git diff --check`                                                                                    | pass   | Docs touched.                                                |

## 9. 例外与风险

| Exception ID | Level | Scope                                                                                                     | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                                           |
| ------------ | ----- | --------------------------------------------------------------------------------------------------------- | ----------- | ------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| EX-56D2-E1   | E1    | `basisType`、`taxTreatmentType`、`allocationMethod`、`gateStageType`、`gateReviewDecision` 保持开放字符串 | Codex       | `EX-57`       | 2026-05-10  | 这些字段当前承载配置分类、下游阶段或人工结论，不具备闭合值集；仅在 `EX-57` 例外清单中持续扫描。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-02`
- Conditions:
  - 实现不得改变金额、日期、权限、路由或经营算法。
  - 若数据库现值、seed 或测试出现本基线外值，先回到 G1 修订基线，不得顺手扩值。
