# R1D 浏览器入口

`apps/poms-admin-e2e/playwright.config.ts` 不执行 shell 命令。配置只读解析目标；`server-setup.ts` 通过 `admin-launcher.cjs` 复用唯一的 `runtime.cjs` / `api-server.cjs`，返回同进程 teardown 闭包。没有 PID 文件接管、按端口杀进程或隐式 seed。数据准备由主代理独立的 R1D PG15 入口完成。

API 参数只有 `POMS_E2E_MODE=managed-nest|managed-rust|external` 和 `POMS_E2E_SUITE=nest-full|foundation` 一套。managed API 的 HOST/PORT 完全取经过 guard 的显式 `POMS_ENV_FILE`，不受浏览器端口 seed 改写。有 `POMS_API_BASE_URL` 且未显式给 mode 时，浏览器入口明确选择 external；与 managed mode 同时出现则拒绝。URL 必须是无 userinfo/query/hash/非根 path 的 HTTP(S) origin。

`POMS_ADMIN_E2E_SUITE=legacy` 只选择既有八份 spec，managed Nest 未设值时保持此默认。`auth` 只选择新的 `r1d-auth.smoke.spec.ts`；Rust 必须显式选择 auth，external 必须显式选择浏览器 suite。浏览器入口将 auth 映射为 API foundation、legacy 映射为 nest-full，冲突的 API suite 拒绝。没有条件 skip 旧断言或将未运行的 legacy 计为通过。

auth suite 必须显式提供合成 `POMS_E2E_USERNAME` / `POMS_E2E_PASSWORD`。不使用真实用户凭据。Playwright 使用固定依赖的 `channel: chromium`；专用 `PLAYWRIGHT_BROWSERS_PATH` 由环境入口提供，配置不改系统 Chrome/Edge、不自动下载浏览器。

独立 admin 默认 `http://127.0.0.1:4800`，`POMS_ADMIN_PORT_SEED` 为 4400 的非负整数偏移，默认400，上限61135。兼容原 `POMS_E2E_PORT_SEED` 作为仅影响 admin 的旧输入；二者同时给且不同时拒绝。`POMS_E2E_LOOPBACK_HOST` 只接受 localhost、127.0.0.1、::1。`POMS_ADMIN_START_TIMEOUT_MS` 为1–300000，默认180000，与共享runtime边界一致。NO_PROXY/no_proxy 都追加 IPv4/IPv6 loopback且保留既有项。

两个 BASE_URL 都存在时，只核验外部 API readiness 和 admin 登录 HTML，不 build/spawn/seed/stop 受测服务。半 external 仅启动缺少的一侧。Playwright 自己拥有的 Chromium仍正常启动/关闭。Windows 不通过 wsl.exe 托管 Rust；使用独立运行、身份已验证的 external Rust。Linux 可分别 managed Nest/Rust。所有受测进程管理委托共享 runtime，端口被占用即失败。

auth smoke 在原 Angular 表单实际填写并点击登录，通过浏览器页面的同源 fetch 验证 `/api`、两条 health、session、csrf、logout七操作、自动 Cookiejar、Path/SameSite/HttpOnly、无 CSRF 的拒绝、正常退出及重新访问受保护页回到登录。没有 page.route、APIRequest登录或 addCookies。页面 context 请求不是完整业务 UI 旅程；现有 Angular 的 provider、导航、待办等附带请求只记录 method/path/status，Rust未实现响应不作为该业务通过。完整业务、权限、过期和跨页面综合矩阵属于 R1E。

认证 trace 关闭，附加 JSON 仅含 OS/Node/browser版本、已脱敏目标元信息、操作名和状态/范围，不记录密码、Cookie/token/数据库URL。成功和失败都尝试撤销本浏览器创建的合成 session；数据库行清理由受控环境入口负责，不冒充数据已归零。

配置与清理分支测试：`node --test tools/e2e/admin-launcher.test.cjs`。其中 API managed plan 与进程边界使用显式 mock；URL parser 使用共享 runtime的实际实现。`pnpm exec tsc -p tools/e2e/browser-tsconfig.json --noEmit` 检查 Playwright入口与新smoke。真实 Windows/Linux Chromium、Angular和PG15验收由主代理执行并分别记录，Node单测不代替它们。

Playwright配置与globalSetup两处相对导入附精确的module-boundaries行例外：仅E2E入口复用统一owned-process测试工具，root tools不是生产库。主代理接受为R1D的窄E1工具边界例外，在G3/G4记录并复核；没有全局allow或业务依赖规则改动。

运行示例（先由环境入口提供明确的 envfile、合成凭据和浏览器cache）：`pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts`。使用 auth suite 时同时设置 `POMS_ADMIN_E2E_SUITE=auth`；所有外部服务的启动/停止由独立拥有它们的运行器负责。
