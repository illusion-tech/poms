# POMS 提成结算设计

**文档状态**: Draft (Baseline)
**最后更新**: 2026-03-16
**适用范围**: `POMS` 第一阶段提成治理域中的角色分配、计算、发放、异常调整与重算
**关联文档**:

- 上游设计:
  - `poms-requirements-spec.md`
  - `poms-hld.md`
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
- 同级设计:
  - `business-authorization-matrix.md`
  - `workflow-and-approval-design.md`
- 相关 ADR:
  - `../adr/005-approval-flow-implementation-strategy.md`
  - `../adr/007-phase1-finance-integration-and-recording-boundary.md`

---

## 1. 文档目标

本文档用于在需求说明、HLD、项目生命周期设计和合同资金域设计的基础上，正式收敛提成治理域的对象边界、计算口径、发放阶段规则、异常处理和重算链路，作为后续审批流、接口设计和实现收敛的上游输入。

本文档重点回答：

- 第一阶段提成治理域包含哪些核心对象与职责
- 提成计算依赖哪些合同、回款、成本和规则事实
- 提成角色分配如何冻结、变更与版本化
- 提成发放如何分阶段放行，以及第一阶段发放到什么边界为止
- 退款、坏账、违规、离职、合同变更等异常如何影响提成重算与冲销

---

## 2. 当前阶段定位

当前文档处于：

**“提成治理域第一份详细设计基线，先固定提成计算、分阶段发放、异常调整和重算替代链路，再为审批流与授权矩阵提供稳定输入。”**

这意味着：

- 本文档第一阶段聚焦业务提成闭环，而不是工资系统或真实付款系统设计
- 本文档优先收敛生效数据来源、规则版本、发放上限和异常处理
- 本文档不在第一阶段承诺对接真实财务付款、薪资系统或银行流水

---

## 3. 上游约束

本设计继承以下已固定结论：

- `Project` 在移交完成前不视为正式进入执行态
- 提成角色冻结版本必须与项目移交完成保持一致
- 提成计算使用最终贡献毛利口径，而非报价评审批量口径
- 提成治理域不直接维护合同、回款、成本和发票事实，而是消费合同资金域的生效数据
- `CommissionPayout` 第一阶段是业务发放记录对象，不与真实财务付款动作强联动
- 第一阶段审批采用模块内审批流 + 统一待办聚合
- 低首付款、质保金、异常处理和违规处理是第一阶段必须覆盖的业务分支

---

## 4. 设计原则

- **结算口径晚于经营口径**: 提成计算必须基于已生效合同、已确认回款和已纳入口径成本，而不是草稿或待确认数据
- **冻结优于覆盖**: 角色分配、计算结果和发放记录一旦生效，后续变化通过新版本、调整单和替代关系处理
- **分阶段发放显式化**: 启动条件、阶段上限、档位选择和质保金保留都必须显式可审计
- **异常通过调整对象表达**: 退款、坏账、违规、离职、合同变更等异常不得直接改原发放记录，而应通过调整和重算链处理
- **计算与审批分层**: 系统负责计算和阻断，管理层负责审批裁量、档位选择和例外放行
- **业务发放与财务付款分层**: 第一阶段的“发放”指业务发放记录，不等价于真实付款动作

---

## 5. 域边界与对象清单

### 5.1 第一阶段包含的核心对象

- `CommissionRoleAssignment`
- `CommissionCalculation`
- `CommissionPayout`
- `CommissionAdjustment`
- `CommissionRuleVersion`

### 5.2 第一阶段不在本域内强行扩展的内容

- 真实财务付款联动
- 工资条、薪酬系统或银行代发集成
- 跨公司、多账套提成清结算
- 完整税前税后薪酬处理

### 5.3 对象职责口径

#### `CommissionRoleAssignment`

- 承载项目提成参与角色、分配比例、责任说明和冻结版本
- 在项目移交前可编辑，在冻结后只能通过受控变更生成新版本

#### `CommissionCalculation`

- 承载某一时点基于有效规则版本和生效数据生成的提成计算结果
- 记录贡献毛利、提成池、角色分配结果、阶段可发上限和替代关系

#### `CommissionPayout`

- 承载业务提成发放记录
- 表达“应发、审批、登记发放、暂停、冲销、关闭”等业务语义
- 第一阶段不是财务付款对象

#### `CommissionAdjustment`

- 承载退款、坏账、违规、扣回、差额补发、异常修正等后续影响
- 是触发冲销和重算的重要业务对象

#### `CommissionRuleVersion`

- 承载提成率分档、阶段发放上限、低首付款规则、质保金规则和异常规则版本
- 为计算、审批和审计回溯提供统一规则来源

---

## 6. 关键依赖与输入

### 6.1 来自销售流程域的输入

- `Project.stage`
- `Project.status`
- `ProjectHandover` 是否完成
- `AcceptanceRecord` 是否有效
- 是否存在重大风险或流程违规结论

### 6.2 来自合同资金域的输入

- 当前有效 `ContractTermSnapshot`
- 已确认 `ReceiptRecord`
- 已纳入口径的 `PayableRecord` / `PaymentRecord`
- 合同变更、回款冲销和成本变化等重算触发事实

### 6.3 来自规则治理的输入

- 当前有效 `CommissionRuleVersion`
- 毛利率分档
- 各阶段发放上限
- 低首付款与质保金规则
- 违规、离职和异常处理规则

---

## 7. 提成治理主流程

### 7.1 第一阶段主流程

1. 录入提成角色分配
2. 在项目移交节点冻结角色版本
3. 基于生效合同、回款和成本触发提成计算
4. 形成 `CommissionCalculation` 并复核生效
5. 满足阶段条件后发起 `CommissionPayout`
6. 审批决定发放档位或是否放行
7. 登记业务发放记录
8. 发生异常时生成 `CommissionAdjustment`
9. 必要时触发重算并形成新计算版本替代旧版本

### 7.2 主流程关系图

```mermaid
flowchart LR
  roleAssign[角色分配]
  roleFreeze[角色冻结]
  calc[提成计算]
  calcEffective[计算生效]
  payout[提成发放]
  adjustment[异常调整]
  recalc[重算替代]

  roleAssign --> roleFreeze
  roleFreeze --> calc
  calc --> calcEffective
  calcEffective --> payout
  payout --> adjustment
  adjustment --> recalc
  recalc --> calcEffective
```

---

## 8. 生命周期与状态机

### 8.1 `CommissionRoleAssignment`

- 状态：草稿、待冻结、已冻结、变更中、已替代、已作废
- 关键动作：录入、编辑、提交冻结、确认冻结、发起变更、审批变更、作废
- 回退规则：已冻结版本不得直接改写，变更必须形成新版本并标记替代关系

### 8.2 `CommissionCalculation`

- 状态：待计算、已计算、待复核、已生效、已冻结、已重算替代、已作废
- 关键动作：触发计算、复核、生效、冻结、触发重算、作废
- 回退规则：已生效结果不得直接覆盖；重算必须生成新版本并记录替代原因

### 8.3 `CommissionPayout`

- 状态：草稿、待审批、已批准、已发放、已暂停、已冲销、已关闭
- 关键动作：发起、提交审批、批准、登记发放、暂停、冲销、关闭
- 回退规则：已发放记录不可直接删除，异常时通过暂停、冲销和补发处理

### 8.4 `CommissionAdjustment`

- 状态：草稿、待审批、已批准、已执行、已驳回、已关闭
- 关键动作：发起、提交审批、批准、执行、驳回、关闭
- 回退规则：已执行调整不得直接删除，应通过后续补充调整对冲

### 8.5 `CommissionRuleVersion`

- 状态：草稿、待生效、已生效、已停用
- 关键动作：创建、提交生效、启用、停用
- 回退规则：已生效规则不得静默改写，应通过新版本替代

---

## 9. 计算口径

### 9.1 两套毛利口径严格分离

#### 报价审批毛利口径

- 计算对象：预计毛利、预计毛利率
- 用途：报价评审与审批放行
- 数据来源：报价草案、预计成本、付款条款、税率
- 不直接进入提成结算

#### 提成结算毛利口径

- 计算对象：最终贡献毛利、最终贡献毛利率
- 用途：提成池计算、提成率分档、重算与冲销
- 数据来源：已确认回款、已纳入口径成本、有效规则版本

### 9.2 提成池公式

- 项目贡献毛利 = 项目实际回款（不含税） - 项目直接成本（不含税）
- 项目提成池 = 项目贡献毛利 × 提成率
- 若项目亏损或贡献毛利率低于制度最低线，则提成池为 0

### 9.3 提成率分档基线

第一阶段默认支持以下可配置分档：

| 贡献毛利率  | 提成率 |
| ----------- | ------ |
| `< 20%`     | `0%`   |
| `20% - 30%` | `8%`   |
| `30% - 40%` | `10%`  |
| `40% - 50%` | `12%`  |
| `>= 50%`    | `15%`  |

---

## 10. 发放阶段规则

### 10.1 启动条件

项目须同时满足以下条件，方可启动提成发放：

- 已完成合同签署并进入实施阶段
- 累计实际回款达到合同不含税金额的 20% 及以上
- 已完成内部项目移交
- 不存在重大风险项目结论
- 不存在未解决的重大流程违规或经营争议

### 10.2 标准首付款项目

若合同首付款比例大于等于 20%，第一阶段支持以下累计可发放上限：

- 基础档：20%
- 中档：25%
- 上限档：30%

其中：

- 系统负责校验启动条件并计算各档位上限金额
- 审批负责选择具体发放档位

### 10.3 低首付款项目

若合同首付款比例低于 20%，第一阶段支持以下规则：

- 默认第一阶段累计发放比例不超过 10%
- 经管理层批准可提高至不超过 15%
- 在低首付款约束未解除前，不得适用标准首付款项目档位

### 10.4 50% 解锁规则

- 低首付款项目在累计实际回款达到合同不含税金额 50% 前，持续适用低首付款规则
- 达到 50% 且项目推进正常、回款节奏稳定后，可发起低首付款约束解除申请
- 解锁后后续阶段按标准首付款项目规则执行

### 10.5 第二阶段规则

项目达到合同约定验收节点或阶段性成果，且累计实际回款达到合同不含税金额 80% 及以上时：

- 基础档：累计可发放至应得提成总额的 70%
- 中档：累计可发放至 75%
- 上限档：累计可发放至 80%

系统要求：

- 必须存在有效 `AcceptanceRecord`
- 系统计算可发放上限，审批确定采用哪一档

### 10.6 最终发放与质保金

- 项目非质保部分回款达到合同不含税金额 100%，或合同约定全部履行完成后，可发放除质保金对应比例外的剩余提成
- 存在质保金的项目，质保金对应提成需单独保留待结算状态
- 质保金对应提成的发放前提至少包括：质保期届满、无未解决重大异议、质保金实际到账

---

## 11. 异常处理与重算

### 11.1 触发重算的典型事件

- 合同变更
- 回款确认或回款冲销
- 成本变化
- 违规处理结论生效
- 退款、坏账、客户拒付
- 离职责任结论生效

### 11.2 异常处理原则

- 已发提成不得通过直接改原记录处理异常
- 所有异常应通过 `CommissionAdjustment` 进入冲销、扣回、补发或暂停链路
- 重算必须生成新的 `CommissionCalculation` 版本，并标记替代关系

### 11.3 典型异常场景

#### 退款 / 坏账 / 回款冲减

- 可暂停后续发放
- 已发部分按规则进入扣回、冲销或差额重算

#### 离职

- 在职期间已发部分原则上不追回
- 离职前已满足条件但尚未发放的部分，可按既得权益处理
- 未达条件部分不自动发放

#### 违规处理

- 支持暂停、降低、取消三类处理结果
- 违规处理结果不得直接改原发放记录，必须留痕并驱动后续调整

---

## 12. 建议关键字段

### 12.1 `CommissionRoleAssignment`

- `id`
- `projectId`
- `version`
- `roleType`
- `userId`
- `weight`
- `status`
- `frozenAt`

### 12.2 `CommissionCalculation`

- `id`
- `projectId`
- `ruleVersionId`
- `sourceSnapshotId`
- `recognizedRevenueTaxExclusive`
- `recognizedCostTaxExclusive`
- `contributionGrossMargin`
- `contributionGrossMarginRate`
- `commissionPool`
- `status`
- `replacesCalculationId`

### 12.3 `CommissionPayout`

- `id`
- `projectId`
- `calculationId`
- `stageType`
- `selectedTier`
- `theoreticalCapAmount`
- `approvedAmount`
- `paidRecordAmount`
- `status`
- `approvedAt`

### 12.4 `CommissionAdjustment`

- `id`
- `projectId`
- `adjustmentType`
- `relatedPayoutId`
- `relatedCalculationId`
- `amount`
- `reason`
- `status`
- `executedAt`

### 12.5 `CommissionRuleVersion`

- `id`
- `version`
- `effectiveFrom`
- `tierDefinition`
- `firstStageCapRule`
- `secondStageCapRule`
- `retentionRule`
- `lowDownPaymentRule`
- `exceptionRule`
- `status`

### 12.6 与授权矩阵对齐的字段包建议

为与 `business-authorization-matrix.md` 保持一致，提成治理域第一阶段建议固定以下字段包：

- `CommissionRoleAssignment` 角色分配包：`roleType`、`userId`、`weight`
- `CommissionRoleAssignment` 冻结信息包：`status`、`version`、`frozenAt`
- `CommissionCalculation` 计算输入包：`ruleVersionId`、`sourceSnapshotId`、`recognizedRevenueTaxExclusive`、`recognizedCostTaxExclusive`
- `CommissionCalculation` 计算结果包：`contributionGrossMargin`、`contributionGrossMarginRate`、`commissionPool`、`status`
- `CommissionPayout` 发放审批包：`stageType`、`selectedTier`、`theoreticalCapAmount`、`approvedAmount`
- `CommissionPayout` 发放登记包：`paidRecordAmount`、发放登记时间、`status`
- `CommissionAdjustment` 调整执行包：`adjustmentType`、`amount`、`reason`、`status`、`executedAt`
- `CommissionRuleVersion` 规则定义包：`tierDefinition`、`firstStageCapRule`、`secondStageCapRule`、`retentionRule`、`lowDownPaymentRule`、`exceptionRule`

说明：

- 除普通说明性字段外，上述字段包原则上都属于高敏字段包。
- 冻结、复核生效、审批放行、暂停 / 冲销、执行调整、启用规则版本等动作不得通过普通更新接口改写字段包内容。

---

## 13. 对业务授权矩阵的输出

本文档至少输出以下第一批稳定对象动作：

- 录入提成角色分配
- 冻结提成角色版本
- 发起提成角色变更
- 触发提成计算
- 复核并生效提成计算
- 发起提成发放审批
- 批准提成发放
- 登记提成发放
- 暂停 / 冲销提成发放
- 发起异常调整
- 批准并执行提成调整

补充对齐口径：

- `CommissionRoleAssignment` 冻结：放行方式 = `审批/确认`
- `CommissionCalculation` 生效与重算：放行方式 = `复核/审批`
- `CommissionPayout` 批准：放行方式 = `审批`
- `CommissionPayout` 登记发放：放行方式 = `无`
- `CommissionPayout` 暂停 / 冲销：放行方式 = `审批`
- `CommissionAdjustment` 执行：放行方式 = `审批`
- `CommissionRuleVersion` 生效：放行方式 = `审批`

### 13.1 与矩阵口径对齐的补充约束

- 提成参与角色、分配比例、批准金额、暂停 / 冲销结论属于 `高` 敏感字段，不得由普通编辑直接覆盖
- 提成计算、发放、调整统一受财务归口组织约束，并结合项目归属组织判断业务归属
- 关闭、暂停、冲销、重算等动作必须按独立对象动作处理，不得被归并为普通状态编辑
- 普通更新接口仅允许草稿态说明字段维护，高敏字段包必须经命令型动作或系统派生链路进入有效状态

---

## 14. 测试与验收要点

第一阶段至少覆盖以下场景：

- 项目未移交完成不得冻结最终提成角色版本
- 未满足启动条件不得发起提成发放审批
- 低首付款项目不得越过低首付款上限规则
- 达到 50% 解锁条件前不得切换到标准首付款项目规则
- 验收未确认不得进入第二阶段上限口径
- 已确认回款冲销后应能触发重算候选
- 违规、退款、坏账等异常能生成调整记录并保留审计链
- 已发放记录不可直接删除，只能暂停、冲销或补发

---

## 15. 当前仍待后续细化的问题

- 第一阶段是否需要把提成参与角色标准字典单独沉淀为可治理对象
- `CommissionPayout` 的“已发放”是否需要进一步拆分为“已登记业务发放”和“已财务支付”两层状态
- 多合同项目下提成池是按项目整体核算还是按合同分摊核算后再汇总
- 质保金对应提成是否需要支持多次分批释放
- 解锁申请是否应作为独立对象，还是先内嵌在 `CommissionPayout` 审批中表达

---

## 16. 当前结论

本首版文档已经足以作为提成治理域详细设计基线。当前最重要的动作不是继续扩写提成专题，而是完成与合同资金域、审批流、业务授权矩阵之间的最后一轮收口并进入正式评审，确保“合同资金生效事实 -> 提成计算 -> 分阶段发放 -> 异常调整 / 重算”这条链路以当前口径稳定闭环。
