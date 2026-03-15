# POMS 设计收口与评审前一致性清单

**文档状态**: Active
**最后更新**: 2026-03-16
**适用范围**: `POMS` 第一阶段跨文档一致性检查、评审前收口与状态建议
**关联文档**:

- 上游设计:
  - `poms-design-progress.md`
  - `poms-requirements-spec.md`
  - `poms-hld.md`
- 同级设计:
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `business-authorization-matrix.md`
  - `platform-governance/platform-governance-review-summary.md`

---

## 1. 文档目标

本文档用于在进入下一轮设计评审前，统一收口 `POMS` 当前已经产出的跨模块设计文档，识别明显的跨文档不一致、术语漂移、成熟度表述漂移和下一步建议漂移，并给出可执行的收口检查项。

本文档不替代需求说明、HLD 或各模块详细设计，而是作为本轮设计治理的评审前清单与问题归并入口。

---

## 2. 当前判断

截至 2026-03-16，`POMS` 当前的主要风险已经不是“关键设计文档缺失”，而是：

- 多份详细设计文档已形成 `Draft (Baseline)`，但进度板和索引文本未完全同步
- 个别文档仍沿用“边界基线”或“尚未开始”的旧口径
- “审批”与“确认”的表达已经在设计上分层，但在矩阵列名与局部描述上仍有混用
- 规则对象命名在跨文档间还存在抽象名与领域名并存的情况

因此，下一步应先做一致性收口，再组织评审，而不是继续新增大块设计内容。

---

## 3. 已识别的跨文档不一致

| 编号 | 严重度 | 涉及文档                                                                      | 问题描述                                                                                      | 建议动作                                                       |
| ---- | ------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| C1   | 已关闭 | `poms-design-progress.md`                                                     | 进度板已切换为跨文档收口阶段，并已同步核心设计资产与下一步治理动作                            | 后续继续把已关闭收口项同步回进度板                             |
| C2   | 已关闭 | `README.md`、`business-authorization-matrix.md`                               | 矩阵成熟度表述已统一到“首版基线 / 首批稳定对象动作矩阵基线”                                   | 后续新增索引或摘要文档时保持同一表述                           |
| C3   | 已关闭 | `workflow-and-approval-design.md`、`business-authorization-matrix.md`         | 审批与确认的矩阵表达已统一收敛为 `放行方式`，并支持 `审批`、`确认`、`复核`、`多方确认` 等口径 | 后续新增矩阵时继续复用同一列口径                               |
| C4   | 已关闭 | `poms-requirements-spec.md`、`poms-hld.md`、`commission-settlement-design.md` | 上游文档中的规则对象命名已统一到 `CommissionRuleVersion`                                      | 后续若引入跨域通用规则对象，再通过新 ADR 单独提升抽象层级      |
| C5   | 已关闭 | 各详细设计文档                                                                | 本轮修订涉及的详细设计文档已同步更新时间，可区分是否已纳入本轮一致性收口                      | 后续新增收口修改时继续同步更新时间                             |
| C6   | 已关闭 | `platform-governance/platform-governance-review-summary.md`                   | 已补充历史摘要阅读提示，避免将评审当时的矩阵状态与下一步建议误读为当前状态源                  | 后续新增评审摘要时沿用相同提示口径                             |

---

## 4. 待收口事项

### 4.1 第一优先级

- 基于当前收口结果执行正式评审
- 在评审结论中确认是否还有遗漏的字段级权限、命令型动作或状态迁移歧义

### 4.2 第二优先级

- 将评审结论回写到 `poms-design-progress.md` 与相关详细设计文档
- 在评审结论稳定后进入接口命令与数据模型冻结准备

---

## 5. 评审前检查清单

### 5.1 状态与治理

- [x] `poms-design-progress.md` 的“当前阶段判断”与实际文档成熟度一致
- [x] `poms-design-progress.md` 的“未完成输出物”不再保留已完成或已创建的项目
- [x] `poms-design-progress.md` 的“下一步建议”与当前收口重点一致
- [x] `README.md` 中各文档描述与实际成熟度一致

### 5.2 术语与对象命名

- [x] `Project`、`BidProcess`、`Contract`、`CommissionPayout` 等关键对象在跨文档中命名一致
- [x] 规则对象命名在需求、HLD 与提成治理域设计之间保持一致
- [x] “审批”“确认”“复核”“关闭”在跨文档中的语义边界一致

### 5.3 状态机与动作矩阵

- [x] 项目生命周期关键闸口与业务授权矩阵中的对象动作一一对应
- [x] 合同生效、回款确认、付款确认、发票异常处理在域设计与授权矩阵中的动作定义一致
- [x] 提成冻结、计算生效、发放审批、异常调整在域设计与授权矩阵中的动作定义一致
- [x] 审批流公共对象动作与各业务对象触发点可以一一映射

### 5.4 评审可读性

- [x] 读者能够明确区分“当前状态源文档”和“历史评审摘要文档”
- [x] 各文档中的“当前阶段定位”与“下一步建议”不会互相冲突
- [x] 评审清单不再引用已经过期的阶段判断或成熟度表述

---

## 6. 状态建议

当前建议采用以下状态口径：

- `poms-requirements-spec.md`: 保持 `Accepted (Phase 1 Baseline)`
- `poms-hld.md`: 保持 `Accepted (Phase 1 Baseline)`
- 平台治理域总设计与四个子设计：保持 `Review`
- `project-lifecycle-design.md`: 保持 `Draft (Baseline)`
- `contract-finance-design.md`: 保持 `Draft (Baseline)`
- `commission-settlement-design.md`: 保持 `Draft (Baseline)`
- `workflow-and-approval-design.md`: 保持 `Draft (Baseline)`
- `business-authorization-matrix.md`: 保持 `Draft (Baseline)`
- 本文档：`Active`

不建议当前立即把销售流程域、合同资金域、提成治理域、横切支撑域整体提升到 `Review`。原因不是内容缺失，而是跨文档一致性仍需完成最后一轮收口。

---

## 7. 下一步执行顺序建议

1. 基于 `design-review-execution-checklist.md` 组织正式评审
2. 将评审发现回写到 `poms-design-progress.md` 与相关详细设计文档
3. 在评审结论稳定后进入接口命令与数据模型冻结准备

---

## 8. 当前结论

当前阶段的正确动作不是继续扩写新专题，而是把已有设计资产的表述、状态和动作语义收口到同一口径上。只要本清单中的高优先级项关闭，后续销售流程域、合同资金域、提成治理域和横切审批域就具备一起进入下一轮评审的条件。
