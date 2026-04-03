# POMS 接口命令设计

**文档状态**: Active
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第一阶段接口命令边界基线，以及第二阶段第一批、第二批、第三批实现映射写回前的命令补点输入
**关联文档**:

- 上游设计:
  - `poms-requirements-spec.md`
  - `poms-hld.md`
  - `poms-design-progress.md`
  - `archive/reviews/design-review-follow-up-summary.md`
  - `archive/phase2-batches/phase2-first-batch-implementation-mapping.md`
  - `archive/phase2-batches/phase2-second-batch-implementation-mapping.md`
  - `archive/phase2-batches/phase2-third-batch-implementation-mapping.md`
- 同级设计:
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `business-authorization-matrix.md`
  - `phase2-data-permission-and-sensitive-visibility-design.md`

---

## 1. 文档目标

本文档用于在正式进入接口冻结前，先明确第一阶段的接口切分边界：

- 哪些动作仍可走普通更新接口
- 哪些动作必须走命令型动作接口
- 哪些动作属于系统派生接口，不应暴露为普通人工写接口

本文档不是 OpenAPI 明细，也不是最终 DTO 设计稿；它的目标是先冻结“接口形态与动作边界”，避免在实现阶段再次把高敏感动作混回普通 PATCH / PUT。

补充当前阶段判断：

- 本文档当前必须直接服务于平台治理域与提成治理域的第一阶段补齐实施
- 因此需要把平台治理域命令边界与提成治理域补齐切片的命令集合补充到可直接指导接口切分的程度
- 第二阶段第一批六个专题已经完成七层写回，第二批七个专题也已形成实现映射桥接，当前需要把新增高敏动作继续写回本文件，避免在实现阶段退回页面拼装或普通 PATCH

---

## 2. 接口分类基线

第一阶段统一采用以下三类接口：

| 接口类型       | 用途                           | 是否面向人工调用 | 典型风险                         | 设计要求                               |
| -------------- | ------------------------------ | ---------------- | -------------------------------- | -------------------------------------- |
| 普通更新接口   | 草稿维护、说明补录、附件上传   | 是               | 把高敏动作误塞进普通保存         | 仅允许中低敏字段或草稿态字段           |
| 命令型动作接口 | 生效、冻结、关闭、审批、确认等 | 是               | 状态迁移与审批留痕被静默覆盖     | 必须具备前提校验、授权校验、独立留痕   |
| 系统派生接口   | 计算、快照生成、待办派发       | 否或仅受控后台   | 人工直接触发破坏可信源与替代链路 | 必须依赖上游事实前提，由系统或后台驱动 |

---

## 3. 第一阶段接口切分原则

1. 高敏感字段包不得通过普通更新接口直接进入生效状态。
2. 任何会改变业务主状态、审批状态、确认状态、有效快照、冻结版本、关闭结论的动作，都必须使用命令型动作接口。
3. 任何会生成替代链路、重算链路、快照链路的动作，优先归入命令型动作接口或系统派生接口。
4. 普通更新接口只承载“维护草稿”和“补充说明”，不承载“推进状态”。
5. 系统派生接口不作为前端普通按钮能力直接暴露，除非有受控后台操作入口。

---

## 4. 第一阶段最小命令集合

### 4.0 平台治理域

| 对象                       | 命令建议                         | 触发动作                  | 前提摘要                          | 放行方式 | 结果摘要                   |
| -------------------------- | -------------------------------- | ------------------------- | --------------------------------- | -------- | -------------------------- |
| `User`                     | `createPlatformUser`             | 创建用户                  | 具备平台用户管理权限；用户名唯一  | 无       | 创建用户主体与初始关系     |
| `User`                     | `activatePlatformUser`           | 启用用户                  | 用户存在且当前为停用              | 无       | 用户恢复参与认证与授权计算 |
| `User`                     | `deactivatePlatformUser`         | 停用用户                  | 用户存在且当前为启用              | 无       | 用户后续请求失效           |
| `UserRoleAssignment`       | `assignUserRoles`                | 分配角色                  | 用户、角色存在且角色可用          | 无       | 重算用户有效角色与权限     |
| `UserOrgMembership`        | `assignUserOrgMemberships`       | 绑定 / 调整组织           | 用户、组织存在且组织可用          | 无       | 固化主责/附属组织关系      |
| `Role`                     | `createPlatformRole`             | 创建角色                  | 具备角色管理权限；角色键唯一      | 无       | 创建角色主体               |
| `Role`                     | `activatePlatformRole`           | 启用角色                  | 角色存在且当前为停用              | 无       | 角色重新参与授权计算       |
| `Role`                     | `deactivatePlatformRole`         | 停用角色                  | 角色存在且当前为启用              | 无       | 角色退出后续授权计算       |
| `RolePermissionAssignment` | `assignRolePermissions`          | 分配 / 撤销权限           | 角色存在；权限 key 合法且允许使用 | 无       | 固化角色权限集合           |
| `OrgUnit`                  | `createOrgUnit`                  | 创建组织                  | 父节点合法且启用；编码唯一        | 无       | 创建组织节点               |
| `OrgUnit`                  | `activateOrgUnit`                | 启用组织                  | 组织存在且当前为停用              | 无       | 组织重新进入可选范围       |
| `OrgUnit`                  | `deactivateOrgUnit`              | 停用组织                  | 组织存在且当前为启用              | 无       | 级联停用子树并禁止新增引用 |
| `OrgUnit`                  | `moveOrgUnit`                    | 移动组织节点              | 目标父节点合法；不得形成环        | 无       | 固化树结构变更             |
| `NavigationItem`           | `updateNavigationItemGovernance` | 调整标题/图标/排序/显隐等 | 导航项存在；链接与权限要求均合法  | 无       | 形成受控导航治理变更       |

### 4.1 销售流程域

| 对象                         | 命令建议                    | 触发动作     | 前提摘要                                                                         | 放行方式  | 结果摘要                                                                   |
| ---------------------------- | --------------------------- | ------------ | -------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| `ProjectAssessment`          | `submitProjectAssessment`   | 提交立项评估 | 已创建 `Project`，处于 `assessment`                                              | 审批      | 创建 / 推进审批实例，锁定提交版本                                          |
| `ScopeConfirmation`          | `confirmProjectScope`       | 确认范围     | 立项已通过，处于 `scope-confirmation`                                            | 确认      | 固化范围确认版本                                                           |
| `QuotationReview`            | `submitQuotationReview`     | 提交报价评审 | 范围已确认，处于 `commercial-closure`                                            | 审批      | 形成报价评审提交批次                                                       |
| `BidProcess`                 | `submitBidDecision`         | 提交投标决策 | 已创建当前有效 `BidProcess`                                                      | 审批      | 进入投标决策审批链                                                         |
| `BidProcess`                 | `recordBidResult`           | 登记投标结果 | 已递交或澄清完成                                                                 | 审批/确认 | 固化投标结果，决定能否进入签约                                             |
| `ExecutiveEscalationRequest` | `submitExecutiveEscalation` | 发起高层介入 | 满足重大例外或战略项目条件                                                       | 审批      | 创建高层介入审批链                                                         |
| `Project`                    | `submitProjectContracting`  | 提交签约登记 | 商务收口完成；若招投标则已中标                                                   | 审批/确认 | 进入签约登记放行链                                                         |
| `Project`                    | `closeProjectAsLost`        | 关闭丢单     | 处于签约前阶段且存在失单事实                                                     | 审批      | 形成 `closed-lost`                                                         |
| `Project`                    | `terminateProject`          | 终止关闭     | 已进入执行或验收后发生重大终止                                                   | 审批      | 形成 `closed-terminated`                                                   |
| `ProjectHandover`            | `confirmProjectHandover`    | 完成移交确认 | 已形成合同台账，确认人集合齐备；已选定项目级回款判断模式；合同承接摘要输入已固定 | 多方确认  | 固化移交完成事实、当前有效合同集合引用、合同承接摘要快照与移交确认摘要快照 |
| `AcceptanceRecord`           | `confirmAcceptance`         | 确认验收     | 已形成可验收成果并提交证据引用                                                   | 确认      | 固化验收结论、验收类型与证据链摘要                                         |

### 4.2 合同资金域

| 对象                        | 命令建议                                             | 触发动作           | 前提摘要                                             | 放行方式  | 结果摘要                                       |
| --------------------------- | ---------------------------------------------------- | ------------------ | ---------------------------------------------------- | --------- | ---------------------------------------------- |
| `Contract`                  | `submitContractReview`                               | 提交审核           | 合同草稿已完成关键条款                               | 审批      | 进入合同审核链                                 |
| `Contract`                  | `activateContract`                                   | 生效               | 审核通过，满足财务 / 商务放行条件                    | 审批/确认 | 形成当前有效合同与 `ContractTermSnapshot`      |
| `ContractAmendment`         | `submitContractAmendment`                            | 发起变更           | 已存在生效合同                                       | 审批      | 形成合同变更审批链                             |
| `ContractAmendment`         | `activateContractAmendment`                          | 生效新快照         | 合同变更已获批准                                     | 审批      | 替代原有效快照                                 |
| `ReceivablePlan`            | `activateReceivablePlan`                             | 初始化 / 生效      | 已存在当前有效合同条款快照                           | 确认      | 固化正式应收计划版本                           |
| `ReceiptRecord`             | `confirmReceiptRecord`                               | 财务确认           | 已登记到账记录                                       | 确认      | 进入生效回款口径                               |
| `ReceiptRecord`             | `reverseReceiptRecord`                               | 冲销 / 作废        | 原记录存在且允许撤回                                 | 审批/确认 | 形成冲销链路，不删除原记录                     |
| `PaymentRecord`             | `confirmPaymentRecord`                               | 确认生效           | 已登记付款记录                                       | 确认      | 进入生效成本口径                               |
| `PaymentRecord`             | `voidPaymentRecord`                                  | 作废               | 原付款记录允许撤销                                   | 确认      | 形成作废留痕                                   |
| `InvoiceRecord`             | `markInvoiceException`                               | 标记异常           | 发票记录存在且出现异常                               | 审批/确认 | 形成异常留痕                                   |
| `InvoiceRecord`             | `resolveInvoiceException`                            | 解除异常           | 异常已处理                                           | 审批/确认 | 形成解除留痕                                   |
| `InvoiceRecord`             | `closeInvoiceRecord`                                 | 关闭               | 发票流程完成或异常处理完结                           | 确认      | 形成关闭结论                                   |
| `ContractReadinessPackage`  | `initializeContractTermSnapshotFromReadinessPackage` | 初始化合同条款快照 | 已形成当前有效承接包；商业放行差异校验已满足进入条件 | 确认      | 生成受承接包约束的 `ContractTermSnapshot`      |
| `ContractReadinessPackage`  | `initializeReceivablePlanFromReadinessPackage`       | 初始化应收计划     | 已形成当前有效承接包；合同主链允许初始化应收计划     | 确认      | 生成正式 `ReceivablePlan` 版本与初始化留痕     |
| `CommercialReleaseBaseline` | `reviewCommercialReleaseBaselineDiff`                | 复核合同差异       | 已存在商业放行基线与差异结果；当前差异等级要求复核   | 审批/确认 | 固化差异复核结论并决定是否允许继续进入合同主链 |

### 4.3 提成治理域

| 对象                       | 命令建议                         | 触发动作               | 前提摘要                                                                   | 放行方式  | 结果摘要                                         |
| -------------------------- | -------------------------------- | ---------------------- | -------------------------------------------------------------------------- | --------- | ------------------------------------------------ |
| `CommissionRoleAssignment` | `freezeCommissionRoleAssignment` | 提交冻结               | 项目移交已完成，当前版本未冻结；当前移交确认摘要快照与移交前有效基线已固定 | 审批/确认 | 固化角色冻结版本、冻结摘要与移交确认摘要快照引用 |
| `CommissionRoleAssignment` | `submitCommissionRoleChange`     | 发起变更               | 已存在冻结版本                                                             | 审批      | 进入角色变更审批链                               |
| `CommissionCalculation`    | `approveCommissionCalculation`   | 复核生效               | 已完成计算，待复核                                                         | 复核/审批 | 形成有效计算结果                                 |
| `CommissionCalculation`    | `recalculateCommission`          | 触发重算               | 合同、回款、成本或异常事实导致需替代旧结果                                 | 复核/审批 | 形成新的重算链路与替代关系                       |
| `CommissionPayout`         | `submitCommissionPayoutApproval` | 提交审批 / 批准 / 结算 | 已形成有效阶段发放、最终结算或质保金结算草稿                               | 审批      | 固化当前阶段 / 结算批准结果与依据快照引用        |
| `CommissionPayout`         | `registerCommissionPayout`       | 登记发放 / 结算        | 发放或结算审批已通过                                                       | 无        | 形成业务发放 / 结算记录与依据快照引用            |
| `CommissionPayout`         | `suspendCommissionPayout`        | 暂停 / 受控阻断        | 已批准或已发放且出现异常、争议或 `REVIEW / BLOCK` 结论                     | 审批      | 暂停发放 / 结算链路并固化恢复前提                |
| `CommissionPayout`         | `reverseCommissionPayout`        | 冲销                   | 已发放记录需撤回                                                           | 审批      | 形成冲销 / 扣回留痕                              |
| `CommissionAdjustment`     | `submitCommissionAdjustment`     | 发起调整               | 已识别退款、坏账、违规等异常                                               | 无        | 形成调整草稿                                     |
| `CommissionAdjustment`     | `executeCommissionAdjustment`    | 提交审批 / 执行        | 调整草稿已完整并获批准                                                     | 审批      | 执行补发、扣回、冲销、重算或恢复后续发放         |
| `CommissionRuleVersion`    | `activateCommissionRuleVersion`  | 提交生效 / 启用        | 规则草稿已完成                                                             | 审批      | 启用新规则版本                                   |
| `InternalCostRateVersion`  | `publishInternalCostRateVersion` | 发布成本率版本         | 版本区间完整、来源合法、已通过财务治理校验                                 | 审批/确认 | 形成新的有效成本率版本与替代关系                 |
| `ProjectActualCostRecord`  | `registerLaborCostRecord`        | 归集人力成本           | 已存在有效成本率版本；期间与计量依据齐备                                   | 确认      | 形成引用 `rateVersionId` 的 `LABOR` 成本记录     |
| `ProjectActualCostRecord`  | `replaceLaborCostRecord`         | 替代 / 重算候选        | 原记录允许替代；替代理由、期间与来源明确                                   | 审批/确认 | 形成替代链、重算候选与历史留痕                   |

补充对第一阶段补齐切片的映射：

- `P1-S10`：优先落 `activateCommissionRuleVersion`、`freezeCommissionRoleAssignment`、`submitCommissionRoleChange`
- `P1-S11`：优先落 `approveCommissionCalculation`、`submitCommissionPayoutApproval`、`registerCommissionPayout`
- `P1-S12`：优先落 `recalculateCommission`、`submitCommissionAdjustment`、`executeCommissionAdjustment`

### 4.4 横切审批域

| 对象                         | 命令建议                     | 触发动作                | 前提摘要                                   | 放行方式  | 结果摘要                                       |
| ---------------------------- | ---------------------------- | ----------------------- | ------------------------------------------ | --------- | ---------------------------------------------- |
| `ApprovalRecord`             | `approveRecord`              | 审批通过                | 当前处理人拥有审批权                       | 审批      | 推进业务对象动作并固化审批摘要快照引用         |
| `ApprovalRecord`             | `rejectApprovalRecord`       | 驳回                    | 当前处理人拥有审批权                       | 审批      | 驱动业务对象回退或关闭，并固化当前审批摘要快照 |
| `ApprovalRecord`             | `closeApprovalRecord`        | 取消 / 关闭             | 审批终止或业务对象关闭                     | 无        | 关闭审批实例与相关待办                         |
| `ApprovalRecord`             | `reassignApprovalRecord`     | 转派                    | 当前处理人允许转派                         | 无        | 变更处理人并留痕                               |
| `ConfirmationRecord`         | `confirmRecord`              | 完成确认                | 当前确认人收到待办                         | 确认      | 推进确认计数与业务对象状态                     |
| `ConfirmationRecord`         | `closeConfirmationRecord`    | 关闭 / 取消             | 确认不再有效或业务对象已终止               | 无        | 关闭确认实例                                   |
| `SensitiveDataExportRequest` | `requestSensitiveDataExport` | 申请导出 / 打印高敏摘要 | 调用人具备导出资格；导出范围与用途说明完整 | 审批/确认 | 形成导出授权结论与导出审计留痕                 |

横切审批域继续统一以下命令边界约束：

1. 对存在审批摘要场景的 `approveRecord`、`rejectApprovalRecord` 与 `closeApprovalRecord`，写侧必须同时锁定 `approvalScenarioKey`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel` 与 `exportPolicy`，通知、打印、导出与审计副作用不得另行裁剪详情字段。
2. `submitQuotationReview` 形成的审批链及其后续进入 `ContractReadinessPackage` 的承接，只能沿用同一份场景级摘要快照，不得在签约前总览、审批通知或快速打印入口重新拼装审批材料。

### 4.5 第二阶段第一批补充边界说明

第一批六个专题进入实现前，命令边界还需额外固定以下约束：

1. `receiptJudgmentMode` 只能在 `confirmProjectHandover` 与紧邻冻结链路中固化，后续提成页只读不可改。
2. `ContractTermSnapshot` 与正式 `ReceivablePlan` 的初始化必须引用 `ContractReadinessPackage`，不得退化为合同页手工重填后直接生效。
3. `activateContract` 前若差异等级为 `需复核` 或更高，必须先完成 `reviewCommercialReleaseBaselineDiff` 或等价复核链路。
4. `submitCommissionPayoutApproval` 在第二阶段场景下，必须显式绑定有效 `AcceptanceRecord`，不得以自由文本“已验收”替代。
5. `publishInternalCostRateVersion`、`registerLaborCostRecord`、`replaceLaborCostRecord` 属于实现前必须补齐的写侧入口，不得由普通成本协作页直接承担。
6. 高敏导出、打印、审批摘要裁剪应通过独立命令或受控后台入口留痕，不允许前端详情页直接绕过字段守卫导出原值。
7. `confirmProjectHandover` 的放行必须同时锁定 `contractSummarySnapshotId`、当前移交前有效基线与 `handover-confirmation` 场景摘要快照，不得由移交页重新从合同详情、角色清单或附件摘要临时拼装确认材料；若当前仍存在处理中或待切换生效的再基线化记录，则不得放行移交确认。
8. `freezeCommissionRoleAssignment` 只能消费同一条 `合同承接摘要 -> 移交确认摘要 -> 冻结版本` 收口链；冻结确认、通知、打印材料与后续提成主线不得跳过 `handoverSummarySnapshotId` 或改挂其他基线引用；若当前有效基线来自再基线化链，还必须保留同一 `handoverRebaselineRecordId` 或等价稳定引用。
9. 冻结争议生成替代版本时，只能在保留 `supersedes` 关系与原联合追溯链的前提下切换当前有效版本，不得借仲裁链重写移交来源、合同承接摘要或移交前有效基线。

### 4.6 第二阶段第二批补充命令边界

| 对象                              | 命令建议                            | 触发动作                | 前提摘要                                                                                                                                                | 放行方式  | 结果摘要                                                                                        |
| --------------------------------- | ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `SharedCostAllocationBasis`       | `confirmSharedCostAllocationBasis`  | 固化共享分摊依据        | 来源成本事实已确认；分摊方法、项目份额与依据说明齐备                                                                                                    | 审批/确认 | 固化当前有效分摊依据与项目份额输入                                                              |
| `SharedCostAllocationResult`      | `replaceSharedCostAllocationResult` | 替代共享分摊结果        | 已存在有效分摊结果；替代理由与新依据明确                                                                                                                | 审批/确认 | 形成新分摊结果、替代链与重算候选                                                                |
| `CostStageAttributionSnapshot`    | `confirmCostStageAttribution`       | 锁定阶段归属            | 成本记录已形成；归属来源、归属模式与锁定依据齐备                                                                                                        | 确认      | 固化当前有效阶段归属快照                                                                        |
| `CostStageAttributionSnapshot`    | `reclassifyCostStageAttribution`    | 受控重分类              | 已存在有效阶段归属；重分类原因与影响范围已说明                                                                                                          | 审批/确认 | 形成新的归属快照并保留重分类历史链                                                              |
| `AccountingTaxTreatmentSnapshot`  | `confirmAccountingTaxTreatment`     | 固化税务处理结论        | 税务口径已确认；可抵扣状态、影响金额、税务影响摘要与来源依据齐备                                                                                        | 审批/确认 | 形成当前有效税务处理快照，并固定税务影响摘要供 `L4 / L5` 稳定引用                               |
| `AccountingTaxTreatmentSnapshot`  | `replaceAccountingTaxTreatment`     | 替代税务处理结论        | 已存在有效税务处理；替代原因、影响范围与新结论明确                                                                                                      | 审批/确认 | 形成税务处理替代链、刷新税务影响摘要与经营核算引用                                              |
| `OperatingBaselinePackage`        | `switchEffectiveOperatingBaseline`  | 切换当前有效经营基线    | 原始基线、变更包基线和目标有效基线已存在                                                                                                                | 审批/确认 | 固化当前生效经营基线并触发偏差桥接重算候选                                                      |
| `PeriodClosingSnapshot`           | `generatePeriodClosingSnapshot`     | 生成期末冻结快照        | 期末边界明确；冻结范围、时间点和口径已确认                                                                                                              | 受控后台  | 形成期末快照与时点快照可追溯入口                                                                |
| `OperatingRestatementRecord`      | `registerOperatingRestatement`      | 登记补录 / 重述         | 已存在期末快照或历史口径；重述原因与被替代口径明确                                                                                                      | 审批/确认 | 形成重述记录、替代链与新的历史回看口径                                                          |
| `OperatingSignalEvaluationResult` | `reviewOperatingSignalEvaluation`   | 经营信号人工复核        | 系统已生成成熟度与信号结果；复核理由、成本侧动作建议和处理结论明确                                                                                      | 审批/确认 | 固化复核结论、数据成熟度状态、成本侧动作建议、当前动作等级与经营信号解释                        |
| `CommissionGateReviewRecord`      | `reviewCommissionGateBinding`       | gate 复核 / 放行 / 阻断 | 已生成含税务影响摘要、待闭合税务影响金额、数据成熟度状态、成本侧动作建议与引用基线 / 快照版本的 `L4 -> L5` 绑定结果；当前处理分支为 `REVIEW` 或 `BLOCK` | 审批/确认 | 固化 gate 复核结论、处理人、原因、当前动作等级、引用基线 / 快照版本、场景摘要快照与绑定结果快照 |

第二阶段第二批统一补充以下命令边界约束：

1. 共享分摊、阶段归属、税务处理、经营基线、期末冻结、重述和 gate 复核都不得退回普通 `PATCH` / `PUT`。
2. 实时口径、期末口径与重述口径的刷新属于系统派生链路，不允许前端直接写“当前值”覆盖历史解释。
3. 任何替代动作都必须保留 `supersedes` 链，不允许无痕覆盖既有分摊结果、归属结果、税务处理或期末口径。
4. `reviewCommissionGateBinding` 的 `BLOCK` 结论必须实际阻断第二阶段发放命令，而不是停留在页面提示层。
5. 第二批命令仍需遵守第一批已冻结的敏感投影与最小可见集约束，不得因为进入 `L4/L5` 视图就放宽高敏字段写入边界。
6. `confirmAccountingTaxTreatment`、`replaceAccountingTaxTreatment`、`reviewOperatingSignalEvaluation` 与 `reviewCommissionGateBinding` 必须共同承接 `taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`referencedBaselineVersion`、`referencedSnapshotVersion` 这组稳定结果，不得由下游页面或普通写接口临时补齐。
7. 涉及 `REVIEW / BLOCK` 的命令守卫必须以前述稳定结果包为唯一放行依据，不得只依据前端 `allowedActions`、备注文本或页面临时计算结果决定是否继续发放 / 结算。
8. `confirmSharedCostAllocationBasis`、`replaceSharedCostAllocationResult`、`confirmCostStageAttribution`、`reclassifyCostStageAttribution`、`confirmAccountingTaxTreatment`、`replaceAccountingTaxTreatment`、`switchEffectiveOperatingBaseline`、`generatePeriodClosingSnapshot` 与 `registerOperatingRestatement` 的结果，必须可被 `L4-T01 / T02 / T03 / T04` 直接消费为正式输入；至少要能共同还原 `taxImpactSummary`、`taxImpactPendingAmount`、`allocationStabilitySummary`、`unmappedCostSummary`、`referencedBaselineVersion` 与 `referencedSnapshotVersion`，不得要求经营页再从详情接口拼装。
9. `reviewOperatingSignalEvaluation` 必须把 `dataMaturityLevel`、`costActionRecommendation`、当前动作等级与引用基线 / 快照版本一起固化为 `L4-T01 / T03 / T04` 的稳定输入，而不是只刷新解释文本。
10. `reviewCommissionGateBinding`、`submitCommissionPayoutApproval` 与后续 `L5` 阶段命令只能消费 `L4-T04` 已固定的税务影响摘要、待闭合税务影响、成本数据成熟度状态、成本侧动作建议、当前动作等级与引用基线 / 快照版本，不得绕过反馈层另挂其它经营口径；进入 `L5` 场景后新增锁定的只能是 `baselineSelectionSource`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel` 与 `exportPolicy` 这类场景化引用，不得重写经营事实本身。

### 4.6A 第二阶段第二批提成制度化命令补点

| 对象                   | 命令建议                                                                   | 触发动作                      | 前提摘要                                                                                                                                                                             | 放行方式 | 结果摘要                                                                     |
| ---------------------- | -------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------- |
| `CommissionPayout`     | `submitCommissionPayoutApproval` at `stage in (first, second, final)`      | 发起阶段发放 / 最终结算审批   | 当前有效 gate 结果、冻结版本引用、`baselineSelectionSource`、税务影响摘要 / 待闭合金额、成本数据成熟度状态、成本侧动作建议、当前动作等级与引用快照版本已固定；对应阶段前置条件已满足 | 审批     | 固化当前阶段审批结果、经营依据摘要、场景摘要快照与下游通知 / 打印 / 导出引用 |
| `CommissionPayout`     | `submitCommissionPayoutApproval` at `stage=retention`                      | 发起质保金结算审批            | 当前已形成最终结算收口链；质保期届满、质保金到账、重大争议已收口且离职 / 特例结论已明确；引用的冻结版本与经营快照仍保持稳定                                                          | 审批     | 固化质保金结算审批结果、质保金 gate 原因、统一经营依据摘要与场景摘要快照     |
| `CommissionPayout`     | `registerCommissionPayout` at `stage in (first, second, final, retention)` | 登记阶段发放 / 结算           | 对应审批已通过，且当前 `summaryPackageKey / summarySnapshotId / projectionLevel / exportPolicy` 与审批摘要保持一致                                                                   | 无       | 形成业务发放 / 结算记录、阶段累计结果、依据链引用与可回放摘要                |
| `CommissionPayout`     | `suspendCommissionPayout`                                                  | 暂停后续发放 / 结算           | 已存在异常、冻结后争议、仲裁待生效或成本侧 `REVIEW / BLOCK` 结论；受影响阶段、恢复前提与责任人已明确                                                                                 | 审批     | 固化受控暂停结论、处理责任人、恢复前提、场景摘要快照与下一步动作摘要         |
| `CommissionAdjustment` | `executeCommissionAdjustment`                                              | 执行扣回 / 冲销 / 补发 / 重算 | 已识别受影响发放 / 结算记录；调整类型、影响范围、冻结争议 / 仲裁结果与替代冻结版本引用已明确                                                                                         | 审批     | 固化独立调整结果、原记录引用、替代冻结版本引用与统一经营依据链               |

第二阶段第二批提成制度化链还需统一以下命令边界约束：

1. `reviewCommissionGateBinding`、`submitCommissionPayoutApproval`、`registerCommissionPayout`、`suspendCommissionPayout` 与 `executeCommissionAdjustment` 必须共同承接冻结版本引用、`baselineSelectionSource`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel` 与 `exportPolicy` 这组稳定依据链，不得在 gate、发放、结算或解释页各自补齐。
2. `submitCommissionPayoutApproval` 在 `stage=second` 时必须显式校验 `acceptanceRecordId` 与证据链摘要；在 `stage=final` 时必须显式区分“非质保部分已结清”和“质保金待结算”；在 `stage=retention` 时必须直接校验质保期、到账状态、重大争议和离职 / 特例结论，不得只靠备注文本放行。
3. `registerCommissionPayout`、`suspendCommissionPayout` 与 `executeCommissionAdjustment` 都不得重写原已发记录；任何暂停、扣回、冲销、补发或重算都必须沿用同一份场景摘要快照，并保留原动作事实与新的调整事实双链留痕。
4. 若冻结后争议仲裁已生成替代冻结版本，`suspendCommissionPayout` 与 `executeCommissionAdjustment` 只能在返回被替代版本引用、替代版本引用与 `supersedes` 关系后，再决定是暂停、扣回、冲销、补发还是恢复后续发放。
5. `REVIEW / BLOCK` 相关命令结果必须同时返回处理责任人、下一步动作摘要与统一经营依据摘要，不得只返回“已阻断 / 待复核”状态码。
6. `L5-T04` 规则解释页只能消费前述稳定结果链，不得绕开 gate / 发放 / 结算命令结果重新推断阻断原因、动作等级或中文解释文本。

### 4.7 第二阶段第三批补充命令边界

| 对象                               | 命令建议                           | 触发动作               | 前提摘要                                                           | 放行方式  | 结果摘要                                                           |
| ---------------------------------- | ---------------------------------- | ---------------------- | ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------ |
| `ContractHandoverRebaselineRecord` | `rebaselineContractHandover`       | 发起合同变更再基线化   | 已存在生效合同变更；移交前承接事实已形成；影响范围与替代目标已明确 | 审批/确认 | 形成再基线化记录、当前状态、受影响承接项摘要与新的当前有效承接基线 |
| `PresigningRollbackRequest`        | `submitPresigningRollback`         | 发起签约前回退         | 已存在需回退的签约前结论；回退原因、回退目标阶段与重开工作区已明确 | 审批      | 形成回退请求、锁定受影响结论与工作区并派生回退影响摘要             |
| `PresigningRollbackRequest`        | `approvePresigningRollback`        | 审批回退并重开工作区   | 回退请求已提交；待重开工作区与失效结论已复核                       | 审批/确认 | 固化回退放行、重开工作区、原结论失效链与当前有效结论链             |
| `SensitiveFieldRevealRequest`      | `requestSensitiveFieldReveal`      | 发起短时揭示申请       | 当前场景存在受控最小可见边界；揭示字段包、用途与有效期已明确       | 审批      | 形成揭示申请、待授权范围与审计起点                                 |
| `SensitiveFieldRevealRequest`      | `approveSensitiveFieldReveal`      | 批准 / 驳回短时揭示    | 揭示申请已提交；授权范围、到期时间与审批意见已确认                 | 审批/确认 | 形成揭示授权或驳回结论，并触发失效链与访问审计链                   |
| `ApprovalSummarySnapshot`          | `reviewApprovalSummaryProjection`  | 复核审批摘要字段包     | 场景级摘要包已生成；最小字段集、投影级别与导出策略已明确           | 审批/确认 | 固化审批摘要快照、场景级字段投影结果与统一引用链                   |
| `CommissionFreezeDisputeRecord`    | `submitCommissionFreezeDispute`    | 发起冻结后争议         | 已存在冻结版本；争议原因、影响角色与回溯模式已明确                 | 审批      | 形成争议记录、影响评估入口与待仲裁链                               |
| `CommissionFreezeDisputeRecord`    | `arbitrateCommissionFreezeDispute` | 仲裁争议并生成替代版本 | 争议记录已进入处理态；仲裁结论、替代冻结版本与回溯影响已确认       | 审批/确认 | 固化仲裁结论、替代冻结版本链、被替代版本引用与重算 / 发放影响摘要  |

第二阶段第三批统一补充以下命令边界约束：

1. 再基线化、签约前回退、短时揭示、审批摘要复核和冻结后争议处理都不得退回普通 `PATCH` / `PUT`。
2. 任何会重开既有流程、放宽最小可见边界或替代冻结版本的动作，都必须显式携带 `expectedVersion` 或等价并发控制位。
3. `submitPresigningRollback` 与 `approvePresigningRollback` 的写侧守卫必须同时校验 `rollbackFromStage`、`rollbackToStage`、`invalidatesDecisionIds`、`reopenWorkspaceKeys[]` 与当前有效结论链引用；审批通过后必须返回可供 `项目总览` 与 `签约就绪` 直接消费的稳定回退链引用，不能只返回页面提示文本。
4. `rebaselineContractHandover` 的写侧守卫必须同时校验当前移交前有效基线、最近一次再基线化记录状态、`affectedHandoverItemIds[]` 与切换目标；命令结果必须返回可供合同承接页、移交 gate 与冻结链直接消费的稳定再基线化结果链，至少包含当前状态、最近记录、受影响承接项摘要与新的当前有效承接基线。
5. `approveSensitiveFieldReveal` 与 `arbitrateCommissionFreezeDispute` 都必须返回稳定链路引用，不能只返回页面提示文本；其中 `arbitrateCommissionFreezeDispute` 不得原地覆盖当前冻结版本，若生成替代版本必须同步返回被替代版本引用、替代版本引用与 `recalculationImpactMode`。
6. `reviewApprovalSummaryProjection`、`approveRecord` 与其后续通知 / 打印 / 导出副作用必须共同绑定 `approvalScenarioKey`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel` 与 `exportPolicy`，不得在任一入口回退到详情页字段随机裁剪。
7. 审批摘要包生成、短时揭示到期失效、回退影响分析、再基线化状态切换和冻结后回溯影响评估优先作为系统派生动作处理，不应退化为页面临时拼装。
8. `confirmProjectHandover`、`freezeCommissionRoleAssignment` 与 `arbitrateCommissionFreezeDispute` 共同消费的联合追溯链至少必须能够回到同一 `handoverRebaselineRecordId`（若存在）、`contractSummarySnapshotId`、`handoverSummarySnapshotId`、`effectiveHandoverBaselineSnapshotId` 与冻结版本替代链，后续 `L4 / L5` 不得各自改挂其他来源。
9. 第三批命令仍需继续遵守第一批敏感投影边界与第二批经营可信源口径，不因其属于异常链路而默认放宽写侧权限。

---

## 5. 保留为普通更新接口的最小范围

第一阶段建议仅保留以下普通更新接口能力：

| 对象                       | 允许保留的普通更新能力     | 约束摘要                                 |
| -------------------------- | -------------------------- | ---------------------------------------- |
| `Project`                  | 基础信息编辑、备注补录     | 不得改写阶段推进、成交路径、关闭结论     |
| `BidProcess`               | 上传附件、补充澄清说明     | 不得直接写入决策结论、投标结果           |
| `Contract`                 | 草稿字段维护               | 仅限草稿态，不得直接生效高敏字段包       |
| `ReceiptRecord`            | 登记态补录说明、附件补充   | 不得直接完成财务确认或冲销               |
| `PaymentRecord`            | 登记态补录                 | 不得直接进入生效成本口径                 |
| `InvoiceRecord`            | 非异常状态下的普通台账维护 | 异常、解除异常、关闭必须走命令接口       |
| `CommissionRoleAssignment` | 草稿态角色分配维护         | 冻结后不得普通编辑                       |
| `CommissionPayout`         | 草稿态说明补充             | 批准、暂停、冲销、登记发放不得普通编辑   |
| `CommissionAdjustment`     | 草稿态原因补录             | 执行结论不得普通编辑                     |
| `User`                     | 基础资料维护               | 不得混入启停、角色分配、组织分配         |
| `Role`                     | 描述、排序等普通维护       | 不得混入启停、权限绑定                   |
| `OrgUnit`                  | 名称、说明等普通维护       | 不得混入启停、移动、树结构调整           |
| `NavigationItem`           | 受控说明性维护             | 不得绕过命令直接修改显隐、禁用和权限要求 |

---

## 6. 归入系统派生接口的动作

以下动作不建议作为普通前台命令直接暴露：

| 对象                            | 派生动作            | 触发来源                               | 说明                                                                                                                                     |
| ------------------------------- | ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ContractTermSnapshot`          | 生成有效快照        | 合同生效 / 合同变更生效                | 由命令型动作内部派生                                                                                                                     |
| `ContractReadinessPackage`      | 生成 / 刷新承接包   | 签约就绪信息完成、商业放行基线更新     | 由受控后台或命令链路派生                                                                                                                 |
| `CommercialReleaseBaselineDiff` | 生成 / 刷新差异结果 | 商业放行基线固化、合同草稿关键条款变化 | 不建议人工直接编辑结果                                                                                                                   |
| `CommissionCalculation`         | 生成计算草稿        | 冻结版本与生效输入就绪                 | 可由受控后台或系统触发                                                                                                                   |
| `SensitiveFieldProjection`      | 生成字段投影结果    | 详情查询、经营聚合、审批摘要读取       | 由查询层或读侧聚合生成                                                                                                                   |
| `ExportAuditRecord`             | 写入导出留痕        | 高敏导出 / 打印命令执行                | 作为受控导出副作用                                                                                                                       |
| `ApprovalSummarySnapshot`       | 生成 / 刷新摘要包   | 审批场景切换、审批对象状态变化         | 由受控后台或命令链路派生，并固定 `approvalScenarioKey / summaryPackageKey / summarySnapshotId / projectionLevel / exportPolicy` 同链引用 |
| `SensitiveFieldRevealGrant`     | 到期失效 / 提前撤销 | 揭示授权到期或受控撤销                 | 作为授权链副作用                                                                                                                         |
| `PresigningRollbackImpact`      | 生成回退影响分析    | 签约前回退申请提交或审批通过           | 必须同时产出已失效结论摘要、当前有效结论链与重开工作区影响                                                                               |
| `CommissionFreezeImpactAssess`  | 生成回溯影响评估    | 冻结后争议提交、仲裁或替代版本确认     | 作为争议处理副作用                                                                                                                       |
| `TodoItem`                      | 生成待办            | 审批 / 确认实例推进                    | 不建议人工直接创建                                                                                                                       |
| `NotificationRecord`            | 派发通知            | 审批、确认、关闭、异常等状态变化       | 不建议人工直接创建                                                                                                                       |
| 关联审计记录                    | 写入审计链          | 所有命令型动作执行                     | 作为命令执行副作用                                                                                                                       |

---

## 7. 进入 OpenAPI 与 DTO 设计前的检查点

在把本文档进一步下钻为 OpenAPI 或 DTO 之前，建议先确认：

1. 每个高敏感动作是否都已映射到唯一命令，而不是仍存在“保存并生效”类混合接口。
2. 每个命令是否都有明确的前提、放行方式、对象状态约束和审计责任。
3. 命令结果是否只返回当前动作关心的事实，不把审批实例状态和业务对象状态重新混成一个字段集合。
4. 普通更新接口的允许字段范围是否已经与字段包基线一致。
5. 第二阶段第一批的承接包初始化、差异复核、第二阶段验收引用、成本率版本治理与高敏导出是否都已脱离页面手工流程。
6. 第三批的再基线化、回退、短时揭示、审批摘要复核与冻结后争议处理是否都已具备独立命令入口与稳定审计责任。

---

## 8. 当前不在本文档中冻结的内容

当前不在本文档中写死以下内容：

- 命令请求体和响应体的最终字段清单
- 统一错误码与异常字典
- 审批流内部节点编排与多人顺序审批细节
- 页面按钮、路由和 OpenAPI path 的最终命名
- 后续二期可能引入的外部财务系统对接命令

这些内容应在接口冻结阶段继续收敛，而不是在当前过早写死。

---

## 9. 当前结论

第一阶段已经具备冻结“接口形态边界”的条件，第二阶段第一批与第二批也已经具备把新增高敏动作写回命令边界的条件。当前最稳妥的做法是先把高敏感对象动作固定到命令型接口，把草稿维护限制在普通更新接口，把快照、计算、差异校验、字段投影、待办和通知限制在系统派生接口，然后再进入 OpenAPI 与 DTO 级别的详细接口设计。

补充当前直接下一步：

- 平台治理域按 `create/activate/deactivate/assign/move/update-governance` 这一组命令边界进入实现准备
- 提成治理域按 `规则 -> 冻结 -> 计算生效 -> 发放批准/登记 -> 调整执行/重算` 的命令顺序进入实现准备
- 第二阶段第二批按 `分摊 -> 归属 -> 税务 -> 基线 -> 期末/重述 -> 信号/gate` 的命令顺序进入实现准备
