# R1B 共享契约单向导出与兼容检查

TypeScript 共享契约是编辑入口。`shared-manifest.json` 和 Rust `src/shared/generated.rs` 都是生成产物；不得在生成文件独立维护业务值、权限或标签。后端本地认证枚举仍以原 TypeScript 文件为来源。完整 OpenAPI 与 Angular client 的权威生成流程不变。

在已安装锁定 Node 依赖的 checkout 中运行：

```bash
node tools/rust-r1b/export-shared.mjs --check
node --test tools/rust-r1b/export-shared.test.mjs
node tools/rust-r1b/scalar-compat-oracle.mjs --check
node tools/rust-r1b/json-compat-oracle.mjs --check
```

`--check` 只比较，不刷新预期。只有经审查的来源或工具变化才运行相应 `--write`，再检查 neutral manifest、生成 Rust 与 golden 的差异；不能为消除测试失败直接重录预期。来源文件 hash 只将 CRLF 规范化为 LF，业务字符串、Unicode、BOM 和裸 CR 保持原状。不同业务域即使恰好具有相同枚举值，也不因此合并类型。

当前入口固定 R1B 的 `SOURCE_HEAD`、R0 对照快照及覆盖计数。后续共享契约变化须由新的冻结切片审阅并推进来源和对照基线，再显式生成；只改 TS 后执行 `--write` 仍会被拒绝。R0 快照是历史派生证据，不是可手工增补业务值的第二权威，本轮保持原快照不变。

固定 Linux 构建使用已准备的 [R0E 构建镜像](../rust-r0e/README.md)，并在普通 WSL 用户的 Linux checkout 中运行：

```bash
bash tools/rust-r1b/check.sh fetch
bash tools/rust-r1b/check.sh oracles
bash tools/rust-r1b/check.sh check
bash tools/rust-r1b/check.sh openapi > /tmp/poms-r1b-openapi.json
node tools/rust-r1a/verify-openapi.mjs /tmp/poms-r1b-openapi.json
```

`fetch` 是唯一联网步骤，保留原 Cargo.lock 中已有版本，补齐缓存。依赖已齐备时可省略。其余命令在 `--network=none` 容器中运行，不注入数据库凭据。`check` 包括 fmt/clippy/all default tests/release build，均使用 `--locked`（fmt 无此参数）；原 R1A 的 8 项显式真实数据库测试保持 ignored，本切片没有数据库验收结论。`fmt` 是维护命令。状态目录独立为 `$HOME/.local/share/poms-r1b`，不覆盖 R1A 的构建与验收记录。

`oracles` 还需要 Linux checkout 中可解析锁定版本的 TypeScript、Zod 及 Node oracle 所需包；Windows node_modules 的链接不可直接当成 Linux 安装。构建镜像内 Node 可运行最后一项 OpenAPI 校验，需将 checkout 和输出文件挂载。三项 GET 的子集规范由 Rust 输出，现有全量规范不被覆盖。

## 下游使用边界

- 共享枚举提供已知 wire 值、解析、Serde 与 OpenAPI schema；元信息来自原 helper 的实际输出。来源与覆盖检查失败时停止生成。
- `compat::json::Field` 区分 Missing、Null、Value。调用者依照来源 schema 选择 required、nullable、default 和 unknown-key 策略；此模块不替代业务 DTO 验证，也不自动投影认证响应。
- `compat::permissions` 对已解析路由元信息执行纯权限决策；`RawPermission` 保留数据库/会话中的未知值。公开路由、authenticated 元信息与实际 session 认证是不同职责，R1C 仍须保持完整 guard 顺序。
- `compat::scalars` 分开保存 decimal 原字符串与旧 Number 格式，区分 UUID wire 拼写和不透明外部 ID。内部日期 helper 与公开 ISO 校验分别使用；业务计算链、资金阈值和 SQL 约束仍由后续领域验证。

正式范围、验证结果与已知限制见 [R1B 基线](../../docs/design/rust-r1b-shared-types-baseline.md)。

当前来源保护分别检查工作树、暂存区和 untracked 输入；将工作区恢复原文不能掩盖已暂存的来源变化。日期解析只覆盖声明的 ISO/date-only UTC 范围，chrono 之外和孤立 UTF-16 surrogate 显式拒绝；服务级 HTTP 错误、完整 DTO 与业务金额链继续由对应切片验收。
