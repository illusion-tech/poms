# R2A 导航来源与验收工具

Rust 新增当前用户导航树、完整导航树与同步审计三个既有操作；[实施基线](../../docs/design/archive/slices/rust-r2a-navigation-baseline.md)记录精确边界。原 TypeScript 导航定义、完整 OpenAPI 和生成客户端仍是事实源。

## 单向来源与契约

```bash
node tools/rust-r2a/export-navigation.mjs --check
node --test tools/rust-r2a/export-navigation.test.mjs
node tools/rust-r2a/verify-openapi.mjs tmp/rust-r2a/rust-subset-openapi.json
```

`export-navigation.mjs` 绑定原 constants/service、传递来源、shared contracts、完整规范及 canonical；只规范化 CRLF→LF，同时检查 working tree/index/相关 untracked。`--check` 不更新任何产物。`--write` 仅用于经过审阅的来源更新，不可用来消除未知差异。原 TS 方法产生43组原树权限、6组合成边界和1组全树快照；Rust测试消费全部50组。新增三操作metadata直接提取完整规范，可达schema保留3.0原文；校验器复用原七操作校验并要求总数恰为10。

## 隔离环境

本目录仅为 `19f837c9e33fe9cdeb7ca94f3c932c9621cb91d3` 冻结输入创建新的 R2A 隔离副本。复用已验收 PG15 容器，不读写旧 R0/R1 业务库，不连接 PG17 或 TEST。旧 `rust-r0e/environment.sh status` 只核验容器镜像、卷及端口元数据，不运行旧库 SQL。

- Linux checkout：`/home/wangzishi/projects/poms-rust-r2a`，WSL Debian 普通用户 `wangzishi`（uid 1000）。
- state：`~/.local/share/poms-r2a`；数据库：`poms_r2a_nest` / `poms_r2a_rust`。
- runtime：`poms_r2a_app`；owner：`poms_r0e_owner`，只负责新副本初始化和只读身份/marker 核验。
- marker：`r2a_control.marker` / `178684c0-41b5-4ed7-bdbb-3386b39e0e61`。
- PostgreSQL：15.12 / 150012，容器和宿主端口 15432，`poms.r0e_isolated=on`，UTF8 / en_US.UTF-8，pgcrypto 1.3 / btree_gist 1.7。
- Nest 5100 / Rust 5101；CORS `http://127.0.0.1:5200`，admin port seed 800。

环境脚本交非作者审查后，由主代理在该 Linux checkout 串行执行：

```bash
bash tools/rust-r2a/environment.sh provision
bash tools/rust-r2a/environment.sh migrate
bash tools/rust-r2a/environment.sh env
bash tools/rust-r2a/environment.sh seed
bash tools/rust-r2a/environment.sh catalog
```

没有 reset/drop 子命令。现有同名库必须有精确 marker 才接受；现有凭据/env 文件不同则拒绝覆盖。迁移与原 seed 的 working tree、index 和 untracked 来源必须仍与冻结起点一致。原 92 migrations 是唯一迁移执行方，Rust 不接管 migration。输出只含计数和身份/catalog 元数据，seed 的原始输出留在 private 目录。

`managed-environment.cjs` 供 launcher 选择显式 R2A env；不接受默认 `.env`、部署 private、任意 DB URL、PG/ORM/Node 注入或其他库/角色。runtime 身份还须在真实连接后验证所有高权标志 false（含 replication）、成员关系 0、无 database/schema CREATE、无 control marker 权限。

`fixture-cli.mjs` 使用[固定stdin协议](fixture-protocol.md)，只接受run UUID、backend、固定action及必要的session token。token不进入argv、环境、journal或输出；每个run有独立恢复journal，cleanup按owned actor与非空run标记清理，禁止按共享targetId或空requestId扩大范围。双次cleanup的第二次必须matched/changed均为0。

## 实际请求与数据库验收

以下命令须在已有上述新库、private挂载与固定secrets的受控Linux容器内执行；不能仅把任意服务URL传入工具：

```bash
node tools/rust-r2a/nest-witness.mjs
node tools/rust-r2a/http-scenarios.mjs nest
node tools/rust-r2a/http-scenarios.mjs rust
node tools/rust-r2a/compare-http.mjs
```

选择相应 `POMS_E2E_ENV_PROFILE=r2a`、`POMS_E2E_MODE=managed-nest|managed-rust` 与显式 `POMS_ENV_FILE`。Rust须先按锁定toolchain构建；witness独占Nest5100。witness只记录固定SQL类别、SQL SHA、连接/配对/时序和脱敏DB事实，不保存SQL参数、Cookie或凭据；它调用原Nest产品而非重写事务oracle。HTTP runner保留完整错误体并核audit12字段、版本变化及零残留；比较器要求两端同一源码和38个场景，不省略message/statusCode/额外字段。每份结果拒绝覆盖，重跑前必须保留原失败。

Rust `navigation_audit_db` 的三个ignored入口需要显式 `POMS_R2A_DATABASE_TEST=1` 和严格固定的新Rust库低权URL；先由受控runner核只读owner marker，再由测试重复核低权身份与fixture边界。使用 `cargo test --offline --locked --manifest-path apps/poms-api-rust/Cargo.toml --test navigation_audit_db -- --ignored --nocapture --test-threads=1`。秘密只能从固定private/secret路径装入子进程环境，不得写入命令历史或日志。旧R1 DB测试绑定旧库，不能借本轮直接重定向/重跑或改变其冻结guard。

## 原页面与纯工具检查

浏览器选择 `POMS_ADMIN_E2E_SUITE=navigation`、admin seed800及R2A环境；仅加载三个 `r2a-navigation.spec.ts` 场景，使用原Angular bootstrap，无bridge或route mock。Windows Rust必须使用独立Linux owner和external模式，明确 `POMS_R2A_BACKEND=rust`；测试退出后检查原owner存活，再由owner停止。页面成功、实际HTTP、DB快照与fixture辅助分别记录；其它R2业务响应只作观察。

```bash
pnpm exec tsc --project tools/e2e/browser-tsconfig.json
node --test tools/rust-r2a/managed-environment.test.cjs tools/rust-r2a/environment.test.mjs tools/rust-r2a/fixture.test.mjs tools/rust-r2a/export-navigation.test.mjs tools/rust-r2a/http-client.test.mjs
```

原 `migration:check` 在低权副本上的失败和DDL提议必须先分类，不能执行dump来“修复”验收。详见[纠偏记录](../../docs/design/archive/slices/rust-r2a-corrective-checkpoint.md)；本片不修改产品DDL。
