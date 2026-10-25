# Rust R0：API 与兼容契约盘点

**状态**：R0 静态清单；R0A–R0E 交付快照为 `08daaf45b12307bc4d53e01e509f23d265532de6`，R0F 续作采用 v3 路由登记与双重源冻结。R0F G3/G4 状态见[主实施基线](rust-r0f-compatibility-baseline.md)；不代表 Rust 实现或运行验收完成。

**日期**：2026-10-26。

**源码基线**：`033aedd028fc25ea990450a7854fc92c567cfb8a`。

**切片类型**：`docs-only`，附离线盘点工具；不改变公共接口、DTO、数据库或业务行为。
**正式输入**：[后端 Rust 迁移计划](backend-rust-migration-plan.md)、[ADR-015](../adr/015-api-route-canonical-grammar.md)、[canonical inventory](api-route-canonical-inventory.md)、现行 OpenAPI 与全部后端源码。

## 1. 交付物与证据边界

[rust-r0-api-operations.json](rust-r0-api-operations.json) 是完整机器清单；[离线生成器](../../tools/rust-r0-api-inventory.mjs) 通过 TypeScript AST 读取全部 `apps/poms-api/src/`、API/shared contracts、测试及路由治理表。没有使用前端调用情况筛选范围。

每个操作记录 method、真实 path、operationId、controller/method、源码行、模块注册与 `AppModule` 可达性、迁移主阶段及跨阶段依赖、认证/权限/CSRF 装饰器、OpenAPI security、参数/requestBody/schema 引用、DTO→Zod 源码、返回类型、service 调用线索、canonical 行及静态测试线索。清单还包含全部模块、无 HTTP 模块、core/features 源文件、初始化入口、共享枚举快照和源文件规范化文本 SHA-256。

DTO 来源分为命名 Zod schema、内联 Zod 表达式和无 Zod schema 的 Swagger class。五个内联 DTO 在六个操作中使用：NavigationListDto 复用两次，另有四个 Commission 列表 DTO；清单保存完整 `z.array(...).meta(...)` 表达式、表达式源位置及被引用共享 schema 的位置。两个 health 操作使用同一手写 HealthCheckDto，明确标为 `swagger-decorated-class-no-zod-schema`，其 `schemaSource=null` 表示没有 createZodDto 来源；class 位置可追溯，但不能据此推定运行时 Zod 校验或响应投影完整。

这是源码证据。未启动应用、连接数据库、调用外部服务、执行现有业务测试或进行性能实测；没有 Fast 模式验证结论。测试文件出现方法名或 HTTP 调用只作为线索，不视为通过、覆盖率或完整调用图。

## 2. 重新核验的数量

| 对象               | 当前基线                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| OpenAPI            | 3.0.0；237 paths、291 operations、585 schemas                                                     |
| 源码控制器         | 36 文件、42 class、291 HTTP 操作                                                                  |
| OpenAPI→源码映射   | 291/291 method/path/operationId 对齐，均有从 AppModule 可达的注册                                 |
| 源码独有 HTTP 路由 | 0；不包含框架自动 OPTIONS/HEAD、Swagger UI 或代理入口                                             |
| 认证分类           | public 11、authenticated 6、permission 274；未发现未声明授权的默认拒绝操作                        |
| 静态测试输入       | 72 后端单测文件、14 API E2E 文件                                                                  |
| 直接测试线索       | 166 操作找到线索；125 暂未找到；其中 48 操作有直接 E2E HTTP 路由线索                              |
| canonical 表       | 295 个有路由的能力行，覆盖全部 291 操作：282 精确匹配、7 参数名差异、2 canonical 待裁决；未登记 0 |
| 共享常量/枚举      | 455 个命名常量快照，含 37 PermissionKey；224 个 z.enum 表达式                                     |

`POST /projects/{projectId}/actual-cost-records` 的五种 costType 能力共用一个实际操作；因此能力行数不能直接与操作数相减。R0F 的 295 个有路由能力行中，293 行 canonical 已定、2 行 pending；原有 5 个无当前 method/path 的历史能力行也完整保留。枚举表达式中，161 个顶层 OpenAPI enum 的值和顺序与 TS 一致；53 个为对象内嵌 enum；10 个顶层 enum 未作为独立 OpenAPI enum 发布，仍从 TS 冻结。未发现静态无法解析的枚举表达式。

以下为 `08daaf45` 中 R0E 历史 v2 快照的输入摘要，按 UTF8、CRLF→LF 文本规则计算；当时这三个输入已为 LF，因此其摘要与初盘相同。R0F 已更新 canonical 文档，下面旧 canonical 指纹只表示历史，不作为当前 v3 文档指纹；当前指纹见第 9 节。OpenAPI、shared 源码与操作集合摘要保持不变：

- `openapi.json` SHA-256：`75d43527a24809a03d17a6a3b1d47c3600309c424adebe59766378eab50598e3`。
- `shared-contracts.ts` SHA-256：`3dbfa25ed6c8375429090598f64c10db0f5ec9a70a197f38afe94d1fe2e0bb7a`。
- canonical inventory SHA-256：`be48443b5a5ba5f46fe7e672ad610a20a681704c85316b4ee3e71b19fb9116a0`。
- 排序后的 method/path/operationId 集合 SHA-256：`64b7d23903571a607128662ebfe5d2d6a988e8ffe163194c45c38d6537aee7e6`。

## 3. 模块与阶段去向

阶段数字表示完整操作的交付责任，不能单凭路由实现就提前放行其全部业务行为。每个操作的跨阶段依赖保存在 JSON 的 `migration.dependencies`。外部登录四项与 profile 两项完整交付归 R2，R1 只定义复用的认证内部接口。

| 主阶段 | 模块与操作数                                                                                                                                                               | 合计及完成条件                                                             |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| R1     | app 1、基本会话 auth 4、health 2                                                                                                                                           | 7；R0F 已补根入口 authoritative 行，并固定七路由输入；工程实现/验收仍待 R1 |
| R2     | platform 27、attachment 30、identity-provider 12、external-org-sync 18、dictionary 3、navigation 1、runtime-audit 4、system-setting 3、approval 4、外部登录/profile auth 6 | 108；审批各业务域 handler 随 R3–R5 注册                                    |
| R3     | customer 8、lead 14、sales-follow-up 4、sales-intelligence 13、business-discussion 2、project 的签约前/主数据 17                                                           | 58；project detail/timeline/workspace 引用的后续阶段投影最终仍须完整       |
| R4     | contract 9、contract-finance 19、contract-readiness 9、project-handover 5、project-cost 40、project 验收/完成/归档 8                                                       | 90；保留跨域事务、版本与金额规则                                           |
| R5     | commission 28                                                                                                                                                              | 28；依赖 R4 资金、成本和项目状态事实及 R2 审批框架                         |

无独立 HTTP 操作的 `PersistenceModule`、`SecretCipherModule`、`SensitiveFieldProjectionModule` 归 R1；`ApprovalSummaryModule`、`BusinessNumberModule` 归 R2。`core/platform/dev-platform.fixtures.ts` 也是实际源码输入，须在 R1/R2 区分开发 fallback 与正式用户解析。`openapi.ts` 内的 `OpenApiPersistenceModule` 以及 `ApiContractsModule` 是生成/契约支持模块，不能当作待迁移 HTTP 业务模块。

## 4. R0A–R0E 历史路由治理差异（v2）

本节保留 `08daaf45` 中 v2 的原始发现，不作为当前 JSON 状态。初盘比较路由形状时仅忽略参数占位符名字，且明确将它与 OpenAPI 的参数名合同分开；当时已登记的 256 行均能匹配现行路由形状，未发现方法或静态路径段不一致。初盘保留以下 `existing-baseline-drift`，没有修复接口或权威表。R0F 后续已补登记并明确待决边界，见第 9 节及 [R0F 路由基线](rust-r0f-route-baseline.md)。

### 4.1 历史发现：39 个操作缺 authoritative inventory 行

下表列 formal 路径，实际 OpenAPI 带 `/api` 前缀；当时逐项 operationId、源码及阶段可由 `08daaf45` 的 JSON v2 中 `canonicalInventoryStatus=missing-authoritative-inventory-row` 复核。当前 v3 未登记数为 0，不再具有这 39 个 missing 状态；完整补录与裁决见 [R0F 路由基线](rust-r0f-route-baseline.md)。

| 模块          | 缺行的 method/path；同一路径的不同 method 分别计数                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 操作数 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| app           | `GET /`，实际完整路径为 `/api`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 1      |
| runtime-audit | `GET /audit-logs`；`GET /security-events`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 2      |
| navigation    | `GET /me/navigation`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 1      |
| platform      | `GET /platform/navigation`；`GET /platform/permissions`；`GET, POST /platform/users`；`GET, PATCH /platform/users/{id}`；`GET, POST /platform/roles`；`GET, PATCH /platform/roles/{id}`；`GET, POST /platform/org-units`；`GET, PATCH /platform/org-units/{id}`                                                                                                                                                                                                                                                                                                                                                                                             | 14     |
| contract      | `GET, POST /contracts`；`GET /contracts/no/{contractNo}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 3      |
| project       | `POST /projects`；`GET /projects/code/{projectNo}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 2      |
| project-cost  | `GET /accounting-tax-treatments/{id}`；`GET /cost-stage-attributions/{id}`；`GET, PATCH /expense-records/{id}`；`GET /operating-restatements/{id}`；`GET /period-closing-snapshots/{id}`；`GET /project-actual-cost-records/{costRecordId}/stage-attributions`；`GET /project-actual-cost-records/{id}`；`GET /project-operating-snapshots/{id}`；`GET /projects/{projectId}/accounting-tax-treatments`；`GET /projects/{projectId}/actual-cost-records`；`GET, POST /projects/{projectId}/expense-records`；`GET /projects/{projectId}/operating-restatements`；`GET /shared-cost-allocation-bases/{id}`；`GET /shared-cost-allocation-bases/{id}/results` | 16     |

这些是已实现并进入 OpenAPI 的基线操作，不能作为 Rust 可省略项。初盘将相关路由工程 G1 设为需先补录与确认的下游要求。R0F 已完成 37 个 canonical 补定及 2 个待决能力的现状登记，R1 根入口已补齐；两条业务号 lookup 仍阻断其所属 R3/R4 域工程 G1，不能将“已登记”等同“canonical 已定”。

### 4.2 持续保留：7 个占位符名字差异

| canonical 写法                                                                                                            | 现行 OpenAPI/控制器写法 | 操作数与权威表源码行（08daaf45 历史行号） |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------- |
| `/project-handovers/{id}`、`/project-handovers/{id}:confirm`                                                              | `{handoverId}`          | 2；canonical inventory 97、98 行          |
| `/project-handovers/{id}/attachment-checklist`、同路径 `:refresh`、`/project-handovers/{id}/attachment-download-packages` | `{handoverId}`          | 3；398–400 行                             |
| `/attachment-download-packages/{id}`、同路径 `/download`                                                                  | `{packageId}`           | 2；401、402 行                            |

这不改变实际 URL 匹配，但 OpenAPI parameter 名、生成客户端参数名和 operationId 都是兼容输入。Rust 迁移按现行 `handoverId`/`packageId` 作为兼容输入；统一名称需显式设计与客户端变更，不能只因路由形状相同而静默接受。R0F 已修正五条附件 Current Implemented 错误登记，七条均保留 `parameter-name-only` / `implementation-drift`；五条归 R2 附件域、两条归 R4 移交域的工程 G1 处置。本次未批准 alias 例外，也不阻断无关的 R1 七路由。

## 5. TS→Rust 的共享 SSOT 冻结

迁移期间继续以 [shared-contracts.ts](../../libs/shared/contracts/src/lib/shared-contracts.ts) 为共享 enum/permission 的唯一权威。`PERMISSION_KEYS` 派生 `PermissionKey`；`*Value`、数组及 `defineEnumDefinitions` 等派生工具之间的关系保持不变。OpenAPI 只投影 HTTP 可见子集，不能成为未发布 enum、导航权限或纯业务状态的替代权威。

R0 已将可静态求值的字符串数组、wire-value object、enum definitions、每个 `z.enum` 参数及源码位置冻结在 `sharedSsot`。其中同一语义的数组/对象/定义表会分别出现；455 是命名定义数，不是455种独立业务状态。37 个权限键与全部控制器权限声明已做机械归属检查。

R1 采用以下生成及校验链，禁止两份手工列表长期并存：

1. 从现行 TS SSOT 产生中立 JSON 值清单，记录源文件/生成器版本与 checksum；生成器必须识别 enum helper 派生值，遇到未知表达式失败，不能跳过。
2. 从该清单生成 Rust enum 的 wire value/Serde rename、PermissionKey 定义及匹配器；Rust variant 标识可以不同，JSON 值、大小写、顺序及全集必须与清单相同。显示标签、severity、hint 如被后端消费，也从同源定义派生。
3. R1 契约检查对 neutral manifest、Rust 实际序列化结果及 OpenAPI 可见 enum 集合逐项比较；包含已知值往返、未知值拒绝、权限 all/any/default-deny。清单新增或删除必须显式审阅。
4. 保留现有 OpenAPI→Angular 客户端权威生成链；跨平台入口复用同一生成/规范化规则。Rust 接管 OpenAPI 生成权前，291 个 operationId 与585个模型保持可比较，禁止用客户端“能编译”代替字段语义等价。

本片提供 TS 清单与机械一致性检查，没有创建 Rust 生成代码或声称 Serde 已通过往返测试。后端局部常量，例如 `AuthSessionErrorCodeValue`、会话持久化状态，仍由其现行源码定义，须在所属 R1 数据/认证基线冻结，不能因不在 shared 文件就遗漏。

## 6. 重点兼容约束与代表性验收输入

| 合同边界               | 当前可追溯依据与约束                                                                                                                                                                                                                   | 所属阶段必须补齐的样本                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DTO / validation       | `libs/api/contracts/src/lib/*/*.dto.ts` 使用 `createZodDto` 引用 TS schema；本片保存每个 DTO 和 schema 源码位置。`app.module.ts` 注册 ZodValidationPipe；原始 string 参数、未标 DTO 的参数不会自动得到同等 Zod 校验                    | 缺字段、空串、trim、UUID、长度、数字界限、query coercion、联合判别/跨字段 refine；不能把 Rust 更严格的默认解析当作无行为变更                                                                                                        |
| 缺省 / null / optional | Zod `.optional()`、`.nullable()`、`.default()` 分别表示不同合同；PATCH 的未传、显式 null 和清空值不能混为一种 Option                                                                                                                   | 例如 `UpdateSystemSettingRequest.expectedVersion` 未传/0、`ProjectSummary.customerId=null`、部分更新遗漏字段、数组默认值与显式空数组                                                                                                |
| 未知字段与响应投影     | schema 中同时存在普通 object、`.strict()`、refine/superRefine；序列化拦截器是否实际应用 DTO 由响应装饰器决定，不能仅凭 Swagger 的 type 推断运行时投影                                                                                  | `LogoutAuthSessionRequest` 的额外字段拒绝；非 strict DTO 的既有剥离行为；敏感字段 full/summary/masked/denied 和原因码；流式附件例外                                                                                                 |
| 日期与时间             | `z.iso.date()` 和 `z.iso.datetime()` 分开；如线索 `expectedDecisionDate` 为 date，项目 `plannedSignAt` 为 datetime。现有 datetime schema 有 UTC Z 格式约束                                                                             | 闰日、无效日期、日期不带时区、UTC 与 offset 输入的现行接受边界、null/遗漏、数据库往返与排序；不能统一改为 RFC3339 任意 offset                                                                                                       |
| money / ratio          | wire 大量为 string；shared 合同约束包括金额两位、数量四位、比例八位与 signed ratio；另有字段仅约束非空字符串，不能套统一正则收紧。`commission.service.ts` 现有 `toFixed(2/4)`、`project-cost.service.ts` `toFixed(4/6)` 是计算兼容输入 | 0、负向调整、最大值、尾随零、1.005 等舍入边界、重算、税率/比例和 string JSON 类型；十进制定点与 JS 浮点差异逐项冻结规则，不静默改结果                                                                                               |
| 错误合同               | `libs/vendor/nestjs-zod/src/exception.ts` 的 validation 为400、`message=Validation failed`、`errors=issues`；业务异常还有普通 Nest message、状态码及自定义 code；OpenAPI success schema 不能穷尽异常                                   | 400校验 issues、401 `session_missing/session_expired/session_revoked/account_disabled`、登录 `invalid_credentials`、403 `csrf_failed/permission_denied`、404、状态/版本冲突；框架 extractor 失败须映射到旧响应，逐接口核验实际 code |
| 认证 / Cookie / CSRF   | `auth-session-cookie.service.ts`：`poms_session` HttpOnly、`poms_csrf` 非 HttpOnly、`X-CSRF-Token`、默认 Path `/api`、SameSite=Lax、Secure 依环境；global guards 顺序为 Session→CSRF→Permissions                                       | 旧签发会话切新服务及切回、空闲/绝对过期、撤销/停用、登录前双提交、会话绑定 CSRF、清 Cookie 的 path/max-age、畸形 Cookie；public 写接口仍校验 CSRF                                                                                   |
| 授权与组织归属         | 装饰器 all/any/default-deny 只是第一层；controller/service 还读取操作者、owner、参与者、敏感字段权限。`GET /auth/session` 虽 Public 仍自行解析并续期会话                                                                               | 无会话、缺权限、any/all、跨组织/负责人、敏感金额/附件、external login ticket/state 单次消费；GET 不假设无写审计或续期                                                                                                               |
| 版本与幂等             | expectedVersion/rowVersion、effective/superseded/voided、current 指针、审批与快照由业务/持久化合同共同定义                                                                                                                             | 双请求同版本、重复提交、唯一当前版本、拒绝后重提、快照不可变与事务失败后无部分写入                                                                                                                                                  |

R1 先建立 backend-parametric HTTP 测试，随后每阶段将本阶段操作的有效/无效输入、状态码、响应字段和副作用加入同一套场景。静态找到的166个操作不是验收上限；125个无直接线索项必须逐条处理，动态 helper/间接测试可经人工确认补上，确实缺失的必须补测。

## 7. 非 OpenAPI 工作与阶段输入缺口

JSON 的 `nonOpenApiEvidence.coreFeatureSourceFiles` 枚举全部 core/features 源码；`modules.providers` 与 service-call clues 提供进一步人工审阅入口。不可将“291 个路由已映射”写成“后端迁移范围已完整实现”。

| 范围                          | 必须纳入的现行来源                                                                                                                                                               | 后续输入/阶段                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 数据库与初始化                | `src/migrations/`、`src/seeders/database.seeder.ts`、`platform-bootstrap.seeder.ts`、`business-trial.seeder.ts`、`seed-utils.ts`；实体 hooks/事务边界还需专门数据盘点            | R0 数据基线；R1 SQLx/旧格式兼容；R6 空库与存量接管。本 API 清单不声称 DDL 或迁移已验证          |
| 进程与配置                    | `src/main.ts`、`src/config/*`、Persistence/health、CORS/环境加载、优雅停机和部署脚本                                                                                             | R1 配置/readiness/关闭；R6 单一活动写入方、部署与回滚                                           |
| 审批/摘要/业务编号            | approval service/handler、approval-summary、business-number；通用路由背后的业务处理器与跨域 service 调用                                                                         | R2 框架；R3–R5 各域 handler。未实现 handler 必须明确阻断，禁止伪造成功                          |
| 认证密钥/历史密文             | auth session hash、platform 密码哈希、`core/secret`、provider grant/token 存储                                                                                                   | R1 冻结格式/错误与旧写新读；R2 外部 provider 完整流程                                           |
| 外部身份/组织同步             | identity-provider、external-org-sync 及 Feishu adapter，callback/state/ticket、preview/apply 幂等与外部副作用                                                                    | R2 adapter fixtures 与启用环境烟测；mock 证据不能声称真实集成通过                               |
| 附件与存储                    | attachment registry、local/OBS S3 provider、signed URL、upload complete/校验、download package/checklist；外部对象数据不由 OpenAPI 描述                                          | R2 存储与访问；R4 移交/附件冻结；R6 对象与数据库一致性及回退                                    |
| 审计/敏感字段                 | runtime-audit、sensitive-field-projection 及其 service 使用点                                                                                                                    | R1 上下文与投影基础；R2 持久化审计；后续域逐条验证敏感金额与审计副作用                          |
| 后台/管理任务                 | 全 src 扫描的定时器与生命周期模式结果保存在 `lifecycleOrTimerClues`；当前未发现匹配的 schedule decorator 或生命周期 hook，provider retry 使用 timers/promises 不等于定时业务任务 | R0 仍需结合部署/人工入口确定任务 owner；R6 保证仅单一活动执行方。未命中静态模式不证明无后台任务 |
| OpenAPI/客户端生成与 E2E 启动 | `src/openapi.ts`、`tools/openapi/*`、API E2E support、Playwright 外部地址                                                                                                        | R1 Linux 入口与同一规范化逻辑；本片不运行需要数据库/构建的生成任务                              |

## 8. 可重复校验与当前阻断项

初盘 v1 的 Windows 原始字节快照 SHA-256 为 `9c8888db7208be7613872124b51eafd7e178de409b9ff7b533f6c81ee1f2ebc7`，其 380 个来源中有 25 个文件带 CRLF。同一提交在 LF checkout 中复算不同属于已确认的 `tool-noise`。R0E 将证据格式提升为 `formatVersion=2`，保留源码基线 `033aedd0`，在 UTF8 文本读入后、AST 解析前仅执行 `text.replace(/\r\n/g, '\n')`；来源、生成器自身及其派生指纹采用同一规范化文本语义，不再宣称原始字节 SHA。

规则明确保留 BOM、裸 CR、Unicode、其他空白以及源码中的显式转义；不重写任何参与盘点的源码文件。JSON 输出使用 LF，`--check` 只对快照文件的物理 CRLF 作同一转换，不解析或改写 JSON 字符串中的转义值。生成器自身指纹继续保留，换行差异不再导致其跨平台漂移。策略写入 `baseline.textNormalization`；291 个操作、分期、DTO/源码行指针、权限及 enum 集合均须与 v1 相同。Windows 与 Linux 的实际复算结果由 R0E 主检查点分别记录，不能以规范已写入代替 Linux 验证。

在已安装本仓库 TypeScript 依赖的根目录运行；命令不联网、不启动服务：

```text
node tools/rust-r0-api-inventory.mjs --write
node tools/rust-r0-api-inventory.mjs --check
node --check tools/rust-r0-api-inventory.mjs
git diff --check
pnpm run format:md:check
```

`--write` 只写指定 JSON。当前 v3 的两个模式都先用 Git 检查 `baseline.sourceReferenceScope`：参与盘点的产品 TypeScript、DTO/shared、OpenAPI、兼容生成工具、项目配置及既有 `.gitattributes`，相对 `033aedd0` 存在 tracked/staged 改动、删除或新增未跟踪输入时立即拒绝。canonical 文档从这个 Git scope 单独拆出，以 `canonicalInventory.reviewedTextSha256` 的经审查规范化文本指纹严格校验；不匹配同样立即拒绝。规范化与本次文档续作均未关闭输入检查，不能把新产品源码重标为旧 HEAD。新增盘点文档/JSON/提取器或其他无关文档提交不会触发产品输入检查。经审阅改换产品源码基线或 canonical 文档时，必须分别显式推进工具中的 `baselineHead` 或 `canonicalReviewedSha256`，再冻结新清单。

输入引用一致后，`--check` 重新计算并比较规范化 JSON 文本；生成器自身规范化文本 SHA-256 保存在 `baseline.generatorSha256`，sourceManifest、完整操作、枚举、权限或提取逻辑发生实质变化都会使旧快照检查失败。工具遇到重复路由、重复 operationId、无法映射/未注册控制器、OpenAPI 与源码参数名不一致、无法解析的枚举、未登记权限或无法定位的 Zod schema 会失败。291 是当前测得的基线，工具不硬编码该数字；后续新增操作须通过新基线审查后进入清单。

本片运行 `--write`、`--check`、Node 语法检查及文档检查后的结果由 R0 主切片 G3 证据统一记录。API build/lint/test、OpenAPI 生成、migration-check、Rust fmt/clippy/test 和数据库/E2E执行：本片不需要，留给对应工程切片。

当前阻断与下游责任：原 39 个 authoritative row 缺口已在 R0F 全部登记，不再是当前 missing；两条业务号 lookup 的 canonical 裁决及七条参数名差异仍在对应域工程 G1 处置，见第 9 节。尚无共享 Rust enum/业务 DTO 生成器及其 Serde 运行验收证据；125 个操作没有直接静态测试线索；跨域事务、数据类型及环境策略须由 R0 其他基线补齐。R0E 的基础类型探针不替代完整业务契约验收。R0 整体是否通过 G1/G3、Issue/PR/tracker 与 G4 状态由主切片决定，本盘点不独立宣告整体 R0 或 Rust 迁移完成。

## 9. R0F 续作：v3 登记补齐与产品/文档分别冻结

本轮 [R0F #59](https://github.com/illusion-tech/poms/issues/59) 依据 [ADR-015](../adr/015-api-route-canonical-grammar.md) 补录现状及设计边界，完整逐项结果和 R1 七路由的请求、权限、响应、最小副作用见 [R0F 路由基线](rust-r0f-route-baseline.md)。本轮不改 controller、DTO、OpenAPI、生成客户端或产品行为。

| 当前结果         | v3 数量与边界                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 操作集合         | 291，method/path/operationId、分期、DTO、权限、模块与测试线索保持不变                                                                         |
| 路由登记         | 全部有 authoritative 记录，未登记 0；295 个有路由 capability 行，另保留 5 个无当前 method/path 的历史行                                       |
| canonical 已定   | 293 行关联 289 个操作；其中 282 操作参数名完全匹配、7 操作参数名仍有差异                                                                      |
| canonical 待裁决 | 2 行/2 操作：项目编码 lookup（R3）、合同编号 lookup（R4）；`canonical-decision-pending` / `design-change-required`，不伪造 canonical URI      |
| 参数名差异       | 7 操作；修正五条附件实现记录，保留 canonical `{id}` 与现行 `{handoverId}`/`{packageId}` 对照，分别进入 R2 附件域（5）与 R4 移交域（2）工程 G1 |
| R1 输入          | root 1 + health 2 + 基础会话 4 = 7；根入口已补 authoritative 记录，外部登录 4 与 profile 2 仍归 R2；不把对应域待决事项扩大成 R1 七路由阻断    |

两条业务号 lookup 的工程设计跟踪为 [#61](https://github.com/illusion-tech/poms/issues/61)，在对应 R3/R4 域工程 G1 前必须裁决正式查询路径、DTO/错误/敏感投影/审计与同步切换边界。七处参数名差异同样须在所属域工程 G1 显式处置。R0F 没有将现状自动批准为长期 legacy alias；后续仍须遵守 ADR-015 §4.5。

v3 源证明保留产品 `033aedd028fc25ea990450a7854fc92c567cfb8a`，原产品 Git scope 不变；唯一拆出的 canonical 输入由严格指纹替代旧文档 Git reference。审查元数据记录 `RUST-R0F` / Issue 59 与此前交付提交 `08daaf45`，不将本次 canonical 修订冒充为产品源码变化。UTF8 CRLF→LF-only、generator 自身规范化文本 hash、JSON LF 复算语义继续沿用 v2。

本次 Windows 重录与只读 `--check` 的当前证据：

- API JSON v3 SHA-256：`3d564c69ec633872a1870bdbaa0ab48744d0e316ab8660f62ddd5ccb11e1c95c`。
- canonical normalized UTF8 SHA-256：`c9b781ea1797ef9c9c804d1ce27bc62a8d10ecd231d999141305aff0c8915af7`。
- generator normalized UTF8 SHA-256：`fe0d325b6e995b0c7ee063a7f3ccf4242719294e61003dde675619343df0ced0`。
- OpenAPI/shared/operationSet 指纹继续保持第 2 节的原值；291 个操作除 canonical 派生字段外，与 `08daaf45` v2 的记录逐项严格相等。

独立静态核验还覆盖 39 缺行 + 7 差异 + R1 七路由去重后的 52 操作、11 个 controller 源文件的 method/path/源码行。原 canonical 的 261 个 capability 行全部保留：254 逐格未变，7 行只修改获准的事实/处置列，新增 39 行。v3 解析器明确接受有 implemented 路由而 canonical 为空的 pending 行，并拒绝 pending 行夹带已定 canonical 或缺失 implemented 路由；当前 pending 不会被误算为缺行或参数名差异。

上述只读核验不是 Rust、真实 HTTP 或数据库通过证据。R0E 的 v2 历史指纹与 Windows/Linux 历史复算仍绑定 `08daaf45`；v3 的平台复算和最终 G3/G4 由 R0F 主基线另记，不能覆盖历史验收快照。
