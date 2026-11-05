# owned-only teardown70 纯规划候选

作者只读Root public65b/catalog25/原migration94和公开旧cleanup50代码；不读任何private/凭据/旧namespace原件，不执行DB/HTTP/文件删除/进程停止。**本包没有apply命令或DB连接器**；core70 import安全，全部真实teardown阶段not-run。Root掌握最新ledger、停止API、最终审阅与实际执行。

public65b的历史事实：双库各120表/532原seed、294 FK；native当时无变化，rust当时2241行。Rust仅两条baseline修改和一条missing。后续实际K/UI/API新增必须重新捕获，不能拿65b的1700+当最终删除数或凭前缀认领。

## Root 输入与规划

```js
import { planDatabaseTeardown70, publicPlan70, snapshotFingerprint70,
  listNewRowsForOwnership70, assertApplyAdmission70,
  privateStatement70, assertOperationResult70,
  assertRestored70, assertTwoNoOps70 } from './tools/rust-r4def/E/cleanup70/core70.mjs';

// 以下均由Root实际读取/守SHA，作者没有读这些private原件。
const input = {
  backend: 'rust', authority: publicAuthority70,
  catalog: actualOriginalShapeCatalog, guards: actualGuards,
  baselineRows: actualOriginalCleanupBeforeObjectArrays,
  liveRows: actualLatestRowsByTableAsRawJSONStrings,
  scope: actualOwnedScope,
  ownershipLedger: actualLatestSealedLedger,
};
const plan = planDatabaseTeardown70(input);
// plan包含原行/密码hash/borrowed original，仅存Root新private！
savePublic(publicPlan70(plan));
```

authority70保存实际public catalog结构fingerprint、每库120表原始summary hash、5个trigger定义、ACL hash、精确3借用件和审过的pointer组。Root输入catalog形状与catalog25一致（readback70.sql给原查询）；guards为 `{triggers,policies,acl,supplement}`，supplement另保存真实函数定义、schema/column ACL、identity/generated/collation、sequence定义及额外完整DDL签名。temporary RLS/policy/ACL须已恢复；不能只关掉trigger凑数。

baselineRows直接使用原 `cleanup-before-<backend>-rows.json` 的对象数组及原顺序；逐表SHA必须与public catalog25 summary相同。liveRows必须在同一RR只读快照读完全部120表，推荐每行 `to_jsonb(t)::text AS raw` 的字符串，避免JS浮点量化18,2大金额。PK/FK只用实际列；full-row fingerprint以JSON.parse source context保留数字token，并作精确十进制规范化。RootNode需支持该能力；不足就拒绝，不偷偷退回浮点。

scope须来自真实新namespace守卫：namespace poms-r4def、base756d、instanceId、database/backend、实际DB OID、container ID、host127.0.0.1/25433、server15432/150012、isolated on和environment原件引用；不把填写字面值当已核证。

ownershipLedger形状：

```js
{ namespace:'poms-r4def', instanceId:actualMarker, backend:'rust',
  liveGraphHash: snapshotFingerprint70(actualLive, actualCatalog),
  catalogHash: actualAuthority.structuralHash, sealReceiptId:actualRootSeal,
  rows:[{table,primaryKey,rowFingerprint,beforeAbsent:true,
    producerKind:'http-command', receiptIds:[actualProducerOrRootChainOriginal]}] }
```

producerKind只允许http-command/internal-producer/auth-fixture/managed-auth-audit-security。Root可用listNewRowsForOwnership70得到“待认领精确PK+fingerprint”，再以真实HTTP/内生产/authfixture原件补ownership；该函数不会把“baseline不存在”自动变成归属证明。ledger与实际新行必须集合相等，未知/变更/遗漏任何一行都停。

## 真实294 FK下的删除与循环

核心根据**实际行值**解析全部FK，包括复合引用和MATCH SIMPLE的任一NULL免引用规则。所有ON DELETE CASCADE/SET NULL也视为必须child-first的依赖；这样不会依靠隐式cascade或SET NULL清数据。baseline/非owned行若引用owned parent，直接拒绝，不因FK自带cascade就放过。

先删除实际owned叶子，每个SQL只指定完整PK和整行期望值、必须影响1行。自身supersedes链按实际child-first逐PK删；不忽略self FK、不把所有同表行批量全删当万能解。合法F链会先删除allocation source/result、stage/tax/evidence等实际依赖，保持confirmed cost所有stage/status字段不动。catalog中的cost.stage_derived_from_id不是要清的FK；本包完全不UPDATE任何cost/stage/evidence行。

仅实际行图卡在SCC时，才选择同SCC中有真实引用的owned白名单断点：

- commercial_release_baseline.latest_diff_result_id。
- contract_readiness_package.current_preparation_id + contract_amendment_id。
- contract_term_snapshot.source_preparation_id + source_readiness_id + source_amendment_id。
- contract_term_preparation.contract_amendment_id + before_snapshot_id **必须同一UPDATE同时NULL**；真实chk_r4d_preparation_amendment允许二者全NULL。activated_snapshot_id/activated_at/status绝不改。
- contract_review_binding.contract_amendment_id。
- project_handover.handover_rebaseline_record_id；basis_snapshot_id/confirmation/confirmed字段绝不改。

每组列必须实际nullable，所有受影响CHECK定义逐字匹配已审规则；其余CHECK的引用列不变。若新CHECK触及这些列就停。5个D immutable BEFORE UPDATE表不产生任何UPDATE。尤其不能清immutable member/payload/basis/item/participant role来破环。

改变被复合FK引用的parent列之前，还要确认其**全部实际入站children已先删除**；包括snapshot.source_preparation_id被member/plan复合引用的情形。若仍有入站就跳过此断点，尝试另一可证明的断点；未知/不可NULL/CHECK/trigger/inbound-key环最终返回明确cycleDetails并停，不ALTER约束/DDL、不降状态、不乱清字段。

static-schema70仅基于真实catalog显示3族潜在跨表环，在白名单边切断后无剩余跨表SCC；它不含private真实row graph，**不能据此宣称F/D实际行已可清/已删除**。Root必须注入最终真实行，看到明确逐PK完整计划才能准入。若实际self环/新环出现仍停止，不伪造数据证明通过。

## 仅3个借用原件

只在Rust允许以下精确恢复；native任何baseline修改都拒绝：

- business_number_sequence `52b0d05d-7e0b-430d-9aa5-1d8007e03fba`：只恢复原next_value/updated_at。
- local_credential `70000000-0000-4000-8000-000000000008`：只恢复原password_hash/updated_at；原hash仅Root private读回，不公开、不重新bcrypt生成。
- 缺失user_role_assignment `50000000-0000-4000-8000-000000000081`：在新增role assignments全部清完后，INSERT整条**真实原件**（含历史时间/操作者/原因），不猜旧role，不凭“vp应有某角色”重建。

其它任何baseline行缺失/改列都停止。没有delete seed→再seed，不重跑Seeder，不恢复整张表，也不按username批量改credentials。全部新增行逐PK删除完成后再恢复这些原件；角色原件的FK指向保留seed，所以最终所有532行可逐字段比对。

## Root 执行协议（作者未执行）

1. 最新生产回执全部封存；结束并发/故障门控并精确恢复RLS/ACL。Root按实际PID/start/argv/executable身份停止本批API/31341、Native53/31342等，端口确实释放，无未知writer。保留PG15服务供只读/cleanup事务；不用停PG来替代清业务行。
2. 再做最终120表RR snapshot+catalog+guards，冻结本次最新owned ledger与plan hash。assertApplyAdmission70要求sealedLiveHash精确相等、catalog/guards相等，以及同instance的实际stopped证据字段allOwnedAPIsStopped/allBatchPortsReleased/testGatesRestored/latestLedgerFrozen/noUnknownConnectionsOrWriters均true；这些必须有实际原件支撑。
3. Root在同一实际owner连接BEGIN，必要时按排序对120表取DML排他锁；同连接再核整个sealed snapshot/catalog/guards。串行materialize `privateStatement70(op,catalog,previousOutputs)`，参数化执行；每步`assertOperationResult70`要求rowCount=1/完整返回行fingerprint相符。
4. cycle UPDATE后，后续delete/UPDATE的expected raw取**真实UPDATE RETURNING**，不是JSON.stringify重新造含大金额的行。core保留immutable beforeRaw和准确after fingerprint，Root用operation ID保存真实返回，防silent rounding或漏更新。
5. 缺失借用原件INSERT、两条原列UPDATE后，在事务内assertRestored70要求所有120表/532 seed及catalog/ACL/triggers/DDL supplement完全相同，再实际COMMIT ACK。任何不匹配ROLLBACK并停止，不自动重试。COMMIT未知保留原件/状态先核证，不假报已回滚或再执行一遍。
6. COMMIT后另做**两次不同receipt的完整只读no-DML全库核对**，assertTwoNoOps70逐次要求同一原532 seed/catalog/guards。不能把同一内存结果复制两次或仅比较row count算双no-op。

privateStatement70只生成绑定SQL，不执行。DELETE有完整PK+full JSONB期望值guard；UPDATE只显式白名单列；借用恢复只精确原件。没有TRUNCATE、CASCADE执行语句、DISABLE ALL、SET session_replication_role、批量前缀删、DROP表/库或任何DDL。

## 新namespace对象与进程意图

planOwnedObjects70只接纳原本空的 `/home/wangzishi/.local/share/poms-r4def/objects/{native,rust}`，实际regular文件、无symlink/parent symlink、nlink1、真实realpath/dev/ino/bytes/SHA。Root先逐文件原字节复制到新private `cleanup70-*` archive（目标必须wx独占创建），重读原/副本大小+SHA并核inode未换；assertObjectUnlinkAdmission70通过后才对该**单一真实literal path** unlink。保留空目录，不递归删。assertOwnedObjectsCleared70要求当前roots实际空、每个owned原件有独立保全副本与unlink原始回执。

没有归属/新文件/文件变化/未知path必须先核证停下；不能对全HOME、旧namespace、卷、private或archive执行删除。对象SQL引用须已按全库清理恢复到基线，所有API仍停；不先删对象再验证DB是否引用。

planOwnedStops70只生成exact PID SIGTERM意图，要求同namespace/instance、真实start identity/executable SHA/argv SHA、实际127.0.0.1已登记本批端口相等，拒绝PID复用和process-name杀进程。Root实际停止/退出/端口释放证据另存，候选不signal。

planOwnedContainerStop70在两库各120/532且双no-op、objects已保全清空、API已停之后，仅为同ID/labels/base/volume/25433的poms-r4def-pg15生成graceful stop意图。**保留容器/卷/private所有证据**，不remove资源。独立precision56 probe DB/role等按其原owned协议单独核销，不由本包删数据库或吞掉未完成的probe状态。

## 验证边界

作者只运行本地node语法、真实public catalog静态分析和明确标记PURE/STATIC的测试。抽象图/极限数字测试只是算法测试，不是制造真实F/D业务行或teardown验收。完整实际row graph、120表恢复、SQL/触发器行为、双no-op、字节保全/unlink及进程停止全部待Root实际执行。根目录manifest记录源hash和明确未跑状态，不声称G3/G4/部署/性能完成。
