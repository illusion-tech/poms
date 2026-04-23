# EX-06B2A 成本发票事实主对象实施基线包

- Gate Status: `Pass`
- Parent: `EX-06B2`
- Owner: `Codex`
- Slice Type: `api-command + query + persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-12`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-06B2A`

---

## 1. 范围

- 本次目标: 在合同资金域正式落地 `InvoiceRecord` 主对象、最小命令链和最小查询链，为后续 `EX-06B2` 的 `INVOICE -> ProjectActualCostRecord` 映射提供稳定上游事实。
- 本次明确不做: 不在本切片直接实现 `INVOICE` 到统一成本记录的映射；不补完整开票申请工作流；不补税务计算引擎；不补 `EXPENSE / PROCUREMENT` 来源对象。
- 下游可依赖的交付边界: `invoice_record` 的稳定表结构、状态机、命令 / 查询入口、共享契约和 OpenAPI；后续 `EX-06B2` 可基于该对象继续定义“何时进入统一成本口径”。
- 不允许下游依赖的留白: 本切片完成后，只能宣称“成本发票事实对象已稳定可编码”，不能宣称“`INVOICE` 成本映射已完成”。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor | Status   | Notes                                                    |
| ------------------------- | ----------------------------------------------------------------- | ---------------- | -------- | -------------------------------------------------------- |
| Business design           | `contract-finance-design.md`                                      | 5, 8.6, 9, 12.5  | Draft    | `InvoiceRecord` 对象边界、状态机、字段包                 |
| Authorization             | `business-authorization-matrix.md`                                | `InvoiceRecord`  | Review   | 发票普通维护、异常处理、关闭的动作与权限边界             |
| Command design            | `interface-command-design.md`                                     | 4.2              | Active   | `markInvoiceException / resolveInvoiceException / close` |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | 4.0, 5.2         | Active   | 普通 `PATCH` 与命令型接口边界                            |
| Query boundary            | `query-view-boundary-design.md`                                   | 5.2              | Active   | `InvoiceRecordListView` 最小查询字段                     |
| Source mapping dependency | `phase2-cost-source-to-project-record-mapping.md`                 | 5, 11.1          | Review   | `INVOICE` 映射仍依赖稳定发票事实对象                     |
| Data model / table freeze | `table-structure-freeze-design.md`                                | 4.2              | Active   | `invoice_record` 最小字段冻结                            |
| Schema / DDL              | `schema-ddl-design.md`                                            | 3, 4             | Active   | `invoice_no` 唯一性、`project_id / contract_id / status` |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | gates            | Accepted | 本切片按 `G1 / G3 / G4` 留痕                             |

---

## 3. 本次 SSOT

| Concern                   | SSOT                       | Implementation Rule                                                                                     |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Business semantics        | `InvoiceRecord`            | `InvoiceRecord` 是合同资金域的发票台账主体，不等于统一成本记录，也不等于完整开票申请流                  |
| Invoice direction         | `invoiceType`              | 本切片数据模型至少支持 `input / output`；`EX-06B2` 只消费 `input` 发票进入成本映射                      |
| Ownership                 | `projectId` / `contractId` | `projectId` 必填；`contractId` 可空；若能唯一归属合同必须保留 `contractId`                              |
| Normal update boundary    | 普通 `PATCH`               | 普通 `PATCH` 只允许台账字段与非敏感说明字段；不得承载异常、解除异常或关闭结论                           |
| Exception / close actions | 专用命令                   | 异常、解除异常、关闭必须走命令接口并形成留痕，不能静默覆盖主状态                                        |
| Query boundary            | `InvoiceRecordListView`    | 至少交付项目级发票列表；详情查询可先返回同源摘要，不要求在本切片扩成完整工作流详情                      |
| Cost mapping dependency   | `EX-06B2`                  | `INVOICE` 映射只可依赖本切片稳定后的 `InvoiceRecord`；不得在对象未落地前直接写占位 mapping DTO 或 route |
| Permission boundary       | `contract:finance:manage`  | 当前切片先固定为财务归口权限，不提前承诺跨角色可见口径                                                  |

---

## 4. 对象与状态冻结

### 4.1 主对象字段组

本切片冻结 `invoice_record` 最小字段组为：

- `id`
- `projectId`
- `contractId`
- `invoiceType`
- `invoiceNumber`
- `invoiceAmount`
- `invoiceDate`
- `status`
- `exceptionStatus`
- `exceptionReason`
- `closedAt`

补充冻结约束：

1. `projectId` 必填，`contractId` 可空。
2. `invoiceType` 最小字典固定为 `input`、`output`。
3. `invoiceNumber` 默认按全局唯一处理；若后续业务证明外部编号可重复，再通过单独 DDL 变更改为条件唯一。
4. `exceptionStatus` 最小字典固定为 `none`、`open`、`resolved`，不得用自由文本替代。

### 4.2 主状态机

本切片冻结 `InvoiceRecord.status` 最小状态机为：

- `draft`
- `pending-issue`
- `issued`
- `received`
- `verified`
- `exception`
- `closed`

补充冻结约束：

1. 普通 `PATCH` 只允许在非终态下维护普通台账字段和有限状态推进。
2. `markInvoiceException` 把记录推进到 `exception`，同时写入 `exceptionStatus = open` 与异常说明。
3. `resolveInvoiceException` 不得清空历史异常说明；至少要写入处理结论，并把 `exceptionStatus` 推进到 `resolved`。
4. `closeInvoiceRecord` 只能用于流程完结或异常处理完结后的关闭，不得代替异常解除。

---

## 5. 命令与接口边界

| Route / Controller                                              | Command / Service         | Request DTO / Contract                                                        | Response DTO / Contract | Guard / Permission        | Result |
| --------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------- | ----------------------- | ------------------------- | ------ |
| `POST /contract-finance/projects/{projectId}/invoices`          | `createInvoiceRecord`     | `contractId?`、`invoiceType`、`invoiceNumber`、`invoiceAmount`、`invoiceDate` | `InvoiceRecordSummary`  | `contract:finance:manage` | Pass   |
| `PATCH /contract-finance/invoice-records/{id}`                  | `updateInvoiceRecord`     | 普通台账字段、`expectedVersion`                                               | `InvoiceRecordSummary`  | `contract:finance:manage` | Pass   |
| `POST /contract-finance/invoice-records/{id}/mark-exception`    | `markInvoiceException`    | `reason`、`comment`、`expectedVersion`                                        | `InvoiceRecordSummary`  | `contract:finance:manage` | Pass   |
| `POST /contract-finance/invoice-records/{id}/resolve-exception` | `resolveInvoiceException` | `resolution`、`comment`、`expectedVersion`                                    | `InvoiceRecordSummary`  | `contract:finance:manage` | Pass   |
| `POST /contract-finance/invoice-records/{id}/close`             | `closeInvoiceRecord`      | `reason`、`comment`、`expectedVersion`                                        | `InvoiceRecordSummary`  | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 普通创建 / 更新接口不得直接携带异常处理结论、关闭结论或审批结果。
2. 若 `invoiceType = output`，且记录已明确归属销售合同，应要求 `contractId` 与 `projectId` 保持一致。
3. 若 `invoiceType = input` 且无法唯一归属合同，可只绑定 `projectId`，但不得省略项目归属。

---

## 6. 读侧边界

| Query / View                                          | Consumer        | Fields                                                                                     | Filter / Sort             | Permission Boundary       | Result |
| ----------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------ | ------------------------- | ------------------------- | ------ |
| `GET /contract-finance/projects/{projectId}/invoices` | 财务归口列表页  | `invoiceNumber`、`contractId`、`invoiceAmount`、`invoiceType`、`status`、`exceptionStatus` | 当前按 `invoiceDate desc` | `contract:finance:manage` | Pass   |
| `GET /contract-finance/invoice-records/{id}`          | 财务详情 / 审计 | 主体字段组、异常摘要、关闭摘要、`allowedActions`                                           | 按 `id` 精确查询          | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 本切片至少要交付列表查询，避免再次出现“只补命令、不补读侧”的偏差。
2. 详情查询先以财务归口口径闭环，不在本切片承诺跨角色投影或打印模板。

---

## 7. 持久化边界

| Table            | Table Role | Minimal Fields                                                                                                                  | Constraints / Notes                                                      | Check Result |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------ |
| `invoice_record` | 主体主表   | `id`、`project_id`、`contract_id`、`invoice_type`、`invoice_no`、`invoice_amount`、`invoice_date`、`status`、`exception_status` | `invoice_no` 唯一；`project_id` 非空；`contract_id` 可空；支持按项目查询 | Pass         |

字段一致性冻结：

| Field             | Design Meaning | DDL / Table Freeze                    | Entity / API Rule                                     | Result |
| ----------------- | -------------- | ------------------------------------- | ----------------------------------------------------- | ------ |
| `invoiceType`     | 发票方向       | `invoice_record.invoice_type`         | 最小字典 `input / output`                             | Pass   |
| `invoiceNumber`   | 发票编号       | `invoice_record.invoice_no`           | 先按全局唯一                                          | Pass   |
| `invoiceAmount`   | 发票金额       | `invoice_record.invoice_amount`       | 统一 decimal 语义，不允许前端传格式化展示值           | Pass   |
| `invoiceDate`     | 发票业务日期   | `invoice_record.invoice_date`         | 固定为 date 语义，不回退到 datetime                   | Pass   |
| `status`          | 当前发票主状态 | `invoice_record.status`               | 采用本基线定义的最小状态机                            | Pass   |
| `exceptionStatus` | 异常子状态     | `invoice_record.exception_status`     | 最小字典 `none / open / resolved`                     | Pass   |
| `contractId`      | 可选合同归属   | `invoice_record.contract_id nullable` | `input` 发票允许为空；`output` 发票若已知合同必须绑定 | Pass   |

---

## 8. 一致性结论

- Document -> code: 先落地 `InvoiceRecord` 主对象，再推进 `EX-06B2` 映射，避免再次出现“映射目标不存在但已开工”的设计漂移。
- Command -> patch boundary: 异常、解除异常、关闭不得塞进普通 `PATCH`。
- Table -> entity -> contract: `invoiceDate` 固定用 date 语义；`invoiceNumber`、`exceptionStatus`、`contractId` 可空性必须在 migration、entity、contract 中一致。
- Query -> view: 列表查询是本切片最小必交，不允许只建写侧对象不交付读侧入口。
- Cost mapping dependency: `EX-06B2` 必须以后续本对象为唯一可信上游，不得绕过本切片直接把 `INVOICE` 映射写进 `ProjectActualCostRecord`。

---

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                      | Result | Gap / Reason |
| -------------------------------- | -------- | ------------------------------------------------------- | ------ | ------------ |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                       | Pass   |              |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`            | Pass   |              |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand`     | Pass   |              |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` + client update | Pass   |              |
| Migration / schema check         | Yes      | `mikro-orm migration:up` + `poms-api:migration-check`   | Pass   |              |

---

## 10. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                                     |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------------------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前切片无额外例外；但 `EX-06B2` 映射仍为后续切片，不得把本对象落地误判为完整成本映射完成 |

---

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-12`
- Conditions:
  1. 先完成 `EX-06B2A` 的 `InvoiceRecord` 主对象、命令、查询、持久化闭环，再允许 `EX-06B2` 进入 `Doing`。
  2. `EX-06B2A` 完成前，不得直接开做 `INVOICE -> ProjectActualCostRecord` 映射。
  3. `invoice_record` 的状态机、`invoiceType`、`exceptionStatus` 与唯一性约束若发生调整，必须同步回写总设计文档与 tracker。
