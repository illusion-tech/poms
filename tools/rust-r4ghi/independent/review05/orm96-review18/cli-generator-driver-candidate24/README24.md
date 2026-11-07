本候选修正 Generator21 在实际 CLI 路径没有生效的问题。owner-dump06 两个 DROP DEFAULT 真实保留，原件不改、不称已修。此候选由本审阅者编写，需 Root 非作者审查后精确应用；未改 Root 产品、DB、lock 或 vendor。

已经精确区分两个原因：实际 WSL 与 Windows 的 CLIHelper/Migrator/core/SqlSchemaGenerator 四文件 raw SHA 全同。CLIHelper.getConfiguration 先 loadOptionalDependencies(options)，把 options.extensions 填为 SeedManager/Migrator；后续 mergeConfig(...tmp,...options) 用该数组覆盖配置中的自定义 generator。执行这同一 loader/merge 原函数可实际重现 customLost=true。Migrator 7.0.11 并不自行 new 默认 schema generator：constructor 从 config extension 取得同一实例，checkSchema、normal create diff 和 initial create 均消费它，所以无需加 PomsMigrator。

最小正式 hook 是 PostgreSqlPlatform.lookupExtensions。新增 606-byte PomsPostgreSqlDriver，只选择继承原平台的 PomsPostgreSqlPlatform；平台先 super.lookupExtensions，再登记现有 PomsSchemaGenerator。配置改选该 driver，并去掉会被 CLI 覆盖的自定义 extensions 项，保持原 Migrator/SeedManager。已有 Generator21 的 scalar 修复逻辑逐字不变，所有 PostgreSQL driver/platform 其他行为继承原实现。

真实离线实证使用全部 135 表/89 源、同一 CLIHelper loader+merge：负对照自定义配置 extension 确实被覆盖，实际 generator=SqlSchemaGenerator；候选 driver 也经过同一覆盖，但 actual generator=PomsSchemaGenerator。完整 target delta 仍仅两个 id.default 恢复 gen_random_uuid()，其他默认、列顺序、FK、CHECK/index 相同；真实类型检查 0 诊断。

Migrator 原方法以纯内存 from-schema 为测试接缝，不连接 DB、不 init storage、不写迁移：负对照 checkSchema=true，normal create diff 正好是两个 DROP DEFAULT；候选 checkSchema=false、normal create diff 为空。normal/initial create 与 check 三条原路径分别调用同一个已登记 generator，计数 1→2→3，initial create SQL 同样消费它。此为调用/比较路径证明，不能替代 Root 的实际 owner check/dump。

准入只包括新 driver 和 persistence.config 两文件。须由 Root 审 exact pins、应用/sync、运行实际 owner 命令，确认两项 DROP DEFAULT 真正消失；不改 differ、不 ignore default、不传播随机默认、不改变实际 DDL，不授整体 G3/G4。
