# K55 附件完成、不可变 final 与关联真源纠偏提案

本文件是仅供 Root/Gate 冻结的设计候选，**未授权实现**。产品只拟涉及 `attachments/service.rs`、`attachments/store.rs`、`attachment_storage/registry.rs`；不改 Database、HTTP、DTO、DDL、依赖或公开入口。F46/F44 保持封存。K54 Block55 的 SHA 为 `621433d14fd779b53c9f3f85f0471ca2745fff72820132367041fa73d9528694`；K54 的单事务方向保留，但本方案补齐它遗漏的对象I/O隔离与锁内完整关联集校验。

## 1. 最小事实与不变量

1. 新 Attachment 永远不绑定 upload Session 的可写 staging key。Session 的 provider/bucket/key 保持 staging；新 Attachment 绑定新 UUID 专属、每次准备另有随机 nonce 的 final key。final key 不产生 upload target/presigned PUT，也没有可覆盖它的公开附件写入口。
2. final 的 bytes、size、SHA 必须来自同一次有界实际读取的 buffer。HEAD/ETag/用户声明不能替代读取；所有非空 session/request checksum 均与实际SHA核对，不能只在HEAD有checksum时才校验。
3. completion 在对象I/O之后只开一个业务 SQL Tx：锁/recheck Session→canonical groups→group/head/links→early CAS释放旧标记→new Attachment/links→必要audit/auth/Session completed→一次COMMIT。没有validating预提交、SQL失败failed补写或catch再次flush。
4. 成功ACK后才发布 identity-map/baseline 和消费 pending auth。确定rollback可恢复请求上下文；COMMIT结果未知不重放、不删对象、不对外伪报成功。
5. 完整active links是独立真源；head.row_version不能替代它。所有Attachment/Link/flag相关writer经store同一组锁。旧active/final材料及字节不因普通nonfinal新版本改变。

## 2. registry.rs：有界真实 snapshot，固定原runtime

新增内部 `prepare_completion_snapshot(sourceLocation, attachmentUuid, objectNonce, declaredSize, capturedMaxSize, expectedSessionSha, expectedRequestSha, contentType)`。返回不可公开序列化的 prepared capability：final ObjectLocation、实际整数size/SHA、source routing proof、捕获的原RuntimeConfig及清理能力。类型只在registry定义并由service局部推断使用；跨store只传现有ObjectLocation/普通内部proof，不改mod.rs导出或公开DTO。capability不derive Debug/Serialize，不记录credentials。

准备步骤：

1. 校验declared为可表示正整数、≤Session捕获的max、能转换到内部长度类型；不按不受信值预分配整个Vec。
2. `location_runtime(source)`解析原provider/bucket/prefix一次，释放该查询连接；后续用捕获runtime直接调用local_read/obs_read和put_runtime，不在SQL锁内重新取config连接。不得调用default_runtime/save_original切换到当前default。
3. 从实际Body data stream逐chunk读取。读数checked_add；发现本chunk将令累计>declared立即停止并拒绝，**不extend超限chunk，不继续读余流**。正常EOF必须actual==declared。应用buffer累计最多declared；现local_read是64KiB流，不经现有无界read_buffer。provider交付的单chunk仍有其传输层内存开销，不把本措施冒称整个HTTP栈的严格heap上限。短读/流错误/超限都不生成可提交Attachment。现DB size/max是int4，检查必须同时满足该范围，不能以f64近似数替代整数。
4. SHA逐chunk计算，最终再次核对所有已提供session/request checksum，存实际小写SHA和actual size。已知checksum不符立即拒绝，不相信HEAD的相同size或伪checksum。未声明checksum时只证明实际捕获bytes和final一致，不声称可识别并发上传者的主观文件意图。
5. final key建议为`<原runtime.key_prefix>/attachments/completed/<date>/<attachmentUuid>/<objectNonce>/original.<既有合法extension>`。UUID/nonce由服务器产生，不复用staging、旧对象、另一次失败请求或当前default。写前确认final与staging不同、provider/bucket相同，destination location解析仍为同一原config/routing identity；若更长prefix指向别的runtime则明确拒绝，不静默改provider/endpoint。使用捕获runtime的put_runtime写**同一个实际buffer**，不二次从staging取数据。
6. prepared capability只供一次complete尝试；失败重试重新准备新UUID/key。应用只写该final key一次，任何session PUT/签名仍只指staging。此处的不可变指应用层不可覆写绑定，不冒称S3 Object Lock/WORM或未验证的conditional-PUT能力。

runtime解析需保留内部config ID/rowVersion/routing proof，registry可以用内部resolve包装复用当前location_runtime选择规则；store锁内用**同一borrowed连接**重新核对现有config stamp/已选source+destination身份，不能调用会另拿连接的storage API。若路由发生变化返回409，清理仍使用捕获的旧runtime，不能按新的default删错bucket。一般storage管理员在提交后重定向已有config的全局迁移问题不在此三文件支持范围，不能据本修复宣称任意config重写也不影响所有历史对象。

外部presigned PUT无法参加DB锁；即使完成后仍覆盖staging，也改不到final。proxy迟到PUT的Session CAS失败不能回滚staging写，但新的active字节已不依赖staging。所有新proxy/target调用仍在业务阶段按Session状态/CAS拒绝终态；不暴露final写能力。

## 3. service.rs：只规划一次并统一必要audit

complete入口先做现有会话所有者/权限、合法状态、client expectedVersion、size/expiry/checksum的无副作用检查。此路径不调用会偷偷save expired的guard；锁内过期/状态/源冲突都不发布failed/expired或validating中间状态。expiry由锁内当前clock再次判定，允许已有合法legacy validating会话按真实GET版本重试；failed/expired/aborted/completed终态不自动复活。

先读取/授权真实base/current head及完整active links，捕获原始proof；准备actual snapshot；然后才暂存Attachment/继承links、旧latest变更、Session checksum/uploadedAt/completed/completedAttachmentId等，并构造原有成功audit。原`create_from_session`改为纯规划，不自行save/audit；complete只调用一次guarded flush。响应在成功ACK后用已提交entity构造。

普通metadata、mark/clear final、void、link/unlink及create_session删除先save后audit，改成同一次`flush(...Some(audit))`。after审计内容从计划数据生成，dirty业务、必要audit及pending auth共同提交；audit失败不能留已生效metadata/link/终态。非final新版本只撤旧latest，不撤旧active/final；mark_final显式撤旧final后再置新final；void显式释放标记再提升合法active版本。

proxy_object的对象写仍是staging；在I/O前检查终态/原Session以及遗留staging引用，写后Session uploaded/checksum只经严格Session guard/CAS一次持久化。upload_target先准备目标信息，再锁内重验可receive状态后发布，不能在终态竞态后签发新可用final写目标。现无audit的上传控制动作不发明新的业务审计种类，仍与必要dirty auth合并。

abort先锁/recheck Session及client CAS，completed或已有Attachment引用同staging的遗留不一致状态拒绝。新aborted终态+原必要audit+pending auth一次COMMIT成功后，才best-effort删除**staging**；删除前独立确认无Attachment（任意状态）、DownloadPackage或其它Session引用该key，并重新确认本Session仍为本次aborted版本且无completedAttachmentId。本Session自身保留的aborted staging位置是可清理历史指针，不能把它算作阻止自身清理的业务引用。输给complete、rollback、commit未知、已有引用或检查失败均不删。删除失败/迟到PUT重建staging只形成可清理孤儿，不再写failed或重flush，也不能宣称abort后所有外部PUT都已撤销。

## 4. store.rs：统一协议、完整关联集与early CAS

保留现有`flush`调用签名，新增内部guarded路径/intent支持service complete及明确mutators；generic flush自动从dirty Attachment/Link、Session.baseAttachmentId和相关已加载source实体发现组，故handover.rs的自动Link也参加同协议，无需改其产品文件。不能只在complete加锁而遗漏link/unlink/mark/void。

统一顺序：已有Session ID升序FOR UPDATE→所有canonical group UUID升序advisory_xact_lock（前缀`poms:attachment-group:`）→组成员Attachment ID升序FOR UPDATE→active Link ID升序FOR UPDATE。没有反向group→Session。读取group发现后取锁，再核对其归属未改变；多组取旧/新相关集合的排序并集，不能首次按偶然entity顺序拿锁。

canonical group是`COALESCE(version_group_id,id)`，包括legacy null首版；不能拿空group漏锁。complete锁内重新核对：

- Session实际rowVersion/status/expiry/createdBy及原provider/bucket/staging key、operation/base/target、size/max/checksum/元数据仍与准备proof一致；client与服务器加载时CAS都严格，不因未提供client expectedVersion放松服务器原版本。
- base/current active latest身份、状态、版本及权限所依据的security/uploadedBy字段与授权proof一致。
- 完整active links按id排序对比`id,attachment_id,target_type,target_id,relation_type,status,linked_by,linked_at,unlinked_by,unlinked_at`，不是只数数量或比较headV。任何新增/解除/换target/身份差异都409，不能用锁前构造的集合继续提交。通过比较后才接受预构造的同集合copied links；所有合作writer受组锁，无插入phantom窗口。
- 版本号取锁内同组**全部历史（含voided）max(version_no)+1**，不能只取active latest+1重用voided号。若准备时的head/组版本集合已变则409，不静默重base或改audit含义。

必要write顺序：

1. strict CAS early UPDATE将会释放latest/final/active唯一槽的旧Attachment；只处理服务端计划的flag/status/group正规化及内在void字段，不借此改任意body metadata。
2. early entity按其全部计划dirty一次CAS写完，真实返回version存局部saved journal；登记consumed index，从ordinary UPDATE集合排除，不能再加一次rowVersion或重CAS。
3. INSERT新Attachment，再INSERT新copied Link；保留DB unique/FK。既有Attachment/Session ordinary更新用严格每行CAS；Link非versioned要在组锁下比较原tuple/status更新并检查影响行数，不沿用旧PK-only bulk race。
4. 必要audit、pending auth、Session completed在同Tx完成。实际顺序中任何一项故障都rollback全部；只有一次COMMIT。其它不相关selection/package Native批处理不凭本修复宣称已重构成全局一次事务。

auth回滚指本次尚未提交的managed pending flush；认证入口若已独立提交eager touch，其后才是故障用例的比较baseline，不能把已提交touch说成可由本业务Tx回滚。旧Native顺序观察是原始事实，不改其冻结golden来伪装新行为仍旧一致；相关纯测试应另明确本纠偏的业务正确顺序。

metadata/flag mutator即使没有dirty值，也以明确intent保护授权proof及必要audit；对重放link tuple做锁内存在性重查。保留顺序重复link原有no-op能力，竞态重复可409而不是unique500；不能绕过unique。

## 5. COMMIT判定、上下文恢复与对象补偿

不改Database。store内部使用typed outcome，并以本次closure的私有phase journal区分beforeTx、inTx、rollback ACK、COMMIT attempted、COMMIT ACK。Database.with_connection外层timeout会丢弃future，因此任何未得到确定rollback/commit ACK的事务结果都按Unknown保留资源；不能把普通StorageFailure一律当rollback成功。

- Committed：完成SQL commit ACK后才mark_committed/发布saved journal，消费pending一次，返回成功。
- KnownNotCommitted：rollback ACK或确定从未开始SQL且随后独立检查成功。恢复service在首次mutation前捕获的完整checkpoint：entities/data/original/raw/original_raw/json_raw/original_json_raw、pending及target cache。不要保留失败的新Attachment/Link dirty后再flush。
- Unknown：返回既有内部错误，当前ctx作不可复用/poison；禁止catch再flush、旧pending CAS重放或把旧ctx标clean。store默认wrapper也须阻止子流程把unknown entities再写；可用Entity内部poison标记配合CallContext guard，均在这两个文件内，不加公共字段。

只在KnownNotCommitted、归还原SQL连接之后，用新借出的连接检查本次Attachment ID及final `(provider,bucket IS NOT DISTINCT FROM,key)`是否被任何状态Attachment、UploadSession.completedAttachmentId/位置或DownloadPackage引用。必须probe成功且全部无引用才删**本次nonce专属final**，调用捕获runtime清理，不删staging、旧final或另一次winner对象。probe错误/rollback未确认/commit Unknown一律retain。commit未知时即使一次read暂未见row也不能授权删除。

final PUT失败可能已产生partial对象，但还未进入SQL；也按未发布owned key进行独立无引用确认后尽力补偿，不能把IO异常当保证对象不存在。清理失败留下审计可解释的孤儿，不能再改业务状态或冒报原成功。未来孤儿回收不在此新增endpoint/DDL。

## 6. 遗留与验收边界

旧成功附件可能仍绑定旧Session staging（52前五阶段），本纠偏不静默迁移它们，不改冻结材料key/hash。对非终态Session若发现staging已被Attachment引用，proxy/complete/abort都拒绝并保留对象，不能补造完成或删有效文件。旧已签发外部presigned URL若仍可写旧绑定属于历史风险，不能把新key方案外推为已修复所有旧S3对象；Root须单独库存/过期/治理，不SQL造业务状态。

Root实际验收至少执行vectors55.json：真实本地二进制→completion新key/实际SHA、同size A/B迟到PUT、声明size超限/短读、HEAD伪metadata、full link集在锁前变动且headV不变、两个complete/两个version、markFinal与nonfinal版本、void后再版本、旧D final/hash、每个必要write/audit/auth故障以及COMMIT未知保留。并发必须真实屏障，不用sleep当顺序证据。

本作者只验证源码/纯向量/原字节hash，没有PG/对象I/O/HTTP实跑，尤其**没有S3验收**。Root/Gate先冻结本提案，之后才另授权三产品文件实现及实际验收。相关完整handover/package既有多阶段事务与管理员存储迁移不由本K支持提案自动认证。
