# RUST-R2 范围、操作归属与依赖盘点

**日期**: 2026-10-28
**状态**: G0 范围与拆片完成；R2A 已交付 / G4；R2B已交付 / G4；R2C已交付 / G4；D–M为Todo / G1未冻结；本文不是其余切片的实施授权
**父任务**: [RUST-R2 #67](https://github.com/illusion-tech/poms/issues/67)，总体 [#57](https://github.com/illusion-tech/poms/issues/57)；首片 [RUST-R2A #68](https://github.com/illusion-tech/poms/issues/68)
**起点**: clean main `19f837c9e33fe9cdeb7ca94f3c932c9621cb91d3`；独立工作树 `codex/poms-r2a-navigation`
**机器清单**: [rust-r2-operation-slices.json](rust-r2-operation-slices.json)。所有公共操作按 method/path 与 operationId 各唯一登记一次

## 1. 范围与证据边界

R2 承接 [正式迁移计划](backend-rust-migration-plan.md)的用户/角色/组织/导航/字典/设置、业务编号、审计、审批与摘要公共机制、附件/存储、外部身份及组织同步。R1 已交付七操作、认证与基础；R2 不重复宣称 R1 的历史数据库/HTTP/浏览器证据为新实跑。不触碰现有 PG17，不连接 TEST，不做性能结论、正式部署或 R6 迁移接管。

本文件记录 G0 的源码、既有 OpenAPI、canonical 和在线 #61 只读盘点；该阶段仅新增规划与机器清单，未改产品或连接数据库。R2A/B/C后续实现与实际验收分别由[R2A收口](archive/slices/rust-r2a-closeout.md)、[R2B收口](archive/slices/rust-r2b-closeout.md)与[R2C收口](archive/slices/rust-r2c-closeout.md)承载。以下其余切片的“验收”是各自 G1 应冻结的要求，不表示已经执行。R2 父任务不能因 R2A 或几个 UI 请求成功而关闭。

完整规范仍为 **237 paths / 291 operations / 585 schemas**。R0 v3 中 `migration.primary=R2` 的操作重新计数为 **108**，来自 16 个 controller；其中 **103 canonical-match、5 parameter-name-difference、0 未登记、0 canonical-decision-pending**。按原模块为 platform 27、attachment 30、external-org-sync 18、identity-provider 12、auth 6、approval 4、runtime-audit 4、dictionary 3、system-setting 3、navigation 1。机器清单保留逐项 controller、方法、DTO/schema 来源、权限、服务调用线索及 canonical 行。

## 2. 输入与单向权威源

文件指纹统一为 UTF-8 解码后仅 `text.replace(/\r\n/g, '\n')` 的 SHA-256，不改变 BOM、裸 CR、Unicode 或其它空白，不称 raw-byte SHA。

| 输入                                                    | 规范化 SHA-256                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| [完整 OpenAPI](../../libs/shared/api-spec/openapi.json) | `75d43527a24809a03d17a6a3b1d47c3600309c424adebe59766378eab50598e3` |
| [R0 operations v3](rust-r0-api-operations.json)         | `3d126e07d5abf2c56f41c35fc25b78a13dbe094450b470e8bb4c950ce8a2986c` |
| [canonical inventory](api-route-canonical-inventory.md) | `0822eaacb1c67339ccc2464606d19c393216b217a2c3ad99364a2d31e2b7d60f` |

R0 清单的产品源参考仍为 `033aedd0`。本次对 `apps/poms-api/src`、`libs/api/contracts/src`、`libs/shared/contracts/src`、完整 spec 执行相对该参考的 `git diff --name-only`，输出为空，故 108 项映射仍对应当前 Nest 产品源。R1 曾修改 E2E/harness，因此这里不宣称原 R0 全 scope `--check` 已重跑通过，不关闭或放宽旧 guard。机器清单另列 43 个未修改 TS/controller/DTO/schema 与关键服务来源的指纹，含确认引擎、实体、模块导出及 R4 进度消费者；它是可追溯输入清单，不冒充完整运行调用图。

共享值继续由 [shared-contracts.ts](../../libs/shared/contracts/src/lib/shared-contracts.ts)与现有 DTO 单向拥有编辑权。首片树数据的权威为 [navigation.constants.ts](../../apps/poms-api/src/app/features/navigation/navigation.constants.ts)，类型来自共享契约；应机械导出 neutral manifest，再生成或包含 Rust 数据。不得在 Rust 维护第二份手写菜单或权限表，也不以 Angular fallback 的 route metadata 替代现有后端导航权限。

## 3. 互斥拆片与建议依赖

以下为 G0 的建议实施顺序和输入依赖，不替代每片 G1。R2A #68 为首片，已按[独立基线](archive/slices/rust-r2a-navigation-baseline.md)冻结 G1；B–M已建立为#67的原生子Issue；R2B已按[独立基线](archive/slices/rust-r2b-role-permissions-baseline.md)冻结G1并完成八操作交付，R2C已按[组织基线](archive/slices/rust-r2c-org-units-baseline.md)完成八操作交付，D–M仍为Todo / G1未冻结，对应编号见下表。公共 HTTP 计数不包括内部服务、adapter 或验收任务。

| TID      | Issue                                                  | HTTP 数 | 独立交付范围                                          | 建议前置与额外输入                                                           |
| -------- | ------------------------------------------------------ | ------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| RUST-R2A | [#68](https://github.com/illusion-tech/poms/issues/68) | 3       | 当前用户导航、完整管理员导航、同步审计                | R1；静态树单向导出、权限过滤、真实 audit_log 与原请求上下文                  |
| RUST-R2B | [#69](https://github.com/illusion-tech/poms/issues/69) | 8       | 角色 CRUD/启停、权限字典、角色权限替换                | R1/R2A 审计基础；平台 bootstrap 权威数据；角色权限变化即时反映到会话         |
| RUST-R2C | [#70](https://github.com/illusion-tech/poms/issues/70) | 8       | 组织列表/树/详情、创建/更新/启停/移动                 | R1/R2A；父子循环/排序/激活约束、原乐观版本、平台组织固定数据                 |
| RUST-R2D | [#71](https://github.com/illusion-tech/poms/issues/71) | 11      | 用户 8、owner-reference 1、个人资料 2                 | R2B/C；用户角色/primary 与 secondary membership、密码写入、停用会话联动      |
| RUST-R2E | [#72](https://github.com/illusion-tech/poms/issues/72) | 6       | 字典 3、系统设置 3；另含无 HTTP 的业务编号机制        | R1/R2A；字典版本/唯一性、设置类型/审计；编号调用随 R3/R4 接入                |
| RUST-R2F | [#73](https://github.com/illusion-tech/poms/issues/73) | 4       | audit/security 读取与路由拒绝事件                     | R1/R2A；目标类型授权/脱敏、查询默认值、202 写事件与请求上下文                |
| RUST-R2G | [#74](https://github.com/illusion-tech/poms/issues/74) | 16      | identity-provider 12 + 外部登录 4                     | R2D/E/F；原 Feishu adapter、OAuth state/grant/ticket、密文、会话、单次消费   |
| RUST-R2H | [#75](https://github.com/illusion-tech/poms/issues/75) | 18      | 外部组织源、映射、同步 run/diff/apply                 | R2C/D/G；目录 adapter、映射版本与幂等、跨组织事务、真实外部环境授权          |
| RUST-R2I | [#76](https://github.com/illusion-tech/poms/issues/76) | 6       | 附件存储提供商配置、默认与连接测试                    | R1/R2E/F；本地/OBS adapter、密文、默认唯一约束与原重试                       |
| RUST-R2J | [#77](https://github.com/illusion-tech/poms/issues/77) | 19      | 上传会话 6、附件 12、附件中心 1                       | R2I/F；目标对象权限/归属、存储对象、版本/最终/作废/链接与预览                |
| RUST-R2K | [#78](https://github.com/illusion-tech/poms/issues/78) | 5       | 移交附件清单、刷新、下载包创建/读取/下载              | R2J + #61 五项参数裁决；R4 移交事实与冻结证据读取，不伪造域对象              |
| RUST-R2L | [#79](https://github.com/illusion-tech/poms/issues/79) | 4       | 审批读取/批准/驳回、统一待办；另含摘要与确认公共机制  | R2D/F；R3/R4/R5 业务处理器与实际事务逐域注册，不能仅改状态假装业务完成       |
| RUST-R2M | [#80](https://github.com/illusion-tech/poms/issues/80) | 0       | R2 阶段集成、兼容与独立审查                           | A–L 的逐项交付/待决/非 HTTP 条件；保持原 Nest 回归，未实现不得 skip 冒充通过 |
| 合计     | —                                                      | 108     | 108 method/path 与 operationId 均唯一，0 漏项、0 重复 | 12 个含路由子片 + 1 个阶段验收子片                                           |

R2L 的四操作在 R0 清单中已显式依赖 R3/R4/R5 handler。现行 [ApprovalService](../../apps/poms-api/src/app/features/approval/approval.service.ts)直接读写合同/提成及版本、金额和结算链；`findOpenTodosForUser` 还关联审批、合同、提成、项目、线索、客户。公共框架与完整业务处理完成必须分列，缺少处理器不得返回伪造成功或把所有待办固定为空。R2K 的五操作也需要真实移交事实；R2 归属并不等于 R4 域已经存在 Rust 实现。父阶段 G1/完成清单必须把这些依赖留为显式待验条件。

## 4. 待决路由与既有差异

[ADR-015](../adr/015-api-route-canonical-grammar.md)、[R0F 路由基线](archive/slices/rust-r0f-route-baseline.md)和 [#61](https://github.com/illusion-tech/poms/issues/61)保持原权威。当前 #61 Open / Todo、无裁决评论。本次不猜新 URI、不新增 alias，也不因同形 URL 忽略参数名差异。

五项 R2 差异全部属于 R2K：canonical `{id}` 与当前 `{handoverId}` / `{packageId}` 不同，须在该域工程 G1 前明确命名与 controller/DTO/OpenAPI/client/测试同步方案。其余两个 R4 移交参数差异和 R3/R4 两个 lookup 待决仍由对应域处理，不阻断三个已对齐的 R2A 操作。下方附表从机器清单列全九项。

既有 Nest `POST platform/org-units` 实际 201 / spec 200 已由 R1E 真 HTTP 记录。`POST platform/users`、`POST platform/roles` 的源码同样没有 `@HttpCode` 而 spec 声明 200，是所属 G1 须用真实 HTTP 复核的默认状态差异线索；本轮未实跑这两分支、不静默修改响应或规范。其它 query/body 的 coerce、nullable、unknown-key、版本与错误字段均以现行 Zod/服务和实际旧实现为准。

## 5. 首片 R2A 请求、响应与副作用矩阵

R2A 只包含以下三个已定操作，不捎带 todos、profile、provider 列表、平台 CRUD 或新的公开探针。规范路径不含 `/api`，运行路径保留 `/api` 前缀。

| 操作 / operationId                                                      | 认证与输入                                                                     | 成功响应                                                | 副作用与来源                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /me/navigation` / `NavigationController_getNavigation`             | `@Authenticated()`；无 path/query/body DTO，无指定业务权限门槛                 | 200 `NavigationList`，按真实当前用户权限过滤            | [controller:14](../../apps/poms-api/src/app/features/navigation/navigation.controller.ts#L14)、[service:8](../../apps/poms-api/src/app/features/navigation/navigation.service.ts#L8)；导航本身不写库，原 SessionAuthGuard 仍可续期/touch |
| `GET /platform/navigation` / `PlatformController_getAllNavigationItems` | `platform:navigation:manage`；无 path/query/body DTO                           | 200 `NavigationList`，完整原树，不按该用户过滤或重排    | [controller:274](../../apps/poms-api/src/app/features/platform/platform.controller.ts#L274)、`getAllNavigationItems`；保留隐藏/disabled 节点用于治理查看                                                                                 |
| `POST /platform/navigation:sync` / `PlatformController_syncNavigation`  | 同一管理权限 + 原双提交/会话绑定 CSRF；无 Body/Query DTO；显式 `@HttpCode(OK)` | 200 `NavigationSyncSummary`，必须在审计持久化成功后响应 | [controller:282](../../apps/poms-api/src/app/features/platform/platform.controller.ts#L282)、[service:885](../../apps/poms-api/src/app/features/platform/platform.service.ts#L885)；只追加审计快照，不“同步”或修改导航表                 |

三操作无参数 DTO；未知 query、合法解析后的额外 body 不被 DTO 校验或消费，不能擅自添加严格空对象 schema。sync 当前调用方发送 `{}`，空 body 和其他可被原全局 parser 接受的 body 应先用旧 HTTP oracle 固定容忍边界。原 parser 对无效 JSON、charset、大小等限制仍先行；无 Body DTO 不等于跳过全局解析。Session→CSRF→Permission 顺序、401/403 与拒绝审计继续复用 R1C，不能只为新路径接一个返回 200 的 handler。

### 5.1 树字段与过滤顺序

[NavigationItemSchema](../../libs/shared/contracts/src/lib/shared-contracts.ts#L1645)共 13 字段：`id/key/type/title/subtitle/link/icon/displayOrder/isHidden/isDisabled/requiredPermissions/meta/children`。`title/subtitle/link/icon/requiredPermissions/meta/children` 按原契约保留显式 null；`meta` 允许任意键。`children=null` 与 `children=[]` 不能统一改写。`NavigationListDto` 为 [原 inline z.array schema](../../libs/api/contracts/src/lib/auth/user.dto.ts#L54)，不是新 Rust 私有 DTO。

`getNavigationForUser` 每层执行：先跳过 `isHidden`；`requiredPermissions=null` 即允许，其余使用 `every`（空数组也允许）；复制节点；仅当原 children 非空才递归，group/collapsable 的所有子项被过滤后才移除该容器，非容器 children 过滤空时改 null；最后每层按 `displayOrder` 稳定升序，同值保持原次序。原 children 已是空数组的节点不走上述“子项全被过滤”分支。`isDisabled=true` 仍返回并保留标志，不当成隐藏。

后端 `nav:*:view` 与业务 `*:read` 是不同权限。R1 fallback 使用现有 Router metadata 的 any/all；原 NavigationService 仅按树自身 requiredPermissions 做 AND，不能互相替换。Angular 对空导航仍可能触发现有 fallback；首片不修改前端菜单策略。`GET platform/navigation` 与 sync snapshot 使用未过滤、未排序的原 SSOT；它们不复用当前用户过滤后的树。

### 5.2 同步快照、request-id 与事务边界

[NavigationSyncSummarySchema](../../libs/shared/contracts/src/lib/shared-contracts.ts#L1749)为 `targetId='platform-navigation'`、`nodeCount/routeCount/hiddenCount/disabledCount`、64 字符 `treeChecksum`、`navigationKeys`、`routeLinks`。原树按前序遍历；非空字符串 link 进入 routeLinks，不 trim；重复 key/link 不去重。SHA-256 输入必须严格保持 `JSON.stringify({ navigationKeys, routeLinks, hiddenCount, disabledCount })` 的键序、数组次序和 UTF-8 内容；不对完整树或过滤后的树求 hash，不将 JSON 对象任意排序。

`syncNavigationAudit` 等待 RuntimeAuditService 写 `poms.audit_log`：eventType=`platform.navigation.synced`、targetType=`NavigationTree`、targetId=`platform-navigation`、operatorId=`req.user.sub`、result=`success`、afterSnapshot=完整 summary、metadata=`{source:'static-navigation-ssot'}`；reason/beforeSnapshot 缺省为 null，occurredAt 由原服务当前时间生成。数据库 ID、时间、null 与 JSONB 按原实体和真实 PG15 对照；没有导航持久化写入，没有来源证据支持给它增加导航版本或长期幂等缓存。

[getRequestId](../../apps/poms-api/src/app/core/runtime-audit/runtime-audit-request.utils.ts#L23)先 `x-request-id`、再 `x-correlation-id`，使用 nullish fallback；缺失为 null，空字符串保留，不 trim，数组取首项。不能以 Rust 请求日志的自动关联 ID 替换缺失值。原 audit request_id 长度上限 64；空、缺失、两头同时存在及过长值需在 HTTP/PG oracle 保留真实差异，而非先自定义截断。

当前写链是 `recordAuditLog → saveAll → persist(...).flush()`，sync 没有独立的显式跨业务事务。写失败不得返回成功 snapshot。ORM flush 可能同时处理该请求已 managed 的 session 脏字段；需要沿 R1C `pending_flush` / row_version 的真实证据检查其组合行为，不能仅由静态调用图宣称“只有一次无关 INSERT”或已有完整事务保证。G1 后用真实 Nest/MikroORM 与隔离 PG15 对照成功、失败/回滚、续期节流与审计字段；不新增 R2 业务命令代替这个 witness。

## 6. 首片验收输入建议

| 层次          | G1 应固定的验收与否定边界                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SSOT 导出     | 绑定原树、共享类型与 helper 源；机械单向导出全部字段/次序/null；未知表达式、未知 helper/权限或生成产物反向篡改失败；同时检查工作区、index 与 untracked，禁止仅检查最终工作树而漏 staged 抵消                             |
| 原实现 oracle | 执行真实原 NavigationService/DTO，不复制旧过滤算法；当前全树/空权限/37 权限全集及单权限、多权限 AND/未知权限对照。隐藏、disabled、同序值、空 children 等用受控单元树明确标注，不能伪称当前生产数据已自然覆盖             |
| HTTP/权限     | 三操作 200、缺会话 401、有效会话无管理权限 403；sync CSRF 失败先于权限；合法忽略 body/query 与 malformed body 原错误；未知 path/method 沿既有 404；operationId/security/recursive schemas 与完整 spec 对照，旧七操作回归 |
| PG15/审计     | 每次成功 sync 的真实 audit_log、actor/requestId/null/snapshot/hash；拒绝不产生成功审计；持久化失败不返回 200；同请求 session flush、row_version 与失败回滚按旧 HTTP/ORM 真对照，不靠 repository mock                     |
| 真实前端      | 原 AuthStore 登录/恢复加载 me/navigation，真实菜单过滤；平台导航页完整树、搜索、按钮调用真实 HttpClient POST、成功提示与再加载；viewer 拒绝、无权限空树与 fallback 作为原行为分别观察                                    |
| 范围排除      | todos/provider/profile 等尚未迁移请求继续按其实际结果记录，不把 catch 空或 R2 404 当成功，不用 mock 或造数据回包证明完整平台/业务通过                                                                                    |
| 集成与治理    | 固定 Rust/Node/完整 spec/client 输入；相应 Rust tests、fmt/clippy/build，生成来源 check、TypeScript 工具 lint；真实受控 PG15/双后端 HTTP 与选定 UI；非作者审查、准确证据/归档与 G4；不提前启动后续片                     |

前端来源：[AuthStore](../../libs/admin/data-access/src/lib/auth/auth.store.ts#L145)并发读取 profile/navigation/todos，navigation/todos 失败会 catch 为 []，因此 200 网络响应与菜单语义须独立断言；[NavigationGovernance](../../apps/poms-admin/src/app/features/platform/navigation-governance.ts#L184)读取完整树，`syncAudit` 用真实 HttpClient 发 `{}`，成功后重新加载。R1E 的原 bridge 不是新导航行为的替代证据。

## 7. 非 OpenAPI 交付不能漏项

- **R2E 业务编号**：[BusinessNumberService](../../apps/poms-api/src/app/features/business-number/business-number.service.ts)提供九种 scope，按 UTC 年份和 `business_number_sequence` upsert/RETURNING 分配；保留前缀、六位 pad、原 Number 转换、调用方可传事务 EM 的边界。它没有公开 controller，不能为“凑操作”新增 API。并发、失败/回滚、跨年和已有序列接续需真实 PG 验证，R3/R4 域调用随域验收。
- **R2L 审批摘要/handler**：[ApprovalSummaryService](../../apps/poms-api/src/app/features/approval-summary/approval-summary.service.ts)先校验 package/projection，再分别持久化 snapshot 与 field projections；不能从两个 save 的静态顺序推断原子性。公共 summary、todo 投影及 handler 注册要单列；合同/提成/结算处理器随 R3–R5 验证，未知/未注册分支不得伪造成功。
- **R2L 确认公共引擎**：[ConfirmationService](../../apps/poms-api/src/app/features/approval/confirmation.service.ts)拥有 `confirmation_record` / `confirmation_participant` / `todo` 的创建、参与人确认及取消事务，并提供进度查询；公共引擎明确归属 R2L，不增加 OpenAPI 操作。项目移交等真实域的发起、处理与进度消费随 R3–R5（包括 R4 移交查询）验收，不能以框架已迁移冒称所有域流程完成。
- **R2G/H/I/J adapters**：Feishu 身份/目录、OAuth grant/ticket、本地/OBS 对象存储、签名/过期/网络重试、预览/缩略图分别绑定原 adapter 与环境。mock adapter、离线签名样本和真实外部集成须分别报告；密文及日志不得泄露 token/secret/完整 URL。
- **请求内任务与初始化**：沿 [R0 非 HTTP 清单](rust-r0-environment-inventory.md#62-初始化到期检查请求内重试与调度)覆盖 session/票据/上传/下载包请求内到期及 OBS 请求内重试，不因看见 GET 就当只读，不自行增加周期清理 scheduler。平台 bootstrap 固定数据语义归 B–E，开发/E2E/试用 seed 与 R6 初始化接管分开；不能把自动 reset/seed 接入默认运行路径。部署主机 scheduler 与单实例职责仍留 R6，不以本次静态搜索证明环境不存在后台任务。

所有新库/role/marker/fixture 由主代理单独冻结和执行；保留 PG17 与既有 R1 库，不借本规划授予 SQL、外部写入、seed/reset 或部署操作。

## 8. 全部公共操作与待决附表

以下 108 行由机器清单互斥生成，运行路径保留 `/api` 以便与现行完整 spec 逐项核对；canonical inventory 才是无部署前缀的正式路径权威。权限、DTO/schema、source 行和 source hash 见 JSON，不能仅按前端实际调用筛选交付。

<!-- Generated operation and route-decision tables follow. -->

| TID      | Method | 当前运行路径                                                                  | operationId                                                                    |
| -------- | ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| RUST-R2A | GET    | `/api/me/navigation`                                                          | `NavigationController_getNavigation`                                           |
| RUST-R2A | GET    | `/api/platform/navigation`                                                    | `PlatformController_getAllNavigationItems`                                     |
| RUST-R2A | POST   | `/api/platform/navigation:sync`                                               | `PlatformController_syncNavigation`                                            |
| RUST-R2B | GET    | `/api/platform/permissions`                                                   | `PlatformController_listPermissions`                                           |
| RUST-R2B | GET    | `/api/platform/roles`                                                         | `PlatformController_listRoles`                                                 |
| RUST-R2B | POST   | `/api/platform/roles`                                                         | `PlatformController_createRole`                                                |
| RUST-R2B | GET    | `/api/platform/roles/{id}`                                                    | `PlatformController_getRole`                                                   |
| RUST-R2B | PATCH  | `/api/platform/roles/{id}`                                                    | `PlatformController_updateRole`                                                |
| RUST-R2B | POST   | `/api/platform/roles/{id}:activate`                                           | `PlatformController_activateRole`                                              |
| RUST-R2B | POST   | `/api/platform/roles/{id}:deactivate`                                         | `PlatformController_deactivateRole`                                            |
| RUST-R2B | PUT    | `/api/platform/roles/{id}/permissions`                                        | `PlatformController_assignRolePermissions`                                     |
| RUST-R2C | GET    | `/api/platform/org-unit-tree`                                                 | `PlatformController_listOrgUnitTree`                                           |
| RUST-R2C | GET    | `/api/platform/org-units`                                                     | `PlatformController_listOrgUnits`                                              |
| RUST-R2C | POST   | `/api/platform/org-units`                                                     | `PlatformController_createOrgUnit`                                             |
| RUST-R2C | GET    | `/api/platform/org-units/{id}`                                                | `PlatformController_getOrgUnit`                                                |
| RUST-R2C | PATCH  | `/api/platform/org-units/{id}`                                                | `PlatformController_updateOrgUnit`                                             |
| RUST-R2C | POST   | `/api/platform/org-units/{id}:activate`                                       | `PlatformController_activateOrgUnit`                                           |
| RUST-R2C | POST   | `/api/platform/org-units/{id}:deactivate`                                     | `PlatformController_deactivateOrgUnit`                                         |
| RUST-R2C | POST   | `/api/platform/org-units/{id}:move`                                           | `PlatformController_moveOrgUnit`                                               |
| RUST-R2D | GET    | `/api/auth/profile`                                                           | `AuthController_getProfile`                                                    |
| RUST-R2D | PATCH  | `/api/auth/profile`                                                           | `AuthController_updateProfile`                                                 |
| RUST-R2D | GET    | `/api/platform/owner-reference`                                               | `PlatformController_listOwnerReferenceData`                                    |
| RUST-R2D | GET    | `/api/platform/users`                                                         | `PlatformController_listUsers`                                                 |
| RUST-R2D | POST   | `/api/platform/users`                                                         | `PlatformController_createUser`                                                |
| RUST-R2D | GET    | `/api/platform/users/{id}`                                                    | `PlatformController_getUser`                                                   |
| RUST-R2D | PATCH  | `/api/platform/users/{id}`                                                    | `PlatformController_updateUser`                                                |
| RUST-R2D | POST   | `/api/platform/users/{id}:activate`                                           | `PlatformController_activateUser`                                              |
| RUST-R2D | POST   | `/api/platform/users/{id}:deactivate`                                         | `PlatformController_deactivateUser`                                            |
| RUST-R2D | PUT    | `/api/platform/users/{id}/org-memberships`                                    | `PlatformController_assignUserOrgMemberships`                                  |
| RUST-R2D | PUT    | `/api/platform/users/{id}/roles`                                              | `PlatformController_assignUserRoles`                                           |
| RUST-R2E | GET    | `/api/dictionaries`                                                           | `DictionaryController_list`                                                    |
| RUST-R2E | POST   | `/api/dictionaries`                                                           | `DictionaryController_create`                                                  |
| RUST-R2E | PATCH  | `/api/dictionaries/{id}`                                                      | `DictionaryController_update`                                                  |
| RUST-R2E | GET    | `/api/platform/system-settings`                                               | `SystemSettingController_listSystemSettings`                                   |
| RUST-R2E | GET    | `/api/platform/system-settings/{key}`                                         | `SystemSettingController_getSystemSetting`                                     |
| RUST-R2E | PATCH  | `/api/platform/system-settings/{key}`                                         | `SystemSettingController_updateSystemSetting`                                  |
| RUST-R2F | GET    | `/api/audit-logs`                                                             | `RuntimeAuditController_listAuditLogs`                                         |
| RUST-R2F | GET    | `/api/audit-logs/targets/{targetType}/{targetId}`                             | `RuntimeAuditController_listEntityAuditLogs`                                   |
| RUST-R2F | GET    | `/api/security-events`                                                        | `RuntimeAuditController_listSecurityEvents`                                    |
| RUST-R2F | POST   | `/api/security-events:recordRouteDenied`                                      | `RuntimeAuditController_recordRouteDeniedEvent`                                |
| RUST-R2G | POST   | `/api/auth/external-login-sessions`                                           | `AuthController_createExternalLoginSession`                                    |
| RUST-R2G | GET    | `/api/auth/identity-providers`                                                | `AuthController_listEnabledLoginProviders`                                     |
| RUST-R2G | GET    | `/api/auth/identity-providers:callback`                                       | `AuthController_handleExternalLoginCallback`                                   |
| RUST-R2G | GET    | `/api/auth/identity-providers/{id}:authorize`                                 | `AuthController_authorizeExternalLogin`                                        |
| RUST-R2G | POST   | `/api/platform/external-identities/{id}:unbind`                               | `ExternalIdentityController_unbindExternalIdentity`                            |
| RUST-R2G | GET    | `/api/platform/identity-provider-oauth-grants:callback`                       | `IdentityProviderOAuthGrantController_handleCurrentAdminProviderGrantCallback` |
| RUST-R2G | GET    | `/api/platform/identity-provider-oauth-grants/{identityProviderId}`           | `IdentityProviderOAuthGrantController_getCurrentAdminProviderGrant`            |
| RUST-R2G | GET    | `/api/platform/identity-provider-oauth-grants/{identityProviderId}:authorize` | `IdentityProviderOAuthGrantController_authorizeCurrentAdminProviderGrant`      |
| RUST-R2G | GET    | `/api/platform/identity-providers`                                            | `IdentityProviderController_listIdentityProviderConfigs`                       |
| RUST-R2G | POST   | `/api/platform/identity-providers`                                            | `IdentityProviderController_createIdentityProviderConfig`                      |
| RUST-R2G | GET    | `/api/platform/identity-providers/{id}`                                       | `IdentityProviderController_getIdentityProviderConfig`                         |
| RUST-R2G | PATCH  | `/api/platform/identity-providers/{id}`                                       | `IdentityProviderController_updateIdentityProviderConfig`                      |
| RUST-R2G | POST   | `/api/platform/identity-providers/{id}:testConnection`                        | `IdentityProviderController_testIdentityProviderConnection`                    |
| RUST-R2G | GET    | `/api/platform/identity-providers/{id}/external-users`                        | `IdentityProviderController_searchExternalUsers`                               |
| RUST-R2G | GET    | `/api/platform/users/{id}/external-identities`                                | `ExternalIdentityController_listUserExternalIdentities`                        |
| RUST-R2G | POST   | `/api/platform/users/{id}/external-identities`                                | `ExternalIdentityController_bindUserExternalIdentity`                          |
| RUST-R2H | POST   | `/api/platform/external-department-mappings/{id}:ignore`                      | `ExternalOrgSyncController_ignoreExternalDepartmentMapping`                    |
| RUST-R2H | POST   | `/api/platform/external-department-mappings/{id}:map`                         | `ExternalOrgSyncController_mapExternalDepartmentMapping`                       |
| RUST-R2H | POST   | `/api/platform/external-department-mappings/{id}:restore`                     | `ExternalOrgSyncController_restoreExternalDepartmentMapping`                   |
| RUST-R2H | POST   | `/api/platform/external-department-mappings/{id}:unmap`                       | `ExternalOrgSyncController_unmapExternalDepartmentMapping`                     |
| RUST-R2H | GET    | `/api/platform/external-org-sources`                                          | `ExternalOrgSyncController_listExternalOrgSources`                             |
| RUST-R2H | POST   | `/api/platform/external-org-sources`                                          | `ExternalOrgSyncController_createExternalOrgSource`                            |
| RUST-R2H | GET    | `/api/platform/external-org-sources/{id}`                                     | `ExternalOrgSyncController_getExternalOrgSource`                               |
| RUST-R2H | PATCH  | `/api/platform/external-org-sources/{id}`                                     | `ExternalOrgSyncController_updateExternalOrgSource`                            |
| RUST-R2H | POST   | `/api/platform/external-org-sources/{id}:activate`                            | `ExternalOrgSyncController_activateExternalOrgSource`                          |
| RUST-R2H | POST   | `/api/platform/external-org-sources/{id}:archive`                             | `ExternalOrgSyncController_archiveExternalOrgSource`                           |
| RUST-R2H | POST   | `/api/platform/external-org-sources/{id}:pause`                               | `ExternalOrgSyncController_pauseExternalOrgSource`                             |
| RUST-R2H | GET    | `/api/platform/external-org-sources/{sourceId}/department-mappings`           | `ExternalOrgSyncController_listExternalDepartmentMappings`                     |
| RUST-R2H | PUT    | `/api/platform/external-org-sources/{sourceId}/department-mappings`           | `ExternalOrgSyncController_replaceExternalDepartmentMappings`                  |
| RUST-R2H | GET    | `/api/platform/external-org-sources/{sourceId}/org-sync-runs`                 | `ExternalOrgSyncController_listOrgSyncRuns`                                    |
| RUST-R2H | POST   | `/api/platform/external-org-sources/{sourceId}/org-sync-runs`                 | `ExternalOrgSyncController_createOrgSyncRun`                                   |
| RUST-R2H | GET    | `/api/platform/org-sync-runs/{id}`                                            | `ExternalOrgSyncController_getOrgSyncRun`                                      |
| RUST-R2H | POST   | `/api/platform/org-sync-runs/{id}:apply`                                      | `ExternalOrgSyncController_applyOrgSyncRun`                                    |
| RUST-R2H | GET    | `/api/platform/org-sync-runs/{id}/diff-items`                                 | `ExternalOrgSyncController_listOrgSyncDiffItems`                               |
| RUST-R2I | GET    | `/api/platform/attachment-storage-providers`                                  | `AttachmentStorageProviderController_listAttachmentStorageProviderConfigs`     |
| RUST-R2I | POST   | `/api/platform/attachment-storage-providers`                                  | `AttachmentStorageProviderController_createAttachmentStorageProviderConfig`    |
| RUST-R2I | GET    | `/api/platform/attachment-storage-providers/{id}`                             | `AttachmentStorageProviderController_getAttachmentStorageProviderConfig`       |
| RUST-R2I | PATCH  | `/api/platform/attachment-storage-providers/{id}`                             | `AttachmentStorageProviderController_updateAttachmentStorageProviderConfig`    |
| RUST-R2I | POST   | `/api/platform/attachment-storage-providers/{id}:set-default`                 | `AttachmentStorageProviderController_setDefaultAttachmentStorageProvider`      |
| RUST-R2I | POST   | `/api/platform/attachment-storage-providers/{id}:testConnection`              | `AttachmentStorageProviderController_testAttachmentStorageProviderConnection`  |
| RUST-R2J | GET    | `/api/attachment-center-records`                                              | `AttachmentCenterRecordController_list`                                        |
| RUST-R2J | POST   | `/api/attachment-upload-sessions`                                             | `AttachmentUploadSessionController_create`                                     |
| RUST-R2J | GET    | `/api/attachment-upload-sessions/{id}`                                        | `AttachmentUploadSessionController_get`                                        |
| RUST-R2J | POST   | `/api/attachment-upload-sessions/{id}:abort`                                  | `AttachmentUploadSessionController_abort`                                      |
| RUST-R2J | POST   | `/api/attachment-upload-sessions/{id}:complete`                               | `AttachmentUploadSessionController_complete`                                   |
| RUST-R2J | PUT    | `/api/attachment-upload-sessions/{id}/object`                                 | `AttachmentUploadSessionController_proxyUploadObject`                          |
| RUST-R2J | POST   | `/api/attachment-upload-sessions/{id}/upload-targets`                         | `AttachmentUploadSessionController_createUploadTarget`                         |
| RUST-R2J | GET    | `/api/attachments`                                                            | `AttachmentController_list`                                                    |
| RUST-R2J | GET    | `/api/attachments/{id}`                                                       | `AttachmentController_get`                                                     |
| RUST-R2J | PATCH  | `/api/attachments/{id}`                                                       | `AttachmentController_update`                                                  |
| RUST-R2J | POST   | `/api/attachments/{id}:clear-final`                                           | `AttachmentController_clearFinal`                                              |
| RUST-R2J | POST   | `/api/attachments/{id}:mark-final`                                            | `AttachmentController_markFinal`                                               |
| RUST-R2J | POST   | `/api/attachments/{id}:void`                                                  | `AttachmentController_void`                                                    |
| RUST-R2J | GET    | `/api/attachments/{id}/download`                                              | `AttachmentController_download`                                                |
| RUST-R2J | POST   | `/api/attachments/{id}/links`                                                 | `AttachmentController_link`                                                    |
| RUST-R2J | DELETE | `/api/attachments/{id}/links/{linkId}`                                        | `AttachmentController_unlink`                                                  |
| RUST-R2J | GET    | `/api/attachments/{id}/preview`                                               | `AttachmentController_preview`                                                 |
| RUST-R2J | GET    | `/api/attachments/{id}/thumbnail`                                             | `AttachmentController_thumbnail`                                               |
| RUST-R2J | GET    | `/api/attachments/{id}/versions`                                              | `AttachmentController_versions`                                                |
| RUST-R2K | GET    | `/api/attachment-download-packages/{packageId}`                               | `AttachmentHandoverController_getDownloadPackage`                              |
| RUST-R2K | GET    | `/api/attachment-download-packages/{packageId}/download`                      | `AttachmentHandoverController_downloadPackage`                                 |
| RUST-R2K | GET    | `/api/project-handovers/{handoverId}/attachment-checklist`                    | `AttachmentHandoverController_getChecklist`                                    |
| RUST-R2K | POST   | `/api/project-handovers/{handoverId}/attachment-checklist:refresh`            | `AttachmentHandoverController_refreshChecklist`                                |
| RUST-R2K | POST   | `/api/project-handovers/{handoverId}/attachment-download-packages`            | `AttachmentHandoverController_createDownloadPackage`                           |
| RUST-R2L | GET    | `/api/approval-records/{id}`                                                  | `ApprovalController_getApprovalRecord`                                         |
| RUST-R2L | POST   | `/api/approval-records/{id}:approve`                                          | `ApprovalController_approveRecord`                                             |
| RUST-R2L | POST   | `/api/approval-records/{id}:reject`                                           | `ApprovalController_rejectRecord`                                              |
| RUST-R2L | GET    | `/api/me/todos`                                                               | `ApprovalController_getMyTodos`                                                |

### 九项未决/参数差异

| 阶段 / 对应片 | Method | 当前路径                                                           | Canonical                                                   | 状态 / gate                                       |
| ------------- | ------ | ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------- |
| R2 / RUST-R2K | GET    | `/api/attachment-download-packages/{packageId}`                    | `GET /attachment-download-packages/{id}`                    | parameter-name-difference；#61，对应域 G1 前裁决  |
| R2 / RUST-R2K | GET    | `/api/attachment-download-packages/{packageId}/download`           | `GET /attachment-download-packages/{id}/download`           | parameter-name-difference；#61，对应域 G1 前裁决  |
| R4            | GET    | `/api/contracts/no/{contractNo}`                                   | `N/A: canonical decision pending`                           | canonical-decision-pending；#61，对应域 G1 前裁决 |
| R4            | GET    | `/api/project-handovers/{handoverId}`                              | `GET /project-handovers/{id}`                               | parameter-name-difference；#61，对应域 G1 前裁决  |
| R4            | POST   | `/api/project-handovers/{handoverId}:confirm`                      | `POST /project-handovers/{id}:confirm`                      | parameter-name-difference；#61，对应域 G1 前裁决  |
| R2 / RUST-R2K | GET    | `/api/project-handovers/{handoverId}/attachment-checklist`         | `GET /project-handovers/{id}/attachment-checklist`          | parameter-name-difference；#61，对应域 G1 前裁决  |
| R2 / RUST-R2K | POST   | `/api/project-handovers/{handoverId}/attachment-checklist:refresh` | `POST /project-handovers/{id}/attachment-checklist:refresh` | parameter-name-difference；#61，对应域 G1 前裁决  |
| R2 / RUST-R2K | POST   | `/api/project-handovers/{handoverId}/attachment-download-packages` | `POST /project-handovers/{id}/attachment-download-packages` | parameter-name-difference；#61，对应域 G1 前裁决  |
| R3            | GET    | `/api/projects/code/{projectNo}`                                   | `N/A: canonical decision pending`                           | canonical-decision-pending；#61，对应域 G1 前裁决 |


R2A 实现 `2924bf30c1a0751df129d2137b6667628d1fdf4a` 已合入 main 并推送；合入后21项适配器检查与单向导航来源检查通过，98当前源码/82权威来源指纹一致。四组合12浏览器、26run零残留和schema失败分类见[收口记录](archive/slices/rust-r2a-closeout.md)及[机器验收](rust-r2a-validation.json)。G4随本归档提交推送及Issue同步生效；仅#68完成，R2父#67与总体#57保持Open，B–M保持Todo，#61待决路线不变，PG17保留。

### 2026-10-27 RUST-R2B G4收口

R2B实现`31555b76d1d9a453aef44172211e4b35e30df573`已合入main并推送，集成后22项适配器、角色/导航单向导出与OpenAPI检查通过，157份来源指纹一致。八操作的真实HTTP179/并发6/系统22、四组合基础认证52和原页面12通过；C独立G3未关闭P1/P2为0，51个run最终二次清理0/0。具体旧候选、schema失败分类与保留边界见[归档收口](archive/slices/rust-r2b-closeout.md)、[纠偏](archive/slices/rust-r2b-corrective-checkpoint.md)及[机器验收](rust-r2b-validation.json)。G4随本归档提交推送及Issue同步生效；仅#69完成，父#67/#57保持Open，C–M为Todo，#61不变。R2A/B累计交付11个R2操作，其余97及阶段验收未交付，PG17与旧环境/证据保留。上方G1与R2A段落是当时记录，不代表当前R2B状态。

### 2026-10-27 RUST-R2C G1冻结

R2C #70按[组织基线](archive/slices/rust-r2c-org-units-baseline.md)于2026-10-27T13:04:40.627Z冻结，来源HEAD `705973835d4c823ae8aa3988976e8d6a13b31dfe`；A/B输入与C非作者独立审查Pass，未关闭P1/P2为0，[G1评论](https://github.com/illusion-tech/poms/issues/70#issuecomment-6442616855)。范围为八个现有组织操作，进入Doing；真实Nest SQL先见证对应flush/CAS，再完成PG/HTTP/并发及原页面四组合验证、G3和G4。使用新受控PG15副本，PG17与旧环境/证据保留。R2A/B累计交付11操作，其余97与阶段验收仍未交付；#67/#57保持Open，D–M Todo，#61不变。上方历史C–M状态以本条更新。

### 2026-10-28 RUST-R2C G4收口

R2C实现`319d5d89977704b9924fc7a401957d46f5d42668`已合入main并推送，集成后24项适配器0skip、导航/角色/组织来源与排序/OpenAPI共7步通过，152份来源前后与验收版本一致。八操作实际双端HTTP各354/并发各6、四组合基础认证52与原页面12、另行PG7通过；C独立G3未关闭P1/P2为0，52run最终连续两次清理0/0。旧失败、有限Unicode、UI许可提示与schema检查失败分类见[归档收口](archive/slices/rust-r2c-closeout.md)、[纠偏](archive/slices/rust-r2c-corrective-checkpoint.md)及[机器验收](rust-r2c-validation.json)。G4随本归档提交推送及Issue同步生效；仅#70完成，父#67/#57保持Open，D–M Todo，#61不变。R2A/B/C累计交付19个R2操作，剩余89操作与R2M阶段验收未交付，PG17与旧环境/数据保留。上方历史G1/G3和R2A/B段落保留当时状态，以本条为当前进度。
