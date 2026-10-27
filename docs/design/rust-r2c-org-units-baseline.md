# RUST-R2C 组织树与组织命令实施基线

- Gate Status：`G1 Pass`；A/B分项与C非作者审查通过，输入已冻结，放行G2。
- Parent：[R2 #67](https://github.com/illusion-tech/poms/issues/67)；Slice：[R2C #70](https://github.com/illusion-tech/poms/issues/70)；前置R1、R2A已交付，复用已交付R2B的认证及兼容基础。
- Owner：主代理；A契约/HTTP/输出/排序；B持久化/服务/PG测试；C非产品作者独立审查；主代理负责环境、fixture、真实HTTP/UI、公共接线和最终集成治理。
- 类型：`cross-layer-high-risk`；真实组织命令、级联更新、认证读取与审计；无产品DDL变更。
- 起点：clean main `705973835d4c823ae8aa3988976e8d6a13b31dfe`；Windows managed worktree `codex/poms-r2c-org-units`，Linux专用checkout `/home/wangzishi/projects/poms-rust-r2c`；沿用solo worktree checkpoint。
- 日期：2026-10-27（Asia/Tokyo）；G1冻结时间：2026-10-27T13:04:40.627Z；A/B输入复核与C独立复核均Pass。
- Tracker：[Rust迁移追踪](rust-migration-execution-tracker.md)；[R2范围](rust-r2-scope-and-dependencies.md)、[108操作归属](rust-r2-operation-slices.json)。

## 1. 范围与下游边界

仅迁移现有八个组织操作：组织树、平铺列表、详情、创建、修改、启用、级联停用与移动。保留原TypeScript的DTO、错误、排序、父子约束、成员统计、请求内ORM快照、乐观版本及分段业务/审计事务。交付后供R2D用户组织关联和R2H外部组织同步依赖，不表示这些能力已迁移。

不新增删除组织、组织范围授权、租户隔离、用户主责/附属关系写接口、外部组织源/同步、业务数据归属迁移、产品migration、Rust自动seed、完整OpenAPI/client生成权接管、部署或性能结论。`canDelete`只是现有输出字段，不引入DELETE路由。仅关闭#70；父#67/#57、R2D–M和#61继续保留。

## 2. 正式输入与单向权威

原TypeScript产品、共享契约、完整OpenAPI、579个生成客户端、92份产品迁移及历史验收保持原位。新导出器绑定working tree、index和受保护目录untracked三轴；文本规范化仅允许CRLF→LF，opaque排序数据按原字节校验。

| 领域           | 正式输入                                                                                                                                               | 本片消费与优先级                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 阶段与业务     | [迁移计划](backend-rust-migration-plan.md)、[组织设计](platform-governance/org-unit-design.md)、[ADR-002](../adr/002-org-unit-model-and-assignment.md) | 树结构、平台RBAC、归属关系边界；旧设计描述不覆盖已冻结的现行route/运行行为              |
| 路由           | [canonical inventory](api-route-canonical-inventory.md)、[R0F](archive/slices/rust-r0f-route-baseline.md)、ADR-015/018                                 | inventory218–221及525–528八操作aligned；不重引入`/org-units/tree`或slash命令            |
| 控制与服务     | `apps/poms-api/src/app/features/platform/platform.controller.ts`、`platform.service.ts`、`platform.repository.ts`                                      | 守卫、参数、查询次序、JS严格字符串判断、dirty检查、flush与审计                          |
| DTO与响应      | `libs/shared/contracts/src/lib/shared-contracts.ts`、`libs/api/contracts/src/lib/auth/user.dto.ts`、`libs/vendor/nestjs-zod/src/`                      | 原Zod4.6.1 schema执行oracle、未知字段剥离、UUID、null、字符串/数值和错误issues          |
| 持久化         | `org-unit.entity.ts`、`user-org-membership.entity.ts`、`platform-user.entity.ts`、现有组织/平台migration                                               | org_unit完整行、parent FK、唯一索引、自引用CHECK、row_version、membership计数和外部引用 |
| seed/认证/审计 | `core/platform/dev-platform.fixtures.ts`、`seeders/platform-bootstrap.seeder.ts`、`core/auth/`、`core/runtime-audit/`                                  | 显式平台bootstrap、每请求读取、raw touch、pending session CAS、业务和audit两次flush     |
| 既有Rust       | [R2A收口](archive/slices/rust-r2a-closeout.md)、[R2B收口](archive/slices/rust-r2b-closeout.md)、`apps/poms-api-rust/src/auth`和`roles`                 | 复用已验证基础，按本片实际读取与flush确认组织快照，不把历史通过冒充本轮重跑             |
| 原页面         | `apps/poms-admin/src/app/features/platform/org-unit-list.ts`、`libs/admin/data-access/src/lib/platform/platform.store.ts`及实际依赖                    | 原树表、搜索、创建/编辑/移动/启停及flat/tree刷新；不替换产品页面或mock目标接口          |

Rust工具链保持1.99.1，既有Cargo依赖身份固定。组织树需要`zh-CN`比较，不能把R2B的`en-US`有限证明扩大为中文排序等价。复用固定ICU4X revision `38a49da495248dd1ded84cf306e4ca42e64d5bb3`（package2.1.1）及原成对Unihan Root/Jamo NodeData provider，显式选择zh-CN并消费同revision的Baked中文tailoring；默认Baked provider不能替代。G0扩大804字符串的探针中，643204对well-formed比较的zh-CN/en-US NodeData结果均与Node一致；Baked中文有9464差异。孤立surrogate比较保留未一致标签，PG text读取的树名称不含该码元。新增同revision的icu_casemap及其compiled data用于完整Unicode上下文小写，804项有限探针一致。最终依赖与lock增量记录producer身份，不手调权重、不运行时调用Node；不把有限语料宣称为全Unicode证明。旧R2B排序行为及opaque数据保持。

## 3. 八操作、DTO与入口

全部操作要求`platform:org-units:manage`。原全局parser先于认证/CSRF/权限守卫；DTO验证在守卫之后；无查询DTO，不新增筛选或分页。路径id保留原字符串，不引入全局UUID验证或规范化。

| Method/path                                    | operationId后缀     | 输入                             | 成功输出/状态                                 |
| ---------------------------------------------- | ------------------- | -------------------------------- | --------------------------------------------- |
| GET `/api/platform/org-unit-tree`              | `listOrgUnitTree`   | 无DTO                            | `PlatformOrgUnitTree` / 200                   |
| GET `/api/platform/org-units`                  | `listOrgUnits`      | 无DTO                            | `PlatformOrgUnitList` / 200                   |
| POST `/api/platform/org-units`                 | `createOrgUnit`     | `CreateOrgUnitRequest`           | `PlatformOrgUnitSummary` / 原运行201、spec200 |
| GET `/api/platform/org-units/{id}`             | `getOrgUnit`        | 原id字符串                       | `PlatformOrgUnitDetail` / 200                 |
| PATCH `/api/platform/org-units/{id}`           | `updateOrgUnit`     | `UpdateOrgUnitRequest`           | `PlatformOrgUnitSummary` / 200                |
| POST `/api/platform/org-units/{id}:activate`   | `activateOrgUnit`   | `UpdateOrgUnitActivationRequest` | `PlatformOrgUnitSummary` / 200                |
| POST `/api/platform/org-units/{id}:deactivate` | `deactivateOrgUnit` | `UpdateOrgUnitActivationRequest` | `PlatformOrgUnitSummary` / 200                |
| POST `/api/platform/org-units/{id}:move`       | `moveOrgUnit`       | `MoveOrgUnitRequest`             | `PlatformOrgUnitSummary` / 200                |

operationId均以`PlatformController_`开头。八操作加入后Rust累计26操作；隐式HEAD不增加OpenAPI操作。原metadata保留200声明，并独立记录创建201既有差异。

四类DTO由原schema机械执行冻结oracle，不手写第二份契约权威：

- create：name/code trim后非空，上限分别128/64；description原字符串≤1000、nullable/optional；parentId为原Zod UUID、nullable/optional；displayOrder为非负整数optional。
- update：name/code/description/displayOrder optional，strip后至少一个字段非undefined；description null为清空，parentId不属于此命令。
- activate/deactivate：reason/comment≤1000 optional，expectedVersion为positive integer optional；接受字段不等于service采用其并发前提，按原实际使用保留。
- move：parentId UUID nullable/optional、displayOrder非负整数optional、reason≤1000 optional、expectedVersion positive integer optional；至少parentId或displayOrder非undefined。parentId missing保持原父级，null移动到root。

未知键剥离、对象issues顺序、Zod UUID格式/版本位规则、整数/安全整数、missing/null及字符串长度以锁定schema执行结果为准。字符串保留JS UTF-16码元；长度不能简单认定为UTF-16 code-unit数量，原Zod4.6.1实际按Unicode code point计数。PG text编码、当前响应、JSON审计的lone-surrogate处理分别验证，不能通过数据库回读覆盖当前响应原字符串。

HTTP需要真实验证原静态段大小写、单尾斜杠、encoded静态段/冒号、未知命令/method、query与raw安全事件path以及GET隐式HEAD。兼容转换只限定本片八操作已知shape，保留OriginalUri和动态id。HEAD成功长度对本端真实GET验证，跨端JSON编码表示差异必须披露，不按所有header原字节相等作伪证明。

## 4. 查询、树与ID语义

平铺列表使用数据库`display_order ASC, created_at ASC`，第二键保留PG原始精度。树视图另按`displayOrder`、JS Date的createdAt毫秒、`name.localeCompare('zh-CN')`、`id.localeCompare()`排序，之后按parentId分组；只从null父级构造root树。二者不是同一排序规则，不能在产品SQL中追加id作为“修复”。

组织summary包含id/name/code/description/parentId/isActive/displayOrder/createdAt/updatedAt；两个nullable字段按原语义输出null。detail/tree加childCount、activeMembershipCount、canDelete；tree另加children。childCount只计直接子级、含停用节点；成员计数只按`user_org_membership.status='active'`逐行计数，包含primary/secondary和未知membershipType，不join用户active、不看结束或撤销时间、不按用户去重。canDelete只判无直接子级且active成员数为0。

detail、activate、deactivate、move从findAll返回行中用JS严格字符串id匹配；大写/compact UUID不会自动等于canonical字符串。update则先findAll再findOrgUnitById，原数据库UUID cast与ORM identity map路径须真实见证。不得把全部入口统一为数据库findOne或统一改成canonical id。父级DTO虽验证UUID，service仍在allOrgUnits中按原字符串找父级。

认证resolveActiveAuthUser只读用户、角色及权限，不预加载组织；profile单独读取组织不能当作本片请求的早期快照。需要见证的是命令内create的code-findOne→findAll、update的findAll→findOne，以及nullable字段合并、并发读取时点和CAS。以真实Nest SQL和竞争见证决定命令内必要的局部实体快照；不新增auth组织预加载、共享缓存、thread-local状态或公共AuthUser字段。

## 5. 命令与持久化边界

`org_unit`沿用现有id UUID、name128、code64全局唯一、description text nullable、parentId nullable自引用FK（update cascade/delete set null）、isActive、displayOrder int4、row_version、created/updated及actor字段；不新增表或DDL。

应用同级名称预检为同parent的`name.trim().toLocaleLowerCase()`，排除当前实体；PG唯一索引为`coalesce(parent_id,nil UUID),lower(name)`，没有trim。code唯一性按原精确比较。应用预检与数据库竞争失败的错误协议分别保留。create缺省displayOrder为同级最大值+1或无同级时0；move缺省displayOrder保留当前值。合法DTO但超过int4或create默认值溢出的数据库结果不提前改为400。

create先查code、再allOrgUnits、解析父级、检查同级名，再创建isActive=true、createdBy/updatedBy=null并flush。父级不存在404、停用409。update保留code/name变更条件与description赋值语义，no-op仍进入saveAll及audit；是否dirty由原值比较决定。

activate仅启用当前节点，若直接父级停用则先记录rejected audit（reason `inactive-parent`）再409；不自动启用祖先或后代。deactivate收集全部后代（含已停用节点），将整组设为false；审计before/after数组按原findAll顺序，cascadedCount为组大小减1，包含原已停用后代。只真正dirty行增加版本/updatedAt；不撤销membership、不直接停用用户。

move先解析目标父级。该解析已拒绝停用父级，源中后续`move.rejected inactive-parent`分支静态不可达，不伪造审计。后代作为父级时记录`cycle-detected` rejected audit再409；self不在初始descendant集合中，按原流程到既有DB `chk_org_unit_parent_not_self`拒绝，不擅改为cycle409。多节点环没有数据库递归约束，不扩大为结构修复或串行化保证。移动后保持默认/显式displayOrder语义及原request元数据。

业务`persist().flush()`与RuntimeAuditService的audit flush是两次独立事务；合法DTO可出现业务已提交、audit失败，不能合成原子事务。认证raw touch先独立提交，pending session CAS由实际首个flush消费。创建、dirty更新、no-op、mixed级联、rejected audit的SQL次序、多行批处理、CAS冲突整体回滚范围必须由真实Nest见证决定，不从R2B单行经验推定；对应flush/CAS SQL实现以见证为前置。业务预检读取不额外包装全流程事务、锁或重试。不得安装产品触发器模拟失败；优先合法输入自然触发的编码/约束失败。

## 6. 隔离环境、fixture与清理

Windows工作树与Linux checkout/state均独立；不改主checkout产品。新受控PG15目标限定`poms_r2c_nest`、`poms_r2c_rust`与低权`poms_r2c_app`；继承原受控cluster15432的镜像/volume/owner身份守卫，新增marker `bdbfcab9-a643-4379-88fc-b19d45d1ca24`。不复用R2B数据库内容作为本轮验收。

固定守卫参考`tools/rust-r0e/environment.sh`的status与`tools/rust-r2b/{environment.sh,database-environment.mjs,managed-environment.cjs}`的已交付协议，在新`tools/rust-r2c`实现本片目标。既有container为`poms-r0e-pg15`，volume为`poms-r0e-pg15-data`，二者scope=`rust-r0e`；PG image ID为`b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a`，host binding仅`127.0.0.1:15432`，cluster标记`poms.r0e_isolated=on`。数据库owner仍为`poms_r0e_owner`，runtime role无superuser/createdb/createrole/bypassrls/replication及额外role membership。owner-only `r2c_control.marker`绑定上述marker与精确database名，runtime仅`poms`所需DML/sequence权限。不得调用旧脚本的start/provision/reset来替换cluster。

新state固定`/home/wangzishi/.local/share/poms-r2c`，`private`目录0700、secret/env/journal文件0600，进程umask077。新`poms-r2c-app-password`使用32字节随机源生成64位hex并以scope=`rust-r2c`保存为Podman secret；JWT secret另生成同强度随机值。复用owner secret只读取已存在`poms-r0e-owner-password`且核验scope，不复制/打印原文。env显式固定为private下`nest.env`/`rust.env`（容器只挂载`/r2c-private`，Windows仅同目录WSL UNC），拒绝默认`.env`、deploy/private、环境中的PG/DB/MIKRO/DATABASE_URL及任意NODE_OPTIONS覆盖。runtime环境按allowlist构造，不继承数据库或进程注入；已存在secret/env不盲覆盖。

显式启动前核验PG15.12、port15432、隔离标记、database名/owner、runtime非特权及schema权限、R2C marker、冻结source。Node固定镜像实际24.16.0/ICU78.3/CLDR48、默认en-US；Rust固定1.99.1/既有Debian12 build image。计划API5300/5301、UI5400（port seed1000），启动前检查端口占用。Windows Rust组合由独立Linux owner持有服务，测试结束后确认同PID仍活，再由owner停止，不冒称Windows原生Rust服务器。

PG17本片只允许服务元数据观察；G0实际为Running/Auto/PID7236。禁止其SQL、seed/reset/migrate、停止或数据复制。旧PG15库、Linux checkout、原二进制和历史证据保留；受控PG15当前已退出，G2可以在既有镜像/volume守卫通过后resume，不创建替代cluster。

fixture必须以精确run/actor/组织身份为边界，禁止reseed或全库清空。组织code可修改，必须在首次HTTP创建前持久化唯一intent，并在更改code前稳定adopt UUID；失败或响应丢失可以用未变的受控code定位，但不能用前缀扫描或已过期code盲清。journals采用独占锁、先写意图、fsync及恢复状态，重启不丢失所有权。

清理在同一事务中FOR UPDATE锁定owned组织、预检所有外部FK引用并删除，锁持有到commit；引用含其它org父级、用户primary org、membership、customer/sales follow-up owner、external_org_source authoritative org、external_department_mapping和org_sync_diff_item。外部边存在即拒绝，未知新增FK也拒绝，先扩展显式guard才能使用。只允许清除本run自有依赖，不能通过SET NULL/CASCADE改变外部行。保留目标行、membership历史、完整audit/security/session和版本/时间事实；每run实际cleanup及独立第二次0/0，全部轮次和异常恢复均留原标签。无需修改固定系统组织；树和层级场景使用run-owned节点。

## 7. 验证矩阵与G3条件

| 类别             | 必须实际验证                                                                                                                              | G1状态  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 来源与契约       | 原四类schema oracle、输出/完整metadata、working/index/untracked guard，完整spec及579client保持；新增8、累计26操作                         | Pending |
| 纯排序与名称比较 | 中文/拼音/扩展Han、组合字符、大小写、Greek/Turkish/空白、UTF16与lone surrogate、stable ties；Node与Rust有限语料差分，固定locale/data/依赖 | Pending |
| 原Nest见证       | 创建/dirty/no-op/级联/拒绝/编码/溢出、自移、别名/非法id、查询快照和SQL事务配对；如实标observed                                            | Pending |
| Rust静态与单测   | fmt、locked/offline check/test/clippy all-targets零warning、release；ignored与实际PG另列                                                  | Pending |
| PG service       | 真实隔离PG中的层级、唯一性、CAS、批量回滚、业务/audit分段失败、成员计数、完整持久化事实                                                   | Pending |
| 双端HTTP         | 八操作、401/403/CSRF、完整错误、DTO/URI/HEAD、详情/列表/树差异、排序、父级/同级/循环/启停/移动/版本与审计；逐字段diff                     | Pending |
| 并发             | code与同级名竞争、组织CAS、级联中一行冲突回滚、late session CAS、请求内读取/nullable合并；精确barrier与SQL证据                            | Pending |
| 原页面四组合     | Windows/Linux × Nest/Rust，原组织树表读取/搜索/创建编辑/移动/级联停用/逐级启用/权限拒绝及真实flat/tree刷新，桌面与390px截图               | Pending |
| 回归             | 四组合foundation认证；受影响R2A/R2B来源和路由/认证回归；旧历史全矩阵不冒充新运行                                                          | Pending |
| 原TS与构建       | platform controller/service相关单测、受影响lint、原Angular production build、浏览器测试types、纯harness/fixture拒绝越界测试               | Pending |
| schema           | 两新库执行原92迁移、catalog对照、原migration-check；失败须真实分类，schema dump只读，提议DDL不执行                                        | Pending |
| 清理与审查       | 全部run第二次0/0、private journal/source完整性、服务owner退出、PG17元数据、非作者C审查无P1/P2                                             | Pending |

原页面既有PrimeUI许可提示及表格窄屏滚动按真实截图记录，不把它们当本片视觉修复。原测试旧placeholder与当前页不同，应使用当前原页真实locator；不能因旧断言不适用跳过必需操作。C审查A/B产品，B或主代理复核C编写的比较工具，避免以作者自证替代。

## 8. 分工、交付与完成门槛

代理配置沿用迁移计划：主代理目标GPT-6 Astra/Ultra；A/B/C显式GPT-6.1 Sol/max，Fast仅为目标、工具未提供独立控制参数，实际状态未核实。四代理并发上限。A拥有`org_units/{model,http,validation,collation}.rs`及单向导出/排序工具；B拥有`org_units/{service,store}.rs`及独立PG测试；C保持非产品作者，独立检查G1/G3与原始证据。主代理唯一拥有Cargo/lock、公共路由/模块、auth共享接线、环境/fixture/HTTP/UI验收和正式治理文档；跨拥有范围先协调。

G1审查通过后冻结文件原字节和时间，Issue #70及父#67同步G1/Doing。后续漂移用独立corrective checkpoint，不改写历史Pending矩阵。G3前逐项证据实际执行或明确合理边界；源码变更后受影响证据重新核验，受审候选与实际二进制、原始报告绑定。

通过G3后先实现提交/推送，再按solo模式快进集成main并执行集成后来源/适配器/导出检查；随后归档baseline、corrective及closeout，写长期机器验收，更新入口/追踪和当前slice状态。108操作JSON的G0 `operations`、`sourceManifest`、`routeDecisions`保留历史核心，只更新R2C的slices交付元数据。归档提交推送和GitHub同步后仅#70 Done/Closed，R2A/B/C累计交付19个R2操作，剩余89与阶段验收未完成。工作树回收前逐文件保存失败轮次、日志、截图、原件与最终回执，旧环境保留。

## 9. G1审查与冻结记录

A契约/排序、B持久化/事务与C非产品作者独立审查均Pass，未关闭P1/P2为0。共同受审候选原字节SHA256为`6c4548ab7c9df522dc126137ca6e91e6e89e0fe4009e9a472ea3f961bc76638b`，原件`tmp/rust-r2c/g1-reviewed-candidate.md`；各审查回执与最终冻结原件由`tmp/rust-r2c/g1-freeze.json`绑定。候选到冻结仅变更本Gate、时间与审查记录，不改变输入内容。上述验证矩阵保留G1时Pending历史；G2/G3运行结果另记，不由G1推导通过。
