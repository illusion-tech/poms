# EX-06B3 EXPENSE 映射实施基线包

- Gate Status: `Pass`
- Parent: `EX-06B`
- Owner: `Codex`
- Slice Type: `api-command + query + persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-12`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-06B3`

---

## 1. 范围

- 本次目标: 把已落地的 `ExpenseRecord` 正式映射为 `EXPENSE` 类型的 `ProjectActualCostRecord`，并补齐从统一成本记录回看费用来源的 finance-scoped 读侧。
- 本次明确不做: 不在本切片补 `INCLUDED / VOIDED` 通用动作；不补 `PROCUREMENT` 映射；不补费用分摊、报销审批流与跨来源去重汇总规则。
- 下游可依赖的交付边界: `ExpenseRecord -> EXPENSE` 正式映射命令、当前有效唯一约束、统一成本 list/detail 对费用来源的回看摘要。
- 不允许下游依赖的留白: 当前 `ExpenseRecord` 的税额与不含税金额允许为空，因此 `taxCostAmount / amountExcludingTax` 只能在上游事实明确提供时映射，不构成可宣称稳定的自动拆分口径。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor   | Status   | Notes                                           |
| ------------------------- | ----------------------------------------------------------------- | ------------------ | -------- | ----------------------------------------------- |
| Business design           | `phase2-project-actual-cost-records.md`                           | 8, 9, 10.1, 11     | Review   | 统一成本记录对象、状态机、详情要求              |
| Source mapping design     | `phase2-cost-source-to-project-record-mapping.md`                 | 6.2, 7.8, 10, 11.1 | Review   | `EXPENSE` 映射、来源范围、工程冻结边界          |
| Prerequisite baseline     | `ex-06-expense-fact-prerequisite-baseline.md`                     | all                | Pass     | `ExpenseRecord` 主对象与最小命令 / 查询链已稳定 |
| Command design            | `interface-command-design.md`                                     | EX-06 commands     | Active   | 来源映射必须走专用命令                          |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | 5.4                | Active   | `registerExpenseCostRecord` 请求 / 响应边界     |
| Query boundary            | `query-view-boundary-design.md`                                   | 5.2                | Active   | `ProjectActualCostRecordListView / DetailView`  |
| Data model / table freeze | `table-structure-freeze-design.md`                                | 7.5                | Active   | `project_actual_cost_record` 来源映射约束       |
| Schema / DDL              | `schema-ddl-design.md`                                            | 8.5                | Active   | 当前有效唯一约束与 `source_type/source_id` 语义 |
| ADR                       | `../adr/012-data-persistence-technology-selection.md`             | SQL-first          | Accepted | migration / DDL 与 ORM metadata 一致性优先      |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | gates              | Accepted | 本切片按 `G1 / G3 / G4` 留痕                    |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                           | Implementation Rule                                                                   |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Business semantics        | `phase2-cost-source-to-project-record-mapping` | 当前只允许已确认的 `ExpenseRecord` 映射为 `EXPENSE`                                   |
| Source eligibility        | `ExpenseRecord`                                | 只有 `status = confirmed` 的费用事实，才允许进入统一成本层                            |
| Route / command naming    | `interface-command-design`                     | 使用专用命令 `registerExpenseCostRecord`，不得复用普通费用编辑接口                    |
| DTO / contract naming     | `ProjectActualCostRecord` / `ExpenseRecord`    | `costType = EXPENSE`；`sourceType = EXPENSE_RECORD`；`sourceRefNo = ExpenseRecord.id` |
| Table / column naming     | `project_actual_cost_record`                   | 复用 `source_type`、`source_id`、`source_ref_no`、`record_status`                     |
| Money / decimal semantics | `expense_record` 金额字段组                    | `amountIncludingTax` 必映射；`taxAmount / amountExcludingTax` 仅在上游存在时映射      |
| Status machine            | `ExpenseRecord` + `ProjectActualCostRecord`    | 已确认费用首次映射直接生成 `CONFIRMED` 的 `EXPENSE` 记录                              |
| Query boundary            | finance-scoped detail                          | 详情必须能回看 `ExpenseRecord.status`、费用日期与金额依据摘要                         |

---

## 4. 命令与接口边界

| Route / Controller                                   | Command / Service           | Request DTO / Contract                                                                                      | Response DTO / Contract                           | Guard / Permission        | Result |
| ---------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- | ------ |
| `POST /project-actual-cost-records/register-expense` | `registerExpenseCostRecord` | `expenseRecordId`、`projectId`、`costDescription`、`evidenceSummary`、`taxImpactSummary`、`expectedVersion` | `targetId`、`businessStatusAfter`、`resultStatus` | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 命令只接受来源事实引用，不接受前端直接回填 `costType/sourceType/sourceId/amountIncludingTax`。
2. `ExpenseRecord.status != confirmed` 时必须阻断映射。
3. 同一 `ExpenseRecord` 在同一时刻只允许一条当前有效 `EXPENSE` 映射记录。

---

## 5. 读侧边界

| Query / View                                    | Consumer                  | Fields                                                                                                                      | Filter / Sort                                                           | Permission Boundary       | Result |
| ----------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------- | ------ |
| `GET /projects/{projectId}/actual-cost-records` | 财务归口列表页            | `costType`、`occurredOn`、`amountIncludingTax`、`recordStatus`、`sourceType`、`sourceRefNo`、`taxImpactSummary`             | `costType`、`recordStatus`、`sourceType`；按 `occurredOn desc` 默认排序 | `contract:finance:manage` | Pass   |
| `GET /project-actual-cost-records/{id}`         | 财务归口详情页 / 审计回看 | `sourceStatusSummary`、`effectivePeriodSummary`、`measurementBasisSummary`、`taxImpactSummary`、`sourceType`、`sourceRefNo` | 按 `id` 精确查询                                                        | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 详情必须能直接回看 `ExpenseRecord:status`，避免再次只能看到统一成本层结果。
2. `measurementBasisSummary` 必须按费用金额与业务日期回放，不做税额伪推导。

---

## 6. 持久化边界

| Table                        | Migration                                                   | Entity / Repository                                             | Check Result |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- | ------------ |
| `project_actual_cost_record` | 新增 `uq_project_actual_cost_record_expense_source_current` | `ProjectActualCostRecord` / `ProjectActualCostRecordRepository` | Pass         |
| `expense_record`             | 复用既有表结构，无新增字段                                  | `ExpenseRecord` / `ExpenseRecordRepository`                     | Pass         |

| Field / Rule                | DDL / Table Freeze                                         | Entity / Source Fact                                   | Shared Contract / OpenAPI                           | Result |
| --------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- | ------ |
| `costType`                  | `project_actual_cost_record.cost_type`                     | `EXPENSE`                                              | `ProjectActualCostRecordSummary.costType`           | Pass   |
| `sourceType`                | `project_actual_cost_record.source_type`                   | `EXPENSE_RECORD`                                       | `ProjectActualCostRecordSummary.sourceType`         | Pass   |
| `sourceId`                  | `project_actual_cost_record.source_id varchar(64)`         | `ExpenseRecord.id -> ProjectActualCostRecord.sourceId` | `ProjectActualCostRecordSummary.sourceId`           | Pass   |
| `sourceRefNo`               | `project_actual_cost_record.source_ref_no varchar(128)`    | `ExpenseRecord.id`                                     | `ProjectActualCostRecordSummary.sourceRefNo`        | Pass   |
| `occurredOn`                | `project_actual_cost_record.occurred_on date`              | `ExpenseRecord.expenseDate(date)`                      | `ProjectActualCostRecordSummary.occurredOn`         | Pass   |
| `amountIncludingTax`        | `project_actual_cost_record.amount_including_tax`          | `ExpenseRecord.amountIncludingTax(decimal)`            | `ProjectActualCostRecordSummary.amountIncludingTax` | Pass   |
| `taxCostAmount`             | `project_actual_cost_record.tax_cost_amount nullable`      | `ExpenseRecord.taxAmount(nullable)`                    | `ProjectActualCostRecordSummary.taxCostAmount`      | Pass   |
| `amountExcludingTax`        | `project_actual_cost_record.amount_excluding_tax nullable` | `ExpenseRecord.amountExcludingTax(nullable)`           | `ProjectActualCostRecordSummary.amountExcludingTax` | Pass   |
| `current-effective mapping` | 当前有效条件唯一约束                                       | repository guard + unique index                        | 行为约束                                            | Pass   |

---

## 7. 一致性结论

- Prerequisite -> mapping: 先落地 `ExpenseRecord` 主对象，再做 `EXPENSE` 映射，避免再次出现上游对象不存在但映射先开工。
- Route -> command: 费用映射必须走专用命令，不得通过费用台账更新接口顺带写入统一成本记录。
- Source -> record: 当前只把 `confirmed` 费用事实视为可确认成本事实，避免把未确认台账误当成正式成本。
- Migration -> entity -> repository: 费用映射当前有效唯一约束必须同时落到 migration、entity metadata 与 repository guard。
- Query -> detail: 统一成本详情必须能回看 `ExpenseRecord` 当前状态与计量依据，不再是只看成本层黑箱结果。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                           | Result | Gap / Reason                                                                          |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                                                                            | Pass   |                                                                                       |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`                                                                                                 | Pass   | 24 suites / 256 tests passed                                                          |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand`                                                                                          | Pass   | 9 suites / 50 tests passed                                                            |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` + `corepack pnpm nx run shared-api-client:generate`                                                  | Pass   | 已生成 `register-expense-cost-record-request` client model                            |
| Migration / schema check         | Yes      | `corepack pnpm exec mikro-orm migration:up --config apps/poms-api/src/mikro-orm.config.ts` + `corepack pnpm nx run poms-api:migration-check` | Pass   | 已应用 `Migration20260412195000_add_expense_source_current_unique`，schema up-to-date |
| Diff whitespace check            | Yes      | `git diff --check`                                                                                                                           | Pass   | 仅提示 `.openapi-generator/FILES` 的 CRLF/LF 归一化 warning，无 whitespace error      |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                   |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前切片暂无额外例外；但 `PROCUREMENT` 与更完整的跨来源去重口径仍未实现 |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-12`
- Conditions:
  1. 当前切片只实现 `ExpenseRecord -> EXPENSE` 映射与 finance-scoped 来源回看。
  2. 若后续费用事实补入审批链或税额自动拆分规则，必须通过单独切片同步更新 contract、entity、mapping rule 与累计口径。
  3. `PROCUREMENT` 继续保留为 EX-06 父任务剩余范围，不得在本切片中伪完成。
