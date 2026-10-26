# R1D / R1E 浏览器入口

`apps/poms-admin-e2e/playwright.config.ts` 不执行 shell 命令。配置只读解析目标；`server-setup.ts` 通过 `admin-launcher.cjs` 复用唯一的 `runtime.cjs` / `api-server.cjs`，返回同进程 teardown 闭包。没有 PID 文件接管、按端口杀进程或隐式 seed。数据准备由主代理独立的 R1D PG15 入口完成。

API 参数只有 `POMS_E2E_MODE=managed-nest|managed-rust|external` 和 `POMS_E2E_SUITE=nest-full|foundation` 一套。managed API 的 HOST/PORT 完全取经过 guard 的显式 `POMS_ENV_FILE`，不受浏览器端口 seed 改写。有 `POMS_API_BASE_URL` 且未显式给 mode 时，浏览器入口明确选择 external；与 managed mode 同时出现则拒绝。URL 必须是无 userinfo/query/hash/非根 path 的 HTTP(S) origin。

`POMS_ADMIN_E2E_SUITE=legacy` 只选择既有八份 spec，managed Nest 未设值时保持此默认。`auth` 只选择 `r1d-auth.smoke.spec.ts`，`stage` 只选择 `r1e-stage.spec.ts`；Rust 必须显式选择 auth 或 stage，external 必须显式选择浏览器 suite。浏览器入口将 auth/stage 映射为 API foundation、legacy 映射为 nest-full，冲突的 API suite 拒绝。没有条件 skip 旧断言或将未运行的 legacy 计为通过。

auth suite 必须显式提供合成 `POMS_E2E_USERNAME` / `POMS_E2E_PASSWORD`。不使用真实用户凭据。Playwright 使用固定依赖的 `channel: chromium`；专用 `PLAYWRIGHT_BROWSERS_PATH` 由环境入口提供，配置不改系统 Chrome/Edge、不自动下载浏览器。

独立 admin 默认 `http://127.0.0.1:4800`，`POMS_ADMIN_PORT_SEED` 为 4400 的非负整数偏移，默认400，上限61135。兼容原 `POMS_E2E_PORT_SEED` 作为仅影响 admin 的旧输入；二者同时给且不同时拒绝。`POMS_E2E_LOOPBACK_HOST` 只接受 localhost、127.0.0.1、::1。`POMS_ADMIN_START_TIMEOUT_MS` 为1–300000，默认180000，与共享runtime边界一致。NO_PROXY/no_proxy 都追加 IPv4/IPv6 loopback且保留既有项。

两个 BASE_URL 都存在时，只核验外部 API readiness 和 admin 登录 HTML，不 build/spawn/seed/stop 受测服务。半 external 仅启动缺少的一侧。Playwright 自己拥有的 Chromium仍正常启动/关闭。Windows 不通过 wsl.exe 托管 Rust；使用独立运行、身份已验证的 external Rust。Linux 可分别 managed Nest/Rust。所有受测进程管理委托共享 runtime，端口被占用即失败。

auth smoke 在原 Angular 表单实际填写并点击登录，通过浏览器页面的同源 fetch 验证 `/api`、两条 health、session、csrf、logout七操作、自动 Cookiejar、Path/SameSite/HttpOnly、无 CSRF 的拒绝、正常退出及重新访问受保护页回到登录。没有 page.route、APIRequest登录或 addCookies。页面 context 请求不是完整业务 UI 旅程；现有 Angular 的 provider、导航、待办等附带请求只记录 method/path/status，Rust未实现响应不作为该业务通过。R1E stage 扩充的是七操作支持的认证 UI、权限与会话旅程，不交付 Rust R2 业务。

认证 trace 关闭，附加 JSON 仅含 OS/Node/browser版本、已脱敏目标元信息、操作名和状态/范围，不记录密码、Cookie/token/数据库URL。成功和失败都尝试撤销本浏览器创建的合成 session；数据库行清理由受控环境入口负责，不冒充数据已归零。

配置与清理分支测试：`node --test tools/e2e/admin-launcher.test.cjs`。其中 API managed plan 与进程边界使用显式 mock；URL parser 使用共享 runtime的实际实现。`pnpm exec tsc -p tools/e2e/browser-tsconfig.json --noEmit` 检查 Playwright入口与新smoke。真实 Windows/Linux Chromium、Angular和PG15验收由主代理执行并分别记录，Node单测不代替它们。

Playwright配置与globalSetup两处相对导入附精确的module-boundaries行例外：仅E2E入口复用统一owned-process测试工具，root tools不是生产库。主代理接受为R1D的窄E1工具边界例外，在G3/G4记录并复核；没有全局allow或业务依赖规则改动。

运行示例（先由环境入口提供明确的 envfile、合成凭据和浏览器cache）：`pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts`。使用 auth suite 时同时设置 `POMS_ADMIN_E2E_SUITE=auth`；所有外部服务的启动/停止由独立拥有它们的运行器负责。

## R1E stage

`stage` 必须明确选择，不改变 legacy/auth 默认和选择集合。managed stage 额外要求 `POMS_E2E_ENV_PROFILE=r1e` 与经 guard 的 R1E envfile；external stage 必须声明 `POMS_R1E_BACKEND=nest|rust`，仅用于选择已独立准备的专用 fixture 库，不能与 managed 模式冲突。external adapter 依然不读取数据库环境、不拥有外部服务；fixture 是另外明确授权的测试操作。

受测 admin 必须使用 `e2e-stage` 配置。managed admin 自动以该配置启动；external admin 由其 owner 使用相同配置独立启动。该配置仅替换入口为 `main.e2e.ts`，共用原 AppComponent/appConfig/HttpClient/拦截器；production 仍从 main.ts 构建，生产产物须检查没有 `__POMS_R1E_STAGE__`。bridge 只提供固定 logout、固定错误 CSRF 变体、脱敏状态和四个固定本地导航；不支持任意 URL、Cookie 注入或假响应。

16 个 stage 用例覆盖深链和错误密码重试、真实 Cookie/刷新/桌面退出、窄屏、独立 context/跨标签、CSRF403、missing、idle expiry、absolute expiry、revoked、disabled、viewer any/all、无权限、admin、不安全 returnUrl，以及登录后撤权再刷新、失效 Cookie 刷新401恢复。无Cookie的公开session200未认证视图在匿名用例单独验证；公开不等于失效Cookie仍返回200。`UI:`、`Angular interceptor:`、`Mixed UI/Angular bridge:`、`Session recovery:` 分别区分实际UI交互、原HttpClient集成、固定HTTP/Router bridge混合旅程和公开session恢复。附件按实际session响应区分200守卫与401初始化/拦截器，并机械记录bridge/表单/顶栏机制及仅method/path/status的R1响应序列。固定logout不调用会提前清状态的AuthStore.logout。已识别401必须清用户/导航/待办/内存token，并保留安全返回地址；403保留状态。已有跨标签CSRF内存不同步会如实断言403，不自动重试或声称有广播。

保护请求的guard401会保留旧Cookie。当前登录页首次真实表单提交因此先GETcsrf401并清Cookie，不能记作已经发送登录POST；测试明确验证无POST与错误提示，再由用户动作再次提交。idle/absolute首次CSRF错误为session_expired；revoke及已被disabled处理撤销的会话为session_revoked。disabled账户在Cookie清除后的下一次真实POST仍须invalid_credentials401，fixture恢复账户后才能再提交成功。恢复过程不强制goto登录页，不自动重试产品请求，所有安全returnUrl的query断言保留。公开GETsession401本身已清Cookie的刷新流程可直接重新提交。stage每条总预算180秒，用于有界WSL/fixture启动及上述UI动作；fixture45秒、SQL和HTTP原限制均未放宽。

stage 不读取全局合成登录凭据。每条测试用随机 runId，经 [受控 fixture](../rust-r1e/README.md) prepare 两个专用账户并在 finally cleanup；凭据由共享 `fixtureCredentials` 推导，数据库会话凭据只经子进程 stdin，成功协议和报告不输出密码/token/hash/URL。context附本run请求ID，用于审计清理。fixture启动命令、系统环境白名单及精确目标校验归同一工具，浏览器helper不提供任意SQL/库/命令参数。中断后仍需根据私有journal做显式cleanup，不能凭浏览器关闭宣称数据已归零。

stage 与 auth 均关闭 trace，截图仅在已登录的壳层或失败时保留；附加 JSON 只有版本、runId、fixture计数与范围外请求 method/path/status。旧8spec/36case保持独立：11case有显式route mock，legacy helper会补写Cookie和补救导航，不能将其结果并入纯浏览器认证证据。实际四个 OS/backend 组合的执行结果由 R1E 基线和验收记录持有。
