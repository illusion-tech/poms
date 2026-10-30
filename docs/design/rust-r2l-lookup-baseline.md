# RUST-R2L / BUSINESS-LOOKUP 联合实施基线

- Gate Status：G1 Pass（2026-10-29T20:55:31.950Z）；非作者联合审查已通过并实际在线冻结，受审scope/input原件已保全；以下为Gate-only元数据更新。
- 用户最新明确恢复并授权完整 G0–G4；L #79（父#67）与 lookup #84（原生父#61）并行。GitHub G0已登记并验证，首次父关系 API 字段422及精确恢复原件保留。
- 来源 main：02b8956759352b2612bec5980cbe55ae77d0293f；分支 codex/poms-r2l-lookup；复用既有隔离 worktree，主区 E:/projects/poms 保持原状态。采用已获授权的 solo-worktree checkpoint，非作者 C 持有 G1/G3/固定提交审查证据。
- 类型：L 为跨层高风险 persistence/API/真实审批事务；lookup 为设计裁决/API/生成契约直接切换，联合按高风险矩阵验收。

## 1. 范围与完成边界

本批完整交付 L 四个既有公开操作：GET /api/approval-records/{id}、POST .../{id}:approve、POST .../{id}:reject、GET /api/me/todos。复用 L1 的七表引擎、投影、校验与同事务边界，补全原 Contract/Payout/Adjustment 三分支及真实 Todo enrichment；其必要跨域读写仅是 L 消费闭包，不认证整个 R3–R5、全部生产者命令或迁移接管。

lookup #84 只裁决并同步项目号/合同号两个现有查询能力，保留 UUID item identity、原精确业务谓词、operationId、DTO/404/权限和敏感投影/审计；采用 ADR-015 §4.2.1 本次明确补充的 GET collection custom query，旧URI直接切换，不留alias。它新增 Rust R3/R4业务操作0。L与lookup无直接业务调用依赖，共享完整spec/client由Root单写。

当前R2保持104/108；只有四L真实完整G4后可108/108。R2M #80、父#67/#57及整个R3–R5保持未完成。#61只有两lookup、canonical独审和必要controller/spec/client/consumer/测试直接同步全部满足才可连同#84收口，不能只依据裁决文档关闭。L1/#81与已完成K等旧证据和失效/失败/partial/ignored原件保持时点。无部署、真实云租户、性能结论或PG17 SQL/服务变更。

## 2. 责任与显式配置

- Root：公共设计裁决、ADR/canonical、shared contracts/query schemas、Cargo/lib/globalHTTP与managed-auth一次消费/coflush适配、完整OpenAPI/client及生成baseline、真实环境/Native校准/夹具/保全/集成和在线回写。Root模型目标沿计划1.1由主聊天控制，本工具不能切换或独立证明该目标实际生效。
- 作者A /root/l_impl：显式请求gpt-6.1-sol/max、独立上下文；独占新approval/**、经本基线批准的最小approval_common兼容扩展、必要域元数据与原算法等价实现和局部单测。不得并发改Root全局入口或B文件。
- 作者B /root/lookup_impl：同样显式gpt-6.1-sol/max；独占两原controller文件中的root-scoped查询class、module注册、两个api DTO文件、必要contract fallback、聚焦binding/consumer测试。阶段完成后可经Root转派只读oracle/UI验收工具。
- 非作者C /root/l_lookup_review：同样显式gpt-6.1-sol/max，只读产品/工具/环境，出联合G1/G3与固定提交范围结论；不自写产品或fixture。
- Fast无独立工具参数/运行证明，保持未核实；显式请求被工具接受不伪造服务层测量。中断前旧复用agent的partial输入模型未核实，原字节在tmp/rust-r2l/preconfigured-drafts；新作者续接和新C审查另记来源，不冒称旧稿已符合配置或已G1通过。

## 3. 正式输入与SSOT

原业务/事务事实以当前base02的ApprovalService及其settlement/date传递闭包、entity/92migration/原MikroORM SDK、共享Zod/HTTP guard与serializer源码为准；L1源码和原验收仅认证已交付公共子片。四L canonical现已存在并aligned；lookup当前旧实现及新候选见两条authoritative行和本次ADR补充。

作者输入按下列当前原字节固定；原源码manifest以base02原epoch为权威，ADR/canonical/本轮治理文档的设计层增量由Root单独保存before/after，不把它当产品源漂移或重写作者旧指纹：

- docs/design/rust-r2l/l-source-input.md：25924 bytes，SHA-256 2e52c9d6e7139145bbd2fdeb1b35c4585c29da71b67b6522294153e38acf70a0
- docs/design/rust-r2l/l-sources.json：214487 bytes，SHA-256 9e066798d3e3d2459c1d8a9907b5ce2ad4a987ff29d02feb7667382920e1c2c9
- docs/design/rust-r2lookup/lookup-input.md：21847 bytes，SHA-256 82d33f7dccebaf0b889495ee3e424716ab246bde6c90458e382f6d92d9cf03be
- docs/design/rust-r2lookup/lookup-sources.json：1154467 bytes，SHA-256 c79697e67fa7f77ef342adb169d5e77a8013a7cc6c4860e9f3544b82e0d3d1de

输入覆盖实际读等级、四operation/递归DTO、原exact method/source、15域/五写/七公共表、source生产者recipe、consumer、579client、非目标289operation及原585schema。任何未读/未运行都明确保持其等级；hash-only不代替业务审查。

## 4. L 路由、输入与输出

GET详情要求project:read，审批动作要求project:write，me/todos仅Authenticated；复用原session→CSRF→permission先后、拒绝审计与原error协议。approve/reject请求由原Zod解析：comment/reason按原trim/长度，expectedVersion正整数optional，未知body key按原strip；路径id没有UUID pipe，不额外加严。

全局ZodSerializerInterceptor只有存在response metadata时才parse。四L及两lookup原方法均无ZodSerializerDto/ZodResponse；ApiOkResponse仅为规范，运行输出必须按原mapper/JSON行为，不能增加response schema parse、字段补齐或静默类型转换。成功/缺失、unknown method/HEAD、raw UTF16/JSON/DB错误均使用原事实校准。

审批详情按UUID读记录及三类目标；关联缺失按原nullable fallback，不加域404。me/todos只查询当前assignee的open/processing，createdAt ASC保原数组/精确ties；批读approval+contract/payout/adjustment/project/lead/customer，保原标题/业务状态/allowedActions/提醒文案，不加owner/target权限或统一新事务。

## 5. L 必需真实域与UoW

十五域为Contract、ContractTermSnapshot、CommissionPayout、CommissionAdjustment、CommissionRoleAssignment、OperatingSignalToCommissionGateBinding、CommissionGateReviewRecord、CommissionFinalSettlementSnapshot、CommissionRuleExplanationSnapshot、ReceiptRecord、CommissionDepartureExceptionDecision、CommissionFreezeDisputeRecord、Project、Lead、Customer。仅Contract/Payout/Adjustment/FinalSettlement/RuleExplanation五域由本L写入，其他为实际只读事实；不加产品表、迁移或依赖crate。

复用CommonState，最小扩展受控apply_with_session(context,&mut CommonSession)，默认转发旧apply(context,connection)，保持旧签名与七表协议访问边界；生产handler覆盖新端口以借同一连接/事务/managed state。统一登记必要域managed rows，Root提供一次消费managed-auth coflush participant。不得另取pool连接、另行commit，不能把末尾分别flush common/domain/auth当共享UoW。旧fork(clear:false)共享parent对象、失败后不回滚内存与child-only跳过合并语义同样覆盖新增域。

原resolve顺序、expectedVersion/pending/assignee/Todo查询及内存变更先后保持；unsupported branch在原位置失败。合同批准后仍pending-review，驳回draft；调整只改原approved/rejected；payout approvedAmount采用nullish fallback，first/second不追加final规则。final与retention真实按原调用链，不能从submit额外搬校验：final仅block/block-*；retention另含review/review-*，且approve不检查submit特有的snapshot/freeze/summary/gate相等或nonRetention状态；不新增ConfirmationRecord读取。

final/retention的两个current快照链按原isCurrent/status/supersedes/version更新，原supersede处中途em.flush可同时提交此前dirty approval/todo/payout/auth，后续savepoint/外层失败仍需按原整体事务证据。先实际Native SQL/AUTO/CREATE/UPDATE/RETURNING/unique与故障见证，再定Rust store排序/批量/时序；不预设一胜一败CAS、额外FOR UPDATE/version WHERE或理想单flush。

原逐点new Date()必须逐点采样；兼容旧API不等于保留生产时钟折叠。旧L1共享now若受影响，按原source对齐改进并增量证明，原golden/旧失败不回写。datetime按原Date/PG毫秒事实；业务date使用Asia/Hong_Kong，产品Todo提醒保留原固定UTC+8；仅验收报告向用户展示的时点按Asia/Tokyo，不能据此修改产品日期或提醒文案。receipt summary金额string原样、number才toFixed(2)，复用原JS Number/undefined/null/UTF16语义与机械oracle。当前approve不传markAsSettled，retention结果保留原ready状态，不提前写settled-all。

## 6. 两lookup冻结契约候选

旧GET /api/projects/code/{projectNo} → GET /api/projects:lookup?projectNo=…；旧GET /api/contracts/no/{contractNo} → GET /api/contracts:lookup?contractNo=…。query单必填string min1，不trim/coerce/大小写折叠/NFC/UUID/max64，未知key按z.object默认忽略；simple parser重复目标key为数组故400，仅bracket key导致目标缺失故400，有scalar加bracket未知时使用scalar。+/%2B/percent/Unicode/slash等以新原生query解析事实验证，不假称旧path无效编码与新query parser所有边缘等价。

两root-scoped@Controller()必须正确literal colon转义，不在@Controller('projects')下用@Get(':lookup')误造slash子路径；显式保原operationId，复用原mapper和module依赖。Root新增ProjectLookupQuerySchema/ContractLookupQuerySchema及infer types，B新增对应api DTO绑定；原business repository exact predicate/单对象DTO/404保持。

Contract sensitive context优先实际originalUrl再url/path，保原query/编码；缺URL才用新fallback '/contracts:lookup'。非null signedAmount按原一次事件、snapshot非null六字段batch再一次，null不触发；保原权限来源、场景标签、查询/安全事件及认证coflush，不能只比DTO。实际旧路径移除只认证原两lookup具体旧URL，不把其他既有UUID item路由行为改掉。

权威 inventory 的 Canonical/Current Design 两列记录纯 method/path（GET /projects:lookup、GET /contracts:lookup）；必填projectNo/contractNo query单列于Action和输入DTO，不能把query模板混入OpenAPI path identity。G1正式通过后的设计层Gate更新将pending标为implementation-drift、残留类型business-number-query-cutover；它表示已裁决的URI直接切换，不是parameter-name-only、alias或未裁决identity。此处是本次设计变化的明确分类。

## 7. 新永久输入checkpoint与生成

现S2 ee0f4847永久祖先和旧生成baseline原件保留，六保护不弱化。G1后B/Root先完成Node controller/module/DTO/schema/fallback/测试等原输入及真实完整export，再由C作受限输入短审，形成新永久S3祖先提交；只有批准输入文件进入S3，不夹带Rust实现/状态Done，不提前main。随后Root只按实际sourceHead/spec两路由及必要query metadata更新baseline并运行原CLI write/check，不手改client。

保留291操作；新2路径替旧2，非目标289逐项与旧全部585schema保护。Query DTO当前机制可能只flatten parameters而不新增component；若实际出现新component，仅允许明确ProjectLookupQuery/ContractLookupQuery两名并经受限短审后最小调整数量guard，不能删585内容保护或伪造一次原CLI运行。保持原config/JAR/legacy normalizer/package/lock/gitattributes，579输出树仅实际受影响Project/Contract service及必要自生成metadata可变，其他全字节验证；实际consumer扫描无调用仍需原回归/typecheck证明。

## 8. 新隔离环境、来源与安全

G0只读检查确认新Linuxcheckout /home/wangzishi/projects/poms-rust-r2l 和state /home/wangzishi/.local/share/poms-r2l尚不存在；19432/9700/9701/9800无listener，旧R0E/IJ/L1/K PG15均已停，Windows PG17 Running/Auto。G1后只新建poms-r2l-pg15与poms-r2l-pg15-data、新数据库poms_r2l_nest/poms_r2l_rust、新app role poms_r2l_app/fresh secret/marker 04aadee8-4ec6-4a3b-9d27-ee8d51721029；19432→15432、Native9700/Rust9701/UI9800。PG15.12镜像b7180261…、build镜像ccc653bf…、固定Node24.19/Rust1.99.1/Java17以当次实际工具profile再验。旧namespace/private/runtime/journals不可读取复制为新证据，允许只读源码、编译来源明确的纯产物/缓存/JAR，经新copy及hash验证，不冒称重编或重跑。

Root用原92完整迁移+原full seeder建立新DB并核107表/1778列/207FK；新L所有相关PK/FK和逻辑UUID/text/JSON全闭包更新，未经登记外来引用在DML前拒绝，不靠DTO收养generated IDs。原审批submit与commission workflow/e2e/seeder recipe按具名源码派生fresh owned initiator/org/project/facts，再在各新DB实际运行原Native producer供Rust消费，不转录或改写审批人。原requireDevUserByUsername固定vp_owner=00000000-0000-4000-8000-000000000008、finance_mgr=00000000-0000-4000-8000-000000000014；这两principal按只读seed引用借用，保留原输出UUID，user/credential/user-role/role-permission定义逐库before/after不变，不认领、改写或清理。其本批真实创建的auth_session与audit行须独立before-absence/COMMIT证明和case归属后登记为owned；认证touch仅命中本批session，不把seed principal加入owned/logical删除集合。完整credential行仅留private，公开证据保留哈希/脱敏结构及不变性结果。未移的域producer只认证原事实，不冒称Rust生产链；seed canonical summary definitions同样只读借用，完整before/after row/hash相同，永不认领或删改。

新行须真实before-absence、outer COMMIT ACK、xmin/原SDK或独立PG提交证书、case/actor/project边界才登记；旧K工具源码可受控复用，但必须本片命名/表身份/闭包/新marker重新校准，不能继承旧run证明。临时提交观察DDL/引用反例/故障CHECK如需要，先分类独审、精确OID/定义/ACL记录、事务rollback/savepoint/active反例和Native SDK交叉校准；还原全部原对象和完整catalog后才能正常清理。所有新DB、文件、浏览器与进程仅按本批拥有证明回收并二次0/0；保留private和volume但停止新owners、端口释放。

## 9. 强制验收矩阵

- 原source机械输入/DTO/settlement/date/SQL metadata与portable纯oracle；单测明确非PG，输出parse与输入校验分列。
- 实际Native先校准四route、三域正反决策、详情/六类Todo完整facts、retention/final所有必要条件与原不检查条件、真实金额/日期/时间采样、双current链、多次flush/认证共flush、预设失败/唯一约束/外层rollback/错误顺序/父内存。Rust最终候选逐场景/行/版本/输出对照，允许ID/时钟映射须有类型、双向原PG与逐步时间边界，不删字段或全面宽松归一化。
- 至少受控同approval双真实UPDATE和snapshot current竞争，先观原结果再实现；失败方所有common/domain/auth按原数据库/内存边界。
- 两lookup真实旧/新Native成功、404、401/403、query解析和编码、原旧路径移除、敏感字段裁剪/事件次数/实际originalUrl及fallback；完整route/spec/client/typed consumer回归，不能只reflect metadata。
- 原Angular审批/待办真实UI＋实际API client/AuthStore/CSRF/HttpClient正反交互，含真实approve/reject后PG状态；适用lookup SDK/UI host真实query，不伪造未迁移域服务成功。原页面原件/薄host剪裁与未覆盖面明确，浏览器/进程正常+取消closeout有限见证，不把partial当全成功。
- 统一Rust fmt/check/test/严格Clippy/release bins+examples、Node API/admin及受影响库lint/test/typecheck/build、原API fullspec和原clientCLI write/check、共享回归。旧54ignored不计passed；不重复无受影响检查，也不因旧证据存在省略本次必要项。
- 双库migration-check与readonly schema dump实际执行，原CHECK可见性/注释漂移若重现则分类失败、生成DDL不执行、92与catalog完整before/after同；不得伪称exit0。
- G3非作者联合审查覆盖产品+实际矩阵+源/输入/失败归类，P0/P1/P2未闭不提交。G3后commit/branchpush、精确source raw→LF与任何真实差异map、独立固定提交、primary clean FF/main push、生命周期移动与真实在线G4，前后分开。

## 10. 保全与G4

原始attempt/result/失败/partial/stopped/uncertified/ignored标签不回写；G1/G3受审原件与Gate元数据改动有独立raw/LF/path/hash链。runtime input须完整Rust根metadata/Cargo/src/tests/examples/全部literal include、Native真实编译来源+工具+必要SDK/契约/UI产物/执行binary，不能漏掉后补却倒称当时snapshot。证据在Linux本地清单和一次批量传输验证后，一份完整public tar在主区独立逐成员/真实长PAX路径验证；不在Windows WSL共享路径上反复遍历大树。新Windows原生证据、小G3/集成/G4增量单独以manifest/before/after保全，不重做初始大归档。private/env/整棵依赖/ROOT-CHECKPOINT(-n).md排除。

已完成生命周期MD与同目录支持原件在本批G4移docs/design/archive/slices，根机器验收/审查/索引作为长期证据保留；真实相对链接机械重定位，旧冻结JSON中历史路径经映射解析，不重写已冻结报告。GitHub先写任务状态、本地镜像随后同步；关闭#79/#84与#61均须其自身完整条件实际满足。四L全部完成后R2=108/108公开操作，但R2M和父#67/#57仍Open；无部署/切流/生产DDL/真实性能认证。

## 11. G1结论

Pass（2026-10-29T20:55:31.950Z）。非作者审查与实际在线G1冻结见独立回执和tmp/rust-r2l/g1-freeze.json；本次只更新Gate元数据，受审原件不改写。G2产品、运行验收、G3/集成/G4仍Pending。
