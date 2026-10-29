# RUST-R2I/J 联合实施纠偏记录

- 状态：Active；G1原件保留，G2进行中，G3/G4 Pending。
- 范围：本批I6/J19；输入修正以对齐原TS/Zod/Nest行为，不新增路由/契约或产品能力。父#67/#57、K/L/M、#61、R3–R5不关闭。

## C01：DTO长度与service截断使用不同字符串单位

- 分类：`existing-baseline-drift`，冻结候选的描述过粗；原Zod/服务源码本身未更改。
- 发现：J在G2用锁定Zod4.6.1执行660个原schema案例；255个😀的originalName通过、256个拒绝。string min/max按Unicode code points。原AttachmentService.sanitizeFileName仍用JS `.slice(0,255)`，按UTF-16码元截断，可以切开代理对。
- 原输入：G1正文SSOT与作者候选把长度/trim/slice统称UTF-16；这些原件及hash不重写。原Zod/现行Nest作为单向语义权威的规则继续有效。
- 修正：I/J的DTO string min/max按原Zod码点计数；trim按JS空白；service slice与错误body截断仍按原UTF-16；PG写入孤立surrogate沿Node UTF8替换规则。不能把这三者合并为一种Rust String长度。
- 证据：`tools/rust-r2ij/j-export.mjs`、`j-dto-rules.json`、`j-golden.json`及后续统一Rust/HTTP对照；660为原Zod有限oracle数量，当前不声称Rust已全通过或真实HTTP已通过。
- G3阻断线：修正后I/J validator必须匹配原schema oracle并实际验证请求/响应字符串边界；仅文件生成成功不能放行。其余既有模块不由本批扩展修理。

## C02：WSL直接exec与已有登录shell的PATH不同

- 分类：`tool-noise`，环境观察“直接exec node不可用”是真实结果，不能推导为没有已安装Node。
- Root实际通过 `bash -lc` 找到已有fnm Node24.19.0；真实可执行文件为 `/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node`，SHA-256 `bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12`。没有安装或修改主机工具。
- 执行调整：owner/API/Node验收工具可使用这一既有host可执行文件，统一记录实际版本/源码/进程回执；Rust构建、PG15与浏览器仍使用冻结镜像。原G1环境说明保留时点含义，本条作为验证执行方式的增量。
- local root明确使用独占host绝对路径 `/home/wangzishi/.local/share/poms-r2ij/objects/{backend}/server01`，原nullish/root语义不变；不依赖host根目录 `/r2ij-objects`，不触碰旧存储。fixture与env admission相同路径，后续对象清理仍精确key/归属并在完整preflight后执行。

## C03：Node fetch实际支持zstd，需要显式解码依赖

- 分类：`new-real-drift`，仅使用已有gzip/deflate/br解码会漏掉原Node24.19/Undici7.29已启用的zstd响应。
- 原native source/capability已确认createZstdDecompress存在、zstd1.5.7。固定Rust镜像内独立scratch实际编译 `zstd=0.14.3`（default features关闭），将原Node生成的8223字节合成帧解码相等；这只是格式/构建证据，不是实际OBS HTTP证明。
- 增量：新增direct zstd与已锁定futures-util，tokio fs feature；lock只新增jobserver/zstd/zstd-safe/zstd-sys四包，原包版本/checksum保持不变。I接入同一有界流式解码链，后续完整HTTP/坏帧/截断/取消由Root统一对照。
- 原件：`tmp/rust-r2ij/zstd-probe01.log`、scratch Cargo.lock和native帧；第一次metadata --no-deps未更新lock与第二次full metadata因非当前平台core-foundation离线缓存不足而失败的记录分别保留，不能计作metadata Pass。当前Linux locked/offline实际构建才是适用目标的证据。

## C04：真实UoW顺序、AUTO flush与失败后新增实体重试

- 分类：初始Rust理想化调度为 `new-real-drift`；G1候选把service意图当成最终持久化事实的描述归 `existing-baseline-drift`。原TS/DDL不变，冻结原件不倒写。
- 原Nest `native01`：13个实际HTTP用例与PG/local对象事实，最终双轮清理0/0。enabled新Config的persist-on-create先入queuedActions，同类型唯一性查询触发AUTO INSERT/COMMIT，再查询location/default；第一个default的audit previousDefaultConfigId实际为自己。loaded实体的普通scalar变更不自动入该queue，不能把AUTO flush泛化到所有UPDATE。
- 第二个enabled default CREATE先INSERT即23505/rollback，HTTP500，旧default v1保持；不会先降级旧default再成功。既有disabled配置启用并冲突则实际409，未到business flush。相同enabled location的CREATE在AUTO INSERT先23505，实际500。
- 原Nest create-version complete：validating更新先commit，之后新attachment CREATE在普通old-latest UPDATE之前23505；catch flush又以同一UUID/内容重试同一INSERT并再次23505，没到failed-session UPDATE。最终会话仍validating v3/failedReason null，旧attachment latest=true/v1，无新attachment/link/audit，上传对象保留。Rust不能释放旧latest来制造成功，也不能清掉新增实体队列后虚构failed持久化。
- 孤立surrogate Config：business text列已经以U+FFFD提交v1，随后独立raw JSONB audit INSERT以22P02失败，HTTP500、无新audit；提前lossy会掩盖此真实失败边界。
- 原件：`tmp/rust-r2ij/nest-critical-native01.json`、`native01-store-order.json`、Linux `tmp/rust-r2ij/witness/witness01/sql.jsonl`。SQL shape/seq/原字节hash保留，私密协议值不进入公开证据。
- 本条记录原版本上传/默认创建的既有失败路径，不把迁移兼容交付称为这些既有产品缺陷已修复；适用UI也必须见证原错误和恢复行为，不虚构新版本创建成功。

## C05：due auth、分段coflush与批量版本预检窗口

- 原Nest `auth01`：11个串行HTTP与2个受控并发请求、真实PG与local预置对象；双清理0/0。Guard的独立touch先使auth版本+1，首个实际business/AUTO flush再managed CAS+1一次，成功总+2；CREATE失败只有Guard+1。不能把前者误算为重复消费pending，也不能把失败前已commit的touch回滚。
- J pending会话＋真实local预置对象complete：first validating事务为managed auth CAS→session status UPDATE；下个事务CREATE attachment→CREATE link→session checksum/uploadedAt dirty UPDATE；再独立audit，最后completed UPDATE。会话v1→v2→v3→v4，auth本请求总+2。对象不存在则validating之后failed更新，HTTP404、会话v3，auth仍总+2。
- 原batch set-default先无锁版本SELECT（OR id+loaded version，ORDER BY id），再仅PK的CASE UPDATE，并采用RETURNING实际版本。Root锁住两exact owned config，实际观察两个UPDATE等待后释放，同loaded v1两请求均200，两行最终v3。Rust额外version WHERE/FOR UPDATE/post-affected-count回滚会改变原窗口，不作为迁移附带增强。
- 原件：`tmp/rust-r2ij/nest-auth-uow-auth01.json`、`native-auth01-store-order.json`，与native01分列。普通单行UPDATE仍按其原loaded CAS，不能把batch的特殊窗口扩到全部写入。
- 当前上述为原Nest运行输入；Rust对照、故障/并发、完整UI、独立G3/G4仍待统一完成。

## C06：历史版本组的批量更新与当前候选差分

- 分类：`new-real-drift`。原 Nest `history01` 的真实两版本行、HTTP 与 SQL shape 证明：多行普通 UPDATE 先无锁 OR(id, loaded version) 预检，再 PK-only CASE UPDATE，并采用实际 RETURNING 版本；单行仍为 loaded CAS。Rust 额外锁或逐行 CAS 会收紧原窗口。
- J 保留失败事务不发布 managed 状态；实际 `command10` 双端各58 HTTP、7项 owned 权限调整与完整 PG/audit 事实严格一致，包含 legacy 多版本 final/clear/repeat 及 void fallback 23505/500；两端二次清理均0/0。
- `command08b` 的旧56对原件、6项 binary 差异、首次 comparison 的 pending+failure 工具瑕疵及后续明确 Fail 增量分别保留，不把旧候选改标为通过。

## C07：fetch 初始 URL 与 binary controller 异常头

- 分类：`new-real-drift`。Node24.19/Undici7.29 对带 userinfo 的初始 URL 在 Request 构造时拒绝，3次 fetch rejection 后包装错误、底层发送0请求。Rust 在既有3次/250/500ms边界内补同一初始拒绝；不改 DTO/presign。
- 原 controller 的 Cache-Control 在 guards 后、调用 service 前生效。仅在 Rust 已授权 binary 分支，为 service/header 构造异常保留 `private, no-store`、原 JSON 字段顺序、实际字节 Content-Length 与 Express weak ETag；不向前置401/403添加 controller headers。
- local stream 的 fd read 错误没有 path；open/stat 等错误仍有 path。仅 read 阶段调整，不全局删路径。首块 EISDIR400 的原46字节消息、GET/HEAD及ETag已由 `command10` 双端严格验证；非Latin1 MIME引发的真实 header500亦已验证52字节原 JSON、Cache/ETag/HEAD。正常 PNG/TXT、Range、thumbnail 原字节仍一致。
- `api08`、`api10` 先保存各自600份实际 runtime source/binary capsule，再通过 owned stop 正常停止，source/binary unchanged；它们的失败与通过范围各自保留，不冒充后续候选。

## C08：每层压缩结束策略与 wire 默认值

- 分类：`new-real-drift`。真实 `transport11` 原 Node/Rust facade 37对操作发现：完整 zstd 包装缺 gzip trailer 时，Node 内层宽松 finish 成功，Rust 整链严格 EOF 拒绝；3次 socket rejection 的最终 cause 文本、默认 `accept-language: *` 与 `connection: keep-alive` 也不同。
- 候选改为每 codec 独立结束策略，zstd 保持严格；有类型的上游错误独立标记并通过 `io::Error::get_ref` 保留，防止宽松 gzip 吞掉上游错误。socket 文本仅对已实证的 source-chain close-before-message 做有限校准，未知错误不据此泛化。
- `candidate12` 既有 deflate 首错误保留测试失败原件保留；候选修正直接/嵌套 typed error 的传播后，`candidate13` full all-targets 测试通过。`candidate14` 只做等价 if-let style 修正并通过严格 Clippy/release；最终 controlled protocol 回执另列，不能把编译当成 HTTP 通过。
- `transport11` 中改 stdin SK 的 bad-signature 断言不适用于坚持 DB authority 的 Rust facade，属于 `tool-noise`；后续工具使用真实 owned 配置轮换后重新见证，旧报告不重写。

## C09：原组件测试宿主与证据标签

- 分类：`tool-noise` / 明确验收边界。原 AttachmentStore 的 blob HttpClient 请求依赖同源会话；初始跨源宿主使原 Nest 预览401，不能归为 Rust 产品差异。工具宿主改用与原应用默认 basePath 相同的同源 streaming proxy，逐字节转发到明确的6700/6701，不提供假业务响应、不拦截浏览器请求或调用 store 代替操作。
- 初始 UI exact accessible label、版本 dialog 动态标题与未处理 pending Promise 的工具失败保留。中断的 ui02 仅按其精确 run journal 恢复，独立 cleanup 收据二次 matched/changed=0；不编造缺失的最终 UI report。
- `ui05` Linux Nest、`ui06` Windows Nest 的11步通过原件分别保留，含实际 PNG blob/download hash、原版本 complete500 后保留文件/重试、只读权限状态与来源 URL。补充作废点击后使用新标签，不把旧11步改标为12步。
- 宿主直接承载原 AttachmentPanel、AttachmentCenter、AttachmentStorageProviderList 与真实 generated clients；不是 R3/R4 客户/项目等完整业务页交付。四个来源页面的后续业务迁移、真实 OBS 租户认证、生产部署及性能主张继续在本批之外。

## C10：路径顺序的源码推断被真实 Express 反证

- 分类：实际 capture 顺序差异为 `new-real-drift`；“method不匹配就跳过decode、应404”的早期源码推断为 `tool-noise`，已被原运行反证，不能登记成已证产品行为。
- `route-nest-route15.json` 是无fixture、无DB写的32条原始HTTP见证：generic `/:id` layer在method选择前解码整个capture。因此未知method/command的坏escape仍400；包含`:testConnection`、`:mark-final`、`:complete`的消息保留完整capture。无已注册静态shape的深路径仍404；全局OPTIONS仍204。
- I/J据此按已注册path shape独立于method验证完整capture，且只对真实operation重写canonical URI。J links形状按id再linkId解码；业务guard后的正常ID处理不变。原早期推断/候选和新actual回执分别保留，最终双端路径比较另列。

## C11：审计失败后的持久 failedReason

- 分类：`new-real-drift`。`lifecycle14a`双端各50个真实HTTP场景中，前45对一致；最后5个快照只重复同一`failed_reason`差异。精确owned actor/event CHECK使uploaded audit失败后，attachment/link business已commit、session failed v4、无uploaded audit；两端状态/对象相同，Rust SQLx Display文本却多前缀/line且漏PG detail。
- J仅在本片SQL失败映射中取PG primary message，加原`\n - detail: `及可选hint；非PG fallback保留，不改全局ApiError。原failed receipt不改写。
- 比较器只在已证23514 CHECK的12列detail tuple中验证实际owned attachment/actor/request、metadata前缀、拒绝audit UUID新且实际PG不存在、时间在该次请求窗口内，再投影该临时UUID/时间；不清空整个failedReason或接受任意driver文案。改后实际对照与catalog恢复证据另列。
