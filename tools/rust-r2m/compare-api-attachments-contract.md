# M4 附件离线比较：来源与最小输入协议（source candidate）

新 `compare-api-attachments.mjs` 将静态派生 Root 已签21181B比较器（SHA
`60c09334ae4ca34dc24616b07c0e1b269decff6f7a424b835d13f3513f7fd697`），保留完整旧
body 与逐文件 diff。原 `compare-api.mjs`、B five、已签
AES/state、ZIP/K02、domain-clock02 和 Windows union
都不改。本输入协议与随后代码是 source-only 候选；尚未进行任何私有证据比较。

仅支持 Source08 的 M4.1–M4.4。完整107表/每列、outside-scope baseline、typed
actual birth、source-input
字面值、原错误和版本、副作用、数组顺序均严格保留。未知字段不按名字或形状归一；unknown
protocol/header 必须先有具名来源或保留为差异，不能泛用 Opaque/At$。

## Root 最小安全 metadata

实际 pair 完成后，Root 提供一个不可变公开 descriptor，字段不含
Cookie/密钥/密文/原始 body 值：

```js
{
  kind:'Root-R2M-M4-offline-comparison-input',
  sourceCapId, selection:['M4.1','M4.2','M4.3','M4.4'],
  sides:[{
    backend:'nest'|'rust',tag,runId,
    report:{file,bytes,rawBytesSha256},
    owner:{file,bytes,rawBytesSha256},
    cap:{file,bytes,rawBytesSha256},
    journal:{file,bytes,rawBytesSha256}
  }],
  dtoSites:[{stepId,path,table,identityField,sourceCase}],
  responseShapes:[{stepId,method,pathTemplate,status,bodyKind,headerNames}],
  recordKinds:[{kind,count,recordKeys}],
  preparedShapes:[{sourceKind,planKind,rowTables,hasSourcePlanId}],
  actualSource08Manifest:{file,bytes,rawBytesSha256}
}
```

`dtoSites.path` 为实际 body 中具名对象/数组位置，定位真实 physical table；id
可为 `id/sessionId/packageId` 等原字段，必须由实际形状确定，不能凭猜测。clock
DTO 字段只沿原 Attachment/provider/UploadSession/package mapper
的列目录，不用递归 `At$`。metadata 中无需输出其实际值；Root 执行时从各原 raw
frame 中读取。

另需安全形状确认：原 K cohort 的实际 wrapper/direct capture、native confirm
写入表与 clock 字段、完整 presigned upload-target 层级和 header key 名、package
manifest/selection/sourceRefs 的实际嵌套位置。缺字段时工具应保 required-proof
failure，而不是填 NULL/空集合或跳步骤。

## 实际入口和受限读钥

计划 CLI 只在 Root 显式 `--run` 后读本次 new-M 原件；`--check` 只核公开
source/descriptor，不打开 private/env/DB。实际模式固定 Linux M cwd，并且只接受
`tmp/rust-r2m/` 下的具名 descriptor 与新 analysis tag；输出 wx，不覆盖旧结果。

公有 report/owner/cap 与原 report 的 case raw refs、final cleaned journal 都按
descriptor/raw hash/完整 bytes 验证。private 只允许 descriptor 中两个固定 run 的
`acceptance-runs/<backend>-<run>/NNNNN.json`、`m-runs/<backend>-<run>.json`，以及必要的
fixed managed env。父目录与叶子 lstat 拒
symlink、private0700/file0600、single-link、nofollow fd/same-inode、读取前后
metadata/hash不变。不得泛搜其他 run/旧 private。

AES key 只由 Root actual CLI 调既有
`managed-environment.cjs.loadManagedEnvironment` 获取，mode/backend 固定，env
path 只能是新 M
`/home/wangzishi/.local/share/poms-r2m/private/{nest,rust}.env`；不接受 argv key
或任意 env 路径。调用前拒 case-insensitive ambient
PG/DB_/MIKRO/DATABASE_URL/JWT_SECRET/NODE_OPTIONS。只把
`{ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY,JWT_SECRET}` 的实际值传入 pure
core，其余 DB/env值不输出、不序列化、不写公共 receipt；不写 process.env。loader
的完整 namespace/role/port/no-symlink guard 沿原代码执行。作者不执行此路径。

## 必要比较桥

- AES：仅两个 attachment provider encrypted_* 字段，沿已签
  `verifyEncryptedField` 原接口；本侧 source08 synthetic 输入先核实际 typed
  row，再认证解密，literal NULL 保真。M5 cipher/state不接本候选。
- 生成域 clock：沿 domain-clock02 的
  actual-runtime/recordMutation/recordLiteralMutation 原接口。Attachment 的
  uploaded_at/created_at/初始 updated_at 源于实际 upload
  session.uploaded_at，必须先与该真实源版本相等，再用实际 PUT source
  window；不得假称它们在 complete 时重新产生。
- K：Root 已裁由本 core 的 exact-owned-K adapter 消费真实
  wrapper.originalKPlan、原 j/sourcePlanSha/direct capture，不克隆改写
  journal，不给 domain-clock02 传假 K origin。原 SQL 显式时间列逐值验证；遗漏
  created_at/updated_at 仅按真实数据库 default/source-bound
  观察区间校验。源步骤未留更窄窗口时，如实使用已知 owner interval，不虚构
  step.window。
- draft customer/project：重放原 DEV constructor 与原 scalar field
  map，核完整计划和实际 direct capture；只为被原 source 确认的具体列登记 input
  slots。B five 自有 adapter 尚非本工具依赖，不导入其候选代码。
- K logical UUID：仅在已签 `verifyKLogicalReferenceSite` 返回的 table+rowId+顶层
  column 位置应用 label。绝不把该 UUID 放入 owned/global alias map。
- ZIP：真实完整下载 bytes→原 mature STORE/CRC/manifest/source payload 验证→已签
  DOS/physical TTL µs helper。只在实际 source/writer interval 下处理明确 header
  sites；不把 ZIP 当任意 blob drop。
- payload：本侧先重建 source08 `uploadInputs(runId)`，versionPositive 使用
  version 原 bytes、只有名称独立。完整下载/ZIP成员必须逐字等 source
  bytes，之后只有对应具名 checksum slot 可映射。普通 PUT 当前原 raw frame 没有
  materialized request.body；不能冒称读过不存在的 raw 上传体。它的 source
  sender+actual object SHA/size 证明与实际完整下载字节证明分列。若 Root
  有其他真实上传体帧，再按其原引用补接。
- OBS：完整 target URL/headers 必须与实际 typed session/key/provider、原 SigV4
  canonical/HMAC和真实 peer event/source
  payload绑定；只有已证具名协议单元可投影。不得仅凭64hex形状替换
  signature/checksum，也不归一未知 query/header。
- 原 M4 negative：完整保留
  version-complete500、uploaded/v2→validating/v3、failed_reason=NULL、无新附件/复制链接；prepared
  positive 必须是新的唯一 session/PUT、原已证旧附件精确 is_latest=false
  mutation、真实200/outerCOMMIT及每条 copied link。不能把它写成原 J 自然成功。

## wire 与公开结果

原运行记录完整 `response.bodyBytes/length/SHA`、`response.headers` 与
setCookie；没有 rawHeaders 数组，所以不能称 header wire order 已捕获。每个
response 先核完整原 bytes，再对 JSON
的全部实体字段严格比较；binary/ZIP沿具名原字节验证。原8的
functional四header（content-type/content-length/content-disposition/x-request-id）继续显式比较；其余真实
header 名和值/hash保存在原件，已知
framework/缓存/连接差异必须明确分类，未知名不静默丢弃。R1A additive
header独立列差异。

公共结果只列 count、路径、hash、有限 source marker
与差异类别；原值/密钥/token/原 Error 只在新 M private
retainer。失败不是自动产品差异，不允许 source-proof 缺失后再把部分投影称通过。M5
本轮仅记录后续所需 metadata，等待 Root 的真实三项数据，不挤入 M4
第一可执行候选。
