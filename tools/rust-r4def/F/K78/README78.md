# K78 可运行关键子集候选（作者未实跑）

三入口均只写本工具目录，没有产品修改。Root先守hash导入本目录到Root WT相同路径；不要从作者WT直接执行RootEntry（其依赖是Root现有`api-harness32.mjs`、`db33.mjs`、`fault-core47.mjs`）。全部实际PG/HTTP/对象/并发/fault仍为not-run；Node语法与8项离线静态检查不是实际验收。S3明确未认证，fresh autoLink+audit与late PUT交由Root已有方案，本包不重复。

## Root执行

在Root Linux环境，使用真实最终K98 runtime epoch、全新的数字API edition与唯一tag。代码会核Root当前store/service/registry精确K98/K86/K56 hash、真实binary文件hash及PG namespace/marker/migration94。`FINAL_EPOCH`必须替换为Root实际进程记录编号，不能照抄占位符执行。

```sh
node tools/rust-r4def/F/K78/RootEntry78.mjs --root-execute FINAL_EPOCH 7801 k78a vertical7
```

`vertical7`独立覆盖6条complete故障和void历史max+1；幂等group与来源变化屏障已由Root在recovery113证明，本包不重跑。完整关键16项另用新edition/tag/独立新附件组运行：

```sh
node tools/rust-r4def/F/K78/RootEntry78.mjs --root-execute FINAL_EPOCH 7802 k78b critical16
```

`critical16`额外覆盖metadata/final/void/link/unlink/abort的必要audit回滚及一次真实retry、两个真实Session同base并发complete、declared64的63/65字节PUT负例。不要把vertical7的`completed`外推为16项全过；看`completeAll16Core`与逐项stage。真实complete对象读63/65为另两条可选Root hook，默认not-run；PUT400只证明上传size guard，不能冒称有界reader实跑。

Root已有h/db/fault对象时，可直接使用工厂：

```js
const runner = await createRootRunner78({
  h, db: connect, fault, context,
  runtimeEdition: actualEpoch, selection: 'critical16',
});
try { const result = await runner.runAll(); }
finally { await runner.close(); }
```

context可由`contextFromPublic71(before71,{author:h.actor('full'),tag:'k78b'})`产生，包含实际projectId/contractId/category。`RootEntry78`会自动读取公开K71 before和Root自己维护的actor材料，真实login；作者未读取这些私密材料。所有new create/version/CAS/target/association/unlink多参数body均在driver内固定构造，不猜版本、不复用旧失败Session。默认localRoot来自已核`environment21.mjs`的`<state>/objects/rust`；若Root实际runtime改过路径，直接工厂传真实`localRoot`，不要创建伪对象。

## 真实证据与断言

每个case先通过真实API建立独立group、完成64字节固定PDF前缀witness，再关联真实project/normal和contract/evidence。complete故障用该独立group、base和唯一changeNote、真实Session ID、audit.uploadSessionId作predicate；第二份Link根据其在同事务内的真实parent Attachment匹配后计数。触发函数及trigger均唯一命名，只对匹配owned行设置barrier/抛错，不使用fault-core47原来的无行限定probe。

Root作用域observer逐次READ ONLY获取附件/完整links/Session/必要audit，以及从实际cookie hash精确定位的当前auth_session（不猜latest、不公开cookie/hash）。在真实advisory waiter被只读PG观测到后比较blocked不可见状态、撤障后全owned业务回滚、managed auth相对post-eager基线回滚，移除trigger后仅一次fresh真实retry。fault-core47仅提供全120表原始诊断snapshot；它的空probe summary不是K78验收依据，不能据此宣称全120表回滚。

Root对象observer只读实际PG指向的owned local路径并检查bytes/SHA；不写对象或伪造业务行。触发函数临时application_name携带真实新Attachment UUID，使Root能检查该UUID下的私有final：已知rollback删除，deferred COMMIT错误按unknown保留。early-oldflag触发时新ID尚未进入SQL，故该点没有直接私有attempt清理见证，只验证旧材料/staging与owned业务回滚。每份回执明确是否取得attempt对象证据。

Root已报告recovery113/receipt113.json覆盖fresh autoLink+audit、两条no-op group等待，以及另一真实session改变linkset/headV不动或metadata导致旧no-op409。本包只保留该外部证据引用，不重放、不声称作者执行。samebase并发用两个独立真实Session，各自等在同一个group锁后才撤障，应恰好一个200/一个409。全部barrier基于实际pg_locks状态；20ms只是轮询间隔，不以sleep时间决定通过。

所有case使用新附件组，可能改变同project的当前D材料集合；原冻结D payload不重写。Root可传另一套实际project/contract context隔离，或在验收后按owned回执经真实API void清理；工具不SQL删除/修业务状态。结果在`tmp/rust-r4def/root/K78-<tag>/`，raw原件只在Root私有目录。测试失败、not-run和可选hook缺口保留原标签；G3/G4字段不会自动置Pass。
