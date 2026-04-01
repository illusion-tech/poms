# POMS 第二阶段第一批实现映射准备

**文档状态**: Active
**最后更新**: 2026-04-01
**适用范围**: `POMS` 第二阶段第一批六个前置专题完成主规则回写与交叉复核后，作为全主线实现设计先行输入的实现映射准备
**关联文档**:

- 上游设计:
  - `phase2-review-checklist.md`
  - `phase2-review-comprehensive-assessment.md`
  - `phase2-review-follow-up-plan.md`
  - `phase2-first-batch-scope.md`
  - `phase2-data-permission-and-sensitive-visibility-design.md`
- 同级设计:
  - `interface-command-design.md`
  - `interface-openapi-dto-design.md`
  - `query-view-boundary-design.md`
  - `data-model-prerequisites.md`
  - `table-structure-freeze-design.md`
  - `schema-ddl-design.md`
  - `implementation-delivery-guide.md`

---

## 1. 文档目标

本文档不是新增业务规则，而是把第一批六个专题已经冻结的设计结论，翻译成全主线实现设计阶段可直接使用的工程输入。

本文档重点回答以下问题：

- 每个第一批专题需要补哪些写侧命令或系统派生动作
- 每个专题需要哪些读侧视图或字段守卫
- 哪些字段应进入 DTO，哪些字段必须禁止进入普通更新接口
- 哪些对象、表、版本链、审计链需要在表结构和 schema 层补齐
- 在继续推进第二阶段全主线实现设计前，最少还要把哪些映射结论写稳

本文档不替代业务设计文档，也不直接替代 OpenAPI 或 DDL；它是第一批规则与实现设计之间的桥接层。

---

## 2. 使用边界

当前映射准备统一遵循以下边界：

1. 不再改写第一批已冻结的业务前提。
2. 不把第二批、第三批和第四批专题顺手混入第一批实现映射。
3. 不在本文件中直接定最终接口 path、最终表名或最终字段名，但要把候选实现对象与边界讲清楚。
4. 若某项实现映射会反向改变多份业务设计文档，应升级为新的评审动作，而不是在本文件中静默决定。

---

## 3. 通用实现映射规则

### 3.1 写侧分类

第一批专题统一拆成三类写侧入口：

1. 草稿维护接口
   只承接中低敏字段维护，不推动状态，不生成有效事实。

2. 命令型动作接口
   用于审批、确认、生效、冻结、复核、初始化、冲销、替代等高敏动作。

3. 系统派生动作
   由命令型动作或后台受控流程触发，例如快照生成、差异校验、待办派发、版本替代和聚合摘要刷新。

### 3.2 读侧分类

第一批专题统一落到以下读侧层次：

1. `DetailQuery`
   支撑工作区详情、按钮守卫、当前摘要和阻断解释。

2. `AggregateViewQuery`
   支撑项目经营总览、提成阶段总览、项目汇总 + 合同拆解双视角。

3. `HistoryQuery`
   支撑版本替代、复核结论、审批记录、确认记录和审计追溯。

### 3.3 DTO 与字段包规则

第一批专题统一采用以下 DTO 规则：

1. 高敏字段包不得进入普通 `PatchDto`。
2. 命令请求 DTO 只携带当前动作所需的最小字段。
3. 命令响应 DTO 只返回动作结果、关键引用和后续入口，不回传整份聚合详情。
4. 敏感读侧字段必须通过角色边界落成完整值、摘要值或遮罩占位，不能因为“这是详情页”就默认回传完整值。

### 3.4 数据模型规则

第一批专题统一要求以下模型特征：

1. 有效事实与草稿事实分层。
2. 快照、版本、替代、冲销和复核链可追溯。
3. 所有会改变有效事实的动作都具备 `expectedVersion` 或等价并发控制。
4. 审批 / 确认 / 审计引用不通过页面拼接生成，而是能落到稳定对象关系。

---

## 4. 第一批六专题实现映射总表

| 包   | 专题                                                | 写侧实现重点                                                               | 读侧实现重点                                                         | DTO / 守卫重点                                             | 数据模型重点                                            |
| ---- | --------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `B1` | 多合同项目主假设与冻结模式                          | 合同生效、变更生效、移交确认、提成冻结时写入项目级冻结模式与合同集合引用   | `L3/L4/L5` 同时支持项目汇总与合同拆解；禁止在提成页改冻结模式        | 冻结模式不进入普通更新 DTO；详情页返回模式摘要和来源引用   | 项目与当前有效合同集合、冻结记录、模式来源引用可追溯    |
| `B2` | `签约就绪 -> ContractTermSnapshot / ReceivablePlan` | 从 `签约就绪` 结构化承接包初始化 `ContractTermSnapshot` / `ReceivablePlan` | `签约就绪` 页面展示当前承接包状态、是否可初始化和阻断原因            | 初始化字段包不得由合同页手工拼装；合同页只消费结构化包引用 | 需要承接包引用、初始化结果、计划版本链                  |
| `B3` | 商业放行基线与合同差异校验                          | 报价评审放行后固化商业放行基线；合同生效前完成差异校验与复核留痕           | `报价与毛利评审`、`签约就绪`、合同详情都要显示差异等级和复核状态     | 差异字段、差异等级、复核结论不能藏在普通备注字段里         | 商业放行基线、差异结果、复核记录和退回链可追溯          |
| `B4` | 第二阶段验收 / 阶段成果确认对象                     | `AcceptanceRecord` 统一确认；第二阶段发放申请必须引用有效记录              | 阶段总览、发放路径、审批摘要显示有效 `AcceptanceRecord` 与证据链摘要 | 第二阶段命令 DTO 必须携带 `acceptanceRecordId` 或等价引用  | `AcceptanceRecord` 类型、证据引用、确认链与发放申请关联 |
| `B5` | `internalCostRate` 治理基线                         | 成本率版本发布、人力成本记录归集、替代记录 / 重算候选                      | 成本详情和经营聚合只消费有效版本；非授权角色仅看摘要                 | `internalCostRate`、`rateVersionId` 不进入普通协作页面 DTO | 成本率版本链、有效期、`LABOR` 记录与版本引用、替代链    |
| `B6` | 敏感数据主边界与最小可见集                          | 导出、打印、审批摘要、详情返回都走角色边界守卫                             | `L1/L4/L5` 查询视图返回完整值 / 摘要值 / 遮罩占位                    | 列表 / 详情 / 审批 DTO 必须区分敏感字段包与可见等级        | 字段包不一定单独建表，但必须能在查询层稳定映射          |

---

## 5. 分专题实现映射

### 5.1 `B1` 多合同项目主假设与冻结模式

#### 写侧建议

- 继续复用并补强以下命令：
  - `activateContract`
  - `activateContractAmendment`
  - `confirmProjectHandover`
  - `freezeCommissionRoleAssignment`
- 在 `confirmProjectHandover` 或与之紧邻的冻结动作中，固化：
  - `receiptJudgmentMode`
  - 当前有效合同集合引用
  - 模式来源记录

#### 读侧建议

- 补齐或下钻以下读模型：
  - `ContractToHandoverDetailView`
  - `ProjectOperatingView`
  - `CommissionStageGateView`
- 三者都必须同时支持：
  - 项目汇总视角
  - 合同拆解视角
  - 冻结模式来源回溯

#### DTO / 守卫建议

- `receiptJudgmentMode` 禁止通过普通 `PATCH` 更新。
- 提成阶段页只返回冻结模式、模式来源和当前达标摘要，不提供改模式写入口。

#### 数据模型建议

- 至少能稳定表达：
  - `projectId -> effectiveContractSet`
  - `projectId -> frozenReceiptJudgmentMode`
  - `frozenReceiptJudgmentMode -> sourceHandoverId / sourceFreezeId`

### 5.2 `B2` `签约就绪 -> ContractTermSnapshot / ReceivablePlan` 结构化承接

#### 写侧建议

- 需要补一组承接型动作或系统派生步骤：
  - 生成签约就绪承接包
  - 基于承接包初始化 `ContractTermSnapshot`
  - 基于承接包初始化 `ReceivablePlan`
- 这些动作不应退化为“合同页手工重填全部字段”。

#### 读侧建议

- `签约就绪` 详情必须返回：
  - 当前承接包引用
  - 是否允许初始化正式合同 / 应收计划
  - 初始化状态
  - 阻断原因

#### DTO / 守卫建议

- 普通合同草稿 DTO 不得直接带入正式 `ContractTermSnapshot` 生效字段。
- 若存在“初始化”命令，请求 DTO 只允许：
  - 承接包引用
  - `expectedVersion`
  - 必要说明字段

#### 数据模型建议

- 至少应有以下稳定引用：
  - `contractReadinessPackageId`
  - `sourceReadinessId`
  - `sourceBaselineId`
  - `receivablePlanInitResult`

### 5.3 `B3` 商业放行基线与合同差异校验

#### 写侧建议

- 继续复用：
  - `submitQuotationReview`
  - `submitContractReview`
  - `activateContract`
- 建议补一个受控复核动作，至少能记录：
  - 差异等级
  - 复核角色
  - 复核结论
  - 是否允许继续进入合同主链

#### 读侧建议

- 以下页面至少都要消费同一份差异结果：
  - `报价与毛利评审`
  - `签约就绪`
  - 合同详情 / 生效入口
- 不允许一个页面显示“需复核”，另一个页面只显示“已放行”。

#### DTO / 守卫建议

- 差异字段不得塞进普通合同备注。
- `activateContract` 前应校验：
  - 是否已完成差异校验
  - `需复核` 是否已有结论
  - `必须重审` 是否已退回并产出新基线

#### 数据模型建议

- 至少补齐或稳定以下对象关系：
  - `commercialReleaseBaselineId`
  - `baselineDiffStatus`
  - `baselineDiffLevel`
  - `baselineReviewCompletedAt`
  - `baselineReviewDecision`

### 5.4 `B4` 第二阶段验收 / 阶段成果确认对象

#### 写侧建议

- 继续复用并补强：
  - `confirmAcceptance`
  - `submitCommissionPayoutApproval`
  - `registerCommissionPayout`
- 第二阶段发放链必须显式引用有效 `AcceptanceRecord`，不能再录入自由文本“已验收”。

#### 读侧建议

- `CommissionStageGateView` 与发放申请详情至少返回：
  - 当前有效 `AcceptanceRecord`
  - `acceptanceType`
  - 证据链摘要
  - 是否满足第二阶段发放条件

#### DTO / 守卫建议

- 第二阶段发放审批请求 DTO 建议增加：
  - `acceptanceRecordId`
  - `evidenceSummary`
  - `expectedVersion`
- 对 `最终验收` 类型记录不得直接拿来替代第二阶段前置。

#### 数据模型建议

- 必须能稳定表达：
  - `AcceptanceRecord.acceptanceType`
  - `AcceptanceRecord -> evidenceRefs`
  - `CommissionPayout -> acceptanceRecordId`

### 5.5 `B5` `internalCostRate` 治理基线

#### 写侧建议

- 第一批实现前需要补出至少一组成本率治理动作：
  - 发布成本率版本
  - 归集 `LABOR` 成本记录
  - 必要时创建替代记录 / 重算候选
- 这些动作当前还未在 `interface-command-design.md` 中显式列出，是实现映射阶段必须补的缺口。

#### 读侧建议

- `ProjectActualCostRecordDetailView` 需要支持：
  - `rateVersionId`
  - 生效区间
  - 计算依据
  - 替代关系摘要
- `ProjectOperatingView` 只消费项目级 `LABOR` 汇总，不直接下钻到人员级成本率明细。

#### DTO / 守卫建议

- `internalCostRate`、`rateValue`、`effectiveFrom`、`effectiveTo` 不得混入普通协作页的可编辑 DTO。
- `LABOR` 记录请求 DTO 应至少携带：
  - `rateVersionId`
  - `laborPeriodStart`
  - `laborPeriodEnd`
  - `laborQuantity`

#### 数据模型建议

- 至少需要稳定表达：
  - `InternalCostRateVersion`
  - `ProjectActualCostRecord.rateVersionId`
  - `supersedesRateVersionId`
  - 历史替代 / 重算候选链

### 5.6 `B6` 敏感数据主边界与最小可见集

#### 写侧建议

- 第一批不要求新增完整权限引擎，但实现阶段必须补：
  - 导出单独授权入口
  - 审批摘要字段裁剪
  - 详情 / 聚合查询的字段守卫

#### 读侧建议

- 至少需要明确以下读模型的可见等级输出：
  - `PricingReviewDetailView`
  - `ContractReadinessDetailView`
  - `ProjectOperatingView`
  - `CommissionStageGateView`
  - `CommissionPayoutDetailView`
- 每个读模型都应能对敏感字段返回：
  - 完整值
  - 摘要值
  - 遮罩占位

#### DTO / 守卫建议

- 需要在查询响应层稳定区分：
  - 字段值本身
  - 字段可见等级
  - 导出 / 打印是否允许
- 建议补统一的字段包守卫或视图投影策略，避免每个页面各写一套 if/else。

#### 数据模型建议

- 第一批不强制把字段包单独落表，但至少应稳定沉淀：
  - 角色到字段包的映射配置来源
  - 审批场景最小字段包清单
  - 导出审计留痕对象

---

## 6. 对现有实现设计文档的补点建议

第一批继续作为全主线实现设计输入前，建议至少把以下补点写回实现设计总文档：

1. `interface-command-design.md`
   补第二阶段第一批专用命令，尤其是：
   - 商业放行基线复核
   - 承接包初始化
   - 成本率版本发布 / 替代

2. `interface-openapi-dto-design.md`
   补第二阶段第一批 DTO 边界，尤其是：
   - 差异校验 / 复核 DTO
   - `AcceptanceRecord` 引用 DTO
   - `LABOR` 记录与成本率版本 DTO
   - 字段可见等级投影规则

3. `query-view-boundary-design.md`
   补第二阶段第一批查询视图，尤其是：
   - `PricingReviewDetailView`
   - `ContractReadinessDetailView`
   - `ProjectOperatingView` 的敏感字段投影规则
   - `CommissionStageGateView`

4. `data-model-prerequisites.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md`
   补第一批涉及的版本、快照、差异结果、冻结记录、证据链、成本率版本和导出审计对象。

---

## 7. 继续推进全主线实现设计前的最小检查项

继续推进第二阶段全主线实现设计之前，建议至少确认以下事项：

1. 六个专题都能映射到明确的 command / query / DTO / 数据模型补点。
2. 第一批没有仍停留在“页面手工处理”的核心有效事实。
3. 敏感字段边界已经能落到查询投影，而不是只停留在原则文档。
4. 第二阶段发放、合同生效、人力成本归集这三条高风险链路，已经明确前提校验、写侧入口和历史追溯关系。

---

## 8. 当前结论

第一批六个专题当前已经不再缺业务规则收口，下一步也不应继续回到“再看一轮文档”。

更合理的推进方式是：

1. 先按本文档把六个专题映射到 command、query、DTO、表结构与守卫补点。
2. 再决定哪些补点需要直接写回实现设计总文档，哪些需要继续补齐到第二阶段总实现设计矩阵。
3. 在上述映射准备完成后，再进入第二批经营与成本可信源专题。

### 8.1 与整个第二阶段实现设计层的关系

本文档只覆盖第一批 6 个专题，并不意味着第二阶段的实现设计层只会做这 6 个问题。

它的真实定位是：

1. 先把会决定实现方向的第一批专题下钻到实现设计层。
2. 用第一批的下钻结果判断主对象、主事实、主链路和敏感边界是否已经稳定到足以继续推动其余主线实现设计。
3. 第一批稳定后，再按同样方法推动第二批专题进入实现设计层。
4. 第三批、第四批是否继续下钻，取决于前两批是否已把主事实稳定下来，以及是否仍在当前范围内。

因此，第二阶段虽然最终需要在 `L1 ~ L5` 全主线实现设计完成后再统一判断是否进入开发，但实现设计本身仍然可以按风险和依赖顺序逐步下钻。

第二阶段实现设计层的正确理解应是：

- 第一批先下钻，解决方向级和主事实级问题
- 第二批随后下钻，补经营与成本可信源
- 第三批、第四批按前置稳定程度继续滚动进入

当前先做第一批 6 个专题的实现映射，不是因为第二阶段其余内容不做，而是因为其余内容不应在主事实未稳定时倒序展开，也不代表可以直接跳过全主线实现设计而先行启动开发。
