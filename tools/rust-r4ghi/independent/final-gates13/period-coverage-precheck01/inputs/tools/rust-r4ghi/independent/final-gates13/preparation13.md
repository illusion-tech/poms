# R4 GHI / 最小 R5：统一 G3/G4 验收准备13

本件仅整理验收要求及证据边界。**G3 未审、G4 未审；无 Pass、无新交付认证、无 main / 部署 / 切流放行。** 作者未参与本批实现；本轮只读正式输入及固定清单，未读取活 state，未执行 SQL、HTTP、浏览器、Git/GitHub 操作、服务或产品检查。仅本目录产生审件。

## 固定范围与当前事实的来源

- 唯一执行主树：`E:/projects/worktrees/poms-r3hijk-next28/poms`，branch `codex/poms-r4ghi-next25`。交接的 published HEAD 为 `6ca4f722cbbdea4fb3d8043712b827e5ad18be6b`，main 为 `d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5`；本轮未查询 Git/远端。后续候选必须保留 S4 `4f0ad88e...`，完整 SHA 与祖先证据待固定包。
- 直接输入：`acceptance-plan01.json`、`operation-map01.json`、`g1-online01.json`、`g2-source13-corrective136.md` 及 `docs/design/rust-r4ghi-delivery-status.json`。原字节 pin 见 `manifest13.json`。
- 固定联合范围为 G9 / H8 / I11 / R5 最小角色4 = **32 HTTP operations**；其中16个现代写入合同，另有不计入32的 C basis 支持请求。29个既有入口与3个新 canonical 入口不能重复计数。
- 正式 Rust **240**、本批新认证 **0**；R4 **67/95，余28**。目标 runtime272、canonical296、690 schemas 是不同分母，不能互换或当作已交付。
- 固定索引仍是 Source12 / API135 / M97 / 每库139表 / 406产品输入。组合106及 I108-02 均为未应用候选；审批 `source13-g2-freeze136.json` 在本轮检查时缺失，I108-02 的 actualSource13 / sourceCount / binary / process / migration / retention / registry 仍为 null。
- Issue 状态依固定 G1/交接约束：#57/#101/#110/#111/#112/#113/#114/#116/#117 保持 OPEN，#115 独立 CLOSED。本轮没有线上状态刷新；实际 G4 必须接收新的线上 readback。

## 32项逐入口要求

`operation-checklist13.json` 从固定 operation map 逐项复制 operationId、method/path、canonical、DTO/schema pointer、成功状态、精确权限、CSRF、scope、协议要求；每项附业务断言、关联 A01–A08、影响标签及空的证据槽。32项当前全部为 `not-reviewed`，证据槽为空表示本轮尚未审实际统一候选，不能解释为历史 HTTP 从未发生。

每项均须提交：固定候选/epoch、实际请求与原始响应 pin、真实持久化身份及前后事实、业务断言、权限与当前职责正负控、必要写入事务与回滚结果。现代写入必须区分 Rust 缺失/旧协议422、现代非法 shape400 与实际业务错误；Native17 专用422只证明不支持现代协议。敏感 GET 必要审计失败必须无 payload，必要审计与授权刷新不能游离于规定事务边界。

## A01–A08 必要证据

| 故事 | 最低验收内容 | 当前审查状态 |
| --- | --- | --- |
| A01 | 真实 customer/project/lead-conversion；直接项目个人 owner；组织来源只准真实 creator + 当前 membership 首次分配且竞争一胜；消费后不恢复；变更前责任检查；minimal creator 响应不泄密 | 待固定原件与影响表 |
| A02 | 真实技术/商务/报价批准、逐合同准备、条款快照及应收；receipt 原不可变税币基准、gross=net+tax；旧确认缺基准只准 CAS+reason 补证且不改 cash/status/confirmedAt；旧责任准备移交与真实职责确认 | 待固定原件与影响表 |
| A03 | 无角色200/null；数字 token 在 f64 前按百万分比精确计量，1e-6接受、1e-7及0.10000000000000001拒绝，零权重理由；真实 summary/confirmation freeze；冻结后父/身份/职责/权重含零权重不可变；真实移交+同链冻结角色才进执行，真实执行交付才进验收 | Source12 Role03及 peer revised-create race 尚由 Root 串行执行；不预报成功 |
| A04 | 真实 E labor/expense/finance 与 F stage/tax/allocation；完整当前来源集分类及理由/CAS；gross/net/tax优先守恒、精确分与确定余数；真实链/共享源去重、分期独立；项目估算仅采纳一次；真实币种来源 | Main G006224原409与零域写保留；需 fresh preparation 后仅补 Main G |
| A05 | G9/H8单外层事务；前置 expectedInputHash、最终 sourceHash、immutable context reload、DMER/OSER、四阶段独立 binding/reason/summary；11规则精确边界、各阶段成本下限；known0与unknown/null/maturity资格；20%不按展示舍入；manual overlay不能改事实/成熟度/硬阻断；引用无环；MAX/零margin/1cent/MAX/13%/aggregate overflow pre-INSERT422；1.2300与1.2340；unknown tax=null且保留legacy0 | 待完整统一候选实据及逐项复核 |
| A06 | 消费后普通 E/F变更拒绝；sealed permit调用真实 producer，完整项目/来源/分摊批次/终端发现、锁与授权；TaxRef-only不可让客户端造 roots；受影响目标不能剪裁；旧 snapshots/classifications/period roots/evidence不可变，current authority显式CAS；legacy冲突在unique error前阻断；无真实producer的更正明确阻断 | Source13 83/84/90影响范围必须新核；原102族不能直接充当新动态库存 |
| A07 | stage acceptance不能整项目完工；真实final accepted/conditional及owner/due/evidence；仅登录condition owner走精确双UUID路由及double CAS；own-task只给允许锚点/自己的任务证据/aggregate且不需full ProjectDetail；last-close更新server aggregate而原conditional结论不变；并发不跳任务/不重复closure；pending阻archive；archive/replace/void只增终态附属事实，跨父/跨项目拒绝 | Source12既有结果和新同任务CAS006739按原epoch引用，待原件pin与影响复核 |
| A08 | 每路由精确permission+实际当前责任；owner、已确认finance/business-admin、真实participant、creator-only、own-condition-only、同/跨org无关人；raw敏感键literal null、仅授权projection、劳动/未知血缘最强遮罩；审计失败无payload；真实浏览器完整最小表单、JSON+DOM遮罩、loading/read-only/missing basis/unknown/403/409及generated-client真实请求；16现代写入+C支持协议 | Root交接的Creator06a、Own/Legacy/MAX/MASK06b仅列为待原件复核；失败UI04/05及Role01/02保持失败 |

## Source13 必须新增或重新复核的证据

1. **可运行候选出生及保全。** 最终 Source12 固定 state/完整406产品输入/工具/二进制/双库archive/objects；无activeFault、blockedObservation、未知提交或Native残留影响。仅 Root 按匹配 PID/start/exe 停 API135；TOC通过不等于restore或xmin恢复。Source13需真实完整 source/helper 图、由数组算出的 sourceCount、新二进制、物理 PID/start/exe/readiness200、实际 candidate 与新epoch registry，模板和静态构建不能替代。
2. **批准与正常 M98。** 正式136审批 pin 完整98迁移、Node24、唯一 UP-only runner、SQL90b/TSdaf、两库97→98范围。逐库真实 argv / intent / execution / exit / raw stdout/stderr / migration log 相互吻合；两个库不宣称原子。旧108的IR87-01 P2保留；只准108-02最终12候选。67纯PASS及非作者Review89只作离线准入工具证据。
3. **严格 schema3。** 逐库 retained Source12→before 无变化；before→after只准同OID函数批准body、唯一真实M98登记行、该登记sequence一次推进；after→fresh无额外变化。原行+xmin、其它目录/函数/OID/owner/ACL/角色/触发器/约束/objects不变。`state.baseline`永久为原M97；派生comparison仅替规范metadata与migration指针，138业务表与objects仍指原baseline。M98为canonical schema advancement，不能进入owned cleanup；旧54 schema1/2语义不改，不能把schema3称为retainedSnapshotEquivalent。
4. **四纠偏实际业务影响。** 65-02需实际OLD/NEW父有序锁、完整父存在性及23514/23503/23502边界，冻结/移动/零权重和I消费；90需首次期末底层业务与知识时间真实资格，G包创建时间不替来源时间，未知/未来来源复核阻断，既有period root不改且历史选包仍待用户；83需实际TaxRef→F解析器→真实Cost→完整分摊批次/全部项目/终端与授权；84需Main G真实share→slot→Cost→明确财务父，外部父不变本地事实且不双计。
5. **事务、故障和并发。** 按Source13实际SQL/UoW重新核完整必要写入族库存；每实际必要族一击失败、所有领域/快照/必要audit及规定managed auth flush整体回滚，然后同body无fault重试。raw session-touch precondition另标；动态完整closure与FI和正常提交工具阶段分开，不能自动串跑或沿用旧失败hash。并发至少覆盖source/project CAS、creator首次分配、freeze vs participant、correction vs capture、全分摊项目锁、receipt basis vs terms、同/不同条件关闭、legacy/modern period/current authority；真实pg activity/locks或controlled barriers，顺序HTTP不算race。Root已锁父/永ROLLBACK的I58五项23514（006965/SHA731fe013...）只保留原证明，禁用parentless探针不得重试。
6. **检查与界面。** 精确输入绑定的Rust fmt/clippy/build/full regression；受影响TS shared/Native/admin lint/build/test（有lint target不得省略）、完整OpenAPI及client、迁移/ORM/entity/DDL drift分类、docs格式及diff检查、真实浏览器。未应用组合106的535pass/54ignored/26suites只可通过逐文件/依赖/toolchain/命令影响证据复用静态检查，不能变Source13运行验收。
7. **自然期末。** 用户已选择保留真实来源跨期。最早香港2026-11-09 00:00 / 东京01:00后，核实时钟与来源资格才可做本周期末201；仍须实际响应/事务/快照/H输出。不得回填、改时钟或以别期间/只读准备代替。历史自动选包待用户，不默认批准。

## 旧版证据的严格复用边界

- Source10/API133、Source11/API134、Source12/API135须各自保留出生来源pin、candidate/binary/process、retention、frozen state/snapshot、prior registry和immutable receipts；生产版本与后来读取版本分别列明。`consumer12-admission74-input.json`本身是pre-admission输入，不能据其`mintExecuted=false`推翻后来的实际准入，也不能单凭它证明实际准入。
- 旧成功仅允许“该epoch实际通过/本轮按明确无影响引用”；旧失败、partial、ignored、stopped、unsupported保留原标签。源文件、共享依赖、schema函数、权限、DTO或工具图一有相关变化，应交新实际证据或充分的逐文件影响证明，由非作者判断复用范围。
- Source12 Tax Expense/E/F/Receiver G已成功部分不得重放旧POST；Main G原006224 `409 operating_cost_source_missing`与零域写不能改为通过。Source13只在fresh preparation后补确切缺口。
- 65/90/83/84影响G捕获/重述及H下游、角色冻结/I准入、期末资格、schema3及清理比较；这些不能靠旧“全通过”概括覆盖。未受影响的A01/A02/A07等仍须保留原件pin及明确完整依赖影响边界，不能一律自动豁免。
- Native122固定清单只证明Native17 dedicated422、独立精确cookie-born单会话清理及双fresh S0守恒；不等于现代完整业务DTO成功，不增加Rust交付，也不重标原失败launcher/cleanup。protocol164与cleanup165工具图分开。
- Root当前UI/并发进展来自交接而非本轮读活state：Creator06a、Own/Legacy/MAX/MASK06b与同任务CAS006739待接收固定原件；Role03及合法peer race仍在执行，不读取或干预，不提前通过。

## 独立 G3 与实际 G4 的停止线

**G3所需：** 新统一候选不可变代码/工具/迁移/运行pins；32项与A01–A08完整证据索引；全必要写入族、实际并发、mask/audit/协议/真实UI、自然期末；检查或明确限定复用与drift/exception；所有失败/未完成项及影响充分解释。审查逐项给出结论，不能在当前准备阶段宣称P1/P2=0。业务语义、正确性与整体事务是判断依据，Node既有bug不作为对齐目标。

**G4所需：** 通过G3后再核所选工作流的确切commit/发布与实际main事实、保留S4及既有#115；原字节archive/immutable引用；只清理证明owned的新增PK/object key或明确批准的原行精确恢复，目录/ACL/trigger/sequence/row identity/xmin守恒及两次fresh no-op；只停owned匹配资源且保留卷/私有输入；Issue/checklist/dependency/PR或本地证据载体/tracker/文档一致；线上写后真实readback及独立实际G4。当前不执行这些动作。

只有满足完整交付及独立阶段验收才可能关闭#111/#112/#113/#117/#114/#110；#101还需完整R4审计，#57/#116继续开放；#115独立已闭事实不挪用。本准备不授予main合并、部署、切流、历史选包或任何额外数据操作权限。
