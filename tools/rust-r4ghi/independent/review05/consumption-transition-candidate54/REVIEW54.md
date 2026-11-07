# 真实非空重述的引用迁移缺口

Root 的真实 live40 运行已完成21个必要写族的 primary1/fallback0/完整回滚，但下一族在预期 FI 前返回409 `operating_classification_evidence_changed`。本轮属于 partial，不能把21项与新实现的后续成功拼成全覆盖。原10数据、请求、失败、二进制和源码封包保留；新实现需要显式源期准入后全102项重跑。

实际旧 decision 原件证明：L1 exclude 的 input.target/sourceRef 同为2；C2 include 的 input.target/self evidence为2、最终 sourceRef/source_row_version为3；两项 allocation include 的 input.target/self evidence为1、最终 sourceRef为2。G 的合法首次消费只修改记录状态、消费标记、消费人/时间和版本，原 input 原样封存。旧 rebind_reference 只匹配 producer transition.before_refs 的最终版本，所以合法的消费前 self 引用无法迁移。actual-original-bridge-proof54.json 已只读验证四份真实 seal/final captured payload，并且只逆转消费字段即可还原既存 input.target hash；没有生成可用于请求的新 ExpectedRef。

另有两个独立缺口：完整 F batch transition 原先没有 old/new SharedCostAllocationSourceSnapshot 引用；旧 supporting/evidence slot 在 F 改 is_current/换成本ID后无法沿真实批次迁移。其 evidenceId 返回值是被锚定 result 的 proof，旧代码当成 basis proof，并将所有项目 result proof 自动追加到每个项目 decision。P2 的真实 Catalog 只含本项目 result proof、共享 basis 和父成本相关证据，因而全局追加的 P1 result proof 会再触发严格证据检查。

候选54只有三份 Rust 源码变更（精确 SHA/完整候选/patch 见 manifest54.json）：

- 消费桥只处理与所指来源当前 decision 的 sealed input.target **完整一致**的引用。检查 producer1、seal hash、最终 sourceRef 与真实 before-row 完整相等、正确 include 角色、版本恰好+1；再将唯一登记的消费字段逆构，确认原 hash。金额、币种、业务来源、阶段和日期均不刷新。不能证明的引用继续按严格规则拒绝。identity/exclude 无消费时必须与封存 final ref 完全相同。
- primaryCostRef 从原 sealed input 继承，避免原 after.find(oldId) 把它错误刷新成已 replaced 的旧行。所有主/支持/证据引用只通过上述消费桥和精确真实 producer transition 迁移。
- F 为完整旧/new source slots 记录中央 SSOT 的原 identity（cost-id/version 加包含 basis 的完整 factual hash）。旧 slots 必须完整命中 sealed locked refs；新 slots 来自真实 F 插入行。槽位映射必须证明旧 basis→新 basis、旧 slot、真实 cost successor/保留成本及新 basis 的唯一新 slot；不按相同金额/日期/唯一候选猜测。
- basis proof 从实际新 basis.governance_evidence_id 读取；global transition 保留全部 result proof。只有自动追加部分限制为当前项目实际 after Catalog 的 exact member；既有/显式引用不删除，仍受原 members 校验。跨项目完整 proof 保留在 batch transition/causality中，未放宽 project/sensitive/physical transaction 校验。

已有八个应用回归覆盖成本/份额消费桥、合法 seal 但伪造 pre hash、版本跳跃/币种改变、无关旧引用不刷新、多源成本替换+未变成本的新批次槽位、异 basis/未登记新槽位拒绝，以及仅本项目自动 proof 追加。三文件 rustfmt 解析通过；作者没有执行完整应用 cargo/Clippy 或真实新 FI，Root 需在非作者审查后完成这些检查。

没有修改 Root 产品、旧 decision/旧 snapshot、数据库、公共/internal JSON schema、S6 input、策略 hash 或11条规则阈值。本目录是作者候选与实际旧原件的只读诊断，不能用作新实现的独立 G3/G4 证书。
