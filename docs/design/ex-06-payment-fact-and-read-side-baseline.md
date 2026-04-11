# EX-06B1 PAYMENT_FACT 映射与读侧实施基线包

- Gate Status: `Pass`
- Parent: `EX-06B`
- Owner: `Codex`
- Slice Type: `api-command + query + persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-12`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-06B1`

---

## 1. 范围

- 本次目标: 把当前仓库唯一已落地的外部成本事实 `PaymentRecord` 正式映射为 `PAYMENT_FACT` 类型的 `ProjectActualCostRecord`，并补齐财务归口可用的项目实际成本列表 / 详情读侧。
- 本次明确不做: 不在本切片补齐 `PROCUREMENT / INVOICE / EXPENSE` 映射；不补 `INCLUDED` / `VOIDED` / 通用替代动作；不补跨角色字段投影与项目级细粒度数据范围权限。
- 下游可依赖的交付边界: 已确认付款事实到统一成本记录的正式映射；从统一成本记录回看 `PaymentRecord` / `LABOR` 来源与替代链的 finance-scoped 查询入口。
- 不允许下游依赖的留白: 采购承诺、成本发票、费用事实仍不是当前仓库可声明完成的 EX-06 子能力；父任务 `EX-06` 仍不得据此进入 `Done`。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor | Status   | Notes                                                 |
| ------------------------- | ----------------------------------------------------------------- | ---------------- | -------- | ----------------------------------------------------- |
| Business design           | `phase2-project-actual-cost-records.md`                           | 8, 9, 10.1, 11   | Review   | 统一成本记录对象、关键动作、列表详情要求              |
| Source mapping design     | `phase2-cost-source-to-project-record-mapping.md`                 | 7, 10, 11.1      | Review   | `PAYMENT_FACT` 映射、去重原则、当前工程冻结边界       |
| Command design            | `interface-command-design.md`                                     | 4.3              | Active   | `registerPaymentFactCostRecord` 与既有 LABOR 命令并列 |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | 5.4              | Active   | `registerPaymentFactCostRecord` 请求 / 响应边界       |
| Query boundary            | `query-view-boundary-design.md`                                   | 5.2              | Active   | `ProjectActualCostRecordListView / DetailView`        |
| Sensitive visibility      | `phase2-data-permission-and-sensitive-visibility-design.md`       | 5.1, 5.3         | Review   | 当前切片先冻结为 finance-scoped 查询                  |
| Data model / table freeze | `table-structure-freeze-design.md`                                | 7.5              | Active   | `project_actual_cost_record` 来源映射约束             |
| Schema / DDL              | `schema-ddl-design.md`                                            | 8.5              | Active   | `source_type + source_id` 当前有效映射约束            |
| ADR                       | `../adr/012-data-persistence-technology-selection.md`             | SQL-first        | Accepted | migration / DDL 与 ORM metadata 一致性优先            |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | gates            | Accepted | 本切片按 `G1 / G3 / G4` 留痕                          |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                                     | Implementation Rule                                                                                               |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Business semantics        | `phase2-cost-source-to-project-record-mapping`           | 当前唯一正式外部成本来源为 `PaymentRecord -> PAYMENT_FACT`                                                        |
| Route / command naming    | `interface-command-design`                               | 使用专用命令 `registerPaymentFactCostRecord`，不得复用普通付款更新接口                                            |
| DTO / contract naming     | `ProjectActualCostRecord` / `PaymentRecord`              | `costType = PAYMENT_FACT`；`sourceType = PAYMENT_RECORD`；`sourceId = payment.id`                                 |
| Table / column naming     | `project_actual_cost_record`                             | 复用 `source_type`、`source_id`、`source_ref_no`、`record_status`，不新增平行表                                   |
| Date / time semantics     | `payment_record.payment_date` -> `occurred_on`           | `paymentDate` 保留 datetime；`occurredOn` 固定为其业务日期截断值                                                  |
| Identifier semantics      | `source_id / source_ref_no`                              | `sourceId = PaymentRecord.id`；当前 `sourceRefNo` 亦暂使用 `PaymentRecord.id`，待独立业务编号出现后再新增展示引用 |
| Money / decimal semantics | `payment_record.payment_amount`                          | 当前只稳定映射 `amountIncludingTax`；无可靠拆分依据时 `amountExcludingTax/taxCostAmount = null`                   |
| Status machine            | `PaymentRecord` + `ProjectActualCostRecord`              | `confirmed PaymentRecord` 首次映射直接生成 `CONFIRMED` 的 `PAYMENT_FACT` 记录                                     |
| Permission boundary       | `phase2-data-permission-and-sensitive-visibility-design` | 当前切片只提供 `contract:finance:manage` 下的 finance-scoped 查询，不提前承诺跨角色投影                           |

---

## 4. 命令与接口边界

| Route / Controller                                      | Command / Service               | Request DTO / Contract                                                                  | Response DTO / Contract                                              | Guard / Permission        | Design Source | Result  |
| ------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------- | ------------- | ------- |
| `POST /project-actual-cost-records:registerPaymentFact` | `registerPaymentFactCostRecord` | `paymentRecordId`、`projectId`、`costDescription`、`evidenceSummary`、`expectedVersion` | `targetId`、`paymentRecordId`、`businessStatusAfter`、`resultStatus` | `contract:finance:manage` | command + DTO | Pending |

补充冻结约束：

1. 命令只接受来源事实引用，不接受前端直接回填金额、日期、状态、`sourceType/sourceId`。
2. 若 `PaymentRecord.status != confirmed`，命令必须阻断。
3. 若同一 `paymentRecordId` 已存在当前有效 `PAYMENT_FACT` 记录，命令必须阻断重复映射。

---

## 5. 读侧边界

| Query / View                                                                        | Consumer                  | Fields                                                                                                                                                                                                 | Filter / Sort                                                           | Permission Boundary       | Design Source | Result  |
| ----------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------- | ------------- | ------- |
| `GET /projects/{projectId}/actual-cost-records` / `ProjectActualCostRecordListView` | 财务归口列表页            | `costType`、`occurredOn`、`executionStageCode`、`amountIncludingTax`、`recordStatus`、`isIncludedInProjectCost`、`sourceType`、`sourceRefNo`、`evidenceSummary`                                        | `costType`、`recordStatus`、`sourceType`；按 `occurredOn desc` 默认排序 | `contract:finance:manage` | query         | Pending |
| `GET /project-actual-cost-records/{id}` / `ProjectActualCostRecordDetailView`       | 财务归口详情页 / 审计回看 | `costType`、`sourceType`、`sourceId`、`sourceRefNo`、来源当前状态摘要、`occurredOn`、`amountIncludingTax`、`taxImpactSummary`、`rateVersionId`、生效区间、计量依据摘要、替代关系摘要、`allowedActions` | 按 `id` 精确查询                                                        | `contract:finance:manage` | query         | Pending |

补充冻结约束：

1. 当前切片详情页必须同时覆盖 `PAYMENT_FACT` 与 `LABOR`，避免再次出现“只补写侧、不补读侧”的偏差。
2. 当前切片不承诺跨角色敏感字段投影；先以财务归口查询闭环为最小可信范围。

---

## 6. 持久化边界

| Table                        | Migration                                                       | Entity / Repository                                             | DDL / Freeze Source                     | Check Result |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------- | ------------ |
| `project_actual_cost_record` | 可能需要新增 `source_type + source_id` 当前有效映射条件唯一约束 | `ProjectActualCostRecord` / `ProjectActualCostRecordRepository` | `table-structure-freeze` / `schema-ddl` | Pending      |
| `payment_record`             | 复用既有表结构，无新增字段                                      | `PaymentRecord` / `ContractFinanceRepository`                   | `contract-finance` + `L2-T03`           | Pending      |

| Field / Rule                           | Design Type / Meaning                | Migration / DDL                                               | Entity / Source Fact                                      | Shared Contract / OpenAPI                           | Result  |
| -------------------------------------- | ------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- | ------- |
| `costType`                             | `PAYMENT_FACT`                       | `project_actual_cost_record.cost_type`                        | `ProjectActualCostRecord.costType`                        | `ProjectActualCostRecordSummary.costType`           | Pending |
| `sourceType`                           | `PAYMENT_RECORD`                     | `project_actual_cost_record.source_type`                      | `ProjectActualCostRecord.sourceType`                      | `ProjectActualCostRecordSummary.sourceType`         | Pending |
| `sourceId`                             | 上游付款事实主键引用                 | `project_actual_cost_record.source_id varchar(64)`            | `PaymentRecord.id -> ProjectActualCostRecord.sourceId`    | `ProjectActualCostRecordSummary.sourceId`           | Pending |
| `sourceRefNo`                          | 当前稳定来源引用号                   | `project_actual_cost_record.source_ref_no varchar(128)`       | `PaymentRecord.id -> ProjectActualCostRecord.sourceRefNo` | `ProjectActualCostRecordSummary.sourceRefNo`        | Pending |
| `occurredOn`                           | 付款发生业务日期                     | `project_actual_cost_record.occurred_on date`                 | `PaymentRecord.paymentDate(datetime)`                     | `ProjectActualCostRecordSummary.occurredOn`         | Pending |
| `amountIncludingTax`                   | 当前唯一稳定支付金额口径             | `project_actual_cost_record.amount_including_tax numeric`     | `PaymentRecord.paymentAmount(decimal)`                    | `ProjectActualCostRecordSummary.amountIncludingTax` | Pending |
| `recordStatus`                         | 已确认付款映射后直接进入 `CONFIRMED` | `project_actual_cost_record.record_status`                    | `PaymentRecord.status = confirmed`                        | `ProjectActualCostRecordSummary.recordStatus`       | Pending |
| `current-effective mapping per source` | 同一付款事实仅一条当前有效成本映射   | 条件唯一：`source_type + source_id` on active/current records | repository guard + unique constraint                      | 不直接暴露，作为行为约束                            | Pending |

---

## 7. 一致性结论

- Document -> code: 当前基线已把“可设计范围”和“可编码范围”拆开，避免再把未落地上游对象伪记为已实现。
- Migration -> entity: 本切片若新增 `source_type + source_id` 唯一约束，必须同步 migration、entity metadata 与 `migration-check`。
- Entity -> contract: `PAYMENT_FACT` 映射必须保持 `sourceId` 为 generic source ID 语义，不回缩成只适用于 UUID 的 contract。
- Route -> command: 付款事实映射必须走专用命令，不能复用 `createPayment / confirmPayment`。
- Query -> view: 当前切片必须同时交付 list/detail 读侧，避免 EX-06 再次只补写侧。
- Guard / permission: 当前切片先固定在 finance-scoped guard，不提前伪装成全业务角色可见。
- OpenAPI / generated client: 新命令和新查询一旦落地，必须同步 OpenAPI 与 generated client。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                      | Result  | Gap / Reason |
| -------------------------------- | -------- | ------------------------------------------------------- | ------- | ------------ |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                       | Pending |              |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api`                        | Pending |              |
| API / integration tests          | Yes      | `project-cost.service.spec.ts` + controller tests       | Pending |              |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e`                 | Pending |              |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` + client update | Pending |              |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-check`         | Pending |              |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前切片无额外例外；`PROCUREMENT / INVOICE / EXPENSE` 已通过范围裁剪显式排除 |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-12`
- Conditions:
  1. 当前切片只实现 `PAYMENT_FACT` 映射 + finance-scoped `ProjectActualCostRecord` list/detail。
  2. 若实现需要新增来源映射唯一约束，必须通过 migration + metadata 同步落地。
  3. `PROCUREMENT / INVOICE / EXPENSE` 继续作为 EX-06 父任务阻断项保留，不得在本切片中伪完成。
