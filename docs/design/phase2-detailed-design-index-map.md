# POMS 第二阶段详细设计索引与主线地图

**文档状态**: Ready for Review
**最后更新**: 2026-03-30
**适用范围**: `POMS` 第二阶段 `LX-T01` 全局收口草案，聚焦详细设计索引、主线地图与当前基线完成状态
**关联文档**:

- 上游设计:
  - `phase2-experience-optimization-roadmap.md`
  - `phase2-lifecycle-experience-blueprint.md`
  - `phase2-user-task-map.md`
  - `phase2-experience-gap-priority-matrix.md`
- 同级设计:
  - `README.md`
  - `poms-design-progress.md`
- 相关 ADR:
  - `../adr/006-project-as-primary-domain-object.md`
  - `../adr/011-bid-process-under-project-lifecycle.md`

---

## 1. 文档目标

本文档用于把第二阶段已经形成的详细设计草案统一收成一个总入口。

它重点回答：

- 第二阶段当前到底形成了哪些主线
- 每条主线下有哪些核心工作区或规则文档
- 它们之间的承接关系是什么
- 当前哪些已经形成第一轮基线，哪些仍待后续收口

本文档不是替代各专题设计，而是为后续评审、实现排期和跨文档检索提供统一导航。

---

## 2. 第二阶段总览

截至当前，第二阶段已经形成五条主线：

1. `L1` 签约前统一工作区
2. `L2` 执行期成本归集主线
3. `L3` 签约与移交强节点
4. `L4` 项目经营核算视图
5. `L5` 提成制度化操作体验

当前判断：

- `L1 ~ L5` 均已形成第一轮基线
- 当前所有主线文档均已形成第一轮基线，真实状态应理解为 `Ready for Review`
- 当前下一步进入正式审阅与全局收口，而不是继续新增主线

---

## 3. 生命周期主线地图

建议把第二阶段主线统一理解为以下连续链路：

`签约前统一工作区 -> 执行期成本归集 -> 签约与移交强节点 -> 项目经营核算 -> 提成制度化操作体验`

如果按 `Project` 生命周期展开，可进一步表达为：

`立项与推进 -> 技术与成本 -> 招投标 / 报价评审 -> 签约就绪 -> 合同到移交 -> 移交与冻结 -> 实际成本归集 -> 经营核算 -> 提成阶段 / 异常 / 最终结算`

---

## 4. `L1` 签约前统一工作区索引

### 4.1 主线目标

把签约前碎片化任务收成一个连续工作区体系。

### 4.2 当前文档清单

- [phase2-presigning-workspace-information-architecture.md](/e:/projects/poms/docs/design/phase2-presigning-workspace-information-architecture.md)
- [phase2-presigning-initiation-advancement-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-initiation-advancement-workspace.md)
- [phase2-presigning-project-overview-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-project-overview-workspace.md)
- [phase2-presigning-technical-cost-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-technical-cost-workspace.md)
- [phase2-presigning-bid-commercial-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-bid-commercial-workspace.md)
- [phase2-presigning-pricing-margin-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-pricing-margin-workspace.md)
- [phase2-presigning-contract-readiness-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-contract-readiness-workspace.md)
- [phase2-presigning-workspace-handoff-map.md](/e:/projects/poms/docs/design/phase2-presigning-workspace-handoff-map.md)
- [phase2-presigning-workspace-templates.md](/e:/projects/poms/docs/design/phase2-presigning-workspace-templates.md)

### 4.3 当前状态

- 已完成第一轮基线
- 已完成六工作区、承接关系图与模板层三层收口

---

## 5. `L2` 执行期成本归集主线索引

### 5.1 主线目标

把执行期实际成本从零散事实点收成项目级持续归集和累计视图。

### 5.2 当前文档清单

- [phase2-execution-cost-workspace-information-architecture.md](/e:/projects/poms/docs/design/phase2-execution-cost-workspace-information-architecture.md)
- [phase2-project-actual-cost-records.md](/e:/projects/poms/docs/design/phase2-project-actual-cost-records.md)
- [phase2-cost-source-to-project-record-mapping.md](/e:/projects/poms/docs/design/phase2-cost-source-to-project-record-mapping.md)
- [phase2-actual-cost-accumulation-stage-view.md](/e:/projects/poms/docs/design/phase2-actual-cost-accumulation-stage-view.md)
- [phase2-estimated-to-actual-cost-bridge.md](/e:/projects/poms/docs/design/phase2-estimated-to-actual-cost-bridge.md)

### 5.3 当前状态

- 已完成第一轮基线
- 已形成成本对象、来源映射、累计视图与估算桥接四层口径

---

## 6. `L3` 签约与移交强节点索引

### 6.1 主线目标

把“签约不是结束，移交才算收口”的制度要求正式写进系统主链。

### 6.2 当前文档清单

- [phase2-contract-to-handover-workspace.md](/e:/projects/poms/docs/design/phase2-contract-to-handover-workspace.md)
- [phase2-project-handover-gate-workspace.md](/e:/projects/poms/docs/design/phase2-project-handover-gate-workspace.md)
- [phase2-commission-freeze-at-handover.md](/e:/projects/poms/docs/design/phase2-commission-freeze-at-handover.md)
- [phase2-handover-closure-rules.md](/e:/projects/poms/docs/design/phase2-handover-closure-rules.md)

### 6.3 当前状态

- 已完成第一轮基线
- 已形成合同承接、项目移交 gate、提成冻结绑定和收口规则

---

## 7. `L4` 项目经营核算视图索引

### 7.1 主线目标

把项目经营结果从“能看”推进到“能解释、能反哺后续判断”。

### 7.2 当前文档清单

- [phase2-project-business-outcome-overview.md](/e:/projects/poms/docs/design/phase2-project-business-outcome-overview.md)
- [phase2-project-unified-accounting-view-caliber.md](/e:/projects/poms/docs/design/phase2-project-unified-accounting-view-caliber.md)
- [phase2-project-variance-risk-explanation.md](/e:/projects/poms/docs/design/phase2-project-variance-risk-explanation.md)
- [phase2-business-accounting-feedback-rules.md](/e:/projects/poms/docs/design/phase2-business-accounting-feedback-rules.md)

### 7.3 当前状态

- 已完成第一轮基线
- 已形成总览、统一口径、偏差解释和反哺规则四层收口

---

## 8. `L5` 提成制度化操作体验索引

### 8.1 主线目标

把提成治理从后台对象和规则，收成用户真正可理解、可执行的连续操作链。

### 8.2 当前文档清单

- [phase2-commission-stage-gate-overview-workspace.md](/e:/projects/poms/docs/design/phase2-commission-stage-gate-overview-workspace.md)
- [phase2-commission-staged-payout-adjustment-paths.md](/e:/projects/poms/docs/design/phase2-commission-staged-payout-adjustment-paths.md)
- [phase2-commission-retention-final-settlement.md](/e:/projects/poms/docs/design/phase2-commission-retention-final-settlement.md)
- [phase2-commission-rule-explanation-language.md](/e:/projects/poms/docs/design/phase2-commission-rule-explanation-language.md)

### 8.3 当前状态

- 已完成第一轮基线
- 已形成阶段总览、发放与异常路径、最终结算 / 质保金收口、统一表达规则四层收口

---

## 9. 跨主线承接关系

当前跨主线承接建议统一理解为：

1. `L1` 输出签约前判断与事实基础
2. `L2` 输出执行期成本事实与累计结果
3. `L3` 输出合同到执行的正式收口与提成冻结版本
4. `L4` 输出统一经营事实、偏差解释与管理信号
5. `L5` 消费 `L3` 和 `L4`，形成提成操作链
6. `phase2-data-permission-and-sensitive-visibility-design.md` 横切约束上述所有读侧入口、敏感字段与提成可见性边界

换句话说：

- `L5` 不应绕过 `L4` 自己发明经营解释
- `L4` 不应绕过 `L2` 自己重算成本来源
- `L3` 是提成冻结和执行态准入的正式边界

---

## 10. 当前基线完成状态

截至当前，第二阶段已形成：

- `B1 ~ B30` 三十份正式基线产物
- `L1 ~ L5` 五条主线第一轮基线闭环

当前仍待全局收口的事项：

1. `LX-T01`：统一索引 / 主线地图
2. `LX-T02`：统一纠正文档状态并建立正式审阅入口
3. `LX-T03`：执行正式审阅并形成问题清单 / 审阅记录 / 结论摘要
4. `LX-T04`：再决定哪些内容进入实现排期

本文件完成后，`LX-T01` 可视为收口。

---

## 11. 建议阅读顺序

如果目标是快速进入第二阶段设计，建议按以下顺序阅读：

1. [phase2-user-task-map.md](/e:/projects/poms/docs/design/phase2-user-task-map.md)
2. [phase2-lifecycle-experience-blueprint.md](/e:/projects/poms/docs/design/phase2-lifecycle-experience-blueprint.md)
3. [phase2-experience-optimization-roadmap.md](/e:/projects/poms/docs/design/phase2-experience-optimization-roadmap.md)
4. 本文档
5. 再按 `L1 -> L2 -> L3 -> L4 -> L5` 进入各主线专题文档

如果目标是进入提成专题，可直接跳到：

1. [phase2-commission-stage-gate-overview-workspace.md](/e:/projects/poms/docs/design/phase2-commission-stage-gate-overview-workspace.md)
2. [phase2-commission-staged-payout-adjustment-paths.md](/e:/projects/poms/docs/design/phase2-commission-staged-payout-adjustment-paths.md)
3. [phase2-commission-retention-final-settlement.md](/e:/projects/poms/docs/design/phase2-commission-retention-final-settlement.md)
4. [phase2-commission-rule-explanation-language.md](/e:/projects/poms/docs/design/phase2-commission-rule-explanation-language.md)

---

## 12. 当前结论

第二阶段当前已经不缺主线级设计基线，缺的是全局收口和实现排期决策。

所以本阶段下一步不应再继续发散新增主线，而应：

1. 完成 `LX-T02`
2. 执行 `LX-T03`
3. 再执行 `LX-T04`
4. 最后才决定进入实现的第一批范围

在这个基础上，第二阶段才能从“设计已经很多”推进到“设计已经可执行”。

