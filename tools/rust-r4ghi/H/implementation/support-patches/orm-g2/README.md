# G2 ORM 映射候选

Root 单写应用；本目录不改产品、不连接数据库、不运行迁移或 DDL，不自签 Gate。

正式输入的原字节已保存在 `inputs/`，哈希在 `sql-target-catalog.json`：有效 v2 `migration.sql`、`orm-delta.json` 与 Root `g2-corrective01.sql`。本轮没有改上一轮 128-schema 候选或其隔离证据；129-schema 公共增量仍由 Root 接入。

交付为 `orm-mapping.patch`、`proposed/` 镜像与 `orm-candidate-manifest.json`。19 新表集中在 `project-cost/rust-r4ghi-entities.entity.ts`；CLI 的现有 `**/*.entity.ts` 自动发现该文件，既有 `ProjectCostModule.forFeature` 额外注册 `RUST_R4_GHI_ENTITIES`，供 Nest `autoLoadEntities` 使用。没有添加业务 provider、Node producer 或新业务 HTTP。

使用实际 MikroORM 7.0.11 的 class-first `defineEntity` 重载，字段由显式类声明固定类型，全部实际 FK 指向当前真实实体类。物理 PK 列保持标量或单列映射；重叠的复合 scope FK 另用不参与 hydration、hidden 的关系描述、精确 `columnTypes/joinColumns/referencedColumnNames/ownColumns`，避免把额外 scope 列带入 PK。实体不会替代 Rust 的 typed scope proof 或不可变来源校验。

保持所有金额 `numeric(18,2)`；待确认税额的两个 G 快照及 H DMER/binding 均 nullable 并保留独立 knowledge 字段；`ProjectOperatingSnapshot.grossMarginRate` 仅改为 `numeric(38,6)`。新 `OperatingCommandReceipt.evaluationHash` nullable，但 G2 CHECK 只允许 baseline-only operation 为 NULL，其他 operation 必须有真实评价 hash。没有把 NULL 读成 0。

`check-types.cjs --overlay` 在预定产品路径的虚拟 overlay 中使用当前真实被引用实体，已通过。`check-metadata.cjs --overlay` 使用同一真实实体闭包并强制 `connect:false`、`ensureDatabase:false`、关闭 metadata cache；检查了 19 新表的全部 PK、269 新列、90 FK，以及既有增量后共 362 个目标列、125 FK，实际引用闭包为 87 表。它没有执行 schema generator、迁移、SQL、数据库 introspection 或完整应用构建。

可重新生成：

```powershell
python tools/rust-r4ghi/H/implementation/support-patches/orm-g2/build-candidate.py
node tools/rust-r4ghi/H/implementation/support-patches/orm-g2/prepare-existing-patches.cjs [Root产品目录]
node tools/rust-r4ghi/H/implementation/support-patches/orm-g2/check-types.cjs --overlay
node tools/rust-r4ghi/H/implementation/support-patches/orm-g2/check-metadata.cjs --overlay
python tools/rust-r4ghi/H/implementation/support-patches/orm-g2/emit-review-patch.py
```

Root 必须在其实际迁移候选上读回匿名 CHECK/UNIQUE/FK 的名称，复核自动命名是否发生 namespace 冲突。候选按 PostgreSQL 15 的 `makeObjectName` 与 CHECK 单一 Var 规则推导名称；这是原生代码支持的静态预测，尚未经真实 `pg_catalog` 验证。`NOT VALID`、触发器、延迟约束及不可变事实的运行状态仍由冻结 SQL 和实际 Root 验收负责，不能因实体存在而宣称通过。

Root 应在应用前核对源文件哈希；若 Native/schema 接入已改变产品文件，可传 Root 目录重新准备候选，避免用旧上下文强行覆盖。nullable 类型变化可能暴露旧 Node reference 中对新 producer 的不当读法；必须显式走受限 legacy 分支，不能 as-cast 或填零掩盖。
