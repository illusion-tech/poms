# R0F 认证、错误与 health golden

本工具调用产品基线 `033aedd028fc25ea990450a7854fc92c567cfb8a` 的现有 TypeScript 实现，冻结 119 个离线样本。交付输入为 `08daaf45b12307bc4d53e01e509f23d265532de6`。设计、覆盖与验收边界见 [认证兼容基线](../../docs/design/archive/slices/rust-r0f-auth-compat-baseline.md)。

从仓库根目录运行，使用已经按 `pnpm-lock.yaml` 安装的依赖及 Node 24（至少 24.9）：

```powershell
node tools/rust-r0f-auth-compat/run.mjs --check
```

Linux 使用相同命令。普通运行等同 `--check`，只读取冻结的 [golden](fixtures/auth-compat.v1.json)，不会自动刷新。输出包含当前 Node 版本、样本数、golden SHA256 和隔离计数。`--check` 可创建临时 Jest/观测文件，结束后删除；不会写回 fixture。

只有明确审查输入/输出后才能更新：

```powershell
node tools/rust-r0f-auth-compat/run.mjs --write
node tools/rust-r0f-auth-compat/run.mjs --check
```

`run.mjs` 拒绝基线范围内 tracked/staged/worktree 变化及未追踪新增文件；允许来源不变的后续文档/过程提交。来源清单覆盖 API src、API/shared contracts、vendored Zod、manifest/lock、TS/格式配置，按 UTF-8 CRLF→LF 计算 SHA256。还记录生成器文件、依赖精确版本/package.json 和相关 Nest exception/filter/reflector 实现指纹。指纹不是对全部 node_modules 字节的认证；依赖安装完整性仍由 lock 与包管理器负责。

`jest.config.cjs` 只选择本目录的新 suite，关闭 Watchman，以单进程 `--runInBand --no-cache` 执行。`support/preload.cjs` 在 Jest 和产品 import 前生效：

- 子进程仅继承必要 OS 路径/临时目录变量，显式注入 `NODE_ENV=test`、`TZ=UTC`；不会继承 DB/PG/JWT/POMS/AUTH/secret 配置。
- Cookie/Session 导入的精确相对 `../../../config/load-env` 被映射到 [合成 loader](support/env.mock.ts)。原 loader 源文件也受拒绝读取保护，避免失效后回退读取真实 `.env`。
- 阻断 `.env`/`.env.*`、`deploy/private/**` 内容读取，阻断 TCP/TLS/HTTP/UDP/DNS/fetch、listener 及子进程入口。拒绝操作不委托给原 API。
- 显式自检受保护文件、socket、listener、fetch 和子进程拒绝；文件自检使用不存在的 `/synthetic/.env.r0f-deny`，不探测真实 `.env`。自检计数与产品 oracle 尝试计数分开。
- suite 结束必须断言受保护读取、网络、子进程尝试均为零，合成 loader 被调用且敏感环境继承列表为空。

所有时间、uptime、随机 token 字节及 IV 都在新 suite 中固定。加密、hash、判断规则、Zod、异常处理调用原实现；只替换熵源和外部边界。样本里的 key/IV/凭证是公开测试输入，不能用作生产密钥或随机性实现。

证据分为现有实现直接调用、repository/platform/audit/ORM/adapter 边界 mock，以及 vendor synthetic decorated context。当前 API controllers 没有 `ZodSerializerDto`/`ZodResponse`，Auth/Health 的 Swagger DTO 不会给全局 serializer 添加运行时 schema；真实 metadata 样本因此保留 passthrough。显式 schema/stream 分支另标 synthetic，不代表现行 endpoint。

Session 服务抛出的 `AuthSessionAuthenticationError` 保留 domain code，不伪造 HTTP 状态。Guard/Controller 的实际转换再由安装的 Nest `BaseExceptionFilter` 和捕获 adapter 记录状态/JSON。没有启动 HTTP server，也没有执行 SQL。`repository-sql-call-contract` 仅记录真实 repository 构造的 SQL 与参数。

执行证据：2026-10-26，Windows，Node 24.19.0，TypeScript 6.0.3，Jest 30.5.1，ts-jest 29.4.12，Nest common/core 12.0.1，Zod 4.6.1；119 样本通过。Linux 命令可用性与当前 oracle 在其他 Node 24 小版本的等价性需在该环境实际运行后另记，不能从本次 Windows 结果推定。
