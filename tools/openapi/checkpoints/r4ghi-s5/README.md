# R4GHI 完整生成输入 S5

本目录是 feature 分支上的 G2 生成输入检查点，不是产品 G3/G4，不推进 main 或新增交付计数。

有效输入为 `input-manifest02.json`：414 份当前 API、共享契约及生成依赖原始字节；完整规范为 242 paths、296 operations、689 schemas。原 `input-manifest01.json` 和414份原件保留；02只在两个实体移除三个无用 import，规范和清单不变。独立检查和实际导出、类型检查、校验、lint原文在 `provenance/`，索引为 `provenance-manifest03.json`。

永久 S4 为 `4f0ad88e78622a75b88b4e3cc72aded9da67458a`，必须保留为祖先。输入提交 A 只保存完整规范、本目录和必要来源证据；工具提交 B 再将 sourceHead 精确绑定 A。固定 JAR/Java、完整库存、六项来源、working/index/untracked 前后守卫、三个手管元文件和失败不覆盖均须保留。此时 SDK 尚未生成，业务 G3/G4、真实阶段验收和 Issue 关闭均未授权为通过。

当前正式 Rust 交付仍为240。Runtime候选272与完整共享296分别验证，不能互换。

`.bin` 为原字节证据，保留 CRLF 等原始内容并按二进制显示 diff；不清洗证据来满足文本空白规则。实际源文件仍按正常规则检查。
