# POMS 接口 OpenAPI 与 DTO 边界设计

**文档状态**: Active
**最后更新**: 2026-04-29
**适用范围**: `POMS` 第一阶段 OpenAPI / DTO 边界基线，以及第二阶段第一批、第二批、第三批实现映射写回前的 DTO 补点输入
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
  - `interface-command-design.md`
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `business-authorization-matrix.md`
  - `phase2-data-permission-and-sensitive-visibility-design.md`

---

## 1. 文档目标

本文档用于把 `interface-command-design.md` 中已经明确的接口形态边界，继续下钻为第一阶段可执行的 OpenAPI / DTO 输入输出边界基线。

本文档重点回答以下问题：

- 命令型接口在 OpenAPI 上如何命名与分层
- 请求 DTO 允许携带哪些字段，哪些字段必须禁止输入
- 响应 DTO 应返回动作结果，还是返回聚合对象视图
- 普通更新 DTO 与命令 DTO 的边界如何固定

本文档不是最终 OpenAPI 文件，不直接替代 `openapi.yaml`；它的作用是先冻结接口合同边界，再进入具体 schema 与 path 设计。

补充当前阶段判断：

- 本文档当前必须直接服务于平台治理域与提成治理域的第一阶段补齐实施
- 因此需要把平台治理域命令 DTO、普通更新 DTO 与提成治理域补齐切片 DTO 边界补充为可直接指导接口定义的程度
- 第二阶段第一批专题已经完成七层写回，第二批专题也已进入实现映射，因此还需要把差异复核、承接包初始化、第二阶段验收引用、成本率治理，以及第二批的分摊、归属、税务、时点快照与 gate 绑定字段写回 DTO 基线

---

## 2. OpenAPI 设计基线

第一阶段建议统一采用以下接口命名与语义规则：

1. 普通更新接口使用资源语义，例如 `PATCH /contracts/{id}`、`PATCH /projects/{id}`。
2. 单资源详情查询默认使用 `GET /resources/{id}`，不把 `/detail`、`/summary`、`/current` 之类页面后缀写进 canonical URI。
3. 稳定父级聚合或单例查询优先使用名词型子资源，例如 `GET /projects/{projectId}/contract-handover`、`GET /projects/{projectId}/project-handover`。
4. 命令型接口使用动作语义，例如 `POST /contracts/{id}:activate`、`POST /receipt-records/{id}:confirm`；`colon-action` 只用于不能自然资源化的业务动作。
5. 若操作本身会产生稳定的申请 / 审批 / 争议 / 变更对象，应直接资源化建模，例如 `POST /commission-freeze-disputes`，而不是继续追加 action suffix。
6. 设计 SSOT 不写部署层 `/api` 前缀；如网关或运行时需要前缀，由部署与接入层单独处理。
7. 系统派生接口默认不作为前台公开接口；如需后台触发，应使用受控后台路径或内部服务接口。
8. 一个命令只表达一个业务动作，不在同一次命令里混合“改草稿字段 + 推进状态”。
9. 命令响应优先返回动作结果与关键引用，不默认返回整份聚合对象全量视图。
10. 当请求体本身是 union / `oneOf` 语义时，正式 contract 直接采用 schema-first 建模；controller 用显式 schema pipe 做校验，OpenAPI 必须输出 `oneOf + discriminator`，不得因 DTO 工具边界把业务 contract 压平为字段大并集 object。

---

## 3. DTO 边界统一规则

### 3.1 请求 DTO 规则

1. 命令 DTO 只允许包含动作所需的最小字段，不允许顺带携带高敏字段包进行隐式修改。
2. 草稿态普通更新 DTO 只允许包含中低敏字段，禁止出现状态推进字段、审批结论字段、生效字段、冻结字段。
3. 命令 DTO 建议至少支持以下公共字段：

- `reason`：动作原因或说明，按需出现
- `comment`：审批 / 确认意见，按需出现
- `attachmentIds`：关联附件引用，按需出现
- `expectedVersion`：并发控制字段，按需出现

4. 下列字段类别默认不得出现在普通更新 DTO 中：

- 业务状态字段
- 审批 / 确认 / 复核结论字段
- 生效口径字段
- 冻结版本字段
- 关闭 / 作废 / 冲销 / 重算结果字段

### 3.2 响应 DTO 规则

第一阶段建议命令型接口优先返回以下结构化结果：

- `commandId` 或动作执行标识
- `targetId`
- `targetType`
- `resultStatus`
- `businessStatusAfter`
- `approvalRecordId` / `confirmationRecordId`，如有
- `snapshotId` / `newVersionId`，如有
- `todoItemIds` / `notificationIds`，如有

说明：

- 响应 DTO 的主目标是表达“动作执行结果”，不是代替详情查询接口。
- 若前端需要最新详情视图，建议通过详情查询接口单独拉取。

---

## 4. 普通更新接口 DTO 边界基线

| 对象                       | 接口草案                                  | 允许输入字段组                  | 禁止输入字段组                                                                         | 说明                                                                 |
| -------------------------- | ----------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Lead`                     | `PATCH /leads/{id}`                       | 线索基础信息、销售主责字段      | `convertedProjectId`、转化字段、审计字段                                               | 仅限未关闭、未转项目前维护                                           |
| `Project`                  | `PATCH /projects/{id}`                    | 基础信息、备注、预计时间        | `stage`、`commercialMode`、关闭结论、`ownerUserId`、`ownerOrgId`                       | 仅限普通维护；销售主责变更走命令接口                                 |
| `BidProcess`               | `PATCH /bid-processes/{id}`               | 附件、澄清说明                  | 投标决策结论、投标结果                                                                 | 不得代替投标决策 / 结果登记命令                                      |
| `Contract`                 | `PATCH /contracts/{id}`                   | 草稿字段、合同标识包            | 金额包、付款条件包、生效状态                                                           | 仅限草稿态                                                           |
| `ReceiptRecord`            | `PATCH /receipt-records/{id}`             | 登记说明、附件补录              | 确认结论、冲销结论、状态推进                                                           | 不得代替财务确认                                                     |
| `PaymentRecord`            | `PATCH /payment-records/{id}`             | 登记说明、凭证补录              | 生效状态、作废结论                                                                     | 不得代替付款确认                                                     |
| `InvoiceRecord`            | `PATCH /invoice-records/{id}`             | 普通台账字段                    | 异常结论、解除异常结论、关闭结论                                                       | 异常与关闭走命令型接口                                               |
| `CommissionRoleAssignment` | `PATCH /commission-role-assignments/{id}` | 草稿态角色分配说明              | 冻结结果、变更审批结论                                                                 | 冻结后禁止普通编辑                                                   |
| `CommissionPayout`         | `PATCH /commission-payouts/{id}`          | 草稿态说明、非关键备注          | 批准金额、暂停 / 冲销结果、已发放结果                                                  | 不得代替审批与登记发放                                               |
| `CommissionAdjustment`     | `PATCH /commission-adjustments/{id}`      | 草稿态原因补录                  | 执行结果、冲销结论、补发结论                                                           | 执行必须走命令                                                       |
| `User`                     | `PATCH /platform/users/{id}`              | 展示字段、联系方式等            | 启停、角色集合、组织集合                                                               | 不得代替平台主数据高敏动作                                           |
| `CurrentUserProfile`       | `PATCH /auth/profile`                     | `displayName`、`email`、`phone` | `avatarUrl`、`username`、`isActive`、角色 / 组织集合、`emailVerified`、`phoneVerified` | 首版响应返回最新 `SanitizedUserWithOrgUnits`，用于刷新当前用户上下文 |
| `Role`                     | `PATCH /platform/roles/{id}`              | 名称、描述、排序                | 启停结论、权限集合                                                                     | 不得代替角色启停与权限绑定                                           |
| `OrgUnit`                  | `PATCH /platform/org-units/{id}`          | 名称、说明、排序                | 启停结论、父子移动结果                                                                 | 不得代替组织树结构命令                                               |
| `NavigationItem`           | `PATCH /platform/navigation/{id}`         | 受控说明性字段                  | 显隐、禁用、权限要求、关键链接变更                                                     | 第一阶段建议只保留受控维护入口                                       |

补充平台治理域 DTO 约束：

- `PATCH /auth/profile` 新增独立请求 DTO：`UpdateCurrentUserProfileRequest`，即使局部字段与 `UpdatePlatformUserRequest` 重叠，也不直接复用类型名。
- `UpdateCurrentUserProfileRequest` 首版仅承载 `displayName`、`email`、`phone`；`avatarUrl` 不进入当前用户自助更新请求体。
- 当 `email` 或 `phone` 值发生变化时，响应 DTO 中对应 `emailVerified / phoneVerified` 必须反映为 `false`。
- `GET /platform/owner-reference` 使用独立 `OwnerReferenceData` 响应 DTO，只暴露可选销售主责所需的用户 `id / displayName / isActive / primaryOrgUnit*` 与组织 `id / name / code / isActive`，不得复用含邮箱、电话、角色名的平台用户管理列表 DTO。

### 4.1 第二阶段第一批补充禁止输入字段

| 专题 | 资源 / DTO 边界                        | 必须禁止进入普通更新 DTO 的字段                                                       | 说明                                                         |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `B1` | `Project` / `ProjectHandover`          | `receiptJudgmentMode`、`effectiveContractSet`、模式来源引用字段                       | 冻结模式只能通过移交 / 冻结命令固化                          |
| `B2` | `Contract` / `ReceivablePlan`          | `contractReadinessPackageId`、`sourceReadinessId`、正式 `ContractTermSnapshot` 字段包 | 承接包引用与初始化结果不得通过普通 `PATCH` 伪装提交          |
| `B3` | `Contract` / `QuotationReview`         | `commercialReleaseBaselineId`、`baselineDiffLevel`、`baselineReviewDecision`          | 差异结果与复核结论必须进入命令 DTO                           |
| `B4` | `CommissionPayout`                     | `acceptanceRecordId`、`acceptanceType`、证据链结论字段                                | 第二阶段发放前提不得隐藏在备注或说明字段                     |
| `B5` | `ProjectActualCostRecord` / 协作页 DTO | `internalCostRate`、`rateValue`、`rateVersionId`、`effectiveFrom`、`effectiveTo`      | 成本率版本与人力成本归集只能走专用命令 DTO                   |
| `B6` | 列表 / 详情 / 审批摘要 DTO             | 高敏原值字段与导出授权结论字段混入普通维护 DTO                                        | 字段可见等级与导出权限属于查询投影或命令结果，不属于普通保存 |

---

## 5. 命令型接口 OpenAPI / DTO 草案

### 5.0 平台治理域首批命令

| 命令                             | OpenAPI 草案                               | 请求 DTO 建议字段                                                                                   | 明确禁止输入                          | 响应 DTO 关键字段                                      |
| -------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| `createPlatformUser`             | `POST /platform/users`                     | `username`、`displayName`、`email`、`phone`、`primaryOrgUnitId`、`initialRoleIds`                   | `isActive` 强行生效、历史审计字段     | `targetId`、`businessStatusAfter`、`roleAssignmentIds` |
| `activatePlatformUser`           | `POST /platform/users/{id}:activate`       | `comment`、`expectedVersion`                                                                        | 用户基础资料字段整包覆盖              | `targetId`、`businessStatusAfter`、`resultStatus`      |
| `deactivatePlatformUser`         | `POST /platform/users/{id}:deactivate`     | `reason`、`comment`、`expectedVersion`                                                              | 用户基础资料字段整包覆盖              | `targetId`、`businessStatusAfter`、`resultStatus`      |
| `assignUserRoles`                | `PUT /platform/users/{id}/roles`           | `roleIds`、`reason`、`expectedVersion`                                                              | 用户基础资料字段、组织字段            | `targetId`、`businessStatusAfter`、`roleAssignmentIds` |
| `assignUserOrgMemberships`       | `PUT /platform/users/{id}/org-memberships` | `primaryOrgUnitId`、`secondaryOrgUnitIds`、`reason`、`expectedVersion`                              | 用户基础资料字段、角色字段            | `targetId`、`businessStatusAfter`、`orgMembershipIds`  |
| `createPlatformRole`             | `POST /platform/roles`                     | `roleKey`、`name`、`description`、`displayOrder`                                                    | `permissionKeys` 静默写入系统保护权限 | `targetId`、`businessStatusAfter`                      |
| `activatePlatformRole`           | `POST /platform/roles/{id}:activate`       | `comment`、`expectedVersion`                                                                        | 角色普通维护字段整包覆盖              | `targetId`、`businessStatusAfter`                      |
| `deactivatePlatformRole`         | `POST /platform/roles/{id}:deactivate`     | `reason`、`comment`、`expectedVersion`                                                              | 角色普通维护字段整包覆盖              | `targetId`、`businessStatusAfter`                      |
| `assignRolePermissions`          | `PUT /platform/roles/{id}/permissions`     | `permissionKeys`、`reason`、`expectedVersion`                                                       | 角色基础字段、组织范围字段            | `targetId`、`businessStatusAfter`、`permissionKeys`    |
| `createOrgUnit`                  | `POST /platform/org-units`                 | `name`、`code`、`description`、`parentId`、`displayOrder`                                           | 用户关系字段、组织启停字段            | `targetId`、`businessStatusAfter`                      |
| `activateOrgUnit`                | `POST /platform/org-units/{id}:activate`   | `comment`、`expectedVersion`                                                                        | 普通组织说明字段整包覆盖              | `targetId`、`businessStatusAfter`                      |
| `deactivateOrgUnit`              | `POST /platform/org-units/{id}:deactivate` | `reason`、`comment`、`expectedVersion`                                                              | 普通组织说明字段整包覆盖              | `targetId`、`businessStatusAfter`                      |
| `moveOrgUnit`                    | `POST /platform/org-units/{id}:move`       | `newParentId`、`displayOrder`、`reason`、`expectedVersion`                                          | 普通说明字段、用户关系字段            | `targetId`、`businessStatusAfter`、`newParentId`       |
| `updateNavigationItemGovernance` | `POST /platform/navigation/{id}:govern`    | `title`、`icon`、`displayOrder`、`isHidden`、`isDisabled`、`requiredPermissions`、`expectedVersion` | 非受控未知路由、框架私有运行时参数    | `targetId`、`businessStatusAfter`、`resultStatus`      |

### 5.1 销售流程域首批命令

| 命令                      | OpenAPI 草案                              | 请求 DTO 建议字段                                                                     | 明确禁止输入                                                 | 响应 DTO 关键字段                                                                                                                                                                     |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submitProjectAssessment` | `POST /project-assessments/{id}:submit`   | `comment`、`attachmentIds`、`expectedVersion`                                         | `stage`、审批结论、关闭结论                                  | `targetId`、`businessStatusAfter`、`approvalRecordId`                                                                                                                                 |
| `confirmProjectScope`     | `POST /scope-confirmations/{id}:confirm`  | `comment`、`attachmentIds`、`expectedVersion`                                         | 范围外的项目主状态字段                                       | `targetId`、`businessStatusAfter`、`confirmationRecordId`                                                                                                                             |
| `submitQuotationReview`   | `POST /quotation-reviews/{id}:submit`     | `comment`、`attachmentIds`、`expectedVersion`                                         | 合同生效字段、签约结果字段                                   | `targetId`、`approvalRecordId`、`approvalScenarioKey`、`summaryPackageKey`、`businessStatusAfter`                                                                                     |
| `submitBidDecision`       | `POST /bid-processes/{id}:submitDecision` | `comment`、`attachmentIds`、`expectedVersion`                                         | `result`、签约结果字段                                       | `targetId`、`approvalRecordId`、`businessStatusAfter`                                                                                                                                 |
| `recordBidResult`         | `POST /bid-processes/{id}:recordResult`   | `result`、`reason`、`attachmentIds`、`expectedVersion`                                | 标书草稿字段、普通说明字段整包覆盖                           | `targetId`、`businessStatusAfter`、`confirmationRecordId`                                                                                                                             |
| `reassignProjectOwner`    | `POST /projects/{id}:reassignOwner`       | `ownerUserId`、`ownerOrgId?`、`reason`、`expectedVersion`                             | 普通项目基础信息字段、审计字段、提成角色字段、移交参与人字段 | `targetId`、`projectOwnerReassignmentRecordId`、`previousOwnerUserId`、`previousOwnerOrgId`、`newOwnerUserId`、`newOwnerOrgId`、`businessStatusAfter`                                 |
| `closeProjectAsLost`      | `POST /projects/{id}:closeLost`           | `reason`、`comment`、`expectedVersion`                                                | 普通项目基础信息字段                                         | `targetId`、`businessStatusAfter`、`approvalRecordId`                                                                                                                                 |
| `terminateProject`        | `POST /projects/{id}:terminate`           | `reason`、`comment`、`expectedVersion`                                                | 普通项目基础信息字段                                         | `targetId`、`businessStatusAfter`、`approvalRecordId`                                                                                                                                 |
| `confirmProjectHandover`  | `POST /project-handovers/{id}:confirm`    | `comment`、`participantConfirmations`、`contractSummarySnapshotId`、`expectedVersion` | 合同草稿字段、提成比例字段直接改写                           | `targetId`、`businessStatusAfter`、`confirmationRecordId`、`contractSummarySnapshotId`、`effectiveHandoverBaselineSnapshotId`、`summarySnapshotId`、`projectionLevel`、`exportPolicy` |
| `confirmAcceptance`       | `POST /acceptance-records/{id}:confirm`   | `comment`、`attachmentIds`、`expectedVersion`                                         | 项目关闭字段、付款字段                                       | `targetId`、`businessStatusAfter`、`confirmationRecordId`                                                                                                                             |

### 5.2 合同资金域首批命令

| 命令                        | OpenAPI 草案                                  | 请求 DTO 建议字段                                       | 明确禁止输入                                 | 响应 DTO 关键字段                                         |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| `submitContractReview`      | `POST /contracts/{id}:submitReview`           | `comment`、`attachmentIds`、`expectedVersion`           | 合同金额包、付款条件包的静默改写             | `targetId`、`approvalRecordId`、`businessStatusAfter`     |
| `activateContract`          | `POST /contracts/{id}:activate`               | `comment`、`attachmentIds`、`expectedVersion`           | 金额包、付款条件包、普通草稿字段整包顺带提交 | `targetId`、`businessStatusAfter`、`snapshotId`           |
| `submitContractAmendment`   | `POST /contract-amendments/{id}:submit`       | `reason`、`comment`、`attachmentIds`、`expectedVersion` | 旧快照直接覆盖字段                           | `targetId`、`approvalRecordId`、`businessStatusAfter`     |
| `activateContractAmendment` | `POST /contract-amendments/{id}:activate`     | `comment`、`expectedVersion`                            | 直接修改原快照内容                           | `targetId`、`businessStatusAfter`、`snapshotId`           |
| `activateReceivablePlan`    | `POST /receivable-plans/{id}:activate`        | `comment`、`expectedVersion`                            | 计划生效后原地覆盖计划节点与金额             | `targetId`、`businessStatusAfter`、`newVersionId`         |
| `confirmReceiptRecord`      | `POST /receipt-records/{id}:confirm`          | `comment`、`expectedVersion`                            | 到账事实包与确认结论包混合批量覆盖           | `targetId`、`businessStatusAfter`、`confirmationRecordId` |
| `reverseReceiptRecord`      | `POST /receipt-records/{id}:reverse`          | `reason`、`comment`、`expectedVersion`                  | 直接删除原记录、直接改原确认结论             | `targetId`、`businessStatusAfter`、`reversalRecordId`     |
| `confirmPaymentRecord`      | `POST /payment-records/{id}:confirm`          | `comment`、`expectedVersion`                            | 付款登记字段与生效结论混合覆盖               | `targetId`、`businessStatusAfter`、`confirmationRecordId` |
| `voidPaymentRecord`         | `POST /payment-records/{id}:void`             | `reason`、`comment`、`expectedVersion`                  | 直接删除付款记录                             | `targetId`、`businessStatusAfter`、`voidRecordId`         |
| `markInvoiceException`      | `POST /invoice-records/{id}:markException`    | `reason`、`comment`、`expectedVersion`                  | 直接改发票主状态且不留异常结论               | `targetId`、`businessStatusAfter`、`approvalRecordId`     |
| `resolveInvoiceException`   | `POST /invoice-records/{id}:resolveException` | `comment`、`expectedVersion`                            | 直接清空异常字段                             | `targetId`、`businessStatusAfter`、`approvalRecordId`     |
| `closeInvoiceRecord`        | `POST /invoice-records/{id}:close`            | `reason`、`comment`、`expectedVersion`                  | 直接把关闭结论塞进普通更新 DTO               | `targetId`、`businessStatusAfter`、`closedAt`             |

### 5.3 提成治理域首批命令

| 命令                             | OpenAPI 草案                                         | 请求 DTO 建议字段                                                                              | 明确禁止输入                                                          | 响应 DTO 关键字段                                                                                                                                                                                                              |
| -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `freezeCommissionRoleAssignment` | `POST /commission-role-assignments/{id}:freeze`      | `comment`、`sourceHandoverId`、`handoverSummarySnapshotId`、`expectedVersion`                  | 角色分配包与冻结结论一起任意覆盖                                      | `targetId`、`businessStatusAfter`、`newVersionId`、`sourceHandoverId`、`contractSummarySnapshotId`、`handoverSummarySnapshotId`、`effectiveHandoverBaselineSnapshotId`、`summarySnapshotId`、`projectionLevel`、`exportPolicy` |
| `createCommissionCalculation`    | `POST /projects/{projectId}/commission-calculations` | `ruleVersionId`、`recognizedRevenueTaxExclusive`、`recognizedCostTaxExclusive`                 | 隐式 active rule 选择、`ruleCode` 推断、直接提交计算结果字段          | `id`、`projectId`、`ruleVersionId`、`version`、`status`、`recognizedRevenueTaxExclusive`、`recognizedCostTaxExclusive`、`contributionMargin`、`contributionMarginRate`、`commissionPool`                                       |
| `approveCommissionCalculation`   | `POST /commission-calculations/{id}:approve`         | `comment`、`expectedVersion`                                                                   | 手工提交计算结果包关键数值                                            | `targetId`、`businessStatusAfter`、`approvalRecordId`                                                                                                                                                                          |
| `recalculateCommission`          | `POST /commission-calculations/{id}:recalculate`     | `reason`、`comment`、`expectedVersion`                                                         | 直接覆盖旧计算结果                                                    | `targetId`、`businessStatusAfter`、`newVersionId`                                                                                                                                                                              |
| `submitCommissionPayoutApproval` | `POST /commission-payouts/{id}:submitApproval`       | `payoutStage`、`gateReviewRecordId`、`summarySnapshotId`、`comment`、`expectedVersion`         | `approvedAmount` 与普通备注字段混合覆盖、页面临时拼装的经营依据字段包 | `targetId`、`approvalRecordId`、`payoutStage`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`businessStatusAfter`                                                                                                   |
| `registerCommissionPayout`       | `POST /commission-payouts/{id}:registerPayout`       | `payoutStage`、`paidRecordAmount`、`paidAt`、`summarySnapshotId`、`comment`、`expectedVersion` | 批准金额包、暂停 / 冲销结论包、脱离审批摘要的自定义依据字段           | `targetId`、`payoutStage`、`businessStatusAfter`、`paidRecordId`、`summaryPackageKey`、`summarySnapshotId`                                                                                                                     |
| `suspendCommissionPayout`        | `POST /commission-payouts/{id}:suspend`              | `reasonCode`、`summarySnapshotId`、`comment`、`expectedVersion`                                | 普通草稿说明字段整包覆盖、页面直接覆写 gate 结论                      | `targetId`、`approvalRecordId`、`summaryPackageKey`、`summarySnapshotId`、`businessStatusAfter`                                                                                                                                |
| `reverseCommissionPayout`        | `POST /commission-payouts/{id}:reverse`              | `reasonCode`、`summarySnapshotId`、`comment`、`expectedVersion`                                | 直接删除已发放记录、跳过调整链直接改累计结果                          | `targetId`、`approvalRecordId`、`summaryPackageKey`、`summarySnapshotId`、`businessStatusAfter`                                                                                                                                |
| `executeCommissionAdjustment`    | `POST /commission-adjustments/{id}:execute`          | `adjustmentType`、`summarySnapshotId`、`comment`、`expectedVersion`                            | 草稿原因字段与执行结果字段混合提交、无引用链的覆盖式修正              | `targetId`、`adjustmentType`、`businessStatusAfter`、`approvalRecordId`、`summaryPackageKey`、`summarySnapshotId`                                                                                                              |
| `activateCommissionRuleVersion`  | `POST /commission-rule-versions/{id}:activate`       | `comment`、`expectedVersion`                                                                   | 规则定义包静默改写                                                    | `targetId`、`businessStatusAfter`、`newVersionId`                                                                                                                                                                              |

补充与第一阶段补齐切片的 DTO 映射：

- `P1-S10` 应先冻结规则版本、角色冻结请求 DTO；冻结后争议 / 受控变更 DTO 统一转入 `5.5B` 的 `EX-09D` 基线
- `P1-S11` 应先冻结计算复核、发放审批、登记发放请求 DTO
- `P1-S12` 应先冻结调整执行、重算触发请求 DTO

第一批 `L3` 强节点还需补充以下 DTO 约束：

- `confirmProjectHandover` 的请求 / 响应 DTO 至少必须共同承接 `contractSummarySnapshotId`、`effectiveHandoverBaselineSnapshotId`、`summarySnapshotId`、`projectionLevel` 与 `exportPolicy`，保证移交确认页、通知与打印材料消费同一条承接链。
- `freezeCommissionRoleAssignment` 的请求 / 响应 DTO 必须固定 `sourceHandoverId`、`handoverSummarySnapshotId`、`contractSummarySnapshotId` 与 `effectiveHandoverBaselineSnapshotId`，不得让前端通过角色明细、合同详情或移交页临时重构冻结依据。
- `EX-09D` 已裁决旧 `createCommissionRoleChangeRequest` direct-request 规划为 `design-change-required`；冻结后变更主路径统一按 `5.5B` 的 dispute-first 资源实现，不再新增 `POST /commission-role-change-requests`。

### 5.5 第二阶段第一批补充命令 DTO 草案

| 命令                                                 | OpenAPI 草案                                                        | 请求 DTO 建议字段                                                                                                                                                                                                     | 明确禁止输入                                                              | 响应 DTO 关键字段                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reviewCommercialReleaseBaselineDiff`                | `POST /commercial-release-baselines/{id}:reviewDiff`                | `diffDecision`、`reviewedFieldKeys`、`comment`、`attachmentIds`、`expectedVersion`                                                                                                                                    | 合同草稿字段整包、重新报价字段整包                                        | `targetId`、`diffResultId`、`baselineReviewDecision`、`resultStatus`                                                                                                                                                                                                                                                                                               |
| `initializeContractTermSnapshotFromReadinessPackage` | `POST /contract-readiness-packages/{id}:initializeContractSnapshot` | `contractReadinessPackageId`、`comment`、`expectedVersion`                                                                                                                                                            | 合同页手工拼装的正式条款字段包                                            | `targetId`、`snapshotId`、`sourceReadinessId`、`businessStatusAfter`                                                                                                                                                                                                                                                                                               |
| `initializeReceivablePlanFromReadinessPackage`       | `POST /contract-readiness-packages/{id}:initializeReceivablePlan`   | `contractReadinessPackageId`、`comment`、`expectedVersion`                                                                                                                                                            | 应收节点整包手工改写、合同草稿字段                                        | `targetId`、`newVersionId`、`sourceReadinessId`、`businessStatusAfter`                                                                                                                                                                                                                                                                                             |
| `submitCommissionPayoutApproval` at `stage=second`   | `POST /commission-payouts/{id}:submitApproval`                      | `acceptanceRecordId`、`evidenceSummary`、`gateReviewRecordId`、`baselineSelectionSource`、`summarySnapshotId`、`comment`、`expectedVersion`                                                                           | 自由文本“已验收”替代字段、完整验收详情对象、页面临时改写成本侧动作等级    | `targetId`、`approvalRecordId`、`acceptanceRecordId`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`baselineSelectionSource`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`businessStatusAfter` |
| `publishInternalCostRateVersion`                     | `POST /internal-cost-rate-versions`                                 | `rateScopeType`、`personId?`、`roleCode?`、`rateUnit`、`rateValue`、`currency`、`effectiveFrom`、`effectiveTo?`、`changeReason?`、`supersedesRateVersionId?`、`expectedVersion?`                                      | 普通协作页字段包、历史版本整包覆盖                                        | `targetId`、`supersedesRateVersionId`、`businessStatusAfter`                                                                                                                                                                                                                                                                                                       |
| `activateOperatingBaselinePackage`                   | `POST /operating-baseline-packages`                                 | `projectId`、`originalBaselineCost`、`baselineSelectionSource`、`effectiveOperatingBaselineId?`、`baselineSummary?`、`changePackages[]`、`expectedCurrentPackageVersion?`                                             | 页面临时拼装的经营结论、直接写历史基线包状态                              | `targetId`、`businessStatusAfter`、`resultStatus`                                                                                                                                                                                                                                                                                                                  |
| `createProjectOperatingSnapshot`                     | `POST /project-operating-snapshots`                                 | `projectId`、`snapshotMode`、窗口字段、经营金额字段、`taxImpactSummary`、`currentActionLevel`、`referencedBaselineVersion`、`baselineSelectionSource`、`handoverRebaselineRecordId?`                                  | 页面整包拼装后的快照对象                                                  | `targetId`、`businessStatusAfter`、`resultStatus`                                                                                                                                                                                                                                                                                                                  |
| `createPeriodClosingSnapshot`                        | `POST /period-closing-snapshots`                                    | `projectId`、`periodKey`、经营金额字段、`taxImpactSummary`、`currentActionLevel`、`referencedBaselineVersion`、`baselineSelectionSource`、`handoverRebaselineRecordId?`、`expectedCurrentSnapshotVersion?`            | 手工回填已生成的期末快照对象                                              | `targetId`、`businessStatusAfter`、`resultStatus`                                                                                                                                                                                                                                                                                                                  |
| `createOperatingRestatement`                         | `POST /operating-restatements`                                      | `projectId`、`periodEndSnapshotId`、`restatesSnapshotId`、`restatementReason`、`restatementSummary`、`restatedValues`、`expectedRestatesSnapshotVersion?`                                                             | 直接修改历史快照当前值、用备注替代重述原因                                | `targetId`、`businessStatusAfter`、`resultStatus`                                                                                                                                                                                                                                                                                                                  |
| `confirmExpenseRecord`                               | `POST /expense-records/{id}:confirm`                                | `comment?`、`expectedVersion`                                                                                                                                                                                         | 通过普通 `PATCH` 静默改费用状态                                           | `id`、`status`、`confirmedAt`、`confirmedBy`、`allowedActions`                                                                                                                                                                                                                                                                                                     |
| `voidExpenseRecord`                                  | `POST /expense-records/{id}:void`                                   | `reason`、`comment?`、`expectedVersion`                                                                                                                                                                               | 通过普通 `PATCH` 静默改费用状态                                           | `id`、`status`、`voidReason`、`allowedActions`                                                                                                                                                                                                                                                                                                                     |
| `registerPaymentFactCostRecord`                      | `POST /projects/{projectId}/actual-cost-records`                    | `costType=PAYMENT_FACT`、`paymentRecordId`、`costDescription?`、`evidenceSummary?`、`expectedSourceVersion?`                                                                                                          | 前端直接回填支付金额、支付日期、`recordStatus`、`sourceType/sourceId`     | `targetId`、`paymentRecordId`、`businessStatusAfter`、`resultStatus`                                                                                                                                                                                                                                                                                               |
| `registerInvoiceCostRecord`                          | `POST /projects/{projectId}/actual-cost-records`                    | `costType=INVOICE`、`invoiceRecordId`、`costDescription?`、`evidenceSummary?`、`taxImpactSummary?`、`expectedSourceVersion?`                                                                                          | 前端直接回填发票金额、验票状态、`recordStatus`、`sourceType/sourceId`     | `targetId`、`invoiceRecordId`、`businessStatusAfter`、`resultStatus`                                                                                                                                                                                                                                                                                               |
| `registerExpenseCostRecord`                          | `POST /projects/{projectId}/actual-cost-records`                    | `costType=EXPENSE`、`expenseRecordId`、`costDescription?`、`evidenceSummary?`、`taxImpactSummary?`、`expectedSourceVersion?`                                                                                          | 前端直接回填费用金额、费用日期、`recordStatus`、`sourceType/sourceId`     | `targetId`、`expenseRecordId`、`businessStatusAfter`、`resultStatus`                                                                                                                                                                                                                                                                                               |
| `registerProcurementCostRecord`                      | `POST /projects/{projectId}/actual-cost-records`                    | `costType=PROCUREMENT`、`payableRecordId`、`costDescription?`、`evidenceSummary?`、`taxImpactSummary?`、`expectedSourceVersion?`                                                                                      | 前端直接回填采购承诺金额、来源状态、`recordStatus`、`sourceType/sourceId` | `targetId`、`payableRecordId`、`businessStatusAfter`、`resultStatus`                                                                                                                                                                                                                                                                                               |
| `registerLaborCostRecord`                            | `POST /projects/{projectId}/actual-cost-records`                    | `costType=LABOR`、`rateVersionId`、`laborPersonId?`、`laborRole?`、`laborPeriodType`、`laborPeriodStart`、`laborPeriodEnd`、`actualHours?`、`actualPersonDays?`、`workSummary?`、`costDescription?`、`attachmentIds?` | `internalCostRate` 原值直写、项目毛利结论字段                             | `targetId`、`rateVersionId`、`businessStatusAfter`、`resultStatus`                                                                                                                                                                                                                                                                                                 |
| `replaceLaborCostRecord`                             | `POST /project-actual-cost-records/{id}:replace`                    | `laborPeriodStart`、`laborPeriodEnd`、`actualHours?`、`actualPersonDays?`、`workSummary?`、`rateVersionId`、`replaceReason`、`expectedSupersededRecordVersion?`                                                       | 直接物理删除原记录、整包覆盖原审计字段                                    | `targetId`、`replacementRecordId`、`recalculationCandidateId`、`resultStatus`                                                                                                                                                                                                                                                                                      |
| `requestSensitiveDataExport`                         | `POST /sensitive-data-export-requests`                              | `targetType`、`targetId`、`fieldPackageKey`、`usageReason`、`exportFormat`、`expectedVersion`                                                                                                                         | 绕过授权直接携带高敏原值、批量对象详情                                    | `targetId`、`approvalRecordId`、`exportScopeSummary`、`resultStatus`                                                                                                                                                                                                                                                                                               |

补充冻结约束：

1. 五个 `register*CostRecord` 共享同一条 create route，因为它们全部创建 `ProjectActualCostRecord`，不是对 source 执行 custom method。
2. path `{projectId}` 是创建归属 SSOT；source-driven variant 不再在 body 中重复传 `projectId`。
3. `RegisterLaborCostRecordRequest.expectedVersion` 当前未被 runtime 消费，正式设计不再保留该语义不明字段。
4. `replaceLaborCostRecord` 的 path `{id}` 就是 superseded record identity，request body 不再重复携带 `supersedesRecordId`。
5. `ADR-016` 已于 2026-04-16 基于 `EX-15F / EX-15E2B` PoC 接受：`CreateProjectActualCostRecordRequest` 正式采用 schema-first discriminated union，controller 用 `ZodValidationPipe(CreateProjectActualCostRecordRequestSchema)` 校验，OpenAPI 输出带 `title` 的 `oneOf + discriminator`，shared generated client 产出同名 union type。
6. `createZodDto` 在该场景中只继续承担各个 variant object schema 的 OpenAPI component carrier；不再要求直接承载 union request body 本身。

### 5.5A 第二阶段第二批补充命令 DTO 草案

| 命令                                | OpenAPI 草案                                                | 请求 DTO 建议字段                                                                                                                                                                                                        | 明确禁止输入                                                                                                         | 响应 DTO 关键字段                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `confirmSharedCostAllocationBasis`  | `POST /shared-cost-allocation-bases`                        | `basisType`、`sourceCostRecordIds`、`allocationMethod`、`projectShareItems[]`、`basisSummary?`、`comment?`                                                                                                               | 直接提交 `ProjectOperatingView` 汇总结果、页面拼装总额                                                               | `targetId`、`basisId`、`allocationResultIds`、`businessStatusAfter`                                                                                                                                                                                                                                                                                                                    |
| `replaceSharedCostAllocationResult` | `POST /shared-cost-allocation-results/{id}:replace`         | `allocatedAmount`、`allocationRatio?`、`allocationSummary?`、`replacementReason`、`comment?`、`expectedVersion`                                                                                                          | 在 body 中重复提交 `supersededAllocationResultId`、物理删除旧分摊结果、直接覆盖旧审计字段                            | `targetId`、`replacementResultId`、`supersedesAllocationResultId`、`resultStatus`                                                                                                                                                                                                                                                                                                      |
| `confirmCostStageAttribution`       | `POST /project-actual-cost-records/{id}/stage-attributions` | `stageAttributionMode`、`attributedStage`、`lockedBySnapshotId?`、`attributionSummary?`、`comment?`、`expectedVersion`                                                                                                   | 普通成本登记 DTO 混入阶段归属字段、在 body 中重复提交 `costRecordId`                                                 | `targetId`、`attributionSnapshotId`、`businessStatusAfter`                                                                                                                                                                                                                                                                                                                             |
| `reclassifyCostStageAttribution`    | `POST /cost-stage-attributions/{id}:reclassify`             | `newAttributedStage`、`lockedBySnapshotId?`、`reclassifyReason`、`comment?`、`expectedVersion`                                                                                                                           | 在 body 中重复提交 `supersededAttributionId`、无痕覆盖旧归属结果、前端手工改累计结果                                 | `targetId`、`attributionSnapshotId`、`supersedesAttributionId`、`resultStatus`                                                                                                                                                                                                                                                                                                         |
| `confirmAccountingTaxTreatment`     | `POST /projects/{projectId}/accounting-tax-treatments`      | `taxTreatmentType`、`deductibilityStatus`、`taxImpactAmount`、`taxImpactSummary`、`taxPendingFlag`、`taxImpactPendingAmount`、`basisSummary?`                                                                            | 把税务影响写回普通合同或成本维护 DTO、在 body 中重复提交 `projectId`、通过同一命令同时承载 replace identity          | `targetId`、`taxTreatmentSnapshotId`、`taxImpactSummary`、`taxImpactPendingAmount`、`businessStatusAfter`                                                                                                                                                                                                                                                                              |
| `replaceAccountingTaxTreatment`     | `POST /accounting-tax-treatments/{id}:replace`              | `taxTreatmentType`、`deductibilityStatus`、`taxImpactAmount`、`taxImpactSummary`、`taxPendingFlag`、`taxImpactPendingAmount`、`basisSummary?`、`expectedVersion`                                                         | 在 body 中重复提交 `projectId` / `supersedesTaxTreatmentSnapshotId`、复用 `confirmAccountingTaxTreatment` 承载替代链 | `targetId`、`taxTreatmentSnapshotId`、`supersedesTaxTreatmentSnapshotId`、`taxImpactSummary`、`taxImpactPendingAmount`、`resultStatus`                                                                                                                                                                                                                                                 |
| `switchEffectiveOperatingBaseline`  | `POST /operating-baseline-packages/{id}:switchEffective`    | `originalBaselineId`、`changePackageBaselineId`、`effectiveOperatingBaselineId`、`comment`、`expectedVersion`                                                                                                            | 页面临时拼装基线结论、直接写经营偏差结果                                                                             | `targetId`、`effectiveOperatingBaselineId`、`baselinePackageId`、`resultStatus`                                                                                                                                                                                                                                                                                                        |
| `createPeriodClosingSnapshot`       | `POST /period-closing-snapshots`                            | `projectId`、`periodKey`、经营金额字段、`taxImpactSummary`、`currentActionLevel`、`referencedBaselineVersion`、`baselineSelectionSource`、`expectedCurrentSnapshotVersion?`                                              | 手工提交整份经营聚合详情对象                                                                                         | `targetId`、`periodEndSnapshotId`、`snapshotMode`、`resultStatus`                                                                                                                                                                                                                                                                                                                      |
| `createOperatingRestatement`        | `POST /operating-restatements`                              | `projectId`、`periodEndSnapshotId`、`restatesSnapshotId`、`restatementReason`、`restatementSummary`、`restatedValues`、`expectedRestatesSnapshotVersion?`                                                                | 直接修改历史快照当前值、用备注替代重述原因                                                                           | `targetId`、`restatementRecordId`、`restatedSnapshotId`、`businessStatusAfter`                                                                                                                                                                                                                                                                                                         |
| `reviewOperatingSignalEvaluation`   | `POST /operating-signal-evaluations/{id}:review`            | `reviewDecision`、`resolvedDataMaturityLevel`、`costActionRecommendation`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`reviewComment`、`expectedVersion`                                                  | 手工改写 `signalLevel`、`formulaBoundaryAction` 等原始系统结果                                                       | `targetId`、`signalEvaluationId`、`reviewRecordId`、`taxImpactSummary`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`resultStatus`                                                                                                                                                                |
| `reviewCommissionGateBinding`       | `POST /commission-gate-bindings/{id}:review`                | `bindingAction`、`gateReviewDecision`、`blockingReasonCode`、`baselineSelectionSource`、`summaryPackageKey`、`summarySnapshotId`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`comment`、`expectedVersion` | 前端直接覆盖 `allowedActions`、跳过 `L4` 信号绑定结果或脱离稳定结果包单独变更 gate 结论、页面临时裁剪审批摘要字段包  | `targetId`、`bindingResultId`、`gateReviewRecordId`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`baselineSelectionSource`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`nextActionSummary`、`businessStatusAfter` |

补充约束：

- `confirmSharedCostAllocationBasis`、`confirmCostStageAttribution`、`confirmAccountingTaxTreatment` 属于创建新快照 / 新依据资源，不得继续伪装为 item-action；应分别使用 collection create 或 parent-subcollection create route
- item-action route 的 path `{id}` 必须是被处理资源的唯一 identity SSOT；`replaceSharedCostAllocationResult`、`reclassifyCostStageAttribution`、`replaceAccountingTaxTreatment` 的 body 不得重复提交 superseded identity
- `confirmAccountingTaxTreatment` 仅负责创建项目下新的当前税务处理快照；已有 active snapshot 时必须改走 `replaceAccountingTaxTreatment`
- `asOfMode`、`snapshotMode`、`snapshotAt`、`periodEndSnapshotId`、`restatementReason`、`restatedFromSnapshotId` 可以继续作为 DTO / OpenAPI 技术字段名
- 页面投影、审批摘要、导出与通知必须把这些字段转换成中文展示，不得直接显示字段名本身或英文术语
- 统一映射关系如下：`realtime -> 当前实时结果`、`period-end -> 期末冻结快照`、`restated -> 重述快照`、`snapshotAt -> 快照时点`、`periodEndSnapshotId -> 期末快照版本`、`restatementReason -> 重述原因`、`restatedFromSnapshotId -> 被替代快照版本`
- `confirmAccountingTaxTreatment` 的响应 DTO 必须显式返回 `taxImpactSummary`，避免 `L4 / L5` 再从金额、状态与备注字段二次拼接税务解释
- `confirmAccountingTaxTreatment` 的请求 / 响应 DTO 与 `L4` 查询响应 DTO 至少要共同承接 `taxImpactSummary`、`taxImpactPendingAmount`、`referencedBaselineVersion`、`referencedSnapshotVersion`，避免 `L4-T01 / T02 / T03 / T04` 再从金额和备注字段二次拼接税务解释
- `reviewOperatingSignalEvaluation` 与 `reviewCommissionGateBinding` 的请求 / 响应 DTO 必须共同承接 `dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`；进入 `L5` 后还必须继续带出 `taxImpactPendingAmount`、`baselineSelectionSource`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel` 与 `exportPolicy`，这些字段既是下游稳定输入，也是命令守卫的来源断言
- `L4-T01 / T02 / T03 / T04` 的查询 / 聚合响应 DTO 必须共同承接 `allocationStabilitySummary`、`unmappedCostSummary`、`taxImpactSummary`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel` 与引用基线 / 快照版本，不得由四个工作区各自重新推断成本侧风险

### 5.5AA 第二阶段第二批提成制度化命令 DTO 草案

| 命令                                                                       | OpenAPI 草案                                   | 请求 DTO 建议字段                                                                                                                                                           | 明确禁止输入                                                                | 响应 DTO 关键字段                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submitCommissionPayoutApproval` at `stage in (first, final)`              | `POST /commission-payouts/{id}:submitApproval` | `payoutStage`、`gateReviewRecordId`、`freezeVersionId`、`baselineSelectionSource`、`summarySnapshotId`、`comment`、`expectedVersion`                                        | 手工改写 `currentActionLevel`、完整经营明细对象、页面拼装的最终结算解释文本 | `targetId`、`approvalRecordId`、`payoutStage`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`baselineSelectionSource`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`businessStatusAfter`                              |
| `submitCommissionPayoutApproval` at `stage=retention`                      | `POST /commission-payouts/{id}:submitApproval` | `retentionReceiptRecordId`、`gateReviewRecordId`、`departureExceptionDecisionId`、`baselineSelectionSource`、`summarySnapshotId`、`comment`、`expectedVersion`              | 手工勾选“已到账 / 可结算”布尔结论、脱离收口链单独上传的结算说明             | `targetId`、`approvalRecordId`、`payoutStage`、`retentionSettlementStatus`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`baselineSelectionSource`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`businessStatusAfter` |
| `registerCommissionPayout` at `stage in (first, second, final, retention)` | `POST /commission-payouts/{id}:registerPayout` | `payoutStage`、`approvalRecordId`、`paidRecordAmount`、`paidAt`、`summarySnapshotId`、`comment`、`expectedVersion`                                                          | 跳过审批直接登记、把审批摘要字段包与台账字段整包混传                        | `targetId`、`paidRecordId`、`payoutStage`、`summaryPackageKey`、`summarySnapshotId`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`baselineSelectionSource`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`businessStatusAfter`                                                                     |
| `suspendCommissionPayout`                                                  | `POST /commission-payouts/{id}:suspend`        | `reasonCode`、`relatedGateReviewRecordId`、`relatedFreezeDisputeId`、`summarySnapshotId`、`comment`、`expectedVersion`                                                      | 仅提交备注文本、不返回责任人 / 恢复前提的受控暂停                           | `targetId`、`approvalRecordId`、`summaryPackageKey`、`summarySnapshotId`、`currentActionLevel`、`nextActionSummary`、`projectionLevel`、`exportPolicy`、`businessStatusAfter`                                                                                                                                                                                                            |
| `executeCommissionAdjustment`                                              | `POST /commission-adjustments/{id}:execute`    | `adjustmentType`、`relatedPayoutId`、`relatedFreezeDisputeId`、`replacementFreezeVersionId`、`supersededFreezeVersionId`、`summarySnapshotId`、`comment`、`expectedVersion` | 覆盖原发放记录、只传“当时经营结论”文本、不携带替代冻结版本引用              | `targetId`、`adjustmentResultId`、`adjustmentType`、`summaryPackageKey`、`summarySnapshotId`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`baselineSelectionSource`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`businessStatusAfter`                                                            |

补充约束：

- `reviewCommissionGateBinding`、`submitCommissionPayoutApproval`、`registerCommissionPayout`、`suspendCommissionPayout` 与 `executeCommissionAdjustment` 的请求 / 响应 DTO 必须共同承接 `baselineSelectionSource`、`taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel` 与 `exportPolicy`，不得把这组稳定依据拆散到页面本地状态中。
- `submitCommissionPayoutApproval` 在 `stage=final / retention` 时必须直接返回“非质保部分是否已结清”“质保金是否仍待结算 / 可结算”的正式状态，不得让最终结算页只拿审批结果码后自行推导。
- `CommissionStageGateView`、`CommissionPayoutDetailView`、`CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` 的查询 / 聚合响应 DTO，必须共享同一份 `summarySnapshotId` 与中文化后的快照表达，不得在规则解释页重新暴露英文术语或页面私有推断结果。

### 5.5B 第二阶段第三批补充命令 DTO 草案

| 命令                                         | OpenAPI 草案                                                          | 请求 DTO 建议字段                                                                                                                     | 明确禁止输入                                                                                                                          | 响应 DTO 关键字段                                                                                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rebaselineContractHandover`                 | `POST /contract-handover-rebaselines`                                 | `contractAmendmentId`、`rebaselineReason`、`affectedHandoverItemIds[]`、`effectiveBaselineAfterId`、`expectedVersion`                 | 合同 / 移交详情整包、页面临时解释文本                                                                                                 | `targetId`、`rebaselineRecordId`、`effectiveBaselineAfterId`、`resultStatus`                                                                                                                                                 |
| `submitPresigningRollback`                   | `POST /presigning-rollbacks`                                          | `projectId`、`rollbackFromStage`、`rollbackToStage`、`rollbackReasonCode`、`reopenWorkspaceKeys[]`、`expectedVersion`                 | 普通工作区草稿字段整包、直接改写已通过节点状态                                                                                        | `targetId`、`rollbackRequestId`、`invalidatedDecisionSummary`、`reopenedWorkspaceKeys`、`pendingReevaluationOwnerSummary`、`businessStatusAfter`                                                                             |
| `approvePresigningRollback`                  | `POST /presigning-rollbacks/{id}:approve`                             | `approvalDecision`、`invalidatesDecisionIds[]`、`comment`、`expectedVersion`                                                          | 直接删除原结论、页面自由改写回退目标                                                                                                  | `targetId`、`rollbackRequestId`、`invalidatedDecisionIds`、`reopenedWorkspaceKeys`、`currentEffectiveDecisionSummary`、`pendingReevaluationOwnerSummary`、`resultStatus`                                                     |
| `requestSensitiveFieldReveal`                | `POST /sensitive-field-reveals`                                       | `targetType`、`targetId`、`fieldPackageKey`、`usageReason`、`expiresAt`、`revealScopeSummary`、`expectedVersion`                      | 直接携带高敏原值、绕过权限直接放宽查询投影                                                                                            | `targetId`、`revealRequestId`、`approvalRecordId`、`resultStatus`                                                                                                                                                            |
| `approveSensitiveFieldReveal`                | `POST /sensitive-field-reveals/{id}:approve`                          | `grantDecision`、`grantedFieldPackageKey`、`expiresAt`、`comment`、`expectedVersion`                                                  | 把详情字段直接回传给审批页、用永久授权替代短时授权                                                                                    | `targetId`、`revealGrantId`、`expiresAt`、`businessStatusAfter`                                                                                                                                                              |
| `reviewApprovalSummaryProjection`            | `POST /approval-summary-packages/{targetId}:review`                   | `approvalScenarioKey`、`summaryPackageKey`、`projectionLevel`、`exportPolicy`、`comment`、`expectedVersion`                           | 详情页字段随机子集、未声明场景直接传完整聚合对象                                                                                      | `targetId`、`approvalScenarioKey`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`resultStatus`                                                                                               |
| `submitCommissionFreezeDispute`              | `POST /commission-freeze-disputes`                                    | `freezeVersionId`、`disputeReason`、`affectedAssignmentIds[]`、`recalculationImpactMode`、`comment`、`expectedVersion`                | 直接改写冻结版本、把争议结论塞进普通冻结维护 DTO                                                                                      | `targetId`、`disputeRecordId`、`freezeVersionId`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`businessStatusAfter`                                                                                              |
| `createCommissionDepartureExceptionDecision` | `POST /projects/{projectId}/commission-departure-exception-decisions` | `freezeVersionId`、`departureScenarioCode`、`decisionCode`、`decisionSummary`、`confirmationRequirementSummary?`、`summarySnapshotId` | 在 body 中重复提交 `projectId`、`supersedesId`、`summaryPackageKey / projectionLevel / exportPolicy`、前端生成 current / version 结论 | `id`、`projectId`、`freezeVersionId`、`version`、`isCurrent`、`departureScenarioCode`、`decisionCode`、`decisionSummary`、`summarySnapshotId`、`summaryPackageKey`、`projectionLevel`、`exportPolicy`、`status`、`handledAt` |
| `arbitrateCommissionFreezeDispute`           | `POST /commission-freeze-disputes/{id}:arbitrate`                     | `arbitrationDecision`、`replacementAssignmentPayload`、`recalculationImpactMode`、`comment`、`expectedVersion`                        | 页面直接改 `isCurrent`、前端预生成 `replacementFreezeVersionId`、跳过争议链直接替代现有冻结版本                                       | `targetId`、`disputeRecordId`、`changeRequestId`、`supersededFreezeVersionId`、`replacementFreezeVersionId`、`affectedCalculationSummary`、`affectedPayoutSummary`、`riskFlagSummary`、`resultStatus`                        |

补充约束：

- `submitPresigningRollback` 与 `approvePresigningRollback` 的响应 DTO 必须共同承接 `invalidatedDecisionSummary / currentEffectiveDecisionSummary / reopenedWorkspaceKeys / pendingReevaluationOwnerSummary` 这组稳定结果，不得让前端只拿状态码后自行重算回退链。
- `reviewApprovalSummaryProjection` 与审批链上的公共响应 DTO 必须共同返回 `approvalScenarioKey`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel` 与 `exportPolicy`，这些字段属于稳定引用，不是页面显示辅助字段。
- `EX-09D` 已固定：冻结后变更的 create 入口是 `submitCommissionFreezeDispute`，仲裁后形成 `CommissionFreezeChangeRequest`；不再保留 direct `createCommissionRoleChangeRequest`。
- `submitCommissionFreezeDispute` 请求不得重复要求 `projectId`；项目归属从 `freezeVersionId` 反查并校验。
- `createCommissionDepartureExceptionDecision` 请求不得重复要求 `projectId`；项目归属由 path 提供，并与 `freezeVersionId` 反查结果强一致校验。
- `createCommissionDepartureExceptionDecision` 的 `summaryPackageKey / projectionLevel / exportPolicy` 属于服务端从 `ApprovalSummarySnapshot` 派生的稳定结果，不得作为前端权威输入。
- `createCommissionDepartureExceptionDecision` 采用项目子集合 create route；旧 current 结论由服务端隐式 supersede，不再新增 `:replace` DTO / OpenAPI 变体。
- `arbitrateCommissionFreezeDispute` 请求不得把影响评估摘要当作前端权威输入；`affectedCalculationSummary / affectedPayoutSummary / riskFlagSummary` 由服务端固化并返回。

### 5.4 横切审批域公共命令

| 命令                      | OpenAPI 草案                              | 请求 DTO 建议字段                            | 明确禁止输入                 | 响应 DTO 关键字段                                                                                        |
| ------------------------- | ----------------------------------------- | -------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `approveRecord`           | `POST /approval-records/{id}:approve`     | `comment`、`expectedVersion`                 | 业务对象字段直接改写         | `targetId`、`businessStatusAfter`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`todoItemIds` |
| `rejectApprovalRecord`    | `POST /approval-records/{id}:reject`      | `reason`、`comment`、`expectedVersion`       | 业务对象草稿字段整包覆盖     | `targetId`、`businessStatusAfter`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`todoItemIds` |
| `closeApprovalRecord`     | `POST /approval-records/{id}:close`       | `reason`、`comment`、`expectedVersion`       | 把关闭结论伪装成普通备注更新 | `targetId`、`businessStatusAfter`、`summarySnapshotId`、`closedAt`                                       |
| `reassignApprovalRecord`  | `POST /approval-records/{id}:reassign`    | `newAssigneeId`、`reason`、`expectedVersion` | 业务对象审批结论字段         | `targetId`、`businessStatusAfter`、`newAssigneeId`                                                       |
| `confirmRecord`           | `POST /confirmation-records/{id}:confirm` | `comment`、`expectedVersion`                 | 业务对象普通维护字段         | `targetId`、`businessStatusAfter`、`confirmationProgress`                                                |
| `closeConfirmationRecord` | `POST /confirmation-records/{id}:close`   | `reason`、`comment`、`expectedVersion`       | 普通说明字段整包覆盖         | `targetId`、`businessStatusAfter`、`closedAt`                                                            |

---

## 6. DTO 结构分层建议

第一阶段建议把 DTO 结构拆为三层：

1. `PatchDto`: 仅用于草稿态普通维护。
2. `CommandRequestDto`: 仅用于单一动作命令。
3. `CommandResultDto`: 仅用于返回动作执行结果。

对平台治理域与提成治理域，建议再补一层统一响应投影约定：

4. `AdminDetailDto` / `DomainDetailDto`: 仅用于详情查询，不在命令响应中直接复用。

第二阶段第一批补充建议再显式固定一层敏感字段投影约定：

5. `VisibilityProjectedFieldDto`: 仅用于查询响应，至少包含 `value`、`visibilityLevel`、`isExportable`，不得复用为命令请求 DTO。

第二阶段第三批补充建议再显式固定一层场景化投影约定：

6. `ScenarioProjectionDto`: 仅用于审批摘要包、短时揭示范围和异常流程最小字段集返回，不得复用为普通更新 DTO 或完整详情 DTO。

建议避免以下反模式：

- 一个 DTO 同时既能普通保存，又能触发生效
- 一个 DTO 同时承载业务对象字段、审批实例字段、通知字段
- 一个命令响应直接回传完整聚合对象，导致前端误把响应当编辑源

---

## 7. 数据模型冻结前的接口检查点

在开始整理数据模型冻结前提之前，接口层至少应先确认：

1. 每个高敏感字段包是否都已被唯一映射到普通更新、命令型动作或系统派生三类之一。
2. 每个命令是否都已明确最小请求 DTO，而不是允许传入整个对象快照。
3. 每个命令响应是否只暴露结果事实与关键引用，不反向耦合完整查询模型。
4. 关键命令是否都具备 `expectedVersion` 或等价并发控制位。
5. 第二阶段发放审批是否已经要求 `acceptanceRecordId`，而不是继续依赖自由文本说明。
6. 差异复核、承接包初始化、人力成本归集与高敏字段投影是否都已具备独立 DTO 边界。
7. 第二批的分摊依据、阶段归属、税务处理、经营基线、时点快照 / 期末 / 重述和 gate 复核是否都已具备独立 DTO 边界，且未退回普通维护 DTO。
8. 第三批的回退 / 再基线化、例外揭示、审批摘要包和冻结后争议处理是否都已具备独立 DTO 边界，且未绕回详情 DTO 或普通维护 DTO。

---

## 8. 当前不在本文档中冻结的内容

当前仍不在本文档中写死以下内容：

- OpenAPI tag 划分与文件拆分结构
- schema 命名细节与代码生成映射
- 错误码体系、国际化消息与异常文案
- 统一鉴权中间件和审计事件模型
- 最终 query 接口返回视图

这些内容应在接口细化与数据模型冻结前再继续收敛。

---

## 9. 当前结论

第一阶段已经可以进一步冻结“接口合同边界”。当前最稳妥的推进方式，是先把高敏动作命令化、把请求 DTO 限制在动作最小输入、把响应 DTO 限制在结果事实与关键引用，然后把第一批与第二批已确认的 DTO 边界一并沉淀，再进入真正的 OpenAPI schema 与数据模型冻结设计。
