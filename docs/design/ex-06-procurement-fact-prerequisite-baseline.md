# EX-06B4A 采购承诺事实主对象实施基线包

- Gate Status: `Pass`
- Parent: `EX-06B4`
- Owner: `Codex`
- Slice Type: `api-command + query + persistence`
- Gate Reviewer: `Solo worktree checkpoint`
- Gate Date: `2026-04-12`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-06B4A`

---

## 1. 范围

- 本次目标: 在 `PROCUREMENT` 映射前，先把采购承诺 / 应付事实正式冻结为可编码的 `PayableRecord` 主对象，明确领域归属、最小字段组、状态机、最小命令链与最小查询链。
- 本次明确不做: 不在本切片直接实现 `PayableRecord -> ProjectActualCostRecord` 映射；不补完整付款审批流、供应商主数据域、采购合同全文管理、跨来源去重累计口径。
- 下游可依赖的交付边界: `payable_record` 的稳定表结构、状态机、命令 / 查询入口与和 `PaymentRecord` 的来源链边界；后续 `EX-06B4` 只能基于该对象继续实现 `PROCUREMENT` 映射。
- 不允许下游依赖的留白: 本切片完成后，只能宣称“采购承诺事实主对象已冻结可编码”，不能宣称“`PROCUREMENT` 成本映射已完成”。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor | Status   | Notes                                                                   |
| ------------------------- | ----------------------------------------------------------------- | ---------------- | -------- | ----------------------------------------------------------------------- |
| Business design           | `phase2-project-actual-cost-records.md`                           | 3.1, 5           | Review   | 来源事实层包含采购相关记录；`PROCUREMENT` 为正式成本类型                |
| Source mapping design     | `phase2-cost-source-to-project-record-mapping.md`                 | 4, 7.6~7.8, 11.1 | Review   | 采购链、去重累计原则、当前工程冻结边界                                  |
| Domain design             | `contract-finance-design.md`                                      | 5, 8.4, 9, 12.4  | Review   | `PayableRecord` 已被定义为合同资金域第一阶段成本台账主体                |
| Permission design         | `business-authorization-matrix.md`                                | `PayableRecord`  | Review   | `登记应付` 动作、组织归属与最小授权边界                                 |
| Command design            | `interface-command-design.md`                                     | 4.2, 4.3         | Active   | 普通编辑和命令型动作边界；`PROCUREMENT` 映射与 `PayableRecord` 不得混写 |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | 5.5              | Active   | 统一成本来源映射命令 DTO 边界                                           |
| Query boundary            | `query-view-boundary-design.md`                                   | 5.2, 6           | Active   | 项目经营视图已需要 `payableRegisteredAmountSummary`                     |
| Data model / table freeze | `table-structure-freeze-design.md`                                | 4.2              | Active   | 已冻结 `payable_record` 为主体主表                                      |
| Schema / DDL              | `schema-ddl-design.md`                                            | 4.2, 8.5         | Active   | `payment_record.payable_record_id -> payable_record.id` 已为正式关系    |
| ADR                       | `../adr/004-contract-finance-domain-module-boundary.md`           | module boundary  | Accepted | `PayableRecord` 属于合同资金域，不应默认放入 `project-cost`             |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | gates            | Accepted | 本切片按 `G1 / G3 / G4` 留痕                                            |

---

## 3. 本次 SSOT

| Concern               | SSOT                  | Implementation Rule                                                                             |
| --------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| Business semantics    | `PayableRecord`       | `PayableRecord` 表达采购承诺 / 应付事实，不等于付款事实，不等于统一成本记录                     |
| Domain ownership      | `contract-finance`    | 采购承诺事实主对象归属合同资金域；`project-cost` 只消费其作为 `PROCUREMENT` 的上游来源          |
| Project binding       | `projectId`           | 每条采购承诺事实必须绑定唯一项目；`contractId` 可空但不能替代 `projectId`                       |
| Source-chain boundary | `Payable -> Payment`  | `PayableRecord` 表达承诺与责任边界，`PaymentRecord` 表达实际支付，不允许两者混成单一事实        |
| Money semantics       | `registeredAmount`    | 当前先冻结采购承诺金额为 `registeredAmount`；后续 `PROCUREMENT` 映射以承诺金额进入统一成本层    |
| Status machine        | `PayableRecord`       | 只允许 `draft -> recorded -> partially-paid -> completed/closed/voided` 的受控演进              |
| Mapping dependency    | `EX-06B4`             | `PROCUREMENT` 映射命令只可依赖稳定后的 `PayableRecord` API / migration / contract               |
| Dedup boundary        | `PROCUREMENT` vs 链路 | `PROCUREMENT` 只表达采购承诺，后续与 `PAYMENT_FACT / INVOICE` 的累计去重在 `EX-06B4` 中统一收口 |

---

## 4. 对象与状态冻结

### 4.1 主对象字段组

本切片冻结 `payable_record` 最小字段组为：

- `id`
- `projectId`
- `contractId`
- `vendorName`
- `costCategory`
- `payableDescription`
- `currency`
- `registeredAmount`
- `paidAmount`
- `expectedPaymentDate`
- `status`
- `evidenceSummary`
- `attachmentCount`

补充冻结约束：

1. `projectId` 必填，`contractId` 可空。
2. `registeredAmount` 表达当前采购承诺 / 应付登记金额；`paidAmount` 只表达已跟踪支付部分。
3. `expectedPaymentDate` 固定为 `date` 语义，不回退到 `datetime`。
4. `costCategory` 只表达采购成本类别，不承担统一成本层的 `costType` 语义。

### 4.2 状态机

本切片冻结 `PayableRecord.status` 为：

- `draft`
- `recorded`
- `partially-paid`
- `completed`
- `closed`
- `voided`

补充冻结约束：

1. `draft` 允许普通补录，但不构成正式采购承诺事实。
2. 进入 `recorded` 后，才允许作为后续 `PROCUREMENT` 映射候选。
3. `partially-paid` 与 `completed` 只表达支付承接进度，不应替代 `PaymentRecord` 自身事实。
4. 已进入经营口径或已被后续事实链引用的记录，不允许物理删除。

---

## 5. 命令与接口边界

| Route / Controller                                     | Command / Service          | Request DTO / Contract                                                                                                                                                                     | Response DTO / Contract | Guard / Permission        | Result |
| ------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------- | ------ |
| `POST /contract-finance/projects/{projectId}/payables` | `createPayable`            | `contractId?`、`vendorName`、`costCategory`、`payableDescription`、`currency?`、`registeredAmount`、`expectedPaymentDate`、`evidenceSummary?`、`attachmentCount?`                          | `PayableRecordSummary`  | `contract:finance:manage` | Pass   |
| `PATCH /contract-finance/payable-records/{id}`         | `updatePayable`            | `contractId?`、`vendorName?`、`costCategory?`、`payableDescription?`、`currency?`、`registeredAmount?`、`expectedPaymentDate?`、`evidenceSummary?`、`attachmentCount?`、`expectedVersion?` | `PayableRecordSummary`  | `contract:finance:manage` | Pass   |
| `POST /contract-finance/payable-records/{id}/partial`  | `markPayablePartiallyPaid` | `paidAmount`、`expectedVersion?`                                                                                                                                                           | `PayableRecordSummary`  | `contract:finance:manage` | Pass   |
| `POST /contract-finance/payable-records/{id}/complete` | `completePayable`          | `expectedVersion?`                                                                                                                                                                         | `PayableRecordSummary`  | `contract:finance:manage` | Pass   |
| `POST /contract-finance/payable-records/{id}/close`    | `closePayable`             | `reason`、`comment?`、`expectedVersion?`                                                                                                                                                   | `PayableRecordSummary`  | `contract:finance:manage` | Pass   |
| `POST /contract-finance/payable-records/{id}/void`     | `voidPayable`              | `reason`、`comment?`、`expectedVersion?`                                                                                                                                                   | `PayableRecordSummary`  | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 普通更新接口不得直接改写 `status`。
2. `recorded` 之后的状态推进必须走专用命令，不允许前端整包 `PATCH`。
3. `PayableRecord` 相关命令不得顺带创建 `ProjectActualCostRecord`；`PROCUREMENT` 映射必须走独立切片。

---

## 6. 读侧边界

| Query / View                                          | Consumer                | Fields                                                                                                                                         | Filter / Sort                                                                            | Permission Boundary       | Result |
| ----------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------- | ------ |
| `GET /contract-finance/projects/{projectId}/payables` | 财务 / 项目经营协作列表 | `vendorName`、`costCategory`、`registeredAmount`、`paidAmount`、`status`、`expectedPaymentDate`                                                | 当前实现按 `expectedPaymentDate desc, createdAt desc` 默认排序；后续如需筛选器再增量补入 | `contract:finance:manage` | Pass   |
| `GET /contract-finance/payable-records/{id}`          | 财务详情 / 审计回看     | `vendorName`、`payableDescription`、`registeredAmount`、`paidAmount`、`status`、`evidenceSummary`、`projectId`、`contractId`、`allowedActions` | 按 `id` 精确查询                                                                         | `contract:finance:manage` | Pass   |

补充冻结约束：

1. 列表和详情都必须能区分“承诺金额”和“已支付金额”。
2. 详情必须保留项目 / 合同归属，供后续 `PROCUREMENT -> PAYMENT_FACT` 来源链解释使用。

---

## 7. 持久化边界

| Table            | Migration                              | Entity / Repository                           | DDL / Freeze Source                                               | Check Result |
| ---------------- | -------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- | ------------ |
| `payable_record` | 新增 `payable_record` 主表、外键与索引 | `PayableRecord` / contract-finance repository | `table-structure-freeze-design.md` / `contract-finance-design.md` | Pass         |
| `payment_record` | 新增 `payable_record_id` 外键与索引    | `PaymentRecord` / contract-finance repository | `schema-ddl-design.md` / `contract-finance-design.md`             | Pass         |

| Field                 | Design Type / Meaning              | Migration / DDL                             | Entity                                            | Shared Contract / OpenAPI                  | Result |
| --------------------- | ---------------------------------- | ------------------------------------------- | ------------------------------------------------- | ------------------------------------------ | ------ |
| `projectId`           | `uuid`，项目归属                   | `payable_record.project_id`                 | `PayableRecord.projectId`                         | `PayableRecordSummary.projectId`           | Pass   |
| `contractId`          | `uuid?`，可选合同归属              | `payable_record.contract_id nullable`       | `PayableRecord.contractId`                        | `PayableRecordSummary.contractId`          | Pass   |
| `vendorName`          | `varchar`，供应商名称              | `payable_record.vendor_name`                | `PayableRecord.vendorName`                        | `PayableRecordSummary.vendorName`          | Pass   |
| `costCategory`        | `varchar`，采购成本类别            | `payable_record.cost_category`              | `PayableRecord.costCategory`                      | `PayableRecordSummary.costCategory`        | Pass   |
| `registeredAmount`    | `decimal`，采购承诺 / 应付登记金额 | `payable_record.registered_amount`          | `PayableRecord.registeredAmount`                  | `PayableRecordSummary.registeredAmount`    | Pass   |
| `paidAmount`          | `decimal`，已支付累计金额          | `payable_record.paid_amount default '0'`    | `PayableRecord.paidAmount`                        | `PayableRecordSummary.paidAmount`          | Pass   |
| `expectedPaymentDate` | `date`，预计支付日期               | `payable_record.expected_payment_date`      | `PayableRecord.expectedPaymentDate`               | `PayableRecordSummary.expectedPaymentDate` | Pass   |
| `status`              | 状态机                             | `payable_record.status`                     | `PayableRecord.status`                            | `PayableRecordSummary.status`              | Pass   |
| `payableRecordId`     | `uuid?`，付款到采购承诺来源链引用  | `payment_record.payable_record_id nullable` | `PaymentRecord.payableRecord` / `payableRecordId` | `PaymentRecordSummary.payableRecordId`     | Pass   |

---

## 8. 一致性结论

- Document -> code: 当前正式把 `PayableRecord` 固定为 `PROCUREMENT` 的前置来源事实对象，后续代码不得再另造“采购承诺主对象”平行实现。
- Migration -> entity: `payable_record` 的字段与状态机必须同时落到 migration、entity、repository。
- Entity -> contract: `expectedPaymentDate` 必须按 `date` 语义；`registeredAmount / paidAmount` 不能在 contract 层改写成其他含义。
- Route -> command: `partial / complete / close / void` 必须走命令接口，不退回普通 `PATCH`。
- Query -> view: 读侧必须同时表达承诺金额和已支付金额，不能只保留单一金额摘要。
- Guard / permission: 采购承诺事实主对象继续沿用合同资金域 `contract:finance:manage` 边界，后续如需更细角色拆分，必须单独变更设计。
- OpenAPI / generated client: `PayableRecord` 主对象落地后已同步回写 OpenAPI 与 generated client；后续新增字段或状态时，必须继续按同一链路同步更新。

---

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                          | Result | Gap / Reason                                                           |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                                                                           | Pass   | -                                                                      |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`                                                                                                | Pass   | 24 suites / 259 tests                                                  |
| API / integration tests          | Yes      | `corepack pnpm nx run poms-api:openapi`                                                                                                     | Pass   | OpenAPI 已包含 PayableRecord 接口                                      |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand`                                                                                         | Pass   | 9 suites / 50 tests                                                    |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`；`corepack pnpm nx run shared-api-client:generate`；`git diff --check`                              | Pass   | `.openapi-generator/FILES` 存在 CRLF/LF 提示，但无 whitespace error    |
| Migration / schema check         | Yes      | `corepack pnpm exec mikro-orm migration:up --config apps/poms-api/src/mikro-orm.config.ts`；`corepack pnpm nx run poms-api:migration-check` | Pass   | 已应用 `Migration20260412212000_add_payable_record`，schema up-to-date |

### 9.1 关键验证证据摘要

- 命令链验证: 已覆盖登记采购承诺、普通更新、部分支付、完成、关闭、作废六类命令，并确认只有专用命令可推进 `status`。
- 来源链验证: 已在 `PaymentRecord` 上接通 `payableRecordId`，并校验付款记录只能引用同项目且状态允许的 `PayableRecord`。
- 读侧验证: 已覆盖项目列表与详情回看，确认同一对象同时暴露 `registeredAmount`、`paidAmount`、`status`、`allowedActions` 等字段。
- 端到端验证: `poms-api-e2e` 已跑通“创建 PayableRecord -> 更新证据 -> 标记部分支付 -> 创建并确认 PaymentRecord -> 完成 PayableRecord”的主链场景。
- 契约一致性验证: 已同步回写 shared contracts、OpenAPI spec 与 generated client，确保 DTO、路由和响应类型不再停留在设计占位状态。

---

## 10. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                                                      |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前切片无额外例外；但 `PROCUREMENT` 与 `PAYMENT_FACT / INVOICE` 的去重累计口径仍需在 `EX-06B4` 中正式收口 |

---

## 11. G4 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-12`
- Conditions:
  1. 本结论代表 `EX-06B4A` 已完成 `payable_record` migration / entity / repository / API / contract / OpenAPI / client / tests 的最小闭环。
  2. `EX-06B4` 下一步应只聚焦 `registerProcurementCostRecord`、`PROCUREMENT` 来源映射和 `PROCUREMENT / PAYMENT_FACT / INVOICE` 去重纳入口径，不再重复建设采购承诺主对象。
  3. 若后续决定不用 `PayableRecord` 承接采购承诺事实，必须先补明确 ADR / 设计决策，不允许实现层私自改口径。
