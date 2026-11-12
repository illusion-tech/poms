# #121 当前源码交付与启动预检

当前源码已按 I06、H03、Root8 的独立代码批准实际交付，41 项源码的 Git 暂存原始字节与候选一致，提交为 `8db702a50f0b42c9d09492a5f99789e60e56fde2`。原 33 项推广、Native05 与 Native06 两次单文件修订均保留各自单次审批、原像及实际结果，审批不可重放。

当前 Native06 结果 `91a4ce4d` 与非作者实际读回 `eb41256a` 核实唯一修订、其余 283 项、四份状态／日志书挡以及无残留 partial、锁或暂存文件。helper229、external55、execution284 均为实际完整清单。新 composition `9124829b` 已按原始 ADD／MOD 登记语义重建，非作者 `1798e98b` 的元数据读回通过；保留 base18、原 helper227、外部 base45 和七键固定依赖。旧 `2d20bbc2/db3574f7/af8b8dd1/24ec0f6c` 继续保留其原时点。

历史二进制输入的修订保留真实 Typed6 与 Stat5/6，不补造缺失的历史 bytes，不把旧 inode 当作当前事实。新 current 输入仍使用严格 Pin，当前二进制字节与 stat 独立测量。

真实启动元数据预检03退出 1，在原 Reg5 与 `registryBody15` 重建结果比对处首停。校验器遗漏向 builder 传入此前已核验的原15 `apiRecord`，导致重建对象缺少 `consumer.process.record`。I06 仅补齐该原记录，Reg5/B0/B1 的完整纯数据重建均一致，错误记录仍拒；有限代码独审 `b3b7e092` 和具体源安全审 `75dcb297` 已完成，再唯一推广为当前 Native06。失败预检03保留，未原样重跑。

新的真实预检04已通过历史重建和源码／compile／composition，在原保活 boot 校验处首停。Windows 选定系统事件及 CIM 确认本机于 2026-11-12 00:04Z 关闭、01:00Z 重新开机；WSL boot 已由 `3e3e` 变为 `a077`，原 Windows/Linux 保活及 PG 进程已失效。只读观测 `9c3c49ed` 确认原 CID、镜像、卷、端口、PG15/OID 目录仍在，四份书挡同原字节；当前 PG 已退出，新 boot 的逻辑守恒尚待重新观察。日志不确定具体操作者和深层触发原因。

API request、Root-review、API process 与新 env 均未生成。两次首停原件分别保留于 `tools/rust-r4ghi/runtime-recovery121/API-preflight03-actual/` 和 `API-preflight04-actual/`，不公开断言值或私密环境内容。固定事实见 [状态357](continuation-status357.json)，旧状态与失败原件保留。本轮以新 G1 append 和各模式新 nonce／exact G2 复用原 A7，不改原 8015 历史 anchor、不复用旧存活回执，也不增加主机配置或开机自启。

后继仍须完成同字节 API 启动 G2 与真实进程读回、FS 准入和真实 Ctor、fresh prepare121 的完整 peer／CAS／body67，以及原批业务验收。Rust240、R4 67/95、新增业务认证0，业务 G3/G4 未通过；#57 与完整 R5 #116 保持开放，#119 历史技术 G4 不改写。
