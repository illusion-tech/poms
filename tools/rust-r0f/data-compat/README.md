# R0F 离线数据兼容样本

在仓库根目录使用已有锁定依赖运行：

```text
node tools/rust-r0f/data-compat/oracle.mjs --check
```

默认也是 `--check`，只复算并比较，不写入 golden。`--write` 为经过审查后的显式重录；产品输入偏离 `033aedd0` 或上游 R0 数据库清单的已审 normalized SHA 变化时，两种模式均拒绝执行。

产物：`cases.json` 是 76 组合成输入；`golden.json` 记录真实完整模块/原始白名单 AST 方法的 243 个观察值与 provenance；`r1-persistence.json` 是 10 表 121 字段和事务/连接初始化输入。SQL 使用原 repository 方法录制 double，没有连接数据库。oracle 进程固定并核对 `TZ=UTC`，使内部短字符串进入旧 Date 本地解析时仍可复算；产品业务日期仍执行原实现的香港时区规则。

来源、Date/string、JS number/toFixed、ID/枚举、事务边界、指纹和未验证范围见[数据兼容说明](../../../docs/design/rust-r0f-data-compat.md)。该工具不实现 Rust，不运行 migration/seed，不证明 HTTP、真实 PostgreSQL 并发或完整业务规则通过。
