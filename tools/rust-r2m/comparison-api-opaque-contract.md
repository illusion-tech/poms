# API9/M5 AES 与 OAuth state 有限比较契约

此 helper 为纯函数，只比较 Root 传入的完整值。它不读取
env、文件、private、数据库或网络，不授予 ownership，不把输出当作 actual/G3
验收。Root 独占实际证据读取、原始回执 hash 校验、普通出生证明核验和最终比较。

`comparison-api-opaque.mjs` 导出
`opaqueOriginalSourcePins`、`assertOpaqueSourcePins(pins)`、`verifyEncryptedField(input)`
和 `verifyOAuthStateFlow(input)`。两个验证函数共享
`{runId,sourceCapId,sourcePins}`；`sourcePins` 可直接用实际 source capsule 的
`files`。10 个具名 pin 必须各出现一次且 raw SHA 相同；其余 capsule
输入允许存在。pin 表本身不意味着 helper 重新读取过当前文件。

## 普通 typed 出生证明边界

Root 先核验实际 journal/SDK 或 PG authority、原 PK absence、外层
COMMIT、独立可见性、所在 source case、全行与不可变 identity。随后为本 helper
构造：

```js
const typedProof = {
    kind: "R2M-comparison-owned-row-proof",
    namespace: "poms-r2m",
    runId,
    sourceCapId,
    ordinaryBirthVerified: true,
    ownedRow: actualJournalObject,
    creationProofSha256: canonicalSha256(actualJournalObject.creationProof),
};
```

这里的 `ordinaryBirthVerified` 是 Root 已完成普通证明的显式前置声明。helper
仅再核原对象、table/id、完整不可变 identity、固定 source
case、真实证明种类、摘要和 create/outer-COMMIT 的 run/case/index/op
一致；它不替代 journal 的 authority 核验。canonical SHA 使用 fixture-core
原递归排序 JSON 算法。API M4/M5 仅接 `m4.integration`/`m5.integration` 的
`m.http` 出生；base admin 仅接 before-absent direct committed
row，用户名必须为原 `fixtureCredentials(runId,'admin')`。

## 五个加密字段

`verifyEncryptedField` 额外参数为
`{table,column,row,typedProof,slot,expectedPlaintext,valueBytes,keySources,controlledTokenProof?}`。`row`
是实际完整物理行；`valueBytes` 是该原字段完整 UTF-8 Buffer。只允许以下 source
slot：

| table.column                                                   | slot                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| attachment_storage_provider_config.encrypted_access_key_id     | inputs.obsProvider.accessKeyId                                                    |
| attachment_storage_provider_config.encrypted_secret_access_key | inputs.obsProvider.secretAccessKey                                                |
| identity_provider_config.encrypted_client_secret               | inputs.identityProvider.clientSecret / inputs.identityProviderUpdate.clientSecret |
| identity_provider_oauth_grant.encrypted_access_token           | controlled.feishu.oauth.access_token                                              |
| identity_provider_oauth_grant.encrypted_refresh_token          | controlled.feishu.oauth.refresh_token                                             |

前三个 expected plaintext 必须等于该 run 原 `syntheticInputs` 的精确公式。OBS
provider type 必须为 `huawei-obs-s3`。local provider 对应两个
`inputs.localProvider.*` slot 只接受物理
`null`、`expectedPlaintext:null`、`valueBytes:null`，回执保留 literal null 且
`semanticAlias:null`。其他 NULL 由 Root 字面比较；不能用此通道转成 secret
alias。

`keySources` 只接受该域原具名键及 string/null/undefined。cipher 按原顺序选择首个
truthy string（不 trim）：attachment 的
`ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY/POMS_SECRET_KEY/JWT_SECRET`，identity 的
`IDENTITY_PROVIDER_SECRET_KEY/JWT_SECRET`；均没有时使用原 public
default。验证完整 `v1:IV:tag:ciphertext`、标准 base64 的原发射字节、12B IV、16B
tag、AES-256-GCM authentication，以及精确 source plaintext。回执只包含具名
slot、hash、方案与 verified 状态，不含 key/plaintext。

grant 的 `controlledTokenProof` 形状：

```js
{
    kind:'R2M-comparison-controlled-feishu-token',
    namespace:'poms-r2m',runId,sourceCapId,
    configRow,configProof,operatorRow,operatorProof,
    peer:{
        sourceServerSha256,sourceRecordSha256,
        method:'POST',path:'/oauth/token',mode:'normal',
        appId:configRow.client_id,
        syntheticCredentialVerified:true,syntheticCodeVerified:true
    },
    responseBytes, responseSha256, status:200 // 仅有完整原 response 时才提供
}
```

Root 必须先将 `peer` 字段与 hash 所指的实际受控 peer record 和 normal plan
逐值绑定，核验原 source、typed config/appId、请求 credential/code 成功标志。原
peer 只保留 sanitized request 与标志，没有 raw token response。helper
据原固定响应公式验证解密后的 access/refresh token；若 Root 没有真实完整
response，不提供三个可选字段，回执明确
`controlledRawResponseVerified:false`。若提供，则整个原 JSON response bytes
逐字验证。不能生成一个推断 response 后称其为实际 raw evidence。

## OAuth state 两条链

`verifyOAuthStateFlow` 仅接受 slot `M5.1.grant-authorize.state` 或
`M5.1.authorize.state`：

```js
{
    ...common, slot, issuedStateBytes, configRow,configProof,
    operatorRow,operatorProof, // 仅 admin-grant 有；login 无 operator
    keySources,authorizeWindow:{startedAt,finishedAt},stateExpiresAt,
    callback:{
        method:'GET',status, stateBytes,codeBytes,expectedCodeBytes,
        requestPathBytes,window:{startedAt,finishedAt},
        responseBodyBytes,responseBodySha256
    }
}
```

每个 bytes 字段为完整原 Buffer；window 为实际 canonical UTC 毫秒 ISO
时间，不能虚构更窄的 Date.now。state key 使用原 nullish 顺序
`IDENTITY_PROVIDER_STATE_KEY ?? IDENTITY_PROVIDER_SECRET_KEY ?? JWT_SECRET ?? publicDefault`，因此空字符串会被使用。先
SHA256 成 32B key，再校验 HMAC-SHA256；必须是原 emitter 的 canonical
base64url、精确 JSON 字段和顺序、精确 purpose/config/operator、16B
nonce。`exp-600000` 必须落实际 authorize window，`stateExpiresAt` 必须等于该 exp
ISO。

callback 必须重用同一完整 state 与 Root 已证受控 code；只允许原具名 callback
path、恰好一个 code/state query，无额外 query/fragment，并逐字核原 supplier 的
code→state 顺序及 URLSearchParams 发射字节。admin-grant 保持原302，login
保持原200。callback 开始不得早于 authorize 完成或已到期；若实际回调窗口跨
expiry，只标记跨越，不编造窗口内的具体校验时刻。原服务会在 callback
的某一时刻检查 expiry，成功状态及原证据仍由 Root 严格核验。完整 response body
hash 只建立回执绑定，绝不归一或跳过其 body/header 比较。

返回的 `semanticAlias` 只能用于此次已证具体字段/state slot；其余
token/hex/SHA、随机字段、body、header 均不得因此忽略。所有异常均为固定
code/message，无输入 secret；调用方仍需按既有新 M private retainer
保全原读取/传输错误。

## 本候选验证与剩余项

pure tests 从实际原 TS 抽取 cipher 和 state emitter/consumer，在隔离 VM 内注入
Fake env、固定 RNG/clock；实际 crypto 认证与恶意输入用 Node
实现。没有启动实际服务、进程 owner、浏览器或数据库。ZIP STORE 的 DOS UTC
两秒桶、K 唯一 logical receivablePlanVersionId 不在本候选，仍需 Root
具名后续证明；不能把本核心回执称作 API9/M5 完整比较已通过。
