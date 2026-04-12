# EX-06D PayableRecord / PaymentRecord 税额语义升级实施基线包

## 1. 文档元数据

- Slice ID: `EX-06D`
- Title: `PayableRecord / PaymentRecord 税额语义升级与统一成本金额映射重基线`
- Parent: `EX-06`
- Owner: `Codex`
- Slice Type: `persistence + api-command + query + contract`
- Gate Status: `G4 Pass`
- Gate Date: `2026-04-13`
- Tracker Row: `EX-06D`

## 2. 问题陈述

EX-06 已完成 `PROCUREMENT / INVOICE / EXPENSE / PAYMENT_FACT` 四类来源映射的最小闭环，但 `PayableRecord` / `PaymentRecord` 仍沿用单金额字段思路，当前实现把 `registeredAmount` / `paymentAmount` 直接写入统一成本记录的 `amountIncludingTax`，而合同财务设计又声明这两类事实按未税口径参与毛利核算。

这意味着当前仓库同时存在两套互相冲突的语义：

1. 字段命名层：`amountIncludingTax` 表示含税金额。
2. 实现消费层：procurement/payment 来源把单金额当作未税成本或混合金额直接灌入该字段。

如果不在 EX-07 前收口，后续累计、分摊、税务吸收和毛利核算都会建立在错误金额层上。因此本切片采用方案 C：直接重建 procurement/payment 的显式税额语义，而不是继续让错误字段名带着临时解释往后扩散。

## 3. 切片目标

### 3.1 In Scope

- 为 `PayableRecord` / `PaymentRecord` 建立显式的未税、税额、含税金额模型。
- 冻结 `ProjectActualCostRecord.amountExcludingTax / taxCostAmount / amountIncludingTax` 在 procurement/payment 映射中的单一语义。
- 回写 DDL、entity、shared contract、DTO/OpenAPI、测试与设计文档。
- 制定既有数据迁移与纠偏策略。

### 3.2 Out of Scope

- 不实现完整税率引擎或自动税额推导。
- 不扩展新的成本来源类别。
- 不在本切片实现 EX-07 的累计、分摊、阶段视图。
- 不为 `registeredAmount` / `paymentAmount` 保留兼容别名或双字段过渡；本切片按单次迁移直接删除旧字段。

## 4. 单一事实源

### 4.1 金额语义

- `amountExcludingTax`: 成本主体金额，不含税。
- `taxAmount`: 与该来源事实绑定的税额；未知时为 `null`，仅在确认无税时允许为 `0`。
- `amountIncludingTax`: 含税总额；仅在可确定时填写，通常满足 `amountExcludingTax + taxAmount`。
- `PayableRecord` 与 `PaymentRecord` 的 canonical write-model 均只保留上述显式金额层，不再保留 `registeredAmount` / `paymentAmount`。
- `PayableRecord.paidAmount` 不再作为 canonical 持久化字段继续演进；如业务需要“已支付进度”，应由关联 `PaymentRecord` 聚合为派生读模型或受控摘要字段。

### 4.2 来源事实到统一成本记录的映射

- `PROCUREMENT_FACT` / `PAYMENT_FACT` 来源映射时：
  - `ProjectActualCostRecord.amountExcludingTax <- 来源未税金额`
  - `ProjectActualCostRecord.taxCostAmount <- 来源税额`
  - `ProjectActualCostRecord.amountIncludingTax <- 来源含税金额`
- 若税额未知，则 `taxCostAmount = null`。
- 若含税总额未知，则 `amountIncludingTax = null`。
- 不允许再把单一来源金额直接落入 `amountIncludingTax` 同时把其余金额字段留空。

## 5. 设计输入

- `docs/design/contract-finance-design.md`
- `docs/design/phase2-project-actual-cost-records.md`
- `docs/design/phase2-cost-source-to-project-record-mapping.md`
- `docs/design/interface-command-design.md`
- `docs/design/interface-openapi-dto-design.md`
- `docs/design/table-structure-freeze-design.md`
- `docs/design/schema-ddl-design.md`
- `docs/design/implementation-governance-gates.md`
- `docs/adrs/adr-012-design-governance-state-model.md`
- `docs/adrs/adr-014-task-status-model.md`

## 6. 实施要求

### 6.1 持久化

- 为 `payable_record` 增加显式未税金额、税额、含税金额列。
- 为 `payment_record` 增加显式未税金额、税额、含税金额列。
- 删除 `payable_record.registered_amount`、`payment_record.payment_amount`。
- 删除或退役 `payable_record.paid_amount` 作为 canonical 字段；支付进度改由 `payment_record` 聚合。
- 对既有单金额数据执行迁移：
  - 历史单金额优先回填到未税金额字段。
  - 税额未知时保持 `null`，不得虚构为 `0`。
  - 若统一成本记录历史上把 procurement/payment 单金额错误写入 `amountIncludingTax`，应执行纠偏迁移。

### 6.2 接口与契约

- 更新 command DTO、shared contracts、OpenAPI、generated client。
- 直接删除 `registeredAmount` / `paymentAmount` 对外接口字段，不提供别名兼容输出。
- 若读侧仍需展示“已支付进度”，必须以显式语义命名的新字段输出，不再复用 `paidAmount` 这一模糊命名。

### 6.3 验证

- 单元测试覆盖 payable/payment 输入校验与映射语义。
- 集成测试覆盖统一成本记录三个金额字段的正确落值。
- E2E 覆盖 procurement/payment 创建、映射、查询回读。
- migration / entity / contract / OpenAPI 对账必须通过。

## 7. 依赖关系

- `EX-06` 已因本切片完成而恢复 `Done`，后续不再允许绕开本切片重新引入 procurement/payment 的模糊单金额语义。
- `EX-07` 现在必须基于本切片冻结后的金额口径推进，不得重新解释 procurement/payment 的金额字段语义。

## 8. 实施结果

本切片已按方案 C 完成收口，结果如下：

1. `payable_record` / `payment_record` 已切换为显式 `amountExcludingTax / taxAmount / amountIncludingTax` 金额模型，并删除 `registeredAmount` / `paymentAmount` 旧字段。
2. `PayableRecord.paidAmount` 已从 canonical 持久化模型中移除，支付进度改为由关联确认态 `PaymentRecord` 聚合派生。
3. procurement / payment 到 `ProjectActualCostRecord` 的映射已改为稳定写入 `amountExcludingTax / taxCostAmount / amountIncludingTax` 三层金额语义。
4. shared contracts、DTO、OpenAPI、generated client、entity、migration、service 与测试已同步回写。
5. 历史 procurement/payment 单金额误写入统一成本 `amountIncludingTax` 的数据已在 migration 中执行纠偏。

## 9. 验证证据

| Check            | Command / Evidence                                                                                                                                | Result | Notes                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Unit tests       | `corepack pnpm nx test poms-api --runInBand`                                                                                                      | Pass   | `24` suites / `268` tests                                                             |
| Build            | `corepack pnpm nx build poms-api`                                                                                                                 | Pass   | `poms-api` 构建通过                                                                   |
| OpenAPI          | `corepack pnpm nx run poms-api:openapi`                                                                                                           | Pass   | 契约导出通过                                                                          |
| Generated client | `corepack pnpm nx run shared-api-client:generate`                                                                                                 | Pass   | client 已按新契约重生成                                                               |
| API E2E          | `corepack pnpm nx run poms-api-e2e:e2e --runInBand`                                                                                               | Pass   | `9` suites / `51` tests；真实 DB migration-up 通过                                    |
| Migration check  | `corepack pnpm nx run poms-api:migration-check`                                                                                                   | Pass   | schema 与 ORM metadata 对齐                                                           |
| Diff hygiene     | `git diff --check -- apps/poms-api/src apps/poms-api-e2e/src libs/shared/contracts/src libs/api/contracts/src libs/shared/api-client docs/design` | Pass   | 仅 `libs/shared/api-client/.openapi-generator/FILES` 存在 CRLF warning，无 diff error |

## 10. G4 结论

本切片已满足 `G4 Pass`：

1. procurement / payment 金额口径已回到单一事实源，不再把模糊单金额继续扩散到统一成本层。
2. DDL、entity、contract、OpenAPI、generated client 与测试证据已对齐。
3. `EX-07` 现在可以基于明确的未税 / 税额 / 含税语义继续推进累计、分摊与阶段视图设计和实现。
