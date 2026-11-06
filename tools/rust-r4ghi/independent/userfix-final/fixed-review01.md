# #115 固定提交独立复核

**Pass：874e35fc0af3b6cdf6f6461725eb1343152efbea 可由 Root 进入 main 集成。** 固定 Git blob 中全部 343 条受测输入（342 个不同文件）、78 个已扫描提交载荷及 G3 证书原字节一致；产品仍只改 3 个 Rust 文件，未混入 G/H/I 或 R5 实现。feature 远端已实际发布此提交，永久 S4 4f0ad88e78622a75b88b4e3cc72aded9da67458a 仍是祖先。

工具目录 .gitattributes 保持原字节，执行过的 helper 与历史 patch/证书没有重格式化。关于早期 G1 捕获目录的历史定位，已在 g1-provenance-correction01.json 增量更正并从 45a614b9 补存原 5397 B 输入；旧原件不改，当前产品/G3 不变。该增量随下一次元数据发布携带。

本轮尚未验证 main、归档或线上实际 G4，#115 暂不关闭；#57 保持 Open，新交付入口数为 0。
