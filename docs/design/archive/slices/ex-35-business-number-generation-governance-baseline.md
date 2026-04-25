# EX-35 业务编号系统生成治理基线

- Gate Status: `G1 = Pass`
- Slice Type: `cross-layer-high-risk / governance baseline`
- Owner: `Codex`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-35`
- Direct Trigger: 线索编号不应继续由用户手工填写，需要统一盘点当前系统中应由系统生成的业务编号。

## 1. 范围

本次目标:

1. 建立 POMS 统一业务编号生成原则。
2. 盘点当前代码中已有的 `code / no / 编号` 字段，区分系统生成编号、人工维护编码和外部来源编号。
3. 冻结首批应改为系统生成的编号对象。
4. 冻结 POMS 内部编号与客户 / 甲方外部编号的字段边界。
5. 定义后续实现切片的后端、契约、前端和测试边界。

本次明确不做:

1. 不修改运行时代码。
2. 不新增 migration、entity、service、OpenAPI 或 generated client。
3. 不把所有 `code` 字段都改成流水号。
4. 不新增客户、供应商主数据或发票税务编号生成规则。
5. 不做历史兼容层；当前系统仍在开发期，后续实现可按最终模型直接修改 DTO、字段和测试 fixture。

## 2. 当前事实盘点

| 对象 / 字段                                               | 当前事实                                                                                                            | 结论                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `Lead.leadCode`                                           | `lead.lead_code` 唯一，`CreateLeadRequest.leadCode` 必填，前端“登记线索”要求用户填写线索编号。                      | 改为 `Lead.leadNo`，系统生成。                               |
| `Project.projectCode`                                     | `project.project_code` 唯一，`CreateProjectRequest.projectCode` 和 `ConvertLeadToProjectRequest.projectCode` 必填。 | 改为 `Project.projectNo`，系统生成。                         |
| `Contract.contractNo`                                     | `contract.contract_no` 唯一，`CreateContractRequest.contractNo` 必填，前端合同创建要求用户填写。                    | 保留为 POMS 内部合同号，系统生成；客户合同号另设字段。       |
| `ProjectActualCostRecord.recordNo`                        | 字段 nullable，当前服务用 `PAYMENT-${Date.now()}` / `INVOICE-${Date.now()}` 等生成。                                | 应改为正式业务编号生成。                                     |
| `InvoiceRecord.invoiceNumber`                             | 发票号码唯一，来自发票事实，`CreateInvoiceRecordRequest.invoiceNumber` 必填。                                       | 外部 / 税务编号，不生成。                                    |
| `ProjectActualCostRecord.sourceRefNo`                     | 来源引用号，来自 payment / invoice / expense / payable / rate key 等上游对象。                                      | 来源编号，不生成。                                           |
| 客户项目编号 / 招标编号                                   | 当前 Project 和 bid-commercial 事实中没有独立外部编号字段。                                                         | 新增 optional 外部编号字段，不替代 POMS 内部编号。           |
| 客户合同编号                                              | 当前 Contract 只有 `contractNo`。                                                                                   | 新增 optional `customerContractNo`，不替代 POMS 内部合同号。 |
| `OrgUnit.code`                                            | 平台组织编码，创建 / 编辑时人工维护。                                                                               | 配置编码，不生成。                                           |
| `Role.code` / permission key / nav key                    | 平台权限与导航稳定 key。                                                                                            | 配置 key，不生成。                                           |
| `CommissionRuleVersion.ruleCode`                          | 制度规则编码，与版本共同唯一。                                                                                      | 业务规则编码，不生成。                                       |
| `InternalCostRateVersion.rateKey`                         | `scope + identity + unit` 派生键。                                                                                  | 派生身份键，不生成。                                         |
| `blockingReasonCode` / `gateDecisionCode`                 | 枚举 / 规则判断码。                                                                                                 | 规则码，不生成。                                             |
| `AcceptanceRecord` / `CompletionRecord` / `ArchiveRecord` | 当前无用户可见业务编号字段，靠项目、事件类型、时间和 source id 定位。                                               | 本片不新增编号。                                             |
| `ReceiptRecord` / `PayableRecord` / `PaymentRecord`       | 当前无独立用户可见编号字段，主要靠 id、项目、合同和业务日期定位。                                                   | 本片不新增编号。                                             |

## 3. 编号分类原则

| 分类              | 判定标准                                                       | 处理规则                                                              |
| ----------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| 系统生成业务编号  | 用户可见、跨页面引用、应唯一、创建时即可确定，且不应人工猜测。 | 后端事务内生成，前端只读展示，create request 不再要求用户填写。       |
| 人工维护配置编码  | 表达组织、角色、权限、规则、分类或派生身份。                   | 保持人工维护或由领域规则派生，不纳入流水号。                          |
| 外部来源编号      | 来自客户、税务、合同外部系统、供应商或上游单据。               | 作为外部引用字段保存，不占用系统编号；必要时另设 `external*No` 字段。 |
| 运行时 source ref | 用于说明成本或投影记录来自哪个上游对象。                       | 保持映射来源，不作为业务编号生成目标。                                |
| 纯技术主键        | UUID、内部 id、row version。                                   | 继续作为内部关联键，不给用户当业务编号。                              |

## 4. 首批系统生成编号规则

| Scope               | 字段 / 对象                        | 格式                     | 周期 | 序号宽度 | 生成时点                                                        | 备注                                     |
| ------------------- | ---------------------------------- | ------------------------ | ---- | -------- | --------------------------------------------------------------- | ---------------------------------------- |
| `lead`              | `Lead.leadNo`                      | `LD-{YYYY}-{000000}`     | 年度 | 6        | `LeadService.createLead`                                        | 替代当前 `leadCode`。                    |
| `project`           | `Project.projectNo`                | `PRJ-{YYYY}-{000000}`    | 年度 | 6        | `ProjectService.createAndSave` / `LeadService.convertToProject` | 替代当前 `projectCode`。                 |
| `contract`          | `Contract.contractNo`              | `CT-{YYYY}-{000000}`     | 年度 | 6        | `ContractService.createAndSave`                                 | 表示 POMS 内部合同号。                   |
| `cost-payment-fact` | `ProjectActualCostRecord.recordNo` | `AC-PAY-{YYYY}-{000000}` | 年度 | 6        | `registerPaymentFactCostRecord`                                 | `sourceRefNo` 继续指向来源付款事实。     |
| `cost-invoice`      | `ProjectActualCostRecord.recordNo` | `AC-INV-{YYYY}-{000000}` | 年度 | 6        | `registerInvoiceCostRecord`                                     | 发票号码仍保留在 `sourceRefNo`。         |
| `cost-expense`      | `ProjectActualCostRecord.recordNo` | `AC-EXP-{YYYY}-{000000}` | 年度 | 6        | `registerExpenseCostRecord`                                     | 来源 expense id 不当作记录编号。         |
| `cost-procurement`  | `ProjectActualCostRecord.recordNo` | `AC-PRC-{YYYY}-{000000}` | 年度 | 6        | `registerProcurementCostRecord`                                 | 表达采购承诺成本记录编号。               |
| `cost-labor`        | `ProjectActualCostRecord.recordNo` | `AC-LBR-{YYYY}-{000000}` | 年度 | 6        | labor cost register / replace chain                             | 两条 labor path 必须共用同一 generator。 |

规则说明:

1. `YYYY` 使用编号生成时的业务日期年份，首版以服务端当前时间为准。
2. 编号一旦生成不可修改。
3. 允许跳号，不保证连续。
4. 唯一性由数据库唯一约束兜底。
5. 业务属性变更不得导致编号变化。
6. 外部编号必须另设字段，不能覆盖系统编号。

## 5. 外部编号字段边界

| 对象 / 场景         | 字段建议                                   | 是否系统生成 | 是否必填 | 说明                                                           |
| ------------------- | ------------------------------------------ | ------------ | -------- | -------------------------------------------------------------- |
| 客户项目编号        | `Project.customerProjectNo`                | 否           | 否       | 甲方立项、客户系统或客户内部项目编号；可能晚于 POMS 项目创建。 |
| 招标公告 / 招标编号 | `ProjectBidCommercialProcess.tenderNo`     | 否           | 否       | 归属招投标过程，不归属项目系统编号；一个项目可能多轮招标。     |
| 标段 / 包件编号     | `ProjectBidCommercialProcess.bidPackageNo` | 否           | 否       | 归属具体投标 / 商务过程，可为空。                              |
| 客户合同编号        | `Contract.customerContractNo`              | 否           | 否       | 甲方法务或客户系统合同号；没有时为空。                         |
| 发票号码            | `InvoiceRecord.invoiceNumber`              | 否           | 是       | 税务 / 外部发票事实编号，不由 POMS 生成。                      |

UI 文案:

1. `projectNo` 显示为“POMS 项目编号”或“系统项目编号”。
2. `customerProjectNo` 显示为“客户项目编号”。
3. `tenderNo` 显示为“招标编号”。
4. `contractNo` 显示为“POMS 合同编号”或“系统合同编号”。
5. `customerContractNo` 显示为“客户合同编号”。

## 6. 推荐技术设计

新增内部表:

| Table                           | 关键字段                                                                                                       | 约束                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `poms.business_number_sequence` | `scope`、`period`、`next_value`、`prefix`、`padding`、`description`、`row_version`、`created_at`、`updated_at` | unique(`scope`, `period`) |

新增内部服务:

| Service / Method                        | 职责                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| `BusinessNumberService.next(scope, at)` | 在事务内锁定 `scope + period` 行，取当前值，递增 `next_value`，返回格式化编号。 |
| `BusinessNumberService.format(...)`     | 只做格式化，不访问数据库，便于单测。                                            |

并发规则:

1. 不使用 `select max(code) + 1`。
2. 不使用 `Date.now()`、随机数或前端生成。
3. 通过数据库行级锁或等价事务机制保证并发安全。
4. 若初始化 sequence 行发生唯一冲突，重试读取并锁定既有行。
5. 编号生成与业务实体创建必须在同一事务中完成。

## 7. 契约与前端边界

| Surface                                | 当前输入           | 决策                                                                    |
| -------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `CreateLeadRequest`                    | `leadCode` 必填    | 移除 `leadCode`；response 使用 `leadNo`。                               |
| `ConvertLeadToProjectRequest`          | `projectCode` 必填 | 移除 `projectCode`；转项目命令生成 `projectNo`。                        |
| `CreateProjectRequest`                 | `projectCode` 必填 | 移除 `projectCode`；如需要，新增 optional `customerProjectNo`。         |
| `CreateContractRequest`                | `contractNo` 必填  | 移除输入侧 `contractNo`；后端生成；新增 optional `customerContractNo`。 |
| `ProjectActualCostRecord` create union | 无 `recordNo` 输入 | 保持无输入；内部生成并在 summary/detail 中展示。                        |
| `ProjectBidCommercialProcess` create   | 当前无外部招标编号 | 新增 optional `tenderNo` / `bidPackageNo`，由用户录入。                 |
| `/leads` 前端登记弹窗                  | 用户填线索编号     | 移除输入框，保存成功后展示系统生成编号。                                |
| `/projects` 创建 / lead convert 前端   | 用户填项目编号     | 移除 POMS 项目编号输入，保留客户项目编号为可选输入。                    |
| `/contracts` 创建前端                  | 用户填合同编号     | 移除 POMS 合同编号输入，保留客户合同编号为可选输入。                    |

Public route impact:

- 不强制新增 public HTTP route。
- 若 `GET /projects/code/:projectCode` 改为 `GET /projects/no/:projectNo` 或删除，必须先更新 authoritative route inventory。
- 会改变现有 request DTO / OpenAPI / generated client。
- 必须同步 `shared-contracts`、API DTO、OpenAPI、generated client、admin data-access 和前端表单。

## 8. 开发期数据处理

当前系统处于开发期，不要求历史兼容:

1. 不保留旧 `leadCode` / `projectCode` request alias。
2. 不保留手工输入 POMS 项目编号、线索编号、合同编号的前端兼容入口。
3. seed、fixture、E2E 数据可直接改写为最终编号模型。
4. migration 可直接补齐 / 重建开发数据所需字段，不需要兼容早期手工编号格式。
5. 如果本地数据库已有旧值，处理目标是让 migration / seed / tests 可重复跑通，而不是保留旧编号语义。

## 9. 后续实施建议

建议将运行时实现拆为两个可提交切片:

| Slice    | 类型                    | 范围                                                                                                                                                                                                                   |
| -------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX-35A` | `cross-layer-high-risk` | 新增 sequence migration / service，改 Lead、Project、Contract、ActualCostRecord 后端生成，完成 `leadCode -> leadNo`、`projectCode -> projectNo` 收敛，新增客户 / 招标外部编号字段与 DTO / OpenAPI / generated client。 |
| `FE-30`  | `frontend-only`         | 移除线索、项目、合同创建表单中的 POMS 编号输入，增加可选客户编号输入，展示系统返回编号，更新前端单测和浏览器链路。                                                                                                     |

若必须一个提交完成，也应在同一个 G3 close-out 中分别列出 API / persistence / frontend / E2E 证据。

## 10. 验证要求

后续运行时实现至少需要:

1. `corepack pnpm nx lint poms-api`
2. `corepack pnpm nx build poms-api`
3. `corepack pnpm nx test poms-api`
4. `corepack pnpm nx run poms-api:openapi`
5. `corepack pnpm nx run shared-api-client:generate`
6. `corepack pnpm nx run shared-api-client:check`
7. `corepack pnpm nx run poms-api:migration-check`
8. `corepack pnpm nx lint poms-admin`
9. `corepack pnpm nx build poms-admin`
10. focused frontend tests for lead / project / contract forms
11. focused Playwright journey for lead -> project and project / contract creation if UI behavior changes
12. `corepack pnpm run format:md:check`
13. `git diff --check`

## 11. 例外

| Exception ID                         | Level | Scope                              | Approved By | Cleanup Owner        | Cleanup Due       | Notes                                    |
| ------------------------------------ | ----- | ---------------------------------- | ----------- | -------------------- | ----------------- | ---------------------------------------- |
| `EX35-E1-DEV-NO-HISTORY-COMPAT`      | `E1`  | 不保留旧编号 DTO / UI 兼容层       | `Codex`     | `EX-35A owner`       | `EX-35A G4`       | 系统仍在开发期，按最终模型直接收敛。     |
| `EX35-E2-UNNUMBERED-FINANCE-RECORDS` | `E1`  | receipt/payable/payment 不新增编号 | `Codex`     | future finance owner | future finance G1 | 当前没有用户可见编号字段，不在本片扩面。 |

## 12. G1 结论

- `EX-35` 可作为后续系统编号实现的正式输入。
- 当前应系统生成的首批编号为 `Lead.leadNo`、`Project.projectNo`、`Contract.contractNo`、`ProjectActualCostRecord.recordNo`。
- `Lead.leadCode` 与 `Project.projectCode` 是当前实现命名，不作为最终目标命名保留。
- 客户项目编号、招标编号、客户合同编号是 optional 外部编号字段，不能替代 POMS 内部编号。
- `InvoiceRecord.invoiceNumber`、`OrgUnit.code`、`Role.code`、`CommissionRuleVersion.ruleCode`、`InternalCostRateVersion.rateKey`、`sourceRefNo` 不应纳入系统流水号。
- 后续进入运行时代码前，必须先在 tracker 拆出 `EX-35A` / `FE-30` 或明确采用同批实现模式。
