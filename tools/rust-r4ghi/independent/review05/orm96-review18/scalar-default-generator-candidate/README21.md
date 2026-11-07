此为审阅者编写的两文件正向修复候选，需 Root 独立审查后精确应用。没有修改 Root 产品、DB、lock 或 vendor。`manifest21.json` 给出完整候选与 base SHA；`candidate21.patch` 可直接审阅。

MikroORM 7.0.11 的默认 SQL platform 先调用 `SqlSchemaGenerator.register`，随后执行用户 extensions 的 `register`；通过同一个 `config.registerExtension('@mikro-orm/schema-generator', lazyFactory)` 登记 subclass 是已有框架入口。候选在 persistence config 的 extensions 中登记 `PomsSchemaGenerator`，保持 Migrator/SeedManager。真实离线初始化已确认实际 `orm.schema instanceof PomsSchemaGenerator`，并通过包含 config 的真实 MikroORM 类型检查。

subclass 先调用 super.getTargetSchema，完整保留框架 target；随后仅处理 multiple-column many-to-one/one-to-one、persist、ownColumns=[] 的 constraint-only relation。对其实际复用的唯一 persistent scalar、有真实 string defaultRaw、且实际 target column 存在时，在独立临时 DatabaseTable 用同一 addColumnFromProperty 投影 scalar，再只恢复这一个 column.default。没有给 relation 整体设置 default，没有向其他 FK 列传播默认，没有修改 scalar metadata 或 differ。约束 relation 声明 default、重复 scalar、缺失 scalar target 等不明确形状均拒绝。

实际 135 表、88 个消费源在 before/after 均稳定，完整 target delta 仅 project.id.default 和 project_operating_snapshot.id.default：null → gen_random_uuid()。所有其他默认、物理列与顺序、全部 FK/规则/deferred、CHECK 与 index 完全相同。证明见 `proof21.json` 和上层 `generator-{base,candidate,target-delta}21.json`。

真实离线正负 fixture 同时证明：UUID function 与非 UUID string literal 按各自 scalar 精确恢复；没有 scalar default 的同组 FK 列保持无默认；single-column relation 和拥有自身列的 composite relation 不在修复范围；FK/index/列顺序不变。原 SchemaComparator 对缺失默认仍产生 default difference，并生成 SET DEFAULT SQL，证明没有隐藏比较；该 SQL 只留作纯探针原件，未执行。见上层 `generator-fixtures21.json`。

候选依赖当前固定安装的 MikroORM 7.0.11 的 schema 构建 API（DatabaseTable/DatabaseSchema 为包导出的底层类型）；后续升级应重跑这些精确回归。没有 vendor patch 或版本变更。首轮类型错误和不合法 single-column 重叠 fixture 留在 first-probe21，不冒称产品失败或删除原件。

准入仅限这两个必要源文件与相应回归证据。Root 精确应用/sync 后仍需实际 owner check/dump，证实两个 DROP DEFAULT 消失；现存 SQL guards 与 CHECK 比较差异继续按其真实分类保留。此候选、离线证明及审阅者自己的代码不替代最终非作者 G3/G4。
