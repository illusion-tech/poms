# #118 性能候选02：精确独立复核

结论：**NOTREADY**。01的F01–F05纠正已在实际覆盖范围验证，但新增缓存/目录资源策略问题F06仍需处理。此结论不宣称实际Native在64MiB限额下已经失败，也不修改01的封签结论。

审查者 `/root/performance118_independent_review01`，`reviewerIsAuthor=false`。精确输入为 `runtime118-performance-candidate02/review-input.json`，217827B/SHA256 `42afdb5f347d4918299d18981eb826ab16aea4a244c0ae1cc3e49a81892b456d`。285模块及4个测试原像逐字核对；相对01为3 MOD/282 SAME。原01及原284执行文件未改。

## 已验证的纠正

独立23项组合案例全部通过，包括：

- 原同步/异步主失败在观测RSS故障下保持；schema2未知区间为null，child未知使相应parent self未知，不能以0冒充。
- 完整285模块Native close控制流的8个变体：正常返回、主失败facts、RSS失败与成功/失败组合、诊断clock缺失、原强clock失败、profile wx冲突及复合失败。主facts保持，close只调用一次；原强clock失败时proof调用0，未被safe诊断放宽。
- 原16B文件追加128KiB的收集/封口/未缓存Buffer三个反例，在02均只读取17B且溢出复制0；0字节、声明size不符、较小配置的file/buffer cap和2MiB文件中途增长检查通过。没有为验证默认512MiB门限而制造大规模数据；其对全部真实私有原件的适用性仍未知。
- typed/names两方向的完整context walk与build enumerateSource15组件模型正向通过。
- static名单只由模型真实内部ticket/brand路径取得，普通/伪造Root取不到；R/M静态来源保留，8个显式dynamic路径被排除，当前holder脚本通过freshIdentity实际重新打开FD。该测试不是实际当前holder活性证明。
- wire精确transport代码块在真实模型metrics ALS上下文内，分别使起始/headers/catch诊断时钟出错，成功返回与transport原失败保持，profile不健康；普通mode新增诊断调用0。假HTTP仅用EventEmitter，不开socket。
- 缓存压力4消费者由01的6次读改为02的5次（包含强制SHA封口），不承诺优于原参考4次；snapshot在500/1000事件下filter谓词调用均0，Map查找分别500/1000，二次扫描已消除。

另外独立复跑4份作者测试87项，87过/0 skip。复制件只改导入/URL解析与自有输出路径，不改断言；原4测试hash和适配后hash均记录。它是兼容回归证据，不能代替上述独立反例。

完整模型保留285模块原代码，明确增加review-only最小Root品牌/活性适配与private walk/current-reader出口。Native其余brand检查、ticket、dispatch、close和错误投影代码保持；模型不经过实际constructor，不授真正运行权限，不是完整Linux/私有输入验收。

## 新阻断F06：可驱逐decoded缓存使合法目录冷过暖拒

优先级P2，组件可用性/缓存策略缺陷。02的inventory在`current.rawBytes + current.nameBytes + cacheBytes + newNames`超过cache限额时直接拒绝；没有先逐出可以淘汰的decoded项。相同目录及相同当前输入，会因此前无关scope留下的优化缓存而改变结果。

独立自有I/O实测：缓存32B，3个7B JSON跨scope留下21B decoded计费；同一26B名字目录在fresh controller下通过，在warm controller下报`Combined directory cache byte limit`。当前目录自身26B未超32B限额，移除旧decoded即可容纳。这不是要求放宽quota，也不把逻辑计费当真实RSS。

该反例使用较小配置验证同一算法，未复现实际Native固定14个scope或64MiB私有输入的失败。因此不将其标作已发生的运行预算阻断；但缓存作为优化不应因可淘汰旧项而给兼容量以内的当前输入制造额外拒绝，02尚不能获得更广的代码资格READY。应先按统一策略为目录名字腾挪decoded缓存，若仅非可淘汰的当前scope占额仍不足，再真实拒绝。

必须补正向/反例：cold/warm相同目录等价、decoded LRU逐出不污染已返回只读值、raw+name本身确实超限仍拒绝、目录封口不变、配额不自动提高、资源统计与profile一致。

## 保留关注F07：重复policy记录未去重

优先级P2，非单独的实际Native运行阻断。对同一静态原件调用1000次，独立计数发现999次冻结空policy副本push；maxEntries仍为1，原字节cache计费仍低于64B。此结果证明重复角色记录按调用量增长，不证明真实Native越过某个硬堆上限；实际堆峰值未测。

建议仅归一并去重等价约束，仍保存所有不同/更严格角色的交集。current/freshIdentity的真实FD检查不能因角色已记录而省略。补同约束不同对象/键序、不同约束冲突、role输入不可污染、seal仍执行全部不同约束。

## 静态窗口与范围

02按限定设计把源码/编译/helper/execution名单由真实brand.facts生成，未知和dynamic优先，current binary的singleLink:false和holder freshIdentity保留现时检查，目录metadata仍fresh。原强预算clock、14 checkpoint、6份双139快照、full37及最终Native复核未在此纠正中删去。静态窗口不能冒称旧逐调用时间点等价或连续性；原件末尾全SHA/目录封口仍必要。

实际constructor、新图安装准入、Linux文件身份、全部私有历史、sample/report/complete真实写失败、真实SQL/full37/Auth、整体baseCP/close/工程预算仍UNKNOWN。Root提供的Windows真实R文件组件计时另有原件，本报告没有将其换算或签成113秒CP/630秒close的真实收益。

本轮实际SQL/HTTP/Auth/新快照/探针/WSL启动均0，不改02/01/原执行/P/I，不发GitHub消息、不提交或push。所有精确命令、原始stdout/stderr、模型适配和结果由本目录review02.json索引。驱动exit0只表示指定断言/反例成功完成，不能被解释为02整体READY。

允许作者在独立03中仅修复LRU腾挪及必要角色去重，之后提供新的实际输入重新复核；本报告不预签03，也不授安装或下一探针。
