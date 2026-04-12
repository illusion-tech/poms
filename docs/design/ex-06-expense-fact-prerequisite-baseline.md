# EX-06B3A 费用事实主对象实施基线包

- Gate Status: `Pass`
- Parent: `EX-06B3`
- Owner: `Codex`
- Slice Type: `api-command + query + persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-12`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-06B3A`

---

## 1. 范围

- 本次目标: 在统一成本映射前，先把 `EXPENSE` 的上游事实对象正式收敛为可编码的 `ExpenseRecord` 主对象，明确它的领域归属、最小字段组、最小命令链和最小查询链。
- 本次明确不做: 不在本切片直接实现 `ExpenseRecord -> ProjectActualCostRecord` 映射；不补完整报销审批工作流；不补费用分摊、税额自动拆分、跨项目共享费用。
- 下游可依赖的交付边界: `expense_record` 的稳定表结构、状态机、命令 / 查询入口与共享契约基线；后续 `EX-06B3` 只能基于该对象继续实现 `EXPENSE` 映射。
- 不允许下游依赖的留白: 本切片完成后，只能宣称“费用事实主对象已稳定可编码”，不能宣称“`EXPENSE` 成本映射已完成”。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor | Status   | Notes                                                             |
| ------------------------- | ----------------------------------------------------------------- | ---------------- | -------- | ----------------------------------------------------------------- |
| Business design           | `phase2-project-actual-cost-records.md`                           | 3.1, 5           | Review   | 来源事实层包含费用记录；`EXPENSE` 为正式成本类型                  |
| Source mapping design     | `phase2-cost-source-to-project-record-mapping.md`                 | 6, 7.7, 11.1     | Review   | 费用事实范围、映射时机与“当前尚无上游对象”冻结边界                |
| Workspace IA              | `phase2-execution-cost-workspace-information-architecture.md`     | 6.3              | Review   | 工作区入口已要求“新增费用记录”                                    |
| Domain boundary ADR       | `../adr/004-contract-finance-domain-module-boundary.md`           | module boundary  | Accepted | 合同资金域边界已固定，不应默认把费用事实硬塞进 `contract-finance` |
| Command design            | `interface-command-design.md`                                     | EX-06 commands   | Active   | 来源映射必须走专用命令，不复用普通编辑接口                        |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | 4.0, 5.2         | Active   | 普通 `PATCH` 与命令型接口边界                                     |
| Query boundary            | `query-view-boundary-design.md`                                   | 5.2              | Active   | 费用事实详情与统一成本读侧需能回看来源                            |
| Data model / table freeze | `table-structure-freeze-design.md`                                | 7.5              | Active   | `project_actual_cost_record` 已预留 `EXPENSE`                     |
| Schema / DDL              | `schema-ddl-design.md`                                            | 8.5              | Active   | 后续映射仍需遵守 `source_type/source_id` 当前有效语义             |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | gates            | Accepted | 本切片按 `G1 / G3 / G4` 留痕                                      |

---

## 3. 本次 SSOT

| Concern                | SSOT                             | Implementation Rule                                                                                          |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Business semantics     | `ExpenseRecord`                  | `ExpenseRecord` 是执行期费用事实主对象，不等于统一成本记录，也不等于完整报销流                               |
| Domain ownership       | 执行成本域 / `project-cost` 邻接 | 当前默认推荐放在执行成本域，不默认并入 `contract-finance`；若要改成合同资金域拥有，必须先补明确 ADR/设计决策 |
| Project binding        | `projectId`                      | 每条费用事实必须绑定唯一项目；不允许项目外杂散费用进入正式对象                                               |
| Optional contract link | `contractId`                     | 费用可选绑定合同；不能绑定时也必须保留项目归属                                                               |
| Money semantics        | 费用金额字段组                   | 先固定 `amountIncludingTax` 必填；`taxAmount`、`amountExcludingTax` 可空，不做伪拆分                         |
| Mapping dependency     | `EX-06B3`                        | `EXPENSE` 映射只可依赖本对象稳定后的 API / migration / contract                                              |
| Workflow boundary      | 最小费用事实台账                 | 本切片只保证费用事实登记、确认、作废；不承诺报销审批、预算占用、借款冲销等完整流程                           |
| Source-chain boundary  | 费用事实 vs 发票 / 付款          | 费用事实不自动等于付款或发票；若后续出现同链路票据 / 支付，必须通过后续去重规则显式收口                      |

---

## 4. 对象与状态冻结

### 4.1 主对象字段组

本切片冻结 `expense_record` 最小字段组为：

- `id`
- `projectId`
- `contractId`
- `expenseCategory`
- `expenseDescription`
- `expenseDate`
- `currency`
- `amountIncludingTax`
- `taxAmount`
- `amountExcludingTax`
- `sourceType`
- `status`
- `evidenceSummary`
- `attachmentCount`

补充冻结约束：

1. `projectId` 必填，`contractId` 可空。
2. `expenseCategory` 至少支持：`travel`、`onsite-service`、`deployment-logistics`、`temporary-spend`、`misc`。
3. `amountIncludingTax` 必填；`taxAmount`、`amountExcludingTax` 若无法可靠取得，可保持空值。
4. `expenseDate` 固定为 `date` 语义，不回退到 `datetime`。

### 4.2 主状态机

本切片冻结 `ExpenseRecord.status` 最小状态机为：

- `draft`
- `recorded`
- `confirmed`
- `voided`

补充冻结约束：

1. 普通 `PATCH` 只允许在非终态下维护普通台账字段。
2. `confirmExpenseRecord` 只用于把费用事实推进到可作为正式来源事实的 `confirmed`。
3. 已 `confirmed` 记录不得直接删除，只允许通过 `voidExpenseRecord` 留痕作废。
4. 后续 `EX-06B3` 只允许消费 `confirmed` 的费用事实进入统一成本层。

---

## 5. 命令与接口边界

| Route / Controller                           | Command / Service      | Request DTO / Contract                                                            | Response DTO / Contract | Guard / Permission        | Result  |
| -------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- | ----------------------- | ------------------------- | ------- |
| `POST /projects/{projectId}/expense-records` | `createExpenseRecord`  | `contractId?`、`expenseCategory`、`expenseDescription`、`expenseDate`、金额字段组 | `ExpenseRecordSummary`  | `contract:finance:manage` | Pending |
| `PATCH /expense-records/{id}`                | `updateExpenseRecord`  | 普通台账字段、`expectedVersion`                                                   | `ExpenseRecordSummary`  | `contract:finance:manage` | Pending |
| `POST /expense-records/{id}/confirm`         | `confirmExpenseRecord` | `comment?`、`expectedVersion`                                                     | `ExpenseRecordSummary`  | `contract:finance:manage` | Pending |
| `POST /expense-records/{id}/void`            | `voidExpenseRecord`    | `reason`、`comment?`、`expectedVersion`                                           | `ExpenseRecordSummary`  | `contract:finance:manage` | Pending |

补充冻结约束：

1. 创建 / 更新接口不得直接写统一成本层字段，也不得携带 `costType/sourceType/sourceId`。
2. 费用确认与作废必须走专用命令，不允许通过普通 `PATCH` 静默改状态。
3. 若未来引入报销审批流，审批字段必须新增专用命令或专用子对象，不得塞回本切片的普通台账 DTO。

---

## 6. 读侧边界

| Query / View                                | Consumer        | Fields                                                                                                        | Filter / Sort                                      | Permission Boundary       | Result  |
| ------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------- | ------- |
| `GET /projects/{projectId}/expense-records` | 财务归口列表页  | `expenseCategory`、`expenseDescription`、`expenseDate`、金额字段组、`status`、`contractId`、`attachmentCount` | `expenseCategory`、`status`；按 `expenseDate desc` | `contract:finance:manage` | Pending |
| `GET /expense-records/{id}`                 | 财务详情 / 审计 | 主体字段组、金额字段组、`status`、`sourceType`、`evidenceSummary`、`allowedActions`                           | 按 `id` 精确查询                                   | `contract:finance:manage` | Pending |

补充冻结约束：

1. 本切片至少要交付项目级费用列表与详情，避免再次出现“只有上游对象写侧，没有可回看读侧”。
2. 当前切片先冻结为 finance-scoped 查询，不提前承诺跨角色投影与费用敏感字段裁剪。

---

## 7. 持久化边界

| Table            | Table Role | Minimal Fields                                                                                                                             | Constraints / Notes                                                            | Check Result |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------ |
| `expense_record` | 主体主表   | `id`、`project_id`、`contract_id`、`expense_category`、`expense_description`、`expense_date`、`currency`、`amount_including_tax`、`status` | `project_id` 非空；`contract_id` 可空；按 `project_id + expense_date` 支持查询 | Pending      |

字段一致性冻结：

| Field                | Design Meaning | DDL / Table Freeze                    | Entity / API Rule                      | Result  |
| -------------------- | -------------- | ------------------------------------- | -------------------------------------- | ------- |
| `expenseCategory`    | 费用类别       | `expense_record.expense_category`     | 最小字典固定，不允许自由文本替代主分类 | Pending |
| `expenseDate`        | 费用业务日期   | `expense_record.expense_date`         | 固定为 `date` 语义                     | Pending |
| `amountIncludingTax` | 费用总金额     | `expense_record.amount_including_tax` | 必填金额口径；后续映射默认先消费该字段 | Pending |
| `taxAmount`          | 税额           | `expense_record.tax_amount nullable`  | 当前可空；不得用 `0` 伪装“未知税额”    | Pending |
| `amountExcludingTax` | 不含税金额     | `expense_record.amount_excluding_tax` | 当前可空；只有有稳定依据时才写入       | Pending |
| `status`             | 当前费用主状态 | `expense_record.status`               | 采用本基线定义的最小状态机             | Pending |
| `contractId`         | 可选合同归属   | `expense_record.contract_id nullable` | 费用允许不绑定合同，但必须绑定项目     | Pending |

---

## 8. 最佳实践提醒

当前最需要显式讨论的问题不是字段，而是领域归属：

1. 费用事实如果默认塞进 `contract-finance`，会把“合同资金对象”和“执行期费用对象”混成一个模块，长期会让模块边界继续漂移。
2. 更稳妥的默认做法，是把 `ExpenseRecord` 视为执行成本域对象，先以 `project-cost` 邻接实现或单独子模块实现；后续若真的要统一到新域，再做显式抽象。
3. 若后续你更倾向“所有花费都进合同资金域”，最佳实践不是直接编码，而是先补一份明确的 ADR / 设计修订，解释为什么费用事实属于合同资金域而非执行成本域。

---

## 9. 一致性结论

- Design -> code: 先落地 `ExpenseRecord` 主对象，再推进 `EX-06B3` 映射，避免再次出现“映射目标不存在但已开工”的设计漂移。
- Domain boundary: 当前默认推荐把费用事实留在执行成本域，而不是继续扩大 `contract-finance` 边界。
- Table -> entity -> contract: `expenseDate`、金额字段可空性、`status` 字典与 `projectId/contractId` 归属关系必须同时对齐。
- Workflow boundary: 本切片只冻结费用事实台账，不提前混入完整报销审批流。

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-12`
- Conditions:
  1. 先完成 `EX-06B3A` 的 `ExpenseRecord` 主对象、命令、查询、持久化闭环，再允许 `EX-06B3` 进入 `Doing`。
  2. `EX-06B3A` 完成前，不得直接开做 `EXPENSE -> ProjectActualCostRecord` 映射。
  3. 若决定把费用事实归属到 `contract-finance`，必须先补明确的设计修订或 ADR，而不是直接改代码。
