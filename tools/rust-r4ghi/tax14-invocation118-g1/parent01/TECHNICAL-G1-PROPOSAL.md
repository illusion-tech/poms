# Tax14 单次调用证明复用：技术 G1 提案

状态：**仅提案，G1 未冻结、未授权实施或执行**。Root 负责 Issue/G1、实际输入和执行；I 仅为本提案作者。类型为外置验收工具的 process-only/refactor-only，高风险效果边界需独立审。Issue/子片编号由 Root 指定。本提案不修改 H2 218、Reg4、B1、epoch、Rust、DTO、公开路由、业务规则、原父状态或任何旧封件。

## 可行性结论与必要范围

可以仅用外置 successor 完成，但**只加受限 ctx view 无法达成**。原 A258 `preparedTax14`、安装及拆控函数会重新进入 `verifyTax14Sources`；原 HTTP 的 `assertRecorded` 经 `loadComparisonSnapshot108` 再进历史108。不能直接调用这些重入口然后声称只校验一次。

建议冻结六个新外置叶，均不加入 business H2：

| 文件 | 有限职责及原实现边界 |
| --- | --- |
| `run-tax14-once.mjs` | builtin-only bootstrap，先核 executionSources/codeReview/exactInputReview；锁、模式、nonce、正常/未知结果不可重放及 STOP。 |
| `invocation-proof.mjs` | 私有 WeakMap 能力、入口一次完整原252、逐效果当前检查、退出一次完整原252；无跨调用缓存。 |
| `retained-tax-proof.mjs` | 有限复制 A258 retained Tax 的纯验证段，直接消费已证明的 R4/fixture entry；保持全部原12七个生产checkpoint、失败409/ledger、等价快照和真实Main13证明。 |
| `tax14-once-effects.mjs` | 有限复制 A258 的 FI/install/disarm/commit流程，只把重入口替换为具名 capability 检查；原 SQL、时序、全部目标、库存、命中与事务断言不删。 |
| `tax14-once-wire.mjs` | 有限复制 canonical request/raw originals/cookie/CSRF/45s transport/真实before-after/安装与拆控次序；不调用旧 faults dispatcher或旧 createApi。 |
| `tax14-once-ledger.mjs` | 仅迁出原 `assertRecorded` 的完整逻辑，显式接受入口已证明的 comparison-baseline proof；不重复108。**原 `reconcileAttempt` 直接复用**，它用原M97 baseline且不调用108，无需复制整个ledger。 |

每一复制函数要登记原叶 rawSHA、函数/行段、逐个有意差分及最终外置rawSHA；不采用运行时改字符串/import hook、全局 fs/crypto patch、假 reader或替换旧模块导出。复制后的程序是新外置执行者，不能冒称旧 A258 driver已执行。

## 原能力签发与书挡

1. fresh Root invocation 的 exact review固定 mode、entry state pin、runtimeBindings、Reg4/B1/API、actual H2/source420、原341 preparation/body/full targets/inventory、执行闭包和具体 FI族或正常命令批准。所有实际pin为空时拒绝。
2. bootstrap在任何 Root动态import前核真实 regular/noalias/nlink1、完整218及全部外置 executionSources。采纳287/284的双 review/executionSources模式，**不复制它们反复做重 runtime校验的调度**。
3. 在真实 private run取得nonce lock；不允许外部传入现成ctx。外置入口亲自调用原 `createContext`，其 schema4分支恰执行一次完整原 `verifyCodePlan252`。不另调用 `currentCodeRegistry252/verifyTax14Sources/effectiveHelperPins252`叠加同套重校验。Source14 state须已存在，绝不bootstrap新epoch。
4. 该调用成功后，由原 `loadApprovedTax14Bindings` 建立其真实 WeakMap 绑定；纯新证明核所有 c字段、Reg4/B1/API/helper/source精确pins与值、全parent不可变身份。`retained-tax-proof`完整保留 A258 的Tax特定验证：originalProducer12与retained13分开、全58资源与出生、七checkpoint/public HTTP原字节、失败Main409与完整ledger、两次旧快照等价、Main13 before/after/public201/ledger。Main13直接调用原导出的 `verifyRetainedMain252`，不再经带完整252的 `readRetainedCommand252`；其它非导出纯段有限复制，不能换成布尔“已验证”。
5. 能力只能由步骤3–4的内部顺序签发。私有 WeakMap keyed-by不透明冻结对象，值含真实root/view引用、pid+boot+nonce、原输入/codeReview/exactReview pins、原批准manifest对象、Reg4/B1/source/helper/API/binary facts、已验证comparison baseline、全部prepared范围、允许mode/selected family及状态机。禁止传入ctx/registry/proof自行mint；不导出raw root，不接受序列化token、`verified:true`、伪造原型或另一个调用的对象。
6. 成功、失败及异常都走 close：先完成必要撤控/实际after/ledger并保存真实结果或unknown，再用**原 `assertCodeEpochContext252(...,{liveProcess:true,sourceFiles:true})` 完整书挡一次**，并再执行步骤4的Tax特定完整纯闭包（不重入252），核 retained原件/父状态保持和所有外置源。最后撤销能力。正常合计两次完整252（入口1、退出1），不是零次；失败书挡不能覆盖已保存的201，也不能签success。若无法完成书挡，保留 `stopped/unknown`、active catalog与原证据，Root独立复核后处理，不自动改标签。

原完整252也验证全部历史119/schema108/旧binary/归属/构建/保留集合；步骤4只补Tax特定闭包，不重做这些公共parent。提案要由非作者逐断言证明等价覆盖，不能先认定“同样安全”。

## 能力生命周期与受限 view

只开放 `fi-family`、`commit-once`、`verify-committed`，以及单独精确批准的 `disarm-owned`。本 successor **没有 prepare/Main/批量自动FI入口**。实际341 prepare仍按原批完成；准备若未成功，本方案不能自行补造或重发。

ctx保持真实14 epoch/migrations98/namespace/sourcePins和全部parent identity。view仅允许原8个自有方法的显式委托（persist/next/artifact/public/client/db/instant/own）；继承方法、descriptor/prototype/valueOf不能泄漏raw root。原 fixture/Tax13/Main13、Reg4/B1、baseline/schema108/sourcePins/producer history等深只读。真实actors/cookies、owned/borrowed/objects及Tax14执行记录只能经审定ledger/效果路径更新；新增外置调用收据放具名 consumerChecks 记录，不丢原状态/失败标签。

能力还需内部阶段戳，不是拿到一次token就可任意调用：`entry → authenticated → beforeCaptured → controlInstalled → requestPending → responseRecorded → controlsRemoved → afterCaptured → reconciled → closed`。normal分支无control阶段。每个stage绑定同一requestId/bodySHA/actor/session/scope/inventory/selected descriptor及capture pins；阶段不能跳、倒退、重复或给并行调用共享。cleanup权限可在结果unknown时仅撤除已证明的本调用controls，不能获得再次POST权；current identity/catalog检查失败时不强行drop，保全状态交Root具名恢复。

## 每次效果前后必须重新检查

这些检查不能缓存成入口快照，适用于每次auth/current-session HTTP、Tax HTTP及每个install/drop DDL事务前后：

- 原source420 **完整逐叶当前字节与精确集合**、H2 218完整当前图、全部外置executionSources及review/input原字节；不只比digest标签或使用stat cache。Root当前父域的身份/projection也与入口原件纯比较，不能因ctx view保护而省略。每次真实API PID/startTime/boot/exe/cwd、typed binary dev/ino/nlink和当前SHA均核，保原binary路径；Common若在该调用使用，同样核其真实14绑定。
- 原真实ctx.db/guard在每个连接核host/role/DB/OID/marker/namespace/M98及隔离范围；capture仍用原真实 `snapshot.capture`。全139×2 raw/xmin/meta/seq/objects的实际 before/after不得用入口观察替代。canonical public bytes、ACK完整性、before capture及实际ownership检查顺序保持。
- 每次实际before重新派生完整Tax source/targets/facts/inventory，精确等于原341实际保存包；full targets不能因成本、期间或来源变化裁剪。旧A258 live-only限制保持：发现period target则STOP，不能借后续270/271规则运行本适配器。
- 源版本/CAS、完整prepared body与query/receipt refs、actor责任链及权限、cookie/CSRF、session真实状态/owner/throttle/idle/absolute deadline。pending-auth用真实只读session时间，不backdate、不伪401；due之后不插入会刷新last_seen的current-session GET。若过期，在未发领域请求且无pending/controls时也仅按该mode明确批准的登录策略处理；不能自动重试领域命令。
- 每个control的实际名称/owned prefix/OID/函数定义/ACL/owner/trigger/sequence identity完整核。仅 isolated r4ghi_control，精确source-derived selector，primary1/fallback0。不得跳过撤控前身份/命中核对，亦不得用任意客户端SQL/descriptor扩范围。
- 每个实际 after执行原完整rollback、old-facts/current、财务/税/分摊、所有必要写同TX与audit/auth、objects/seq守恒及原 reconcileAttempt。正常current数据/权限/归属不能用 WeakMap里的旧Rows充当。只复用已验证的**immutable comparison baseline/parent proof**；当前row、session、scope及catalog永远fresh。

`capture/difference/assertObjectsRecorded/requireOwnedScope/deriveTax13Facts/inventoryTax13/efSelectorSql40/assertSweepRollback/verifyEFFinalWrites40/verifyTax13Semantics`等无重准入入口可按冻结闭包直接复用原函数。实施时以真实源反查transitive调用；发现新重入口必须报告并纳有限差分，不用假ctx骗过。

## 结果、原有契约与不能原样保持的部分

保持原body/HTTP业务语义、完整inventory、逐族FI、201先保存后断言、未知不重发、Main13不重放、原parent出生和所有失败标签。每族单独Root exact G2；`fi-family`只能发一条同体500请求并STOP。normal需所有实际失败原件/FI完成pin及新的精确正常G2，只能一次同体201。进入时已见success/pending/unknown不再发送；退出前重书挡失败也不能重POST。

原A258 `cacheTax14Success`、`completionBodyTax14`及FI完成纯校验若接口相容可直接调用，保现有完成envelope/fiCompletionProof业务字段及来源13 Main桥。新外置 provenance/执行closure必须显式登记到新具名收据及后继消费输入；不能把新执行说成旧封件执行，也不能先假定现H257/270/271会接受。G1必须独立证明其完整消费契约：若精确shape拒新增元数据，采用独立sidecar，仍不改旧原件；若无法合法绑定，则报告Root有限consumer方案后再实现，不能靠宽松reader放行。

**不能保持**旧runner/createApi/install/remove“逐字调用即每次全父图重校验”的实现契约；这正是新外置执行者需要明确独审的差分。也不能持久化或跨进程复用WeakMap、跨epoch继承缓存、将普通对象/布尔当旧guard结果，或保证静态提案已解决session时效。原业务与安全断言则必须保持。若Root要求原A258/HTTP函数逐字执行，本方案不成立：原签名没有proof seam；最小替代将需H2显式受审capability seam，而这超出本提案授权，当前不实施、不请求热改。

## 验证与后续Gate

本次只交设计与待执行矩阵，**没有实施/运行测试**。实施前Root完成Issue及技术G1、精确6叶边界和callback/consumer审定。其后作者仅实现外置叶；非作者对原函数逐断言差分、预导入/WeakMap/view反射、实际wire/归属/撤控、复制链完整性做独审。

代码通过后Root单独冻结真实341准备包、每族G2和actor/session窗口；先纯/FS负例及隔离真实无领域POST预检，实际FI按全必要族完成，每次STOP审。normal另批。性能验证只比较同机同源同范围的读取量、原完整guard次数和真实耗时；无语义缩减，不预称数量级收益。当前prepare76985继续原批；本提案不干预它。G3/G4、#57与正式业务收口均不由本提案改变。
