# Rust 后端迁移执行追踪

**最后更新**: 2026-10-26
**父范围**: [Rust 重构计划](backend-rust-migration-plan.md)
**当前状态**: `RUST-R0` / R1 已交付并完成 G4；R2 #67 Doing，108 操作已拆片，首片 R2A #68 Done / G4；#57 与 R2–R7 未完成
**执行模式**: R0 main-only；R1A–E / R2A 独立 managed worktree + Linux checkout，按 solo worktree checkpoint 集成

## 1. 状态与在线映射

2026-10-26 初查尚无 Rust 任务；R0F 按用户授权建立 [总体 #57](https://github.com/illusion-tech/poms/issues/57) → [R0 #58](https://github.com/illusion-tech/poms/issues/58) → [R0F #59](https://github.com/illusion-tech/poms/issues/59) 原生父子关系。[R1 #60](https://github.com/illusion-tech/poms/issues/60) 的 R1A–E 均已交付；R1E 实现 afbf4ee5 已集成推送，父阶段与子项 G4 随本归档提交及 Issue 同步生效。[lookup 裁决 #61](https://github.com/illusion-tech/poms/issues/61) 保持 Todo。GitHub 拥有任务状态，本页保留输入与映射。

`Todo` 表示工程尚未开始（输入可能已冻结）；`Doing` 表示已授权的盘点/准备正在进行。未提交、未完成 G4 的成果不标记 `Done`。父阶段完成需要全部验收条件满足，不能由单个子任务推导。

## 2. R0 任务

| Task ID    | Owner      | 范围与交付                                                                            | 依赖                             | 状态 | 当前 gate / 下一步                                                                 |
| ---------- | ---------- | ------------------------------------------------------------------------------------- | -------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| `RUST-R0`  | 主代理     | 架构、契约、数据、环境和 R1 输入基线                                                  | 用户授权、迁移计划               | Done | G4 已交付；R1 输入冻结且 R1A–E 已交付；长期待决域仍受 #61 约束                     |
| `RUST-R0A` | 子代理 A   | [API 清单](rust-r0-api-contract-inventory.md)、operations JSON、离线校验工具          | `033aedd0` 源码与契约            | Done | G3/G4 已交付并推送 08daaf45；长期清单继续作为 R0F/R1 输入                          |
| `RUST-R0B` | 子代理 B   | [数据清单](rust-r0-database-inventory.md)、JSON、离线校验工具                         | 同一源码与历史 migration         | Done | G3/G4 已交付并推送 08daaf45；长期清单继续作为 R0F/R1 输入                          |
| `RUST-R0C` | 子代理 C   | [环境清单](rust-r0-environment-inventory.md)、非 HTTP 任务、跨平台方案                | 同一源码、WSL/本机/TEST 只读信息 | Done | G3/G4 已交付并推送 08daaf45；长期清单继续作为 R0F/R1 输入                          |
| `RUST-R0D` | 主代理     | ADR-018、[R0 基线](archive/slices/rust-r0-baseline.md)、R1 基线草案、集成校验         | R0A–R0C                          | Done | G3/G4 已交付并推送 08daaf45；长期清单继续作为 R0F/R1 输入                          |
| `RUST-R0E` | 主代理统筹 | Linux 工具链补齐、依赖版本/features/MSRV/lock 编译验证、TEST 兼容构建与隔离 PG15 配置 | R0C 的环境方案                   | Done | G3/G4 已交付 08daaf45；[环境归档](archive/slices/rust-r0e-environment-baseline.md) |
| `RUST-R0F` | 主代理统筹 | 未决兼容样本/路由 drift 处理，R1 G1 冻结及后续 Issue 映射                             | R0A–R0E                          | Done | G3/G4 已交付 711e6111，记录已归档；R1A–E 已交付，后续域裁决 #61 打开               |

## 3. 后续阶段输入与完成边界

| 阶段 | 状态  | 必需输入                                                                                                | 交付边界                                                                            |
| ---- | ----- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| R1   | Done  | R0 完整基线、依赖锁定、隔离数据库与认证/错误合同                                                        | R1A–E 七操作、认证与基础已交付；G4 随本归档提交及 Issue 同步生效，不代表 R2–R7 完成 |
| R2   | Doing | R1 基础、[范围与依赖](rust-r2-scope-and-dependencies.md)、[108 操作归属](rust-r2-operation-slices.json) | #67；本轮仅首片 R2A 实施闭合，B–M 各自冻结；公共能力，业务审批处理器随各域交付      |
| R3   | Todo  | R2、客户/线索/项目/签约前合同与事务边界                                                                 | 客户销售到签约前闭环                                                                |
| R4   | Todo  | R3、合同/资金/成本/移交版本及并发矩阵                                                                   | 合同至执行与经营事实源                                                              |
| R5   | Todo  | R4、提成金额样本/冻结/调整/结算矩阵                                                                     | 提成业务全链路                                                                      |
| R6   | Todo  | R5、目标 Linux/PG 实况、迁移接管与单实例设计                                                            | 空库/存量/回滚/真实集成演练                                                         |
| R7   | Todo  | R6 通过、完整版本冻结、切换授权与窗口                                                                   | 统一切换、观察、旧运行时退出                                                        |

| R1 子切片 | 状态 | Gate / 交付                                                                                                                                                                                                                          |
| --------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1A #62   | Done | G4；51572db5 已推送，工程/SQLx/三 GET/启停与固定环境验收记录已归档                                                                                                                                                                   |
| R1B #63   | Done | G4；5cc44100 已推送，单向共享类型与兼容验收记录已归档                                                                                                                                                                                |
| R1C #64   | Done | G4；69ab8ac8 已推送，认证/会话/Cookie/CSRF/权限与密文及隔离PG15验收记录已归档                                                                                                                                                        |
| R1D #65   | Done | G4；c14333d5已推送；[归档基线](archive/slices/rust-r1d-e2e-client-baseline.md)、[纠偏](archive/slices/rust-r1d-corrective-checkpoint.md)与[机器证据](rust-r1d-validation.json)；双平台真实E2E/browser及579文件client一致             |
| R1E #66   | Done | afbf4ee5 已集成推送；[归档基线](archive/slices/rust-r1e-stage-acceptance-baseline.md)、[机器证据](rust-r1e-validation.json)；64 stage、36 legacy（11 mock）、80 run清理及集成后19项通过，C无剩余P1/P2；G4随本归档提交及Issue同步生效 |

| R2 子切片 | 状态 | Gate / 输入与边界                                                                                                                                                             |
| --------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2A #68   | Done | 实现2924bf30已推送，合入后21项适配器及98/82来源检查通过；[收口记录](archive/slices/rust-r2a-closeout.md)、[机器证据](rust-r2a-validation.json)；G4随本归档提交及Issue同步生效 |
| R2B #69   | Todo | 角色与权限 8 操作；G1 未冻结                                                                                                                                                  |
| R2C #70   | Todo | 组织 8 操作；G1 未冻结                                                                                                                                                        |
| R2D #71   | Todo | 用户、owner-reference 与 profile 11 操作；G1 未冻结                                                                                                                           |
| R2E #72   | Todo | 字典/设置 6 操作及非 HTTP 业务编号；G1 未冻结                                                                                                                                 |
| R2F #73   | Todo | 审计/安全事件 4 操作；G1 未冻结                                                                                                                                               |
| R2G #74   | Todo | 身份 provider/外部登录 16 操作；G1 未冻结                                                                                                                                     |
| R2H #75   | Todo | 外部组织同步 18 操作；G1 未冻结                                                                                                                                               |
| R2I #76   | Todo | 存储 provider 6 操作；G1 未冻结                                                                                                                                               |
| R2J #77   | Todo | 附件/上传/中心 19 操作；G1 未冻结                                                                                                                                             |
| R2K #78   | Todo | 移交附件 5 操作；G1 前由 #61 裁决参数名并落实 R4 域输入                                                                                                                       |
| R2L #79   | Todo | 审批/待办 4 操作及摘要/公共确认机制；真实 R3–R5 handler 逐域接入，G1 未冻结                                                                                                   |
| R2M #80   | Todo | R2 阶段验收，不增公共操作；A–L/跨域依赖完成后收口                                                                                                                             |

同一阶段可拆分多个工程切片；具体 G1 必须列路由、业务、DTO、权限、表、事务、测试和不做内容。阶段分工不授予正式写入权或远程发布权限。

用户确认尚未部署生产环境，当前对齐 TEST Debian 12 / x86_64 / glibc 2.36 与 PostgreSQL 15.12。未来 PROD 首次部署前核实目标；其尚未部署不阻断当前 R0/R1 准备。现有 PG17.4 开发测试库可继续日常使用，PG15 隔离库专用于 TEST 兼容验收。R0E 的 SQLx/TEMP 约束通过不等于完整 migration/schema 或业务行为验证。

## 4. 本轮证据入口

- [R0 实施基线](archive/slices/rust-r0-baseline.md)：输入、SSOT、缺口、验证记录与 gate 结论。
- [R0E 环境基线](archive/slices/rust-r0e-environment-baseline.md)：构建/数据库实况、验收、保留 PG17 与 R1 输入；[工具入口](../../tools/rust-r0e/README.md)。
- [R1 实施输入](archive/slices/rust-r1-foundation-baseline.md)：逐路由、字段、配置、测试入口与验收要求；[R1A 工程基线](archive/slices/rust-r1a-application-baseline.md)提供已交付 R1A 的工程证据。
- [ADR-018](../adr/018-rust-backend-and-sqlx-persistence.md)：Rust/SQLx 目标方向与旧 ADR 的适用边界。
- R0A–E 已提交推送 `08daaf45b12307bc4d53e01e509f23d265532de6`；R0F 已交付推送 `711e61116a7c00b0378702cabfc4e4d232beee3b`，G3/G4 与归档见 [实施基线](archive/slices/rust-r0f-compatibility-baseline.md)。

- R1A 实现已交付推送 `51572db51419d4ef58bc173e69163dc94f616de9`；[归档](archive/slices/rust-r1a-application-baseline.md)与[机器验收记录](rust-r1a-validation.json)保留 37 项非 DB 测试、8 项真实 PG15 测试和 78 项进程断言的实际边界。

- [R1B #63](https://github.com/illusion-tech/poms/issues/63) 已完成 G4（实现 `5cc44100928c8f5045df12aebc4137460b5fb608`）；[工程基线](archive/slices/rust-r1b-shared-types-baseline.md)冻结单向导出、标量/JSON/权限兼容及验收边界。

- [R1C #64](https://github.com/illusion-tech/poms/issues/64) 已完成 G4（实现 `69ab8ac8d9105eecc1d7bc2589570d9825d25664`）；[基线](archive/slices/rust-r1c-auth-session-baseline.md)、[纠偏记录](archive/slices/rust-r1c-corrective-checkpoint.md)及[机器验收](rust-r1c-validation.json)绑定 Rust1.99.1、81 普通 tests、20 真实 DB tests、29×2 HTTP 场景/558断言和78进程断言。历史证据按来源沿用，不与 R1E 新增实跑加总。

- [R1D #65](https://github.com/illusion-tech/poms/issues/65) 已完成G4（实现 `c14333d5a625c15776adaddd780ef82044a54b1f`）；原Nest72、七组foundation13、四组真实Chromium、双平台47生命周期和完整579文件生成一致。这些保留为 R1D 实际运行，不改记为 R1E 重跑。

- [R1E #66](https://github.com/illusion-tech/poms/issues/66) 实现 `afbf4ee51baa8543981e66472d04a4d7389a9adb` 已集成推送 main，远端 HEAD 一致；35 项最终和 73 项继承源码指纹、集成后 19 项适配器检查通过。[基线](archive/slices/rust-r1e-stage-acceptance-baseline.md)、[纠偏](archive/slices/rust-r1e-corrective-checkpoint.md)和[机器记录](rust-r1e-validation.json)保留四组合各16项、原Nest legacy36项（11项mock）、80个唯一run清理全通过及C无剩余P1/P2。R1E与父R1的G4随本归档提交及Issue同步生效；PG17保留，总体#57和R2–R7仍未完成。

R2 #67 已建立原生子 Issue #68–80。G0 108 操作互斥归属与九项跨期路由决策核验通过；R2A 于 2026-10-26T06:34:30.621Z 经 A/B/C 分项审查冻结，[G1 评论](https://github.com/illusion-tech/poms/issues/68#issuecomment-6409834654)。R2A 已完成三操作实现与验收，G4随本归档提交及Issue同步生效；B–M 保持 Todo；PG17 服务只读元数据仍为 Running / Auto / PID 6996。


R2A 实现 `2924bf30c1a0751df129d2137b6667628d1fdf4a` 已合入 main 并推送；合入后21项适配器检查与单向导航来源检查通过，98当前源码/82权威来源指纹一致。四组合12浏览器、26run零残留和schema失败分类见[收口记录](archive/slices/rust-r2a-closeout.md)及[机器验收](rust-r2a-validation.json)。G4随本归档提交推送及Issue同步生效；仅#68完成，R2父#67与总体#57保持Open，B–M保持Todo，#61待决路线不变，PG17保留。
