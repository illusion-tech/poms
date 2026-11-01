# ZIP DOS UTC 与 K 单点逻辑引用比较契约

此纯 helper 不读取 env、文件、private、DB 或网络，不执行 HTTP，不授予 row
identity/ownership/cleanup 权限。Root 独占实际回执读取与 hash 校验、完整 capsule
和 ordinary birth/source-plan 证明、实际离线执行及 G3/G4。它不修改已有 AES/state
核心、mature reader 或其他共享源。

导出
`zipLogicalOriginalSourcePins`、`assertZipLogicalSourcePins(pins,scope)`、`verifyStoreZipUtcDos(input)`
和 `verifyKLogicalReferenceSite(input)`。两个函数共享
`{runId,sourceCapId,sourcePins}`；`sourcePins` 为该实际 source capsule 的完整
files metadata。只核该函数 scope 的具名 pin 恰好一次并 raw SHA
相同；此检查不意味着函数重新读取了源文件。

## STORE ZIP 的唯一 writer 时间

原 `AttachmentService.buildZipArchive` 在收集 manifest/payload 后只执行一次
`new Date()`，所有 local/central entry 共用该 UTC DOS time/date。它没有每成员
modifiedAt 输入；不能把 attachment.updated_at 或存储文件 mtime 当作 ZIP
的时钟。`package.created_at` 比 writer now 更早，必须分别维持原 manifest
的物理绑定与 writer 的真实窗口。

`package.created_at/expires_at` 先按完整 PG timestamp（1–6 位 fraction、明确 UTC
offset）解析为 BigInt 微秒，精确要求相差 `86400000000µs`。不能先用 Date.parse
截到毫秒再称24h exact；即使两端都投影成相同毫秒，1µs TTL 差也必须拒绝。manifest
的 `createdAt/expiresAt` 则单独核原 JavaScript Date 的毫秒 `toISOString()`
投影。回执明确区分 physical µs TTL 与 manifest ms projection；DOS 的两秒桶及实际
writer 毫秒窗口不变。

最小调用：

```js
verifyStoreZipUtcDos({
    runId,
    sourceCapId,
    sourcePins,
    slot: "M4.2.package.archive",
    archiveBytes,
    archiveLength,
    archiveSha256,
    packageRow,
    typedPackageProof,
    archiveContentProof,
    readMatureStoreZip: (bytes) => readMatureStoreZip({ sourceReader, bytes }),
    writer: {
        sourceMethod: "AttachmentService.buildZipArchive",
        context: actualPackageBirthCreateContext,
        window: { startedAt, finishedAt },
    },
});
```

`archiveBytes` 必须为实际完整 retained response Buffer，不能用 body UTF-8
文本替代。`archiveContentProof` 直接使用既有 `assertHandoverArchive` 对该同一
raw hash 的实际回执：完整 physical manifest、原 JSON
字节顺序、包含成员与真实上传源
bytes、敏感成员排除、selection/sourceRefs/package-items 均已证明。Root
不可只填写几个 true 标志来代替这次实际验证。

`typedPackageProof` 与 AES/state 核心的普通出生 envelope 相同：

```js
{
    kind: 'R2M-comparison-owned-row-proof',
    namespace: 'poms-r2m', runId, sourceCapId,
    ordinaryBirthVerified: true,
    ownedRow: actualJournalObject,
    creationProofSha256: canonicalSha256(actualJournalObject.creationProof)
}
```

Root 必须先证 ordinary SDK/PG authority、PK absence、outer
COMMIT、独立可见性和实际完整物理行。helper 再核 package table/id、完整 immutable
identity、固定 m4.integration、真实 birth kind/context，以及 Native SDK 的
matching outer-COMMIT context。具名 package producer 的实际 op 可为 m.http 或
m.producer，writer.context 必须逐项等于实际 birth context，不能改 op
或拿另一次请求的窗口代替。

writer.window 是包含创建该 archive 的原 source 调用的实际 canonical UTC 毫秒 ISO
时间。它不是后来下载 ZIP 的读取窗口，也不能从 package.created_at 或 header
值反造。一个 DOS 值代表 UTC 半开桶
`[bucketStart,bucketStart+2000ms)`；该桶须与实际写窗口相交。秒必须为0–58的偶数，年月日时分须为有效
UTC 日历值。

Root 注入的成熟 reader 仍负责原 STORE、UTF8、CRC、成员顺序、local/central/EOCD
解析。该 reader 返回 `{name,data,bytes,sha256,crc32}` 和 manifest，不返回 offset
或 DOS。helper 只在其实际结果上重建原 writer 的30B local、46B central、22B EOCD
固定布局，逐字核全部剩余字段、长度、CRC、偏移、成员 bytes 和 header；因此补齐
version/disk/attrs/reserved/DOS 等原 reader 没有单独检查的字节。没有第二套
inflate/parser，没有忽略任意字节，没有重试。

输出仅包含 raw hash、成员摘要、源窗口内的 DOS 桶，以及明确的 local
`offset+10/12`、central `offset+12/14` 四字节 comparisonSites。所有 site
由当前完整 bytes 与成熟成员顺序导出，不假设 reader 有 offset
字段。`wholeArchiveOpaqueAliasGranted:false`；Root 只能在该证据下处理这些具名
DOS cells，其余 manifest typed IDs、源 payload、header、checksum
仍按各自完整证明比较。

若成熟 reader 抛错，helper 只抛固定公开 message/code，原 Error 放在不可枚举
`cause`，供 Root 沿既有 private retainer 保全。不得把含 cause 的整对象或
inspector 输出作为公共失败回执。调用与 reader 只执行一次；传入原 Buffer
不被修改。

## K 唯一 no-row logicalReference

```js
verifyKLogicalReferenceSite({
    runId,
    sourceCapId,
    sourcePins,
    journal: actualFinalJournal,
    row: actualPhysicalReadinessRow,
    site: {
        table: "contract_readiness_package",
        rowId: actualPhysicalReadinessRow.id,
        column: "initialized_receivable_plan_version_id",
    },
    ordinaryBirthVerified: true,
    originalSourcePlanVerified: true,
});
```

两个 true 是 Root 已完成普通证明和原 source plan 重建/hash
核验的明确前置声明，不是 helper 发出的认证。Root 先核该实际 capsule、原
source-plan/body/hash、完整 journal/direct birth/独立可见性，再调用
helper。它接受已清理后的最终 journal 保留的原证明，但 `row`
必须来自对应阶段的实际物理事实，不得从 recipe 推造。

helper 要求新 M namespace/marker/DB/run，原 readiness 行唯一顶层列 site，ledger
的 `rowOwned:false` 与唯一 logicalReferences，sourcePlanSha256 等于原 wrapper 的
canonical SHA；originalKPlan 必须是具名原 draft source，保留
no-Native/no-synthesized-row 边界、未执行 SQL 的 pure plan、精确 reader/seeder
pins、SQL/rawSQL hash 和唯一原 UUID token 的 rowIndex/PK/column。wrapper 的全部
row PK 顺序必须等于原 INSERT token 目录。

整个 cohort 必须 promoted、before-all-PK-absent、COMMIT 已回或由成熟
xmin/xact-status 路径恢复、independentPostCommitCaptureVerified。每个原 PK
必须有 captured row、同 sourcePlan/transaction/xmin 的 ordinary direct birth
与独立可见性；readiness 的原捕获和当前物理 row 在精确
site、project/source-baseline identity
上一致。planned/executing/unknown/rolled-back/absent 都不能提供该比较依据。逻辑
UUID 不能是 run、seed/borrowed 或任意 owned row ID。

输出是 `{site:{table,rowId,column},comparisonSiteLabel,valueSha256,...}`，无
logicalId→通用 UUID alias map。仅 Root 在该 table+rowId+顶层 column 位置应用这个
source-logical label；移到其他表、其他列、JSON path、其他 row
的同值均不得使用。`logicalRowOwned:false/globalUuidAliasGranted:false/cleanupPermission:false/ownershipGranted:false`
始终保留。此回执不证明当前 Native handover confirm 已通过，该业务动作仍由 Root
原证明闭合。

## 测试与边界

测试抽取原 TS writer 三个完整方法，用 Fake clock 发射真实 STORE ZIP，再由原
mature reader 和既有 `assertHandoverArchive` 验证。K 用原 public pure planner
构造并重建同一 source plan，所有 journal/row 都是显式内存测试数据。未启动
child、browser、DB、HTTP 或读 private/env。

恶意用例覆盖相异 DOS、无效 UTC 日期、桶边界/窗外值、原
version/disk/attrs/header/trailer 篡改、完整 hash/length、reader
失败与突变、typed outer-COMMIT/writer index、错误 source-plan/边界/SQL/重复
token、未定或失败 COMMIT、cohort PK 遗漏、借用/owned 逻辑 UUID、错误或 nested
site。实际 API9/M5 完整比较和 G3/G4 仍由 Root/C 执行。
