# POMS 第二阶段第二批实现映射准备

**文档状态**: Archived
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第二阶段第二批七个经营与成本可信源专题完成主规则回写后，进入与第一批同等深度实现设计前的映射准备
**关联文档**:

- 上游设计:
  - `../reviews/phase2-review-checklist.md`
  - `../reviews/phase2-review-comprehensive-assessment.md`
  - `../reviews/phase2-review-follow-up-plan.md`
  - `phase2-second-batch-scope.md`
  - `../../phase2-mainline-implementation-design-matrix.md`
- 同级设计:
  - `../../interface-command-design.md`
  - `../../interface-openapi-dto-design.md`
  - `../../query-view-boundary-design.md`
  - `../../data-model-prerequisites.md`
  - `../../table-structure-freeze-design.md`
  - `../../schema-ddl-design.md`
  - `../../implementation-delivery-guide.md`

---

## 1. 文档目标

本文档不是新增业务规则，而是把第二批七个专题已经冻结的经营与成本可信口径，翻译成进入实现设计层可直接使用的工程输入。

本文档重点回答以下问题：

- 第二批七个专题分别需要补哪些写侧命令或系统派生动作
- 第二批专题分别需要哪些读侧视图、历史回看和守卫约束
- 哪些字段必须进入 DTO，哪些字段不能退回普通页面拼装
- 哪些对象、快照、版本链、替代链、期末冻结链需要在数据模型、表结构和 schema 层补齐
- 第二批何时才算真正进入与第一批同等深度的实现设计闭环

本文档不替代第二批范围说明，也不直接替代 OpenAPI 或 DDL；它是第二批规则与实现设计之间的桥接层。

---

## 2. 使用边界

当前第二批映射准备统一遵循以下边界：

1. 不回头改写第一批已经冻结的主对象、主事实和敏感边界。
2. 不把第三批、第四批专题顺手混入第二批实现映射。
3. 不在本文件中直接冻结最终接口 path、最终表名或最终字段名，但要把候选对象、快照和关系边界讲清楚。
4. 若某项第二批映射会反向改变第一批已冻结前提，应升级为评审动作，而不是在本文件中静默改写。

---

## 3. 第二批通用实现映射规则

### 3.1 写侧分类

第二批专题统一拆成三类写侧入口：

1. 命令型动作接口
   用于确认分摊依据、锁定阶段归属、固化税务处理、确认当前经营基线、期末冻结与重述、提成 gate 复核等高敏动作。

2. 受控替代接口
   用于替代共享分摊结果、重分类阶段归属、重述期末口径、替换当前有效经营基线等需要保留历史链的动作。

3. 系统派生动作
   用于经营信号计算、`L4 -> L5` gate 绑定结果刷新、时点快照视图投影、期末快照生成和历史重算候选刷新等，不应退化为页面手工计算。

### 3.2 读侧分类

第二批专题统一落到以下读侧层次：

1. `DetailQuery`
   支撑分摊依据、阶段归属、税务处理、变更基线、期末快照和 gate 绑定的详情解释。

2. `AggregateViewQuery`
   支撑 `ProjectOperatingView`、经营核算总览、时点快照经营回看和 `L4 -> L5` 绑定后的提成阶段解释。

3. `HistoryQuery`
   支撑共享分摊替代链、阶段归属重分类链、税务处理替代链、变更包基线链、期末冻结 / 重述链和 gate 复核链。

### 3.3 DTO 与字段包规则

第二批专题统一采用以下 DTO 规则：

1. 任何会改变经营可信口径的字段，不得进入普通 `PatchDto`。
2. 任何时点快照、期末冻结、重述、变更包基线、共享分摊和 gate 绑定结果，都必须通过显式 DTO 输入与结果 DTO 输出表达，不能只存在于页面临时解释。
3. 第二批命令响应 DTO 优先返回当前动作结果、关键引用、版本 / 快照链引用和后续入口，不直接回传整份经营聚合详情。
4. 第二批查询响应必须继续遵守第一批已冻结的敏感投影边界，不因其属于 `L4/L5` 聚合视图就默认回传完整原值。

### 3.4 数据模型规则

第二批专题统一要求以下模型特征：

1. 共享事实、阶段归属、税务处理、经营基线、期末快照、重述快照和 gate 复核链都必须可追溯。
2. 实时口径、期末冻结口径和重述口径必须显式分层，不能共用一组“当前值”字段。
3. 所有会改变经营解释的动作都应具备 `expectedVersion` 或等价并发控制。
4. `L5` 对 `L4` 的消费必须通过稳定的绑定矩阵与解释链进入，而不是在提成页单独重算或口头解释。

---

## 4. 第二批七专题实现映射总表

| 包    | 专题                               | 写侧实现重点                                          | 读侧实现重点                                                     | DTO / 守卫重点                                                | 数据模型重点                                                      |
| ----- | ---------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `B7`  | 分摊成本与项目共享事实             | 固化分摊依据、登记项目份额、替代共享分摊结果          | 项目成本详情、经营总览和偏差桥接必须消费项目份额而非来源全额     | 分摊依据、来源引用、项目份额不得进入普通协作页 DTO            | 共享分摊依据、分摊结果、替代链与来源事实引用                      |
| `B8`  | 执行阶段归属与历史稳定派生         | 锁定阶段归属、受控重分类、保留历史归属链              | 阶段累计视图必须解释当前归属、锁定来源和重分类历史               | 阶段归属字段、锁定来源和重分类原因必须显式进入命令 DTO        | 阶段归属快照、阶段归属规则版本、重分类链                          |
| `B9`  | 税务影响与财务核算口径             | 固定税务处理结论、替代税务处理、刷新经营核算口径      | 经营核算详情必须分清含税 / 不含税 / 不可抵扣影响                 | 税务处理类型、抵扣状态和口径来源不得混入普通维护 DTO          | 税务处理快照、口径替代链、经营核算引用关系                        |
| `B10` | 执行中合同变更基线与变更包基线     | 固化原始基线、变更包基线和当前有效经营基线            | 偏差桥接和经营总览必须同时解释原始基线、变更包基线和当前生效基线 | 基线引用、变更包引用和当前有效基线选择不得退回页面拼装        | 经营基线包、变更包基线链、当前有效经营基线引用                    |
| `B11` | 时点快照、期末冻结与补录重述       | 生成期末快照、登记重述动作、替代历史回看口径          | 时点快照经营视图必须区分实时、期末和重述三种口径                 | `asOfMode`、`periodEndSnapshotId`、`restatementReason` 显式化 | 实时口径、期末快照、重述快照、补录 / 重述关系链                   |
| `B12` | 经营公式边界与数据成熟度联动       | 固化成熟度解释规则、必要时登记人工复核结论            | 经营总览必须返回公式边界、成熟度等级、解释动作和风险信号         | 公式边界、成熟度、解释动作不得只作为前端文案硬编码            | 经营信号评估结果、成熟度评估结果、人工复核记录                    |
| `B13` | `L4` 经营信号到 `L5 gate` 绑定矩阵 | 固化 `PROMPT / REVIEW / BLOCK` 绑定规则并记录复核结论 | 提成阶段页必须解释阻断 / 复核 / 提示的来源、处理人和处理时间     | gate 绑定结果、复核结论、阻断原因必须进入独立 DTO / guard     | 经营信号到 gate 绑定矩阵、gate 复核记录、提成页消费的绑定结果快照 |

---

## 5. 分专题实现映射

### 5.1 `B7` 分摊成本与项目共享事实

#### 写侧建议

- 需要补一组共享分摊动作或受控替代步骤：
  - 固化共享分摊依据
  - 生成项目级分摊结果
  - 替代旧分摊结果并保留历史链
- 不允许继续用来源单据全额在多个项目上重复解释经营偏差。

#### 读侧建议

- 至少补齐或下钻以下读模型：
  - `ProjectActualCostRecordDetailView`
  - `ProjectOperatingView`
  - 估算到实际桥接详情视图
- 这些视图必须能同时解释：
  - 来源事实摘要
  - 当前项目份额
  - 分摊依据与替代历史

#### DTO / 守卫建议

- 分摊依据、来源事实引用、项目份额值 / 比例不得进入普通更新 DTO。
- 经营页不得允许前端直接手填“项目已分摊金额”覆盖系统结果。

#### 数据模型建议

- 至少能稳定表达：
  - `SharedCostAllocationBasis`
  - `SharedCostAllocationResult`
  - `sourceCostRecordId -> allocatedProjectIds`
  - `supersedesAllocationResultId`

### 5.2 `B8` 执行阶段归属与历史稳定派生

#### 写侧建议

- 需要补一组阶段归属动作：
  - 确认当前阶段归属
  - 受控重分类阶段归属
  - 刷新阶段累计结果
- 若发生重分类，不得无痕覆盖旧解释。

#### 读侧建议

- `../../phase2-actual-cost-accumulation-stage-view.md` 对应读模型至少应返回：
  - 当前阶段归属
  - 锁定来源
  - 派生优先级
  - 重分类历史

#### DTO / 守卫建议

- `stageAttributionMode`、`attributedStage`、`lockedBySnapshotId`、`reclassifyReason` 必须进入命令 DTO。
- 普通成本登记 DTO 不得顺带修改已生效阶段归属。

#### 数据模型建议

- 至少需要稳定表达：
  - `CostStageAttributionSnapshot`
  - `stageRuleVersionId`
  - `supersedesAttributionId`
  - 累计视图消费的阶段归属引用

### 5.3 `B9` 税务影响与财务核算口径

#### 写侧建议

- 需要补税务处理结论动作：
  - 固化税务处理类型
  - 替代税务处理结论
  - 刷新经营核算口径引用
- 税务待确认项不得长期停留在模糊文本解释层。

#### 读侧建议

- 经营核算详情至少应返回：
  - 税务处理类型
  - 可抵扣 / 不可抵扣影响
  - 待确认标记
  - 对毛利解释的影响摘要

#### DTO / 守卫建议

- `taxTreatmentType`、`deductibilityStatus`、`taxImpactAmount`、`taxPendingFlag` 不得混入普通维护 DTO。
- 非授权角色仍应只看到摘要化税务影响，不看到不必要原始口径细节。

#### 数据模型建议

- 至少需要稳定表达：
  - `AccountingTaxTreatmentSnapshot`
  - `supersedesTaxTreatmentId`
  - `ProjectAccountingView` 的税务口径引用

### 5.4 `B10` 执行中合同变更基线与变更包基线

#### 写侧建议

- 需要补一组经营基线动作：
  - 固化原始签约基线
  - 固化已批准变更包基线
  - 切换当前有效经营基线
- 经营偏差不得把正式变更和真实超支混成同一来源。

#### 读侧建议

- 偏差桥接详情和经营总览必须同时返回：
  - 原始签约基线摘要
  - 变更包基线摘要
  - 当前生效经营基线摘要
  - 差异解释来源

#### DTO / 守卫建议

- `originalBaselineId`、`changePackageBaselineId`、`effectiveOperatingBaselineId` 必须进入命令 DTO 或查询 DTO。
- 合同变更页面不得自行拼装经营基线结论覆盖桥接视图。

#### 数据模型建议

- 至少需要稳定表达：
  - `OperatingBaselinePackage`
  - `ChangePackageBaseline`
  - `effectiveOperatingBaselineId`
  - 基线替代链与重算候选引用

### 5.5 `B11` 时点快照、期末冻结与补录重述

#### 写侧建议

- 需要补一组期末口径动作：
  - 生成期末快照
  - 登记重述请求 / 结果
  - 替代历史回看口径
- 补录后不得通过“当前值覆盖历史值”的方式改写既往经营解释。

#### 读侧建议

- 经营视图至少应支持：
  - `realtime`
  - `period-end`
  - `restated`
  三种模式，并明确每种模式的来源与时间边界。

#### DTO / 守卫建议

- `asOfMode`、`snapshotAt`、`periodEndSnapshotId`、`restatementReason`、`restatedFromSnapshotId` 必须显式化。
- 普通查询 DTO 不得省略当前视图口径，否则前端会把实时结果误当历史结果。

#### 数据模型建议

- 至少需要稳定表达：
  - `ProjectOperatingSnapshot`
  - `PeriodClosingSnapshot`
  - `OperatingRestatementRecord`
  - `restatesSnapshotId`

### 5.6 `B12` 经营公式边界与数据成熟度联动

#### 写侧建议

- 第二批优先采用系统派生动作生成经营信号与成熟度结果。
- 若允许人工复核或例外确认，应补独立复核动作，而不是允许前端手改成熟度结论。

#### 读侧建议

- `ProjectOperatingView`、偏差解释视图和经营反馈视图至少应返回：
  - 公式边界说明
  - 数据成熟度等级
  - 对应解释动作
  - 风险信号等级

#### DTO / 守卫建议

- `dataMaturityLevel`、`formulaBoundaryAction`、`signalLevel`、`reviewRequired` 必须进入响应 DTO。
- 不得把“仅供解释”的前端文案误当真实阻断结论。

#### 数据模型建议

- 至少需要稳定表达：
  - `OperatingSignalEvaluationResult`
  - `DataMaturityEvaluationResult`
  - 必要时的人工复核记录引用

### 5.7 `B13` `L4` 经营信号到 `L5 gate` 绑定矩阵

#### 写侧建议

- 需要补一组绑定与复核动作：
  - 固化 `PROMPT / REVIEW / BLOCK` 绑定结果
  - 记录 `REVIEW` 分支的处理结论
  - 刷新提成阶段页消费的 gate 绑定结果
- 提成页不得再自行解释“为什么这次是提示、复核还是阻断”。

#### 读侧建议

- `CommissionStageGateView`、`CommissionPayoutDetailView` 至少应返回：
  - 当前经营信号等级
  - 绑定后的 gate 动作
  - 复核结论
  - 处理人和处理时间
  - 阻断 / 放行原因摘要

#### DTO / 守卫建议

- `bindingAction`、`gateReviewDecision`、`gateReviewRecordId`、`blockingReasonCode` 必须显式进入 DTO。
- `BLOCK` 结论必须落实到 guard，而不是只作为页面提示。

#### 数据模型建议

- 至少需要稳定表达：
  - `OperatingSignalToCommissionGateBinding`
  - `CommissionGateReviewRecord`
  - 提成页消费的绑定结果快照

---

## 6. 已完成的首轮实现设计总文档写回

截至 2026-04-02，第二批桥接映射已经完成首轮写回，不再只停留在桥接层描述。当前已完成以下总文档补点：

1. `../../interface-command-design.md`
  已补第二批专用命令边界，覆盖共享分摊、阶段归属、税务处理、经营基线切换、期末冻结 / 重述与 gate 复核。

2. `../../interface-openapi-dto-design.md`
  已补第二批命令 DTO 草案，覆盖分摊依据 / 项目份额、阶段归属 / 重分类、税务处理、时点快照 / 期末 / 重述与 gate 绑定字段边界。

3. `../../query-view-boundary-design.md`
  已补第二批查询视图，覆盖共享分摊详情、阶段归属历史、`ProjectOperatingAsOfView`、经营信号解释与 gate 绑定历史视图。

4. `../../data-model-prerequisites.md`、`../../table-structure-freeze-design.md`、`../../schema-ddl-design.md`
  已补第二批涉及的分摊依据、阶段归属快照、税务处理快照、经营基线包、期末快照、重述记录、经营信号结果和 gate 复核记录。

---

## 7. 第二批七层闭环前的最小检查项

在把第二批认定为已进入与第一批同等深度的实现设计之前，建议至少确认以下事项：

1. `B7 ~ B13` 都已映射到明确的 `command / query / DTO / data model / table freeze / schema / DDL / guard` 补点。
2. `L4` 的实时、期末和重述三类结果已经能被稳定区分。
3. `L5` 的 gate 判断已经明确消费 `L4` 绑定结果，而不是单独页面解释。
4. 共享分摊、阶段归属、税务处理、经营基线和重述链都具备历史追溯关系。
5. 第二批补点没有破坏第一批已冻结的敏感投影与最小可见集边界。

---

## 8. 当前结论

第二批七个专题当前已经完成从“正式规则范围”到“桥接映射”再到“六份实现设计总文档首轮写回”的推进。

更合理的下一步是：

1. 继续校验 `L2 / L4 / L5` 在 command、query、DTO、数据模型、表结构和 DDL 层的口径一致性。
2. 把第二批补点从“总文档已写回”推进到“主线文档可稳定消费”的收敛状态；当前 `../../phase2-project-actual-cost-records.md`、`../../phase2-actual-cost-accumulation-stage-view.md`、`../../phase2-project-business-outcome-overview.md`、`../../phase2-project-variance-risk-explanation.md`、`../../phase2-business-accounting-feedback-rules.md` 与 `../../phase2-commission-stage-gate-overview-workspace.md` 已显式补齐税务影响、基线版本、动作等级与时点快照的消费 / 传递，`../../phase2-commission-freeze-at-handover.md` 也已补齐与移交前有效基线的联合追溯。
3. 在不反向推翻第一批和第二批主事实的前提下，继续并行推进仍属于当前范围的第三批专题实现设计。

换句话说：

- 第一批已经证明主事实和主边界可以下钻
- 第二批当前要做的是把已写回总文档的经营可信口径与历史回看口径继续收敛成可稳定消费的主线实现设计；其中 `L2 -> L4 -> L5` 已显式串起税务影响、基线版本、动作等级、时点快照与冻结结果追溯链
- 只有这样，`L4/L5` 才能在当前范围内完成可信、可解释、可追溯的实现设计闭环
