# #118 性能隔离候选：作者交付记录

状态：待非作者代码资格评审，未安装，真实预算UNKNOWN。本轮实现依据[输入与实际负例纠正](E:/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/runtime118-performance-candidate-G1-2026-11-16.md)，接续[方案草案](E:/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/runtime118-validator-performance-solution-draft-2026-11-16.md)。用户“开始吧”只推进其首片A–C的隔离实现和离线验证。

完整候选在[候选目录](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-candidate01/README.md)，包含原284模块的完整图、7 MOD、277 SAME、1 ADD，实际285成员。原284执行路径与P未改写；没有Source/API/prepare/rebind重跑，没有启动Debian或进行新探针。新图/私有协议的安装准入、非作者代码资格和真实有限验收均分别待办，不沿用旧Root9或旧Y entry。

## 已完成实现与映射

| 原工作/谓词                                         | 候选位置与行为                                                                                                                                     | 边界                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 只记录指定CP/close，隐藏外围成本                    | 内部profile记录pre-entry、dispatch、所有checkpoint、tree/owner/API、历史恢复、Windows holder、DB连接/guard/operation、capture/ledger和HTTP响应跨度 | HTTP计时含原客户端证据回调成本，不是Rust纯处理时间         |
| currentTaxFiles/currentTree/source/build/helper重读 | 同一规范原路径和描述符共享已验物料，各角色单独执行类型/nlink/dev/ino等约束                                                                         | R/M与不同原路径分别验证；新边界重读                        |
| 二进制整Buffer与重复SHA                             | 分块SHA及角色身份检查，共享同次摘要，末尾完整SHA封口                                                                                               | 不承诺本版二进制总读量减半                                 |
| read121/read15/read118和两恢复loader反复JSON解析    | 每边界原字节重验，缓存只读解析值；动态/未知reader继续原路径                                                                                        | 未闭合依赖不缓存跨边界纯结论                               |
| close至少7次fresh                                   | 相同Root/authority及未变state下同scope复用一次成功fresh，结束前强制完整Native fresh；fullPublished仍完整执行                                       | 目标为2次fresh加1次fullPublished，不是删除全部中间身份断言 |
| 账号/full37/session/期限                            | 保持原effects模块及Auth顺序、SQL锚/ceil和严格>2秒                                                                                                  | 未做真实效果验证，不声明权限预算通过                       |
| sample/closed/report因果顺序                        | 原顺序保留；profile独立wx旁件、失败不覆盖原结果                                                                                                    | 真实四阶段故障未认证，需后续完整资格                       |

同scope使用返回结果前执行完整文件SHA和目录重新枚举；persist明确拒绝跨scope。原六mode及其输入/能力拒绝逻辑保留，候选观测作用域必须持有真实Native内部ticket。普通自有测试controller不能激活Native ambient缓存，scope不在port返回或落盘。

## 实际负例、纠正与验证

初版语法补丁错误保留。首次20项自有测试19过、1失败，揭示同大小文件改写在Windows上可绕过仅元数据封口；当前改为完整SHA封口后通过该原负例。scope依赖项最多20000；内容与解析缓存按原字节合计计费64MiB，RSS另作阶段采样，不能把计费上限冒作真实堆峰值。

扩展旧能力套件在原代码上实际37项/28过/9失败，属于 `existing-baseline-drift`：fixture使用旧taxContinuation15、缺apps、预算仍放假G1/单权限。仅本片副本对齐现行合同，其间所有失败输出保留；没有改守卫来迁就测试。最终候选为61项/61过/0 skip，对齐fixture的原代码37项也全部通过。

最终作者验证绑定8个候选变更/新增模块与两测试文件的实际SHA、固定Windows Node引擎身份及原始stdout/stderr。语法检查通过；应用lint/build、migration/OpenAPI/E2E不要求，因为不涉及应用/路由/DTO/DDL且未安装。本片Markdown使用缓存Deno现有检查，不运行pnpm。

profile明确标识只统计已接入reader的I/O；legacy直接I/O、profile自身落盘及外层终态写出的完整细分尚未覆盖。原外层/close计时仍按真实等待时间计费，不能把旁件phase总和当成整个命令总耗时，或把未归属残差算作Rust处理时间。

暂存检查另发现4份SAME源码原像及1份原始console中的既有尾空白/空行。按用户“保留全部原件”要求不格式化原像，候选内`.gitattributes`只对这5个精确路径保留相应空白例外，其余检查保持。Root负责随固定候选保管，无清理动作；不将原像格式例外推广到新代码。

## 组件性能证据

输入为37份真实现存公有JSON；参考直接执行原readPin15函数体，只有为Windows路径设置的明确pin适配，不能当成生产准入。4消费者/边界，每变体预定1次warmup及3次交替串行样本，同机固定Node24.19；OS缓存warm/未受控，未清理缓存。输出值逐批相等。

| 指标（每测量样本）   |              参考 |              候选 |
| -------------------- | ----------------: | ----------------: |
| 内容读取次数         |               148 |                74 |
| 内容读取/SHA输入字节 |           1542404 |            771202 |
| JSON解析字节         |           1542404 | 0（warm解析缓存） |
| 三样本中位时间       |         25.8545ms |         25.7196ms |
| 样本范围             | 25.5656–27.9490ms | 25.0348–26.7894ms |

读取与重复解析减少已实测；耗时区间重叠，不认定稳定显著提速。该结果没有测量真实私有历史、/mnt/e开销、进程观测、SQL/HTTP或完整checkpoint/close。草案CP≤10s、close≤30s、outer≤300s等目标全部仍UNKNOWN。

## 审查与后续边界

代码资格仍需非作者审查完整模块、同scope时间窗口及正向Native路径，并验证真实四阶段输出失败、profile写出失败和Linux身份语义。当前无有效新批准输入且Debian停止，不能为补证启动系统、改canonical或重跑旧nonce。

独立资格前本件只是可审候选，不签完整工具G3/G4或预算G3/G4。下一可做工作是对本候选进行独立离线代码资格及其必要修复；实际安装/源码图迁移/恢复和新探针需具体已存在输入及批准。保持#118/#57开放，Rust240、R4 67/95、32candidate、业务新增认证0；完整FI、正常Tax、Main与完整业务收口不在本片。
