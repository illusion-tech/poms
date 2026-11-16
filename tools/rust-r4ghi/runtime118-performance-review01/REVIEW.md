# #118 性能候选01：非作者独立审查

结论：**NOTREADY**。审查者 `/root/performance118_independent_review01`，`reviewerIsAuthor=false`，被审作者 `/root`。精确输入提交为 `72275c80e92fad30bb736af3c5e5ee5a00731739`，285成员候选图及原284执行文件逐字核对；manifest SHA256为 `34d6b8dfeb6cbfaec93c1849b86bd9887b81a978ac98df13f4f1a12942d38173`。

本审查不是实际constructor/Native准入、运行预算或业务G3/G4。没有修改候选01、原执行文件、P或I；没有运行pnpm、启动Debian、执行SQL/HTTP/Auth/新快照/探针。自有驱动exit0表示成功复现已列缺陷，不表示候选通过。

## 阻断F01：观测故障替换主失败或丢失已成功close事实

优先级P1。`observation118.mjs`第23、26、27行在`end()`中调用内存采样；`sync/phase`把`end()`置于同一个body try/catch，故测量收尾抛错会覆盖body原异常，成功body的返回值也会丢失。成功分支的`end()`已pop栈后再次进入失败`end()`，还会抛`Phase stack mismatch`。

独立真实故障注入：仅在自有子进程临时让第2次`process.memoryUsage()`抛固定自有错误，最终恢复原函数。同步与异步body的`OWNED_PRIMARY`均被替换。另一个body已经写入自有closed-shaped文件且返回其facts，观测故障使调用者拿不到返回值。该文件不是实际POMS原件。

完整285模块控制流模型进一步复现：正常close、主close失败保留`budgetCloseFacts`、profile wx写出失败均符合原预期；在计量收尾故障下，原Native `budgetDispatch118 → budgetErrorProjection118 → budgetClose118`丢失close facts或成功result，而close已消耗、第二次close仍拒绝。模型中`profileUnavailable=false/openPhases=0`，也没有明确健康标记显示此次观测损坏。

模型适配必须准确理解：完整285模块来自精确候选；审查副本Native末尾增加具名review-only出口，插入最小自有Root品牌并替换活性读取，proof callee只写自有文件。其余brand检查、ticket、dispatch、close、错误投影与profile sink主体保持原代码。它不经过真实constructor，合成Linux格式metadata pin不是实际文件准入，不能当作真实运行正向验收。

修复要求：观测begin/end/采样/计数/快照故障不得覆盖body原异常、`budgetCloseFacts`或已返回facts；原严格预算时钟失败仍按其原fail-closed合同处理。profile必须明确不健康/UNKNOWN，不能将缺失时间补0。补成功/失败body、各观测故障点、完整Native close模型及profile写出失败的组合回归，并保留一次close语义。

## 阻断F02：分块读取缺少初始尺寸上限

优先级P1。第56–57行只在读取前按初始stat决定`retain`，读循环只检查safe integer；第97行封口循环也没有逐块尺寸上限。输入在FD前置元数据检查后增长时，会一直读取增长内容，收集路径还会按旧retain决定复制，直到最终SHA不符才失败。

实际自有文件初始16B、缓存上限64B，在第一次实际readSync前追加131072B：收集路径读取并复制131088B后才报SHA错误；封口路径总读取131104B后才报SHA错误。没有声称已越过真实RSS硬上限；已证明读取/临时保留没有按初始尺寸及时停止。持续增长还存在不受预期尺寸约束的I/O/时长风险，该持续情形未故意无限运行。

修复要求：已知regular-pin读取按初始size/精确bytes逐块限定，超出时在复制、继续哈希或大Buffer分配前停止；可采用最多1字节EOF哨兵验证，不能继续消费任意增长量。覆盖收集、封口、未缓存Buffer返回三路径，以及0字节、精确边界、声明size不符、读取中增长/缩短。不要将该规则误套到原`/proc`等特殊读取语义。

## 阻断F03：同目录typed/names复用会拒绝正常源码扫描

优先级P1。第84行只按目录路径缓存，并断言后续`withFileTypes`布尔必须与首次相同。真实源码路径会先由`context.walk/sourcePins`使用typed Dirents，再由`build.enumerateSource15`以names枚举同一目录，属于合法调用组合。

独立最小自有目录实测typed→names与names→typed两个方向均抛断言。另建完整285模块模型，context仅额外导出原private walk函数，build函数体不改；严格限定的Linux语法到Windows自有文件桥支持真实文件身份和字节检查。在不启用ambient观察时，完整walk与enumerateSource15组件正向通过；进入模型Native真实ticket/observation后，两种顺序均触发该断言。只有1个有效自有源码文件，未冒充完整420项目或实际Linux准入。

修复要求：统一底层完整目录记录，按调用者请求派生冻结Dirents或独立names数组。验证typed/names两方向、完整sourcePins→两树build链、变更封口、symlink、缓存污染、未知options及目录条目/名字节资源界限。不能跳过其中一个目录完整性检查来使基准通过。

## 性能关注F04：缓存压力会增加读取

优先级P2，真实组件行为，非私有全链性能结论。1036B有效JSON、64B缓存上限、4个消费者：原readPin15精确函数体（明确Windows pin适配）实际4次读取/4144B；候选6次读取/6216B，JSON值相等。无缓存时首次`entryFor`流式哈希后，`read`又完整读验，后续消费者也重读，末尾还封口；小文件warm缓存基准没有覆盖该路径。

需在新候选中测缓存冷/热/压力及大JSON，而不只测37份能全部缓存的小JSON。该负例没有测当前私有历史是否确实耗尽64MiB，也没有推算真实CP或close变慢比例。

## 性能关注F05：profile快照二次复杂度

优先级P2。第30行每个事件都对全部rows执行filter；预算dispatcher每阶段还生成一次snapshot。独立计数实测500事件产生250000次row谓词，1000事件产生1000000次。20000允许事件的理论上界为400000000次，后者未实际运行，不是实测耗时。

建议以Map单遍累计直接子跨度，并对缺失/UNKNOWN时间及丢事件传播健康状态。当前真实探针事件数量和其实际耗时占比仍UNKNOWN，不能把该组件复杂度证据解释成49分钟的实际来源。

## 覆盖、原件与剩余条件

已覆盖精确285模块/原284哈希、7项diff、主失败保留/成功返回/计量故障、分块增长、目录两模式合法组合、完整模块Native close控制流与profile wx冲突、一次close、缓存压力、snapshot实际计数。未发现自有普通controller能自行激活Native ambient缓存的证据；未以此宣称全部能力隔离通过。

首个独立驱动因对AssertionError.message精确字符串匹配过严而exit1，失败源与原始stdout/stderr保留；只将该自有断言改成前缀匹配后再运行，未修改候选。并发metric诊断失败也保留，但当前授权要求串行，未将其列为已证实生产阻断。

命令、实际引擎、源码描述符、原始输出、模型manifest与结果由`review.json`索引。所有复制件与原件路径/身份明确区分，原件保留在本审查自有tmp目录。两个完整模型的所有业务效果均为0。

待后续候选补齐：F01–F03原反例及必要正向；完整source/compile链；sample/close/report/complete四阶段与profile故障组合；真实Linux身份/跨文件系统语义；完整私有历史解析副作用与资源足迹。实际constructor、当前SQL/full37/Auth、真实预算以及工程目标全为UNKNOWN。

候选01保持NOTREADY，不允许据此安装、迁移源码图、启动系统或执行新探针。#118/#57及原预算阻断状态不由本报告改变。作者可在独立候选02中修复；本报告不预签未来02或其实际运行批准。
