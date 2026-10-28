# RUST-R2EF 原实现行为与验收增量纠偏

## 字符长度

- 范围：E/F 联合基线自然语言中的“字符串长度遵从 JS UTF-16”简写；原 G1 候选与冻结文件保留，不改写历史审查。
- 分类：`new-real-drift`，文档描述与已冻结原 Zod 行为不一致；无 TypeScript、数据库或公开契约变更。
- 事实：原 schema 执行得到 `CreateDictionaryItemRequest/name:astral-at` 的 128 个 emoji（256 UTF-16 code units）通过，129 个 emoji（258 units）报 maximum 128。原件为 `tools/rust-r2ef/e-golden.json`，本轮对照摘要为 `tmp/rust-r2ef/g1-length-description-correction01.json`。
- 修正：对应字段按原 Zod 实际字符计数实现；UTF-16 原始 JSON 字符串解析、孤立代理项、trim、regex 与错误顺序分别按 oracle 保留，不把计数规则等同于所有 JS 字符串操作。
- G3 条件：E/F 原 schema 有限 corpus 与实际 wire/HTTP 分开报告；必须通过相关纯比较及适用 HTTP 边界。原 G1 的其它权限、事务与验收边界保持原状态；最终联合独审覆盖本增量。

## 编号调用事务

- 分类：`new-real-drift`，原计划对“传入 EM 即借用事务”的描述不成立；TypeScript 产品没有改动。`getConnection().execute()` 未传 `ctx`，与 `em.execute()` 不同。
- 实证：`tmp/rust-r2ef/nest-number-actual01.json` 以原服务 TS、真实 MikroORM 7.0.11 与隔离 PG15 执行九个 scope；显式 transactional EM 外层主动回滚后，九次编号分配均保留。SQL 见证包含连接序号和 backend PID。
- Rust 的默认 `next()` 保留独立分配；`next_with_connection()` 是显式借用连接的内部能力，其真实 PG 回滚测试只证明该能力，不作为现行 Nest caller 的等价结论。R3/R4 迁移业务 caller 时仍须依据原调用链单独确认，不能自动改成参与业务回滚。

## E 动态路径与 simple-query 边界

- 同次联合独审补查发现：E 动态参数的非法 percent/UTF8 解码优先级未与 Express 对齐；字典查询遗漏 Node simple parser 的 1000 pair 上限。
- 原始失败探针：`tmp/rust-r2ef/e-transport-win32-initial01.json`，每端 18 项。Nest 在匿名/登录、GET/PATCH 的非法 `%FF`/`%ZZ` 动态参数上均返回原 400；旧 Rust 出现 401/404/500。第 1001 query pair 及 1000 空 pair 后的非法 domain，Nest 忽略该字段而旧 Rust 返回 400。
- 分类：`new-real-drift`；保留旧二进制、owner closeout、393 项既有 HTTP 观测和失败探针。修复只覆盖 E 两个动态路由族与字典 simple query 截断，不改 TS、DTO、共享 OpenAPI/client 或历史 migration。
- 放行条件：最终 Rust fmt/check/clippy/unit/release、18 项原探针的完整响应对照及受影响 E HTTP/UI 增量通过；不重复无关 TS 公共回归。完成前仍不允许 G3 Pass/G4 Done。
