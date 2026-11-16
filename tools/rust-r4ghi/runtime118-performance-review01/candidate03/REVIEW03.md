# #118 性能候选03：限定隔离代码范围独立结论

结论：**READY_LIMITED_ISOLATED_CORRECTIVE_CODE**。精确03输入的F01–F07隔离代码纠正，在本报告实际覆盖范围内通过，未发现新增阻断。该结论可作为准备后续具体输入与准入审查的代码证据，**不授安装、源码图迁移、系统启动、恢复或新探针**，不签完整工具/预算/业务G3/G4。

审查者 `/root/performance118_independent_review01`，`reviewerIsAuthor=false`。实际输入为 `runtime118-performance-candidate03/review-input.json`，217471B/SHA256 `1d803d4d2cbeb6ffb02b2b69a8a4107a82a8776d45dd34ddce7f7c1fe53307f7`。285模块和5个测试原像均核hash；相对02只1 MOD/284 SAME，即内部观测模块。Native/wire按02原字节继承。01/02的NOTREADY原结论及原284执行文件不变。

## F06：缓存腾挪实际通过

独立原例在03正向通过：32B缓存、3个7B JSON跨scope留下21B decoded，再读取26B目录名，warm和cold结果一致；已返回的冻结JSON值不受逐出影响。

原字节缓存也实际腾挪：31B原件与26B目录名在32B缓存中可完成，同scope再次请求被逐出的原件会重新完整读验，含末尾SHA共3次内容读取；逐出前已返回Buffer仍正确。被逐出后改写原件，再读时拒绝；被逐出后将路径移走且不再请求，末尾seal仍拒绝，证明依赖/身份/摘要没有随Buffer一起丢失。

真实不可腾挪的名字节仍硬限制：单目录17B名字在16B限额拒绝，两个20B名字目录在32B总限额下拒绝。没有通过提高quota或删除目录清单取得正向。代码采用单调rawOrder/index，每个已保留entry最多被队列考察一次，不每次扫描全部file记录。

## F07：角色去重与约束覆盖实际通过

同一静态原件1000次相同角色仅保留1份规范记录；增加uid/ino约束后共2份，反向键序及BigInt/string等价值不额外增加。5次相同current/freshIdentity请求仍真实打开5次FD，没有用已记录角色替代现时检查。

独立枚举6个实际已检查身份字段的64种子集及singleLink两种取值，共128种不同有效约束，均保留；以相反键序/等价值再次请求后仍为128。新错误ino仍立即拒绝，nlink2只在permissive角色通过，不能遮蔽后续single-link角色拒绝。末尾仍检查所有不同约束。

这证明等价记录去重和不同约束保留，不声称真实堆峰值或全部私有输入资源预算已经认证。原字节/解析/名字节计费限额与512MiB单文件/64MiB返Buffer仍为代码合同；实际私有全集适用性另验。

## F01–F05回归无退回

复跑23项独立组合模型全部通过：

- 同步/异步主失败、成功facts、RSS/clock缺失、schema2健康/UNKNOWN传播保持。
- 完整285模块Native close模型8变体仍保留主facts/成功result，profile wx冲突不覆盖已有文件或主结果；close一次消耗、第二次拒绝。原strong-clock故障时proof调用0，未被诊断safe helper放宽。
- 原16B文件追加128KiB，在收集/封口/未缓存返Buffer三个路径均最多读取17B、溢出复制0；0字节、2MiB中途增长、声明size与file/buffer cap均按边界处理。
- 目录typed/names双向完整walk/enumerateSource15模型正向，static名单来自内部ticket/brand路径；普通/伪造Root取不到，8个dynamic角色排除，当前holder脚本现时FD仍执行。
- wire精确transport代码块在真实模型ALS context中，起始/headers/catch诊断clock故障不会丢成功响应或transport原失败，profile不健康；普通mode新增诊断调用0。假HTTP没有socket。
- 缓存压力4内容消费者仍为5次读（含强制seal）；500/1000事件snapshot无filter谓词扫描，Map查找分别500/1000。

新增8项缓存/角色组合与上述23项合计31项独立案例全部通过。另将5份作者测试仅适配导入/URL解析和自有输出路径，92项复跑全过、0 skip；原测试与适配后hash均记录，没有修改断言。

## 模型与输入限定

使用完整285模块自有模型，明确追加最小Root品牌/活性适配以及private walk/current-reader测试出口；其余Native检查、ticket/dispatch/close/错误投影保持。它不经过真实constructor，不是实际Linux/当前holder或数据库准入。模型manifest沿用02版harness模板kind名，真正被审身份由本次03输入SHA、285模块SHA及03模型路径固定，不以模板标签代替输入身份。

静态metadata新窗口只证明开始/结束的固定物料快照，不与旧逐调用时间点完全等价，不主张连续捕获已消失的瞬态变化。当前角色、未知角色、driver.lock/state/ownership/proc/socket及系统角色的相应原检查与动态排除不能据此放宽。

实际constructor、新图安装准入、Linux/跨文件系统身份语义、全部私有历史与实际512MiB/64MiB容量、四阶段真实写出、SQL/full37/Auth、完整baseCP/close/整体预算仍UNKNOWN。Root的Windows真实R文件组件时延另有原件，本报告不把它换算成真实113秒CP/630秒close的收益或工程目标通过。

## 边界与后续

本轮没有修改03、02、01、原284、P或I；没有pnpm、Debian启动、SQL/HTTP/Auth/新快照/探针，没有GitHub写入或commit/push。命令、源码/引擎身份、原始stdout/stderr、模型与结果由review03.json索引；复制件与原件身份区分。

下游只能依赖此精确03隔离纠正代码范围结论。后续仍需实际现存输入、完整源图/版本迁移合同、非作者对应准入及具体批准；旧Root9、旧nonce、旧Y entry不可复用。#118/#57及原预算STOPPED_PRESERVE不因本件关闭或改签。
