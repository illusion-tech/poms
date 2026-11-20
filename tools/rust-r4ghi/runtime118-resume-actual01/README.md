# #118 有界恢复与单次 budget-probe 原件索引

本包只公开控制元数据、真实独立审件和必要的辅助源码保真副本。`retention-index.json` 分别记录原 Full3 与保留副本 Full3；两者是不同文件，所有运行消费者继续使用原路径。本包不建立 runtime alias，不移动、覆盖或清理原件。

本轮恢复链 C10/R8→B5→S4→Native FS X→Y→不可变 Y 快照已逐项真实独审；当前 Tax8 与具体 Tax34/Root9 后，Root 只执行一次 nonce `a7831b49-b5cf-4943-845b-89289debc4c7` 的预算命令。

实际结果为 `STOPPED_PRESERVE`，外层退出1。Auth3有3次实际响应，记录1个完整 baseCP 样本，耗时113.436174201秒；唯一 Native close 验证通过，耗时629.800944921秒。through-close 的 idle charged remaining=-81965ms，未满足严格大于2000ms的谓词；absolute预算充足不替代idle条件。完整观察通过数0，全67 FI/618成本仍UNKNOWN。

内层 `closed-verified`/exit failed=false 与外层 `close-coverage` 停止同时保留，不改原标签。完整FI、正常Tax、Main和业务收口不在本轮授权内；预算G3阻断、G4不满足，#118/#57保持开放。

私有 P 中的 sample/report/partial、HTTP与SQL原始捕获、Env和凭据原件不复制到公有包。公有计时、计数、哈希和布尔字段只用于约束实际结论，不认证连续数据库状态、跨库原子性、精确旧holder退出时刻或完整FI预算。

保留 C10独审01、Native peer独审01及其精确纠正；Root Tax options首次Full2读取错误及仅一处纠正也保留。它们分别按原工具失败记录，不变成产品失败或预算重试。原holder naturalEOF=false/精确退出时刻UNKNOWN保持；新命令的自然EOF单独实录。

辅助源码的 `.bin` 文件只作数据证据，不增加生产图成员或执行权限。仓库已有 `tools/rust-r4ghi/** -text` 规则保留其原始字节；提交检查须再核Git blob与工作区保留副本哈希。

本范围当前说明见[有界恢复与停止记录](../../../docs/design/rust-r4ghi/runtime118-bounded-resume-2026-11-16.md)。独立实际读回、G3/G4判断及Issue同步以各自真实原件和后续索引为准，不能由本说明自签。
