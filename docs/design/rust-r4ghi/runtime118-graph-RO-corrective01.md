# #118 G3纠正：图原件身份与只读传输

[Root具名检查点](../../../tools/rust-r4ghi/runtime118-graph-RO-corrective01/Root-G3-corrective-runtime118-01.json)保持80ea修订G1和原04不动。实施发现一处真实域冲突：P3/W3记录的private图原件与G1保存的公共镜像均为60810B/b8fd，但file不同。原old4把两者都当samePin，合成模型没有暴露这个真实路径差异；旧代码资格只保其历史模型范围，不能当old4实际准入证明。

经[独立核实](../../../tools/rust-r4ghi/runtime118-graph-RO-corrective01/independent-graph-domain-review01.json)，new5的W4及SC18.beforeGraphs.execution必须保P3原件身份；G1.graph仍是原公共镜像。两者分别强读，再比全部原字节、长度和hash。缺原件就停，不能改成通用alias或拿公共副本冒原件。此处未读P，运行时原件仍须后续准确G2验证。

同时采用已获[有限独审认可](../../../tools/rust-r4ghi/runtime118-graph-RO-corrective01/independent-RO-transport-review01.json)的固定builtin Podman/psql只读桥，保冻结的readonlyPG语义与完整原快照格式；原镜像公开Containerfile确认psql路径为/opt/pgsql/bin/psql。每库同一连接内执行真实READ ONLY事务、设置核验和完整原catalog/row SQL；密码只走受控stdin，不入argv或日志。外层JSON仅用于传输，不能改内层raw/类型/排序。断线、截断或结果未知保真停止，不重采。

范围仍为6叶修订、5叶携带和3支持工具，不新增模块、CLI或调用者SQL/exec权限。模型、代码资格与实际运行分别记录；本检查点不授源码、恢复、FS、ctx/Auth/probe或任何业务G2。

[具名依据绑定约定](../../../tools/rust-r4ghi/runtime118-graph-RO-corrective01/corrective-binding-convention01.json)保持technicalG1及既有correctiveG3字段均为80ea，new5 combined与9/2 finite资格另列固定correctiveInputs。7322B检查点原件保持；Q11/SQ12/Tax8闭形不加槽，不以新依据替换G1或放宽身份比较。

[公开主机只读证据](../../../tools/rust-r4ghi/runtime118-graph-RO-corrective01/host-executable-files01.json)及[有限绑定](../../../tools/rust-r4ghi/runtime118-graph-RO-corrective01/host-binding-convention01.json)明确当前cache PowerShell路径与原相同字节，以及固定System32 WSL文件的真实双硬链身份。仅受审系统exe角色使用对应精确门；证据、候选、目标、temp和锁继续单链接，旧Root8/facts不改，也未运行WSL。
