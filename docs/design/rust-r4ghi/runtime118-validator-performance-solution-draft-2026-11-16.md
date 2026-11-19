# #118 验收执行器性能改造方案草案

状态：Draft，2026-11-16。关联 [#118](https://github.com/illusion-tech/poms/issues/118)，父项 #114，迁移父项 #57。本文供设计评审，不是已冻结 G1、代码资格或下一次执行批准。本轮交付仅为文档；没有修改执行代码、运行探针或推进 Issue/Gate。

建议先改造执行器的验证组织方式：每个既有检查边界统一采集一次事实，多个断言共享该次事实；历史证明可以复用解析和纯计算结果，但后续边界仍重新核验完整原字节、文件身份及目录清单。先解决重复工作，再依据阶段计时决定是否进一步优化快照和存储布局。

## 1. 问题与目标

依据 [实际停止记录](E:/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/runtime118-bounded-resume-2026-11-16.md)、[停止控制证据](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-resume-actual01/budget-stopped-evidence.json)和[只读分析](E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/runtime118-performance-readonly01/ANALYSIS.md)，原命令耗时2956.244秒，指定 baseCP 为113.436秒，close 为629.801秒，最终 idle 余额为−81.965秒。close 自身验证通过，预算观察因 `close-coverage` 停止。

三次 Auth 外围有13次完整 checkpoint，加上指定 baseCP，至少14次。每次明确可展开的源码/compile/helper读取下界为5711次，大二进制逻辑读取与哈希输入下界为1623254784B；14次累计至少79954次内容读取和约22.726GB二进制哈希输入，尚未计历史重建、close和入口额外工作。这些是静态工作量下界，不是实测磁盘流量或各阶段耗时。

close 内部至少7次 `fresh121` 加一次 `fullPublished121`。三次 Auth 还包含6份双139表快照，至少1668次逐表查询和1668次 JSONL 写入。49分钟不能作为 Rust HTTP 延迟，也没有 Rust/Node 后端对照结论。

本方案解决三个问题：同一检查边界重复读取同一物料、历史证明的递归重建、收尾层层触发完整 freshness。第一版保留14个已识别 checkpoint 边界与6份 Auth 全量快照，不把减少检测频率算作性能收益。

拟定以下工程目标，供 G1 评审选择并冻结；目前均未实测、未达成，也不是既有合同门限：

| 对象                   | 草案工程目标          | 验收口径                                               |
| ---------------------- | --------------------- | ------------------------------------------------------ |
| 指定 baseCP            | ≤10秒                 | 保持完整基础谓词、最终 Native 引用和真实计费边界       |
| 唯一 close             | ≤30秒                 | 包含验证、必要写出及原规定的收尾工作                   |
| Auth3 全阶段           | ≤180秒                | 包含其13个 checkpoint、6份完整快照、归属复核及必要写出 |
| 整个有限 budget-probe  | ≤300秒                | 同时报告构造前段和登录后段，按原命令外层墙钟计时       |
| through-close 会话余量 | idle/absolute 各≥60秒 | 额外工程裕量；原准入谓词仍严格为两者各>2000ms          |

未达到目标时保留实测结果，不事后放宽目标或启动下一次效果。达到本表也只说明该有限探针的工程表现，不证明完整67 FI/618 checkpoint及其他未覆盖成本。

## 2. 基线与不可变条件

设计依据 R HEAD `599cb52b0af60be05dc4b9938becdfec877fcd31`。R为 `E:/projects/worktrees/poms-r3hijk-next28/poms`；I为 `E:/projects/worktrees/poms-r4i-lifecycle/poms`。12个关键源码已与当次探针的284源码闭包逐字核对，详情在[分析事实](E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/runtime118-performance-readonly01/facts.json)。实际实现前需将所依赖分析及源码描述符纳入新基线，不能仅依赖临时目录。

现行 [v2 预算采用基线](E:/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/runtime118-budget-probe-adoption-baseline-v2.md)和 [v3 恢复基线](E:/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/runtime118-reentry-baseline-v3.md)明确要求完整强谓词，且不授缓存跳检。本文不能覆盖这两份基线。涉及验证采样边界、复用依据或证据 schema 的改动归类为 `design-change-required`，须形成具名纠正和新 G1 后才可实施，不能直接宣称是行为不变的重构。

所有候选必须保留：

- 固定执行引擎、实际源码闭包、完整420业务源和528编译输入的原字节与完整目录校验；R/M和公有副本/私有原件的身份不能合并。
- 当前 boot、holder/API进程与启动时刻、UID、cwd、argv、exe/socket、Windows holder、锁、候选/租约和 ownership 原前缀检查。
- 真实 full37 权限、账号状态、owned session/cookie及到期检查；I900/A28800/T60、SQL前单调时钟锚、向上取整扣时和严格>2000ms保持。
- 私有 ticket/WeakMap 资格、一次 Auth3、一次指定 baseCP和一次 close；普通六模式、普通构造器及通用效果入口继续拒绝预算对象。
- 双库各139表的 raw/xmin、目录元数据、sequence、对象及完整归属校验；跨库原子性不作新增保证。
- sample→单次真实close→外层report/complete或partial的因果顺序。旧成功prepare、K、Tax记录、history、失败、UNKNOWN、原件及私有数据保管规则保持。

最后已验 canonical 是 post-probe `15065879B/cddedbd760cb2a2f4e566ad57b69e0bc7b8fdc1fcde9284d027735f42595eaaf`，ownership为 `14912B/8211dee8cf3fc171a577164344f90601a23675df08fb81c230fed158a65aa092`，不是旧Y entry。下一实际动作必须依据届时真实状态重新核验。本文没有读取新的私有运行态，不把旧 boot/PID 认作当前活性。

## 3. 第一阶段：建立完整阶段计时

候选增加内部观测模块，记录构造/准入、Auth3每步、全部隐含checkpoint、源码扫描、历史验证、二进制哈希、Windows holder观测、capture、ledger、persist、baseCP和close。测量旧实现的只读验证组件与候选组件时使用相同计时包装；不为取得基线重新执行旧Auth或旧探针。

每个事件至少包含 `phaseId/parentId/sequence/startNs/endNs/status`；时间差使用本进程 `hrtime.bigint()`。统计实际内容读取次数/字节、SHA输入字节、元数据操作/目录枚举次数、SQL查询次数、JSON解析字节、状态写出字节和观测到的内存峰值。计数应来自实际 I/O 边界，而不是用理论循环次数冒充实测值。内存报告注明采样方法及可能漏掉瞬时峰值。

对HTTP区分连接、首响应、响应体完成和外围捕获/验证，至少提供“发出到响应体完整”的客户端耗时；它不等于Rust内部纯处理时间。SQL区分连接/guard、catalog、逐表查询和数据处理。父子跨度不直接相加，报告总跨度、自耗时及尚未归属的残差。

观测不得引入网络上报、回调或额外权限。仅记录阶段、计数和描述符，不记录cookie、凭据、Env、SQL参数或DB行。原报告闭形不能随意加字段：新profile旁件及其绑定方式须在新G1中冻结schema，不修改旧nonce或已封journal。

计时工作本身仍消耗实际墙钟，预算书挡不能扣除它。失败时尽力写一次私有profile/partial；写出失败不能覆盖主要失败或引发重新close。只读组件基准可以按事前固定次数串行测量，实际效果没有自动重试。

## 4. 第二阶段：统一物料读取，分离纯验证和当前观测

### 4.1 每个检查边界建立独立观测作用域

拟引入内部 `ObservationScope`：由真实预算dispatcher创建，绑定Root、nonce、ticket、operation、candidate/registry、输入和源码图。它通过私有品牌识别，不可由JSON、普通Root、旧ticket、其他进程或其他nonce构造。

作用域只服务该次明确检查，不跨HTTP、await、ctx.persist、ownership变更或独立checkpoint复用。Windows进程观测等同步外部调用也必须有相应前后书挡，不能把“同步函数”当成环境静止的证明。后续边界重新创建作用域并检查真实当前状态。

`currentTaxFiles118/currentTree121/apiIdentity/retained`等断言接收同次收集的已验证事实，而不是相互调用并再次扫描。每个不同的原规范路径与描述符在该次作用域中原则上只读一次内容、计算一次SHA，各调用方继续执行自己的完整谓词。

共享读取必须满足以下规则：

1. 内容从真实原件FD读取，保持路径/realpath、类型、dev/ino、nlink、size、UID/mode等原角色所要求的前后检查及完整SHA验证；不凭mtime/size认定内容相同。
2. 复用键保留精确原路径、尺寸、SHA和角色约束。同一路径不同期望值立即失败；同一物料多个角色的约束必须同时满足。不得将某个ELF的nlink2例外推广到普通证据。
3. R/M、原件/保真副本、不同路径的硬链接分别验证，不能仅按hash或inode消除身份检查。
4. 完整目录枚举只在本次作用域内共享，仍检查新增、删除、symlink和未注册文件；明确目录前后书挡与读集合覆盖，检测到不稳定即停止保留，不内部循环重试。
5. 不能证明可安全共享的时间书挡或可变事实继续独立读取。逐项记录旧检查位置到新采集/谓词位置的映射；任何窗口合并必须在G1明确批准，不能仅因“重复”就删除。

按原420/528/284图计算，已分析的源码集合可按集合并集采集，保守上界为 `2×(420+528)+284=2180` 次内容读取，而非5711次；实际应按冻结后的新图计算，历史/control读取不在该式中。仅对已核实的API、summary、固定Linux Node这组重复读取，同次内容读取可由1623254784B降至最多811627392B；历史链中其他二进制和控制读取另计。两项都是结构目标，不代表总耗时按同比例下降，也不宣称跨checkpoint免读。

### 4.2 历史证明复用解析结果，持续重验原件

完整历史证明在入口建立依赖图：每个纯结论记录它依赖的全部原文件、身份/目录规则、固定输入和值。后续checkpoint仍逐个重新核验该边界所要求的全部原字节、身份、目录及关系；只有依赖全部一致，才能复用已解析JSON/JSONL及不含当前运行态的纯结论。

因此，`currentReentryOwner118`不再通过递归loader反复重建同一历史树；改为验证同次作用域已完成的完整历史依赖，再执行独立当前holder观测。任何依赖变化、缺失、未知读取或无法闭合的动态依赖都停止使用缓存并报错；不把变化当作自动更新缓存的依据，也不静默切回另一次大扫描继续效果。

所有历史读取必须经过显式reader收集依赖。必须审计并覆盖旁路 `fs`、跨模块row reader、目录枚举和条件分支；依赖图不完整就不能启用结论复用。缓存只在当前进程私有内存中存在，按run清退，设置内存上限；不能落盘后成为新批准或新能力。

账号/权限/session、当前进程和socket、锁、canonical状态、ownership、可变对象目录及当前数据库事实不作为历史纯结论缓存。FD书挡不能替代SHA，文件锁、只读权限、mtime和文件监控事件也不能单独证明原件不可变。本版不采用“历史只验一次、其后只看元数据”的快速路径。

### 4.3 close 由外层统一编排

预算内部的 `retainedFixture/retainedMain/currentTuple`使用已验证作用域与完整谓词，不再各自递归进入 `fresh121`。普通公开包装函数仍保持自己的拒绝与校验合同，不向一般消费者暴露省略校验的入口。

目标将close组织为：开始完整观测 → retained/prepare/旧成功记录等完整纯验证 → 封口前完整观测 → 原exitGuard/journal/persist封口顺序与精确读回。前后两次观测不能共用过期当前事实；每次必要persist会结束当前作用域，其后检查实际预期控制增量与持久化结果。

逐项证明原至少7次fresh及fullPublished中的每条谓词在新顺序里有对应位置，并列出保留的中间书挡。无法给出等价覆盖的检查继续保留，因此“两次完整采集”是需独审证明的目标，不能作为先删检查的指令。

失败保持唯一close已消耗的事实。sample已存在但close失败、close成功但coverage不足、closed已封但外层report失败、profile或partial写失败分别保留原标签；不能重写旧closed来补成功，也不能第二次close。

## 5. 第三阶段：处理快照和归属复核的重复工作

第一候选仍保留6份完整双139表快照、原事务边界、逐表查询及原字节产物。重点先减少重复解析：capture得到的行可以保留受约束的内存表示，ledger消费时仍核验所依赖落盘原件的完整SHA/身份；内容未变时共享同次验证的解析结果。基线/observed或before/after的逻辑比较与所有权断言不删除。

`context.persist()`先计数和计时，第一候选不合并ACK、pending、ownership、closed等重要持久化点。只有证明崩溃恢复和失败证据顺序一致，才另提减少全量序列化或引入控制日志的方案；不能把内存dirty标志等同于已持久化。

若阶段计时显示SQL往返仍占主要成本，再单独设计批量取数/连接复用，验证repeatable-read、规范化排序、raw/xmin、完整catalog/sequence/object和双库独立事务语义。不得先改成只查Auth表，也不并行发送实际效果。本轮不把查询数减少计入首个候选承诺。

R的原规范路径和cwd继续保持。迁到Linux文件系统、增设只读镜像、重编译release或重写Rust执行器均不进入首个方案；改变路径会影响源码身份和准入，不能把M静默当作R的等价别名。后续只有实测证明必要时，才单独冻结相应变更。

## 6. 文件改造边界与交付顺序

以下均是未来候选范围，不是本轮已实施改动：

| 顺序 | 交付                      | 主要涉及文件/逻辑                                                              | 可依赖的结果                                  |
| ---- | ------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------- |
| A    | 阶段计时与依赖清单        | `run-tax15-once.mjs`、proof、wire、reader、capture/ledger/persist              | 可归因耗时；所有原判断与效果顺序保留          |
| B    | 同次读取去重              | `invocation-proof.mjs`、`runtime-admission121.mjs`、build/source/helper reader | 完整采集集合与角色约束合并，消除直接重读      |
| C    | 历史纯证明复用与close编排 | `runtime-admission121.mjs`、`retained-tax-proof.mjs`、proof                    | 每边界原字节持续校验，减少递归解析和嵌套fresh |
| D    | snapshot/ledger解析复用   | `snapshot.mjs`、`ledger.mjs`及Tax预算适配                                      | 全量覆盖不变，减少重复解析，控制峰值内存      |
| E    | 精确代码资格与交付        | 完整新源码图、候选manifest和独立验收                                           | 仅证明新工具代码可用，不冒充运行预算通过      |
| F    | 后续真实有限验收          | 届时真实现存状态、明确新输入及Root/peer                                        | 只有新增具体授权后才可执行；旧nonce已用尽     |

顺序为A→B→C，按测量决定D；A至E先做隔离候选，不在原R执行路径覆盖已资格源码，不改I的其他脏文件。可新增专用内部观测/reader模块，但必须加入实际新图；不预填仍是229/55/284，不能沿用旧pins认可新字节。

E以后如需安装或源码/准入迁移，须另有具体输入、实际枚举出的新图、独立资格及精确FS变更方案；旧资格不自动授新代码效果。不得为了使新工具“能跑”而重跑原prepare、Source、API或rebind。没有获准迁移路径时，交付停在可审的隔离候选。

F的任何新状态转换都以届时真实canonical为起点，另取新的批准输入和nonce；不复用旧Y entry，不复用旧Root9，不自动启动已停止的Debian或恢复旧PID。本文不冻结该次恢复/执行流程，也不预签未来原件。

## 7. 验证与完成标准

验证分为三个不同结论：离线代码正确性、固定输入下的工具性能、真实有限预算观察。三者分别记录，不能互相替代。

离线比较使用同机、相同固定Node、同一组预先存在的输入和受控读路径，串行测量旧验证组件与候选组件；不调用旧效果入口。温/冷缓存条件和样本数在测量前固定，不能清理或强制drop宿主缓存；没有受控冷条件时明确标作warm/unknown。测试夹具与原件的路径映射只能用于离线资格，不能作为真实原件身份。

如果实际私有原件当前不可读，不启动Debian补数据；先使用现存可读控制证据和自有夹具完成相应层，完整原件性能继续UNKNOWN。合成数据结果不能认证真实DB守恒、生产延迟或预算通过。

至少覆盖以下故障与拒绝情况：

| 类别           | 关键用例                                                                  | 必须结果                                        |
| -------------- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| 原件内容与身份 | 同大小内容变化、时间戳保留、路径替换、symlink/hardlink、允许nlink角色混用 | 相应边界拒绝，不能命中旧缓存继续效果            |
| 完整闭包       | 新增/删除源码、compile/helper/目录漂移、历史动态分支漏依赖                | 拒绝或禁止启用复用，不能只验已知列表            |
| 资格隔离       | 伪造/序列化scope、跨nonce/Root/ticket、关闭后复用、预算对象走普通入口     | 效果前拒绝，无Root/db/client/callback逃逸       |
| 当前运行态     | boot/PID/startTime/UID/cwd/argv/exe/socket、holder/锁/state/ownership变化 | 实际当前检查拒绝，不使用历史缓存替代            |
| Auth预算       | full37减少、cookie变化、owned session不符、2秒精确边界、SQL/close延迟     | 保守单调计费、严格门限；无额外登录/续期         |
| 全量数据与归属 | 任意非Auth表raw/xmin、catalog、sequence、对象及未知归属变化               | 保持原拒绝，6份双139捕获完整                    |
| 四阶段写出     | sample/close/report/complete失败，及次要profile/partial失败               | 保留首次真实结果，nonce/close不复活，无自动重试 |
| 兼容和资源     | 原六模式、普通拒绝路径、缓存内存上限/释放、计时记录丢失                   | 不扩大权限；缺少关键profile不能宣称性能目标达成 |

代码资格应使用完整候选模块与自有真实I/O夹具，给出成功与负例的谓词对应表、实际读取计数、内存结果及源图哈希；仅词法扫描或mock调用次数不足以通过。跨边界篡改、能力逃逸与写出失败测试属于必要验证，不用大批镜像实现的单元测试凑覆盖率。

本轮文档检查为 `git diff --check` 和缓存Deno执行现有Markdown格式检查。没有运行代码改动，因此应用lint/build、迁移、OpenAPI/客户端生成及业务E2E不要求。未来候选按其实际涉及的工具和合同选择精确检查，任何阶段都不运行pnpm。

## 8. 失败处理与范围

每次试验使用自有新目录，保留候选、失败、原始stdout/stderr和未完成profile。新代码不回写旧报告、旧原件或旧成功状态；试验失败结束当前尝试，不清理、重启或盲重试。离线候选可以停止使用；已发生的运行态/FS变化必须按真实证据另行处理，不能通过还原旧Y或丢弃历史“回滚”。

本草案建议的第一个工程切片是A至C：计时、同边界去重、历史纯证明复用和close编排；D按测量独立决定。冻结前还需确定新源码图、每条旧谓词的对应位置、观测窗口合并证明、缓存资源上限及新profile闭形。作者不得自签独审。本文不预设独审结论，也不签G1/G3/G4。

公共业务路由、DTO、OpenAPI、数据库schema/迁移和业务算法均无改动计划，接口/字段一致性矩阵相应为N/A；私有控制协议/profile schema是本方案必须单独冻结的变更。正式Rust240、R4 67/95、32candidate、业务新增认证0保持原口径。

当前唯一旧探针已消耗，旧停止结论保持。新实际Auth/SQL/HTTP/快照、安装/准入、恢复或第二次探针均不由“起草方案”授权。完整FI、正常Tax、Main、完整业务G3/G4和父项收口不在本文范围；#118与#57保持开放。
