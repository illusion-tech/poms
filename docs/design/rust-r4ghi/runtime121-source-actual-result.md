# #121 当前源码交付与启动预检

当前源码已按 I05、H03、Root8 的独立代码批准实际交付，41 项源码的 Git 暂存原始字节与候选一致，提交为 `fb6e6630a9b109cb9804643a62320447bb764228`。原 33 项推广和本次单 Native 修订均保留单次审批、原像及实际结果，审批不可重放。

单 Native 结果 `2d20bbc2` 与非作者实际读回 `db3574f7` 核实唯一修订、其余 283 项、四份状态／日志书挡以及无残留 partial、锁或暂存文件。helper229、external55、execution284 均为实际完整清单。新 composition `af8b8dd1` 已按原始 ADD／MOD 登记语义重建，非作者 `24ec0f6c` 的元数据读回通过；保留 base18、原 helper227、外部 base45 和七键固定依赖。

历史二进制输入的修订保留真实 Typed6 与 Stat5/6，不补造缺失的历史 bytes，不把旧 inode 当作当前事实。新 current 输入仍使用严格 Pin，当前二进制字节与 stat 独立测量。

真实启动元数据预检03退出 1，在原 Reg5 与 `registryBody15` 重建结果比对处首停。当前校验器遗漏向 builder 传入此前已核验的原15 `apiRecord`，导致重建对象缺少 `consumer.process.record`。修订须使用该原记录并保持全对象比对，另经有限代码独审和新具体源安全输入；失败预检不直接重跑。

API request、Root-review、API process 与新 env 均未生成。失败输入、完整命令和结构化首停位置已保留于 `tools/rust-r4ghi/runtime-recovery121/API-preflight03-actual/`，不公开断言值或私密环境内容。固定事实见 [状态356](continuation-status356.json)，旧状态与失败原件保留。

后继仍须完成同字节 API 启动 G2 与真实进程读回、FS 准入和真实 Ctor、fresh prepare121 的完整 peer／CAS／body67，以及原批业务验收。Rust240、R4 67/95、新增业务认证0，业务 G3/G4 未通过；#57 与完整 R5 #116 保持开放，#119 历史技术 G4 不改写。
