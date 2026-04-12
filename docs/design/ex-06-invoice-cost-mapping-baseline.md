# EX-06B2 INVOICE 映射实施基线包

- Gate Status: `Pass`
- Parent: `EX-06B`
- Owner: `Codex`
- Slice Type: `api-command + query + persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-12`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-06B2`

---

## 1. 范围

- 本次目标: 把已落地的 `InvoiceRecord` 正式映射为 `INVOICE` 类型的 `ProjectActualCostRecord`，并补齐从统一成本记录回看发票来源的 finance-scoped 读侧。
- 本次明确不做: 不在本切片补 `INCLUDED / VOIDED` 通用动作；不补 `PROCUREMENT / EXPENSE` 映射；不补发票税额拆分模型。
- 下游可依赖的交付边界: `InvoiceRecord -> INVOICE` 正式映射命令、当前有效唯一约束、统一成本 list/detail 对发票来源的回看摘要。
- 不允许下游依赖的留白: 当前 `InvoiceRecord` 只有总金额，没有税额拆分字段，因此 `taxCostAmount / amountExcludingTax` 仍不构成可宣称稳定的税务分摊口径。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor | Status   | Notes                                           |
| ------------------------- | ----------------------------------------------------------------- | ---------------- | -------- | ----------------------------------------------- |
| Business design           | `phase2-project-actual-cost-records.md`                           | 8, 9, 10.1, 11   | Review   | 统一成本记录对象、状态机、详情要求              |
| Source mapping design     | `phase2-cost-source-to-project-record-mapping.md`                 | 5, 7.8, 10, 11.1 | Review   | `INVOICE` 映射、去重原则、工程冻结边界          |
| Prerequisite baseline     | `ex-06-invoice-fact-prerequisite-baseline.md`                     | all              | Pass     | `InvoiceRecord` 主对象与最小命令 / 查询链已稳定 |
| Command design            | `interface-command-design.md`                                     | EX-06 commands   | Active   | 来源映射必须走专用命令                          |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | 5.4              | Active   | `registerInvoiceCostRecord` 请求 / 响应边界     |
| Query boundary            | `query-view-boundary-design.md`                                   | 5.2              | Active   | `ProjectActualCostRecordListView / DetailView`  |
| Data model / table freeze | `table-structure-freeze-design.md`                                | 7.5              | Active   | `project_actual_cost_record` 来源映射约束       |
| Schema / DDL              | `schema-ddl-design.md`                                            | 8.5              | Active   | 当前有效唯一约束与 `source_type/source_id` 语义 |
| ADR                       | `../adr/012-data-persistence-technology-selection.md`             | SQL-first        | Accepted | migration / DDL 与 ORM metadata 一致性优先      |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | gates            | Accepted | 本切片按 `G1 / G3 / G4` 留痕                    |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                           | Implementation Rule                                                                |
| ------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Business semantics        | `phase2-cost-source-to-project-record-mapping` | 当前只允许成本发票 `input` 方向映射为 `INVOICE`                                    |
| Source eligibility        | `InvoiceRecord`                                | 只有 `status = verified` 且无 open exception 的发票，才允许进入统一成本层          |
| Route / command naming    | `interface-command-design`                     | 使用专用命令 `registerInvoiceCostRecord`，不得复用普通发票更新接口                 |
| DTO / contract naming     | `ProjectActualCostRecord` / `InvoiceRecord`    | `costType = INVOICE`；`sourceType = INVOICE_RECORD`；`sourceRefNo = invoiceNumber` |
| Table / column naming     | `project_actual_cost_record`                   | 复用 `source_type`、`source_id`、`source_ref_no`、`record_status`                  |
| Money / decimal semantics | `invoice_record.invoice_amount`                | 当前稳定映射总金额到 `amountIncludingTax`；税额拆分未具备 SSOT 前保持空值          |
| Status machine            | `InvoiceRecord` + `ProjectActualCostRecord`    | 已验证发票首次映射直接生成 `CONFIRMED` 的 `INVOICE` 记录                           |
| Query boundary            | finance-scoped detail                          | 详情必须能回看 `InvoiceRecord.status/exceptionStatus` 与计量依据摘要               |

---

## 4. 命令与接口边界

| Route / Controller                                   | Command / Service           | Request DTO / Contract                                                                                      | Response DTO / Contract                           | Guard / Permission        | Result |
| ---------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- | ------ |
| `POST /project-actual-cost-records/register-invoice` | `registerInvoiceCostRecord` | `invoiceRecordId`、`projectId`、`costDescription`、`evidenceSummary`、`taxImpactSummary`、`expectedVersion` | `targetId`、`businessStatusAfter`、`resultStatus` | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 命令只接受来源事实引用，不接受前端直接回填 `costType/sourceType/sourceId/amountIncludingTax`。
2. `invoiceType != input`、`status != verified`、`exceptionStatus = open` 时必须阻断映射。
3. 同一 `InvoiceRecord` 在同一时刻只允许一条当前有效 `INVOICE` 映射记录。

---

## 5. 读侧边界

| Query / View                                    | Consumer                  | Fields                                                                                                                      | Filter / Sort                                                           | Permission Boundary       | Result |
| ----------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------- | ------ |
| `GET /projects/{projectId}/actual-cost-records` | 财务归口列表页            | `costType`、`occurredOn`、`amountIncludingTax`、`recordStatus`、`sourceType`、`sourceRefNo`、`taxImpactSummary`             | `costType`、`recordStatus`、`sourceType`；按 `occurredOn desc` 默认排序 | `contract:finance:manage` | Pass   |
| `GET /project-actual-cost-records/{id}`         | 财务归口详情页 / 审计回看 | `sourceStatusSummary`、`effectivePeriodSummary`、`measurementBasisSummary`、`taxImpactSummary`、`sourceType`、`sourceRefNo` | 按 `id` 精确查询                                                        | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 详情必须能直接回看 `InvoiceRecord:status/exceptionStatus`，避免再次只能看到统一成本层结果。
2. 当前切片不承诺税额细分详情；若未传 `taxImpactSummary`，只返回空值，不做伪推导。

---

## 6. 持久化边界

| Table                        | Migration                                                   | Entity / Repository                                             | Check Result |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- | ------------ |
| `project_actual_cost_record` | 新增 `uq_project_actual_cost_record_invoice_source_current` | `ProjectActualCostRecord` / `ProjectActualCostRecordRepository` | Pass         |
| `invoice_record`             | 复用既有表结构，无新增字段                                  | `InvoiceRecord` / `ContractFinanceRepository`                   | Pass         |

| Field / Rule                | DDL / Table Freeze                                      | Entity / Source Fact                                   | Shared Contract / OpenAPI                           | Result |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- | ------ |
| `costType`                  | `project_actual_cost_record.cost_type`                  | `INVOICE`                                              | `ProjectActualCostRecordSummary.costType`           | Pass   |
| `sourceType`                | `project_actual_cost_record.source_type`                | `INVOICE_RECORD`                                       | `ProjectActualCostRecordSummary.sourceType`         | Pass   |
| `sourceId`                  | `project_actual_cost_record.source_id varchar(64)`      | `InvoiceRecord.id -> ProjectActualCostRecord.sourceId` | `ProjectActualCostRecordSummary.sourceId`           | Pass   |
| `sourceRefNo`               | `project_actual_cost_record.source_ref_no varchar(128)` | `InvoiceRecord.invoiceNumber`                          | `ProjectActualCostRecordSummary.sourceRefNo`        | Pass   |
| `occurredOn`                | `project_actual_cost_record.occurred_on date`           | `InvoiceRecord.invoiceDate(date)`                      | `ProjectActualCostRecordSummary.occurredOn`         | Pass   |
| `amountIncludingTax`        | `project_actual_cost_record.amount_including_tax`       | `InvoiceRecord.invoiceAmount(decimal)`                 | `ProjectActualCostRecordSummary.amountIncludingTax` | Pass   |
| `current-effective mapping` | 当前有效条件唯一约束                                    | repository guard + unique index                        | 行为约束                                            | Pass   |

---

## 7. 一致性结论

- Prerequisite -> mapping: 先落地 `InvoiceRecord` 主对象，再做 `INVOICE` 映射，避免再次出现上游对象不存在但映射先开工。
- Route -> command: 发票映射必须走专用命令，不得通过发票台账更新接口顺带写入统一成本记录。
- Source -> record: 当前只把 `input + verified` 发票视为可确认成本事实，避免把销项票或未验票台账误当成成本。
- Migration -> entity -> repository: 发票映射当前有效唯一约束已同时落到 migration、entity metadata 与 repository guard。
- Query -> detail: 统一成本详情已能回看 `InvoiceRecord` 当前状态与计量依据，不再是只看成本层黑箱结果。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                      | Result |
| -------------------------------- | -------- | ------------------------------------------------------- | ------ |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                       | Pass   |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`            | Pass   |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand`     | Pass   |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` + client update | Pass   |
| Migration / schema check         | Yes      | `mikro-orm migration:up` + `poms-api:migration-check`   | Pass   |
| Diff whitespace check            | Yes      | `git diff --check`                                      | Pass   |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                                     |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------------------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前切片无额外例外；但 `EXPENSE / PROCUREMENT` 仍未实现，EX-06 父任务范围不可被本切片吸收 |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-12`
- Conditions:
  1. 当前切片只实现 `InvoiceRecord -> INVOICE` 映射与 finance-scoped 来源回看。
  2. 若后续发票对象补入税额拆分字段，必须通过单独切片同步更新 contract、entity、mapping rule 与累计口径。
  3. `EXPENSE / PROCUREMENT` 继续保留为 EX-06 父任务剩余范围，不得在本切片中伪完成。
