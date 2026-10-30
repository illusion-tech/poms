# RUST-R2L 四操作 G1 候选来源输入

状态：**G1Candidate，非 G1 Pass**。日期：2026-10-30。来源提交 `02b8956759352b2612bec5980cbe55ae77d0293f`，Root 已核对分支 `codex/poms-r2l-lookup` 未漂移。本文件与 `l-sources.json` 是作者 A 独占输入；联合 baseline、正式 G1 审查及在线状态由 Root 统一。本轮未修改产品、公共层、fixture、迁移、DB、环境、Git 或 GitHub。

## 1. 来源与配置履历

预核验 partial 原件保存在 `tmp/rust-r2l/preconfigured-drafts/l-source-input.md` 和 `l-sources.json`。旧稿来自复用代理 `/root/r2i_impl`，该次实际 model/effort 无显式工具回执；不能倒写成现配置执行或 G1 Pass。当前作者 `/root/l_impl` 由 Root 显式登记 `gpt-6.1-sol` / `max`，本子任务不另行推断不可观测的底层运行配置。Fast 无独立工具参数/回执，保持**未核实**。计划 1.1/1.2 的独立分工、非作者审查、证据绑定与集中验收适用。

当前工作树及上级检查无 AGENTS.md。已读 POMS implementation/governance 技能及 governance-summary/source-map；用户已授权完整 G0–G4，正式 G1 前只补输入，通过后按冻结范围继续，事务 store 必须先有本批 Native 实证。

## 2. 范围与四操作

L 主项 #79，父 #67 / 总体 #57；#61 两业务号 lookup 子项 #84 由 B/Root 独立裁决并经原生成器同步。L 按目标 UUID 读真实实体，不调用 lookup HTTP。L1 #81 交付七表内部机制，0 新增公开操作。本批四项全部 G4 后，R2 才可从 104/108 计至 108/108；R2M #80、整个 R3–R5、父项、部署与性能结论不因此完成。

| 方法 | 既有路径                             | operationId                            | 原权限          | 请求 / 响应                                               |
| ---- | ------------------------------------ | -------------------------------------- | --------------- | --------------------------------------------------------- |
| GET  | `/api/approval-records/{id}`         | `ApprovalController_getApprovalRecord` | `project:read`  | path string / `ApprovalRecordSummary`，200                |
| POST | `/api/approval-records/{id}:approve` | `ApprovalController_approveRecord`     | `project:write` | `ApproveRecordRequest` / `CommandResult`，显式 200        |
| POST | `/api/approval-records/{id}:reject`  | `ApprovalController_rejectRecord`      | `project:write` | `RejectApprovalRecordRequest` / `CommandResult`，显式 200 |
| GET  | `/api/me/todos`                      | `ApprovalController_getMyTodos`        | `Authenticated` | 无 body / `TodoItemList`，200                             |

四条 authoritative inventory 行为 `api-route-canonical-inventory.md:128–131`，当前/目标 aligned；无新增或改名路由。保留 escaped-colon 入口，不加 slash-action alias。findLatestApprovalForTarget 保持内部方法，不新增第五个 HTTP。

## 3. DTO、响应与守卫

直接权威为 approval.controller.ts、`libs/api/contracts/src/lib/approval/approval.dto.ts`、shared-contracts.ts:7141–7351 和冻结 OpenAPI 的四操作/递归 schema。manifest 保留该子树、所有递归引用和逐文件 raw/LF 哈希。

- approve comment 可缺省，原 Zod trim 后长度 1–1000；expectedVersion 为可缺省正整数。reject reason 必需，trim 后 1–255，comment 相同。保留缺省/null/type/非 object/unknown-key strip、数值边界及 issue 顺序，不新增严格拒绝未知键。
- path id 是原 @Param string，无 UUID pipe；不新增 UUID 预校验。非法 ID、大小写、编码、尾斜线、HEAD/未知 method 与 UTF16 由原 HTTP/PG 对照冻结。
- 四响应只有 @ApiOkResponse，**无 @ZodSerializerDto**；vendor 全局 interceptor 无 metadata 时直接返回 res，不能新增 response parse。CommandResult.snapshotId 契约可缺省/nullable；真实三个分支均显式返回 null 或实际新快照 ID。
- 全局顺序 SessionAuthGuard → AuthCsrfGuard → PermissionsGuard → 请求 pipe → service。POST 的会话/CSRF/权限先于 DTO/领域校验。todos 只需登录，不加项目 owner/domain/finance-sensitive 权限。
- 认证失败原 `Authentication required` 与 code；CSRF 403 `csrf_failed` / `CSRF token validation failed`；权限 403 `permission_denied` / `Insufficient permissions`。拒绝事件、原 raw touch、pending managed-auth 的提交边界由 Root 接入。
- 复用 L1 Text/Value/JsField 与 Root HTTP UTF16/error authority。raw JSON、JS trim/truthiness/nullish、孤立 surrogate、PG text/JSONB 分别校准，不先 lossy 化。

## 4. 两读的真实事实

详情先按 ID 读 ApprovalRecord，不存在由 controller 抛 404 `ApprovalRecord ${id} not found`；按 targetObjectType 只查对应目标。Contract 提供 contractNo/status，Payout 提供 stageType/status，Adjustment 提供 adjustmentType/status。关联缺失保持 null fallback，不追加域 404。节点/阶段/调整文案及未知 key fallback 保留原映射。

todos 只过滤 assigneeUserId 和 open/processing，只按 createdAt ASC，不加 ID tie-breaker。空集合直接 []。非空先 distinct IDs，再原 Promise.all 批读 ApprovalRecord/Contract/Payout/Adjustment/Project/Lead/Customer，不新增一致性事务。六类目标名称来自 contractNo/阶段文案/调整类型文案/projectName/leadName/displayName。

currentNodeName 优先关联 approval；否则只有 sales-follow-up-record + sales-follow-up-reminder 用 todo.dueAt 生成“下次跟进”，并不再读 SalesFollowUpRecord。allowedActions 仅 approval todo 且 open/processing 为 approve/reject。提醒按原手动 UTC+8 到分钟。L1 SuppliedFacts 是纯投影，L 必须用真实 SQL 填三类详情及六类 todo facts。

## 5. 公共决策与三分支

完整读过 ApprovalService 全文件。transactional 中顺序：ApprovalRecord → expectedVersion → pending → assignee → actor 的 open/processing approval Todo。错误优先级：404 `ApprovalRecord ${id} not found`；409 `approval-record version ${expected} does not match current version ${actual}`；400 `ApprovalRecord ${id} cannot be processed in status ${status}`；403 `ApprovalRecord ${id} is not assigned to current user`。内部 expectedVersion 只检查 !== undefined，不把 HTTP Zod 边界加到内部调用。

先改 managed approval status/decision/comment/decidedAt/closedAt/approver，再改找到的 todo completed/canceled/completedAt，之后才查领域目标。无 todo 仍成功且 todoItemIds=[]。approve comment 用 nullish fallback；reject 按 JS truthiness 拼 reason、换行和 comment。unsupported 在公共赋值后抛 400 `ApprovalRecord ${id} is not supported by the current approval slice`；失败后已有父对象 dirty 可见性保留 L1 fork 语义，不预先拒绝抹去它。

| 原 target/type                                         | approve                                                                                            | reject                   | 不追加的业务             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------ |
| contract / contract-review                             | Contract.status=pending-review                                                                     | draft                    | 生效/签约/完整合同审核链 |
| commission-payout / commission-payout-approval         | approved；approvedAmount=approvedAmount ?? theoreticalCapAmount；单独 approvedAt；approvedBy=actor | draft，三批准字段清 null | 实际发放/调整执行/重算   |
| commission-adjustment / commission-adjustment-approval | Adjustment.status=approved                                                                         | rejected                 | 调账/冲销/扣回/重算      |

缺目标在公共赋值后抛 404 `Contract ${id} not found` / `CommissionPayout ${id} not found` / `CommissionAdjustment ${id} not found`。原决策无目标业务 status 再校验，不搬 submit draft/pending 检查。first/second 不读结算链；reject 任意 payout 阶段不跑正向 gate/快照验证。

## 6. final/retention 最小闭包

final approve 在 payout 已赋 approved 后，依次读项目当前 frozen RoleAssignment、active final GateBinding、binding 最新 active GateReview（handledAt DESC/createdAt DESC）。三项缺失按原次序分别为 400：`Current frozen CommissionRoleAssignment is required before processing final payout approval for project ${projectId}`、`Active final commission gate binding is required before processing final payout approval for project ${projectId}`、`Active final commission gate review is required before processing final payout approval for project ${projectId}`。仅 trim/lowercase 后 block/block-* 拦截；review/review-* 不因此拦 final。

retention approve 顺序：current settlement → active → finalSettlementStatus=pending-retention-settlement 且 retentionSettlementStatus=ready-retention → receipt/departure 两引用 truthy → 当前 freeze/binding/review → gate → due → receipt → departure → confirmationRequirementSummary → submitted dispute。gate 加拦 review/review-*；错误原文与首次失败顺序按 approval.service.ts:854–919。

receipt 只验证同项目 confirmed；departure 验证同项目/当前 freeze/isCurrent/active，confirmationRequirementSummary?.trim() 无文字；当前 freeze 无 submitted dispute。**不新增 ConfirmationRecord/Participant 查询或人数门槛**，上游 handover 确认链单独见证。

approve 没有 submit 才有的 nonRetentionSettlementStatus、currentSnapshot.freezeVersionId 与当前 freeze 一致、summarySnapshotId 三方相等、gateReviewRecordId 相等及可选 baselineSelectionSource 相等检查。不能为加强证据链而移植 submit 校验。

due 来源为当前 freeze.effectiveHandoverBaselineSnapshotId → ContractTermSnapshot.retentionDueDate；无 baseline/行/日期为 missing，未来 pending，当天 due。业务日期 **Asia/Hong_Kong**；string 直接 slice(0,10)，Date 用 Intl，不新增字符串语法检查。缺 due/pending 分别抛 `CommissionPayout ${id} cannot approve retention payout without a current retention due date fact` / `CommissionPayout ${id} cannot approve retention payout before retention due date ${date}`。

approve 调 buildRetentionSettlementDraft 时 openFreezeDispute=false，**不传 markAsSettled**；成功仍 pending-retention-settlement / settled-non-retention / ready-retention，解释 ready-retention/allow-retention。registerPayout 独立命令才传 markAsSettled 并 settled-all。settlement-write-chain 与 business-date 完整文件均已读完；只认证原 approve 实参组合，不认证全部 R5 生产者。

## 7. 双快照、金额、日期与精确写集

final 旧 current 先 isCurrent=false/status=superseded/updatedBy=actor，存在时立即 em.flush；再建新行：独立 version=旧+1（无旧为1）、current=true、active、supersedes=旧ID。复制 freeze.id/gateReview.id，binding 的 baselineSelectionSource/taxImpactSummary/taxImpactPendingAmount/dataMaturityLevel/costActionRecommendation/currentActionLevel/referencedBaselineVersion/referencedSnapshotVersion，以及 gateReview 的 summaryPackageKey/summarySnapshotId/projectionLevel/exportPolicy；另写状态 patch、receipt/departure 引用/摘要、generatedAt、createdBy/updatedBy。

rule explanation 独立查 current，旧行同样 supersede 和中途 flush；新行独立 version/current/supersedes，引用新 final snapshot，写原 explanation 七字段 currentStageStatus/gateDecisionCode/blockingReasonCategory/code/summary/gateDecisionSummary/nextActionSummary，另采 generatedAt，active/createdBy/updatedBy。final 使用原 pending-final 文案，retention 用原纯函数文案。version 与 rowVersion 分开。

五类可写域只有 Contract/Payout/Adjustment/FinalSettlementSnapshot/RuleExplanationSnapshot，其他十类 facts 不改变业务字段。源没有给 Contract/Adjustment/Payout 的决策补 updatedBy；只保原赋值及自动 updatedAt/rowVersion。

approvedAmount/theoreticalCapAmount、receiptAmount、binding/final taxImpactPendingAmount 为 numeric(18,2)。批准仅 nullish 拷贝，不新增金额计算。receipt 摘要 string 原样，number 才 toFixed(2)，不能全量重格式化。date-only、datetime、毫秒时间戳分开。decidedAt/closedAt/todo.completedAt/payout.approvedAt/snapshot.generatedAt 和 onCreate/onUpdate 逐原 new Date 点采时；现 L1 单 now 折叠不能作生产兼容。

## 8. 完整业务源闭包与结构边界

| 类别                     | 实际表/职责                                                                                                                                                                                                 | 源                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 目标3表                  | contract、commission_payout、commission_adjustment；详情和原字段改变                                                                                                                                        | 对应 contract/commission entity                               |
| 双版本2表                | commission_final_settlement_snapshot、commission_rule_explanation_snapshot                                                                                                                                  | 两个 snapshot.entity.ts                                       |
| final/retention facts7表 | contract_term_snapshot、commission_role_assignment、operating_signal_gate_binding、commission_gate_review_record、receipt_record、commission_departure_exception_decision、commission_freeze_dispute_record | 对应 contract/commission/project-cost/contract-finance entity |
| todo facts3表            | project、lead、customer，只读名称                                                                                                                                                                           | 对应三个 entity                                               |
| 已有公共7表              | approval_record、todo_item、confirmation_record、confirmation_participant、approval_summary_package_definition、approval_summary_snapshot、approval_summary_field_projection                                | approval/approval-summary entity                              |
| Root request participant | auth_session pending managed changes，原 raw touch 单列                                                                                                                                                     | 原 guard/AuthSessionService；Rust auth model/store/service    |

15 类域实体和七表实体已逐文件完整读；ContractTermSnapshot 与 Contract 同文件。物理 FK 外还核逻辑 UUID：approval/todo 的 target/source/project/actor、Contract.currentSnapshotId、freeze 的 handover/summary/baseline；无 FK 不能当作无引用或自有对象。

结构闭包沿用原 **92 个 Migration*.ts**，不把目录 README 计为迁移。manifest 为全92文件记录 raw/LF SHA，按22表名机械列相关 migration，mechanical/hash-only 与人工 read 分开。R0旧静态清单的106表不替代本批实际 **107表/207FK** catalog：Root 在新PG15双库核 migration history/列/FK/CHECK/partial unique/comment/extension/collation/timezone。本作者未连接 DB，不声称 catalog Pass。保留双快照 current partial unique 和 project/version unique；不执行生成DDL，不新增crate或产品DDL。

## 9. Root 架构裁决与所有权

采用最小兼容端口 `apply_with_session(context,&mut CommonSession)`，default 转发旧 `apply(context,&mut PgConnection)`，旧签名保留。生产 handler 覆盖新方法；原 borrowed connection 和 CommonState 统一登记5可写域+10只读facts。metadata 增加 bool/date/numeric/JSONB 及默认值、自动 hooks/version 类型支持。内部扩表不扩大原 probe/protocol 的**七表 allowlist**。

统一 flush coordinator 先由本批 Native 校准完整 metadata 组序，再实现两处 supersede flush 与末尾 flush：原七表、域 state、一次消费 managed-auth participant 同次计算/执行 change set，保 insert-before-update/依赖排序/required/batch/CAS/RETURNING 语义。不能按 common→domain→auth 三个独立 flush 冒称同UoW；不能另取连接、加 FOR UPDATE 或理想化单次 flush。

CommonState 保 original/current/queued/managed 与 fork(clear:false) 语义；失败只传播此前共享父对象的变更/ORM snapshot，不合并 child-only。中途 flush 后失败、original更新、ghost binding、outer rollback后内存均与 Native 对照。旧签名兼容不意味着保已知时钟折叠；受影响 finite 断言明确分类增量，不倒改原golden。

| 所有者         | G1 后范围                                                                                                                    | 约束                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| A /root/l_impl | 新 src/approval/**；本裁决批准的 approval_common/session/schema/store/required/service 最小扩展                              | 先Native再store；保旧签名/七表协议；不改Root/B文件 |
| Root           | managed-auth一次消费participant、HTTP/lib/globalrouter、Cargo/lock、error/UTF16/DTO、生成、环境/fixture、验收/保全/集成/治理 | 同连接/UoW，G1前不启新环境                         |
| B              | #84 lookup canonical/原生成器输入/专属来源                                                                                   | 不并发改L/common                                   |
| C 非作者       | 联合G1/G3与固定候选复核                                                                                                      | 作者自评不能替代                                   |

接口实参/生命周期采用以下可实现签名；本节是输入，不是产品已实现：

```rust
fn apply<'a>(
    &'a self, context: &'a DecisionContext, connection: &'a mut PgConnection,
) -> DomainDecisionFuture<'a>;

fn apply_with_session<'a>(
    &'a self, context: &'a DecisionContext,
    session: &'a mut CommonSession<'_, '_>,
) -> DomainDecisionFuture<'a> {
    self.apply(context, &mut *session.connection)
}
```

## 10. 原生产者 recipe

- 合同：contract.controller.ts:139–145 → ApprovalService.submitContractReview；approval-workflow/contract-workflow E2E 与 support/contract-api.ts。真实 create project/contract→submitReview→owner todo/detail→approve/reject→域/approval/todo复读。固定 approver vp_owner=`00000000-0000-4000-8000-000000000008`。
- payout/adjustment：commission.controller.ts:185–213,263–276 → 原submit；support/commission-api.ts 的 setupEffectiveCalculationScenario/create/submit/findApproval。固定 finance_mgr=`00000000-0000-4000-8000-000000000014`。覆盖first/second、批准/拒绝/拒绝重提。
- final/retention：commission-workflow.e2e-spec.ts:136–305，真实 operating/gate review→rule activate→role create/freeze→calculate/approve→final create/submit/approve/register→retention create、receipt create/confirm、departure create→retention submit/approve/register。L只认证四操作消费与必需写回；前后producer由原Nest执行，不称Rust已迁其HTTP。
- freeze 原生产者 CommissionService.freezeCommissionRoleAssignment:304–366 校验 confirmed handover、active summary、current receipt-judgment freeze并带入effective baseline。createDepartureExceptionDecision:574–701 产生 current/version/summary元数据，可能重写双快照；confirmationRequirementSummary 来自原命令，不能在fixture随手清空后称确认链通过。
- database.seeder 的 commission-main 是 seeded confirmed handover/receipt-freeze/contract-term/summary（due=2026-04-14），属于原种子定义来源，不等于本轮已调上游API。确认引擎创建/参与人确认/取消及混合todo用L1原引擎/上游recipe单独见证；不把seeded confirmed写成API通过。
- Root生成 owned UUID/name映射及前后catalog/行对账。新namespace计划 poms-r2l-pg15，DB pair poms_r2l_nest/poms_r2l_rust，19432/9700/9701/9800；G1前未启动。旧namespace/私密/回执和PG17只读保留。producer输出在Native副本保真转录至Rust同源副本，来源/转录/运行结果分别登记。

## 11. 正式验收矩阵（全部 Planned，未运行）

| 组        | 必须实际覆盖                                                                                                            | 证据/负责人                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| HTTP/DTO  | 四操作/colon/rawpath/HEAD/method/invalid-ID；缺省/null/type/strip/trim/255/1000/正整数边界，响应无parse                 | 原Zod oracle+双HTTP，Root/A       |
| Guard     | session缺失/失效/撤销/停用、CSRF/权限；无project权限的todos；rawtouch/managedauth/拒绝事件                              | 原guard+双库，Root                |
| 两读      | 三类detail事实存在/缺失；todo空/混合source/六目标/缺事实/open/processing/terminal/tie/跨actor                           | 真实SQL/HTTP，A/Root              |
| 合同      | approve/reject、无todo、目标缺失、目标非pending仍原行为、拒绝重提                                                       | producer→四操作→DB，A/Root        |
| 调整      | approve/reject、五类型文案、不执行调整、目标缺失/错误组合                                                               | 原producer+DB，A/Root             |
| payout    | first/second approve/reject、金额null/0/非空/精度、批准字段清零、版本/重复/assignee                                     | producer/数值oracle/DB，A/Root    |
| final     | freeze/binding/review缺失；allow/review/block/前缀/空白大小写；current有无；全部复制字段                                | Native+HTTP+双快照，A/Root        |
| retention | active/ready/refs、due缺失/未来/当天、receipt项目/状态、departure项目/freeze/current/status/确认文字、submitted dispute | 原错误顺序+producer，A/Root       |
| 原无校验  | approve不搬submit的nonRetention/freeze/summary/gate相等；reject不跑正向；retention仍ready                               | 非作者反例+PG，C/Root/A           |
| 双快照    | 各version/current/supersedes/rowVersion、partialunique释放、新UUID/FK/元数据/文案                                       | 原Native SQL/RETURNING/行，Root/A |
| UoW/失败  | 两处中途flush和末尾对approval/todo/payout/auth coflush；current存在组合；每flush/后续失败与回滚                         | Native-before-store原字节，Root   |
| fork      | caller outer commit/rollback、nested failure、parentdirty/childonly/ghost、二读/二flush                                 | 原L1回归+增量，Root/A             |
| 并发      | 同loaded-version双决策、current链创建替换、单行/batch UPDATE/RETURNING等待窗口，不预设一成一败                          | 受控barriers/会话/SQL，Root/A     |
| 时钟/金额 | 每newDate/hook、HK午夜/string slice、UTC+8提醒、receipt string/number.toFixed                                           | 原纯函数+DB类型oracle，Root/A     |
| UI        | 原AuthStore/ContractStore/CommissionStore与generatedHttpClient、工作台/顶栏、合同/提成approve/reject，真实网络/DB       | 原Angular+真后端，Root            |
| 回归/DB   | Rust fmt/clippy/test/release、旧L1签名/协议/IJK、共享spec/client、原Nest；92迁移/107表/207FK及逻辑引用/owned安全        | 合并候选统一执行/分类drift，Root  |
| G3/G4     | 非作者审查、固定候选/集成复核、原字节保全、提交推送/归档/在线同步、正常停止/双清零                                      | Root/C；四项G4后才108             |

API/PG/原Angular真实E2E均必需，无默认豁免。mock、seed来源、纯oracle、实际HTTP/PG/UI和历史L1证据分标签；workbench-todo-entry.journey 的route mock仅作消费者线索。

## 12. 待冻结与检查状态

静态主链已补齐，manifest 明确 complete/focused/mechanical/hash-only 等级。仍待Root/C：联合baseline及#84 canonical/design ADR同步、正式非作者G1；新环境/owned映射；本批Native组序/AUTOflush/auth消费/CAS/RETURNING/父状态/时钟实证后再定store；Zod/金额/日期oracle、全HTTP/UI/PG并发矩阵；107表/207FK实际catalog。以上均未记Pass。

本轮只改输入：API/Rust lint/build/test、HTTP/PG/Native/oracle/部署均未运行，不能当文档修改的运行成果。候选生成后仅机械检查文档格式、JSON及raw/LF哈希；结果写manifest。正式G1只认Root联合baseline和非作者回执。
