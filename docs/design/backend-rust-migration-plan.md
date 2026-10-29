# POMS 后端 Rust 重构计划

**文档状态**: Active — R0 已完成；R1A–E 已交付，R1 #60 / R1E #66 G4 / Done 随本归档提交及 Issue 同步生效；总体 #57 与 R2–R7 未完成
**最后更新**: 2026-10-29
**适用范围**: 将现有 NestJS 后端逐步实现为 Rust 后端，完成业务兼容、部署切换和旧运行时退出
**关联文档**:

- [系统高层设计](poms-hld.md)
- [接口命令设计](interface-command-design.md)
- [API 路由清单](api-route-canonical-inventory.md)
- [实施治理规则](implementation-governance-gates.md)
- [ADR-012：数据持久层技术选型](../adr/012-data-persistence-technology-selection.md)
- [ADR-015：API 路径规则](../adr/015-api-route-canonical-grammar.md)
- [ADR-016：联合请求体建模](../adr/016-union-request-body-schema-first-modeling.md)
- [ADR-017：Cookie 会话认证](../adr/017-admin-web-cookie-session-auth.md)
- [ADR-018：Rust 后端与 SQLx 持久化演进](../adr/018-rust-backend-and-sqlx-persistence.md)
- [R0 实施基线](archive/slices/rust-r0-baseline.md)
- [Rust 迁移执行追踪](rust-migration-execution-tracker.md)
- [部署入口](../../deploy/README.md)

## 1. 已确定方向与本次边界

用户已明确最终使用 Rust 重构后端，主要目标为改善性能、内存占用和部署成本，并明确不做前置性能实测。本计划直接以完成迁移为目标，不设置性能 PoC、吞吐量对比或节省比例达标等立项闸口。

功能正确性、接口兼容、数据一致性、认证安全、可部署和可回滚仍是交付验收条件。资源消耗和费用降低是预期方向，本计划不承诺尚未测量的改善比例。

2026-10-26 用户授权将下述代理配置和协作规则纳入本计划，并开始 R0。初轮完成架构决策、全量静态盘点、WSL 与既有环境只读核验和工程基线准备。随后用户授权 R0E 安装所需 WSL 工具、构建兼容镜像并创建隔离 PG15 验收库，结果见 [R0E 基线](archive/slices/rust-r0e-environment-baseline.md)；R0 当轮不启动 R1 业务实现或远程发布。用户确认本机已有 PostgreSQL 开发实例、尚未部署生产环境，当前兼容目标先对齐 TEST。随后用户授权提交推送并推进 R0F；R0A–E 已交付 `08daaf45`，在线总体任务为 [#57](https://github.com/illusion-tech/poms/issues/57)。各工程阶段按 G0–G4 形成可执行基线，阶段编号与 Issue 映射见执行追踪。

后续 R1A–E 已按独立授权交付。[R1E 基线](archive/slices/rust-r1e-stage-acceptance-baseline.md)与[机器证据](rust-r1e-validation.json)绑定实现 `afbf4ee51baa8543981e66472d04a4d7389a9adb`，已集成推送 main、远端 HEAD 一致，集成后 19 项适配器检查通过。R1 的七操作、认证与基础不代表完整业务或部署完成；#60 / #66 的 G4 随本归档提交及 Issue 同步生效，#57 与 R2–R7 仍未完成，PG17 保留。

### 1.1 代理配置与实际生效记录

| 角色                     | 目标模型                    | 推理强度    | 服务模式 | 本会话可确认的控制边界                                                                 |
| ------------------------ | --------------------------- | ----------- | -------- | -------------------------------------------------------------------------------------- |
| 主代理                   | GPT-6 Astra                 | Ultra       | 普通模式 | 由主聊天应用设置控制；用户约定不作为运行时已切换的证据                                 |
| 全部子代理，包括审查代理 | GPT-6.1 Sol (`gpt-6.1-sol`) | Max (`max`) | Fast     | 创建时显式指定模型与推理强度；当前创建工具没有独立 Fast 参数，实际服务层待运行证据确认 |

这是本轮及后续 Rust 迁移工作的执行约定，不修改用户全局配置。调度记录分别保留期望配置、显式传入的配置与可观测的实际配置；没有证据的 Fast 状态保持“未核实”，不写为“已开启”。若执行环境不支持约定中的配置，记录差异后再调整分工，不能静默改成其他模型。

本会话最多同时运行 4 个代理，采用主代理加 3 个子代理。指定子代理模型与强度时使用独立上下文，由主代理传入同一代码基线、正式输入、文件归属、验收命令和禁止变更范围。后续审查代理沿用相同配置；不依靠继承上下文隐式选择模型。

### 1.2 协作与验收规则

1. **主代理统筹公共契约。** 错误协议、认证上下文、事务传递、金额与日期类型、共享枚举先形成单一基线，再并行实现。主代理负责架构裁决、依赖顺序、集成冲突和最终验收。
2. **分配独立写入范围。** R0 只读扫描共享基线，盘点文件和工具由各负责人独占。进入实现阶段后使用独立 worktree，并隔离数据库、端口、构建输出及测试数据；`Cargo.toml`、`Cargo.lock`、工具链、公共路由注册、迁移入口和生成契约由主代理或指定单一负责人写入。
3. **按阶段控制并行。** R0 并行盘点 API、数据和环境；R1 先形成公共基础；R2–R5 在依赖满足后按业务闭环并行；R6–R7 的迁移接管、切流、外部写入及回滚操作由主代理串行协调。
4. **实现与审查分开。** 子代理交付后，由未参与该交付实现的代理检查兼容性、事务、授权、遗漏场景和证据边界。审查发现由主代理裁决并验证修复，不能用作者自评代替独立审查。
5. **证据绑定具体输入。** 子代理须交付文件清单、基线提交、来源与哈希、验证命令及结果、未解决问题和集成要求。静态路由匹配、测试文件关联、mock 验证、真实集成验证分别标记；输入变化后重新生成或复核受影响证据。
6. **统一集成验收。** 主代理运行合并后的必要检查，并确认共享文件与生成物没有冲突。单个子代理完成不等于阶段完成；未通过 G4 的阶段保持未完成，不能提前启动依赖其未冻结输入的工程切片。
7. **保留现有迁移边界。** 不增加性能 PoC 或收益比例闸口，不改变单一正式写入方、单一 schema 迁移执行方和完整回滚要求。主代理配置或 Fast 生效信息不能代替业务验收证据。

### 1.2.1 R2 后续联合批次与并行调度

2026-10-28 用户授权更新本计划，首先联合推进 R2E＋R2F。切片编号是范围与验收边界；同一批次可以覆盖多个子 Issue。每片必须有可追溯的 G1 输入和实际验收结果，共用的环境、回归、独立审查、证据保全与 G4 回写按批次集中处理。不得把同一候选版本的共同检查机械地逐片重复执行；来源或行为变化后，只补受影响检查，并在提交前核对统一候选。

| 联合批次 / 主线 | 范围                                                                  | 调度与验收边界                                                                                                                  |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| R2E＋R2F        | 字典、系统设置、业务编号、审计读取与路由拒绝事件；10 个既有 HTTP 操作 | 本轮授权；同一独立工作树与 G1 包分列 E/F 输入，两名实现者各自拥有模块，一名非作者审查，主代理统一环境、公共接线、运行验收及收尾 |
| R2G＋R2H        | 身份提供商、外部登录与组织同步；34 操作                               | E/F 所需能力满足后，与 I/J 主线并行；先冻结 provider、密文和目录接口，组内按真实依赖接线并联合验收                              |
| R2I＋R2J        | 存储提供商、上传、附件版本及中心；25 操作                             | 与 G/H 主线并行；先固定存储接口，共用对象存储环境，明确目标对象权限与 R3/R4 的真实域接入条件                                    |
| R2L             | 审批、待办、摘要与确认公共机制；4 操作及内部机制                      | 公共框架可在 D/F 输入满足后并行推进；R3–R5 业务处理器与真实事务逐域验收，不提前宣称完整业务完成                                 |
| R2K             | 移交附件清单与下载包；5 操作                                          | 依赖 J、#61 五项参数裁决及 R4 真实移交事实；最终验收结合 R4 移交闭环                                                            |
| R2M             | 阶段集成验收                                                          | 在 A–L 及跨域验收条件逐项满足后收口，父 #67/#57 保持 Open 直至各自完成条件满足                                                  |

依赖满足应落实到具体、已冻结且可验证的能力，不把 R2 整体关闭当作 R3/R4 每个子片的统一开工前提。K/L 等真实域验收仍依赖 R3–R5，必须避免按阶段大编号制造循环等待。上述后续分组是调度安排，本轮工程授权仅含 E/F。

R2E/F 的公共路由注册、认证上下文、Cargo 文件、完整 OpenAPI/client 保护与正式治理文档由主代理单一写入；实现者不并发编辑这些文件。数据库使用新建受控 PG15 副本，端口、运行标识与 fixture 隔离；原 PG17 实例和数据保留。统一候选完成后运行一轮适用公共回归，E/F 专属用例分别计数；失败、部分观测、ignored 与历史证据保持原标签。独立审查覆盖合并后的产品与验收证据，后续修复做增量复核，普通归档和状态回写由主代理集中复核，不逐小脚本新增独立闸口。

证据在 Linux 本地生成原字节清单并集中校验，通过一次批量传输保全到主目录；Windows 原生验收文件另做增量原字节校验。禁止以 Windows 的 WSL 共享路径对同一大目录反复逐文件遍历。保全必须检查路径、文件类型、来源稳定性、目标原字节与已有文件冲突，保留原 G1/G3 输入；工作树回收前确认所需 ignored 证据已保存。

### 1.3 R0 分工

| 任务       | 负责人   | 独占交付                                | 主要责任                                                             |
| ---------- | -------- | --------------------------------------- | -------------------------------------------------------------------- |
| `RUST-R0A` | 子代理 A | API 清单、operations JSON、离线复算工具 | 全量 route / controller / DTO / 模块 / 权限 / 测试线索及共享契约来源 |
| `RUST-R0B` | 子代理 B | 数据清单、数据库 JSON、离线复算工具     | 实体、迁移、跨域事务、数据类型、金额、种子与并发约束                 |
| `RUST-R0C` | 子代理 C | WSL 与验证环境清单                      | 实际工具可用性、跨平台测试/生成/部署方案、非 HTTP 任务               |
| `RUST-R0D` | 主代理   | ADR、计划、基线、执行追踪及索引         | 决策集成、缺口分级、后续切片输入、独立审查与验证                     |

当前进度、Issue 映射和 R1 放行条件统一见[执行追踪](rust-migration-execution-tracker.md)与[R0 基线](archive/slices/rust-r0-baseline.md)。

## 2. 当前实现基线

R0 复核代码基线：`033aedd028fc25ea990450a7854fc92c567cfb8a`（原计划盘点为 `4b09a0e3`；两者间仅计划及索引文档提交）。以下为静态盘点，不代表测试通过或部署状态。

| 项目      | 当前情况                                                                       |
| --------- | ------------------------------------------------------------------------------ |
| 应用      | Angular 管理后台、NestJS API，位于同一 Nx 工作区                               |
| HTTP 契约 | `libs/shared/api-spec/openapi.json` 中有 237 个路径、291 个操作、585 个 Schema |
| 持久化    | PostgreSQL、MikroORM，78 个实体文件中定义 106 张表、92 个迁移文件              |
| 后端测试  | API 源码目录下 72 个单测文件，API E2E 目录下 14 个业务测试文件                 |
| 认证      | HttpOnly 会话 Cookie、CSRF、权限守卫、会话超时与撤销                           |
| 发布模板  | Nginx + PM2，Deno 本地编排发布，切换 release 前执行迁移检查                    |
| 本机环境  | 已核实 WSL2 Debian 13、x86_64、rustc 1.97.1、cargo 1.97.1                      |

后续新增业务能力必须同步进入迁移清单，不能把上述数量当作永远不变的完成目标。最终验收以切换版本的完整契约及运行行为为准。

## 3. 目标架构

### 3.1 技术选择

| 责任            | 计划选型                              | 实施约束                                           |
| --------------- | ------------------------------------- | -------------------------------------------------- |
| HTTP 与异步执行 | Axum + Tokio + Tower                  | 保留当前 `/api` 路径、方法与错误响应语义           |
| 数据访问        | SQLx + PostgreSQL                     | 使用显式 SQL 与事务，保留既有物理表、索引和约束    |
| JSON 契约       | Serde                                 | 显式控制字段命名、缺省值、null、日期及金额字符串   |
| 接口描述        | Utoipa + 现有 OpenAPI 兼容检查        | 迁移期间沿用已冻结契约；全量完成后再转移规范生成权 |
| 金额计算        | 十进制定点类型，优先验证 rust_decimal | 固定精度及舍入规则；与现有结果的差异必须逐项解释   |
| 日志与诊断      | tracing 及结构化请求日志              | 保留 requestId、业务审计和安全事件语义             |
| 发布            | Linux release 二进制、配置和迁移资源  | 保留现有 release/current 目录布局及 Nginx 入口     |

采用模块化单体，业务模块在同一进程内通过应用服务协作，事务使用同一个 PostgreSQL transaction。此次不引入微服务拆分、消息中间件或数据库替换。

具体 crate 版本、features、Rust toolchain 与 MSRV 在 R0 的环境收口切片中经实际依赖解析和编译验证后固定；锁文件随受控依赖验证产物提交。静态盘点完成不等于依赖已锁定。本机已安装的版本只代表现状，不自动成为最终工具链要求。Rust 的类型约束不能代替授权、状态转换和业务校验。

### 3.2 仓库组织

计划在现有仓库内增加一个 Rust 应用，先按代码模块拆分，实际复用需求明确后再拆独立 crate：

```text
apps/poms-api-rust/
  Cargo.toml
  Cargo.lock
  rust-toolchain.toml
  src/
    main.rs
    app.rs
    config/
    http/                 # 路由、中间件、错误映射
    auth/                 # 会话、CSRF、权限
    domain/               # 业务类型、状态转换与金额规则
    modules/              # 各业务域的命令、查询与数据访问
    infrastructure/       # PostgreSQL、外部服务、密钥与附件
  tests/                  # 合约、集成、并发和兼容测试
  migrations/             # 接管后新增的 SQL 迁移
```

前端继续使用 Angular 和现有生成客户端。Nx 可以包装 Cargo 任务，Cargo 自身仍是 Rust 构建与测试的权威入口。业务应用骨架与 Nx 工程任务由 R1 实施；R0 的依赖验证应放在独立验证目录，不能当作 R1 应用已交付。

## 4. WSL Debian 开发与验证环境

1. 在 Debian 的 Linux 文件系统中准备独立 checkout，例如 `~/projects/poms-rust`，使用 `codex/rust-backend-*` 分支；Windows 工作树与 WSL checkout 通过 Git 提交同步。
2. Cargo 的源码与 `target/` 默认放在 Linux 文件系统。保留现有 `E:\projects\poms`，不将 Windows `node_modules` 或生成缓存直接复制到 Linux。
3. R0E 已在固定 Debian 12 构建镜像内验证 Rust/Cargo 1.97.1、Node.js 24.16.0、pnpm 12.3.4、Deno 2.9.1、Java 17 与 PostgreSQL 客户端；这是 R0E 历史版本，证据见 [R0E 基线](archive/slices/rust-r0e-environment-baseline.md)。R1C 后使用 Rust 1.99.1；R1D/E 已验证跨平台启动器、浏览器依赖与已交付七操作的端到端行为，具体当前组合见 [R1E 机器证据](rust-r1e-validation.json)。
4. 日常开发可继续直接使用 Windows 本机 PostgreSQL 17.4 及现有开发测试库，不自动 reset/seed。另设的 PG15 库专用于 TEST 兼容验收，已固定 PostgreSQL 15.12、`pgcrypto 1.3`、`btree_gist 1.7`、UTF8、`en_US.UTF-8` libc 排序规则和 `Etc/GMT-8` 会话时区；本机 `zh-CN` / `Asia/Shanghai` 的结果不能替代这项验证。使用可重复初始化的隔离数据，不对 TEST 原库执行重放或迁移演练。ADR-012 的 16+ 属既有设计与实况差异，本次不升级或降级既有数据库。
5. R0F 冻结时 API E2E 启动器硬编码构建 Node 后端；R1D 已提供 managed-nest / managed-rust / external 选择。R1E 复验双后端 foundation；external 不 build/spawn/seed/stop 后端，managed 仅清理本 run 拥有且身份匹配的进程。
6. R0F 冻结时 Playwright 默认启动命令使用 PowerShell；R1D 已改为跨平台 Node 入口，R1E 完成 Linux managed Nest/Rust、Windows managed Nest / external Rust 四组合认证 UI 验收。API 端口与前端代理显式配置，Windows external Rust 由独立 Linux owner 持有并核验存活与清理。
7. R0F 冻结时 OpenAPI 客户端生成脚本依赖 PowerShell/Java；R1D 已提供单一 Node 跨平台入口，R1E 复核固定 Java 17 / generator 7.20.0 的完整 579 文件集合与逐文件 SHA 一致。保留原规范化规则，Rust 七操作子集不覆盖完整客户端。
8. WSL Debian 13.7 / x86_64 / glibc 2.41 负责开发和功能验证。当前发布兼容目标为已核实的 TEST Debian 12 / x86_64 / glibc 2.36；R0E 已用固定 Debian 12 镜像构建独立依赖 probe，并在纯运行镜像核验 ABI 与执行结果。此证据不替代 R6 的产品产物验收。用户确认尚未部署生产环境，未来 PROD 首次部署前重新核实其 OS/arch/glibc 与数据库参数。

上述 Linux 文件位置遵循 [Microsoft WSL 文件系统建议](https://learn.microsoft.com/en-us/windows/wsl/filesystems)。本计划不执行 WSL 性能基准，也不修改 WSL 资源限制。

## 5. 迁移与切换策略

采用**分模块实现、隔离环境验证、全后端统一切换**。

- 正式业务切换前，NestJS 继续拥有全部正式流量和写入职责。
- Rust 各阶段在独立数据库或隔离的对照数据库上验证，不在正式数据库上重放请求。
- 审批、合同、成本、移交和提成存在交叉引用及事务约束，因此不将同一业务动作拆为跨 Node/Rust 的远程调用。
- 最终切换时统一切换 Nginx 的 API upstream，不建立长期按路由分流的双后端架构。
- 短期同时保留两份可部署产物用于回退；正式业务与定时任务只能有一个活动执行方。

开发顺序与上线顺序分离：业务模块可以逐批通过验收，但不因此单独获得正式写入权。若以后确需提前切换某模块，应另行冻结写入归属和事务边界，不能只添加一个代理规则。

## 6. 分阶段执行计划

| 阶段                    | 工作范围                                                                                                       | 交付与验收                                                                                                                | 前置   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| R0 迁移基线             | 冻结目标架构、环境、契约、模块覆盖、数据库与测试策略；形成继任 ADR，说明 ADR-012 中 ORM 选型的演进             | 路由到模块映射、跨域事务清单、数据类型矩阵、WSL 环境清单、各阶段 G1 输入；现有路径与规范不被静默改写                      | 本计划 |
| R1 应用与兼容基础       | Rust 应用、配置、日志、健康检查、错误响应、SQLx、会话/CSRF/权限/敏感字段基础、密钥格式；跨平台测试与生成入口   | 可在 WSL 启停；旧会话和历史密文兼容；认证负面场景通过；同一契约测试可以选择两套后端                                       | R0     |
| R2 平台与公共能力       | 用户/角色/组织/导航/字典/配置、业务编号、审批及摘要公共机制、审计、附件及存储、外部身份与组织同步              | 平台治理与外部适配用例通过；审批路由与状态驱动框架到位，各业务域处理器随 R3–R5 注册，未实现处理器不得伪造成功             | R1     |
| R3 客户销售与项目签约前 | 客户、联系人、别名、线索与评分、销售跟进/情报/讨论、项目主数据、技术成本、商务竞标、报价评审及相关审批处理器   | 线索到项目、签约前工作区、归属权限、并发修改与历史版本场景通过；前端使用原合同                                            | R2     |
| R4 合同资金与项目执行   | 签约就绪、合同及条款、收付款/发票/采购、移交、回款判断冻结、实际成本、经营核算、验收/完工/归档及相关审批处理器 | 合同到移交、成本与经营视图、状态流转、汇总一致性与事务回滚通过；为提成提供完整事实源                                      | R3     |
| R5 提成全链路           | 规则版本、角色分配/冻结、争议与变更、计算/重算、阶段发放、调整/冲销、离职特例、质保金与最终结算及审批处理器    | 金额样本、冻结与版本约束、单一当前版本、重复请求/并发冲突、拒绝重提和结算闭环全部通过                                     | R4     |
| R6 发布与切换演练       | Rust 发布包、迁移执行器接管、初始化工具、进程托管、Nginx、备份、发布验证、任务单实例及回退演练                 | 空库初始化和存量升级通过；目标 Linux 启停及 readiness 通过；完整 API/浏览器回归、旧写新读和新写旧读、切回 NestJS 演练通过 | R5     |
| R7 正式切换与旧后端退出 | 冻结发布版本，正式环境统一切换、业务验收、受控观察，关闭旧进程，最终移除旧后端依赖                             | 全部在用接口和任务已覆盖，无正式业务依赖 NestJS；回滚窗口结束后完成源码/脚本/文档与依赖清理                               | R6     |

阶段表是依赖顺序，不表示每阶段只需一个 PR。R2–R5 应按可独立验收的业务闭环拆成多个切片；R6 的发布框架可以在早期搭建，但最终验收依赖完整业务实现。

R0 必须覆盖 `apps/poms-api/src/app/core/`、全部 `features/`、控制器及初始化/后台任务，不仅依据前端是否调用来判断接口是否需要迁移。所有 291 个基线操作和后续新增操作都必须标记迁移去向或有明确的弃用依据。

## 7. 兼容性约束

### 7.1 HTTP 与前端

- 保持 URL、HTTP method、查询参数、分页排序默认值及稳定排序规则。
- 保持请求/响应字段名、必填与可选、null 与缺省、联合类型判别、未知字段处理及校验行为。
- 保持状态码、错误 code、业务异常结构，特别是认证、权限、无效状态、重复提交及乐观并发冲突。
- 保持 Cookie 名称、Path、SameSite、Secure/HttpOnly 语义，以及 CSRF 请求头、登录前 token 和会话绑定规则。
- 保持 OpenAPI operationId、模型命名及生成客户端的可消费性。允许生成器内部布局差异，但不能借此接受运行语义变化。
- 前后端共享枚举/权限定义在过渡期由现有契约导出或机械校验；R0 选择单一生成来源，禁止长期手工维护 TS/Rust 两份独立权威定义。
- Rust 的自动反序列化失败必须映射为现有错误协议，不直接把框架默认错误响应暴露给前端。

### 7.2 数据与业务

- 初期保留 PostgreSQL schema、表名、UUID、外键、部分唯一索引、检查约束及版本链。
- 显式实现 MikroORM 原有的行版本检查、更新时间、关联写入和事务行为；SQLx 不会自动复制这些语义。
- 金额、比例及税额分别固定精度和舍入；覆盖零值、负向调整、边界金额和重算。现有 JavaScript 浮点结果与定点结果不同的样本作为独立规则问题处理，不悄悄改变结算结果。
- 区分业务日期、时间戳和时区，禁止用统一字符串转换掩盖差异。
- 保留业务编号分配、审计操作者、快照引用、附件版本、外部身份映射和组织同步幂等语义。
- 兼容已有密码哈希、会话 token 哈希、CSRF token 及 `v1` 密文格式。覆盖旧后端签发会话交给新后端使用，以及切回旧后端后的会话行为。
- 新旧后端对照使用独立且同源的数据副本；GET 也可能续期会话或写审计，不能默认无副作用。

## 8. 数据库迁移与初始化接管

1. Rust 业务迁移阶段沿用当前物理结构，数据库演进仍由既有迁移入口负责；禁止 Node 与 Rust 两个迁移器同时管理 schema。
2. R0 盘点所有迁移中的 DDL、数据回填及初始化逻辑，明确目标 PostgreSQL 版本、扩展和权限。
3. R6 为切换版本建立可审阅的 SQL baseline，并验证从空库初始化得到预期 schema；迁移后的种子工具必须覆盖开发/E2E、平台 bootstrap 和业务试用各自范围。
4. 已有数据库先确认到达指定旧迁移版本，再校验结构与必要数据不变量；通过后登记 Rust 迁移基线，不能对存量库重放建表 baseline。
5. 保留旧迁移文件和历史记录作为追溯材料。接管后新增迁移统一走 Rust/SQL 入口；迁移版本、锁、校验和及失败恢复流程在 R6 固定。
6. 正式回滚窗口内只允许旧后端也可接受的数据与 schema 变化。破坏性删列、字段改义及旧格式清理放到退出窗口之后。

## 9. 测试与阶段验收

本计划不安排性能基准、压力吞吐对比或收益比例验收。以下检查针对业务正确性和运行可靠性，不作为变相性能立项测试。

| 层次                | 必需检查                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Rust 静态与单元测试 | 固定工具链，fmt、clippy、cargo test；业务规则与边界样本；cargo build --release                       |
| 契约                | 冻结 OpenAPI 对照、生成客户端一致性、有效/无效输入、状态码、字段投影与错误 code                      |
| PostgreSQL 集成     | 真实 PostgreSQL 事务、唯一约束、乐观并发、版本替换、回滚、日期与金额持久化                           |
| 认证与安全          | 登录/外部登录/登出、CSRF、失效/撤销/停用、越权、敏感字段、附件访问及审计                             |
| 业务 E2E            | 复用现有 API 场景并补齐缺失路径，不以 mock 通过替代真实数据库行为                                    |
| 浏览器              | 原 Angular 客户端连接 Rust，覆盖平台、线索、项目、合同、成本、提成与附件流程                         |
| 外部服务            | 可重复适配器测试，加上启用环境所需的真实身份/存储/组织同步兼容烟测；不将 mocked 证据标为真实集成通过 |
| 发布运维            | 目标环境启动、readiness、优雅停机、迁移失败不切流、后台任务唯一执行、备份恢复及回滚演练              |

每个切片提交相关测试、未覆盖范围和异常处置记录。旧测试的 NestJS/MikroORM mock 不直接搬到 Rust，应提取业务输入、预期结果和副作用；HTTP E2E 则尽量共用同一套场景。

## 10. 切换与回滚操作设计

### 10.1 切换前

- 冻结可追溯的代码、契约、数据库迁移版本及两套发布产物；对新增功能实行同等迁移约束。
- 确认旧请求、审批动作、附件上传/完成、组织同步等在途操作的排空或安全恢复方案。
- 完成备份及恢复演练、旧后端读取新数据测试，形成操作者、切换窗口、观察窗口、回滚截止点及放行清单。
- 新服务只做 readiness 检查时，后台调度和外部写入保持禁用；部署脚本明确活动实例职责。

### 10.2 正式切换

1. 暂停新业务写请求及后台任务，排空旧后端在途事务。
2. 完成最终备份和必要的兼容迁移，确认没有第二个迁移执行者。
3. 停止旧业务执行方，启用 Rust，统一切换 API upstream 和后台任务职责。
4. 验证登录、关键只读查询及受控业务写入，核对审计、附件、审批和任务状态。
5. 恢复业务入口，观察功能错误、数据库连接及进程健康；该观察用于运行安全，不设置性能改善门槛。

### 10.3 回滚

- 出现业务不一致、权限错误或关键流程阻断时，暂停入口并排空 Rust 在途事务，停止 Rust 后台任务，再切回保留的 NestJS 产物。
- 回滚前提是旧后端能读取并继续处理 Rust 已写入的数据；此条件必须在 R6 验证，不能只检查进程能否重启。
- 切换后若已发生新业务写入，不直接恢复旧数据库备份以免丢失数据。只有应用回退不足以恢复且已有数据修复方案时，才进入专门的数据恢复流程。
- 在途外部请求及重试按幂等标识和处理记录核对，不能无差别重放已成功的付款记录、审批、上传或外部同步操作。
- 回滚窗口结束后再移除 NestJS、MikroORM 运行依赖和旧部署入口；历史迁移与设计依据继续归档保留。

## 11. 最终完成标准与第一批任务

最终完成需要同时满足：

- 切换版本全部在用 HTTP 操作、后台任务、初始化工具和外部集成均有 Rust 实现或正式弃用结论。
- Angular 的既有业务流程与权限边界在 Rust 后端上通过验收，接口及金额/日期语义无未解释差异。
- 空库初始化、存量数据库接管、目标 Linux 发布和正式回滚路径已经验证。
- 正式服务不再依赖 NestJS/MikroORM；前端构建和迁移期间的测试工具仍可保留 Node.js。
- 文档、运行手册、Issue/PR 证据及生命周期归档按 G4 同步完成。

开始实施时首先推进 R0，按以下顺序产出：

1. Rust 后端及 SQLx 持久化的继任 ADR，保留旧 ADR 的历史适用范围。
2. WSL/目标发布环境与工具链清单，冻结源码位置、数据库及跨平台脚本方案。
3. 全量 route / DTO / 模块 / 表 / 事务 / 外部副作用对应矩阵。
4. 金额、日期、认证、错误、枚举、快照和版本链的兼容合同与代表性样本。
5. R1 最小 G1 基线，以及后续工程切片的依赖、验收项和 Issue 映射。

R0 的盘点成果见 [API 契约清单](rust-r0-api-contract-inventory.md)、[数据库清单](rust-r0-database-inventory.md)和[环境清单](rust-r0-environment-inventory.md)。R0 全部放行条件满足后进入 R1 的工程实现，不插入性能 PoC 或成本收益实测步骤。静态盘点、环境实际就绪、R1 G1 放行与 Rust 实施完成分别记录。

## 12. 技术参考

- [Axum 官方文档](https://docs.rs/axum/latest/axum/)：HTTP 路由与 Tokio/Tower 集成。
- [SQLx 官方仓库](https://github.com/transact-rs/sqlx)：异步 SQL、PostgreSQL 与查询校验。
- [Utoipa 官方文档](https://docs.rs/utoipa/latest/utoipa/)：Rust OpenAPI 描述及 Axum 集成。
- [Microsoft WSL 文件系统说明](https://learn.microsoft.com/en-us/windows/wsl/filesystems)：Linux 工具链的源码与产物存放建议。

2026-10-26 R2 进展：R2A 实现 `2924bf30c1a0751df129d2137b6667628d1fdf4a` 已合入 main 并推送；合入后21项适配器检查与单向导航来源检查通过，98当前源码/82权威来源指纹一致。四组合12浏览器、26run零残留和schema失败分类见[收口记录](archive/slices/rust-r2a-closeout.md)及[机器验收](rust-r2a-validation.json)。G4随本归档提交推送及Issue同步生效；仅#68完成，R2父#67与总体#57保持Open，B–M保持Todo，#61待决路线不变，PG17保留。

### 2026-10-27 RUST-R2B G1冻结

R2B #69按[角色权限基线](archive/slices/rust-r2b-role-permissions-baseline.md)于2026-10-26T19:32:29Z冻结，来源HEAD `9734515f84ebe1a4833d207124adbfbe378f691f`；A/B输入复核与C独立复核Pass，现为Doing。范围为八个现有角色/权限操作，真实Nest/PG/HTTP及原页面验收、G3和G4尚待完成。仅使用新PG15副本，PG17及旧证据保留；R2父#67保持Open，C–M为Todo，#61不变。

### 2026-10-27 RUST-R2B G4收口

R2B实现`31555b76d1d9a453aef44172211e4b35e30df573`已合入main并推送，集成后22项适配器、角色/导航单向导出与OpenAPI检查通过，157份来源指纹一致。八操作的真实HTTP179/并发6/系统22、四组合基础认证52和原页面12通过；C独立G3未关闭P1/P2为0，51个run最终二次清理0/0。具体旧候选、schema失败分类与保留边界见[归档收口](archive/slices/rust-r2b-closeout.md)、[纠偏](archive/slices/rust-r2b-corrective-checkpoint.md)及[机器验收](rust-r2b-validation.json)。G4随本归档提交推送及Issue同步生效；仅#69完成，父#67/#57保持Open，C–M为Todo，#61不变。R2A/B累计交付11个R2操作，其余97及阶段验收未交付，PG17与旧环境/证据保留。上方G1与R2A段落是当时记录，不代表当前R2B状态。

### 2026-10-28 RUST-R2C G4收口

R2C实现`319d5d89977704b9924fc7a401957d46f5d42668`已合入main并推送，集成后24项适配器0skip、导航/角色/组织来源与排序/OpenAPI共7步通过，152份来源前后与验收版本一致。八操作实际双端HTTP各354/并发各6、四组合基础认证52与原页面12、另行PG7通过；C独立G3未关闭P1/P2为0，52run最终连续两次清理0/0。旧失败、有限Unicode、UI许可提示与schema检查失败分类见[归档收口](archive/slices/rust-r2c-closeout.md)、[纠偏](archive/slices/rust-r2c-corrective-checkpoint.md)及[机器验收](rust-r2c-validation.json)。G4随本归档提交推送及Issue同步生效；仅#70完成，父#67/#57保持Open，D–M Todo，#61不变。R2A/B/C累计交付19个R2操作，剩余89操作与R2M阶段验收未交付，PG17与旧环境/数据保留。上方历史G1/G3和R2A/B段落保留当时状态，以本条为当前进度。


### 2026-10-28 RUST-R2D G1冻结

R2D #71按[用户/profile基线](archive/slices/rust-r2d-users-profile-baseline.md)于2026-10-27T20:56:23.041Z冻结，来源HEAD `a22cba7360346242cb7709740b7eb954b92d1fd4`；A/B与C同一候选复核Pass，未关闭P1/P2为0，[G1评论](https://github.com/illusion-tech/poms/issues/71#issuecomment-6453366467)。范围为11个现有操作，进入Doing；先见证Nest原UUID/快照/分段SQL再实现对应持久化，PG/HTTP/并发/四组合UI与G3/G4均待完成。原create不写credential，不新增密码API或批量session revoke。仅新受控PG15，PG17及旧环境数据保留。R2已交付19/108，尚余89操作与阶段验收；父#67/#57保持Open，E–M Todo，#61不变。此条更新上方历史R2D Todo描述。


### 2026-10-28 RUST-R2D G3通过

R2D既有11操作完成实现与实际验收，[非作者G3 Pass](https://github.com/illusion-tech/poms/issues/71#issuecomment-6457908041)、未关闭P1/P2为0。final05双端各566顺序HTTP、16受控并发及4独立URI补例严格比较通过；PG11、四组合页面12与基础认证52、Rust125普通测试及工具184通过，默认50 ignored单列。81登记run最终各连续两次0/0，两个未初始化失败run按独立只读证明列N/A。受审原件及1747来源union由[机器验收](rust-r2d-validation.json)绑定，[收口记录](archive/slices/rust-r2d-closeout.md)保留schema失败分类、历史失败和有限URI/P3边界。尚待提交集成检查及G4；仅#71为本片范围，父#67/#57仍Open，PG17保留。

### 2026-10-28 RUST-R2D G4归档

R2D实现`9302fd7149257aa40584fc500fd76dd0c766b80d`已集成并推送main。归档前集成静态检查实际8步通过、26项适配器0skip、1747来源前后核等；这不是新增数据库、HTTP或浏览器实跑，独立集成复核及原回执由[机器验收](rust-r2d-validation.json)的closure绑定。本片11操作的完整证据见[归档收口](archive/slices/rust-r2d-closeout.md)与[纠偏](archive/slices/rust-r2d-corrective-checkpoint.md)。G4随归档提交推送与Issue同步生效；届时仅#71完成，R2A/B/C/D累计30/108，剩余78操作及R2M阶段验收，父#67/#57保持Open，E–M与#61状态不变。G1原字节和G3受审原件保留，完整currentSourceManifest不删docs/tmp；集成检查时点在归档前，路径/hash迁移另记，不改写历史运行来源。旧失败、P3有限URI、schema既有差异及PG17/旧数据保留边界不变。上方带日期的历史状态保留，以本条为当前收口说明。


### 2026-10-28 RUST-R2E/F 联合G4收口

R2E [#72](https://github.com/illusion-tech/poms/issues/72) 与 R2F [#73](https://github.com/illusion-tech/poms/issues/73) 共10个既有操作及9scope编号内部机制已交付，实现 `9b3086f6957dfed318a7a53d10cf245394d5282f` 已集成推送main。C联合G3 Pass，未关闭P0/P1/P2为0；[机器验收](rust-r2ef-validation.json)、[独审原件](rust-r2ef-review.json)和[归档收口](archive/slices/rust-r2ef-closeout.md)分列旧393完整对照与修后E54/18增量，最终Rust149/显式PG4/四组合UI8/基础认证26及40run二次零残留。

本G4随归档提交推送与Issue核对生效，仅关闭#72/#73。R2A–F累计 **40/108**，剩余 **68个操作及R2M验收**；父#67/#57保持Doing/Open，G–M与#61依赖不变。原G1/G3原字节及旧失败保留，PG17实例和数据、旧环境均保留；无部署、产品DDL或性能结论。本条为最新状态，上方带日期的G1/旧切片状态保留历史含义。


### 2026-10-28 后续授权：R2G＋R2H联合批次

用户在E/F G4交付后要求继续下一批，本次授权限定G/H的34个既有HTTP操作及其原provider/目录内部机制。当前仍交付40/108；本批仅G0/G1准备，未因授权自动Doing或Done。[联合基线](archive/slices/rust-r2gh-identity-directory-baseline.md)待C冻结共享provider/现有SecretCipher封装/独立state key/axios兼容HTTP/目录ports后，两名作者在独立上下文显式Sol/max并行，Root统一环境/运行验收/G3与G4。

复用已干净的独立Windows检出并另开codex/poms-r2gh-identity-directory，不改primary；新Linux checkout/PG15 pair/role/marker及5700/5701/5800/5900隔离。只用受控合成上游真实协议，不能冒称真实Feishu账号成功；PG17、旧EF数据/原件保留。I/J为另一主线，仍待其独立授权/G1，不因本次G/H启动提前实施；K/L跨域和R2M边界不变。上方“本轮仅EF”保留原授权时点，当前以上述续授权为准。

### 2026-10-28 R2G/H 实现与实际验收完成，联合G3待审

G [#74](https://github.com/illusion-tech/poms/issues/74)16操作、H [#75](https://github.com/illusion-tech/poms/issues/75)18操作已按联合G1并行实现。Root统一实际验收：同一candidate04的G07/H08每端128个用例HTTP响应及3组受控竞争，最终transport18、native PG每库12、四组合原页面8、基础认证52、Rust162通过/54 ignored；OpenAPI65 paths/81 operations递归对齐。完整原规范291/585、579 client与92 migration受保护，无产品DDL和原TS/Angular产品改动。

60个attempted run / 120份base与GH journal最终连续两轮0/0，5700/5701/5800/5900已释放，原Nest/Rust与合成上游正常停止，source/binary不变。两个早期失败UI的base残项由final01独立补清，marker顺序纠偏及final02全量归零保留；旧失败、有限Unicode/时间投影、原H新组织UUID关联行为和schema Failed-with-classification见[纠偏记录](archive/slices/rust-r2gh-corrective-checkpoint.md)及[机器验收](rust-r2gh-validation.json)。尚待非作者联合G3、提交推送/集成和G4，当前仍交付40/108，#74/#75保持Doing，父#67/#57、I–M与#61边界不变。

### 2026-10-29 R2G/H 同次联合G3最终通过

[非作者终审](rust-r2gh-review02.json)最终Pass，未关闭P0/P1/P2/P3均为0。首审3 P2/1 P3的Block和初始原件保留，[集中纠偏增量](rust-r2gh-g3-delta02.json)绑定坏密文400、完整外引预检、不支持协议分类与精确时间投影/TTL；修后每端137个captured-case HTTP、3组竞争、transport20、真实guard4反例0DML、工具23、Rust162/54 ignored分列、Rust两平台原页面4条复验均通过。72 backend/run /144 journal最终两轮0/0，本批服务正常停止、四端口释放。G3评论已回写[G](https://github.com/illusion-tech/poms/issues/74#issuecomment-6473390122)/[H](https://github.com/illusion-tech/poms/issues/75#issuecomment-6473391109)，实现提交/推送、集成后核验与G4待完成，当前仍40/108；父#67/#57和I–M/#61保持原状态。


### 2026-10-29 RUST-R2G/H 联合G4归档

G [#74](https://github.com/illusion-tech/poms/issues/74)16操作与H [#75](https://github.com/illusion-tech/poms/issues/75)18操作已交付，实现`91cda75f8379a4085a37c14fc1fd25bde0a731dc`已推送main；[同次最终G3](rust-r2gh-review02.json)与[独立集成核验](rust-r2gh-integration-review.json)均Pass，未关闭P0/P1/P2/P3为0。集成8步、26项适配器/23项工具与3479来源前后核等，134个提交blob逐字相同，不代表新增runtime实跑。[归档收口](archive/slices/rust-r2gh-closeout.md)、[纠偏](archive/slices/rust-r2gh-corrective-checkpoint.md)、[初始验收](rust-r2gh-validation.json)/[增量](rust-r2gh-g3-delta02.json)与首审Block分开保留。

G4随本归档提交推送与在线回写生效，仅关闭#74/#75；R2A–H累计 **74/108**，余 **34个操作及R2M阶段验收**，父#67/#57保持Open，I–M与#61不变。最新实际每端137 captured-case HTTP/3race、transport20、guard4反例0DML、Rust162/54 ignored分列、最终Rust两平台页面4条复验，72backend/run/144journal全量两轮0/0、四端口释放；PG17与旧数据保留，无部署或真实租户认证。上方日期段落保留各自历史含义，以本条为当前Rust收口。

### 2026-10-29 I/J批次授权

用户在上一轮“下一批是什么？”答复后明确“开始”，授权R2I#76与R2J#77共25个既有操作完整G0–G4。沿用1.1/1.2的模型、独立分工、集中实际验收与solo集成规则；联合G1已按[基线](archive/slices/rust-r2ij-storage-attachments-baseline.md)冻结，Issue Doing，G3/G4仍Pending。先前1.2.1“本轮仅含E/F”为该历史授权时点，不限制本次新授权；K/L/M、#61、R3–R5、父#67/#57及生产部署不在本批。

### 2026-10-29 RUST-R2I/J 联合G4归档

R2I [#76](https://github.com/illusion-tech/poms/issues/76) 六操作与R2J [#77](https://github.com/illusion-tech/poms/issues/77) 十九操作已交付，实现`568c0ba39dc8dbc687c04f55f690e4f36c0af5d0`已集成推送main；[联合最终G3](rust-r2ij-review01.json)和[独立集成核验](rust-r2ij-integration-review.json)均Pass，未关闭P1/P2为0。[初始验收](rust-r2ij-validation.json)、[同次纠偏增量](rust-r2ij-g3-delta01.json)、[完整来源](rust-r2ij-source-manifest.json)及[保全锚点](rust-r2ij-preservation.json)分别保留时点与原字节；[归档收口](archive/slices/rust-r2ij-closeout.md)解释路径/hash映射。

G4随本归档提交推送与在线回写核对生效，仅关闭#76/#77。R2A–J累计 **99/108**，余 **9个操作（K5/L4）及R2M阶段验收**；父#67/#57保持Open，K/L/M、#61和R3–R5边界不变。PG17实例和数据、旧环境及新PG15保留；本批API/OBS/新PG15已正常停止，无部署、真实OBS租户认证或性能结论。上方带日期的旧计数与G1/Pending记录保留历史含义，以本条为当前状态。

### 2026-10-29 L1 与 K5 参数子片 G0

用户授权 [L1 #81](https://github.com/illusion-tech/poms/issues/81)（父#79）与 [ROUTE-K #82](https://github.com/illusion-tech/poms/issues/82)（父#61）并行推进；来源main `20335a189ce1197ccd4211bdfbb314954421729e`，独立分支 `codex/poms-r2l1-public-k-route`。联合[基线候选](rust-r2l1-k-route-baseline.md)与独立输入已形成，G1仍Pending，产品尚未改动。

L1交付真实Summary、Confirmation/Todo及必选同事务callback的公共审批协调机制，0公共HTTP；四条L路由和真实R3–R5业务分支继续待验。K5候选采用canonical `{id}`，同步controller绑定、完整spec/client及命名参数对象consumer；原生成器六项冻结保护不绕过，先局部输入checkpoint再gen。#61其他四项与K#78不关闭，R2仍 **99/108**，父#79/#61/#67/#57保持未完成。

### 2026-10-29 L1 与 K5 参数子片 G1冻结

#81/#82于2026-10-29T03:54:55.713Z按[联合基线](rust-r2l1-k-route-baseline.md)冻结，非作者[联合审查](rust-r2l1-g1-review01.json)Pass，未关闭P0–P3为0。两个子片进入Doing，父#79/#61仅反映活动子片、整体不Done；L四路由、K五操作业务与R3–R5仍待各自验收。L1先Native事务见证再定store，K5统一{id}并按受限S输入checkpoint保留原生成器保护。本批0新增已交付公共操作，R2仍99/108，G3/集成/G4尚未完成。

### 2026-10-29 L1 与 K5 参数子片 G3通过

#81/#82 的[独立联合G3](rust-r2l1-g3-review01.json)于2026-10-29T07:51:44.838Z通过，开放P0–P3为0；[冻结验收](rust-r2l1-validation.json)与[归档锚点](rust-r2l1-preservation.json)保留原件，提交集成/G4尚待完成。真实双库41组、受控CAS/父状态/回调机制、Rust199通过/54历史ignored、共享1181tests及分类schema结果已分别核验。当前只完成内部机制与参数同步，本批0新增公共操作、R2仍99/108，父#79/#61与K/L剩余业务不因此Done。

### 2026-10-29 L1 与 K5 参数子片 G4完成

#81/#82已按[收口记录](rust-r2l1-g4-closeout.md)关闭，实现main 894fc72c2a90f0c93988ad23bcfe87157bdc322d 经独立固定提交复核，生命周期原件与小增量[路径/hash索引](rust-r2l1-g4-evidence.json)保全。L1内部公共机制与K5参数同步交付；L四公开路由、K五操作业务、真实域handler及R2M仍未完成。本批0新增公共操作，R2仍99/108；#61其他四项差异、父#79/#61/#78/#80/#67/#57保持Open。

### 2026-10-29 K业务与R4两参数联合批次 G0

用户续授权K #78五业务＋原最小R4事实读取适配，与#83两项移交参数裁决并行，来源main f23490d0f0e145fb030d8f070726dd2aa00cf074。[联合基线候选](archive/slices/rust-r2k-r4-route-baseline.md)待G1；当前产品未改，K与#83仍Todo，不提前计104/108。原prepared-state/实际Native确认的来源观察不认证RustR4写链，K不加confirmed或snapshot消费门槛；L4/R2M、两lookup、父#61/#67/#57与整个R3–R5不因此完成。

### 2026-10-29 K与R4两参数联合G1冻结

#78/#83于2026-10-29T10:00:47.319Z按[联合基线](archive/slices/rust-r2k-r4-route-baseline.md)及[独立审查](rust-r2kr4-g1-review01.json)进入Doing，开放P0–P3为0。K只迁五业务和原最小只读事实，Native-before-store及完整PG/存储/ZIP/UI/故障验收待执行；R4参数经新永久S2及原生成器受控同步，0新业务操作。原prepared-state与Native确认仅作来源观察，seed定义只读借用，不冒称RustR4业务/新draft API。当前仍99/108，G3/集成/G4及104/108条件均待完成，L/M与父项不关闭。


### 2026-10-30 K 与 R4 两参数联合 G3 通过

#78/#83 的[非作者联合 G3](rust-r2k-g3-review01.json)通过，[冻结验收](rust-r2k-validation.json)、[分类增量](rust-r2k-validation-delta01.json)、[原来源补证](rust-r2k-source-supplement01.json)与[保全锚点](rust-r2k-preservation.json)分别保留原字节和边界。Rust211通过/54历史ignored、共享1185tests、K43请求/端及实际ZIP/并发/故障/OBS/UI均已核；schema既有分类与OBS断连生命周期差异明列。当前仍Doing、99/108，提交集成、固定提交复核和G4待完成；只有K完整G4后可104/108，L4/R2M、整个R4、两lookup和父项保持未完成。
