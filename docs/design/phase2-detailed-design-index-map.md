# POMS 第二阶段详细设计索引与主线地图

**文档状态**: Active
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第二阶段当前正式索引入口，聚焦详细设计索引、主线地图、归档入口与当前正式输入
**关联文档**:

- 上游设计:
  - `phase2-experience-optimization-roadmap.md`
  - `phase2-mainline-delivery-plan.md`
  - `phase2-lx-t04-full-mainline-development-decision.md`
  - `phase2-lifecycle-experience-blueprint.md`
  - `phase2-user-task-map.md`
  - `phase2-experience-gap-priority-matrix.md`
- 同级设计:
  - `README.md`
  - `poms-design-progress.md`
- 历史回溯:
  - `archive/control-history/phase2-mainline-delivery-plan.md`
  - `archive/mainline-closure/phase2-mainline-implementation-design-matrix.md`
  - `archive/phase2-batches/phase2-second-batch-scope.md`
  - `archive/phase2-batches/phase2-third-batch-scope.md`
- 相关 ADR:
  - `../adr/006-project-as-primary-domain-object.md`
  - `../adr/011-bid-process-under-project-lifecycle.md`

---

## 1. 文档目标

本文档用于把第二阶段当前仍有效的详细设计文档统一收成一个总入口。

它重点回答：

- 第二阶段当前到底形成了哪些主线
- 每条主线下有哪些核心工作区或规则文档
- 它们之间的承接关系是什么
- 当前哪些已经形成正式阅读入口
- 当前应如何从索引进入工程实现

本文档不是替代各专题设计，而是为当前实现入口、跨文档检索和历史回溯提供统一导航。

若需要先理解“第二阶段整体到底在做什么、当前真实处于哪一步、审阅问题与实现设计是什么关系”，应先阅读 `phase2-mainline-delivery-plan.md`。

若需要回溯 `L1 ~ L5` 五条主线是如何从基线设计走到统一开发判断，应继续阅读 `archive/control-history/phase2-mainline-delivery-plan.md` 与 `archive/mainline-closure/phase2-mainline-implementation-design-matrix.md`。

---

## 2. 第二阶段总览

截至当前，第二阶段已经形成五条主线：

1. `L1` 签约前统一工作区
2. `L2` 执行期成本归集主线
3. `L3` 签约与移交强节点
4. `L4` 项目经营核算视图
5. `L5` 提成制度化操作体验

当前判断：

- `L1 ~ L5` 当前范围内的主线设计已形成正式阅读入口
- 当前主线相关实现设计已下钻到可进入工程实现的层次
- 当前下一步是按统一范围与统一切片顺序推进实现，而不是继续新增主线或继续展开批次过程叙事

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
- [phase2-presigning-workspace-information-architecture.md（含立项与推进章节）](/e:/projects/poms/docs/design/phase2-presigning-workspace-information-architecture.md)
- [phase2-presigning-project-overview-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-project-overview-workspace.md)
- [phase2-presigning-technical-cost-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-technical-cost-workspace.md)
- [phase2-presigning-bid-commercial-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-bid-commercial-workspace.md)
- [phase2-presigning-pricing-margin-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-pricing-margin-workspace.md)
- [phase2-presigning-contract-readiness-workspace.md](/e:/projects/poms/docs/design/phase2-presigning-contract-readiness-workspace.md)
- [phase2-presigning-workspace-handoff-map.md](/e:/projects/poms/docs/design/phase2-presigning-workspace-handoff-map.md)
- [phase2-presigning-workspace-templates.md](/e:/projects/poms/docs/design/phase2-presigning-workspace-templates.md)

### 4.3 当前状态

- 已完成第一轮基线
- 已形成当前正式阅读入口

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
- 已形成当前正式阅读入口

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
- 已形成当前正式阅读入口

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
- 已形成当前正式阅读入口

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
- 已形成当前正式阅读入口

---

## 9. 跨主线承接关系

当前跨主线承接建议统一理解为：

1. `L1` 输出签约前判断与事实基础
2. `L2` 输出执行期成本事实与累计结果
3. `L3` 输出合同到执行的正式收口与提成冻结版本
4. `L4` 输出统一经营事实、偏差解释与管理信号
5. `L5` 消费 `L3` 和 `L4`，并直接承接 `L4` 已固定的税务影响摘要、成本数据成熟度状态、成本侧动作建议、动作等级与引用基线 / 快照版本，形成提成操作链
6. `phase2-data-permission-and-sensitive-visibility-design.md` 横切约束上述所有读侧入口、敏感字段与提成可见性边界
7. `workflow-and-approval-design.md` 横切承接审批摘要字段包、例外揭示授权与冻结争议 / 替代冻结版本的公共链

换句话说：

- `L5` 不应绕过 `L4` 自己发明经营解释
- `L5` 应直接消费 `L4` 已固定的正式输入包，而不是在 gate、发放、结算或解释页各自重组经营结论
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
3. `LX-T03`：历史正式审阅与批次收口过程已归档
4. `LX-T04`：当前统一见 `phase2-lx-t04-full-mainline-development-decision.md`

本文件完成后，`LX-T01` 可视为收口。

---

## 11. 建议阅读顺序

如果目标是快速进入第二阶段设计，建议按以下顺序阅读：

1. [phase2-user-task-map.md](/e:/projects/poms/docs/design/phase2-user-task-map.md)
2. [phase2-lifecycle-experience-blueprint.md](/e:/projects/poms/docs/design/phase2-lifecycle-experience-blueprint.md)
3. [phase2-experience-optimization-roadmap.md](/e:/projects/poms/docs/design/phase2-experience-optimization-roadmap.md)
4. 本文档
5. 再按 `L1 -> L2 -> L3 -> L4 -> L5` 进入各主线专题文档
6. 若涉及横切约束，再补读 `workflow-and-approval-design.md` 与 `phase2-data-permission-and-sensitive-visibility-design.md`

如果目标是进入提成专题，可直接跳到：

1. [phase2-commission-stage-gate-overview-workspace.md](/e:/projects/poms/docs/design/phase2-commission-stage-gate-overview-workspace.md)
2. [phase2-commission-staged-payout-adjustment-paths.md](/e:/projects/poms/docs/design/phase2-commission-staged-payout-adjustment-paths.md)
3. [phase2-commission-retention-final-settlement.md](/e:/projects/poms/docs/design/phase2-commission-retention-final-settlement.md)
4. [phase2-commission-rule-explanation-language.md](/e:/projects/poms/docs/design/phase2-commission-rule-explanation-language.md)

---

## 12. 当前结论

第二阶段当前已经具备可执行的主线级设计入口，且统一开发判断已经完成。

因此，本文件当前只承担三个职责：

1. 给出 `L1 ~ L5` 的正式索引入口。
2. 给出当前默认阅读路径。
3. 把历史批次、历史审阅和历史长文入口明确下沉到归档目录。

如果当前目标是参与实现，应以本文件作为导航页，并进一步进入 `phase2-mainline-delivery-plan.md`、`phase2-lx-t04-full-mainline-development-decision.md`、`implementation-delivery-guide.md` 与具体主线文档。

如果当前目标是回溯过程，再进入 `archive/control-history/`、`archive/mainline-closure/` 与 `archive/phase2-batches/`。
