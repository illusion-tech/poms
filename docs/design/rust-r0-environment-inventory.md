# Rust R0：开发、测试与发布环境盘点

**状态**：初始只读历史快照与 R0E 后续已验证结果；当前 TEST 对齐的依赖锁定、兼容构建和隔离 PG15 已验证，R1/R6 工程仍未完成

**核验日期**：2026-10-26，Asia/Tokyo（UTC+09:00）；初次盘点 04:27–04:50，本机 PostgreSQL 续查 04:56–04:58；R0E 后续执行证据见第 9 节

**代码基线**：`033aedd028fc25ea990450a7854fc92c567cfb8a`

**正式输入**：[后端 Rust 重构计划](backend-rust-migration-plan.md)、`CLAUDE.md`、[实施治理规则](implementation-governance-gates.md)

## 1. 证据范围与结论

初次盘点对版本、路径、端口和公开依赖端点执行只读检查；测试、初始化及发布行为来自上述 HEAD 的源码审查。当时未执行安装、Cargo 构建或数据库初始化。04:56–04:58 续查使用根 `.env` 的既有本机连接执行 `BEGIN READ ONLY` 元数据查询并 `ROLLBACK`；TEST 只读结果由主代理提供，来源在第 5、7 节区分。

用户随后授权 R0E 环境准备。主代理完成专用容器工具安装、镜像构建、隔离 PG15 初始化和独立 probe 的实际编译/运行，第 9 节记录这些后续结果，不回写为初查时已完成。本次没有运行产品 API 单测、产品 E2E/Playwright、产品 OpenAPI 生成、历史 migration/seed、远程发布或性能基准；现有 Windows PG17 与 TEST 未执行写入或业务重放。

“初查已核实”只表示对应版本查询或只读检查得到结果；“静态确认”不表示该链条已经运行通过。第 9 节的 Pass 限定到已执行的环境/合成 probe，不代表产品业务兼容；Pending 保留给尚未完成的工程。本文件不能单独作为 R0 全阶段完成、R1 已放行或产品后端可部署的证明。

当前兼容目标按用户决定冻结为既有 TEST：Debian 12（bookworm）、x86_64、glibc 2.36、PostgreSQL 15.12；开发工作继续在 WSL Debian 13.7。用户确认尚未部署 PROD，因此它不是当前 R0/R1 阻断，首次正式部署前再核验目标。R0E 已验证固定 Rust 工具链及 probe 依赖锁、容器内辅助工具、Debian 12 兼容构建/运行与两个隔离 PG15 库。跨平台启动器、浏览器和产品 schema/认证/业务验收属于 R1；迁移器、正式进程托管和切流回退属于 R6。

## 2. 初次源码与本机平台快照

### 2.1 checkout 位置

| 项目                       | 已核实事实                                                                               | 证据时间 |
| -------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Windows 工作树             | `E:\projects\poms`，HEAD 为本文代码基线；首次检查时干净                                  | 04:27:08 |
| WSL 访问 Windows 源码      | `/mnt/e/projects/poms` 存在；只用于读取/提交同步，不作为 Linux 依赖和 Cargo 产物共享目录 | 04:27:38 |
| Linux 源码位置             | `/home/wangzishi/projects/poms-rust`                                                     | 04:32:58 |
| Linux checkout 分支与 HEAD | `codex/rust-backend-r0`；HEAD 为本文代码基线；`git status --short --branch` 仅显示分支行 | 04:32:58 |
| Linux origin               | `https://github.com/illusion-tech/poms.git`                                              | 04:32:58 |
| 文档同步边界               | Linux checkout 尚不含本轮未提交的 R0 文档；不能据此声称已经与最终 R0 提交同步            | 04:32:58 |

`/home/wangzishi/projects` 原本存在，`poms` 与 `poms-rust` 两候选子目录在 04:30 前均不存在。主代理随后按授权创建独立 Linux checkout，本盘点再次只读核验了其路径、分支、HEAD、origin 与干净状态。没有复制 Windows `node_modules`。Linux 源码及后续 `target/` 放在 Linux 文件系统，与 [Microsoft WSL 文件存放建议](https://learn.microsoft.com/en-us/windows/wsl/filesystems) 一致；本轮没有测试文件系统性能。

### 2.2 平台版本快照

| 项目               | 版本或状态                                           | 来源                                                 |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| Windows            | Windows 11 专业版 Insider Preview；`10.0.29683.1000` | `wsl --version` 与 Win32_OperatingSystem             |
| PowerShell         | `7.6.5`，原生命令参数模式 `Windows`                  | `$PSVersionTable`、`$PSNativeCommandArgumentPassing` |
| WSL                | `3.0.4.0`；Debian 为 WSL2，检查时 Running            | `wsl --version`、`wsl --list --verbose`              |
| Linux              | Debian GNU/Linux `13.7`（trixie），`x86_64`          | `/etc/os-release`、`uname -a`                        |
| Linux kernel       | `6.18.54.1-microsoft-standard-WSL2`                  | `uname -a`                                           |
| Linux libc         | glibc `2.41`；Debian 包 `2.41-12+deb13u4`            | `getconf GNU_LIBC_VERSION`、`dpkg-query`             |
| Linux init / 时区  | PID 1 为 `systemd`；`Asia/Tokyo`                     | `ps -p 1 -o comm=`、`/etc/timezone`                  |
| WSL 网络模式       | `nat`                                                | `wslinfo --networking-mode`                          |
| Linux 文件系统空间 | `/` 快照约 1007 GiB 总量、938 GiB 可用               | `df -h`；仅空间快照                                  |

## 3. 初次 Rust 与 Linux 原生依赖快照

### 3.1 已安装工具链

| 项目                 | 已核实版本                                                                              |
| -------------------- | --------------------------------------------------------------------------------------- |
| rustup               | `1.29.1 (d95a37b6a 2026-08-13)`                                                         |
| 默认工具链名         | `stable-x86_64-unknown-linux-gnu`，当前实际编译器为 `1.97.1`                            |
| rustc                | `1.97.1 (8bab26f4f 2026-07-14)`；完整 commit `8bab26f4f68e0e26f0bb7960be334d5b520ea452` |
| Cargo                | `1.97.1 (c980f4866 2026-06-30)`                                                         |
| LLVM                 | `22.1.6`，来自上述 rustc                                                                |
| rustfmt / clippy     | `rustfmt 1.9.0-stable` / `clippy 0.1.97`，均对应上述 rustc commit                       |
| host / 已安装 target | 仅核实到 `x86_64-unknown-linux-gnu`                                                     |
| 其他已安装工具链     | `1.96.0`、`1.98.0`；均为 `x86_64-unknown-linux-gnu`                                     |
| 默认工具链组件       | cargo、rustc、rust-std、rustfmt、clippy、rust-docs                                      |
| 附加组件             | `1.98.0` 另有 `rust-src`；不是本项目必需组件已经冻结的证明                              |

以上命令在 Linux `$HOME` 下执行，避免其他项目的工具链 override 干扰。`wsl.exe -d Debian --exec sh ...` 的非登录 PATH 没有包含 `~/.cargo/bin`：`command -v rustc/cargo/rustup` 均找不到，但通过 `/home/wangzishi/.cargo/bin/` 的绝对路径可以运行。R1 启动器必须显式准备进程 PATH 或使用明确的工具路径，不能仅凭交互式 shell 可运行来判断 Nx/测试子进程可用。

**初查兼容冻结候选**：当时以已核实的 Rust `1.97.1`、`rustfmt`、`clippy` 和 `x86_64-unknown-linux-gnu` 提出候选，尚未完成依赖联编。host 仅安装名为 `stable` 的 1.97.1，不把它等同于已固定的命名工具链；冻结应使用精确版本，不能使用会漂移的 `stable`。

后续 R0E 已在固定构建镜像中验证 Rust/Cargo 1.97.1、edition 2024、精确 crate/features 和 [Cargo.lock](../../tools/rust-r0e/probe/Cargo.lock)，通过 fmt/clippy/release 及运行 probe，见第 9 节。这是独立依赖验证程序的冻结，不是尚未实现的产品后端全部依赖或业务行为认证；R1 增加 features/依赖时仍须重新验证。

### 3.2 原生工具与系统库

| 工具/依赖              | Linux 核验结果                                                              | 迁移影响                                                                 |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| C/C++ 编译与 linker    | `cc/gcc 14.2.0`；GNU ld `2.44`；build-essential `12.12`，binutils `2.44-3`  | 已有 GNU 编译链；尚未编译本项目 Rust 依赖                                |
| libc headers           | `libc6-dev 2.41-12+deb13u4`                                                 | 存在；不能推出发布产物兼容旧 glibc                                       |
| pkg-config             | 工具 `1.8.1`；Debian 包 `1.8.1-4`                                           | 可查询系统库                                                             |
| OpenSSL                | CLI/library `3.5.7`；`libssl-dev 3.5.7-1~deb13u3`；pkg-config 返回 `3.5.7`  | native-tls 候选条件具备；最终 TLS features 未冻结                        |
| clang / lld            | 未找到                                                                      | 使用现有 GNU linker 时不自动构成阻断；如最终 crate/features 需要，再补齐 |
| PostgreSQL 客户端      | Linux `psql`、`pg_isready`、`pg_dump`、`createdb` 均未找到                  | Linux 客户端/隔离验收工具待准备；Windows 已有客户端，见第 5.2 节         |
| libpq 开发包           | `libpq-dev` 未安装；`pkg-config libpq` 失败                                 | 单独记录缺项，不将其机械列为 SQLx PostgreSQL 的必需 C 库                 |
| Git                    | `2.47.3`；Debian 包 `1:2.47.3-0+deb13u1`                                    | Linux checkout 只读查询已成功                                            |
| curl / CA              | curl `8.14.1`，包 `8.14.1-2+deb13u5`；ca-certificates `20250419`            | 公开 HTTPS 端点检查成功，范围见第 5 节                                   |
| SSH / scp / rsync      | Linux `ssh`、`rsync` 未找到；不能据 Windows OpenSSH 推出 Linux 发布工具可用 | 当前 Deno 发布使用 ssh/scp；rsync 不是现有发布入口的必需项               |
| tar / gzip / sha256sum | 命令可找到                                                                  | 未据此宣称发布包构建或校验已经通过                                       |
| Nginx / PM2            | Linux 命令未找到                                                            | 不作为 R1 API 开发必装项；目标机托管与 Nginx 在 R6 验收                  |

SQLx 官方说明 PostgreSQL 驱动为纯 Rust，并要求明确 runtime/TLS features。`libpq-dev` 的缺失与 SQLx 应用能否构建应分别判断；不能从“OpenSSL 已安装”反推出已经选用了 native-tls。出处：[SQLx 官方仓库](https://github.com/transact-rs/sqlx)，2026-10-26 查阅。

## 4. 初查 Node、生成器与测试运行时

本节表格保留初次 Windows/WSL host 的实际状态。后续 R0E 在构建镜像中提供并验证了 Node/pnpm/Corepack/Deno/Java/psql；这不等于把这些工具全局安装到 WSL host，也不等于产品 workspace、客户端生成器或浏览器 E2E 已通过。当前容器工具版本见第 9 节。

| 项目              | Windows 现状/仓库声明                                                      | Linux 现状                                                         | 结论                                                |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| Node.js           | 实测 `v24.19.0`                                                            | `node` 未找到                                                      | Linux 安装版本待固定；不复用 Windows node_modules   |
| pnpm              | `packageManager` 精确声明 `12.3.4`（含完整性摘要）；未执行 pnpm 版本查询   | PATH 命中 Windows fnm 目录下 pnpm shim，运行提示 `node: not found` | Linux pnpm 未就绪；shim 存在不等于安装成功          |
| Corepack          | Windows 实测 `0.35.0`                                                      | 命中 Windows shim，但不可执行                                      | Linux 对应入口待准备                                |
| Deno              | Windows 实测 `2.9.1`；部署 README 写本地 Deno 2.8                          | 未找到                                                             | README 的基线表述与当前实机分开记录；不在本轮改版本 |
| Java              | Windows PATH/JAVA_HOME 为 OpenJDK `11.0.31`；脚本默认 Zulu 17 路径不存在   | 未找到                                                             | 当前已检查路径不满足生成脚本的 Java 17+ 要求        |
| Nx / TS           | Windows node_modules 版本 `23.2.1` / `6.0.3`                               | 未准备 Linux node_modules                                          | 只核实包元数据，没有执行 Linux Nx                   |
| NestJS / MikroORM | Windows node_modules `@nestjs/core 12.0.1` / `@mikro-orm/core 7.0.11`      | 未准备                                                             | 迁移期旧服务与 seed 工具仍依赖这些包                |
| Playwright        | Windows node_modules `1.63.0`                                              | 未核实 Linux browser 二进制及系统依赖                              | 不能把 npm 包存在视为浏览器可运行                   |
| OpenAPI Generator | wrapper node_modules `2.41.0`；`openapitools.json` 固定 generator `7.20.0` | 未准备                                                             | wrapper 版本与 Java jar 版本是两层依赖              |

版本来源为 `package.json`、`openapitools.json`、对应 node_modules 的 package.json 与显式 `--version`。OpenAPI Angular generator 配置中的 `ngVersion` 仍为 `21.0.0`，而当前应用声明 Angular 22；这是既有配置事实，R0 不静默更新，R1 跨平台输出对照须保留或另行解释其变更。

### 4.1 API E2E：当前硬编码与 R1 方案

源码：[server-config.ts](../../apps/poms-api-e2e/src/support/server-config.ts)、[server-harness.ts](../../apps/poms-api-e2e/src/support/server-harness.ts)、[API E2E project.json](../../apps/poms-api-e2e/project.json)、[jest.config.ts](../../apps/poms-api-e2e/jest.config.ts)。

- `globalSetup` 无条件调用 managed server；先执行 Nx `poms-api:build --skip-nx-cache`，再以 `process.execPath` 启动 `dist/apps/poms-api/main.js`。当前没有外部 API URL 或 Rust 启动器选择入口。
- Axios baseURL 由 `HOST/PORT` 拼成 `/api`，默认 `127.0.0.1:3344`；`proxy=false` 已设置。Nx e2e target 还依赖 `poms-api:seeder-run`，后者会先执行旧迁移。
- teardown 使用 Windows taskkill 或 Linux SIGTERM；存在基于记录状态与端口的 `killPort` 回退。它不是可安全接管任意外部服务的 teardown。
- managed readiness 当前仅等端口开放，并未要求 `/api/health/readiness` 返回 ready。

R1 固定一个由 Node/Deno 实现、通过参数数组调用子进程的跨平台编排入口，共用现有 HTTP 场景，区分 `nest`、`rust`、`external` 三种后端模式。外部模式不构建、不 seed、不杀外部进程；managed 模式仅回收自己启动且身份匹配的进程。URL/端口应从统一配置解析，等待 readiness 后才执行测试。迁移和 seed 独立成为显式前置步骤，选择脱敏隔离库后才可运行，不能由“外部模式”仍隐式触发默认 Nx 的 Node seed。接口变量名、任务名及实现由 R1 G1 固定，本轮未新增这些入口。

### 4.2 浏览器 E2E：当前 PowerShell 依赖

源码：[playwright.config.ts](../../apps/poms-admin-e2e/playwright.config.ts)、[浏览器 E2E project.json](../../apps/poms-admin-e2e/project.json)、[前端代理](../../apps/poms-admin/proxy.conf.cjs)。

- `POMS_ADMIN_BASE_URL` 与 `POMS_API_BASE_URL` 已可使 Playwright 跳过相应 managed webServer；API URL 为不含 `/api` 的 origin。
- 默认 API/前端启动命令写死 `powershell -NoProfile -Command ...`，不能在未安装 Windows PowerShell 的 Linux 上直接运行。
- 默认 `POMS_E2E_PORT_SEED=300`，admin 端口为 `4400+seed=4700`，API 为 `5400+seed=5700`。`POMS_E2E_LOOPBACK_HOST` 默认为 `localhost`。
- 前端代理目标由 `POMS_API_PROXY_TARGET` 决定，默认 `http://127.0.0.1:3333`。仅指定外部 API 地址不会自动重配已经外部启动的前端代理。
- Nx 浏览器 e2e 仍依赖 `poms-api:seeder-run`；设置外部 URL 不会取消该依赖。Playwright 保留 trace/失败截图，代理排除包含 localhost 与 127.0.0.1。

R1 将默认 webServer 启动统一转入上述跨平台编排入口，明确 seed、API、admin 的所有者。优先让 API、前端代理、Jest/Playwright 位于同一个 WSL 网络空间。Windows 手工浏览器访问另行验证。禁止为解决启动脚本而长期复制 Linux/Windows 两套业务场景或生成逻辑。

### 4.3 OpenAPI 与生成客户端

源码：[API target](../../apps/poms-api/project.json)、[openapi.ts](../../apps/poms-api/src/openapi.ts)、[客户端 target](../../libs/shared/api-client/project.json)、[生成脚本](../../tools/openapi/generate-shared-api-client.ps1)、[检查脚本](../../tools/openapi/check-shared-api-client.ps1)、[Java 检测](../../tools/openapi/ensure-java17.ps1)、[行尾规范化](../../tools/openapi/normalize-line-endings.ps1)。

当前 API 规范由 ts-node 启动 Nest 测试模块导出；MikroORM 被替换为 `connect:false` 的模块。这一静态设计说明生成入口不应依赖真实业务库，但本轮没有运行来证明无环境副作用。

客户端 `generate/check` 均依赖 `poms-api:openapi`。生成脚本使用 `powershell`、`robocopy /MIR`，Java fallback 使用 `java.exe` 与 Windows 安装路径；仅把顶层命令替换成 `pwsh` 不足以完成 Linux 适配。临时目录目前使用固定名称，R1 还需避免并发生成/检查互相清理。

R1 将生成、元数据保留、同步、UTF-8 无 BOM/LF、尾随空白清理、文件末尾换行、临时目录和 diff 退出码归入一个共用实现。保留 generator `7.20.0`、配置文件、`--skip-validate-spec` 及 nullable `$ref` 归一化语义；变更它们需独立说明。Windows 入口可以委托同一个实现。先对冻结 OpenAPI 做新旧生成目录对照，再运行 client check；迁移期规范生成权继续由旧后端持有，R6/R7 转移前必须已有全量契约对照。

## 5. 网络、端口与隔离数据库

### 5.1 已运行的只读网络检查

2026-10-26 04:32:30+09:00，在 Debian 内对以下公开官方 registry/CDN URL 执行 `curl --head --location --max-time 8`；五项均 `curl_exit=0`、HTTP `200`：

- `https://index.crates.io/config.json`
- `https://static.rust-lang.org/dist/channel-rust-stable.toml.sha256`
- `https://registry.npmjs.org/pnpm`
- `https://jsr.io/@std/path/meta.json`
- `https://repo.maven.apache.org/maven2/org/openapitools/openapi-generator-cli/7.20.0/openapi-generator-cli-7.20.0.jar`

这只证明当时 HEAD 请求可达。没有下载依赖、安装组件、确认完整 crate tarball/Java jar/browser 下载、验证 GitHub push 权限或连接业务服务。代理、CA、认证和网络变化仍可能影响实际安装。

初次盘点对 Windows 与 WSL 查询 `3333/3344/4200/4700/5432/5700` 时，没有取得返回的监听项；这不是“本机没有 PostgreSQL”的证据。04:56 续查已将 Windows 服务、postgres PID 与 `0.0.0.0:5432`、`[::]:5432` 的监听对应，并通过实际服务端查询核实已有实例。后续 R0E 已验证 WSL 与 Windows 经 `127.0.0.1:15432` 连接专用 PG15；这不代表两种系统间任意 localhost 转发或从 WSL 对真实 TEST 执行业务访问已获认证。

| 用途                  | 当前默认值                | R1 约束                                                                 |
| --------------------- | ------------------------- | ----------------------------------------------------------------------- |
| Nest 开发 API / admin | `3333` / `4200`           | 保留既有默认，不与 Rust 占用同一端口                                    |
| Nest API E2E          | `3344`                    | 独立隔离库及独立进程                                                    |
| managed 浏览器 E2E    | API `5700` / admin `4700` | 同一 seed 对应 API 与 admin/代理；Rust 使用不同 seed 或显式 URL         |
| Rust 开发 / API E2E   | 尚未实现                  | 建议候选 `3334` / `3345`，具体值由 R1 G1 冻结；当前未检查这两个候选端口 |
| PostgreSQL            | Windows 已有实例 `5432`   | 保留既有 `poms` 开发库；隔离验收库与跨网络空间连接须独立确认            |

R1 必须确认有效 bind 地址、CORS origin、Cookie Secure/SameSite/Path、NO_PROXY、前端代理和 readiness 地址。当前 schema 有 HOST 默认值，但 `main.ts` 仅调用 `app.listen(port)`，未显式传入 HOST；不把环境变量 HOST 的存在当作已验证的实际绑定行为。

### 5.2 PostgreSQL：已有实例与当前兼容目标

初次盘点未连接数据库；下列为用户补充“本机有 pgsql 开发实例”后于 04:56–04:58 获得的只读证据，不把早先端口查询未返回结果解释为实例不存在。此处是既有 Windows/TEST 实例的历史续查快照；后续新建的专用 PG15 见第 9 节。

| 项目                        | 本机开发实例：本代理直接核验                                                                                          | TEST：主代理只读元数据核验                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 实际 server version         | PostgreSQL `17.4`，`170004`；x86_64-windows，MSVC `19.42.34436`                                                       | PostgreSQL `15.12`；x86_64，GCC `10.3.1`                                                 |
| 定位                        | Windows `127.0.0.1:5432`，database `poms`；根 `.env` 的既有连接                                                       | `deploy/private/poms-test.env` 所定位的现有 TEST，database `poms_test`                   |
| 进程/数据目录               | 服务 `postgresql-x64-17` 为 Running/Auto；pg_ctl PID `6996`，server PID `8636`；`D:\Program Files\PostgreSQL\17\data` | 本节不以数据库服务器版本反推其 OS 或数据目录                                             |
| 实例启动时刻                | `2026-10-23T11:59:34.659Z`，由 `pg_postmaster_start_time()` 返回                                                      | 本次报告未提供                                                                           |
| 编码                        | `UTF8`                                                                                                                | `UTF8`                                                                                   |
| 数据库 locale               | `LC_COLLATE=zh-CN`、`LC_CTYPE=zh-CN`；provider `c`；collation version `1541.2,1541.2`                                 | `LC_COLLATE=en_US.UTF-8`、`LC_CTYPE=en_US.UTF-8`；provider `c`；collation version `2.34` |
| 本次 session TimeZone       | `Asia/Shanghai`                                                                                                       | `Etc/GMT-8`                                                                              |
| 已安装扩展（所在 database） | `btree_gist 1.7`、`pgcrypto 1.3`、`plpgsql 1.0`                                                                       | `btree_gist 1.7`、`pgcrypto 1.3`、`plpgsql 1.0`                                          |
| `poms` schema 表数          | 107，仅查询系统元数据计数                                                                                             | 107；主代理另报告 504 个 index                                                           |
| 本次连接 TLS                | `pg_stat_ssl` 对本连接返回 `ssl=false`                                                                                | 本连接 `ssl=false`                                                                       |
| 只读保护                    | `BEGIN READ ONLY`；查询时 `transaction_read_only=on`；完成后 `ROLLBACK`；连接超时 5 秒、查询超时 10 秒                | 主代理报告 `BEGIN READ ONLY`、5 秒超时、`ROLLBACK`                                       |

本机服务端元数据完成于 2026-10-26 04:58:28+09:00，来源是 `SELECT version()/current_setting`、`pg_database`、`pg_extension`、`information_schema.tables` 和本连接的 `pg_stat_ssl`，不是 `psql --version`。两个实例的 session TimeZone 不等于 database/server 默认时区，locale 也不能从时区推定。`ssl=false` 仅描述本次连接，不能据此断言服务端不支持 TLS。107 个表的计数不等于与 106 个实体映射逐表一致；本机查询未返回表名清单，额外表身份未认证，也不为此新增连接。

当次续查发现 Windows 的 `psql.exe`、`pg_isready.exe` 位于 `D:\Program Files\PostgreSQL\17\bin`，但 PATH 找不到这些命令；`data/PG_VERSION` 为 17，配置明确 `listen_addresses='*'`、`port=5432`。这些文件信息只用于定位，实际补丁版本以以上 server 查询为准。当时 Debian 未发现 postgres/postmaster 进程、PostgreSQL socket、标准实例目录或 cluster 工具；Windows 未发现 Docker CLI、默认安装目录、用户 context、Docker 服务或后台进程，Debian 也未找到 docker/podman。当时没有安装或启动容器；后续 R0E 新装并使用 rootless Podman，不能把旧快照读成当前仍无容器环境。

**保留本机现有 Windows PostgreSQL 17.4 与 `poms` 数据库，不自动 reset、seed、迁移、降级或替换该实例。** 它可作为既有开发入口，但版本和 locale 与 TEST 不同，不能冒充 PostgreSQL 15.12 兼容验收库。应用配置 `DB_SCHEMA=poms`，本次普通连接的 `current_schema()` 为 `public`；R0E/R1 须显式固定 schema/search_path，不能把二者混为一谈。

用户已选择先对齐 TEST；当前数据库兼容输入为实际 PostgreSQL 15.12，PROD 尚未部署，不再等待不存在的 PROD 实例作为 R0/R1 前置。[ADR-012 第 8 节](../adr/012-data-persistence-technology-selection.md)原先以 PostgreSQL 16+ 为默认目标，与现有 TEST 15.12 的差异属于新发现的 `existing-baseline-drift`，由主 ADR/基线记录裁决；本次不升级或降级任何数据库。

源码明确要求：

- [初始 migration](../../apps/poms-api/src/migrations/Migration20260322193000_init_project.ts) 创建 `pgcrypto`。
- [成本费率约束 migration](../../apps/poms-api/src/migrations/Migration20260411120000_align_actual_cost_rate_version.ts) 创建 `btree_gist`；只核对 runbook 的 pgcrypto 会漏项。
- [持久化配置](../../apps/poms-api/src/app/core/persistence/persistence.config.ts) 默认 schema `poms`、迁移记录表 `poms_migrations`、`transactional/allOrNothing=true`、`ensureDatabase=false`；CLI 配置强制连接，运行时默认 `DB_CONNECT=false` 不代表 E2E 可离线完成。
- [配置加载](../../apps/poms-api/src/config/load-env.ts) 优先使用 `POMS_ENV_FILE`；显式文件不存在会退出，显式文件覆盖同名环境值。否则查找根 `.env` 和 `apps/poms-api/.env`。R1 不得依赖当前工作目录自动选到“看起来可用”的库。

后续 R0E 已创建与 TEST PG15.12 对齐的 `poms_r0e_nest`、`poms_r0e_rust`，具有独立数据库身份、基础 schema、扩展、owner/app 角色和持久 marker，见第 9 节。完整产品 migration、fixture 和业务授权仍未初始化/验收，留给 R1。现有 `poms`/`poms_test` 不作为可重置或重放业务的隔离库；连接信息留在私有配置，证据不输出密码、密钥或完整连接串。

续查采用以下只读元数据查询形态；具体字段与结果范围见上表，没有查询业务数据行：

```sql
begin read only;
select version(), current_database(), current_user, current_schema();
select current_setting('server_version_num'), current_setting('TimeZone');
select datcollate, datctype from pg_database where datname = current_database();
select extname, extversion from pg_extension order by extname;
rollback;
```

数据库初始化、migrate/seed 不属于上述只读 SQL；必须另行明确隔离目标和执行责任后进行。

## 6. core、初始化与后台行为全覆盖

### 6.1 全部 core 目录

以下八个直接子目录全部纳入迁移范围。单测数量是 `.spec.ts` 文件计数，代表静态存在，不代表已通过或覆盖完整。

| core 目录                    | 当前职责与副作用                                                                              | 单测文件 | 去向/验收边界                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `auth`                       | Cookie/CSRF、token 哈希、会话续期与撤销、三个全局 guard；会话读取可以写 last_seen/idle expiry | 7        | R1；旧会话/登出/过期/停用/越权与 CSRF 负面场景              |
| `date`                       | `business-date.utils.ts`，业务时区固定 `Asia/Hong_Kong`；日期字符串与 Date 转换               | 0        | R1 公共日期语义，R3–R5 领域样本；不能用主机 Asia/Tokyo 替代 |
| `health`                     | liveness 与 DB readiness；未连接时 readiness 会尝试连接，失败响应 503                         | 2        | R1；进程存活与依赖就绪分开；R6 目标机再验                   |
| `persistence`                | 环境到 MikroORM 连接、实体发现、迁移与 seed 配置                                              | 0        | R1 SQLx/config；旧迁移权保留到 R6                           |
| `platform`                   | `dev-platform.fixtures.ts`，开发组织/角色/用户等 fixture；不是可忽略的空模块                  | 0        | R1/R2 测试固件及 R6 初始化工具；不复制为正式默认账号        |
| `runtime-audit`              | 审计与安全事件表/查询、请求上下文；记录逻辑可接收业务事务 EntityManager                       | 1        | R1 基础、R2 能力；每个业务域迁移验证事务/审计副作用         |
| `secret`                     | AES-256-GCM；`v1` 版本化编码、SHA-256 派生及环境密钥选择                                      | 1        | R1；旧密文和密钥格式兼容；不输出真实密钥                    |
| `sensitive-field-projection` | 可见/遮罩/拒绝投影、权限策略、读取时记录安全事件                                              | 1        | R1/R2；前端是否调用不影响覆盖义务                           |

来源：`apps/poms-api/src/app/core/` 全目录及 [AppModule](../../apps/poms-api/src/app/app.module.ts)。整个 API 源码下静态有 72 个单测文件，API E2E 14 个业务测试文件，admin E2E 8 个测试文件。本轮均未运行。

`features/` 的 22 个直接子目录也已枚举：`approval`、`approval-summary`、`attachment`、`business-discussion`、`business-number`、`commission`、`contract`、`contract-finance`、`contract-readiness`、`customer`、`dictionary`、`external-org-sync`、`identity-provider`、`lead`、`navigation`、`platform`、`project`、`project-cost`、`project-handover`、`sales-follow-up`、`sales-intelligence`、`system-setting`。模块级 route/表/事务映射由 R0 对应矩阵负责；这里将它们作为启动、副作用与环境检查的全集，不能仅按前端用到的模块缩小范围。

### 6.2 初始化、到期检查、请求内重试与调度

| 类别                  | 当前静态事实                                                                                                                                                           | 迁移与切换要求                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| API bootstrap         | `main.ts` 校验配置、创建 Nest 应用、装载模块/guard/序列化、Swagger、CORS 并监听端口；未见自动 migration 或 seed 调用                                                   | R1 复制配置/路由/日志/错误/绑定语义；生产应用启动不悄悄执行 DDL/seed                                           |
| 迁移入口              | Nx `migration-*` 与 Deno migration gate 使用本地 MikroORM CLI；不是 Rust 迁移器                                                                                        | R1–R5 维持单一旧迁移权；R6 冻结 SQL baseline、锁/校验和/失败恢复后接管                                         |
| 开发/E2E 初始化       | `DatabaseSeeder` 读取开发 fixture，删除重建指定开发用户/角色/组织，清理 E2E 与种子项目的跨域依赖后写入样例、编号及测试业务数据                                         | 仅用于隔离开发/E2E；不能当作无副作用 upsert 或共享试用环境 bootstrap；R6 替代工具须覆盖同一测试语义            |
| 平台 bootstrap        | `PlatformBootstrapSeeder` 调用 `seedOrgUnits/seedRoles/seedRolePermissions`                                                                                            | R2 固定数据语义，R6 提供可重复初始化入口；不得被开发账号 seed 替代                                             |
| 业务试用初始化        | `BusinessTrialSeeder` 先平台 bootstrap，读取私有 `POMS_TRIAL_USERS_CSV`，验证账号/角色/密码约束，写账号/凭证/成员关系和 `TRIAL-*` 演示数据                             | 试用与 E2E 范围分开；保留幂等、账号绑定和不删除后续业务数据的约束；R6 接管                                     |
| seed 辅助资产         | `dev-seed-data.ts`、`seed-utils.ts` 负责固定样本、SQL 值/日期编码、稳定 UUID                                                                                           | 数据与编码也是迁移输入；R1–R5 共用可追溯 fixture，R6 替代工具需对照                                            |
| 会话/票据/上传到期    | 会话解析/续期/撤销、身份票据和上传/下载包在请求路径检查状态和 expiresAt；存在读取副作用                                                                                | R1/R2 保留请求内副作用；不把 GET 自动当作只读，不自行新增周期清理任务                                          |
| 外部组织同步          | controller 的创建 run 与 apply 动作驱动；`createOrgSyncRun` 内 await 外部 adapter 抓取与预览持久化                                                                     | R2 保留运行记录/幂等/状态，R6 排空和恢复在途 run；不能另开定时同步使新旧各执行一次                             |
| OBS 网络重试          | provider 的签名请求最多 3 次，失败间隔 `250ms * attempt`；使用 `node:timers/promises` 的 sleep                                                                         | R2 保留错误/重试和幂等语义；这是请求内重试，不是独立后台调度器                                                 |
| 进程托管              | PM2 模板是 `fork`、`instances:1`、autorestart；当前未显式设置 Nest `enableShutdownHooks` 或应用信号处理                                                                | R6 验证优雅停止、在途事务、附件/同步收尾与任务单实例；不能以配置中的 1 证明完整排空                            |
| 独立 scheduler/worker | 对 API 非测试源码扫描未发现 Nest lifecycle hooks、`@Cron/@Interval/@Timeout`、`ScheduleModule`、setInterval 或独立 worker 启动入口；package.json 无 `@nestjs/schedule` | 这是仓库静态否定证据。目标机 crontab/systemd timer/外部调度器未查，R6 必须实际盘点；以后新增任务须纳入同一清单 |

seed 依据以源码为准：[seeders 目录](../../apps/poms-api/src/seeders)、[试用初始化手册](../operations/poms-business-trial-initialization-runbook.md)。`seeders/README.md` 中“平台真实表待迁入”等描述已落后于当前平台 bootstrap 和真实持久化实现，作为 `existing-baseline-drift` 留待相关文档维护；不能用它覆盖源码事实。

## 7. 发布 baseline、target 与 R6 接管

### 7.1 TEST 实况、仓库发布约束与未验证项

静态来源：[deploy README](../../deploy/README.md)、[build-release.ts](../../deploy/scripts/build-release.ts)、[push-release.ts](../../deploy/scripts/push-release.ts)、[migration gate](../../deploy/scripts/lib/migration-gate.ts)、[PM2 模板](../../deploy/pm2/poms-api-test.ecosystem.config.cjs)、[Nginx 模板](../../deploy/nginx/sites-available/poms-test.conf)。TEST 实况由主代理在本轮按 [TEST 部署配置](../../deploy/config/poms-test.jsonc) 进行只读 SSH 和数据库元数据查询后提供；不是从配置路径猜测。

| 项目           | 已有证据                                                                                        | 尚未证实                                                         |
| -------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 当前兼容系统   | TEST：Debian 12（bookworm）、x86_64、glibc 2.36；R0E 已验证独立 probe 的对应构建/运行与 ABI     | 产品 Rust 后端 readiness、停止与运行库验收留 R1/R6               |
| 当前兼容数据库 | TEST：PostgreSQL 15.12；R0E 两个隔离库已验证版本/locale/扩展、低权限和合成约束                  | 产品迁移/schema、逐业务事务与真实数据兼容留 R1/R2–R5             |
| 当前产物       | admin/browser + Node API `main.js`、release-manifest；远端按 package.json 执行生产 pnpm install | Rust 二进制的可执行权限、target、系统库、配置/迁移资源及校验和   |
| preflight      | 检查 node/corepack/pnpm/pm2/nginx/tar/readlink/systemctl、env 与证书存在                        | 不核实 OS/glibc/架构/数据库版本，不证明 Rust ABI 兼容            |
| 切换顺序       | staging → 本地 Node migration gate → current 链接 → PM2 reload；reload 失败可尝试恢复旧链接     | Rust/Nest 排空、后台任务所有权、备份恢复与业务级回退             |
| Nginx          | API upstream `127.0.0.1:3333`；保留 `/api/`、Swagger 路径及上传代理设置                         | Rust 实际监听、安全头、body limit/timeout 兼容与目标机 readiness |

主代理确认 TEST 的 `/srv/poms/test/current` 指向 `releases/20260804-163850`。同主机 `/srv/poms/prod/current` 不存在本身不能证明没有生产部署；随后用户明确确认“尚未部署生产环境，先对齐 TEST”。因此当前兼容目标冻结为上述 TEST 事实，PROD 不再列为当前 R0/R1 阻断。未来首次 PROD 部署前单独核验 OS/架构/glibc/数据库与运行库，不能将 TEST 版本自动标成已部署 PROD 的版本。

### 7.2 构建兼容方案

本机开发和当前 TEST 发布的 target 候选为 `x86_64-unknown-linux-gnu`。Rust 官方将其列为 Tier 1，并列出 kernel 3.2+/glibc 2.17+ 的平台基线；该说明不保证在 WSL Debian 13.7/glibc 2.41 上链接的任意应用和 native 依赖仍能部署到已核实的 TEST Debian 12/glibc 2.36。出处：[Rust 平台支持表](https://doc.rust-lang.org/rustc/platform-support.html)，2026-10-26 查阅。

R0E 已固定 Debian 12/glibc 2.36 构建镜像，实际构建独立 probe，并在纯 Debian 12 运行镜像通过两个隔离库验证；ELF 为 x86_64，最高所需 GLIBC 2.34，细节见第 9 节。这不认证尚未实现的产品可执行文件。WSL 负责开发，不默认直接发布其 host 工具链产物；不使用 `target-cpu=native` 作为发布默认值。musl/静态链接仍须独立验证 TLS/DNS/系统库行为。未来 PROD 若采用不同架构或更旧运行库，应另行冻结并验证构建基线。

R6 对待发布产物执行 `file`、`readelf -l/-d/--version-info` 等检查，记录 ELF 架构、解释器、NEEDED 库及所需 GLIBC 符号版本，再在目标基线环境运行启动/readiness/停止与完整功能回归。编译成功、端口可打开或 Rust target 的官方最低版本不能替代这些证据。

### 7.3 R6 必须接管的责任

1. 发布包：保留 release/current/shared 布局与可追溯 manifest，纳入 Rust 二进制、配置、迁移资源、契约/代码版本、target/toolchain 和产物校验和。前端构建继续可使用 Node。
2. 迁移：旧迁移器保持唯一，直到空库 baseline 与存量库接管通过；锁、版本表、校验和、失败回收与禁止重放 baseline 的条件明确后切换。
3. 初始化：分别替代开发/E2E、平台 bootstrap、业务试用三类工具；保留 fixture/稳定 ID/幂等与跨域数据约束。不得把开发 seed 接到正式发布默认路径。
4. 进程与任务：可选系统服务或 PM2 的可执行文件模式需另行固定；Rust 二进制不可继续当作 `main.js` 交给 Node。检查旧新后台任务、外部同步和主机级 scheduler，任何时点只有一个活动执行方。
5. 切流与回退：readiness 阶段不启用外部写入/后台职责；暂停入口、排空、备份、统一 upstream 切换及反向回退均需演练。当前 PM2 reload 回退只处理进程/链接，不能代表业务数据回滚成功。

## 8. 可复核命令与后续验收

以下前两组为本轮实际采用的只读检查形态，可在 PowerShell 7 中复核；版本结果仍应以重新执行时的时间和平台为准。

```powershell
wsl.exe -d Debian --exec cat /etc/os-release
wsl.exe -d Debian --exec uname -a
wsl.exe -d Debian --exec getconf GNU_LIBC_VERSION
wsl.exe -d Debian --exec /home/wangzishi/.cargo/bin/rustc -vV
wsl.exe -d Debian --exec /home/wangzishi/.cargo/bin/cargo -vV
wsl.exe -d Debian --exec /home/wangzishi/.cargo/bin/rustup toolchain list
wsl.exe -d Debian --exec /home/wangzishi/.cargo/bin/rustup component list --installed
wsl.exe -d Debian --exec /home/wangzishi/.cargo/bin/rustup target list --installed
wsl.exe -d Debian --exec pkg-config --modversion openssl
wsl.exe -d Debian --exec wslinfo --networking-mode
```

```powershell
wsl.exe -d Debian --exec git -C /home/wangzishi/projects/poms-rust rev-parse HEAD
wsl.exe -d Debian --exec git -C /home/wangzishi/projects/poms-rust status --short --branch
wsl.exe -d Debian --exec ss -ltn '( sport = :3333 or sport = :3344 or sport = :4200 or sport = :4700 or sport = :5432 or sport = :5700 )'
Get-NetTCPConnection -State Listen -ErrorAction Stop |
    Where-Object { $_.LocalPort -in @(3333, 3344, 4200, 4700, 5432, 5700) } |
    Select-Object LocalAddress, LocalPort
```

后续执行清单按责任分开，不能将计划项写成通过：

| 阶段        | 待完成事项                                                                   | 本轮状态                                           |
| ----------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| R0E 已验证  | 精确 Rust 1.97.1、probe crate/features、MSRV 与 Cargo.lock、fmt/clippy/build | Pass，独立依赖 probe；不是产品应用已实现           |
| R0E 已验证  | TEST PostgreSQL 15.12 对齐的两隔离库、locale/扩展/会话/低权限与合成约束      | Pass；产品 schema、历史迁移与业务回归留 R1         |
| R0E 已验证  | Debian 12/glibc 2.36/x86_64 构建、纯运行镜像与 ELF 动态依赖                  | Pass，仅针对已冻结 probe 产物                      |
| 发布/R6前置 | 进程/host scheduler、启停/切流/回退；未来首次 PROD 部署前目标核验            | TEST 已定位；PROD 用户确认未部署，不阻断当前 R0/R1 |
| R0E 已验证  | 构建镜像 Node/pnpm/Corepack/Deno/Java/psql 客户端与固定入口                  | Pass；浏览器依赖及产品启动器仍留 R1                |
| R1 工程     | API E2E 后端/外部服务选择、进程归属/readiness、Nx seed 解耦                  | Pending，只有静态方案                              |
| R1 工程     | Playwright 跨平台启动、代理/端口/Cookie/CORS 与 Windows/WSL 联通             | Pending，未启动服务/浏览器                         |
| R1 工程     | 共享 OpenAPI 生成/检查实现及 Windows/Linux 生成结果对照                      | Pending，未生成客户端                              |
| R1 功能验证 | 产品应用的 fmt/clippy/cargo test/build、健康与认证/兼容回归                  | Pending；R0E probe 通过不代替产品测试              |
| R6 接管     | 目标 binary、迁移/初始化、进程与任务单实例、备份恢复、切流与回退演练         | Pending，依赖 R1–R5 完整业务实现                   |

本文件为文档切片，无产品行为变更。合并证据由 R0 主检查点统一记录 `git diff --check` 与 `pnpm run format:md:check` 的实际结果；本盘点中的版本查询、目录统计、公开 HTTPS 和只读数据库元数据检查不替代这些文档检查，也不替代业务测试。

## 9. R0E 后续已验证结果

本节记录用户另行授权环境准备后取得的结果，正式执行记录为 [R0E 基线](rust-r0e-environment-baseline.md)及[验收 JSON](rust-r0e-validation.json)，可复用命令与清理边界为 [工具 README](../../tools/rust-r0e/README.md)。第 2–5 节保留初始时点；不能再据其中的缺项推断 R0E 当前尚未准备依赖、兼容构建或隔离 PG15。

| 项目                | 后续结果                                                                                                                    | 证据边界                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| WSL 容器工具        | Podman 5.4.2、uidmap、slirp4netns、fuse-overlayfs 及依赖；新增 22 包、0 升级、0 移除                                        | rootless、cgroupfs、slirp4netns；没有改 Windows PG17 或 WSL 资源限制                                                                 |
| 构建镜像            | Debian 12、x86_64、glibc 2.36；image ID `f8284fad99901b0c71bffd7a76a58ff6f56443755ccd3deacbca488557bb7244`                  | 在此镜像实际运行 Rust 编译和辅助工具，不依赖 WSL host 的浮动 stable 或 Windows shim                                                  |
| Rust 与依赖         | Rust/Cargo 1.97.1；edition 2024；精确 crate/features、Cargo.lock 与实际构建一致                                             | `cargo fmt --check`、`cargo clippy --locked --all-targets -- -D warnings`、`cargo build --locked --release` 已通过；新增产品依赖另验 |
| 锁文件              | SHA-256 `9aa5bd462e32b0b686376895920a858e02fd64969c5aa0c03d35bbef977f5fb7`                                                  | 仅独立 probe，不是产品后端 lock 已完成                                                                                               |
| 容器内辅助工具      | Node 24.16.0、pnpm 12.3.4、Corepack 0.35.0、Deno 2.9.1、Java 17.0.21、psql client 15.19                                     | 普通 pnpm 与 Corepack 默认 pnpm 均为 12.3.4；client 15.19 不冒充 server 15.12                                                        |
| PG 镜像             | UBI 基础、glibc/locale 2.34、官方 PG15.12 源码；image ID `b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a` | PG 编译启用 OpenSSL、禁用 readline；没有认证实际 TLS 握手                                                                            |
| 专用实例与两库      | `poms-r0e-pg15`，仅发布 `127.0.0.1:15432`；`poms_r0e_nest`、`poms_r0e_rust`，基础 schema/扩展/marker 已初始化               | 不挂载 Windows PG17 数据目录；未执行产品 migration/seed；口令仅在 Linux 私有状态与 Podman secret                                     |
| PG 对齐与 SQL smoke | PG15.12、UTF8、libc en_US.UTF-8、stored/actual collation 2.34；pgcrypto 1.3、btree_gist 1.7；受限 app 角色                  | 两库 TEMP、唯一/FK/CAS/GiST、numeric/date/JSON 与回滚通过；不是领域表/跨域业务验收                                                   |
| Rust probe 运行     | 同一 release ELF 在纯 Debian 12 运行镜像连接两库；HTTP/Tower、Serde/Utoipa、SQLx 类型及回滚通过                             | 仅独立 health 路径；产品 HTTP 合同与 TS OpenAPI 生成权未转移                                                                         |
| ABI                 | x86_64 ELF；最高所需 GLIBC 2.34；动态依赖仅 libc、libm、libgcc_s 与 loader                                                  | 与当前 TEST glibc 2.36 相容的 probe 证据，不能推广到尚未构建的产品程序                                                               |
| 原 PG17 保留        | server_version_num 170004；服务 PID6996、server PID8636、5432；启动时刻仍为 `2026-10-23T11:59:34.659Z`                      | 主代理前后核对；没有重置、seed、迁移或降级现有 `poms`                                                                                |
| 生命周期与互通      | 两库 marker UUID/created_at 在 stop/start 后不变；WSL host 客户端和 Windows 只读 app 连接均可用 15432                       | `stop` 保留专用卷/凭据；没有全局 prune 或自动删除数据                                                                                |

本代理独立只读核对过仓库与 Linux 构建快照：`probe/src/main.rs` SHA-256 均为 `0261fb1f9bb8e715d0eee660d68e769c044312644949197655737580fafcc30e`，锁文件与上表相同；release ELF SHA-256 为 `f766df98d876158b62f7116eb0968bbf72653c1d34996d9ea97a1a743f1b4c61`。已读取的最新两库日志均含实际 app 身份和低权限断言并返回完整 probe 通过。四个 shell 文件独立语法检查通过；修复后的生命周期入口核对 image ID、volume/container/secret scope 和精确 loopback 绑定，错误目标拒绝测试在无网络、无口令容器执行。此处不是本代理重新连接 TEST 或原 PG17，也没有重跑会写 TEMP 数据的 probe。

TEST 与两隔离库的合成排序样本指纹均为 `d66142528ed50eca27104827cdf9e6a2`。这是有限样本，不认证完整 locale 规则或 TEST 与 UBI 的 locale 包补丁相同。SQLx 0.9 启动会话实际为 UTC，probe 在完成目标/身份断言后显式设置并回读 `Etc/GMT-8`；R1 连接池需对每条新连接执行会话初始化，不能将 TEST 观察到的 session 时区当作驱动默认。

主代理已在独立 `033aedd0` Linux checkout、Debian 12 镜像的 Node 24.16.0 / TypeScript 6.0.3 中实际运行两个清单的 `--check` 并通过；Windows Node 24.19.0 / TypeScript 6.0.3 的 v2 指纹与之相同。CRLF→LF 规范化不绕过冻结源码 guard，v1 历史证据仍保留；详细哈希与集合对照以 [R0E 基线](rust-r0e-environment-baseline.md)为准，不从本文件的 Markdown 检查推导执行通过。R0F 路由/兼容样本、R1 产品 schema/认证/跨平台启动器/浏览器，以及 R6 迁移接管、发布和回退仍需各自验收。R0E 环境与 probe 的通过不替代 R0 全阶段、R1 G1 或 G4 提交归档。
