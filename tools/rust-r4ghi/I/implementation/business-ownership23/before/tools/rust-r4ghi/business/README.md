# R4GHI business 真实验收工具

本目录是新的 business epoch 工具，不复用或改写 `userfix` 私有状态与原件。
仅 Root 在专用 Debian WSL 执行真实 SQL/HTTP；作者仅执行不联网的纯测试。
作者交付时所有业务 HTTP 阶段均为 **prepared / 未运行**，没有业务通过、G3 或 G4 结论。
Root 已另外真实执行新 namespace preflight 与全 ROLLBACK 的 TEMP 结构 sandbox；这不是业务验收。后续业务实际运行状态以各 run 的 immutable receipts / `report` 为准。

## 当前可运行边界

- `preflight`：核新 namespace marker、原 provision OID、PG15、15432、owner/app role、M96、139 表和已授权 G1/G2。
- `baseline`：两库全部 139 表原始行、真实 xmin、PK/FK、目录 OID/ACL/角色/函数/trigger 和 sequence，以及新 namespace `objects/native` / `objects/rust` 的全部原始文件 SHA/size 和目录清单；仅私有保存原文，公开摘要与 SHA-256。
- `run --stage platform`：真实 CSRF/login、创建新 org/roles/users；随机新凭据仅 SQL 写入新受管用户的 `local_credential`。不修改 seed approver 权限或密码。
- `run --stage project-sources --planned-date YYYY-MM-DD`：新的 assessment 项目真实创建于新 org/M，随后真实 R3 technical cost、bid、两份独立合同与商业基线；生成私有 summary 输入后停在真实内部 producer 边界。
- `run --stage summary`：仅执行 Root 新 guard example `r4ghi_summary_producer08`，真实 CommonService 单事务发布材料 summary；分别核 review/mirror 源码和 binary SHA，不计 HTTP，不代表批准。
- `run --stage contract-prepare` / `contract-finish`：真实 R3 pricing、合同 readiness 与 diff 审查、实际指定审批人登录批准、激活和正式应收计划。复用 seed 的原凭据，不改变其密码、角色或 org。
- `run --stage receipt`：两合同分别确认全额 `56500.00` 现金；从真实 receipt-basis preparation 取得条款/currency ExpectedRef，服务器产生净 `50000.00` / 税 `6500.00`。
- `run --stage handover`：新 M/EO/finance 分别确认本人职责；M 兼任的真实职责逐项保留，最终固定移交事实。
- `run --stage roles-and-execution`：实际 200/null、R5 四入口、含 `0.000001` 和有理由零权重的真实角色冻结，EO 据同链 handover ledger 进入执行。两个精度负例保留原始 JSON number token。
- `run --stage roles-and-execution-fi`：替代同名普通段，在实际角色创建、冻结、EO 执行三个写入各做一次必要 audit one-hit 失败、业务回滚断言与同体无故障重试。尚未真实运行，不覆盖其余必要写家族。
- `run --stage actual-costs`：真实费用登记/确认→E 原始来源映射→F stage attribution，阶段来源使用真实 I ledger 的 `sequence_no` / `entered_at`。
- `run --stage operating`：真实 G baseline activation/current、live snapshot create/get 与 H 八入口路径。采用服务器 source refs、pre-effect input hash 和最终 factual hash；baseline 不产生 H 评价，人工 gate 只选择更严格阻断，不改变未知或硬约束。
- `run --stage lifecycle`：真实交付文件→final conditional acceptance→两名新责任人的独立条件→M96 新 purpose 本人上传/关闭→pending 阻档→归档/替代/撤销并保留原 conditional-completed。
- `report`：按冻结 32 operationId 汇总本 run 的实际完整 HTTP success + 完整 ownership receipt。只生成证据清单，official delivery increment、G3、G4 仍为 0/false。
- `plan-cleanup`：只规划有 birth 证据的新精确 PK、exact session/storage key/内容 hash 证明的对象与明确原行列白名单恢复。未知行/对象/目录、原行丢失、Native 变化、目录变化、sequence 变化、外来 FK 引用或未知 guard 均阻断。
- `apply-cleanup`：要求 Root 已审阅的精确 plan SHA、实际 stop receipt、原 PID 消失、31441 拒绝连接、app DB 连接归零；整行 bytes/SHA 与源 marker/OID 核对后单事务执行。
- `noop`：两轮独立新连接快照核对原始逻辑行、目录、ACL、trigger、role 和 sequence。恢复不声称 PostgreSQL xmin 回到旧值。
- `faults.mjs` 提供受管新 UUID / 本次 requestId 精确匹配的必要写入 FI，实际 nontransactional hit sequence 证明触发一次；失败原文和同体无故障重试分开保存。安装/移除仅自己的 exact function/trigger/sequence 并比 OID/definition/ACL；若中断遗留，Root 可 `disarm-fi` 精确解除。此基础尚无真实执行，也不代表必要写入 inventory 已完整覆盖。
- `cycle-sandbox`：仅 TEMP 结构、每 case SAVEPOINT 回滚、outer 永远 ROLLBACK；试验即时 RESTRICT 互环的两种 DML CTE、self-cycle 和外来引用。Root 已真实观察三种 owned cycle 删除成功，外来引用 23503，双库 rows/catalog/objects 不变。

每次 HTTP 都先后获取两库完整快照。新 PK 只可由真实返回 ID、exact request audit/security、真实 session cookie hash 或与上述 anchor 同真实 xmin 的新行获取 ownership，且 before/baseline 均不存在。独立事务的编号 counter 需要专门来源绑定，不能借用同事务证明。所有未知变化保留私有证据并停机；不自动重试失败业务命令。

旧 R2 role/org 创建和 role-permission 替换保留原本独立的 business/audit 事务及 NULL request_id。`platform-bindings.mjs` 只对源码固定 event/type、真实新 owned target ID、实际 operator，或真实 owned role_id + 本请求 permissionKeys + assigned_by 建立专门 birth；仍要求新 PK 在 before/baseline 不存在，不推定它们已经改成原子事务。

所有 route 从当前完整 OpenAPI 按 operationId 推导，参数必须是准确命名的 UUID map，例如 `{ completionRecordId, id }`。平台 user/role/org create 固定实际 201，保留 Swagger 旧 200 漂移，不接受 `[200,201]`。原始 cookies、CSRF、密码、请求/响应与异常文本不公开。

## Root 执行顺序

Node 固定 `/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node`。
工作目录是 `/mnt/e/projects/worktrees/poms-r3hijk-next28/poms`，API 由 Root 单独启动，工具不管理进程。
先指定一个全新的 `--epoch` 和 `--run`；以下 `E`/`R` 仅为替换标记。

```sh
NODE=/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node
DRIVER=tools/rust-r4ghi/business/driver.mjs
"$NODE" "$DRIVER" --help
"$NODE" "$DRIVER" preflight --epoch E --run R --phase preflight01
"$NODE" "$DRIVER" baseline --epoch E --run R --phase baseline01
"$NODE" "$DRIVER" run --epoch E --run R --stage platform --phase platform01 --api-process-record /home/wangzishi/.local/share/poms-r4ghi/private/rust-apiEDITION-process.json
"$NODE" "$DRIVER" run --epoch E --run R --stage project-sources --planned-date YYYY-MM-DD --phase sources01
"$NODE" "$DRIVER" run --epoch E --run R --stage summary --phase summary01
"$NODE" "$DRIVER" run --epoch E --run R --stage contract-prepare --phase prepare01
"$NODE" "$DRIVER" run --epoch E --run R --stage contract-finish --phase finish01
"$NODE" "$DRIVER" run --epoch E --run R --stage receipt --phase receipt01
"$NODE" "$DRIVER" run --epoch E --run R --stage handover --phase handover01
"$NODE" "$DRIVER" run --epoch E --run R --stage roles-and-execution --phase execution01
"$NODE" "$DRIVER" run --epoch E --run R --stage actual-costs --phase costs01
"$NODE" "$DRIVER" run --epoch E --run R --stage operating --phase operating01
"$NODE" "$DRIVER" run --epoch E --run R --stage lifecycle --phase lifecycle01
"$NODE" "$DRIVER" report --epoch E --run R --phase report01
```

默认原 provision receipt 为 `tmp/rust-r4ghi/root/environment01/provision01.json`。若 Root 的真实原始 receipt 位于另一处，使用 `--provision-receipt` 显式传入；内容必须绑定同 marker/container/volume 与两库原 OID。baseline 应在 Root 完成 API 初始化后、首个业务请求前捕获。

原文在 `/home/wangzishi/.local/share/poms-r4ghi/private/business/E/R`；公开摘要在 `tmp/rust-r4ghi/business/E/R`。不删除失败、partial 或 private 证据。source pins 改变会阻断续跑，须 Root 审查后选择新 input epoch，不悄悄采用新产品字节。

## 隔离 fixture 维护 cleanup

真实迁移含 immutable DELETE guards 和 RESTRICT 互环；普通逐表 DELETE 不能清完整业务 fixture。
Root 真实 sandbox 结果是 `tmp/rust-r4ghi/business/g2-preflight07/sandbox01/000002-cycle01-sandbox-result.json.receipt.json`，对应 private 原文 SHA-256 为 `3882c12e50b3293cb6d0fb6576cb9606e9144a45ca44bd45a2a6e43ee54ebcec`。
正式业务 run 的 `plan-cleanup` 可显式提供该 `--cycle-sandbox-receipt` private 原文和 `--cycle-sandbox-sha`，生成单独供 Root 审阅的 maintenance plan；未提供实际同 marker 证明时，环与 guards 保持 blocked。

维护方案仍须停本任务 API、31441 实际拒连和 app 连接 0；锁全部 poms 表并前验全 exact owned PK/原始整行 hash、目录 OID/定义/ACL、原外来引用。只允许原 capture 中的四类必要命名 guard（`jghi_immutable`、`jghi_ownership_origin_guard`、`jghi_frozen_participant`、`jghi_condition_fact_guard`）按原具体 OID/定义/tgenabled O/A 在同事务暂 disable；未知即停。全受管行通过一条参数化 DML CTE 精确删除并核返回 PK 集合，系统 FK 始终 enabled，不改事实字段、不 drop/recreate FK、不用 replica/ALL/CASCADE。guards 在同事务原样恢复，随后原 baseline rows/catalog/sequences 全验通过才 COMMIT。

这是维护专用隔离 fixture 的准备方案，尚未在业务表真实 apply；不改变产品 immutable 规则，不认证 WORM。Root 必须先审实际最终 plan raw SHA 再执行。原 baseline、deleted-row bytes、请求响应、维护前对象原文永久私有保留。

## 仍未实现、未运行

- assessment 新项目及真实 technical cost/bid/contract/baseline source driver：已准备，未运行。
- CommonService seam、readiness→approval→activation→formal receivables、receipt 净税 basis、本人 handover duties、R5 四项与 EO execution：已准备，未运行。
- E 单费用/F stage→G4 live 基线快照/H8→I final acceptance/OwnCondition/归档：已准备，未运行。
- G 真实 correction/restatement 三入口、正常 period close 两入口：未实现、未运行；正常期末选择 live current 仍待用户裁决。
- E labor/payment/invoice、F tax/shared-allocation 的完整生产、纠正与跨项目重述，11 H 规则全部边界、MAX 金额/精度/溢出组合：未准备完整自动 driver、未运行。
- necessary-write FI 基础：已准备，未运行；完整必要写入 inventory / 真实锁竞争 / 真实 browser / 完整 operation matrix：未实现、未运行。
- 对象 cleanup 先提交已核验 DB 清理，再删除已私有保留内容的 exact 对象与新空目录；DB 与文件系统不声称原子。任一步失败都是 partial，不能报道双 noop 已通过。
- 正常 period close 选择 live current 仍待用户裁决；相关场景不作为接受政策。
- 全 R5、WORM、真实 lost COMMIT ACK、部署、切流：不在本工具授权范围。

离线验证命令：`node --test tools/rust-r4ghi/business/foundation.test.mjs`。纯测试使用合成单元输入，只验证工具规则，不是产品验收结果。

## 17 source-bound 必要写逐项失败 sweep（候选，未运行）

Root 可选择 `roles-and-execution-sweep` 与 `lifecycle-sweep`，分别替代尚未执行的普通阶段。16 最小 EO 权限必须先晋升。已普通成功的阶段不能追认为 FI；工具要求相应 immutable sweep receipt，状态 frozen/closed 本身不构成覆盖。原 `roles-and-execution-fi` 仍只是历史 audit-only，不能外推。

`required-write-inventory.mjs` 对当前精确源码绑定 10 operationId、55 个选中必要写家族；两项真实条件分别关闭时实际要 61 次 one-hit 失败、11 次最终成功（此为准备计划，非已运行计数）。Role create 含真实最后 participant，freeze 包含最后 summary field；阶段为 snapshot/field/ledger/project；验收、完工、本人关闭、归档按真实分支分别列出业务表、冻结证据 owner、双 CAS、必要 audit 与实际 pending-auth coflush。条件完工分别命中完成证据和最后一个真实条件证据；不通过猜表追加虚假覆盖。source hashes 任一变化即停，E/F/G/H 未列操作仍未覆盖。

每个命令固定实际同一 body bytes/hash 和 CAS，逐个安装本 run 精确 owned actor/project/source 分支 primary BEFORE 故障与 exact request success audit 的 deferred COMMIT 兜底。primary 非实际 hit1 或兜底命中都不能计覆盖；兜底使 primary 未命中仍回滚并停，不进入最终成功。最后一项 pending-auth 的 selector 只有本 TX 已有 exact request audit 才可命中，排除事务前独立 raw last_seen touch。工具只读取绑定实际 API 进程的两个非秘密 AUTH 设置，等真实时间到期，不 SQL 回填 session；同一实际原 cookie/session 绑定，401/到期必须 Root 真重登。每 5 秒短等、30 秒输出等待状态。最终真实成功也等待实际 pending-auth，以新行/修改行与 exact audit 的真实 xmin 核所有选中必要写均来自同一外层事务。

每次失败观察双库 139 表 PK/完整 bytes/SHA/真实 xmin、catalog/OID/ACL/functions/triggers/sequences、对象 bytes/keys/directories完全回滚；只单列允许精确当前 actor/session 的源代码原始 last_seen touch，其它 audit/security/platform 均不豁免。控制对象按本次独占名称与实际 OID/定义/owner/ACL 核验后移除，`disarm-fi` 已支持这对控制；中断安装且身份不可证时停给 Root 核对，不删除未知对象。私有原件保留，最终 actual success 在任何事后断言前即记录，断言失败不能重放已提交命令。

作者只执行 node syntax 和纯测试；未实际 SQL 安装触发器、未 HTTP、未执行 sweep、未认证完整必要写/竞态/G3/G4。真实 run 原件、hit sequence 和最终事务行是唯一实际覆盖证据。

## 19 G/H六写逐项必要FI（候选，未运行）

以Root已应用17a为base，不覆盖18原件。`operating-sweep`替代尚未成功的operating阶段，实际baseline activation/snapshot/signal review/gate review四写逐命令先全部源清单primary hit1+fallback0、同body/CAS失败全回滚，再唯一最终成功。每次安装从本次真实before快照重算写分支并核与private observation一致，不能只信preflight JSON。普通成功fact无对应immutable sweep receipt不得追认。Role/I已通过的原件保持，不重新POST。

`gh-write-facts`只选择实际SQL写分支：真实当前head有无、现存决策与其冻结input refs是否相同、实际confirmed未消费cost、真实old binding/review/summary/terminal PK。没有相应旧行或真正未改decision就不猜一次FI。每个真实old binding/review单独命中；G/H四summary及字段使用实际expectedRows=4，final proof按INSERT/UPDATE区分，不能把同table的旧summary UPDATE混成新INSERT。实际source member通过context/project/真实baseline FK；H reason通过实际evidence FK；receipt、G root audit/H policy audit/auth均纳入同TX证明。所用SQL不生产业务fixture，所有金额/hash/分类仍由真实生产者计算。

六个write operationId的清单包含普通period close与live restatement，但period runtime和period-end snapshot仍硬阻断，任何approved boolean都无效，必须等真实第7业务裁决和Root后续审阅。当前测试夹具的first baseline6/snapshot20/signal review13/gate review9家族是prepared条件计数，实际只认新private hit receipts；不是已跑48次。完整含allocation/labor/stage/tax correction的restatement须另接其真实producer inventory，本最小expense fixture主动拒绝非空correction而不外推旧E/F验收。

`operating-restatement-sweep`仅在Root另审并晋升18后动态加载其真实晚到费用driver；19不偷偷复制18到Root。19适配18首次真正fact-producing POST，真实negative/idempotent重试保留原路径。既有分类可能因首capture消费使版本与frozen input refs不同而真正产生替代：从实际before识别，再取server currentDecisionRef，重新GET prep(correctionSourceRefs=真实refs)拿hash；完整terminal target集合改变就停，绝不删target。最终body在进入FI前固定，18保存的是这个实际body。optional-18-delta是单独精确18base补充，含同一prep修正和business_date alias，不属于19当前base替换列表。

费用readiness复核：真实F.stage已把registered推进confirmed；G qualify_cost与H hard_missing没有要求F.tax。没有税务producer时，taxed expense的pending tax保留unknown/null，不能猜deductible/non-deductible或0。costs保留Root真实PG15 AS business_date修正，增加实际confirmed/金额/currency/stage/evidence FK/schema检查；最终G snapshot必须保留server给出的unknown。这里没有擅造F税务结论，不声称完整F.tax流程已验收。

Root唯一执行SQL/HTTP/FI。作者只跑离线syntax/纯测试，所有G/H实际FI、period2和完整跨项目更正/竞态均未运行，G3/G4 false。
