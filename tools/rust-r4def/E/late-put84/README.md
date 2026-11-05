# late-put84：真实迟到 proxy PUT 薄 runner 候选

作者只读公开源码/模板、做语法和静态核对。**没有运行entry/run、没有读private、没有连接DB/HTTP、没有读写对象或设置RLS/锁**。8阶段初始全部not-run。旧K63/cleanup70/产品/Root不改。

这次交付真实可执行协调代码，不是模拟向量：runner84通过注入harness和三个实际owner连接做API、真实B barrier、A完成、放B、独立PG/对象/下载核证及finally恢复。root-entry84给Root显式执行入口，作者不执行。

## Root 入口

权威为 **manifest84b.json**；84a静态原件保留static-source84a，不覆盖。最终执行绑定已审最终epoch（含K98或之后修补）的3个source与实际新binary，不硬绑81/95或某个编号。先由Root保存实际绑定receipt，不能把计划/旧binary改名：

```json
{
  "finalRuntime": true,
  "epoch": "Root实际最终epoch",
  "namespace": "poms-r4def",
  "instanceId": "本次实际marker UUID",
  "binarySha256": "最终实际运行binary的完整SHA256",
  "runtimeReceiptId": "Root实际启动及PID/运行binary核证原件",
  "authorityReceiptIds": ["最终接线/冻结/独审原件"],
  "productSources": [
    {"file":"apps/poms-api-rust/src/attachments/service.rs","rawBytesSha256":"实际完整SHA"},
    {"file":"apps/poms-api-rust/src/attachments/store.rs","rawBytesSha256":"实际完整SHA"},
    {"file":"apps/poms-api-rust/src/attachment_storage/registry.rs","rawBytesSha256":"实际完整SHA"}
  ]
}
```

Root核manifest并导入后，使用实际runtime edition/SHA与上述public绑定原件：

```bash
/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node \
  tools/rust-r4def/E/late-put84/root-entry84.mjs \
  --allow-root-execution --runtimeEdition=实际新runtime编号 \
  --binarySha=实际完整SHA256 \
  --finalRuntimeReceipt=tmp/rust-r4def/root/实际绑定原件.json \
  --tag=k84-本次新唯一标识
```

entry在任何HTTP前检查最终3个source当前字节、实际`/proc/<pid>/stat` start identity、cmdline、`/proc/<pid>/exe`运行bytes SHA（不拿已重编的同路径文件冒充进程）；再真实登录full与两个全新A/B session。owner只读差集各必须恰好一个真实AuthSession ID并保存原件。thirdProject严格取本次public `api32/races73-context.json`，不新造项目、不碰已有D主项目。source→build→binary来源由Root实际绑定receipt支撑；runner不凭磁盘source相等推断其已编入进程。

输出为Root新private `late-put84-<tag>`和public `late-put84-<tag>`，都必须原本不存在。root-entry只在显式flag之后读取本次poms-r4def private fixture/cookie jar，绝不读旧namespace private。所有日志/PG/对象原始bytes在新private；public只有真实status/index、原件引用/hash、ID、counts。没有自动重试。

## 直接注入现有 h / db33

Root也可复用自己已核证的harness和独立fresh会话：

```js
import { contextFromRaces73, createLatePut84 }
  from './tools/rust-r4def/E/late-put84/runner84.mjs';
const context = contextFromRaces73(actualPublicRaces73, {
  author:h.actor('full'), actorA:h.actor(actualFreshAKey), actorB:h.actor(actualFreshBKey),
  sessionProof:{userId:actualFullId,A:actualSessionAId,B:actualSessionBId,receiptId:actualProof},
  environment:{namespace:'poms-r4def',instanceId:actualMarker,receiptId:actualEnvironmentProof},
  runtimeFence:{finalRuntime:true,epoch:actualFinalEpoch,binarySha256:actualNewSHA,
    productSources:actualThreeSourcePins,authorityReceiptId:actualRootBinding},
  tag:freshTag, legacyAttachmentId:'5151e346-59d4-4d3b-8254-ccaae6bd3699',
});
const runner=createLatePut84({allowRootExecution:true,context,harness:h,
  connectOwner:backend=>connect(backend), recordEvidence:actualPrivateProofWriter,
  observeObject:actualOwnedObjectReader, observeRuntime:actualLiveProcessReader});
const initial=runner.manifest(); // 全8 not-run/0HTTP/0PG。
const actual=await runner.run(); // Root唯一实际执行者。
```

recordEvidence必须返回实际保全receiptId；observeObject必须真实读新namespace对象并返回 `{receiptId,body:{namespace,instanceId,regular:true,symlink:false,parentSymlinks:false,nlink:1,bytes,sha256,...}}`。entry内已提供这些实际实现。不能把声明size/hash或HTTP回包原样塞成FS证明。observeRuntime返回真实namespace/pid/startTime/actual executable SHA/port/alive；runner前后比较同一进程身份。

## 执行顺序与精确证明

1. 三个独立O/H/C owner连接都验证127.0.0.1:25433、poms_r4def_rust、PG15/150012/服务端15432/isolated、DB OID、实际marker/base756d。精确保全config表owner、RLS/force、全部policy、table/columnACL；原状态必须RLS/force off、无policy、app非owner/无owner继承/super/bypass。新infra schema原本必须不存在。
2. 当前无enabled default时，经真实API创建**一个**local config：enabled=true、isDefault=true、专属`k84/<tag>` keyPrefix，无密钥/endpoint/bucket。既有default存在则停，不借用/改写它；任何其他config行变化也停。原52的legacy storage key不匹配新prefix，前后实际绑定与39 bytes SHA校验必须不变。
3. 真实项目/category核验后，正式create Session size64，**没有checksum字段**；actual upload-target使其uploading/rowVersion2/checksumNULL。H以fresh advisory key先try-lock，撞锁就停。
4. 新scope control/function属于环境provision。C短持config表AccessExclusive，再发B真实PUT B64。O以实际blocking C PID、精确location_runtime SELECT、实际app角色识别唯一B backend PID，并核pg_locks的AccessShare未授予/AccessExclusive已授予。不得凭PID猜测或sleep先后。
5. 同C事务写入这个已观察PID，仅为它/config加permissive SELECT true + restrictive PID gate并启RLS；commit前保存实际policy定义。Ccommit后，O必须再次看到**同B PID**被H阻塞，精确advisory bigint key/classid/objid/objsubid与holder/waiter都匹配。此时PG Session仍uploading2/checksumNULL，B已过auth后的真实AuthSession状态作为失败回滚比较baseline。
6. 只有屏障证明成立，A才真实PUT A64（uploaded3）并complete（completed4）。新Attachment必须active/latest/nonfinal业务flag、version1/rowVersion1、真实project link；storage final key与staging不同，路径含attachment UUID和另一个真实nonce UUID、provider/bucket一致。核实际PG、唯一attachment.uploaded audit与complete requestId；真实binary download和独立owned final对象都64 bytes/SHA=A。
7. release H，B必须实际返回409且消息明确为Attachment source/version冲突；auth409/其他409不算。完整Session/Attachment/flags/links/必要audit必须与A已完成快照完全相同，B managed auth与屏障处baseline相同。真实final下载仍A64，独立FS final=A64、staging=B64，证明迟到写确实发生但未污染已发布对象。旧52绑定及39字节下载、其他config行均保持原状。
8. finally先rollback自有未结C事务、释放H、等待B终结，再按control中的namespace/instance/run/config确认仅本scope。只移除本scope两policy/function/control/schema并还原原RLS位；拒绝未知policy/ACL/owner差异。不CASCADE、不删业务行、不终止未知PID。重新实际读security快照逐值等于原件且本DB自有advisory key没有残留，关闭自有连接。恢复不完整或任何证据失败，complete=false并保全原件，不能报Pass。

轮询间隔仅用于等待下一次实际观察，成功依据是真实锁记录。没有固定sleep来制造胜负，没有改HTTP响应，没有SQL制造uploaded/completed/Attachment/audit状态，没有生产E2E hook。

“final”指K56不可变存储位置，业务Attachment.isFinal仍为false且必须保持；本例不擅自mark-final或制造D移交事实。新provider config/Session/Attachment/link及真实audit/auth是已授权API fixture，**保留owned active/default config**及全部业务证据，交最终ledger/cleanup70核销。finally只精确恢复测试基础设施，不通过SQL删新业务、改成NULL prefix或把旧52迁移成新key。

本例只认证实际执行出的本地迟到PUT链；不外推S3 capability吊销、WORM、全部K55向量或G3/G4。作者静态包始终actual execution not-run。
