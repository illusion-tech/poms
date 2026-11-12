# #121 保活启动协议358 G1

357 轮的保活输入和适配代码从未获得实际 G2 或执行。中断后主机与 WSL 再次更换实例，PowerShell 安装目录也再次变化；可信程序字节仍为 301360B、SHA `2a6769a3…2233`、版本7.6.9。在没有保活进程时，等待期间观察到的 WSL boot 也不能作为未来存活条件。

本 G1 将稳定代码规则与每轮实测绑定分开。稳定策略只允许新增 `aux358/dispatch-holder358.mjs` 和相邻验证文件，固定原 A7 七源、Root 路径、Node 字节、可信 PowerShell 字节与安装目录形态、原保活脚本和有限调用。每轮另冻结实际 loss、具体 executable 完整 pin、源码／审件、全新保活请求及 exact G2；执行器不得自行搜索程序或回退路径。原 A15、Root12、四键 owner、A7／Native／Root8 和284项运行模块图保持不变。

第一步只建立保活，不授 PG、API 或业务权限。执行时保存真实 before boot，运行原保活脚本，再要求 after boot 与本次 holder-ready 的 boot 相等；同一新源的固定 Linux 只读子入口复用已验原 `holderFacts`，真实核验 PID、startTime、exe、cwd、argv、input、review、nonce、source 与 node 链。该子入口不得创建 Root-review、输出目录或成功回执，也不得依赖尚未产生的 owner bundle。独立 Windows PID 读回仍须在构造 bundle 前完成。

原始子进程证据先保留，generic 成功回执只能在全部真实身份、源码、状态、锁及前后条件通过后写出。悬空锁等入口以 lstat 判定，只有 ENOENT 表示缺席。未知结果保留，不自动重试、回滚或停止。后续 PG／RO 仍走原 Linux 入口，绑定已真实验证的 live holder boot，逐模式全新 nonce、exact G2 和独立读回；不新增容器、卷、迁移、主机配置或自启。

非作者设计审 `148928b3` 建议代码范围冻结；`Root-G1A-holder-transport-policy358.json` 仅授具名代码实施。源码审、各轮绑定审及实际 G2 后置，未执行任何恢复，业务新增认证0，#57与完整R5 #116开放。
