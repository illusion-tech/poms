# RUST-R0 迁移基线与盘点记录

**最后更新**: 2026-10-26
**Parent**: [Rust 重构计划](../../backend-rust-migration-plan.md)
**Owner**: 主代理；API / 数据 / 环境盘点由三个独立上下文子代理负责
**Slice Type**: `docs-only / process-only`；不修改产品行为
**Tracker**: [RUST-R0 及 R0A–R0F](../../rust-migration-execution-tracker.md)
**Gate Status**: R0 G3/G4 Pass；R1 G1 实施输入 Pass，R1 产品实现 Todo

## 1. 范围与可依赖边界

本轮形成可追溯的架构方向、全量静态 API/数据库清单、环境实况、兼容样本入口及后续工程输入。允许只读源码扫描、离线清单工具、文档更新和独立 Linux 源码 checkout 准备。用户随后要求对齐既有 TEST、指出本机 PostgreSQL 开发实例，并确认尚无生产部署；续查补充了 TEST 服务器和本机/TEST 数据库的只读元数据。

上述初轮盘点未执行 Rust 业务实现、数据库写入、系统依赖安装或迁移。后续用户单独授权 [R0E 环境切片](rust-r0e-environment-baseline.md)：安装 WSL 容器工具、建立 TEST 兼容构建镜像及 PG15 隔离库并验证。既有 PG17 和 TEST 仍只查元数据，不读写业务行；没有远程发布、性能实测或收益测算。R0F 续作按用户授权建立 GitHub 任务映射。没有运行的测试不标记通过；工具静态关联不等于业务覆盖。

下游可以依赖静态清单进行拆分和审查，以及 R0E 的固定环境与合成类型/约束验证。后者不是完整产品 schema、认证或业务兼容证据。R0F 进一步冻结 R1 所需路由、字段和离线样本，仍不表示 Rust 已实现或可承接正式流量。

## 2. 输入与来源

| 输入           | 固定来源                                                                                                                               | 本轮结论                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 代码           | `033aedd028fc25ea990450a7854fc92c567cfb8a`；开始时 Windows main 干净                                                                   | 清单的代码基线；之后修改限本轮文档/离线工具                       |
| 目标与阶段     | [Rust 重构计划](../../backend-rust-migration-plan.md)                                                                                  | 用户已确定 Rust、WSL 开发、对齐 TEST、无生产部署与无性能前置门槛  |
| 架构与持久化   | [ADR-012](../../../adr/012-data-persistence-technology-selection.md)、[ADR-018](../../../adr/018-rust-backend-and-sqlx-persistence.md) | 保留 PostgreSQL/SQL-first；Rust 使用 SQLx，旧后端继续适用 ADR-012 |
| 公共路由       | [canonical inventory](../../api-route-canonical-inventory.md)、ADR-015、controller、OpenAPI                                            | 同时记录规范与实现；差异不被自动改写                              |
| 业务/命令/读侧 | `poms-hld.md`、`interface-command-design.md`、`query-view-boundary-design.md`                                                          | 沿用既有业务与跨域边界；具体迁移输入见清单                        |
| DTO/共享值     | `libs/api/contracts`、`libs/shared/contracts`、`libs/shared/api-spec/openapi.json`                                                     | 过渡期沿用现有生成权；TS 共享值单向导出/机械校验                  |
| 物理数据       | `apps/poms-api/src/migrations`、实体与 repository、初始化脚本                                                                          | 静态源码证据；未核实完整 DDL 与实体/schema 逐项一致性             |
| 验证与发布     | API/Admin E2E、客户端生成工具、`deploy/`                                                                                               | 现有入口有平台绑定，跨平台实现属于 R1                             |

JSON 清单记录参与扫描的来源和哈希；校验命令重新生成后比较，输入变化不能沿用旧清单。`033aedd0` 之后如有产品改动，必须更新覆盖矩阵并重审受影响结论。初版原始字节指纹绑定 Windows checkout；R0E 以 `formatVersion=2` 明确只把 UTF8 文本 CRLF 规范化为 LF 后解析/散列，保留其余字符与 Git 输入检查。Windows 和独立 Linux checkout 已复算得到相同 JSON SHA-256，v1 业务集合与计数在同一换行规范化后保持一致；该修正分类为 `tool-noise`，不是产品漂移。

## 3. 盘点交付

| 责任                     | 可审查文档                                              | 机器清单 / 工具                                                                                                    | 证据性质                                  |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| API、DTO、权限、模块     | [API 契约清单](../../rust-r0-api-contract-inventory.md) | [operations JSON](../../rust-r0-api-operations.json)、[生成工具](../../../../tools/rust-r0-api-inventory.mjs)      | AST / OpenAPI / 文本关联；不是 HTTP 实测  |
| 实体、迁移、事务、类型   | [数据库清单](../../rust-r0-database-inventory.md)       | [数据库 JSON](../../rust-r0-database-inventory.json)、[生成工具](../../../../tools/rust-r0-database-inventory.mjs) | 源码静态解析；不是 migration/schema check |
| 环境、测试入口、后台任务 | [环境清单](../../rust-r0-environment-inventory.md)      | 文档内的版本命令与时点                                                                                             | WSL/本机/TEST 只读实况；未执行安装/部署   |
| 后续工程                 | [R1 实施输入](rust-r1-foundation-baseline.md)           | 本页第 6 节待办                                                                                                    | R0F 已冻结输入；Rust 产品实现尚未开始     |

复核计数为 237 paths、291 operations、585 schemas；291 操作均匹配 controller 路由。78 个实体文件内实际声明 106 张表，不能把文件数当作表数；另有 92 个迁移文件、1775 个字段、79 个 numeric 字段、43 个 `transactional` 调用点（41 个内联回调和 2 个委托包装）。这些调用点计数不等于运行时事务次数。完整操作交付阶段为 R1/R2/R3/R4/R5 = 7/108/58/90/28；部分操作依赖后续域事实才能最终验收。

## 4. 兼容合同与代表性样本

| 主题              | 兼容输入 / 代表样本                                                                                                                                          | R1 或业务阶段必须验证                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 会话 Cookie       | `auth-session-cookie.service.spec.ts`：`session-token`、01:00 至 02:00 UTC，`Max-Age=3600`、`Path=/api`、`SameSite=Lax`、`HttpOnly`；CSRF Cookie 无 HttpOnly | 创建、清除、URL 编解码、Secure 配置与超时边界；浏览器真实 Cookie 行为另验                       |
| 会话 token / CSRF | `auth-session.service.ts`：32 随机字节的 base64url token、SHA-256 hex 哈希；idle/absolute 到期使用 `<= now`                                                  | 旧后端签发新后端读取、新后端签发旧后端读取、撤销、停用、续期及 lastSeen 限流                    |
| CSRF              | `auth-csrf.guard.spec.ts`：公开 POST 仍要求 header/cookie 一致；受保护写操作再查 session-bound hash；缺 header 返回 `csrf_failed`                            | GET/HEAD/OPTIONS 与 unsafe methods、缺失/不匹配/错误会话、审计副作用；不得以 `Public` 跳过 CSRF |
| 当前会话          | `auth.controller.ts` 的 `getCurrentAuthSession` 是公开查询，缺 Cookie 返回未认证视图                                                                         | 与受保护资源的 401 分开；保持当前响应和清 Cookie 行为                                           |
| 密文              | `secret-cipher.service.ts`：`v1:iv:tag:ciphertext`，各段标准 base64，12-byte IV，AES-256-GCM；密钥源按 options / 环境优先级后 SHA-256                        | 使用仅供测试的固定 key/IV golden vector、旧新双向解密、篡改/错误 key/格式失败；不能提交真实密钥 |
| 日期              | `core/date/business-date.utils.ts` 默认 `Asia/Hong_Kong`；Date 按业务时区格式化，string 直接 `slice(0, 10)`，falsy 返回 null                                 | 跨 UTC 日界、Date/string 两种输入、空值；不能按操作系统或本次用户时区改业务日期                 |
| 金额/比例         | 数据清单中的实际 numeric 精度及 JS `Number`/`toFixed(2/4/6)` 调用；合同资金 `#formatAmount` 明确返回字符串                                                   | 0、负向调整、半分边界、较大值、税额、重算；decimal 与 JS 差异单独列样本并裁决                   |
| 错误与权限        | `PermissionsGuard` 默认拒绝；`permission_denied`、`csrf_failed`、会话错误及服务异常各有既有形状                                                              | Rust extractor/DB 错误映射不能统一成框架默认错误；逐路由断言状态码及结构                        |
| 版本与来源        | 数据清单中的 version/current/supersedes、来源 ID、部分唯一约束与事务清单                                                                                     | 并发冲突、唯一当前记录、全链回滚、外部 ID 与 UUID 区分、审计操作者和快照引用                    |
| 外部副作用        | 环境清单及服务代码：附件存储、身份提供商、组织同步、审批处理器                                                                                               | 重试/幂等/失败恢复；隔离 fake/mock 与真实服务 smoke 的证据，GET 亦不得默认只读                  |

以上为初轮源码/测试盘点；后续 R0F 执行了现有实现的认证、错误、日期和金额离线样本，详见 [R0F 基线](rust-r0f-compatibility-baseline.md)。这些结果不含真实数据库或浏览器验证。完整业务样本按 R2–R5 域切片补齐，不能用上述少量代表样本覆盖全系统。

## 5. 环境与并行约束

已创建 `/home/wangzishi/projects/poms-rust` 独立 Linux checkout，分支 `codex/rust-backend-r0`，HEAD 为 `033aedd0`，创建后工作树干净。来源为 Windows 本地 Git clone（`--no-hardlinks`），origin 指向仓库 GitHub URL；不复制 Windows `node_modules`。R0E 仅复制两个 inventory 工具与其 JSON 到该 checkout，使用固定构建镜像的 Node 24.16.0、独立安装的 TypeScript 6.0.3 复算；其 Windows 交付已随 `08daaf45` 提交；Linux checkout 保留用于复算的副本，R0F 又同步当前 canonical 与 API v3 清单，不把该 checkout 说成干净工程分支。probe、缓存和 target 位于用户级 `~/.local/share/poms-r0e`。

WSL Debian 13.7、x86_64、glibc 2.41 和现有 Rust/Cargo 1.97.1 已核实。初查 Linux Node/Deno/Java/psql 缺口及 Windows pnpm shim 问题保留于环境清单；R0E 已在独立 Debian 12 构建镜像内补齐并实际执行这些工具，不改写 WSL 全局 Node PATH。

2026-10-26 续查确认：Windows 既有 PostgreSQL 17.4 开发实例正在运行，`127.0.0.1:5432` 的 `poms` 库使用 UTF8、libc `zh-CN`，本次会话时区为 `Asia/Shanghai`。TEST 应用服务器为 Debian 12 / x86_64 / glibc 2.36，TEST 数据库为 PostgreSQL 15.12，UTF8、libc `en_US.UTF-8`，本次会话时区为 `Etc/GMT-8`。两库均已安装 `pgcrypto 1.3` 和 `btree_gist 1.7`，各有 107 张 `poms` schema 表；计数不是完整结构或迁移一致性认证，不能与源码的 106 张实体表直接作等价判断。会话时区不证明数据库/服务器默认值。

用户确认尚未部署生产环境，当前兼容目标先对齐 TEST。R0E 选择 Debian 12 / glibc 2.36 兼容构建环境，并准备与 TEST PostgreSQL 15.12、扩展、locale 和会话配置对齐的隔离验收库；本机 WSL glibc 2.41 与 PG17 结果均不能替代该证据。保留既有开发库，不自动 reset/seed；旧新后端使用独立同源数据，禁止对 TEST 原库重放。ADR-012 的 PostgreSQL 16+ 与现场差异记为 `DB-D07`，由 ADR-018 明确此次兼容方向，不改写历史 ADR、不变更既有数据库版本。未来 PROD 首次部署前重新核实目标，不把未部署的 PROD 列为当前 R0/R1 额外阻断。

代理按迁移计划配置：子代理创建时显式使用 `gpt-6.1-sol` / `max`，Fast 未核实；主代理 Astra / Ultra / 普通模式为用户目标配置，未通过工具更改应用设置。R0 各代理独占交付文件，主代理集成公共文档与检查。

## 6. Drift、缺口与放行条件

| ID     | 分类 / 状态               | 事实与影响                                                                                                                                                                                                                                    | 收口责任 / 时点                                                                                          |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| R0-D01 | `existing-baseline-drift` | 初查 39 个缺行已补录：37 个 canonical 冻结、2 个 lookup 明确待决                                                                                                                                                                              | R1 七路由已冻结；2 个 lookup 由 [#61](https://github.com/illusion-tech/poms/issues/61) 阻断 R3/R4 对应域 |
| R0-D02 | `existing-baseline-drift` | 7 个操作只在路径参数名上与 inventory 不同；运行契约与规范分别保留                                                                                                                                                                             | R0F 保留现行运行参数并冻结 7 项规范差异；整改在 R2/R4 对应域，禁止无声改名                               |
| R0-E01 | 环境验证 Pass             | 镜像内工具、固定 toolchain/crate/features/lock、fmt/clippy/build 和跨平台清单复算通过                                                                                                                                                         | R1 复用固定输入并完成产品启动器、生成入口与浏览器依赖                                                    |
| R0-E02 | 隔离环境验证 Pass         | 两个 PG15.12 库的角色、locale、时区、合成约束、SQLx 类型及重启持久性通过                                                                                                                                                                      | 产品 schema、迁移链和完整业务约束仍待 R1/R2–R5                                                           |
| R0-E03 | 依赖构建验证 Pass         | Debian12/x86_64/glibc2.36 编译及纯运行镜像通过；probe 最高所需 GLIBC 2.34                                                                                                                                                                     | R6 对实际产品 binary 重新验收，未来 PROD 部署前另验                                                      |
| R0-C01 | R1 输入已冻结             | R0F 形成现行实现的日期/数值/认证/错误/密文样本与逐表输入；尚无 Rust 双实现验收                                                                                                                                                                | R1 消费冻结样本并补真实集成；R2–R5 在自身 G1 补足域样本                                                  |
| R0-C02 | 现有启动约束              | E2E 硬编码 Nest 构建/启动，浏览器 Nx target 绑定 Node seed，生成器含 Windows 命令                                                                                                                                                             | R1 跨平台切片实现并运行两种目标；不伪报当前可用                                                          |
| R0-G01 | 在线映射已建立            | [#57](https://github.com/illusion-tech/poms/issues/57) 总体、[#58](https://github.com/illusion-tech/poms/issues/58) R0、[#59](https://github.com/illusion-tech/poms/issues/59) R0F、[#60](https://github.com/illusion-tech/poms/issues/60) R1 | R0A–E 已推送 08daaf45；R0F G4 随最终交付同步                                                             |

这不是对缺口的豁免。R0A–R0D 的静态成果可以先独立审查，R0 全阶段与 R1 工程放行仍须满足对应输入。新路由或改变公共 surface 的工程必须先有 authoritative 行；仅补清单不能等同运行兼容。

数据库盘点列出 `DB-D01` 至 `DB-D07`：金额精度、替代链命名、仅生成标识而未物化的应收计划、可配置 schema 与固定 `poms` 的不一致、扩展文档遗漏、跨域意图与实际显式事务边界差异，以及 PostgreSQL 设计 16+ 与 TEST 15.12 的差异。逐项处置见[数据库清单第 9 节](../../rust-r0-database-inventory.md#9-既有差异与本轮处置)，均保留为既有差异，未因本轮重构计划自动获得业务修复或数据库升级授权。

## 7. 校验与本地 checkpoint

| Check                    | 要求                                                             | 当前结果                                                    |
| ------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| 清单复算                 | 两个 `node tools/rust-r0-*-inventory.mjs --check` 与语法检查     | v2 在 Windows 和独立 Linux checkout 通过且指纹相同          |
| 离线工具 lint / 格式     | `pnpm exec eslint` 与 `pnpm exec prettier --check`，仅两个新工具 | 已运行通过，ESLint 无 warning                               |
| Markdown                 | `pnpm run format:md:check`                                       | 已运行通过                                                  |
| Diff / 链接              | `git diff --check`、新增文档本地链接解析                         | 已运行通过；8 份文档本地链接检查无缺失                      |
| 独立审查                 | 非作者代理审查清单、脚本、ADR、边界与 gate                       | 已完成本轮静态交付审查，发现项已处理，运行验证仍待后续      |
| 产品 lint/build/unit/E2E | 本轮产品代码与契约未改                                           | N/A；未运行，不宣称历史测试仍全部通过                       |
| 环境只读续查             | TEST 主机、本机及 TEST 数据库元数据；只读事务、未读取业务行      | 已完成；参数详见环境清单，未写数据库                        |
| migration / 生成客户端   | 本轮无 schema 或生成契约变更                                     | N/A；未执行 migration/schema check、未重生成 OpenAPI/client |
| 性能                     | 用户排除前置性能实测                                             | 不安排                                                      |

独立审查分工：子代理 A 审查 ADR/R1 边界及 B 的数据库清单；子代理 C 审查 A 的 API 清单并交叉抽查数据库；主代理检查环境来源、公共文档与集成结果。数据库字段/迁移方向采用独立 AST 逐项核验，API 使用独立 OpenAPI 集合/源码指针核验。已修正 R1/R2 归属、现有 health 路由遗漏、基线标识、工具路径、旧提交标签误用及内联 DTO 来源信息；跨平台换行指纹问题在 R0E 以 v2 规则收口。

R0E 历史 v2 快照：API JSON SHA-256 为 `a044a5c9b0ecbd9dd0f28c92fd6e7237bf69645c2160c73c295e363e0d756fac`；数据库 JSON SHA-256 为 `4796b8a0eca31f6d59e7d36d3de5a2653ab2ab4dc5d818346c0ebe3de965cbc3`。初轮 v1 的对应指纹为 `9c8888db7208be7613872124b51eafd7e178de409b9ff7b533f6c81ee1f2ebc7` / `6d8d91d8943bc94963ac4213716efbbcac8dbfbc539712bc3c1aeecde6a245e3`，用于规范化前后对照，不再作为当前输出值。`apps/`、`libs/`、`deploy/`、`package.json` 与 `pnpm-lock.yaml` 相对输入基线无 diff。

R0F API v3 将产品 Git 输入与已审查 canonical 文档指纹分开冻结；当前 API JSON SHA-256 为 `3d126e07d5abf2c56f41c35fc25b78a13dbe094450b470e8bb4c950ce8a2986c`。291 个操作的业务 payload、DTO、权限、阶段与测试线索相对 `08daaf45` 均不变；Windows/Linux 复算一致。当前为 282 exact、7 参数名差异、2 canonical 待决、0 缺行；数据库 v2 JSON 未改。

**R0A–R0E G4**: 已提交推送 `08daaf45`，R0E 记录已归档。**R0F G4**: 已交付推送 `711e61116a7c00b0378702cabfc4e4d232beee3b` 并归档，见独立基线与 Issue #59。**R0 全阶段**: Done（输入准备）；**R1**: G1 输入 Pass、实施 Todo。本轮不启动业务实现。
