# RUST-R2A 导航权限树与同步审计实施基线

- Gate Status: `G1 Pass`；A/B/C 非作者分项复核通过，主代理冻结后进入 Doing
- Parent: [R2 #67](https://github.com/illusion-tech/poms/issues/67)；Slice: [R2A #68](https://github.com/illusion-tech/poms/issues/68)
- Owner: 主代理统筹；A 导航与单向导出；B 审计事务与隔离环境；C 独立审查；主代理路由集成、浏览器与最终验收
- Slice Type: `cross-layer-high-risk`（认证授权、真实审计写入与原 Angular 集成；不修改产品 DDL）
- G1 Reviewer / Date: A（来源/路由）、B（审计/数据）、C（独立范围/隔离）；主代理收口 / 2026-10-26T06:34:30.621Z
- 起点: `19f837c9e33fe9cdeb7ca94f3c932c9621cb91d3`；独立 managed worktree，`codex/poms-r2a-navigation`，沿用 solo worktree checkpoint
- Tracker: [Rust 执行追踪](../../rust-migration-execution-tracker.md) 的 `RUST-R2A`；阶段范围见 [R2 范围与依赖](../../rust-r2-scope-and-dependencies.md)

## 1. 范围与下游边界

交付现有三个操作：当前用户可见导航树、平台完整导航树、记录静态导航事实源的同步审计。Rust 继续消费 TypeScript 的唯一导航定义；权限、字段、排序、checksum 与 Nest 的真实行为一致。原 Angular 导航治理页能读取并记录同步审计。

不做导航在线编辑、角色/用户/组织写入、profile、todo/审批、审计查询 API、外部身份/组织同步、附件/存储、业务域、产品 migration/依赖升级、完整 OpenAPI/client 生成权接管、部署或性能宣称。同步只新增审计记录，不写导航配置，不以空待办或伪造 provider 成功响应掩盖后续 R2 未实现路由。

首片完成只允许 `R2A = Done`，R2 #67 与总体 #57 保持打开。#61 的五个 R2 附件参数名差异在附件切片 G1 前裁决；两个业务号 lookup 和两个移交参数名差异分别由 R3/R4 处理，本片不改这些路径或 canonical 行。

## 2. 正式输入与来源

所有现行实现输入绑定上述 Git 起点；R2 机器操作映射另绑定完整 spec、canonical 与 R0 operations 的规范化 SHA。原 Nest、完整规范、生成客户端、共享契约和 NAVIGATION_TREE 均保留编辑权及原内容。

| 输入            | 权威来源                                                                                                                                                                               | 本片消费范围                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 阶段/路由       | [迁移计划](../../backend-rust-migration-plan.md)第6/7/9节、[canonical inventory](../../api-route-canonical-inventory.md)、[R0F 路由](rust-r0f-route-baseline.md)、ADR-015/018          | 三个既有 operation，均 aligned；不新增业务 URI                       |
| 导航语义        | `apps/poms-api/src/app/features/navigation/navigation.constants.ts`、`navigation.service.ts`、`navigation.controller.ts`                                                               | TypeScript NAVIGATION_TREE、AND过滤、稳定排序、原序全树与快照算法    |
| 管理/审计命令   | `apps/poms-api/src/app/features/platform/platform.controller.ts` / `platform.service.ts::syncNavigationAudit`                                                                          | 权限、200、无 Body DTO、审计字段和请求标识                           |
| 契约            | `libs/shared/contracts/src/lib/shared-contracts.ts` 的 NavigationItem / NavigationSyncSummary；`libs/api/contracts/src/lib/auth/user.dto.ts`；完整 `libs/shared/api-spec/openapi.json` | 所有字段、null、类型、operationId、安全定义及递归 schema             |
| 审计持久化      | `apps/poms-api/src/app/core/runtime-audit/` 的 audit-log.entity.ts / runtime-audit.service.ts / runtime-audit.repository.ts / runtime-audit-request.utils.ts                           | poms.audit_log，原 persist+flush 与同请求 session 行为               |
| 产品 DDL        | `apps/poms-api/src/migrations/Migration20260328120000_init_runtime_audit_and_security_event.ts`、现行 auth_session 迁移/实体                                                           | 12列审计结构、真实 session optimistic flush；沿用原 migration        |
| Rust 已交付基础 | `apps/poms-api-rust/src/auth/{http,guards,service,store,audit,model}.rs`、[R1C 基线](rust-r1c-auth-session-baseline.md)、[R1E 基线](rust-r1e-stage-acceptance-baseline.md)             | 已有守卫顺序、解析、请求上下文、SQLx、pending SessionFlush、最小审计 |
| 原客户端        | `apps/poms-admin/src/app/features/platform/navigation-governance.ts`、`libs/admin/data-access/src/lib/auth/auth.store.ts`                                                              | 原导航加载、管理页刷新/过滤/同步；前端 fallback 不替代服务端导航合同 |

## 3. SSOT 与类型

| Concern       | 唯一来源与实现规则                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 导航事实      | NAVIGATION_TREE 单向机械导出为 Rust 消费产物；导出器必须校验来源、枚举引用、字段与完整树，不手工维护第二套菜单              |
| 共享权限/类型 | 现有 TypeScript 与 R1B 生成值；未知持久化权限可保留但不增加导航权限，不改现有枚举                                           |
| 标识          | `NavigationItem.id/key` 与 `platform-navigation` 为字符串；审计 id/operator_id 为 UUID；不把 nav-* 或 target_id 强制转 UUID |
| null/字段     | 每个节点保留全部13字段及 null；children 的 null 与 []按原算法区别，meta为对象或null，disabled仍返回                         |
| 顺序          | 当前用户树每层按 displayOrder 数值稳定排序，相等时保留原序；完整树和快照使用原始定义的前序，不自行重排                      |
| 时间          | 审计 occurred_at 为原 JS Date 毫秒精度 timestamptz，应用侧当前时间；session规则沿用已验收 R1，不另造时区规则                |
| 金额/状态机   | 金额 N/A；本片没有新增业务状态机，sync无幂等键/版本参数，每次成功调用新增一条审计                                           |

导航过滤逐节点执行：先排除 isHidden；requiredPermissions 为 null 或全部 every 满足才保留；isDisabled 不构成过滤；仅对原 children 非空时递归。group/collapsable 的非空子集被全部过滤时删除容器；其他类型此时 children=null；原 children=[] 保持[]。这与 Angular R1E fallback 的路由权限算法不是同一输入，不相互替代。

快照 flatten 包含完整树的隐藏/禁用节点。checksum 严格为 SHA-256(JSON.stringify({ navigationKeys, routeLinks, hiddenCount, disabledCount }))，对象键次序如此，routeLinks 只纳入非空字符串；不对全树或用户裁剪结果求 hash。Rust 必须保留这项序列化顺序，并用实际 Node 原方法及合成边界树验证。

## 4. 接口与鉴权

| Runtime method/path                  | operationId                                | 输入/响应                                                             | Guard / 副作用                                                        |
| ------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/me/navigation`             | `NavigationController_getNavigation`       | 无path/query/body DTO；200 NavigationList                             | Authenticated；按当前用户权限过滤；可触发认证raw touch，不写业务审计  |
| `GET /api/platform/navigation`       | `PlatformController_getAllNavigationItems` | 无DTO；200 NavigationList，完整原序                                   | `platform:navigation:manage`；可触发认证raw touch，不写业务审计       |
| `POST /api/platform/navigation:sync` | `PlatformController_syncNavigation`        | 无Body/Query DTO，无required JSON body；显式200 NavigationSyncSummary | 同一manage权限，加double-submit和session-bound CSRF；每次新增同步审计 |

对应 canonical 省略 `/api`，分别是 inventory 的 getCurrentUserNavigation / getAllNavigationItems / syncNavigation 三行（起点行521/524/222），均 aligned，无参数名差异。Rust 增加这三项已冻结能力；保留既有七操作。运行 OpenAPI 合并后总共10操作，新增三项及其可达 schema 从完整原规范机械导出；完整规范/client 不变。

复用现有认证→CSRF→权限顺序、权限失败安全事件、默认拒绝与实际错误体。本片三个受保护操作的失效401按原SessionAuthGuard保留Cookie，不新增Set-Cookie/clear；既有Public认证controller端点仍分别按各自合同清Cookie，不能混用。sync不能新加strict `{}`、业务body校验或新CSRF例外；合法被解析的额外body按原方法忽略，畸形/超限body由原全局parser处理。错误路径/错误method保留真实404，不开测试HTTP路由。

请求标识按原 `getRequestId`：x-request-id存在时使用该值（含空字符串），仅null/undefined时回落x-correlation-id；不trim，不用服务器新生成的响应request id替代。原生重复header合并、缺省/空/过长值须由真实HTTP/DB对照验证。

## 5. 持久化与事务边界

无产品 DDL/索引/实体变更，无Rust迁移器。新专用 PG15 两副本运行原 migrations/显式 seed；schema check只对隔离副本执行。

| poms.audit_log字段                          | 现行DDL与本片写入                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| id                                          | UUID，gen_random_uuid默认；每次成功调用独立记录                                            |
| event_type / target_type / target_id        | varchar128/64/128；`platform.navigation.synced` / `NavigationTree` / `platform-navigation` |
| operator_id / request_id                    | nullable UUID / varchar64；当前已认证用户及原请求头选择规则                                |
| result / reason                             | varchar32=`success` / nullable text=null                                                   |
| before_snapshot / after_snapshot / metadata | nullable jsonb；null / 完整summary / `{source:'static-navigation-ssot'}`                   |
| occurred_at                                 | timestamptz，应用毫秒时间；表无row_version/updated_at，共12列                              |

原 Nest `RuntimeAuditRepository.saveAll` 在同一请求 EntityManager 中 persist+flush，会一并写入已被认证raw touch变脏的 managed AuthSession。Rust已把这项待flush状态封装为请求局部 `ResolvedSession.pending_flush`；本片新增业务审计的对应方法，不能只调用独立INSERT的旧 `record_audit_log`。

本片固定的事务语义：认证raw touch已在先前语句中提交；后续业务audit INSERT与需要的managed session CAS UPDATE在同一个显式事务中，INSERT先、UPDATE后，失败共同回滚这次flush，不能把先前raw touch宣称回滚。无pending时仅插入audit。两个GET不新增flush。失败后返回原错误协议，不能成功响应而丢失审计。

在实现/接受该新方法前，先用真实 Nest + 新PG15 捕捉 non-due / due sync 的session行版本和audit；过长requestId触发真实22001，另以受控并发/SQLx事务测试锁定late CAS失败后的audit回滚。记录原语句与行变化，不预设所有请求固定+1版本。任何与冻结输入的实质差异进入纠偏记录后复验。

## 6. 隔离与文件所有权

- Windows 主仓保持干净；实现位于本 managed worktree，Rust构建运行在新的 Linux checkout `/home/wangzishi/projects/poms-rust-r2a`。保留旧R0/R1 checkout、日志、数据库和缓存。
- 只使用原隔离PG15.12容器/15432，新增 `poms_r2a_nest` / `poms_r2a_rust`、独立低权 `poms_r2a_app`、独立secret、`r2a_control.marker` 与 `~/.local/share/poms-r2a/private`。marker固定为 `178684c0-41b5-4ed7-bdbb-3386b39e0e61`；库名/owner/version/port/GUC/marker/低权角色均校验后才写入，不接受任意URL/SQL/库名。
- PG17仅保存前后服务元数据；不连接其SQL、不seed/reset/migrate/停止。TEST/PROD无操作。外部API、provider和存储调用不启用。
- 运行角色必须验证所有高权标志为false（含replication）、角色成员数0、无database/schema CREATE；owner只用于新副本显式建库/原migration/seed与只读身份marker检查，HTTP与fixture产品行写入使用低权角色。
- 测试账号/角色、会话、审计与安全事件按run UUID及限定名称/请求标识记录；cleanup只清本run，禁止全库清空。失败/中断也保留可恢复journal，最终验证零残留。用于注入失败的锁/触发器必须限定新副本且显式移除并复核。
- A独占 `src/navigation/` 及 `tools/rust-r2a/export-navigation*`、navigation数据/metadata/golden；B独占auth/service新增审计方法、对应真实DB测试、R2A environment/fixture；主代理独占lib/http路由与metadata集成、browser spec/config、基线/tracker/report；C不写产品实现，独立审查并执行只读/隔离验收。
- 导出器来源检查绑定起点中 navigation constants/service、其实际传递 imports/helper、NavigationItem/NavigationSyncSummary 契约、完整spec与canonical的规范化UTF8 SHA；同时检查工作树/暂存区和相关未跟踪来源，不只检查HEAD。规范化仅CRLF→LF。`--check`只比较、不更新产物或golden；原TS方法在隔离的受控执行器中求预期，合成树只在该进程内替换输入，不改产品源码。新增导出器自身与测试脚本在最终运行前另冻结，历史R1B生成器保持原样。
- 不修改 Cargo.toml/lock/toolchain、原TypeScript产品、完整spec/client、R1共享生成器与历史证据。确需扩大必须先记录原因与纠偏边界。

## 7. 必需验证

| 层次        | 本片验收要求                                                                                                                                                                     | 初始状态 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 来源/导出   | 真实原TS方法的固定输入输出；全权限、零权限、AND、多层空容器、hidden/disabled、null/[]、稳定同序；精确checksum；来源/生成物变更拒绝；完整108操作恰好归属一个切片                  | Pending  |
| Rust        | 固定Rust1.99.1 fmt/clippy/locked-offline test/release；原普通测试回归；新增导航/审计边界测试，ignored不计通过                                                                    | Pending  |
| 真实HTTP/PG | 同一场景Nest/Rust，三操作成功/401/403/CSRF/失效（无新增Set-Cookie）/重复同步/请求头/错误method/body；DB校验audit全部字段、raw touch/flush、22001和late CAS失败边界；零残留       | Pending  |
| 原Angular   | Linux Nest/Rust、Windows Nest/external Rust，真实登录→服务端菜单→原导航治理页读取/搜索/刷新/同步成功→审计DB核验；低权限无治理入口/403、AND菜单剪裁；无route mock；桌面与窄屏审看 | Pending  |
| R1回归      | 同一foundation场景四OS/backend组合；本片改动涉及的既有Rust认证/DB守卫回归。历史R1A–E结果与本轮实跑分列，不伪称全部重跑                                                           | Pending  |
| 静态/契约   | 受影响lint/typecheck、原Nest构建/导航相关单测、原Angular构建；10操作subset验证与完整spec/client集合指纹不变；R1B来源check                                                        | Pending  |
| 数据结构    | 新库原migration状态、审计12列/索引和相关session字段catalog、现有schema检查；任何既有差异分类，不转嫁给PG17                                                                       | Pending  |
| 治理        | Markdown格式、git diff、本地链接、源码/日志哈希与原始计数、非作者G3；实现推送后集成检查，再G4归档首片并保持R2父任务未完成                                                        | Pending  |

浏览器验收按操作层次区分真实UI、HTTP请求、DB事实和测试辅助；不把导航成功扩称todo、provider或链接目标业务已迁移。Windows external Rust由独立Linux owner管理，测试退出后确认其存活，再由owner停止。所有浏览器失败/条件跳过如实保存，不扩大成功计数。

## 8. 一致性、风险与例外

当前无新增产品契约/DDL差异，三行canonical已冻结。重点风险是排序与null误改、checksum键序、导航事实源复制漂移、GET认证副作用遗漏、audit与session flush错误事务化、请求头过长的失败语义和误将未迁移业务标成功。以上均有明确验证项，不以mock或作者自评替代。

已知限制沿用：PrimeUI许可提示可能覆盖窄屏局部；原治理页提示文字仍属Nest现状；待办/provider等后续路由在Rust可能返回404。它们不属于本片已修复内容，不抹除截图/错误记录。

例外：当前无绕过G1/G3/真实PG/独立审查的例外。N/A：金额、产品schema变更、外部服务真实调用、部署和性能基准。历史验证仅引用原记录，不据旧head声称新head通过。

## 9. G1 结论

G1 Pass。A/B/C 在产品源码和新数据库操作前完成来源/范围、审计事务和隔离边界复核，主代理于 2026-10-26T06:34:30.621Z 冻结；在线 #68 G1 评论记录同一边界。只允许 R2A 三操作及必要验证工具开工；B–M 仍为 Todo / G1 未冻结，任何公共 route/DTO/DDL 或业务语义扩大先纠偏。G3/G4 尚未通过。


## 10. 最终归档指向

以上为G1冻结时点的输入与Pending记录，保持原阶段语义；后续实际G3/G4结论见[收口记录](rust-r2a-closeout.md)。实现`2924bf30c1a0751df129d2137b6667628d1fdf4a`已集成推送，归档及Issue同步后仅R2A Done，父R2继续Doing。
