# POMS 接口命令设计

**文档状态**: Draft (Baseline)
**最后更新**: 2026-03-19
**适用范围**: `POMS` 第一阶段实现前的接口命令边界、首批命令型动作清单与接口冻结输入
**关联文档**:

- 上游设计:
  - `poms-requirements-spec.md`
  - `poms-hld.md`
  - `poms-design-progress.md`
  - `design-review-follow-up-summary.md`
- 同级设计:
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `business-authorization-matrix.md`

---

## 1. 文档目标

本文档用于在正式进入接口冻结前，先明确第一阶段的接口切分边界：

- 哪些动作仍可走普通更新接口
- 哪些动作必须走命令型动作接口
- 哪些动作属于系统派生接口，不应暴露为普通人工写接口

本文档不是 OpenAPI 明细，也不是最终 DTO 设计稿；它的目标是先冻结“接口形态与动作边界”，避免在实现阶段再次把高敏感动作混回普通 PATCH / PUT。

---

## 2. 接口分类基线

第一阶段统一采用以下三类接口：

| 接口类型       | 用途                           | 是否面向人工调用 | 典型风险                         | 设计要求                               |
| -------------- | ------------------------------ | ---------------- | -------------------------------- | -------------------------------------- |
| 普通更新接口   | 草稿维护、说明补录、附件上传   | 是               | 把高敏动作误塞进普通保存         | 仅允许中低敏字段或草稿态字段           |
| 命令型动作接口 | 生效、冻结、关闭、审批、确认等 | 是               | 状态迁移与审批留痕被静默覆盖     | 必须具备前提校验、授权校验、独立留痕   |
| 系统派生接口   | 计算、快照生成、待办派发       | 否或仅受控后台   | 人工直接触发破坏可信源与替代链路 | 必须依赖上游事实前提，由系统或后台驱动 |

---

## 3. 第一阶段接口切分原则

1. 高敏感字段包不得通过普通更新接口直接进入生效状态。
2. 任何会改变业务主状态、审批状态、确认状态、有效快照、冻结版本、关闭结论的动作，都必须使用命令型动作接口。
3. 任何会生成替代链路、重算链路、快照链路的动作，优先归入命令型动作接口或系统派生接口。
4. 普通更新接口只承载“维护草稿”和“补充说明”，不承载“推进状态”。
5. 系统派生接口不作为前端普通按钮能力直接暴露，除非有受控后台操作入口。

---

## 4. 第一阶段最小命令集合

### 4.1 销售流程域

| 对象                         | 命令建议                    | 触发动作     | 前提摘要                              | 放行方式  | 结果摘要                          |
| ---------------------------- | --------------------------- | ------------ | ------------------------------------- | --------- | --------------------------------- |
| `ProjectAssessment`          | `submitProjectAssessment`   | 提交立项评估 | 已创建 `Project`，处于 `assessment`   | 审批      | 创建 / 推进审批实例，锁定提交版本 |
| `ScopeConfirmation`          | `confirmProjectScope`       | 确认范围     | 立项已通过，处于 `scope-confirmation` | 确认      | 固化范围确认版本                  |
| `QuotationReview`            | `submitQuotationReview`     | 提交报价评审 | 范围已确认，处于 `commercial-closure` | 审批      | 形成报价评审提交批次              |
| `BidProcess`                 | `submitBidDecision`         | 提交投标决策 | 已创建当前有效 `BidProcess`           | 审批      | 进入投标决策审批链                |
| `BidProcess`                 | `recordBidResult`           | 登记投标结果 | 已递交或澄清完成                      | 审批/确认 | 固化投标结果，决定能否进入签约    |
| `ExecutiveEscalationRequest` | `submitExecutiveEscalation` | 发起高层介入 | 满足重大例外或战略项目条件            | 审批      | 创建高层介入审批链                |
| `Project`                    | `submitProjectContracting`  | 提交签约登记 | 商务收口完成；若招投标则已中标        | 审批/确认 | 进入签约登记放行链                |
| `Project`                    | `closeProjectAsLost`        | 关闭丢单     | 处于签约前阶段且存在失单事实          | 审批      | 形成 `closed-lost`                |
| `Project`                    | `terminateProject`          | 终止关闭     | 已进入执行或验收后发生重大终止        | 审批      | 形成 `closed-terminated`          |
| `ProjectHandover`            | `confirmProjectHandover`    | 完成移交确认 | 已形成合同台账，确认人集合齐备        | 多方确认  | 固化移交完成事实并允许进入执行态  |
| `AcceptanceRecord`           | `confirmAcceptance`         | 确认验收     | 已形成可验收成果                      | 确认      | 固化验收结论                      |

### 4.2 合同资金域

| 对象                | 命令建议                    | 触发动作      | 前提摘要                          | 放行方式  | 结果摘要                                  |
| ------------------- | --------------------------- | ------------- | --------------------------------- | --------- | ----------------------------------------- |
| `Contract`          | `submitContractReview`      | 提交审核      | 合同草稿已完成关键条款            | 审批      | 进入合同审核链                            |
| `Contract`          | `activateContract`          | 生效          | 审核通过，满足财务 / 商务放行条件 | 审批/确认 | 形成当前有效合同与 `ContractTermSnapshot` |
| `ContractAmendment` | `submitContractAmendment`   | 发起变更      | 已存在生效合同                    | 审批      | 形成合同变更审批链                        |
| `ContractAmendment` | `activateContractAmendment` | 生效新快照    | 合同变更已获批准                  | 审批      | 替代原有效快照                            |
| `ReceivablePlan`    | `activateReceivablePlan`    | 初始化 / 生效 | 已存在当前有效合同条款快照        | 确认      | 固化正式应收计划版本                      |
| `ReceiptRecord`     | `confirmReceiptRecord`      | 财务确认      | 已登记到账记录                    | 确认      | 进入生效回款口径                          |
| `ReceiptRecord`     | `reverseReceiptRecord`      | 冲销 / 作废   | 原记录存在且允许撤回              | 审批/确认 | 形成冲销链路，不删除原记录                |
| `PaymentRecord`     | `confirmPaymentRecord`      | 确认生效      | 已登记付款记录                    | 确认      | 进入生效成本口径                          |
| `PaymentRecord`     | `voidPaymentRecord`         | 作废          | 原付款记录允许撤销                | 确认      | 形成作废留痕                              |
| `InvoiceRecord`     | `markInvoiceException`      | 标记异常      | 发票记录存在且出现异常            | 审批/确认 | 形成异常留痕                              |
| `InvoiceRecord`     | `resolveInvoiceException`   | 解除异常      | 异常已处理                        | 审批/确认 | 形成解除留痕                              |
| `InvoiceRecord`     | `closeInvoiceRecord`        | 关闭          | 发票流程完成或异常处理完结        | 确认      | 形成关闭结论                              |

### 4.3 提成治理域

| 对象                       | 命令建议                         | 触发动作        | 前提摘要                                   | 放行方式  | 结果摘要                   |
| -------------------------- | -------------------------------- | --------------- | ------------------------------------------ | --------- | -------------------------- |
| `CommissionRoleAssignment` | `freezeCommissionRoleAssignment` | 提交冻结        | 项目移交已完成，当前版本未冻结             | 审批/确认 | 固化角色冻结版本           |
| `CommissionRoleAssignment` | `submitCommissionRoleChange`     | 发起变更        | 已存在冻结版本                             | 审批      | 进入角色变更审批链         |
| `CommissionCalculation`    | `approveCommissionCalculation`   | 复核生效        | 已完成计算，待复核                         | 复核/审批 | 形成有效计算结果           |
| `CommissionCalculation`    | `recalculateCommission`          | 触发重算        | 合同、回款、成本或异常事实导致需替代旧结果 | 复核/审批 | 形成新的重算链路与替代关系 |
| `CommissionPayout`         | `submitCommissionPayoutApproval` | 提交审批 / 批准 | 已形成有效发放草稿                         | 审批      | 固化当前阶段发放批准结果   |
| `CommissionPayout`         | `registerCommissionPayout`       | 登记发放        | 发放审批已通过                             | 无        | 形成业务发放记录           |
| `CommissionPayout`         | `suspendCommissionPayout`        | 暂停            | 已批准或已发放且出现异常                   | 审批      | 暂停发放链路               |
| `CommissionPayout`         | `reverseCommissionPayout`        | 冲销            | 已发放记录需撤回                           | 审批      | 形成冲销 / 扣回留痕        |
| `CommissionAdjustment`     | `submitCommissionAdjustment`     | 发起调整        | 已识别退款、坏账、违规等异常               | 无        | 形成调整草稿               |
| `CommissionAdjustment`     | `executeCommissionAdjustment`    | 提交审批 / 执行 | 调整草稿已完整并获批准                     | 审批      | 执行补发、扣回、冲销或重算 |
| `CommissionRuleVersion`    | `activateCommissionRuleVersion`  | 提交生效 / 启用 | 规则草稿已完成                             | 审批      | 启用新规则版本             |

### 4.4 横切审批域

| 对象                 | 命令建议                  | 触发动作    | 前提摘要                     | 放行方式 | 结果摘要                   |
| -------------------- | ------------------------- | ----------- | ---------------------------- | -------- | -------------------------- |
| `ApprovalRecord`     | `approveRecord`           | 审批通过    | 当前处理人拥有审批权         | 审批     | 推进业务对象动作           |
| `ApprovalRecord`     | `rejectApprovalRecord`    | 驳回        | 当前处理人拥有审批权         | 审批     | 驱动业务对象回退或关闭     |
| `ApprovalRecord`     | `closeApprovalRecord`     | 取消 / 关闭 | 审批终止或业务对象关闭       | 无       | 关闭审批实例与相关待办     |
| `ApprovalRecord`     | `reassignApprovalRecord`  | 转派        | 当前处理人允许转派           | 无       | 变更处理人并留痕           |
| `ConfirmationRecord` | `confirmRecord`           | 完成确认    | 当前确认人收到待办           | 确认     | 推进确认计数与业务对象状态 |
| `ConfirmationRecord` | `closeConfirmationRecord` | 关闭 / 取消 | 确认不再有效或业务对象已终止 | 无       | 关闭确认实例               |

---

## 5. 保留为普通更新接口的最小范围

第一阶段建议仅保留以下普通更新接口能力：

| 对象                       | 允许保留的普通更新能力     | 约束摘要                               |
| -------------------------- | -------------------------- | -------------------------------------- |
| `Project`                  | 基础信息编辑、备注补录     | 不得改写阶段推进、成交路径、关闭结论   |
| `BidProcess`               | 上传附件、补充澄清说明     | 不得直接写入决策结论、投标结果         |
| `Contract`                 | 草稿字段维护               | 仅限草稿态，不得直接生效高敏字段包     |
| `ReceiptRecord`            | 登记态补录说明、附件补充   | 不得直接完成财务确认或冲销             |
| `PaymentRecord`            | 登记态补录                 | 不得直接进入生效成本口径               |
| `InvoiceRecord`            | 非异常状态下的普通台账维护 | 异常、解除异常、关闭必须走命令接口     |
| `CommissionRoleAssignment` | 草稿态角色分配维护         | 冻结后不得普通编辑                     |
| `CommissionPayout`         | 草稿态说明补充             | 批准、暂停、冲销、登记发放不得普通编辑 |
| `CommissionAdjustment`     | 草稿态原因补录             | 执行结论不得普通编辑                   |

---

## 6. 归入系统派生接口的动作

以下动作不建议作为普通前台命令直接暴露：

| 对象                    | 派生动作     | 触发来源                         | 说明                   |
| ----------------------- | ------------ | -------------------------------- | ---------------------- |
| `ContractTermSnapshot`  | 生成有效快照 | 合同生效 / 合同变更生效          | 由命令型动作内部派生   |
| `CommissionCalculation` | 生成计算草稿 | 冻结版本与生效输入就绪           | 可由受控后台或系统触发 |
| `TodoItem`              | 生成待办     | 审批 / 确认实例推进              | 不建议人工直接创建     |
| `NotificationRecord`    | 派发通知     | 审批、确认、关闭、异常等状态变化 | 不建议人工直接创建     |
| 关联审计记录            | 写入审计链   | 所有命令型动作执行               | 作为命令执行副作用     |

---

## 7. 进入 OpenAPI 与 DTO 设计前的检查点

在把本文档进一步下钻为 OpenAPI 或 DTO 之前，建议先确认：

1. 每个高敏感动作是否都已映射到唯一命令，而不是仍存在“保存并生效”类混合接口。
2. 每个命令是否都有明确的前提、放行方式、对象状态约束和审计责任。
3. 命令结果是否只返回当前动作关心的事实，不把审批实例状态和业务对象状态重新混成一个字段集合。
4. 普通更新接口的允许字段范围是否已经与字段包基线一致。

---

## 8. 当前不在本文档中冻结的内容

当前不在本文档中写死以下内容：

- 命令请求体和响应体的最终字段清单
- 统一错误码与异常字典
- 审批流内部节点编排与多人顺序审批细节
- 页面按钮、路由和 OpenAPI path 的最终命名
- 后续二期可能引入的外部财务系统对接命令

这些内容应在接口冻结阶段继续收敛，而不是在当前过早写死。

---

## 9. 当前结论

第一阶段已经具备冻结“接口形态边界”的条件。当前最稳妥的做法是先把高敏感对象动作固定到命令型接口，把草稿维护限制在普通更新接口，把快照、计算、待办和通知限制在系统派生接口，然后再进入 OpenAPI 与 DTO 级别的详细接口设计。
