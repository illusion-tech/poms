# Source15 固定 Tax readers 与五 consumer：G1-C 提案

仅设计，不授权code或任何实际操作。Root已选择独立 `role15-setup`，本片闭集为h15-287/shared15-284/period15-270/mixed15-271/role15-setup，只有三参 `consumeTax15Completion(ctx,{consumerId,consumerInput,registration})`。不能以h15-287代角色输入或共享registration。

## 精确文件与所有权

本G1-C拟新增的native reader产品固定两个外置ADD：`tools/rust-r4ghi/tax15-readonly/runtime15.mjs`、`facts15.mjs`；不入H3、不改变旧14 reader，也不复制旧facts270的period/calendar/budget/oracle函数。只从原H257/共享270 Tax proof读取边界派生。所有new afterSHA均null。

共同联合consumer位于Root另冻的#118六叶中的 `tools/rust-r4ghi/tax15-invocation118/retained-tax-proof.mjs`，不是第三reader产品或第七executor叶。它固定选择上述native pair，内部固定加载真实H15 runtime及typed15 central；不接受reader/h/read/FS/crypto callback、ctx override或动态module别名。六叶与prepare/facts代码仍待Root另冻、实现及独审；原14 WIP5/6不当基底已交付。

H15固定5H3与两外置Role叶仍属c3a提案；本片只补其Tax依赖的消费ABI。四caller新15 edition保持自己的runtime、scope、原legacy SQL/restore、period、mixed、view/counter、preimport及effect顺序，接入点须另精确冻结；不热改Root旧callers。Role入口的caller source为H15已列new setup/input加原fixture protected closure。固定native reader登记和联合sidecar只是只读证明，不授予caller业务或fixture SQL权限。

## 两种native入口与返回

新 `runtime15.mjs` 提议两个固定同步只读入口：

- `readTax15SecurityCompletion(ctx, environmentBindings15Pin, completionPin)`：内部调用真实H15 loader/verify，读取当前Tax15完成原件的runtimeBindings，再进入同一完整native proof验证。用于h15-287和role15-setup。
- `assertTax15Envelope(ctx, normalizedRuntime12)`：严格12字段，无h/registry/read参数，内部获取真实Reg5/current runtime。用于284、270、271。

共享原返回字段保留为 `{manifest,record,envelope,legacy}`；security形状为 `{completion,runtimeBindings,consumerEpoch:'g2-business15',sourceGeneration:15,retainedMain13,actualTax15Verified:true}`。record/manifest/legacy与所有返回元数据必须是独立深只读数据，不暴露ctx.state或内部可变别名。联合consumer只在该原返回上追加具名 `invocation118Sidecar` 证明，不能以它替代或放宽native验证。

所有实际字段、读取指针、284严格12键输入与12键normalize、source closure及sidecar字段在 `CONSUMER-API15-v1.PROPOSED.json`。284只在原period分支Tax前置处调用；baseline witness/负例不被本片额外强加Tax前置，也不借registration扩大writer授权。

## 真正的Source15完成契约

唯一完成状态是 `state.taxContinuation15`，envelope kind固定 `actual-Source15-retained-tax-consumer-complete`、sweep kind固定 `source-bound-tax-continuation15-sweep`。schema5/epoch15/current source与完整H3/API/B1严格相等，B0或旧14 B1不能替代。保留final14父state、真实original12、真实Main13 HTTP201桥（含原c075/4524B），不把13/14重标15、不运行Main入口。

native reader必须重算原Tax proof所需全部业务/金额/来源/完整target与inventory语义，重读真实FI、normal201、request/response、before/after、ledger、控制与rollback原件；不能只信bool/摘要。`complete.fiComplete===true`同时要求`sweep.fiComplete`原pin及`complete.fiCompletionProof`同pin；scope/inventory/failures/bodySHA与原FI收据深等。normal201只一次同体、完整postconditions verified，所有pending/unknown Tax结果不闭合就拒。

原历史快照读取必须按原attempt/raw pins、原ownership及事务证明核验，不能要求历史Tax after等于后来period/mixed推进后的owned.latest；也不能利用宽松历史reader忽略原差分。Main13使用typed `readRetainedCommand15`，原件不回放、无current latest旧值要求。当前完整Reg5/API/source/H3与actor/session权威仍fresh，不因历史验证而跳过。

## 共同sidecar与逐族证据

`actual-Tax15-invocation118-execution-sidecar`必须绑定新15完成/FI pins、private runtime/current tuple、完整六叶/codeReview/G1，以及实际entry/exit、closed FI set、journal和normal201原件。所有family按Root actual frozen inventory完整原顺序且恰好一次，descriptor/body/scope/actor/session/requestId/control/before-after/ledger/rollback一一对应；不裁5→2或任意suffix，不自动跳族/重发，首异常后无后续POST。unknown、缺撤控、书挡失败不签complete。合法恢复须新的明确Root恢复review和原全prefix链，不由reader修复或签新cap。

FI完成STOP与正常201的独立exact G2仍保留；FI能力不能commit。正常201收到后先保真原件，任何后校验失败不重POST。所有Tax控制必须已精确撤控且实际OID/definition/owner/ACL/sequence命中证据闭合。失败rollback不允许业务/audit/security或managed-auth提交；只允许实际绑定session的五列raw touch（或完全无touch），不得用任意auth变化豁免。

reader不要求旧公共HTTP凭空出现新process字段：15身份通过新executor fresh phasechecks、真实当前process/API、canonical wire、epoch15 captures与ledger/requestId连接，原公共/私有wire原件字节不改。新executor若增加证据metadata必须真实产生且受代码/输入绑定，不能给旧14 HTTP贴15标签。

native和joint验证可在中央合法owned active FI的验证/撤控阶段只读运行，不能全局拒ctx.activeFault造成period/mixed cleanup锁死；但当前Tax自身任何未闭合pending/control/unknown都不可接受。caller原effect入口idle和exact G2条件保持。

## period / mixed / Role

period每个真实phase用自己的完整input pin与period15-270 registration。mixed先保原period completion/transaction/semantics/view校验，再从实际 `periodCompletion` proof读取唯一 `verificationInput`，读取其中自己的period registration，以period15-270只读验证它；再以mixed15-271验证当前mixed输入。两registration按ID/codeClosure独立，不能要求两pin相同；共用sidecar/Tax completion/runtime/current tuple须严格相同。此读取不执行period，不替代其原结果链。

Role独立role15-setup registration和完整Role15 input；先调用联合API，随后按H15真实continuation verifier核上游H46。若需只读复核H46原输入，只能用该原h15-287 input及其自己的registration，不能把它当Role的身份/权限。Role自己的Tax证明与上游H46必须指同一Tax completion/sidecar/current tuple，不能拿不同成功对象拼接。真正一次权限命令与角色ledger仍由H15 Role方案限制，本API effectsGranted=false。

registration不反指包含它的input hash，避免自环：先封ABI和独审代码，再Root登记精确reader/executor/prepare-facts/caller源码及reviews；私有caller input引用registration与sidecar；caller原exact effect review再绑定完整input pin。所有review必须按Root实际冻结的typed格式核，不能臆造未知审件别名或只看文件存在。本提案不生成任何review。

## 待冻结与验收

两个native文件及新completion/proof字段必须和Root将冻结的Tax15 prepare/facts与六叶执行器一起联调。实际module/raw/codeReview、完整prepared scope/inventory、FI/normal G2、entry/exit/journals/完成原件、Reg5/B1/API和五caller input/registration仍全null。完整H3由Root最后合并，两个reader及六executor不入H3，不能mint后热添H15 helper。

测试矩阵仅设计，未来必须真实native/central/producer code组合，保普通Source14 reader拒ctx15，真实FS mutation及原件缺失/跨ID/错误normalize/未知结果均拒。当前0code/0tests/0Root或运行效果，非G3/G4。Root冻结本proposal及另各有限source变更后才能实施。
