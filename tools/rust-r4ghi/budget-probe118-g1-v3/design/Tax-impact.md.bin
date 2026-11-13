本稿为 Root 要求的停机恢复影响 DESIGN ONLY，依据公开 R/I 代码及 Root 的 `budget118-runtime-reentry-design01.md`、`budget118-source-tool-design01.md`。WSL 停机是 Root 提供的事实；本线没有观察 WSL、P/current、进程、环境或数据库。Tax manifest04 六叶及旧 Origin/K 不改，本稿不授恢复实施、服务启动、source/FS 或 probe G2。

结论是分开三个实际状态：出生状态 **6c** 固定旧 Origin7/K847；Root 恢复只将 canonical 的顶层 apiProcess 换成新实际 process，得到 **X**；后续 Native FS 以 X 作 CAS，仅换 lease/追加 history，得到 **Y**。Tax input.expectedEntryState 必须是实际 Y 的不可变整状态副本，p.apiProcess 必须是新 process Full3。不能把 X/Y 写回 Origin7.state，不能让 K 的旧 current15/API/boot/lease 与新执行 tuple 深等。

链序严格采用 Root 草案：新 holder → 原 PG → 以最后成功 prepare 关闭基线为准的完整 RO 守恒 → API 不存在时 source9+2/W4/Origin7/source complete → 新 API/new229/新 nonce env+record → 启动后完整 RO 守恒 → apiProcess 单键 CAS 6c→X → 实际 recoveryReceipt → 纯数据新版 S4 → Native FS X→Y → Tax metadata → 另行 exact ctx/Auth/probe G2。source complete 不能指未来 recoveryReceipt/S4；recoveryReceipt 只能指既有 source complete、启动/守恒/新 API/X 和读回；S4 才引用 W4/Origin7/recoveryReceipt。旧原件和失败记录保留。

1. Tax 六叶的最小影响。

- `retained-tax-proof.mjs`：建议作为本线唯一必要 production MOD。Root 冻结恢复修订 G1 后，`F118.budgetG1` 改指该实际存在的修订 Full3；修订显式引用原68212联合G1和Tax04资格。原六 mode 的646447及baseline a5520b不变。current17 仍取 Native 已核新 current；retained Source15/Main/preparation仍核原出生事实。原 `assertRuntimeFacts118`/retained dispatch 不得删除任何强谓词。
- `invocation-proof.mjs`：预计原 Tax04 字节携带。`assertInput118` 从 F118 消费新 G1，预算 codeReview 同 pin；`currentTaxFiles118` 已要求 state.apiProcess=p.apiProcess（655–658），`apiIdentity`（559–595）已从当前 record 核 PID/startTime/exe/cwd/socket/binaries，entry/ref/full-close 均走 Native 私有强通道。`assertBudgetPreparation118`（1586起）只让原 record 与 Origin6c 整对象相等，并核 K 的原 runtimeAdmission/prepared/full/body，不强迫旧 K 等于新 API。新 boot、pid 及新消费身份只进入新 d/journal/frame，不补旧槽、不 ensureRecord 覆盖。
- `run-tax15-once.mjs`：预计原04字节携带。已在 budget outer 的 lock/intent 前把 CLI 两 Pin2 强读为同一真实 Full3。恢复后只消费新的已审 input/Root9；sample17/一次 close/report18/failure7 保持，不能在 run 内启动、接管或更换 API。
- `tax15-once-wire.mjs`：预计原04字节携带。`bindActualApi`（46–76）已经要求实际 state.apiProcess 与原 record 字节完全一致，并拒 self-adopt；新私有 process 路径由 p/current 固定，不使用旧 record 的默认别名。Auth3仍一次、once先于cookie reset；不重试、换会话或恢复前缀。
- `tax15-once-effects.mjs`：预计原04字节携带。`observeBudgetActor118`（585–620）从真实当前 process 的配置证据、真实账户/full37/owned session/SQL-clock验证 I900/A28800/T60；pre-SQL mono/ceil及close覆盖不变。旧 actualAuthConfigurations 保留；新进程不能把旧观察换名为本次证据，既有闭合失败应停止。
- `tax15-once-ledger.mjs`：预计原04字节携带。完整 catalog/sequences/objects/raw/xmin/owned/borrowed 归因及固定 Auth3 适配不依赖旧 API PID；不得借重启豁免任何差异。`tax15-prepare.mjs`/`tax15-facts.mjs` 继续原字节，prepare不重发、K不新造。

上述“预计携带”以 Native 恢复链的强准入和既有闭形不放宽为条件。若联审发现确需本线额外代码变化，必须在恢复 G1 点名该叶、准确 before、必要谓词及回归；不能隐形扩大这次 Tax04。

2. Tax metadata 是另一个明确必要的既有叶，归控制面 owner。

`runtime-recovery121/Tax121-current-metadata-data-candidate01/prepare-tax121-current-metadata.mjs` 现有 `loadModelV4118` 698–707 硬要求 current API=predecessor API、startup.helperPins/Composition=原 M06，以及 conservation.baseline=plan.base.preparedBaseline。`validateBudgetPlan118` 也只准 helperPins 改变、current 其余等于旧 P3，CAS写死6c/1da；`validateBudgetPublished118` 用 Origin6c 作为只换lease/history的 before。这些全部会正确拒绝新恢复事实，不能靠替换一个 PID 或复用旧api.input绕过。

恢复修订需具名分支，从 Native 已核 publication/plan/S4 及同一 actual recoveryReceipt 派生模型：birthState=Origin6c；currentCAS=X；entryState=Y；current API/holder/PG/normalEnv 及 startup source/helper witness 取新链。Root 已选择“先source后启动API”，因此新 API startup.helperPins 必须绑定 source complete 的实际新229，startup.composition 使用本次具名已交付源资格，不能继续硬配 M06。旧启动/M06/P3仍作为历史来源完整保留。

Tax metadata options 外层仍闭6 `nativePublication/compositionComplete/codeReadyCarrier/nonce/phase/outputDirectory`，nativePublication 仍闭2 `complete/expectedEntryState`；从其既有 complete 文件读取新版强绑定恢复出口，不加 caller 的 recovery/API override/reader/skip/mode 参数。新 `B118.G1`、carrier.technicalG1、input.technicalG1 与 Root 恢复修订实际 Full3 唯一一致。Tax34、Root9、runtimeBindings外6/current17、frame17/ref11和六方法port预计不增槽；恢复 receipt 在 Native plan/S4/publication 链内强绑定，引用路径和新版闭形由 Root/Control 同批冻结，Tax不另造第二receipt别名。

3. 恢复 receipt 的验法和最新 DB 基线。

首先从 Origin7 的实际 K847、其 exitGuard/closedJournal、成功 prepared15 唯一定位最终完整数据观察。公开 `tax15-prepare.mjs` 183–213 在所有准备 GET 后捕获 fresh 全库快照，并把其 pin 放在最终 prepared JSON 的 `before`。应核 `K.prepared15`、`closedJournal.result`、record.taxPreparation.artifact 三者相同；closed=prepare-only/6458/closed-verified、exitGuard互引、所有原 HTTP/ledger 与 source 闭包完整；再强读该 prepared.before 及两库139表、完整行原字节/xmin/PK/cells、catalog/DDL/OID/role/sequence/objects。字段名 `before` 不能被误解为早期 preparedBaseline。

这只是公开源码给出的定位规则，不宣称已读出该实际 baseline。Root 的真实 locator 必须证明该 snapshot 之后到成功关闭没有未闭合的 DB/HTTP 效果；原件缺 pin、链不唯一或有未闭合效果就停，不能退回 plan.base.preparedBaseline、某次更早 before 或猜行数。Native plan.base.preparedBaseline 可以保持历史 build/prepare 来源，但不能充当这次恢复的当前守恒判据。

Root receipt 必须强绑定执行工具/代码资格/准确 Root+peer 输入、新 boot/holder/Windows 父进程、同原完整CID/image/volume/PGDATA/两OID、两份启动前完整RO观察、实际 source9+2 complete/W4、新 API complete/process/env、两份启动后完整RO观察、6c/1da before、单键 X after及实际独立读回。启动前/后观察均和上述唯一最后关闭基线比较，不能以四张权限表或布尔 conserved=true代替完整守恒；不同库不声称同一原子时点。恢复的只读观察 epoch/kind 由新工具 G1 明定，metadata权限派生必须消费其真实最新完整观察，不能把新输出改标成旧 runtime-recovery121-A。完整37权限从启动后实际两份观察按原四表规则派生，并与 Y 的原manager身份对应。

Tax metadata 只强读既有 receipt/所有Full3及互引，不运行恢复工具、Native/context或 SQLHTTP。它要验证 receipt 的 sourceComplete/new229 与 plan当前图一致，新 API record及startup input/code与新 source/compile/helper、binary字节/实测stat、normalEnv、lifetimeOwner、PGStart/前后守恒一一对应，X只改变apiProcess、ownership仍完整1da，Y相对X只改lease/history。旧6c/K847/prepared/full/carrier/旧API记录及其input/startedAt/boot均保持原出生身份。

4. 环境路径的具体兼容条件。

原 `business/auth-config-binding.mjs` 97–98 要求 env 路径为当前 process record 去掉 `-process.json` 后加 `.env`，私有路径以 `private/rust-api` 开头且 basename 匹配 `rust-api数字.env`。为保这个图内未列叶原字节，新 Root 工具可固定采用 `private/rust-api-reentry/<new-nonce>/rust-api<editionDigits>-process.json` 与同目录 `rust-api<editionDigits>.env`；两者新 nonce/wx/0600，绝不覆盖旧 rust-api121 文件。这是路径形式要求，没有创建 nonce 或文件。

新启动器须真实绑定 POMS_ENV_FILE 到该文件并保持原 deriveEnv/secret规则及 I900/A28800/T60；真实 uid、单链接、mtime/ctime/birthtime早于已记录启动、PID/startTime/boot/exe/cwd/env/socket由恢复工具和其实际读回证明，后续 Native和actor guard仍再验。不得为新目录放宽 auth-config helper；若 Root 选不兼容路径，需明确新增该第12叶的 G1，不能暗改。PID或inode数字可以重用，身份必须是新 boot/实际启动/文件/输入的完整 tuple，不能只要求数字不同或重贴旧观察。

5. 冻结和验收边界。

恢复 G1 最少应明确：新修订G1如何进入 F118/B118/carrier/input；Origin6c与X/Y分层及S4/recoveryReceipt唯一字段和闭形；最新关闭 baseline locator；source→receipt→S4无环；新API/new229/newnonce env路径；前后完整RO守恒；唯一apiProcess CAS。正式实施最小 Tax 面为1个现有图内叶加1个既有图外 metadata叶，算法和已冻结运行闭形保持；Root恢复操作工具/source工具均在284之外单独资格，Native/Core/publisher及另一数据工厂由控制面点名。

新联审回归须拒：旧boot/holder/API/env伪作当前、较早preparedBaseline、旧M06/newAPI混配、错sourceComplete/new229、缺post-API守恒、X改其它键/ownership截断、Origin或K回写、X误作Tax entry Y、恢复receipt指未来S4、metadata导出reader，以及普通Native门因恢复变成可用。实际新ctx/Auth/sample仍为后续exact G2；原32例和code资格不证明重启/守恒已执行，不授业务/FI/normal，wholeFI预算继续UNKNOWN。
