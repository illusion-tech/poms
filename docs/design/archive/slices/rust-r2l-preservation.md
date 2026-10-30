# RUST-R2L / BUSINESS-LOOKUP 证据保全

完整保全已通过；长期锚点为 [机器保全](../../rust-r2l-preservation.json)，冻结机器验收的 raw/LF SHA-256 为 `866ef4d8f019b351404f6c34dfdb39d6c479f7ff72263daf838db6184ef26fae`。联合 G3 与实际 G4 仍是后续独立决定。

只选本轮公开证据、实际 runtime 捕获源码、生成输出、构建产物/日志和正式输入。新旧成功、失败、partial 与 uncertified 原件均保留；私密环境、请求原字节/凭据目录、依赖树及内部执行续接笔记排除。私密原件保持原受控目录与权限，不随公开 tar 导出。

所有本轮 writer 关闭且夹具二次零残留后，Linux 从固定来源建立逐文件 raw SHA-256 清单与不可覆盖快照，生成一份完整 tar。实际 123837 文件、8212458261 bytes；tar 为 3736503253 bytes，SHA-256 `bd191c1626e5b0bb7cbcaa793ebd9f826337bd5f2dbe4aa5686ed1fca648220f`；清单 SHA-256 `e0091decf9877e10f285297eef2476d32f40c1ff28a70907865cee60b4449d12`。Linux 独立成员验证、来源/快照不变检查均通过。

主区正确副本为 `E:/projects/poms/tmp/rust-r2l/final02-evidence.tar.gz`；Windows 本地独立逐成员验证、提取至 `final02` 后的完整文件集合/字节复核均通过。首次 Windows 复制产生相同大小但不同哈希的副本，未提取，原失败文件与回执保留；Linux 原件由独立 SHA 和 cmp 确认未变，随后原生流式复制得到正确副本，未推断损坏原因，也未重新生成 tar。Windows 提取不认领 POSIX 权限已复现。

保全容量原上限在输出目录创建前拒绝了本批清单；仅将成员上限从 100000 改为 200000、清单从 32 MiB 改为 64 MiB。其余保护逐字不变，6 个正向与 30 个拒绝反例通过，原源码和失败均保留。

冻结验收中的 `new-UoW-saved-comparison` / Pending 文句是 Source02 原严格比较的历史时点；当前有限结果以其 `finalActualEvidence/UoW` 与 C RuntimeNecessaryReady 为准，四项实际 Rust SQL wire 未捕获的覆盖边界仍保留。G3 后再提交、独立固定提交复核、主区集成及 G4；不把未来固定提交或在线状态写回初始冻结包。

此后 G3、固定提交、集成、归档和 GitHub 回写采用逐文件有指纹的小增量；不重写初始冻结验收或旧 tar。生命周期移动保留 raw/LF 指纹、路径映射及普通 Markdown 链接的精确改动。
