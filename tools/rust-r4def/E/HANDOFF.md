# R4E 成本基础生产实现交付说明

基线 `756d813c9578090fcf8e56821acce01b46b40420`，分支 `codex/poms-r4e-cost-base`。G1准入以 `g1-gate-authority07.json` 的 true/true 和 joint-g1-06 原件为准。本交付是 E11 作者实现及隔离编译、纯逻辑测试，不是独立 G3、真实数据库/HTTP/UI 验收或 G4。

## 交付路径与边界

生产文件只有 `apps/poms-api-rust/src/project_actual_cost/{mod,logic,store,view}.rs`。作者支持文件位于本目录。Root单写的 `src/lib.rs` 模块注册与 `contract_support/mod.rs` 的 `audit_global/GlobalAuditWrite` 用于编译，必须按编译输入指纹保留，不能当作E作者产品修改导入。

11操作沿用冻结operationId、路径和状态码；Root负责HTTP、统一DTO验证、session/CSRF/原权限、Shared/DTO/spec/client及实际环境。E没有新连接、pool、BEGIN/COMMIT或自行flush；execute还拒绝无外层事务调用。所有新成本都registered、not included，由F具证确认写阶段后才confirmed；E不选择纳入口径主体，不认领经营17或整个R4完成。

费用创建/更新/确认/作废、四种正式单据映射、受控费率发布、劳动归集和替代均已实现。金额以字符串与整数精确计算；money18,2、rate15,4、quantity10,2，人工整数乘法后HALF_UP到分，0.00结果拒绝。数据库来源只允许多余尾零的精确去零，非零历史分币拒绝且不round。业务号使用真正borrowed-connection业务号服务，与事实/审计整体回滚。付款时刻按 `compat::business_date_only(Asia/Hong_Kong)` 转业务日；输出时刻归一UTC毫秒。

费用/非labor走operating-finance，labor走labor-cost-rate；费用六条返回路径都投影，强授权者也不能读旧raw兼容键。source、calculation、description、evidence、可反推计算结果均无裸返旁路。字段投影用真实 `auth::projection::plan`，安全事件用同一连接写入；Root必须在成功返回前无条件common flush，包括仅有安全事件的GET。展示文本按UTF16最多2000且非空，projection.value保留完整原值。

## F使用的真实内部API

`source_facts(&mut PgConnection, &cost: Value, lock: bool) -> Result<Value, Error>` 返回当前真实源：`sourceRowVersion,currency,amountExcludingTax,taxCostAmount,amountIncludingTax,occurredOn,sourceStatus,sourceType,sourceId,contractId,payableRecordId,sourcePayload,attachmentRefs,sourceVersionTransition`。金额为规范两位字符串或null，sourcePayload为真实源行snake_case，非HTTP DTO。cost行也是snake_case；immutable basis为 `source_basis.sourceRowVersion/sourcePayload`，`basis_origin=captured`。

多源调用必须先在sorted项目锁内收集完整成本集合，调用 `lock_source_families(connection, &[Value])`；它先发现全部labor rate/person family、统一sort/dedup后取锁，随后才逐个锁源/调用source_facts。不能按cost UUID逐次首次获取不同rate families。单条helper会重入相同family锁；与全局费率发布使用相同前缀/排序，避免不同项目跨批R2/R1反序。F自行完成其他冻结锁序、严格客户端期望cost/source版本CAS和cost→confirmed事务。

`compare_source_transition(cost, prior_source_payload, current_source_payload) -> Result<Option<&'static str>, Error>` 是F最新已认证锚点的经济比较。相同版本且实质同值返回None；任何未分类变化拒绝。只放行两种枚举：

- `payable-payment-progress-only`：固定身份、归属、三层金额、币种、业务日、供应商/依据/附件等不变，只允许recorded→partial/paid，partial→partial/paid或paid→paid进度及必要版本/更新时间/更新人变化。recorded→recorded单纯涨版本明确拒绝，倒退、关闭、作废或边界变化拒绝。
- `rate-superseded-covered-period`：同rateVersionId、rate key/业务version、四位率、单位、人员/角色、币种、生效起点和发布依据不变，active→superseded、current头切换，结束日受控关闭且仍覆盖原劳动完整期间。source_facts另查真正同key/businessVersion+1后继，证明结束日等于min(旧结束日,后继开始日前一天)；retired、值/身份/单位/币种变化拒绝。具名role期间遇任何个人率区间相交仍拒绝，需要拆分替代。

默认sourceVersionTransition从E原captured→current证明，含原/当前版本、原因和两份payload哈希。F确认registered时保存该证明，不改E source_basis；后续治理可取真实最新F证据payload/version作为previousCertified锚点再调pure API证明2→3，保留原captured1、previous2/current3及完整证明。F不能把Some(reason)当作放松客户端CAS，也不能无锚点忽略版本差。

Root实际验收必须覆盖：真实C应付→E注册→C付款确认进度→F确认，以及E旧费率劳动→发布后继→F确认原完整期间；再付进度后以F最新锚点治理；任何金额/日期/身份/退态变化、个人率优先变化仍拒绝。当前只是计划，未冒充实际链跑通。

## Root批准的G2补充约束

- E的LABOR create/replace计算或比较前额外要求 `labor-cost-rate:sensitive:read`，原finance-manage仍由入口校验；单条E劳动只用labor包，不额外要求operating。F聚合/治理含labor按root-projection05双敏感规则。
- 每次E业务audit显式标 `metadata.requiredSensitivePackages`：Expense/非labor为operating、labor/全局费率为labor，before/after混合则两包。真实before/after/reason保留；Root负责runtime_audit读侧保护，不能以finance-manage代敏感读权。
- 发票只读Root/C真实持久化 `currency_code,currency_source,currency_source_snapshot_id`。contract-snapshot依据是同contract的snapshot.source_preparation_id→真实preparation.currency_code，不查询不存在的snapshot.currency_code、不使用项目默认、不猜历史币种。未知币种/证明缺失拒绝映射。
- 劳动附件引用显式UUID去重，锁定active附件、有效版本/校验和、当前项目直接active attachment_link，尊重现有附件机密安全规则，保存真实id/version/checksum/link证据。无附件可合法为0；不造link、不按length伪造依据，不扩散到任意同项目合同附件。替代DTO无attachmentIds，不默默继承旧附件。

这些澄清由Root记录增量供独审，不回写旧G1原件。

## 检查与未跑范围

可复现命令是 `pwsh -File tools/rust-r4def/E/run-checks.ps1 -RunId <全新名字>`。它使用Root确认的WSL Debian Rust1.99.1、公开依赖副本、offline和独立E target、2 jobs；按次保存原始stdout/stderr与前后源码指纹，拒绝覆盖旧run或把检查期间变化的源标为稳定。

最终结果与精确字节指纹见 `delivery01.json` 及对应evidence receipt。测试只运行真实应用crate里的 `project_actual_cost` 纯逻辑组，不启动DB、HTTP、对象存储或浏览器。覆盖精度/容量/税拆分/舍入/历史超精度、个人率部分/单日/多区间覆盖、UTC/HK业务日、状态动作、敏感投影/原值旁路/权限交叉/空值、具名来源变更/CAS和audit包标签。Root统一完成真实迁移/SQL/HTTP/source-producer/F-consumer、故障回滚、并发、UI、Generated契约和独立G3/G4。

历史作者尝试：Windows默认Rust1.99.0离线cache不足；外部reexport harness无法合法访问crate-private clock，已改用Root注册的真实应用crate；首次编译暴露的大json递归/SQLx动态SQL问题和首轮Clippy提示均已修正。旧回执分次保留，不伪造这些尝试为通过。compile目录仅是check-only调试脚手架，生产权威测试以真实应用crate命令为准。
