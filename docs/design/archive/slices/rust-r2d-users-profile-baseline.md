# RUST-R2D 用户、owner-reference 与个人资料实施基线

- Gate Status：`G1 Pass`；A/B分项与C非作者共同复核通过，输入已冻结，放行G2。
- Parent：[R2 #67](https://github.com/illusion-tech/poms/issues/67)；Slice：[R2D #71](https://github.com/illusion-tech/poms/issues/71)；前置R1、R2A/B/C已交付。
- Owner：主代理；A契约/HTTP/输出；B持久化/服务/PG测试；C非产品作者独立审查；主代理负责环境、fixture、真实HTTP/UI、公共接线和集成治理。
- 类型：`cross-layer-high-risk`；现有用户命令、关系替换、认证读取与审计；无产品DDL变更。
- 起点：clean main `a22cba7360346242cb7709740b7eb954b92d1fd4`；Windows managed worktree `E:/projects/worktrees/poms-r2d-users-profile/poms`，分支`codex/poms-r2d-users-profile`；Linux专用checkout `/home/wangzishi/projects/poms-rust-r2d`；沿用solo worktree checkpoint。
- 日期：2026-10-28（Asia/Tokyo）；G1冻结时间：2026-10-27T20:56:23.041Z；A/B/C同一候选复核均Pass。
- Tracker：[Rust迁移追踪](../../rust-migration-execution-tracker.md)；[R2范围](../../rust-r2-scope-and-dependencies.md)、[108操作归属](../../rust-r2-operation-slices.json)。

## 1. 范围与下游边界

仅迁移现有11操作：用户列表/详情/创建/资料更新/启停/角色替换/组织替换、owner-reference候选读取、当前用户profile读取与编辑。保持现行DTO、权限/CSRF/错误协议、查询和请求内实体快照、关系替换的分段提交、真实审计与会话行为。交付后可供后续身份/组织同步等片消费；不表示R2G/H或R3业务页面已迁移。

没有密码写入接口：现行create DTO、service、entity均不写`local_credential`，不能根据Issue的概括文字新增密码字段或凭据写入。测试必须证明新用户无凭据，已有用户凭据未变、原bcrypt登录仍正常。账户停用后的认证拒绝/单session状态变化由现行认证路径决定，不新增批量撤销所有会话或主动登出机制。

不新增删除用户、密码重置/找回、avatar二进制上传、邮箱/手机验证码、SSO/外部身份绑定、用户范围授权、租户隔离、产品migration、Rust自动seed、完整OpenAPI/client生成权接管、部署或性能结论。仅关闭#71；父#67/#57、R2E–M与#61保留。

## 2. 正式输入与单向权威

原TS产品、共享契约、完整OpenAPI、579个生成客户端、92份产品迁移及历史验收保持。新导出绑定working tree、index及保护目录untracked三轴；文本只做CRLF→LF规范化，opaque文件按原字节。历史设计与现行cookie session、角色名称输出、colon命令存在年代差异，以ADR-017、当前canonical/controller/DTO和真实Nest行为共同冻结，不以旧文案改当前产品。

| 领域       | 正式输入                                                                                                                                                                                                             | 本片消费                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 阶段与业务 | [迁移计划](../../backend-rust-migration-plan.md)、[用户设计](../../platform-governance/user-management-design.md)、[个人资料设计](../../platform-governance/profile-self-service-design.md)、ADR-001/002/008/017/018 | 用户与关系、profile只读/自助字段、认证边界                              |
| 路由       | [canonical inventory](../../api-route-canonical-inventory.md)、[R0F](rust-r0f-route-baseline.md)、ADR-015                                                                                                            | 第121–122、210–213、217、534–537行共11操作aligned；不增加alias          |
| 控制与服务 | `apps/poms-api/src/app/features/platform/platform.controller.ts`、`platform.service.ts`、`platform.repository.ts`、`core/auth/auth.controller.ts`                                                                    | 守卫、参数、JS严格比较、查询次序、dirty/flush/audit                     |
| DTO与响应  | `libs/shared/contracts/src/lib/shared-contracts.ts`、`libs/api/contracts/src/lib/auth/user.dto.ts`、`libs/vendor/nestjs-zod/src/`                                                                                    | 原Zod4.6.1六类schema执行oracle，完整issues/ownKeys、原完整OpenAPI元数据 |
| 持久化     | `platform-user.entity.ts`、`user-role-assignment.entity.ts`、`user-org-membership.entity.ts`、`org-unit.entity.ts`、`role.entity.ts`及现有migration                                                                  | 完整用户行、FK/唯一性、row_version、全部关系状态、日期/actor字段        |
| 认证与审计 | `core/auth/`、`core/runtime-audit/`、dev fixtures、bootstrap seeder                                                                                                                                                  | 每请求认证快照、raw touch、pending session flush、业务/audit独立边界    |
| 既有Rust   | [R2B收口](rust-r2b-closeout.md)、[R2C收口](rust-r2c-closeout.md)、`apps/poms-api-rust/src/auth`与`compat`                                                                                                            | 复用已交付基础，新增用户快照按本片见证；旧Pass不是本轮运行证据          |
| 原页面     | `apps/poms-admin/src/app/features/user-management/user-list.ts`、`features/profile/current-user-profile.ts`、`libs/admin/data-access/src/lib/platform/platform.store.ts`及实际依赖                                   | 原用户管理/个人中心交互与顶部身份刷新；不替换页面或mock目标操作         |

Rust1.99.1、现有Cargo与ICU固定身份保持。本片没有新的localeCompare排序，`users/collation.rs`为N/A；不得为无ORDER BY关系数组新增排序规则。若实际发现需要更改依赖或新比较语义，先记录原因与受影响验证。

## 3. 十一操作、DTO与入口

全局parser在认证/CSRF/权限之前；DTO在守卫之后。unsafe方法保留CSRF。没有新增query DTO或分页过滤；path id原字符串保持，不提前转小写或统一验证UUID。

| Method/path                                    | operationId                                   | 权限          | 输入与成功输出                                                        |
| ---------------------------------------------- | --------------------------------------------- | ------------- | --------------------------------------------------------------------- |
| GET `/api/auth/profile`                        | `AuthController_getProfile`                   | authenticated | `SanitizedUserWithOrgUnits` / 200                                     |
| PATCH `/api/auth/profile`                      | `AuthController_updateProfile`                | authenticated | `UpdateCurrentUserProfileRequest` → 同profile / 200                   |
| GET `/api/platform/owner-reference`            | `PlatformController_listOwnerReferenceData`   | any5          | `OwnerReferenceData` / 200                                            |
| GET `/api/platform/users`                      | `PlatformController_listUsers`                | users manage  | `PlatformUserList` / 200                                              |
| POST `/api/platform/users`                     | `PlatformController_createUser`               | users manage  | `CreatePlatformUserRequest` → 原始entity；spec200，运行状态待Nest见证 |
| GET `/api/platform/users/{id}`                 | `PlatformController_getUser`                  | users manage  | `PlatformUserDetail` / 200                                            |
| PATCH `/api/platform/users/{id}`               | `PlatformController_updateUser`               | users manage  | `UpdatePlatformUserRequest` → detail / 200                            |
| POST `/api/platform/users/{id}:activate`       | `PlatformController_activateUser`             | users manage  | `UpdatePlatformUserActivationRequest` → 原始entity / 200              |
| POST `/api/platform/users/{id}:deactivate`     | `PlatformController_deactivateUser`           | users manage  | 同activation / 200                                                    |
| PUT `/api/platform/users/{id}/org-memberships` | `PlatformController_assignUserOrgMemberships` | users manage  | `AssignUserOrgMembershipsRequest` → profile，permissions为[] / 200    |
| PUT `/api/platform/users/{id}/roles`           | `PlatformController_assignUserRoles`          | users manage  | `AssignUserRolesRequest` → profile，permissions为[] / 200             |

`users manage`为`platform:users:manage`；any5为`lead:write`、`lead:assign`、`project:write`、`platform:users:manage`、`platform:org-units:manage`任一。需逐个单权限验证，不仅用超级用户。profile不要求`nav:profile:view`或users manage；零权限已认证用户仍能读取和合法修改。

六类DTO单向执行原schema生成oracle：

- create：username/displayName按原长度、非trim；email/phone按原optional/null规则；primaryOrgUnitId为必填nullable UUID，initialRoleIds缺省[]；没有avatarUrl或password字段，二者作为未知字段strip，service固定初始avatarUrl=null。不得加入active-role预检或去重。
- admin update：displayName/email/phone/avatarUrl optional，不trim；未知键strip，空patch合法。null清除与missing保持分开；phone空串遵循schema。实际字段上限、邮箱规则、Unicode与issues顺序从oracle取得。
- self update：仅displayName/email/phone，先trim再验证，strict拒绝额外键；空patch合法，trim后空displayName/phone失败，email/phone nullable；avatarUrl等不是允许字段。
- activation：optional reason/comment/expectedVersion遵循原schema；服务忽略这些值，不能把expectedVersion改成新的业务前提。
- role replacement：roleIds数组与expectedVersion按原schema；服务对unique role IDs做存在/active检查，但插入遍历原数组，重复值不被提前去重。
- org replacement：primaryOrgUnitId为必填非nullable UUID，secondaryOrgUnitIds缺省[]与expectedVersion按原schema；JS Set重复判断、active-org验证与PG UUID转换分别保留。

原Zod执行结果完整比较：输入missing/null/unknown/own-undefined、body UUID大小写/版本、整数/安全整数、非BMP与lone surrogate。own-undefined是非wire案例，不冒充HTTP。path UUID cast与body严格UUID验证不同。HTTP覆盖大小写静态段、单尾斜杠、encoded静态段/colon/动态id、query、未知method/action、隐式HEAD及security event的OriginalUri；HEAD长度对同一端真实GET，JSON编码字节差异单独披露。

加入后Rust累计37个公开操作，R2累计30/108；HEAD不计新操作。完整spec不改；create运行201若真实出现，作为既有声明/运行差异记录。

## 4. 查询、输出与请求内快照

用户列表按PG `created_at DESC`，保留PG原始精度，不加id tie-breaker。组织按`display_order ASC, created_at ASC`；角色同原查询。assignment/membership查询无ORDER BY，输出按实际迭代；roleNames来自active assignment且role active，保留重复角色名和顺序，不替换成roleKey或排序/去重。

组织membership仅按status active，不额外按用户/组织active、生效/结束/撤销日期过滤。primary membership覆盖user.primary_org_unit_id，无primary时回退用户字段；orgUnits包含inactive org和原cast的未知membershipType。owner-reference返回全量active/inactive用户/组织及最小字段，候选active过滤属于原页面；不得泄漏联系方式、角色、凭据。

list/detail/profile/raw entity各自字段独立。create/activate/deactivate的完整entity键集、null/absence、rowVersion、actor与时间由新Nest HTTP冻结。GET profile用auth的username/permissions fallback，PATCH profile重新读取当前权限；两PUT调用无权限fallback，permissions保持[]。原session/login的嵌套profile继续回归。

auth在controller前已读取caller用户和角色；getUser先读取target再aggregation，而getSanitizedUserProfile先aggregation再findUser；Promise.all与ORM identity map会影响self/target和nullable合并。必须先记录真实Nest SQL/查询相位、caller=target与不同target及并发改动，再决定Rust请求局部快照。允许只在内部ResolvedSession等请求容器携带原读取的完整用户快照，不改变公开AuthUser/wire、不预加载额外数据、不使用全局或thread-local cache。共有auth修改由主代理独占，A/B提供接口要求。

## 5. 命令、事务与会话

沿用现有platform_user、user_role_assignment、user_org_membership、role、org_unit、local_credential、auth_session与runtime audit/security表。UUID与外部标识分开；时间按原ISO毫秒输出，排序仍使用PG精度；本片无金额/版本链模型，N/A。不改DDL、索引、字段长度或关系约束。

create按原用户名预检→primary org存在/active校验→创建user/初始角色/primary membership→flush→audit。initialRoleIds无active/existence预检，无去重；不存在/重复role由原FK/唯一性及原始顺序处理，inactive initial role可否成功以实跑确认。user.id为数据库defaultRaw生成，但源码在首flush前构造关系；必须先用Nest见证无关系/仅primary/仅roles/两者都有四形状的UUID时点、插入次序和成功或失败，不提前替原实现补UUID。create不写credential。

资料更新只在实际值变化时改变字段；email/phone改变后verified重置false，unchanged不重置。changedFields按源码插入顺序，admin快照含avatar，self不含。no-op仍走saveAll与audit，用户是否dirty、rowVersion/updatedAt是否变由原行为决定，不人为强制更新。

启停对target isActive写入并flush/audit，理由/expectedVersion未参与业务判断。self-deactivate当前请求可完成，后续session/login按现有认证逻辑拒绝并记录实际状态；不主动改所有会话。需覆盖多个session、未消费pending flush、无效会话/凭据登录、重新activate与原session是否可复用的原行为。

角色替换先检查unique role IDs存在且active，按原path id严格比较选previous active assignments，`nativeDelete`删除该用户所有状态assignment，再遍历原请求插入，flush业务后另行audit。组织替换先JS Set重复校验和active org检查，取previous active memberships，`nativeDelete`删除所有状态membership，设置primary_org_unit_id，插入primary/secondary，flush后另行audit。混合大小写UUID在JS Map/Set与PG层不同，不能统一canonicalize。

`nativeDelete`是独立写入；后续persist flush是独立事务；audit是后续flush。插入/CAS失败可能保留已提交删除，audit失败可能保留业务提交；不得改为整体原子事务、额外锁或重试。原auth raw touch独立提交，pending session CAS由实际首个flush消费。创建/dirty/no-op/两关系替换/失败audit的SQL先用真实Nest见证，再实现相应SQLx边界；source-level推断不能代替事务证据。失败优先用合法输入自然产生的FK/unique/编码/CAS，禁止产品触发器或伪造成功。

## 6. 隔离环境、fixture与清理

新PG15目标仅`poms_r2d_nest`、`poms_r2d_rust`，runtime role `poms_r2d_app`，owner-only `r2d_control.marker`为`ec5b48db-c4c2-4cdf-8d3d-9d2b95063dec`并绑定精确database名。继承受控cluster `poms-r0e-pg15`、volume `poms-r0e-pg15-data`、scope rust-r0e、image `b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a`、仅127.0.0.1:15432、`poms.r0e_isolated=on`、owner `poms_r0e_owner`守卫，不创建替代cluster或重置旧库。若已停止，仅通过metadata核验后resume。

runtime非superuser/createdb/createrole/bypassrls/replication且无额外role membership，仅poms所需DML/sequence权限。state为`/home/wangzishi/.local/share/poms-r2d`，private目录0700、secret/env/journal0600、umask077；新secret `poms-r2d-app-password` scope rust-r2d与独立JWT各用32字节随机源，既有owner secret只核验读取、不复制或打印原文。显式private nest.env/rust.env、容器/r2d-private、Windows同目录WSL UNC。拒绝默认.env、deploy/private、ambient PG/DB/MIKRO/DATABASE_URL/JWT_SECRET/NODE_OPTIONS等注入，子进程环境allowlist；不盲覆盖已有secret/env。

Node镜像`40946b3f8c4be299594da0968be9656f010b2e73df6be115c9555e155528997d`为24.16.0/ICU78.3/CLDR48；Rust build image `ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273`，Rust1.99.1。PG15.12、UTF8/en_US.UTF-8 libc/Etc/GMT-8。API5500/5501、UI5600，port seed1200；每次检查占用。Windows Rust由独立Linux owner持有服务并验证退出，不能称为Windows原生Rust。

G0 PG17元数据为Running/Auto/PID7236；本片只观测服务元数据，不连SQL，不执行其seed/reset/migrate/stop，不复制其数据。旧PG15数据库、checkout、镜像/volume、binary、private journal和失败证据保留。独立checkout/cache准备不等于数据库初始化或运行验收。

fixture只操作精确run自有user/org/role等，禁止系统用户/组织/角色修改、reseed、全表删除和prefix清理。HTTP创建前持久化唯一intent，成功后稳定adopt UUID，响应丢失按未变的唯一username恢复并核对；不能仅用名字替代所有权。journals锁、fsync、恢复状态不可省略。

清理必须在同一事务内锁定owned user/org/role及相关行，catalog列举所有incoming FK，任何未知FK或外部引用即拒绝。当前静态发现10条user入边FK（4 CASCADE、3 SET NULL、3 RESTRICT），运行时须再查catalog；另有不依赖FK的lead/project owner、owner history、大量actor/audit UUID/JSON引用，也必须预检精确UUID的外部引用。不能只检查平台关系；不得借CASCADE/SET NULL改变非run行。只删除确切run-owned依赖，完整核对所有状态membership/assignment、user/credential/session/audit/security事实。每轮含失败/中断轮次cleanup后独立第二次0/0，原始journal与证据保全。

## 7. 验证矩阵与G3门槛

| 类别         | 必须实际完成                                                                                                                                             | G1状态  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 来源/契约    | 六类原Zod schema oracle、完整issues/keys、三轴guard、完整metadata/可达schema、579clients不变；新增11/累计37                                              | Pending |
| 原Nest见证   | raw entity/status、查询/identity map、nativeDelete/业务/audit/pending session SQL事务、UUID alias/错误优先级、失败后完整事实                             | Pending |
| Rust静态     | fmt、locked/offline check/test/clippy all-targets零warning、release；默认ignored与实际PG测试另列                                                         | Pending |
| PG service   | 用户/关系/credentials、dirty/no-op/版本CAS、独立删除后失败、业务成功audit失败、完整事实；不伪造事务原子性                                                | Pending |
| 双端HTTP     | 11操作、401/403/CSRF/parser/DTO，any5逐一/零权限profile，raw/detail/profile/owner字段，全部角色/组织/状态/别名边界                                       | Pending |
| 并发         | 同用户名创建、用户CAS、关系删除后插入冲突、late session CAS、caller/target身份快照、权限变更后的请求；精确barrier/SQL证据                                | Pending |
| session/凭据 | 新建无credential；已有credential不变、bcrypt登录；self/other deactivate多session、activate后的实际生命周期                                               | Pending |
| 原页面四组合 | Windows/Linux × Nest/Rust；用户列表/创建/编辑/启停/角色/组织替换；profile编辑/清空/身份刷新；权限与CSRF；桌面/390px截图                                  | Pending |
| UI边界       | owner-reference实际返回最小候选及active过滤契约；不声称未迁移lead/project业务成功。R2G嵌入面板按真实不可用状态记录，不mock其成功、不使其阻断目标用户操作 | Pending |
| 回归/构建    | 四组合foundation认证、R2A/B/C来源与路由回归；相关原TS单测、lint、types、Angular production build、纯工具越界拒绝测试                                     | Pending |
| schema       | 两新库原92迁移与catalog，原migration-check/check与dump；实际失败分类，提议DDL不执行                                                                      | Pending |
| 清理/审查    | 全部run二次0/0、源码/进程/DB身份、owner退出、PG17metadata；C非产品作者G3无剩余P1/P2                                                                      | Pending |

双端比较限定明确的非确定值替换（run IDs、随机UUID、时间token等），不得为了通过而全数组排序、删字段、扩大错误归一化。无ORDER BY关系数组在受控固定输入下逐字段比较，明确不证明所有并发/物理顺序。权限集合如采用前片已有例外，限定具体字段路径并列依据；其他数组维持原顺序。lone-surrogate和全Unicode有限语料不夸大。

原页面PrimeUI许可提示/窄屏滚动按真实截图记录，不做无关视觉修复。R2G面板返回404等必须保留实际失败边界；若阻断本片必要操作，先记录纠偏，不用mock绕过或宣称通过。旧测试locator以当前原页证据调整，不因旧断言跳过必需操作。

## 8. 分工、接口与完成门槛

代理配置沿用迁移计划：主代理目标GPT-6 Astra/Ultra；A/B/C显式GPT-6.1 Sol/max；Fast仅目标、工具无独立参数，未核实。主加三子代理上限。A独占`users/{model,http,validation}.rs`及`tools/rust-r2d`单向导出/DTO/OpenAPI/HTTP案例工具；B独占`users/{service,store}.rs`与`tests/users_database.rs`；C保持非产品作者，独立审查G1/G3及原始证据。若C获派比较/并发工具，A/B必须独立审核该工具，C仍可审非本人产品。

主代理独占Cargo/lock、`lib.rs/http.rs`、auth共享接线、environment/managed environment、fixture/清理、UI launcher/spec、治理与集成；跨owner改动先协调。新模块公共签名由A/B在同一冻结基线下确认，shared auth变动由B提交需求、主代理落地。可复用原内部SessionFlush/RoleReadSnapshot，但不能改变公共权限/会话DTO。物理SQL实现以Nest见证为前置。

G1通过后冻结原字节和时间，同步#71/#67 G1/Doing。后续实际漂移另建corrective checkpoint，不回写本矩阵的历史Pending。每次source变化重新验证受影响证据，受审候选绑定真实binary/source/report，不把旧候选或部分回归标为最终全量。

G3通过后实现提交/推送，solo模式快进main，集成后检查来源/适配器/导出；再归档baseline、corrective、closeout，更新长期机器验收、README/迁移计划/两个tracker/R2范围/操作JSON的交付metadata。108操作JSON的operations/sourceManifest/routeDecisions历史核心保持。G4归档推送和GitHub同步后仅#71 Done/Closed；R2A–D累计30/108，剩余78操作与R2M阶段验收；父#67/#57保持Open，E–M Todo，#61不变。工作树回收前逐文件hash保全全部运行与失败证据，旧环境保留。

## 9. G1复核记录

A/B输入复核与C非产品作者独立复核均Pass，未关闭P1/P2为0。共同候选原字节SHA256为`ad5f163596229ee1fc6cfdfe827cd9b1e13b9f6c5d7e18876591265e5dc5df2d`，原件`tmp/rust-r2d/g1-reviewed-candidate.md`；三方回执、输入清单、最终冻结原件由`tmp/rust-r2d/g1-freeze.json`绑定。首候选两处DTO文案错误及Block回执保留，候选02已按原schema修正。候选到冻结只改Gate/时间/本记录，不改变实现输入。C回执的完整case plan、owner PID/startTicks/binary/source epoch、精确barrier与严格normalize要求作为G2工具冻结和G3验收的具体化要求。G1不能推出PG/HTTP/UI/G3/G4 Pass；上述矩阵保留当时Pending。

## G4归档说明

原G1字节保全于`tmp/rust-r2d/g1-frozen-baseline.md`，raw SHA256 `f638206dc317d6fac66cd0aed26d95255a89c94f60502558dee93cbca4b1e455`。本归档副本仅重定位相对链接及追加收口说明，原Pending矩阵不改写为运行成功。实现`9302fd7149257aa40584fc500fd76dd0c766b80d`已集成推送，归档前8步/26项适配器/1747来源静态检查实跑通过；G4随归档提交推送与Issue同步生效。实际交付、保留差异及父任务边界见[收口](rust-r2d-closeout.md)与[机器验收](../../rust-r2d-validation.json)。
