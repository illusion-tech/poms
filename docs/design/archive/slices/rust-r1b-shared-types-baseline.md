# RUST-R1B 共享类型单向导出与兼容实施基线

**日期**: 2026-10-26
**Task / Parent**: [R1B #63](https://github.com/illusion-tech/poms/issues/63) / [R1 #60](https://github.com/illusion-tech/poms/issues/60)
**Owner**: 主代理集成；A 导出/生成，B 标量兼容，C JSON/权限；非作者交叉审查
**Slice Type**: `cross-layer-high-risk`
**Gate**: G1/G3/G4 `Pass`；R1B #63 `Done`
**源码起点**: `ef9fd7f4871eb87167bca1ae04fae8a992ef594c`；R1A 已交付
**执行方式**: 独立 managed worktree + 独立 Linux checkout；solo worktree checkpoint，验证后合入 main

## 1. 范围与权威来源

本切片落实 [R1 输入](rust-r1-foundation-baseline.md) 的 R1B：共享枚举/权限及元信息从现有 TypeScript 单向导出，再生成 Rust；日期、金额、ID、JSON 基础映射以实际现行实现与冻结样本验证。TypeScript 仍拥有共享契约编辑权，Rust 生成文件、neutral manifest 与兼容 golden 都是可复算产物，不接受在生成文件直接添加共享值。新增共享值先改同一 SSOT，再显式再生成并审阅差异。

| Concern         | SSOT / 输入                                                                                                         | R1B 边界                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 枚举/元信息     | `libs/shared/contracts/src/lib/shared-contracts.ts`；[R0 API 清单](../../rust-r0-api-contract-inventory.md)第 10 节 | 全量当前命名值、z.enum 表达式与 helper 派生元信息；不是手写两份值列表                                                     |
| 认证局部值      | `core/auth/auth-session.entity.ts` 的 status/revoked reason；`auth-session.service.ts` 的 error code                | 机械导出原值；保留 account-disabled 与 account_disabled 的差别，不实现 session 服务                                       |
| 日期/ID/decimal | [R0F 数据输入](../../rust-r0f-data-compat.md)、实际 Zod 与原 helper                                                 | date 与 UTC datetime 分开；UUID 保留 wire 字符串大小写，外部 ID 按其 schema；decimal 原字符串/十进制值/旧 Number 格式分开 |
| JSON/DTO        | 现有共享 Zod、R0F 样本与 R1 四认证操作输入                                                                          | 可复用 missing/null/value、required nullable 与 unknown-key 策略及逐字段样本；完整认证 handler/响应投影在 R1C             |
| 权限            | PERMISSION_KEYS、现有 PermissionsGuard 与 PlatformService                                                           | 已知枚举封闭解析；持久化/会话 raw 字符串保留未知值；all/any/default-deny 纯决策不改变                                     |
| 公共接口        | canonical inventory、完整现有 OpenAPI 与 R0F 路由基线                                                               | 不新增/修改路由；保留现有 OpenAPI→Angular client 生成权                                                                   |

R0 清单的 455 项是 201 string arrays、162 Value objects、92 definitions；224 个 z.enum 包含 171 顶层与 53 嵌套，37 个权限值。455 不是全部业务类型或元信息数量。R1B 还从原 helper 导出 labels/severities/options/hints、PermissionsMeta 与后端消费的敏感包权限映射，不能遗漏后另起一份手工定义。具体机器覆盖数量在 G3 以实际导出结果记录。

## 2. 生成与变更合同

- 生成器读取现行 TypeScript AST/明确支持的 helper，保留源码位置、规范化 UTF-8 SHA、工具版本与 OpenAPI 可见枚举对照；只做 CRLF→LF，不能改变业务字符串。来源不符、未知表达式、重复/冲突命名和不支持的 helper 必须失败，不静默跳过。
- neutral manifest 为中间产物，Rust enums 的 Serde rename、wire value、顺序、已知值集合和元信息均来自它；Rust 标识符可机械转换，不改变 wire 值。`--check` 不修改预期或产品源码；`--write` 只显式更新本切片生成产物。
- 按 TS→manifest→实际 Rust 序列化结果→OpenAPI 可见集合校验；所有已知值往返，未知值拒绝。OpenAPI 未独立发布的 10 顶层 enum 与 53 嵌套项仍从 TS 核对，不能因规范没有顶层 enum 就漏掉。
- 既有 TypeScript、完整 OpenAPI/client、R0 冻结清单与 golden 不重写。R1B 新增的可复算样本只有合成输入；来源与工具变化均显式暴露。
- 当前导出器固定 R1B 来源提交及 R0 对照/覆盖基线；未来共享契约变化通过新冻结切片推进已审来源及对照，再显式生成。不能只改 TS 后用 `--write` 绕过这项冻结，也不把旧快照改为手工维护业务值的入口。

## 3. 基础类型与兼容边界

- 日期保留 string 原截取与 Date 按 Asia/Hong_Kong 格式化的区别；公开 date/UTC datetime 校验独立于内部宽松 helper。无时区日期不能改成时间戳，UTC Z 格式不能扩大为任意 offset。锁定 `chrono-tz = 0.10.4` 处理命名时区，不能以固定 UTC+8 替代香港历史时区；补实际 Node 的历史夏令时与低年份样本。
- 保留 decimal/string 原值与 scale；JSON wire 仍为字符串。旧 Number/toFixed 路径另设明确适配器，覆盖 binary tie、-0、小负数、超过安全整数与 1e21；不使用 Decimal 默认舍入替代旧结果。精确新增 `ryu-js = 1.0.3`，封装自行拒绝超出 ECMAScript digits 上限的请求，并经实际 Node oracle 比较；业务计算、阈值与累加顺序仍留对应领域。
- UUID 与外部 ID 分型；UUID 验证不能导致大写输入输出自动变小写，外部 ID 可包含非 UUID 字符串并按其原 schema trim。Nullable 不等于 optional；required nullable 缺字段应失败，PATCH missing/null/value 三态可区分并保持序列化。
- login 的未知字段按原 Zod strip，logout 的 strict 空对象拒绝未知字段；这种基础策略测试不是认证 HTTP 已实现。当前认证响应只有 Swagger 元信息，不能假设服务已经运行 Zod response projection。
- 从数据库读取的 permission_key 没有封闭枚举约束；现有服务去重但不对白名单取交集。Rust 强枚举用于已知需求/共享 schema，raw 权限桥保留未知字符串，不能在类型层改变现有会话输出或授权结果。

新增依赖依据为 [chrono-tz 0.10.4 官方文档](https://docs.rs/chrono-tz/0.10.4/chrono_tz/)与 [ryu-js v1.0.3 官方源码](https://github.com/boa-dev/ryu-js/blob/v1.0.3/src/buffer/mod.rs)。这些文档说明 API 与能力，兼容放行仍以本项目实际 Node/Rust 对照为准；最终 lock 记录所有新增传递依赖。

## 4. 明确不做

不实现认证 HTTP/账户读取/session/CSRF/Cookie/密码或密文，不接管完整业务 DTO 或客户端生成，不实现业务资金/成本/提成计算链，不新增公共路由，不执行 SQL/migration/seed，不连接 PG17、PG15 或 TEST，不部署。已交付 R1A 三 GET 与配置/生命周期保持回归，父 R1C/D/E 不以类型通过被标为完成。

## 5. 文件与并行边界

主代理持有 Cargo.toml/Cargo.lock、lib/shared/compat 模块入口、固定环境运行工具、总体测试编排及治理文档。A 持有 `tools/rust-r1b/export-shared.mjs`、对应导出测试、neutral manifest 与 `src/shared/generated.rs`；B 持有 `src/compat/scalars.rs` 与 `tests/scalars.rs`；C 持有 `src/compat/json.rs`、`permissions.rs`、对应测试与新增 JSON/权限 Node oracle。公共函数签名与生成 enum 入口先与主代理对齐，禁止并发修改 manifest/lock/全局注册。Windows worktree 使用自己的 node_modules；Linux 构建缓存与前次 R1A 证据分离。

## 6. 验证与 Gate

| 检查        | 所需结果                                                                                   | 当前                                          |
| ----------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| 生成/来源   | Windows/Linux 相同输出；完整集合、元信息、source/产物篡改、未知表达式拒绝、再次生成无 diff | Pass；两端各 10 项 Node 测试                  |
| Rust        | 固定 R1A 构建镜像/toolchain；fmt、clippy all-targets -D warnings、test、release --locked   | Pass；56 tests，8 DB tests 显式 ignored       |
| 枚举/权限   | 全值 Serde 往返/未知拒绝、OpenAPI 可见集合、all/any/default-deny 与 raw unknown 桥         | Pass；205 枚举 / 778 wire 值，18 权限决策样本 |
| 标量/JSON   | 实际 Node 预期；日期/decimal/UUID/外部 ID/缺省-null-未知字段逐项对照；反例有效             | Pass；数量及部分覆盖边界见第 8 节             |
| 回归        | R1A 非 DB Rust 测试与三操作 OpenAPI 保持；旧 TS 清单/golden 校验                           | Pass；37 既有非 DB tests 包含在 56 项中       |
| 工具/治理   | 新工具 syntax/lint/format、Markdown/diff/链接、非作者复核、Issue/trackers 与精确提交       | G3/G4 Pass；实现合入并推送，生命周期已归档    |
| DB/E2E/部署 | 无 SQL/DB/路由/服务配置改动，真实 DB 与浏览器认证属于其他切片，本轮不运行                  | N/A                                           |

用户已授权本切片，R1 输入及上述执行边界构成 G1。无绕过 gate 的例外；如出现新设计 drift，先记录 corrective checkpoint，再作处理。G3 未通过前不提交产品实现结论；G4 需合入、在线状态同步并归档本生命周期文件；父 R1 保持 Doing。

## 7. 实施中 corrective checkpoint

`R1B-CP01`（2026-10-26，G3 前，`new-real-drift`）：非作者 C 在独立临时 Git 仓库复现，原 `git diff <sourceHead>` 只比较工作树；当 index 已暂存来源改动、工作树又恢复原基线时，来源保护错误放行。这违反本切片的来源变化拒绝合同，尚未合入 main。

修复边界：共享导出、标量 oracle、JSON oracle 分别额外比较 `git diff --cached <sourceHead>`，继续独立检查工作树与 untracked 来源。`--write` 不绕过保护；新增暂存/工作树抵消的负例。Owner 为各工具作者，C/B 与主代理核对最终拒绝证据；工具 hash 变更显式重录生成 manifest/golden，不改变 TypeScript 或预期业务值。G3 必须在这些检查及固定环境兼容回归通过后放行，无例外或下游遗留。

最终三个工具的保护均已修复。独立临时仓库中的 index/working 抵消反例拒绝 `--check` / `--write`，生成产物不被修改；C 对 A 的最终审查、B 对 C 的最终审查及主代理复核通过。`R1B-CP01` 已在 G3 前关闭。

## 8. G3 实际交付与证据

[机器验收记录](../../rust-r1b-validation.json)绑定 36 个源码/工具/产物的规范化 SHA、固定镜像、实际二进制、两端日志与计数；[维护入口](../../../../tools/rust-r1b/README.md)给出复算命令。以下计数区分 Rust 测试、fixture 输入组和观察项。

- 导出全量分类 1302 个顶层变量：665 数据声明、636 schema、1 个已标明的 schema shape。665 包含 R0 的 455 项、206 个原 helper 派生元信息、2 个权限元信息映射及 2 个数值限制。455 项全部有经来源关系证明的 Rust 映射，不按相同 wire 集合猜测或合并领域。
- 224 个 z.enum（171 顶层 + 53 嵌套）均有来源映射；161 个公开顶层 enum 与现有 OpenAPI 值及顺序一致，10 个未独立发布项仍保留。生成 202 个共享域 + 3 个后端认证域，共 205 枚举、778 值；37 个权限在其中。实际 Rust Serde、FromStr、ALL 和 ToSchema 逐值核对，不增加 HTTP 路由。
- 56 项 Rust tests 全通过：R1A 非 DB 回归 37 项，R1B 新增 19 项（JSON 5、权限 3、标量 8、R0F 跨类型 2、全枚举 1）。原 8 项真实 DB tests 保持显式 ignored，不计为通过。固定镜像内 fmt、clippy all-targets `-D warnings`、release `--locked` 通过。
- R0F 基础标量 54 输入组 / 221 项返回值或拒绝分类对照通过；另直接消费 2 个 required-nullable 组织字段及 3 个 membership enum 样本。3 个 session timestamp fixture 仅验证时间字段转换，不等于整个 snapshot/优先级规则；10 个 SQL 录制、4 个 retention 业务判断未在本切片迁移。
- 新增 98 个标量输入组：34 Number 位模式、18 数值字符串、21 日期、10 UUID、5 外部 ID、10 wire date/datetime。34 Number 各比较 String 与 6 个 digits 的 toFixed；兼容 binary tie、相邻浮点数、-0、1e21、100/101 digits、香港历史夏令时、扩展年份、24:00 与毫秒截断。
- JSON/权限 oracle 有 51 项观察：21 field、11 object、18 guard、1 raw permission 聚合来源；实际 shared Zod 与原 guard/service 方法提供预期，metadata/repository/audit 为明确 double。3 项未知 lexical/import/this 依赖拒绝通过，不宣称真实 HTTP/session/DB 聚合已实现。
- Windows Node 24.19.0 与固定 Linux Node 24.16.0 的 manifest/golden 完全相同；两端各 10 项生成器测试通过，覆盖未知候选/helper/表达式、命名冲突、来源与产物篡改、index/working 抵消、CRLF 及无反向编辑。TypeScript 6.0.3 / Zod 4.6.1 精确核对；新工具 ESLint 零警告、Prettier、shell syntax 通过。
- 既有三 GET 的 OpenAPI 子集与 3 个 health schemas 对照通过；R0 API/DB 清单及 R0F data oracle `--check` 通过。共享 TS、完整 OpenAPI/client、旧 golden、既有 Nest/Angular、部署及 pnpm 锁文件没有改动。
- Cargo.lock 从 229 到 234 个 package records，只增加 chrono-tz 0.10.4、ryu-js 1.0.3、phf 0.12.1、phf_shared 0.12.1、siphasher 1.0.4；既有版本无变化。Rust 1.97.1 / Debian12 / glibc2.36 固定构建，实际 ELF 最大 GLIBC symbol 为 2.34。二进制 SHA `56732d99e3af50a8c732910f815168b46f9fefcf9dcf246c8433b0b7b993fe91`，没有部署。

非作者审查：C 审 A 导出链、A 审 B 标量、B 审 C JSON/权限及主代理跨类型回归，全部 Pass、无剩余实质问题。文档格式/链接与 diff 检查随本次 G3 提交执行。无例外。

## 9. 下游约束与未交付边界

时间戳解析只覆盖已声明的 ISO/date-only + UTC 处理范围，不是任意 Date.parse 或宿主本地解析；chrono 范围外返回 `UnsupportedDateRange`。JS slice 若产生孤立 UTF-16 surrogate，Rust 显式拒绝；不以替换字符悄悄改变值。公开 date/UTC datetime 仍单独依照原 Zod 验证。

错误对照在标量拒绝类别/acceptance 层，不代替服务级 Nest HTTP 错误包装、完整 DTO refinement 或响应字段投影。RawPermission 保留顺序、大小写、未知字符串及重复项；实际 Platform 聚合去重仍归 R1C 服务读取。未执行 DB、浏览器登录/E2E、migration、seed 或部署；对应输入和验收继续由 R1C–E 及后续领域切片承担。

## 10. G4 收口

实现提交 `5cc44100928c8f5045df12aebc4137460b5fb608` 已通过 fast-forward 合入并推送 main；本生命周期基线归档至 `docs/design/archive/slices/`。G3 评论见 [#63](https://github.com/illusion-tech/poms/issues/63#issuecomment-6404582220)，G4 在线记录随归档提交同步。R1B Done；父 R1 #60 保持 Doing，R1C–E Todo。原 PG17 实例及 PG15/TEST 未执行连接或变更。

归档只改文档与相对引用，36 个已验收源码/产物指纹仍与实现提交一致；Markdown、diff 和链接复核通过。G4 不扩展本基线第 9 节声明的完成边界。
