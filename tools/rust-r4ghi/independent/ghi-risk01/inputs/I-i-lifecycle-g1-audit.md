# I 线联合 G1 审计候选

状态：**G1 Pending / 禁止产品编码**。本批 #110，I #113，完整阶段验收 #114；#101 只能在完整阶段通过后关闭，#57 保持 Open。审计基线为 Root 提供的 `aaa4b16ac66092f0cb1dc6646a02cf14e80823ee`、分支 `codex/poms-r4ghi-next25`，目录 `E:/projects/worktrees/poms-r3hijk-next28/poms`。本代理遵守禁用 Git/GitHub 的分工，未独立核验 commit；实际读取文件的 raw / CRLF-to-LF SHA-256 见 `i-source-manifest.json`。

只执行源码、设计、迁移、契约和 UI 静态审计；未启动 DB/API、未读取凭证、未运行 HTTP/PG/UI/并发或故障验收。Runtime 正式 240、R4 67/92 是本批输入，不能把本文件算成新增交付。期望模型 `gpt-6.1-sol/max`；本代理不声称已核实运行模型或 Fast。

## 结论与阻断

1. I 的 8 个既有 HTTP 均有 canonical 行，属于 R4。当前 Rust `contract_support/http.rs` 只注册 ABCDEF 67 个 R4 操作，未注册这 8 项。
2. **Rust 没有提成角色分配/冻结 producer。** `approval/domain.rs:90` 读取 current frozen assignment 作为最终发放审批的上游；`approval_common/domain_schema.rs` 仅有通用映射，不是 producer。`handover_facts/mod.rs` 明示仅提供附件使用的 4 个最小事实查询，也不产生角色冻结。
3. Rust 正式移交确认生成真实 confirmed handover 和 receipt judgment freeze，`project_handover/service.rs:646`、`view.rs:258` 刻意输出 `handover-confirmed-freeze-pending` / `executionAdmission.allowed=false`。按用户已决，职责可兼任、每个登录人只确认本人，最终移交事实**不自动进入 execution**。
4. 当前 Node/Rust 未找到 handover→execution 或 execution→acceptance 的生产命令；Node 项目服务唯一正常阶段写入是 completion→completed。公开 `CreateProject.currentStage` 却接受全部阶段，Rust 创建也直接保存该阶段。用高级 stage 创建项目或改库来证明完整链路会绕过准入，必须拒绝。
5. 收紧创建为 assessment 后，单独补两个命令仍不够：B 合同激活和 D 移交准备均未更新 project stage。建议 D **真实准备成功**后在同 outer TX 写 `handover-entered` 事实并 CAS project→handover；需真实核完合同、应收计划、pre-signing producer，不补造 assessment/scope/commercial 历史，不进入 execution。此项应作为本批必要依赖冻结。

## 8 个既有操作

所有路径运行时加 `/api`；GET 需 session + `project:read`，POST 需 session + session-bound CSRF + `project:write`。path ID 为 UUID，操作者取登录身份，不能由 body 代填。列表返回数组；不存在项目 404，空集合 `[]`。

| operationId | method + canonical path | 请求 DTO | 响应 DTO / 声明状态 | 当前 canonical 行 / R0 operations 索引 |
| --- | --- | --- | --- | --- |
| `ProjectController_createAcceptanceRecord` | `POST /projects/{projectId}/acceptance-records` | `CreateAcceptanceRecordRequest` | `AcceptanceRecordSummary` / 201 | 251 / 227 |
| `ProjectController_listAcceptanceRecords` | `GET /projects/{projectId}/acceptance-records` | 无 | `AcceptanceRecordList` / 200 | 252 / 226 |
| `ProjectController_createProjectCompletionRecord` | `POST /projects/{projectId}/completion-records` | `CreateProjectCompletionRecordRequest` | `ProjectCompletionRecordSummary` / 201 | 253 / 251 |
| `ProjectController_listProjectCompletionRecords` | `GET /projects/{projectId}/completion-records` | 无 | `ProjectCompletionRecordList` / 200 | 254 / 250 |
| `ProjectController_createProjectArchiveRecord` | `POST /projects/{projectId}/archive-records` | `CreateProjectArchiveRecordRequest` | `ProjectArchiveRecordSummary` / 201 | 255 / 233 |
| `ProjectController_listProjectArchiveRecords` | `GET /projects/{projectId}/archive-records` | 无 | `ProjectArchiveRecordList` / 200 | 256 / 232 |
| `ProjectArchiveRecordController_replaceProjectArchiveRecord` | `POST /project-archive-records/{id}:replace` | `ReplaceProjectArchiveRecordRequest` | `ProjectArchiveRecordSummary` / 200 | 257 / 212 |
| `ProjectArchiveRecordController_voidProjectArchiveRecord` | `POST /project-archive-records/{id}:void` | `VoidProjectArchiveRecordRequest` | `ProjectArchiveRecordSummary` / 200 | 258 / 213 |

`docs/design/rust-r0-api-operations.json` 的这 8 行 `migration.primary=R4`；canonical capability `listProjectAcceptanceRecords` 与 operationId 中 `listAcceptanceRecords` 的名称差异是既有映射，不重命名客户端。

请求 SSOT 为 `libs/shared/contracts/src/lib/shared-contracts.ts:5240–5413`；API DTO 是其 Zod 包装，不能从 ORM 反推类型。验收 type 为 `stage-outcome / stage-acceptance / final-acceptance`，result 为 `accepted / conditional / rejected`；scope/evidence trim 后 1–2000，comment nullable/optional 1–1000。完工引用 UUID acceptanceRecordId，result `completed / conditional-completed`，completedAt ISO datetime，completion/evidence 1–2000。归档 archivedAt ISO datetime，summary/evidence 1–2000；替代另需 replacementReason 1–1000，撤销需 reason 1–1000、comment ≤1000；替代/撤销 expectedVersion 当前 optional positive int。UUID、日期时间和 rowVersion 保持原语义，日期不是 date，不能静默截成业务日。

返回记录含真实审计时间/操作者、rowVersion；完工和归档列表补显示名，找不到用户则 null；命令返回名称 null、归档 allowedActions=[] 是既有 controller 行为，随后列表按终态+权限给 replace/void。列表顺序分别是 confirmedAt/completedAt/archivedAt DESC，createdAt DESC；如需加 id 稳定 tie-break，应标为确定性补强并冻结，不偷偷更改业务排序。

## 写侧、事务与版本链

- 验收：Node 仅允许 stage=acceptance，创建 confirmed 记录，时间/确认人由服务端生成，confirmationRecordId 当前 null。新实现须在 project 行锁内检查 stage/status 和真实 acceptance-entered 事实；不得因人为 currentStage 就给新生产认证。
- 完工：仅 acceptance、非 closed，引用同项目 confirmed accepted/conditional 验收；同 TX 插 completion + CAS project→`stage=completed,status=completed` + audit。项目锁串行化并发完工，任何一个写点失败则全回滚。现契约不限制 acceptanceType，建议本批保留；若业务要求 final-acceptance 或 conditional 对应结果匹配，先裁决再改契约，不能自行追加条件。
- 归档：只是终态附属 milestone，绝不新增第九主阶段。completed 必须 status=completed 且有真实 confirmed completion，锚定该 completion ID；closed-lost / closed-terminated 必须 status=closed 且 closedAt 有效，锚定 project。归档不把财务或提成结算标为完成，不等待未来 R5 payout；H 的经营建议不能自动变成关闭硬门。
- 唯一 current 归档由 `status='recorded'` 表达，没有 is_current/version 字段。保留 partial unique `uq_project_archive_record_project_current_recorded`。create 有 current 则 409；替代必须 path 指定当前 recorded 旧 ID，旧→superseded，新→recorded 并 `supersedes_archive_record_id=旧ID`，保留原锚点；撤销当前 recorded→voided，不删除历史。撤销后没有 current，可重新 create；此行为应保留且测试。
- 锁顺序统一 project→同项目来源事实/归档行（UUID 稳定序），先根据目标只读定位 project，再锁 project，再重新读目标，避免 replace/void 和 create 死锁。expectedVersion 即使保持可选，仍用重新读取的 rowVersion 做 SQL CAS，并检查 rows_affected=1；不存在/非current/版本陈旧不能成功。替代保持先旧状态退出 partial unique、再插新记录、最后 audit，均在同 outer TX。
- 复用 `contract_support/http.rs:236–340` 的单 outer TX + CommonSession/PendingAuthentication；service 只借连接，不能另开 pool/commit/savepoint。复用 `contract_support::audit`，metadata 记录 operationId/projectId、source IDs/hash、before/after、reason；audit 失败、pending auth flush 失败、CAS 失败一起回滚。未知 commit 结局保留 unknown，不能假称回滚。Node 上述方法仅 persist+flush，无完整来源锁/CAS/显式业务 audit，不把此缺口当迁移目标。

## 最小 R5-P1 依赖：4 个既有 HTTP

| operationId | canonical 路径（运行时 `/api`） | 行 / R0 索引 | 请求 / 返回 |
| --- | --- | --- | --- |
| `CommissionController_getCurrentRoleAssignment` | `GET /projects/{projectId}/commission-role-assignment` | 200 / 247 | 无 / `CommissionRoleAssignmentSummary` 或 null，200 |
| `CommissionController_createRoleAssignment` | `POST /projects/{projectId}/commission-role-assignments` | 201 / 248 | `CreateCommissionRoleAssignmentRequest` / Summary，声明 200 |
| `CommissionRoleAssignmentController_getRoleAssignmentDetail` | `GET /commission-role-assignments/{id}` | 118 / 58 | 无 / `CommissionRoleAssignmentDetailView`，200 |
| `CommissionRoleAssignmentController_freezeRoleAssignment` | `POST /commission-role-assignments/{id}:freeze` | 119 / 59 | `FreezeCommissionRoleAssignmentRequest` / `FreezeCommissionRoleAssignmentResult`，200 |

全部 `commission:assignments:manage`；POST 同样执行 session/CSRF。现参与人字段 userId UUID、displayName/roleType 非空、weight number [0,1]；create participants 非空数组。freeze 现字段 sourceHandoverId、handoverSummarySnapshotId、可选 expectedVersion、可选 comment。R5 不能把项目 sales/execution 职责分配直接当成提成权重，也不能把 UI 读冻结页面当成 producer。

R5-P1 必须负责：项目锁串行化 `version=max+1`、单 current、draft 建立与替换、冻结命令的同链来源验证、不可变 participants+weights payload/hash、frozenAt/frozenBy、审计与精确来源。**最小片仅允许替换当前 draft；current frozen 禁止 create 直接降级/替代，返回受控变更未交付。** Node create 当前可把 frozen→superseded 再造 draft，此绕过 dispute-first，不复制。未来争议/仲裁/替代、rule versions、计算、发放、离职例外不是本最小片。

冻结安全顺序：锁 project；锁/复核 current assignment draft + rowVersion；锁/复核同项目 current confirmed handover（producer_version=1）；复核实际 confirmation participants 全部本人确认、basis/contract summary/handover summary active payload/hash 与当前合同/应收/pre-signing 来源一致；锁/复核 current receipt freeze 同 handover/summary/basis/rebaseline/mode；校验参与者有效、权重及责任；产生 immutable freeze payload 和摘要；CAS draft→frozen；写 audit/可选正式 confirmation 记录；同 outer TX 提交。**freeze 不推进 project.currentStage**，不依赖 acceptance、H gate 或 payout，因此 R4 handover facts→R5-P1 freeze→R4 execution admission 构成有向链，无 R4/R5 阶段互等。

内部审批机制：freeze 是当前受 `commission:assignments:manage` 保护的正式确认命令；不能以 generic ApprovalController 任意 target 更新冻结字段。最小片可复用 SummarySnapshot/Projection 设施，服务端建立绑定固定 payload 的 `commission-role-freeze` 摘要定义和快照；不凭空增加未定义的多级审批/代确认。若需要独立审批，应先另冻审批场景/确认主体/拒绝状态，纳入依赖，不能用虚假 approved 行替代。

## 必要 R4 阶段命令候选（尚无 canonical 行）

Root 先冻结命令行、SSOT、DTO/OpenAPI 和权限，再编码。建议不暴露可任意设置 toStage 的 PATCH：

| 候选 operationId / path | 最小 DTO | 条件与结果 |
| --- | --- | --- |
| `ProjectController_startExecution` / `POST /projects/{projectId}:startExecution` | expectedProjectVersion positive int；sourceHandoverId UUID；commissionRoleAssignmentId UUID；expectedRoleAssignmentVersion positive int；handoverSummarySnapshotId UUID；sourcePayloadHash 64 hex；reason trim 1–1000 | `project:write`，project active + currentStage=handover，当前同链有效冻结与移交严格一致；独立显式准入，写 execution-entered 记录、project CAS→execution、audit；响应 targetId/projectStageRecordId/businessStatusAfter/projectRowVersion/sourceHandoverId/commissionRoleAssignmentId/summarySnapshotId/sourcePayloadHash |
| `ProjectController_startAcceptance` / `POST /projects/{projectId}:startAcceptance` | expectedProjectVersion positive int；executionStageRecordId UUID；readinessSummary/evidenceSummary trim 1–2000 | `project:write`，project active + currentStage=execution，真实同项目 execution 事实、同链冻结仍有效，形成可验收范围/证据；写 acceptance-entered 记录、project CAS→acceptance、audit；响应 targetId/projectStageRecordId/businessStatusAfter/projectRowVersion/executionStageRecordId/summarySnapshotId/sourcePayloadHash |

时间和执行人均服务端生成；body 不接受 actor、toStage、status、frozen 标记或审批结论。重试同命令可选增加客户端 commandId UUID + UNIQUE(projectId,commandId)，需先冻结幂等语义；最小实现也可用必填 expectedProjectVersion 拒绝重复 409，不谎称重复创建幂等。

`CreateProjectRequest.currentStage` 建议改为 `literal('assessment').optional()`；缺省/assessment 成功，其余明确 400 校验失败，既有路径不变但为行为收紧，必须在共享 schema、Rust校验、OpenAPI/client、UI 与迁移文档同步标注。不得静默改写高级 stage 为 assessment。旧高级 stage 保持原值并可读，不批量回填/降级，不给它补造 execution/acceptance 认证事实；其新业务写入需真实来源复核，无法复核返回 historical-admission-required。历史接续/导入经独立受控 requalification 切片，不能在本批借读兼容扩出导入 producer。

## DDL / DTO / UI 候选（Root 独占公共编辑）

1. 现有三表、archive replacement/current partial unique 均存在，基础 8 项不需要重建表。补 `project_stage_record`：id、project_id、sequence_no、from_stage、to_stage、entered_at/by、project_row_version_before/after、source_handover_id、commission_role_assignment_id、source_stage_record_id、source_payload_json/hash、summary_snapshot_id、producer_version=1、created_at；UNIQUE(project_id,sequence_no)，FK RESTRICT，自引用禁止 self-cycle；只允许 handover/execution/acceptance 受控迁移，新字段/enum/check 先 DDL 后映射。handover 事实可保留真实 from_stage，无需伪造早期节点。
2. 为新生产 acceptance/completion 加 nullable provenance 字段（legacy 保持 NULL）：producer_version、source_stage_record_id / execution_stage_record_id、source_payload_hash、source_*summary_snapshot_id；新 producer CHECK 要求完整来源，老行不伪造 hash。新完成事实可加 UNIQUE(project_id) WHERE producer_version=1 AND status='confirmed' 作为项目锁外的最后保障，但须先审计历史重复、保留旧行。
3. R5 assignment 增 producer_version、freeze_payload/hash、receipt_judgment_freeze_id、handover_basis_snapshot_id、freeze_summary_snapshot_id；保留 project/version unique、single-current partial unique 和 rowVersion。新 frozen CHECK 需来源/actor/time/payload/hash 非空；不回填 legacy 为正式 producer。新冻结摘要引用 assignment ID/version/participants 与 handover chain；不能只返回旧 handover 摘要充当包含权重的冻结摘要。
4. 现 participants 没有 responsibilitySummary，Node 也没有权重合计 guard。建议 DTO 加必填责任说明（或严格引用同一 handover responsibility ID），拒绝重复 userId+roleType，权重用十进制精确求和=1，不靠浮点 epsilon 放行。权重精度/零权重政策、提成角色类别与允许兼任须由 Root 冻结；移交职责可兼任的已决不能自动推导提成规则。
5. UI 当前验收/完工仅列表/时间线，没有 producer 表单；归档 create/replace/void 已在 project-detail + project.store；commission-freeze-binding 是只读视图。真实 UI 验收需补角色草稿/冻结、execution/acceptance 准入、验收/完工表单，成功后重读详情/时间线；冲突后刷新，拒绝/缺权限/历史未认证显示真实原因。保留归档终态附属里程碑，不增第九阶段。H 输出只展示其 immutable refs/hash 和并列原因，I 不重算 H，也不等待 payout。

## 需 Root/用户冻结的歧义

- 已提交裁决的必要依赖：4 R5 + 2阶段命令 + 初始 stage 收紧，以及真实 D prepare→handover 的同TX事实承接；未通过前 G1 Pending。
- 权重：建议总和精确=1、冻结前 user active、同 user/role 唯一、必须责任说明；零权重和精度需明确。不要默认新增多人审批。
- 冻结摘要：建议产生角色权重自己的 immutable snapshot；现 Native `summarySnapshotId` 直接等于 handover summary，正式设计要求冻结摘要回溯到 handover。建议既有 summarySnapshotId 明确为 freeze summary 并保留 handoverSummarySnapshotId，按 design-change-required 同步 DTO/下游；如坚持旧字段语义，则另增 freezeSummarySnapshotId，不能混淆。
- 完工来源：既有契约允许 stage-outcome/stage-acceptance/final-acceptance 的 accepted/conditional，且 completionResult 独立。建议本片保留；final-only/条件匹配如果要收紧，应单列冻结。
- 闭环含关闭分支：目前没有真实 closed producer，历史 closed 归档可做兼容分支验证；不得称其为新建→关闭真实完整链。若 #114 要认证关闭路径，需另冻 close/terminate 命令和原因，不能改库。

## G3 / #114 实际验收输入

以下只是测试计划，当前全为 Not-run，不是 Pass：

- HTTP：8项所有成功/404/空集合/权限/未登录/CSRF/DTO，full response schema+status；R5-P1四项和新增命令分别记账，不冒充原 R4 25 项。
- 真链：独立用户登录→真实pre-signing版本/合同审核激活/正式应收→D准备→本人多职责确认→最终移交事实（仍阻execution）→R5草稿和正式freeze→显式execution→显式acceptance→验收→完工→归档→替代→撤销；全程 UI/HTTP receipts + PG只读前后对照，不能改 stage/插冻结/改库写业务事实。
- 故障：逐个写点注入 completion insert/project update/audit；archive旧 superseded/新 insert/audit；R5 payload/summary/CAS/audit；阶段record/projectCAS/audit；pending-auth flush 失败。验证业务+summary+audit+session 同TX无部分落地；unknown commit 单列。
- 并发：双完成只能一条正式完成；双归档一current；replace-vs-replace/replace-vs-void/create-vs-void 保持可解释链；双角色草稿单current、双冻结一次生效；freeze-vs-rebaseline/startExecution-vs-refreeze/startAcceptance-vs-terminal update 陈旧方409，全链无死锁/悬空引用。
- 拒绝：跨项目acceptance/summary/freeze/receipt；rejected或voided验收；非current归档、旧version；active/completed状态不一致；缺completed/closedAt；假手工高级stage；未冻结、过期handovers、摘要hash破坏、未本人确认、冻结草稿绕过受控变更、无权重责任/非法总和/停用参与人；历史无producer不可冒充新生产。
- UI：真实浏览器角色权限、移动端/键盘表单、pending/冲突/只读/历史未认证、前后详情+时间线同事实、归档替代撤销后重读、没有第九阶段；四个R5页面/命令若未实现仅可报 Partial。
- 工程：Rust fmt/clippy/tests、受影响 Node lint/build/tests、Admin lint/build、OpenAPI+client一致性、migration/ORM drift（每项有 Pass/Failed/Not-required/Blocked），由 Root按最终触及范围冻结；本只读审计不运行这些检查。

使用记忆仅为治理边界提醒：`MEMORY.md:347–352`（独立责任和子片不能关闭父项，rollout `01a1745d-bfa3-7603-b07d-16afa227d566`）。所有当前业务判断均来自本次源码核对，不沿用旧运行状态。
