# Rust 后端迁移执行追踪

**最后更新**: 2026-10-26
**父范围**: [Rust 重构计划](backend-rust-migration-plan.md)
**当前状态**: `RUST-R0` 已交付；R1 Doing，R1A #62 G4 Done（51572db5）；R1B #63、R1C #64 Done，R1D/E Todo
**执行模式**: R0 main-only；R1A/B/C 独立 managed worktree + Linux checkout，按 solo worktree checkpoint 集成

## 1. 状态与在线映射

2026-10-26 初查尚无 Rust 任务；R0F 按用户授权建立 [总体 #57](https://github.com/illusion-tech/poms/issues/57) → [R0 #58](https://github.com/illusion-tech/poms/issues/58) → [R0F #59](https://github.com/illusion-tech/poms/issues/59) 原生父子关系。[R1 #60](https://github.com/illusion-tech/poms/issues/60) 已进入 Doing，其 [R1A #62](https://github.com/illusion-tech/poms/issues/62) 已交付并[归档工程基线](archive/slices/rust-r1a-application-baseline.md)；[lookup 裁决 #61](https://github.com/illusion-tech/poms/issues/61) 保持 Todo。GitHub 拥有任务状态，本页保留输入与映射。

`Todo` 表示工程尚未开始（输入可能已冻结）；`Doing` 表示已授权的盘点/准备正在进行。未提交、未完成 G4 的成果不标记 `Done`。父阶段完成需要全部验收条件满足，不能由单个子任务推导。

## 2. R0 任务

| Task ID    | Owner      | 范围与交付                                                                            | 依赖                             | 状态 | 当前 gate / 下一步                                                                 |
| ---------- | ---------- | ------------------------------------------------------------------------------------- | -------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| `RUST-R0`  | 主代理     | 架构、契约、数据、环境和 R1 输入基线                                                  | 用户授权、迁移计划               | Done | G4 已交付；R1 输入冻结；当前 R1A 已交付；长期待决域仍受 #61 约束                   |
| `RUST-R0A` | 子代理 A   | [API 清单](rust-r0-api-contract-inventory.md)、operations JSON、离线校验工具          | `033aedd0` 源码与契约            | Done | G3/G4 已交付并推送 08daaf45；长期清单继续作为 R0F/R1 输入                          |
| `RUST-R0B` | 子代理 B   | [数据清单](rust-r0-database-inventory.md)、JSON、离线校验工具                         | 同一源码与历史 migration         | Done | G3/G4 已交付并推送 08daaf45；长期清单继续作为 R0F/R1 输入                          |
| `RUST-R0C` | 子代理 C   | [环境清单](rust-r0-environment-inventory.md)、非 HTTP 任务、跨平台方案                | 同一源码、WSL/本机/TEST 只读信息 | Done | G3/G4 已交付并推送 08daaf45；长期清单继续作为 R0F/R1 输入                          |
| `RUST-R0D` | 主代理     | ADR-018、[R0 基线](archive/slices/rust-r0-baseline.md)、R1 基线草案、集成校验         | R0A–R0C                          | Done | G3/G4 已交付并推送 08daaf45；长期清单继续作为 R0F/R1 输入                          |
| `RUST-R0E` | 主代理统筹 | Linux 工具链补齐、依赖版本/features/MSRV/lock 编译验证、TEST 兼容构建与隔离 PG15 配置 | R0C 的环境方案                   | Done | G3/G4 已交付 08daaf45；[环境归档](archive/slices/rust-r0e-environment-baseline.md) |
| `RUST-R0F` | 主代理统筹 | 未决兼容样本/路由 drift 处理，R1 G1 冻结及后续 Issue 映射                             | R0A–R0E                          | Done | G3/G4 已交付 711e6111，记录已归档；R1 #60 Doing，后续域裁决 #61 打开               |

## 3. 后续阶段输入与完成边界

| 阶段 | 状态  | 必需输入                                         | 交付边界                                                                |
| ---- | ----- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| R1   | Doing | R0 完整基线、依赖锁定、隔离数据库与认证/错误合同 | R1A #62 工程/SQLx 已交付；R1B #63、R1C #64 Done，D/E Todo；父阶段未完成 |
| R2   | Todo  | R1 基础、平台/审批/附件/外部副作用清单           | 公共能力，业务审批处理器随各域交付                                      |
| R3   | Todo  | R2、客户/线索/项目/签约前合同与事务边界          | 客户销售到签约前闭环                                                    |
| R4   | Todo  | R3、合同/资金/成本/移交版本及并发矩阵            | 合同至执行与经营事实源                                                  |
| R5   | Todo  | R4、提成金额样本/冻结/调整/结算矩阵              | 提成业务全链路                                                          |
| R6   | Todo  | R5、目标 Linux/PG 实况、迁移接管与单实例设计     | 空库/存量/回滚/真实集成演练                                             |
| R7   | Todo  | R6 通过、完整版本冻结、切换授权与窗口            | 统一切换、观察、旧运行时退出                                            |

| R1 子切片 | 状态 | Gate / 交付                                                                   |
| --------- | ---- | ----------------------------------------------------------------------------- |
| R1A #62   | Done | G4；51572db5 已推送，工程/SQLx/三 GET/启停与固定环境验收记录已归档            |
| R1B #63   | Done | G4；5cc44100 已推送，单向共享类型与兼容验收记录已归档                         |
| R1C #64   | Done | G4；69ab8ac8 已推送，认证/会话/Cookie/CSRF/权限与密文及隔离PG15验收记录已归档 |
| R1D       | Todo | 通用双后端 E2E/客户端生成，依赖 R1A                                           |
| R1E       | Todo | 父阶段集成、浏览器与最终验收，依赖 R1A–D                                      |

同一阶段可拆分多个工程切片；具体 G1 必须列路由、业务、DTO、权限、表、事务、测试和不做内容。阶段分工不授予正式写入权或远程发布权限。

用户确认尚未部署生产环境，当前对齐 TEST Debian 12 / x86_64 / glibc 2.36 与 PostgreSQL 15.12。未来 PROD 首次部署前核实目标；其尚未部署不阻断当前 R0/R1 准备。现有 PG17.4 开发测试库可继续日常使用，PG15 隔离库专用于 TEST 兼容验收。R0E 的 SQLx/TEMP 约束通过不等于完整 migration/schema 或业务行为验证。

## 4. 本轮证据入口

- [R0 实施基线](archive/slices/rust-r0-baseline.md)：输入、SSOT、缺口、验证记录与 gate 结论。
- [R0E 环境基线](archive/slices/rust-r0e-environment-baseline.md)：构建/数据库实况、验收、保留 PG17 与 R1 输入；[工具入口](../../tools/rust-r0e/README.md)。
- [R1 实施输入](rust-r1-foundation-baseline.md)：逐路由、字段、配置、测试入口与验收要求；[R1A 工程基线](archive/slices/rust-r1a-application-baseline.md)提供已交付 R1A 的工程证据。
- [ADR-018](../adr/018-rust-backend-and-sqlx-persistence.md)：Rust/SQLx 目标方向与旧 ADR 的适用边界。
- R0A–E 已提交推送 `08daaf45b12307bc4d53e01e509f23d265532de6`；R0F 已交付推送 `711e61116a7c00b0378702cabfc4e4d232beee3b`，G3/G4 与归档见 [实施基线](archive/slices/rust-r0f-compatibility-baseline.md)。

- R1A 实现已交付推送 `51572db51419d4ef58bc173e69163dc94f616de9`；[归档](archive/slices/rust-r1a-application-baseline.md)与[机器验收记录](rust-r1a-validation.json)保留 37 项非 DB 测试、8 项真实 PG15 测试和 78 项进程断言的实际边界。

- [R1B #63](https://github.com/illusion-tech/poms/issues/63) 已完成 G4（实现 `5cc44100928c8f5045df12aebc4137460b5fb608`）；[工程基线](archive/slices/rust-r1b-shared-types-baseline.md)冻结单向导出、标量/JSON/权限兼容及验收边界。

- [R1C #64](https://github.com/illusion-tech/poms/issues/64) 已完成 G4（实现 `69ab8ac8d9105eecc1d7bc2589570d9825d25664`）；[基线](archive/slices/rust-r1c-auth-session-baseline.md)、[纠偏记录](archive/slices/rust-r1c-corrective-checkpoint.md)及[机器验收](rust-r1c-validation.json)绑定 Rust1.99.1、81 普通 tests、20 真实 DB tests、29×2 HTTP 场景/558断言和78进程断言；R1D/E继续Todo。
