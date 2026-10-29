# R2I #76 G0/G1 只读输入盘点（I 作者候选）

- 状态：**G1 候选输入，未宣布 G1 Pass；未开工、未运行产品或存储验收**。
- 取样基线：`61d6df1e971e7e785382dc85c75273e584ee2545`；分支 `codex/poms-r2ij-storage-attachments`。
- CWD：`E:/projects/worktrees/poms-r2ef-foundation-audit/poms`。此次输出仅本文件及 `i-g1-sources.json`；没有 Git mutation、DB、容器、服务、安装、真实外部网络或私密 env 读取。
- R2I 交付目标是 6 个既有 HTTP 操作及其真实 local/OBS provider authority。R2J 的 19 操作通过 I 的冻结端口消费对象存储。K/L/M、#61 和 R3–R5 不属于本片。
- 按计划 1.1/1.2/1.2.1：目标 `gpt-6.1-sol` / `max`，Fast 没有可确认控制参数，保持未核实；Root 统一 Cargo、Config、router、环境、fixture、运行验收与正式治理文件。
- 原字节和 CRLF→LF 后 UTF-8 SHA-256、六操作原始 inventory/当前 OpenAPI/全部 provider component schemas 在 `i-g1-sources.json`。这些是**源码证据**，不是实际存储运行证据。

## 1. 正式输入与 SSOT

1. 治理：`CLAUDE.md`、`.agents/skills/poms-implementation-governance/SKILL.md` 及 summary/source-map、`.agents/skills/poms-github-task-governance/SKILL.md`、`docs/design/backend-rust-migration-plan.md`。
2. 范围：`docs/design/rust-r2-scope-and-dependencies.md`、`docs/design/rust-r2-operation-slices.json` 的 `RUST-R2I`；canonical inventory 第 442–447 行。此处只取当前源码与当前 OpenAPI，不把旧 GH 证据重新归为本批证据。
3. 业务设计：`ex-65a-attachment-storage-provider-upload-session-baseline.md`、`ex-65b-attachment-storage-provider-config-runtime-baseline.md`、`ex-65c-attachment-storage-provider-runtime-baseline.md`、`ex-65d-attachment-upload-session-runtime-baseline.md`、`ex-65e-attachment-storage-provider-integration-closeout-baseline.md`，及各自相关 closeout；`fe-60a` 前端基线。EX-65D界定session创建冻结location与head/size/checksum检查，业务session实现仍归J。
4. HTTP/配置：`attachment-storage-provider.controller.ts`、`.service.ts`、`.repository.ts`、`attachment-storage-provider-config.entity.ts`。
5. Runtime：`attachment-storage-provider-registry.service.ts`、`attachment-storage.service.ts`、`attachment-object-storage-provider.types.ts`、`local-attachment-object-storage.provider.ts`、`huawei-obs-s3-attachment-object-storage.provider.ts`、`attachment.module.ts`。
6. 密文：`attachment-storage-provider-secret.constants.ts` → Nest `SecretCipherService`；Rust 已有 `auth::crypto::{SecretCipher, SecretCipherOptions}` 为唯一 AES 实现来源。
7. 契约：`libs/shared/contracts/src/lib/shared-contracts.ts` 第 3621–3768 行 → `libs/api/contracts/src/lib/attachment/attachment.dto.ts` → `libs/shared/api-spec/openapi.json` → generated client。命名、枚举、null/omitted、布尔强制转换、Zod 错误沿用原输入。
8. 持久化：`Migration20260511140000_ex65b_attachment_storage_provider_config.ts`、entity、repository；`platform-bootstrap.seeder.ts` → `dev-platform.fixtures.ts` → `PERMISSION_KEYS`；源码扫描 seeders 没有 provider config seed。
9. UI：原 `attachment-storage-provider-list.ts` / `card.ts` / 对应 specs、`attachment-storage-provider.store.ts`、presentation util、`apps/poms-admin/src/app.routes.ts`。不新造页面或改 generated client。
10. DB schema 观测不是本阶段任务。金额/decimal：N/A。本表 UUID 与日期/版本见下文，不能把 bucket/object key 当 UUID。

## 2. 六操作精确范围

所有操作均使用 `pomsSession`，要求 `platform:attachment-storage-providers:manage`；写请求还要求原会话/CSRF 规则。无 alias、无新增 route、无 legacy multipart 上传入口。

| Method / path                                                         | operationId                                                                   | Request / success                                                                           |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /api/platform/attachment-storage-providers`                      | `AttachmentStorageProviderController_listAttachmentStorageProviderConfigs`    | optional providerType/status/enabled；200 `AttachmentStorageProviderConfigList`             |
| `POST /api/platform/attachment-storage-providers`                     | `AttachmentStorageProviderController_createAttachmentStorageProviderConfig`   | `CreateAttachmentStorageProviderConfigRequest`；201 `AttachmentStorageProviderConfigDetail` |
| `GET /api/platform/attachment-storage-providers/{id}`                 | `AttachmentStorageProviderController_getAttachmentStorageProviderConfig`      | raw string path id；200 detail                                                              |
| `PATCH /api/platform/attachment-storage-providers/{id}`               | `AttachmentStorageProviderController_updateAttachmentStorageProviderConfig`   | `UpdateAttachmentStorageProviderConfigRequest`；200 detail                                  |
| `POST /api/platform/attachment-storage-providers/{id}:set-default`    | `AttachmentStorageProviderController_setDefaultAttachmentStorageProvider`     | `SetDefaultAttachmentStorageProviderRequest`；200 detail                                    |
| `POST /api/platform/attachment-storage-providers/{id}:testConnection` | `AttachmentStorageProviderController_testAttachmentStorageProviderConnection` | `TestAttachmentStorageProviderConnectionRequest`；200 test result                           |

OpenAPI path id 只声明 `type: string`，controller 无 ParseUUIDPipe；不存在 config 返回 404 `Attachment storage provider config {id} not found`。无效 UUID 的 ORM/DB 错误不得擅自增加新的 400 规则，具体协议由 Root HTTP 对照冻结。

## 3. DTO/响应约束

- provider type closed enum：`local`、`huawei-obs-s3`。status：`draft`、`active`、`disabled`、`misconfigured`。test status：`success`、`failed`。
- list 为完整数组，无分页；按 `createdAt DESC`，没有第二排序键。过滤 `providerType`/`status` 精确；enabled 的 Zod 是 `z.coerce.boolean().optional()`，因此非空字符串 `"false"` 与 `"0"` 都是 true，空字符串是 false。不要换成 `parse_bool`。
- displayName trim/min1/max128；endpoint trim/min1/max512；region max128；bucket max255；keyPrefix max512。可空的 endpoint/region/bucket/keyPrefix 区分 null/omitted；不是 URL 格式验证，不验证 bucket DNS，也不去掉 keyPrefix 的开头斜线后落库。
- create：providerType/displayName required；enabled/isDefault/forcePathStyle optional boolean，省略都 false；endpoint/region/bucket/keyPrefix 默认 null；AK/SK optional 非 nullable，trim/min1/max2048。
- update：providerType、isDefault 不在 DTO，未知字段沿 Zod object strip；displayName/flags/status/nullable location/nullable AK/SK 可选；必须至少一个可更新字段，只有 expectedVersion 不合法，错误 `At least one updatable field is required`。
- update/test/set-default 的 expectedVersion 为 optional positive integer；**省略允许**，不要新增必填要求。test/set-default body schema 只含 expectedVersion。
- update credential omitted 保留密文；explicit null 清除；提供字符串则重新加密；无论提供的新值是否相同，只要 credential 字段出现就更新 `credentialsUpdatedAt`。create 只有提供任一 credential 才置该时间。
- detail 与 summary 完全同一数据形状：id/providerType/displayName/status/enabled/isDefault/endpoint/region/bucket/keyPrefix/forcePathStyle/两个 configured booleans/credentialsUpdatedAt/rowVersion/createdAt/createdBy/updatedAt/updatedBy。无原文、密文、内部 object key 或永久对象 URL。
- 时间是 JS `toISOString()`（UTC 毫秒），数据库 timestamptz；rowVersion integer；createdBy/updatedBy UUID nullable。test result 仅 status/message/checkedAt。

## 4. 状态、默认、唯一性、版本和审计

`normalizeStatus` 的顺序是合同，不能替换成概念上的理想状态机：

1. `!enabled`：status 恰为 active 时改 disabled；总是清 isDefault 并 return。draft/misconfigured 可以保持 disabled=false 的未启用状态。
2. enabled 且 status=disabled：改 enabled=false、isDefault=false 并 return。
3. enabled 且 required fields 完整：draft/misconfigured → active。
4. enabled 且 required fields 不完整：只有 active → misconfigured，并清 isDefault；draft/misconfigured 保持原状态。

create 起始 status 是 enabled ? active : draft，然后走以上规范化。update 若 enabled=false 且未显式 status，先置 disabled 再 normalize；因此先前 disabled 配置仅提交 enabled=true 而不把 status 改出 disabled，会再次被关掉。create 的 `isDefault=true,enabled=false` 被清除，不是直接400；create enabled incomplete OBS 会得到 misconfigured，并非直接拒绝。

- local 的 missingOperationalFields 恒空；local 不允许 endpoint/region/bucket/任一加密 credential 的 truthy 值，报400 `Local attachment storage provider does not accept OBS endpoint, bucket or access keys.`。local 可配置 keyPrefix；源码没有拒绝 local forcePathStyle=true。
- OBS 必需 endpoint、region、bucket、encrypted AK、encrypted SK，顺序固定；检查的是密文是否存在，不先尝试解密。active 必须 enabled+complete，default 必须 enabled+active。
- 应用唯一性查询是 enabled=true + exact `(providerType,bucket,keyPrefix)`，不含 endpoint/region。冲突409 `Enabled attachment storage provider config already exists for {providerType}/{bucket ?? 'default'}/{keyPrefix ?? 'root'}`。
- DB partial unique `uq_attachment_storage_provider_enabled_location` 对 `(provider_type,coalesce(bucket,''),coalesce(key_prefix,'')) WHERE enabled=true`；因此 null/empty 在 DB 相同，应用 exact 查询不完全等价。并发 DB 唯一冲突需真实对照，不能只用前置查询证明竞态正确。
- DB partial unique `uq_attachment_storage_provider_default` 对 is_default，条件 enabled=true AND is_default=true；不是 status=active。第二 default 的事务顺序和索引竞态必须真实验收。
- create isDefault 时读取现有 enabled default，将旧 config 的 isDefault 清 false、updatedBy 改 operator，与新 config 一次 `saveAll`/flush。
- set-default：先 require + optional expectedVersion；非 active/enabled 报400 `Only active and enabled attachment storage provider config can be set as default.`；若目标已经是当前 default，原样 return，无 save、无 audit。否则旧默认降级+目标设default，一次 saveAll。
- update/test/set-default version 不等先409 `Attachment storage provider config version conflict: expected {expected}, actual {actual}`，之后才 mutation/provider I/O。rowVersion 由 MikroORM version mapping 管理；相同值/无有效 diff 是否 bump、DB 乐观锁 race 的异常形状留给 Root 实际对照，不宣称已测。
- migration 创建19列、UUID pk default gen_random_uuid、两 unique partial index、type/status 两普通 index、两个 enum check、表/密文列注释；不新建 schema、不做本批迁移更改。详见 manifest 的原始 migration 与 entity。
- migration up 给现有 platform-admin `role_permission_assignment` 补 manage permission，on conflict do nothing；down 仅 drop provider table，不删除权限 assignment。bootstrap permissions 取 shared PERMISSION_KEYS，因此包含该权限；没有默认 local/OBS config seed。
- create/update/default 的业务 saveAll 先 flush，随后单独调用 RuntimeAuditService，不传 EntityManager；该服务另一次 saveAll/flush。**现有代码没有把配置写与 audit 包成一个显式事务**。不能静默改变 audit 失败时配置已存的行为，Root 应冻结其兼容处理。
- audit events：`attachment-storage-provider.config.created`、`.updated`、`.default-set`；targetType `AttachmentStorageProviderConfig`；result success；before/after snapshot 含状态/location/configured booleans/credentialsUpdatedAt/rowVersion，不含 ciphertext、AK/SK；metadata 总带 secretRedacted=true，create/default 带 previousDefaultConfigId。no-op set-default 和 test 无 audit。

## 5. testConnection 的真实行为

1. requireConfig / expectedVersion 校验仍是 HTTP error 404/409。
2. 条件为 `!enabled || status===disabled`：返回200 `{status:'failed',message:'Attachment storage provider is disabled.',checkedAt}`，不触发 provider。
3. OBS missing required：返回200 failed，message `Attachment storage provider configuration is incomplete: {ordered fields joined ', '}.`。
4. 完整配置才 registry.testConfig，按该行直接构造 runtime config并解密；它不是读取当前 default。
5. local：生成 `.poms-storage-test-{randomUUID}`，mkdir parent、write `ok`、unlink，返回 success，message 中包含 root绝对路径；失败没有 finally cleanup，只由 registry catch 转成 failed（可能遗留探针）。
6. OBS：signed `HEAD` bucket，key=null；成功返回 `Huawei OBS S3-compatible bucket is reachable with the configured credentials.`。
7. registry catch 所有 provider/解密异常，Error.message原样为 failed message；非 Error 统一 `Attachment storage provider connection test failed.`。因此 test 的外部错误被包200 failed，而普通对象操作可产生404/502/未知500。
8. **测试不 mutate status/enabled/isDefault/credentialsUpdatedAt/rowVersion/updatedAt，不 save、不 audit**；它不把 misconfigured 自动修为 active。

canonical 第446行及 OpenAPI summary 仍保留 EX-65B 的“配置完整性”措辞；EX-65C baseline/closeout和当前源码已明确升级为真实local/OBS runtime探测。这是 `existing-baseline-drift`（描述过时），建议 Root 在本批 G1 明确以 EX-65C + 当前源码冻结，必要时更正文案；不创造新的route或status变化。

## 6. 密钥与 env/fallback

- 固定 envKeys 优先级：`ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY` → `POMS_SECRET_KEY` → `JWT_SECRET` → literal `poms-dev-secret-change-in-production`。取第一个 JS truthy（非空）的值；原 SecretCipher每次encrypt/decrypt读取process env，不缓存解析结果。
- AES-256-GCM，SHA-256(key source UTF-8)派生key，12-byte random IV，16-byte tag，`v1:{base64 iv}:{base64 tag}:{base64 ciphertext}`。decrypt出错是400 `Attachment storage provider secret is not readable.`，extra colon尾段沿原split取前四段规则，不新增strict parser。
- Rust `auth::crypto::SecretCipher::from_env(&snapshot, SecretCipherOptions{env_keys:Some(&[...]),default_value:None,unreadable_message:Some(...)})` 已能复用。I只建立本provider的options与封装，不新增AES，不改GH cipher/key。
- Root必须从已授权环境snapshot传入三项key，保留Debug脱敏；没有必要读取部署.env或真实OBS凭据。本阶段没有读取这些值。
- 没有 `OBS_ACCESS_KEY`、`OBS_SECRET_KEY` 或其他OBS环境凭据fallback；未配置default时fallback的是implicit local，不是自动构造OBS。
- local provider的root在实例创建时静态解析 `resolve(process.env['POMS_ATTACHMENT_LOCAL_ROOT'] ?? 'storage/attachments')`。env缺失才fallback，空字符串是当前工作目录；相对路径相对于进程CWD。后续改env不改变已构造实例root。Root需冻结这一启动时配置口径。

## 7. Registry 与真实对象定位

- putWithDefaultProvider / createUploadPlan：findDefaultConfig只查 enabled=true,isDefault=true；没有结果 → implicit local（id null/active/enabled true/all location与credentials null）。有结果但非active报400 `Default attachment storage provider is not active.`。
- 新对象key：先将反斜线改 `/`，去首尾 `/`；config prefix同样规范化，非空就 `{prefix}/{normalized key}`。不消除内层 `//` 或 `..`，不改变DB中prefix原值。
- location snapshot只有 storageProvider/storageBucket/storageKey；没有config id。创建upload session冻结该location，后续put/head/read/delete/presign**按此location解析**，不重选default。
- 历史local且bucket falsy：按 `(local,null)` 查所有configs；无匹配就implicit local。其他provider或bucket组合无匹配404 `Attachment storage provider config for {provider}/{bucket ?? 'default'} not found`。
- 历史query不查 enabled/status；先精确provider+bucket，然后prefix匹配 normalized key===normalized prefix 或 startsWith(prefix+'/')；无prefix匹配任意key。按**原始keyPrefix字符串长度**降序取最长；tie沿repository createdAt DESC的stable sort，无第二key。不能只比较规范化后长度。
- 因此 disabled配置仍可服务现有对象，且较旧但更长前缀胜过新短前缀；同location改endpoint/region/credential可影响全部历史对象。切default不改历史对象位置。
- object plan的sizeBytes目前未参与provider选择或分片；local mode=`proxy`，OBS=`presigned-put`。
- `readBuffer`消费全部stream后concat，没有额外I层size limit；`remove`吞掉registry全部delete错误，仅best effort，DB authoritative。

## 8. Storage facade 和本地文件语义

- saveOriginal：UTC yyyy/mm/dd + Node extname(originalName).toLowerCase()，空extension用`.bin`；key=`attachments/{yyyy}/{mm}/{dd}/{attachmentId}/original{ext}`。
- createOriginalUploadPlan：key=`attachments/uploads/{yyyy}/{mm}/{dd}/{sessionId}/original{ext}`，时间默认now；正常session流程使用这一key。
- saveDownloadPackage保留供未来K复用：key=`attachment-download-packages/{yyyy}/{mm}/{dd}/{packageId}/{safe filename}`；文件名中的`[\\/:*?"<>|]+`换`_`，空则`{packageId}.zip`，contentType application/zip。本批不增加K操作。
- openReadStream/readBuffer/remove兼容旧string location，归一为 `(local,null,key)`，不要把legacy string当路径直接绕过registry。
- local path：storageKey反斜线改`/`并去leading `/`，`resolve(root,key)`；只有abs===root或以root+系统sep为前缀才通过，否则普通Error `Invalid attachment storage key`。这是lexical path检查，没有realpath/symlink检测。
- **默认root本身是`storage/attachments`，key又以`attachments/`开头**，实际相对进程CWD的路径是`storage/attachments/attachments/{UTC date}/...`；不能改成单层目录。
- local put mkdir recursive + writeFile覆盖同名对象，返回provider local、bucket null、输入key；未写入contentType/checksum metadata sidecar。
- local read先stat（任何stat错误→404 `Attachment file {key} not found`），再createReadStream；后续stream错误沿原流失败语义，不能提前伪造成功字节。
- local head stat：sizeBytes=file size，eTag/contentType/checksumSha256=null，lastModified=file mtime.toISOString；包括resolveKey/permission/stat异常在内都catch→上述404。
- local delete仅unlink，不删除空目录；直接delete可抛原生FS错误，facade remove会吞掉。
- root路径、文件本体及mtime是运行资源；不属于DB事务。Root验收应比较真实文件字节、目录与metadata，不只mock调用。

## 9. OBS S3-compatible adapter 精确端口

**来源是 Node `fetch` + 手写SigV4，不是AWS SDK，不是axios。** 不复用 GH 的 UpstreamHttpClient默认21跳/axios错误/JSON转换/10s策略。

### URL与签名

- endpoint经WHATWG `new URL`，basePath去trailing `/`，保留endpoint query和URL的port；forcePathStyle=true：path=`basePath/encode(bucket)/encode(key)`；false：hostname前加`bucket.`，path=`basePath/encode(key)`或`/`。
- encodePath按`/`分段，去空段，用`encodeURIComponent`逐段后join；`!'()*`在path沿该函数原语义；URL最终pathname规范化由WHATWG URL执行。不能用SDK额外重写query/path。
- signed host来自`url.host`（包括非默认显式端口）；`hostname`加bucket后原port仍保留。Root需冻结HTTP loopback非标准port golden，不能签成不含port。
- signed request：method仅DELETE/GET/HEAD/PUT；空body用Buffer.alloc(0)，hash=SHA256(body) lowercase hex；headers基础host/x-amz-content-sha256/x-amz-date，contentType truthy才加content-type；PUT默认application/octet-stream，其余不设置body。
- signed header names lexicographic sort用`;`连接；canonical headers按key.localeCompare排序，value.trim()，每项带换行。普通请求canonical query直接`url.searchParams.toString()`（保留顺序，URLSearchParams编码），不是presign排序算法。
- canonical request `[method, pathname||'/', query, canonicalHeaders, signedHeaders, payloadHash].join('\n')`；scope=`YYYYMMDD/{region}/s3/aws4_request`；stringToSign AWS4-HMAC-SHA256；HMAC chain `AWS4SK`→date→region→s3→aws4_request。authorization含AK/scope/signedHeaders/signature。
- require endpoint/region/bucket/AK/SK missing分别502 `Attachment storage provider {field} is not configured.`（AK词是`access key`，SK词是`secret key`）。registry decrypt先于adapter验证。

### fetch、重试、超时、响应与错误

- 单次sendSignedRequest只生成一次时间和签名；循环复用同URL/requestInit/body/签名。不因retry或redirect重新签名。
- 最多3 attempts；只catch `fetch()` rejection，等待250ms、500ms；任一HTTP response立即退出loop，404/403/429/500都不进行应用层retry。
- 所有rejection最终502 `Attachment storage provider request failed: {METHOD} {original url.pathname} could not connect to endpoint: {description}`；description按顶层message / cause.code / cause.message提取非空string并用` / `连接，缺省unknown network error。不套axios error shape。
- 源码没有显式signal、dispatcher、redirect、request总timeout或proxy配置。**不能将此描述成无限网络超时**，Node/Undici自身有transport defaults。
- 有限只读native source提取（无request）观测当前本机Node v24.19.0 / built-in Undici7.29.0：redirect默认follow，最大20跳；301/302只将POST→GET，303将非GET/HEAD→GET并去body；跨origin移除authorization/proxy-authorization/cookie/host；headers/body defaults300000ms，connector default10000ms。native源码及node.exe hash进入manifest；这不是验收服务环境的runtime证据，Root应复核目标Node/dispatcher，冻结fetch-compatible transport，而非沿用GH policy。
- HTTP404先映射404 `Attachment storage object {key ?? bucket} not found`；其他非response.ok(2xx)→502 `Attachment storage provider request failed: {METHOD} {original pathname} returned {status}{optional space+safe message}`。
- safe error body：`response.text()`，collapse JS `\s+`→space、trim、`.slice(0,300)`（UTF-16 code units），读取失败变空；这不是JSON专用解析。GET response没有body→502 `Attachment storage provider returned an empty object stream.`。
- GET把Web response.body转Node Readable流；body消费阶段错误不在fetchWithRetry捕获范围内，不能整流缓存后自动retry或改成JSON文本。
- HEAD content-length先`Number(value ?? 0)`，非finite才0（JS Number语义）；eTag/lastModified/contentType保留header原值；checksum优先x-amz-meta-sha256，null才fallback x-obs-meta-sha256（空值仍不fallback）。
- PUT/DELETE只要求2xx；read/metadata location使用registry解析后的config bucket，不取不相关当前default。

### presigned PUT

- 不做网络请求；与普通请求共用buildObjectUrl和SigV4 key；now独立于传入expiresAt。
- `expiresInSeconds=max(1,min(3600,floor((expiresAt-now)/1000)))`，但返回expiresAt仍是**原请求expiresAt ISO**，不是clamp后的时间。
- headers含host，truthy contentType/sha256时同时签content-type / x-amz-meta-sha256，返回upload headers仅含后两者；没有authorization/host返回。
- query set X-Amz-Algorithm、Credential、Date、Expires、SignedHeaders；保留endpoint原query，canonical query按key/value localeCompare排序，再RFC3986风格query encode（额外编码`!'()*`）。canonical payload `UNSIGNED-PAYLOAD`，最后set X-Amz-Signature。
- presigned URL query含AK id/scope，这是既有契约；“不泄露credentials”具体指不返回SK、明文AK/SK配置或authorization header，不能误删X-Amz-Credential。

## 10. 原UI/store/test线索与缺口

- 原配置页route `/platform/attachment-storage-providers`，requiredPermissions manage；store只消费generated client六接口，finally清loading/saving/testing/defaulting signal。保存/切default后reload；test结果只驻留页面signal，不reload config。
- 原UI固定local与OBS两张卡；按providerType构造Map（同type多配置可能覆盖），不等于后端仅允许一行/type。I保持后端真实location唯一性，不由卡片推导额外限制。
- edit展示的AK/SK输入为空；空白不发字段，保留旧密文；保存并测试使用保存响应中的rowVersion；set-default/test都传expectedVersion。
- UI能否set default由enabled&&status===active且非default决定；UI强制完整OBS字段的校验比服务的misconfigured归一化更严格，不反向修改服务规则。
- 已读backend source tests：controller delegation2、service6、registry5、OBS6（global fetch mocked）、local3（临时真实FS，源码如此但本次未执行）；SecretCipher specs为来源。UI list10、card5为源码线索。测试数为it静态计数，**不是本次通过数**。
- 当前测试没有完整覆盖：expectedVersion省略/错型/无效UUID、所有normalize分支、disabled re-enable陷阱、null/empty唯一性、并发default/位置、audit第二flush失败、endpoint query/port/redirect/timeout、HTTP非2xx不retry、流消费错误、presign时钟/clamp、相同prefix/tie、UI同type多location。Root统一设计必要对照用例。
- 不读取或引用历史真实OBS凭据；旧EX-65E真实租户未运行的例外不能写成此次已验证。loopback真实S3-compatible fixture若验收成功，也应标为隔离真实HTTP对象协议，与真实华为租户区分。

## 11. 未来独占范围与I→J Rust接口候选（待Root G1冻结）

I独占 `apps/poms-api-rust/src/attachment_storage/{mod,model,validation,store,service,http,registry,local,obs_s3}.rs`；I负责六操作、真实adapter、runtime配置authority和SecretCipher选项。J不复制provider config查询、default选择、历史prefix路由、解密或SigV4。Root拥有Cargo/lock/toolchain/lib/router/Config/env、完整OpenAPI、fixture、验收和治理文档。当前不创建这些产品文件。

建议向J导出 `Arc<AttachmentStorage>` 及以下纯类型（field名内部snake_case，序列化仍camelCase）：

```rust
pub struct ObjectLocation {
    pub storage_provider: String,
    pub storage_bucket: Option<String>,
    pub storage_key: String,
}
pub struct UploadPlan { pub location: ObjectLocation, pub upload_mode: String }
pub struct ObjectMetadata {
    pub size_bytes: f64, // 保留JS Number/HEAD容错；J自行对业务整数size检查
    pub e_tag: Option<String>, pub last_modified: Option<String>,
    pub content_type: Option<String>, pub checksum_sha256: Option<String>,
}
pub struct PresignedPutTarget {
    pub method: String, pub url: String,
    pub headers: std::collections::BTreeMap<String, String>, pub expires_at: String,
}
```

所有可失败端口返回原 `crate::error::ApiError`，由I映射404/400/502/unknown500，J传播，不换成通用gateway错误；stream为`axum::body::Body`，避免I把全量GET缓冲才返回。bytes用`&[u8]`/`Vec<u8>`，时间参数`chrono::DateTime<Utc>`。

```rust
async fn create_original_upload_plan(&self, session_id: &str, original_name: &str,
    size_bytes: f64, created_at: Option<DateTime<Utc>>) -> Result<UploadPlan, ApiError>;
async fn create_presigned_put_target(&self, location: &ObjectLocation,
    content_type: Option<&str>, checksum_sha256: Option<&str>,
    expires_at: DateTime<Utc>) -> Result<PresignedPutTarget, ApiError>;
async fn save_upload_session_object(&self, location: &ObjectLocation,
    body: &[u8], content_type: Option<&str>) -> Result<ObjectLocation, ApiError>;
async fn head_object(&self, location: &ObjectLocation) -> Result<ObjectMetadata, ApiError>;
async fn open_read_stream(&self, location: &ObjectLocation) -> Result<axum::body::Body, ApiError>;
async fn read_buffer(&self, location: &ObjectLocation) -> Result<Vec<u8>, ApiError>;
async fn remove(&self, location: &ObjectLocation); // best effort，无Result
```

I内部另保留save_original(attachment_id,original_name,bytes,uploaded_at)和save_download_package候选能力，不新增legacy HTTP上传或K操作。Root需统一注入`PgPool + env snapshot + resolved local root/working directory`；I在同一个内部authority中建立store/registry/transport。构造时不连接外部存储，test动作才探测。

J补充了原Nest/Express源码中的流错误边界：headers未发时400并以既有MIME/disposition发送err.message文本；headers已发则end，destroyed不处理。上面的裸Body候选不能在response已经交出后改status；Root应冻结I/J stream adapter：例如预读首chunk仅捕获首个流错误，其余继续stream，并区分provider正常404/502与预发送流失败；不能全量缓冲来宣称stream兼容。该信息由J的独占源码盘点提供，正式hash/evidence由J清单承载。

stream返回后body error传播、SQLx事务生命周期、异常redaction细节需Root在G1定稿。依赖建议仅在Root同意后改Cargo：tokio fs或spawn_blockingFS、reqwest stream feature、必要stream适配；HMAC可复用现有openssl，不强加新的SDK/AES。

## 12. 全局副作用与恢复范围（供Root验收计划）

- **全局default是整张表唯一默认，不是测试用户级别。** 创建isDefault或set-default会demote任意原默认，并增加旧行版本/updatedBy/updatedAt；只删除测试config不足以恢复。隔离副本中完整snapshot/restore provider config（包括原default、version、timestamps、ciphertext），不要通过“再次set-default”假装逐字恢复。
- 启用冲突的唯一性横跨所有用户，fixture应使用专属bucket/keyPrefix或完整隔离表；禁止通过停掉原default腾位置影响并行J验收。default切换测试与J新session计划冻结需串行或明确同步点。
- 任何测试创建的session/attachment/object引用provider location时，清理顺序要在对象读取/回滚验证完毕后；provider config先删可能使OBS对象再也解析不到。I/J共用同一受控env、数据库副本、local root与对象fixture；不新起作者私有服务。
- provider config命令会写audit_log，认证/拒绝会写session、安全事件等，Root负责整个fixture影响图恢复；本阶段不执行restore或DBSQL。
- local使用独占临时绝对root。root可由testConnection创建，probe异常可能遗留，mkdir不会自动撤销；验收后按前后清单只清测试root，保留其他文件、目录mtime和原root。不得触及真实storage/attachments。
- OBS fixture专属bucket/prefix/object inventory，PUT会覆盖同key，DELETE不可自动恢复；前后hash/metadata及restore receipt由Root负责。presign本身不写对象；浏览器直传会。bucket HEAD只网络读；HTTP失败场景与retry必须记录真实attempt数。
- env只用Root快照/进程注入，不改机器env或部署env；local root在实例构造时固定，SecretCipher key与Node transport环境按对应进程冻结。fixture停止/服务清理由Root集中执行。

## 13. 给Root的G1裁决点

1. 按上述六操作、原状态归一化、SecretCipher三key优先级、location snapshot和I/J端口冻结；确认无API/DDL扩展。
2. 将canonical/OpenAPI对testConnection的旧说明归类 `existing-baseline-drift`，正式基线明确当前真实探测，不将它变成状态更新命令。
3. 冻结**fetch兼容**transport：20跳、跨源敏感header移除、原签名不重签、网络异常3次/250+500ms、HTTP错误不重试、源环境timeouts的可复核口径。当前本机native源仅辅助；Root运行环境仍需证据。
4. 冻结config flush先于audit flush的原行为、no-op rowVersion的实际对照以及default唯一性竞态处理；不要凭作者猜测“改好”后宣称兼容。
5. Root统一isolated local/OBS HTTP fixture、default/session串行边界、真实文件与对象元数据验证、全影响图restore；无真实华为凭据不妨碍准备本批，但真实租户烟测须保留未执行标签。

本盘点可供Root编制正式G1基线；上述裁决未完成前仍保持Todo/G1待定。不存在本次mock通过、真实文件通过、OBS通过、HTTP通过或G4完成声明。
