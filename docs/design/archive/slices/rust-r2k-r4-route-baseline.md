# RUST-R2K / ROUTE-R4-HANDOVER 联合实施基线

- Gate Status：G1 Pass（2026-10-29T10:00:47.319Z）；非作者联合审查[review01](../../rust-r2kr4-g1-review01.json)开放P0–P3为0。原受审scope与输入已保全，以下仅Gate元数据更新；G3/实际验收/G4仍待完成。
- 用户授权：2026-10-29“好的，启动”，承接已说明的K五业务＋最小R4真实事实读取，并行R4两项参数裁决，完整G0–G4。
- Task：RUST-R2K #78（父#67）；RUST-ROUTE-R4-HANDOVER #83（父#61）。
- 类型：K为persistence/api/binary/storage跨层高风险；R4参数为api/生成契约同步，联合按cross-layer-high-risk验证。
- 来源main：f23490d0f0e145fb030d8f070726dd2aa00cf074；复用既有干净隔离worktree，新分支codex/poms-r2k-handover-r4-route。主区、已完成L1及旧环境/原件保留。
- 模型及责任沿计划1.1/1.2既有目标：作者A/K与ZIP/事务、作者B/facts与两参数、非作者C独审，Root负责共享契约/路由/生成/环境/实际验收/证据/集成。没有新的Fast开关或服务层证据，保持未核实。

## 1. 范围与交付边界

K交付现有五操作的Rust业务：GET /api/project-handovers/{id}/attachment-checklist、POST .../{id}/attachment-checklist:refresh、POST .../{id}/attachment-download-packages、GET /api/attachment-download-packages/{id}、GET .../{id}/download。对应当前Nest AttachmentHandoverController五个operationId，URI/权限/DTO/原行为不改。完整交付只新增5个R2已实现操作；当前99/108，只有K G4后才可104/108。

R4参数只处理ProjectHandoverController的getProjectHandoverDetailByHandover与confirmProjectHandover：现行{handoverId}，既有canonical{id}，候选采用{id}。不迁Rust R4详情/确认/再基线业务，不新增alias、不改具体URI/operationId/权限/业务DTO；项目id路径、业务locals/DTO的handoverId不改。参数片新增业务操作0，#61剩余项目/合同业务号lookup仍待决。

L四路由、真实合同/提成handlers与完整Todo enrichment、R2M、R3/R4/R5整体、正式环境/TEST/PG17、部署与性能均不在本批。只有#78及#83可按各自G4关闭；#61/#67/#57与L/M不因子片完成而关闭。

## 2. 正式输入与单向权威

- 已确认的迁移计划1.1/1.2、R2范围/依赖、原R0操作清单、ADR-015及api-route-canonical-inventory；历史清单与旧验收不回写为新实跑。
- A来源输入：docs/design/rust-r2k/k-source-input.md（317dbb074a2f6b8143207b3a7457071fbb27cef7eeea2d38da6062ab42c3be44）、k-sources.json（32a754994585a1157424e8569e1424cff902d544a4c40509e2fd90717f267fbb），230件来源/92迁移/五operation及16递归components；纯来源/格式检查通过，不是runtime验收。
- B来源输入：docs/design/rust-r2kr4/facts-route-input.md（fdcc2ac006810aae7faee017b71f4cf025511110822b21c3552825c99a76579a）、facts-route-sources.json（55a06c1b7269f6e92045331ee21d7f7081cdf36a5458c9aeba20e11dc8137232）。74源及579 client为源码输入，不是runtime认证。
- C初步输入：docs/design/rust-r2kr4/g0-boundary-review.json（1d974be24759a9146fa79be1f2c74203cc189ea6486ebbc5a92fd096f469684d），不构成G1Pass。
- 业务/排序/异常/事务SSOT为原AttachmentService及repo/entities/storage；共享contracts/api DTO/full OpenAPI保持单向来源，Rust不维护第二份手写业务枚举。
- schema/迁移SSOT为原92迁移、107表完整来源；只复核可追溯的旧source authority，不复用旧runtime作本次验收。无产品DDL/新crate提案；N/A原因：目标是同既有schema/依赖迁移。若实际需新依赖/DDL，先做同次G1纠偏，不直接加入。

## 3. 最小真实facts与原生产者边界

B建立crate::handover_facts四只读getter：handover(id,projectId)、project(id,sourceLeadId)、该project全部contracts(id,contractNo)、project或sourceLead匹配的salesFollowUps(id)，严格按原过滤/次序/nullable/UUID/缺失读取。返回StorageFailure/JsString，Ok(None)由K按原顺序404。不得用空行/固定成功或预置空集合替代真实读取。

原K权限顺序只有project:read/write→真实handover→真实project；不新增confirmed-only、owner、合同权限或snapshot/freeze门槛。候选源为project/可选sourceLead/所有contracts/相关followups/该handover的真实附件链接，按原versionGroup去重、final优先和zh-CN排序；不改变候选集合。

原K实际只消费handover的id/projectId，不主动读取状态/summary/freeze字段。R4来源验收准确限定为：沿原database.seeder具名prepared-state与原workflow e2e来源，Root以完整run-owned UUID/actor映射建立真实表prepared state；再调用真实原Nest confirm产生confirmed/可选receipt freeze，验证K消费同一真实事实。原seed两条canonical package definitions作为只读borrowedSeedReferences，精确选择与完整行/hash验收前后不变，不认领、不写入、不纳入owned/logical cleanup目标；新snapshots引用它们的真实ID，其余新实体/actor完整owned映射。准备状态不是公开draft创建API；未发现原生产公开draft创建命令，不得称已迁移或从零业务创建完成。summary/participants/freeze仅为原生产者与验收观察，不新增K产品查询、不认证RustR4写链或整个移交闭环。R4未来Rust命令仍需它自己的G1与跨域复验；具体能力前置满足不等于整个R4完成。

## 4. K持久化、存储与二进制

沿现attachments authority/CallContext扩K，保持AttachmentsService::new(Database,Arc<AttachmentStorage>)签名；A添加私有facts:HandoverFacts并以database.clone纯构造，B实现deriveClone的四只读getter，Root只改lib/全局HTTP/state。构造不I/O；复用同一会话/UoW/原audit-before/dirty和版本语义；不能另建理想化全原子事务。A/B数据接口先冻结后并行；facts只读，无新增锁/一致快照事务或重试。Root统一lib/state/HTTP/raw-path/adapters接线，保持旧99操作语义。未来未迁移域的任意borrowed UoW不借本片认证。

冻结selections/download_package/items原字段、FK、版本、sourceRefs/manifest、nullish/undefined/Date/JS UTF16/PG text/数值与路径语义。刷新保留人工排除、原历史项/链接与保存次序；包创建无selection会隐式refresh并触发原write权限，不能强化或放宽。存储/archive错误按原捕获为failed包；文件、DB与audit分段边界/失败残留由Native实际SQL和文件见证裁定，不改为统一回滚。懒过期、downloadCount、流打开/失败/abort与审计次序按原。

直接复用AttachmentStorage的save_download_package/read_buffer/open_read_stream和当前default provider authority，不硬编码local，不加入假成功provider或新入口。local与受控loopback OBS协议证据分列，不认证真实云租户。

原ZIP为手写ZIP32/store method0，manifest.json首项、UTF8 flag、CRC32/长度/UTC DOS时间/central directory/EOCD按原字段/编码/溢出语义冻结。复用现依赖写入，不凭库默认另加压缩、命名、extra/comment/data descriptor或新大小限制。纯机械原helper金标与实际HTTP ZIP/manifest/entry bytes/PG状态分别验证；生成UUID/时钟的关联必须有明确归一和PG联动，不能用整个run时间token掩盖旧值。

## 5. R4两参数与原生成器保护

新S2流程是受限输入保全：先B仅改原ProjectHandoverController两decorator/两@Param与聚焦真实绑定测试；Root原命令导出完整spec，核两operationId/权限/schema不变，消去两标签后全spec等旧，其他289完整operation和585schemas逐字深比；C独立短审输入。随后Root只提交controller/test/spec为本分支局部S2，永远保留为最终提交祖先，不squash、不提前推main、不称最终G3。

旧baseline/sourceHead S687827d45...原件保全。新baseline只允许sourceHead=S2、fullspec指纹及两path/parameter映射变化；generator/config/JAR/wrapper/元数据/其余字段不改。原CLI六protectedSources在工作区/index/untracked都须匹配S2，原CLI write/check真实运行；完整579产物只有相应project-handover service的两个RequestParams有预期变化。当前未发现非生成TS的named-object实际consumer，必须完整检索证明，不能因此跳过生成类型/URL与共享检查；14处literal/位置参数/业务handoverId不改。原controller与fullspec变更作为新的Native输入epoch单独绑定，不能抹掉bootstrap/旧运行头。

## 6. 统一隔离与验证

新Linux checkout /home/wangzishi/projects/poms-rust-r2k，state /home/wangzishi/.local/share/poms-r2k；新PG15 container/volume poms-r2k-pg15/poms-r2k-pg15-data，host18432→15432，db poms_r2k_nest/rust，app poms_r2k_app，新密码/private700；marker固定为6790e07a-a012-4f1c-b597-fde1750fc135（源候选tmp/rust-r2k/owner-marker-candidate.json）。需要时Native8700/Rust8701/admin8800/合成上游8900；G0观察均空且新路径不存在。Node24.19路径/hash bc17...已实核；使用固定PG b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a及build ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273镜像与只读/独立复制cache，不安装宿主工具、不改旧R0E/IJ/L1或PG17。生产数据不进入fixture。

Root拥有环境、prepared-state recipe、fixtures、ownership/引用闭包、实际执行与证据；作者不能自行启动共享PG/改private/改旧日志。所有UUID/对象key先计划、精确真实commit证据后认领；扩K与prepared-state真实表到完整107表/全部207FK/任意schema外引与UUID/text/JSON闭包，未知引用/预存PK/重复清理必须先拒绝0DML，只删本run精确已证行。新catalog/92链/owner marker/低权role先验；最终所有durable journals和对象两轮0/0，最后全量只读扫描0DML，停止本批owner/PG并保留private/volume/原件。

必须完成：原Nest/MikroORM真实PG SQL/AUTO/coflush/CAS/权限及分段错误见证；五K真实HTTP/真实存储/ZIP和sourceRefs/manifest/敏感排除/版本/过期/失败与并发严格对照；真实原R4 producer观察与2参数真实绑定/契约；原Angular K组件或原store/HttpClient真实交互（含viewer/失败/下载内容），不称RustR4整页已迁移。缺失前端/外部证据列明确N/A或真实阻断，不拿mock替代。

Rust fmt/check/all-target tests/strict clippy/release；受影响API/admin/library lint/test/build、完整OpenAPI/原clientcheck、适用browser/e2etypecheck、只读migration-check/schema-dump、diffcheck与docs Markdown check。保存具体命令/退出码/计数/新lint warning；历史ignored、N/A、旧失败/工具错误分列。schema失败沿来源分类，生成DDL不执行；替换launcher仅在原同版本/配置/行为核等且独立证据明确时使用，不篡改target或跳过保护。

预G1已分类的existing-baseline-drift：原baseB canonical文档存在表格padding不规范，全仓Markdown check最初exit1。Root保全原raw及base blob后仅格式化该file，所有表格单元格/分隔对齐与非表格行语义精确不变；见tmp/rust-r2k/g1-canonical-format-delta.json。作者manifest保留原输入指纹，格式后版本为本G1当前authority表示，不回写旧来源。

## 7. G3/G4与例外

C审初始G1、S2短输入、最终联合G3及固定commit完整性，均非产品/fixture作者；Root做集中实际证据，至少Root+2作者+C四位协作。选择已授权solo worktree流程，不为形式创建空PR；需要PR时同等gate及issue关系。

独立G3通过、实际code提交推送/main集成、原件字节与220式明确表示映射、主区一份完整archive+小addenda、固定commit短审和在线读回后才能G4。只按真实K交付计104/108；#83新增0操作，#61只勾R4两个参数组，余两个lookup不关。K与参数任一未过G4则按真实子片状态保留，不能联合标题冒称都完成。完成生命周期MD等按治理移入docs/design/archive/slices，保全原active路径/raw并记录链接/路径/hash映射，冻结的运行/验收JSON不回写自身archive/hash/G4。

例外：当前无G1放宽或已批准豁免；S2输入提交是本基线明确受限顺序，cleanup owner Root，截止最终main集成前。新crate/DDL/源语义不稳/必要证据缺失均先停相应实现并写纠偏，不靠时间或候选结果猜Pass。
