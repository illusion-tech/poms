Source12 的首次 period-close 对未来合同条款有业务截止日防线；基线采用链缺少同等的显式期间筛选。此结论来自固定代码静审，未发 GET/POST，未运行 SQL。

用户第 7 项已由 `docs/design/rust-r4ghi/user-decision-period05.json` 批准“实时维护当前，期末保留期间历史”。旧 period-preparation 工具的 pending7 注释仅为历史标签，不构成待用户阻断。

代码路径如下，全文 SHA 见 `period-semantics67.json`。

| 问题 | Source12 的实际路径 | 结论 |
| --- | --- | --- |
| 是否允许尚未结束的 period | preparation.rs:336-363，按真实香港 today 计算 month/ISO week，`end >= today` 返回 BadRequest | 仅完成期间可用，不能改时钟迁就验收 |
| 首次 period 的两个时间轴 | preparation.rs:270-274/326-332：businessCutoff=真实期末，knowledgeCutoff=当前 now | 晚到结账可在现在封存；不能简单把所有 created_at 晚于期末的记录视作非法 |
| 全新、晚于旧 week 的合同 | context.rs:955-974 跳过晚签合同及只有未来 effective_at 条款的合同；730-751 的 select_term 仅选 effective_at<=businessCutoff 且 known_at(knowledgeCutoff) 的真实条款 | 正常新合同的未来条款不会进入旧 week 金额 |
| 所有合同均不满足截止日 | context.rs:1035-1037 加 effective-contract-required；capture.rs:31-33 在正式写入前返回 operating_formal_evidence_missing | 不能把新项目/新条款的 prep 当成旧期间真实 producer；具体 HTTP 未执行，不能宣称已观察到这个 409 |
| 首次 period 的当前基线 | collector.rs:325-327 传 mode=period-end、period=None；context.rs:822-895 只有 restated+period 才载入原期间基线，首次 period 直接选择 is_current 基线的 frozen draft | 没有对该 draft 的 adopted 原技术成本或 approved successor 按 businessCutoff 取 as-of 版本的显式判断 |
| 基线源推导 | baseline.rs:17-78 的 derive 不接收 window，遍历全部 active/superseded、真实已批准采用的条款；129-204 使用整个 adopted estimate 链 | 审批/金额/职责链真实性不等于期间有效性；未来采用的 estimate/successor 仍可能进入当前基线值 |
| preparation 的 outside 标记 | context.rs:113-130/366-374 标出 estimate effective_at 晚于截止日；preparation.rs:447-464 仅聚合 direct-cost/allocation/supporting/receipt 类 blocker，且忽略 outside-business-cutoff | 该标记不构成 baseline 的拒绝防线，不能用 prep=eligible 推导时间闭包已经成立 |
| 新 period 是否替换 realtime current | service.rs:229-238 在 paired period 时 selected=false；capture.rs:148-158 向 advance_head 传 None | 保留 current 的代码方向符合已批准第 7 决策，未用此次静审代替真实 period 写入/读回 |

精确缺口是**采用的技术成本与变更版本是否在期间业务截止日已有效**，不是新 G 封存行的 created_at/effective_at 本身必须早于期末。后者可能是合法晚到结账的现时记录。已有旧合格合同的项目若当前 baseline 又采用截止日之后的真实 estimate/successor，仅靠合同 select_term 防线不能证明基线仍是该期间口径；需要独立的 as-of baseline 选择/核验，或明确 fail closed。

全新项目、estimate、terms 全晚于旧 week 的场景通常先被 effective-contract-required 挡住；这只能证明该分支的合同屏障，不能推论任意未来基线都已被拒绝。未观察到真实期末 producer、period restatement 或 period/current 竞争证明；不把这条静态路径标成实际 HTTP 通过，也不伪造历史事实验证。
