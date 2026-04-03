# POMS 第二阶段详细设计索引与主线地图

**文档状态**: Ready for Review
**最后更新**: 2026-04-02
**适用范围**: `POMS` 第二阶段 `LX-T01` 全局收口草案，聚焦详细设计索引、主线地图与当前基线完成状态
**关联文档**:

- 上游设计:
  - `phase2-experience-optimization-roadmap.md`
  - `phase2-mainline-delivery-plan.md`
  - `phase2-mainline-implementation-design-matrix.md`
  - `phase2-lx-t04-full-mainline-development-decision.md`
  - `phase2-second-batch-scope.md`
  - `phase2-second-batch-implementation-mapping.md`
  - `phase2-third-batch-scope.md`
  - `phase2-third-batch-implementation-mapping.md`
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

本文档不是替代各专题设计，而是为后续评审、实现设计收口、统一开发判断和跨文档检索提供统一导航。

若需要先理解“第二阶段整体到底在做什么、当前真实处于哪一步、审阅问题与实现设计是什么关系”，应先阅读 `phase2-mainline-delivery-plan.md`。

若需要进一步确认 `L1 ~ L5` 五条主线是否都存在从基线到实现设计的完整推进路径，以及哪些第四批内容不会阻断当前主线继续下钻，应继续阅读 `phase2-mainline-implementation-design-matrix.md`。

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
- 当前下一步已从正式审阅转入 follow-up 收口与第一批实现设计前置，而不是继续新增主线

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
- 已完成六工作区、承接关系图与模板层三层收口，并补入第三批受控回退结果链

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
- 已形成合同承接、项目移交 gate、提成冻结绑定、收口规则与第三批再基线化结果链

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
7. `workflow-and-approval-design.md` 横切承接审批摘要字段包、例外揭示授权与冻结争议 / 替代冻结版本的公共链

换句话说：

- `L5` 不应绕过 `L4` 自己发明经营解释
- `L4` 不应绕过 `L2` 自己重算成本来源
- `L3` 是提成冻结和执行态准入的正式边界

---

## 10. 当前基线完成状态

截至当前，第二阶段已形成：

- `B1 ~ B30` 三十份正式基线产物
- `L1 ~ L5` 五条主线第一轮基线闭环

当前全局收口状态：

1. `LX-T01`：已收口
2. `LX-T02`：已收口
3. `LX-T03`：已完成四轮正式审阅，并形成综合评估、follow-up 清单与第一批范围说明
4. `LX-T04`：当前统一见 `phase2-lx-t04-full-mainline-development-decision.md`；正式口径已调整为“待 `L1 ~ L5` 全主线完成当前范围内实现设计后，再统一判断是否进入开发”

本文件完成后，`LX-T01` 可视为收口。

---

## 11. 建议阅读顺序

如果目标是快速进入第二阶段设计，建议按以下顺序阅读：

1. [phase2-user-task-map.md](/e:/projects/poms/docs/design/phase2-user-task-map.md)
2. [phase2-lifecycle-experience-blueprint.md](/e:/projects/poms/docs/design/phase2-lifecycle-experience-blueprint.md)
3. [phase2-experience-optimization-roadmap.md](/e:/projects/poms/docs/design/phase2-experience-optimization-roadmap.md)
4. 本文档
5. 再按 `L1 -> L2 -> L3 -> L4 -> L5` 进入各主线专题文档
6. 若进入第三批跨切面补点，再补读 `workflow-and-approval-design.md` 与 `phase2-data-permission-and-sensitive-visibility-design.md`

如果目标是进入提成专题，可直接跳到：

1. [phase2-commission-stage-gate-overview-workspace.md](/e:/projects/poms/docs/design/phase2-commission-stage-gate-overview-workspace.md)
2. [phase2-commission-staged-payout-adjustment-paths.md](/e:/projects/poms/docs/design/phase2-commission-staged-payout-adjustment-paths.md)
3. [phase2-commission-retention-final-settlement.md](/e:/projects/poms/docs/design/phase2-commission-retention-final-settlement.md)
4. [phase2-commission-rule-explanation-language.md](/e:/projects/poms/docs/design/phase2-commission-rule-explanation-language.md)

---

## 12. 当前结论

第二阶段当前已经不缺主线级设计基线，缺的是全局收口、全主线实现设计完成度和统一开发判断。

所以本阶段下一步不应再继续发散新增主线，而应：

1. 以综合评估、follow-up 清单和第一批范围说明为依据，继续回写 `P0 / P1` 正式规则和实现设计输入
2. 保留第一批六个前置专题作为实现设计先行输入，继续扩展第二批经营与成本可信源专题，并在 `L1` 受控回退结果链、`L3` 再基线化结果链与审批公共链已补入主文档 / 联动文档的基础上，继续推进第三批流程健壮性与审批增强专题的跨文档一致性复核
3. `LX-T04` 判断当前统一见 `phase2-lx-t04-full-mainline-development-decision.md`
4. 第二批经营与成本可信源专题当前范围统一见 `phase2-second-batch-scope.md`，实现映射桥接入口统一见 `phase2-second-batch-implementation-mapping.md`
5. 第三批流程健壮性与审批增强专题当前范围统一见 `phase2-third-batch-scope.md`，实现映射桥接、六份实现设计总文档写回、关键业务主文档首轮写回，以及审批摘要 / 例外授权 / 冻结争议公共链等关键联动补点统一见 `phase2-third-batch-implementation-mapping.md`
6. 待 `L1 ~ L5` 全主线在当前范围内完成实现设计后，再统一决定是否进入开发

在这个基础上，第二阶段才能从“设计已经很多”推进到“设计已经可执行”。
