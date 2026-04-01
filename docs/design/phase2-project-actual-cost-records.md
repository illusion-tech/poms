# POMS 第二阶段项目级实际成本记录草案

**文档状态**: Ready for Review
**最后更新**: 2026-04-01
**适用范围**: `POMS` 第二阶段 `L2-T02` 详细设计草案，聚焦执行期成本归集主线中的项目级实际成本记录
**关联文档**:

- 上游设计:
  - `phase2-execution-cost-workspace-information-architecture.md`
  - `phase2-experience-optimization-roadmap.md`
  - `phase2-lifecycle-experience-blueprint.md`
  - `phase2-presigning-technical-cost-workspace.md`
  - `phase2-presigning-workspace-templates.md`
- 同级设计:
  - `contract-finance-design.md`
  - `project-lifecycle-design.md`
  - `phase2-data-permission-and-sensitive-visibility-design.md`
  - `query-view-boundary-design.md`
  - `commission-settlement-design.md`
- 相关 ADR:
  - `../adr/004-contract-finance-domain-module-boundary.md`
  - `../adr/007-phase1-finance-integration-and-recording-boundary.md`

---

## 1. 文档目标

本文档用于把 `L2-T01` 的信息架构继续细化到“项目级实际成本记录”的对象与记录层。

它重点回答：

- 执行中的一笔实际成本，在系统里应如何成为正式记录
- 项目级实际成本记录需要哪些最小字段
- 人力成本这种非单据型成本，应如何进入项目成本口径
- 哪些状态迁移允许发生，哪些不允许直接覆盖

---

## 2. 核心设计结论

### 2.1 核心对象

第二阶段建议把“项目级实际成本记录”抽象成统一对象：

- `ProjectActualCostRecord`

它不是要替代采购合同、发票或付款事实，而是作为项目经营口径下的统一成本记录层，对外承接不同来源的成本事实。

### 2.2 统一作用

`ProjectActualCostRecord` 的作用是：

- 把不同来源的成本事实统一挂到同一个项目下面
- 提供统一状态语义
- 提供统一金额、税务影响、依据和责任字段
- 为后续累计视图、经营核算和提成判断提供稳定输入

### 2.3 本阶段关键假设

对软件开发服务类项目，主要成本通常是开发人员投入的人力。

当前第二阶段明确采用：

**“按人员/角色 + 项目 + 周/月的汇总归集方式记录实际人力成本，不先引入完整日报或明细工时系统。”**

这是本轮 `L2-T02` 的正式基线。

---

## 3. 成本记录来源模型

当前建议把项目级实际成本记录分成两层：

1. 来源事实层
2. 项目成本记录层

### 3.1 来源事实层

来源事实可以来自：

- 采购相关记录
- 发票相关记录
- 费用记录
- 必要付款事实
- 人力成本汇总记录

### 3.2 项目成本记录层

项目成本记录层统一表达：

- 它属于哪个项目
- 这是什么类型的成本
- 目前到了哪个状态
- 金额和税务影响是多少
- 依据是什么
- 是否已经纳入当前项目经营口径

因此，后续即使来源对象不同，项目经营侧仍然只消费统一的项目级成本记录。

---

## 4. `ProjectActualCostRecord` 最小字段建议

### 4.1 主身份字段

- `recordId`
- `projectId`
- `recordNo`
- `costType`
- `costSubtype`

### 4.2 时间与期间字段

- `occurredOn`
- `accountingPeriod`
- `registeredAt`
- `confirmedAt`
- `includedAt`
- `executionStageCode`
- `stageDerivedFromType`
- `stageDerivedFromId`
- `stageDerivedAt`
- `stageLockedAt`

### 4.3 金额字段

- `currency`
- `amountExcludingTax`
- `taxCostAmount`
- `amountIncludingTax`

### 4.4 状态字段

- `recordStatus`
- `isIncludedInProjectCost`
- `isHighRisk`

### 4.5 来源与依据字段

- `sourceType`
- `sourceId`
- `sourceRefNo`
- `evidenceSummary`
- `attachmentCount`

### 4.6 责任字段

- `registeredBy`
- `confirmedBy`
- `includedBy`
- `ownerRole`

### 4.7 说明字段

- `costDescription`
- `taxImpactSummary`
- `riskNote`
- `replacementOfRecordId`
- `voidReason`

---

## 5. 成本类型建议

当前 `ProjectActualCostRecord.costType` 至少支持：

1. `PROCUREMENT`
2. `INVOICE`
3. `EXPENSE`
4. `PAYMENT_FACT`
5. `LABOR`

### 5.1 `LABOR` 必须作为正式成本类型

对软件开发服务类项目，`LABOR` 不是临时备注分类，而应作为与采购、费用并列的正式成本类型。

否则：

- 签约前估算中的人力实施成本无法和执行期实际成本对比
- 软件开发服务类项目的主要成本会被系统遗漏
- 后续经营核算会天然失真

---

## 6. 人力成本汇总归集口径

### 6.1 当前采用的粒度

第二阶段当前固定采用：

- `人员/角色 + 项目 + 周` 或
- `人员/角色 + 项目 + 月`

的汇总归集粒度。

不要求：

- 每天逐条日报
- 任务级工时拆解
- 完整工时系统接入

### 6.2 人力成本记录建议字段

当 `costType = LABOR` 时，建议额外包含：

- `laborPersonId` 或 `laborRole`
- `laborPeriodType`
  - `WEEK`
  - `MONTH`
- `laborPeriodStart`
- `laborPeriodEnd`
- `actualHours` 或 `actualPersonDays`
- `internalCostRate`
- `laborAmount`
- `workSummary`
- `deliveryStage`

### 6.3 人力成本计算逻辑

当前建议支持两种内部口径，但对外统一落成金额：

1. `实际工时 × 小时成本率`
2. `实际人天 × 日成本率`

系统应保存：

- 计算基础
- 单价
- 结果金额

而不是只保存最终总额。

### 6.3A `internalCostRate` 治理基线

`LABOR` 成本能否成为可信输入，关键不在“有没有算出金额”，而在 `internalCostRate` 是否具备稳定来源、版本和生效口径。

当前第二阶段建议固定以下规则：

1. 成本率进入经营口径前，必须先形成受控版本。
2. 外部 HR 系统、薪酬表或手工台账都只能作为来源，不直接作为计算时的即时权威源。
3. 真正进入 `ProjectActualCostRecord` 的，应是已经被归口维护并带版本号的成本率基线。

### 6.3B 成本率来源与归口

当前建议：

- 原始来源可为 `HR` 提供、财务测算或受控手工维护
- 进入项目成本口径前，统一沉淀为由财务归口维护的版本化成本率基线
- 当前阶段不要求接入实时薪酬系统，也不把工资条、社保、公积金等展开为第一阶段主链对象

这意味着：

- `internalCostRate` 的“来源”可以多样
- 但“生效成本率”必须只有一个统一口径

### 6.3C 成本率版本字段建议

当前至少应能表达以下维度：

- `rateVersionId`
- `rateScopeType`
  - `PERSON`
  - `ROLE`
- `personId` 或 `roleCode`
- `rateUnit`
  - `HOUR`
  - `DAY`
- `rateValue`
- `currency`
- `effectiveFrom`
- `effectiveTo`
- `publishedAt`
- `publishedBy`
- `supersedesRateVersionId`
- `changeReason`

说明：

- 若同一人员存在个人成本率，优先级高于角色成本率
- 若不存在个人成本率，可回落到角色成本率
- 不允许对同一 `scope + unit` 在同一时段存在两个并行有效版本

### 6.3D 生效与锁定规则

当前建议采用：

**“新版本向后生效，历史记录默认锁定，不静默追溯重算。”**

具体规则：

1. 新成本率版本只影响 `effectiveFrom` 之后新形成的人力成本记录。
2. 已 `CONFIRMED` 或 `INCLUDED` 的 `LABOR` 记录，默认保持创建时采用的成本率与金额，不因新版本发布而静默改写。
3. 若业务确需重估历史人力成本，只允许通过“替代记录 / 重算候选”方式处理，不允许直接覆盖原记录。
4. 在途项目会自然感知新版本，但只体现在新期间的人力归集记录中。

### 6.3E 跨生效日的期间处理

若一条 `LABOR` 汇总记录覆盖的期间跨越成本率版本生效日，当前建议：

- 必须拆成两条或多条期间记录
- 每条记录只允许引用一个有效成本率版本
- 不允许一条周/月记录同时混用两个成本率版本后只保留一个总额

这样做的原因是：

- 后续偏差分析需要知道到底是“投入变多”还是“成本率变了”
- 经营核算和提成解释必须能回放到当时实际采用的成本率版本

### 6.4 人力成本依据

由于人力成本通常没有外部采购单据，当前建议其依据采用：

- 项目成员投入汇总说明
- 周/月归集说明
- 责任人确认记录
- 必要时的附件或补充说明

此外，对 `LABOR` 记录当前还应补充：

- 采用的 `rateVersionId`
- 成本率来源类型
- 成本率变更原因摘要（如为新版本生效期内首条记录）

### 6.5 为什么采用汇总归集

这是第二阶段的务实边界：

- 能覆盖软件开发服务类项目的主要成本
- 不会把系统提前扩展成完整工时平台
- 足以支撑项目级实际成本累计、偏差分析和经营核算

---

## 7. 状态模型

`ProjectActualCostRecord.recordStatus` 当前建议固定为：

- `DRAFT`
- `REGISTERED`
- `CONFIRMED`
- `INCLUDED`
- `VOIDED`
- `REPLACED`

### 7.1 状态语义

- `DRAFT`: 已录入但尚未作为正式依据
- `REGISTERED`: 成本事实已登记
- `CONFIRMED`: 对应责任角色已确认有效
- `INCLUDED`: 已纳入项目成本口径
- `VOIDED`: 当前记录作废，不再作为有效依据
- `REPLACED`: 已被新记录替代

### 7.2 状态迁移要求

- 不允许直接修改已 `INCLUDED` 记录的核心金额
- 如需调整，应通过 `REPLACED` 或 `VOIDED + 新记录` 处理
- 状态变更必须保留责任人和时间

---

## 8. 关键动作建议

项目级实际成本记录至少应支持以下动作：

1. 新建记录
2. 关联来源事实
3. 提交登记
4. 确认有效
5. 纳入口径
6. 作废
7. 替代
8. 补充依据说明

### 8.1 关键约束

- `纳入口径` 前必须存在明确责任人
- `LABOR` 记录必须有期间和计算基础
- 没有项目上下文的成本记录不得进入本对象
- `LABOR` 记录必须能定位到唯一的有效成本率版本
- 跨成本率生效日的 `LABOR` 记录不得直接合并登记
- 成本率版本变化后，历史 `LABOR` 记录不得静默重算

### 8.2 执行阶段归属与锁定规则

第二批当前进一步固定：

1. 每条 `ProjectActualCostRecord` 在进入 `CONFIRMED` 前，必须能确定唯一的 `executionStageCode`。
2. 阶段归属应按以下优先级稳定派生：
  - 明确的业务阶段对象或里程碑事实
  - 关联的移交 / 验收 / 阶段成果确认上下文
  - 来源事实日期映射到当时有效的项目执行阶段区间
3. 一旦记录进入 `CONFIRMED` 或 `INCLUDED`，`executionStageCode` 必须锁定；后续项目阶段命名调整、展示分组变化或计划回填，不得静默改写历史记录归属。
4. 若来源事实日期或阶段依据被纠正，必须通过 `REPLACED` 或显式重述记录处理，并保留原阶段归属、修正原因和责任人。
5. 一条成本记录不允许同时跨两个执行阶段；若来源事实天然跨阶段，必须拆分成多条记录。

---

## 9. 列表与详情表达要求

### 9.1 列表页必须回答的问题

- 这条成本记录属于哪个项目
- 它是什么成本类型
- 它属于哪个执行阶段
- 金额是多少
- 现在到什么状态
- 是否已经纳入口径
- 它的依据是否完整

### 9.2 详情页必须回答的问题

- 这条成本记录如何形成
- 阶段如何归属，依据是什么
- 金额如何计算
- 税务成本影响是什么
- 是否有替代或作废关系
- 是否与签约前估算成本存在映射关系

### 9.3 `LABOR` 详情页必须额外显示

- 人员或角色
- 周/月期间
- 工时或人天
- 内部成本率
- 成本率版本
- 成本率生效区间
- 计算过程
- 投入摘要

说明：

- 本节定义的是 `LABOR` 详情对象的完整字段要求，不等于所有可见该记录的角色都默认看到完整值
- 读侧展示仍必须遵循 `phase2-data-permission-and-sensitive-visibility-design.md`：财务与受授权管理层可见完整字段，销售主责 / 销售负责人默认只看项目级 `LABOR` 汇总，售前、交付 / 实施、商务协作角色不默认查看 `internalCostRate`、成本率版本和人员级人工成本明细

---

## 10. 与后续任务的承接关系

### 10.1 输出给 `L2-T03`

`L2-T03` 需要在本对象之上，进一步明确：

- 采购相关事实如何映射
- 采购发票如何映射
- 费用如何映射
- 必要付款事实如何映射

### 10.2 输出给 `L2-T04`

`L2-T04` 将消费本对象的：

- 金额
- 状态
- 成本类型
- 项目维度
- 时间维度
- 执行阶段归属与锁定结果

从而形成累计与阶段视图。

### 10.3 输出给 `L2-T05`

`L2-T05` 将消费本对象，完成：

- 估算成本到实际成本的映射
- 偏差原因解释
- 重点高风险成本差异说明

---

## 11. 当前结论

`L2-T02` 当前建议固定为：

- 以 `ProjectActualCostRecord` 作为统一项目级实际成本记录对象
- 以 `PROCUREMENT / INVOICE / EXPENSE / PAYMENT_FACT / LABOR` 作为第一批正式成本类型
- 明确把 `LABOR` 作为软件开发服务类项目的正式成本类型
- 明确采用“人员/角色 + 项目 + 周/月”的汇总归集方式记录实际人力成本

因此，下一步应继续执行 `L2-T03`，补“采购合同 / 采购发票 / 费用 / 必要付款事实”如何映射进统一项目成本记录层的承接口径。

