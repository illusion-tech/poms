# RUST-R2G＋R2H 身份与组织目录验收

本批迁移 G 的 16 个既有身份提供商、管理员授权、绑定及外部登录操作，以及 H 的 18 个组织源、目录预览、mapping / diff / apply 操作。来源 main 为 `126ede22bb4b379ae656ccde9cee9d82da383be4`。完整原 TypeScript 产品、Zod、Angular 页面、291 操作 / 585 schema 的 OpenAPI、579 个 generated-client 文件与 92 份历史 migration 保持不变。

联合 G1 基线、[纠偏记录](../../docs/design/rust-r2gh-corrective-checkpoint.md)与最终 validation JSON 分别记录输入、运行语义修正和实际证据。G3 是非作者联合审查，G4 是后续提交 / 集成 / 归档和在线回写；不能仅因某项测试通过关闭父任务。

## 运行入口与数据归属

Root 统一执行环境、服务、DB、HTTP、UI 和公共 Cargo 检查。作者只实现所属代码及用例。公开 fixture 入口为 `batch-client.cjs` → `batch-protocol.cjs` → `batch-cli.mjs` → `OwnedFixture`；每个 run 有新 UUID，先登记 write intent，再按精确拥有的 provider / actor / source / code 收编行。未知 incoming FK / 逻辑引用阻断清理，不按前缀或 actor 批量扫删。

每次验收最后执行两次 cleanup；第二次必须 `matched=0`、`changed=0`、`zero=true`。第一次 `zero=false` 表示本次有实际清理，并不表示残留；base 的剩余数量另行保留。私有 env / key / journal 在 `/home/wangzishi/.local/share/poms-r2gh/private`，目录 0700、文件 0600，不进入公开证据。

完成标记在 extension 与 base 两段清理均返回后写入。final01 全批次审计曾补清两个早期失败 UI 的 base 残项，真实结果保留；修复 marker 顺序后的 7 项 safety、两库 fresh cleanup smoke 和 final02 全批次双轮归零另列。33 项较早 Node 检查与这 7 项受影响检查有 5 项重叠，不能简单相加。

仅准入 PG15 的 `poms_r2gh_nest` / `poms_r2gh_rust`、app role `poms_r2gh_app`、固定 owner-only marker `d668d8df-b350-4d4d-8b70-dc7866a1d5f9`。API 5700/5701、页面 5800、合成上游 5900 均为 loopback。拒绝 ambient DB / PG / MIKRO / 默认 env 与真实供应商 fallback。PG17 只读取服务元数据；primary、旧数据库、volume、缓存和证据保留。

`owner-run.mjs` 拥有 API 的启动 / 停止，保留 PID、startTicks、实际 binary 与完整输入源码 hash；`preserve-owner-input.mjs` 另存原字节和 binary。外部测试只消费 owner receipt，不接管外部 PID。`controlled-upstream.mjs` 的 state / code / token 仅内存使用，持久化请求保留协议形状、哈希与校验标志。

## 有限对照与原件

- `g-export.mjs --check` / `h-export.mjs --check` 机械复核原来源，G 766、H 1778 个 DTO 用例另计；50 state 与 12 Express Accept 探测、helper goldens 不算真实 HTTP。
- `compat-acceptance.mjs` 驱动原 Nest 与 Rust adapter → 实际合成上游 → 实际隔离 PG。最终 G 使用 compat07，H 使用仅 H 的 compat08；同一 candidate04，合计每端 128 次实际 HTTP，包含 3 组受控竞争 / 6 个并发请求。
- 每组竞争锁定一个精确拥有的 provider / ticket / run 行，真实观察一条、两条 UPDATE 阻塞后释放，完整等待两个响应。原 winner/loser 为 200/500，保留 CAS、审计、版本和会话事实；不声称双写原子性或将 loser 改成 401。
- `transport-acceptance.mjs` 的 transport03 为最终共享 transport 的原 axios 与 Rust reqwest 实际 HTTP/TLS/proxy/query/redirect/timeout/compression/raw JSON 18 项对照；probe binary 与输入原字节另存。早期 transport01 失败和 transport02 Pass 保留各自候选边界。它与 API / PG 请求数分列，不是 live vendor 认证。
- `native-constraints.mjs` 每库 12 项原生 unique / FK / CHECK / int4 / 删除动作，全部用新 owned 行，测试事务回滚，随后两次 cleanup。
- `foundation-acceptance.mjs` 运行原七操作认证基础套件，Windows/Linux × Nest/Rust，每组合 13 项，共 52 项。
- `browser-acceptance.mjs` 运行原 Angular G/H 两条完整页面链路，Windows/Linux × Nest/Rust；实际通过回执与失败历史分别列入最终 validation JSON。没有 route mocks，没有浏览器内直接发命令替代页面点击。
- `verify-openapi.mjs` 对 Rust 的 65 paths / 81 operations 完整递归校验，G/H 新增 27 paths / 34 operations 的 operation metadata / reachable schemas 与原规范相等，再递归验证继承的 47 操作。

敏感协议字段在内存严格验证，持久化部分使用显式 marker / hash；不能把已脱敏的文本称为原始完整敏感响应。logical ID、时间、Cookie 取整与完全相同 timestamp 的有界投影详见纠偏记录；实际 row ID、时间及顺序收据保留。其他字段与数组次序严格比较。

## 工具链、检查与保全

Rust 固定镜像 `ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273`，使用独立 target / Cargo cache；普通最终测试 162 Pass、54 ignored，后者不计为已运行。实际 GH PostgreSQL 验证独立列数。原 API build、API/admin lint/test、前端 production build、原页面与 GH 页面 typecheck、完整 OpenAPI/client check 均有实际日志。`poms-admin-e2e` 没有 lint/test target，run-many 日志明确列为无此配置；它的证据为 typecheck 与实际页面验收，不能计为额外 lint/test 通过。

浏览器 / Node / JDK 固定镜像为 `40946b3f8c4be299594da0968be9656f010b2e73df6be115c9555e155528997d`；Linux Node 24.16 与 Windows / API 宿主 Node 24.19 的实际版本分别记录。Windows 使用此前已存在的本轮 task-local Chromium 1243 cache。没有新装系统浏览器。

admin build 的首轮 pnpm 安全校验失败和第二轮只读旧依赖 shim chmod 失败保留。最终通过临时 Podman `:O` upper 运行，旧 R2D lower 的选定 metadata / shim 原字节和权限探针前后不变；未禁用安全策略。没有重置旧 modules / store，没有修改主机 Java。

read-only schema 结果为两库 Failed-with-classification，生成 SQL 未执行。原件按 Linux 本地 raw manifest + 一次 tar 批量转移到 Windows `tmp/rust-r2gh/linux-evidence`，接收后逐项核验 hash；Windows 原件保留在同层目录。旧失败、恢复、超时和部分结果都保留真实标签。私有工作记录不属于交付证据。

本批只取得本机受控协议与隔离数据库的兼容性证据；没有真实 Feishu 租户授权、生产写入、部署、R3/R4 业务 caller 接管或性能结论。

## 首审 Block 后的集中修复增量

初始 validation / review 保持原字节，首审为 3 P2＋1 P3 的 Block。最终采纳须同时阅读 [G3 增量](../../docs/design/rust-r2gh-g3-delta02.json)及后续同次复核，不能把初始 Block 或旧候选直接标为最终 Pass。

candidate05 修正不可读密文 400 分类与不支持协议的 axios 错误分类；完整 reference guard 在首个 DELETE 前检查 107 表、28 条完整 incoming FK 与 GH/base UUID 闭包外引，unknown actor/target/prefix 不取得归属。实际双库各 2 个拒绝反例均 0 DML，随后合法清理二次零；工具纯检查 23 项通过。完整新 fixfull01 严格对照每端 128 captured-case HTTP，独立 fixbad01 每端 5 setup＋4 负例通过，合计每端 137；transport04 为 20 项。坏密文 fault 只在独立新 run 的精确 owned 两列执行，原值写前登记、finally 原列恢复/hash/decrypt 验证，不覆盖实际业务失败写入。

新 normalizer 只投影显式 server-owned timestamp 路径，任意 ISO 业务字符串保持字面；state/ticket TTL 有实际请求区间断言。Rust Windows ui07 / Linux ui02 各 2 条原页面再次通过；原 Nest 两平台页面与基础认证保留原候选及未改动来源的标签。最终全量为 72 backend/run / 144 journal，final03 连续两轮零残留，fix01 owner 正常停止、四端口释放。后续 G4 使用独立附加记录，不回写冻结输入。

同一次联合 [G3 最终 Pass](../../docs/design/rust-r2gh-review02.json)，未关闭 P0/P1/P2/P3 均为0；完整受审 [source/evidence union](../../docs/design/rust-r2gh-source-manifest.json)是3,479项冻结清单的原字节副本。实现提交、main集成后核验与G4仍由后续附加记录承载。
