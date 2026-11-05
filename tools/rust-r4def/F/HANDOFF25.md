# F 集成修正 25

Root 的独立 preflight22 发现合同阶段依据通过整行 `to_jsonb(t)` 把 numeric 金额 / 率解码为浮点、Payable 终态仍写作 `paid`，并要求安全审计摘要增加显式标记。本增量属于 `new-real-drift` 正确性修复，使用已授权 F 边界；未修改共享文件、迁移、DTO、路由或既有冻结输入。

旧六个 Rust 源已先按 `delivery01.json` 核对原字节并归档到 `source-originals25/*.rs.bin`。该目录 manifest 还固定旧 delivery01、HANDOFF、交付脚本、检查脚本及 author03 receipt 的原字节指纹；旧交付和旧运行日志保持原件。新清单是 `delivery25.json`，旧 HANDOFF.md 只描述旧版。

## 生产差异

- 仅 `evidence.rs` / `service.rs` 变化，另四个生产文件与 delivery01 相同。
- 合同条款快照只选择 id、contract_id、project_id、snapshot_status、version、row_version、effective_at、source_preparation_id，以及同合同 preparation 的 currency / row_version 引用。金额、率、付款 seeds 不进入本阶段依据，因此不经过 serde_json 的浮点路径。币种证明和阶段事实在一次同连接查询中取得；原 snapshot 的行锁、同项目和客户端版本检查保留。
- Payable 依据资格使用正式 `recorded / partially-paid / completed / closed`；生产逻辑不接受 `paid` 别名。纯测试中的 `paid` 是明确拒绝的负例。
- F 继续调用真实 E `source_facts` / `compare_source_transition` / `lock_source_families`。本次编译的 E04 mod.rs SHA256 为 `aaaa5126be86c421255d699bcad582131943d7f500754f0db8e55ddfc437a407`，顶层 camelCase 合同不变。真实 `sourcePayload.confirmed_payment_amount_excluding_tax_total` 是 C 同口径的 confirmed payment 未税 SUM，保存为两位十进制字符串。
- 付款版本证明须真实净已付总额和版本均增加，允许 partial→partial；只改版本 / 时间、无版本涨聚合、缺原始捕获键、状态不符均拒绝。F 原 E basis、客户端 cost/source CAS 和每次最新已认证锚点比较保持不变；新不可变 evidence 原样保留该精确总额和每步 proof。
- 通用 audit metadata 新增 server-owned `safeAuditSummary: true`。before 仍只有身份、状态、版本、evidence 引用白名单，after 仍为服务端引用，reason 固定，metadata 仅项目 IDs / LABOR 布尔 / schema version / evidence ID / 安全标记；完整来源、金额、自由说明只存不可变证据表。

## numeric 分支复核

本项是源代码 / 冻结表结构核对，未声称运行 PostgreSQL。

| F 读取分支                                                                         | 金额 / 率路径                                                              | 结论                         |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| contract-term-snapshot                                                             | 改为必要列白名单，不选金额、率、seeds                                      | 本次修复                     |
| payment / payable / expense 引用                                                   | 三层金额在 PG JSON 解码前全部 `::text` 覆盖                                | 保持精确文本                 |
| invoice 引用                                                                       | invoice_amount 在解码前 `::text` 覆盖                                      | 保持精确文本                 |
| store Cost / Basis / Result / Tax / Source                                         | 所有冻结 numeric 金额、率、数量、权重、ratio 列均在解码前 `::text` 覆盖    | 保持精确文本                 |
| Stage / governance evidence / handover / acceptance / attachment / attachment_link | 表本身无业务小数金额列；小整数精确，证据 JSON 的金融值由受控生产者使用文本 | 无新增同类整行 monetary 漏口 |
| E 真实 sourcePayload                                                               | E 生产 helper 负责精确十进制字符串，F `layers` 拒绝 JSON number            | 不制造 F 来源替身            |

没有改 Cargo feature、全局 arbitrary_precision 或其他依赖。旧数据库事实不自动改写；如 Root 已产生含旧版合同整行金融字段的 evidence，应单独保留并核对原来源，不能仅凭自洽 hash 认定原始金额精确。

## 本次检查

实际运行 `run-author-checks01.ps1 -RunId author-checks25 -Clippy`，在 F 独立 WSL target、Rust1.99.1 / offline / jobs2 下编译真实应用 crate 和真实 E04 模块：24 项 F 纯测试通过，0 failed / ignored；rustfmt 通过，Clippy `-D warnings` 通过、零警告，输入前后哈希不变。原 stdout 与 receipt 保存在新 author-checks25，不覆盖旧证据。

新增 / 扩展回归覆盖 0→20→50→100 净已付、recorded→partial→partial→completed、每步 captured / previous / current version、拒绝版本空涨 / 无版本聚合变更 / paid / 缺 capture，以及大金额尾分的精确文本解析、不可变 hash 序列化回放和 number 类型拒绝。审计回归核对标记及固定 metadata 白名单，确保不携带 raw/freeform。

真实数据库大金额、C→E→F、审计读权限矩阵及 hash 回放计划见 `PG-REPLAY25.md`，均待 Root 统一运行。本作者未运行 DB、迁移、HTTP、浏览器、并发或故障注入，未 commit / push，未作独立 G3 / G4 认证；Root-owned lib / support 编译接线仍不属于 F 交付。
