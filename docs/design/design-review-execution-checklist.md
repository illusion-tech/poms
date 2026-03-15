# POMS 详细设计评审执行清单

**文档状态**: Active
**最后更新**: 2026-03-16
**适用范围**: `POMS` 第一阶段跨模块详细设计评审执行
**关联文档**:

- 上游设计:
  - `design-convergence-review-checklist.md`
  - `poms-design-progress.md`
  - `poms-requirements-spec.md`
  - `poms-hld.md`
- 同级设计:
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `business-authorization-matrix.md`

---

## 1. 文档目标

本文档用于在跨文档收口完成后，作为下一轮详细设计评审的直接执行清单。它关注的不是“还有哪些设计要补”，而是“当前这批文档是否已经达到可评审、可过会、可进入接口与实现前收敛”的标准。

---

## 2. 评审范围

本轮评审覆盖以下文档：

- `poms-requirements-spec.md`
- `poms-hld.md`
- `project-lifecycle-design.md`
- `contract-finance-design.md`
- `commission-settlement-design.md`
- `workflow-and-approval-design.md`
- `business-authorization-matrix.md`

说明：

- 平台治理域评审已形成独立评审资产，本轮不重复替代该域评审。
- `design-convergence-review-checklist.md` 是评审前收口清单；本文档是正式评审执行清单。

---

## 3. 评审前置条件

- [x] `design-convergence-review-checklist.md` 中高优先级项已全部关闭
- [x] 进度板、目录索引与实际文档状态一致
- [x] 审批 / 确认 / 复核 / 多方确认的表达已统一为 `放行方式` 口径
- [x] `CommissionRuleVersion` 命名已在需求、HLD 与提成治理域设计中统一
- [x] 本轮评审文档不存在明显相互矛盾的阶段、状态或对象边界定义

---

## 4. 逐文档评审清单

### 4.1 `poms-requirements-spec.md`

- [x] 第一阶段范围、最小闭环和非范围项表达清晰
- [x] 核心对象清单与后续详细设计对象命名一致
- [x] `Project` / `BidProcess` 分层口径与生命周期设计一致
- [x] 合同资金域、提成治理域、横切支撑域的范围边界无歧义

### 4.2 `poms-hld.md`

- [x] 领域划分与需求说明一致
- [x] 核心实体草图与详细设计对象一致
- [x] 数据可信源与版本化约束与域设计一致
- [x] 模块边界没有反向覆盖需求边界

### 4.3 `project-lifecycle-design.md`

- [x] 主阶段链路完整且无冲突
- [x] `BidProcess`、`QuotationReview`、`ExecutiveEscalationRequest` 的附属流程定位清晰
- [x] 关键闸口、阻断条件与动作矩阵一致
- [x] 关闭语义 `closed-lost` / `closed-terminated` 明确且可审计

### 4.4 `contract-finance-design.md`

- [x] 合同、回款、成本、发票对象边界清晰
- [x] 生效口径、可信源与阻断规则清晰
- [x] 审核、生效、确认、冲销、关闭动作与授权矩阵一致
- [x] 对提成治理域的输出稳定且可追溯

### 4.5 `commission-settlement-design.md`

- [x] 角色冻结、计算、生效、发放、异常调整与重算链路完整
- [x] 提成计算口径与合同资金域输入一致
- [x] 发放阶段规则、低首付款规则、质保金规则无歧义
- [x] 审批与授权动作口径与矩阵一致

### 4.6 `workflow-and-approval-design.md`

- [x] 模块内审批流 + 统一待办聚合策略表达稳定
- [x] 公共对象 `ApprovalRecord` / `ConfirmationRecord` / `TodoItem` / `NotificationRecord` 职责清晰
- [x] `放行方式` 口径与业务矩阵一致
- [x] 风控闸口与业务对象状态迁移关系清晰

### 4.7 `business-authorization-matrix.md`

- [x] 平台权限与业务对象动作授权边界清晰
- [x] 首批稳定对象动作已覆盖销售、合同资金、提成与横切审批域
- [x] 字段敏感度、组织范围、关闭 / 作废 / 冲销动作已形成首版基线
- [x] 后续待细化项与已冻结项边界清楚，不假装完成字段级全量矩阵

---

## 5. 横向评审重点

- [x] `Project` 到 `Contract` 到 `CommissionPayout` 的主链路可被完整追踪
- [x] “审批”与“授权”未再次混用
- [x] “状态机”与“审批实例状态”未再次混用
- [x] 所有高敏感动作都有明确责任角色和留痕要求
- [x] 所有关闭、作废、冲销、重算类动作都不是普通编辑

---

## 6. 评审结论模板

本轮评审建议统一采用以下结论口径：

- `Passed`
- `Passed with follow-up`
- `Blocked`

如为 `Passed with follow-up`，后续项必须明确：

- 哪些是实现前必须补齐
- 哪些是下一轮详细设计继续细化
- 哪些只是文案层或索引层同步问题

---

## 7. 当前结论

本轮已完成第一轮正式评审执行，当前结论建议为 `Passed with follow-up`。

后续项建议限定为以下三类：

- 实现前需确认：字段级全量矩阵是否需要继续细化到页面 / DTO 级别，或保持当前字段包基线即可进入接口设计。
- 下一轮详细设计继续细化：少量复杂场景下的关闭、冲销、重算与多组织例外权限。
- 文案与治理同步：在后续进入接口与数据模型冻结时，继续保持进度板、索引和历史摘要提示同步。
