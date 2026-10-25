# R0F 兼容输入复算

R0F 为 R1 冻结现有 TypeScript 行为，入口见 [实施基线](../../docs/design/archive/slices/rust-r0f-compatibility-baseline.md)。以下均是离线样本或静态清单复算，不启动后端、连接数据库或替代 Rust 集成验收。

在仓库根目录、既有 lock 依赖环境下执行：

```text
node tools/rust-r0-api-inventory.mjs --check
node tools/rust-r0-database-inventory.mjs --check
node tools/rust-r0f-auth-compat/run.mjs --check
```

数据样本入口及适用版本见 [data-compat](data-compat/README.md)，认证样本的隔离机制与完整边界见 [auth-compat](../rust-r0f-auth-compat/README.md)。普通 `--check` 不更新冻结预期；不得用自动重录消除未审查的行为差异。

API v3 保持 `033aedd0` 产品输入不变，独立校验 R0F canonical 文档指纹；2 个业务号 lookup 保持待裁决状态，不能把“已登记”解释成“canonical 已批准”。历史 R0E v2 快照仍由 `08daaf45` 固定。

现有 PG17 开发测试库继续使用；隔离 PG15 验收工具在 [R0E](../rust-r0e/README.md)。本组离线命令不操作这两个实例。
