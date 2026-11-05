# E 必要集成修正 04

本增量由 Root 在准备真实 C→E→F 验收时授权。正式 C `PayableRecordStatus` 的付清终态是 `completed`，原 E 来源资格/具名版本比较却使用 `paid`；单看状态和版本也不能证明新增真实付款。本次不回写 G1、delivery01 或 author-checks03。

修改前四个生产文件已逐字节归档至 `source-originals04/*.rs.bin`，指纹见该目录 `manifest.json`。新生产增量仅 `project_actual_cost/mod.rs`；另外三文件保持 delivery01 原字节。所有额外文件均在本 E 工具目录内，无共享文件、迁移、DTO、路由、GitHub、提交或推送。

## 新的私有来源事实

采购来源资格统一使用正式 `recorded / partially-paid / completed / closed`，不接受 `paid` 别名。`source_facts` 的顶层 camelCase 合同保持不变；其中真实 snake_case `sourcePayload` 新增：

```json
{ "confirmed_payment_amount_excluding_tax_total": "20.00" }
```

该值通过同一 borrowed PgConnection 查询，与 C 的净已付总额采用相同谓词：

```sql
SELECT COALESCE(SUM(amount_excluding_tax),0.00)::text
FROM poms.payment_record
WHERE payable_record_id=$1 AND status='confirmed'
```

它只表示已确认付款的未税金额之和，不是含税已付总额、承诺金额或估算值。额外尾零只做精确规范化，实际历史分币拒绝，不舍入。即使只读详情，也先获取 Project→Payable 锁，再读取应付行版本及真实 SUM，防止 READ COMMITTED 混合旧版本和新聚合；调用方已有同序锁时重入。没有另取连接、BEGIN、COMMIT 或自行 flush。

新增捕获要求 status 与实际净已付总额一致：recorded=0；partially-paid 严格处于 0 与未税承诺之间；completed 等于未税承诺；closed 不超过承诺。历史 `source_basis` 没有该捕获键时不能从当前 SUM 倒推原值，明确拒绝未证明的历史，不自动改写旧 basis。

## 具名进度证明

`compare_source_transition` 仍只允许两个既有枚举，仍不放松任何客户端 CAS。`payable-payment-progress-only` 现在同时要求：

- 当前 source rowVersion 严格增加；净已付总额严格增加。
- 状态仅 recorded→partially-paid/completed 或 partially-paid→partially-paid/completed。
- 身份、项目/合同归属、三层承诺金额、币种、业务日期、供应商、说明、依据及其他核心字段保持原值；只容许必要状态、rowVersion、更新时间/更新人与新增净已付聚合变化。

同版本且完全同值仍返回 None；同版本发生聚合变化、只涨版本却没有新增净已付、状态变化但 SUM 无增、倒退、金额/币种/日期/归属改变、假 `paid`、捕获键缺失和 completed→completed 人为涨版本均拒绝。后续 F 可继续用最新认证锚点证明新进度，原 E source_basis 永不改写。费率受控截短证明未改变。

Root 同时负责 C：每次真正确认付款后都 CAS 递增应付 rowVersion 和 updatedAt，即使仍处于 partially-paid；重复付款确认拒绝且不再次递增。F 负责其真实 payable evidence 资格统一 completed，继续在同外层事务保留 sourceVersionTransitions 及严格客户端版本断言。本作者没有编辑 C/F。

## 验证及边界

`author-checks04` 运行真实应用 crate 的 Rust1.99.1 rustfmt、Clippy `--lib -- -D warnings` 和 `project_actual_cost` 纯逻辑测试，精确回执/原始 stdout/stderr/源码前后哈希及数量见 `delivery04.json`。新增回归验证 partial→partial 净总额增长、付清 completed、空涨版本、无版本涨聚合、退额、状态不一致、缺捕获键、历史分币、paid 非法别名以及核心经济变化；不是 DB/HTTP 实跑。

Root 后续必须实际运行真实 C payable→E registered(0.00 捕获)→C 确认付款(20.00)→F confirmed 证据；第二笔仍 partial 增至 50.00 产生新版本；最后付清净100.00/含税106.00，F 后续治理使用最新已认证锚点。公开 HTTP 的 F evidenceProjection 只有摘要/hash，内部证明必须另借只读真实 PG 回执核验，不能从 HTTP hash 猜出。并发、故障回滚、实际数据库/服务/浏览器及独立 G3/G4 仍由 Root 统一执行。
