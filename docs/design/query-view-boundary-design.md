# POMS 查询视图边界设计

**文档状态**: Active
**最后更新**: 2026-03-25
**适用范围**: `POMS` 第一阶段在进入表结构冻结与 schema / DDL 细化前，对查询接口、详情视图、经营看板与统一待办读侧边界的基线约束
**关联文档**:

- 上游设计:
  - `poms-requirements-spec.md`
  - `poms-hld.md`
  - `poms-design-progress.md`
  - `design-review-follow-up-summary.md`
- 同级设计:
  - `interface-command-design.md`
  - `interface-openapi-dto-design.md`
  - `data-model-prerequisites.md`
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `business-authorization-matrix.md`

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
- 回款确认结果、付款确认结果、发票异常 / 关闭结果
- 提成计算版本、发放记录、冲销与重算关系
- 审批实例状态、确认实例状态、动作留痕时间与处理人

---

## 5. 第一阶段核心查询视图建议

### 5.1 销售流程域

| 查询视图               | 主要对象     | 目标               | 最小字段组                                                                                                     | 额外约束                         |
| ---------------------- | ------------ | ------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `ProjectListView`      | `Project`    | 支撑项目列表与筛选 | `projectCode`、`projectName`、`customerName`、`currentStage`、`ownerOrgName`、`ownerName`、`latestMilestoneAt` | 不携带完整合同与提成明细         |
| `ProjectDetailView`    | `Project`    | 支撑项目详情页     | 主体字段、阶段摘要、当前投标摘要、当前合同摘要、当前审批 / 确认摘要、`allowedActions`                          | `allowedActions` 仅是视图输出    |
| `BidProcessDetailView` | `BidProcess` | 支撑投标子流程详情 | 投标基本信息、当前决策状态、结果状态、相关审批摘要、附件摘要                                                   | 不代替 `ProjectDetailView`       |
| `ProjectTimelineView`  | `Project`    | 支撑阶段里程碑追溯 | 关键动作时间线、动作人、动作结果、关联审批 / 确认引用                                                          | 以动作事实为主，不以列表字段拼装 |

### 5.2 合同资金域

| 查询视图                 | 主要对象         | 目标                   | 最小字段组                                                                                                    | 额外约束                           |
| ------------------------ | ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `ContractListView`       | `Contract`       | 支撑合同台账列表       | `contractNo`、`projectCode`、`projectName`、`contractStatus`、`signedAmount`、`effectiveAt`                   | 金额字段必须标明当前口径           |
| `ContractDetailView`     | `Contract`       | 支撑合同详情           | 主体事实、当前有效条款快照摘要、变更版本摘要、应收计划摘要、回款汇总摘要、发票汇总摘要、`allowedActions`      | 快照字段与主表草稿字段应分区展示   |
| `ReceivablePlanListView` | `ReceivablePlan` | 支撑应收计划列表       | `planNo`、`contractNo`、`plannedAmount`、`plannedAt`、`planStatus`、`version`                                 | 列表中不展开全部节点明细           |
| `ReceiptRecordListView`  | `ReceiptRecord`  | 支撑回款登记与确认列表 | `receiptNo`、`projectName`、`contractNo`、`registeredAmount`、`confirmedAmount`、`recordStatus`、`sourceType` | 草稿金额与确认金额不得混用         |
| `InvoiceRecordListView`  | `InvoiceRecord`  | 支撑发票台账列表       | `invoiceNo`、`projectName`、`invoiceAmount`、`invoiceStatus`、`exceptionStatus`                               | 异常状态为派生展示，不替代动作记录 |

### 5.3 提成治理域

| 查询视图                          | 主要对象                | 目标             | 最小字段组                                                                                            | 额外约束                             |
| --------------------------------- | ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `CommissionCalculationListView`   | `CommissionCalculation` | 支撑计算结果列表 | `calculationNo`、`projectName`、`ruleVersionName`、`calculationStatus`、`calculatedAmount`、`version` | 列表只展示当前结果摘要               |
| `CommissionCalculationDetailView` | `CommissionCalculation` | 支撑计算详情     | 输入快照摘要、角色分配摘要、结果摘要、重算链摘要、审批摘要                                            | 输入来源必须可追溯到快照或版本       |
| `CommissionPayoutListView`        | `CommissionPayout`      | 支撑发放列表     | `payoutNo`、`projectName`、`approvedAmount`、`paidAmount`、`payoutStatus`                             | 批准金额与实际登记金额并列但不可混算 |
| `CommissionAdjustmentHistoryView` | `CommissionAdjustment`  | 支撑异常调整追溯 | `adjustmentType`、`relatedTargetType`、`relatedTargetId`、`resultStatus`、`handledAt`                 | 以动作事实为中心                     |

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

### 5.4 横切支撑域

| 查询视图                       | 主要对象             | 目标             | 最小字段组                                                                                                              | 额外约束                 |
| ------------------------------ | -------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `TodoItemListView`             | `TodoItem`           | 支撑统一待办入口 | `todoId`、`todoType`、`targetType`、`targetId`、`targetTitle`、`currentNodeName`、`dueAt`、`priority`、`allowedActions` | 不直接替代业务对象详情   |
| `ApprovalRecordDetailView`     | `ApprovalRecord`     | 支撑审批追溯     | 当前状态、节点进度、处理历史、关联对象摘要                                                                              | 节点历史与当前节点要分层 |
| `ConfirmationRecordDetailView` | `ConfirmationRecord` | 支撑确认追溯     | 当前状态、参与人进度、历史处理记录、关联对象摘要                                                                        | 多方确认进度应是派生展示 |
| `AuditEventListView`           | `AuditLog`           | 支撑统一审计查询 | `eventType`、`targetType`、`targetId`、`operatorName`、`occurredAt`、`result`                                           | 不承载业务对象字段镜像   |
| `SecurityEventListView`        | `SecurityEvent`      | 支撑安全追溯     | `eventType`、`actorName`、`path`、`permissionKey`、`occurredAt`、`result`、`severity`                                   | 不替代原始接入日志       |

---

## 6. 经营看板与跨域汇总边界

第一阶段建议把经营看板作为独立读侧聚合，而不是把多个列表 DTO 拼出来。至少建议固定以下边界：

1. `ProjectOperatingView` 以 `Project` 为中心聚合合同、回款、成本、发票和提成摘要。
2. 汇总字段必须区分“草稿口径”“待确认口径”“已生效口径”，默认经营主指标以已生效口径为准。
3. 若经营看板展示“风险提示”，应明确其属于派生视图字段，而不是业务主状态本身。
4. 第一阶段经营看板只做高频摘要与钻取入口，不在同一接口中展开全部动作历史。

建议的 `ProjectOperatingView` 最小字段组：

- `projectId`
- `projectCode`
- `projectName`
- `currentStage`
- `contractSignedAmountSummary`
- `receivableConfirmedAmountSummary`
- `receiptPendingConfirmationAmountSummary`
- `payableRegisteredAmountSummary`
- `invoiceIssuedAmountSummary`
- `commissionCalculatedAmountSummary`
- `grossMarginSummary`
- `riskFlags`
- `lastUpdatedAt`

补充说明：

- 第一阶段平台治理域不强制建设独立经营看板，但至少要具备用户、角色、组织、导航四类管理查询视图
- 提成治理域至少要具备列表、详情、历史三类查询视图，否则写侧命令无法形成可验证闭环

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

第一阶段现在已经不只需要写侧边界，也需要读侧边界。当前最稳妥的推进方式，是先把列表、详情、经营看板、统一待办和历史追溯几类查询视图固定为稳定读模型，再据此进入表结构冻结设计，最后才进入真正的 schema / DDL 级细化。
