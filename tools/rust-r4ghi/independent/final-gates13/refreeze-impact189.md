# 189单leaf代码比较与历史引用impact补件

**189仅续接冻结代码及旧证据历史引用；不认证编译、M98、after、B0、Source13执行或G3/G4。** 183的37项封件及`manifest183.json`原字节均已复核未变，首冻f0a/937a和failed180保留原标签。正式Rust240、新认证0不变。

本轮仅FS读取已完成189回执、原件、当前冻结源/H0及已封工具审查。未读活state、活跃build mirror/输出，未执行Root helper、Cargo、SQL/HTTP、角色操作或服务动作；写入仅在本专属目录的新189文件。

- receipt189 raw SHA：`44f731f79bbfdcc0713f95c5af4393ecb7cb6cb636fada10c28b794dc8ca3992`。
- 新plain数组raw SHA：`28e8a04e3fd5736a3d8cdc61bfa454c1f7cd57828c997332ebd9afffe290f046`；实际416项，重算JSON digest为`c337f56f035b76010b841559c5c81c5c6abb62158a300a1765511f2ac7d1a9d2`。
- 对首冻416项，路径集合和顺序相同，415项原字节不变，唯一变更为`docs/design/rust-r4ghi/source13-g2-freeze136.json`：`f0a8cf9c...` → `eb8db183...`。新416文件全部回读SHA匹配。
- G2 JSON差异严格只有4处：`frozenAtUTC`、`supportingTools.source13BuildRunner.file`、其`rawBytesSha256`，以及新增`preMintBuildRevision189`。98迁移输入、SQL/TS、正常UP runner/Node、业务决策、32入口、retained Source12及其它supporting tools等均与首冻相同。
- 195份H0及每个当前helper原字节均匹配`e65db969...`。产品逻辑没有新差异；相对Source12旧406仍是原十产品对应的6修改/4新增，另6项新增是原审批/runner/外部source leaves，合计10新增、6修改、400不变、0移除。
- 已核A114-02工具审查pin `bcfa3be5...`、新driver `68a1aca0...`及corrector pin。它们属于工具准入，不是执行或Gate证书。
- 首冻approval、sourcePins、freeze receipt在189/preserved及183自己的copy中仍匹配f0a/d4ff/fc4c。3份mirror-before原件及对应Root目标hash均吻合；未追读正在运行的build mirror。
- failed180原partial仍为`e65f83ef5c7a3c57af0fbece93abffc53188034b061ef4e0f40f185fbaa0f0de`。189完成时的回执记录尚未Cargo/M98/state；Root后续正在进行的四命令不在本件认证范围内。

`source-comparison189.json`同时保留183映射、937a→c337单leaf差分，以及Source12 406→新416全差分。旧406 ZIP的全部raw-member核验通过不可变183 pin继承，没有把旧首冻改成已执行。

`impact-review62-189.json`由183原件复制，**只改consumerSourcePinsSHA256与sourceComparisonReceipt pin**。producer5263、consumer epoch13、18组receipt、影响范围、`retainHistoricalLabels=true`、`currentConsumerCertificationGranted=false`及每组`historical-by-impact-review` / `certifiesCurrentConsumerExecution=false`全部保持。实际M98/after/B0/state仍为null。

R01–R08复验集合和历史标签边界继续按183执行。下一步仅在Root交来实际M98、after、B0等固定证据后另作独立核验；本件不改旧failed/subset标签、不放行main/部署/切流，也不关闭Issue。
