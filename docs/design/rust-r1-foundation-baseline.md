# RUST-R1 应用与兼容基础 G1 草案

**最后更新**: 2026-10-26
**Gate Status**: `Pending`
**Parent / Owner**: `RUST-R1` / 主代理
**Slice Type**: `cross-layer-high-risk`，本文件仅形成工程输入草案
**正式前置**: [R0 基线](rust-r0-baseline.md)与[执行追踪](rust-migration-execution-tracker.md)
**G1 Reviewer / Date**: 待 R0 收口与独立审查；不以本文件创建时间作为放行时间

## 1. 范围与明确不做

R1 交付一个可在已准备的 WSL 环境启停的 Rust 应用、配置/日志/错误层、SQLx 连接和事务基础、Cookie 会话/CSRF/权限/敏感字段/密文兼容，以及同一契约测试可选择 Nest/Rust 的执行入口。

R1 不交付完整平台治理、真实外部身份/组织同步、附件写入、审批业务处理器、客户项目合同资金成本提成、迁移接管或正式部署。为认证必需的账户/角色/组织读取和最小审计写入可纳入窄边界；完整平台写接口属于 R2。尚未实现的路由不可用伪造成功响应冒充覆盖。

## 2. 建议子切片与依赖

| 子切片 | 内容                                                                | 前置与完成边界                                                           |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| R1A    | Rust 工程、固定工具链与锁文件、配置、日志、启停、SQLx、错误协议     | R0E/F 已冻结；fmt/clippy/test/build；真实隔离 PG连接、取消/超时/回滚行为 |
| R1B    | 共享类型导出、日期/decimal/ID/状态/权限、HTTP序列化映射             | R1A + 类型矩阵；逐字段兼容样本，不新建第二套权威枚举                     |
| R1C    | 账户读取、session store、Cookie、CSRF、默认拒绝权限、敏感字段、密文 | R1A/B + 认证/最小审计数据边界；新旧双向会话/密文与真实DB负面场景         |
| R1D    | 外部目标 API E2E、Linux 浏览器启动、跨平台客户端生成                | R1A；Nest 既有用例回归 + Rust已实现子集；生成产物一致                    |
| R1E    | 基础集成验收与独立审查                                              | R1A–D；不以子集通过标全量 Rust API完成                                   |

这张表是待冻结拆分，不代表子任务已建 issue、已进入 Doing 或已通过 G1。

## 3. 正式输入与 SSOT

架构由 ADR-018 和迁移计划定义；真实路由/DTO/权限由 [API 清单](rust-r0-api-contract-inventory.md)定位；表、精度、约束、事务与初始化由 [数据库清单](rust-r0-database-inventory.md)定位；工具位置和启动限制由 [环境清单](rust-r0-environment-inventory.md)定位。

| Concern      | 权威输入与实现规则                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| 路由         | canonical inventory + ADR-015 定规范；当前 OpenAPI/controller 定兼容输入；缺行/命名差异先冻结处理    |
| DTO / JSON   | Zod/DTO + 现有 OpenAPI + 实际 serializer/error；保留 nullable、缺省、unknown key、联合判别和字段投影 |
| 枚举/权限    | `libs/shared/contracts` 单向导出/机械校验；Rust 不独立编辑共享值                                     |
| 表与迁移     | 历史 SQL migration + 实体 + 经核实的隔离 DB；R1不接管 migration ownership                            |
| 日期/ID/数值 | R0 数据矩阵；业务时区保留 `Asia/Hong_Kong`；UUID与外部ID分型；金额输出和舍入逐项兼容                 |
| 状态/版本    | 现行服务规则、数据库约束和并发样本；事务由命令入口统筹，同一事务内的下游服务不得新开独立提交         |
| 认证/错误    | ADR-017 + auth services/guards/cookie/secret/projection代码及样本；不得引入Bearer回退                |

## 4. 命令、读侧与路由边界

首先冻结现行 `POST /api/auth/sessions`、`GET /api/auth/session`、`POST /api/auth/session:logout`、`GET /api/auth/csrf-token` 的完整输入/输出、Cookie和审计语义；具体 controller、DTO、operationId 以 operations JSON 为准。

`GET /api/auth/session` 是公开的会话查询，缺 Cookie 时返回未认证视图；不能用受保护资源的统一 401 处理替代。登录前公开写接口仍需 CSRF。认证读取需要真实用户状态、权限、组织与会话持久化，不能用 dev fixtures 充当集成通过证据。

外部登录 ticket 与会话创建的公共内部接口在 R1 定义，外部 provider 授权/回调及真实 exchange API 完整交付归 R2；R1不为未接入 provider 返回假的成功会话。`auth/profile` 等自助/平台路由按完整接口清单另归 R2。

R1 兼容实现现有 `GET /api/health` 与 `GET /api/health/readiness`，两者已在 OpenAPI 和 canonical inventory 登记；保留状态码、payload 与实际依赖探测语义。现有 `GET /api` 根入口仍归 R1，但因缺 authoritative 行，须在 R0F 补录冻结后实施。若另增公共探针路径，必须先登记 authoritative 行与设计，不能以“技术接口”为由跳过路由治理。

## 5. 持久化与副作用

R1C 在 G1 时逐表冻结 auth session、用户、角色/权限、组织读取和最小 runtime audit 所需字段，不顺带实现整个平台域。必须保持 token hash、CSRF hash、expiry/revocation、账户停用与权限变化即时性，以及 existing write/flush 的事务边界。

SQLx使用显式事务和受控连接；需要真实 PostgreSQL 断言事务回滚、唯一冲突、并发续期/撤销和异常映射。不能把 pool-only 连接测试当作业务事务通过。

R1继续使用既有 migration 初始化隔离数据库；Rust baseline登记/SQL迁移接管留R6。用户确认尚无生产部署，当前验收目标对齐 TEST PostgreSQL 15.12；R0E 固定隔离实例、`pgcrypto 1.3` / `btree_gist 1.7`、UTF8 / `en_US.UTF-8` libc 排序规则、会话时区与角色配置，并验证 SQLx 支持组合。保留本机 Windows PostgreSQL 17.4 的现有 `poms` 开发库，不自动 reset/seed；该实例的通过结果不能替代 TEST 兼容验证。ADR-012 的 16+ 与实况差异按 ADR-018 / `DB-D07` 处理，不隐式升级目标库。当前实体/DDL 固定 `poms`，R1据此冻结 schema，不能因环境变量存在 `DB_SCHEMA` 就宣称任意 schema 已支持。旧新后端测试使用独立同源副本，避免GET续期或审计污染对照。

## 6. 最小验证矩阵

| 检查         | R1 必需证据                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------- |
| 静态/构建    | 精确版本、features、Cargo.lock与toolchain；fmt、clippy、cargo test、cargo build --release    |
| 配置/启动    | 缺失或非法配置失败；正常启动/退出、shutdown、DB不可用、敏感值不出日志                        |
| HTTP/类型    | frozen operationId、状态码、错误形状、date/decimal/null/缺省与未知字段样本                   |
| PostgreSQL   | 真实事务/约束/回滚与并发测试，至少覆盖认证持久化、最小审计和撤销                             |
| 认证         | Cookie、CSRF、当前会话、过期/撤销/停用、权限any/all/default deny、旧新双向session/密文       |
| Harness      | 同一场景选择Nest/Rust；外部目标模式不自动执行本机Node seed或启动错误后端；Nest已有用例不退化 |
| 生成客户端   | Linux入口输出与当前规范化规则一致；不能只比较生成器exit code                                 |
| 浏览器       | 原Angular连接Rust已实现认证路径；真实Cookie与跳转；未实现业务不冒充全量通过                  |
| Drift/Review | 每项差异分类；非作者代理审查；主代理执行合并后检查                                           |

修改到有lint target的TypeScript工程必须运行对应lint并记录warning；Rust-only规则使用fmt/clippy。Markdown与diff检查仍是共同要求。性能测试不属于本阶段前置条件。

## 7. 放行前缺项与结论

R0E 已完成固定构建环境、依赖锁定与 PG15 隔离库的合成验证，见 [R0E 基线](rust-r0e-environment-baseline.md)。SQLx 0.9.0 实测会在 startup 发送 UTC；R1 必须在连接池每条新连接的 `after_connect` 中显式初始化 `Etc/GMT-8` 并验证，不能只对 pool 执行一次 SET。R0E probe 的 TEMP 类型映射、HTTP 响应与 ABI 通过不等于产品 schema、业务错误或认证合同通过。

R0F 的 route inventory 差异、认证与错误 golden vectors 未收口前，相关工程切片保持 `Todo`。本草案不视作用户签署的 G1。现有 PG17 开发测试库可继续用于日常开发；PG15 专用于 TEST 兼容验收，两者用途与证据分别记录。

**G1 = Pending**。例外：无。批准人/时间：未设置。具体工程开工前补齐选定子切片的逐路由、逐表与验证明细，并记录独立审查结论。
