# POMS 数据模型冻结前提

**文档状态**: Active
**最后更新**: 2026-04-02
**适用范围**: `POMS` 第一阶段数据模型冻结前提，以及第二阶段第一批、第二批、第三批实现映射写回前的数据模型补点基线
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
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `business-authorization-matrix.md`
  - `phase2-data-permission-and-sensitive-visibility-design.md`

---

## 1. 文档目标

本文档用于在正式冻结表结构前，先明确第一阶段的数据模型前提：

- 哪些对象应落为主表
- 哪些对象应落为版本表或快照表
- 哪些对象应落为动作记录表或追加式事实表
- 哪些公共对象需要跨域复用
- 哪些边界当前仍不宜冻结

本文档不直接给出最终 DDL，而是给出“能否开始表结构冻结”的前提检查基线。

补充当前阶段判断：

- 本文档当前必须直接服务于平台治理域与提成治理域的第一阶段补齐实施
- 因此需要把平台治理域主数据对象、关系对象与提成治理域补齐对象正式纳入冻结前提
- 第二阶段第一批 6 个专题已完成七层写回，第二批 7 个专题也已进入实现映射，因此还需要把相关对象链继续补入数据模型前提

---

## 2. 数据模型分类基线

第一阶段建议把核心业务对象按以下五类处理：

| 类型          | 典型特征                             | 建模要求                                 |
| ------------- | ------------------------------------ | ---------------------------------------- |
| 主表          | 承载当前主体事实与主状态             | 可更新，但关键状态受命令接口控制         |
| 版本表        | 承载可替代版本、冻结版本或规则版本   | 不覆盖旧版本，需明确 `supersedes` 关系   |
| 快照表        | 承载某次生效时点的冻结输入口径       | 快照生成后不可原地修改                   |
| 动作记录表    | 承载审批、确认、关闭、冲销等动作     | 追加式留痕，不应被普通编辑接口覆盖       |
| 派生 / 支撑表 | 承载待办、通知、附件、审计等公共能力 | 由业务动作驱动生成，不反向决定业务主事实 |

---

## 3. 第一阶段核心对象落表建议

### 3.1 销售流程域

| 对象                         | 建议落表类型 | 建模前提摘要                                     | 冻结前需确认                         |
| ---------------------------- | ------------ | ------------------------------------------------ | ------------------------------------ |
| `Lead`                       | 主表         | 线索是 `Project` 创建前的事实源                  | 是否保留更细线索来源字典             |
| `Project`                    | 主表         | 承载主生命周期、主责组织、关键引用               | 主状态字段与关闭语义字典是否已稳定   |
| `ProjectAssessment`          | 动作记录表   | 属于评估提交与审批结论事实，不建议揉进 `Project` | 是否需要评估版本号                   |
| `ScopeConfirmation`          | 版本表       | 已确认后不应原地覆盖，建议支持版本化             | 新版本与旧版本的替代关系字段         |
| `QuotationReview`            | 动作记录表   | 报价评审是审批批次事实                           | 报价输入快照是否内嵌还是外链         |
| `BidProcess`                 | 主表         | 是 `Project` 下第一类受控子流程                  | 历史 `BidProcess` 串行版本是否冻结   |
| `ExecutiveEscalationRequest` | 动作记录表   | 高层介入属于例外审批事实                         | 是否需要与 `ApprovalRecord` 一一对应 |
| `ProjectHandover`            | 动作记录表   | 移交完成是里程碑事实                             | 多方确认明细是否拆子表               |
| `AcceptanceRecord`           | 动作记录表   | 验收结论需独立留痕                               | 阶段验收与最终验收是否共用一张表     |

### 3.2 合同资金域

| 对象                   | 建议落表类型 | 建模前提摘要                                       | 冻结前需确认                              |
| ---------------------- | ------------ | -------------------------------------------------- | ----------------------------------------- |
| `Contract`             | 主表         | 承载当前合同主体事实与当前状态                     | 合同主表与快照表字段切分是否已足够清楚    |
| `ContractTermSnapshot` | 快照表       | 合同生效口径必须冻结                               | 快照是否保留完整字段镜像                  |
| `ContractAmendment`    | 版本表       | 合同变更应产生新版本和新快照                       | 变更表是否同时承担审批申请角色            |
| `ReceivablePlan`       | 版本表       | 生效后不应原地覆盖，应支持版本替代                 | 计划版本替代链是否单独建关系字段          |
| `ReceiptRecord`        | 动作记录表   | 到账记录是追加式事实，确认与冲销不能直接改写旧记录 | `manual` / `external_sync` 源字段是否稳定 |
| `PayableRecord`        | 主表         | 第一阶段是成本台账主体事实                         | 是否需要和付款记录做强一对多关系          |
| `PaymentRecord`        | 动作记录表   | 付款登记与确认更接近追加式动作记录                 | 作废与确认是否在同表表达                  |
| `InvoiceRecord`        | 主表         | 发票台账是主体对象，但异常 / 关闭应追加动作留痕    | 是否拆出异常处理子表                      |

### 3.3 提成治理域

| 对象                       | 建议落表类型 | 建模前提摘要                                  | 冻结前需确认                       |
| -------------------------- | ------------ | --------------------------------------------- | ---------------------------------- |
| `CommissionRoleAssignment` | 版本表       | 冻结前可编辑，冻结后必须通过新版本替代        | 角色明细是否拆子表                 |
| `CommissionCalculation`    | 版本表       | 计算结果可替代旧版本，不应原地覆盖            | 输入快照字段是否内嵌还是引用快照表 |
| `CommissionPayout`         | 动作记录表   | 发放、暂停、冲销都属于追加式业务事实          | 发放审批与发放登记是否同表表达     |
| `CommissionAdjustment`     | 动作记录表   | 异常调整是补发 / 扣回 / 冲销 / 重算的重要事实 | 调整执行结果是否拆子表             |
| `CommissionRuleVersion`    | 版本表       | 规则版本天然是版本化对象                      | 是否需要单独的启停关系表           |

### 3.3A 平台治理域

| 对象                       | 建议落表类型  | 建模前提摘要                                           | 冻结前需确认                             |
| -------------------------- | ------------- | ------------------------------------------------------ | ---------------------------------------- |
| `User`                     | 主表          | 平台访问主体，登录身份与治理对象必须统一到真实主数据   | 凭证模型是否独立、主责组织字段是否稳定   |
| `Role`                     | 主表          | 角色是权限集合主体，不是数据范围主体                   | 系统角色与自定义角色边界是否已稳定       |
| `OrgUnit`                  | 主表          | 组织树是用户归属与后续统计维度的正式事实源             | 树结构、自引用与停用规则是否已稳定       |
| `UserRoleAssignment`       | 动作 / 关系表 | 用户与角色关系应关系化建模，不能用数组字段替代         | 撤销关系是否保留历史、有效关系唯一规则   |
| `UserOrgMembership`        | 动作 / 关系表 | 用户与组织关系应关系化建模，必须支持主责 / 附属语义    | 主责组织唯一约束、附属组织表达是否已稳定 |
| `RolePermissionAssignment` | 动作 / 关系表 | 角色与权限关系应结构化留痕，不能只停留在运行时拼装结果 | 权限字典只读治理与关系表边界是否已稳定   |

说明：

- 第一阶段权限字典可继续保留“共享契约 + 后端种子”模式
- 但权限分配关系不能继续停留在 fixture 或 JWT payload 拼装层

### 3.4 横切支撑域

| 对象                 | 建议落表类型  | 建模前提摘要                     | 冻结前需确认                     |
| -------------------- | ------------- | -------------------------------- | -------------------------------- |
| `ApprovalRecord`     | 动作记录表    | 审批实例是跨域公共动作事实       | 节点明细是否拆子表               |
| `ConfirmationRecord` | 动作记录表    | 确认实例与多方确认过程需独立留痕 | 确认参与人明细是否拆子表         |
| `TodoItem`           | 派生 / 支撑表 | 待办由审批 / 确认实例派生        | 是否需要保留关闭原因字段         |
| `NotificationRecord` | 派生 / 支撑表 | 通知由状态变化派生               | 是否需要模板版本引用             |
| `Attachment`         | 派生 / 支撑表 | 作为通用附件对象被业务动作引用   | 存储策略与业务引用关系是否独立   |
| `AuditLog`           | 派生 / 支撑表 | 承载统一审计                     | 事件模型是否与命令执行结果强绑定 |

---

## 4. 关键关系与外键前提

第一阶段建议至少固定以下关系前提：

1. `Project` 是销售主链路主对象，签约前后都不被 `Contract` 替代。
2. `BidProcess` 通过 `projectId` 归属 `Project`，且 `Project` 可引用当前有效 `activeBidProcessId`。
3. `Contract` 通过 `projectId` 归属 `Project`。
4. `ContractTermSnapshot` 通过 `contractId` 归属 `Contract`，并可被 `ReceivablePlan`、`CommissionCalculation` 引用。
5. `ReceiptRecord` 可关联 `contractId` 与 `projectId`，但生效口径以确认后的记录事实为准。
6. `CommissionRoleAssignment`、`CommissionCalculation`、`CommissionPayout`、`CommissionAdjustment` 均需保留 `projectId`。
7. `ApprovalRecord` 与 `ConfirmationRecord` 应保留 `targetType + targetId` 的通用引用组合。
8. `User` 必须保留 `primaryOrgUnitId`，但用户与组织、用户与角色的正式关系仍应以下游关系表为准。
9. `CommissionRoleAssignment` 应保留 `userId` 与 `projectId`，以保证提成参与人与平台正式用户主数据对齐。

---

## 5. 版本化与替代关系前提

以下关系在冻结表结构前建议先明确存在：

| 对象类型                    | 建议字段 / 关系                    | 目的                     |
| --------------------------- | ---------------------------------- | ------------------------ |
| 版本表                      | `version`、`isCurrent`             | 标识当前有效版本         |
| 版本表 / 快照表             | `supersedesId`                     | 表达替代链路             |
| 快照表                      | `effectiveAt`、`effectiveBy`       | 表达生效时点             |
| 动作记录表                  | `status`、`handledAt`、`handledBy` | 表达动作处理结果         |
| 冲销 / 作废类动作记录       | `reversedFromId` / `voidedFromId`  | 表达原记录与反向处理关系 |
| 提成重算 / 合同变更版本关系 | `recalculatedFromId`               | 表达新旧结果替代         |

说明：

- 第一阶段不要求所有对象都使用完全一致的字段名，但语义上必须有等价关系。
- 若这些关系还没有设计清楚，就不应过早冻结物理表结构。

---

## 6. 数据模型冻结前必须回答的问题

在进入表结构冻结前，建议至少确认以下问题：

1. 哪些对象的当前状态可以原地更新，哪些对象只能追加新记录或新版本。
2. 哪些对象的关键输入必须快照化，不能只依赖主表当前值。
3. 哪些动作需要独立动作记录表，不能只靠状态字段表达。
4. 哪些跨域引用使用强外键，哪些只保留业务引用字段。
5. 哪些对象需要保留 `expectedVersion` 对应的乐观锁字段。

### 6.1 平台治理域补充检查点

在进入平台治理域表结构冻结前，建议额外确认：

1. `User` 主表与认证凭证模型是否已完成职责分离。
2. `UserRoleAssignment`、`UserOrgMembership`、`RolePermissionAssignment` 是否都已按关系表而不是数组字段建模。
3. `OrgUnit` 的树结构、自引用和停用级联规则是否已稳定。
4. 平台治理域高敏动作是否都已从普通更新接口中剥离。

### 6.2 提成治理域补充检查点

在进入提成治理域表结构冻结前，建议额外确认：

1. `CommissionRuleVersion` 是否已明确规则版本唯一键与生效口径。
2. `CommissionRoleAssignment` 是否已明确版本链、当前有效版本与参与人引用口径。
3. `CommissionPayout` 是否已明确与 `CommissionCalculation` 的关联关系。
4. `CommissionAdjustment` 是否已明确与发放记录、计算结果的关联关系。

### 6.3 第二阶段第一批补充检查点

在进入第二阶段第一批的表结构冻结前，建议额外确认：

1. `Project` 是否能稳定表达当前有效合同集合、冻结后的 `receiptJudgmentMode` 与模式来源引用，而不是继续用单合同假设隐式承载。
2. `ContractReadinessPackage` 是否已作为正式承接对象进入模型，而不是继续依赖 `签约就绪` 页面临时拼装字段。
3. 商业放行基线、差异结果与复核结论是否已形成独立对象链，而不是散落在报价评审备注或合同草稿备注中。
4. 第二阶段提成发放是否已通过 `CommissionPayout -> AcceptanceRecord` 的稳定引用表达，而不是继续依赖自由文本“已验收”。
5. `InternalCostRateVersion` 与 `ProjectActualCostRecord.rateVersionId` 是否已形成稳定引用链，足以支撑历史追溯与重算候选。
6. 导出授权、审批摘要裁剪与字段可见等级是否已具备正式模型落点，而不是只停留在查询页面约定。

---

## 7. 第二阶段第一批核心对象补点

第二阶段第一批的补点，不是新增一套与现有对象无关的模型，而是在现有 `L1 ~ L5` 主线上补齐会决定主事实稳定性的对象链。

### 7.1 多合同项目与冻结模式对象链

| 对象 / 关系                                                        | 建议落表类型  | 建模前提摘要                                                  | 冻结前需确认                                        |
| ------------------------------------------------------------------ | ------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| `ProjectEffectiveContractLink`                                     | 关系 / 版本表 | 表达项目当前有效合同集合，避免单一 `current_contract_id` 假设 | 是否按时间片保留历史有效集合                        |
| `ProjectReceiptJudgmentFreeze`                                     | 动作记录表    | 表达项目级冻结后的 `receiptJudgmentMode`、冻结时点与来源动作  | 是否与 `ProjectHandover` 一对一还是允许后续受控替代 |
| `ProjectReceiptJudgmentFreeze.sourceHandoverId` / `sourceFreezeId` | 强引用字段    | 用于追溯冻结模式来源                                          | 是否统一通过 `target_type + target_id` 还是强外键   |

### 7.2 `签约就绪 -> ContractTermSnapshot / ReceivablePlan` 承接对象链

| 对象 / 关系                                         | 建议落表类型  | 建模前提摘要                                       | 冻结前需确认                                |
| --------------------------------------------------- | ------------- | -------------------------------------------------- | ------------------------------------------- |
| `ContractReadinessPackage`                          | 快照 / 版本表 | 承载 `签约就绪` 输出的结构化承接字段包             | 是否按 `project_id` 还是 `contract_id` 归属 |
| `ContractReadinessPackageItem`                      | 子表          | 承载回款节点、范围、风险、承接阻断原因等结构化明细 | 是否需要区分“正式承接字段”和“解释字段”      |
| `ContractTermSnapshot.source_readiness_package_id`  | 强外键        | 保证正式合同快照可追溯到承接包                     | 是否允许多个快照复用同一承接包              |
| `ReceivablePlanVersion.source_readiness_package_id` | 强外键        | 保证正式应收计划版本可追溯到承接包                 | 是否与合同快照初始化结果共用一条初始化记录  |

### 7.3 商业放行基线与差异复核对象链

| 对象 / 关系                      | 建议落表类型  | 建模前提摘要                                     | 冻结前需确认                             |
| -------------------------------- | ------------- | ------------------------------------------------ | ---------------------------------------- |
| `CommercialReleaseBaseline`      | 快照表        | 固化报价评审后进入合同主链的商业放行基线         | 是否与 `QuotationReview` 一对一          |
| `CommercialBaselineDiffResult`   | 动作 / 结果表 | 记录合同草稿相对基线的差异校验结果               | 是否每次合同草稿关键字段变化都生成新记录 |
| `CommercialBaselineDiffItem`     | 子表          | 记录必比字段、差异等级、旧值 / 新值摘要          | 摘要字段是否允许落 JSON                  |
| `CommercialBaselineReviewRecord` | 动作记录表    | 记录差异复核角色、结论、是否允许继续进入合同主链 | 是否与 `ApprovalRecord` 强绑定           |

### 7.4 第二阶段验收与发放前置对象链

| 对象 / 关系                                                | 建议落表类型      | 建模前提摘要                                 | 冻结前需确认                            |
| ---------------------------------------------------------- | ----------------- | -------------------------------------------- | --------------------------------------- |
| `AcceptanceRecord.evidence_bundle_id` / `evidence_summary` | 强引用 / 摘要字段 | 阶段成果验收需带证据链摘要                   | 是否单独拆 `AcceptanceEvidenceRef` 子表 |
| `AcceptanceEvidenceRef`                                    | 子表              | 承载附件、里程碑、交付物、确认记录等证据引用 | 是否需要证据类型字典                    |
| `CommissionPayout.acceptance_record_id`                    | 强外键            | 第二阶段发放必须显式引用有效验收记录         | 是否只对 `stage_type = second` 强制非空 |

### 7.5 成本率治理与人力成本对象链

| 对象 / 关系                                    | 建议落表类型   | 建模前提摘要                                 | 冻结前需确认                       |
| ---------------------------------------------- | -------------- | -------------------------------------------- | ---------------------------------- |
| `InternalCostRateVersion`                      | 版本表         | 表达人力成本率来源、版本、生效区间与替代关系 | 是否按角色、职级或成本分类建唯一键 |
| `ProjectActualCostRecord.rate_version_id`      | 强外键         | `LABOR` 成本记录必须引用有效成本率版本       | 是否允许非 `LABOR` 记录为空        |
| `ProjectActualCostRecord.supersedes_record_id` | 追加式替代关系 | 表达人力成本修正和重算候选链                 | 是否同时保留重算候选标记           |

### 7.6 敏感字段与导出审计对象链

| 对象 / 关系                   | 建议落表类型    | 建模前提摘要                             | 冻结前需确认                               |
| ----------------------------- | --------------- | ---------------------------------------- | ------------------------------------------ |
| `SensitiveDataExportRequest`  | 动作记录表      | 记录高敏导出 / 打印申请与授权结果        | 是否与 `ApprovalRecord` 一对一             |
| `SensitiveDataExportAudit`    | 派生 / 审计表   | 记录导出范围、字段包、调用人、结果状态   | 是否与 `AuditLog` 合并还是独立表达         |
| `FieldVisibilityPolicySource` | 配置 / 关系来源 | 表达字段包、角色、场景之间的稳定映射来源 | 第一批是否只冻结来源，不冻结完整可维护后台 |

### 7.7 第二阶段第二批经营可信源对象链

| 对象 / 关系                                          | 建议落表类型      | 建模前提摘要                                                     | 冻结前需确认                                       |
| ---------------------------------------------------- | ----------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| `SharedCostAllocationBasis`                          | 快照 / 版本表     | 固化共享成本的分摊依据、来源事实集合与项目份额输入               | 是否按来源事实分组建唯一键                         |
| `SharedCostAllocationResult`                         | 结果 / 版本表     | 表达项目级分摊结果与替代链，避免来源单据全额重复进入多个项目     | 是否需要显式保留 `supersedesAllocationResultId`    |
| `CostStageAttributionSnapshot`                       | 快照表            | 固化当前阶段归属、锁定来源与重分类链                             | 是否与阶段累计视图消费同一快照标识                 |
| `AccountingTaxTreatmentSnapshot`                     | 快照表            | 固化税务处理结论、可抵扣状态与经营核算引用                       | 待确认税务项是否允许保留独立挂起状态               |
| `OperatingBaselinePackage` / `ChangePackageBaseline` | 版本表 / 子表     | 同时表达原始签约基线、变更包基线与当前有效经营基线               | 是否允许多个变更包共同组成同一有效经营基线         |
| `ProjectOperatingSnapshot` / `PeriodClosingSnapshot` | 快照表 / 快照表   | 分层表达实时口径与期末冻结口径，支撑 `as-of` 历史回看            | 实时快照与期末快照是否共用主键体系                 |
| `OperatingRestatementRecord`                         | 动作记录表        | 表达补录 / 重述动作与被替代历史口径之间的关系                    | 是否要求每条重述都强引用 `periodEndSnapshotId`     |
| `OperatingSignalEvaluationResult`                    | 派生 / 结果表     | 表达经营信号、风险等级与公式边界计算结果                         | 是否与 `DataMaturityEvaluationResult` 一对一       |
| `DataMaturityEvaluationResult`                       | 派生 / 结果表     | 表达经营数据成熟度等级与解释动作                                 | 是否允许人工复核覆盖系统结果还是只追加复核记录     |
| `OperatingSignalToCommissionGateBinding`             | 派生 / 绑定结果表 | 固化 `L4` 经营信号到 `L5 gate` 的 `PROMPT / REVIEW / BLOCK` 绑定 | 是否按项目、阶段或发放批次保留多条历史绑定结果     |
| `CommissionGateReviewRecord`                         | 动作记录表        | 记录 `REVIEW / BLOCK` 分支处理人、处理结论与放行 / 阻断原因      | 是否与 `CommissionPayout` 或发放审批记录建立强关联 |

### 7.8 第二阶段第三批流程健壮性与审批增强对象链

| 对象 / 关系                        | 建议落表类型        | 建模前提摘要                                                     | 冻结前需确认                                      |
| ---------------------------------- | ------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| `ContractHandoverRebaselineRecord` | 动作 / 版本表       | 表达合同变更后移交前承接链的再基线化动作、替代关系与当前有效基线 | 是否按 `contract_amendment_id` 保留单独版本序列   |
| `HandoverBaselineImpactItem`       | 子表 / 影响项表     | 表达受再基线化影响的移交前事实项、影响原因与替代结果             | 是否要求逐项保留 `affected_handover_item_id`      |
| `PresigningRollbackRequest`        | 动作记录表          | 表达签约前受控回退申请、回退起止阶段与原结论失效链               | 是否要求每次回退强引用被失效结论集合              |
| `PresigningWorkspaceReopenRecord`  | 动作记录表 / 子表   | 表达回退后被重开的工作区、待重估责任人与重开时间                 | 是否允许同一回退请求重开多个工作区                |
| `SensitiveFieldRevealRequest`      | 动作记录表          | 表达短时揭示申请、用途、申请范围与申请有效期                     | 是否与 `ApprovalRecord` 一对一还是一对多          |
| `SensitiveFieldRevealGrant`        | 动作记录表 / 授权表 | 表达揭示授权结论、授权字段包、有效时间与到期失效链               | 是否允许同一请求产生多次授权 / 延期记录           |
| `SensitiveFieldRevealAudit`        | 派生 / 审计表       | 表达揭示后的访问审计、查看人、查看结果与访问时间                 | 是否与统一 `AuditLog` 合表还是独立表达            |
| `ApprovalSummaryPackageDefinition` | 配置 / 定义表       | 表达审批场景最小字段包、投影级别与导出策略的稳定来源             | 是否按 `approval_scenario_key + package_key` 唯一 |
| `ApprovalSummarySnapshot`          | 快照 / 派生表       | 表达某次审批读取时使用的摘要字段包快照与场景级投影结果           | 是否按审批对象、场景和投影级别保留历史快照        |
| `ApprovalSummaryFieldProjection`   | 子表 / 派生表       | 表达摘要包中每个字段的显示级别、遮罩模式与导出策略               | 是否允许把字段定义直接内嵌到快照 JSON             |
| `CommissionFreezeDisputeRecord`    | 动作记录表          | 表达冻结后争议申请、争议原因、影响角色与仲裁状态                 | 是否强关联当前冻结版本与既有计算 / 发放结果       |
| `CommissionFreezeChangeRequest`    | 动作 / 版本表       | 表达仲裁后受控变更请求、替代冻结版本链与回溯影响模式             | 是否要求每次替代都生成新的冻结版本而非原地覆盖    |

---

## 8. 第一批进入表结构冻结的建议门槛

除原有门槛外，第二阶段第一批建议额外满足以下条件后，再正式进入表结构冻结：

- 多合同项目的有效合同集合与冻结模式对象链已明确。
- `ContractReadinessPackage`、`CommercialReleaseBaseline`、`AcceptanceRecord -> CommissionPayout`、`InternalCostRateVersion` 四条关键对象链已明确。
- 高敏导出与字段可见等级至少已具备审计与配置来源落点。
- 当前不会再因为第一批问题反向推翻 `L1 / L3 / L4 / L5` 的主事实边界。

### 8.1 第二阶段第二批进入表结构冻结的附加门槛

- `B7 ~ B13` 涉及的分摊依据、阶段归属、税务处理、经营基线、期末快照、重述记录、经营信号和 gate 复核对象链已明确。
- `ProjectOperatingSnapshot`、`PeriodClosingSnapshot` 与 `OperatingRestatementRecord` 三层历史口径已明确分层，而不是继续复用单一“当前经营值”。
- `OperatingSignalToCommissionGateBinding` 与 `CommissionGateReviewRecord` 已能稳定支撑 `L5` gate 的阻断、复核和解释追溯。
- 第二批补点不会反向推翻第一批已冻结的敏感投影、合同集合和冻结模式边界。

### 8.2 第二阶段第三批进入表结构冻结的附加门槛

- `B14 ~ B18` 涉及的再基线化、回退、短时揭示、审批摘要包和冻结后争议处理对象链已明确。
- `PresigningRollbackRequest -> PresigningWorkspaceReopenRecord` 与 `ContractHandoverRebaselineRecord -> HandoverBaselineImpactItem` 两条负路径 / 替代链已能稳定追溯。
- `SensitiveFieldRevealRequest / Grant / Audit` 与 `ApprovalSummaryPackageDefinition / Snapshot / Projection` 已能证明“最小可见”和“短时放宽”是两条独立稳定链路。
- `CommissionFreezeDisputeRecord` 与 `CommissionFreezeChangeRequest` 已能稳定解释对既有提成计算 / 发放的回溯影响，不再依赖人工备注。
- 第三批补点不会反向推翻第一批敏感投影边界与第二批经营可信源口径。

---

## 7. 当前不宜冻结的内容

当前不建议在本文件中直接冻结以下内容：

- 最终数据库命名规范
- 具体索引策略与分库分表策略
- 所有枚举字典的最终值域
- 审批节点明细、确认参与人明细的最终拆表方案
- 外部系统同步表与中间态表

这些内容应在进入真正的数据模型设计或 DDL 设计时继续收敛。

---

## 8. 进入表结构冻结的建议门槛

建议满足以下条件后，再正式进入表结构冻结：

- 命令型接口与普通更新接口边界已稳定
- OpenAPI / DTO 输入输出边界已形成首版基线
- 主表 / 版本表 / 快照表 / 动作记录表的分类已稳定
- 关键替代关系、冲销关系、版本关系已明确
- 确认不会因 follow-up 再次推翻当前对象边界

---

## 9. 当前结论

第一阶段已经具备准备数据模型冻结前提的条件，第二阶段第一批与第二批也已经具备把关键对象链写入数据模型前提的条件。当前最稳妥的推进方式，不是立即写最终 DDL，而是先把对象落表类型、版本化关系、快照关系、动作留痕关系以及两批主事实补点固定下来，再进入真正的表结构冻结设计。
