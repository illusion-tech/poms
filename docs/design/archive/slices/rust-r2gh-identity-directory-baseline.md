# RUST-R2G＋R2H 身份与组织目录联合实施基线

- 归档状态：G4随本归档提交推送与#74/#75在线回写生效；以下正式输入正文保留G1时点含义，当前74/108及余34＋R2M见[收口](rust-r2gh-closeout.md)。

- G1 冻结时点：G1 Pass（2026-10-28T07:28:50.263Z），G/H Doing。候选02与非作者C增量复核P0/P1/P2=0；受审原文保全于tmp/rust-r2gh/g1-baseline-frozen.md。用户于2026-10-28要求“继续推进下一批”；本批限定G [#74](https://github.com/illusion-tech/poms/issues/74)16操作与H [#75](https://github.com/illusion-tech/poms/issues/75)18操作，父#67/#57继续Open。
- G3 记录：同一次联合[最终独审](../../rust-r2gh-review02.json) Pass，未关闭P0/P1/P2/P3均为0；实现91cda75f已推送main且集成核验通过。当前收口见同目录[closeout](rust-r2gh-closeout.md)。
- 类型：cross-layer-high-risk；来源main `126ede22bb4b379ae656ccde9cee9d82da383be4`。复用干净隔离检出 `E:/projects/worktrees/poms-r2ef-foundation-audit/poms`（目录名保留上一批EF），新分支 `codex/poms-r2gh-identity-directory`；primary E:/projects/poms保持不变。采用此前已确认的solo checkpoint，G3后提交推送，G4归档/在线回写后才关闭本批子Issue。
- G1计数起点为40/108；本批实际G4后才可记74/108，余34操作及R2M。I/J、K/L、#61/R3–R5边界不因本批提前Done。新建scope不是整个R2或外部生产接管。

## 1. 正式输入、单向权威与范围

正式输入为[迁移计划](../../backend-rust-migration-plan.md)1.1/1.2/1.2.1、[R2范围](../../rust-r2-scope-and-dependencies.md)、[108操作归属](../../rust-r2-operation-slices.json)、[canonical inventory](../../api-route-canonical-inventory.md)、原TS controller/service/repository/entity、共享Zod/完整OpenAPI和原Angular页面；在线正文/comments/sub-issues/closing PR状态保存在tmp/rust-r2gh/g0-online-issues.json。G/H现为Open/Doing，联合G1已冻结；E/F已Closed且main126ede22已交付。本批只迁移已有34操作，无新公开route/参数/业务模型。

TypeScript/共享Zod/现行Nest继续拥有唯一语义；机械导出neutral输入供Rust，完整原spec291操作/585schema、579client文件及92历史migration受保护。金额N/A：本批无金额计算；时间/UUID/外部varchar ID、nullable、配置/组织/票据版本严格分开。无产品DDL、原TS产品修改、部署、生产写入权或性能/PoC门槛。

| Slice    | Method / current path                                                             | operationId                                                                    |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| RUST-R2G | POST `/api/auth/external-login-sessions`                                          | `AuthController_createExternalLoginSession`                                    |
| RUST-R2G | GET `/api/auth/identity-providers`                                                | `AuthController_listEnabledLoginProviders`                                     |
| RUST-R2G | GET `/api/auth/identity-providers:callback`                                       | `AuthController_handleExternalLoginCallback`                                   |
| RUST-R2G | GET `/api/auth/identity-providers/{id}:authorize`                                 | `AuthController_authorizeExternalLogin`                                        |
| RUST-R2G | POST `/api/platform/external-identities/{id}:unbind`                              | `ExternalIdentityController_unbindExternalIdentity`                            |
| RUST-R2G | GET `/api/platform/identity-provider-oauth-grants:callback`                       | `IdentityProviderOAuthGrantController_handleCurrentAdminProviderGrantCallback` |
| RUST-R2G | GET `/api/platform/identity-provider-oauth-grants/{identityProviderId}`           | `IdentityProviderOAuthGrantController_getCurrentAdminProviderGrant`            |
| RUST-R2G | GET `/api/platform/identity-provider-oauth-grants/{identityProviderId}:authorize` | `IdentityProviderOAuthGrantController_authorizeCurrentAdminProviderGrant`      |
| RUST-R2G | GET `/api/platform/identity-providers`                                            | `IdentityProviderController_listIdentityProviderConfigs`                       |
| RUST-R2G | POST `/api/platform/identity-providers`                                           | `IdentityProviderController_createIdentityProviderConfig`                      |
| RUST-R2G | GET `/api/platform/identity-providers/{id}`                                       | `IdentityProviderController_getIdentityProviderConfig`                         |
| RUST-R2G | PATCH `/api/platform/identity-providers/{id}`                                     | `IdentityProviderController_updateIdentityProviderConfig`                      |
| RUST-R2G | POST `/api/platform/identity-providers/{id}:testConnection`                       | `IdentityProviderController_testIdentityProviderConnection`                    |
| RUST-R2G | GET `/api/platform/identity-providers/{id}/external-users`                        | `IdentityProviderController_searchExternalUsers`                               |
| RUST-R2G | GET `/api/platform/users/{id}/external-identities`                                | `ExternalIdentityController_listUserExternalIdentities`                        |
| RUST-R2G | POST `/api/platform/users/{id}/external-identities`                               | `ExternalIdentityController_bindUserExternalIdentity`                          |
| RUST-R2H | POST `/api/platform/external-department-mappings/{id}:ignore`                     | `ExternalOrgSyncController_ignoreExternalDepartmentMapping`                    |
| RUST-R2H | POST `/api/platform/external-department-mappings/{id}:map`                        | `ExternalOrgSyncController_mapExternalDepartmentMapping`                       |
| RUST-R2H | POST `/api/platform/external-department-mappings/{id}:restore`                    | `ExternalOrgSyncController_restoreExternalDepartmentMapping`                   |
| RUST-R2H | POST `/api/platform/external-department-mappings/{id}:unmap`                      | `ExternalOrgSyncController_unmapExternalDepartmentMapping`                     |
| RUST-R2H | GET `/api/platform/external-org-sources`                                          | `ExternalOrgSyncController_listExternalOrgSources`                             |
| RUST-R2H | POST `/api/platform/external-org-sources`                                         | `ExternalOrgSyncController_createExternalOrgSource`                            |
| RUST-R2H | GET `/api/platform/external-org-sources/{id}`                                     | `ExternalOrgSyncController_getExternalOrgSource`                               |
| RUST-R2H | PATCH `/api/platform/external-org-sources/{id}`                                   | `ExternalOrgSyncController_updateExternalOrgSource`                            |
| RUST-R2H | POST `/api/platform/external-org-sources/{id}:activate`                           | `ExternalOrgSyncController_activateExternalOrgSource`                          |
| RUST-R2H | POST `/api/platform/external-org-sources/{id}:archive`                            | `ExternalOrgSyncController_archiveExternalOrgSource`                           |
| RUST-R2H | POST `/api/platform/external-org-sources/{id}:pause`                              | `ExternalOrgSyncController_pauseExternalOrgSource`                             |
| RUST-R2H | GET `/api/platform/external-org-sources/{sourceId}/department-mappings`           | `ExternalOrgSyncController_listExternalDepartmentMappings`                     |
| RUST-R2H | PUT `/api/platform/external-org-sources/{sourceId}/department-mappings`           | `ExternalOrgSyncController_replaceExternalDepartmentMappings`                  |
| RUST-R2H | GET `/api/platform/external-org-sources/{sourceId}/org-sync-runs`                 | `ExternalOrgSyncController_listOrgSyncRuns`                                    |
| RUST-R2H | POST `/api/platform/external-org-sources/{sourceId}/org-sync-runs`                | `ExternalOrgSyncController_createOrgSyncRun`                                   |
| RUST-R2H | GET `/api/platform/org-sync-runs/{id}`                                            | `ExternalOrgSyncController_getOrgSyncRun`                                      |
| RUST-R2H | POST `/api/platform/org-sync-runs/{id}:apply`                                     | `ExternalOrgSyncController_applyOrgSyncRun`                                    |
| RUST-R2H | GET `/api/platform/org-sync-runs/{id}/diff-items`                                 | `ExternalOrgSyncController_listOrgSyncDiffItems`                               |

34 method/path与operationId唯一，canonical均aligned；#61五处附件参数只阻K，未形成此批route blocker。canonical EX72C action仍写旧空preview/阻断apply，属existing-baseline-drift说明；当前H真实pull/diff/apply源码是本批单向行为权威，不按旧action退回空壳，不修改route grammar或添加alias。

## 2. G：身份配置、授权、绑定与外部登录

完整冻结输入见tmp/rust-r2gh/g-g1-input.md及g-g1-sources.json（77仓库来源和34依赖源码）。G IdentityProvider enum/DDL/registry都严格仅Feishu，不把H的dingtalk/wecom预留枚举混入G。配置CRUD/能力重算、enabled/login/binding/search、encrypted secret/updatedAt/version、有效grant/scope与binding投影按现行原实现。tenantAllowlist目前仅存取，不新增门禁；testConnection是诊断/网络探测，不擅自写provider status。

公共五操作与后台权限/CSRF顺序按controller逐条冻结。external login/admin grant各有自己的purpose与signed state，签名/过期校验顺序保留；nonce仅随机载荷，不是服务端单次消费，也无browser/session/PKCE绑定。原两purpose的state payload解析、默认/空字符串env优先级、签名经Node兼容base64url解码后先比较字节长度再timing-safe比较字节、exp Number与Date边界按原函数有限oracle，不额外硬化。

OAuth callback先原错误/缺参/配置/binding顺序，再真实adapter exchange/user-info，再独立票据issued flush和audit；raw ticket仅协议返回，DB存hash，2分钟期。consume先标consumed或expired/flush，再audit，再AuthController resolveActiveAuthUser/createSession/cookies/profile。后续session失败不等于票据回滚；consume不重验config/binding，signed admin callback不新从cookie取operator。并发loser/审计失败/disabled account等分段状态须先见证原Nest。

Feishu OAuth/token/user-info/search/user/department batch路径、字段fallback与enrichment、batch50/concurrency4、有序结果/字段可用性/错误消息保留。无自动refresh、无新增grant revoke/API或其它provider。现有axios mocks/repository mocks不等于协议/DB实跑。

## 3. H：部门树、映射、preview/diff/apply

完整冻结输入见tmp/rust-r2gh/h-g1-input.md及h-g1-source.json（18操作/59来源）。H只实现外部部门树到本地OrgUnit；没有成员/用户同步、staged member、后台job或callback模型，不新增这些对象。所有18路由AND两权限platform:org-units:manage与platform:org-sync:manage，写请求保留session/CSRF/permission/Zod顺序。

H源provider可为Feishu/dingtalk/wecom，但registry真实只Feishu；其它源保留原draft/unsupported/readiness阻断，不伪造可用adapter。source+provider/tenant、active authoritative root(NULL哨兵全局唯一)、mapping/diff约束以原DDL为准。syncScopes当前只存取，不假定过滤目录。

preview同步HTTP：previewing run独立flush→started audit→解密/tenant token/分页BFS拉树→diff/run/mapping flush→finish audit。try内失败持久化failed诊断/audit并保留原201 run响应，不能统一改502或新202 job。apply：Applying先flush，再逐项try/catch允许部分成功，最终组织/mapping/diff/run flush，再独立audit；不加整体job transaction或新source锁。只pending条目能执行，其余skip；approved=[]是原隐式全选，skip优先，unknown IDs不自行报错。

原服务map不新增authoritative subtree检查、apply不重新核source active/version；disable递归影响目标全部descendants且不走R2C public service。验收只能全新本run独占组织子树，不能用seed/root/admin主组织或共享业务树试探。原UUID生成/父子identity map、native flush/CAS列集合、归档/启停/mapping替换/双apply竞争和错误后的已提交事实先取原Nest见证。

Feishu目录走真实axios token及children分页，不是registry stub。保留root默认0、pageSize min(floor(value),50)（0.5得到0）、Number/boolean/string字段fallback、BFS和parent visited、原重复/缺page-token终止。testDepartmentReadAccess仅请求根第一页pageSize1并返回实际items.length，不本地截断为1，不宣称整树权限；无新增全局重复token loop guard、retry或cache。

## 4. 共享端口与单一写入者

以下共享接口作为同一联合G1的一部分，不另立脚本或依赖Gate：


本节为待同一联合G1审查的共享端口，随本包Gate一并生效。单一来源为 main `126ede22bb4b379ae656ccde9cee9d82da383be4` 的原 TS/DTO/DDL。Rust 不新增公开内部调试接口、不改产品迁移或原 TS 契约。

## Root 独占公共模块与接线

- 新模块 `apps/poms-api-rust/src/provider_support/` 由 Root 单写，公共 Cargo/Config/http/lib 及适配器 glue 仍归 Root。Root 先交可编译公共端口给 G/H；作者不得各自建立第二份持久化 provider 模型或 Crypto/HTTP 客户端。
- `ProviderRuntimeConfig { id:Uuid, provider:String, client_id:String, enabled:bool, encrypted_client_secret:Option<String>, status:String }` 为原 `IdentityProviderConfig` 的窄只读投影；G 的完整 CRUD Row 由 G 拥有，同一原表为唯一持久化权威。
- `read_provider_runtime_config(database:&Database,id:&str) -> Result<Option<ProviderRuntimeConfig>,DbError>` 用原 UUID cast 语义查询；不存在由各 caller 按其原消息/顺序处理，不将 malformed UUID 擅改为 DTO 400 或 text miss。
- `ProviderSettings::from_map(&HashMap<String,String>)` 捕获原配置读取使用的身份 secret/state env、Feishu endpoints/timeout/pageSize 及 axios 代理/CA 设置；Config 继续从进程/显式 POMS_ENV_FILE 合并，不全局写环境。空串保留，Debug 不打印键值/URL/密文/令牌。托管环境显式固定 loopback 上游，禁止悄悄落回真实 Feishu 地址。
- 直接复用已有 `auth::crypto::{SecretCipher,SecretCipherOptions,CryptoError}`：`from_env(&HashMap,options)`、`encrypt(&[u16])`、`decrypt(&str)`，以 identity options 包装为 `Arc<SecretCipher>`，不再造第二份 AES 实现。Root 新增独立 `StateSigner::sign(encoded_payload:&str)->Result<String,SupportError>` / `verify_signature(encoded_payload:&str,signature:&str)->Result<bool,SupportError>`，按原 Node base64url 规则分别解码 actual/expected 签名，先比较解码字节长度，再 constant-time 比较字节；有限 source oracle 包括 padding、URL/standard alphabet 与原 Node 容错文本别名。truthy cipher key 与 nullish state key 两条选择规则分开。state payload、purpose、过期和错误顺序由 G 原样实现；不新增 nonce 存储/消费、PKCE 或 tenantAllowlist 门禁。旧C支持件中“现有Rust无SecretCipher”属于错误初报，正式输入以base126的实际Rust为准。
- v1 解密保留原 Node Buffer base64 宽松解析、首四段取值、认证失败映射；不因为生成 IV=12/tag=16 就未经原实现见证扩大为更窄存储读约束。互通由原 Node Crypto 与 Rust 双向实证，纯 helper 用合成键，不读取正式 secret。
- `UpstreamHttpClient::execute(UpstreamRequest)->Result<UpstreamResponse,UpstreamError>`：request 为 method/url/headers/query/body/timeout，response 为 status、选定 headers、Axios transformResponse 后的数据。网络错误与 HTTP 非2xx分别保留；G/H 各自做其原 adapter wrapper，不共用错误投影（G providerCode number，H string）。
- HTTP 实现锁定 `reqwest=0.13.5`，default features 关闭，native-tls/json/gzip/brotli/deflate，复用现有 vendored OpenSSL。已在固定Rust镜像的独立tmp scratch crate编译并创建 native TLS/HTTP1 client，exit0，无upstream请求/DB/产品修改。以原 axios1.20.0/follow-redirects1.16.0/proxy-from-env2.1.0 为实际兼容来源：JSON silent parse、query数组/boolean编码、超时、redirect、proxy、HTTP状态与消息仍须G2/G3受控见证，不采用 fetch 假设。版本/API scratch probe只证明库/API可用，不是完整transport或外部成功证据。

具体端口落名：`ProviderSupport::new(ProviderSettings)->ProviderSupport`，内部 `http:UpstreamHttpClient`、`cipher:Arc<auth::crypto::SecretCipher>`、`state_signer:StateSigner`、`settings:Arc<ProviderSettings>` 可 clone；HTTP client延迟到实际请求时初始化，坏上游配置不擅自变成整API启动失败。`UpstreamRequest {method:String,url:String,headers:Vec<(String,String)>,query:Vec<(String,String)>,query_encoding:QueryEncoding,json:Option<Value>,timeout_ms:f64}`，`QueryEncoding::{AxiosObject,UrlSearchParams}`，`UpstreamResponse {status:u16,headers:BTreeMap<String,String>,data:Value}`，`UpstreamError {is_axios_error:bool,code:Option<String>,message:String,response:Option<UpstreamResponse>}`。query按Vec保留次序/重复key，G batch的URLSearchParams重复user_ids/department_ids和H object boolean/number参数分别编码。默认网络客户端不把非2xx当成功，保留其transform后完整data供各adapter原样normalize；invalid JSON在silent模式成为字符串数据，不能直接用reqwest.json()制造新异常。状态/令牌数据需要JS Number/UTF16语义时由对应原始JSON helper处理，不能靠serde默认缩窄类型。

## H 独占目录能力，G 只导入窄接口

H 新模块 `apps/poms-api-rust/src/external_org_sync/` 包括源、映射、diff/run/apply 及 Feishu directory adapter；其余 G 文件不得由 H 改写。

- H 导出可 clone 的 `DirectoryAdapter`（或等价 `DirectoryRegistry`）及 `ExternalDepartmentSnapshot { external_department_id, external_parent_department_id:Option<String>, external_department_name, is_active, display_order:Option<f64>, raw:Value }`。
- `fetch_department_tree(root:Option<&str>, config:&ProviderRuntimeConfig, secret:&str) -> Result<Vec<ExternalDepartmentSnapshot>,DirectoryError>`。
- `test_department_read_access(config:&ProviderRuntimeConfig,secret:&str,root:Option<&str>) -> Result<DepartmentReadAccess,DirectoryError>`，返回原 root ID、child count，仅以pageSize=1请求根第一页并返回原items.length（无本地最多1限制），供 G 的 readiness 调用；不证明整树或后续页可读，G 不调用 H 同步业务 service。registry只支持Feishu，H dingtalk/wecom保留原unsupported路径。
- `DirectoryError { message, provider_code:Option<String>, http_status:Option<u16>, provider_message:Option<String>, next_actions:Vec<String> }`；原截断/脱敏在 H 原 service 的位置，不统一改变原 G 错误文案。
- H 对本地 OrgUnit 写入依原 repository/MikroORM 语义完成，不改用 R2C 公共命令以新增额外保护/审计，也不将分段/best-effort apply 强化为整 job 原子事务。

## G 独占身份能力与原认证组合

G 新模块 `apps/poms-api-rust/src/identity_providers/` 包括原16操作服务/路由/DTO、config/fullRow、binding/grant/ticket/state 和 Feishu 用户/OAuth adapter。

- G 服务消费同一 `ProviderSettings`、`SecretCipher`、`UpstreamHttpClient`，readiness 只依赖 H 上述 directory port。
- external-login consume 成功后，按原 AuthController 顺序调用现有 `AuthService::resolve_active_auth_user`、`create_session`、`profile` 和 cookie/projection helpers；耗票、审计、创建 session、输出各自提交，不引入跨模块整体事务。必要 helper 可见性和根 router 合并由 Root 集中处理。
- G/H 保存函数均接受现有 `SessionFlush` 和真实原 flush 分段。CREATE 前后、UPDATE 列集合、CAS、审计独立失败，以原 Nest SQL/PG 见证锁定；不把上游 mock 单测当事务证据。

## 验证与数据隔离

新 GH DB pair `poms_r2gh_nest` / `poms_r2gh_rust`，app role `poms_r2gh_app`、marker 见 `g0-runtime-scope.json`；API5700/5701、UI5800、受控上游5900。PG17只服务元数据，旧EF数据/环境/原件不重置。

每 run 创建独立 provider/tenant、完整 owned OrgUnit 子树、源/映射/run/diff/user/binding/grant/ticket；G/H运行不同时改同一provider/source。HTTP生成的UUID和派生OrgUnit先登记逻辑intent、精确收编。禁止用seed主组织或共享业务树试探disable；预登记事务/错误/审计事实，全部成功失败run两次清理，第二次0/0。

证据按 source/mock、controlled HTTP protocol integration、真实供应商账号分层。此次默认只用真实原 Nest/Rust adapter访问本机合成上游，不访问真实Feishu租户或写外部目录。协议ticket/state/code/token在内存比较并验签，持久化单列脱敏收据及指纹；不得靠删除真实API合法字段或用fake handler伪造成功。


## 5. 原字段/存储/guard边界

沿用identity_provider_config、external_identity、identity_provider_oauth_grant、external_login_ticket、external_org_source、external_department_mapping、org_sync_run、org_sync_diff_item及既有OrgUnit/User/Session/Audit/Security。UUID主键/内外ID不混用；平台/租户/subject/department是原varchar和精确比较，不能以UUID规范化替代。row_version为int4 ORM版本；JS Date毫秒投影/PG时间微秒与UTC过期语义分别记录。原grant/ticket字段与加密token不回显。

所有新增UPDATE只覆盖原dirty列，pending AuthSession CAS在哪一次flush消费由原SQL实证；业务与audit的独立提交不能合并。无意义no-op、失败后的已提交状态、原native唯一/FK/int4错误、坏UUID/path/query/parser与错误优先级都在有限边界内对照，不替换成新安全接口或统一错误体。

## 6. 环境、所有权与副作用授权边界

新PG15 pair `poms_r2gh_nest / poms_r2gh_rust`，app role `poms_r2gh_app`，owner-only r2gh_control.marker `d668d8df-b350-4d4d-8b70-dc7866a1d5f9`；继续核已存在R0E PG15 container/image/volume/role/version15432隔离属性，再迁移92历史SQL并执行原seed。PG17仅服务元数据，目前Running/Automatic；绝不连接其SQL、seed/reset/migrate/stop，不删除旧EF数据库/role/state或历史证据。

Linux checkout `/home/wangzishi/projects/poms-rust-r2gh` / state `/home/wangzishi/.local/share/poms-r2gh`，自包含Git不依赖Windows alternates；缓存/target独立，旧EF/R2D只读来源保留。private0700、env/key/journal0600；API5700/5701、UI5800、受控上游5900均启动前占用核对。所有env与marker固定匹配，拒绝ambient DB/process/default.env与意外真实Feishu endpoint fallback。原Node24.19宿主和固定Node24.16镜像/浏览器的实际patch版本分别标记，Rust1.99.1锁定。

Root共用一套journal：写前登记provider/tenant/user/organization/source/binding/grant/ticket/run/diff/mapping/派生OrgUnit逻辑intent，成功按精确ID/actor/完整所有权收编；不按全局prefix或CASCADE清不明行。G/H写同一config/source串行调度，run-owned完整组织子树、原值/缺行与时间精度精确恢复、未知FK/逻辑外引阻断。失败/中断也保留并显式cleanup，每run两次清理且第二次0/0；各owner身份/二进制/来源/停止与端口释放要成对回执。

证据分级：source/mock、controlled upstream protocol integration、真实供应商账号。此次只授权本机合成上游与隔离PG15，不访问真实Feishu账号或外部目录写入。原适配器实际发HTTP/处理真实响应并形成真实本地PG事实才算controlled integration；不能标真实租户登录/同步成功。真实供应商验证在获得明确测试租户/凭据/根目录授权后另列，本批不以mock或controlled冒名。

## 7. 统一验收与证据

1. 原Zod/DTO/guard/adapter解析有限oracle机械导出，G/H各自原字段边界；原Crypto与新state签名互通，原axios request/response/errors与native TLS/redirect/query/timeout/JSON行为受控见证。G0 scratch只证明reqwest0.13.5上述features可编译/建client，未发请求/DB，证据tmp/rust-r2gh/http-probe01-receipt.json。
2. 同一候选集中Rust fmt/locked-offline check/clippy/alltargets普通tests/release；本批显式PG tests与历史ignored分列。双端34操作成功/拒绝/guard/CSRF/DTO/path/body以及真实SQL/PG多flush/并发/外部协议失败严格比较。来源或行为变化仅补受影响增量，不逐模块重复公共回归。
3. 原Angular身份管理、绑定、外部登录/授权以及组织源/预览/映射/apply真实journey，Windows/Linux×Nest/Rust按实际可用页面验证；受控OAuth页面/原产品页面分开，mock E2E不记真实UI。H页面另依赖G配置和OrgUnit读权限，不能给仅H权限的隐藏依赖冒称通过。
4. 原TS相关lint/test、原admin/API build、browser typecheck、OpenAPI/client/92migration来源保护集中一轮；原完整291/585/579不能替换为Rust子集。新Rust预计81个文档化操作（此前47＋本批34），必须实际递归metadata证明。只读两库schema-check/dump并分类，未执行提议DDL。
5. 真实协议token/state/code/cookie/secret先在内存验真/比较；产物有脱敏占位、长度/hash和验真结果，标明sanitized wire而不是伪称raw完整body。原API合法敏感字段保持，不能为测试改响应；PG完整加密字段快照只放private journal。上游失败只使用合成非凭据哨兵，不将真实secret/token写入回执。
6. 原始G1候选/完整受审G3输入先冻结原字节，closure元数据另载体；Linux本地manifest/批量传一次再核目标字节，Windows增量，不反复UNC遍历大目录。原失败/部分/未初始化/未认证覆盖分列，工作树回收前保全所需ignored原件。

## 8. 代理配置、归属与Gate

沿用用户配置约定：Root目标Astra/Ultra由应用控制，本批没有新证据不声称已切换；G/H实现及C审查均独立上下文显式gpt-6.1-sol/max，Fast工具无参数未核实。G0旧E/F/C只读支持不作独审Pass；正式C为/r2gh_review，未参与产品或验收工具。

G作者独占identity_providers/和tools/rust-r2gh/g-*；H作者独占external_org_sync/和tools/rust-r2gh/h-*（directory port对G开放）；Root独占provider_support/、Cargo/Config/http/lib、共享auth可见性、环境/fixtures/实际统一验收、正式治理docs、提交推送/归档/在线回写。作者先原corpus与纯逻辑，持久化flush/ID/CAS最终以Root原Nest实证锁定；不自行连接DB/启动服务/并发Cargo或改公共字段。

G0已完成范围与在线核对；联合candidate02经C增量复核Pass，已于2026-10-28T07:28:50.263Z冻结，G/H进入Doing/G2。首轮Block、候选01/02与受审原文保留，状态元数据更新不回写冻结候选。G3一次联合非作者审查覆盖产品、工具和实际证据，修复仅增量；普通归档/状态回写Root集中核验，不对小脚本新设Gate。G4须实现和归档提交推送、原件保全及GitHub/本地索引一致后仅关闭#74/#75，父#67/#57与I–M/#61继续各自状态。

## 9. Drift与不做内容

- existing-baseline-drift：canonical EX72C旧空壳/阻断action与当前真实H实现不符，按本包声明现行源码行为；不修改public route或让旧备注压回placeholder。
- 原stateless state、consume后验证与分段失败、tenantAllowlist只存储、H缺少subtree/stale/source级硬化、原错误字符串回显均保留为已知现行边界；本批不扩为安全策略变更，不能宣称抗重放/自动租户门禁/全job原子性。
- G仅Feishu，H额外enum无adapter不实现；不做成员/用户同步、异步job/新callback、自动refresh或新权限。
- 新实际漂移按new-real-drift/existing-baseline-drift/accepted-db-specific-difference/tool-noise/design-change-required记录，不改原冻结输入或把旧失败改成通过。
- 例外：当前无G1/G3范围豁免。真实外部账号成功不是本批controlled evidence结论；产品真实接入/切流/部署仍按后续独立授权。
