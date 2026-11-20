# I / 最小 R5：最终联合 G1 可评审契约

**ReviewReady / G1 Pending。** 用户已批准：4 个 R5 既有角色分配/冻结、2 个受控阶段命令、真实合同/移交事实驱动阶段、新项目仅初始 stage；权重允许0但须零分成原因，最多6位且总和精确1；仅最终验收可形成完成结论，并交付可追踪 conditional-completed 闭环；逐项本人关闭，全部闭合后更新条件状态，pending 阻归档。Root 冻结公共 schema/canonical/DDL/UI 后才准产品实现。本目录仅提案，没有运行 SQL/DB/API/HTTP/UI，也未使用 Git/GitHub。

固定输入仍为 Root 提供 `aaa4b16ac66092f0cb1dc6646a02cf14e80823ee`，目录 `E:/projects/worktrees/poms-r3hijk-next28/poms`。源文件 SHA 见 `sources.json`，commit 未由本代理独立核验。当前 #110 / I #113 / 阶段 #114；新 R5 父/最小子 Issue **尚未注册，不猜 ID**。4R5+8I+2stage+1条件关闭=15 个目标 HTTP。CreateProject 与 D prepare 是另两个既有入口的行为修正，不重复计新增操作。#101 完整阶段通过才可关闭，#57 保持 Open。

## 已核明：不依赖规则版本 producer

- `commission-settlement-design.md:110–134` 把角色分配/责任/冻结与计算有效规则分开；`12.1` 的 assignment 无 ruleVersionId，`12.2:416` 的 Calculation 才有。
- `interface-command-design.md:136` 的 freeze 前置是移交、未冻结、固定摘要/基线，不要求 active CommissionRuleVersion。
- Node `commission.service.ts:260–361` 的 create/freeze 不读 ruleVersion；`createCalculation:715–720` 才要求规则版本存在且 active；assignment entity 无 rule-version FK。
- 因此最小真实依赖仅现有 R4 合同/应收/pre-signing/移交 producer、R2 用户/组织/附件/摘要设施；**不新增规则版本操作，不执行 seed，不靠已有 seed 的规则版本解锁**。`weightsPolicyVersion='normalized-six-v1-zero-reason'` 是本次冻结的分配合法性协议版本，不冒充一个已审批生效的提成率/发放规则版本。

## 15 项目标 HTTP / DTO

路径均包含运行时 `/api`。权限 R=`project:read`，W=`project:write`，C=`commission:assignments:manage`；所有写请求都要 session-bound CSRF。服务端还核对项目真实责任/组织范围；平台 roleKey 名称本身不能冒充业务职责。所有 body 都不接受 actor/status/stage/frozen/审批结论，操作者来自 session。

| ID / operationId | 方法与路径 | 请求 → 响应 / 成功状态 | 权限 / canonical当前行 |
| --- | --- | --- | --- |
| R5-1 `CommissionController_getCurrentRoleAssignment` | GET `/api/projects/{projectId}/commission-role-assignment` | 无 → `CommissionRoleAssignmentSummary|null` /200 | C /200 |
| R5-2 `CommissionController_createRoleAssignment` | POST `/api/projects/{projectId}/commission-role-assignments` | `CreateCommissionRoleAssignmentRequest` → Summary /200 | C /201 |
| R5-3 `CommissionRoleAssignmentController_getRoleAssignmentDetail` | GET `/api/commission-role-assignments/{id}` | 无 → `CommissionRoleAssignmentDetailView` /200 | C /118 |
| R5-4 `CommissionRoleAssignmentController_freezeRoleAssignment` | POST `/api/commission-role-assignments/{id}:freeze` | `FreezeCommissionRoleAssignmentRequest` → `FreezeCommissionRoleAssignmentResult` /200 | C /119 |
| I-1 `ProjectController_listAcceptanceRecords` | GET `/api/projects/{projectId}/acceptance-records` | 无 → `AcceptanceRecordList` /200 | R /252 |
| I-2 `ProjectController_createAcceptanceRecord` | POST `/api/projects/{projectId}/acceptance-records` | `CreateAcceptanceRecordRequest` → `AcceptanceRecordSummary` /201 | W /251 |
| I-3 `ProjectController_listProjectCompletionRecords` | GET `/api/projects/{projectId}/completion-records` | 无 → `ProjectCompletionRecordList` /200 | R /254 |
| I-4 `ProjectController_createProjectCompletionRecord` | POST `/api/projects/{projectId}/completion-records` | `CreateProjectCompletionRecordRequest` → `ProjectCompletionRecordSummary` /201 | W /253 |
| I-5 `ProjectController_listProjectArchiveRecords` | GET `/api/projects/{projectId}/archive-records` | 无 → `ProjectArchiveRecordList` /200 | R /256 |
| I-6 `ProjectController_createProjectArchiveRecord` | POST `/api/projects/{projectId}/archive-records` | `CreateProjectArchiveRecordRequest` → `ProjectArchiveRecordSummary` /201 | W /255 |
| I-7 `ProjectArchiveRecordController_replaceProjectArchiveRecord` | POST `/api/project-archive-records/{id}:replace` | `ReplaceProjectArchiveRecordRequest` → ArchiveSummary /200 | W /257 |
| I-8 `ProjectArchiveRecordController_voidProjectArchiveRecord` | POST `/api/project-archive-records/{id}:void` | `VoidProjectArchiveRecordRequest` → ArchiveSummary /200 | W /258 |
| S-1 `ProjectController_startExecution` | POST `/api/projects/{projectId}:startExecution` | `StartProjectExecutionRequest` → `ProjectStageTransitionResult` /200 | W / **Root待新增** |
| S-2 `ProjectController_startAcceptance` | POST `/api/projects/{projectId}:startAcceptance` | `StartProjectAcceptanceRequest` → `ProjectStageTransitionResult` /200 | W / **Root待新增** |
| C-1 `ProjectCompletionRecordController_closeCompletionCondition` | POST `/api/project-completion-records/{id}/conditions/{conditionId}:close` | `CloseProjectCompletionConditionRequest` → `CloseProjectCompletionConditionResult` /200 | W+scope+本人 / **Root待新增** |

R5 create 与 archive replace/void 选择正式 OpenAPI 声明的200；Node 缺少某些 HttpCode 装饰器是待实际探针分类的基线漂移，Rust 不跟随隐含默认状态。全部15项、精确字段、约束/响应新增字段见 `contracts.json`；既有 shared schema 增补必须同步 DTO/OpenAPI/client，不静默改变 DTO。

## 目标 DTO 规则

公共类型：UUID；`Version=positive int`；`Hash=lowercase SHA-256 64 hex`；`Summary=trim 1..2000`；`Reason=trim 1..1000`；datetime=ISO UTC datetime，日期字段不误作 datetime。`EvidenceRef={attachmentLinkId:UUID}`，服务端从 active 项目链接及 active 已完成上传附件取 attachmentId/rowVersion/checksum/文件名并固定，必须能回到该项目。前端不能传一个任意字符串 hash 冒充附件；无需另造附件 producer，复用已经迁移的 R2 upload-session create/object/complete 和 attachment link。

- CreateAssignment：`participants[1..]`；每人 `userId,roleType(trim1..64),weight(number),responsibilitySummary(Summary)`；`expectedCurrentAssignmentId:UUID|null`、`expectedCurrentRowVersion:Version|null` 必填同空/同非空。首次均null，有current draft必须精确匹配；current frozen 返回409 `commission_frozen_change_requires_dispute`，不降级旧 frozen。兼容输入 displayName 可忽略，存储/返回名称由服务器用户事实产生。
- weight 保留既有外部 JSON number；从原始 JSON 数字 token 用十进制解析到 millionths，检查有限、≤6位有效小数、范围、exact sum，不经 f64 epsilon/浮点累计。返回同时给 `weightExact`（固定6位字符串）；不可变 payload 使用 weightUnits 整数。已决允许0，但须zeroWeightReason（Reason），正权重时该字段缺省/null；总和精确1保证至少一项正权重。相同 userId+roleType 不重复；同一人多角色可表达但全部须实际责任。所有参与者必须active，每项责任说明非空；协议版本 `normalized-six-v1-zero-reason`。
- FreezeAssignment：既有 sourceHandoverId、handoverSummarySnapshotId、comment?；expectedVersion 改为必填，加 expectedHandoverVersion、handoverBasisSnapshotId、expectedSourceHash。锁后核对 assignment current draft、真实 current confirmed handover、实际确认集合/全部本人确认、fresh basis/hash、同链 current receipt freeze。生成自己的角色冻结摘要，不直接冒用 handover 摘要。
- StartExecution：expectedProjectVersion、handoverStageRecordId、sourceHandoverId、commissionRoleAssignmentId、expectedRoleAssignmentVersion（**rowVersion**）、handoverSummarySnapshotId、sourcePayloadHash、reason。要求 active+handover、当前真实 handover本人确认链、真实current frozen assignment 同链，写显式准入事实；freeze 本身不推进 execution。
- StartAcceptance：expectedProjectVersion、executionStageRecordId、readinessSummary、evidenceSummary、evidenceRefs[1..]。要求 active+execution 和同项目真实 execution record；复核其冻结/移交链仍有效；实际 active 附件作为可验收成果证据，不把文本摘要或 H 建议当验收成果。固定附件ID/version/checksum/源hash形成 acceptance-entered。
- CreateAcceptance：既有 acceptanceType/result/scopeSummary/evidenceSummary/comment?；新增必填 expectedProjectVersion、acceptanceStageRecordId、evidenceRefs[1..]。stage-outcome/stage-acceptance/final-acceptance 都可作为真实验收事实留存；result accepted/conditional/rejected。conditional 必须有明确条件摘要；是否用于完成由下一规则决定，不因已写 confirmed 就自动完成项目。
- CreateCompletion：既有 acceptanceRecordId、completionResult、completedAt、completionSummary、evidenceSummary；新增 expectedProjectVersion、expectedAcceptanceVersion、evidenceRefs[1..]。必须同项目真实 confirmed final-acceptance、active+acceptance 阶段；accepted只允许completed，conditional只允许conditional-completed，rejected拒绝完成。conditional-completed必需completionConditions[1..]，每项summary/responsibleUserId/dueAt/evidenceRefs；其他结果禁止带条件。completedAt 是业务确认发生时间，服务端校验不早于来源验收时间、不晚于本次服务器时间；confirmedBy/createdAt 仍服务器生成。
- CreateArchive：既有 archivedAt/archiveSummary/evidenceSummary；新增 expectedProjectVersion；锁后无 current recorded，核真实终态来源。Replace/Void：既有 expectedVersion 从optional改为必填，理由/替代字段不变。时间不能早于锚定完成/关闭事实，也不能在服务器未来。
- 列表保留数组、原始字段与排序（业务时间DESC,createdAt DESC,id稳定tie-break），不存在项目404、存在项目无记录[]。增加 `sourceQualification:'verified-producer'|'legacy-unverified'`、sourceStageRecordId/sourcePayloadHash（历史为null）；用户界面用“历史记录待核验”，不暴露 producer_version 等实现术语。名字未知仍null，不能假造操作者。

`CreateProjectRequest.currentStage`精确收紧为literal assessment可选；缺省/assessment成功，高级stage返回400，不能静默改写。旧高级stage原值保留，认证只覆盖其读取/展示，不补造阶段事实、不SQL回填、不拿它证明新execution/acceptance/completion；缺少真来源的新推进返回409 historical-admission-required。历史真实终态的归档/替换/撤销兼容分支可保留，但新归档仍标legacy-unverified，只认证本次归档写入及其审计，不认证历史关闭/完工生产链；缺closedAt/来源验收无效/旧conditional条件无法核实均拒绝。历史重新认证/导入不是本片的隐藏producer。

已批准的回款含税→净税basis与成本显式分类后服务器派生由G/H/F的正式producer负责。角色freeze只固定同链receiptJudgmentMode和receiptFreeze引用，I只消费真实来源ref/hash，不从页面传值重算净税回款或成本，也不把H经营建议变为验收/完工硬门。

SummarySnapshot 语义：角色 freeze 的 `summarySnapshotId` 现在明确指**本次冻结摘要**，`handoverSummarySnapshotId` 独立保留上游引用；返回 projectionLevel=`commission-role-freeze`、exportPolicy=`commission-controlled`、summaryPackageKey=`commission-role-freeze-confirmation`。这是显式纠正 Native alias，必须对所有调用方审查并分类 `design-change-required`；历史读取不把旧 alias 重解释为新摘要。阶段结果的 summarySnapshotId 是各自阶段准入摘要，返回 projectStageRecordId、source refs、sourcePayloadHash、projectRowVersion。I各记录返回自己的原字段+新增来源，不把一个摘要ID同时当移交、冻结、验收。

无需新增阶段GET：既有ProjectController_getById的ProjectDetailView增currentStageRecordId（历史null）和projectRowVersion，D详情增handoverStageRecordId/projectRowVersion，使页面刷新后仍能取得真实CAS输入。既有getTimeline消费真实ledger的handover/execution/acceptance stage-entered；sourceType新增project-stage-record。completed里程碑仍用completion-record作权威来源，避免重复宣称完成；以上读侧扩展不重复计新增HTTP。

## 服务接口与归属

所有模块由 Root 分独立工程工作树后落地；本目录中的接口是拟冻结契约，不是实现。

```text
commission_assignment::execute(&mut CommonSession, Operation, ResourceKeys, AssignmentRequestWithRawWeights, &Actor) -> Result<Value>
commission_assignment::require_current_frozen(&mut CommonSession, projectId, exactRefs) -> FrozenAssignmentFacts
project_lifecycle::execute(&mut CommonSession, Operation, ResourceKeys, LifecycleRequest, &Actor) -> Result<Value>
project_lifecycle::enter_handover(&mut CommonSession, &Actor, projectLocked, handover, basis, expectedProjectVersion) -> StageFact
project_lifecycle::start_execution(..., frozen: FrozenAssignmentFacts) -> StageTransitionResult
project_lifecycle::start_acceptance(..., evidence: FrozenEvidenceSet) -> StageTransitionResult
project_lifecycle::require_terminal_source(...) -> TerminalSource
lifecycle_evidence::validate_and_freeze(&mut CommonSession, projectId, refs) -> FrozenEvidenceSet
project_action_authorization::require(&mut CommonSession, &Actor, project, action, trueSourceResponsibilities) -> ()
```

HTTP adapter继续是唯一 outer TX 所有者，模块只借 `CommonSession`，不另开 pool/事务/commit。角色模块不得依赖 I/阶段模块；阶段模块调用角色只读事实接口；D prepare 调阶段内部函数；I 调阶段/evidence 接口。通用 approval 层不能反向调用任意字段写入作为业务producer。

ResourceKeys必须保留关闭路径的completionRecordId（path id）和conditionId两个UUID，不能沿用当前adapter“最后一个id覆盖前一个”的单值匹配。assignment validator必须在ParsedBody.raw数值尚未变为serde_json::Value/f64之前校验weight token并携带weightUnits；`0.10000000000000001`不可先舍成0.1再放行，`1e-6`可精确归一到1单位而`1e-7`拒绝。OpenAPI multipleOf仅表达约束，不替代服务器原始十进制校验。

业务授权：沿用15项精确 permission，再结合真实 project主责、实际移交职责与 active user_org_membership 核组织；按照 business-authorization-matrix 的“维护/冻结/验收”动作映射校验对象职责，不依赖猜测的管理层 roleKey、seed用户或平台role名称。无法从真实关系证明授权时拒绝403；Root在联合G1把所用职责映射与负责的授权函数冻结，不允许出现仅UI显隐有约束的实现。最小职责映射候选已列contracts.json.authorizationPolicies，当前不包含管理者代本人确认fallback。

## 同事务事实、CAS 与审批摘要

1. D prepare 在真实合同审核绑定/生效快照/正式应收/pre-signing 来源均核完后，先写真实 handover/basis/summary/confirmation/todo，再写 handover-entered + project CAS→handover。首次允许真实早期当前态直接投影handover，保留实际 from_stage；不虚构assessment/scope/commercial历史。已handover重新准备可写 handover-requalified；execution/acceptance/completed/closed 不因重新准备倒退stage，需走明确受控恢复路径。
   当前D source fingerprint（sources.rs:328–330）只含projectId/salesOwner/members/materials，不含stage/rowVersion，因此阶段CAS不应让刚准备的hash自失效；响应需重读/同步post-CAS projectRowVersion。所有typed SQL后仅refresh已加载identity，不能清空其他模块待flush状态。
2. createAssignment：锁project→current assignment；expected current精确匹配；当前draft退出current/变superseded，再插新draft+participants+audit；version在project锁下max+1。旧frozen不准退出current，不允许以create替代dispute-first。
3. freeze：project→assignment→handover/basis/confirmation/participants→receipt freeze→source/version校验→生成immutable assignment payload和summary/field projections→CAS draft→frozen→audit→pending auth flush→outer commit。冻结只是“审批/确认”中的**本次有权限业务人正式确认**，无未定义多级审批，不替别人确认移交。ApprovalRecord若另有正式审批场景才可使用，不能插假的approved行。
4. startExecution：锁project和exact current stage/handover/freeze，校验new frozen producer+payload/hash和summary；插execution stagefact+summary，project CAS `WHERE row_version=? AND current_stage='handover' AND status='active'`；audit同TX。
5. startAcceptance：相同project lock，校验exact execution、仍有效freeze链和证据；固化证据快照、summary、acceptance stagefact、project CAS；audit同TX。
6. acceptance：锁project/current acceptance-entry，核expectedProjectVersion；固化验收+附件证据+明确确认actor/time+audit，不推进completed。completion：锁project→acceptance，核expectedVersion/同项目/有效/政策；插completion+已决条件项+证据，project CAS→completed，audit同TX。
   既有completion命令同时写真实completed stage_record并把project.current_stage_record_id指向它；无需新增completion阶段HTTP。此ledger记录引用刚写的completion，不能让current-stage指针继续误指acceptance。
7. archive：只锚定真实 confirmed completion，或历史兼容的closed-lost/closed-terminated/status=closed/closedAt事实；终态附属fact不改变project stage、不开新第九stage，也不声称最终结算/提成已清。锁project→current archive；partial unique `status='recorded'`。replace旧recorded→superseded+新recorded/原锚点/supersedes；void当前→voided，不回滚项目终态，不删历史；撤销后允许重新create。
8. CAS均核rows_affected=1；项目锁后仍重新读取目标。错误/审计失败/summary写失败/pending auth flush失败全rollback，未知commit仍unknown。证据附件按attachmentId后linkId稳定序加共享锁并冻结version/hash，不能与附件writer反序。重复提交以必填version返回409，不假称幂等成功。

## DDL 归属和约束

精确候选见 `ddl-proposal.sql`（**未执行，不是 migration**）。Root归一现有 schema-ddl/entity/shared-contract/OpenAPI 后选择最终迁移名：

- `project_stage_record` + `project.current_stage_record_id`；真实从/到、project版本前后、上游stage/handover/freeze/摘要、immutable payload/hash。只为本次新事实标producer1，历史NULL不补造。
- role participant normalized表（weight_units整数）、assignment新的producer/policy/freeze payload指针；独立freeze payload锚同链和自己的summary。保留project/version unique和single-current；无ruleVersion FK。
- stage/acceptance/completion证据子表固定真实attachment/link版本与checksum；验收/完工新增nullable来源字段，旧行允许NULL，新producer CHECK要求完整。新producer completion partial unique防同项目双完工。
- archive保留既有partial current unique、替代/撤销字段，仅补producer/sourceQualification所需来源payload；不改出is_current/version第二套定义。
- 已批准条件/closure表和completion.condition_status，连同第15入口一起冻结并交付；旧条件结论缺少追踪事实时读出legacy-unverified，不回填成closed。

## 已批准的两项业务裁决及正式依据

**Q1 权重（用户已选）：** 正式源 `phase2-commission-freeze-at-handover.md:117–119,224–230` 只要求权重合法/不缺责任说明；shared schema旧weight范围0..1，不代表总和、零权重或精度已定。本轮用户补充冻结：最多6位、sum精确1，允许零权重但必须零分成原因，所有角色仍须明确职责。不能把新增数值政策伪称旧正式源原文。

**Q2 完工（用户已选）：** `project-lifecycle-design.md:179–180` 说有效验收满足完成条件；`interface-command-design.md:104–105` 要有效验收+独立完成确认；EX24基线§3/§8只要求同项目有效验收并定义completed/conditional-completed，未证明final-only，也未定义结果匹配。本轮用户补充冻结：final-acceptance accepted→completed；final conditional→conditional-completed，必须每个剩余事项的内容/责任人/期限/真实证据，并交付以下第15项真实关闭入口；阶段验收不能完成全项目。

用户已批准pending条件不准归档，真实逐项关闭后才归档。完成结论永久conditional-completed，不因为关闭条件改写为completed；conditionStatus单独反映关闭事实。全部条件closed后仅服务端同TX更新conditionStatus，不用前端补写完成状态。

## 第15项本人条件关闭（用户已授权 / Root待canonical冻结）

`ProjectCompletionRecordController_closeCompletionCondition`，`POST /api/project-completion-records/{id}/conditions/{conditionId}:close`，200，W+同项目data scope+actor=条件真实responsibleUserId。请求 `CloseProjectCompletionConditionRequest={expectedCompletionVersion,expectedConditionVersion,closureSummary,evidenceRefs[1..]}`。一请求只关闭指定本人条件；不能跨项目、把路径condition挂到别人的completion，或body冒充责任人。最后一项关闭时服务端同TX把conditionStatus改closed；单route模板只计1个新增HTTP。

返回 `CloseProjectCompletionConditionResult={targetId:completionId,conditionId,conditionStatus:'closed',completionConditionStatus:'pending'|'closed',completionRowVersion,conditionRowVersion,closureRecordId,closedAt,closedBy,sourcePayloadHash}`。锁project→completion→condition，核actor==responsibleUserId、pending、两个version；插immutable closure+冻结证据，CAS condition→closed，再CAS completion rowVersion/conditionStatus（仅全部closed时置closed），audit同TX。UNIQUE(condition_id)保障一项只正式关闭一次。completion列表新增conditionStatus、conditions含本人待办资格/责任/期限/关闭人时间/证据/rowVersion，条件行allowedActions只给本人的close，项目普通编辑不得关闭条件。

有权项目负责人代闭合仅留后续提案：必须另有明确授权、真实closedBy和delegationReason，原responsibleUserId不改，不冒用本人。当前最小实现不提供代闭合fallback，不能把ProjectWrite或系统管理员泛化为代确认。

## 最小 UI 与真实验证

角色页面补草稿创建/替换（显示exact总和和责任）、当前版本/冲突刷新、固定移交+角色权重预览后正式freeze；当前只读freeze-binding继续读自己摘要与上游引用。项目详情加显式startExecution/startAcceptance（证据选择/真实上传）、验收/完工表单；条件分支加本人逐项关闭；归档复用既有create/replace/void并反映单current、待闭条件阻断。历史读展示“待核验”，有未满足准入不能出现可执行按钮。保留pending、只读、无权限、409后刷新；前端不重算H风险，不把H建议当I硬门。

验收须从独立真实用户、真实pre-signing/合同审批生效/应收/D准备/本人确认→R5freeze→显式execution→带真实附件acceptance-entry→验收→完工→条件本人关闭→归档/替换/撤销。正常完成与条件完成两条路径均须实际通过。读取原始HTTP/PG前后/浏览器证据，冻结缺失、跨项目、旧version、摘要hash变更、非法weight、stage伪造、停用参与人、draft替代frozen、代他人关闭条件都须拒绝。故障注入覆盖每个domain/summary/audit/auth-flush写点，同TX完整回滚；并发双freeze/双stage/双completion/归档replace-vs-void/本人重复close保证单事实、单current、CAS可解释。15目标分别计数，不把proposal/只读fixture算交付。
