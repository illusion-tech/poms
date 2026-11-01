# Windows 单旅程身份采集、等待和关闭登记候选

本轮仅修改 continuation01 的五个文件：两个 process.ps1、acceptance-ui-browser.mjs、windows-ui-driver.mjs 和 windows-ui-runtime.mjs；新增 transport、close-facts、纯测试及本说明。候选保存在 newtmp，原 Windows 107 源和 M3 Source10 的 46 源保持原字节。每次实际运行仍只能选择一个 UI1/UI2/UI3/UI4 旅程。本说明不认证 Windows 实际通过或产品性能。

原 wn1c02a 的公开安全时间线记录了 47 次 fresh 整树 Inspect、13 个完成 HTTP 证书和最后一次完整 GET csrf 200。双系统时钟没有校准，不能将这些时间解释为产品耗时。原 outer failure 是 owned-command deadline exceeded；Root 后续 stop 的 alreadyAbsent 不能证明 worker 自然退出。Root 已完成旧 run 的 61→0、PG restore 和全107原行集恢复；原 partial、断言失败和自动 deadline stop 证据保留。

## 每次调用的 fresh CIM

Inspect/Discover/Stop 的每个 PowerShell 进程在读取和验证模式、平台、nonce 及输入后，才创建一次 fresh Win32_Process inventory。SelfTest 和函数定义阶段不创建真实 inventory。Stop 在取得停止权限前再创建第二次 fresh inventory；每次进程最多两次，没有跨回调缓存。

全 host inventory 只在当前调用的内存中建立 by-PID/by-parent 索引。输出仍只有经本 run 固定 Node、argv、nonce、出生时间、父链和 executable hash 核验的 root/members，原输出结构不变。无关 host 的 command line 不记录、不输出。

Read-ProcessIdentity 每次仍调用 Get-Process 读取实际 Process 实例、StartTime 和 Path 并 Dispose。树遍历仍使用原 Same-Identity、May-EnumerateParent、May-QueueChild、深度16和128成员上限。出生上界取本次 inventory 开始前的 UTC ticks；枚举后才出生或复用的 PID 不能继承旧 parent 关系。重复 inventory PID、活进程缺少 inventory 记录、root 换身均拒绝。原 Assert-Root、固定 Node hash/argv、完整 Kill/WaitForExit 和历史成员收口代码逐字保持。

两个 SelfTest 只在该分支内用 Fake CIM/Get-Process 调用真实 inventory/tree 函数。保留原17项，新增单批量树、逐PID kernel fresh、PID复用、批次上界竞态、重复PID、最多两批的6项；真实进程查询和停止均为0。

## 固定 Windows 75 秒输入

windowsUiTransportProfile 只接已经 validateRuntimeArrangement 核验的 win32 browser、windows-managed-nest 或 windows-external-rust arrangement，绑定 sourceCapId 和实际 runtime owner evidence SHA。唯一值为 transportTimeoutMs=75000、expectTimeoutMs=75000。uiTransportTimeout 拒绝额外键、其他平台、错误 cap、错误证据 SHA 和不同数值。无 profile 的原 Linux/default 路径仍为25000。

生产 waitOriginalUiResponse 原样保留 origin、method、pathname 谓词和同一个 Promise 的成功/拒绝语义，仅取上述有限等待值。Windows context 的动作/导航默认等待、Windows expect.configure 和 driver 实际 callback ACK 使用75000；原行为断言、状态、响应、cookie、证书和重试次数保持原样。driver 将 profile 放入实际 report.transportInput。没有新 outer 扩容：原1200000/900000/840000/780000预算及准备时间扣除保持。

## 已关闭资源先登记

windowsUiActualCloseFacts 只认实际结果的 browserClosed、server.closed，以及 lifecycle 中 owned-tree-stopped、unregisteredProcessesStopped=0、terminalFrameReceived=true、pendingCallbacks=0。它不创建进程，不给予 drain 或数据清理权限。windowsUiClosedBrowserFacade 仅在真实 browser 关闭证明齐全时提供已关闭 facade；不完整证明返回 null。

runtime 在保存实际 windowsLifecycle/observation 后，先登记这份资源关闭证明和 browser facade，再等待私有日志及结果保全，最后执行原 business rejection 断言。故 rejected 仍是 partial/fail，但真正已关闭的 browser/server 不再误报活着；原 finally 在所有 writer 已停且无 active PG case 时可以恢复 observer，走到原 owner.end。数据 cleanup 仍只允许 observed-comparison-pending，失败 owned 行留待原证恢复。

本轮没有证据证明独立 stdio/timer 泄漏，因此 bridge/native-app/stdio EOF/destroy/unref 协议及 process.exit 均未改。实际若仍挂起，Root 应保留新资源证据后另诊断，不能预设原因。

## 纯检查与采用

Node 41 项纯测试、5 项语法检查，以及两个 Fake-OS SelfTest 各23项构成候选验证。首轮测试夹具的 UI/native 原有错误标签差异和随后缺少旧 public producer 模块的加载失败分别保留原 receipt；补入7个原 public 模块仅为 newtmp 纯 import，不读旧 private，不改原模块。测试取本文件所在目录运行生产函数，原107字节取冻结 public snapshot，安装后也不会把新源误当旧源。

最终 packet 列出111 intended pins、5个变化和4个新增文件，并分别绑定旧107 snapshot、C55b719预算审查、原失败安全 refs 和当前46源保护。C 必要源审通过后才能按 exact pins 安装；Root 重新 capture 新 epoch、单旅程 actual。SourceReady 与 pure-pass 均不能代替实际结果或 G3/G4。
