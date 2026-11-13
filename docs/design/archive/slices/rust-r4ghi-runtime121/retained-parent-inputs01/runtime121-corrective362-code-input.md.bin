# Runtime121 纠正 362：有限代码输入

本技术 G3 纠正承接 [实际 prepare1899 失败](runtime121-real-prepare-G3-checkpoint362.md)，业务联合 G1 不变。Root 冻结包为 `tools/rust-r4ghi/runtime-recovery121/corrective362-g3-freeze01/Root-G3-code-input362.json`；原设计与 mandatory addendum02 必须合并使用，独立设计复核 33/33 隔离案例通过。只授 I 内候选实现，不授 Root 源提升、状态 handoff、具体 G2、实际计时或 mode 重试。

## 实施与验证边界

- 热路径三叶：`invocation-proof.mjs`、`tax15-once-wire.mjs`、`tax15-once-effects.mjs`。数据 getter 不再隐含完整运行全检；每 checkpoint 保留 Tax 完整扫描及一次最终 Native/reference 完整校验，standalone open/close/verify/full exit 保持。既有 `guardActor118` 的 sessionId/null 返回和六种模式调用约定不变。
- 控制三叶与两个现有纯数据适配器：Native、Core、publisher 及 Native-plan/Tax-current metadata。新具名 v3 保留 M06 原 9 → Source361 原 4 → 新 6 三个独立阶段；helper229/external55/execution284 成员不变，其余 278 真实逐字核验。
- 最终真实账号、完整 37 权限、cookie、会话和 owned 归属 SQL 位于所有 bulk/capture/request artifact/pending 持久化之后。单调时间从 SQL 前开始，保守扣除全部往返及发送间隔；同步检查剩余时间严格大于两秒后直接发送。TTL、数据库时钟、过期阈值和 ACK-first 保持，不增加跨 await 缓存。
- v3 用真实 e0d9/eb4a CAS，base4c/b76 不改。每 fresh/entry/fullExit 都核完整 eb4a7456 前缀及其 b765560 来源链，允许后继真实 append；保留 823/1899 journals、seq39、真实 cookies/权限、owned、API 及全部其他字段。发布只改 lease/history+1/活动失败 Tax 槽三项。

Root 已在任何生产修改前保全当前六份原像；manifest 为 4952 B / `07e274546d26f98b8ef2e35e43b1c4370cdb09a6adcee7323416d727d743958e`。旧 a226 与新六份原像分别证明不同历史版本，不能以最新同路径文件替代旧 M06 字节。

实现后须独立复核全部六种模式、await 后漂移拒绝、FD/Facts6/同大小改写/ABA、完整权限及过期拒绝、ACK 后失败保全、v1/v2 历史行为、v3 三阶段及 ownership 截断反例。随后分别完成有限源提升、真实 source/readback、v3 handoff/readback、真实边界耗时和准备预算，再形成新 nonce 具体 G2。源码模型的扫描次数和逻辑读量不能代替真实性能或 prepare 验收。

Rust 240、R4 67/95、32 candidate、新增认证 0，业务 G3/G4 false。#57 与完整 R5 #116 保持 OPEN；#119 历史 G4/CLOSED 保留。
