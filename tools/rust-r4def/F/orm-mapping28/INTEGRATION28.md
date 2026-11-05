# Native ORM 映射候选 28

本目录只包含 Root 授权的可审查提案。实际 Root Native / shared / GitHub、数据库、环境及凭据均未修改或操作；E04 / F25 业务源未改。正式输入为 schema06.sql 与 Root 已真迁移94后的 catalog25，精确输入 hash 见 candidate-manifest28.json。catalog 中有120表及532 seed 的事实由 Root 的输入提供，本作者未重新执行数据库验证。

## 可导入内容

- files/ 下20份完整 .entity.ts：7个新表文件、13份既有文件，覆盖7新表及19 ALTER表。native-orm28.patch 是相同内容的可审查补丁。
- originals/ 保存13份 Root 现有实体的原字节；candidate-manifest28.json 逐文件固定 sourceBeforeSha256 / candidateSha256。Root 导入前必须重新匹配前置 hash；新目标必须仍不存在，否则按新 Root 输入重做差异，不能强制覆盖。
- FIELD-MATRIX28.md / field-matrix28.json / .csv 列全83个列动作和168个重点字段。constraint-matrix28.json 列150个相关约束及19个新建 / 重建索引；SQL-ONLY-FKS28.md / .json 逐项列28个仅由精确SQL维持的复合范围 FK。

## 映射处理

使用当前 defineEntity.properties 风格；UUID真实关系采用 mapToPk，FK 名称 / no action / restrict / deferred 从实际 catalog 对齐，不发明SQL没有的弱单列约束。新7表主键含一个双列PK及summary_snapshot_id主键；JSONB object/array、date与timestamptz、char(64)、smallint、null及最终default按SQL和catalog映射。版本锁只在row_version，普通version/schema_version不误设为乐观锁。

旧费率 Native EXCLUDE 只含active且使用coalesce的表达式已在候选替换为catalog的active+superseded / daterange；劳动scope-period新 EXCLUDE 同样按项目既有 indexes.expression 自定义 DDL 模式声明。二者仍需Root实际SchemaGenerator diff确认，不因自定义表达式跳过数据库规则。所有partial-current/source/successor索引谓词逐名取实际catalog，四个来源current索引现在完整包含registered。

SQL中的两个不可变trigger functions、五个triggers和btree_gist extension继续由精确迁移维护；defineEntity没有相应通用元数据，不删除、不模拟。Root实际检查应保留它们的存在性与定义保护。新7实体的migration discovery可由既有entitiesTs glob发现；Native Nest的forFeature/autoLoadEntities完整运行注册由Root核对，提案不改module，也不实现Node新命令。

## 静态验证与剩余验收

static-checks28-04.json 是最终候选的真实离线检查：TypeScript6.0.3，使用CompilerHost把候选覆盖到Root路径内存中，noEmit类型/语法检查0 diagnostics；26表515列存在性、168字段精度/null、150约束和19索引谓词0静态差异，Root源与F25六源hash未变。只解析TypeScript和本地typing，不导入/运行Root配置、不加载环境/凭据、不连接DB。初次静态检查仅遇到node类型库寻址的harness问题，后通过显式Root configFilePath/currentDirectory修复，原失败static-checks28.json保留。

未运行Native整体lint/build、迁移、数据库schema-check、命令/HTTP/浏览器验收。Root须导入后执行完整Native lint/build/migration-check及独立审查；任何精确DDL差异必须逐项分类或修复，不能从此静态结果宣布schema-check Pass。没有commit/push或GitHub写入。
