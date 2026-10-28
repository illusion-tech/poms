# RUST-R2E＋R2F 公共基础与审计联合实施基线

- Gate：G1 Pass；冻结于 2026-10-28T03:19:33.981Z。非作者 C 审查 Pass，未关闭 P1/P2 为 0；原候选与来源由 `tmp/rust-r2ef/g1-freeze.json` 保全。
- 子片：R2E [#72](https://github.com/illusion-tech/poms/issues/72)、R2F [#73](https://github.com/illusion-tech/poms/issues/73)；父 [#67](https://github.com/illusion-tech/poms/issues/67) / [#57](https://github.com/illusion-tech/poms/issues/57)。
- 类型：`cross-layer-high-risk`；来源 main `7a343c543fe0031d7d6b42c1f7e18a7e861c72b7`；独立 worktree `codex/poms-r2ef-foundation-audit`，沿用 solo checkpoint。
- 授权：2026-10-28 用户要求更新联合批次计划，冻结 G1、并行实现、统一验证与独审，通过后提交推送并完成 G4；公共回归与证据保全集中处理，PG17 实例和数据保留。
- 分工：E 实现字典/设置/编号；F 实现审计读取/路由拒绝事件；C 不参与产品和验收工具编写，负责联合 G1/G3 独审；主代理负责公共接线、环境、fixture、实际统一验收、集成与 G4。
- 模型记录：历史主代理目标 Astra/Ultra 由应用控制，本轮实际运行时报告 `gpt-6.1-sol`，不声称已切换 Astra；三个子代理均显式 `gpt-6.1-sol` / `max`，Fast 未核实。按现有四代理并发上限执行。

## 1. 范围、正式输入与单向权威

本批只迁移既有 10 个 HTTP 操作及 E 的业务编号内部机制。R2 当前已交付 30/108；本批实际 G4 后方可记 40/108，剩余 68 操作与 R2M 验收。G/H 与 I/J 的后续分组只更新排期，本轮不实施；K 的 #61 路由裁决与 R4 事实、L 的 R3–R5 handler、完整 R2M 仍待完成。

正式输入为[迁移计划](backend-rust-migration-plan.md)、[R2 范围与依赖](rust-r2-scope-and-dependencies.md)、[108 操作归属](rust-r2-operation-slices.json)、[canonical inventory](api-route-canonical-inventory.md)、[R0 operations](rust-r0-api-operations.json)、完整 TypeScript DTO/Zod/OpenAPI 与现行 Nest controller/service/repository/entity。G0 在线正文与评论保存在 `tmp/rust-r2ef/g0-online-issues.json`，正式输入清单与原字节哈希随 G1 回执冻结。

TypeScript 继续单向拥有共享枚举、DTO、设置定义和业务编号规范；机械导出 neutral JSON 后供 Rust 使用。完整 OpenAPI 与 579 客户端文件、92 份历史产品 migration 均受来源保护。本批不改 TS 产品语义、公开路径、产品 DDL、依赖栈、正式环境或写入归属；无性能结论。

## 2. 路由、DTO、权限与响应

以下运行路径保留 `/api`，canonical 已登记且 aligned，#61 的五项附件参数差异不涉及本批；不得擅加别名或改变参数名。

| 子片 | Method / path                                         | 权限                                                                                                             | 原输出边界              |
| ---- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------- |
| E    | GET `/api/dictionaries`                               | `lead:read` / `customer:read` / `project:read` / `contract:finance:manage` / `platform:dictionaries:manage` 任一 | DictionaryItemList，200 |
| E    | POST `/api/dictionaries`                              | `platform:dictionaries:manage`                                                                                   | DictionaryItem，201     |
| E    | PATCH `/api/dictionaries/{id}`                        | 同上                                                                                                             | DictionaryItem，200     |
| E    | GET `/api/platform/system-settings`                   | `platform:system-settings:manage`                                                                                | SystemSettingList，200  |
| E    | GET `/api/platform/system-settings/{key}`             | 同上                                                                                                             | SystemSetting，200      |
| E    | PATCH `/api/platform/system-settings/{key}`           | 同上                                                                                                             | SystemSetting，200      |
| F    | GET `/api/audit-logs`                                 | `platform:users:manage`                                                                                          | AuditLogList，200       |
| F    | GET `/api/audit-logs/targets/{targetType}/{targetId}` | controller 先 `customer:read` / `lead:read` / `project:read` 任一，service 再按 targetType 授权                  | AuditLogList，200       |
| F    | GET `/api/security-events`                            | `platform:users:manage`                                                                                          | SecurityEventList，200  |
| F    | POST `/api/security-events:recordRouteDenied`         | authenticated；沿用 CSRF                                                                                         | 202，空响应体           |

沿用全局 body parser、session→CSRF→permission guards→Zod DTO→service 的现行错误顺序。DTO 的 strict/strip、coerce、missing/null、trim/长度、UUID 与 JS number/string 行为按原 schema oracle；非法输入和 Unicode 只对实际语料作结论。HEAD 对应真实 GET，OPTIONS 沿用 CORS，不增加 OpenAPI 操作。新增 Rust 后候选累计 47 个操作，不覆盖完整规范。

直接 DTO 来源为 `libs/api/contracts/src/lib/dictionary/dictionary.dto.ts`、`system-setting/system-setting.dto.ts`、`runtime-audit/runtime-audit.dto.ts` 与 `libs/shared/contracts/src/lib/shared-contracts.ts`；业务来源为对应 controller/service/repository/entity、system-setting.registry.ts、business-number.service.ts 与 runtime-audit-request.utils.ts。原实体和 92 migrations 冻结列名/类型/约束，日期输出遵从 JS ISO 毫秒，字符串长度遵从 JS UTF-16。

## 3. E：字典、设置与编号

字典 4 domain：attachment-category、sales-follow-up-type、expense-category、lead-source。唯一性为 domain/code；列表保留 PG domain ASC、sort_order ASC、code ASC 和原 keyword trim/ILIKE 通配语义。`usageCount` 实际读取 attachment.category、sales_follow_up_record.follow_up_type、expense_record.expense_category、lead.source_code，全状态计数；不伪造业务表或硬编码零，不新增字典审计。

字典 create/PATCH 保留可选字段、null、默认 sortOrder、isSystem 和版本行为。service 显式 expectedVersion 冲突 409 与 ORM 内部 CAS 失败的真实异常分开；无变化时 dirty/rowVersion/updatedAt 和 pending session CAS 需通过 Nest SQL 见证，不擅自增加更新或把多个 flush 合成事务。

字典 code trim 后 1–64 且匹配 `^[a-z][a-z0-9-]*$`，name trim 后 1–128，description 可缺省/null、非 null 时 trim 后 1–1000；sortOrder 可省、非负安全整数。PATCH expectedVersion 可省但须正安全整数，并且 name/description/status/sortOrder 至少出现一项，仅版本或未知键不满足 refinement。未知键 strip；isSystem 行没有额外禁改规则。原 `requireActiveItem` 保留不存在/停用 400，调用方随 R3/R4 接入。

唯一设置定义为 `attachment.max-upload-size-mb`，整数默认 50、范围 1–500；缺行输出默认值及 rowVersion 0。已有行按原 value_type/value_json 校验；设置列表按定义顺序而非数据库顺序。PATCH 设置先业务保存 flush，再单独 audit flush；audit 失败可能保留业务提交。requestId、before/after snapshot、operator 和 session 的事务边界按真实 Nest 见证迁移。内部 `getIntegerValue` 与上传字节换算保留，但不实施附件端点。

业务编号为 9 个现有 scope，UTC 年份分期，前缀/6 位 padStart 从原定义机械导出。原单条 UPSERT 返回 next_value−1，created_at/updated_at 用 PG now()，raw SQL 不额外更新 row_version。提供调用方传入同一 SQLx connection/transaction 的接口，并保留默认独立连接路径；并发唯一性、跨年、事务回滚与编号消耗通过真实 PG 和 Nest 对照验证。现有 customer/lead/project/contract 与五类 cost 调用的传事务差异保留，业务调用方仍随 R3/R4 接入，不新增公共编号 API。

## 4. F：审计读取与路由拒绝事件

全局 audit/security 查询的可选字段、空值、时间比较与 limit 以 Zod/service 为准；默认 limit 50，coerce integer 1–100，from/to 独立 datetime，不增加 from≤to 规则。occurred_at DESC 使用 PG 精度，其他未指定排序不人为补稳定顺序。

三 query 都 strip 未声明字段，无 offset/cursor/total envelope；limit 沿用 JS Number coerce，时间沿用原 `z.iso.datetime()`，不能未经 oracle 验证就套用更窄 scalar。eventType/targetType/targetId/operatorId/result、actorId/principal/path/permissionKey 的等值过滤和长度来自对应 schema，不擅加 trim/模糊匹配；from/to 含边界。

实体审计的 targetType 必须来自原九类集合并满足对应业务 read 权限；targetId 只 trim/非空，以原字符串精确等值查询，不做 UUID 规范化或目标实体存在校验。原 DTO 仅投影已有字段；读取保留存储 snapshot/details 的原行为，敏感最小化主要沿用既有 writer。使用非敏感哨兵验证公开字段与写入脱敏，不把本批迁移扩大为全局安全策略改造。

二次权限表：lead→lead:read；customer/customer-contact→customer:read；opportunity-stakeholder/competitor-intelligence/sales-discovery-record→lead:read 或 project:read；sales-follow-up-record→customer:read/lead:read/project:read 任一；project/contract→project:read。顺序为 query DTO→targetType→targetId trim/非空→二次权限→查询；全局 query targetId 不 trim。summary 只返回原 service 显式映射字段，snapshot/details 内 JSON 保留；不新增 response schema 清洗已存储内容。

routeDenied 保留 requiredPermissions 顺序/重复与首项 permissionKey、returnUrl null/default、actor/principal/requestId、原请求 path/method/IP/userAgent 和 details。写入通过既有 auth security writer，security INSERT 与 pending session CAS 的同 flush 提交及前置 raw touch 分段语义由 SQL 见证；原 202 只有真实持久化成功后返回。

routeDenied body：path 必填 1–255、returnUrl 可省/null 或 1–255 字符，均不 trim、不校验 URL；requiredPermissions 为至少一项的原权限枚举数组，无去重，unknown keys strip。requestId 为 x-request-id ?? x-correlation-id，空串保留；truthy X-Forwarded-For 首段 trim，否则 req.ip；UA 沿用原 header。无主动截断，超过存储长度保留原失败。固定 eventType/authz.route.denied、severity/warning、result/blocked、method/ROUTE，actor/principal 只能来自会话；实体审计 service 细分权限拒绝不额外新增 guard security event。

## 5. 持久化、环境与数据所有权

沿用现有 dictionary_item、system_setting、business_number_sequence、audit_log、security_event 及会话/角色/组织表，无新增 migration、索引或约束。保持 UUID 与字符串标识分工、PG timestamp 精度与 JS ISO 毫秒输出。无产品金额模型改动；JSON 数值/nullable、枚举和 row_version 仍需对应原实体/DDL/DTO，不修改数据库以迎合 Rust。

仅新建受控 PG15 数据库 `poms_r2ef_nest` / `poms_r2ef_rust`，role `poms_r2ef_app`，owner-only `r2ef_control.marker` 绑定精确数据库名及 UUID `a3580e72-e812-47b3-b41f-5066343f5c37`。沿用既有容器 `poms-r0e-pg15`、volume `poms-r0e-pg15-data`、image `b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a`、scope rust-r0e、127.0.0.1:15432、`poms.r0e_isolated=on`、owner `poms_r0e_owner`；仅在 metadata 守卫通过后恢复已停止的受控容器，不替换 cluster、不重置旧数据库。

Linux checkout `/home/wangzishi/projects/poms-rust-r2ef`；private state `/home/wangzishi/.local/share/poms-r2ef`，目录 0700、secret/env/journal 0600，独立 app secret 与 JWT，拒绝 ambient PG/DB/MIKRO/DATABASE_URL/JWT_SECRET/NODE_OPTIONS/default.env 注入。沿用锁定 Rust 1.99.1/Node 24.16.0 镜像与未变 lock 的依赖缓存；API 5500/5501、UI 5600，启动前查占用。Windows Rust 访问 Linux API，不能写成原生 Windows Rust 运行。

PG17 仅观测服务元数据，G0 为 Running/Auto；不连接 SQL，不执行 seed/reset/migrate/stop，不复制其数据。旧 PG15 数据库、Linux checkout、镜像/volume、private journals 与历史失败证据保留。

使用同一 E/F fixture 管理请求身份与数据。每次写入前登记唯一 intent，成功后按主键与完整所有权 adoption；超时/失败保留 journal。字典的 domain/code、业务编号的 scope/period、设置定义 key 等非 UUID 对象必须逐项登记，设置改动须恢复精确原值/缺行状态，禁止按前缀或全表清理。业务 usage 验证依赖真实表 fixture，不连接未授权环境、不伪造读写成功。cleanup 前核对外部引用和未知 FK，不借 CASCADE 改非本 run 行；所有成功/失败/中断 run 清理后独立第二次检查零残留，无法初始化者单列 N/A 证据。

## 6. 统一验证、证据与 G3/G4

| 类别           | 本批必须实际完成                                                                                                                                         | G1 时状态 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Rust           | fmt、locked/offline check、clippy 无新增 warning、普通 unit tests、release；PG ignored 显式分列并运行本批所需真实 PG 测试                                | Pending   |
| 原实现见证     | DTO oracle；字典/设置 dirty 与 flush/session CAS；编号默认连接/借用事务与并发；F 查询/投影/事件实际存储                                                  | Pending   |
| 双后端 HTTP/PG | 10 操作的成功/错误/权限/CSRF/query/path/body、真实副作用、边界、受控并发，比较器只做声明的 ID/时钟/请求标识转换                                          | Pending   |
| 原 Angular     | 适用字典/设置/审计页面 Windows/Linux × Nest/Rust；同一候选基础认证回归集中一次，各目标页面用例独立计数                                                   | Pending   |
| TS/静态        | 受影响项目 lint 及 warning、相关原 TS tests、原 Angular production build/typecheck、adapter/source/OpenAPI/client/migration 来源保护；同候选公共检查一轮 | Pending   |
| schema         | 两库现有 DDL/实体/migration 差异只读检查并分类，不执行提议 schema:update DDL；此前既有差异不冒称本轮重跑                                                 | Pending   |
| 清理与生命周期 | 同批所有 run 的 cleanup 与第二次零残留、owner 停止、测试端口释放、PG17 元数据；证据集中保全                                                              | Pending   |
| 独审           | C 联合产品/工具/实际证据 G3；审查修复仅增量，主代理负责最后必要集成检查、文档和在线核对                                                                  | Pending   |

原 G1 候选和审查输入以原字节保全。正式验收保留命令/exit、观察数/通过数、source epoch 与 raw hash，区分原 Nest 见证、mock/unit、静态检查、运行比较与旧失败，不重复加总。固定同一候选只跑一轮公共回归，新增行为或来源变化时补受影响项目；不为每个收尾小脚本增加独立 Gate。

Linux 本地完成路径/类型守卫与前后原字节 manifest，集中批量保全到主目录后核目标字节；Windows 文件单独增量保全，冲突拒绝覆盖。完整受审 G3 验收原件在补 Gate/closure 元数据前冻结，归档路径迁移另记映射。只在实现提交、集成检查、归档提交推送及在线状态一致后关闭 #72/#73；父 #67/#57 与 G–M/#61 继续保留各自状态。

## 7. Drift、例外与放行

按 new-real-drift / existing-baseline-drift / accepted-db-specific-difference / tool-noise / design-change-required 分类。原 source 与历史设计的编号调用事务差异、既有 schema introspection/comment 差异、有限 Unicode/URI 覆盖及原 UI 许可提示须按实际证据列明。G1 当前没有范围豁免；实现期间发现与本基线不同的真实行为时追加窄范围纠偏，不回写冻结历史为已通过。

G1 已通过。原独审候选 SHA256 `65279d001e7a4a3553d4f9be179bce563dd8f1344039a2be8492788c350a35d6`、审查回执 SHA256 `27d94324c927753346d97920eb518aca921b5a49b454c54f3d0587958405c0c1` 与实际冻结状态分别保全。G2 与范围内运行验收已经完成；实际口径与两个候选 epoch 见 `rust-r2ef-validation.json`，原编号事务、字符长度与 E 传输增量见纠偏记录。此冻结输入本身不代替最终独立 G3 或 G4 关闭回执。
