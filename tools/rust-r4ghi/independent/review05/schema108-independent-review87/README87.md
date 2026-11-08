I108 非作者只读审查，输入为 I 工作树 `manifest108.json`，raw SHA `8943e0ac1fcabe40cee6171862cb6d2fca65186c78bf01784e61c75f372cba96`。

双基线方向通过静核与独立合成反例：原 M97 pin 同时绑定 frozen producer、prior registry 和新 state；派生比较基线只替精确已核函数/序列及迁移表，138 业务表和对象保留原指针。ledger/cleanup 读取器显式区分，M98 canonical row 不能获得 fixture 删除或 borrowed authority。schema3 沿链保留出生、retainedAt、late receipt 与四个 UI observer overlay 边界。新 Source13 实际输入仍为 null，当前没有 M98 或 Source13 认证。

P2 IR87-01：`schema-comparison108.mjs:125-132` 只核 wrapper/execution 的 argv 互相同值，并独立接受 `direction=up`、`onlyMigration=name` 注记，没有校验实际调用与这些注记的关系。独立 FS 反例把两库 argv 明写成 `node node_modules/.bin/mikro-orm migration:down --only <name>`，其余注记仍为 up，校验器接受；完整只读 schema binding 也接受这些一致的合成收据。本审查没有执行 argv，没有 SQL/HTTP，也不把合成快照视为真实迁移。

正式可执行 mint 前需在新增量中把 Root 确定的受支持迁移入口与精确 runner/source pin、argv、目标 DB 和唯一 forward migration 配置绑定。应支持 Root 实际采用的 programmatic MikroORM 入口，不能误限成只有 CLI；应拒绝 down/wrong name/wrong DB/无关程序，即使 wrapper 与 execution 的自述字段一致。原 108、48 项作者纯例和本次反例均保留。

`probes87` 独立验证精确 M98 delta、派生基线与 7 项漂移拒绝；`baseline-probes87b` 验证同时修改新字段、整批业务重基线及对象重基线三项拒绝。两者只写本审查目录，不 mint registry，不改变 Root/H/I 产品、工具、Git、进程、DB 或浏览器。当前结论为保留提案可审，实际 schema3 mint 暂缓至 IR87-01 修复及真实输入另行审定。不是全批 G3/G4，也不包含本人所写 G83/G84 的非作者认证。
