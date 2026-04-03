# POMS 查询视图边界设计

**文档状态**: Active
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第一阶段读侧边界基线，以及第二阶段第一批、第二批、第三批实现映射写回前的查询视图补点约束
**关联文档**:

- 上游设计:
  - `poms-requirements-spec.md`
  - `poms-hld.md`
  - `poms-design-progress.md`
  - `design-review-follow-up-summary.md`
  - `phase2-first-batch-implementation-mapping.md`
  - `phase2-second-batch-implementation-mapping.md`
  - `phase2-third-batch-implementation-mapping.md`
- 同级设计:
  - `interface-command-design.md`
  - `interface-openapi-dto-design.md`
  - `data-model-prerequisites.md`
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `business-authorization-matrix.md`
  - `phase2-data-permission-and-sensitive-visibility-design.md`

---

## 1. 文档目标

本文档用于在写侧边界已经初步稳定后，补齐第一阶段读侧基线，重点回答以下问题：

- 哪些查询属于列表、详情、经营看板、统一待办或审计视图
- 查询接口返回的是“读模型 / 视图模型”，还是直接暴露写模型
- 哪些字段是聚合输出，哪些字段仍应以对象事实为准
- 查询视图对表结构冻结提出哪些约束

本文档不是最终查询 API 清单，也不直接给出最终 SQL 或报表实现；它的作用是先冻结“读侧需要什么边界”，避免后续表结构冻结时只围绕写侧对象落表而忽略实际查询需求。

补充当前阶段判断：

- 本文档当前必须直接服务于平台治理域与提成治理域的第一阶段补齐实施
- 因此需要把平台治理页、提成治理页和平台主数据聚合查询正式纳入第一阶段读侧边界
- 第二阶段第一批六个专题已经完成写回，第二批七个专题也已进入实现映射，因此还需要补齐差异复核、承接包、验收前置、成本率治理，以及分摊、归属、税务、时点快照与 gate 绑定等读侧视图

---

## 2. 查询视图设计总原则

第一阶段建议统一采用以下读侧原则：

1. 查询接口返回视图模型，不直接把写模型或数据库实体原样透出。
2. 视图模型可以聚合多个稳定事实源，但不得反向定义事实源本身。
3. 列表视图、详情视图、经营看板视图、统一待办视图分层设计，不混成一个全能 DTO。
4. 所有高敏状态推进结果，以写侧命令完成后的事实为准；查询接口只负责展示，不承担隐式修正。
5. 草稿态事实与生效态事实如需同屏展示，必须显式区分来源与口径，不能混算。
6. 查询接口优先围绕稳定业务对象、审批实例、确认实例和派生汇总结果组织，不围绕临时页面拼装字段组织。

---

## 3. 第一阶段查询视图分类基线

第一阶段建议至少固定以下五类查询视图：

| 视图类型            | 主要用途                   | 是否允许聚合跨对象字段 | 典型返回粒度             | 设计约束                               |
| ------------------- | -------------------------- | ---------------------- | ------------------------ | -------------------------------------- |
| 列表视图            | 支撑筛选、分页、入口导航   | 是                     | 一行一个对象摘要         | 仅返回列表展示与筛选必需字段           |
| 详情视图            | 支撑单对象查看与按钮守卫   | 是                     | 一次返回一个对象聚合详情 | 明确区分主体事实、派生摘要、可执行动作 |
| 经营看板视图        | 支撑项目经营观察与跨域汇总 | 是                     | 一次返回一个经营聚合视图 | 汇总口径必须标明是否仅统计已生效事实   |
| 统一待办视图        | 支撑审批 / 确认处理入口    | 是                     | 一行一个待办项           | 只表达当前可处理动作，不替代业务详情   |
| 审计 / 动作历史视图 | 支撑追溯、对账、复盘       | 否或弱聚合             | 一行一个动作事实         | 不应被普通列表 DTO 吞并                |

---

## 4. 视图模型与事实源边界

### 4.1 允许作为视图聚合输出的字段

以下字段类型允许出现在查询视图中，但默认视为聚合输出，而不是持久化事实源：

- `currentApprovalSummary`
- `currentConfirmationSummary`
- `todoSummary`
- `latestContractSummary`
- `receivableProgressSummary`
- `invoiceProgressSummary`
- `commissionProgressSummary`
- `allowedActions`
- `riskFlags`
- `orgPathDisplayName`

说明：

- 这些字段可以由多个稳定对象拼装得到。
- 它们可作为前端展示输入，但不能反推底层一定存在同名实体字段。

### 4.2 必须回到稳定事实源的字段

以下字段类型必须能追溯到稳定事实源，不应只存在于聚合视图：

- 项目主状态、关闭状态、当前阶段
- 合同当前状态、生效快照、当前有效版本
- 签约前回退请求、已失效结论摘要、当前有效结论链与工作区重开结果
- 回款确认结果、付款确认结果、发票异常 / 关闭结果
- 提成计算版本、发放记录、冲销与重算关系
- 审批场景、摘要包、摘要快照版本、投影级别与导出策略
- 审批实例状态、确认实例状态、动作留痕时间与处理人

---

## 5. 第一阶段核心查询视图建议

### 5.1 销售流程域

| 查询视图                    | 主要对象          | 目标                         | 最小字段组                                                                                                                                                                                                                                                  | 额外约束                                                                                                          |
| --------------------------- | ----------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ProjectListView`           | `Project`         | 支撑项目列表与筛选           | `projectCode`、`projectName`、`customerName`、`currentStage`、`ownerOrgName`、`ownerName`、`latestMilestoneAt`                                                                                                                                              | 不携带完整合同与提成明细                                                                                          |
| `ProjectDetailView`         | `Project`         | 支撑项目详情页               | 主体字段、阶段摘要、当前投标摘要、当前合同摘要、当前审批 / 确认摘要、`summarySnapshotId`、`projectionLevel`、`allowedActions`                                                                                                                               | 总览卡片中的审批摘要必须回到当前场景的 `summarySnapshotId / projectionLevel / exportPolicy`，不得重新裁剪详情字段 |
| `BidProcessDetailView`      | `BidProcess`      | 支撑投标子流程详情           | 投标基本信息、当前决策状态、结果状态、相关审批摘要、附件摘要                                                                                                                                                                                                | 不代替 `ProjectDetailView`                                                                                        |
| `ProjectTimelineView`       | `Project`         | 支撑阶段里程碑追溯           | 关键动作时间线、动作人、动作结果、关联审批 / 确认引用                                                                                                                                                                                                       | 以动作事实为主，不以列表字段拼装                                                                                  |
| `ProjectHandoverDetailView` | `ProjectHandover` | 支撑正式移交确认与强节点追溯 | `effectiveContractSetSummary`、`contractSummarySnapshotId`、`currentHandoverBaselineSummary`、`participantConfirmationSummary`、`receiptJudgmentModeSummary`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`allowedActions` | 参与角色确认区、通知、打印材料与审计摘要必须共享同一份 `summarySnapshotId`                                        |
| `PricingReviewDetailView`   | `QuotationReview` | 支撑商业放行与毛利评审详情   | 基线摘要、差异等级、复核状态、`approvalScenarioKey`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、敏感字段投影后的毛利摘要、`allowedActions`                                                                                | 必须与合同差异复核使用同一份差异结果，且审批通知、打印材料与导出预览必须共享同一份 `summarySnapshotId`            |

### 5.2 合同资金域

| 查询视图                            | 主要对象                        | 目标                             | 最小字段组                                                                                                                                                                                                                                             | 额外约束                                                                                           |
| ----------------------------------- | ------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `ContractListView`                  | `Contract`                      | 支撑合同台账列表                 | `contractNo`、`projectCode`、`projectName`、`contractStatus`、`signedAmount`、`effectiveAt`                                                                                                                                                            | 金额字段必须标明当前口径                                                                           |
| `ContractDetailView`                | `Contract`                      | 支撑合同详情                     | 主体事实、当前有效条款快照摘要、变更版本摘要、应收计划摘要、回款汇总摘要、发票汇总摘要、`allowedActions`                                                                                                                                               | 快照字段与主表草稿字段应分区展示                                                                   |
| `ContractHandoverSummaryView`       | `Project`                       | 支撑合同承接摘要进入移交确认     | `effectiveContractSetSummary`、`contractBaselineValidationSummary`、`currentHandoverBaselineSummary`、`latestHandoverRebaselineSummary`、`receivablePlanInitSummary`、`contractSummarySnapshotId`、`projectionLevel`、`exportPolicy`、`allowedActions` | 输出给移交确认的合同承接摘要必须与通知、打印材料和项目级总览共享同一份 `contractSummarySnapshotId` |
| `ContractReadinessDetailView`       | `ContractReadinessPackage`      | 支撑签约就绪承接与初始化阻断解释 | 承接包摘要、`commercialReleaseBaselineId`、差异等级、初始化状态、阻断原因、`currentEffectiveDecisionSummary`、`allowedActions`                                                                                                                         | 承接包、初始化结果与签约前当前有效结论链必须可追溯到同一来源                                       |
| `ContractDiffReviewHistoryView`     | `CommercialReleaseBaselineDiff` | 支撑差异复核历史追溯             | 差异字段摘要、差异等级、复核结论、处理人、处理时间、退回链摘要                                                                                                                                                                                         | 不得与合同普通历史混成单一时间线                                                                   |
| `ReceivablePlanListView`            | `ReceivablePlan`                | 支撑应收计划列表                 | `planNo`、`contractNo`、`plannedAmount`、`plannedAt`、`planStatus`、`version`                                                                                                                                                                          | 列表中不展开全部节点明细                                                                           |
| `ReceiptRecordListView`             | `ReceiptRecord`                 | 支撑回款登记与确认列表           | `receiptNo`、`projectName`、`contractNo`、`registeredAmount`、`confirmedAmount`、`recordStatus`、`sourceType`                                                                                                                                          | 草稿金额与确认金额不得混用                                                                         |
| `InvoiceRecordListView`             | `InvoiceRecord`                 | 支撑发票台账列表                 | `invoiceNo`、`projectName`、`invoiceAmount`、`invoiceStatus`、`exceptionStatus`                                                                                                                                                                        | 异常状态为派生展示，不替代动作记录                                                                 |
| `ProjectActualCostRecordDetailView` | `ProjectActualCostRecord`       | 支撑人力成本归集与替代追溯       | `costType`、`rateVersionId`、生效区间、计量依据摘要、替代关系摘要、`allowedActions`                                                                                                                                                                    | 详情默认不向无权角色下钻人员级成本率原值                                                           |

### 5.3 提成治理域

| 查询视图                             | 主要对象                   | 目标                                     | 最小字段组                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 额外约束                                                                                                                                          |
| ------------------------------------ | -------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CommissionCalculationListView`      | `CommissionCalculation`    | 支撑计算结果列表                         | `calculationNo`、`projectName`、`ruleVersionName`、`calculationStatus`、`calculatedAmount`、`version`                                                                                                                                                                                                                                                                                                                                                                                                                                          | 列表只展示当前结果摘要                                                                                                                            |
| `CommissionCalculationDetailView`    | `CommissionCalculation`    | 支撑计算详情                             | 输入快照摘要、角色分配摘要、结果摘要、重算链摘要、审批摘要                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 输入来源必须可追溯到快照或版本                                                                                                                    |
| `CommissionRoleAssignmentDetailView` | `CommissionRoleAssignment` | 支撑冻结版本确认与统一收口链追溯         | `freezeVersionSummary`、`sourceHandoverId`、`contractSummarySnapshotId`、`handoverSummarySnapshotId`、`effectiveHandoverBaselineSummary`、`receiptJudgmentModeSummary`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`allowedActions`                                                                                                                                                                                                                                                                          | 冻结确认页、通知、打印材料与导出预览必须共享同一份冻结摘要 `summarySnapshotId`，且必须可回溯到 `handoverSummarySnapshotId`                        |
| `CommissionStageGateView`            | `Project`                  | 支撑阶段门槛、最终结算与冻结模式总览     | 冻结模式摘要、有效合同集合摘要、`freezeVersionSummary`、`handoverSummarySnapshotId`、`contractSummarySnapshotId`、`baselineSelectionSource`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`freezeDisputeSummary`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、阶段一 / 阶段二 / 最终结算 / 质保金结算状态、`acceptanceRecordSummary`、`nextActionSummary`、`allowedActions` | gate 总览、第二阶段发放审批、异常调整审批、冻结争议通知、打印材料与导出预览必须共享同一份 `summarySnapshotId`，且不得回退到详情页临时拼装经营依据 |
| `CommissionPayoutListView`           | `CommissionPayout`         | 支撑发放列表                             | `payoutNo`、`projectName`、`approvedAmount`、`paidAmount`、`payoutStatus`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 批准金额与实际登记金额并列但不可混算                                                                                                              |
| `CommissionPayoutDetailView`         | `CommissionPayout`         | 支撑发放详情、最终结算与第二阶段前置校验 | 发放阶段、审批摘要、`freezeVersionSummary`、`baselineSelectionSource`、`acceptanceRecordSummary`、证据链摘要、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、异常 / 冲销摘要、`allowedActions`                                                                                                                                    | 分阶段发放、最终结算与质保金结算详情必须能解释当前依据链，而不是只回传状态码                                                                      |
| `CommissionAdjustmentHistoryView`    | `CommissionAdjustment`     | 支撑异常调整追溯                         | `adjustmentType`、`relatedTargetType`、`relatedTargetId`、`resultStatus`、`freezeVersionSummary`、`replacementFreezeVersionSummary`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summarySnapshotId`、`handledAt`                                                                                                                                                                                           | 异常调整必须同时保留原发放记录引用与统一经营依据链，不能覆盖原动作事实                                                                            |
| `CommissionFinalSettlementView`      | `Project`                  | 支撑最终结算 / 质保金结算收口            | `finalSettlementStatus`、`nonRetentionSettlementStatus`、`retentionSettlementStatus`、`retentionRequirementSummary`、`retentionReceiptSummary`、`departureExceptionSummary`、`freezeVersionSummary`、`baselineSelectionSource`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`allowedActions`                                   | 必须显式区分非质保部分结清与质保金待结算 / 可结算，不得压平成单一“已完成”状态                                                                     |
| `CommissionRuleExplanationView`      | `Project`                  | 支撑统一规则解释与中文表达               | `currentStageStatus`、`blockingReasonCategory`、`blockingReasonSummary`、`gateDecisionSummary`、`nextActionSummary`、`freezeVersionSummary`、`baselineSelectionSource`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`allowedActions`                                                                                           | 统一解释页只做中文表达映射，不得改写同一依据链在 gate / 发放 / 结算页的含义                                                                       |

第二阶段第二批提成制度化查询还需统一以下补充约束：

- `CommissionStageGateView`、`CommissionPayoutDetailView`、`CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` 必须共同消费冻结版本引用、`baselineSelectionSource`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel` 与 `exportPolicy` 这组正式输入 / 输出包，不得让四个工作区各自重算经营依据。
- `CommissionRuleExplanationView` 输出的阻断原因分类、动作摘要与中文提示语，必须来自稳定原因码与场景摘要快照，不得由前端根据 `allowedActions`、备注或英文技术字段重新拼接。
- 若当前阶段引用的是历史经营快照，`CommissionStageGateView`、`CommissionPayoutDetailView` 与 `CommissionFinalSettlementView` 必须继续显式返回 `referencedSnapshotVersion` 与 `baselineSelectionSource`，并在展示层投影成中文快照表达，不得回挂最新经营结果重算。

### 5.3A 平台治理域

| 查询视图                       | 主要对象         | 目标                      | 最小字段组                                                                                                  | 额外约束                                 |
| ------------------------------ | ---------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `PlatformUserListView`         | `User`           | 支撑用户管理列表          | `username`、`displayName`、`email`、`phone`、`isActive`、`primaryOrgUnitName`、`roleNames`                  | 不展开完整组织树与权限全集               |
| `PlatformUserDetailView`       | `User`           | 支撑用户详情与关系维护    | 主体字段、主责组织、附属组织摘要、当前角色摘要、`allowedActions`                                            | `allowedActions` 为聚合输出，不是事实源  |
| `PlatformRoleListView`         | `Role`           | 支撑角色列表              | `roleKey`、`name`、`isActive`、`isSystemRole`、`permissionCount`                                            | 权限明细不在列表全量展开                 |
| `PlatformRoleDetailView`       | `Role`           | 支撑角色详情与权限维护    | 主体字段、权限摘要、被引用用户数、`allowedActions`                                                          | 权限字典只读事实源需可追溯               |
| `OrgUnitTreeView`              | `OrgUnit`        | 支撑组织树维护            | `id`、`name`、`code`、`isActive`、`displayOrder`、`children`                                                | 组织树是正式读模型，不复用轻量 `UnitOrg` |
| `OrgUnitDetailView`            | `OrgUnit`        | 支撑组织详情              | 主体字段、父节点摘要、子节点摘要、挂靠用户数量、`allowedActions`                                            | 不在详情中平铺所有用户列表               |
| `NavigationGovernanceListView` | `NavigationItem` | 支撑导航治理列表 / 树视图 | `key`、`title`、`type`、`link`、`displayOrder`、`isHidden`、`isDisabled`、`requiredPermissions`、`children` | 不引入前端框架私有字段                   |

### 5.3B 第二阶段第二批经营可信源查询补点

| 查询视图                             | 主要对象                                 | 目标                                                   | 最小字段组                                                                                                                                                                                                                                                                                                                                                                                                                            | 额外约束                                                                            |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `SharedCostAllocationDetailView`     | `SharedCostAllocationResult`             | 支撑共享分摊详情与项目份额解释                         | `basisSummary`、`sourceCostRecordSummary`、`allocatedProjectShares`、`supersedesSummary`、`allowedActions`                                                                                                                                                                                                                                                                                                                            | 不得退回来源单据全额视图覆盖项目级分摊结果                                          |
| `CostStageAttributionHistoryView`    | `CostStageAttributionSnapshot`           | 支撑阶段归属锁定与重分类历史                           | `attributedStage`、`stageAttributionMode`、`lockedBySnapshotSummary`、`reclassifyReason`、`supersedesSummary`                                                                                                                                                                                                                                                                                                                         | 必须区分当前归属与历史归属，不把重分类链压平成当前值                                |
| `AccountingTaxTreatmentDetailView`   | `AccountingTaxTreatmentSnapshot`         | 支撑税务处理与经营核算口径解释                         | `taxTreatmentType`、`deductibilityStatus`、`taxImpactAmountSummary`、`taxImpactSummary`、`taxPendingFlag`、`supersedesSummary`                                                                                                                                                                                                                                                                                                        | 对无权角色继续只返回摘要化税务影响                                                  |
| `OperatingBaselineBridgeView`        | `OperatingBaselinePackage`               | 支撑原始基线、移交前再基线化、变更包基线与当前基线桥接 | `originalBaselineSummary`、`handoverRebaselineSummary`、`changePackageBaselineSummary`、`effectiveOperatingBaselineSummary`、`varianceSourceSummary`                                                                                                                                                                                                                                                                                  | 不能把移交前再基线化吸收与执行期变更包都压进单一“当前预算”字段                      |
| `ProjectOperatingAsOfView`           | `ProjectOperatingSnapshot`               | 支撑 `realtime / period-end / restated` 三类经营回看   | `asOfMode`、`snapshotAt`、`periodEndSnapshotSummary`、`restatementSummary`、`restatedFromSnapshotSummary`、`referencedBaselineVersion`、`baselineSelectionSource`、`handoverRebaselineSummary`、`grossMarginSummary`、`riskFlags`                                                                                                                                                                                                     | 必须显式返回当前视图口径与引用基线来源，禁止前端默认把实时口径当历史                |
| `OperatingSignalEvaluationView`      | `OperatingSignalEvaluationResult`        | 支撑经营公式边界、成熟度与风险信号解释                 | `formulaBoundaryAction`、`signalLevel`、`taxImpactSummary`、`allocationStabilitySummary`、`unmappedCostSummary`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`reviewRequired`、`reviewSummary`                                                                                                                                                   | 系统结果与人工复核结论要分层展示，且必须保留 `L2` 正式输入包来源                    |
| `CommissionGateBindingHistoryView`   | `OperatingSignalToCommissionGateBinding` | 支撑 `L4 -> L5` gate 绑定结果与复核追溯                | `signalLevel`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`baselineSelectionSource`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`bindingAction`、`gateReviewDecision`、`blockingReasonSummary`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`nextActionSummary`、`handledBy`、`handledAt`、`allowedActions` | `BLOCK` / `REVIEW` 来源必须可追溯到稳定绑定结果，且 `L5` 必须消费同一份场景摘要快照 |
| `ProjectBusinessOutcomeOverviewView` | `Project`                                | 支撑 `L4-T01` 项目经营结果总览                         | `effectiveContractSetSummary`、`receivableConfirmedAmountSummary`、`includedCostTotalSummary`、`currentEffectiveBaselineCostSummary`、`grossMarginSummary`、`taxImpactSummary`、`allocationStabilitySummary`、`unmappedCostSummary`、`dataMaturityLevel`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`allowedActions`                                                                            | 必须直接消费 `L2` 稳定输出，不得在总览页重新派生成本侧动作等级                      |
| `ProjectUnifiedAccountingView`       | `ProjectOperatingSnapshot`               | 支撑 `L4-T02` 统一核算口径与时点快照                   | `originalBaselineCostSummary`、`currentEffectiveBaselineCostSummary`、`includedCostTotalSummary`、`receivableConfirmedAmountSummary`、`taxImpactSummary`、`taxImpactPendingAmount`、`allocationStabilitySummary`、`unmappedCostSummary`、`dataMaturityLevel`、`costActionRecommendation`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`allowedActions`                                                                  | 同一口径快照除金额外还必须固定税务 / 成本成熟度 / 快照版本解释                      |
| `ProjectVarianceRiskExplanationView` | `OperatingSignalEvaluationResult`        | 支撑 `L4-T03` 偏差与风险解释                           | `varianceSourceSummary`、`riskLevel`、`taxImpactSummary`、`allocationStabilitySummary`、`unmappedCostSummary`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`recommendedActionSummary`、`allowedActions`                                                                                                                                          | 解释结果必须与当前动作等级一起输出，不得拆给下游页面再派生                          |
| `BusinessAccountingFeedbackView`     | `OperatingSignalToCommissionGateBinding` | 支撑 `L4-T04` 经营核算反哺与下游输入                   | `signalLevel`、`currentActionLevel`、`taxImpactSummary`、`allocationStabilitySummary`、`unmappedCostSummary`、`dataMaturityLevel`、`costActionRecommendation`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`nextActionSummary`、`downstreamConsumerSummary`、`allowedActions`                                                                                                                                           | `L5`、项目总览与关闭复盘必须共享同一份反馈输出，不得各自重算                        |

补充约束：

- `ProjectOperatingAsOfView` 是技术命名，不得直接作为页面标题或用户提示语
- 查询视图返回 `asOfMode`、`snapshotAt`、`periodEndSnapshotSummary`、`restatementSummary` 后，前端投影层必须转换成 `当前实时结果 / 期末冻结快照 / 重述快照`、`快照时点`、`期末快照版本`、`重述原因 / 被替代快照版本` 再展示给用户
- 若当前视图是历史回看，不得只返回当前值而缺失 `快照时点`、`期末快照版本` 或 `重述原因` 等最小解释字段
- `realtime` 口径必须返回当前有效经营基线摘要；若执行期起点来自移交前再基线化，还必须同时返回 `handoverRebaselineSummary`，不得把再基线化吸收静默并入“当前基线”
- `period-end` 口径必须固定返回生成该快照时引用的 `referencedBaselineVersion` 与 `baselineSelectionSource`，不得在查询时回挂最新基线重算历史结果
- `restated` 口径必须同时返回 `periodEndSnapshotSummary`、`restatementSummary`、`restatedFromSnapshotSummary` 与 `handoverRebaselineSummary`（如有），确保“原期末快照 -> 重述记录 -> 新快照 -> 引用基线”可完整追溯
- 若移交前再基线化或历史重述链尚未收口，`ProjectOperatingAsOfView` 必须通过 `riskFlags` 返回待确认状态，不得把该结果投影成稳定历史经营口径
- `AccountingTaxTreatmentDetailView`、`OperatingSignalEvaluationView` 与 `CommissionGateBindingHistoryView` 必须能对齐还原同一份 `L2` 稳定输出包；若 `L4 / L5` 直接消费 gate 绑定结果，则不得再从其他页面二次拼接税务 / 成本解释
- `CommissionGateBindingHistoryView` 的 `allowedActions` 只能在 `taxImpactSummary`、`dataMaturityLevel`、`costActionRecommendation`、`referencedBaselineVersion`、`referencedSnapshotVersion` 一并齐备时生成，缺任一字段时应回落为阻断或待复核，而不是默认放行
- `ProjectBusinessOutcomeOverviewView`、`ProjectUnifiedAccountingView`、`ProjectVarianceRiskExplanationView` 与 `BusinessAccountingFeedbackView` 必须共同承接 `taxImpactSummary`、`allocationStabilitySummary`、`unmappedCostSummary`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion` 与 `referencedSnapshotVersion` 这组正式输入 / 输出包，不得让四个工作区各自重算成本侧结论
- `L4-T01 / T02 / T03 / T04` 若对下游输出的是 `PROMPT / REVIEW / BLOCK` 动作等级，则必须连同税务影响摘要、成本数据成熟度状态、成本侧动作建议与引用基线 / 快照版本一起输出，不得只留下抽象动作等级
- `CommissionGateBindingHistoryView` 输出给 `L5` 时，必须继续绑定 `summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy` 与 `nextActionSummary`；gate、发放、最终结算与规则解释页只能沿用这组场景摘要快照，不得在下游再生成另一套摘要口径

### 5.3C 第二阶段第三批异常链路与审批增强查询补点

| 查询视图                                | 主要对象                           | 目标                                       | 最小字段组                                                                                                                                                         | 额外约束                                                                                               |
| --------------------------------------- | ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `ContractHandoverRebaselineHistoryView` | `ContractHandoverRebaselineRecord` | 支撑合同变更再基线化历史追溯               | `contractAmendmentSummary`、`rebaselineReason`、`affectedHandoverItemSummary`、`effectiveBaselineAfterSummary`、`handledAt`                                        | 必须同时解释原始基线、变更影响与当前有效承接口径                                                       |
| `HandoverBaselineImpactView`            | `ContractHandoverRebaselineRecord` | 支撑移交前承接影响范围解释                 | `originalBaselineSummary`、`changeImpactSummary`、`currentEffectiveBaselineSummary`、`riskFlags`                                                                   | 不得把再基线化影响压平成单一“当前基线”字段                                                             |
| `PresigningRollbackHistoryView`         | `PresigningRollbackRequest`        | 支撑签约前回退与负路径历史追溯             | `rollbackFromStage`、`rollbackToStage`、`rollbackReasonCode`、`invalidatedDecisionSummary`、`currentEffectiveDecisionSummary`、`handledBy`、`handledAt`            | 必须显式区分当前有效结论与已失效结论，不能只返回被回退的节点                                           |
| `PresigningRollbackImpactView`          | `PresigningWorkspaceReopenRecord`  | 支撑回退后重开工作区与待重估状态总览       | `reopenedWorkspaceSummary`、`pendingReevaluationOwner`、`rollbackImpactSummary`、`invalidatedDecisionSummary`、`currentEffectiveDecisionSummary`、`allowedActions` | 不得退化为页面说明文本或人工汇总，`项目总览` 与 `签约就绪` 必须消费同一条回退链                        |
| `SensitiveFieldRevealRequestDetailView` | `SensitiveFieldRevealRequest`      | 支撑短时揭示申请详情与授权边界解释         | `fieldPackageSummary`、`usageReason`、`requestedExpiresAt`、`grantStatus`、`approvalSummary`                                                                       | 不因存在揭示申请而默认放宽详情页完整字段投影                                                           |
| `SensitiveFieldRevealHistoryView`       | `SensitiveFieldRevealGrant`        | 支撑短时揭示授权链、到期失效与访问审计追溯 | `grantedFieldPackageSummary`、`effectiveAt`、`expiresAt`、`revokedAt`、`auditSummary`                                                                              | 必须同时返回授权范围和到期信息，而不是只返回当前可见字段                                               |
| `ApprovalSummaryPackageView`            | `ApprovalSummarySnapshot`          | 支撑审批页最小字段包、投影级别与导出策略   | `approvalScenarioKey`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`generatedAt`、`allowedActions`                                | 审批页、打印材料、导出预览与通知摘要必须共享同一份 `summarySnapshotId`，不得直接复用详情页字段随机子集 |
| `CommissionFreezeDisputeHistoryView`    | `CommissionFreezeDisputeRecord`    | 支撑冻结后争议、仲裁与替代版本链追溯       | `disputeReason`、`affectedAssignmentSummary`、`arbitrationDecision`、`replacementFreezeVersionSummary`、`handledAt`                                                | 必须区分争议请求、仲裁结论与当前有效冻结版本                                                           |
| `CommissionFreezeImpactAssessmentView`  | `CommissionFreezeChangeRequest`    | 支撑冻结后变更对既有计算 / 发放的回溯影响  | `recalculationImpactMode`、`affectedCalculationSummary`、`affectedPayoutSummary`、`currentEffectiveFreezeVersionSummary`、`riskFlags`                              | 回溯影响必须来自稳定影响评估链，而不是前端二次计算                                                     |

### 5.4 横切支撑域

| 查询视图                       | 主要对象             | 目标             | 最小字段组                                                                                                                                     | 额外约束                               |
| ------------------------------ | -------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `TodoItemListView`             | `TodoItem`           | 支撑统一待办入口 | `todoId`、`todoType`、`targetType`、`targetId`、`targetTitle`、`currentNodeName`、`dueAt`、`priority`、`allowedActions`                        | 不直接替代业务对象详情                 |
| `ApprovalRecordDetailView`     | `ApprovalRecord`     | 支撑审批追溯     | 当前状态、节点进度、处理历史、关联对象摘要、`approvalScenarioKey`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy` | 节点历史、当前节点与摘要快照引用要分层 |
| `ConfirmationRecordDetailView` | `ConfirmationRecord` | 支撑确认追溯     | 当前状态、参与人进度、历史处理记录、关联对象摘要                                                                                               | 多方确认进度应是派生展示               |
| `AuditEventListView`           | `AuditLog`           | 支撑统一审计查询 | `eventType`、`targetType`、`targetId`、`operatorName`、`occurredAt`、`result`                                                                  | 不承载业务对象字段镜像                 |
| `SecurityEventListView`        | `SecurityEvent`      | 支撑安全追溯     | `eventType`、`actorName`、`path`、`permissionKey`、`occurredAt`、`result`、`severity`                                                          | 不替代原始接入日志                     |

---

## 6. 经营看板与跨域汇总边界

第一阶段建议把经营看板作为独立读侧聚合，而不是把多个列表 DTO 拼出来。至少建议固定以下边界：

1. `ProjectOperatingView` 以 `Project` 为中心聚合合同、回款、成本、发票和提成摘要。
2. 汇总字段必须区分“草稿口径”“待确认口径”“已生效口径”，默认经营主指标以已生效口径为准。
3. 若经营看板展示“风险提示”，应明确其属于派生视图字段，而不是业务主状态本身。
4. 第一阶段经营看板只做高频摘要与钻取入口，不在同一接口中展开全部动作历史。
5. 第二阶段第一批场景下，`ProjectOperatingView` 还必须同时支持项目汇总视角与合同拆解视角，并显式返回冻结后的 `receiptJudgmentMode` 与来源摘要。
6. 所有高敏汇总字段必须支持完整值、摘要值、遮罩占位三种投影结果，不能因其属于经营看板而默认返回完整原值。
7. 第二阶段第二批场景下，经营回看接口必须显式区分 `realtime`、`period-end` 与 `restated` 三种口径，不能复用同一组“当前值”字段。
8. `ProjectOperatingAsOfView` 必须同时固定快照模式、被替代快照、引用基线版本与移交前再基线化摘要，禁止把“最新基线 + 历史快照”临时拼成历史经营结果。
9. 共享分摊、阶段归属、税务处理和经营基线都必须有独立详情或历史视图，不能全部挤进 `ProjectOperatingView` 的说明文本。
10. `OperatingSignalEvaluationView` 与 `CommissionGateBindingHistoryView` 必须共同证明 `L5` gate 判断来自含 `taxImpactSummary`、`dataMaturityLevel`、`costActionRecommendation` 与引用基线 / 快照版本的稳定绑定结果，而不是提成页前端二次计算。
11. 第二批新增读侧视图仍需继续遵守第一批已冻结的敏感投影边界，不因“解释链更长”而默认扩大原值曝光范围。
12. 第三批新增查询视图必须显式返回“授权范围 / 到期时间 / 失效状态 / 替代版本关系”等链路字段，不能只返回当前结果摘要。
13. 审批摘要包视图与短时揭示视图必须保持场景化最小字段集，不得回退成详情页字段的裁剪子集。

建议的 `ProjectOperatingView` 最小字段组：

- `projectId`
- `projectCode`
- `projectName`
- `currentStage`
- `receiptJudgmentMode`
- `receiptJudgmentModeSourceSummary`
- `effectiveContractSetSummary`
- `contractSignedAmountSummary`
- `receivableConfirmedAmountSummary`
- `receiptPendingConfirmationAmountSummary`
- `payableRegisteredAmountSummary`
- `invoiceIssuedAmountSummary`
- `commissionCalculatedAmountSummary`
- `grossMarginSummary`
- `taxImpactSummary`
- `allocationStabilitySummary`
- `unmappedCostSummary`
- `dataMaturityLevel`
- `costActionRecommendation`
- `currentActionLevel`
- `referencedBaselineVersion`
- `referencedSnapshotVersion`
- `riskFlags`
- `lastUpdatedAt`

补充说明：

- 第一阶段平台治理域不强制建设独立经营看板，但至少要具备用户、角色、组织、导航四类管理查询视图
- 提成治理域至少要具备列表、详情、历史三类查询视图，否则写侧命令无法形成可验证闭环
- `grossMarginSummary`、`commissionCalculatedAmountSummary` 等敏感汇总字段应由查询层按角色投影，不承诺每个角色都拿到精确值
- 第二阶段第二批场景下，`ProjectOperatingView` 不得只返回金额总览；至少还要共同返回税务影响摘要、成本数据成熟度状态、成本侧动作建议、当前动作等级与引用基线 / 快照版本，供 `L4-T04` 与 `L5` 稳定消费

---

## 7. 查询接口分层建议

第一阶段建议把查询接口至少拆成以下四层：

1. `ListQuery`: 支撑分页、筛选、排序、导出入口。
2. `DetailQuery`: 支撑对象详情、按钮守卫和关键摘要展示。
3. `AggregateViewQuery`: 支撑经营看板、首页统计或跨域聚合。
4. `HistoryQuery`: 支撑动作历史、审批追溯、审计追溯。

建议避免以下反模式：

- 一个详情接口同时承担列表筛选和经营汇总。
- 用命令响应 DTO 代替详情查询。
- 为了前端方便，把草稿字段、已生效字段、派生汇总字段全部平铺成一个不可区分的大对象。

---

## 8. 对表结构冻结的约束

查询视图边界明确后，表结构冻结至少应满足以下读侧要求：

1. 每个核心对象都能支撑列表摘要字段与详情主体字段的稳定查询。
2. 审批、确认、待办、通知、审计等动作事实能够被单独查询，不需要依赖主表反向拼状态。
3. 经营看板关键汇总字段可以从稳定事实源计算，或落到明确的派生 / 汇总表，而不是依赖临时页面逻辑。
4. 主表、版本表、快照表、动作记录表之间的关系足以支撑详情视图与历史视图同时存在。
5. `allowedActions`、`riskFlags`、各种 `Summary` 字段允许由应用层或读侧聚合生成，但不得迫使写表结构与视图结构一一同形。
6. 平台治理域查询视图必须支撑后台管理页真实接入，不应长期依赖 fixture 或前端本地 signal 假数据。

---

## 9. 当前不在本文档中冻结的内容

当前仍不在本文档中写死以下内容：

- 最终 query path 命名与参数命名
- 最终搜索条件 DSL
- 报表导出格式与模板
- BI 类宽表或离线数仓设计
- 首页卡片指标与图表组件的最终口径
- 读写分离、缓存与搜索引擎策略

这些内容应在进入 schema / DDL 级细化与后续性能设计时继续展开。

---

## 10. 当前结论

第一阶段现在已经不只需要写侧边界，也需要读侧边界。当前最稳妥的推进方式，是先把列表、详情、经营看板、统一待办和历史追溯几类查询视图固定为稳定读模型，再把第二批需要的经营可信源与 gate 解释视图一并写回，然后据此进入表结构冻结设计，最后才进入真正的 schema / DDL 级细化。
