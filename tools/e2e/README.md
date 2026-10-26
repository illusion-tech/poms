# R1D 通用 E2E 运行工具

本目录为 API Jest 与浏览器 Playwright 共用的测试基础设施，正式范围见 [R1D 基线](../../docs/design/archive/slices/rust-r1d-e2e-client-baseline.md)。浏览器参数与认证 smoke 见 [浏览器入口](browser-README.md)，隔离数据库准备见 [R1D 环境](../rust-r1d/README.md)。不新增产品 HTTP 路由，不接管 migration，不连接原 PG17。

## API 模式与 suite

| 参数 | 规则 |
| --- | --- |
| `POMS_E2E_MODE` | `managed-nest` / `managed-rust` / `external`；默认 managed-nest，空值或未知值拒绝 |
| `POMS_E2E_SUITE` | `nest-full` / `foundation`；Nest 默认 nest-full，Rust 默认 foundation；Rust 不接受 nest-full；external 必须显式指定 |
| `POMS_API_BASE_URL` | external 必填的 HTTP(S) origin，禁止 userinfo/query/fragment/非根路径；末尾 `/` 归一后统一追加 `/api`；managed 不接受该冲突参数 |
| `POMS_ENV_FILE` | managed 必须显式给存在的专用文件；经 `managed-environment.cjs` 校验，HOST/PORT 使用文件有效值，不回落仓库 `.env` |
| `POMS_RUST_API_BINARY` | managed-rust 必填，同机已验证可执行文件；不构建或回退到 Nest，也不通过 Windows `wsl.exe` 接管 Linux 进程树 |
| `POMS_E2E_USERNAME` / `POMS_E2E_PASSWORD` | foundation 显式提供的公开合成账号；不使用真实用户凭据，不写入日志 |

managed 使用 root 提供的严格环境准入：仅本轮 `poms_r1d_nest` / `poms_r1d_rust`、`127.0.0.1:15432`、`poms_r1d_app`。文件键使用精确大写白名单；父进程仅保留允许的系统环境，不把 PG/Node/loader 注入传给后端。默认有效 API 端口由环境入口生成，为 Nest4700 / Rust4701；浏览器启动器不改写它们。

普通 E2E 不 seed、不 migration、不 reset。准备数据只能显式使用经过容器/集群/库名/marker/角色核验的 [环境入口](../rust-r1d/README.md)。nest-full 会修改固定合成 fixture 的业务状态，重复完整回归前需再次显式准备这两个专用库；不能对 external、PG17、TEST 或旧 R1C 库套用该步骤。

`foundation` 选择一份新 spec、13 个测试，复用同一源码执行已交付七操作及认证负面路径，不调用 `/auth/profile`、todos 或其他 R2 业务。每条测试通过 HTTP 撤销自己创建的有效会话；不宣称审计/会话数据库行已归零。`nest-full` 保留原 14 份 spec、72 个测试；没有依后端条件 skip 旧断言。具体实际执行结果由 R1D 验收记录承载。

external 只做给定目标的 HTTP readiness 与选定请求；不读本地 DB/env 文件、不 build/spawn/seed/migrate/stop 受测服务。API 入口要求显式 mode；浏览器入口可按其已给出的外部 URL 明确构造 external plan。独立 controller 的外部存活证明见 `tools/rust-r1d/verify-external-api.cjs`：先由 controller 拥有服务，再由另一个 external Jest 进程验证，退出后服务仍需可用，最终只由 controller 清理。

## 共享进程合同

`runtime.cjs` 提供 `resolveTarget`、`waitForReadiness`、`startOwned`、`stopOwned`、`runOwnedCommand`；`api-server.cjs` 提供只读 `resolveApiPlan` 和 `startApiServer` / `startManagedBackend`。类型声明分别为 `runtime.d.cts`、`api-server.d.cts`。Nest CLI 从实际安装 package 的 `bin.nx` 解析，以 `process.execPath` 和参数数组运行；不依赖 `.cmd` 或拼接 shell 字符串。

managed 在构建前检查端口可用；readiness 必须为现有 `/api/health/readiness` 的 HTTP200、`service=poms-api`、`status=ready` 及 process/database pass。503 或任意成功 HTML 页面都不是 API 启动成功。请求有独立超时和正文上限，不跟随重定向。API adapter 默认启动超时120000ms；共享 runtime 参数范围1–300000ms，单次请求默认1000ms。

每轮由私有 IPC worker 作为进程树 anchor。opaque handle 保存 run ID、anchor PID、kernel start identity 和实际 server PID；只有模块内 WeakMap 登记的本轮 handle 可 stop，JSON/PID 文件不能取得所有权。Jest globalSetup/globalTeardown 在同一个父进程保留该对象和 stop 闭包；Playwright 也保留同进程 teardown 闭包。占用端口、早退出、假 readiness、超时与失败路径只清理自己拥有的树，不使用 killPort。

Linux 使用 `/proc` 的 boot ID/start ticks 核验出生身份，先向独立进程组发送 SIGTERM，再按界限强制终止；成功退出需 anchor 消失且组内没有 non-Z 成员。容器 PID1 可能短暂保留已终止的 zombie PID 条目，测试会明确核 Z 与 SIGKILL 退出状态，不能将仍运行的 R/S/D 进程算作清理完成。

Windows 使用内置 PowerShell/CIM 仅读取 CreationDate 身份，应用与构建启动仍为 Node 原生参数数组；树终止使用身份匹配的 owned anchor 的 `taskkill /PID ... /T /F`，不声称等价 Unix 优雅 SIGTERM。Linux 不依赖 PowerShell。支持矩阵为 Linux managed Nest/Rust、Windows managed Nest及独立 Linux 服务的 external Rust。

API HTTP 请求使用专用 `keepAlive:false` agent，避免 Jest 每个 suite 的独立 Axios 模块在 Node 共享池 socket 上累积私有 Symbol error listener；没有提高 listener 上限。transport 错误不附 Axios request/config，状态不符也不打印任意 HTTP 正文。运行日志保留在受控临时文件，密码、Cookie/token、数据库 URL 不进入报告。

## 验证入口

```sh
node --test tools/e2e/runtime.test.cjs tools/e2e/api-server.test.cjs
pnpm exec tsc -p apps/poms-api-e2e/tsconfig.spec.json --noEmit
pnpm nx e2e poms-api-e2e --skip-nx-cache
```

执行最后一条前设置上表的明确目标和专用环境。Windows 用 PowerShell `$env:变量名`，Linux 用对应环境变量；external 不设置 managed 环境也可运行。Node 生命周期测试只使用本轮合成 loopback 服务与进程，没有数据库或产品 seed；真实 PG15/API/browser 矩阵由主代理另行运行。

API Jest config/support 与浏览器两个 TS 入口对同目录工具的精确导入行带 E1 module-boundaries 例外：只让 E2E 复用这一套进程实现，未放宽全局或生产依赖规则。例外由主代理在 G3/G4 记录并复核。
