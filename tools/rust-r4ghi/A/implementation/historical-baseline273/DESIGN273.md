# 273 首次历史关期预算选择：技术 G1 提案

状态：**Root 已确认本技术 G1；完成本包静态约束清单后冻结，冻结时尚未开始产品实现**。作者为 A；Final 做最终非作者审阅。只写本独占目录；当前 Source13/API136、416/198、M97业务 baseline、M98/139表、旧251/249/256及全部原件保持原身份。本件不认证 Source14 或 G3/G4。

裁决唯一来源为 `user-decision-historical-baseline272.json`，raw SHA `ef5294f25b1f8c16bdfe072ae7910e0947ff3e3673a0a4f6b88a5958ef451a4e`。采用真实历史采用链的当期唯一最新有效预算；歧义、破链、循环或无法证明时阻断。正常 period 与 period-restatement 不提升 realtime current，已有 period 预算不重选。

## 1. 推荐的最小模型

**每次首次关闭一个已结束期间，统一真实生成该 period 专用的 noncurrent G 包。** 不在既有 G 包之间按 UUID/创建时间选一个，也不把实时 current 包的金额改成历史金额。不复用旧 G 包作为首次关期的预算存储身份；旧包、旧 hash、旧 source member、旧状态原样保留。

选择权属于真实已采用 CostBudget 版本链。G 包是本次事务对该选择的审计载体。这样覆盖“预算当期已真实采用，但当时没有捕获 G 包”的合法情形：准备查询只返回预算与证据 refs 和稳定 selectionHash，正式 POST 才生成真实 UUID、真实 capture-now 时间和 period 专用 G source/package。查询不预写、不返回伪 package UUID。

只首次 period-close 使用本模型。realtime snapshot/基线激活继续原模型；已有 period-restatement 从原 root context/member 取被冻结的预算及原 ref，不运行273 selector，不刷新成当前预算。

## 2. 三种时间与两个版本

- periodKey、period start/end、businessCutoff：原 `Asia/Hong_Kong` 已结束自然周/月规则，不改服务器时钟，不允许 end>=today。
- budget/adoption/handover 的业务生效时间：用实际 producer 字段证明是否当期有效，不能拿 G.created_at/effective_at 替代。
- knowledgeCutoff：本次准备/提交的真实服务器观察时间。来源须在该时点可知；晚捕获 G 不意味着上游可以在期末之后才被采用。
- G 包与 source 的 created/effective/captured 时间全部是真实本次 capture-now，不倒填成 period end。历史有效时间只记录在冻结 proof 中。
- CostBudget 的不可变业务 `version` 与当前观察的生命周期 `row_version` 分开。真实 preparation.source_facts.cost 的 id/version/recorded rowVersion 是采用时身份；当前旧包已 superseded 可使生命周期 ref 变化，不得伪造旧 rowVersion/hash 以通过 `sources::assert_expected`。

## 3. 真实采用 witness

候选来自项目全部真实 CostBudget 版本和真实 contract term/preparation/review/approval 链，不来自 `is_current`、最新 UUID 或 G 包时间。每个采用 witness 必须证明：

1. term 的 source_preparation_id、contract_id、source_amendment_id、payload_hash 与 preparation 及 review binding 一致；preparation.status 为 activated，activated_snapshot_id 指回该 term；preparation.source_cost_package_id/source_facts.cost.id/version 与预算相同。
2. binding.preparation_version/payload_hash/contract/amendment 匹配；实际 approval 为 contract-review、target_object_id 同 contract、current_status approved。
3. project/currency/版本来源闭合。预算经济内容来自真实版本化 CostBudget；不能用当前其他版本的金额替换旧版本。若已有旧冻结 captured payload，可只读核经济内容一致；冲突无法证明即阻断，不重写旧 payload/hash。
4. 预算 effective_at、term effective_at、preparation activated_at、approval decided_at 在期间业务截止日内；created_at 均 <=本次 knowledgeCutoff。contract.signed_at 非空时也必须当期有效。沿用真实 decided_at，不发明 approved_at。
5. 生命周期现状为 superseded 不否定真实已完成采用。支持原 producer 的有效/已替代历史状态；对无法证明生效/撤销时序的其他状态，不把它当成“肯定不适用”来选择一个方便的旧预算，而是返回 reconciliation required。

同一 Budget 被多个合同/term 真实采用时，按 budget id+业务 version 合并为一个节点，保留全部实际 witness。多次采用本身不是预算歧义。一个预算的某次未来采用不能让其期内已存在的真实采用消失。

## 4. 唯一最大项与证据闭包

先确定截至 period end 的有效采用节点，再按真实 CostBudget.supersedes_id 关系判祖先/后继。选择唯一有效最大节点；不存在、多个不可比较最大节点、循环、跨项目链接、缺失父节点或无法证明的路径均阻断。

技术版本可能存在未被合同采用的中间节点。它们只作为真实 ancestry witness，不冒称被采用、不重复计金额。每段 adopted-before→adopted-after 必须保存完整真实 technical path；如果无法证明路径连续，阻断。当前/未来未采用版本不自动成为候选。期后才生效的分叉不改写期内已经唯一的链；若缺失日期使其能否影响当期无法判定，则阻断。

选择 proof 保存全部候选资格及排除依据、选中采用链、technical path、实际审批 refs、真实时间事实和当前观察 refs。selectionHash 是这些稳定业务事实的规范 hash，含272 policy版本和 periodKey/cutoff，排除 preview UUID、捕获时间和本次 knowledgeCutoff 的易变字面值。新来源/版本/状态/采用时间/链/金额变化必须影响完整 expectedInputHash；不允许 equal(undefined,undefined)。

## 5. handover/rebaseline 与预算金额

handover 不能取“现在 is_current 的一条”代表过去。使用实际 project_handover/basis.supersedes_id、confirmed_at、basis.generated_at，以及 rebaseline 的 basis_before_id/basis_after_id、source_handover_id/replacement_handover_id、handled_at/supersedes_id 证明期内生效链。当前 superseded 的旧 basis/记录仍可成为历史 witness。选择歧义或链不一致时阻断。

后发生的 handover/rebaseline 不进入旧期间。原 period 的重述保原冻结选择，不因后来又有 handover 更新该预算。

273 的 period currentEffectiveBaselineCost 必须等于选中真实 adopted Budget 的净额；originalBaselineCost 为该真实采用链的原始节点净额；changePackageTotal 为真实已采用转移净差的精确合计，保持 `original + changes = selected`。不从合同现金 gross 推预算，不混币，不重复累计同一 successor。

handoverBaselineCost/对应 ref 仅反映期内已证实 handover；无 handover 时保留原 G 的 original fallback 并明确无真实 handover ref，不虚构事件。executionChangePackageTotal 只按真实 execution admission/stage 与实际 adopted-transition 生效时点分类；技术包早已发布但后来才采用，不能仅因 package.effective_at 早而错当期前采用。初次 handover 不冒称 rebaseline；只有真实替代 handover 时才引用真实 rebaseline 链。

这部分在冻结 proof 内区分“采用净差”“执行后净差”和“handover来源”，不借用未来手工重设预算。实时 baseline::derive 的原行为不在本件顺带改写。若实际 source 无法证明分量，准备返回阻断，不取当前字段填洞。

## 6. 请求/准备 DTO 差分（零新路由）

涉及现有 canonical 行164/165/291，以及读取快照的550/533：

- `POST /api/period-closing-snapshots` / `ProjectCostController_createPeriodClosingSnapshot`。
- `POST /api/project-operating-snapshots` 的 snapshotMode=period-end 现有 alias。
- `GET /api/projects/{projectId}/unified-accounting?view=preparation&intent=period-close&periodKey=...`。

`CreatePeriodClosingSnapshotRequest.baselinePackageRef` 改为 **required-nullable**；`CreateProjectOperatingSnapshotRequest.baselinePackageRef` 同样 required-nullable，realtime 分支仍必须非空真实 ExpectedRef。missing 不能等于 null。现真实 Rust 入口是 TypedRequest::parse→schema::normalize_public_request→serde；schema.rs 已检查 required键存在，必须保留并测试这个边界，不依赖普通 Option 的 missing→None。Shared/Zod required union同样拒缺省，不手改 generated model 来另造SSOT。

首次 period-close 的公开 `selectedBaselinePackageRef=null`，提交体必须显式 `baselinePackageRef:null`；非空旧/live ref 不会被静默忽略。existing period 重述照原冻结 ref，不通过这个 null 分支重选。其余 expectedVersion/projectVersion/inputHash、periodKey、expectedPeriodSnapshotRef=null、costDecisions 等原约束保留。

OperatingPreparation 新增 required-nullable `periodBaselineSelection`：非首次 period close 时 null；可执行首次 close 时包含：

```
policyVersion: 'historical-adoption-chain272-v1'
publicationMode: 'new-period-package'
periodKey, businessCutoff, selectionHash
originalAdoptedCostRef, selectedAdoptedCostRef
handoverBasisRef|null, handoverRebaselineRef|null
adoptionSourceRefs[], technicalLineageRefs[]
```

此对象只给真实现存 refs、hash、业务元数据，不预给 G package/source UUID，不另暴露预算金额或 Labor 权重。敏感金额仍走原 projection。无法选择时该对象 null、typed blockingReasons 和 allowedCommandCodes=[]。

不新增 command selectionHash 字段：现 expectedInputHash 必须规范包含完整 selection proof/hash，command 在锁内重选并比对；避免两个并列授权 token。若实现证明需要额外 token，应先回技术 G1，不暗加 DTO。

## 7. prep/锁/hash/CAS/command 同源

共享纯 selector 从同一 Catalog/期间窗口派生选择和 proof。准备和命令都在原 CommonSession/项目授权锁下读取完整采用图；按现有 source-family 排序锁 CostBudget/Contract/Term/Preparation/ReviewBinding/Approval/Handover/Stage/Head/Baseline/Period 等，命令在完整锁后重载并重选。

selection proof 纳 input hash；原 project/head CAS、period absence、source versions/hash、授权及 source-closure 都要在任何必要写前通过。期间 key 唯一冲突不得代替语义 admission。保持已有 legacy-current 与 legacy-period 的独立 fail-closed guard，不把 source0 变成已认证来源。

通过全部检查后，才在同一个物理 outer TX 生成 dedicated baseline source/package/change明细，重载该真实包，构建真实 context，插入 source members/period/snapshot/H历史评估/audit/auth/receipt。preview身份不进入 hash，也不作为公开已存 ref。

推荐保留已有 live head 的命令 CAS 递增约定：若已有 head，head row_version 可+1，但 baseline_package_id 与 current_snapshot_id 保持原 live身份；不得把新 period G package 写入 live head，H当前四binding/review不移动。若此前没有 live head/包但存在完整真实采用证据，只创建历史 period，不插入新的 realtime head。此 CAS细节需 Root 在本技术 G1 明确确认。

## 8. 持久化与 M99 判断

现 M95 已有 `operating_baseline_source`（frozen_payload/approved_transitions/FK）、`operating_baseline_package`、`change_package_baseline`、`operating_source_context/member` 和 period/snapshot。已读 effective-v2 migration 的 certified CHECK：要求 source/currency/hash/金额真实，但不要求 producer1包必须 is_current=true。现有字段可记录本次真实 noncurrent包及 immutable proof，**推荐不新增表/列，不猜 M99**。

OperatingBaselineSourceDraft 内新增可缺省的 typed historicalPeriodSelection proof；None 必须 skip序列化，旧 draft 无此字段仍能按原 hash读取，绝不回填null。新 source hash/payload hash覆盖 proof与全部经济数据；新包 source_context_id 指真实 source，is_current=false/status=active/producer1/row_version1，effective/captured/created=真实 now。change明细只记录真实已采用转移及其审批 witness；中间未采用技术版本不造 change。

旧实时包不 supersede、不改 old hash；旧冻结 period成员原样。已有 period restatement从原 source_member捕获载荷核 hash后继承，不用当前 row_version 重造旧ref。

实施前还须静核实际M98所有相关guard/index/ORM元数据是否有比上述DDL更窄的限制；若发现不能无歧义表达，应报出精确约束后再冻结显式forward schema，不能先执行DDL或加ignore。

## 9. 新必要写入族与事务边界

首次 period-close 在原 period paired capture 的必要族上追加：

1. 新 operating_baseline_source INSERT 1。
2. 新 noncurrent operating_baseline_package INSERT 1。
3. change_package_baseline INSERT N（实际采用转移数，N=0时不假称发生）。
4. source_member 中真实新 baseline/source/完整 adopted/approval/technical/handover/stage witness 闭包；全部 context/period/cost-member/snapshot/H评估族仍按真实清单逐项。
5. period成功audit须含实际新G package/source、selectionHash、selectedBudget/ref与期间；不假称执行了独立实时 baseline-activation。原必需 audit/security/pending-auth/managed-auth/command receipt 共事务。

若已有 live head，按确认的CAS约定有精确UPDATE；无head分支不得伪增head写入族。FI选择器用真实project/actor/selectionHash/sourceHash/父子关系与成功audit请求，不用预造UUID。所有实际需要写入逐族 one-hit/fallback0/full rollback，正常同body一次成功验证outer xmin。任一失败不能留下孤立G包/period/source_member、current移动或审计/权限副作用。

## 10. 有限产品与派生清单

推荐直接 Rust 产品修改集：project_operating/{baseline.rs,period_baseline.rs,period_baseline/tests.rs,preparation.rs,collector.rs,context.rs,capture.rs,service.rs,view.rs}；baseline.rs 只为旧实时draft显式设置可缺省proof=None/共享精确工具，不顺带改实时算法；project_operating_common/runtime.rs 的内部proof类型；model.rs 只由正式canonical/Shared工具生成 nullable请求与preparation字段。store.rs/sources.rs 仅在实现确实需要真实新包重载/闭包接入时纳入精确补充，不为压成一文件绕guard。

公共 SSOT：新增独立273/G2 DTO增量，原 joint-G1/effective-v2 与旧 Common/Shared/S4/S5/S6 checkpoints不改；合成新 canonical/schema、Shared生成与Rust bridge，完整OpenAPI/SDK输入另冻。无新op/路由。admin period UI只消费新prep元数据并显式发送null；不让用户另选任意预算。已有period UI继续显示已冻结预算。技术G1后由H/Root负责精确UI/SDK派生。

工具：270 period body/ghfacts去掉 period预算必须等于livehead的旧前提，改为校验真实selection+新G materialization与current身份保持；271已有period targets继续旧root预算，live targets按live预算。旧 historicalBaselineReselectionApproved=false只能指“禁止改写已有period”，不能否认272首次选择。新policy272须进入正式source closure；I25203用明确有限source/helper deltas取代仅249单叶限制，不能dirty override。

## 11. 验收冻结清单

纯/单位：链A→B唯一最大、同Budget多合同重复采用、未来B不替过去A、期后分叉不抹过去唯一A、期内不可比较分叉、破链/循环/跨项目、未采用中间节点只作路径、真实审批/activation缺失、当前superseded历史有效、old-ref生命周期与冻结payload校验、currency/金额精确、handover/rebaseline/stage的as-of与源时点分类、query/command选择与hash一致、missing/null/realtime-null/错误ref边界、已有period不重选。

真实HTTP/PG：先真实producer产生采用链与当前选择（不能SQL造业务/改服务器时钟）；公共prep返回正确source/hash、null包ref与typed selection，POST实际生成非currentG并关期；读回实际package/source/member/audit链和精确金额，current/head/H身份保持。既存period再重述仍原预算。源码/构建/完整schema/全cargo及Native/admin检查另按最终组合14验证，不把249单修541或旧bin改标。

真实锁/CAS：预算采用/activation与first-close竞争、两close同period、其他period/实时snapshot竞争、source被替代、head/project CAS漂移，要求实际waiter/锁证据、typed409/全回滚，不以顺序409假称race。

必要FI：新source/package/每类change/member、其余实际G/H/audit/security/auth/receipt全必要族逐一真实hit1/fallback0、全部raw/xmin/meta/objects回滚；成功同一body仅一次，未知提交STOP留原件。

真实历史资格：已有真实不可变生产证据不足的case只记录缺口；synthetic只标单位/隔离测试，不算真实跨期交付。未来预算/自然跨期正向若尚无真实producer链，等待真实业务时点或独立明示seed-history-consumer边界，不倒填时间或SQL补造。

## 12. Root 已确认的技术 G1 要点

Root 已明确接受统一 dedicated package、DTO required-nullable与上述preparation字段、currentEffect预算=真实选中当期Budget及handover/execution分量只按真实事件分类、既有head仅CAS版本递增/当前身份不变、无head不创建实时authority、现表JSON承载优先及有限源码/SSOT/UI/270/271/25203和全FI范围，并授权本包冻结后在独占proposal实现。真实 execution 证据使用已注册且已锁/hash的 ProjectStageRecord：producer1/stage-entered/handover→execution、真实source_handover_id/source_role_assignment_id、entered_at及source_payload/hash；不按project.current_stage推测，不增加新SourceKind。若实现发现需新公共route、当前来源不能表达或必须新schema，先报Root，不扩大Frozen范围。
