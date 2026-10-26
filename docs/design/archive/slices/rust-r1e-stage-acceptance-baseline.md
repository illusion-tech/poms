# RUST-R1E 认证 UI 与阶段集成验收实施基线

**日期**: 2026-10-26
**Task / Parent**: [R1E #66](https://github.com/illusion-tech/poms/issues/66) / [R1 #60](https://github.com/illusion-tech/poms/issues/60)
**Slice Type**: `cross-layer-high-risk`（认证 UI 窄修与阶段验收；公共 API/DDL 不变）
**Owner**: 主代理集成/运行/治理；A UI 与浏览器场景；B 隔离环境与受控 fixture；C 非作者审查
**Gate**: G1 / G3 Pass（2026-10-26）；R1E #66 与父 R1 #60 G4 / Done 随本归档提交及 Issue 同步生效
**起点**: `70482a77091e0288e4708fbdf6a4fec5b5d51427`；独立 managed worktree + Linux checkout；solo worktree checkpoint

## 1. 范围与正式输入

用户已授权先冻结 R1E，再完成整体 UI、阶段集成验收、独立审查、提交推送与 G4 归档，保留现有 PG17 实例和数据。这里的整体 UI 是 R1 已交付七操作所支持的原 Angular 认证壳与完整会话旅程。正式输入为 [R1 实施输入](rust-r1-foundation-baseline.md)第 1/4/6/8 节、[迁移计划](../../backend-rust-migration-plan.md)、[R1A](rust-r1a-application-baseline.md)/[R1B](rust-r1b-shared-types-baseline.md)/[R1C](rust-r1c-auth-session-baseline.md)/[R1D](rust-r1d-e2e-client-baseline.md) 已交付基线，以及起点原 Angular/AuthStore/guard/interceptor、完整 OpenAPI 和固定 lock。

本轮交付双后端真实浏览器认证矩阵、导航失败时权限入口的窄修、明确区分实际 UI 操作与 Angular 拦截器集成的证据、原 Nest 回归、阶段依赖与生成结果核验、非作者审查和 R1 最终关闭依据。

不实现 Rust 的 R2 导航/待办/外部 provider/个人资料/平台 CRUD，不实现审批、附件及客户项目合同资金提成，不迁移接管、不部署、不做性能结论。空导航、暂无待办或 provider 加载失败不能代表 R2 通过；保留实际失败状态。不得新增生产测试 API 或用 mock 后端响应构造 Rust 通过证据。

## 2. 已核状态与 SSOT

下表保留 G1 冻结时的现状与约束；实施及最终交付结论见第 7、8 节。

| Concern           | 权威来源 / 已核现状                                                                         | 本轮规则                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| R1 阶段           | #62–65 均 Closed；实现 51572db5/5cc44100/69ab8ac8/c14333d5 已在 main；R1E 尚未交付          | 复核源码指纹与各自实验证据，新增本轮 UI/阶段证据，不把旧证据当本轮重跑                                |
| 认证路由          | [canonical inventory](../../api-route-canonical-inventory.md)、R0F/R1C 七操作与完整 OpenAPI | 不新增或改公共 route、DTO、operationId、状态码或 Cookie/CSRF 语义                                     |
| 会话与权限        | AuthStore、authGuard、permissionGuard、authSessionExpiredInterceptor、共享 PermissionKey    | 无 Bearer 回退；浏览器不人工补写认证 Cookie；权限仍由真实 session.user 提供                           |
| UI 回退           | AppMenu 在 navigation 失败/空时使用未按权限过滤的 static fallback，可能显示无权入口         | G1 已识别窄修：按已有路由权限过滤 fallback 或失败闭合，保留工作台等无额外权限入口；不复制新的权限权威 |
| R2 依赖           | 登录页查询 providers；AuthStore 登录/恢复并发查询 navigation/todos，失败分别提示或 catch 空 | Rust 的真实 404 单独观察并明确排除，不能 mock 成成功；原 Angular session.user 足以认证 R1             |
| 日期/金额/ID/状态 | 共享 contracts、完整 OpenAPI、R1B 单向生成与 R1C session/用户实体                           | 不改类型或业务语义；fixture 只改变明确专用账户/会话的测试状态                                         |
| 持久化            | 现有 92 migrations、PG15.12 固定隔离实例与 R1C 表边界                                       | 仅初始化新的 R1E 专用库，保留旧库和 PG17；无产品 migration/entity/DDL 变更                            |
| 工具链            | R1D 固定 Node/pnpm/Java/Chromium 与 Rust 1.99.1                                             | 不升级包、lock、Cargo 或生成器；用实际版本和指纹记录结果                                              |

命令/DTO/查询矩阵沿用上述已冻结七操作；本轮没有新产品命令或公共 route surface。表字段映射、金额、日期、外部 ID 和状态机变更均 N/A（没有变更），不得为通过测试修改旧模型或 spec。UI 的可见性与守卫须一致，后端权限验收仍消费 R1C 的真实 guard/DB 证据，不能以隐藏菜单代替授权。

## 3. 浏览器与 UI 验收合同

实际 UI 旅程使用原 Angular 页面、表单、顶栏与路由：匿名深链跳登录并保留安全 returnUrl；错误密码/停用账户提示；合法登录、用户信息、Cookie 属性与 CSRF 轮换；刷新恢复、直接路由拒绝、viewer/admin 权限入口；无权 fallback 不显示；实际退出、重新访问受保护页；失效后重新登录与安全返回地址。Cookie 必须由真实后端 Set-Cookie 和浏览器管理，不复用 legacy helper 人工写 Cookie 的方式。

`GET /api/auth/session` 是公开路由：无 Cookie 返回 200 未认证视图，携带过期/撤销/无效 Cookie 则按既有合同返回 401 并清 Cookie。G1 原先把过期 reload 也描述为 200，已在 CP04 依据两端源码和真实失败更正；公开路由身份不意味着所有分支都返回 200。无 Cookie 恢复/守卫与带失效 Cookie 的初始化 401 分别验收。顶栏 logout 会立即调用 `clearSessionState()`，不能仅凭它跳登录就断言拦截器清状态或 returnUrl 通过。

Fallback 与现有 route metadata 机械关联，验证 admin/viewer/无权限、attachments 的 any（1/3 即允许）、external-org-sync 的 all（1/2 拒绝、2/2 允许）；未知 leaf 失败闭合，去掉空 group 与孤立 separator。真实已认证会话权限变化由刷新/新请求读取验证，不承诺前端无请求即时推送。

为验证真实 Angular HTTP 链，允许独立 `main.e2e.ts` 与显式 `e2e-stage` build/serve 配置复用原 AppComponent/appConfig/依赖注入。它只暴露固定已交付 logout 请求与脱敏只读状态；不得提供任意 URL、token 输出、假 service 或新生产路由。请求经过原 HttpClient、generated-client 可用配置、CSRF 和 session-expired interceptors，直接调用 HttpClient 时不调用 AuthStore.logout。生产仍使用原 main.ts；生产产物须核查不含 bridge。

此集成层用新 R1E fixture 造成 `session_missing`、`session_expired`、`session_revoked`、`account_disabled`，验证真实 401 code、清空用户/菜单/待办/token 内存、登录提示、returnUrl 与重新认证。用固定错误 CSRF header 造成真实 403，验证请求失败但页面会话状态保留。实际 UI 操作与 bridge 场景分别命名、报告，不把 `page.fetch` 或 APIRequest 当 Angular interceptor 证明。未知 401/非401 不清会话由原单测核验；七操作没有权限保护读取 API，不能为补矩阵造生产路由。

跨标签页沿用现有行为，不承诺尚未实现的广播即时同步；同一浏览器上下文下一次恢复/受保护请求读取真实撤销状态。CSRF 轮换导致旧标签内存 token 过时的结果需如实记录；若需行为修复先登记 corrective checkpoint，不静默改变语义。

Windows/Linux 均运行完整固定 Chromium 153.0.8010.12/1243：Windows managed Nest、独立 owner 提供的 external Rust；Linux managed Nest/Rust。owned runtime 保留 R1D 规则；external 不构建/启动/seed/stop 后端，fixture 准备是测试作者显式独立操作。桌面和窄屏登录/壳层至少各一轮布局检查，保留无凭证的截图与脱敏请求摘要；关闭可能记录 Cookie 的 trace。

## 4. 新隔离数据与 fixture 合同

使用既有已核验 PG15.12 容器/15432，新建 `poms_r1e_nest`、`poms_r1e_rust`、非管理员 `poms_r1e_app` 与唯一 `r1e_control.marker=9c658fe8-bdde-4d12-84a7-8fb5f157f645`。准备脚本先核集群、精确库名、marker、role 和 frozen migration/seed 输入；不 drop/reset 旧库、不连 PG17。运行只传严格白名单环境，不读取默认 .env。api-server 支持显式 `POMS_E2E_ENV_PROFILE=r1e`；未设维持 r1d，未知 profile 拒绝，external 不读取数据库环境。

fixture 是测试侧有限 CLI，不是服务端 API：只允许已列举的专用用户与会话状态改变（prepare/expire/revoke/disable/restore/permission/cleanup），绑定私有 run journal，先核库和 marker，在事务内断言目标唯一；输入 session 凭证只能经 stdin 并立即 hash，日志只记状态/计数。禁止任意 SQL/目标库/用户/URL 参数，失败保留脱敏证据。只创建/恢复/清理本 run 的用户和会话，不对原 seed 用户或旧库清空。所有 fixture 恢复发生在 finally，并记录验收后的专用账户状态。Windows 可通过显式 WSL fixture 命令调用 Linux 检查器，这不授予 Windows 对 Rust 进程树的 managed ownership。

## 5. 所有权与阶段验证矩阵

A 独占 UI fallback/相关单测、test-only main.e2e、admin project 配置、stage Playwright 场景、admin-launcher 与配置；B 独占 tools/rust-r1e、fixture/环境 tests 和 api-server 的 profile 选择器；root 持有治理、Linux checkout/运行镜像、集成入口与证据；C 不写作者源码，交叉审查并独立核验。共享 runtime、完整 spec/client、锁文件和 Rust 产品源码不得并行改动。

| 检查         | 要求与通过边界                                                                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 真实浏览器   | 四 OS/backend 组合的上述完整认证 UI + Angular interceptor 矩阵，无 skip；响应来自真实 Nest/Rust；R2 404 明列排除                                                                                            |
| 既有前端     | 原 8 spec / 36 tests 全保留并在 Nest 运行；11 case 有 route-mock，25 无显式 mock；legacy Cookie helper 有补写，均与 R1 原生 Cookie 证据分开                                                                 |
| API 集成     | 原 Nest 14 suites / 72 tests；同一 foundation 13 tests 双后端；external 生命周期沿用已交付工具并复核本轮 owner 存活/清理                                                                                    |
| R1A/B/C 阶段 | 核起点产品源码与已交付 81 普通/20 DB tests、29×2 HTTP/558 断言、78 进程断言及共享类型生成证据的绑定；对当前组合跑 Rust fmt/clippy/test/build 与共享类型 check；真实新库、当前 HTTP/browser 作为新增集成证据 |
| 客户端       | 固定完整 spec 237paths/291operations/585schemas；Windows/Linux 固定 Java17/7.20.0 生成并与579文件逐项比较；Rust子集不覆盖完整client                                                                         |
| 数据与 guard | 新库原92migrations/明确seed、低权runtime、catalog与marker；profile/坏env/坏target/坏marker/非专用fixture目标负例；运行前后PG17只读服务元数据，无SQL                                                         |
| UI/构建/静态 | admin相关单测、API/admin lint/build、E2E strict typecheck、工具tests/lint/format；生产产物无bridge；新增warning为0                                                                                          |
| 持久化       | 产品migration/entity未改：不重复无关全量migration-check；新库catalog与原migration指纹必查，若出现差异先分类并纠偏                                                                                           |
| 治理         | Markdown/diff/链接检查、源码与原始日志指纹、非作者审查、合并后检查；提交推送后G4归档与父阶段条件逐项对齐                                                                                                    |

原 Nest UI 若出现既有失败，必须保存初始失败，按起点源码/合同判断 `existing-baseline-drift` 或本轮 `new-real-drift`，形成纠偏记录；不得删场景、弱化断言、扩大 Rust 路由或把失败列为 skip 通过。该矩阵不要求无关产品全量单测或重跑所有历史资源测试；历史与新增证据分别注明，不合计成一次实跑。

## 6. G1 / 例外与风险

G1 Pass：A 审查原 UI/bridge 可执行性，B 审查精确隔离环境/fixture 与阶段证据，C 独立核验边界和矩阵，主代理纳入权限 any/all/未知 leaf、固定 marker 与 run journal 后冻结。以上审查均在源码或新库变更前完成；G1 通过后进入实现。导航 fallback 风险在开工前纳入本基线；冻结后发现的产品差异使用 corrective checkpoint。当前无 gate 绕过或延后补验例外。

G3 只在所需验收和非作者审查通过后允许提交集成；G4 只在远端 HEAD、归档、Issue checklist 和本地文档一致后成立。#60 仅在 R1E 和全部 R1A–D 条件均交付后关闭；总体 #57 与 R2–R7 保持未完成。

## 7. G3 验收记录

G3 Pass。C非作者最终总审确认无剩余P1/P2，主代理集成；[机器验收记录](../../rust-r1e-validation.json)绑定35项当前源码、73项继承源码、逐轮原始结果和审查指纹。受审candidate原字节另存，审后只更新gate/review/closure元数据。浏览器失败、修复及复验按[纠偏记录](rust-r1e-corrective-checkpoint.md)保留；实现已集成推送，G4 收口见第 8 节。

| 范围            | 已核结果 / 剩余条件                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1 来源         | 73 个 R1C 源码指纹全部匹配，其中 46 个为 Rust 产品文件；API/Rust、共享 contracts、完整 spec/client、package/lock/Cargo 未变。历史 20 DB、29×2 HTTP/558 断言与 78 进程断言明确沿用已交付证据，本轮未重复运行                                                                                                                                                                    |
| Rust 当前组合   | Rust 1.99.1 fmt、clippy、locked/offline test 与 release build 通过；81 普通测试通过，21 个数据库/仪器化入口按原设计 ignored，不能记作本轮 DB 通过                                                                                                                                                                                                                              |
| 客户端与生成    | Windows Java 17.0.12 / Linux 17.0.21、固定 generator 7.20.0；完整 237 paths / 291 operations / 585 schemas，579 文件集合与逐文件 SHA 一致；manifest `031985f5c21052697975b5c9f9f0b0d250eb6d14a7a69509e11b6cf6ef8141a8`。共享类型 check、完整 Nx client check 与七操作子集校验通过                                                                                              |
| 工具负例        | Linux 97/97；Windows 96 通过、1 个明确 symlink 权限条件跳过，该负例已在 Linux 实跑通过。包含 fixture 24、环境 guard 各 22、runtime 10、API adapter 6、browser adapter 13；CP02/03 已由 C 非作者复核关闭                                                                                                                                                                        |
| 原 Nest API     | Windows 原 14 suites / 72 tests 全通过，无 skip；Windows/Linux Nest、Linux Rust 与 Windows external Rust foundation 四组合各 13 项通过，无 skip。独立 Linux owner 验证 Windows external API 退出后仍 ready/同 PID 存活，再由原 owner 清理                                                                                                                                      |
| 原 UI 与静态    | 原认证 10 suites / 44 tests、加入 fallback 后 11 suites / 50 tests 均保留；CP04 后 C 独立最终复验 11 suites / 53 tests 通过、零 skip，admin lint 零源码 warning，生产构建及 3 个依赖通过。946 输入构建前后不变，111 个生产 JS/HTML/JSON/map 中 6 个 test bridge 标记命中 0；API lint/build、API/browser strict typecheck、工具 ESLint/格式通过                                 |
| 新隔离库        | 两个新 R1E PG15.12 库各执行原 92 migrations 与显式 seed；低权角色与 marker 检查通过，107 产品表，合同 catalog 10 表 / 121 字段，两库 hash `6190b395b2acb8bccd2832cfe4a7ce3f29259b3714ca95cb55ba6082e33c077b`                                                                                                                                                                   |
| 浏览器 / legacy | Linux Nest/Rust、Windows Nest/外部 Rust 四组合各16项全通过，共64项、零skip/flaky/retry；原8 spec/36项 Nest legacy 经CP07后完整36/36，11项route-mock只计Nest回归。三轮legacy失败24/12、33/3、34/2及首轮stage7/9保留，定向2项预验不加总。前三stage绑定旧35全局快照，CP06/07只改两份不加载的legacy spec，33份其余源及703个静态依赖相同；最终WindowsRust和legacy绑定CP07执行前快照 |
| 清理与所有权    | 最终64次及首轮失败16次共80个唯一run全部再次返回cleaned、matched=0、changed=0。Windows external API和浏览器结束后，独立Linux owner均确认原PID继续就绪，再由owner停止；Windows4900/4901/5000无监听。PG17前后均Running/Auto/PID6996，仅读取服务元数据，未执行PG17 SQL或变更                                                                                                       |

产品行为修改限于导航失败时按现有路由权限过滤静态 fallback，以及 CP04 初始化 401 保留当前内部返回地址；不会把隐藏菜单当作后端授权。真实 HTTP interceptor、实际 UI 操作与公开 session 恢复分开记录；Rust 对 R2 请求的实际 404 保留为排除项。完整客户端结果不由 Rust 七操作子集生成。

桌面与390px窄屏截图已实际审看，认证壳与顶栏操作可达。原依赖的 `Invalid PrimeUI License` 提示仍可见，窄屏覆盖下方部分R2待办区域；本轮不修许可、不称截图无异常。既有Nest组织create实际201而OpenAPI声明200列为R2元数据限制；move200与真实层级断言保留。

## 8. G4 交付与归档

实现 `afbf4ee51baa8543981e66472d04a4d7389a9adb` 已 fast-forward 集成并推送 main，主代理核对远端 HEAD 一致。主仓 35 项最终源码与 73 项继承源码指纹全部匹配，集成后 19 项 API/browser 适配器检查通过；这些后检不重复计入浏览器、数据库或历史运行数量。

最终证据为四组合共 64 项 stage、原 Nest legacy 36 项（其中 11 项有 route-mock）、80 个唯一 run 的再次清理全部 `cleaned / matched=0 / changed=0`，以及 C 非作者审查无剩余 P1/P2。各层实跑、继承、条件跳过及 ignored 入口按第 7 节和机器记录分别保留，不合计为一次全业务验收。

本基线、[纠偏记录](rust-r1e-corrective-checkpoint.md)及 [R1 总体基线](rust-r1-foundation-baseline.md)归档至 `docs/design/archive/slices/`，长期机器证据留在设计根层。R1E #66 与父 R1 #60 的 G4 / Done 随本归档提交完成及主代理推送、Issue 同步生效。总体 #57 与 R2–R7 保持未完成；后续任务仍须单独 G1 授权。交付仅覆盖 R1 七操作、认证与基础，不代表 R2 业务、部署、迁移接管或性能改善通过，既有 PG17 保留。
