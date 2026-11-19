# #118 Source15执行器与真实准备实施基线

- Gate Status: `Pass`，仅有限代码实施；实际G2未授权。
- Parent: #114；技术依赖 #119；业务仍属 #110 / #111。
- Owner / Author: Root；非作者G1复核：Final。
- Type: process/refactor-only，高风险效果与证据边界；新增业务操作0。
- Date: 2026-11-11（Asia/Tokyo）。

## 1. 正式输入与精确范围

有效Root提案是 `tax15-invocation118-G1-proposal01/manifest-G1-proposal01.json`，SHA `9c84a759f79fb6e7db73eec5eb5019005d8e08cfeed16a0f4295e0e06c6bc0c7`，PLAN为`b8388d5a…`；非作者建议`340c0a69edb3285cb7153f53f41a083a9e0413e7117c4b867abfc2b9e3e13b23`。原14基线/WIP5/6保真实NOTREADY标签，不能把改名字当新15实现。

只ADD八个外置生产叶，路径固定 `tools/rust-r4ghi/tax15-invocation118/`：run-tax15-once、invocation-proof、retained-tax-proof、tax15-once-effects、tax15-once-wire、tax15-once-ledger、tax15-prepare、tax15-facts（均`.mjs`）。前六为完整执行器，后两为真实准备/独立事实；H3贡献0，不是Cargo输入，不改旧108/119/252/原件。验证仅在同外置目录的tests，不另造第九生产叶。

核心15 ABI以#119的91f及其正式有限补充为准；共同消费唯一ABI是已冻v2 `8c0b22d4cede59f13a27961f9760b758d4400b3318f74e050aeac11312e3dffb`，H9冻结`602f3959…`。native两个readers由H另片实现；Root本片提供retained-tax-proof内的唯一三参consume出口，四caller和Role/Labor实际操作不归本许可。

## 2. 必须落实的独立复核澄清

准备事实必须独立覆盖当前 **implicit＋explicit roots、完整impact和所有适用终端的union**。旧Tax13按当前Tax费用日期筛终端的函数只能作适用子谓词，不能当整个target oracle；可复用原机械factual-ref投影与未改纯断言，但不复制period/calendar/budget oracle。server与独立来源图不合仍STOP报告，不预承诺结果必为2，不裁范围或吞missing-evidence。

生产入口的parent14/Main13/原12fixture读取不得依赖未来Tax completion或sidecar；它们只在completed consumer路径验证，防止生产自己以未来产物为前置。新`state.taxContinuation15`与失败taxContinuation14分开，Main13仍用真实Source13 HTTP201/ledger与retainedThrough14桥，永不再次POST。

受限view恰为原八个自有方法persist/next/artifact/public/client/db/instant/own；入口/出口原native15各一次。必须以真实生产函数证明private WeakMap、pid/boot/nonce/mode、关闭后拒用、prototype/valueOf与可写别名不泄Root；不能凭旧WIP的注释或测试设计计数当已实现。

## 3. 命令、状态与效果

固定六mode：prepare-only、fi-closed-set、fi-family、commit-once、verify-committed、disarm-owned。入口只收实际input及exact mode review pin；不接受外部ctx、reader/callback、env别名或跨调用cap。代码、审件、输入、actual Reg5/B1/API/source/H3/external闭包、actor/session和mode全绑定。

prepare-only单独exact G2，仅必要真实auth200/安全与session写、GET/defaultRO；读取Tax-only真实根，完整所有server/peer准备包和独立来源图后封body、eligibility、CAS及必要库存，成功STOP。无Main分类命令、无Tax正常POST，不把341失败包补成成功。

完整closed-set由Root一次exact G2固定有序实际全族/descriptor/body/scope。每族独立pending、request、control、row、ledger及rollback；验证并撤控且persist后才推进。首次unknown/wrong hit/fallback/撤控或语义失败停，不增加/跳suffix；恢复另exact G2。全FI完成STOP，normal201另exact G2。ACK201先落盘，再after/ledger/语义；unknown保原件，不盲重POST。

每HTTP/控制DDL效果前后fresh核当前完整source/H3/本八叶及native reader闭包、实际API PID/start/boot/exe/cwd/binary SHA/stat、DB、全部current targets/body/inventory/CAS、真实权限与cookie/session期限、139×2 before/after、ownership/ledger/meta/sequence/object、事务/必要audit、命中与撤控。只复用入口已实证不可变parent/M98比较基线，原assertRecorded除baseline loader外循环不删。复制函数登记原rawSHA、完整函数span、允许diff和afterSHA；不偷用旧createApi或fault dispatcher回旧epoch。

## 4. F、消费与历史归属

执行与产物严格遵守v2：真实normal201的reconcile/postconditions/exit/closed journal完成后封F（ownership state全raw、完整ownership.jsonl、ordered ledger、FI/201、snapshot/xmin与actual current tuple）。F无self/C/S，随后C(F+FI/201)、S(C+同F)，最后state metadata登记。孤件不为complete，恢复不自动POST。

consume是 `consumeTax15Completion(ctx,{consumerId,consumerInput,registration})`，五ID固定h15-287/shared15-284/period15-270/mixed15-271/role15-setup；Role自己input/reg、284精确12转换、mixed原period verificationInput和自有登记，registration不反指input且effectsGranted=false。native验证实际F/log/原件，不构造历史ctx，不比较后续latest，不发明log xmin、borrowed latestXmin或ledger status。

## 5. 一致性、验证与未授权边界

原业务正确性、完整来源/批次、历史真实日期、金额、授权责任链与所有必要写入原子性不变。无公共route/DTO/OpenAPI/DDL变化；不重放migration/restore或reset M97/M98谱系。原13partial、14失败及所有首失败保真实标签。

必须落实原40类及新15相关的真实生产函数负例，覆盖完整根union、mode/闭集裁剪、提前/重复normal、current每效果漂移、native各1、Root/view逃逸、F/C/S缺失/自环/错配、五consumer/历史合法前进及真实录形。synthetic/unit/syntax不当生产验收。未改SDK/Admin不重跑无关全套；实际准备、全FI/201/性能和完整下游消费另审。

code-only不要求先有actual Reg5；所有实际新15/runtime/prep/FI/201/注册目前为空。实际mode必须等#119真实交付及本片独立代码审、Root执行源组合和单独exact G2。只有Root冻结JSON及线上G1读回后允许Root在上述八目标及tests内实现；不授真实ctx/API/DB/DDL/进程动作、Source15准入、业务G3/G4、main合并或部署。#57与完整业务R5 #116保持开放，新认证0。
