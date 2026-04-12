# EX-06B4 PROCUREMENT 映射实施基线包

- Gate Status: `Pass`
- Parent: `EX-06B`
- Owner: `Codex`
- Slice Type: `api-command + query + persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-12`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-06B4`

---

## 1. 范围

- 本次目标: 把已落地的 `PayableRecord` 正式映射为 `PROCUREMENT` 类型的 `ProjectActualCostRecord`，并补齐统一成本记录对采购承诺来源的回看摘要与同源当前有效去重规则。
- 本次明确不做: 不在本切片补 `INCLUDED / VOIDED` 通用动作；不补完整采购累计引擎；不把 `PROCUREMENT` 自动变成项目实际累计金额；不补新的采购主对象。
- 下游可依赖的交付边界: `registerProcurementCostRecord` 命令、`PAYABLE_RECORD -> PROCUREMENT` 当前有效唯一约束、统一成本 list/detail 对 `PayableRecord` 来源状态与计量依据的回看摘要，以及与 `PAYMENT_FACT` 并存但不默认重复纳入的最小链路口径。
- 不允许下游依赖的留白: 当前 `PayableRecord` 只有承诺金额 `registeredAmount`，没有稳定税额拆分，因此 `taxCostAmount / amountExcludingTax` 仍不构成可宣称稳定的采购税务拆分口径。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor | Status   | Notes                                                   |
| ------------------------- | ----------------------------------------------------------------- | ---------------- | -------- | ------------------------------------------------------- |
| Business design           | `phase2-project-actual-cost-records.md`                           | 8, 9, 10.1, 11   | Review   | 统一成本记录对象、状态机、来源回看要求                  |
| Source mapping design     | `phase2-cost-source-to-project-record-mapping.md`                 | 4, 7.8, 10, 11.1 | Review   | `PROCUREMENT` 语义、采购链去重原则、工程冻结边界        |
| Prerequisite baseline     | `ex-06-procurement-fact-prerequisite-baseline.md`                 | all              | Pass     | `PayableRecord` 主对象、状态机与最小命令 / 查询链已稳定 |
| Command design            | `interface-command-design.md`                                     | EX-06 commands   | Active   | 来源映射必须走专用命令                                  |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | 5.4              | Active   | `registerProcurementCostRecord` 请求 / 响应边界         |
| Query boundary            | `query-view-boundary-design.md`                                   | 5.2              | Active   | `ProjectActualCostRecordListView / DetailView`          |
| Data model / table freeze | `table-structure-freeze-design.md`                                | 7.5              | Active   | `project_actual_cost_record` 来源映射与当前有效约束     |
| Schema / DDL              | `schema-ddl-design.md`                                            | 8.5              | Active   | `source_type/source_id` 语义与当前有效唯一约束          |
| ADR                       | `../adr/012-data-persistence-technology-selection.md`             | SQL-first        | Accepted | migration / DDL 与 ORM metadata 一致性优先              |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | gates            | Accepted | 本切片按 `G1 / G3 / G4` 留痕                            |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                           | Implementation Rule                                                                                                       |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Business semantics        | `phase2-cost-source-to-project-record-mapping` | 当前 `PROCUREMENT` 只表达采购承诺 / 责任边界，不自动等于最终累计成本                                                      |
| Source eligibility        | `PayableRecord`                                | 只有非 `draft`、非 `voided` 的 `PayableRecord` 才允许进入统一成本层                                                       |
| Route / command naming    | `interface-command-design`                     | 使用专用命令 `registerProcurementCostRecord`，不得复用采购承诺编辑接口                                                    |
| DTO / contract naming     | `ProjectActualCostRecord` / `PayableRecord`    | `costType = PROCUREMENT`；`sourceType = PAYABLE_RECORD`；`sourceId/sourceRefNo = payableRecord.id`                        |
| Table / column naming     | `project_actual_cost_record`                   | 复用 `source_type`、`source_id`、`source_ref_no`、`record_status`                                                         |
| Date / time semantics     | `PayableRecord.expectedPaymentDate`            | `occurredOn` 固定映射 `date` 语义的预计支付日期，不回退到 `datetime`                                                      |
| Identifier semantics      | `payable_record.id`                            | 来源 ID 沿用系统内 `uuid`，但统一成本层列类型仍按 `varchar(64)` 承接来源标识                                              |
| Money / decimal semantics | `PayableRecord.registeredAmount`               | 当前稳定映射总承诺金额到 `amountIncludingTax`；税额拆分未具备 SSOT 前保持空值                                             |
| Status machine            | `PayableRecord` + `ProjectActualCostRecord`    | 首次映射生成 `REGISTERED` 的 `PROCUREMENT` 记录，并默认 `isIncludedInProjectCost = false`，防止与 `PAYMENT_FACT` 静默重计 |

---

## 4. 命令与接口边界

| Route / Controller                                       | Command / Service               | Request DTO / Contract                                                                                      | Response DTO / Contract                           | Guard / Permission        | Result |
| -------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- | ------ |
| `POST /project-actual-cost-records/register-procurement` | `registerProcurementCostRecord` | `payableRecordId`、`projectId`、`costDescription`、`evidenceSummary`、`taxImpactSummary`、`expectedVersion` | `targetId`、`businessStatusAfter`、`resultStatus` | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 命令只接受来源事实引用，不接受前端直接回填 `costType/sourceType/sourceId/recordStatus/amountIncludingTax`。
2. `PayableRecord.projectId` 与输入 `projectId` 不一致、`expectedVersion` 不一致、或来源状态为 `draft/voided` 时必须阻断映射。
3. 同一 `PayableRecord` 在同一时刻只允许一条当前有效 `PROCUREMENT` 映射记录。

---

## 5. 读侧边界

| Query / View                                    | Consumer                  | Fields                                                                                                                 | Filter / Sort                                                           | Permission Boundary       | Result |
| ----------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------- | ------ |
| `GET /projects/{projectId}/actual-cost-records` | 财务归口列表页            | `costType`、`occurredOn`、`amountIncludingTax`、`recordStatus`、`sourceType`、`sourceRefNo`、`isIncludedInProjectCost` | `costType`、`recordStatus`、`sourceType`；按 `occurredOn desc` 默认排序 | `contract:finance:manage` | Pass   |
| `GET /project-actual-cost-records/{id}`         | 财务归口详情页 / 审计回看 | `sourceStatusSummary`、`effectivePeriodSummary`、`measurementBasisSummary`、`sourceType`、`sourceRefNo`、`riskNote`    | 按 `id` 精确查询                                                        | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 详情必须能直接回看 `PayableRecord:status`，避免再次只能看到统一成本层结果。
2. `measurementBasisSummary` 必须按采购承诺金额、币种和预计支付日期回放；若后续存在付款事实，只作为补充摘要，不自动把 `PROCUREMENT` 视为已纳入累计。

---

## 6. 持久化边界

| Table                        | Migration                                                       | Entity / Repository                                             | DDL / Freeze Source                                         | Check Result |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- | ------------ |
| `project_actual_cost_record` | 新增 `uq_project_actual_cost_record_procurement_source_current` | `ProjectActualCostRecord` / `ProjectActualCostRecordRepository` | `table-structure-freeze-design.md` / `schema-ddl-design.md` | Pass         |
| `payable_record`             | 复用既有表结构，无新增字段                                      | `PayableRecord` / `ContractFinanceRepository`                   | `contract-finance-design.md`                                | Pass         |

| Field / Rule                | DDL / Table Freeze                                      | Entity / Source Fact                                   | Shared Contract / OpenAPI                           | Result |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- | ------ |
| `costType`                  | `project_actual_cost_record.cost_type`                  | `PROCUREMENT`                                          | `ProjectActualCostRecordSummary.costType`           | Pass   |
| `sourceType`                | `project_actual_cost_record.source_type`                | `PAYABLE_RECORD`                                       | `ProjectActualCostRecordSummary.sourceType`         | Pass   |
| `sourceId`                  | `project_actual_cost_record.source_id varchar(64)`      | `PayableRecord.id -> ProjectActualCostRecord.sourceId` | `ProjectActualCostRecordSummary.sourceId`           | Pass   |
| `sourceRefNo`               | `project_actual_cost_record.source_ref_no varchar(128)` | `PayableRecord.id`                                     | `ProjectActualCostRecordSummary.sourceRefNo`        | Pass   |
| `occurredOn`                | `project_actual_cost_record.occurred_on date`           | `PayableRecord.expectedPaymentDate(date)`              | `ProjectActualCostRecordSummary.occurredOn`         | Pass   |
| `amountIncludingTax`        | `project_actual_cost_record.amount_including_tax`       | `PayableRecord.registeredAmount(decimal)`              | `ProjectActualCostRecordSummary.amountIncludingTax` | Pass   |
| `recordStatus`              | `project_actual_cost_record.record_status`              | 首次映射 `REGISTERED`                                  | `ProjectActualCostRecordSummary.recordStatus`       | Pass   |
| `current-effective mapping` | `REGISTERED/CONFIRMED/INCLUDED` 条件唯一约束            | repository guard + partial unique index                | 行为约束                                            | Pass   |

---

## 7. 一致性结论

- Prerequisite -> mapping: 先落地 `PayableRecord` 主对象，再做 `PROCUREMENT` 映射，避免再次出现上游对象不存在但映射先开工。
- Route -> command: 采购映射必须走专用命令，不得通过采购承诺更新接口顺带写入统一成本记录。
- Source -> record: 当前只把正式承诺态 `PayableRecord` 视为可登记采购成本来源，避免把草稿台账误当成正式成本。
- Migration -> entity -> repository: 采购映射当前有效唯一约束已同时落到 migration、entity metadata 与 repository guard。
- Query -> detail: 统一成本详情已能回看 `PayableRecord` 当前状态与计量依据，不再是只看成本层黑箱结果。
- Inclusion boundary: `PROCUREMENT` 与 `PAYMENT_FACT / INVOICE` 允许并存，但本切片默认不自动纳入项目累计，只表达承诺边界和来源解释。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Result | Gap / Reason                                                                              |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Pass   |                                                                                           |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Pass   | 24 suites / 262 tests passed                                                              |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Pass   | 9 suites / 51 tests passed                                                                |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` + `corepack pnpm nx run shared-api-client:generate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pass   | 已生成 `register-procurement-cost-record-request` client model                            |
| Migration / schema check         | Yes      | `corepack pnpm exec mikro-orm migration:up --config apps/poms-api/src/mikro-orm.config.ts` + `corepack pnpm nx run poms-api:migration-check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Pass   | 已应用 `Migration20260412233000_add_procurement_source_current_unique`，schema up-to-date |
| Diff whitespace check            | Yes      | `git diff --check -- apps/poms-api/src/app/features/project-cost/project-actual-cost-record.entity.ts apps/poms-api/src/app/features/project-cost/project-cost.controller.ts apps/poms-api/src/app/features/project-cost/project-cost.repository.ts apps/poms-api/src/app/features/project-cost/project-cost.service.ts apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts apps/poms-api/src/migrations/Migration20260412233000_add_procurement_source_current_unique.ts apps/poms-api-e2e/src/support/actual-cost-api.ts apps/poms-api-e2e/src/poms-api/actual-cost-workflow.e2e-spec.ts libs/shared/contracts/src/lib/shared-contracts.ts libs/api/contracts/src/lib/project-cost/project-cost.dto.ts libs/shared/api-spec/openapi.json libs/shared/api-client/api/project-cost.service.ts libs/shared/api-client/model/register-procurement-cost-record-request.ts libs/shared/api-client/model/models.ts docs/design/ex-06-procurement-cost-mapping-baseline.md docs/design/phase2-development-execution-tracker.md docs/design/phase2-cost-source-to-project-record-mapping.md docs/design/poms-design-progress.md` | Pass   | 聚焦本切片触达文件，无 whitespace error                                                   |

### 8.1 关键验证证据摘要

- 命令链验证: 已覆盖正式 `PayableRecord` 登记采购成本、项目归属冲突阻断、版本冲突阻断与重复当前有效映射阻断。
- 来源回看验证: 已在统一成本 detail 中回放 `PayableRecord:status`、预计支付日期与承诺金额摘要，并保留支付进度补充信息。
- 并存边界验证: `poms-api-e2e` 已覆盖同一 `PayableRecord` 先映射 `PROCUREMENT`、后创建并确认 `PaymentRecord` 再映射 `PAYMENT_FACT` 的链路，确认两类记录可并存且默认不静默互相覆盖。
- 契约一致性验证: 已同步回写 shared contracts、OpenAPI spec 与 generated client，确保 DTO、路由和响应类型不再停留在设计占位状态。

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                         |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前切片无额外例外；但更完整的累计、分摊与税务影响吸收口径仍属于 `EX-07` 范围 |

---

## 10. G4 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-12`
- Conditions:
  1. 本结论代表 `EX-06B4` 已完成 `registerProcurementCostRecord`、`PAYABLE_RECORD -> PROCUREMENT` 当前有效唯一约束、统一成本来源回看、OpenAPI / client、tests 与文档回写的最小闭环。
  2. `PROCUREMENT` 当前只表达采购承诺边界，默认 `REGISTERED` 且 `isIncludedInProjectCost = false`；若后续要改变累计口径，必须进入 `EX-07` 或新的专用切片。
  3. 后续不得再另造平行采购承诺对象替代 `PayableRecord`，除非先新增 ADR / 设计决策并整体改口。
