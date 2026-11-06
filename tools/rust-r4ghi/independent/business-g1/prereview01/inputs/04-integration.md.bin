# R4 GHI 与最小 R5 联合 G1 输入草案

状态：**待 Root 审核，未通过 G1，未准入 G2**。本目录不修改产品、canonical、正式 baseline、Git/GitHub、DB/API 或凭证。Userfix #115 独立通过的证据不代表本业务批次通过。

唯一机器蓝图是 `blueprint.json`；G/H 共同内部模型是 `source-context.schema.json`；11条规则与精确数值常量冻结于 `policy-definition.json`，policyHash按现有canonical_hash算法生成；唯一迁移提案是 `migration.sql`；旧 Native 参考原样冻结在 `native-reference.schemas.json`；来源字节由 `sources.json` 冻结。`verify.py` 只读结构校验，不连接 DB，不生成产品。

## 操作边界

G9 + H8 + I既有8/新stage2/新condition1 + R5最小既有4 = **32**；R4本批28，另R5为4。新公开操作3，其余既有操作只发生协议/producer变更。正式R4总数从92扩为95只在Root冻结canonical后成立；正式交付仍为240/R4 67，目标验收后的272/R4 95仅预测。

| # | 归属 | canonical（无 /api） | operationId | request -> response | 成功状态 |
| --- | --- | --- | --- | --- | --- |
| 1 | G | `POST /operating-baseline-packages` | `ProjectCostController_activateOperatingBaselinePackage` | `ActivateOperatingBaselinePackageRequest` -> `OperatingCommandResult` | 201 |
| 2 | G | `GET /projects/{projectId}/operating-baseline-package` | `ProjectCostController_getCurrentOperatingBaselinePackage` | `none` -> `OperatingBaselinePackageSummary` | 200 |
| 3 | G | `POST /project-operating-snapshots` | `ProjectCostController_createProjectOperatingSnapshot` | `CreateProjectOperatingSnapshotRequest` -> `OperatingCommandResult` | 201 |
| 4 | G | `GET /project-operating-snapshots/{id}` | `ProjectCostController_getProjectOperatingSnapshot` | `none` -> `ProjectOperatingSnapshotSummary` | 200 |
| 5 | G | `POST /period-closing-snapshots` | `ProjectCostController_createPeriodClosingSnapshot` | `CreatePeriodClosingSnapshotRequest` -> `OperatingCommandResult` | 201 |
| 6 | G | `GET /period-closing-snapshots/{id}` | `ProjectCostController_getPeriodClosingSnapshot` | `none` -> `PeriodClosingSnapshotSummary` | 200 |
| 7 | G | `POST /operating-restatements` | `ProjectCostController_createOperatingRestatement` | `CreateOperatingRestatementRequest` -> `OperatingCommandResult` | 201 |
| 8 | G | `GET /projects/{projectId}/operating-restatements` | `ProjectCostController_listOperatingRestatements` | `none` -> `OperatingRestatementListView` | 200 |
| 9 | G | `GET /operating-restatements/{id}` | `ProjectCostController_getOperatingRestatement` | `none` -> `OperatingRestatementSummary` | 200 |
| 10 | H | `POST /operating-signal-evaluations/{id}:review` | `ProjectCostController_reviewOperatingSignalEvaluation` | `ReviewOperatingSignalEvaluationRequest` -> `ReviewOperatingSignalEvaluationResult` | 200 |
| 11 | H | `GET /operating-signal-evaluations/{id}` | `ProjectCostController_getOperatingSignalEvaluation` | `none` -> `OperatingSignalEvaluationView` | 200 |
| 12 | H | `POST /commission-gate-bindings/{id}:review` | `ProjectCostController_reviewCommissionGateBinding` | `ReviewCommissionGateBindingRequest` -> `ReviewCommissionGateBindingResult` | 200 |
| 13 | H | `GET /commission-gate-bindings/{id}` | `ProjectCostController_getCommissionGateBinding` | `none` -> `CommissionGateBindingHistoryView` | 200 |
| 14 | H | `GET /projects/{projectId}/business-outcome-overview` | `ProjectCostController_getProjectBusinessOutcomeOverview` | `none` -> `ProjectBusinessOutcomeOverviewView` | 200 |
| 15 | H | `GET /projects/{projectId}/unified-accounting` | `ProjectCostController_getProjectUnifiedAccounting` | `none` -> `ProjectUnifiedAccountingView` | 200 |
| 16 | H | `GET /projects/{projectId}/variance-risk-explanation` | `ProjectCostController_getProjectVarianceRiskExplanation` | `none` -> `ProjectVarianceRiskExplanationView` | 200 |
| 17 | H | `GET /projects/{projectId}/business-accounting-feedback` | `ProjectCostController_getBusinessAccountingFeedback` | `none` -> `BusinessAccountingFeedbackView` | 200 |
| 18 | R5-min | `GET /projects/{projectId}/commission-role-assignment` | `CommissionController_getCurrentRoleAssignment` | `none` -> `CommissionRoleAssignmentSummary` | 200 |
| 19 | R5-min | `POST /projects/{projectId}/commission-role-assignments` | `CommissionController_createRoleAssignment` | `CreateCommissionRoleAssignmentRequest` -> `CommissionRoleAssignmentSummary` | 200 |
| 20 | R5-min | `GET /commission-role-assignments/{id}` | `CommissionRoleAssignmentController_getRoleAssignmentDetail` | `none` -> `CommissionRoleAssignmentDetailView` | 200 |
| 21 | R5-min | `POST /commission-role-assignments/{id}:freeze` | `CommissionRoleAssignmentController_freezeRoleAssignment` | `FreezeCommissionRoleAssignmentRequest` -> `FreezeCommissionRoleAssignmentResult` | 200 |
| 22 | I | `GET /projects/{projectId}/acceptance-records` | `ProjectController_listAcceptanceRecords` | `none` -> `AcceptanceRecordList` | 200 |
| 23 | I | `POST /projects/{projectId}/acceptance-records` | `ProjectController_createAcceptanceRecord` | `CreateAcceptanceRecordRequest` -> `AcceptanceRecordSummary` | 201 |
| 24 | I | `GET /projects/{projectId}/completion-records` | `ProjectController_listProjectCompletionRecords` | `none` -> `ProjectCompletionRecordList` | 200 |
| 25 | I | `POST /projects/{projectId}/completion-records` | `ProjectController_createProjectCompletionRecord` | `CreateProjectCompletionRecordRequest` -> `ProjectCompletionRecordSummary` | 201 |
| 26 | I | `GET /projects/{projectId}/archive-records` | `ProjectController_listProjectArchiveRecords` | `none` -> `ProjectArchiveRecordList` | 200 |
| 27 | I | `POST /projects/{projectId}/archive-records` | `ProjectController_createProjectArchiveRecord` | `CreateProjectArchiveRecordRequest` -> `ProjectArchiveRecordSummary` | 201 |
| 28 | I | `POST /project-archive-records/{id}:replace` | `ProjectArchiveRecordController_replaceProjectArchiveRecord` | `ReplaceProjectArchiveRecordRequest` -> `ProjectArchiveRecordSummary` | 200 |
| 29 | I | `POST /project-archive-records/{id}:void` | `ProjectArchiveRecordController_voidProjectArchiveRecord` | `VoidProjectArchiveRecordRequest` -> `ProjectArchiveRecordSummary` | 200 |
| 30 | I | `POST /projects/{id}:startExecution` | `ProjectController_startExecution` | `StartProjectExecutionRequest` -> `ProjectStageTransitionResult` | 200 |
| 31 | I | `POST /projects/{id}:startAcceptance` | `ProjectController_startAcceptance` | `StartProjectAcceptanceRequest` -> `ProjectStageTransitionResult` | 200 |
| 32 | I | `POST /project-completion-records/{completionRecordId}/conditions/{id}:close` | `ProjectCompletionRecordController_closeCompletionCondition` | `CloseProjectCompletionConditionRequest` -> `CloseProjectCompletionConditionResult` | 200 |

## 来源与事务

Root单写公共模型/hash/loader。G唯一负责真实来源收集与分类，H唯一负责经营规则。G先锁完整影响集合，核pre-effect expectedInputHash；完成真实producer/CAS后形成H白名单finalSourceHash。本次生成self/result引用在capture context固定null且不进入sourceHash，不事后补写；实际既存restates/period root可作为上游，结果关联只在SQL FK/response，避免自引用hash循环。预分配ID后H纯derive，G一次INSERT最终v1事实与capture action，H同outerTX按snapshotId/v1/hash重载重算，写DMER/OSER/四阶段bindings/全原因/摘要。manual review只追加overlay和新有效bindings，永不改写G原snapshot。

baseline-only只写operating_baseline_source；不创建缺回款/成本的伪完整context。known-zero、未知、成熟度、正式可发布性分别表达；确认回款gross和冻结合同净税依据相连，成本必须显式include/exclude/reason。按真实source chain与allocation source-set消重；保留真实分期payment独立主体；shared share不伪造actual-cost行。

## 必要既有producer与边界

同一路C.confirm扩confirm/certify-existing-basis模式；B激活冻结真实currency；E/F普通写保护读取实际consumed membership，仅封闭的同TX restatement permit允许完整改正链。D.prepare先核变更前OwnerWrite再生产职责grant并写真实handover阶段。Project.create只接受assessment且记录creator/owner事实；Lead.convert保留真实初始owner来源。reassign先核旧责任链或真实未consumed creator origin，成功永久消耗首次指派权。detail/timeline回当前stage/版本及真实事件。这些不新增HTTP计数。

## 权限与数据范围

权限与项目关系同时满足。同组织、ancestor、任意roleKey、is_system_role、project:write或finance权限本身都不是project scope。current handover必须是实际v1 current与真实basis/本人confirmation链，不能latest兜底；当前组织成员事实fresh读取且受同TX锁保护。org-owned bootstrap只能从明确新origin事实得出，不能从当前owner=NULL或缺reassign历史反推。OwnCondition仅开放本人任务最小读取/关闭，完整父conditionStatus仍看全体条件；不扩成全项目经营读。

I最终refinements03与Root scope03原文必须并入来源清单；Root已采纳G/H经营写的OwnerWrite或真实ConfirmedDuty(finance)/BA三分支，仍需原finance权限。BA是实际current handover职责，不是平台roleKey。本轮不编造主管权限、管理配置或seed。详细可执行谓词、404/403/409边界和动作表见blueprint.scope。

## 公共接线与兼容

Root独占Cargo/lib/http/validation、shared DTO、OpenAPI/client、迁移/ORM、scope/common模型、既有关键controllers和中心workspace；G/H/I各写独立Rust业务目录与UI子件。named ResourceKeys保留条件route两个UUID，强制parent-child-project匹配；旧单key显式适配。权重原始数字token进checked millionths后再转JSON Value；接受1e-6、拒绝1e-7和0.10000000000000001，sum精确1000000，零权重有原因。

Root从冻结旧schema提取Native参考alias；新shared协议不可为了旧return literal而变optional、降低raw-null保护或使用any/as-cast。本批全部16个现代write DTO及C confirm统一required inputVersion=server-derived-v1，在Rust由来源计算，旧任意金额/结论只能是精确assertions。Native先显式判现代tag再返回422 reference_runtime_unsupported；Rust对legacy/缺tag返回422 legacy_reference_input_unsupported，现代tag后的shape错误400。不能靠新字段存在性误落旧producer；既有E/F未消费正常协议不无故加tag，sealed restatement分支明确v1。现有3个平台create的实际201/声明200单独记existing-baseline-drift。

## 迁移与验证

只提供一份forward migration草案（94->95），保留旧producer0/NULL原始含义，不补造历史。新结构增加同项目复合FK、nullable authority显式IS NOT NULL、不可变证据、权重合计与final验收/条件聚合/归档deferred检查。仅gross_margin_rate扩numeric(38,6)，money/tax/weight精度不变。NOT VALID复合约束明示保护旧未知行，不冒称整库验证。source hash和经营policy由共同Rust实现，不能用jsonb::text或第二套SQL公式替代。

Root须审核blueprint.rootDecisionItems并形成正式canonical/DTO/DDL/owner/范围baseline和字节manifest，经独立G1通过后才准G2。之后产品验证覆盖Native/shared/Rust/admin编译、迁移实体一致、真实作者链、精确数值/全部规则、故障回滚与并发、敏感JSON/DOM/audit、跨组织真实指派、同组织无关拒绝、creator首次指派永久消耗及职责自授阻断。本目录纯结构验证不能代替这些证据。
