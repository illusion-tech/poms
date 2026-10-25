# RUST-R1A Rust 应用与 SQLx 基础实施基线

**日期**: 2026-10-26
**Task / Parent**: [R1A #62](https://github.com/illusion-tech/poms/issues/62) / [R1 #60](https://github.com/illusion-tech/poms/issues/60)
**Owner**: 主代理集成；A HTTP/错误，B SQLx，C 配置；非作者交叉审查
**Slice Type**: `cross-layer-high-risk`
**Gate**: G1/G3/G4 `Pass`；R1A `Done`（父 R1 仍为 Doing）
**源码起点**: `39d174aab679063e1d064002d3c5813d1935af9d`
**执行方式**: 独立 Windows managed worktree 编辑、新建 Linux checkout 构建；沿用 solo worktree checkpoint，验证后合入 main，主仓和旧 Linux R0 快照保留

## 1. 范围与交付

在 `apps/poms-api-rust/` 建独立 Cargo workspace，固定 Rust 1.97.1 与经 R0E 验证的依赖版本。交付配置加载/校验、结构化脱敏日志、HTTP 启停与错误基础、SQLx pool/transaction 基础，以及已有 root/health 三个 GET。运行命令和隔离验证工具放在该工程与 `tools/rust-r1a/`。

只使用已标记的 `poms_r0e_rust` PG15.12 隔离库和受限 `poms_r0e_app` 角色，真实 DB 测试仅创建会话级 TEMP 表和合成数据。原 Windows PG17 的服务、数据目录、开发测试库和 TEST 环境均不变。本次不执行产品 migration、seed 或重置；SQLx 测试不证明产品 106 表/92 migration 已兼容。

不含共享业务类型导出（R1B）、账户/session/CSRF/权限/密文与业务表（R1C）、通用多后端 E2E/客户端生成（R1D）、浏览器/全阶段集成（R1E）、迁移接管（R6）或部署。未实现路由返回错误，不提供假成功。

## 2. 正式输入与 SSOT

| 输入             | 规则与来源                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 冻结          | [R1 输入](../../rust-r1-foundation-baseline.md)第 2、4、6、7 节；R1A 仅消费对应边界                                                                                     |
| 架构/环境        | [ADR-018](../../../adr/018-rust-backend-and-sqlx-persistence.md)、[R0E](rust-r0e-environment-baseline.md)；Debian12/glibc2.36 构建，PG15.12 验收                        |
| route/DTO        | [canonical](../../api-route-canonical-inventory.md)、[R0F 路由](rust-r0f-route-baseline.md)第 4 节；现有 OpenAPI/controller/service                                     |
| 错误             | [R0F 认证/错误样本](rust-r0f-auth-compat-baseline.md)；基础 HttpException JSON 形状，不提前实现认证 guards                                                              |
| 配置             | `apps/poms-api/src/config/environment.schema.ts`、`load-env.ts`、`main.ts`、`app/core/persistence/persistence.config.ts`；保留非空字符串布尔 coercion、离散 DB 配置优先 |
| 日期/数值/标识符 | R1A 无业务金额/ID/状态写入；健康时间用 ISO UTC、uptime 向下取整。业务类型留 R1B                                                                                         |
| schema/迁移      | 固定产品 schema poms；本切片无产品表映射/DDL 改动，迁移权仍归 Nest；临时测试表不进入 migration 链                                                                       |

## 3. 接口与读侧边界

三项 canonical/current 路由已登记 aligned；canonical 省略 `/api`，wire path 保留前缀。不添加公共路径。

| wire path                   | operationId                     | 请求/权限      | 响应/依赖                                               |
| --------------------------- | ------------------------------- | -------------- | ------------------------------------------------------- |
| `GET /api`                  | `AppController_getData`         | 无 DTO；Public | 200 `{ "message": "Hello API" }`；无 DB                 |
| `GET /api/health`           | `HealthController_getLiveness`  | 无 DTO；Public | 200 `HealthCheckDto`；status=live，仅 process           |
| `GET /api/health/readiness` | `HealthController_getReadiness` | 无 DTO；Public | 200 ready / 503 not_ready，真实 DB 探测，必要时建立连接 |

健康字段保留 service=poms-api、checkedAt、uptimeSeconds、checks.process/database、status/message/durationMs；database 在 liveness 中省略。健康失败仍为 HealthCheckView，不改成通用错误 envelope。SQLx 与 pg 驱动错误文本并非逐字一致；敏感内容不得输出，实际差异在 G3 按 `accepted-db-specific-difference` 记录并测试结构/状态与脱敏。

基础错误模块保持 statusCode/message/error 和明确对象错误形状；只测试已冻结基础语义。未实现路由/方法不得映射成功。生成独立三操作 OpenAPI 供对照，保留现有完整规范和客户端；不宣称子集可替换 291 操作规范。

## 4. 配置、连接与生命周期

- 按 R1 输入保留公开配置名和 `.env` 选择/显式文件覆盖优先级；测试只用隔离临时文件和合成值。缺失显式文件或非法配置在监听前失败，日志不带输入值、URL、Cookie、token、密码或密钥。
- `DB_CONNECT` 保留 Nest 的启动 eager/lazy 语义；为 false 时就绪请求仍尝试真实 DB 连接。测试不依赖字面字符串 false 关闭连接。
- 有效离散字段（包括 schema 默认值）优先于 DATABASE_URL 的对应字段。DB_DATABASE → DB_NAME → poms；验收启动器另行强制显式隔离库/role/15432 和数据库标记，拒绝默认 poms/5432/管理员身份。
- 每条 SQLx 连接在 after_connect 设置并回读 Etc/GMT-8；pool 限额、acquire 和查询超时、取消和关闭有界。事务必须使用 SQLx `Transaction` 显式 commit/rollback，测试验证该路径的 drop 回滚与归池后状态。`is_in_transaction()` 只追踪 SQLx 的 transaction depth，不能检测 raw SQL `BEGIN`；受控 operation 不允许 raw BEGIN/SAVEPOINT/COMMIT/ROLLBACK。`pool()` 是低层出口，调用方负责事务/超时，不宣称任意 raw SQL 均获自动事务清理。连接日志关闭 SQL/bind 输出。
- HOST 明确绑定、超出 65535 的 PORT 拒绝属于已冻结的 `existing-baseline-drift`；不修改 Nest。新增仅运行层超时/池参数须列默认、合法边界和测试，不改公开业务合同。
- SIGTERM/SIGINT 停止接收连接，等待有界在途请求，再关闭池；超时明确失败退出。日志只记安全事件名、生成的 request/correlation id、路由模板、状态与耗时，未知路径不直接写入日志。

## 5. 文件所有权

主代理持有 Cargo.toml/Cargo.lock/rust-toolchain、lib/main/lifecycle/logging、构建/验证入口、全局路由集成及治理文档。A 持有 `src/http.rs`、`src/error.rs` 与对应 HTTP 测试；B 持有 `src/database.rs`、`tests/database.rs`；C 持有 `src/config.rs` 与配置测试。共享接口先确认，禁止并发改 manifest/lock/注册入口。G3 由非作者复核实现，再由主代理运行集成检查。

## 6. 验证与 Gate

| 检查           | 必需证据                                                                                                 | 当前结果                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 编译与静态     | 固定构建镜像；cargo fmt、clippy all-targets -D warnings、test、release --locked；版本/lock               | Pass；37 项非 DB 测试，clippy 零 warning                              |
| 配置           | 默认/非法输入、布尔兼容、DB 字段优先、显式 env/覆盖、敏感值不入错误                                      | Pass；18 项配置测试含 26 组实际 Node dotenv 17.4.2 预期               |
| HTTP/规范      | 三路径真实 HTTP 200/503 与字段，未知路径错误、CORS、request id；子集 operationId/schema 对照             | Pass；14 项 HTTP 测试；3 operationId / 3 health schema 与现有规范一致 |
| PG15           | 每条连接时区/身份、连接失败、acquire timeout、查询取消、rollback/唯一冲突与连接重用、drop/关闭无残留事务 | Pass；8 项真实 PG15 测试，另验证缺少显式 opt-in 直接失败              |
| 启停           | eager DB 失败前不监听；lazy readiness失败；SIGTERM/SIGINT 正常与有界退出、端口释放、日志脱敏             | Pass；release binary 进程验证 78 项断言，包含启动中取消与占用端口保护 |
| 治理/文档      | 非作者 review、git diff --check、Markdown、Issue 与 tracker、精确提交                                    | 非作者审查 Pass；diff/Markdown/工具 lint 通过，G4 随提交回写          |
| Nest/前端/迁移 | 源码/DDL/完整 OpenAPI/client 均未变，不运行无关 Nx 回归或 migration；R1C/D/E 另验收                      | N/A：本切片无改动                                                     |

G1 范围由用户本轮授权，正式输入已通过 R0F 审查；此处冻结工程分工和验收细化。G3 前不标实现通过。无绕过 gate 的例外；若真实 drift 超出上述已知边界，另记 corrective checkpoint。G4 需交付提交、更新在线状态并归档本生命周期文件；父 R1 保持 Doing。

### G3 checkpoint（2026-10-26）

验证来源为新 Linux checkout 中的固定 Debian12/glibc2.36 镜像，完整命令、源码/lock/binary/log SHA、依赖变化及计数见 [R1A 验收记录](../../rust-r1a-validation.json)。Rust 单元/HTTP/guard 共 37 项通过；8 项默认 ignored 的真实 DB 用例另行显式执行，全部通过，不将 ignored 算作普通测试成功。进程级 78 项是断言数，并非 78 个独立用例。

`cargo fmt --check`、`cargo clippy --locked --all-targets -- -D warnings`、`cargo test --locked`、`cargo build --locked --release` 均通过。MJS 工具通过 ESLint（零 warning）与 Prettier 检查，shell 语法检查通过。R0 API/数据库离线清单仍与 Nest 源码一致；现有 TypeScript 产品、DDL、完整 OpenAPI 与客户端均未修改，因此不重跑无关 Nx build/test/migration。R1A 用真实 release 子进程完成 HTTP/DB/启停集成；通用双后端 E2E 与浏览器合同仍留 R1D/E。

审查分工：A 非作者审查 SQLx 与真实 DB 测试；B 非作者审查配置，并调用已安装 Node dotenv 独立核对 26 组预期；C 非作者审查 main/lifecycle/OpenAPI 比较工具。发现的配置扫描、规范元信息过滤/security 继承及启动取消问题均已修复后复核，最终无未解决实质问题。事务边界按下节明确限定；没有提高运行角色权限或给 app 授予 marker 读取权限。

PG17 仅只读核对服务/进程：`postgresql-x64-17` Running/Auto、服务 PID 6996，server PID 8636，CreationDate `2026-10-23T20:59:34.366669+09:00`；本轮未连接、迁移、seed、reset 或重启该实例。TEST 无写入或发布。固定 PG15 的原 marker 在只读事务核对后才允许 TEMP 测试。

G3 结论：允许通过 solo worktree checkpoint 提交并合入 main；G4 完成前不将 R1A 标为 Done。R1 父任务不能关闭，R1B/C/D/E 仍未交付。

### 已知差异与审查处置

- `existing-baseline-drift`：HOST 明确绑定、端口上限、只接受固定 poms schema，以及所选 env 文件不可读时明确失败。后者替代现有 Node 对 dotenv 读取错误未检查的启动行为；有效配置的选择/覆盖和字符串行为保持兼容。
- `accepted-db-specific-difference`：SQLx 健康失败使用固定脱敏文本，不承诺与 Node pg 底层错误逐字一致；状态和 HealthCheckView 形状保持一致，日志只保留安全错误类别/SQLSTATE。
- 事务合同明确为 SQLx Transaction。非作者审查核实了 SQLx 0.9 的 depth 限制，R1A 当前受控生产操作仅 SELECT 1；任意 raw transaction 控制不是本次交付能力。未通过隐式 rollback 改写成功操作语义。
- OpenAPI 比较仅忽略对应 schema/response 节点的描述元信息和 required/enum 排序；同名真实字段及 default/example 值必须保留，公共操作的顶层 security 继承必须参与比较。

## 7. G4 交付记录

实现提交 [`51572db51419d4ef58bc173e69163dc94f616de9`](https://github.com/illusion-tech/poms/commit/51572db51419d4ef58bc173e69163dc94f616de9) 已 fast-forward 合入并推送 main。本文件移入 archive/slices，索引与 R1 输入引用随归档提交同步。G3 记录见 [Issue comment](https://github.com/illusion-tech/poms/issues/62#issuecomment-6404091450)；最终 G4 与 checklist 由 [#62](https://github.com/illusion-tech/poms/issues/62) 承载。

R1A 可供下游依赖：工程/配置/日志/启停、SQLx 基础、三 GET 及验收入口已交付。R1B 与 R1D 可按冻结依赖分别开工；R1C 仍须等待 R1B 类型输入。此处不授权或宣称后续切片已经实施。[R1 #60](https://github.com/illusion-tech/poms/issues/60) 保持 Doing，B–E 为 Todo，总体 #57 不关闭。

原 PG17 实例及数据保留；Linux R1A checkout、固定环境和本地构建/日志保留供复跑。当前产品认证、106 表/92 migration 全量兼容、浏览器与 TEST 发布均未认证。归档仅变更文档与引用，复核 Markdown、diff、本地链接及实现源码指纹，不重复数据库操作。
