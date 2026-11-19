# #118 Source15 执行与真实准备有限G1补充提案

状态：仅Root作者提案，尚未冻结或授权代码。原14六叶G1及WIP5/6保留原件，不视为已交付。消费者以已冻H15/native ABI v2 `8c0b22d4cede59f13a27961f9760b758d4400b3318f74e050aeac11312e3dffb` 为唯一消费契约；核心15以#119 ABI91f及其正式补充为准。

## 精确文件与职责

只新增以下8个外置生产叶，全部位于 `tools/rust-r4ghi/tax15-invocation118/`，不改H3、不计Cargo输入：

1. `run-tax15-once.mjs`：固定CLI、nonce锁、完整当前执行源预导入、intent/partial/complete、有限mode编排和独立日志证据。
2. `invocation-proof.mjs`：真实native15入口/退出各一次、不变父证明调用内复用、private WeakMap能力、八个自有方法受限view、每效果fresh当前校验与状态机。
3. `retained-tax-proof.mjs`：真实Reg5/B1/retained14/原12fixture/Main13桥、准备与FI/normal不可变证据、F/C/S协议及唯一五consumer联合消费；`consumeTax15Completion`是此叶出口，不另造第九叶。
4. `tax15-once-effects.mjs`：真实actor/权限/session/throttle、exact owned controls安装/读验/撤除、全库存逐族FI、500回滚与唯一normal201的缓存/事务/语义验证。
5. `tax15-once-wire.mjs`：原HTTP约定、raw request/response/45s/CSRF/cookie、139×2 before/after、ACK先落盘、撤控后after、原reconcile的有限复制调用。
6. `tax15-once-ledger.mjs`：原assertRecorded除comparison baseline loader外保持完整；不变M98比较基线在入口实验后只作同调用复用，ownership/catalog/sequence/object循环不删减。
7. `tax15-prepare.mjs`：当前原始公共GET、Tax-only根、完整所有server targets/peer packets，组合真实body及其expectedInputHash，成功准备STOP；无Main分类/重放或Tax正常命令。
8. `tax15-facts.mjs`：读取实际snapshot和已注册原12生产者，独立验证成本/税务/批次/当前终端及完整必要写入清单。可直接复用未改纯Tax13事实/语义/库存函数；不能复用其旧current guard或将2改5。

必要非运行验证只放 `tax15-invocation118/tests/`；输入、review和runtime-binding空模板为提案/证据文件，不由运行时默认加载，不增加H3。未来若需第九生产叶或MOD原件，先另报有限增量。

## 输入、mode与权限

固定mode为 `prepare-only`、`fi-closed-set`、`fi-family`、`commit-once`、`verify-committed`、`disarm-owned`。唯一入口参数是实际input pin与exact mode review pin，不接外传ctx/reader/callback、env别名或跨调用缓存。每次调用绑定pid/boot/nonce/mode、完整code/审件/输入源及实际Reg5/B1/API/source/H3；unknown键、mode或旧14/13 current身份拒绝。

prepare-only单独exact G2，只允许必要真实auth200/session、安全日志及GET/defaultRO，初始化独立`state.taxContinuation15`并继承真实Main13桥；不把失败taxContinuation14改为成功。准备全部targets/来源/eligibility/body/CAS/库存后STOP。独立事实谓词与server不一致仍STOP报告，不裁目标或日期，不预承诺结果必为2。

FI/normal的input须绑定真实已审准备。closed-set一次exact G2列完整有序实际family descriptor/scope/body，逐族独立pending/request/control/row/ledger/rollback；只有撤控成功且验证结果已persist后才前进。首次unknown、wrong/fallback hit、未撤控、权限或语义失败立即停，不自动扩大清单或跳suffix；恢复用新exact G2。完整FI后STOP，normal201另一次exact G2。

唯一normal的ACK201在after/ledger之前先保存，防止已提交后丢缓存而重复POST。unknown/partial保原件并停止，verify-committed只读验证已发生事实，disarm-owned只处理exact已认领OID/定义/ACL/owner的controls；不凭布尔当权限，不伪造201、不自动重发。

## 保留的检查与有限复用

原native15在真实createContext入口/退出各验证一次完整不可变parent；view不泄Root、prototype/valueOf不能回Root。各HTTP、SQL控制效果前后重新核当前420（最终实测为准）source、完整最终H3、八叶和实际readers闭包、真实API PID/start/boot/exe/cwd/binary stat/SHA、DB guard、当前完整targets/body/inventory/CAS、actor真实权限、cookie/session真实期限，以及before/after139×2、ledger、object/sequence、事务/必要audit、FI命中与撤控。不能缓存这些当前事实。

可复用仅为已实核的不变M98比较基线及retained父域；不改原108/119/252、不patch全局fs/crypto，不把假reader或metadata接受当native证明。原API、Auth、控制DDL、selector、FI/正常语义复制函数逐原rawSHA/函数范围/允许差分/afterSHA登记，普通旧createApi或fault dispatcher不能偷渡旧epoch守卫。

## F、completion、sidecar及五consumer

消费函数原样采用v2三键API及五ID/固定reader选择；native readers为另片两个固定模块，284只按精确12键normalize，mixed按原period input及自有registration先验，再验自身；Role用独立完整input/registration。registration不反指input，`effectsGranted=false`，不授下游效果。

真实normal201全部reconcile/postconditions、出口守卫和closed journal后先封F：实际ownership state原字节、完整D15 ownership.jsonl原字节、ordered ledger、FI/201/before-after/xmin/entry-exit及实际代码元组。F无self/C/S。C引用F+FI/201，S最后引用C+同F，最后state metadata记C/S；同一F在sweep/C/S完全一致。孤件不当complete，不自动重POST。native只用真实attempt-bound frame/log，不造历史ctx，不比后来`owned.latest`，不臆造log xmin、borrowed latestXmin、ledger status。

## 实施与验证强前提

该提案只可先冻code-only；实际Source15 Reg5/B1/ordinary准入、最终helper/external组合和新API必须由#119先真实交付后才可任何实际mode。所有实际runtime/准备/FI/normal/注册pin当前为空。Source13 Main13与14 partial全保，原业务原子性、真实日期、预算和完整分摊口径不变。

至少落实原40类负例及新增15代际/单调用能力/提前或重复normal/closed-set裁剪/afterVerifiedFrame缺失和自环/五consumer误配/合法历史行前进等真实生产函数测试。作者syntax/unit或synthetic不是生产验收；实际准备、全FI、201、性能与完整下游消费另审，未变SDK/Admin不重跑。Root作者不得自行给本提案独审通过；需非作者建议、Root基线/冻结及线上G1后才实施。
