# #118 性能候选A–C实施输入

用户在2026-11-16对[方案草案](E:/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/runtime118-validator-performance-solution-draft-2026-11-16.md)指示“开始吧”。本件将首片限定为A–C的隔离候选及离线验证，Root负责实现，独立资格尚未签发。分类为高风险控制工具的 `design-change-required`；公共业务route/DTO/DDL/算法均N/A。旧预算观测及父项状态保持，实际安装和运行效果不授。

基线为R HEAD `599cb52b0af60be05dc4b9938becdfec877fcd31`，现有284图由 `tools/rust-r4ghi/runtime118-resume-actual01/Native-exact-peer.json` 的sourceClosures逐字核对。实现输出限定 `tools/rust-r4ghi/runtime118-performance-candidate01`，自有I/O夹具限定R/tmp本片目录；不得改动原284执行文件、P或I。保留全部失败尝试，不运行pnpm，不启动Debian。

冻结本片决策：

- 固定Windows Node24.19离线执行；Linux实际行为及预算仍UNKNOWN。
- 全部14个已识别checkpoint、6份双139快照、full37及I900/A28800/T60、SQL单调锚/ceil、严格>2秒和一次性dispatch/close语义保留。
- 新增内部观测/reader模块置于专用performance118目录，完整候选图实际枚举，不冒用旧284资格。观测开始必须经过现存真实Native ticket校验；普通模式和其他作用域不能设置预算ambient缓存。
- 观测作用域同步、不可重入，不跨await/HTTP/persist/独立checkpoint；FD及目录书挡必须在返回结果前完成。异常清空作用域；scope品牌不落盘、不返回port。
- 同次作用域可共享相同规范路径、SHA、尺寸的原内容，角色约束独立执行；不同路径不因hash/inode相同合并。每个新边界重新完整读原字节并验SHA。时间戳不是内容证明。
- 内容/JSON缓存按原字节计费合计最大64MiB，依赖描述符最多20000项；缓存可逐出旧解析项或不保留大Buffer，依赖项超限则停止保留，不无限增长。此为缓存计费上限，不冒充JS对象真实RSS上限，RSS另测。大二进制使用分块SHA；只保留摘要与FD/路径书挡，不缓存整个大Buffer。小文件由读取者获得独立可变Buffer副本，避免污染已验缓存。
- JSON解析结果复用只限只读冻结值及完整显式reader依赖；依赖关系未闭合的历史loader继续完整执行，不能以猜测依赖集换速度。动态state/ownership/权限/会话/proc观测不缓存结论。
- close统一编排目标需逐项谓词映射。无法证明可安全合并的fresh或时间边界保留，报告真实剩余调用数，不以“两次”为删检查硬指标。
- profile schema1只包含phaseId/parentId/sequence/startNs/endNs/status、实际I/O计数和采样方法；无凭据/路径载荷/DB行/错误原文。新增私有profile旁件不改旧nonce、旧sample/report闭形或已封journal。性能缺数据标UNKNOWN。
- 工程目标沿用草案CP≤10s、close≤30s、Auth3≤180s、outer≤300s、through-close余量各≥60s，只能由未来获准实际数据验证。本片不报告目标已达成。

必要离线验收：真实文件内容/身份/目录变化、同大小及mtime保留篡改、跨scope篡改、角色nlink例外、无symlink、Buffer/JSON缓存污染、跨Root/ticket/nonce/序列化及关闭后复用、await/persist越界、I/O失败和profile失败、父子计时归属、内存上限；完整候选模块的普通六mode/预算入口拒绝及原有相应回归。失败原件保留，任何实际SQL/HTTP/Auth/快照计数须为0。

代码产物需列出before/after文件与SHA、完整新依赖图、scope/predicate映射、真实运行命令/原始输出、覆盖与未覆盖项。Root自测不冒充非作者独审；独立代码资格和安装准入保持分开的门槛。旧prepare/Source/API/rebind均不得重放。

本件是用户已授权隔离候选的可用实施输入，不是独审READY或线上效果批准。GitHub #118/#57保持开放；任务发布记录与独审签名只能根据真实已存在产物写出。

## 实际负例纠正01：完整内容封口

作者实际自有I/O负例 `validation-9ef87430-fee0-4093-84f1-122e6d865eb0` 的20项中19通过、1失败：同大小文件在同一scope内改写后，仅mtime/ctime等元数据封口没有拒绝。原命令输出与失败实现均保留；不将该次结果改成通过。

因此本输入明确覆盖草案的乐观“每个scope仅一次SHA”估算：收集时完整读验一次，封口前再完整读验一次，并重新枚举目录。中间重复消费者共享该次内容，元数据仍检查，不能用缓存替代末尾SHA。上述源码集合结构上界相应为 `2×2180=4360` 次（控制与历史另计）；已分析的二进制读量不再承诺减半。解析复用与close递归fresh去重仍可减少重复工作，具体收益由真实计数和组件基准报告，不承诺原工程目标已达成。
