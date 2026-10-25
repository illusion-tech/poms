# RUST-R0E 构建与隔离数据库实施基线

**日期**：2026-10-26；**Owner**：主代理；**类型**：环境 / process-only，附独立依赖验证程序；**G1**：Pass（用户已明确授权本切片，输入与边界如下）。

## 1. 范围与正式输入

依据 [R0 基线](rust-r0-baseline.md)、[环境清单](rust-r0-environment-inventory.md)、[ADR-018](../adr/018-rust-backend-and-sqlx-persistence.md) 和用户本轮要求，准备可实际构建、运行的 TEST 兼容环境，以及 PostgreSQL 15 隔离验收库。当前 TEST 应用为 Debian 12 / x86_64 / glibc 2.36；数据库为 PostgreSQL 15.12、UTF8、libc `en_US.UTF-8`、记录的 collation version 2.34、会话 `Etc/GMT-8`、`pgcrypto 1.3`、`btree_gist 1.7`。

本机 Windows PostgreSQL 17.4 的服务、配置、端口 5432、数据目录和现有 `poms` 库保持原样。TEST 只允许补充只读元数据，禁止迁移、seed、业务重放及其他写入。PROD 尚未部署；本切片不远程发布，不安装 Windows 桌面容器组件、不重启主机，不启动 R1 业务实现。

## 2. 冻结边界

- WSL Debian 内安装所需容器工具及运行依赖，优先无特权 Podman；已验证用户 namespace 可用且 subordinate UID/GID 已配置。包安装仅补所需项，不执行系统整体升级。
- 构建与数据库分别使用独立、记录 digest 的容器镜像。构建镜像匹配 Debian 12/glibc 2.36；数据库镜像验证 PG15.12、扩展与 locale。数据库记录的 collation version 与实际系统版本分开核实；差异不能通过修改 catalog 掩盖。
- 隔离资源统一前缀 `poms-r0e`，用户级状态目录 `/home/wangzishi/.local/share/poms-r0e`。数据库只绑定 WSL loopback 的候选端口 15432，使用独立卷及 `poms_r0e_nest` / `poms_r0e_rust` 数据库；端口、角色、口令与 Windows 开发库分离。
- 新口令只保存于用户私有状态目录，限制文件权限，不写入 Git、日志或对话。脚本在写入前核实容器名、数据库名、版本和隔离标识；不从仓库根 `.env` 自动读取目标。
- 依赖验证程序位于 `tools/rust-r0e/probe`，锁定版本/features/toolchain 并在兼容环境构建；仅验证依赖联编、健康响应、SQLx 数据类型与事务，不承接产品路由或业务行为。缓存、target 与运行日志保存在 Linux 文件系统。
- 两个离线 inventory 的跨平台指纹改用明确版本 2：UTF8 文本仅将 CRLF 规范化为 LF 后解析和散列，保留原冻结源码 HEAD、输入变更拒绝规则与全部业务集合/计数。旧原始字节清单保留为第一轮证据；Windows 与独立 Linux checkout 必须复算出一致结果，不能通过忽略 source guard 消除差异。

公共路由、业务命令、DTO、鉴权、领域表和产品 migration 均为 N/A：本切片不改变这些合同。隔离库只创建基础 schema、扩展与验证数据；完整产品 schema 初始化及行为兼容由 R1 的明确输入负责。

## 3. 验收与清理

验收要求：镜像身份/OS/glibc、精确 Rust/Cargo/crate lock、fmt/clippy/build、ELF 架构/动态依赖、目标基线运行、PG15.12/locale/扩展/会话参数、两库隔离、事务回滚与约束、SQLx numeric/date 映射、容器停止/重启后数据保留、PG17 服务身份与配置未变。未执行项目分别保留 Pending，不以最小 probe 通过代替 R1 或 R0 全阶段完成。

提供显式启动、停止和核验入口；清理只针对本切片容器/卷/缓存，默认停止保留数据，删除数据须单独显式选择。不得使用全局 container/volume prune。记录包安装、镜像 digest、版本及验证结果；G4 仍取决于后续提交与归档。

## 4. 执行记录

本机 WSL 安装 Podman 5.4.2、uidmap、slirp4netns、fuse-overlayfs 及依赖，共新增 22 个包，0 升级、0 移除。使用 rootless、`cgroupfs`、`slirp4netns`；没有修改 Windows PostgreSQL、WSL 资源配置、用户 D-Bus 或全局容器清理策略。

| 产物          | 已冻结值                                                                                | 实测边界                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 构建镜像      | `f8284fad99901b0c71bffd7a76a58ff6f56443755ccd3deacbca488557bb7244`                      | Debian 12、x86_64、glibc 2.36；实际执行编译与检查                                                                     |
| PG 镜像       | `b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a`                      | UBI 9.7 基础；glibc/locale 包 `2.34-283.el9_8`；PG 15.12 源码构建                                                     |
| Rust          | `1.97.1` / commit `8bab26f4f68e0e26f0bb7960be334d5b520ea452`                            | `rust-toolchain.toml` 与镜像一致，fmt/clippy/Cargo 同工具链                                                           |
| Node / pnpm   | `24.16.0` / `12.3.4`                                                                    | 普通 pnpm 与 Corepack 0.35.0 的默认 pnpm 均验证为 12.3.4                                                              |
| 生成/辅助工具 | Deno `2.9.1`、Java `17.0.21`、psql client `15.19`                                       | 都在构建镜像实际运行；客户端版本与 PG server 15.12 分开记录                                                           |
| Rust 依赖锁   | `Cargo.lock` SHA-256 `9aa5bd462e32b0b686376895920a858e02fd64969c5aa0c03d35bbef977f5fb7` | 锁文件含 227 个 package 记录（含 probe 与可选平台/依赖）；本次 metadata 返回 192 个记录；两者均不当作全部已启用组件数 |
| 验证程序      | SHA-256 `f766df98d876158b62f7116eb0968bbf72653c1d34996d9ea97a1a743f1b4c61`              | x86_64 ELF；最高所需 GLIBC 2.34；不是产品 API 可执行文件                                                              |

直接依赖固定 Axum 0.8.9、Tokio 1.54.1、Tower 0.5.3、SQLx 0.9.0、Serde 1.0.229、Utoipa 6.0.0、rust_decimal 1.43.0，以及 chrono/uuid/serde_json，完整 features 见 [Cargo.toml](../../tools/rust-r0e/probe/Cargo.toml)。最高已声明的依赖 MSRV 为 1.94；部分包未声明 MSRV，因此以 Rust 1.97.1 的实际锁定构建为兼容证据。`cargo tree -e features -p sqlx` 未启用 MySQL、SQLite 或 macros；锁文件中存在可选记录不等于驱动已启用。

PostgreSQL 使用官方 15.12 源码，SHA-256 `3bc8462a38ca0857270cc88b949a3f6659f0d5c44c029c482355835b61a0f6f7`；配置为 `--with-openssl --without-readline`。禁用 readline 只影响 psql 交互编辑。`poms_r0e_nest` / `poms_r0e_rust` 各有基础 schema、扩展与隔离标识；未执行产品历史迁移或 seed。两库 stored/actual collation 均为 2.34；TEST 只读合成排序样本与两库一致，指纹 `d66142528ed50eca27104827cdf9e6a2`。此样本不替代完整产品数据排序验收，也不推断 TEST 数据库的发行版/locale 包补丁与 UBI 相同。

## 5. 验证记录与下游输入

| 检查                       | 结果 | 证据 / 限定                                                                                                           |
| -------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------- |
| Rust 格式 / lint / release | Pass | `cargo fmt --check`、`cargo clippy --locked --all-targets -- -D warnings`、`cargo build --locked --release`           |
| 纯运行镜像                 | Pass | 同一 ELF 在纯 Debian 12 镜像连接两个 PG15 库；不是只在编译镜像内运行                                                  |
| ABI                        | Pass | `readelf` / `ldd`：仅 libc、libm、libgcc_s 与 ELF loader，最高 GLIBC 2.34，匹配当前 TEST 2.36 基线                    |
| 两库 SQL smoke             | Pass | 版本/locale/扩展/低权限、TEMP、唯一/FK/版本 CAS/GiST 排斥、金额/日期/JSON、savepoint 与整事务回滚                     |
| SQLx 类型/HTTP             | Pass | 两库真实 app 角色；Decimal/date/timestamptz/UUID/JSON 映射与回滚；Tower、loopback HTTP、Serde/Utoipa probe            |
| 错误目标拒绝               | Pass | 无网络、无口令容器中分别拒绝 5432、既有 `poms` 库、管理员角色和继承 PGOPTIONS                                         |
| 容器重启持久性             | Pass | stop/start 后两个 marker UUID 与 created_at 不变；原数据卷复用                                                        |
| 本机互通                   | Pass | WSL host 的 SQLx 客户端与 Windows 的只读 app 连接均可用 127.0.0.1:15432                                               |
| 原 PG17 保留               | Pass | `170004`、服务 PID 6996、server PID 8636、5432 监听保持；server_started_at 仍为 `2026-10-23T11:59:34.659Z`            |
| 清单跨平台复算             | Pass | Windows Node 24.19.0 / Linux Node 24.16.0，均 TypeScript 6.0.3；v2 JSON 指纹一致；v1 业务集合按同一换行规范化对照一致 |
| 文档 / 工具检查            | Pass | 4 个 shell 语法、2 个 inventory 语法/lint/格式、Markdown、diff、14 份文档 126 个本地链接及非作者审查通过              |

真实联调发现 SQLx 0.9 在 startup 固定发送 UTC，不继承 TEST 会话默认值。probe 在确认目标库、版本、隔离标识、app 身份和低权限后执行 `SET TIME ZONE 'Etc/GMT-8'` 并回读。R1 必须把这一步写入连接池每条新连接的 `after_connect` 合同；只对 pool 执行一次 SET 不足够。probe 的 Utoipa 输出仅用于联编验证，现有 TS OpenAPI 生成权未转移；TLS features 已编译，本次 loopback 没有认证 TLS 握手。

操作入口见 [R0E 工具说明](../../tools/rust-r0e/README.md)，[机器验收快照](rust-r0e-validation.json)保存实际命令结果、源码/锁文件/二进制指纹、镜像内库与 locale 文件指纹、SQL smoke、类型 probe 和 Windows 只读连接结果。完整构建日志位于该用户的 `~/.local/share/poms-r0e/logs`，快照记录其指纹；口令只在 Linux 私有目录/Podman secret 中。

当前专用 PG15 容器保持运行，可用工具入口按需停止并保留卷；日常开发仍可直接使用原 PG17 的开发测试库，PG15 用于 TEST 兼容验收。隔离库内未创建产品业务 schema 内容。

**G3**：Pass；非作者审查发现的运行角色 guard 已修复并重跑正负例，锁文件计数口径已修正。**G4**：未提交/归档。R0F 的路由/兼容样本冻结、R1 产品 schema 与认证/连接池/跨平台启动器、R6 发布接管均未被本切片完成状态替代。
