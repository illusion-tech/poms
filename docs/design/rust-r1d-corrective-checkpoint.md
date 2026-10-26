# RUST-R1D 纠偏记录

**Task**: [R1D #65](https://github.com/illusion-tech/poms/issues/65)
**Baseline**: [G1 实施基线](rust-r1d-e2e-client-baseline.md)
**状态**: G3 Pass；以下纠偏均已实际验证并经非作者复核

## CP01：共享类型构建路径不一致

- 发现：Windows 独立工作树 `e951b76b` 安装原锁文件后，Nest build 通过，Angular build 在 `admin-data-access:build` 发生 TS6305；待 Nest 完成后串行重复仍失败。
- 分类：`existing-baseline-drift`。未修改的 `libs/shared/contracts/project.json` 将 Nx 输出指定为 `dist/libs/shared/contracts`，而 `tsconfig.lib.json` 以及引用者要求 `dist/out-tsc/libs/shared/contracts`。后者仅有共享的 `tsconfig.lib.tsbuildinfo`，没有被引用的 `index.d.ts`。本轮的 API spec/client 内容未变化。
- 修复范围：将 shared-contracts 的 Nx `outputPath` / `rootDir` 对齐已有 TypeScript outDir / rootDir。仅改 outputPath 后仍失败，已核已安装 Nx `normalize-options` 默认以 projectRoot 覆盖 TS rootDir，产物多出一层src。补显式rootDir后Windows Angular build通过；将生成包entry与 `outputFileName` 对齐实际 `index.js` / `index.d.ts`。仅修改该库 project.json 与 package.json，不改共享类型、产品运行代码或依赖。两元配置纳入主代理独占范围和 G3 非作者审查。
- 验收：Windows shared/client、Nest、Angular构建通过，Linux原Angular服务实际启动通过；`dist/out-tsc/libs/shared/contracts/index.js` / `index.d.ts`与生成包entry一致。B/C非作者审查Pass。
- 未完成范围：R1D 全部 G3/G4 仍待；R1E 及父 R1 完成边界不变。

## CP02：共享 E2E 工具的测试入口边界

- 发现：API/Playwright 的 TypeScript 入口相对导入唯一 `tools/e2e` 生命周期实现时，Nx 业务工程依赖规则报告越过 project boundary；该目录是 Node 测试工具，不是产品 library。
- 分类：`tool-noise`；E1 窄规则例外。主代理按已授权测试基础设施范围接受，只在具体 E2E 导入行注明 `@nx/enforce-module-boundaries` 例外及理由。不隐藏动态 loader、不关闭整个文件/全局 lint、不放宽生产应用允许的依赖类型。
- 范围/责任：仅 API E2E support 与 Playwright 配置/setup 导入这套共用工具；主代理负责 G3 非作者复核、准确行清单与 G4 范围复核。期限为本切片 G4；不留下临时全局抑制。后续生产入口不能引用本例外。
- 验收：相关 TS/Node 文件仍执行其余 ESLint 规则和 typecheck；真实双平台生命周期/E2E 另行验收，不能以规则例外代替。

## CP03：既有 Nest E2E 输入未跟随当前契约

- 发现：严格 typecheck 在原 14 suites 的 fixture/类型表达中报错。以 TypeScript CompilerHost 读取 `git show e951b76b` 的原 API E2E 文件复算为 27 条，当前为 22 条且新增 0；其中旧 harness/setup 的 5 条由本切片正常替换消除。
- 分类：`existing-baseline-drift`。剩余为 commission-workflow 15 条、contract-readiness-workflow 1 条、platform-governance 3 条、support/contract-api 1 条、support/test-data 2 条；原始诊断保留于本轮本地验收日志。
- 窄修：动态 payoutStage 先执行非 retention 守卫再收窄类型，保留原值与全部业务断言；两处 reviewDiff 显式给当前契约默认的 `attachmentIds: []`；profile GET 补响应泛型；两个唯一标识调用补场景前缀；移除 DTO 已不存在且调用方未传值的 `currentSnapshotId` fixture 字段（原JSON本就省略undefined）。
- 范围：只修改上述 E2E 文件的输入/类型，不改产品 DTO、行为、OpenAPI 或测试通过条件，不关闭 ts-jest 检查、不减少 14 suites / 72 tests，不跳过断言。主代理接受该必要修复，非作者逐 diff 复核。
- 验收：严格typecheck通过；lint仅4个与起点相同的既有nonnull warning、新增0；既有Nest72项及双方foundation通过。C独立AST核14份suite/72个测试名称/顺序保留，断言变化仅CP04列出的三条。

## CP04：既有冲突错误文案断言使用旧资源名

- 发现：首轮真实 Windows managed Nest 完整回归实际执行 14 suites / 72 tests，69 通过、3 失败；三例均已返回预期 409，失败发生在错误消息子串：`ApprovalRecord version` / `Contract version` / `ProjectHandover version`，实际分别为 `approval-record version` / `contract version` / `project-handover version`。
- 分类：`existing-baseline-drift`。本轮未修改 Nest 产品源；需核起点 `e951b76b` 的资源名调用与冲突模板后，仅让三条精确文案断言跟随该已交付行为。保持状态码、版本冲突场景、测试数量和其余业务断言，不改产品文案、不使用宽松正则。
- 验收：非作者逐条检查三处期望变化后重跑全部 72 项。CP03 修复前后业务断言相同的证据继续保留；最终报告必须另列这三处明确文案更新，不称全部断言文本未变。首轮 Socket MaxListeners 运行告警另外定位，不以提高上限掩盖。

- 完成：起点产品源码已核 `approval-record` / `contract` / `project-handover`；C审查Pass。重新显式准备隔离fixture后14/72通过；第二轮未重新准备导致的3个状态失败保留为失败，未调整业务期望。

## CP05：进程与输入边界的验收修正

- 分类：`new-real-drift`（本切片新工具的边界缺口），已修复。Windows环境变量大小写折叠可绕过原拒绝列表；现改为精确大写键白名单，lowercase DB/Node别名、Path、loader与未知键均拒绝。seed来源检查的untracked范围补齐与working/index相同的全部inputs，防止未跟踪JS遮蔽受审TS。A/B分别复核关闭P2。
- Linux首次进程树测试把`kill(pid,0)`仍可见的Z误判为存活。独立`/proc`实证：anchor/server不存在，descendant为Z、PPID1、exitCode9。测试明确核终止态而非仅放宽断言；fixture先等待真实SIGTERM handler ready，runtime最终必须anchor消失且无non-Z组员。anchor提前消失但有活组员时失败且不发信号，VM负例验证signals=0；C复核关闭P2。最终Windows/Linux各47项通过。
- `tool-noise`：Jest每suite重新加载Axios，而Node globalAgent复用socket；40次模块重载复现`axios.cjs:4816` listener累计。E2E专用`keepAlive:false` HTTP/HTTPS agent消除复用，原状态/失败断言未变，不提高listener上限；最终72项通过且无该告警，C复核Pass。
- Windows Chromium14001属于缓存目录相关环境问题：同一官方完整153包在原目录失败、在新专用Temp缓存真实启动成功；308文件校验一致，未改manifest/系统配置或换旧版本。具体ACL原因未证明；完整浏览器四组原Angular认证smoke均通过。
- 一次Windows foundation调用遗漏显式合成凭据，13项在请求前失败；补齐既定参数后13项通过。保留失败报告，不改变凭据合同或把失败算通过。

所有纠偏均在用户已授权的R1D测试基础设施范围内，不改产品合同、DDL/迁移、Rust源码或完整client。原失败、最终源码/日志指纹及独立审查绑定于[机器证据](rust-r1d-validation.json)。
