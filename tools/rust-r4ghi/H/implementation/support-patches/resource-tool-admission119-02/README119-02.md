119 code02 是完整六文件 H0→H1 候选；原 code01 `e6ccd4…` 保持字节不变。最终 Root delta 应取本次完整 manifest 与最终 period205-04 manifest，不能把 code01 与 code02 重复展开成冲突修改。

输入及无环顺序仍见本目录原字节 `INPUT119-code01-original.md`。主接口、null 模板、source416、API136、原 R3/108/B0/B1/H0 和 H47 均不变。新 H1 数量按所有受审 manifest 精确合成，不硬197；Root最终20504为 `f2ec3a…`，独审 `2b24ff…`。

增量修正两项：

- actual H1 每个 mjs/json 代码叶、source416 每叶、模板以及 publisher 在 import 前读取的 H1 叶，必须 regular / no-symlink / canonical realpath / nlink1。相同字节的 symlink/hardlink不能让 Node 按图外 realpath 导入。Cargo API binary 仍独立 /proc/exe/hash 检查，允许其正常硬链接；未把代码叶规则套给 Cargo binary。
- 仅外部 publisher 的 inspect/publish，在原 state 读取后拒 activeFault、blockedObservation、cleaned、cleanupPlan、admissionPending54。**不在 runtime119 全局增加这些拒绝**，正常已准入的 FI install/request/cleanup 仍可验证工具来源。已发表119不允许重发；make-b2仍另阶段。

19项原纯例及新增 code-leaf/发布前置反例使用真实隔离文件系统对象，不涉及 Root 写入或角色/业务 API。Root实际217固定输入、195原始文件、216双fresh全量观察、Source10项目出生链只作不可发表的 FS 复核，所有实际119/H1/B2/state publication 仍为null。

Root发布步骤保持：批准完整 actual 私有plan rawSHA；先精确安装最终H1；旧195/R3/B0/B1/416全部原件可重验；publisher先wx nonce锁，随后读state，用entry rawSHA CAS追加119/sequence。两个 fresh观察都为pre-FS-publish，Root另做发表后fresh守恒，不能冒称本件已做。R4 receipt不反指B2；B2保B1全部字段并显式加119/H1 metadata wrapper。原003/217工具failed/未执行状态不改标。
