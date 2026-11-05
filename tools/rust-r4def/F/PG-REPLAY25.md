# F25 真实 PostgreSQL 回放计划

状态：**未执行，待 Root 统一实际验收**。使用真实 C / E / F 生产入口、真实会话和 Root 已批准的验收环境；所有 ID 来自生产者响应，不直接插造成本、来源或 evidence。每次保留请求、响应、服务版本、源行与不可变证据原字节 / hash；以下 SQL 是只读核验模板，变量必须绑定为实际 UUID。

## 合同大金额尾分与最小阶段依据

通过 C 正常合同准备 / 生效链产生真实 contract-term-snapshot，使用可用的两位上限附近金额，例如未税 `9433962264150943.37`、含税 `9999999999999999.97`、税率 `0.0600`。若其他合同业务约束要求调整，保留一个超出浮点精确分币能力的合法末尾非零分币见证，不降低为小整数测试。

```sql
SELECT id, contract_id, row_version, version, snapshot_status,
       amount_tax_exclusive::text, amount_tax_inclusive::text,
       tax_rate::text, down_payment_rate::text, retention_rate::text,
       effective_at::text, source_preparation_id
FROM poms.contract_term_snapshot
WHERE id = $1;
```

通过 E 正常创建 / 确认同项目费用并映射 registered 成本；其业务日与真实合同 effective_at 的 Hong Kong business date 对齐。F 使用实际 snapshot ID / rowVersion 和日期作为 contracting 来源依据确认阶段，持有该操作要求的真实权限。

```sql
SELECT id, target_id, payload_hash,
       frozen_payload #> '{evidence,source}' AS selected_contract_fact,
       frozen_payload #> '{evidence,reference}' AS actual_reference,
       frozen_payload #> '{costAfter,row_version}' AS confirmed_cost_version
FROM poms.cost_governance_evidence
WHERE id = $1;
```

必须同时核对：原 snapshot 两金额仍精确等于输入字符串；新 evidence source 的 ID / contract / project / 两版本 / status / 时间及 preparation ID、currency / rowVersion 与真实行一致；source 中没有 amount_tax_exclusive、amount_tax_inclusive、tax_rate、down_payment_rate、retention_rate、receivable_plan_seeds。加载实际 PG frozen_payload 为 serde_json::Value，调用产品 `contract_support::canonical_hash` 重放并比较 payload_hash；禁止用 `jsonb::text` 的空白格式直接替代产品 canonical hash。将 evidence 通过 JSON 序列化 / 再解析后再算 hash，应相同。已有旧 evidence 保持不可变，不事后覆盖。

## 真成本大金额与分摊尾分

另通过 E 真实费用入口产生 gross `9999999999999999.99`、net `9999999999999999.97`、tax `0.02` 的真实 confirmed expense，正常映射及具证阶段确认。每层 PG `::text`、E 记录、真实 source_facts 和 F evidence 中都应是相同字符串 / null，不能出现 JSON number。真实净税总和满足 gross，不从其他金额层猜补。

F 在两个真实项目之间按 1:1 权重、gross 计量层确认分摊；按项目 UUID 字节序较小者应 net `4999999999999999.99`、tax `0.01`、gross `5000000000000000.00`，另一项目分别 `4999999999999999.98`、`0.01`、`4999999999999999.99`。逐项文本及精确 PG numeric SUM 核对三层守恒、gross_i=net_i+tax_i；再做完整批次替代，旧批 source / results / evidence 仍可追溯。分别重放 basis 和每个结果的不可变 payload hash；HTTP 受控投影不能当内部原始 payload 的替代证据。

## 真付款进度与审计读矩阵

真实 C 应付净100.00 / 税6.00 / gross106.00 → E registered 捕获净已付0.00 → C 真实确认净20.00 → F 具证确认，保存 captured1 / previous1 / current2 和净已付20.00。第二笔真确认净30.00，状态仍 partially-paid，C aggregate 版本仍须递增；F 后续合法治理命令重验最新锚点并写 2→3 / 总额50.00。最后净50.00 真付清进入 completed，再写 3→4 / 总额100.00，原 captured1 和 E basis 不变。实际版本号可能含其他真实变更，以真实回执为准。

反例须分别覆盖 source 版本空涨但未确认新付款、聚合增而 source 版本不增、承诺金额 / 币种 / 归属改变、缺原 capture aggregate；返回受控冲突且业务 / evidence / audit / security-event 整体回滚。反例通过 Root 已授权故障注入路径执行，不把人工 SQL 造付款当真实正链。

F 写入的 audit before / after / reason / metadata 应保持服务端安全引用、固定 reason 和 safeAuditSummary=true；无 raw source、金额、率、自由说明。真实 audit-read 权限矩阵应能读此安全摘要，而不能据标记拿到 immutable full evidence。LABOR / mixed 相关 F 正常读写仍遵循 operating+labor 双敏感权限，审计标记不改变任何治理读投影。
