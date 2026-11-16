# #118 同scope静态metadata复用：独立设计意见02

日期2026-11-16。审查者 `/root/performance118_independent_review01`，候选作者 `/root`。本件针对Root提出的下一隔离候选设计，不是候选02代码资格、G1执行批准或任何真实运行准入；精确02源码/manifest尚未在本件审签。

设计意见：**ACCEPT_STATIC_ONLY_WITH_CONDITIONS**。允许在同一已界定、同步、只读观测窗口内共享已采集静态物料的metadata，使多个断言针对同一份已验事实求值；不接受将全部regular-pin默认变成metadata缓存命中。

## 可接受的范围

1. 启用范围来自真实Native scope持有的冻结静态清单或受控内部角色分类。source/compile/helper/execution及具名保留原件的精确路径+SHA可按此处理；不能仅因文件是regular、后缀是JSON、descriptor含SHA或处于private目录就视作静态。未知角色默认保留fresh读取，当前动态角色的排除优先于静态名单。
2. 首次采集仍完整执行canonical/realpath、类型、路径/FD身份、角色nlink/dev/ino/UID/mode等原要求与完整SHA。缓存不向消费者暴露可变stat/Dirent内部对象。
3. 每次命中仍验证新的descriptor与所有角色约束，对首次已验stat求约束交集。新角色不能继承旧角色的例外；冲突立即拒绝。规则应归一成不可变内部值，避免角色对象被调用方改写，也避免无限积累重复policy引用。
4. 封口仍对全部相关原件重新lstat/realpath/FD/完整SHA并执行全部角色约束，目录完整再枚举。任何不稳定均停止保留，不循环重试或自动更新期望值。

## 必须保留的中间身份书挡

- driver.lock及其他当前互斥/控制状态、当前canonical state、ownership、可变对象/目录，不因同样存在固定pin或曾作为静态角色读取而省掉其当前检查。
- `/proc`、socket、pid/startTime/boot、当前进程/executable的路径与FD身份，以及Windows系统/holder角色的现时检查，保持fresh。尤其同一路径先以静态角色命中、随后用于current/executable角色时，必须进入相应fresh身份路径，不能沿用静态命中语义。
- 原SQL/full37/session/cookie与严格monotonic/ceil/>2秒、最终Native复核、效果/持久化边界均保持；本意见没有授权调整这些检测点。

本意见只认可静态元数据采集窗口的合并。它不预先认可当前binary内容读取或其他既有scope复用细节；这些仍由02的精确代码、谓词映射及原件模型另行审查。

## 时间语义须明确冻结

这是一种新的“窗口开始/结束静态快照”合同，不与旧的每次函数调用都取得metadata的时间点完全等价，也不声称连续检测已消失的瞬态变化。窗口内不得通过这些暂存事实装载/执行新代码或触发业务效果；不能跨await、HTTP、persist或独立checkpoint。同步只读系统观测可保留，但应属于独立动态书挡，不能借静态cache授予权限。

若现存合同要求某一中间点的当前路径/FD身份，该点继续fresh，不能仅凭“没有连续性保证”删除它。源代码静态事实是否可以采用该新窗口，需在纠正输入中明确列出采集点、消费者、封口点与排除项；无法分类或证明的部分保留复读并报告成本。

## 02至少需要的可复核用例

- 完整源码/编译读取链的typed/names互访正向；同一路径多静态消费者确实减少metadata，跨scope仍重新采集。
- 静态后转动态/current角色仍fresh；伪造静态flag、driver.lock/当前state/ownership误分类均不能进入静态命中。
- nlink/UID/mode等后续更严格角色对首次stat仍拒绝；角色参数和返回对象不可污染内部事实。
- 持续到封口的内容、inode、权限、目录新增/删除/symlink变化均拒绝；瞬态不保证应按新合同真实标注，不写成捕获全部变化。
- 初始/封口完整SHA与逐块尺寸+哨兵、文件/目录资源限额继续通过；读取性能收益不能来自少做原字节/完整目录封口。
- 观测故障不改变主结果/facts，schema2诊断不健康时UNKNOWN传播；四阶段和一次close行为保持。

## wire诊断时钟

可接受仅对budget诊断采样使用safe helper，并明确标不健康/UNKNOWN；诊断catch不得覆盖transport主失败。safe范围不能吞掉真实ticket/owner检查，也不能包围或弱化原SQL/dispatch严格预算时钟。缺失时间不能补0或让诊断是否成功决定权限检查是否执行。

以上条件是限定设计意见。没有实测并审查新的精确候选，就不授READY，不把Root报告的组件计时当成本件独立认证的性能，也不授安装、启动Debian或新探针。
