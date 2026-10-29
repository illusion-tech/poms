# R2I/J 存储端口与 fetch transport 只读设计

- 基线：`61d6df1e971e7e785382dc85c75273e584ee2545`，分支 `codex/poms-r2ij-storage-attachments`。
- 状态：G1 候选共享输入；本文件不宣布 G1 Pass，不含产品实现或运行验收。
- 本次只写此文件。未改产品、Cargo、旧证据；未运行 Cargo/build、数据库、容器、服务、安装或网络请求，也未读取私密 env。
- 正式语义源仍为 `i-g1-input.md` 与 `i-g1-sources.json` 的 I6/J19 当前源码、DTO/OpenAPI/canonical 来源。本设计细化端口；与 Root/J 最新协同一致，取代早期“I 层预读第一块”与“所有错误只返回 ApiError”的候选。

## 1. 结论与最小 Cargo 需求

现有锁定 `reqwest 0.13.5`、`openssl 0.10.81`、`tokio 1.54.1`、`url 2.5.8` 足够构成真实 local/S3-compatible adapter、SigV4、网络请求与逐块返回的基础。需要显式补齐本地异步 FS 与流组合能力；**现有 reqwest 默认行为本身不等于 Node fetch 兼容**。

Root 已采纳的最小改动候选（仅 Root 在 G1 Pass 后编辑）：

```toml
# 原 tokio features 保留，只追加 fs。
# 新 direct dependency；版本已经存在 Cargo.lock，不增加 package 版本。
futures-util = { version = "=0.3.34", default-features = false, features = ["std"] }
```

- `tokio/fs` 提供 metadata/create_dir_all/write/remove_file/File；现有 `io-util` 提供 AsyncReadExt::read。`fs` 是空 feature 开关，使用已有运行时的 blocking pool，不需要 full。
- `futures-util/std` 已包含 alloc；`stream::try_unfold`、`StreamExt::next`、once/chain在已读源码中不依赖 async-await-macro。可给 I/J/Root 共用；不需要完整 futures、futures-executor 或 futures-macro。
- `reqwest::Response::chunk(&mut self)` **没有 stream feature 门**。用它与 try_unfold 即可保留网络流与背压；不需要先 bytes() 全量缓存。
- `reqwest::Response -> reqwest::Body` 的 From 实现也未受 stream 门控制；`axum::body::Body::new(reqwest::Body::from(response))` 可直接桥接 HTTP Body。若需要统一错误/读取 timeout，使用 chunk+try_unfold更方便。
- local用 `tokio::fs::File` + `AsyncReadExt::read` + try_unfold，产生 `Result<axum::body::Bytes, StorageFailure>`，交 `Body::from_stream`。固定小块缓冲即可，不全量读取后伪装stream。
- Root首块预取与重放可用 Body::into_data_stream + StreamExt + once/chain，因此不必再加 direct http-body。若实现改用 custom poll_frame，则需 name Frame/SizeHint，可选已锁定 http-body=1.1.0；两种方案无需同时添加。
- 不需要 AWS SDK、axios层、hmac crate或第二套 AES。HMAC用现有 OpenSSL `PKey::hmac` + `Signer::new(MessageDigest::sha256(), ...)` / update / sign_to_vec；SHA256用现有sha2或OpenSSL。密文复用 auth::crypto::SecretCipher。
- reqwest stream feature是便利选项，不是当前最小需求；它会同时激活 tokio/fs、futures-util、tokio-util/io及 wasm-streams feature边。直接调用 transitive crate仍需相应 direct dependency声明，不能因缓存/lock里有而隐式使用。

上述两项最小改动覆盖真实FS和普通/单层已支持编码的网络流；它**没有自动解决第5节列出的 Node 扩展压缩差异**。若实际Nest对照失败，需按该节补显式decoder；不能只用源码/编译通过宣称完整fetch兼容。

## 2. Root 接线和构造边界

模块公开 `crate::attachment_storage::{AttachmentRuntimeSettings, AttachmentStorage}`。

```rust
impl AttachmentRuntimeSettings {
    pub fn from_map(values: &HashMap<String, String>) -> Self;
}
impl AttachmentStorage {
    pub fn new(database: Database, settings: AttachmentRuntimeSettings) -> Self;
}
// I HTTP 模块提供：router(AuthHttpState, Arc<AttachmentStorage>)、normalize_uri、openapi。
```

- Root拥有 Config字段 `attachment_storage: AttachmentRuntimeSettings`，在 Config::from_map注入；Root负责router/lib/OpenAPI公共接线、Cargo/lock及环境fixture。
- I定义settings及存储authority。settings保存明确快照、local root原始值和cipher选项；Debug不泄露任意env字符串、密文、headers、AK/SK。不得把 GH provider-specific HTTP policy当作附件policy。
- SecretCipher key顺序：ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY / POMS_SECRET_KEY / JWT_SECRET /既有dev fallback。配置写和历史位置解密共用I的cipher实例，不改GH cipher。
- new/from_map保持pure：不 mkdir/stat/读env文件/访问DB/签发网络请求/连OBS；从传入map取值。默认root为相对进程CWD的storage/attachments，空env值仍表示CWD。Root可在启动构造边界提供/冻结working directory；构造时只做lexical绝对化，不访问文件系统。
- 新配置endpoint允许原DTO接受的任意trim非空字符串。不得在pure构造时统一预验证所有DB端点、强制所有历史config active、检查凭据连通性。
- I独占六配置操作+registry+local/OBS+facade；J只用以下ports，持久化location snapshot，不自行查询default、匹配prefix或解密。I的DB查询时序仍按原源码，不把对象操作强行纳入J SQL事务。

## 3. 可落地 I→J 存储端口

继续使用 `Arc<AttachmentStorage>`；方法名和对象结构与i-g1-input一致。所有可失败port返回 `Result<T, StorageFailure>`，由J/HTTP边界决定何时映射为ApiError。

```rust
pub struct StorageFailure {
    pub status: Option<axum::http::StatusCode>,
    pub message: crate::auth::js_json::JsString,
}
pub struct ObjectLocation {
    pub storage_provider: String,
    pub storage_bucket: Option<String>,
    pub storage_key: String,
}
pub struct UploadPlan { pub location: ObjectLocation, pub upload_mode: String }
pub struct ObjectMetadata {
    pub size_bytes: f64,
    pub e_tag: Option<String>, pub last_modified: Option<String>,
    pub content_type: Option<String>, pub checksum_sha256: Option<String>,
}
pub struct PresignedPutTarget {
    pub method: String, pub url: String,
    pub headers: BTreeMap<String, String>, pub expires_at: String,
}

async fn create_original_upload_plan(&self, session_id: &str, original_name: &str,
    size_bytes: f64, created_at: Option<DateTime<Utc>>) -> Result<UploadPlan, StorageFailure>;
async fn create_presigned_put_target(&self, location: &ObjectLocation,
    content_type: Option<&str>, checksum_sha256: Option<&str>,
    expires_at: DateTime<Utc>) -> Result<PresignedPutTarget, StorageFailure>;
async fn save_upload_session_object(&self, location: &ObjectLocation,
    body: &[u8], content_type: Option<&str>) -> Result<ObjectLocation, StorageFailure>;
async fn head_object(&self, location: &ObjectLocation) -> Result<ObjectMetadata, StorageFailure>;
async fn open_read_stream(&self, location: &ObjectLocation) -> Result<axum::body::Body, StorageFailure>;
async fn read_buffer(&self, location: &ObjectLocation) -> Result<Vec<u8>, StorageFailure>;
async fn remove(&self, location: &ObjectLocation); // best effort，吞掉delete异常
```

- I内部保留save_original / save_download_package及legacy string→local/null/key归一化能力；不因此增加旧multipart HTTP或交付K。
- ObjectMetadata.size_bytes使用f64保留原HEAD Number转换容错，J作业务整数/size比对；不得把缺失/非finite值变成新的反序列化错误。
- Body中的异步错误同样携带StorageFailure，而不是丢成reqwest泛化字符串。StorageFailure实现std::error::Error，Display可lossy显示；原message仍唯一保存在JsString，可通过axum::Error::into_inner及source链downcast取得。
- `Some(status)`代表原HttpException：into_api_error用现有ApiError::raw_json，构造标准Nest statusCode/message/error envelope并直接用message.json()保留UTF16。正常UTF8也可沿相同路径。
- `None`代表原Error：最终HTTP映射既有ApiError::internal固定500，不把原message暴露成新HTTP错误协议；但J的complete catch仍取得原message写failedReason。
- message只保留一个JsString来源，不再有String + optional原文双authority。ordinary Rust/io消息用encode_utf16构造；OBS safeErrorMessage的trim/collapse/slice必须在UTF16 code units层执行。slice(0,300)可能切断代理对，不能提前String::from_utf16_lossy。
- J在最终SQL写failedReason时才message.to_utf8_lossy，匹配Node pg/Buffer对孤立代理的UTF8替代；HTTP JSON仍可用message.json保留`\udxxx`。不扩展全局ApiError，不另建文本兼容库。

## 4. Stream与审计时序：由Root HTTP adapter预读

必须顺序保持：**I open/preflight → J success audit → Root HTTP首个非空frame预取 → HTTP响应/流重放**。

- I的open_read_stream不预取首块。local先原stat失败404，再返回尚未读数据的File流；open/read阶段原生错误属于Body消费错误。避免把read error提前到J audit之前。
- OBS原fetch在收到响应headers后完成preflight，404/非2xx先抛对应HttpException；GET body消费失败才是流错误。不要把整个body读取塞进fetch的3次retry。
- Root在J返回并完成success audit后，取首个非空frame。若取到错误且尚未发headers，按原Express adapter：400、已有MIME/disposition、err.message文本；charset/Content-Length/weak ETag等由Root按原Nest实际对照冻结。
- 首块成功则重放首块并继续原流。后续错误按原pipe结束而不是新JSON500；不得把错误body当作附件内容。
- 空流、零字节frame、headers已发、客户端destroyed/取消、HEAD触发GET handler后如何消费流由Root公共binary adapter统一处理。I不根据最终HTTP method提前省略真实读取，不能改变原HEAD open/audit行为。
- read_buffer是另一条消费路径：完整读流并保存原消费error供J complete catch；不经过HTTP400流分流adapter，也不把消费失败改为新的502。
- 用户取消应使上游body/file关闭，不在后台自动重试对象读取。首块预取不允许全量缓存替代流式I/O。

## 5. 独立 fetch-compatible transport设计

### 5.1 显式client policy与手工redirect

- 独立reqwest client；显式 `redirect(Policy::none())`、`referer(false)`、`retry(reqwest::retry::never())`。reqwest源码默认10跳、referer=true，并有安全低层NACK重试，直接用默认会改变attempt与headers。
- 用I内部手工redirect循环复制Node fetch：仅301/302/303/307/308；最多20跳；相对Location按当前URL resolve；无Location保留原response；非法目标/scheme/credential错误按原fetch错误归类，不能默默stop成HTTP502。
- 301/302只对POST改GET（I当前方法无POST）；303非GET/HEAD改GET，清body与Node request-body headers。307/308保留PUT的cloneable bytes。不能重签SigV4。
- 跨origin（scheme/host/effective port任一变化）去authorization/proxy-authorization/cookie/host，保留x-amz-date/hash等其他头；same-origin仍带初始authorization，即使path改变导致签名失配。这是原fetch行为，不主动修复成SDK重签。
- Node当前native源码在发送前删除显式host，再由URL生成wire Host；签名canonical host依旧来自初始url.host。Rust不要把原host头固化带过redirect，初始URL与最终wire Host必须在真实fixture对照。
- reqwest/tower的自动redirect还存在细节差异（如303对HEAD清payload header、无效Location处理），因此不只改limited(20)就宣称兼容。
- retry包在整个fetch/redirect链外：每次从初始URL/headers/body开始；最多3次，仅fetch rejection重试，250ms/500ms；HTTP404/403/429/500立即处理，不重试；原签名/签名时间在3次间保持不变。
- 系统proxy/TLS不能继承GH的axios自动proxy policy。原附件代码只调用global fetch；目标Node是否启用env proxy/custom dispatcher应由Root进程快照证实。受控fixture可明确no_proxy，但不能把它无声升级为所有部署环境既有语义。

### 5.2 压缩和header：最小路径与必要增量

当前Node v24.19.0/Undici7.29.0 native源码（只读取，无请求）显示：

- fetch保留原content-encoding/content-length，非HEAD且有body的最终response可解压；小写化/trim编码，支持gzip/x-gzip、deflate（首字节低4位=8用zlib，否则raw-deflate）、br；当前构建有能力时还支持zstd。
- 按逆序解最多5重content-encoding；有未知coding则取消全部decoder，返回原body。gzip/zlib使用Z_SYNC_FLUSH宽松finish；HEAD、null-body status与将跟随的redirect不解码。
- reqwest现有gzip/brotli/deflate由tower-http处理：匹配单个精确小写header、解码后删content-encoding/content-length。因此**HEAD必须单独raw policy**：no_gzip/no_brotli/no_deflate/no_zstd，否则headObject的size可能被变成0。

最小可实施路径：HEAD使用raw client，GET/error-body使用既有自动单层解压client，显式设置与Node相同的Accept-Encoding广告（HTTP与HTTPS有区别），stream继续逐块返回。J并不消费GET远端headers，所以GET删header本身不改变J结果；HEAD原始headers必须保留。raw-client与decoded-client仍共享同一个I fetch policy，不能复制provider authority。

**不得据此宣称所有压缩兼容。** 必须实际原Nest对照：大小写GZIP/x-gzip、raw-deflate、组合编码、未知编码、截断gzip/deflate、HEAD content-encoding+length、损坏编码与首块/后块错误。出现差异时的可落地增量为：关闭全部reqwest自动decoder；按原编码列表构造I的显式流decoder，保留raw headers；可加已锁tokio-util0.7.20/io（StreamReader/ReaderStream）与async-compression0.4.51/tokio+gzip+zlib+deflate+brotli，后者严格EOF/多member与Node宽松flush仍需对照。现有flate2/brotli也能实现显式decoder，但同步解码不得阻塞async worker或全量缓冲冒充流。

Node zstd能力、非法压缩的宽松结尾不由当前最小Cargo组合自动提供；若Root冻结为本批必保留行为，需要相应decoder实现/依赖和实际对照，不能以“未广告zstd”或“正常对象不会这样”代替分类。

### 5.3 超时与错误

- 原provider无显式signal或总timeout，但Node transport有默认connect约10s、headers/body约300s；当前reqwest三个默认均None，不能直接把None称为原行为，也不能套GH的10s总timeout。
- 可落地是分阶段处理：connect_timeout(10s)，headers阶段用独立截止时间/明确映射，body采用每次读的空闲timer约300s，**不设置300s整个对象总寿命**。reqwest read_timeout在每个ready frame后重置，可作为近似原语，timer起点/背压暂停/TLS握手与Node差异需Root核实目标runtime并对照。
- 源码级默认值与行为不能代替实际timeout证据。Root可用受控原Nest dispatcher/明确缩短的测试profile验证分类与时序，长默认值另以source绑定；这类profile必须标为替代证据，不能写成实等候300s通过。
- reqwest网络error的Display/source不等于Node `fetch failed / cause.code / cause.message`。I需要有限明确的fetch error mapper，至少连接拒绝、DNS、connect timeout、headers timeout、reset、TLS、redirect上限；没有对照的host特定文本保留未核实，不能把reqwest原Display原样当Node。
- body消费错误不进入3次网络retry；HTTP非2xx message读body失败仍返回空safe message，不把读body失败替换为新的network retry。
- response.text原Node按UTF8解码并去UTF8 BOM，不尊重Content-Type charset。reqwest当前无charset feature时from_utf8_lossy仍保留BOM；safeErrorMessage需显式复制Node去BOM、JS空白collapse/trim、UTF16前300units。

## 6. Encoded URL与SigV4精确边界

- 用已有url2.5.8解析/mutate URL。set_path源码明确不把已有percent escape再次编码；不要用path_segments_mut重编码已encodeURIComponent的key。
- I实现独立JS encodeURIComponent等价helper：分段、空段过滤、保留path中的`!'()*`、百分号本体变%25、Unicode按UTF8；不能把Rust一般form/urlencoded helper直接用于path。
- JS未配对surrogate在encodeURIComponent会抛URIError；WHATWG URL输入的替换语义不同。必须分清“手工encode阶段”和“URL setter阶段”，不要提前lossy转换掩盖错误。
- 非默认显式port必须进入canonical host；设置hostname加bucket不能丢port。IPv6、默认port消除、Unicode host/punycode、endpoint path/query/hash/username/password是实际对照向量。
- 普通signed请求query使用URLSearchParams.toString（原顺序、form encoding），presign则按key/value localeCompare排序后额外编码`!'()*`。两个canonical query算法不得统一。
- 路径中`%2F`、`%25`、`%2e`/dot segments、双slash、backslash、空key、Unicode、空格/加号、endpoint已有query和hash必须对照最终wire request target、URL返回文本、canonical request hash、authorization/presign query。
- presign签名时钟来自now，TTL clamp1..3600但返回原expiresAt；不修改为clamp后时间。HMAC chain和UNSIGNED-PAYLOAD与i-g1-input一致。
- Node Headers.get可组合重复header；reqwest HeaderMap::get只读首值，HEAD metadata的重复值与无效content-length如何被底层拒绝需原Nest对照。size必须读原header字符串并走JS Number语义，不用Response::content_length()替代。

## 7. Root集中实际验收清单

以下都未运行。I/J作者不私自起环境；Root在G1冻结后串行协调fixture/default与session快照：

1. 真实local mkdir/put/stat/read/delete、双attachments目录、lexical traversal、disabled历史读取、同位置前缀路由、size/mtime/sha256字节与完整恢复。
2. 真实loopback S3-compatible HTTP：PUT/GET/HEAD/DELETE、body字节、SigV4、非默认port、path-style/virtual host、presign经真实PUT再HEAD/GET；签名冻结时钟的deterministic向量与实际protocol请求分别记证。
3. 302/303/307/308、same/cross-origin、20/21跳、无/空/非法Location、方法body/headertrace、初始签名不重签；每次HTTP error不retry、连接rejection3attempt和250/500ms序列。
4. 第5节全部编码差异与Node/reqwest错误分类；headers/body超时、断流、消费阶段错误、TLS/proxy实际profile。未测的罕见编码不标为通过。
5. J open+audit成功后首错400、后错end、空流、HEAD与取消、原MIME/disposition/charset/length/ETag；complete消费错误原message→failedReason→unknown500的时序。
6. source-level、golden、mock、loopback真实HTTP、本地真实FS、真实华为租户分别标注；最后一项没有凭据时仍保持未执行，保留原EX-65E生产启用边界。

## 8. 本地依赖来源与核验边界

只读来源目录：`\\wsl.localhost\Debian\home\wangzishi\.local\share\poms-r2gh\cargo-registry\src\index.crates.io-1949cf8c6b5b557f`。未进入/exec容器，未运行其environment脚本。

对8个既有`.crate`压缩包原字节SHA256与当前Cargo.lock checksum比较，并在内存解gzip/tar比对18件已读源码，全部一致。某些cache解包目录未提供`.cargo-checksum.json`，因此采用锁定archive比对，没有将“文件不存在”误判为source损坏。该核验是来源一致性，不是编译或运行通过。

关键源码锚点：reqwest Cargo.toml stream:179、client defaults:290–315 / decompression:1037起、response chunk:310 / bytes_stream:349 / From<Response>:451；redirect sensitive headers:234起；retry::never:88。OpenSSL pkey::hmac:584、sign::Signer:115 / new:140 / update:252 / sign_to_vec:320。tokio Cargo fs:71。futures-util stream模块公开try_unfold/StreamExt/once/chain；axum-core Body::from_stream:59。tower-http decompression/future.rs:40–71会删header，follow_redirect/mod.rs:274–290 method重写。url set_path:1767。

下附核验摘要由有限纯源码提取生成，raw与CRLF→LF SHA256不做其他转换；不改变旧i-g1-sources.json。

```json
{
  "cacheRoot": "\\\\wsl.localhost\\Debian\\home\\wangzishi\\.local\\share\\poms-r2gh\\cargo-registry",
  "registry": "index.crates.io-1949cf8c6b5b557f",
  "kind": "read-only archive hashing and in-memory tar source comparison; no cargo/build/runtime/network/container invocation",
  "packages": [
    {
      "crate": "reqwest-0.13.5",
      "archiveRawBytesSha256": "16a1cfa75cc186dd73d5818e510e042e40927bccc9c236b061cea97e1eb08029",
      "lockChecksum": "16a1cfa75cc186dd73d5818e510e042e40927bccc9c236b061cea97e1eb08029",
      "archiveMatchesLock": true
    },
    {
      "crate": "openssl-0.10.81",
      "archiveRawBytesSha256": "77823a27f0babb03091cb9ed9ef80af3b39dbc82f97e8fa530374b7dafd87a45",
      "lockChecksum": "77823a27f0babb03091cb9ed9ef80af3b39dbc82f97e8fa530374b7dafd87a45",
      "archiveMatchesLock": true
    },
    {
      "crate": "tokio-1.54.1",
      "archiveRawBytesSha256": "b52fd3255258d26fac7264ab5a76b53c13367136dc011d3d6ad4f8ed070396a3",
      "lockChecksum": "b52fd3255258d26fac7264ab5a76b53c13367136dc011d3d6ad4f8ed070396a3",
      "archiveMatchesLock": true
    },
    {
      "crate": "futures-util-0.3.34",
      "archiveRawBytesSha256": "0d50a92467f8ba5dd6e3ee5d4bd04d73ab2e4e1c44474a0674821dfce14b79bc",
      "lockChecksum": "0d50a92467f8ba5dd6e3ee5d4bd04d73ab2e4e1c44474a0674821dfce14b79bc",
      "archiveMatchesLock": true
    },
    {
      "crate": "tower-http-0.6.11",
      "archiveRawBytesSha256": "4cfcf7e2740e6fc6d4d688b4ef00650406bb94adf4731e43c096c3a19fe40840",
      "lockChecksum": "4cfcf7e2740e6fc6d4d688b4ef00650406bb94adf4731e43c096c3a19fe40840",
      "archiveMatchesLock": true
    },
    {
      "crate": "axum-core-0.5.6",
      "archiveRawBytesSha256": "08c78f31d7b1291f7ee735c1c6780ccde7785daae9a9206026862dab7d8792d1",
      "lockChecksum": "08c78f31d7b1291f7ee735c1c6780ccde7785daae9a9206026862dab7d8792d1",
      "archiveMatchesLock": true
    },
    {
      "crate": "url-2.5.8",
      "archiveRawBytesSha256": "ff67a8a4397373c3ef660812acab3268222035010ab8680ec4215f38ba3d0eed",
      "lockChecksum": "ff67a8a4397373c3ef660812acab3268222035010ab8680ec4215f38ba3d0eed",
      "archiveMatchesLock": true
    },
    {
      "crate": "tokio-util-0.7.20",
      "archiveRawBytesSha256": "e464cf451ba96ebfc6f9b6542f17ee8b8956e33f1e40d9690624e59d7a7f8a4b",
      "lockChecksum": "e464cf451ba96ebfc6f9b6542f17ee8b8956e33f1e40d9690624e59d7a7f8a4b",
      "archiveMatchesLock": true
    }
  ],
  "sources": [
    {
      "source": "reqwest-0.13.5/Cargo.toml",
      "rawBytesSha256": "ab36603e15fa21c4fe1f4e9810245dcb06499cdcf6e6b07296e5d2a3c25c69a1",
      "normalizedUtf8Sha256": "ab36603e15fa21c4fe1f4e9810245dcb06499cdcf6e6b07296e5d2a3c25c69a1",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "reqwest-0.13.5/src/async_impl/client.rs",
      "rawBytesSha256": "5b7e2556d122a75cd8d3ef62a33d45e430c8eff229a33bc3f53fc7e9af2d97de",
      "normalizedUtf8Sha256": "5b7e2556d122a75cd8d3ef62a33d45e430c8eff229a33bc3f53fc7e9af2d97de",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "reqwest-0.13.5/src/async_impl/response.rs",
      "rawBytesSha256": "ab12ec2046e4037e0ba370279362c9a8bbc7bcd5f8b08cfff43c86c28e40eaee",
      "normalizedUtf8Sha256": "ab12ec2046e4037e0ba370279362c9a8bbc7bcd5f8b08cfff43c86c28e40eaee",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "reqwest-0.13.5/src/redirect.rs",
      "rawBytesSha256": "7d1e8c0b99e92c8bdd815e71b0e2ec1e0b40b9e346012651e5288d04b4e0d576",
      "normalizedUtf8Sha256": "7d1e8c0b99e92c8bdd815e71b0e2ec1e0b40b9e346012651e5288d04b4e0d576",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "reqwest-0.13.5/src/retry.rs",
      "rawBytesSha256": "ce2c5307a449047a9f7187b52d91ddd369c0468900f4f6b0b390a849515ff525",
      "normalizedUtf8Sha256": "ce2c5307a449047a9f7187b52d91ddd369c0468900f4f6b0b390a849515ff525",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "openssl-0.10.81/src/pkey.rs",
      "rawBytesSha256": "1f32be54d88ee49ad3db4dea4415f2ca8d508ac4de635dbab83957d5b414f16c",
      "normalizedUtf8Sha256": "1f32be54d88ee49ad3db4dea4415f2ca8d508ac4de635dbab83957d5b414f16c",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "openssl-0.10.81/src/sign.rs",
      "rawBytesSha256": "9e42ca66977c8370cc92e5952e5b1fcd8462a86cb810e583071b7ab7afa1e952",
      "normalizedUtf8Sha256": "9e42ca66977c8370cc92e5952e5b1fcd8462a86cb810e583071b7ab7afa1e952",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "tokio-1.54.1/Cargo.toml",
      "rawBytesSha256": "9a8189f0dc5320ae7c66786d6414b5650fcf1b1deab634135d2306bdc28d34ec",
      "normalizedUtf8Sha256": "9a8189f0dc5320ae7c66786d6414b5650fcf1b1deab634135d2306bdc28d34ec",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "tokio-1.54.1/src/fs/mod.rs",
      "rawBytesSha256": "2f689c937f7d09e5113467eca5bdb07334f01e7701eb150ae27daa4b9eed6fee",
      "normalizedUtf8Sha256": "2f689c937f7d09e5113467eca5bdb07334f01e7701eb150ae27daa4b9eed6fee",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "futures-util-0.3.34/Cargo.toml",
      "rawBytesSha256": "7e672d306e8de25359ed9c452e7cdc115121dc7e985008af31c85a36b70ac835",
      "normalizedUtf8Sha256": "7e672d306e8de25359ed9c452e7cdc115121dc7e985008af31c85a36b70ac835",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "futures-util-0.3.34/src/stream/mod.rs",
      "rawBytesSha256": "e4f4bd19d691b6e81aac1ef529b3dbe9889939716bf0cbc85e9299328910fe52",
      "normalizedUtf8Sha256": "e4f4bd19d691b6e81aac1ef529b3dbe9889939716bf0cbc85e9299328910fe52",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "futures-util-0.3.34/src/stream/try_stream/try_unfold.rs",
      "rawBytesSha256": "aaf0f4857a4ec8233ac842ae509f29e5a210827a0bb40cfc0dc3e858f153d2b4",
      "normalizedUtf8Sha256": "aaf0f4857a4ec8233ac842ae509f29e5a210827a0bb40cfc0dc3e858f153d2b4",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "tower-http-0.6.11/src/decompression/future.rs",
      "rawBytesSha256": "a9cfc2f175854bb85b76901e8dbcbfdf743db92c822ccf589647ba18ef82c730",
      "normalizedUtf8Sha256": "a9cfc2f175854bb85b76901e8dbcbfdf743db92c822ccf589647ba18ef82c730",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "tower-http-0.6.11/src/follow_redirect/mod.rs",
      "rawBytesSha256": "c921f723bfd557fad64ec6c3a454fd2a95504f2e4e882357997dc0297ab0353c",
      "normalizedUtf8Sha256": "c921f723bfd557fad64ec6c3a454fd2a95504f2e4e882357997dc0297ab0353c",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "axum-core-0.5.6/src/body.rs",
      "rawBytesSha256": "a737b8441863a95a84fbd91a02c5711121d029ef24e7890f2fcbafc30c60a0f8",
      "normalizedUtf8Sha256": "a737b8441863a95a84fbd91a02c5711121d029ef24e7890f2fcbafc30c60a0f8",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "url-2.5.8/src/lib.rs",
      "rawBytesSha256": "51f47a93654528f3b8cb92c94fc26ad25775860d84197fff0c3124a687f8c5e3",
      "normalizedUtf8Sha256": "51f47a93654528f3b8cb92c94fc26ad25775860d84197fff0c3124a687f8c5e3",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "tokio-util-0.7.20/Cargo.toml",
      "rawBytesSha256": "5764e31b13ee78f6682505971b022caba784b79e6c458d9b95e0f089a6fb6bda",
      "normalizedUtf8Sha256": "5764e31b13ee78f6682505971b022caba784b79e6c458d9b95e0f089a6fb6bda",
      "matchesLockedArchiveEntry": true
    },
    {
      "source": "tokio-util-0.7.20/src/io/reader_stream.rs",
      "rawBytesSha256": "ad76ecfb290d99a1e56582326353d6318a8995d1f7df59a849e015b4aadadf1e",
      "normalizedUtf8Sha256": "ad76ecfb290d99a1e56582326353d6318a8995d1f7df59a849e015b4aadadf1e",
      "matchesLockedArchiveEntry": true
    }
  ],
  "allArchiveHashesMatchLock": true,
  "allReadSourcesMatchArchives": true
}
```
