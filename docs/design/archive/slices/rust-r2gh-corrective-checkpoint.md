# RUST-R2G＋R2H 运行语义纠偏记录

- Checkpoint Status：G3 Pass，全部四项finding已在同次联合审查关闭；G4随本归档提交推送与子Issue回写生效，见[closeout](rust-r2gh-closeout.md)。
- Parent：[#67](https://github.com/illusion-tech/poms/issues/67) / [#57](https://github.com/illusion-tech/poms/issues/57)；子项仅 #74 / #75。
- Owner：Root；G/H 各自负责所属实现，非作者 C 负责联合 G3。
- Slice Type：cross-layer-high-risk；日期 2026-10-28；正式输入为[联合基线](rust-r2gh-identity-directory-baseline.md)、原 TypeScript / Zod / migration / OpenAPI 与原 Angular 页面。
- 本记录补充实际见证对既有语义的澄清，不覆盖受审 G1 原文，也不新增公开 route、产品 migration 或设计状态。

## 触发与修正

G1 首轮签名描述错误已在 candidate02 冻结前纠正。原 Node 先以宽容的 base64url 解码 supplied / expected signature，再比较解码后的字节长度和 constant-time 字节结果；UTF8 文本等长比较并不等价。保留 candidate01、首轮 Block、两份原文及增量 Pass。

实际原 Nest 与 Rust 对照随后暴露三项 `new-real-drift`，已在最终 candidate04 修正：

1. G 领域 audit 的 `request_id` 原为 SQL NULL；不能套用认证安全事件的请求身份。修正只影响领域 audit 投影，既有 guard / security 事件身份保留。
2. G 动态 capture 的非法 percent / UTF8，包括未知 suffix 上的 `%FF`，原 Express 在 guard / method 之前拒绝为 400。Rust 在规范化入口保留此顺序。
3. 上游 raw JSON 的 Node Number / UTF16 行为不能由普通 `serde_json::Value` 完整表达。H 原始外部 snapshot 中 lone surrogate 会触发 PostgreSQL `22P02`；初始 previewing run 已独立提交，后续 flush / catch 的错误可能继续导致 500。共享 transport 保留 raw JSON，并在相应 JSONB / 原始 wire 边界按 Node 行为处理，避免自动替换 Unicode 后伪造成功。

这些修改由同一候选的真实原 Nest / Rust HTTP、数据库事实、审计和分段提交比较覆盖。旧候选、失败轮次与受影响增量原件保留，不把早期结果改写为最终 release 的全量重跑。

## 原实现保留的边界

H 第一次创建组织时，原 MikroORM 对尚未 flush 的新 OrgUnit 取不到生成 UUID。原 Nest 实际生成父子两行，但 child parent 为 NULL，mapping / diff 的 org ID 为 NULL，candidate 没有 `appliedOrgUnitId`。原 SQL 见证与最终真实 HTTP / PG 验收确认这一点。Rust 保留此既有行为；后续人工映射按现行流程工作。它不是本批新增的数据模型，也不借迁移修复原业务缺陷。

H apply 保留 best-effort、逐项捕获、原多阶段 flush 和独立审计。它不新增整批原子事务、来源锁、权威子树限制或申请后重验。disable 场景只对本轮新建且完整拥有的子树执行。原 replace 的 early DELETE、单行 CAS 与 bulk UPDATE 的差别也由实际 SQL 见证约束。

G state 的 nonce 只在签名 payload 内，原流程没有服务端 state 消耗、PKCE 或新的浏览器绑定。tenantAllowlist 当前仅存取；ticket 消耗不会重验 provider / binding，后续 session 失败不回滚已经提交的消耗和 audit。signed admin callback 也不新增 cookie / 权限重验。本批迁移这些原行为，没有取得新增安全语义或真实供应商认证的结论。

金额 / 精度 N/A：本批无金额操作。内部 UUID、外部 varchar ID、配置 / 票据 / 组织版本、SQL NULL / JSONB null、时刻与数据库微秒继续分别处理。原完整规范与 generated client 保持单向权威。

## 比较投影与工具差异

- `tool-noise`：Cookie Max-Age 的秒级取整允许相邻一秒差异。每个实际 cookie 的 MaxAge / Expires / receivedAt 均单独验证并保留；其他 cookie 属性严格比较。
- `tool-noise`：两端 diff-list 均仅按原 `created_at ASC` 排序，没有 UUID tie-breaker。验收将每个 wire item 对应到本库精确拥有的 PG 行，验证原始微秒非递减及 API 毫秒投影；只在完全相同 PG timestamp 的组内按 logical alias 比较。实际 ID、timestamp 和数组次序继续保留，不全局排序响应。
- `existing-baseline-drift`：两库 read-only `migration:check` exit 1；低权限 CHECK introspection 可见性和既有 comment 差异与归档基线匹配。`schema:update --dump` exit 0，catalog 前后不变，生成 SQL 未执行。该结论是 Failed-with-classification，不是 schema clean。
- 旧 native / harness / setup / deadline / UI locator 失败均保留原状态。显式 recovery 的 late adoption 与 maximum correction 仍有独立标记，不改称预登记成功。

最终全 journal 审计另发现验收工具的 `new-real-drift`：extension cleanup 的事务提交后就写入 GH `cleaned`，而继承的 base cleanup 尚未完成。两次早期失败 UI 的中断留下 base 残项；final01 sweep 按原 journal 清除了它们，保留真实移除数量和第二次归零结果。工具现仅在 extension 与 base 都成功返回后标记完成，补充 2 项失败/成功顺序回归；7 项 fixture safety 通过，双库 fresh cleanup smoke 通过，final02 全批次两轮均为零。产品二进制与既有 HTTP / UI 比较结果不受此 marker 顺序修正影响；原 runtime 输入里的旧工具字节继续保留。

## 验证与剩余 Gate

最终 candidate04 的普通 Rust 检查为 162 Pass / 54 ignored，clippy 无警告、release 成功；ignored 专用 PG 测试不计入本批实际通过数。本批另有双端真实 HTTP / PG、受控并发和独立 native PG 约束见证。12 项 native unique / FK / int4 / CHECK / 删除动作在每库各执行一次并回滚，随后两次 owned cleanup 归零；这证明原生数据库行为，不替代产品 HTTP 测试。

原 source oracle、受控协议集成、真实页面、真实供应商账号分别计数。实际 adapter 访问本机合成 HTTP/TLS/proxy 服务；没有真实 Feishu 测试租户认证，没有外部目录写入，没有生产部署或性能结论。

G3 的最终证据入口为 `docs/design/rust-r2gh-validation.json` 与 `tools/rust-r2gh/README.md`，独立审查回执另行冻结。只有完整验收、非作者 G3、提交推送、集成后检查、G4 归档与在线回写完成后，#74/#75 才可 Done。父 #67/#57、余下 34 操作及 R2M、#61 / R3–R5 继续保留原范围。

## 联合 G3 首审后的集中纠偏

首审原件为 `docs/design/rust-r2gh-review.json`，结论 Block，P0/P1=0、P2=3、P3=1；原 validation、review、freeze、3,406 项 source/evidence union 与 Linux 3,040 份原件均保留原字节。计划改动的原受审源码另存 `tmp/rust-r2gh/g3-reviewed-source01/`。本节和后续增量记录不把首审改成 Pass。

- **C-G3-01**：G decrypt 仅将 `CryptoError::SecretUnreadable` 恢复为原 BadRequest 400/message；其他 CryptoError 和 encrypt 的 500 分类保留。独立新 run 用原真实授权与绑定建立正常配置，再通过 Root 的精确 owned row/column/hash fault ledger 注入两列不可读密文。写前 durable 登记，finally 只恢复原 cipher 列并验证原字节/hash/解密，保留搜索实际提交的 lastError/version/updater。每端 5 次真实 setup 和 4 次失败出口均严格通过：login JSON400、admin JSON400、admin HTML302 failed redirect、search JSON400；callback 无领域/audit/ticket 写入，search 原通用摘要先提交且无 searched audit。未通过全局吞解密异常或提前 alias 绕过验证；只有精确登记的坏密文输出 unreadableVerified，其余仍强制 decryptVerified。
- **C-G3-02**：首个 DELETE 前，在原事务内锁定原 107 张表，核对原 28 条完整 incoming FK 的 schema/复合列/目标/action/flags，并对 GH＋base 全部 ID 做全表逻辑外引闭包扫描；实际 owned session/credential/assignment/audit/security 行的 UUID 继续纳入后继扫描。GH 只按已登记 ID 和精确 identity 判断；原 base rowOwned、子树约束和清理规则保留。两库各执行 unregistered target_id 与 JSON 内大写无连字符 UUID 两个反例，均以 0 DML/DELETE 拒绝；按独立 ledger 移除唯一测试行后正常清理及第二轮零残留。未知/复合 FK 等形状另有纯反例，不运行产品 DDL。
- **C-G3-03**：共享 request_url 在发送前按原锁定 axios Node platform 的协议 allowlist 分类；ftp/ws 等不支持协议保留 `ERR_BAD_REQUEST` 与 `Unsupported protocol <scheme>:`。最终 transport04 为 20/20，新增 ftp/ws 与原 axios 实际对照，未观察到 owned HTTP/proxy 请求；该有限矩阵不额外认证 file/data 的特殊处理或真实供应商账号。
- **C-G3-04**：时间投影改为原 server-owned DTO/列/审计字段的显式路径 allowlist，任意业务字符串、requestSnapshot 和供应商 raw snapshot 中的 ISO 文本保持字面比较。state 的签名 payload exp 与 DTO expiry 必须相等，10 分钟 state / 2 分钟新 ticket 的 TTL 必须落在实际请求发送/返回时刻的严格区间内，逐端原时间回执保留。新的完整 G/H 对照在此规则下双端通过。

集中修后为 candidate05：Rust 162 Pass / 54 ignored、clippy `-D warnings`、release / probe build 通过；受影响工具 23 项纯检查通过。fixfull01 每端仍为 128 个 captured-case HTTP、3 组竞争；fixbad01 每端另 9 个请求，合计 **137 个 captured-case 响应/端**，setup 与业务负例明确分列。Windows/Linux 的 Rust 原页面各 2 条再次通过；原 Nest 页面和基础认证沿用同字节原实现、未改动路径的已通过证据，保留候选时点。

final03 对 72 个 backend/run 生命周期、144 份 journal 全量复核，两轮均为 0/0；fix01 三个 owner 正常停止，source/binary 不变，四端口释放。增量封存与同一次 G3 复核入口为 `docs/design/rust-r2gh-g3-delta02.json`；G4 仍待最终审查、提交集成和归档回写。
