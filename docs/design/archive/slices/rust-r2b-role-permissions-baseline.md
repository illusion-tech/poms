# RUST-R2B 角色与权限实施基线

- Gate Status：`G1 Pass`；正式输入及非作者复核完成，按本基线放行R2B实现。
- Parent：[R2 #67](https://github.com/illusion-tech/poms/issues/67)；Slice：[R2B #69](https://github.com/illusion-tech/poms/issues/69)；前置 R1 与 R2A 已完成 G4。
- Owner：主代理；A 角色 HTTP/DTO、权限事实源与排序；B 角色持久化/服务及 PG 测试；C 非作者审查；主代理负责集成、受控环境、HTTP/浏览器验证和交付。
- 类型：`cross-layer-high-risk`，包含真实角色/权限关系写入、认证权限联动、审计和原 Angular 页面；无产品 DDL 变更。
- 起点：`9734515f84ebe1a4833d207124adbfbe378f691f`；独立工作树 `codex/poms-r2b-role-permissions`，继续采用 solo worktree checkpoint。
- 日期：2026-10-27（Asia/Tokyo）；G1 Reviewer：A/B输入复核、C独立复核；冻结时点：2026-10-26T19:32:29Z（2026-10-27 04:32:29 JST）。
- Tracker：[Rust 迁移追踪](../../rust-migration-execution-tracker.md) RUST-R2B；[R2 范围](../../rust-r2-scope-and-dependencies.md)、[108 操作归属](../../rust-r2-operation-slices.json)。

## 1. 范围和下游边界

在 Rust 中实现现有八个角色/权限操作，使原角色管理页可读权限字典、列出/创建/修改/启停角色和替换权限。已有会话在下一请求重新计算权限；保持关系历史、系统角色最低权限和原审计行为。完成后可供 R2D 用户角色分配消费，但不表示用户/组织写入已经迁移。

不增加删除角色、任意权限字典写入、用户角色分配、组织/profile/todo/provider/附件、业务域处理器、产品 migration、Rust 自动 seed、完整 OpenAPI/client 生成权接管、部署、数据接管或性能结论。仅关闭 #69；父 #67/#57、R2C–M 和待决 #61 继续保留。#61 的附件与业务号路径不在本片。

## 2. 正式输入和唯一来源

所有输入绑定上述起点；原 TypeScript 产品、完整 OpenAPI、生成客户端、现有迁移及历史验收不改写。新增只读导出器绑定 working tree、index 和受保护路径的 untracked 状态，规范化只允许 CRLF→LF。

| 输入           | 权威来源                                                                                                                                                      | 本片消费                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 阶段与业务     | [迁移计划](../../backend-rust-migration-plan.md)、[角色权限设计](../../platform-governance/role-permission-design.md)                                         | 角色关系、最低权限、立即收敛和历史保留；设计8.3旧 slash/POST接口建议不作为URI权威               |
| 路由           | [canonical inventory](../../api-route-canonical-inventory.md)、[R0F基线](rust-r0f-route-baseline.md)、ADR-015/018                                             | 八个现有 aligned 操作，含冒号启停命令和PUT权限替换                                              |
| 原行为         | `apps/poms-api/src/app/features/platform/platform.controller.ts`、`platform.service.ts`、`platform.repository.ts`                                             | 读写、排序、错误、保护、两次flush及当前请求身份                                                 |
| DTO和字典      | `libs/shared/contracts/src/lib/shared-contracts.ts`、`libs/api/contracts/src/lib/auth/user.dto.ts`、`libs/vendor/nestjs-zod/src/`                             | 四类输入schema、输出字段、37项PERMISSION_KEYS/PermissionsMeta、strip/trim/null/数值和错误issues |
| 持久化         | 同目录 `role.entity.ts`、`role-permission-assignment.entity.ts`、`user-role-assignment.entity.ts`；`Migration20260325153000_init_platform_governance_core.ts` | 三表、行版本、历史、FK/partial unique、时间和actor字段                                          |
| seed与认证     | `apps/poms-api/src/seeders/platform-bootstrap.seeder.ts`、`core/platform/dev-platform.fixtures.ts`、`core/auth/`                                              | 显式bootstrap固定数据；逐请求实时权限；不得把seed放入Rust启动/GET                               |
| 审计与已有Rust | `core/runtime-audit/`、Rust `auth/{audit,model,service,store,http,guards}.rs`、[R2A收口](rust-r2a-closeout.md)                                                | 12列audit、原请求局部pending session CAS、认证raw touch；不照搬R2A单次审计事务覆盖角色命令      |
| 原客户端       | `apps/poms-admin/src/app/features/platform/role-list.ts`、`libs/admin/data-access/src/lib/platform/platform.store.ts`及其实际导入                             | 原页面、表单与生成客户端；测试不替换产品bootstrap或mock路由                                     |

Rust1.99.1和既有依赖保持固定。排序使用 ICU4X `icu_collator` 的[官方源码 revision](https://github.com/unicode-org/icu4x/tree/38a49da495248dd1ded84cf306e4ca42e64d5bb3) `38a49da495248dd1ded84cf306e4ca42e64d5bb3` 独立git source；该revision实际workspace包版本为2.1.1，不能按tag名称误写2.1.0。collator/locale/normalizer/properties四份data manifest均为CLDR48.0.0、icuexport release-78.1rc。运行依赖增量仅同revision的22个git包及registry的synstructure0.13.2、utf16_iter1.0.5、write16 1.0.0；原253个registry依赖的name/version/source/checksum保持不变。原第254项是本地root package，scratch替换它，不纳入原依赖不变计数。原idna_adapter1.2.2与registry ICU2.4 URL依赖链保持原样，不能借排序回退它们。金额为 N/A；没有新增日期字段或外部标识模型。

ICU4X的默认Implicit Han与Node的Unihan不同，不能直接使用默认compiled root。排序provider仅成对替换官方`CollationRootV1`和`CollationJamoV1`，其余七个marker委托同revision Baked。古Jamo的CE32引用root表，所以两份数据必须成套生成、校验和加载。保持`unsafe_code=forbid`，采用typed serde安全解析，任何一份失效均报错，不回退Implicit或手调排序权重。

生成器使用同revision、独立Cargo.lock和Rust1.99.1，调用`SourceDataProvider::new_custom().with_icuexport(已核本地目录).with_collation_root_han(Unihan)`，只消费以下两个官方TOML并单向导出typed payload。输入来自[固定官方icuexport ZIP](https://github.com/unicode-org/icu/releases/download/release-78.1rc/icu4x-icuexportdata-78.1rc.zip)，ZIP SHA256=`486751335ea00fb12cb3b4d52ddefd3df9b61ff81e1546ba506d3c41cec45a54`。JSON内含u64数据，必须保持opaque bytes，不经JS解析重编码或通用JSON格式化；运行时不下载数据或调用Node。

| 数据 | 官方ZIP内路径与输入SHA256                                                                                      | 输出字节数与SHA256                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Root | `collation/unihan/root_standard_data.toml`；`1c9ab1a374a795c67eab06f916579e48ee9bab05873443f8e8936385ab7704cd` | 1,260,299；`44a4fc9d480363f9cd2b344dc26bb6dae6146a036e69c89134b53ba91d3197bc` |
| Jamo | `collation/unihan/root_standard_jamo.toml`；`661f741f62b2cb2da5ee60372406fd8ef322b0cc0c0e0bb67a90b6c6d29bf647` | 2,623；`47e37d476f6963232d9436bca366142cf0000861df7e19506b443d064116e72c`     |

G1纯探针已确认两输出locked/offline逐字节复演；成对provider对固定Linux Node24.16.0 / ICU78.3 / CLDR48 / en-US的484字符串、234,256对比较为0差异，含37合法键、未知Unicode及古/扩展Jamo；两个稳定排序列表一致。原Implicit的14对失败和root-only中间观察保留。该证据仅证明此样本与依赖方案，不代替后续真实Nest/HTTP或全Unicode证明。G2将生成器、独立lock、成套数据和来源manifest纳入版本控制，并在最终产品lock再次核验原253依赖与25新增边界。

## 3. 八操作、DTO和守卫

全部操作要求 `platform:roles:manage`，依次复用 session认证、写请求CSRF、权限守卫；权限拒绝安全事件与受保护401 Cookie行为沿用现行实现。没有查询DTO，额外query不创建新筛选/分页语义；id按原字符串传入数据库，不默认新增UUID管道。

| Method/path                                | 原controller方法      | 输入                         | 成功输出/状态                              |
| ------------------------------------------ | --------------------- | ---------------------------- | ------------------------------------------ |
| GET `/api/platform/permissions`            | listPermissions       | 无DTO                        | PlatformPermissionList / 200               |
| GET `/api/platform/roles`                  | listRoles             | 无DTO                        | PlatformRoleList / 200                     |
| POST `/api/platform/roles`                 | createRole            | CreateRoleRequest            | PlatformRoleSummary / 201（原spec声明200） |
| GET `/api/platform/roles/{id}`             | getRole               | id字符串                     | PlatformRoleDetail / 200                   |
| PATCH `/api/platform/roles/{id}`           | updateRole            | UpdateRoleRequest            | PlatformRoleSummary / 200                  |
| POST `/api/platform/roles/{id}:activate`   | activateRole          | UpdateRoleActivationRequest  | PlatformRoleSummary / 200                  |
| POST `/api/platform/roles/{id}:deactivate` | deactivateRole        | UpdateRoleActivationRequest  | PlatformRoleSummary / 200                  |
| PUT `/api/platform/roles/{id}/permissions` | assignRolePermissions | AssignRolePermissionsRequest | PlatformRoleSummary / 200                  |

canonical路径省略`/api`，原inventory行214–216、529–533均aligned。八操作加入Rust后累计18操作；新增subset metadata机械提取原完整规范并保留其200元数据，运行201与规范差异单独记录，不擅自修改规范或旧客户端。

四类schema均按现行Zod对象语义剥离未知键。create的roleKey/name trim后分别1–64/1–128，description原字符串≤1000且nullable/optional，displayOrder非负整数optional；update允许name/description/displayOrder，但剥离后至少有一个定义字段；activation的reason/comment各≤1000 optional，expectedVersion为positive integer optional，三个字段当前service均忽略；permissions必须提供37项enum组成的数组，可空、可重复，service按首次出现去重。JSON missing/null、字符串长度、trim字符集、非有限数字/整数边界、错误issues顺序均以锁定Zod4.6.1实际源码和schema执行见证为准，不能套用其它版本假设。

锁定Zod4.6.1的字符串min/max按Unicode code points计数：合法surrogate pair算1、lone surrogate算1；请求、当前响应和审计仍需保留原JS UTF-16码元，不能把长度规则等同于UTF-8编码规则。

全局parser先于守卫；DTO校验在守卫之后。原controller只有ApiOkResponse，没有ZodSerializerDto，输出不能自行增加enum校验过滤历史值。无Body、错误Content-Type、畸形/超限body、错误method/path、非法UUID等由原parser/guard/DB的实际顺序与错误协议决定，逐项真实对照。

文本需区分原JS UTF-16、node-pg编码到PG text的替换行为、JSON.stringify审计以及读取后的UTF-8。不能因数据库RETURNING成功就用替换后的文本覆盖当前managed实体响应。lone-surrogate在description与roleKey/name、create与update快照中的不同路径列入真实Nest见证；尤其合法DTO是否产生“业务text成功、随后jsonb审计失败”的自然失败场景，在实测前不宣称既定结果。Rust可复用JsString/raw JSON，禁止先经Value无损假设丢失原字符。

数值同时区分Zod/JavaScript安全整数与PG int4：displayOrder合法safe integer超过2147483647时，不能提前按Rust i32拒绝为400；实际DB越界和错误状态由真实Nest核验。expectedVersion合法但不匹配、未知数字字段被strip、边界数值/-0等亦由原schema见证。不得因SQLx结构体类型缩窄公共输入范围。

## 4. 读侧和常量

角色列表返回active及inactive，按displayOrder ASC、createdAt ASC，不能增加id排序或分页。summary只返回id/roleKey/name/description/isActive/isSystemRole/displayOrder/createdAt/updatedAt；description归null，日期输出JS毫秒ISO，不暴露row_version或actor列。

详情读取全部权限历史，先按assignedAt/createdAt ASC，再只取active并按原`localeCompare`排序；assignedUserCount仅数active user-role关系，不额外过滤inactive用户。历史未知permissionKey保持原字符串，不按enum丢弃。现运行基准固定为Linux Node24、ICU78.3/CLDR48、默认en-US；Rust用上述独立source的en-US collator、variant strength、numeric=false、ignorePunctuation=false、caseFirst=false。Windows Node默认zh-SG的非契约Unicode排序作为分平台观察，不能声称任意历史中文值跨locale一致。合法37键四组合排序须一致；相同CLDR版本不自动等于运行一致，须保留Node实际排序差分及其覆盖边界。

权限字典由原PERMISSION_KEYS声明顺序与PermissionsMeta单向导出，name=key、status=active、isSystemPermission=true、sourceType=system-seeded、deprecatedBy=null。系统最低权限常量也从原PlatformService导出：platform-admin全部37键，project-viewer六键（project:read、nav:dashboard:view、nav:attachments:view、nav:projects:view、nav:contracts:view、nav:profile:view）。seed初始权限集合与最低保护集合分别保留，禁止混为一谈。

## 5. 写侧、审计和持久化

沿用原92迁移创建新验收副本，不新增产品DDL/索引/约束。`poms.role`的UUID/key64/name128/text description/boolean flags/int display_order/int row_version及timestamptz、nullable uuid actor依原迁移/entity。权限关系为UUID主键、role UUID、permission_key varchar128、status varchar32及历史时间/actor，active(role_id,permission_key) partial unique，role FK cascade；无独立permission表、无新增enum/check。三表的真实catalog逐项核验。

| 命令                | 必须保留的行为                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| create              | key预查冲突409；active=true/system=false/order默认0/description默认null；createdBy/updatedBy为null；真实竞争unique失败另核，不一概转成409          |
| update              | 只改三个允许字段，保留roleKey/flag/actor；同值请求合法；ORM脏值决定UPDATE、row_version和updated_at，不强制每次+1                                   |
| activate/deactivate | 可操作系统角色，可重复；不使用客户端expectedVersion/reason/comment；仍保留ORM基于读取快照的内部版本CAS，不能说完全无版本                           |
| permissions         | Set首现序；撤销旧active行保留历史并写revokedAt/revokedBy；新增缺失权限为新UUID历史行而非复活；不改role版本/updatedAt；同集合仍写审计               |
| 最低权限拒绝        | 仅isSystemRole=true且roleKey命中两个既定键；按最低集合顺序记录missingPermissionKeys，先写rejected audit再抛409；其它系统key/非system同名不扩展保护 |

所有写操作audit targetType=PlatformRole、targetId=role.id、operatorId=req.user.sub。controller未传requestId，因此业务audit.requestId=null，不沿用导航请求头写入。create afterSnapshot仅roleKey/name/isActive/isSystemRole/displayOrder；update before/after为name/description/displayOrder；启停仅isActive；permissions前为active历史查询顺序、后为请求Set顺序。正常reason/metadata/before缺省为null；最低权限拒绝reason=system-role-baseline-violation、metadata={missingPermissionKeys}、before/after=null。

显式seed沿用原bootstrap：upsert固定role并恢复active/metadata，再重建这些固定角色权限。仅新副本初始化显式运行，不移入Rust产品生命周期，不在验收中为了恢复状态反复seed全库。

## 6. 分段flush与会话

原角色命令先`PlatformRepository.saveAll().flush()`，再独立`RuntimeAuditService.recordAuditLog().flush()`。这不是整个请求的单事务：第一次业务flush可同时提交认证pending session CAS，第二次审计flush不能重复消费旧pending。认证raw touch已独立提交；第一次flush失败不宣称撤回raw touch；业务成功后审计失败不宣称业务回滚。权限无变化和最低权限拒绝没有业务flush，pending由审计flush消费。

在接受Rust持久化实现前，真实Nest witness必须覆盖due/non-due、create/dirty update/no-op update/启停重复/changed及no-op permissions/rejected baseline的SQL顺序与前后版本；失败覆盖业务flush、审计flush、session CAS、role CAS和partial unique。不能从静态调用图或mock推断具体版本增量。发现实质差异记录纠偏后修正并复验。

审计失败注入只允许在新的验收库，以精确run UUID、actor和预登记目标roleKey/ID限定触发器；owner创建/移除及定义指纹须审查，失败后finally移除并检查catalog还原。不得设置全库无条件拒绝或修改产品SQL；角色audit不接受requestId，所以不把超长header当作该失败见证。

优先验证上述合法DTO自然失败；若已足以证明第二flush失败边界，不额外安装触发器。需要触发器时，在安装前写持久journal（库/marker、run、actor、目标key/ID、函数/trigger名称及定义指纹、恢复动作），恢复入口必须处理进程崩溃，不能只依赖finally。首次业务flush和late CAS等并发机制亦须固定目标、独立连接/锁及恢复边界，不放宽成全库故障。

既有会话每次请求按active user-role、active role和active role-permission重新计算并集。角色启停/权限替换不撤销session；下一请求即时收敛，当前已通过guard的写请求可完成。用户停用/密码/角色分配命令属于后续R2D。

## 7. 隔离与所有权

- 主checkout保持干净；Windows独立WT、Linux独立`/home/wangzishi/projects/poms-rust-r2b`，state=`/home/wangzishi/.local/share/poms-r2b`；旧R0/R1/R2A checkout、库、日志和缓存保留。
- 只使用已知PG15.12容器`poms-r0e-pg15`；image=`b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a`、volume=`poms-r0e-pg15-data`、两者scope=`rust-r0e`、host binding=`127.0.0.1:15432:15432`。当前容器已停止，G1后精确核验镜像/标签/端口/卷再恢复这一容器，不创建替代实例。build image=`ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273`且scope=rust-r1c；browser image=`40946b3f8c4be299594da0968be9656f010b2e73df6be115c9555e155528997d`且scope=rust-r1d。
- 新库`poms_r2b_nest`/`poms_r2b_rust`，owner=`poms_r0e_owner`；低权运行session_user/current_user必须均为`poms_r2b_app`；cluster version=150012、port=15432、GUC=`poms.r0e_isolated=on`、UTF8/en_US.UTF-8、schema=poms，runtime timezone=Etc/GMT-8。control=`r2b_control.marker`、marker=`538b8313-b54d-4318-9f70-4705132716ce`。写入前重复校验库/owner/marker与运行角色super/createdb/createrole/bypassrls/replication全部false、成员0、database/poms/public无CREATE、control无USAGE；owner仅新库初始化、结构/marker核验及明确冻结的故障恢复动作。
- 固定Node24、Nest127.0.0.1:5100、Rust127.0.0.1:5101、admin127.0.0.1:5200（seed800），CORS=`http://127.0.0.1:5200`。启动前核owned ports空闲；managed profile=r2b，仅显式mode选择。env文件为state/private/{nest,rust}.env，容器只挂载对应state/private到`/r2b-private`、repo到`/workspace`、只读bin到`/r2b-bin`；Windows使用该固定private文件的WSL路径或经身份/内容校验的专用副本，拒绝默认.env/deploy/private/任意DB URL与ambient注入。
- 保留原owner secret=`poms-r0e-owner-password`，只挂载到`/run/secrets/r2b-owner-password`；新runtime secret=`poms-r2b-app-password`、scope=rust-r2b，只挂载到`/run/secrets/r2b-app-password`。private内app-password/JWT为新随机值，权限受限，现有不同内容拒绝覆盖；不读取PG17或旧业务库凭据，不输出secret、不放argv/journal。
- PG17仅前后服务元数据；本轮起点Running/Auto/PID6768，未连接SQL。不得seed/reset/migrate/停止PG17。TEST/PROD和外部服务无操作。
- fixture按run UUID、固定名称、actor、精确关系和audit/security ID范围登记；HTTP创建role之前先journal写意图(roleKey)，成功或失败后按该key限定恢复ID；异常响应不能等同未提交。cleanup保留首次报告，二次matched/changed为0，最终全run复核；不按共享targetId或空requestId扩大删除。继承R2A ownership行锁、反向引用预检与外部FK/SET NULL拒绝，全部归属在同一事务锁定并再次检查后才删除，不依靠cascade误删外部行。
- 系统最低权限成功/拒绝在新副本真实固定角色上核验，测试串行并取得库内固定角色控制锁；变更前持久journal保存完整相关行/权限历史/源hash和预期恢复计划，finally及独立崩溃恢复入口均能按精确快照恢复并逐字段比较，防止四组合/PG互相覆盖。快照保留exact UUID、原始DB时间精度和所有字段，不经JS Date毫秒转换丢失原精度。恢复不得覆盖不符合该run预期的第三方变更；不能用任意system=true随机角色替代两种真实baseline规则，也不能全库seed清场。可用非system同名/其它system角色的独立纯或PG用例测试保护边界。
- A负责`src/roles/{mod,model,http,validation,collation}.rs`、`tools/rust-r2b/export-roles*`和生成物及经冻结的ICU依赖增量；B负责`roles/{store,service}.rs`、真实PG tests与最小必要auth helper可见性/注释；root负责lib/http集成、environment/fixture/witness/HTTP/browser和正式治理；C不写产品，做独立审查。

## 8. 必需验证

| 层次           | 本片要求                                                                                                                                              | 当前结果 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 权威源与DTO    | 实际原schema纯执行golden、权限字典/最低集合、排序Node差分；working/index/untracked guard；未知历史值与Unicode不丢弃                                   | Pending  |
| Rust           | 固定工具链fmt/clippy all-targets、locked tests/release；新增纯逻辑和显式PG事务/竞争用例；ignored单列                                                  | Pending  |
| 原Nest witness | 第6节两阶段flush、状态码、no-op、失败及同cookie权限联动；来源/SQL类别/前后完整事实                                                                    | Pending  |
| 真实HTTP       | Nest/Rust相同八操作场景、完整错误体、DTO边界、401/403/CSRF、201差异、关系历史、12列审计、权限即刻生效、失败后态与零残留                               | Pending  |
| 原Angular      | Linux/Windows × Nest/Rust四组合：真实登录/角色列表/创建/修改/启停/权限分配与拒绝；低权限无入口和403、同session权限重载；无mock/bridge；桌面与窄屏审图 | Pending  |
| 回归           | 同场景foundation四组合、已有导航三操作受本片影响部分及普通Rust认证回归；旧实跑与本轮分列                                                              | Pending  |
| 静态与契约     | 受影响工具/E2E lint/typecheck，原Nest相关单测/build，原Angular build；18操作subset核验，完整spec+579client生成与指纹保持                              | Pending  |
| 数据结构       | 两新副本原92迁移、三role相关表/session/audit catalog、原migration-check；既有差异如实分类，dump不执行                                                 | Pending  |
| 治理与交付     | 格式/链接/diff、来源与日志hash、非作者G3，推送和集成后检查，三生命周期文档归档，GitHub仅R2B完成                                                       | Pending  |

Windows external Rust由独立Linux owner持有，browser退出后确认同一owner仍存活再由owner停止。保存所有失败/跳过原件及对应来源，不以旧R2A/R1成功数量代替本轮。UI测试只证明角色范围，不将未迁移页面/todo/provider响应说成已完成。

## 9. 差异、风险与例外

已知`existing-baseline-drift`：createRole运行201与OpenAPI200；旧设计文档8.3路由建议与当前canonical不同；activation接受但忽略expectedVersion/reason/comment是现行兼容事实。本片不借迁移修复这些语义。原schema-check可见性/注释差异须新副本重新执行分类，不能直接继承上轮通过。

风险集中于两阶段事务误合并、pending重复消费、同值更新版本、权限历史与排序、未知值丢失、错误DTO/null/Unicode语义、恢复清理遗漏已提交角色、系统角色验证污染。各有明确真验证，不以作者自评替代。没有绕过G1/G3、真实PG或独立审查的例外；N/A：金额、产品DDL、外部服务、部署、迁移接管和性能基准。

## 10. G1 决策

Pass。最终审查候选原始字节SHA256=`026fd079a401310ee2d56ef90eafd0f9dc5c21a2425b7d629ff03952a4fc9b63`，来源HEAD=`9734515f84ebe1a4833d207124adbfbe378f691f`。A合同复核报告SHA256=`e4f7847bff42191dfbd413adc1da8846a58c27759ca587fd172000038d1fb095`；B持久化复核报告SHA256=`4a5f1d9b39f1c2a375c024078902972b804eab27d27a80cdfce51f0d56cf3839`并确认后续排序补充不改变已通过范围；C最终独立复核报告SHA256=`86bb213b07b6d5903809b610448943476277d01ee4b232a022805cc43e28d5f4`，无剩余阻断或P1/P2。报告保存在本片独立证据目录；本次冻结仅更新Gate元数据，未改变被审合同。

排序依赖决策报告SHA256=`da845a5301e338990757921a81e27f076284eec732e2e7b71b6b7e04127d5c9f`，纯探针报告SHA256=`f7599675a689efffb547c1a2a432359b6e72b25696612fe5bf5b19c2da06c644`；runtime scaffold lock规范化SHA256=`73783b67967c03a7b6ded3c4a2f459bfe448f5a593e94288b3baac7035b87718`。冻结前没有编写Rust角色产品代码或执行新数据库写入。放行八操作及必要工具的G2实现；真实Nest/PG/HTTP和原页面验收、G3独立审查及G4仍待完成，不放行R2C–M。

## 最终归档指向

正文保留2026-10-26T19:32:29Z的G1冻结输入及当时Pending矩阵；实际G3/G4结论见[收口记录](rust-r2b-closeout.md)与[机器验收](../../rust-r2b-validation.json)。原始27567字节的SHA256为`050beeeb213072aec185c0d60cefde3171924153d3450d14fa1ad7cf27f2e4e6`，可从实现提交`31555b76d1d9a453aef44172211e4b35e30df573`的`docs/design/rust-r2b-role-permissions-baseline.md`及独立证据`g1-frozen/`原件恢复。本归档版仅更新相对链接并追加本节，其新hash另记，不冒充冻结原字节。
