# RUST-R0F 认证、错误与健康检查兼容样本

**日期**：2026-10-26；**Issue**：[RUST-R0F #59](https://github.com/illusion-tech/poms/issues/59)；**类型**：离线现行实现样本与过程工具；**范围**：本文件及 `tools/rust-r0f-auth-compat/**`。总范围及 gate 见 [R0F 基线](rust-r0f-compatibility-baseline.md)。

## 1. 输入与完成含义

产品源码冻结为 `033aedd028fc25ea990450a7854fc92c567cfb8a`，R0A–R0E 交付输入为 `08daaf45b12307bc4d53e01e509f23d265532de6`。本切片没有改产品源码、现有 tests、依赖 manifest/lock，没有启动 AppModule/server，没有连接或读取既有 PG17/TEST，也没有迁移、seed 或性能实测。

[运行器](../../../../tools/rust-r0f-auth-compat/run.mjs) 和 [唯一新 suite](../../../../tools/rust-r0f-auth-compat/oracle.spec.ts) 直接调用现有 TypeScript 服务、guard、repository 构造 SQL、vendored Zod pipe/interceptor 及安装的 Nest exception/filter。固定预期在 [auth-compat.v1.json](../../../../tools/rust-r0f-auth-compat/fixtures/auth-compat.v1.json)。普通运行只比较冻结预期，只有显式 `--write` 更新。

本次结果表示 R1 有可复算的现行实现输入。它不表示 Rust 已实现、真实 HTTP/DB/browser 已通过，也不表示已有 TS 测试全量运行通过。既有 tests 提供案例来源，执行入口是本切片独立 suite；既有 session tests 即使传入生命周期 options 仍调用环境 loader，不能在当前约束下原样运行整组。

## 2. 样本与 oracle 边界

| 组           | 数量    | 直接调用与冻结内容                                                                                                                | 被替换的边界                                                          |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `cookie`     | 15      | CookieService 精确 header、encode/decode、重复/空 cookie、到期取整、清除、Secure 默认值                                           | 合成 env loader、时钟；显式 options                                   |
| `session`    | 28      | token/base64url、SHA256、创建/到期/撤销/disabled、throttle、CSRF、rotation 失败重读、真实 repository SQL/参数                     | repository/platform 返回值；SQL execute 只记录，不执行                |
| `guards`     | 31      | 实际 SessionAuth/CSRF/Permission guard、Reflector、decorators；公开读取、公开写双提交、session hash、默认拒绝、all/any/组合及覆盖 | session resolver 的配置结果、审计写入                                 |
| `cipher-v1`  | 13      | 实际 AES-256-GCM/SHA256 key、公开固定 IV、UTF-8、key source 顺序、错误 key/tag/version/格式及错误 JSON                            | 只替换 `randomBytes` 与明确合成 env key                               |
| `controller` | 9       | 实际 AuthController + Cookie/SessionService，公开无会话查询、匿名 CSRF、4 种会话错误、登录/退出响应、Set-Cookie                   | credential/profile/persistence/audit；4 个错误入口用合成 domain error |
| `response`   | 15      | 实际 ZodValidationPipe/DTO、Nest BaseExceptionFilter，实际 Auth/Health metadata 的 passthrough，vendor schema/stream 分支         | 捕获 HTTP adapter；vendor 有 schema 的 context 明确 synthetic         |
| `health`     | 8       | 实际 HealthService/Controller；live、ready、connect/recheck、失败/异常、503、精确 JSON                                            | fake ORM；固定 Date/Date.now/uptime                                   |
| 合计         | **119** | 七组；每个样本保留 ID、输入、证据类别与原实现观测输出                                                                             | 没有真实 I/O 成功声明                                                 |

关键来源：[Cookie](../../../../apps/poms-api/src/app/core/auth/auth-session-cookie.service.ts)、[Session](../../../../apps/poms-api/src/app/core/auth/auth-session.service.ts)、[Repository](../../../../apps/poms-api/src/app/core/auth/auth-session.repository.ts)、[AuthController](../../../../apps/poms-api/src/app/core/auth/auth.controller.ts)、[SessionAuthGuard](../../../../apps/poms-api/src/app/core/auth/guards/session-auth.guard.ts)、[CSRF guard](../../../../apps/poms-api/src/app/core/auth/guards/auth-csrf.guard.ts)、[Permission guard](../../../../apps/poms-api/src/app/core/auth/guards/permissions.guard.ts)、[Cipher](../../../../apps/poms-api/src/app/core/secret/secret-cipher.service.ts)、[HealthService](../../../../apps/poms-api/src/app/core/health/health.service.ts)、[HealthController](../../../../apps/poms-api/src/app/core/health/health.controller.ts)、[Zod serializer](../../../../libs/vendor/nestjs-zod/src/serializer.ts)、[Zod exceptions](../../../../libs/vendor/nestjs-zod/src/exception.ts)。相邻既有 spec 同属产品来源清单。

## 3. 必须保留的现行语义

- `poms_session` 为 HttpOnly，`poms_csrf` 可读，header 为 `X-CSRF-Token`；默认 Path `/api`、SameSite=Lax。Max-Age 向下取整后下限为 0；重复 cookie 取首个匹配，首值为空时不会继续寻找后续重复值。非法百分号编码会抛 URIError；样本记录当前通用异常映射，不静默修复。
- `GET /auth/session` 公开且无 cookie 时返回 unauthenticated/null/空权限；携带无效会话时 Controller 清除两种 cookie 并抛结构化 401。SessionAuthGuard 失败不执行同样的清 cookie 操作。公开 unsafe 请求仍经过双提交 CSRF；只有通过双提交后，公开请求才跳过 session hash 绑定检查。
- Session 到期判定为 idle 或 absolute `<= now`。返回视图 `expiresAt` 为二者较早值；登录 Set-Cookie 使用 absolute expiry，不能把两者混为同一值。仓库 null write snapshot 的分支只是配置的边界反馈，不是并发验收。
- Permission guard 非 Public 且既无 Authenticated、也无非空权限要求时默认拒绝。all 与 any 同时存在时必须同时满足；handler metadata 覆盖同 key 的 class metadata。单独 Authenticated 分支放行不证明会话有效：真实 `AuthModule` 的全局顺序为 SessionAuth → CSRF → Permission，实际完整 Nest 请求管线仍待 R1。
- v1 格式为 `v1:ivBase64:tagBase64:ciphertextBase64`，key 为所选 UTF-8 来源的 SHA256。固定 IV 仅用于跨语言公开测试向量。空明文可加密但当前解密拒绝空 ciphertext 字段；多余冒号字段当前会被解构忽略。这些现行结果需要 R1 保留或单独登记兼容整改，不能在迁移时静默改变。
- 当前 `apps/poms-api/src` 没有使用 `ZodResponse`/`ZodSerializerDto`。全局 interceptor 已注册，但 Auth/Health 只有 Swagger DTO metadata，运行时原样透传。不能按 Swagger DTO 臆测删除未知字段；有 schema 的 vendor 样本只认证其 synthetic context 能力。
- 服务层 `AuthSessionAuthenticationError` 只有 domain code，不含 HTTP 状态。Guard/Controller 产生 401/403；默认拒绝字符串异常、Zod 400、serializer 500 和一般 Error 的默认形状分别由实际 Nest filter 捕获，没有复制映射规则。
- Health liveness 不触碰 ORM；readiness 仅在 `reason === 'Connection not established'` 时 connect 后重查。失败会返回 `not_ready` 并置 503；成功保留 GET 默认 200。checkedAt/uptime/duration 在样本中固定，不能作为运行时间或性能证据。

## 4. 隔离与来源证明

[preload](../../../../tools/rust-r0f-auth-compat/support/preload.cjs) 在 Jest/产品 import 前生效。child env 仅白名单继承 OS 路径/临时目录，显式 synthetic 配置；精确的 `../../../config/load-env` 导入映射至 [env mock](../../../../tools/rust-r0f-auth-compat/support/env.mock.ts)。受保护的原 loader 源文件扫描也被排除，若仍尝试读取则直接失败。

fs 读入口拒绝 `.env`/`.env.*`/`deploy/private/**`；网络和 listener、child process 入口拒绝且不委托原函数。自检用不存在的 `/synthetic/.env.r0f-deny`，验证拒绝路径，没有尝试读取真实 `.env`。oracle 期间 protectedRead/network/process 计数必须为 0；敏感环境继承列表必须为空；合成 loader 必须被调用。

golden 含 LF 规范化的 sourceManifest、generatorManifest、依赖精确版本/package.json SHA 与 Nest filter/exception/reflector 源码 SHA。git guard 检查固定 033 对所有输入的 staged/worktree 差异和 untracked 新增；纯文档/过程提交可复查。依赖安装完整性仍以 lock/包管理器为准，不能把所列实现文件的 SHA 扩称整个 node_modules 认证。

仅规范化源码中的 CRLF→LF；没有规范化掉输出字段、null、cookie 属性顺序、消息、状态码或日期精度。runtime 的 Node 要求固定为 24 >=24.9，当前实际 Node 版本每次打印并记录在执行证据；golden 不因 Node 小版本元信息自动变化。其他环境必须实际复算才能声明通过。

## 5. 运行与本次证据

```powershell
node tools/rust-r0f-auth-compat/run.mjs --check
```

显式重录及操作说明见 [README](../../../../tools/rust-r0f-auth-compat/README.md)。2026-10-26 在 Windows，Node 24.19.0、TypeScript 6.0.3、Jest 30.5.1、ts-jest 29.4.12、Nest common/core 12.0.1、Zod 4.6.1 下执行：119 cases；七项拒绝/环境自检通过；实际 protectedReadAttempts/networkAttempts/processAttempts 均 0；敏感环境继承为空；synthetic loader 调用 30 次。没有真实 `.env` 内容读取。

本次自验通过：runner/preload 的 Node syntax、独立工具 TypeScript `--noEmit`、工具 ESLint（0 warning）、工具代码/JSON Prettier、golden 显式 `--write` 后 `--check`，以及未更新 golden 的默认只读复算。Markdown 使用仓库表格格式工具检查。G3 的最终结论及非作者审查由 root 汇总；本文件不代替总 gate。

## 6. R1/R6 仍需实际验证

- 真实 PG15 repository SQL、事务、唯一约束、rowVersion、CSRF rotation/lastSeen/revoke 的并发竞争，真实 credential hash 验证和权限来源。
- 完整 Nest 与 Rust HTTP pipeline 的 guard 顺序、状态码/header/cookie/JSON，以及浏览器 Secure/SameSite/CORS/CSRF。当前 `main.ts` 的 CORS 构造不是可导出纯函数；本 slice 不启动或复制 bootstrap，CORS 常量/boolean env 语义以 R1 输入及实际实现核对。
- Rust encrypt/decrypt 与本次 TS 固定 v1 向量双向通过；随机 IV 的安全生成及真实 key 生命周期另验。
- 实际 readiness 与隔离 PG15 的连接/失败/恢复、连接池逐连接时区、关闭/回滚行为；mock connect 不能替代真实可用性。
- 合同/外部身份源/后台任务等完整业务响应；R6 发布、回滚、TLS 与未来 PROD 首次部署核验。本 slice 无性能结论。
