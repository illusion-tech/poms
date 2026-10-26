# RUST-R1D 双后端 E2E、浏览器启动与客户端生成实施基线

**日期**: 2026-10-26
**Task / Parent**: [R1D #65](https://github.com/illusion-tech/poms/issues/65) / [R1 #60](https://github.com/illusion-tech/poms/issues/60)
**Slice Type**: `cross-layer-high-risk`（测试基础设施与生成工具；产品 API/DDL 不变）
**Owner**: 主代理集成/环境/Nx/治理；A 通用进程与 API E2E，B 客户端生成，C 浏览器启动；非作者交叉审查
**Gate**: G1 / G3 / G4 Pass（2026-10-26）；R1D Done；父R1 Doing，R1E Todo
**起点**: `e951b76bf65ea9c286e5e281a01e34b9f75c0fae`；独立 managed worktree 与 Linux checkout；solo worktree checkpoint

## 1. 范围与正式输入

用户授权先冻结 R1D，再完成实现、验证、提交推送和 G4 归档；保留现有 PG17 实例和数据。直接输入为 [R1 实施输入](../../rust-r1-foundation-baseline.md)第 6/8 节、[迁移计划](../../backend-rust-migration-plan.md)、[R1C 已交付基线](rust-r1c-auth-session-baseline.md)、现有 E2E/Playwright/OpenAPI 工具与固定 pnpm lock。

交付同一 API foundation 场景选择 managed-nest / managed-rust / external；HTTP readiness 与受控进程生命周期；Windows/Linux Node 浏览器启动、Angular proxy 及真实 Chromium 基础认证 smoke；固定完整 OpenAPI 的跨平台客户端生成和逐文件比较。保留 Nest 既有 14 suites / 72 tests 的完整入口与断言，不以 Rust 子集运行代替 Nest 回归。

不新增产品公共路由、不改业务 DTO/权限/数据库结构，不将 R1C 七操作子集覆盖当前完整 client；不实现 R2 业务，不接管 migration，不部署。R1E 的整体浏览器旅程、全阶段集成与父阶段验收仍待后续，R1D 的启动/代理/认证 smoke 不是整个 R1 完成。

## 2. 已核现状与 SSOT

| Concern     | 正式来源与现状                                                                                                                                               | R1D 冻结规则                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| API harness | `apps/poms-api-e2e/src/support/server-config.ts`、`server-harness.ts`、setup/teardown；当前只用HOST/PORT、总是构建启动Nest、TCP就绪、旧PID/taskkill/killPort | 显式模式与suite；HTTP readiness；占用端口失败，不杀不属于本轮的服务                          |
| API suites  | 14 suites / 72 tests；现有 login helper 还访问 R2 `/auth/profile`，auth-shell还访问todos                                                                     | 原nest-full完整保留；新增foundation只消费已交付七操作，不能条件跳过旧断言冒充兼容            |
| 初始化      | API和admin E2E `project.json` 都无条件dependsOn `poms-api:seeder-run`，该任务又依赖migration-up                                                              | 从普通E2E入口移除此隐式副作用；准备数据是显式受控操作，external永不准备数据                  |
| 浏览器      | `apps/poms-admin-e2e/playwright.config.ts` 接受两BASE_URL但默认命令依赖PowerShell；未严格校验空URL/端口                                                      | Node入口、参数数组、明确cwd/env、loopback NO_PROXY；外部/内部目标分别管理                    |
| 生成输入    | `libs/shared/api-spec/openapi.json` 237 paths / 291 operations / 585 schemas；`openapitools.json`固定7.20.0；typescript-angular配置与现有规范化              | 完整规范继续权威；保留ngVersion21模板配置，不顺带升级生成器或共享类型                        |
| 生成输出    | 现有client579文件；project.json/tsconfig.json/tsconfig.lib.json为手管元文件                                                                                  | Node单一逻辑、每次唯一临时目录；先完整生成校验再同步，check仅比较不写client；保留元文件      |
| 工具链      | Rust1.99.1及R1C源码；WindowsNode24.19、Linux固定镜像Node24.16；pnpm12.3.4                                                                                    | 本切片不升级package/lock/Cargo/toolchain；原源码与构建指纹作为Rust行为输入                   |
| 浏览器版本  | 实际Playwright1.63.0要求Chromium1243/153.0.8010.12；现有精确浏览器缺失                                                                                       | 使用专用cache/派生镜像安装固定浏览器，不改系统Chrome/Edge，不将旧缓存当通过证据              |
| Java        | Windows已有 `C:/Program Files/Java/jdk-17` 17.0.12，但PATH默认Java11；R0E镜像Java17                                                                          | 显式选择已装Java17并核实际version，保留7.20.0 jar来源和指纹；不依赖Linux PowerShell/robocopy |

日期、金额、ID、状态、权限、Cookie/CSRF等产品语义沿用现有 TypeScript、完整 OpenAPI 和 R1C；本切片不创建第二套类型权威。公共 route surface N/A（不新增/变更）；七操作仍由 [canonical inventory](../../api-route-canonical-inventory.md)和 [R0F 路由](rust-r0f-route-baseline.md)约束。产品字段/迁移矩阵 N/A（不改表/字段），历史迁移仅用于初始化新隔离库。

## 3. 模式、进程与数据合同

| 模式         | 入口与允许副作用                                                       | 禁止行为                                                                |
| ------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| managed-nest | 明确本地地址/端口、受控环境；构建现有Nest并启动；foundation或nest-full | 不隐式seed/migrate，不复用或终止任意已有监听进程                        |
| managed-rust | 明确Rust可执行文件/同机路径与环境；启动已交付Rust；foundation          | 不回退Node后端；不将未实现业务suite列为通过                             |
| external     | 必须给明确有效HTTP(S) URL；只检查ready并发起选定测试请求               | 不build、spawn、seed、migrate或stop；不能因PORT/HOST/.env默认值改变目标 |

两种managed仅终止本轮拥有的进程：记录run ID、PID与启动身份，停止前核对；已退出、复用PID、陈旧/损坏/其它run state不得触发杀进程。使用一个共享Node runtime，API和浏览器入口消费同一生命周期实现。启动前占用端口立即失败；启动错误、超时、测试失败和正常结束均清理自己的进程/文件，保留失败日志；不得使用killPort或按端口扫描杀进程。Windows不把SIGTERM等同Unix优雅退出，按实际进程树与退出证据验证。

API 默认模式为 `managed-nest`，默认 suite 为 `nest-full`，保留既有完整回归；`managed-rust` 仅接受 `foundation`，external 必须显式选择 suite，不猜测远端实现。managed 必须显式提供 `POMS_ENV_FILE`，拒绝回退仓库默认 `.env`；在构建/启动前验证 loopback:15432、`poms_r1d_nest` / `poms_r1d_rust` 与非管理员 `poms_r1d_app`。显式准备入口另外核数据库 marker；external 不读取 DB 环境文件。旧环境与默认 PG17 不能成为测试回退目标。

就绪探测使用 `/api/health/readiness` 的HTTP状态和实际响应字段，同时确认owned child未退出；不能只等TCP、接受任意200页面或用新增公共探针。URL/base path、后端模式、suite、端口和超时必须在任何副作用前校验。敏感环境/密码/URL不进入可提交日志。

数据准备由主代理显式调用独立R1D入口：复用已核验的PG15.12容器/15432，但新建 `poms_r1d_nest`、`poms_r1d_rust`、专用role和R1D marker。先核容器/集群与精确库名/marker/role，再执行原92个migration及原DatabaseSeeder或明确合成fixture；两库同源输入，后端运行用非管理员角色。已有库marker不符即拒绝，不drop/reset旧库、不接触PG17/TEST/R1C库。原seeder的范围清理只能在通过R1D身份检查的新专用库执行，不能暴露成无检查的通用E2E隐式行为。

## 4. 浏览器与生成合同

浏览器启动器以Node调用实际Node/Nx入口，显式传argv/env/cwd；保留Angular `POMS_API_PROXY_TARGET`、localhost/127.0.0.1/IPv6 loopback的NO_PROXY。两个外部BASE_URL时无webServer；只有一个外部URL时仅启动另一个自有服务。端口冲突不reuse已有服务。API启动复用上节三模式与readiness，admin就绪使用实际登录页。

R1D真实Chromium smoke矩阵为 Linux managed Nest/Rust、Windows managed Nest及external Rust；Windows不通过 `wsl.exe` 托管Rust进程树。验证原Angular登录页面能加载、代理到选定后端，以及同源浏览器Cookie/CSRF/login/current-session/logout基础流程；明确每次OS、浏览器版本、目标和数据库。完整UI权限矩阵/业务旅程、失效与跳转综合验收由R1E承接，不因启动smoke通过标全量浏览器通过。external行为另以独立拥有的服务验证测试结束后仍存活，不能由被测external入口代为启动。external不spawn仅指受测API/admin/DB服务，Playwright仍拥有并清理本次Chromium。

客户端生成的单一Node逻辑保留固定7.20.0参数、`--skip-validate-spec`和原配置/规范化：CRLF/裸CR→LF，只清换行前ASCII空格/Tab，连续末尾LF收为一个但不补缺失final LF，含NUL文件跳过；BOM与未变文件是否重写沿用原PS行为，以实际旧PS临时oracle验证。每次唯一临时目录；source/config与元文件生成前后核实，失败不把半生成树镜像到client；同步不跟随越界链接，不递归删除任意计算路径。旧PowerShell入口保留为薄委托，避免两套独立规则。

Node check只消费固定 `libs/shared/api-spec/openapi.json`，由291条method/path/operationId及585个schema名称的保护清单校验完整性，拒绝任意inputSpec override或Rust七操作子集；逐文件比较集合和规范化内容。来源保护同时覆盖working tree与index，防止staged变化抵消。Nx既有openapi依赖仍清楚标注为刷新完整规范的上游步骤，不能把整条Nx链宣称只读。Windows/Linux对同一冻结spec分别生成并比较完整文件集，记录精确版本和hash；Rust子集另行对照现有7操作，不能进入完整client生成链。

## 5. 所有权与验证矩阵

A独占共享 `tools/e2e/runtime.cjs`及生命周期测试、API E2E support/新增foundation suite；C消费该runtime，独占浏览器Node launcher、Playwright配置及基础smoke；B独占 `tools/openapi/`生成/比较/规范化逻辑与测试。主代理持有三个project.json等共享targets、新PG15环境/构建镜像/验证入口、锁文件与全部治理文档；共享接口先对齐，不并行覆盖。源码修改前须G1 Pass。

| 检查             | 必需结果                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| runtime/配置负例 | external零进程/初始化、坏mode/URL/port、占用端口、假readiness、早退出、超时、陈旧/不匹配identity、失败清理、自有进程树结束；Windows/Linux实际进程证据                                             |
| API E2E          | 既有Nest14 suites72tests完整回归；同一foundation在managed Nest/Rust和external明确目标运行，覆盖7操作；不以skip计通过                                                                              |
| 浏览器           | Windows/Linux固定Chromium真实启动原Angular，managed目标与同源proxy/认证基础smoke；外部服务生命周期独立验证                                                                                        |
| 生成             | Windows/Linux固定Java17+/7.20.0对同spec输出逐文件集合/hash一致；与当前client比较；check不写目标、生成失败不污染、并发临时目录、子集/override/缺失或额外文件及坏路径负例；实际旧PS规范化oracle对照 |
| 静态/构建        | 修改工程有lint target则必跑；工具ESLint/Prettier、TS typecheck、Nest/Angular与client相关build；Rust源码若未改不重复全量密码/DB测试，核已验收源码/二进制与7操作spec                                |
| 环境与来源       | 新PG15固定身份/初始化证据、非管理员runtime、PG17只读服务元数据前后对照；旧R0/R1A/B/C证据保留                                                                                                      |
| 治理             | 非作者审查、Markdown表格/本地链接、git diff --check；G3记录准确覆盖/失败与drift；提交推送后G4状态同步、生命周期归档                                                                               |

现有无条件seed、仅TCP就绪与不安全旧PID清理属于本切片已识别的基础设施问题，直接在上述范围修复。发现新的产品/契约/生成差异先登记corrective checkpoint，不能默默修改冻结规范、删断言或更换后端掩盖。当前无gate绕过或延后补验例外。

## 6. G1 结论

Pass：A 核对模式/suite/环境优先级与进程所有权，B 核对完整spec保护与旧PS规范化oracle，C 核对逐平台矩阵及external浏览器所有权；主代理纳入必改项后冻结。managed-rust未设suite默认为foundation；显式nest-full拒绝。external的POMS_API_BASE_URL只接受HTTP(S) origin，不含userinfo/query/hash/非根path；managed API不接受冲突的BASE_URL。显式dotenv优先级必须保留，HOST/PORT以guard确认的effective env为准；只向child传guard返回的环境。G1通过后开始源码实施；R1E仍Todo，父R1仍Doing。

## 7. G3 验收与非作者审查

机器证据见 [rust-r1d-validation.json](../../rust-r1d-validation.json)，实际失败和修复见 [纠偏记录](rust-r1d-corrective-checkpoint.md)。证据绑定源码 LF SHA256、原始日志 SHA256、固定镜像/二进制、四份 Playwright JSON 中的脱敏附件和完整579文件生成清单；原始失败日志保留，不列为通过。

| 范围           | 实际结果与边界                                                                                                                                                                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 生命周期/配置  | Windows 47/47、Linux 47/47；runtime10、API adapter4、browser adapter11、环境guard22，无skip。覆盖端口占用、假ready、早退出、超时、身份不匹配、伪造handle、无anchor但活子进程、外部零ownership及清理                                                                                                            |
| 完整Nest       | Windows原14 suites / 72 tests全通过；三处旧409资源文案按起点产品源码校正，原场景/测试名和其余断言保留；显式reseed后重跑，不自动修改数据准备策略                                                                                                                                                                |
| 共用foundation | 同一13 tests在Windows/Linux managed Nest、Linux managed Rust、Windows/Linux external Nest/Rust共7组通过，无skip；仅七操作，未调用R2 profile/todo作为通过条件                                                                                                                                                   |
| 外部所有权     | 独立controller先启动、external Jest接收故意不可用的DB/envfile；退出后服务仍ready且同PID存活。Windows external Rust另由独立Linux controller持有，Windows API+browser结束后仍存活，再由原owner清理                                                                                                               |
| 真实浏览器     | Playwright1.63.0、完整Chromium1243/153.0.8010.12；Windows Nest/Rust、Linux Nest/Rust四组各1项无skip。原Angular表单、同源proxy、Cookie属性、CSRF拒绝/轮换、session/logout/回到登录通过；附带R2请求仅观察，不认证业务功能                                                                                        |
| 客户端         | Windows42 / Linux40工具测试全通过（Windows多2个PS委托集成场景）；实际Java17与固定7.20.0，完整spec237paths/291operations/585schemas。579个文件集合/hash逐项相等，manifest `031985f5c21052697975b5c9f9f0b0d250eb6d14a7a69509e11b6cf6ef8141a8`；check未写client，21项旧PS规范化oracle、并行临时目录、失败保护通过 |
| Nx/构建/静态   | Windows Nest/Angular/client相关build、API/admin lint通过；API/browser strict typecheck、Node工具ESLint及受影响代码格式通过。API旧测试4个既有nonnull warning与起点一致，新增0；最终72项无MaxListeners告警。Windows Nx API foundation、Linux Nx browser Rust实际入口通过；Nx完整OpenAPI/client check通过         |
| 数据与环境     | 两个新R1D PG15.12库各92原migration及显式原seeder；runtime低权role、marker和catalog核验通过。PG17只读服务元数据前后均Running/Auto/PID6996，无SQL或配置/数据变更；不改系统浏览器或旧缓存                                                                                                                         |
| 来源           | Nest/Rust产品源码、共享类型源码、完整OpenAPI、生成client内容、package/lock/Cargo不变；client仅手管Nx target变更，shared-contracts仅CP01构建元配置                                                                                                                                                              |

C 非作者审查共享runtime/API、CP03/04、Axios agent与生成器，B审查CP01和隔离准备脚本，A审查root环境guard/external证明；root实跑浏览器与跨平台矩阵。所有发现的P2已修复并复核，无剩余P1/P2。E1仅五处E2E相对导入的单行Nx规则例外，主代理接受并负责G4复核，生产规则未放宽。

Windows完整Chromium在原私有缓存触发14001，官方ZIP重下载与308个解压文件逐项校验均一致；同一完整二进制在新的专用Temp缓存通过。未修改manifest、系统ACL/注册表/系统浏览器，未以旧版本或headless-shell冒充完整浏览器；仅确认故障随目录位置/安全上下文变化，具体ACE原因未证实。Linux容器PID1可保留已终止Z条目，清理成功要求anchor消失且组内无non-Z；失去anchor身份但子进程仍活必须失败，不盲发信号。

迁移/entity/产品单测全量重跑不要求：本切片未改产品源、DDL或Rust二进制，已交付R1A/B/C证据仍有效；本次实际PG15初始化、catalog、72项既有E2E及跨后端基础场景承担相关回归。R1E整体UI/阶段集成、R2业务、部署均未执行。

G3 结论：允许按solo worktree流程提交并集成main；G4/Done仅在推送核验、Issue状态回写和生命周期归档后成立。

## 8. G4 交付与归档

实现提交 [`c14333d5a625c15776adaddd780ef82044a54b1f`](https://github.com/illusion-tech/poms/commit/c14333d5a625c15776adaddd780ef82044a54b1f) 已快进集成main并推送，远端HEAD已核；[G3记录](https://github.com/illusion-tech/poms/issues/65#issuecomment-6406587538)绑定实际矩阵与无剩余P1/P2结论。基线和纠偏记录归档到本目录，机器验收保留在design索引。归档提交仅回写文档、状态与链接，56个实现源码和44份原始日志指纹仍匹配，不重复无关产品/数据库测试。

R1D已交付可复用入口；R1E可以依赖该启动/基础场景/client工具，但仍须自己的G1、整体UI/阶段验收和独立审查。父#60与迁移总任务#57继续Open，不将七操作或四组启动smoke扩大为完整Rust业务通过。

本轮失败与通过的原始报告、辅助脚本和清单保存在独立Linux R1D证据目录，Windows私有浏览器cache、PG15副本、Linux checkout和原R0/R1A/B/C证据保留；本轮Windows managed worktree在归档提交推送与状态核对后可回收。原PG17仍Running/Auto/PID6996，无SQL或数据操作，无部署。
