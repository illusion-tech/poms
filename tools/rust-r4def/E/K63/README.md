# K63：从真实 attachments52 ACK 续跑 K55/K56

作者只读 public 源码/公开回执，编写此 request-only 候选并静态检查；**没有读 private、执行 HTTP/PG/对象 I/O、启动服务或运行并发试验**。7 阶段初始全部 not-run。旧47/52包、Root、产品、环境均不改。

当前公开52原件前5阶段成功，失败边界是旧v2会话complete500。normal V1=`5151e346-59d4-4d3b-8254-ccaae6bd3699`，confidential V1=`156eed94-e0a5-49b1-8762-7c04b8cc4bba`，first D=`32eeb954-5559-45fa-a3aa-fd08e0b8981a`（V3，1/3人已确认）。这些是Root原有事实，不是本作者执行结果。

候选必须在 Root 正式导入并启动 K56 纠偏后执行。源 pins记录编写时材料，不意味着此时Root三产品文件已经实施K56；若新v2仍绑定staging，独立PG断言必须失败，不能为了跑通放宽。

## Root 注入与调用

```js
import { contextFromPublic52, createKContinuation63 }
  from './tools/rust-r4def/E/K63/request-driver63.mjs';

// Root读取本次public原件；实际秘密/session由Root现有新namespace harness管理。
const context = contextFromPublic52(publicBefore52, publicResult52, {
  author: h.actor('full'), handoverOperator: h.actor('writer'),
  environment: actualCurrentRootEnvironment,
  tag: 'k63',
  previousReceiptId: 'tmp/rust-r4def/root/api32/attachments52-result.json',
});
const suite = createKContinuation63(context, {
  request: h.request, binaryRequest: h.binaryRequest,
  observeBasis: rootActualReadOnlyBasis,
  observeAttachment: rootActualReadOnlyAttachment,
  resolveParticipant: id => actualLoggedInActorWhoseIdEquals(id),
  now: () => Date.now(), // Root执行时实际时钟，不是expiry延长器。
});
const initial = suite.manifest(); // 全7 not-run、0HTTP、0PG通过。
const actual = await suite.runAll();
// Root按实际回执保存actual和完整请求/响应原件；作者不执行这段。
```

JSON/binary callback 均为 `callback(opId,id,body,actualActor,meta)`，返回真实 `{status,body,receiptId,requestId?}`；binary GET额外返回实际Uint8Array bytes。meta明确包含 **expectedStatus**（包括409）、method/path/query/caseId/stepId，PUT为实际octet-stream。所有 Cookie/CSRF/密码和原始bytes仍由Root新private保存；公共index只留身份/状态/原件引用与hash，不复制credentials。

context factory只接受52首5项真实成功、下一项在complete500失败、恰好两个已ACK V1、同instance/project的公开原件。旧会话UUID从真实失败record路径解析，当前为`97146322-628d-4a5f-a9cb-3212deb26f45`。不读取旧private、不猜 source IDs，也不重造已经成功的首版/链接/Dprepare/下载包。

## 7 阶段

1. GET当前D/by-id绑定52的真实handover/version/summary/basis/hash和原1/3确认对象；GET两个附件、实际下载原字节，并以独立PG核原Session/Attachment/active links。旧normal必须仍active/latest/final V1；K仍非空normal included、confidential sensitive-excluded，sourceChanged=false。若事实已被其他工作改变，立即停止，不隐式rebase。
2. GET旧失败会话真实status/expiry/version。实际已过期且仍pending/uploading/uploaded/validating时，调用正式abort+fresh expectedVersion，再GET验证aborted且无completedAttachment。若已aborted/expired/failed，则显式记录保留。completed/未知状态、expiry未到都停止。**不延长expiry、不重发旧PUT/complete、不SQL修状态**。
3. 新create-version会话，source为已GET的normal V1；新PUT只一次、complete只一次。实际下载39字节v2，与固定SHA比较；独立PG证明新Attachment key != Session staging key，provider/bucket一致、实测下载元数据吻合、真实版本链和完整active links继承、latest/final唯一。legacy V1 key/bytes/hash保全、仍final；未markFinal的v2不得改变D sourcehash。旧V1可能仍绑定旧staging，明确只保全，不把K56新规则倒写成旧成功保证。
4. 正式mark v2 final，v1 final清除，真实sourcehash改变。让原来已确认的本人再次用旧summary/basis+当前confirmation CAS确认，必须409；核整份确认对象和旧frozenMaterials不变，不能靠“已确认幂等”绕过source变化。
5. 新Dprepare捕获v2真实ID/version/checksum，全部3人pending、独立confirmation，职责完整保留；由一位实际指派人本人真实确认，变为1/3。
6. 正式void v2；独立PG保留voided历史与新final/staging绑定。真实source变化，剩余pending本人在旧v2材料确认409，人数与旧确认对象不变。old V1下载仍是原字节。
7. 正式将old V1恢复final，新prepare，核PG basis重新选中V1且confidential仍排除。refresh selection metadata不能改D sourcehash。全3人分别以各自真实session重新本人确认（兼任者覆盖本人全部职责），最终confirmed、回款模式frozen、R5提成角色冻结仍阻断。

每个步骤发生不匹配就停，保留原ACK，不自动重试或回滚已成功的真实API操作。一次suite仅允许runAll一次。某一写成功后后续断言失败必须先由Root核当前事实，再准备明确续跑方案，不能再次从本包入口盲跑。没有PG hooks时标needs-evidence并停，不把HTTP字段当作存储绑定证明。

## 独立 observeAttachment 协议

Root在实际namespace守卫后的**同一个READ ONLY事务**执行readback63的相关SELECT；meta含sessionId/baseAttachmentId/projectId/contractId/instanceId。返回：

```js
{ receiptId: actualPGOriginal,
  body: {
    identity: { namespace:'poms-r4def', instanceId:actualMarker,
      database:'poms_r4def_rust', migrationCount:94 },
    attachment: actualSnakeCaseRow,
    session: actualSnakeCaseSessionForMetaSessionId,
    activeLinks: actualActiveLinkRowsForAttachment,
    baseActiveLinks: actualActiveLinkRowsForMetaBaseAttachment,
    groupRows: actualAllHistoryRowsOfCanonicalGroup,
  }
}
```

identity必须来自真实连接/marker/migration读回，Root并核PG15/服务端15432/host25433/isolated/实际app与owner资源，不能从meta原样抄一个字面值当proof。新v2检查Session.completed_attachment_id、checksum/size、provider/bucket和不同storage_key；rawkey只在Root新private原件保全，候选公共observation只记录location identity hash。全active link集合的targetType/targetId/relationType与source independently compare，不能只有count或head rowVersion。

observeBasis沿47的真实 `{receiptId,body:actualSnakeCaseBasisRow,identity?:actualGuardReadback}`；Root守卫/真实PG原件必须可追溯。候选核完整payload_hash/source_hash以及materials普通final与confidential默认排除。PG size/checksum仍是metadata，所以另外必须真实download按独立固定见证核bytes。

独立常量复用47公开固定内容，静态重新计算，不从K56实现求预期：normal1/normal2分别39 bytes，SHA为`7e092953bfd0e46ebf7b1f895b7ad2c7fb000ea717d406ec4cfe751e6ece5347`/`d6ab532cef7e99ddcd4b774d1b4a5720e43066dec08310f5e21b7a09e3ff4075`；confidential45 bytes，SHA=`4415216e5f805a9fc152e79a23e1b20210afdce1952b3f356db87f2075d8b97b`。

此主链覆盖K55-01/17的一部分真实本地绑定、nonfinal/final/void和D联动。**不是K55全部32向量通过，也不认证S3、COMMIT未知/故障注入或完整并发矩阵**。这些仍按Root/F独立计划实跑。

## 可选真实迟到 PUT-B 的 I/O 屏障（仅计划/SQL模板，not-run）

gate63.sql供Root审源，不能作为one-shot脚本直接跑。候选主driver不执行SQL，也不改生产代码插E2E hook。RLS仅为Root本次测试基础设施，业务producer仍为正式API。

1. 新namespace独占测试流量。原字节保存storage config表owner、relrowsecurity/relforcerowsecurity、全部policies、table/column ACL、app rolbypassrls/rolsuper及actual marker/OID。此最小SQL模板仅接纳原RLS/force关闭、无policy；其他状态明确拒绝，由Root另审，不擅自放宽已有行权限。schema `r4def_k63_gate`必须原本不存在。Root只对poms_r4def_rust/PG15/25433/isolated执行，不碰native主库、PG17或旧环境。
2. 如果config表无真实匹配local row，先经正式配置API建fixture（platform:attachment-storage-providers:manage本人）：create `{providerType:'local',displayName:freshFixtureName,enabled:true,isDefault:false,bucket:null,keyPrefix:null}`，然后PATCH `{status:'active',enabled:true,expectedVersion:actualVersion}`。不设置/更换已有default、不SQL插config。因location_runtime真实SELECT必须产生一行才有RLS gate；零行直接放过不能计成功。fixture前后状态通过API保存/恢复为disabled，不能SQL删除业务配置。
3. 在独立实际目标上正式create fresh session **不传checksum**、声明64 bytes，并真实upload-target，使其uploading/rowVersion2/checksum NULL。A64=`'A'.repeat(64)`、SHA=`d53eda7a637c99cc7fb566d96e9fa109bf15c478410a3f5eb4d4c4e26cd081f6`；B64=`'B'.repeat(64)`、SHA=`c422e7070cb1cb455b5de9afee0d975e303d0239c72030cd7414ab5c382d3ae8`，独立固定值。
4. 基础设施建新control/function；H会话持fresh advisory key。C事务短持config表AccessExclusive，**再启动B真实PUT**。B通过Session/权限/size/checksum-null读取后，卡在location_runtime的真实SELECT取表锁。此时尚未写对象。
5. Root独立observer以actual table-blocking C PID、同库app角色和精确SELECT query识别**唯一B backend PID**，保存pg_stat_activity/pg_locks。未知/多条就停。C将该真实PID记入自己的infra control，启用两条仅app SELECT的permissive true+restrictive PID/config限定gate策略后COMMIT。B解除表锁等待后必须在**同PID**进入H的advisory wait；用真实锁回执证明这次转移，不能用sleep推定。AccessExclusive此后不再持有，A不能被阻塞。
6. A真实PUT A64，真实complete一次，保存200 ACK、独立PG finalKey!=staging、actual64/SHA=A、真实download A。RLS函数对其他PID返回true，不改业务status/body。若连接池容量/真实查询超时使A无法完成，case失败，不延长假时钟或伪ACK。
7. H release后B实际写staging B64，再因captured Session CAS/terminal证明失败409。必须核实际失败原文/target确为附件会话CAS，而非某个无关auth409；Session仍completed且rowVersion不倒退，无第二Attachment/必要成功audit。实际final下载仍A64，PG final/checksum不变；若另核staging，它可为B64，不能因此谎称B未写对象。新final不对外发PUT capability，不能把local结果外推为S3签名URL吊销。
8. 所有分支finally先release H并settle B，停止新流量后只删除本scope两policy/function/control/schema；RLS启用位按原值准确恢复，forcerowsecurity未变也要比对，原policies/ACL/owner原字节签名必须一致。不得DROP OWNED/CASCADE、终止未知PID、改业务行或漏恢复ACL。Root还应保存B终结、环境restore与实际对象/PG证据，缺一不计Pass。

schema/control的DDL和PID行属于Root环境provision，明确不作为业务事实。SQL只是未执行候选；RLS重规划、精确PID等待及超时行为都需Root实际验证。没有真实屏障/完整恢复证据时该可选case保持not-run。
