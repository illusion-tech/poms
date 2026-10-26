# RUST-R1C 认证、会话与密文兼容实施基线

**日期**: 2026-10-26
**Task / Parent**: [R1C #64](https://github.com/illusion-tech/poms/issues/64) / [R1 #60](https://github.com/illusion-tech/poms/issues/60)
**Slice Type**: `cross-layer-high-risk`
**Owner**: 主代理集成；A HTTP/Cookie/CSRF/权限，B 持久化/会话/最小审计，C 密码/密文；非作者交叉审查
**Gate**: G1/G3 `Pass`；G4 Pending，R1C Doing
**起点**: `1013afef266602e7c98eb433bd0f14483be3d7fd`；独立 managed worktree 与 Linux checkout；solo worktree checkpoint

## 1. 范围与正式输入

用户授权将 Rust 升至最新 stable，并按已冻结输入交付 R1C；在隔离 PG15 验证，保留原 PG17 实例和数据。正式输入为 [R1 基线](rust-r1-foundation-baseline.md)、[R0F 路由](archive/slices/rust-r0f-route-baseline.md)、[数据/121 字段](rust-r0f-data-compat.md)、[认证兼容](archive/slices/rust-r0f-auth-compat-baseline.md)、ADR-017/018，以及这些基线绑定的现有 TypeScript、完整 OpenAPI 和 119 个认证样本。

本切片完成四个认证操作、会话及为其必需的账户/凭证/角色/组织读取、最小审计、Cookie/CSRF/default-deny/敏感字段投影、bcrypt 和 v1 密文。R1A 三 GET 回归，共七个已冻结操作。不实现完整平台写入、真实外部 provider、业务域、通用 E2E/client 入口（R1D）、真实浏览器综合验收（R1E）、SQL migration 接管（R6）或部署。

## 2. 路由与命令合同

[Canonical inventory](api-route-canonical-inventory.md) 的 Auth 四行均为 aligned；全局前缀 `/api` 保持，未增加公共路径。

| 操作                          | 访问和副作用                                                                    | 输入/输出边界                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| POST /api/auth/sessions       | Public 仍先双提交 CSRF；查账户/凭证，创建 session，再设置 Cookie 和读取 profile | username/password 非空字符串，未知字段 strip、不 trim；失败 401 invalid_credentials 并写安全事件 |
| GET /api/auth/session         | 无 Cookie 返回 200 未认证视图；有 Cookie resolve/touch                          | domain 错误清两种 Cookie 后 401；返回实际账户/权限/组织，无凭证/hash                             |
| GET /api/auth/csrf-token      | 无 Cookie 发匿名 token；有 Cookie resolve/touch 后 guarded rotate               | 匿名/有效会话的 expiry 不混淆；坏会话清两 Cookie 后 401                                          |
| POST /api/auth/session:logout | SessionAuth → CSRF → Permission；Authenticated                                  | strict 空对象；guarded revoke，清 Cookie，返回 revoked 实际结果                                  |

Cookie 名 `poms_session` / `poms_csrf`、header `X-CSRF-Token`，Path/Secure/SameSite/HttpOnly/编码/重复项/Max-Age/Expires/清除格式按原服务。登录 Cookie 使用 absolute expiry，视图用 min(idle, absolute)；刷新 CSRF Cookie 使用 min expiry。Guard 失败与 controller 失败的清 Cookie 差异保留。无 Bearer 回退。

默认拒绝、Authenticated、all/any 组合与 metadata 覆盖使用已冻结规则。持久化 raw 权限不按强枚举白名单截断；共享值继续使用 R1B 从 TypeScript 单向生成的定义。认证响应没有运行时 Zod response schema，不能臆加投影。敏感字段由明确用户摘要/领域投影处理，不能返回 credential/session hash。core SensitiveFieldProjectionService 的包权限映射、full/masked/denied、null/空串/display text 与每批一次安全事件也属于 R1C 基础；共享包映射读取 R1B 单向 manifest，由主代理持有实现与原服务 oracle，完整领域调用留对应后续阶段。

## 3. 持久化和事务

范围仍为 R0F 的 10 表 121 字段；不新增产品表/列，不执行 Rust migration。既有 Nest migration 初始化专用验证库。SQLx 显式实现 UUID/default/timestamp/null/version/JSON 及约束错误；每条连接保持 R1A Etc/GMT-8 初始化。

保留原边界：登录 create save/flush 不与后续 profile 读取构造新共同事务；touch/expire/revoke/rotate 是单条 guarded UPDATE RETURNING，审计为后续独立写入。到期为 idle 或 absolute <= now；throttle 以 floor 秒比较，touch 使用 least 和 IP coalesce；rotation 零行重读状态分类，不能复活撤销会话。账户停用与有效角色/权限变化立即体现在后续 resolve 中。最小审计保留原 event/result/details 与可空字段；审计失败不被静默吞掉。完整平台管理/审计查询归 R2。

原 SQL、实体、既有迁移与隔离实际 catalog 联合验证约束。重点真实场景包括 token 唯一/FK/部分唯一冲突、事务回滚、到期边界、并发 touch/rotate/revoke、批量撤销、账户停用、角色/权限变化及新旧后端双向读取 session；double 证据单独标注。

## 4. 密码与密文

bcryptjs 3.0.3 的 compare 是现行密码语义，验证旧 hash、错误密码、prefix/cost/坏 hash、UTF-8/72 字节截断、NUL、非 BMP 与孤立 UTF-16 surrogate。HTTP JSON 解析必须保持 JS 字符串语义，不能因 Rust String 拒绝合法 JSON escape 而静默收窄密码或已 strip 的未知字段。新 hash 仅用于合成测试，不重哈希用户凭证。

token 使用安全随机 32 bytes/base64url，落库 SHA-256 hex。v1 为 `v1:ivBase64:tagBase64:ciphertextBase64`，AES-256-GCM，key 为首个非空来源的 UTF-8 SHA-256；options/env/default/error 规则、宽松 base64、空字段及多余冒号行为按实际 Node 样本。以实际 TS 原服务和 Rust 双向验证，固定 IV 仅用于公开合成向量；运行时使用安全熵源。

## 5. 工具链与隔离环境

[Rust 官方发布记录](https://blog.rust-lang.org/2026/10/15/Rust-1.99.1/)和 stable manifest 在本轮核实为 1.99.1（2026-10-15），固定 toolchain 和 Cargo rust-version；不使用浮动 stable 标签作为可复算验收输入。新增派生 Debian12/glibc2.36 镜像，保留 R0/R1A/B 的旧镜像、锁定证据及独立缓存。既有依赖版本不自动升级，新增依赖精确固定并审阅 lock 差异。

复用经身份核验的 `poms-r0e-pg15` 容器/15432 及 PostgreSQL15.12，但新建 `poms_r1c_nest`、`poms_r1c_rust` 同源专用库，固定 `poms` schema；各有独立 `r1c_control` marker。owner 用于初始化，独立 `poms_r1c_app` 无管理员/建库/建角色/schema CREATE 权限，仅必要 DML。验证运行器拒绝任意 URL/库名/标记不匹配目标，不读取根 `.env` 或 deploy/private，不自动 reset 已有库。只创建合成测试数据；PG17/TEST/R0E 旧库数据不变。

## 6. 验证与所有权

主代理维护 Cargo/lock/toolchain、模块和全局 router/AppState、构建/PG15 provision/总测试入口、治理文档与证据。A 独占 `src/auth/http.rs`、`cookie.rs`、`guards.rs`、对应 tests 与 HTTP oracle；B 独占 `src/auth/model.rs`、`store.rs`、`service.rs`、`audit.rs`、对应 DB tests 与 session 原实现桥；C 独占 `src/auth/crypto.rs`、对应 tests 与 crypto oracle。先协调公共接口，不并发写共享文件。构建和 DB 操作由主代理串行安排。

G3 必须通过精确工具链 fmt/clippy all-targets -D warnings/test/release；R1A/B 回归及旧 golden 不变；旧实现原样调用/来源保护；真实 PG15 与 HTTP Cookie/错误/副作用/并发双向证据；七操作及 schema/OpenAPI 差异；非作者审查；Markdown/diff/本轮工具 lint。Rust-only 产品不要求无关 Angular 构建，真实浏览器属于 R1E。测试程序自己的固定输入、实际 HTTP 和真实 DB 证据分别计数，不把子集通过写成全业务或父 R1 完成。

G4 需实现合入、提交推送、issue/追踪同步及生命周期归档。发现实质差异先登记 corrective checkpoint、修复并复验；当前无绕过 gate 的例外。

实施中发现的偏差、G3 阻断及修复证据另见 [R1C 纠偏 checkpoint](rust-r1c-corrective-checkpoint.md)，不改写上述 G1 正式输入。

## 7. G3 最终验收

G3 `Pass`（2026-10-26）。[机器记录](rust-r1c-validation.json)绑定 73 个最终源码/工具文件的 LF 规范化 SHA-256、release 二进制、镜像、实际日志、原始无序集合观察值和此前失败留证；Windows 提交输入与 Linux 运行输入逐文件相同。产品源码冻结后完成下列验证，后续只调整无序集合比较工具和治理文档。

| 检查                               | 实际结果                                                                                                 | 边界                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Rust1.99.1 fmt/clippy/test/release | Pass；81 普通 tests，0 failed；clippy all-targets -D warnings                                            | 普通运行的 21 ignored 中，20 个真实 DB 用例另跑；1 个退出子进程 fixture 由父测试调用，不额外计普通通过                             |
| 真实 PG15                          | Pass；11 认证/会话 + 1 投影 + 8 R1A = 20 tests                                                           | 唯一/FK/部分唯一、并发/CAS、审计失败/回滚、到期/停用、权限即时变化及原 MikroORM↔SQLx session                                       |
| 原 Nest 与 Rust 实际 HTTP          | Pass；每端 29 场景、共 558 断言                                                                          | 真实 socket/原 DTO/guards/controller/ORM 与 Rust release；Cookie、CORS、状态/版本/审计；按 CP07 限定集合比较；两库本轮数据清理通过 |
| 固定来源 oracle                    | Pass；13 Node tests；原 HTTP75、R0F119、projection19、crypto193                                          | HTTP75 的 repository 是 double；37 parser/DTO 负例和 strict surrogate 样本实际由 Rust 消费，不计真实 DB                            |
| Rust 随机密文→原 TS                | Pass；7 个实际处理结果                                                                                   | 6 项非空明文恢复，1 项空明文保持原 TS 拒绝；固定 IV 仅用于合成向量                                                                 |
| R1B 回归                           | Pass；205 families / 778 values / 455 snapshots，scalar98、JSON21 fields/11 objects/18 permissions/1 raw | 原共享权威定义与旧 golden 不变                                                                                                     |
| R1A 进程与 HTTP 回归               | Pass；78 断言                                                                                            | 实际 SIGTERM/SIGINT、启动取消、错误退出、监听释放、脱敏日志；HTML404 纠偏保留历史证据                                              |
| OpenAPI                            | Pass；7 operations、3 health schemas、10 reachable auth schemas                                          | 现有完整规范不变；递归验证认证元信息并保留3.0语义，不以元信息替代运行验证                                                          |
| 环境/目录/ABI                      | Pass；10 表121字段、两副本相同；裸 Debian12 执行 release --openapi，ldd 无缺失，最高 GLIBC_2.34          | Rust1.99.1 / Cargo1.99.1；新 lock 共254条，新增20条，原版本无升级/移除                                                             |
| 工具和文档                         | Pass；ESLint零 warnings、Prettier、工具 TypeScript noEmit、Markdown表格/链接及 git diff --check          | 最终 lint 已生成 Nx graph，无规则跳过；无关 Angular/Nest产品 build及通用E2E/client/browser不要求于本切片                           |

A 审查主代理全局 HTTP/OpenAPI/退出集成与 C 密码密文；B 审查投影及数据接口；C 审查 A 的解析/guard、B 的请求局部 flush/显式 rollback 和最终集合比较、主代理环境安全。最终无剩余 P1/P2。详细偏差及解除依据见[纠偏 checkpoint](rust-r1c-corrective-checkpoint.md)，不把测试修正覆盖为初次即通过。

原 TypeScript、完整 OpenAPI/client、共享定义、产品 migration 和 pnpm lock 相对起点未改。独立 PG15 只使用合成数据和限定 UUID 清理；Windows `postgresql-x64-17` 最终只读服务核验为 Running / Auto / PID6996，没有连接或改动其业务数据。当前没有部署，父 R1 仍为 Doing。

## 8. G4 交付状态

等待实现提交合入 main、推送与 issue/文档归档；仅在这些步骤完成后标记 R1C Done。R1D/E 不属于本次交付。
