# ADR-018: Rust 后端与 SQLx 持久化演进

**状态**: 已接受 (Accepted)，目标架构方向；工程放行以各切片 G1/G3 为准
**日期**: 2026-10-26
**依据**: 用户已确定后端迁移到 Rust，要求不做前置性能实测，并授权推进 R0
**关联**: [迁移计划](../design/backend-rust-migration-plan.md)、[R0 基线](../design/archive/slices/rust-r0-baseline.md)、[ADR-012](012-data-persistence-technology-selection.md)

## 1. 背景与适用范围

现有后端采用 NestJS、MikroORM 与 PostgreSQL，Angular 通过生成客户端消费 OpenAPI。项目已具备审批、合同、资金、成本、移交、提成、附件、外部身份与平台治理等跨模块流程。用户确定以 Rust 作为最终后端运行时；本决策落实该方向，不以性能 PoC 或节省比例决定是否迁移。

本 ADR 以 `033aedd028fc25ea990450a7854fc92c567cfb8a` 为盘点输入。目标架构方向已确定，不代表 Rust 代码、依赖兼容、数据接管或生产切换已经通过验收。

ADR-012 继续约束当前运行的 NestJS/MikroORM 后端及其历史迁移。本 ADR 在 Rust 迁移范围内演进应用数据访问技术，不推翻 PostgreSQL、SQL-first、约束可审阅和禁止自动 schema 同步等决定。旧 ADR 的历史内容保持原样。

## 2. 决策

1. 采用 Rust 模块化单体，HTTP 层为 Axum，异步执行为 Tokio，通用中间件为 Tower。模块边界继承当前业务责任，不引入微服务或跨后端远程事务。
2. PostgreSQL 继续作为权威持久层；Rust 使用 SQLx、显式 SQL、显式事务与可审阅映射。保留现有物理表、主外键、约束、索引和数据语义，避免同时改变语言与业务数据模型。
3. Serde 负责 JSON 映射；Utoipa 为 Rust OpenAPI 的候选实现入口。迁移期间现有 TypeScript/Zod/Swagger 生成链仍拥有契约生成权，Rust 输出与已冻结规范作兼容核对；全量覆盖通过后单独交接生成权。
4. 金额与比例在领域层采用十进制定点类型，优先验证 `rust_decimal`。线上 HTTP 金额表示、持久化精度及既有计算结果仍须兼容。当前 JS 浮点舍入与定点舍入不一致的样本逐项裁决，不在重构中默认为业务修正。
5. SQLx 数据访问需要显式复制 MikroORM 当前承担的事务传递、并发版本检查、更新时间、关联加载/写入、唯一冲突映射和回滚语义。源码盘点只是输入；真实 PostgreSQL 用例才是行为证据。
6. 认证继续遵循 ADR-017：服务端 Cookie 会话、CSRF 与后端默认拒绝权限控制。保留旧会话、密码哈希、敏感字段投影与 `v1` 密文格式的双向兼容要求。
7. 业务模块在隔离环境分阶段实现，最终统一切换完整 API upstream。正式流量、定时任务及外部写入始终只有一个活动后端；不长期按路由拆分 Node/Rust 的写入职责。
8. R1–R5 期间 schema 继续由既有迁移入口管理。R6 验证 SQL baseline、空库初始化、存量结构校验和迁移登记后，一次性交接给 Rust/SQL 执行器；不得对存量库重放建表 baseline。

## 3. 契约与类型的权威来源

- 公共路由的规范来源为 ADR-015 与 canonical inventory；真实运行接口另由 controller 与 OpenAPI 记录。发现二者不一致时保留两个事实并分类 drift，不自动把 canonical 路径用于 Rust。
- 现有 OpenAPI 是迁移的兼容输入，不能单独证明运行时校验、错误映射或字段投影。DTO/Zod、守卫、应用服务、测试样本与数据库约束共同补充行为边界。
- 共享业务枚举与 `PERMISSION_KEYS` 暂由 `libs/shared/contracts` 维护；R1 建立单向导出/机械校验产物供 Rust 使用。新增共享值先修改同一来源，禁止 TS/Rust 双向手工维护。
- 日期、时间戳、内部 UUID、外部来源 ID、金额、比例、版本链和快照引用分别建模。不能为了 Rust 类型方便，将现有字符串金额改成 JSON number，或将业务日期统一改为 UTC 时间戳。
- Rust 的类型安全与 SQL 编译检查不能代替运行时授权、事务约束与业务规则测试。

## 4. 开发、依赖与发布边界

WSL Debian 的 Linux 文件系统承担源码、Cargo 缓存和编译输出；Windows 主工作树保持独立，通过可追溯 Git 提交同步。当前安装版本仅是环境观察值。R0 环境收口须验证 crate 版本/features、Rust toolchain/MSRV、锁文件和最小依赖编译，再放行依赖它们的 R1 工程。

跨平台适配以同一逻辑为准：API E2E 支持选择服务地址和启动器；Playwright 外部服务模式不隐式启动 Node seeder；客户端生成去除 PowerShell、`java.exe`、`robocopy` 的平台绑定，规范化逻辑只维护一份。

用户确认尚未部署生产环境，当前兼容目标对齐已核实的 TEST：应用服务器 Debian 12 / x86_64 / glibc 2.36，数据库 PostgreSQL 15.12。WSL Debian 13.7 / glibc 2.41 的直接构建结果不作为 TEST 可运行证据；R0E 必须选择兼容构建环境并核验产物依赖。未来 PROD 首次部署前重新核实目标环境。

本机 Windows PostgreSQL 17.4 是既有开发实例，保留现有库和配置。R1 的隔离验收数据库对齐 TEST 15.12 及扩展、排序规则、会话时区，详见[环境清单](../design/rust-r0-environment-inventory.md)；PG17 通过不能代替 PG15 兼容证据。ADR-012 的 PostgreSQL 16+ 与现有 TEST 不符，作为 `DB-D07` 记录；本 ADR 在 Rust 迁移范围内明确以现有 TEST 兼容为约束，不改写旧 ADR，也不授权服务器升级或开发库降级。

## 5. 后果与约束

预期收益方向是降低运行开销和部署资源需求；本 ADR 不宣称尚未实测的改善比例，也不设置收益实测门槛。

显式 SQL 提高事务与数据库行为的可见性，同时需要补齐 ORM 曾隐式提供的能力。Rust 与 TypeScript 的错误、序列化、日期和舍入差异需要兼容用例。迁移期间存在维护两套实现的成本，必须靠覆盖清单和输入版本约束控制范围增长。

回滚要求旧后端能够继续读取并处理 Rust 已写的数据。回滚窗口内不进行破坏性 schema 变化、密文改版或不兼容值改义。切换后发生新写入时，恢复旧备份不能作为默认回退动作。

## 6. 验收与阶段约束

R0 提供可复查的操作、实体、迁移、事务、非 HTTP 任务与环境清单，并记录 unresolved 项。R1 冻结基础切片后实现应用、认证、错误、数据访问和验证入口；R2–R5 覆盖业务；R6 演练接管与回滚；R7 执行正式切换和退出。

每阶段沿用 G0–G4，未实现范围不得返回伪造成功响应。静态测试关联不等于覆盖通过，mock 不等于真实集成，文档形成不等于工程阶段完成。

当前已确定目标方向；具体版本锁定、环境就绪、契约差异收口及 R1 G1 仍以[R0 基线](../design/archive/slices/rust-r0-baseline.md)中的证据为准。
