# RUST-R0F 路由与兼容输入实施基线

**日期**：2026-10-26；**Owner**：主代理；**Issue**：[RUST-R0F #59](https://github.com/illusion-tech/poms/issues/59)；**Parent**：[RUST-R0 #58](https://github.com/illusion-tech/poms/issues/58)。

**类型**：`docs-only / process-only`，附离线样本与核验工具；**G1**：Pass，用户已授权继续本切片，具体边界如下；**G3 / G4**：Pass；交付已提交推送，生命周期记录已归档。

## 1. 范围与输入

R0A–R0E 已由提交 `08daaf45b12307bc4d53e01e509f23d265532de6` 推送到 main。产品源码基线仍为 `033aedd028fc25ea990450a7854fc92c567cfb8a`。本切片依据 [R0 基线](rust-r0-baseline.md)、[ADR-015](../../../adr/015-api-route-canonical-grammar.md)、[ADR-017](../../../adr/017-admin-web-cookie-session-auth.md)、[ADR-018](../../../adr/018-rust-backend-and-sqlx-persistence.md)、API/数据库清单及现行源码/测试，形成下游可执行的 R1 输入。

- 逐项处理 39 个缺 authoritative 记录的操作及 7 个路径参数名差异；补录文档，不更改当前运行路径、DTO、OpenAPI 或生成客户端。若发现与 Accepted ADR 不兼容的设计，显式分类并保留整改边界，不以迁移为由静默改规范。
- 固定 R1 的 7 个路由、类型、权限、响应和最小副作用；为日期、数值、Cookie、CSRF、会话、密文与错误形成可复算样本。
- 样本必须调用现有实现或验证现有固定测试输入。使用合成身份、时间、密钥和 in-memory doubles，分别记录直接实现证据与 mock 边界；不得复制算法后自证，也不得把 mock 结果说成数据库、浏览器或完整业务通过。
- 保留 Git 输入变更检查和 UTF8 CRLF→LF 规则。产品源冻结与 canonical 文档的本次审查版本分别记录；重录后逐项证明业务操作集合、DTO 与权限不变。
- 细化 R1 子切片的逐表字段、事务、配置、连接池时区、测试/生成入口和验证矩阵；建立 GitHub 状态映射，回写已交付部分的 G4 归档。

明确不做：R1 产品 Rust 实现、controller/DTO/OpenAPI/client/migration 修改、真实业务行或真实密钥读取、既有 PG17/TEST 写入、seed、远程发布、性能实测。R0E 的固定镜像、隔离 PG15 与依赖锁继续复用，不在本切片安装或替换主机数据库。

## 2. 文件所有权与协作

| Owner    | 独占范围                                                                       | 验收职责                                               |
| -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 子代理 A | canonical inventory、R0F 路由基线                                              | 39 + 7 逐项裁决、R1 路由矩阵；非作者复核认证或数据材料 |
| 子代理 B | R0F 数据/类型兼容文档、对应 fixtures 与工具                                    | 调用既有纯逻辑、固定日期/数值样本及逐表边界            |
| 子代理 C | R0F 认证/错误兼容文档、对应 fixtures 与工具                                    | 现有服务/guard/filter 的可复算样本与隔离要求           |
| 主代理   | 本基线、公共 tracker/R1 输入、inventory 工具与 JSON、公共工具入口、GitHub/归档 | 集成、源指纹、独立审查、最终检查与状态一致性           |

代理沿用计划中显式指定的 `gpt-6.1-sol` / `max`；Fast 状态仍不作为已核实事实。各代理先给出只读方案，主代理确认文件归属后开始写入，禁止跨目录覆盖其他代理产物。

## 3. 合同与一致性要求

| Concern           | SSOT 与本切片要求                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| 公共路径          | Accepted ADR 与 canonical inventory；Current Implemented Route 准确记录现行实现；不自动重命名占位符        |
| DTO / JSON / 错误 | 现有 Zod、serializer、filter/controller 的实际值；分别保留缺省、null、空值、未知字段与状态码               |
| 日期与数值        | `Asia/Hong_Kong` 业务日期、Date/string 分支、JS number/toFixed 的既有输出；Rust Decimal 不自动改变舍入规则 |
| 认证与密文        | Cookie session 与 CSRF，默认拒绝权限；固定公开测试 key/IV，禁止读真实 `.env` 或 Secret                     |
| 持久化            | 现有实体、SQL migration 与显式事务边界；本切片只冻结字段/关系，不声明完整 DDL 或并发验收已通过             |
| 环境与时区        | PG17 继续日常开发；PG15.12 为 TEST 验收目标；SQLx 每条新连接显式初始化会话时区                             |
| 历史证据          | R0E 验收快照绑定 `08daaf45` 中的文件，不把之后清单重录导致的指纹变化覆盖成历史通过                         |

## 4. 验证与放行边界

必需检查：样本生成/复算与已冻结预期匹配、拒绝错误源版本、覆盖集合核对、工具语法/lint/格式、Markdown、staged diff / 本地链接、非作者审查。涉及现行逻辑时可运行对应现有纯单测；不对无产品变更的切片强行运行迁移、全量 API E2E 或客户端生成。

R0F 的通过只表示输入可被 R1 使用。Rust 与 Nest 的双实现 HTTP/数据库/浏览器验证、真实并发、TLS、完整业务回放仍在 R1 及后续阶段。R1 总体与子切片 gate 分开记录，不能用本次样本通过替代 R1 实施验收。

**例外**：当前无。出现源契约不明或 ADR 冲突时记录具体条目与后续边界，不能虚构用户裁决。最终证据、提交和归档见第 6 节。

## 5. 交付与审查记录

| 交付      | 证据与完成边界                                                                                                                                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 路由      | [逐项裁决](rust-r0f-route-baseline.md)：39 个缺行补录为 37 个 canonical 已定、2 个 lookup 待决；7 个参数名差异保留现行实现并冻结后续域门槛；R1 的 7 操作无未决公共路径                                                                                                                                          |
| API 清单  | v3 分开校验 `033aedd0` 产品 Git 输入与 canonical normalized SHA；Windows/Linux 复算一致。291 操作的业务 payload、DTO、权限、阶段和测试线索相对 `08daaf45` 完全不变；当前 282 exact / 7 parameter difference / 2 pending / 0 missing                                                                             |
| 认证/错误 | [认证输入](rust-r0f-auth-compat-baseline.md)及[工具](../../../../tools/rust-r0f-auth-compat/README.md)：119 个现有实现样本，七组；最终 fixture SHA `a498e7098b3233878eb7ad7110927f620b3fc7d2edc811bbdc49951339b1d479`；实际保护文件读取、网络与子进程尝试计数均 0                                               |
| 数据/类型 | [数据输入](../../rust-r0f-data-compat.md)及[工具](../../../../tools/rust-r0f/data-compat/README.md)：完整日期模块、白名单原始 AST 方法、真实 Zod/枚举、原 repository SQL 录制及 10 表 121 字段；最终复算/审查见下表                                                                                             |
| R1 输入   | [实施输入](rust-r1-foundation-baseline.md)：冻结路由、字段、事务、配置、SQLx 逐连接时区、启动/退出、测试与生成入口、验收矩阵；保持工程 Todo                                                                                                                                                                     |
| 在线治理  | [#57](https://github.com/illusion-tech/poms/issues/57) → [#58](https://github.com/illusion-tech/poms/issues/58) → [#59](https://github.com/illusion-tech/poms/issues/59)；[R1 #60](https://github.com/illusion-tech/poms/issues/60) 与 [后续路由 #61](https://github.com/illusion-tech/poms/issues/61) 保持打开 |

非作者审查已发现并处理：认证样本中的撤销原因快照应使用实体 enum `account-disabled`，错误码仍为 `account_disabled`；两者不可混用。R1 数据库配置应保持当前 MikroORM 的离散值（含默认值）优先，而不是猜定 `DATABASE_URL` 优先。数据 oracle 读取的数据库清单也须单独冻结来源，防止衍生字段变化后沿用原来源标签。

2 个 lookup 是 `design-change-required`；7 个参数差异是 `existing-baseline-drift`，它们仍约束 R2/R3/R4 的对应域 G1。本次不为旧路由批准无限期 alias，不静默改产品参数，不以 R0 完成代替后续域裁决。API v3 是治理证据格式变化，不是运行时 API 变化。

## 6. 最终检查与 G3/G4

| 检查                                    | 结果                                                                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API/数据库清单                          | Pass，Windows Node 24.19.0 与 Linux Node 24.16.0、TypeScript 6.0.3；业务记录不变、数据库 v2 未改                                                         |
| 认证样本                                | Pass，主代理复算最终 119 cases；子代理 A 非作者审查来源、mock、错误/撤销原因与隔离边界                                                                   |
| 数据样本                                | Pass，76 组输入 / 243 观察值 / 10 表 121 字段；主代理复算，C 非作者审查通过；golden SHA c8c58d1e49b848dc274b5ca6d4125bd67c3c0ec3797fac7700c4b7c2bea19329 |
| 工具                                    | Pass，全部新增工具 syntax / ESLint（0 warning）/ Prettier、认证 TS noEmit；Linux 实际新增未跟踪源文件被 API guard 拒绝，合成文件已清除                   |
| Markdown / diff / links                 | Pass，交付时 19 份文档 282 个本地链接；G4 归档后 21 份文档 287 个本地链接，Markdown/diff 均无错误                                                        |
| 产品测试 / migration / OpenAPI / client | 完整产品 lint/build/E2E 与迁移/生成 N/A；两个既有纯单测 suites 共 11 tests 已运行通过。产品源、已有测试、依赖、迁移与生成契约无变更                      |
| 环境变更                                | 本 R0F 未安装依赖或改变 PG17/PG15/TEST 服务与数据；R0E 历史证据以 08daaf45 为准                                                                          |

**G3 / G4 = Pass**。交付提交为 `711e61116a7c00b0378702cabfc4e4d232beee3b`，已推送 main；本记录及路由/认证子件随 G4 移入 archive/slices。归档调整相对链接后，canonical 指纹和 API v3 清单随之重录，业务操作集合不变；没有重写历史 R0E 证据。最终归档提交由 Issue #59 的 G4 记录给出。主代理集成复算及 A/B/C 非作者交叉审查已完成，发现项均已修复并按影响重跑。R1 输入 G1 已冻结，#60 工程仍 Todo，#61 后续域裁决仍打开；Rust 产品实现不在本次执行范围。
