# cleanup-wrapper103：Root 受控 DB 收口候选

作者只读公开源码/回执，编写并做语法/静态核对；**没有执行cleanup103、没有读private/连接DB/执行SQL/HTTP，也没有生成真实ownership ledger或清理结果**。core70旧包、Root、产品和旧证据不改。本包不处理objects/停止服务；Root仍按原协议处理。

`ownership103.mjs`纯归属索引；`io103.mjs`只定义Root I/O；`cleanup103.mjs`必须显式`--allowRootExecution`后才读取本次private或dynamic import Rootdb33。输出目录必须全新，原件wx/600、private目录700。公开report只含PK/fingerprint/计数/回执引用，不写Cookie/token/password/原始行。

时区采用原baseline实际呈现：Root已查明catalog25原件默认Asia/Shanghai（+08）读回。本wrapper**没有SET timezone**，实际记录每连接current_setting('TimeZone')；可加`--baselineTimeZone=Asia/Shanghai`只做严格校验，不修改连接/原件。原core70/readback70里的UTC执行提示在本wrapper协议下不采用，冻结原件仍保留。core70对timestamp literal的精确比较不放宽；默认呈现不匹配就停止，不能把offset差异当真实数据改写或自动归一化。

## Root 命令

以下未由作者执行。edition每次必须不同（如103/103a/104），保留失败/旧原件。

```bash
# 只快照，API可运行；要求Root控制客户端没有在途写。
node tools/rust-r4def/E/cleanup-wrapper103/cleanup103.mjs \
  --allowRootExecution --mode=snapshot --edition=103 --backend=both

# 只读probe：真实ownership/unclaimed、baseline drift、实际行FK cycles。
node tools/rust-r4def/E/cleanup-wrapper103/cleanup103.mjs \
  --allowRootExecution --mode=probe-plan --edition=103a --backend=both

# 用上次private source-snapshots103/bundle103原件做可审计划；精确SHA必填。
node tools/rust-r4def/E/cleanup-wrapper103/cleanup103.mjs \
  --allowRootExecution --mode=plan --edition=104 --backend=both \
  --input=/home/wangzishi/.local/share/poms-r4def/private/cleanup-wrapper103-103a/source-snapshots103.json \
  --inputSha=上次真实原件完整SHA \
  --supplements=tmp/rust-r4def/root/实际逐PK补充证明.json --supplementsSha=实际完整SHA

# Root先实际停所有API/本批端口并还原门控，随后只接受已审完整plan bundle。
node tools/rust-r4def/E/cleanup-wrapper103/cleanup103.mjs \
  --allowRootExecution --mode=apply --edition=105 --backend=both \
  --input=/home/wangzishi/.local/share/poms-r4def/private/cleanup-wrapper103-104/bundle103.json \
  --inputSha=已审bundle的完整SHA

# 再单独双no-op，只读、无DML。
node tools/rust-r4def/E/cleanup-wrapper103/cleanup103.mjs \
  --allowRootExecution --mode=verify --edition=106 --backend=both \
  --input=/home/wangzishi/.local/share/poms-r4def/private/cleanup-wrapper103-104/bundle103.json \
  --inputSha=已审bundle完整SHA
```

plan不带input则重新实际快照；snapshot不读UI/private producer索引。probe-plan永远executionIneligible；必须另做plan并审阅。所有模式都不自动补业务行/延长session/改DDL/重跑Seeder。unclaimed或counter witness缺口时保存原始快照/索引并报告，**没有可apply计划**。未知cycle抛具体cycleDetails，原只读快照已先保全。

## 真实scope与停止证明

实际podman inspect必须同环境21的container ID/labels/base/volume/127.0.0.1:25433→15432。每库实际owner连接再核database OID与原provision、control marker/instance/base、PG15/150012/isolated。不是填写几项true当scope。main DB不DROP，不触PG17/旧namespace。

apply/verify实际发现本次private全部rust-api/native-legacy process records，核/proc当前start identity，原进程必须已退出或为Z/原PID已复用；不发送signal。实际绑定并释放31341/31342/31343/44451，校已载UI真实proxy close ACK（含Windows），实际app PG连接必须为0。RLS/policies/ACL及测试schema必须已恢复；Root的原件只作来源，是否停服由这些当前观察计算，不接收`allStopped:true`直接放行。

API仍运行的只读planning会检查开始/快照时无active app query，并在收集原件后用第二次完整快照核全图相等。它只标“observed quiet window”，不声称能识别任意对象I/O间隙；Root必须按约定暂停所有测试客户端/门控后调用。即使probe图稳定，仍不能据此执行DML。

## 逐新增PK的来源索引

读取范围仅本次new private/public、core70及本候选metadata；Windows新private路径/WSL UNC只映射到同一个poms-r4def路径，lstat/realpath/nlink和源SHA必须匹配。runtime不读旧namespace private。路线293与number scopes9从正式公开源静态冻结到本包，避免运行时遍历旧工具包。

- api32/api53中真实actual HTTP/binary receipts。api53另核原Native53 launcher确指Rust DB94/31342。主业务起锚只认2xx mutation **实际response UUID/targetId**、对应实体domain和真实created_at窗口，绝不拿request-only UUID当生产成功。
- 真实UI顶层receipt45/59中的exchange/privateRaw，逐大小/SHA核原件后解析真实method/path/body/status/窗口；Cookie只在内存做SHA→当前真实auth_session.token_hash→userId关联，不写Cookie到索引/public。不存在/不匹配原件即停，不用页面status假造HTTP。
- CommonService summary producer只接受真实outerCommit ACK、完整createTrace、实际table/id/event sequence及owned项目引用；不把普通GET返回的UUID当创建证明。
- actors33仅把其明确createdCredentialIds、已由真实Platform createUser证明的新user、授权auth-fixture原件连起来；不按username前缀认领credentials。VP借用原件仍仅core70三个精确恢复授权。
- auth_session按真实成功login的user ID与created_at落实际请求窗口关联，包括被revoked/expired的历史会话。foundation例外只接受真实77 receipt+ANSI原console哈希/13tests读回、固定poms-r1d-foundation agent、full用户及精确77时间窗。
- audit/security先核实际request_id、actor和发生窗口；request ID为NULL的UI额外要求实际target/path/method与Cookie主体。匿名/无法证明事件会unclaimed，不用“本库新增”认领。foundation事件还要固定agent/full用户(或实际full principal)/r1d request ID及窗口。
- 业务派生以真实FK闭包，排除所有纯actor列及platform_user/role/org/auth_session父边；还要相关真实命令、domain、UUID和created_at窗口。极少无created_at的明确子表，只接受同一producer的owned业务parent。role/permission mappings另用实际API主体+明确roleIds/permissionKeys逐tuple关联。
- GET只有明确K checklist内部生产器例外，封闭到selection/link/package相关domain，仍需真实FK/窗口。没有把所有GET当业务写。
- business_number_sequence按正式scope/prefix/padding、已证明owned实体真实record_no/customer_no/project_no/contract_no，对照原/当前counter fingerprint与next_value完整区间。没有数字见证或受控错误产生缺口，报告counterIssues，不凭counter scope就自动删/恢复。

每新增PK的rowFingerprint来自真实raw JSON精确数值。closure只加入有源receiptIds的行，绝不以baseline不存在作为归属。索引无法认领时，public仅报table/PK/fingerprint/created_at；真实raw行只在private。

## 精确单PK supplements

Root核证后可显式追加；不接受table/prefix/user范围或一个泛true授权。supplement数组的每一项需same namespace/instance/backend、完整PK、当前rowFingerprint、reason、verifiedByRoot、producerKind，以及实际源receipts与**一条只绑定此PK的verification原件**，都要完整SHA/bytes：

```js
[{kind:'ownership',namespace:'poms-r4def',instanceId:actualMarker,backend:'rust',
 table:actualTable,primaryKey:actualPK,rowFingerprint:actualFingerprint,
 verifiedByRoot:true,producerKind:'internal-producer',reason:actualVerifiedReason,
 verificationReceipt:{file:actualSinglePKProof,rawBytesSha256:actualSHA,bytes:actualSize},
 receipts:[{file:actualProducerProof,rawBytesSha256:actualSHA,bytes:actualSize}]}]
```

verification文件必须是单个object：`kind:'Root-verified-single-PK-ownership103'`，同namespace/instance/backend/table/primaryKey/rowFingerprint/reason，含真实verifiedAt。不能拿普通G1/Gate通过文件或同表无关原件代替。

counter缺口可用`kind:'counter-witness'`的精确单PK补充，另带真实counterBeforeFingerprint/counterAfterFingerprint，并在verification中相同绑定、引用实际before/after和recordNo/fault生产证据。它只证明counter来源；若该counter为baseline，绝不因此变成owned可删除行，仍仅core70已授权原next_value/updated_at恢复。其它baseline变化照常停止。

## apply 与双no-op

全部新PK认领、counter见证闭合后才调用冻结core70实际行planner。最终apply重验所有源pins、实际停止/端口/门控后，在单owner Tx按排序锁120表排除DML，再同Tx重新读raw rows/catalog/guards与已审seal严格相等。只执行core70的逐PK/full-row guards和nullable白名单；每步1行并核真实RETURNING。先inside-Tx assertRestored120/532/原catalog/ACL/5triggers/supplement，再COMMIT ACK。

COMMIT前失败明确ROLLBACK；COMMIT结果未知则记unknown，不重试、不声称回滚、不处理对象。成功后两次新连接的完整只读no-op，各有不同原件，实际断言全120/532和catalog/guards精确。两库各自事务，不伪称跨DB原子提交。wrapper不DROP main数据库、不DDL、不禁约束、不删seed、不自行停止服务或处理objects。

所有作者侧实际DB、来源归属结果、FK清理、借用恢复、双no-op均not-run。静态/语法核对不当真实验收。
