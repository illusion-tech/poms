# 130c 线性归档日志补充

只新增`Invoke-Archive130c.ps1`、本说明和`manifest130c.json`。原42件支持包与原归档计划保持原字节。本补充未运行归档入口、未访问或修改Root运行态，不重复产品验收。

旧入口在每成功一件后序列化整个completed数组，累计日志写入为O(N²)。130c每次只追加当前单件的压缩JSONL记录，并执行`FileStream.Flush(true)`；9,079件完成后只序列化一次完整origin map、一次不带累计数组的summary。日志序列化和写入量随归档项数线性增长；文件哈希和持久flush仍按原证据要求执行，不宣称端到端性能实测结果。

沿用原130b的9,079件、178,735,821字节、1,432生命周期move及7,647证据copy；不改变来源、目标映射、排除策略、raw bytes或Gate边界。入口硬pin原`archive-plan130b.json` SHA256为`d3ca0043ebaa924cbdf67177febf8f4a02dea8b9e0a858e3f2c88642c5ff5af9`，并在加载共享代码前核原`Common130.ps1`和`policy130.json`哈希。

Root必须提供真实Facts文件及其`-ExpectedFactsSha256`。先校所有source pins、目标不存在、绝对Root范围、重解析点、闭合生命周期集合和实际Ready Gate；第一笔移动/复制前再核Facts，在结束前再核一次。逐件仍复核来源和目标bytes＋SHA256，全部Move/Copy均为native PowerShell及`-LiteralPath`。tmp只复制，生命周期原件才移动。

Copy先写新GUID stage、核stage bytes＋SHA256，再以不带`-Force`的`Move-Item`安装到最终目标；这样不会利用`Copy-Item`默认覆盖既有目标的行为。出现已有目标或任何收据/日志即停止。运行失败时可能保留stage，精确路径写入FailedPartial，不自动回滚或删除证据。

成功输出仍为兼容路径`archive-origin-map130.json`和`archive-journal130.json`，均使用CreateNew，只写一次。新增`archive-progress130c.jsonl`保存每件成功记录，`archive-start130c.json`只表示已开始；异常另写`archive-failed-partial130c.json`。进程或主机突停可能只留下start及完整/截断的JSONL，不能由start或已有行数推定全部完成。失败收据记录在途entry、phase和stage路径；字节已安装但日志尚未持久化的窗口仍明确标记待核。

Root按原授权消费实际Facts；调用形态与旧入口相同，另加必填`-ExpectedFactsSha256`。默认不带`-Apply`只校验；本补充没有调用任何入口。后续增量证据仍用独立不可变封包，不改130b。

本次仅做PowerShell AST、内存JSONL小型验证及旧42件逐项哈希复核，结果见`manifest130c.json`。不涉及产品代码、Root、Git/GitHub或新的产品验收结论。
