# POMS 接口 OpenAPI 与 DTO 边界设计

**文档状态**: Draft (Baseline)
**最后更新**: 2026-03-19
**适用范围**: `POMS` 第一阶段命令型接口与普通更新接口的 OpenAPI / DTO 输入输出边界基线
**关联文档**:

- 上游设计:
  - `poms-requirements-spec.md`
  - `poms-hld.md`
  - `poms-design-progress.md`
  - `design-review-follow-up-summary.md`
- 同级设计:
  - `interface-command-design.md`
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `business-authorization-matrix.md`

---

## 1. 文档目标

本文档用于把 `interface-command-design.md` 中已经明确的接口形态边界，继续下钻为第一阶段可执行的 OpenAPI / DTO 输入输出边界基线。

本文档重点回答以下问题：

- 命令型接口在 OpenAPI 上如何命名与分层
- 请求 DTO 允许携带哪些字段，哪些字段必须禁止输入
- 响应 DTO 应返回动作结果，还是返回聚合对象视图
- 普通更新 DTO 与命令 DTO 的边界如何固定

本文档不是最终 OpenAPI 文件，不直接替代 `openapi.yaml`；它的作用是先冻结接口合同边界，再进入具体 schema 与 path 设计。

---

## 2. OpenAPI 设计基线

第一阶段建议统一采用以下接口命名与语义规则：

1. 普通更新接口使用资源语义，例如 `PATCH /contracts/{id}`、`PATCH /projects/{id}`。
2. 命令型接口使用动作语义，例如 `POST /contracts/{id}:activate`、`POST /receipt-records/{id}:confirm`。
3. 系统派生接口默认不作为前台公开接口；如需后台触发，应使用受控后台路径或内部服务接口。
4. 一个命令只表达一个业务动作，不在同一次命令里混合“改草稿字段 + 推进状态”。
5. 命令响应优先返回动作结果与关键引用，不默认返回整份聚合对象全量视图。

---

## 3. DTO 边界统一规则

### 3.1 请求 DTO 规则

1. 命令 DTO 只允许包含动作所需的最小字段，不允许顺带携带高敏字段包进行隐式修改。
2. 草稿态普通更新 DTO 只允许包含中低敏字段，禁止出现状态推进字段、审批结论字段、生效字段、冻结字段。
3. 命令 DTO 建议至少支持以下公共字段：

- `reason`：动作原因或说明，按需出现
- `comment`：审批 / 确认意见，按需出现
- `attachmentIds`：关联附件引用，按需出现
- `expectedVersion`：并发控制字段，按需出现

4. 下列字段类别默认不得出现在普通更新 DTO 中：

- 业务状态字段
- 审批 / 确认 / 复核结论字段
- 生效口径字段
- 冻结版本字段
- 关闭 / 作废 / 冲销 / 重算结果字段

### 3.2 响应 DTO 规则

第一阶段建议命令型接口优先返回以下结构化结果：

- `commandId` 或动作执行标识
- `targetId`
- `targetType`
- `resultStatus`
- `businessStatusAfter`
- `approvalRecordId` / `confirmationRecordId`，如有
- `snapshotId` / `newVersionId`，如有
- `todoItemIds` / `notificationIds`，如有

说明：

- 响应 DTO 的主目标是表达“动作执行结果”，不是代替详情查询接口。
- 若前端需要最新详情视图，建议通过详情查询接口单独拉取。

---

## 4. 普通更新接口 DTO 边界基线

| 对象                       | 接口草案                                  | 允许输入字段组           | 禁止输入字段组                        | 说明                            |
| -------------------------- | ----------------------------------------- | ------------------------ | ------------------------------------- | ------------------------------- |
| `Project`                  | `PATCH /projects/{id}`                    | 基础信息、备注、预计时间 | `stage`、`commercialMode`、关闭结论   | 仅限普通维护                    |
| `BidProcess`               | `PATCH /bid-processes/{id}`               | 附件、澄清说明           | 投标决策结论、投标结果                | 不得代替投标决策 / 结果登记命令 |
| `Contract`                 | `PATCH /contracts/{id}`                   | 草稿字段、合同标识包     | 金额包、付款条件包、生效状态          | 仅限草稿态                      |
| `ReceiptRecord`            | `PATCH /receipt-records/{id}`             | 登记说明、附件补录       | 确认结论、冲销结论、状态推进          | 不得代替财务确认                |
| `PaymentRecord`            | `PATCH /payment-records/{id}`             | 登记说明、凭证补录       | 生效状态、作废结论                    | 不得代替付款确认                |
| `InvoiceRecord`            | `PATCH /invoice-records/{id}`             | 普通台账字段             | 异常结论、解除异常结论、关闭结论      | 异常与关闭走命令型接口          |
| `CommissionRoleAssignment` | `PATCH /commission-role-assignments/{id}` | 草稿态角色分配说明       | 冻结结果、变更审批结论                | 冻结后禁止普通编辑              |
| `CommissionPayout`         | `PATCH /commission-payouts/{id}`          | 草稿态说明、非关键备注   | 批准金额、暂停 / 冲销结果、已发放结果 | 不得代替审批与登记发放          |
| `CommissionAdjustment`     | `PATCH /commission-adjustments/{id}`      | 草稿态原因补录           | 执行结果、冲销结论、补发结论          | 执行必须走命令                  |

---

## 5. 命令型接口 OpenAPI / DTO 草案

### 5.1 销售流程域首批命令

| 命令                      | OpenAPI 草案                              | 请求 DTO 建议字段                                        | 明确禁止输入                       | 响应 DTO 关键字段                                         |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| `submitProjectAssessment` | `POST /project-assessments/{id}:submit`   | `comment`、`attachmentIds`、`expectedVersion`            | `stage`、审批结论、关闭结论        | `targetId`、`businessStatusAfter`、`approvalRecordId`     |
| `confirmProjectScope`     | `POST /scope-confirmations/{id}:confirm`  | `comment`、`attachmentIds`、`expectedVersion`            | 范围外的项目主状态字段             | `targetId`、`businessStatusAfter`、`confirmationRecordId` |
| `submitQuotationReview`   | `POST /quotation-reviews/{id}:submit`     | `comment`、`attachmentIds`、`expectedVersion`            | 合同生效字段、签约结果字段         | `targetId`、`approvalRecordId`、`businessStatusAfter`     |
| `submitBidDecision`       | `POST /bid-processes/{id}:submitDecision` | `comment`、`attachmentIds`、`expectedVersion`            | `result`、签约结果字段             | `targetId`、`approvalRecordId`、`businessStatusAfter`     |
| `recordBidResult`         | `POST /bid-processes/{id}:recordResult`   | `result`、`reason`、`attachmentIds`、`expectedVersion`   | 标书草稿字段、普通说明字段整包覆盖 | `targetId`、`businessStatusAfter`、`confirmationRecordId` |
| `closeProjectAsLost`      | `POST /projects/{id}:closeLost`           | `reason`、`comment`、`expectedVersion`                   | 普通项目基础信息字段               | `targetId`、`businessStatusAfter`、`approvalRecordId`     |
| `terminateProject`        | `POST /projects/{id}:terminate`           | `reason`、`comment`、`expectedVersion`                   | 普通项目基础信息字段               | `targetId`、`businessStatusAfter`、`approvalRecordId`     |
| `confirmProjectHandover`  | `POST /project-handovers/{id}:confirm`    | `comment`、`participantConfirmations`、`expectedVersion` | 合同草稿字段、提成比例字段直接改写 | `targetId`、`businessStatusAfter`、`confirmationRecordId` |
| `confirmAcceptance`       | `POST /acceptance-records/{id}:confirm`   | `comment`、`attachmentIds`、`expectedVersion`            | 项目关闭字段、付款字段             | `targetId`、`businessStatusAfter`、`confirmationRecordId` |

### 5.2 合同资金域首批命令

| 命令                        | OpenAPI 草案                                  | 请求 DTO 建议字段                                       | 明确禁止输入                                 | 响应 DTO 关键字段                                         |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| `submitContractReview`      | `POST /contracts/{id}:submitReview`           | `comment`、`attachmentIds`、`expectedVersion`           | 合同金额包、付款条件包的静默改写             | `targetId`、`approvalRecordId`、`businessStatusAfter`     |
| `activateContract`          | `POST /contracts/{id}:activate`               | `comment`、`attachmentIds`、`expectedVersion`           | 金额包、付款条件包、普通草稿字段整包顺带提交 | `targetId`、`businessStatusAfter`、`snapshotId`           |
| `submitContractAmendment`   | `POST /contract-amendments/{id}:submit`       | `reason`、`comment`、`attachmentIds`、`expectedVersion` | 旧快照直接覆盖字段                           | `targetId`、`approvalRecordId`、`businessStatusAfter`     |
| `activateContractAmendment` | `POST /contract-amendments/{id}:activate`     | `comment`、`expectedVersion`                            | 直接修改原快照内容                           | `targetId`、`businessStatusAfter`、`snapshotId`           |
| `activateReceivablePlan`    | `POST /receivable-plans/{id}:activate`        | `comment`、`expectedVersion`                            | 计划生效后原地覆盖计划节点与金额             | `targetId`、`businessStatusAfter`、`newVersionId`         |
| `confirmReceiptRecord`      | `POST /receipt-records/{id}:confirm`          | `comment`、`expectedVersion`                            | 到账事实包与确认结论包混合批量覆盖           | `targetId`、`businessStatusAfter`、`confirmationRecordId` |
| `reverseReceiptRecord`      | `POST /receipt-records/{id}:reverse`          | `reason`、`comment`、`expectedVersion`                  | 直接删除原记录、直接改原确认结论             | `targetId`、`businessStatusAfter`、`reversalRecordId`     |
| `confirmPaymentRecord`      | `POST /payment-records/{id}:confirm`          | `comment`、`expectedVersion`                            | 付款登记字段与生效结论混合覆盖               | `targetId`、`businessStatusAfter`、`confirmationRecordId` |
| `voidPaymentRecord`         | `POST /payment-records/{id}:void`             | `reason`、`comment`、`expectedVersion`                  | 直接删除付款记录                             | `targetId`、`businessStatusAfter`、`voidRecordId`         |
| `markInvoiceException`      | `POST /invoice-records/{id}:markException`    | `reason`、`comment`、`expectedVersion`                  | 直接改发票主状态且不留异常结论               | `targetId`、`businessStatusAfter`、`approvalRecordId`     |
| `resolveInvoiceException`   | `POST /invoice-records/{id}:resolveException` | `comment`、`expectedVersion`                            | 直接清空异常字段                             | `targetId`、`businessStatusAfter`、`approvalRecordId`     |
| `closeInvoiceRecord`        | `POST /invoice-records/{id}:close`            | `reason`、`comment`、`expectedVersion`                  | 直接把关闭结论塞进普通更新 DTO               | `targetId`、`businessStatusAfter`、`closedAt`             |

### 5.3 提成治理域首批命令

| 命令                             | OpenAPI 草案                                          | 请求 DTO 建议字段                                          | 明确禁止输入                            | 响应 DTO 关键字段                                     |
| -------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `freezeCommissionRoleAssignment` | `POST /commission-role-assignments/{id}:freeze`       | `comment`、`expectedVersion`                               | 角色分配包与冻结结论一起任意覆盖        | `targetId`、`businessStatusAfter`、`newVersionId`     |
| `submitCommissionRoleChange`     | `POST /commission-role-assignments/{id}:submitChange` | `reason`、`comment`、`attachmentIds`、`expectedVersion`    | 直接改当前冻结版本                      | `targetId`、`approvalRecordId`、`businessStatusAfter` |
| `approveCommissionCalculation`   | `POST /commission-calculations/{id}:approve`          | `comment`、`expectedVersion`                               | 手工提交计算结果包关键数值              | `targetId`、`businessStatusAfter`、`approvalRecordId` |
| `recalculateCommission`          | `POST /commission-calculations/{id}:recalculate`      | `reason`、`comment`、`expectedVersion`                     | 直接覆盖旧计算结果                      | `targetId`、`businessStatusAfter`、`newVersionId`     |
| `submitCommissionPayoutApproval` | `POST /commission-payouts/{id}:submitApproval`        | `comment`、`expectedVersion`                               | `approvedAmount` 与普通备注字段混合覆盖 | `targetId`、`approvalRecordId`、`businessStatusAfter` |
| `registerCommissionPayout`       | `POST /commission-payouts/{id}:registerPayout`        | `paidRecordAmount`、`paidAt`、`comment`、`expectedVersion` | 批准金额包、暂停 / 冲销结论包           | `targetId`、`businessStatusAfter`、`paidRecordId`     |
| `suspendCommissionPayout`        | `POST /commission-payouts/{id}:suspend`               | `reason`、`comment`、`expectedVersion`                     | 普通草稿说明字段整包覆盖                | `targetId`、`approvalRecordId`、`businessStatusAfter` |
| `reverseCommissionPayout`        | `POST /commission-payouts/{id}:reverse`               | `reason`、`comment`、`expectedVersion`                     | 直接删除已发放记录                      | `targetId`、`approvalRecordId`、`businessStatusAfter` |
| `executeCommissionAdjustment`    | `POST /commission-adjustments/{id}:execute`           | `comment`、`expectedVersion`                               | 草稿原因字段与执行结果字段混合提交      | `targetId`、`businessStatusAfter`、`approvalRecordId` |
| `activateCommissionRuleVersion`  | `POST /commission-rule-versions/{id}:activate`        | `comment`、`expectedVersion`                               | 规则定义包静默改写                      | `targetId`、`businessStatusAfter`、`newVersionId`     |

### 5.4 横切审批域公共命令

| 命令                      | OpenAPI 草案                              | 请求 DTO 建议字段                            | 明确禁止输入                 | 响应 DTO 关键字段                                         |
| ------------------------- | ----------------------------------------- | -------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| `approveRecord`           | `POST /approval-records/{id}:approve`     | `comment`、`expectedVersion`                 | 业务对象字段直接改写         | `targetId`、`businessStatusAfter`、`todoItemIds`          |
| `rejectApprovalRecord`    | `POST /approval-records/{id}:reject`      | `reason`、`comment`、`expectedVersion`       | 业务对象草稿字段整包覆盖     | `targetId`、`businessStatusAfter`、`todoItemIds`          |
| `closeApprovalRecord`     | `POST /approval-records/{id}:close`       | `reason`、`comment`、`expectedVersion`       | 把关闭结论伪装成普通备注更新 | `targetId`、`businessStatusAfter`、`closedAt`             |
| `reassignApprovalRecord`  | `POST /approval-records/{id}:reassign`    | `newAssigneeId`、`reason`、`expectedVersion` | 业务对象审批结论字段         | `targetId`、`businessStatusAfter`、`newAssigneeId`        |
| `confirmRecord`           | `POST /confirmation-records/{id}:confirm` | `comment`、`expectedVersion`                 | 业务对象普通维护字段         | `targetId`、`businessStatusAfter`、`confirmationProgress` |
| `closeConfirmationRecord` | `POST /confirmation-records/{id}:close`   | `reason`、`comment`、`expectedVersion`       | 普通说明字段整包覆盖         | `targetId`、`businessStatusAfter`、`closedAt`             |

---

## 6. DTO 结构分层建议

第一阶段建议把 DTO 结构拆为三层：

1. `PatchDto`: 仅用于草稿态普通维护。
2. `CommandRequestDto`: 仅用于单一动作命令。
3. `CommandResultDto`: 仅用于返回动作执行结果。

建议避免以下反模式：

- 一个 DTO 同时既能普通保存，又能触发生效
- 一个 DTO 同时承载业务对象字段、审批实例字段、通知字段
- 一个命令响应直接回传完整聚合对象，导致前端误把响应当编辑源

---

## 7. 数据模型冻结前的接口检查点

在开始整理数据模型冻结前提之前，接口层至少应先确认：

1. 每个高敏感字段包是否都已被唯一映射到普通更新、命令型动作或系统派生三类之一。
2. 每个命令是否都已明确最小请求 DTO，而不是允许传入整个对象快照。
3. 每个命令响应是否只暴露结果事实与关键引用，不反向耦合完整查询模型。
4. 关键命令是否都具备 `expectedVersion` 或等价并发控制位。

---

## 8. 当前不在本文档中冻结的内容

当前仍不在本文档中写死以下内容：

- OpenAPI tag 划分与文件拆分结构
- schema 命名细节与代码生成映射
- 错误码体系、国际化消息与异常文案
- 统一鉴权中间件和审计事件模型
- 最终 query 接口返回视图

这些内容应在接口细化与数据模型冻结前再继续收敛。

---

## 9. 当前结论

第一阶段已经可以进一步冻结“接口合同边界”。当前最稳妥的推进方式，是先把高敏动作命令化、把请求 DTO 限制在动作最小输入、把响应 DTO 限制在结果事实与关键引用，然后再进入真正的 OpenAPI schema 与数据模型冻结设计。
