本次只读审查没有发现已注册 M95/M96 目标的新增 P1 物理结构漂移；MikroORM `migration:check` 仍是实际 exit 1，不能标成通过。原 dump SHA256 为 `2c147060fbc05d258f4763dcca86f485fe5d609a6b11df209969141adc78d4b9`。详细输入 SHA、逐项分类与反例见 `orm-review18.json`。

两库各 19 张新表的 269 列 type/null/default、90 个 FK 的列序/目标/delete/update/deferred 均吻合注册 SQL catalog；扩展至全部 39 张目标表，362 个列目标、125 个 FK 也未见其所声明属性的差异。M96 三个 purpose 字段分别为 integer NOT NULL DEFAULT 0、nullable UUID、nullable UUID，实际三列复合 FK 与 immutable trigger 存在。此处未把 CHECK 名称存在当成所有表达式等价证明，也不把 metadata-only probe 当成 PG 命令。

dump 的 466 个 ALTER TABLE 语句为 46 个 DROP FK、417 个 ADD CHECK、1 个 FK 规则重加、2 个 DROP UUID DEFAULT；另有 21 个 COMMENT。无建删表/列、type/nullability 或 index DDL。46 个 DROP 中，44 个额外 composite guard 已在 main 历史 SQL 中登记，1 个为 M96 purpose guard，另 1 个为旧单列 period FK 的规则改写。未在当前 ORM target 登记的 guard 仍是 SQL 权威约束，其缺席不授权删除，也不能泛称 ORM 无法表示它们。

417 个 CHECK 同名约束在实际 pg_catalog 全部存在。Root 确认 explicit native.env 覆盖最初传入 owner env，使 ORM 以 app role 读取。本地 MikroORM7 `PostgreSqlSchemaHelper.getChecksSQL` 连接 information_schema.constraint_column_usage，而 PG15 该视图只展示 enabled role 拥有表的列。因此重新添加 CHECK 可由读取权限解释；这是代码、实际 catalog 和官方规则支持的推断，本审阅者没有另发 SQL。Root 的 owner-only 只读复核仍应保留独立原件。[PG15 官方规则](https://www.postgresql.org/docs/15/infoschema-constraint-column-usage.html)

IR05-05（P2）是新增 ORM target 投影限制：project.entity.ts:63 和 project-operating-snapshot.entity.ts:108 的 hidden composite relation 共享 id，MikroORM 后写覆盖 scalar id 的 default/comment/primary。实际两库 `id` 仍正确保留 `gen_random_uuid()` 和 PK；target id default 为 null，dump 物理行 188/289 提出 DROP DEFAULT。仅将 id 声明移到 relation 后的两文件候选已实际离线试验，135 表 target 完全不变，因 `Metadata.sync()` 总把 primary props 排在非 primary props 前。该失败候选不得晋升。不能给 composite 的所有列加 UUID 默认，不能移除真实 FK，也不能用宽泛 ignoreSchemaChanges 隐藏差异。

IR05-06（P2）是旧单列 period FK 映射规则不明确：operating-restatement-record.entity.ts:49 的 nullable manyToOne 被 ORM 推导为 deleteRule=set null；实际和历史 SQL 为 NO ACTION。dump 物理行 21/346 删除并重加该 FK 为 ON DELETE SET NULL。M95 新同项目 composite FK 仍为 NO ACTION，数据库当前没有被改弱。修正边界应是显式映射原规则。

dump03 与 check02 两次命令前后的两库各 139 表 normative catalog、sequences、行摘要字段逐项相等，原 receipts/log 均已核 raw SHA。没有读取实际行 payload，没有执行 SQL，没有改 Root 产品、Git、DB 或服务进程。离线 target 的 87 个源也与 Root/WSL mirror 精确一致。该审查与失败候选均不授予产品 G3/G4。
