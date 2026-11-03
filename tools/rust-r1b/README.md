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

当前 `SOURCE_HEAD` 显式固定为 R4 已审 S3 `4f78bd486ca2118e4700bae560cb25ff08c4b47d`，对应 G1 `2f613c312c9e41b3ed5ac59edf5e9db63842c1cb`。原七份输入和 working / index / untracked 三项保护完整保留；`buildManifest` 不允许关闭 guard，内存输入覆盖也仅接受与实际来源等价的 CRLF 规范化。新 ORM 不在该既有来源范围内，不通过缩小范围或临时忽略文件绕过检查。

R0 原件 `docs/design/rust-r0-api-operations.json` 保持历史时点，不更新成 current。工具同时核其固定 normalized-text SHA；原455常量的name/path/kind/value/hash，以及原224 enum的owner/schemaId/path/top-level/expression/values/OpenAPI/comparison和完整记录次序逐项比较，仅历史line与current line的变化进入单独provenance remap。当前生成manifest仍保留实际current line/column。未知新增、历史删除、重排、既有payload变化一律拒绝，不能以`>=`或跳过R0替代。

本次唯一登记的post-R0常量是 `CONTRACT_TERM_PREPARATION_STATUSES`；新增enum occurrence仅 `ContractTermPreparationStatusSchema` 顶层，以及 `ReadinessInitializationResultSchema` 的 `targetType/resultStatus/businessStatusAfter` 三字段。工具内登记的是固定S3的声明/完整enum payload/expression/value SHA和精确owner/schemaId/field路径，不保存第二份可编辑wire值。新增项必须全部存在且次序正确；更改需另行明确审查。`r0Witness`分别报告历史455/224、不变payload/order、行号remap和已声明R4增量，不能把增量称作历史R0已包含。coverage中旧名`r0SnapshotCount`表示current R0-compatible候选数，本次456；另列historical455和declaredPostR0新增1。

九个enum helper的原hash和实际TS+Zod runtime oracle保持。`isR4ScaledDecimal`以精确函数SHA登记为非enum的schema refinement，不进入enum evaluator helper集合；其容量语义由R4独立受限检查认证，不由本enum oracle冒称业务通过。S3五个精确schema声明中的无enum refinement callback另以声明SHA限定，既不泛化允许未知函数，也不允许callback隐藏z.enum；其它schema语言保护保持fail-closed。原TS仍由同一oracle执行并比较data、enum arguments和实际Zod options，只允许Zod import。

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

正式范围、验证结果与已知限制见 [R1B 基线](../../docs/design/archive/slices/rust-r1b-shared-types-baseline.md)。

当前来源保护分别检查工作树、暂存区和 untracked 输入；将工作区恢复原文不能掩盖已暂存的来源变化。日期解析只覆盖声明的 ISO/date-only UTC 范围，chrono 之外和孤立 UTF-16 surrogate 显式拒绝；服务级 HTTP 错误、完整 DTO 与业务金额链继续由对应切片验收。
