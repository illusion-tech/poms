# C/B 限定独立静态复核 01

仅检查 Root 的 C `receipt_basis.rs` 与 B `currency_code` 激活补充。评审者不是这些变更作者；未检查本人 I/D/support06，不授予联合 G3。当前输入原字节和 SHA256 见 `review01.json` 与 `source-bytes/`。

两项已确证 P1 均已由 Root 修复并复查当前源码：`split_gross` 调用显式 `i128::from(rate)`；commercial fallback 查询实际 `baseline_status` 并接受 `effective|superseded`。发现时原字节未留存，不伪造修复前哈希。

尚有一项 P2 运行证据缺口：`receipt_basis.rs:120` 成功 INSERT 新 `receipt_accounting_basis` 后没有调用 `session.state.trace.inserted("receipt_accounting_basis", &basis_id.to_string())`。现有数据库 audit 含真实 basis ID，且保持同事务；问题是 HTTP 成功提交回执不含该新增 immutable PK，妨碍新增行归属与精确清理证据。应紧接 INSERT 登记；幂等重试仍不登记新增行。

未再发现可证实的 C/B 税额、币种来源、来源引用、幂等、CAS 或必要审计/授权同事务业务 P1/P2。核实了真实同合同 term、真实商业币种来源、附件证据精确关联和分类 guard；精确分单位 HALF_UP 与 gross=net+tax；B 初次/变更激活从已校验 preparation 绑定币种。

本次没有运行 build、PG、HTTP、故障注入、Git 或服务。Root 报告的联合 cargo check 只作外部进度信息，不冒充本次独立执行。实际 SQL、事务故障与并发等由 Root 随后验证；详细限定检查及必验场景见 JSON。
