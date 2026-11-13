# #121 原始启动环境精确绑定

新 API 启动器必须在具体 G2 前绑定真实原始环境文件的完整三键 pin：固定 `private/rust.env` 路径、字节数和原始 SHA。不能在启动时才发现一个新哈希，也不能给只有八字段的历史 API136 记录补造环境依据。

冻结文件为 `tools/rust-r4ghi/runtime-recovery121/g1B-API-append02/Root-G1B-API-append02.json`，依据非作者设计审 `b2a27f`。原 API append01 保留，顶层输入 17 项、Root 审批 12 项、进程记录 25 项均不变；仅 current 嵌套增加 `baseNormalEnv`，由 11 项变为 12 项。生产叶仍一个，两个验证入口及 229/55 计划不变。

元数据准备、派发、子进程预检、最终启动前及 readiness 后均核对同一原始 pin 和私有文件身份；只对新环境派生 HOST、PORT、CORS 三项。原文件不修改、不公开内容，差异使用固定无密诊断并停止后续效果。此补充仅授代码实施，启动和真实准入仍须单独独审及具体 G2。
