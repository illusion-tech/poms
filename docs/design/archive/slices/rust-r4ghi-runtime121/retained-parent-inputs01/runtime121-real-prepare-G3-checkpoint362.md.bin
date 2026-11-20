# Runtime121 实际 prepare 纠正检查点 362

真实 prepare-only nonce `1899fb63-42e3-4bd5-94d2-f1fbd8c57d57` 于 2026-11-12 18:06:06 至 19:26:22 UTC 单次运行后退出 1。真实 Native constructor、私有 capability 和 entry 已完成；exit 完成失败校验并关闭为 `closed-failed`。fresh prepared、K 和全 67 项验收均未产生，#118 仍未完成。本检查点不授权重发该 nonce 或重置状态。

## 真实失败与边界

唯一错误为 `Real session expired or too close to deadline`。真实 CSRF、登录、当前会话三个认证请求均返回 200；首个 preparation GET 的 before snapshot 已落盘，但请求尚未发出。没有业务 POST、FI、Tax 正常命令或 Main13 重放。

最后一次当前会话请求于 19:00:01 UTC 完成，idle deadline 为 19:15:01.953；首个 preparation GET 的 before snapshot 于 19:14:54.001 完成，仅余 7.952 秒。现有 guard 仍会执行完整运行校验，再以数据库真实时间核验会话和两秒余量。源码及原件顺序指向发包前 guard；原日志没有实际 stack，SQL observation time 也未保存，因此不能声称精确抛错行或时刻。安全检查拒绝过期或临近过期会话的行为正确。

独立源码模型发现 accessor 隐含运行全检及 checkpoint 重复全检。该前缀模型为 51 次 Native fresh 加 15 次 Tax full scan；已知二进制逻辑读量约 58.49 GB。这是源码计数模型，不能作为实测 IO、阶段耗时或修复后的性能承诺。完整不可变历史证明已有按真实 context 的缓存，并非每次 getter 重跑历史证明。

## 保全与独立读回

失败后 state 为 14666792 B / `e0d9ae5799c2c0adaccd98a0b5463915073089d596b7fe768666b9e6e3276a38`，ownership 为 7456 B / `eb4aa89f5ce253bae776101a66dd06d8cfb5fd4748d69f341dd7059eef5a3989`，sequence 为 39。Root 已私有逐字保留完整 after-state、ownership、partial、intent 和 entry/exit/closed 原件；公开目录 `tools/rust-r4ghi/runtime-recovery121/prepare361-failure-actual01/` 只包含不含凭据和状态值的原始元数据。

与真实 entry 快照 76ad 相比，仅 actors、consumerChecks、owned、sequence、taxContinuation121 五个顶层字段变化。manager 的 cookies 与权限缓存来自真实认证；实际完整 37 项权限与预期相等。ownership 保留原 b76 完整前缀并增加真实 auth_session 记录，不以恢复旧缓存或删除新增行来伪造守恒。独立 34 项关系读回通过仅证明失败事实和保全；13/14、旧 823、旧 26、原 prepared/full67 和 Main13 一次 201 保持，不代表 prepare 验收通过。

## 最小纠正方向与后续验收

采用新的具名技术 G3 纠正输入，区分私有数据读取与真实效果边界校验，在同一 checkpoint 内合并重复完整证明，保留全部源、FD、Facts6、进程、状态及 ownership 谓词。把真实完整权限及会话 SQL 校验放到所有 bulk、capture、request artifact 和 pending journal 工作之后，紧贴发送，并用单调时间验证发送余量。会话 TTL、数据库时间和两秒阈值保持。

冻结及独立设计复核后才能实施。新源必须经独立审查、有限源提升和 e0d9/eb4a 受控 successor handoff；旧 Source361、337 publication、823/1899 失败证据继续保持 as-of。应先测量真实边界耗时和准备预算，再另立新 nonce 的具体 prepare-only G2；不得凭模拟节省量直接重试。

Rust 正式 240、R4 67/95、本批 32 candidate、新增认证 0、业务 G3/G4 false。#121/#118 未收口，#57 与完整 R5 #116 保持 OPEN；#119 历史技术 G4/CLOSED 保留。
