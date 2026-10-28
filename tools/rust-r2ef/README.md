# R2E＋R2F 联合工具与验收证据

本目录承接同一批次的 E 公共基础与 F 运行审计迁移。正式范围见[迁移计划](../../docs/design/backend-rust-migration-plan.md)、[R2 操作归属](../../docs/design/rust-r2-operation-slices.json)、[canonical inventory](../../docs/design/api-route-canonical-inventory.md)及[联合基线](../../docs/design/rust-r2ef-foundation-audit-baseline.md)。本页记录已执行证据及其来源阶段；联合 G3 判断、G4 收口和 Issue 状态由主代理另行记录。

## 范围与单向权威

- E：字典 list/create/update 三操作，系统设置 list/get/update 三操作，以及没有 HTTP 端点的九 scope 业务编号机制。
- F：全局 audit、实体 audit、security 三个读取操作与 `security-events:recordRouteDenied` 写入，共四操作。
- 合计十个既有公共操作。当前 TypeScript controller/service/repository/entity、共享 Zod 和完整 OpenAPI 保持单向权威；Rust 消费机械导出的 neutral JSON。
- 来源基线为 `7a343c543fe0031d7d6b42c1f7e18a7e861c72b7`。完整规范仍为 237 paths / 291 operations / 585 schemas；579 个 generated-client 文件及 92 份历史产品 migration 受保护。本批没有新增产品 DDL，也不接管后续 R3/R4 业务 caller。

`e-export.mjs`、`f-export.mjs` 生成对应 authority、golden、source 和 OpenAPI 子集。E 有 276 个原 Zod wire 用例；F 有 315 个 request schema 用例及九 target × 37 permission 的 333 次原 service 探测。纯源 oracle、单元测试、实际 HTTP、SQL 和浏览器用例分别计数。

[纠偏记录](../../docs/design/rust-r2ef-corrective-checkpoint.md)保留三个已经识别的边界：原 Zod 对相关字符串按实际 code point 计数；原 `BusinessNumberService.next(..., transactionalEm)` 仍通过未传 `ctx` 的 `getConnection().execute()` 独立消号；E 动态 capture 的非法 percent/UTF8 必须先于 method/auth 处理，字典 simple query 先截取 1000 个原始 pair，空 pair 也计数。

Rust 默认 `next()` 保留独立分配。`next_with_connection()` 是明确借用 SQLx connection 的内部 primitive，其回滚测试证明该能力；原 Nest 九 scope 的真实见证显示外层事务回滚后编号仍已消耗。后续 caller 迁移须逐链确认事务语义。

## 唯一批次入口与执行边界

E/F 的公开 fixture 入口为 `batch-client.cjs` 的 `invokeBatchFixture(request)`，经 `batch-protocol.cjs`、`batch-cli.mjs` 进入 `batch-fixture.mjs`。浏览器、HTTP、PG 和 SQL witness 共用此入口与同一 journal 规范。

请求包含 `formatVersion: 1`、`backend: nest|rust`、新 UUID `runId`、`action` 和 `account`。`prepare/facts/cleanup` 使用 `account: none`；`permissions` 使用指定的 admin/viewer 与已验证权限数组。会话动作通过内存 token 定位当前 run 的会话。token、cookie、密码及连接字符串不写入证据。

`fixture-*` 是复用的 base 实现。E/F 整体必须走 batch 入口：base 的全量 facts/snapshot 对本批额外 audit 行并不适用。E/F 事实使用 `batch facts` 返回的 `extension`；必要的 session 观察只选择安全字段。

主代理独占环境准备、owner 生命周期、真实验收、Git 与证据收口。作者只编写所属产品/工具和纯检查，实际共享 Cargo、数据库、HTTP、UI 与 SQL witness 由主代理统一执行。每个写入 run 先完成 durable intent，清理先 extension、再 base，并在同一事务内完成。随后独立第二次清理须确认 `matched=0`、`changed=0`、extension `remaining=0/zero=true`。

### 数据与清理规则

- 仅准入 PG15 的 `poms_r2ef_nest` / `poms_r2ef_rust`、低权限角色 `poms_r2ef_app`、固定 owner-only marker `a3580e72-e812-47b3-b41f-5066343f5c37`。`database-client.mjs` 先用 owner 连接只读核验 marker/元数据，再返回已核验的 app 连接；环境拒绝 ambient DB/PG/MIKRO/DATABASE_URL 等覆盖。
- UUID、字典 domain/code、编号 scope/period 在业务写前登记。UI 的 `createdCode` 属于 `attachment-category`；E HTTP 的 `eCreatedCode` 属于 `lead-source`。HTTP 生成 UUID 按预登记 logical key 和 actor 精确收编，再写 journal。
- 四域 usageCount 使用真实 `attachment.category`、`sales_follow_up_record.follow_up_type`、`expense_record.expense_category`、`lead.source_code`，包含非 active 历史行。父 customer/project 只读借用并复核，不运行未迁移业务流程或创建实际存储对象。
- 系统设置先记录存在性及完整七列 PostgreSQL JSONB text 快照，保留微秒、SQL NULL、JSONB null 和数值类型。恢复通过 typed record 与原 JSONB value 完成，先验证当前行归属及完整状态，不调用 PATCH/ORM hook 覆写历史版本。
- audit/security seed UUID 预登记，HTTP 行按本 run actor/请求身份精确 adoption。E/F 扩展清理锁定现有 107 张表，核查 incoming FK 与 UUID/code/编号的外部逻辑引用；未知引用阻断清理。扩展行只按登记 PK 与完整行相等条件删除，不按前缀或所有 actor 行直接删除，也不使用 CASCADE 清走外部数据。随后 base cleanup 使用其既有 journal、归属检查和全表引用 guard 清理认证/角色/组织行。
- 私有环境、secret 和 journal 位于 `/home/wangzishi/.local/share/poms-r2ef/private`，目录 0700、文件 0600。失败、中断和工具适配记录保留；未初始化或未证明静止的 run 单独标记，不能伪报清理成功。

PG17 保留实例与数据。本批对它只读取服务元数据，不连接 SQL、不 seed/reset/migrate/stop；旧 PG15 数据库、volume、checkout、镜像和历史证据同样保留。

## 实际证据与阶段

以下文件名区分原始实现阶段与 G3 的 E 窄修后阶段。Linux 原件当前位于 Linux checkout 的 `tmp/rust-r2ef/`；最终向主目录集中保全的目标为 `tmp/rust-r2ef/linux-evidence/`。Windows 原件保留于主 worktree 的 `tmp/rust-r2ef/`。统一机器回执目标为 `docs/design/rust-r2ef-validation.json`，由主代理完成来源绑定和收口。

### E 窄修前的联合实现阶段

- `http-linux-nest-actual01.json` 与 `http-linux-rust-actual01.json`：每端 393 项观测，断言通过、两次清理通过。`http-compare-actual02.json` 对这两份原件完成 393 项完整有限响应比较并通过。比较保留业务字段、数组次序、错误体和时钟规则，仅使用明确登记的身份/时间映射。该 393 项结果属于 E 两处 G3 窄修前的二进制，未冒记为最终 release 的重新运行。
- `foundation-linux-nest-once01.json` / `foundation-linux-rust-once01.json`：公共认证每端 1 suite、13 tests passed，共 26 tests；同候选集中运行一次。不得沿用旧批次的 52 计数。
- `http-concurrency-{nest,rust}-actual01.json`：每端四个独立场景、五个受控 HTTP 请求、四个真实 PG blocker 证明、八次清理。覆盖字典内部 CAS 失败、字典 INSERT 后 session CAS 失败、routeDenied INSERT 后 session CAS 失败及双 INSERT 唯一性 race；最后一项实际为 201/500，不能用 precheck 409 替代。
- `nest-sql-actual04.json`：11 项原 Nest SQL 分段见证已观察，包括 create/dirty/no-op、due/non-due、设置缺行创建、独立审计存储失败及 routeDenied flush。更早的实际失败/部分回执保持原标签。
- `database-rust-pg-actual02.json`：四个显式 ignored PG 测试经单独授权实际执行并通过；`database-nest-number-actual01.json` / `nest-number-actual01.json` 记录原 TS 九 scope 的真实编号行为。它们与普通 Cargo ignored 计数分别报告。

### G3 的 E 动态路径与 query 窄修后增量

- `e-transport-win32-initial01.json` 保留原 18 项/端的不一致。修正后的 `e-transport-win32-corrected02.json` 由 `e-transport-compare-corrected02.json` 完成 18 项完整响应比较：`pass`，admission/mapping/differences 均为空。覆盖匿名/登录、GET/PATCH 的 `%FF`/`%ZZ`，以及第 1001 pair 和 1000 空 pair 后的非法 domain。
- `http-win32-nest-affected02.json` 与 `http-linux-rust-affected02.json`：各自受影响 E 选择 54/54 断言通过、零失败，且完成双次零残留。每端捕获 56 个响应包含 HEAD 的 GET 参考请求，仍计为 54 个用例；F 与完整 DTO corpus 没有在此增量重计。
- 最终 Rust 的 `build-transport04-{fmt,check,clippy,test,release}.log` 记录集中 fmt、locked/offline check、clippy、all-targets tests 和 release 通过。新增的三项窄 unit 分别检查两族解码优先级与 999/1000 raw pair 边界。
- 选定原 Angular UI 回执为 Linux Nest `browser-linux-nest-container01.json`、Windows Nest `browser-win32-nest-cached02.json`、修后 Linux Rust `browser-linux-rust-corrected04.json`、修后 Windows Rust `browser-win32-rust-final01.json`：每组合 2 passed、0 skipped、0 unexpected，合计八条选定 journey。两条 journey 分别为桌面和 390×844，涵盖原字典/设置页面与浏览器发出的审计/拒绝事件请求。系统没有新增全局 audit/security 页面。

Windows/Linux 在 UI 计数中指浏览器所在平台；Rust API 运行于 Linux，Windows 浏览器访问该受控 API。修前 Rust UI 或失败的浏览器安装/权限适配记录单独保留，不追加到上述八条选定结果，也不把它们标为修后 release。

### 静态与 schema 的真实标签

原 TS lint/tests、Angular production build/typecheck、OpenAPI/client 和工具再生按公共检查与受影响增量分别记录。`shared-checks-win32-initial01.json`、`affected-static02.json` 中的初始失败保持失败；对应环境/测试适配与后续日志单列。`client-java17-jar03.log` 实际使用 Java 17.0.12 与已验证的 generator 7.20.0 JAR，通过 579 文件对照、零差异、`clientWritten=false`，不能把它写成默认 JVM/原 launcher 已通过。

`schema-check.json` 的两库均为 `failed-with-classification`：已存在的低权限 MikroORM CHECK introspection 可见性差异，以及 `lead_score_override.status` 注释差异，分类为 `existing-baseline-drift`。实际 migration-check exit 1、只读 schema dump exit 0，catalog/source 保持不变，`proposedSqlExecuted=false`。这是本轮重新观测并归类的结果，不能写为 schema 无差异或已执行建议 DDL。

## 主要命令

以下命令由主代理在已准入的依赖/runtime、私有环境和 owner 回执下执行；`<tag>` 必须替换为新的证据标识，回执和报告 JSON 路径须位于 `tmp/rust-r2ef/`。输出使用独占创建以保留旧运行。环境 provision/migrate/seed、owner 启停及私有 fixture 文件准备由主代理单独安排。

```text
node tools/rust-r2ef/e-export.mjs --check
node tools/rust-r2ef/f-export.mjs --check
node --test tools/rust-r2ef/e-export.test.mjs tools/rust-r2ef/e-http-plan.test.mjs tools/rust-r2ef/f-export.test.mjs tools/rust-r2ef/f-protocol.test.mjs tools/rust-r2ef/batch-extension.test.mjs
node tools/rust-r2ef/verify-openapi.mjs tmp/rust-r2ef/final-openapi.json

node tools/rust-r2ef/http-compat.mjs <nest|rust> <owner-start.json> <tag>
node tools/rust-r2ef/http-compat.mjs <nest|rust> <owner-start.json> <tag> E
node tools/rust-r2ef/compare-http.mjs <nest-report.json> <rust-report.json> <new-comparison.json>
node tools/rust-r2ef/http-concurrency.mjs <nest|rust> <owner-start.json> <tag>
node tools/rust-r2ef/e-transport-probe.mjs <tag>
node tools/rust-r2ef/compare-e-transport.mjs tmp/rust-r2ef/e-transport-win32-corrected02.json <new-comparison.json>

node tools/rust-r2ef/database-acceptance.mjs rust-pg <tag>
node tools/rust-r2ef/database-acceptance.mjs nest-number <tag>
node tools/rust-r2ef/sql-witness.mjs <nest-owner-start.json> <tag>
node tools/rust-r2ef/foundation-acceptance.mjs <nest|rust> <owner-start.json> <tag>
node tools/rust-r2ef/browser-acceptance.mjs <nest|rust> <owner-start.json> <tag>
node tools/rust-r2ef/shared-checks.mjs <tag>
node tools/rust-r2ef/schema-check.mjs
```

Rust 的集中检查在固定 Rust 1.99.1 容器的 `apps/poms-api-rust/` 内执行，使用本批 target 与已验证缓存：

```text
cargo fmt --all -- --check
cargo check --locked --offline --all-targets
cargo clippy --locked --offline --all-targets -- -D warnings
cargo test --locked --offline --all-targets
cargo build --locked --offline --release
```

HTTP、并发、SQL witness、PG 与 browser 命令会访问受控目标；共享同一个 backend 数据库的写入由主代理串行协调。`--self-test` / `--plan` 是对应工具的纯检查或计划输出，不能替代实际执行。独立 PG primitive、浏览器 HTTP、真实 UI、source oracle 和全量 HTTP 的结果不交叉冒名，也不累加成新的统一总数。
