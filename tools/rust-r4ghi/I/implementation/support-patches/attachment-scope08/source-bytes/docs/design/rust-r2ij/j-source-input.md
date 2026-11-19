# RUST-R2J G0/G1 只读输入：19 个既有附件操作

状态：候选输入，等待 Root 联合 G1 冻结与非作者复核；本文件不是 G1 Pass、G2 开工或运行验收结论。

基线为 `61d6df1e971e7e785382dc85c75273e584ee2545`，工作树 `E:/projects/worktrees/poms-r2ef-foundation-audit/poms`，分支 `codex/poms-r2ij-storage-attachments`。J 只读取源码、契约、原测试与依赖源码，写本文件及 `j-g1-sources.json`。未启动产品、数据库、容器或服务，未安装依赖，未读取部署私密 env / 凭据，未执行对象存储请求、外部写入或 Git mutation。

本批 I/J 为 6 + 19 = 25 操作，J 为上传会话 6、附件 12、附件中心 1。R2A–H 当前 74/108；只有本批实际 G4 后可记 99/108。K/L/M、父 #67/#57、#61、R3–R5 不由这份输入关闭。特别是 J 的最小业务表读取不代表 R3/R4 业务操作已经迁移。

## 1. 需要 Root 冻结的接口与待见证条件

I 单一拥有 provider/runtime/config/adapter；J 只消费 provider facade，不在 J 中重做 SigV4、配置选择、密文、env fallback、HTTP 重试或 provider 错误政策。原 OBS 是 Node `fetch` + 自写 SigV4，不能按 SDK 语义推断。

I 与 J 已协调的候选 Rust 端口如下，仍以 Root 最终 G1 为准：

```rust
Arc<AttachmentStorage>
ObjectLocation { storage_provider: String, storage_bucket: Option<String>, storage_key: String }
UploadPlan { location: ObjectLocation, upload_mode: String }
ObjectMetadata {
    size_bytes: f64,
    e_tag: Option<String>, last_modified: Option<String>,
    content_type: Option<String>, checksum_sha256: Option<String>
}
PresignedPutTarget {
    method: String, url: String, headers: BTreeMap<String, String>, expires_at: String
}
async create_original_upload_plan(session_id: &str, original_name: &str,
    size_bytes: f64, created_at: Option<DateTime<Utc>>) -> Result<UploadPlan, ApiError>
async create_presigned_put_target(location: &ObjectLocation, content_type: Option<&str>,
    checksum_sha256: Option<&str>, expires_at: DateTime<Utc>) -> Result<PresignedPutTarget, ApiError>
async save_upload_session_object(location: &ObjectLocation, body: &[u8],
    content_type: Option<&str>) -> Result<ObjectLocation, ApiError>
async head_object(location: &ObjectLocation) -> Result<ObjectMetadata, ApiError>
async open_read_stream(location: &ObjectLocation) -> Result<axum::body::Body, ApiError>
async read_buffer(location: &ObjectLocation) -> Result<Vec<u8>, ApiError>
async remove(location: &ObjectLocation) -> () // 吞掉 provider delete 错误
```

J 在 session 创建时持久化 `providerType / storageBucket / storageKey / uploadMode`，后续对象操作使用该 location。这个 location 不含 config ID；provider facade 如何按现存 provider/bucket/key 找 runtime config 属于 I 原实现权威，不能把“冻结 location”写成“冻结整份 provider secret/config”。`read_buffer` 是必要端口：complete 在没有任何声明 checksum 时才读取全对象计算 SHA-256。

Root HTTP/共享支持需要：

- 在认证/CSRF/权限之后读取仍未被全局 parser 消耗的二进制 Body；octet-stream 原控制器无显式 cap，不能继承 JSON 的 100 KiB 限制或 axum extractor 的默认 cap。
- 返回流式 Body、原 `Content-Type`、JS `encodeURIComponent` 格式的 `Content-Disposition`、`Cache-Control: private, no-store`；请求 Range 没有专门处理，不能擅自增加 206/416、range header 或长度。
- 错误流发生在 headers 之前和之后的不同语义：本地固定 Nest 12.0.1 `StreamableFile` 先错误时 400 + 原始 `err.message`；headers 已发则 `res.end()`；已 destroyed 则返回。单纯 `axum::Body` error 未必能表达前一种原生行为，Root 应统一决定 transport support，不能将 stream 全部预读包装成普通 JSON 错误。
- 复用现有 `AuthUser / AuthHttpState / RoutePolicy / guards::authorize / ParsedBody / ApiError`、JS UTF-16 字符串与 Zod 错误兼容工具；不要用 serde Unicode 标量长度替代 JS 长度。
- 复用 R2E `DictionaryService::require_active_item("attachment-category", code)`、`SystemSettingsService::get_attachment_max_upload_size_bytes()`，R2F 原审计插入端口。J 各公开操作没有外层 domain transaction，审计应保留原 flush 顺序。
- J 的最小真实目标 projection 可以由 J store 只读实现，Root 独占 fixture/实际 PG/HTTP/UI 验收。没有当前目标表、原权限或可复核 fixture 时，必须报告真实失败，不能返回 fake success。

尚未运行、必须由 Root 后续受控见证的点：原 middleware 对 JSON/form 类型 PUT 流消耗后的行为、Range/HEAD/客户端中止、stream 错误与已设置 headers、MikroORM 实际 SQL 执行顺序和 row_version 增量、同版本并发以及故障后 session/object/audit 残留。这里已经冻结源码顺序；运行结果应追加证据，不能倒写成已经验证。

## 2. 19 个操作、原 Route 语法与状态

所有路由带全局 `/api` 前缀。下表字符串是 TS decorator 的源文本写法；例如源文本 `':id\\:void'` 经 JS 解码后为 path-to-regexp 的 `:id\:void`，匹配原始路径中的字面量 `:void`。不得将 action 改成子资源或无冒号 alias。三个 controller 的路径参数均为原 `string`，无 ParseUUIDPipe；query/body 的 UUID 才由 Zod 校验。

读 guard 为任一 `customer:read / lead:read / project:read`；写 guard 为任一 `customer:write / lead:write / project:write`。写方法还需既有 session-bound double-submit CSRF。Controller guard 通过后仍有下文 service 级检查。

| #   | operationId                                          | HTTP canonical path                                        | 原 decorator path                                   | 原成功状态 / 返回                    |
| --- | ---------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------------ |
| 1   | AttachmentCenterRecordController_list                | GET `/api/attachment-center-records`                       | `@Controller('attachment-center-records') @Get()`   | 200 / AttachmentCenterRecord[]       |
| 2   | AttachmentUploadSessionController_create             | POST `/api/attachment-upload-sessions`                     | `@Controller('attachment-upload-sessions') @Post()` | 201 / AttachmentUploadSessionSummary |
| 3   | AttachmentUploadSessionController_get                | GET `/api/attachment-upload-sessions/{id}`                 | `@Get(':id')`                                       | 200 / AttachmentUploadSessionSummary |
| 4   | AttachmentUploadSessionController_abort              | POST `/api/attachment-upload-sessions/{id}:abort`          | `@Post(':id\\:abort')`                              | 200 / AttachmentUploadSessionSummary |
| 5   | AttachmentUploadSessionController_complete           | POST `/api/attachment-upload-sessions/{id}:complete`       | `@Post(':id\\:complete')`                           | 200 / AttachmentSummary              |
| 6   | AttachmentUploadSessionController_proxyUploadObject  | PUT `/api/attachment-upload-sessions/{id}/object`          | `@Put(':id/object')`                                | 200 / AttachmentUploadTargetResult   |
| 7   | AttachmentUploadSessionController_createUploadTarget | POST `/api/attachment-upload-sessions/{id}/upload-targets` | `@Post(':id/upload-targets')`                       | 200 / AttachmentUploadTarget         |
| 8   | AttachmentController_list                            | GET `/api/attachments`                                     | `@Controller('attachments') @Get()`                 | 200 / AttachmentSummary[]            |
| 9   | AttachmentController_get                             | GET `/api/attachments/{id}`                                | `@Get(':id')`                                       | 200 / AttachmentSummary              |
| 10  | AttachmentController_update                          | PATCH `/api/attachments/{id}`                              | `@Patch(':id')`                                     | 200 / AttachmentSummary              |
| 11  | AttachmentController_clearFinal                      | POST `/api/attachments/{id}:clear-final`                   | `@Post(':id\\:clear-final')`                        | 200 / AttachmentSummary              |
| 12  | AttachmentController_markFinal                       | POST `/api/attachments/{id}:mark-final`                    | `@Post(':id\\:mark-final')`                         | 200 / AttachmentSummary              |
| 13  | AttachmentController_void                            | POST `/api/attachments/{id}:void`                          | `@Post(':id\\:void')`                               | 200 / AttachmentSummary              |
| 14  | AttachmentController_download                        | GET `/api/attachments/{id}/download`                       | `@Get(':id/download')`                              | 200 / StreamableFile                 |
| 15  | AttachmentController_link                            | POST `/api/attachments/{id}/links`                         | `@Post(':id/links')`                                | 200 / AttachmentSummary              |
| 16  | AttachmentController_unlink                          | DELETE `/api/attachments/{id}/links/{linkId}`              | `@Delete(':id/links/:linkId')`                      | 200 / AttachmentSummary              |
| 17  | AttachmentController_preview                         | GET `/api/attachments/{id}/preview`                        | `@Get(':id/preview')`                               | 200 / StreamableFile                 |
| 18  | AttachmentController_thumbnail                       | GET `/api/attachments/{id}/thumbnail`                      | `@Get(':id/thumbnail')`                             | 200 / StreamableFile                 |
| 19  | AttachmentController_versions                        | GET `/api/attachments/{id}/versions`                       | `@Get(':id/versions')`                              | 200 / AttachmentVersionSummary[]     |

全部 19 条在现有 108 操作 JSON 中 `canonical-match`；canonical 行位于 372–378、384、390–395、448–453。`j-g1-sources.json` 逐条保存原 inventory 对象、实际完整 OpenAPI operation 和原 decorator block。OpenAPI binary 三条只有 `200: {description:""}`，没有响应 content/schema 或 header 宣告；这项既有缺省应保留，不应为 Rust 单独增强完整规范。JSON 操作 schema/requestBody/parameters 的原对象也已逐条保存，来源不是手写重构。

原已移除 `POST /api/attachments`、`POST /api/attachments/{id}/versions` 两个 multipart upload 入口；服务仍保留旧内部方法和 mock 测试并不重新授权公开旧 route。不存在本片 DELETE 文件本体公共 API。

## 3. Zod / DTO / 返回契约

权威是 `shared-contracts.ts` 的 DictionaryCodeSchema（2396 起）和附件 schemas（3762–4165），`attachment.dto.ts` 只是 `createZodDto` 包装。`z.object` 默认剥离未知字段；没有 `.strict()`。number 没有字符串 coercion，整数/正数遵循原 Zod4 安全整数/JS number；string min/max 以 UTF-16 code units 计，不是 Rust char 数。默认值与 optional/null 区分要保留。

- `AttachmentTargetType`: `lead, customer, project, contract, sales-follow-up, project-handover`。
- `AttachmentStatus`: `active, voided, deleted, failed`；`AttachmentLinkStatus`: `active, unlinked`。
- security: `normal, internal, sensitive, confidential, restricted`；relation: `normal, source, evidence, final, handover`。
- category 是可运营字典 code：trim、1–64、正则 `^[a-z][a-z0-9-]*$`，不是旧固定 enum。创建或更改 category 还需 active dictionary item。security 默认按 category：quotation/contract/finance/internal-assessment -> sensitive，其余 -> internal。
- list query 必填 targetType 和 `z.uuid()` targetId，可选 category/status；无 includeVersions、分页、排序 query。
- create session：必填 operationType（create-attachment/create-version）、trim originalName 1–255、sizeBytes 正整数；可选 targetType、UUID targetId/baseAttachmentId、trim displayName/mimeType 1–255、trim checksumSha256 **长度64但无hex正则/大小写归一**、category/security/relation、trim description max4000 可 null、trim changeNote 1–2000。create-attachment superRefine 顺序检查 targetType、targetId、category；create-version 检查 baseAttachmentId、changeNote，错误 path/message 不得丢。
- create upload-target 只有 optional positive int expectedVersion；complete 是 optional expectedVersion + optional trim checksum length64；abort 是 optional expectedVersion + optional trim reason 1–1000。empty object 合法；null 不等于 optional。
- PATCH metadata：optional trim displayName 1–255、category、securityLevel、trim description max4000 nullable；没有“至少一项” refine，`{}` 合法，没有 expectedVersion 字段。
- mark-final：optional nullable trim note max1000；clear-final 和 void：必填 trim reason 1–1000。
- link：必填 targetType + UUID targetId，relationType 缺省 normal；unlink 无 body DTO。
- validation 失败是原对象 `{statusCode:400,message:"Validation failed",errors:issues}`；普通 service HttpException 是 Nest 标准状态描述对象；不应把 database/unknown error任意改成409/400。

`AttachmentSummary` 由 mapper 生成全部原字段：id、originalName/displayName/extension/mimeType、sizeBytes、checksumSha256、category/security/status、description、previousAttachmentId/changeNote、versionGroupId（fallback id）/versionNo/isLatest/isFinal、previewSupported/previewMimeType/previewUrl、thumbnailAvailable/thumbnailUrl、uploadedBy/uploadedByName、uploadedAt/updatedAt/deletedAt、links。**不返回 rowVersion、storage location、deletedBy、createdAt**。uploadedByName 用 `displayName ?? username ?? null`，空串不做 truthy fallback。

`AttachmentUploadSessionSummary` 返回 id、operationType/status/uploadMode/providerType、nullable target/base/completed IDs、file metadata、maxSizeBytes、nullable checksum/category/security/relation/description/changeNote、expiresAt/uploadedAt/completedAt/abortedAt/failedReason、rowVersion、createdAt/createdBy/updatedAt；不返回 bucket/key/secret/config。日期均 Date.toISOString，原 DB/应用时间精度必须对应毫秒。Attachment link 返回 id/attachmentId/targetType/targetId/relationType/status/linkedBy/linkedAt/unlinkedBy/unlinkedAt。

原全局 `ZodSerializerInterceptor` 仅在 `ZodSerializerDto` metadata 存在时选 response schema；本片三个 controller 没有该 metadata，仅有 ApiOkResponse/ApiCreatedResponse。不能因为声明了 response DTO 就推断每个返回对象会运行 Zod parse；stream 在 interceptor 中也明确豁免。

## 4. 目标权限、归属与最小真实 projection

`requireTargetAccess`（service 1934 起）先查 type 对应权限，再 `findOne({id})` 查真实行存在；**没有业务 owner、org、status 或所属项目额外检查**。不要为“安全改进”改变迁移兼容边界：

| targetType       | read/write permission                   | 现有真实表                  | J 最小读取                                                           |
| ---------------- | --------------------------------------- | --------------------------- | -------------------------------------------------------------------- |
| customer         | customer:read/write                     | poms.customer               | existence id；中心 id/customer_no/display_name                       |
| lead             | lead:read/write                         | poms.lead                   | existence id；中心 id/lead_no/lead_name                              |
| project          | project:read/write                      | poms.project                | existence id；中心 id/project_no/project_name                        |
| contract         | project:read/write                      | poms.contract               | existence id；中心 id/contract_no/project_id，关联项目 project_name  |
| sales-follow-up  | 三种 customer/lead/project 对应权限任一 | poms.sales_follow_up_record | existence id，不检查该行 customer_id/lead_id/project_id 与权限域配对 |
| project-handover | project:read/write                      | poms.project_handover       | existence id，不扩展到移交冻结事实或项目上下文                       |

这些 projection 仅消耗既有表，不新建/补种 business 对象，不提供 R3/R4 CRUD、不修改状态机、不读取或生成 R2K 下载包。原目标表定义、mapper 与迁移均被来源 manifest 指纹绑定。上传人摘要只读 `poms.platform_user(id,display_name,username)`，缺失返回 null。

具体 service 权限顺序：

1. `requireReadableAttachment`：requireAttachment -> active links（linkedAt DESC）-> 非 active 则404 -> security 检查 -> `canAccessAnyLink`。后者逐条尝试真实 target access，**捕获任何异常后继续**；没有任何可读 link 则403，即使 uploader 本人也没有读豁免。
2. security 只对 confidential/restricted 额外限制；任一 `contract:finance:sensitive:read / operating:finance:sensitive:read / commission:amount:sensitive:read / platform:roles:manage` 放行。名为 sensitive 的等级原实现不受该额外读限制。
3. `assertCanMutateAttachment`：uploadedBy === current user 则直接通过；否则任一 active link **type** 具有对应 write permission 即可，不查询真实目标存在、不做 security/active 检查。不同命令再独立决定 active 要求。
4. session 访问：createdBy 非空且非当前 user ->403；targetType/targetId 均非空时按真实 target access 指定 read/write 并立即返回。否则如有 baseAttachmentId，write 使用 mutation 规则；read 先security，再 uploader 本人或任一真实可读 link。createdBy null 无 owner 限制；没有 target/base 的历史行不会再追加目标检查。

中心 aggregate：根据权限仅放入 customer、lead、project、contract，后两种特殊目标不进入中心。先 active links -> latest active attachments -> 当前安全过滤 -> 批量读取目标/uploader。缺失目标行从中心结果移除。按 `(targetType,targetId,attachmentId)` 去重，多个 relationType 不产生重复中心行；完整 attachment.links 仍包含该附件的**全部 active links**。输出顺序 attachment.uploadedAt DESC，同时间采用 JS stable sort 与原 targetLinks linkedAt DESC 的相对顺序，没有 id tie-break。contract 的 targetName 用所属 projectName，项目缺失 fallback contractNo；targetOwnerName 始终 null。没有 N+1 前端业务列表聚合、服务端分页或全文检索。

R3 seam：原 `copyActiveLinksToTarget` 被 lead 转 project 调用，可接 entityManager，并排除 finance/internal-assessment；不是本片19操作之一。R4 seam：project-handover 在 J 仅真实存在性/权限，R2K 的 `requireProjectHandoverContext` 还会读取 handover.projectId、真实 project 与冻结事实，仍属后续 K/R4。不能用 J 的 existence probe 为 K/R4 签收。

## 5. 上传状态、对象副作用与提交顺序

状态闭集：pending/uploading/uploaded/validating/completed/failed/expired/aborted。后四项 terminal。TTL 创建时 now + 1h；GET **不检查或更新过期**；没有源码中的定时过期/对象回收 job。

### 创建

顺序：读取系统设置最大字节数 -> size > max 则400 -> now、净化文件名、扩展名白名单 -> normalize metadata/目标权限 -> UUID -> I createOriginalUploadPlan -> session insert flush -> `attachment_upload_session.created` audit flush -> summary。

create-attachment normalize 要求 target/category、active字典、真实target write；默认 relation normal、security如上，base/changeNote null。create-version 要求 base/changeNote；解析 versionGroup、找 active isLatest（versionNo DESC、uploadedAt DESC）fallback base；读取 latest links、mutation guard、latest active；session target取 latestLinks[0]（linkedAt DESC）、base保留请求base ID，category/security可覆盖，否则继承latest，relation null、changeNote trim。仅创建session，不创建attachment/link，不PUT对象。

session 固定 maxSizeBytes，后续 target 不重读设置。原缺省 displayName 为 trim displayName 或原文件名；MIME 为 trim mimeType 或 application/octet-stream；description trim 后空串/null均变null。

### 创建上传目标

find -> session access(write) -> optional expectedVersion精确比较 -> terminal检查 -> 过期检查 -> 仅pending/uploading可收object。pending先变uploading并 flush；随后 proxy直接给相对URL与headers，presigned再调用I签名。签名失败时 uploading/rowVersion 已可能提交，原代码不回退pending、不标failed、不写audit。uploading重复取target不再save，不应无条件增rowVersion。

proxy target为 method PUT、`/api/attachment-upload-sessions/{id}/object`、`{'content-type':session.mimeType}`、session.expiresAt、providerType、固定maxSizeBytes。非proxy调用createPresignedPutTarget；multipart虽在enum，当前provider不会正常选择它，J源码也没有multipart分支，应继承已有未来增强边界。

### Proxy PUT object

controller先将 IncomingMessage 全部chunks Buffer.concat（guard已执行），然后service：find -> session access(write) -> terminal/过期/允许状态 -> 必须proxy -> buffer.length等于声明size -> SHA256 lowercase hex -> 有session checksum则精确字符串比较，无则设置actual -> I PUT -> 设uploaded/uploadedAt -> session flush -> result。

没有expectedVersion body/请求头校验，没有上传进度持久化，没有写audit。允许pending直接PUT，无需先取target。PUT错误发生在session状态保存之前；设置checksum的managed对象存在内存但没有本方法flush。PUT成功而随后的DB CAS/flush失败时对象可能残留，原代码不delete。声明size相等替代重新读取动态限制；流完整缓冲发生在service长度/checksum检查之前。

### Complete

1. find -> access(write) -> expectedVersion -> terminal -> expiry；如request/session checksum均有且不同则400。此处异常在try之外，不标failed。
2. session.status=validating；**第一次 session flush 在try之外**。该保存失败原方法不进入catch。
3. try内I HEAD，对象size必须严格等于session.sizeBytes，否则409。
4. declared = request.checksum ?? session.checksum。有declared时只在HEAD checksum trim后非空且不等时400；HEAD checksum不存在/空时**信任声明，不读对象**；保留declared大小写/非hex64字串。无declared时readBuffer计算SHA256；这一路不使用HEAD checksum替代全对象读取。
5. session.uploadedAt空才设now；按operationType走新附件或新版本。这里再次执行真实target write或latest mutation/active检查。
6. attachment + link（或旧latest + 新attachment + copied active links）flush -> `attachment.uploaded / attachment.version_created` audit flush -> mapper（uploadedByName明确null）。对象不移动，正式attachment继续引用session临时key。
7. session设completed/completedAttachmentId/completedAt，failedReason=null -> session flush -> 返回先前attachment summary。
8. try中的任何错误：session设failed，failedReason为Error.message或固定兜底 -> session flush -> rethrow。没有删除对象、附件或链接，也没有失败audit；catch保存本身失败可以覆盖原错误。

complete允许任何非terminal状态，包括pending/uploading/uploaded/validating，不要求先uploaded，也不检查session.uploadMode。success之后再complete不是幂等读，返回409 already completed。没有“会话completed与附件/audit原子提交”保证。

### Abort / 请求内过期

abort：find/access(write)/expectedVersion -> completed则409；若非terminal，先I remove(best-effort，吞delete异常)，再设aborted/abortedAt/reason(trim或null) -> session flush -> aborted audit flush。若failed/expired/aborted，原方法直接返回原summary，不delete、不更新reason、不audit；abort不先判断TTL，因此时间已过但状态尚pending的session仍可abort。

过期仅由target/PUT/complete路径的 `expiresAt <= Date.now()` 触发：设expired/failedReason='Attachment upload session expired' -> session flush ->409 has expired；不delete对象、不写audit、不设abortedAt。terminal检查先于过期检查，failed等不会被重写成expired。GET过期session仍显示旧status。

### 副作用/故障残留冻结

| 故障点                               | 原持久化/对象状态边界                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| create plan失败                      | 尚无session/attachment/object PUT                                            |
| session创建audit失败                 | session insert可已提交；请求失败，不能回滚声明成功                           |
| pending取target后的签名失败          | uploading状态可已提交；无object/audit补偿                                    |
| proxy PUT成功后session保存失败       | 对象可存在；session未可靠变uploaded；无删除                                  |
| complete HEAD/size/checksum/read失败 | validating已提交；catch尝试failed；对象保留，无attachment写                  |
| complete domain guard失败            | 同上；不假定删除object                                                       |
| complete附件flush成功后audit失败     | attachment/link可已提交；catch尝试failed；对象仍在；不补偿附件               |
| complete completed保存失败           | attachment/link/audit可已提交；catch再次尝试failed；不得假定最终状态         |
| abort delete成功后session flush失败  | object可已删除，session仍非terminal；无回补                                  |
| abort audit失败                      | delete/aborted可已完成；请求仍失败                                           |
| stream audit失败                     | storage stream已打开，但controller尚未得到StreamableFile；无成功HTTP完成保证 |

`persist(...).flush()`处理整个当前MikroORM UoW，不只显式参数数组。特别complete在第一次validating flush之后改checksum/uploadedAt，后续附件flush可能**同时提交session dirty字段并推进row_version**。固定本地ORM源码确认 computeChangeSets遍历identityMap；commit在finally清理persist/remove/changeSet等队列，doCommit在finally重置transaction context。这里没有依据宣称当前ORM会自动close EM。失败后managed实体、原SQL顺序、rowVersion以及catch能否写failed，必须实际PG故障测试见证，不能把上表“可”升格为必然最终状态。

## 6. 版本、最终版、metadata、作废、链接

- list：真实query目标read；active target links；默认status active、isLatest true，可选category/status，uploadedAt DESC。只按security过滤，不再逐条target guard。status=voided也仍要求isLatest，因此一般被作废latest清除后不在列表。
- get：requireReadableAttachment全部规则，随后加载uploader。
- versions：先对请求id做requireReadableAttachment，再按versionGroup查所有状态版本，versionNo DESC、uploadedAt DESC；无结果fallback当前attachment；只按各版本security过滤，不再逐版本target/access/active检查。每个版本带各自active links。
- version complete：以**完成时**最新active版本为基准，不必仍是创建session时那一版。旧latest设isLatest=false，保留旧isFinal；新id、新versionNo=latest+1、isLatest=true、isFinal=false、previousAttachmentId=latest.id；复制所有active links（新ID、linkedBy当前用户、linkedAt上传时间）；category/security使用session值或latest；description为session.description ?? latest.description；不重选provider，不copy/delete对象。
- mark-final：requireAttachment/links/mutation guard、active检查；versionGroup fallback；目标置final=true，组内所有其他isFinal清false（不按status过滤），一个saveAll；写final_marked audit，note trim空为null；最后getAttachment。因此写和audit已提交之后，仍可能因用户缺read/security或目标缺失返回403。
- clear-final：同样要求目标active及mutation guard；清整个组所有final，不要求目标本身是final；如无changed不saveAll但照写final_cleared audit（reason原已trimDTO）；最后getAttachment。
- PATCH：requireAttachment/links/mutation guard，**无active要求**。只改出现的字段，category重新requireActive；description空变null。saveAll即使无实际变化仍调用flush，ORM dirty detection决定rowVersion/updatedAt，随后metadata_updated audit（before/after放metadata中），最后getAttachment。把security升到当前user无权读取时可以写成功后返回403；对voided行可写成功后返回404。
- void：requireAttachment/links/mutation guard、active检查；status=voided、deletedBy/current、deletedAt now、isFinal=false。若isLatest则false，按组版本倒序找第一个其他active设latest=true；一个saveAll，voided audit，然后直接mapper返回作废summary（不经requireReadableAttachment），对象和active links都保留。
- link：先requireReadableAttachment（包括security与真实可读link），再新target真实write；如同attachment/targetType/targetId/relation已有active link则get并直接返回，无audit。否则insert link -> linked audit ->重读全部active links/uploader ->mapper。没有额外现有attachment mutation guard，读取权限与新目标写权限即原边界。
- unlink：requireAttachment不要求active/readable；findLink且attachmentId精确匹配，否则404；对该link目标真实write。若active则改unlinked/unlinkedBy/unlinkedAt ->saveAll ->unlinked audit；已unlinked只跳过写。最后getAttachment，取消最后可读link或用户缺read时可在写成功后403；voided附件可在取消后404。文件本体从不删除。

## 7. 二进制、Header、文件名与 stream 失败

preview：requireReadableAttachment -> previewKind -> unsupported则415且不open storage -> I open stream -> previewed audit ->controller。image要求 lower mime startsWith image/ 且扩展名lower属于 png/jpg/jpeg/webp；pdf条件为 lower mime == application/pdf **或** lower extension==pdf。因此`.pdf`配任意MIME仍被判PDF可预览，实际返回Content-Type仍是原MIME，不能矫正。

thumbnail：同样read guard，只有image previewKind允许，否则415；**直接打开相同原始对象**，不生成缩略图、不resize、不换MIME/filename。download对所有active且可读的文件均开原对象，无预览类型限制。

三者都在open stream之后、返回controller之前写成功audit；audit并不证明stream已经完整送达浏览器。事件依次为attachment.previewed、attachment.thumbnail_viewed、attachment.downloaded，metadata含fileName/category/securityLevel，前两者还含versionGroupId/versionNo，preview另有previewKind。

controller设置：

- Cache-Control 固定 `private, no-store`。
- Content-Type 是attachment.mimeType原串；无安全下载类型重写。
- preview/thumbnail为 `inline; filename*=UTF-8''` + encodeURIComponent(originalName)；download为 `attachment; filename*=UTF-8''` + 同编码；无filename=备用参数。
- encodeURIComponent保留 `A-Z a-z 0-9 - _ . ! ~ * ' ( )`，UTF-8其他字节大写百分号。空格是%20；不是form的+；非ASCII使用UTF-8；lone surrogate会抛URIError，不能静默转U+FFFD后产生不同header。数据库写入PG时孤立surrogate会经Node UTF-8编码替换，原JSON返回与之后PG重读亦须区分。
- originalName先Zod trim/1–255 code units，然后service将反斜杠换/、取最后一段trim、空则400，再slice(0,255)。service的slice按UTF16，可切开代理对；HTTP有效输入通常已受255约束，但内部历史方法/脏数据仍需保留语义。扩展名为运行平台node:path.extname(name).replace('.', '').toLowerCase()；白名单 pdf/doc/docx/xls/xlsx/csv/ppt/pptx/png/jpg/jpeg/webp/txt/md/zip，不能MIME猜测。
- J controller未传StreamableFile length；无主动Content-Length/ETag/Last-Modified/Accept-Ranges/Content-Range；没有条件缓存/If-Range处理。Nest Express对Readable直接pipe并只设置未存在的stream headers。应用源码和固定adapter未实现Range；实际请求中的默认Node/Express header/HEAD/中止行为仍须Root见证。

固定Nest12.0.1 StreamableFile.handleError：res.destroyed则直接return；res.headersSent则res.end()；其余设置statusCode=400并res.send(err.message)。这条不是service HttpException JSON；如果此前已有MIME/Content-Disposition/Cache-Control则可能沿用。open_read_stream本身reject发生在返回StreamableFile之前，走正常异常层；provider特定404/400/500由I冻结。任意stream error发生时序、提前打开后audit失败的stream释放和异常日志属于真实运行待观测项。

请求体：NestFactory.create没有自定义body limit；ExpressAdapter注册JSON/urlencoded parser，body-parser2.2.2默认100kb，只解析对应type并按inflate规则读取。`application/octet-stream`没有raw middleware；PUT控制器 `for await (chunk of req)` 不计cap、不用Content-Length替代实际buffer长度，也不验证request Content-Type。JSON/form类型可被前置parser消费，原控制器仍读IncomingMessage；Rust现有body_parser处理后已把Body换empty，不能为了PUT擅自从ParsedBody重造原始bytes。无显式cap不等于无限内存承诺；本片不增加新的产品限制。

## 8. DDL、索引、CAS 与审计边界

只复用既有poms schema，不提议产品migration。迁移链需要包含：EX45 attachment/link建表；EX56C status defaults；EX58B target enum `sales_follow_up` -> `sales-follow-up`；EX58C移除attachment固定category约束、kebab code迁移与字典seed；EX51 version group not-null/backfill与版本索引；EX52A扩target含project-handover（K三表不由J写）；EX65D upload session；EX67A `max_size_bytes`列、回填greatest(size_bytes,52428800)、正数check和50MB设置seed。

- attachment：UUID主键/组/previous，integer size/versionNo/rowVersion；filename/displayName/MIME varchar255、checksum64、extension32、category64、security/provider/status32、bucket255、key1024，description/changeNote text，timestamps timestamptz。rowVersion为MikroORM version()，updatedAt onUpdate。previousAttachmentId无现entity FK；不要为迁移补新FK。
- 索引：uploaded_at、uploaded_by、category/status、checksum_sha256、version_group/uploaded_at；unique(version_group_id,version_no)；partial unique version_group where status=active and is_latest=true；partial unique version_group where status=active and is_final=true。
- attachment_link：UUID主键、attachment_id restrict FK、UUID target_id但无多态目标FK；type64、relation/status32，操作者UUID可null与timestamptz。**无rowVersion**；target/type/status/linkedAt DESC索引，attachment/status索引；partial unique(attachment,targetType,targetId,relationType) where status active。
- upload session：UUID id，operation/status/uploadMode/provider各varchar32；bucket255/key1024；targetType64/targetUUID nullable；base/completed attachment FK restrict；metadata同上；size/maxSize整数、checksum64 nullable；category/security/relation nullable；TTL与各可空状态时间timestamptz；rowVersion version()；createdBy可null。状态/模式/provider/target/security/relation闭集check、max_size_bytes>0，无新增对象存在性check。
- upload session索引：status/expiresAt、createdBy/createdAt、targetType/targetId/status、baseAttachmentId、completedAttachmentId。
- explicit expectedVersion仅三种session命令（target/complete/abort）；缺省不做客户端期望值比较，但每个已有version实体实际UPDATE仍要 `WHERE id AND loaded row_version` CAS。attachment公开commands没有expectedVersion字段，不能因此省掉内部CAS。
- 原ORM只有dirty更新推进rowVersion/updatedAt；duplicate link、已unlinked、already terminal abort、再次取uploading target以及`PATCH {}`的实际变化不同。用rowVersion+1硬写所有调用会漂移。
- 唯一冲突/内部CAS错误在本片没有catch转ConflictException；原未知异常通过BaseExceptionFilter为500 Internal server error。explicit版本不匹配与业务状态冲突才有对应409文本。实际 SQL与错误payload需Root受控并发见证。
- 除了后续R3可传transaction的内部copy seam，本片service `recordAudit`没有entityManager参数，原runtimeAudit默认saveAll.flush；必须保留成功entity写与后续audit的独立失败边界。不能把metadata_updated的before/after擅自移到顶层beforeSnapshot/afterSnapshot。

seed只读搜索：现有seeders六文件没有attachment字样，故没有“原附件对象seed成功”的证据。字典与设置的seed来自migration；Root所需完整业务/附件fixture应按真实schema在隔离环境建立，并将fixture来源与旧production/local数据分开。

## 9. 原 Angular 行为和源码测试边界

`AttachmentPanel`消耗真实targetType/targetId/canWrite，客户/线索/项目/合同页面传入；canWrite仅前端入口控制，后端不依赖它。列表展示分类/security/版本/latest/final/preview、上传人/时间/大小；操作含preview/history/download，新版本/final/void仅canWrite显示。没有旧multipart调用。

Store上传流程：计算WebCrypto SHA256（没有subtle时省略）->create session ->create target（空body，不传expectedVersion）->proxy generated client带认证/CSRF PUT，或new HttpClient(HttpBackend)直传presigned URL（仅目标headers，绕原interceptors）->complete（传checksum或空object，不传expectedVersion）。进度在uploading capped99%，收到Response为100%，completing不可abort；不会GET轮询session。失败自动best-effort abort（不传expectedVersion），panel保留文件/metadata允许重试，重试重新建立session；主动中止取消订阅并发abort请求，cleanup错误被store吞掉。

preview/download/thumbnail以HttpClient responseType blob读取，preview把objectURL赋image或PDF iframe，关闭/销毁时revoke；download创建隐藏a挂body、click、remove，1000ms后revoke。Content-Disposition filename*优先decodeURIComponent，再fallback普通filename，再fallback默认名。thumbnail store虽然容忍204/空Body，但原后端不支持thumbnail时返回415，不能据此前端容忍添加204路径。

中心store只调用一次GET attachment-center-records并映射来源跳转；客户/线索queryId，项目/合同详情route。类型只接受customer/lead/project/contract。筛选关键字、类型、分类、上传人、起止日期、分页与排序均在前端做，不能把UI筛选推断为服务端query参数。中心不直接下载/preview，只“查看来源”。

源码测试是mock证据输入，**未在本次运行**：AttachmentService spec共18项，其中旧内部uploadAttachment/uploadAttachmentVersion/copyActiveLinks的测试不等于本片公开HTTP覆盖；现有新增session测试主要是创建、超限、固定max、proxy→complete、presigned checksum metadata；没有覆盖所有19操作、过期、owner、并发、故障提交、native stream/Range/header。Panel spec包含列表、窄dialog toolbar、下载及失败、upload metadata/progress/abort/retry/error、history/version upload、final commands；center spec3项（显示、keyword、来源跳转）；未发现独立attachment store spec。原mock对象中的假UUID/合成业务数据不作为真实PG/HTTP证据。

旧EX65E/FE60B的real OBS均是显式mock替代，真实租户验证转生产启用检查；multipart被重分类未来增强。本批仍须分列源码/mock、受控本地storage/OBS emulator、真实OBS租户证据，不能引用旧G4文字宣称真实OBS已经验收。

## 10. Root 后续验收输入清单

以下是待执行输入，均非已经通过：

1. 19操作exact method/path/operationId、OpenAPI完整操作与schema闭包、canonical route与TS/shared/generated不变检查；action literal suffix、encoded suffix、非UUIDpath、大小写/trailing slash、未知methods维持既有共享router边界。
2. 全部19操作session/CSRF/任一controller权限；再按六种真实target、missing target、owner不等/createdBy null、write-only/read-only/uploader/非uploader、confidential/restricted各敏感读权限、无active link验证service顺序。
3. 真实最小projection中心：四类目标、contract项目存在/缺失fallback、目标缺失、同附件多个relation去重、多个目标重复attachment、全active links不截断、同时间顺序、latest/status过滤、uploader缺失与空displayName。
4. create附件和create-version完整链、动态setting冻结、不支持extension、JS trim/UTF16/255边界、checksum非hex/大小写、null/unknown字段、size<=0/小数/字符串/上限、body正负例与精确Zod issues。
5. proxy不经target直接PUT、错误mode/size/checksum、body>100KiB合法octet-stream、JSON/form被消费、compressed body parser与内容类型；上传target签名失败后的状态。
6. complete pending/uploading/uploaded/validating与terminal全部状态、TTL等号、两种声明checksum/HEAD缺失checksum/无声明全对象hash、missing/错误size/checksum；失败状态与对象/attachment/link/audit残留。
7. version从旧base并发追到完成时latest、latest/final独立、metadata无变化/空description、final/clear全组、void latest回退、duplicate link、重复unlink/最后link写后403与受限security写后403。
8. 同loaded row_version并发target/PUT/complete/abort、attachment commands、unique latest/final/version_no/active_relation；ORM dirty detection与shared UoW coflush；用故障注入验证各flush/audit/object前后顺序。
9. PDF/image/download原bytes hash与headers、thumbnail等于原图、unsupported415、无Range处理、HEAD、stream open失败/首块前错误/部分传输失败/客户端中止和审计边界。
10. 原Angular真实UI：四类来源panel、本片全上传/版本/final/void/preview/download/失败retry/abort、中心来源跳转；R3/R4页面可加载依赖还未迁移时应报告partial UI，不能伪造业务端点或借Nest域响应冒充Rust已实现。

本输入不授权J创建数据库fixture、运行接口、安装依赖、使用真实OBS凭据或改共享路由/Cargo。来源原字节与仅CRLF→LF的SHA256、完整19项操作快照见 `j-g1-sources.json`。只有 Root 联合 G1 冻结后才进入获派产品写范围。
