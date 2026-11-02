POMS R3HIJK 作者 D：按业务正确性纠偏的 G2 剩余 J/K 验收纯定义 01

当前有效准则
本包目标是 Root 当前候选 fcf07817 的 Rust 业务验收。准则源：
  docs/design/rust-r3hijk-business-semantics-corrective-checkpoint01.md
  docs/design/rust-r3hijk/business-read-model-clarifications01.json
旧 tmp/rust-r3hijk/d-g2-definitions/ 保留原字节，仅作旧准则下的定义历史，不能将旧 Node bug 期望用于新 Rust。
本目录复用原合法 SQL、ID/receipt bindings、正常权限/关联、历史 thread 快照、56 requirement IDs 与 NOT NULL/unique 不可构造 N/A。
当前变化：已知正文 NUL/lone surrogate 早400，未知 stripped 字段不因此拒绝；首线程两合法不同评论都201、一thread两comments；空/trim-blank owner name 回退可用组织或阶段归口；首签选真实更早 cLowerMicro；完整时间排序使 completed 在同显示毫秒的 acceptance 前；坏UUID路径400，有效缺失404。
Native/旧 Rust 的500、文本替换或并发失败原件仍是观察，不是当前 Rust 的 oracle。所有 actual 均 null，不因复制定义或准备 fixture 而记为通过。

交付范围
本目录新增 index.mjs、discussion-plan.mjs、guidance-plan.mjs、timeline-plan.mjs、prepared-facts.mjs、coverage.json 和本说明。
没有修改已通过产品、任何冻结 01/02、旧 fixture 或正式治理文件。作者没有 import/运行这些模块，没有执行 syntax-check、测试、SQL、HTTP 或环境动作。
所有 actual 都仍为 null。当前候选为 fcf07817；Root 报告 Native JK fixture 已 resume13 准备完整，此处只记上下文，不替 Root 认证该执行，也不推导当前 Rust 已通过。

直接入口和绑定
Root 自己 import ./tmp/rust-r3hijk/d-business-g2-definitions/index.mjs。所有导出都是纯常量/构造器，不自执行，没有 I/O、时钟、UUID 生成器或运行循环。
先用 adaptRootIds(当前后端真实 chain report, overrides) 复用 report.ids.integration 真实链：
  customerA <- ids.customerId
  leadA/projectA/contactA/competitorA/followUpA <- ids.integration 的对应字段
  leadCommentA/projectCommentA <- ids.integration 的原讨论 ID
  operatorUserId/operatorOrgId/otherUserId <- 当前后端 ids 的实际身份
projectA 不回退到不相关的 foundation project。Native 和 Rust 必须分别使用自己的真实 receipts/IDs；不得把一个库的 UUID 当另一个库的实体。
operatorDisplayName/operatorOrgName 从实际当前用户/组织读取，不能把 username 或 UUID 当 displayName。
runTag 可使用当前 run UUID；生成包/合同键时总长度小于原 varchar(64)。如果 Root 采用更长标签，应自行缩短标签后绑定，不能截断业务输出。

请求对象字段
  id/method/path/body/sessionRole/transportProfile/expect/actual。
path 已包含 J 的 query string。body 是原 JSON body；sessionRole 是 permissionSets 中的精确权限集合，Root 将它映射到当前新建/既有测试身份。
Root 可以把 body 交给 ctx.step 的 options.json；无 body 的 GET 不生成新 body。expect 内除了 status，还有精确字段、集合或关系约束，由 Root 验证并保留原响应。
expect 是必要约束片段，不是删减后的响应 schema。Root 对当前 Rust 验证完整业务 payload/error，包括合理的原有 error/code 字段、null/absence/false/empty、19/14/12 字段和精确文本；与 Native 的差异按两个当前准则源分类，不能把早400、成功并发、非空归口和真实时间顺序改回 Node 异常。未知命令404的 JSON 与旧 HTML 差异不判为业务缺陷，错误输入也不要求冗余无意义 Zod issue。
transportProfiles 给出删哪一种 cookie/header 的明确语义；csrf-missing-cookie 只删 CSRF cookie，必须保留有效 session cookie，不能误把 401 当 csrf_failed。
首线程两个合法并发请求各自期待201，并按 group.expectations 的同thread、两条不同comment终态验收。SQL 描述是 sql+params；绝不能把整段对象 stringify 后拼进 SQL。
missingBindings(ids) 只检查消费前的必要绑定，不查询数据库；buildRemainingPlan(ids) 在缺绑定时返回 ready=false 和完整缺项，不产生可误执行的 group。

最小准备/消费顺序
1. 保留当前真实 upload→Lead→convert→J/K 链的所有原件；已有链不重造，先从它的 report 取 adaptRootIds。
2. Root 通过真实 API 补 customerB/customerEmpty，及 A 同客户其他 Lead、B 的 Lead、可实际关闭的独立 Lead。复用 A 的原 Lead 请求构造器，不由 D 用 SQL 准备 Lead/竞品冒充生产。
3. Root 通过 POST /api/projects 补 projectSameCustomerOther、projectRename、projectUnusedForRace、projectOrder、projectFkFailure、projectNullCustomer，以及独立 projectGuidanceRow/projectTimelineRow。
   projectRename 保留原 projectName 为 projectRenameOriginalName，初始 customerA、active、sourceLeadId=null。
   projectNullCustomer 必须来自独立真实 project 创建，再仅把自有行 customer_id/customer_name 置 null；source_lead_id 必须原本为 null。该修改标记 legacy-nullable-context prepared，不当作 H conversion 产品。
   projectGuidanceRow/projectTimelineRow 是 Root 对自有真实 API 项目读取的完整原始行，至少含 id/status/current_stage/created_at/customer_id/customer_name/owner_user_id/owner_org_id/created_by/updated_by/closed_at/closed_reason。
   捕获时间精度时优先保留 SQL ::text 原值，不把原始 DB 微秒时间先截成 JS Date 再回写。
4. Root 调 buildStageProducerRequests(ids)，执行其 10 个真实 POST /api/projects，将 receipt IDs 填入 ids.guidanceProjects[stage]。
   原 create-and-save 接受完整 currentStage enum，所以这些是已交付 foundation producer；仅表示创建时阶段输入，不认证 R4 阶段迁移或写链。
   对应 stage GET 定义会临时将自有项目的两个 owner ID 置 null，使每个 stage 的 ownerFallback 在实际 payload 可见；读后恢复原 owner IDs。该 owner patch 单独标只读上下文 prepared，不混称 API 生产的归口变更。
5. Root 通过真实联系人 API 创建 contactInactiveA/contactOtherCustomer/contactFkDisposable；前二分别属于 A/B。contactFkDisposable 是独立可清除对象，不挂 stakeholder 等其他 restrict FK。
   调 buildAssociationProducerRequests(ids) 生成 3 竞品和 6 跟进的具体创建请求；followUpType 必须来自当前 active sales-follow-up-type 字典真实 code。
   captureIdAs 存原 body.id；captureReceiptAs 存完整 body，后者用于 followUpForVoidReceipt/followUpForReplaceReceipt 的真实 rowVersion。
   调 buildHistoricalProducerRequests(ids)：联系人实际 PATCH inactive；跟进实际 :void / :replace。
   followUpSupersededA 必须绑定被 replace 的旧 path ID；返回的新 replacement ID 另存，不能误当旧 superseded 记录。
6. Root 供一个自有 dedicated emptyUserId 和已有/自有 operator user/org。emptyUserId 的空 display_name 只按 prepared name patch 验证 read fallback，读后恢复；不把空名称冒充合法 UI 创建。
   missingUuid 是合法且在全部相关表中已核实不存在的 UUID；nil/all-f query 另核实不存在，不能默认种子无该 ID。
7. Root 调 buildCommentOrderCases(ids).slice(0,1) 先执行 4 个真实 comment producer，按 captureCommentAs 绑定 orderCommentIds[0..3]。
   再次构造完整 plan 才能消费微秒/exact-tie/user-context 组；不能执行 params 中仍未绑定的 undefined。
8. Root 自己按 preparedFactIdRoles 为当前后端生成 UUID，登记在本次 owned IDs 集合，填入 ids.factIds。仅 UUID 分配，不代表任何 producer 已完成。
9. 现在 missingBindings(ids) 应为空，buildRemainingPlan(ids) 返回 ready=true。按 groups 顺序消费；每个 K GET 的 before 捕获在该组 prepare 完成后，after 在下一组 prepare 前。
10. 每个含 restore 的组先恢复该组声明的自有 row 字段；不要依赖下一组碰巧覆盖。status、owner、identity name 等 prepared 操作不属于 K GET，必须在证据中分开。
    K snapshot 组按 absent→decoys→exact active 顺序；timeline 按 bare→完整事实→逐类 tie（读后删除 tie）→label/actor/close 变体顺序。

剩余重点的具体检查
J anchor：customer→lead→project 缺项优先；同客户无关机会允许；customer-only 不自动展开；lead-only 不含转换后 project thread；project+sourceLead 聚合并去重。
J relation：inactive contact、voided/superseded followup、客户级跟进 null/null、Project 忽略 record.leadId、Lead 忽略 record.projectId、null-customer project 不增加 customer 限制。
J old snapshot：真实 PATCH 改项目名称和客户后，新评论依当前 target customerB 校验 contactB，但仍返回首次 thread 的 old title/customerA；第二次不刷新 thread。
J context/sort：真实 PATCH 联系人名称后 GET 显示新名称；created_by 缺失用户保留 ID/name=null；微秒排序先在 DB 排序，再 stable JS 毫秒排序，exact-equal 仅比较等价组内容。
J text：buildPersistentTextCases 包含 NUL、单个/嵌入 lone high/low 早400且不落库；合法 BMP/emoji8000、8001边界、trim/NEL/零宽/控制符/组合字符；以及 unknownText 含 NUL/lone、已知正文有效时仍201。新接受请求的即时响应/存储/后续GET文本必须一致，不能静默替换。
J first-thread：Root 独占本批测试库，另连 BEGIN + LOCK TABLE business_discussion_thread IN SHARE MODE，两个独立 session 同时发首次 POST；确认两者均在 thread INSERT 等锁后才 COMMIT。
  成功调度后状态 multiset [201,201]、相同返回threadId、一条thread/两条不同comment、两个正文均保留、无孤儿；线程创建者不指定，首次title/anchors不可改写，目标争用须内部复用，不能把合法第二条评论当23505/500或409失败。没观察到两个 INSERT 等待则保留为 partial，不冒充可控竞态通过。
J FK fault：同样持有 SHARE 表锁，单 POST 到 INSERT 等待后删除独立 disposable contact，再释放；应 23503/HTTP500，首次 thread/comment 一起回滚。只删本批自有且已确认无其他 restrict consumers 的行。
  上述 SQL 流程均只是调度定义，作者未执行；Root 必须保证异常时释放/回滚自己的锁连接。
K guidance：10 stage exact 中文文本、13/10/9 entries、14 顶层字段及 entry7/basis4；status precedence；owner名称按现有项目trim语义判断可用性，仅判断、不改有意义原文。空/仅空白name有可用org则显示org，否则用阶段归口；两个可用名称才组合，禁止空标签或裸UUID兜底。finance/assignment/payout/operations permission 精确集合继续保留。
K operations：partial 或四项缺任一都不能启用 commission-operations；完整四项+project:read 才启用；内部 some-of action 不能替代 entry every-of。
K snapshot：只有一个 exact active；新一些的 superseded/voided、wrong scenario/projection/type/target 均不能获选；inactive package 和 exportPolicy=deny 不额外排除该 exact active。
K timeline：复用原31条合法 INSERT 主数据（含必需 FK 支撑行）与自有project UPDATE，在一个独立项目验证7事件、5类事实选择、完整source/evidence/actor及原标签。首签按完整signed_at最早选cLowerMicro；仅signed_at完全相等才沿既有repo updated_at/created_at DESC顺序，不按UUID强定。事件在ISO序列化前按完整业务时间排序，mWinner .123100 在aWinner .123900之前，虽然都显示 .123Z；仅真实instant完全相等才沿既有eventKey次序。
  合同全键相同的 tie 构造器已改为复制实际最早 cLowerMicro；actor updatedBy=null 变体也修改 cLowerMicro，不能继续改未被选中的旧cWinner。其他合法全同键候选组仍不硬钉UUID。
  准确行数以构造器返回的 prepare 描述计；没有执行过的行不记入 actual。4 种无完整 SQL tie 保证的事实用单独 tie 组，读后逐个删除新 tie 行，不影响确定性 label 组。

原 DDL 核对和不可构造边界
见 prepared-facts.mjs schemaBoundaries，亦在 coverage.json 标注：
- acceptance.confirmed_at、completion.completed_at、archive.archived_at 均 NOT NULL：不可准备 null，不删 NOT NULL、不关约束。
- archive 每项目最多 1 recorded（EX34A partial unique）；不可构造多个 recorded 的 latest/tie。用单 recorded + 时间更晚的 voided/superseded 验证过滤。
- snapshot 每 target/type/scenario/projection 最多 1 active（EX08A2 partial unique）；不可构造多个 exact active 的 generated/created tie。用 exact active 和各类 decoy 验证 selector。
- project.source_lead_id 有 restrict FK，普通完整 schema 下不存在 dangling sourceLead；保留 source/unit skip-branch evidence，不能为该分支绕过 FK。
- contact 删除会 SET NULL comment.related_contact_id，不能把“稳定存非空 FK 但无 contact”当合法普通准备行；missing user.name 通过无用户 FK 的 created_by 合法模拟。
- completion.status 为 NOT NULL varchar，无 CHECK，原命令类型只产 confirmed：prepared voided 仅 DB-legal legacy read eligibility，不能称真实 R4 command 产品。

最小必需字段与 FK 支撑
prepared-facts.mjs 的 INSERT 模板已经显式包含不带默认值的必填列：
  acceptance: project/type/result/scope_summary/evidence_summary/confirmed_at。
  completion: project/acceptance_record_id/result/completed_at/completion_summary/evidence_summary。
  archive: project/anchor_stage/anchor_source_type/anchor_source_id/archived_at/archive_summary/evidence_summary。
  handover: project/contract_summary_snapshot_id/effective_handover_baseline_snapshot_id/summary_snapshot_id，故先造 2 summary snapshots、1 contract_term_snapshot；后者依赖 contract。
  summary snapshot: target/scenario/package FK/packageKey/projection/exportPolicy/businessStatus；package definition: scenario/packageKey/projection/exportPolicy/fieldRuleVersion。
所有其他必填项使用原默认值或模板中的明确时间/status。所有定义依现有 92 migrations，不增加 migration/DDL。

源码/DDL authority
- BusinessDiscussion controller/service/repository/entity 与 shared-contracts.ts 的现有 J schemas。
- ProjectQueryService 现有 getProjectWorkspaceGuidance/getProjectTimeline；ProjectRepository 五事实方法。
- Migration20260423130000_ex23_acceptance_record.ts。
- Migration20260424100000_ex24_project_completion_record.ts。
- Migration20260424143000_ex25_project_archive_record.ts + Migration20260426100000_ex34a_project_archive_record_reversal_replacement.ts。
- Migration20260415090000_ex08a1_project_handover_core.ts + Migration20260415100000_ex08a2_approval_summary_snapshot.ts。
- Migration20260415152000_ex08b3c_snapshot_and_receipt_freeze.ts + Migration20260422031100_add_contract_term_snapshot_core_fields.ts。
- 当前 project/contract/platform-user/org-unit entity、project status/stage CHECK migration；既有 thread/comment FK/unique。

清理
prepared-facts.mjs cleanup 是本组新增行的 FK 删除顺序：comments→threads；archives→completion→acceptance；handover→term snapshots→summary snapshots→packages；contracts 在 term 之后。
本计划不创建 archive supersedes 自链；Root 若扩展自链，先删引用旧行的替代行或在同一 DELETE statement 删除整个自有链。
项目若复用真实 API product 则恢复捕获的原字段，整批后再由 Root 原有 terminal cleanup 删除，先处理其他 H/I/跟进/附件依赖。不要删种子、别批数据或未登记 owned IDs。
restore identity names 后，核对两库自有事实清理及 seed rows 原字节/JSON、权限恢复、锁释放。此处为清理定义，不是清理完成证据。

验收归档边界
coverage.json 沿用原56 requirement IDs并映射当前业务准则。历史 core/chain 只作带来源的观察，新增/修订期望均 pending-Root-execution，不填statusActual，不把准备数据或旧候选通过数当作当前fcf07817的通过证据。
X-03/X-04 继续由 Root/common/独立审查承担，本目录不能替代 exact candidate 的 fmt/clippy/test/release/schema/OpenAPI/UI/G3/G4。
最终只完成 J/K 本片；#85/#57 保持 Open。HTTP58/58 也不能推导完整阶段验收。
