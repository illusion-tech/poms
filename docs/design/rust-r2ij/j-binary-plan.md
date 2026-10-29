# R2I/J 共享二进制 HTTP 与 UUID 兼容接口候选

状态：只读设计，G1 Pending；尚未编译，未运行 HTTP/数据库/本地存储 adapter 或对象存储验收。只新增本文件，原 `j-g1-input.md / j-g1-sources.json` 不变，不修改产品或 Cargo。Root 已要求的候选接口和首 frame 预取方案在下文落为具体模块、类型和算法，待同次 G1 review。

基线 `61d6df1e971e7e785382dc85c75273e584ee2545`，分支 `codex/poms-r2ij-storage-attachments`。Root 独占 `crate::binary_http`、Cargo/lock、lib/router/config 与实际验收；J 独占附件业务模块，I 独占 storage authority。最终 I/J 构造接口：`AttachmentsService::new(Database, Arc<AttachmentStorage>)`；J 的 `http::router(AuthHttpState, Arc<AttachmentsService>) / normalize_uri / openapi()`，不向 J 注入第二份配置或 cipher authority。

## 1. 已核对的锁定 API 与最小依赖选择

已直接只读访问已有 R2GH registry：`\\wsl.localhost\Debian\home\wangzishi\.local\share\poms-r2gh\cargo-registry\src\index.crates.io-1949cf8c6b5b557f`。未启动/exec 容器，没有下载依赖。

| 来源                              | 当前确认                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| axum 0.8.9 `src/body/mod.rs`      | reexport Body、BodyDataStream、Bytes、HttpBody；未 reexport Frame/SizeHint                                                             |
| axum-core 0.5.6 `src/body.rs`     | Body::into_data_stream 不受 feature gate；BodyDataStream 同时实现 Stream 和 HttpBody；Body::from_stream接受TryStream并丢失显式长度推导 |
| axum 0.8.9 `src/routing/route.rs` | top-level routing先按body size_hint加Content-Length，再对HEAD剥body                                                                    |
| reqwest 0.13.5 `response.rs`      | Response::chunk()无stream feature gate；bytes_stream()有stream gate；From<Response> for reqwest::Body也是无gate的原始转发备选          |
| futures-util 0.3.34               | StreamExt::next、unfold/try_unfold可由std最小feature消费；无须async-await-macro                                                        |
| tokio 1.54.1 Cargo                | 当前已启io-util/rt/net/sync等；fs=[]，只启fs不引入新package                                                                            |
| 本仓库 auth/http.rs               | 已用HttpBody::poll_frame + std::future::poll_fn读Body；可复用同样调用面                                                                |

推荐与 I 已协调的联合最小增量：

```toml
futures-util = { version = "=0.3.34", default-features = false, features = ["std"] }
# 原 tokio dependency features 列表追加 "fs"；其余 identity 不变。
```

这是一项已有锁定package的**直接依赖声明**加tokio feature；不是零Cargo变化，也不是新增package/version。I 已需该direct dependency为local AsyncRead与reqwest Response::chunk构造try_unfold；Root binary复用它，不再加http-body、http-body-util、tokio-stream、tokio-util或reqwest stream feature。Root负责实际lock/feature diff与编译确认。

`Body::into_data_stream()`本身可不新增依赖；`Body::from_stream(body.into_data_stream())`直传也可零增量。但“预取后重放第一块＋后续错误改EOF”需要可用的Stream组合器或自定义HttpBody。若只做incoming body读取，现有poll_frame已经完全够用；若坚持不用I已需的futures-util，则自写HttpBody必须命名Frame/SizeHint，最小是将已锁定http-body1.1.0加为direct dependency，反而没有联合收益。不应为此借用未声明的transitive crate或启用reqwest全套stream。

## 2. 唯一 storage 错误 authority 与 UTF-16

I/J已统一，Root已采纳：

```rust
pub struct StorageFailure {
    pub status: Option<axum::http::StatusCode>,
    pub message: crate::auth::js_json::JsString,
}
```

- `Some(status)`表示原HttpException；`None`表示原普通Error。I提供 `from_text(&str)`（encode_utf16）、`into_api_error(self)`，不修改全局ApiError。
- Some：用现有ApiError::raw_json构造标准Nest envelope，message取JsString::json()；error状态描述按原Nest定义。None：ApiError::internal()固定500响应。
- J complete catch先取message原UTF16；**只有写failedReason到PG时** `.to_utf8_lossy()`，符合Node pg/Buffer UTF8对孤立surrogate的替换。不要提前统一lossy或把500固定文案写为failedReason。
- Body消费错误的std::Error实现保留同一个StorageFailure；Root沿axum::Error.into_inner()/source链downcast取得message。普通io/Rust错误可先构造from_text。
- OBS safe error body的JS `.slice(0,300)`可能切开代理对，故唯一message不能仅用Rust String。不给String＋optional原值两套authority。
- provider open失败仍经StorageFailure->ApiError返回；**流已创建后的消费失败**才走本模块400原始文本/部分200边界。

I 保持 `open_read_stream -> Result<Body,StorageFailure>`，不在I里先取第一块；I先前StorageRead::StartFailure草案撤回。J service保持原 `open stream -> success audit -> 返回payload`，Root HTTP在该阶段之后才预取；这样stream消费失败不会抢在原success audit之前。read_buffer保留StorageFailure的原message用于complete失败状态。

## 3. Root 与 J 的模块接口

Root新增 `apps/poms-api-rust/src/binary_http.rs`，在lib里只注册一个共享模块；J调用它，不复制HTTP streaming/header算法。

```rust
use axum::{body::Body, http::Method, response::Response};
use crate::{auth::js_json::JsString, error::ApiError};

pub struct BinaryPayload {
    pub body: Body,
    pub mime: JsString,
    pub filename: JsString,
    pub inline: bool,
}

pub struct BodyReadFailure {
    pub message: JsString,
}

// 调用者已经通过原route_guard；body是全局parser之后仍剩余的Body。
pub async fn read_unparsed_body(body: Body) -> Result<Vec<u8>, BodyReadFailure>;

// service open+audit已成功后才调用；按method处理GET/HEAD。
pub async fn respond(payload: BinaryPayload, request_method: &Method)
    -> Result<Response, ApiError>;
```

J可以内部返回 `AttachmentBinary { attachment metadata, body }`，HTTP只转换为上述BinaryPayload。读错误向Root保留JsString；body-read普通错误仍为原unknown500语义，不能因其发生于二进制接口就改400。客户端断开后无法再保证有响应，不能据此新增业务audit或写upload session failed。

## 4. Incoming PUT：保持 parser / guard / buffering 顺序

原顺序为全局JSON/form parser -> route/auth/CSRF/permission guard -> controller读IncomingMessage至EOF -> service的owner/target/status/size/hash检查 -> PUT对象。

现有Rust对应顺序已成立：`http::wrap_router`的外层body_parser先执行；它只消耗application/json和application/x-www-form-urlencoded，结束后Request body变Body::empty()；octet-stream及其他type不读取Body。route_guard把Request拆为parts/body，authorize后以同一body继续，不需改认证模块。

`read_unparsed_body`采用现有poll_frame调用面；所有data累积到Vec，trailers忽略。不要用Bytes/String/Json extractor、DefaultBodyLimit、to_bytes固定cap，不从ParsedBody重建bytes，不用Content-Length当实际长度。J controller原无显式二进制cap；service在完整缓冲后才检验声明size和SHA256。

核心循环（使用当前已有依赖，可单独编译验证；本次未执行）：

```rust
use std::{future::poll_fn, pin::Pin};
use axum::body::{Body, HttpBody};

async fn collect_remaining(mut body: Body) -> Result<Vec<u8>, axum::Error> {
    let mut bytes = Vec::new();
    while let Some(frame) = poll_fn(|cx| Pin::new(&mut body).poll_frame(cx)).await {
        if let Ok(data) = frame?.into_data() {
            bytes.extend_from_slice(&data);
        }
    }
    Ok(bytes)
}
```

JSON/form malformed、100KiB限制、encoding/charset等继续由原全局parser在guard前处理；合法JSON/form用于PUT时剩余body为空，后续通常因声明size不等返回原400，不应上传JSON序列化后的内容。octet-stream即使Content-Encoding有值也不经过原JSON/form解压器，应按原剩余bytes处理。

## 5. GET：首个有效数据块预取、重放与后续终止

先构造并校验原Content-Type/Content-Disposition/Cache-Control，**不要提交Response**；再poll第一非空data frame。先遇到provider正常open错误不在此函数范围；这里的消费错误返回400文本。空data忽略、trailer不转发，符合Node Readable/provider路径只向response管道交数据的边界；“自定义Readable主动emit空data”不属于现有provider的已证明行为。

第一非空data成功后保留该Bytes，不全量缓存；构造unfold先重放它，再逐块读取tail。tail消费错误结束为EOF，保持200及已收到前缀，模拟Nest `res.end()`；直接传播Body Err通常导致hyper断连接/不完整chunk终止，不能当作同义实现。不能流中改status、重试对象GET或改成JSON错误。

以下代码展示完整、具名API调用面，依赖上节direct futures-util。它不承担header设置、错误消息source链提取或HEAD；那些有明确的外围函数边界，Root实现后联合编译验证。

```rust
use std::convert::Infallible;
use axum::body::{Body, Bytes};
use futures_util::{StreamExt, stream};

enum GetStart {
    Empty,
    Ready(Body),
    Failed(axum::Error),
}

async fn prepare_get(body: Body) -> GetStart {
    let mut tail = body.into_data_stream();
    let first = loop {
        match tail.next().await {
            Some(Ok(bytes)) if bytes.is_empty() => continue,
            Some(Ok(bytes)) => break bytes,
            Some(Err(error)) => return GetStart::Failed(error),
            None => return GetStart::Empty,
        }
    };
    let replay = stream::unfold((Some(first), tail), |(mut first, mut tail)| async move {
        if let Some(bytes) = first.take() {
            return Some((Ok::<Bytes, Infallible>(bytes), (first, tail)));
        }
        loop {
            match tail.next().await {
                Some(Ok(bytes)) if bytes.is_empty() => continue,
                Some(Ok(bytes)) => return Some((Ok(bytes), (None, tail))),
                Some(Err(_)) | None => return None,
            }
        }
    });
    GetStart::Ready(Body::from_stream(replay))
}
```

Empty成功GET可返回空Body，但要实际核对Node/axum对Content-Length:0的自动行为。非空成功流不能把attachment.sizeBytes、provider Content-Length或已预取块长度放进响应Content-Length；unfold经Body::from_stream默认未知size_hint，避免axum自动变为定长。正常successful stream也不添加ETag/Last-Modified/Accept-Ranges。

取消/资源释放：响应Body被drop时tail及I持有的文件/response也drop；不要后台无界预读或全量缓存。对正常GET，后续错误转EOF后释放tail即可；不据此改已经提交的success audit。若consumer已断开，状态与响应不能重新发送。

## 6. 首块前400原始文本并非ApiError JSON

固定Nest12.0.1 StreamableFile.handleError：destroyed直接return；headersSent则res.end；否则status=400再`res.send(err.message)`。Express5.2.1 response.send对string还执行以下动作：

1. 保留现有Content-Disposition与Cache-Control；Content-Type原mime经setCharset覆盖charset为utf-8，不强改为text/plain或application/json。
2. 将message按Node UTF8编码；孤立surrogate替换为U+FFFD。body是这些原始字节，不是JSON引号包裹。
3. Content-Length为UTF8字节长度；默认application `etag='weak'`，会生成weak ETag。标准Node etag形式为 `W/"{hex-length}-{base64(SHA1(bytes))去尾部=}"`，空body使用同算法/原包特殊常量；可用已有openssl SHA1与base64实现，不加依赖。
4. HEAD保留相应headers但无body。

因此Root应实现两个纯helper：

```rust
fn native_stream_headers(mime: &JsString, filename: &JsString, inline: bool)
    -> Result<axum::http::HeaderMap, ApiError>;
fn native_stream_start_failure(headers: axum::http::HeaderMap,
    message: &JsString, is_head: bool) -> Result<Response, ApiError>;
```

第二个helper创建Response<Body>并手工设置status/headers，避开IntoResponse for String的text/plain默认值，避开ApiError标准JSON。不要丢Content-Disposition/Cache-Control；正常stream与这条错误分支的charset/length/ETag政策分别处理。

原Express setCharset通过content-type.parse/format，参数排序、引用/转义也有明确来源。实现不能只对任意MIME盲目追加`; charset=utf-8`而宣称全部header语义相同；普通image/pdf与带charset/其他参数应做精确fixture，非法MIME的异步错误路径保持真实观测。header未发送前校验失败是原unknown error边界，不人为改为DTO400。

## 7. 文件名与MIME的最小UTF-16处理

- filename Content-Disposition为inline或attachment，加 `; filename*=UTF-8''` + JS encodeURIComponent；不添加filename=。
- 编码ASCII安全集 `A-Za-z0-9-_.!~*'()`；其他按有效Unicode scalar的UTF8字节大写%HH编码；遇孤立surrogate应失败，不能lossy后继续造header。可在现有JsString.as_code_units()上decode_utf16，每个有效字符encode_utf8，任何Err进入ApiError::internal()。
- MIME用于成功stream的Node ServerResponse.setHeader，按原UTF16/latin1 header字符边界处理，不把Unicode盲目UTF8化作为相同header。TAB/可打印ASCII及允许obs-text保留，非法控制字符、超过Latin1码元或孤立surrogate遵循Node拒绝边界；具体不合法值必须Root oracle确认。
- stream-start-failure的message body则是Node UTF8编码，允许to_utf8_lossy；Some HttpException的JSON message仍用JsString.json()。这三种编码用途不能共用一次lossy归一化。

## 8. HEAD、Range、空body与方法

现有axum `.get(handler)`对HEAD调用GET handler，然后在RouteFuture按size_hint设置length并剥body。由此不能让HEAD只打开stream后马上drop tail；原Nest/Express仍pipe数据，Node HEAD忽略body写入但消费流。

推荐respond显式区分HEAD：J仍执行真实open+success audit；Root逐块消费并丢弃Body，记录是否已遇首个非空data。首data前错误使用400原始文本的同headers（HTTP无body）；首data后错误按原已建header阶段结束为200；正常EOF为200。不使用attachment.sizeBytes构造HEAD Content-Length。

只读提取本机Node24.19.0 `_http_outgoing`源码确认：`write_`先调用implicitHeader，HEAD因_hasBody=false忽略写；`headersSent` getter实际是 `!!this._header`，并不要求wire已发送。故第一次有效data后晚错不能重做400；这与GET的“首块成功后结束200”统一。HEAD需要drain以保留原读取/错误边界，不是全量缓存。

successful HEAD应避免axum从空Body自动附加Content-Length:0：可返回 `Body::from_stream(stream::empty::<Result<Bytes, Infallible>>())`，其StreamBody默认未知size_hint，再由axum剥body；原Node HEAD没有主动传length时不据stream大小推导CL。最外层fallback_service是否再次引入CL必须实际HTTP验证，必要时Root在最外响应层对这些**已标记binary HEAD**移除自动CL，不改所有HEAD。

Range/If-Range/条件缓存：原附件controller/adapter没有Range分支，正常成功流不执行res.sendFile；忽略请求Range，发送完整对象200，不增加206/416或Content-Range/Accept-Ranges。providerGET也不透传用户Range。对应真实原Nest样本仍待运行，不能把通用express静态文件功能套到StreamableFile。

原路由未声明额外HEAD公开operation；保持19操作的inventory/OpenAPI。其他method继续现有router 404策略、认证和CSRF边界，不在binary模块加新的全局method fallback。

## 9. UUID：请求拼写、存储identity、返回来源分开

Root基线采用按方法返回规则。建议业务请求UUID字段继续String，且Zod validator只验证、不lowercase或parse后重新serialize。path ID原string不新增UUID validator；store直接bind原text到 `$1::text::uuid`，无效UUID保留原PG错误/unknown500次序。

不需要全局UUID包装器；J可在模块内定义轻量名字以避免误用：

```rust
pub struct InputUuidText(pub String); // 已经由原DTO规则验证，保留原大小写
pub struct PathIdText(pub String);    // 仅路由解码，尚未做UUID验证

// DB-read row用String（SELECT id::text、target_id::text等）或Uuid均可；
// 只有DB读出的Uuid转换为string时才canonical，不用它重写原请求draft。
pub async fn find_session(conn: &mut sqlx::PgConnection, id: &str)
    -> Result<Option<SessionRow>, sqlx::Error>;

// insert/update返回defaults、rowVersion、timestamp，不RETURNING *覆盖draft输入字段。
pub async fn insert_session(conn: &mut sqlx::PgConnection, draft: &SessionDraft)
    -> Result<FlushFields, sqlx::Error>;
```

| 方法 / 返回点                                                       | UUID来源与建议                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| create-session create-attachment                                    | targetId来自原request，可能uppercase；session UUID新生成；insert后立即mapper，不主动完整重读                                    |
| create-session create-version                                       | baseAttachmentId保留原request；targetId取完成normalize时实际latest links；两者来源不同                                          |
| get-session / target / proxy / complete / abort                     | find_session实际DB读取；输出DB canonical ID，不能为了“保留首次拼写”从URI覆盖row.id                                              |
| complete附件/版本                                                   | 已DB重读的session/links＋新生成ID；返回summary来自原service持久化后draft，不从request.path复制ID                                |
| link新增                                                            | targetId先来自request，但原save后会findActiveLinks重查；应使用这个实际query结果；不能统一承诺新增link首次summary仍保留uppercase |
| link已存在分支、get/list/versions/中心、unlink及metadata/final/void | 按原具体query/mapper顺序使用DB row / request-local managed snapshot，不向所有返回字段灌原请求拼写                               |

依据本地MikroORM7.0.11源码：UuidType委托platform，PostgreSQL没有覆写默认convertUuidToJSValue/DatabaseValue（返回原value）；ChangeSetPersister不会为已提供runtime值强制reload全部列；EntityFactory.mergeData会对DB新数据refresh未被用户再次修改的字段。因此“首次所有返回都canonical”和“首次所有返回都原拼写”都不成立。按原方法查询点构造模型，比复刻整个identity map更小；同request第二次查询是否refresh某列仍需PG oracle。

具体接口原则：

- 创建draft保留原输入String或JsString，数据库bind用text cast；SQL返回的generated UUID单独合入draft。
- DB row与draft分为两个struct或显式构造函数，不让INSERT RETURNING *成为response authority。
- 查询命中比较/去重需要PG UUID identity时可单独parse一个辅助key，但不把key.to_string()覆盖返回原字段。
- 模板错误文案按原参数来源插值；不可统一用canonical id覆盖原request path中的ID。
- uppercase有效UUID、all-F特殊Zod规则、PG可接受但Zod拒绝的alias、非UUIDpath、create立即返回与下一请求GET的差异纳入Root同一实际fixture；本设计没有运行结论。

## 10. Root 本次 G1 采纳后需要的有限验收

1. 编译上述模块与I最小Cargo feature，证明没有新package/version或意外features；incoming循环可直接沿现有调用面。
2. 真HTTP：octet-stream>100KiB、JSON/form已消费、guard拒绝时不进入controller读、body中途断开。
3. 受控Body：首错、首空后错、正常第一块后错、正常多块、EOF空，确保400 raw与部分200/EOF；打开成功audit先于预取，不能HTTP失败就撤销audit。
4. 原Nest早错headers：image/pdf MIME、charset参数、UTF8错误文本长度、weakETag、filename encodeURI安全集；合法/非法UTF16分别见证。
5. HEAD实际drain、首错/晚错、空文件、默认CL差异；Range/If-Range发完整200；外层CORS/request-id保留。
6. 原URI/router/guard次序保持；provider open的404/502与stream消费400分开；真实OBS租户仍未运行。
7. UUID按方法首响应与PG重读对照，不统一canonical化，不虚构R3/R4对象。

本文件是已核对本地API的可落地实现设计；未声称代码已编译或任何runtime已通过。后续修改应另记增量指纹，原G1输入两文件保持不变。

## 11. 本次补充来源指纹

lockedRegistry根路径见第1节；workspace以当前工作树为根。raw为原字节SHA256，LF仅将CRLF换LF，保持BOM与其他内容。以下读取不修改来源。

```json
[
  {
    "path": "axum-0.8.9/src/body/mod.rs",
    "root": "lockedRegistry",
    "rawSha256": "83a6632a770e9f3c0ddcdafc26dce4729a1c305f12eef0006c9200f38e774a5a",
    "lfSha256": "83a6632a770e9f3c0ddcdafc26dce4729a1c305f12eef0006c9200f38e774a5a"
  },
  {
    "path": "axum-core-0.5.6/src/body.rs",
    "root": "lockedRegistry",
    "rawSha256": "a737b8441863a95a84fbd91a02c5711121d029ef24e7890f2fcbafc30c60a0f8",
    "lfSha256": "a737b8441863a95a84fbd91a02c5711121d029ef24e7890f2fcbafc30c60a0f8"
  },
  {
    "path": "axum-0.8.9/src/routing/route.rs",
    "root": "lockedRegistry",
    "rawSha256": "d4b24b803c4dd9fb389da53f267ae06ec40531399f1062148a99dc4336982bd7",
    "lfSha256": "d4b24b803c4dd9fb389da53f267ae06ec40531399f1062148a99dc4336982bd7"
  },
  {
    "path": "axum-0.8.9/src/routing/method_routing.rs",
    "root": "lockedRegistry",
    "rawSha256": "e5b220bc45a33b2a04d53041952b0edc114fe93be00a871a45d5c40d7ff5f6cd",
    "lfSha256": "e5b220bc45a33b2a04d53041952b0edc114fe93be00a871a45d5c40d7ff5f6cd"
  },
  {
    "path": "reqwest-0.13.5/src/async_impl/response.rs",
    "root": "lockedRegistry",
    "rawSha256": "ab12ec2046e4037e0ba370279362c9a8bbc7bcd5f8b08cfff43c86c28e40eaee",
    "lfSha256": "ab12ec2046e4037e0ba370279362c9a8bbc7bcd5f8b08cfff43c86c28e40eaee"
  },
  {
    "path": "reqwest-0.13.5/src/async_impl/body.rs",
    "root": "lockedRegistry",
    "rawSha256": "5f817e5c8713fc08aa410057540c6ffa37a1595340bddd2c2f39479b5c0103e9",
    "lfSha256": "5f817e5c8713fc08aa410057540c6ffa37a1595340bddd2c2f39479b5c0103e9"
  },
  {
    "path": "futures-util-0.3.34/Cargo.toml",
    "root": "lockedRegistry",
    "rawSha256": "7e672d306e8de25359ed9c452e7cdc115121dc7e985008af31c85a36b70ac835",
    "lfSha256": "7e672d306e8de25359ed9c452e7cdc115121dc7e985008af31c85a36b70ac835"
  },
  {
    "path": "futures-util-0.3.34/src/stream/mod.rs",
    "root": "lockedRegistry",
    "rawSha256": "e4f4bd19d691b6e81aac1ef529b3dbe9889939716bf0cbc85e9299328910fe52",
    "lfSha256": "e4f4bd19d691b6e81aac1ef529b3dbe9889939716bf0cbc85e9299328910fe52"
  },
  {
    "path": "futures-util-0.3.34/src/stream/stream/mod.rs",
    "root": "lockedRegistry",
    "rawSha256": "a4cbcb0c7cac1c1ff3fb21c350e6b542b8abeb9816049c6d59531a16f99c0b7a",
    "lfSha256": "a4cbcb0c7cac1c1ff3fb21c350e6b542b8abeb9816049c6d59531a16f99c0b7a"
  },
  {
    "path": "futures-util-0.3.34/src/stream/unfold.rs",
    "root": "lockedRegistry",
    "rawSha256": "201428f3dfcd10c556367d9aa87c4ae20fc9db6396380674b3b8c43b5d2a307e",
    "lfSha256": "201428f3dfcd10c556367d9aa87c4ae20fc9db6396380674b3b8c43b5d2a307e"
  },
  {
    "path": "tokio-1.54.1/Cargo.toml",
    "root": "lockedRegistry",
    "rawSha256": "9a8189f0dc5320ae7c66786d6414b5650fcf1b1deab634135d2306bdc28d34ec",
    "lfSha256": "9a8189f0dc5320ae7c66786d6414b5650fcf1b1deab634135d2306bdc28d34ec"
  },
  {
    "path": "http-body-1.1.0/src/lib.rs",
    "root": "lockedRegistry",
    "rawSha256": "125d4c7dfbc608130435fad85e5ce9a244eb8388383a6006370c6ab8d3e35300",
    "lfSha256": "125d4c7dfbc608130435fad85e5ce9a244eb8388383a6006370c6ab8d3e35300"
  },
  {
    "path": "apps/poms-api-rust/Cargo.toml",
    "root": "workspace",
    "rawSha256": "9685a0989c3362f4b3deeddda16bf075dc27f90b287e71894be18bc27c3b04c8",
    "lfSha256": "9685a0989c3362f4b3deeddda16bf075dc27f90b287e71894be18bc27c3b04c8"
  },
  {
    "path": "apps/poms-api-rust/Cargo.lock",
    "root": "workspace",
    "rawSha256": "90200ec57d3adcbecc7c2a6d7642e3a1197a55fb7ba188b09fb7ac57497a7f7c",
    "lfSha256": "90200ec57d3adcbecc7c2a6d7642e3a1197a55fb7ba188b09fb7ac57497a7f7c"
  },
  {
    "path": "apps/poms-api-rust/src/auth/http.rs",
    "root": "workspace",
    "rawSha256": "3e95e4f7c3686c9dac030494443afbd7f4a5ea173a7eb2fff159cd9c3591e70f",
    "lfSha256": "3e95e4f7c3686c9dac030494443afbd7f4a5ea173a7eb2fff159cd9c3591e70f"
  },
  {
    "path": "apps/poms-api-rust/src/http.rs",
    "root": "workspace",
    "rawSha256": "d9c57a206a92a819c4b365c182354731def891e709b0ea31bb100b2c89b3d30a",
    "lfSha256": "d9c57a206a92a819c4b365c182354731def891e709b0ea31bb100b2c89b3d30a"
  },
  {
    "path": "node_modules/@nestjs/common/file-stream/streamable-file.js",
    "root": "workspace",
    "rawSha256": "8cf78af8490034fdf624ebc76d4783a4f248a89bc3ff0afef3c74b0fae3ef279",
    "lfSha256": "8cf78af8490034fdf624ebc76d4783a4f248a89bc3ff0afef3c74b0fae3ef279"
  },
  {
    "path": "node_modules/@nestjs/platform-express/adapters/express-adapter.js",
    "root": "workspace",
    "rawSha256": "7bf0aeefa56a9c862294470ac809361cdcc6310bd860cfb1ba66e8123c741d56",
    "lfSha256": "7bf0aeefa56a9c862294470ac809361cdcc6310bd860cfb1ba66e8123c741d56"
  },
  {
    "path": "node_modules/@mikro-orm/core/types/UuidType.js",
    "root": "workspace",
    "rawSha256": "65eb7ecf7fab5d92cb04a364b7eaed29d2a600b34abcd82e2ff751d6f4130224",
    "lfSha256": "65eb7ecf7fab5d92cb04a364b7eaed29d2a600b34abcd82e2ff751d6f4130224"
  },
  {
    "path": "node_modules/@mikro-orm/core/platforms/Platform.js",
    "root": "workspace",
    "rawSha256": "49a2b9666d238d001d6439225ad381e1be6d46081deb825327db33c46746d866",
    "lfSha256": "49a2b9666d238d001d6439225ad381e1be6d46081deb825327db33c46746d866"
  },
  {
    "path": "node_modules/@mikro-orm/core/entity/EntityFactory.js",
    "root": "workspace",
    "rawSha256": "73d87b22e79da6140c1108e75934b0d7338853990f8c41b8bb1bcd57a1999fbb",
    "lfSha256": "73d87b22e79da6140c1108e75934b0d7338853990f8c41b8bb1bcd57a1999fbb"
  },
  {
    "path": "node_modules/@mikro-orm/core/unit-of-work/ChangeSetPersister.js",
    "root": "workspace",
    "rawSha256": "1a2c33d6d91454be04f3b8d5d353b79a2b22779594cc039597c99626c22878d3",
    "lfSha256": "1a2c33d6d91454be04f3b8d5d353b79a2b22779594cc039597c99626c22878d3"
  },
  {
    "path": "E:/projects/poms/node_modules/.pnpm/express@5.2.1_supports-color@8.1.1/node_modules/express/lib/response.js",
    "root": "absolute",
    "rawSha256": "2be00bc1c458a975bc7526d77092db4bd5e55208f5a541c2db51536913775754",
    "lfSha256": "2be00bc1c458a975bc7526d77092db4bd5e55208f5a541c2db51536913775754"
  }
]
```

Node内置source-only提取：v24.19.0 `_http_outgoing`，37804 bytes，raw SHA256 `f51fca6ff05f3e1382ed49379733803e6d2390bc521ce1103955d9e856dbd98f`，仅CRLF→LF SHA256 `559c44b487506f13adb16b8299a61ede3358c3b1a8d1cfa6ccff1b17f8d33d55`。仅提取内置文本，无HTTP或Server实例。

I统一端口交叉输入：`i-transport-plan.md` SHA256 `bbfaa4a15160f324a31f51f6d0a96e3bba5ee0338fef5b1a3c14ed4eeee33be0`；本次双方协调一致的StorageFailure<JsString>、I不预读和Root在audit后预取已纳入第2节。
