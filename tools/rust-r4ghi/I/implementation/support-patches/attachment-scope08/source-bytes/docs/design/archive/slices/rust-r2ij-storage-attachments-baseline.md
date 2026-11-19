# RUST-R2I＋R2J 存储与附件联合实施基线

- Gate Status：G1 Pass（2026-10-28T18:07:35.477Z）；同一次[非作者联合审查](../../rust-r2ij-g1-review01.json)通过，P0/P1/P2/P3=0，I/J可进入Doing。受审原文保全于tmp/rust-r2ij/g1-baseline-reviewed-original.md，hash绑定原候选；以下仅补Gate状态，不改变冻结语义。尚无运行验收或G4完成声明。
- 用户授权：2026-10-29 的“开始”，承接上一轮 R2I＋R2J 共25操作提议，完成本批 G0–G4。父任务 [#67](https://github.com/illusion-tech/poms/issues/67) / [#57](https://github.com/illusion-tech/poms/issues/57) 保持 Open。
- 子片：[R2I #76](https://github.com/illusion-tech/poms/issues/76) 6操作、[R2J #77](https://github.com/illusion-tech/poms/issues/77) 19操作。类型：cross-layer-high-risk；当前起点74/108，只有本批实际 G4 后才能记99/108。
- 基线：main `61d6df1e971e7e785382dc85c75273e584ee2545`。复用干净隔离工作树 `E:/projects/worktrees/poms-r2ef-foundation-audit/poms`，分支 `codex/poms-r2ij-storage-attachments`；primary `E:/projects/poms` 保留。采用既有 solo checkpoint 工作流，独立 G3 后提交推送、集成检查，G4 才归档和关闭子 Issue。
- Owner：Root 负责架构、共享接线、环境、实际验收与治理；I/J 作者独占各自模块；C 非作者审查。子代理按迁移计划1.1显式使用 `gpt-6.1-sol` / `max`，Fast 无独立控制参数，未核实。主聊天目标 GPT-6 Astra / Ultra 不写作实际运行证明。

## 1. 范围与正式输入

本批只迁移现有25操作、本地与 OBS S3-compatible adapter、默认配置与密文、上传会话、附件版本/链接/预览/中心。没有新公开路由、旧 multipart 入口恢复、产品 DDL、原 TS 产品修改、生产部署、正式外部写入或性能 PoC。K/L/M、#61五项 K 参数裁决、R3–R5业务命令和父任务收口不在本批。

| Input Type           | Source                                                                                                               | Authority / Boundary                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Business / migration | [迁移计划](../../backend-rust-migration-plan.md) 1.1/1.2/1.2.1；[R2范围](../../rust-r2-scope-and-dependencies.md)    | 既定调度、隔离、模型、证据与交付规则               |
| Route / ADR          | [108操作归属](../../rust-r2-operation-slices.json)；[canonical](../../api-route-canonical-inventory.md)；ADR-015/018 | I6/J19均canonical-match；K5独占#61                 |
| DTO / OpenAPI        | `libs/api/contracts/src`、`libs/shared/contracts/src`、`libs/shared/api-spec/openapi.json`                           | 现行 TS/Zod/完整规范继续单向拥有协议               |
| Command / query      | `apps/poms-api/src/app/features/attachment/` 的现行controller/service/repository/mapper                              | 真实顺序、错误、权限、状态及副作用权威             |
| Persistence          | 原 attachment/provider/session/link entity、92份历史migration                                                        | 复用既有物理表/索引/约束，不新增migration          |
| UI                   | 原存储配置页、AttachmentPanel、附件中心与stores                                                                      | 保留现有 Angular/generated client 消费方式         |
| I详细冻结输入        | [I输入](../../rust-r2ij/i-source-input.md)、[I来源](../../rust-r2ij/i-sources.json)                                  | 61件来源双哈希；候选正文由本包裁定后生效           |
| J详细冻结输入        | [J输入](../../rust-r2ij/j-source-input.md)、[J来源](../../rust-r2ij/j-sources.json)                                  | 102件来源双哈希、19操作、31 schema闭包             |
| G0独立盘点           | [依赖清单](../../rust-r2ij/g0-dependencies.json)                                                                     | 25逐项依赖、6类真实业务projection及K排除清单       |
| Environment          | [只读环境输入](../../rust-r2ij/environment-input.json)                                                               | 37来源；新IJ容器/volume/DB/端口与完整fixture支持链 |

共享端口的锁定依赖源码依据及细节见 [I transport](../../rust-r2ij/i-transport-plan.md) 与 [J binary](../../rust-r2ij/j-binary-plan.md)；与本包第5节共同进入同一次联合G1。新鲜在线收据为 `tmp/rust-r2ij/g0-online-issues.json`（2026-10-28T17:59:40.456Z），#76/#77 body/comments/closing PR/labels/projects与sub-issues/blocked-by/blocking均已读取；两Issue Open/Todo，在线关系集合均空，正式依赖采用本包已完成能力，不把空关系解释为无依赖。

上述原始来源清单保留基线时点 raw/LF 指纹；后续治理状态修改不倒写原件。详细输入保留作者候选时点措辞，本包第5节的最终公共端口优先于候选中的ApiError/类型建议；候选本身没有独立Gate效力。来源/runtime/export/受控HTTP/真实租户证据分别记录，不将源码测试数量当作本次通过数。

## 2. SSOT 与路由边界

| Concern               | SSOT                                                      | Implementation Rule                                                                                                                                |
| --------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route / command / DTO | 原controller、Zod、canonical、完整OpenAPI                 | 精确method/path/action冒号/operationId/status/null/unknown字段与issues；无新alias                                                                  |
| Naming / enum         | 共享TS声明与原DDL                                         | 原英文技术标识符，closed enum与kebab code不改名                                                                                                    |
| UUID                  | 原Zod string、ORM与PG各自边界                             | query/body仅原Zod校验；path原string，不新增ParseUUID 400；按各方法真实managed实体/refresh顺序区分首次返回与PG重读大小写，不全局规范化或全局保留raw |
| Date / number         | JS Date.toISOString、Number、UTF-16与PG列类型             | UTC毫秒、safe integer、UTF-16 trim/length/slice；不以Unicode标量长度替代                                                                           |
| Money                 | N/A                                                       | 本批无金额计算或金额列写入                                                                                                                         |
| State / version       | 原service顺序与MikroORM dirty/CAS                         | explicit版本可省略；内部loaded row_version CAS仍保留；no-op不硬加版本                                                                              |
| Storage / secret      | 原registry、local/OBS provider、attachment secret options | 位置快照与运行config分开；无真实OBS env凭据fallback                                                                                                |
| DDL / data            | 原migration/entity/PG15实际catalog                        | 不增加FK/唯一性/全局事务或新状态机                                                                                                                 |

| Slice | Method / canonical path                                               | operationId                                                                   |
| ----- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R2I   | GET `/api/platform/attachment-storage-providers`                      | `AttachmentStorageProviderController_listAttachmentStorageProviderConfigs`    |
| R2I   | POST `/api/platform/attachment-storage-providers`                     | `AttachmentStorageProviderController_createAttachmentStorageProviderConfig`   |
| R2I   | GET `/api/platform/attachment-storage-providers/{id}`                 | `AttachmentStorageProviderController_getAttachmentStorageProviderConfig`      |
| R2I   | PATCH `/api/platform/attachment-storage-providers/{id}`               | `AttachmentStorageProviderController_updateAttachmentStorageProviderConfig`   |
| R2I   | POST `/api/platform/attachment-storage-providers/{id}:set-default`    | `AttachmentStorageProviderController_setDefaultAttachmentStorageProvider`     |
| R2I   | POST `/api/platform/attachment-storage-providers/{id}:testConnection` | `AttachmentStorageProviderController_testAttachmentStorageProviderConnection` |
| R2J   | GET `/api/attachment-center-records`                                  | `AttachmentCenterRecordController_list`                                       |
| R2J   | POST `/api/attachment-upload-sessions`                                | `AttachmentUploadSessionController_create`                                    |
| R2J   | GET `/api/attachment-upload-sessions/{id}`                            | `AttachmentUploadSessionController_get`                                       |
| R2J   | POST `/api/attachment-upload-sessions/{id}:abort`                     | `AttachmentUploadSessionController_abort`                                     |
| R2J   | POST `/api/attachment-upload-sessions/{id}:complete`                  | `AttachmentUploadSessionController_complete`                                  |
| R2J   | PUT `/api/attachment-upload-sessions/{id}/object`                     | `AttachmentUploadSessionController_proxyUploadObject`                         |
| R2J   | POST `/api/attachment-upload-sessions/{id}/upload-targets`            | `AttachmentUploadSessionController_createUploadTarget`                        |
| R2J   | GET `/api/attachments`                                                | `AttachmentController_list`                                                   |
| R2J   | GET `/api/attachments/{id}`                                           | `AttachmentController_get`                                                    |
| R2J   | PATCH `/api/attachments/{id}`                                         | `AttachmentController_update`                                                 |
| R2J   | POST `/api/attachments/{id}:clear-final`                              | `AttachmentController_clearFinal`                                             |
| R2J   | POST `/api/attachments/{id}:mark-final`                               | `AttachmentController_markFinal`                                              |
| R2J   | POST `/api/attachments/{id}:void`                                     | `AttachmentController_void`                                                   |
| R2J   | GET `/api/attachments/{id}/download`                                  | `AttachmentController_download`                                               |
| R2J   | POST `/api/attachments/{id}/links`                                    | `AttachmentController_link`                                                   |
| R2J   | DELETE `/api/attachments/{id}/links/{linkId}`                         | `AttachmentController_unlink`                                                 |
| R2J   | GET `/api/attachments/{id}/preview`                                   | `AttachmentController_preview`                                                |
| R2J   | GET `/api/attachments/{id}/thumbnail`                                 | `AttachmentController_thumbnail`                                              |
| R2J   | GET `/api/attachments/{id}/versions`                                  | `AttachmentController_versions`                                               |

全部25条canonical aligned；不改库存语法。I testConnection 的旧canonical/OpenAPI“配置完整性”文字与 EX-65C/current runtime真实探测不一致，分类 `existing-baseline-drift`；按现行原Nest探测行为迁移，原完整spec继续保护，不通过迁移夹带文字变更。binary三操作原spec没有响应schema/header宣告，保留既有缺省。

## 3. I：配置、位置、密文与 adapter

I输入1–10节逐项冻结。权限为 `platform:attachment-storage-providers:manage`；list无分页、createdAt DESC、enabled保留 `z.coerce.boolean()` 非空字符串truthy。normalizeStatus顺序、disabled re-enable行为、nullable/omitted credential、optional expectedVersion、partial unique默认/位置与no-op default保留原样。

配置业务flush与audit后续flush独立；默认切换同一业务flush更新旧/新两行，不把配置与audit包成新整体事务。connection test不保存状态/版本/audit；local是真实mkdir/write/unlink探针，OBS是真实signed HEAD bucket；registry catch为200 failed，而不存在/版本冲突仍走404/409。必须实际检查失败探针残留。

密钥复用 `auth::crypto::SecretCipher::from_env`，attachment options依次取 `ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY` / `POMS_SECRET_KEY` / `JWT_SECRET` / 原literal fallback，按原truthy规则；不新造AES。`POMS_ATTACHMENT_LOCAL_ROOT` 保留nullish优先级与空串=CWD，实例构造时解析。Config只新增窄环境snapshot，Debug脱敏，验收只用合成key。

新对象按当前default选择location；历史对象按provider/bucket/key查最长原始prefix长度，保留disabled配置及同长createdAt顺序。location不含config ID；default切换不迁移历史对象，endpoint/credential变更可影响历史读取。local路径保留lexical resolve边界、默认双层attachments、真实stat/mtime/bytes；不新增realpath硬化或metadata sidecar。

OBS按原Node fetch＋自写SigV4实现，不使用GH axios协议假设或AWS SDK语义。精确endpoint query/port/URLSearchParams/path编码、普通签名与presign排序分别保留；每次请求仅签一次，3次仅重试fetch rejection，250/500ms，HTTP非2xx不应用重试。404与502/安全错误body UTF-16截断、HEAD Number容错、空checksum优先级、GET后续流错误与presign clamp按I输入冻结。20跳fetch跟随与跨origin敏感header移除、10s连接/300s headers及body默认需同目标Node实证；不加GH21跳/10s总超时/proxy默认。transport偏差先取原Nest witness，必要时追加纠偏记录。

## 4. J：权限、上传、版本与真实读侧

J输入3–8节逐项冻结。controller读/写为 customer/lead/project 对应权限任一；之后service按原顺序做session owner、真实target、security、uploader/mutation规则。customer/lead/project/contract/sales-follow-up/project-handover六类只读真实projection，不虚构行、不补业务成功或新增owner/org约束；contract使用project权限。中心只聚合前四类目标，保留去重、missing目标过滤、完整active links和JS stable sort。该最小读取不代表R3/R4业务迁移。

上传保留固定maxSizeBytes/1h TTL、GET不触发过期、pending可直接PUT、无声明checksum才全对象hash、声明checksum可含非hex且大小写敏感。JSON/form parser先消费请求体，octet-stream在guard后全缓冲；不新增100KiB二进制cap或把ParsedBody重构为原bytes。

complete严格保留validating flush在try外、HEAD/hash、attachment/link flush、audit flush、completed flush与catch failed flush的顺序。原flush会coflush当前managed session dirty字段；J须以请求内context保留这部分状态和loaded CAS，实际Nest SQL/UoW witness裁定版本与失败后残留。无新完整事务、幂等complete、对象移动或失败补偿。abort/expiry、version/latest/final、metadata空更新、duplicate link/重复unlink、写后403/404与对象保留按原实现。

| Persistence                        | Existing authority                 | Contract boundary                                                                                          |
| ---------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| attachment_storage_provider_config | EX-65A/B/C原migration/entity       | 19列、两partial unique、ciphertext私有；不新增seed                                                         |
| attachment_upload_session          | EX-65D、EX-67A原migration/entity   | int4 size/max、8状态、3模式、nullable FK/ID、row_version；summary隐藏location                              |
| attachment                         | EX-45/51/56C/58B/58C/52A           | unique(group,versionNo)、active latest/final partial unique、row_version；summary不返回rowVersion/location |
| attachment_link                    | 原attachment/link migration/entity | attachment FK restrict，多态target无FK，active relation partial unique；无rowVersion                       |
| audit_log / auth state             | R2F/R1原写端口                     | 原metadata/before/after形状；保留pending auth flush与独立audit边界                                         |
| six target tables / platform_user  | 原业务entity/migration             | 只读真实projection，不迁移业务command                                                                      |

## 5. 公共端口与文件归属

I独占 `apps/poms-api-rust/src/attachment_storage/` 及I专属机械导出/用例；J独占 `apps/poms-api-rust/src/attachments/` 及J专属机械导出/用例。Root独占 Cargo/lock、lib/config/http/router、共享binary支持、完整OpenAPI保护、环境/fixture/实际验收与治理。C始终不写产品，独立审查同一集成候选。

Root给I `Database + AttachmentRuntimeSettings`；`AttachmentRuntimeSettings::from_map(&HashMap<String,String>)` 保留attachment密钥和local root原值，不混入identity配置。I导出 `AttachmentStorage::new(Database, AttachmentRuntimeSettings)`，在内部持有单一配置/registry/adapter authority。J通过 `Arc<AttachmentStorage>` 消费，不复制配置查询、密文、默认选择或签名。

```rust
ObjectLocation { storage_provider: String, storage_bucket: Option<String>, storage_key: String }
UploadPlan { location: ObjectLocation, upload_mode: String }
ObjectMetadata { size_bytes: f64, e_tag: Option<String>, last_modified: Option<String>,
    content_type: Option<String>, checksum_sha256: Option<String> }
PresignedPutTarget { method: String, url: String, headers: BTreeMap<String,String>, expires_at: String }
```

I公开异步端口：`create_original_upload_plan(&str,&str,f64,Option<DateTime<Utc>>)`、`create_presigned_put_target(&ObjectLocation,Option<&str>,Option<&str>,DateTime<Utc>)`、`save_upload_session_object(&ObjectLocation,&[u8],Option<&str>)`、`head_object(&ObjectLocation)`、`open_read_stream(&ObjectLocation)`、`read_buffer(&ObjectLocation)`、`remove(&ObjectLocation)`。依次返回 `Result<UploadPlan,StorageFailure>` / `Result<PresignedPutTarget,StorageFailure>` / `Result<ObjectLocation,StorageFailure>` / `Result<ObjectMetadata,StorageFailure>` / `Result<Body,StorageFailure>` / `Result<Vec<u8>,StorageFailure>` / `()`。remove吞provider删除错误。保留内部save_original/download_package可复用能力，不新增K/legacy HTTP操作。

I单一导出 `StorageFailure { status: Option<StatusCode>, message: auth::js_json::JsString }`；Some是原HttpException，None是原普通Error。最后 `into_api_error` 才把Some用既有raw_json构造Nest标准envelope（message.json保留UTF-16），None映射固定500。J complete catch仍读取原message，仅写PG failedReason时to_utf8_lossy，不能在storage层先internal()丢失原Error.message；不修改全局ApiError协议。

Root共享 `crate::binary_http::{BinaryPayload,read_unparsed_body,respond}`：payload含 `body:Body,mime:JsString,filename:JsString,inline:bool`；read_unparsed_body消费Body并返回原Vec字节，供guard后的J controller使用，不使用额外Bytes extractor默认cap；JSON/form原parser仍优先运行。respond接收payload与原请求Method，严格在J service open与audit成功之后预取第一非空data frame，余下继续流式传递，不全量缓存。首块前stream错误按原Nest400 raw `err.message`、原MIME/disposition/cache并沿Express send的charset/length/weakETag规则；发送后错误结束body。provider打开失败仍经StorageFailure最后映射；不能用HTTP送达结果改写已写audit。HEAD、Range、断连、空body与content header行为须原Nest/实际HTTP对照，发现差异集中修正共享支持。复用HttpBody poll_frame；tokio新增fs feature、direct futures-util0.3.34/std为最小stream适配，不增加SDK、tokio-util或第二套HTTP client协议。

J公共service直接复用现有 `DictionaryService::require_active_item`、`SystemSettingsService::get_attachment_max_upload_size_bytes()` 与audit insert，不复制上传上限换算。I导出 `http::router(AuthHttpState,Arc<AttachmentStorage>)`，J导出 `AttachmentsService::new(Database,Arc<AttachmentStorage>)` / `http::router(AuthHttpState,Arc<AttachmentsService>)`，两者各自 `normalize_uri` / `openapi()`，Root统一注册。Config新增 `attachment_storage:AttachmentRuntimeSettings` 并在from_map构造；不重设全局env。service接收完整ResolvedSession或等价context，保留pending SessionFlush及loaded user snapshot；每个请求用once-consumed context，仅在首个实际business/audit flush调用已有 `auth::store::flush_managed_session` coflush，后续audit/complete不重复携带旧CAS。失败后的context按原Nest UoW witness处理，不能提前消费或丢失认证UoW语义。ID在业务请求层保留字符串，持久化cast按原PG错误边界，首次返回与重读分开。

## 6. 环境、fixture、清理与证据

Root统一建立全新IJ受控PG15副本与Nest/Rust两库，复用已冻结镜像和只读依赖cache；不借旧GH数据库/全局default/本地root，不改PG17、primary或旧证据。拟用WSL独立checkout `/home/wangzishi/projects/poms-rust-r2ij`、state `/home/wangzishi/.local/share/poms-r2ij`，API6700/6701、页面6800、受控OBS上游6900，全部loopback；新容器host16432映射PG内部15432，guard明确区分两者。WSL host实际Debian13.7/Podman5.4.2，host Node当前不可直接执行；应用/工具从固定build/browser镜像运行，镜像内Debian12与host版本分列，不安装主机工具。创建前再次核实端口、镜像/label/目录归属；环境值与私密凭据不进入公开日志。

project-handover projection fixture必须登记真实必填FK支持链：project、contract、contract_term_snapshot（effective_handover_baseline_snapshot_id所指）、两个approval_summary_snapshot（合同与移交摘要角色）；严格按原entity和已应用migration生成受控最小合法样本，不伪称移交完成。每一新增支持行都纳入journal/反向引用/清理拓扑；不能只填id/project或复用共享业务行。approval_summary_package_definition只读复用原DatabaseSeeder的 `contract-handover-summary` / `project-handover-confirmation`，先验证id/key/scenario/status/projection/export指纹，缺失则失败，不改seed定义；它们作为基线引用保留，不取得删除归属，不新建替代definition。

fixture先journal登记write intent，再精确收编run UUID、actor、provider location、session、attachment/group/link及六类真实业务行。反向引用检查覆盖完整schema FK与UUID/JSON/逻辑引用，完整DB与object preflight必须在第一次任何对象或行删除前完成，未知incoming reference阻断且0删除。不得按prefix/actor广泛扫删。只有已精确owned provider可snapshot/原列恢复默认/版本/时间/密文，不以再次set-default代替；遇到unowned enabled default即拒绝，不通过demote腾出空间。本地object root及受控OBS对象独占本run。preflight通过后先对象验收/删除，再session/link/attachment/targets/config与audit/auth引用，按真实FK拓扑处理。

所有尝试保留成功/失败/部分/中止真实标签，每轮finally清理，第二次必须matched=0、changed=0、zero=true；报告base残项与extension残项。故障注入只作用精确owned行/专用loopback对象，恢复前登记原值并finally校验；不把产品产生的失败事实覆盖为测试前状态。默认切换测试与J创建新session串行，不能全局default相互干扰。

Root拥有实际进程PID/startTicks、binary/source hash、端口与停止回执；不接管不明进程。Linux本地生成raw清单后一次批量传输到Windows保全，Windows原件增量校验，私密env/journal不公开。冻结G1/G3输入不因后续修复或G4回写被重写。

## 7. 联合校验与放行条件

以下均为待执行，当前没有运行成功声明。统一候选共同检查只运行一次；后续变化只补受影响证据，不机械逐片重复。

| Check                      | Required evidence                                                                                                        | Initial status |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Source / neutral export    | I6/J19、全部schema、TS/Zod/完整291操作585schema/579client/92migration保护；有限DTO/helper oracle                         | Pending        |
| Rust                       | 固定镜像fmt、clippy、test/build；ignored单列，实际PG测试另列                                                             | Pending        |
| Nest / admin               | 相关API/admin lint/test/build；新增warnings说明                                                                          | Pending        |
| API / PG                   | 25操作HTTP两端真实对照、auth/CSRF/route/Zod/权限、实际版本/审计/对象/中心projection                                      | Pending        |
| Concurrency / faults       | 同loaded版本CAS、default/location/latest/final/version/relation约束，coflush/独立audit/object残留                        | Pending        |
| Binary / storage transport | local真实字节/mtime/probe；OBS loopback真实SigV4/HEAD/PUT/GET/delete/presign、retry/redirect/compression/stream/失败边界 | Pending        |
| Original pages             | 原Angular配置页、真实AttachmentPanel上传/版本/预览/下载/最终版/作废与中心，Nest/Rust实际页面，无route mocks              | Pending        |
| OpenAPI / client           | 完整生成/client check与Rust子集递归对照；原spec/client不修改                                                             | Pending        |
| Schema                     | 只读migration-entity-DDL-contract对照、schema diff分类；生成SQL不执行                                                    | Pending        |
| Governance                 | git diff --check、docs表格check、Issue/本地状态、非作者联合G3与集成后核验                                                | Pending        |

R2I/J详细负例与恢复清单见两个输入末节。至少实际见证配置状态/密文/no-op与default竞态、六目标权限/中心、完整两种上传模式/版本链、到期/terminal、100KiB以上二进制、错误size/hash/对象缺失、后续flush/audit失败、native stream前后错误、未知UUID/path顺序、真实页面。真实华为OBS租户未授权也未验证，只能取得受控对象协议兼容证据；真实租户认证继续保留生产启用前检查边界，不能称live OBS已通过。

## 8. 一致性、drift、风险与 G1 结论

- Document→code、route→command、DTO→controller、migration→entity→DDL→contract、query→view、guard→实际权限逐项以原来源及后续witness对照。发现真实差异分类五种标准drift，G2后真实纠偏追加checkpoint，不倒改G1。
- 已知 `existing-baseline-drift`：I testConnection旧描述；二进制OpenAPI未声明body/headers属于既有契约缺省；历史schema CHECK/comment introspection若重现，保留Failed-with-classification与未执行SQL标签，不预写Pass。
- 无新增豁免。真实租户、R3/R4业务命令、K/L/M及部署属于明确范围外，不使用mock/只读projection代替其验收。
- G1 Reviewer：C非作者；Gate Status：Pass，Root冻结于2026-10-28T18:07:35.477Z。共享端口、环境/恢复范围与25操作已完成同一次联合审查；原件hash见review和tmp/rust-r2ij/g1-freeze.json。Root完成在线G1/Doing回写后启动本批G2，G3/G4仍Pending。
