# #118 Tax14 验收调用验证复用实施基线包

- Gate Status: `Pending`，待独立建议和 Root 正式冻结。
- Parent: #114 / #110；总体 #57。
- Owner: Root 统筹与实际执行；I 实施；H 非作者技术审查；实际业务 G2/G3/G4另审。
- Slice Type: `process-only / refactor-only`；效果边界按高风险审查。
- Tracker: `phase2-development-execution-tracker.md` 的 #118 条目。
- 公开业务操作增量: 0；联合32项、正式Rust240和新增认证0均不变。

## 1. 范围与边界

实测 inspect341 耗时1095.87秒并退出0，状态原字节仍为1fff。窄静态调用图为inspect7次完整252；每次展开8次schema108。原FI为`19+12N+4A`次，不能把该量级或后继提案当实际性能改善。

只实现六个外置验收叶：`run-tax14-once.mjs`、`invocation-proof.mjs`、`retained-tax-proof.mjs`、`tax14-once-effects.mjs`、`tax14-once-wire.mjs`、`tax14-once-ledger.mjs`。完整不可变父域在本次Root调用入口、退出各做一次原252；每次效果仍fresh核当前代码、身份、权限、数据、库存、会话与撤控。

不修改已注册H2218、Reg4/B1、epoch14、任何旧封件、Rust、DTO、业务规则、公开路由或生产数据模型；不patch全局fs/crypto、不用假reader、无跨调用缓存、不把布尔当旧guard证明。当前341 prepare继续原批准范围，本项不干预它。

下游只可依赖实际经独审的外置执行闭包及真实FI/201/消费证据。实施或设计通过不代表已执行、性能收益或业务G3/G4；未证边界不得认领。

## 2. 正式输入与SSOT

| 输入                                   | 唯一来源                                                                                                                                     | 边界                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 联合业务、权限、日期、UUID、金额和状态 | 原32项联合G1、用户272/298及原Rust/共同模型                                                                                                   | 全保；不对齐Node缺陷                |
| 外置提案                               | I `tax14-invocation-proof-G1-proposal02/manifest-G1-PROPOSAL02.json`，SHA `c343f05a0e6b47befbeff5584f703a3505b9b52ed2b197f8bdddffa26736b40e` | 原01保留；02为本次设计输入          |
| 旧执行语义                             | 原A258 runner/provenance/main/sweep、HTTP、ledger及原纯断言，提案14叶raw清单                                                                 | 逐函数/断言映射，不冒称逐字原执行者 |
| 技术准入                               | 339实际独立读回 `b7d90ebc40db53f6da22cdcda6a3dc98d5d168dd5af47509c0e0019ed340f9d0`                                                           | Reg4/B1/初始1fff及历史真实身份保持  |
| 当前341准备包                          | 运行中的原prepare实际完整产物                                                                                                                | 未完成前不得填入假目标、body或库存  |
| Schema/DDL                             | 原M98/139表、原受控FI模板                                                                                                                    | 无迁移；仅已审源派生的临时controls  |
| Public route / DTO / SDK               | N/A：本项不改变公开surface                                                                                                                   | 不生成或修改客户端                  |

## 3. 命令、查询与持久化

外置mode为`fi-closed-set`、`fi-family`精确恢复、`commit-once`、`verify-committed`、`disarm-owned`。没有prepare、Main或无界自动执行入口。Root一次exact G2须固定实际341完整有序族清单、descriptor、body/scope和执行闭包；不能自动增删、skip或裁suffix。每族独立pending/request/control/capture/ledger/rollback，只有结果已persist verified且撤控成功才推进下一批准族；首unknown/错命中/未撤控/语义失败停止。批末完整书挡、FI完成后STOP，201仍另一次exact G2。

私有WeakMap能力仅本pid/boot/nonce/mode有效，入口亲自调用原createContext和真实批准binding loader；不接受外传ctx/registry/proof来mint。受限view仅8个自有方法；不能从原型、descriptor、valueOf泄漏Root。原不变父域深只读，当前cookie/owned/对象/执行状态仅由已审路径维护。

每个HTTP与DDL效果前后：实际source420/H2218/外部闭包逐叶当前字节与精确集合、API PID/start/boot/exe/cwd/真实binary SHA和typed stat、真实DB guard、全部current targets/body/inventory/CAS、actor权限与真实session/cookie期限、控制OID/定义/ACL/owner/命中/撤控，以及原139×2 before/after、ledger、对象/序列、事务/审计/回滚/正常财务语义全部保持。只复用已核不可变comparison baseline/父证明；不缓存当前行、权限或目录catalog。

## 4. 一致性与差分

每个复制函数登记原rawSHA、原函数/行段、允许差分和外置afterSHA；wire的canonical/raw originals/45s/cookie/CSRF/status/pending及ACK→撤控→after→reconcile顺序必须保。assertRecorded除comparison loader外的对象、规范metadata、sequence与ownership循环整段保；reconcileAttempt原函数直接复用。新代码身份与旧A258调度不同，必须独立G3审。

原完成envelope/FI证明业务字段保持。新执行者用独立sidecar绑定真实executionSources；必须由实际H257/270/271后继reader证明完整消费，不能仅依赖宽松reader接受或假定相容。若无法合法绑定，下游阻断并报告最小有限方案，不热改旧原件。

## 5. 验证

必需：40项设计负例落实、原函数逐断言对照、WeakMap/view反射与跨调用拒绝、mode/cursor/完整闭集、权限/session/CAS/全scope、catalog命中与撤控、unknown/201先缓存与禁止重发、实际完成消费者sidecar。仅设计项不算已运行测试。

纯/FS通过及非作者代码审后，Root冻结实际341与exact执行输入，先无领域POST隔离预检，后完整实际FI；正常提交另批。性能仅报告同机同源同范围真实耗时/读取量/重guard次数，不作产品性能认证。

Cargo/UI/SDK/迁移测试N/A：这些冻结产品没有变化；原599/475/236和生成物证据保持原标签，不因本项重复运行或认领新通过。

## 6. 例外、残余与G1

无放宽业务/数据/权限/撤控检查的例外。当前未实施、未运行新代码、未批准FI/正常POST。正式冻结须同时固定最终proposal02、独立G1建议和本基线hash；Root另发明确implementation授权。#118仅为验收工具子片，不能凭它关闭#114/#110/#101/#57。当前prepare和后续实际全批仍各有独立证据及Gate。
