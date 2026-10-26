# RUST-R1 应用与兼容基础实施输入

**最后更新**: 2026-10-26
**Gate Status**: `Pass`（实施输入）；R1A #62 G3/G4 已交付；R1B #63、R1C #64 Done，R1D #65 Doing，R1E Todo，父阶段未完成
**Parent / Owner**: [RUST-R1 #60](https://github.com/illusion-tech/poms/issues/60) / 主代理；总体 [#57](https://github.com/illusion-tech/poms/issues/57)
**Slice Type**: `cross-layer-high-risk`，本文件定义 R1 工程边界与验收输入
**正式前置**: [R0 基线](archive/slices/rust-r0-baseline.md)与[执行追踪](rust-migration-execution-tracker.md)
**G1 Reviewer / Date**: 主代理集成、非作者代理审查 / 2026-10-26；结论见第 9 节

## 1. 范围与明确不做

R1 交付一个可在已准备的 WSL 环境启停的 Rust 应用、配置/日志/错误层、SQLx 连接和事务基础、Cookie 会话/CSRF/权限/敏感字段/密文兼容，以及同一契约测试可选择 Nest/Rust 的执行入口。

R1 不交付完整平台治理、真实外部身份/组织同步、附件写入、审批业务处理器、客户项目合同资金成本提成、迁移接管或正式部署。为认证必需的账户/角色/组织读取和最小审计写入可纳入窄边界；完整平台写接口属于 R2。尚未实现的路由不可用伪造成功响应冒充覆盖。

## 2. 子切片与依赖

| 子切片 | 内容                                                                | 前置与完成边界                                                           |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| R1A    | Rust 工程、固定工具链与锁文件、配置、日志、启停、SQLx、错误协议     | R0E/F 已冻结；fmt/clippy/test/build；真实隔离 PG连接、取消/超时/回滚行为 |
| R1B    | 共享类型导出、日期/decimal/ID/状态/权限、HTTP序列化映射             | R1A + 类型矩阵；逐字段兼容样本，不新建第二套权威枚举                     |
| R1C    | 账户读取、session store、Cookie、CSRF、默认拒绝权限、敏感字段、密文 | R1A/B + 认证/最小审计数据边界；新旧双向会话/密文与真实DB负面场景         |
| R1D    | 外部目标 API E2E、Linux 浏览器启动、跨平台客户端生成                | R1A；Nest 既有用例回归 + Rust已实现子集；生成产物一致                    |
| R1E    | 基础集成验收与独立审查                                              | R1A–D；不以子集通过标全量 Rust API完成                                   |

R1A 在 [#62](https://github.com/illusion-tech/poms/issues/62) 与[工程基线](archive/slices/rust-r1a-application-baseline.md)中已完成 `G4 / Done`（51572db5）；R1B [#63](https://github.com/illusion-tech/poms/issues/63) 已完成 G4（5cc44100），R1C [#64](https://github.com/illusion-tech/poms/issues/64) 已完成 G4（69ab8ac8），R1D #65 Doing，R1E 保持 Todo。工程顺序及依赖按本表执行，不能跳过各切片 G3/G4，或启动下游未满足依赖的任务。

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

R1 兼容实现现有 `GET /api/health`、`GET /api/health/readiness` 和 `GET /api`，保留状态码、payload 与实际依赖探测语义。7 个操作的完整矩阵与逐项来源由 [R0F 路由基线](archive/slices/rust-r0f-route-baseline.md)冻结；R1 不新增公共路径。另有两个业务号 lookup 的 canonical 待决项只阻断 R3/R4 对应域，不扩展 R1 范围。

## 5. 持久化与副作用

R1C 的逐表字段、关系与写入边界由 [R0F 数据兼容输入](rust-r0f-data-compat.md)冻结，不顺带实现整个平台域。必须保持 token hash、CSRF hash、expiry/revocation、账户停用与权限变化即时性，以及 existing write/flush 的事务边界。[认证兼容输入](archive/slices/rust-r0f-auth-compat-baseline.md)中的样本仅验证已标注的现有实现分支；内存 repository double 不能作为 PostgreSQL 事务或并发通过证据。

SQLx使用显式事务和受控连接；需要真实 PostgreSQL 断言事务回滚、唯一冲突、并发续期/撤销和异常映射。不能把 pool-only 连接测试当作业务事务通过。

凭证校验沿用 `PlatformService.verifyCredentials` 的读取/停用/缺凭证处理与 `bcryptjs.compare` 的现行密码校验；R1C 必须验证已有 bcrypt hash 的 Rust 读取、错误密码和 UTF-8/长度边界。R0F controller 样本将凭证结果作为明确 mock，不宣称本次已验证实际密码库兼容。账号/密码写入管理属于 R2，不能在 R1 顺带重哈希已有用户。

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

## 7. 配置、连接与运行合同

R0E 已完成固定构建环境、依赖锁定与 PG15 隔离库的合成验证，见 [R0E 基线](archive/slices/rust-r0e-environment-baseline.md)。SQLx 0.9.0 实测会在 startup 发送 UTC；R1 必须在连接池每条新连接的 `after_connect` 中显式初始化 `Etc/GMT-8` 并验证，不能只对 pool 执行一次 SET。R0E probe 的 TEMP 类型映射、HTTP 响应与 ABI 通过不等于产品 schema、业务错误或认证合同通过。

配置的现行来源为 `apps/poms-api/src/config/environment.schema.ts`、`load-env.ts`、`main.ts` 以及 persistence/auth 服务。Rust 沿用公开配置名称和有效输入的行为；运行日志不得输出 Cookie、token、密码、完整数据库 URL 或密钥。以下是冻结的实施要求；R1A 对配置/SQLx/启停的运行证据见归档工程基线，认证运行证据见已交付的 [R1C 基线](archive/slices/rust-r1c-auth-session-baseline.md)。

| 配置/行为   | R1 冻结输入与验证要求                                                                                                                                                                                                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 环境/端口   | `NODE_ENV` 为 development/production/test，默认 development；`PORT` 默认 3333、正整数；拒绝超出实际 TCP 端口范围的运行配置。`HOST` 默认 127.0.0.1，现有 Nest main 未把它传给 listen，Rust 启动器必须显式记录最终绑定地址；该内部启动差异归 `existing-baseline-drift`，不改 Nest 公共路由                                                                  |
| CORS        | `CORS_ORIGIN` 默认 http://localhost:4200；逗号分隔、trim、去空值；禁止空集合和 `*`；credentials=true；methods GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS；headers Accept/Content-Type/X-CSRF-Token（大小写按现有常量）                                                                                                                                        |
| 会话        | idle=900s、absolute=28800s、lastSeen throttle=60s；前两项正整数，throttle 非负；Cookie Path 默认 /api；Secure 的环境推导和显式设置按 Cookie 样本                                                                                                                                                                                                          |
| 布尔输入    | 现有 Zod `z.coerce.boolean()` 对非空字符串 `"false"` 得到 true；不能默默改成严格布尔解析。R1 先保持已冻结输入行为并测试该边界，若要修正另列配置变更切片；测试启动器用确定的值或省略配置，不能依赖字面 false 关闭数据库                                                                                                                                    |
| 数据库定位  | 当前 persistence 同时传 clientUrl 与离散字段；MikroORM 对 host/port/dbName/user/password 使用离散值 `??` URL 值，而 schema 为离散字段提供默认值，因此有效离散值（含默认值）优先。Rust 保持此规则并测试合成冲突输入，不直接改为 URL 优先；DB_DATABASE → DB_NAME → poms，空白可选字符串按现行 schema 处理；R1 验收使用已标记的隔离库名称，禁止回落默认 poms |
| schema/迁移 | 产品实体和 SQL 使用固定 poms；不承诺任意 DB_SCHEMA。保留 MIGRATIONS_TABLE_NAME=poms_migrations，不启用 Rust 启动自动迁移或重复历史建库                                                                                                                                                                                                                    |
| SQLx 连接   | 每条新连接 after_connect 设置并验证 Etc/GMT-8；连接失败、pool acquire timeout、查询取消、rollback、资源释放都要真实 PG15 验证；测试控制专用 role/database，运行角色不带管理员权限                                                                                                                                                                         |
| 退出/日志   | 启动就绪前明确失败退出；SIGTERM/SIGINT 停止接收请求并等待有界的在途工作，释放连接池；结构化日志保留 request/correlation 与错误上下文，脱敏后再输出                                                                                                                                                                                                        |

不将现有开发默认密码、JWT/密钥默认值作为部署凭据。R1 的配置测试仅使用明确的合成值；本切片没有读取真实环境文件。

`SecretCipherService` 默认依次选择首个非空 `POMS_SECRET_KEY` / `JWT_SECRET`；显式 options 可替换 envKeys/defaultValue/unreadableMessage，随后对所选 UTF-8 来源做 SHA-256。R1 保留这些调用规则与 v1 格式，不自动轮换或重写旧密文；实际部署密钥与生命周期由相应环境交付处理。

## 8. 跨平台测试与生成入口

R1D 修改以下入口时，使用同一场景选择后端，测试结果必须注明目标、覆盖操作和数据库；未实现的 Rust 业务不得作为已通过或悄悄跳过已有 Nest 回归。

| 入口       | 现状与冻结的目标行为                                                                                                                                                                                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API E2E    | `apps/poms-api-e2e/src/support/server-harness.ts` 当前总是 Nx build + Node 启动 Nest，状态残留时可 killPort，readiness 仅等 TCP。R1D 提供 managed-nest / managed-rust / external 三种明确模式；external 仅访问给定 URL，不 build/spawn/seed/stop；managed 只终止本次 run-id 与 PID/start-time 匹配的进程，端口被其他进程占用则失败 |
| 就绪与隔离 | 用现有 `/api/health/readiness` 的 HTTP 状态/响应及启动器持有的进程身份核对，不能只等端口；不新增公共探针。数据准备先检查隔离标记与精确库名，同一输入分别构造 Nest/Rust 数据副本；每次运行记录清理范围，不在 external 模式隐式初始化                                                                                                |
| 浏览器     | Playwright 已接受 POMS_ADMIN_BASE_URL / POMS_API_BASE_URL，但默认 webServer 命令使用 PowerShell。用跨平台 Node 启动入口显式传 env/cwd/args；保留 localhost 的 NO_PROXY 隔离和 Angular API proxy；真实浏览器验证 Cookie/CSRF/401/403/过期/退出，外部登录 provider 留 R2                                                             |
| 客户端生成 | 沿用现有 openapi-generator 固定版本、typescript-angular.config.json、Java17 与现有规范化规则；Node 跨平台入口在每次唯一临时目录生成，校验后同步或仅 check；保留 project.json/tsconfig.json/tsconfig.lib.json，不要求 Linux 安装 PowerShell/robocopy                                                                                |
| 生成验收   | 先在 Linux/Windows 对同一已冻结 OpenAPI 生成并按既有 LF 规则逐文件比较；记录文件集合与内容差异。R1 仅实现子集时，不用子集 spec 覆盖当前完整 client；Rust 子集 operationId/schema 与现有 spec 对照由单独输出承载                                                                                                                    |

R1A 完成工程骨架后，R1B/C 与 R1D 可按独占文件并行。Cargo.toml/Cargo.lock、全局路由注册、公共配置、完整 OpenAPI/client 由主代理维护；作者之外的代理完成 G3 审查。

## 9. 输入冻结与实施状态

R0E 的固定镜像、依赖和隔离库，加上 R0F 的路由矩阵、数据字段/样本及认证/错误样本构成 R1 输入。现有 PG17 开发测试库继续日常使用；PG15 专用于 TEST 兼容验收，两者用途与证据分别记录。

R0F 只完成输入冻结；G1 输入已由 A 审查路由/工程边界、B 审查数据持久化、C 审查配置/兼容边界，主代理集成，结论 Pass（2026-10-26）。随后用户授权 R1A，#62 已交付 Rust/SQLx 基础、三 GET 与真实 HTTP/PG15/启停证据（51572db5）；工程记录已归档。R1C 后续已完成认证与会话并发的窄边界验收；完整业务并发、通用 E2E/client 和浏览器仍按第 6 节及后续切片分别验收；后续工程 Issue 开工须引用本输入并明确文件与实现范围。

R1B 已在 [#63](https://github.com/illusion-tech/poms/issues/63) 与[工程基线](archive/slices/rust-r1b-shared-types-baseline.md)完成 G4（5cc44100）；已交付类型/生成/兼容基础。R1C #64 已交付认证、会话、Cookie/CSRF、权限、密文和最小审计（69ab8ac8）；[归档基线](archive/slices/rust-r1c-auth-session-baseline.md)及[机器证据](rust-r1c-validation.json)保留实际覆盖和纠偏记录。R1D #65 Doing，R1E 保持 Todo，父阶段未完成。
