# POMS Rust 后端基础

独立 Cargo workspace；基础切片 [R1A](../../docs/design/archive/slices/rust-r1a-application-baseline.md)提供工程与 SQLx，[R1B](../../docs/design/archive/slices/rust-r1b-shared-types-baseline.md)提供共享类型单向导出及标量/JSON/权限兼容，[R1C](../../docs/design/archive/slices/rust-r1c-auth-session-baseline.md)提供认证、会话、Cookie/CSRF、权限与密文兼容。现有 Nest 后端和完整 OpenAPI/client 保持原位。

使用固定 Rust **1.99.1**、Axum 0.8.9、SQLx 0.9.0 与 Cargo.lock。推荐在 Linux checkout 中通过[当前固定环境工具](../../tools/rust-r1c/README.md)构建，产物目标为当前 TEST 的 Debian12/glibc2.36。不要把 WSL Debian13 原生构建自动当成 TEST 可部署包。历史切片的旧编译器与验收记录仍按原提交保留。

```bash
cd apps/poms-api-rust
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
cargo build --locked --release
cargo run --locked -- --openapi > openapi-rust.json
```

`--openapi` 输出当前Rust实际注册的规范，不读取环境文件或连接数据库。当前接入296项/242路径，与完整共享契约的296项接口对齐，提成28/28项；接入数量不表示全部业务链路已验收。当前交付顺序见[短清单](../../docs/design/rust-fast-delivery-2026-11-16.md)。共享类型只从现有 TypeScript 来源机械生成，维护与兼容复算见 [R1B 工具](../../tools/rust-r1b/README.md)。认证 OpenAPI 元信息也由现有完整规范单向导出，保留其 3.0 语义；实际 handler、JSON、Cookie 和数据库行为有独立验证，不以元信息相等替代。

本机已有的Linux Cargo缓存是`/home/wangzishi/.cache/poms-r4def-cargo-home`，包含固定ICU源码。2026-11-17已使用该缓存离线编译当前工作树，无须替换ICU依赖；在已经运行的Linux环境中，从仓库根目录执行：

```bash
CARGO_HOME=/home/wangzishi/.cache/poms-r4def-cargo-home \
CARGO_TARGET_DIR=/home/wangzishi/.cache/poms-delivery-20261117/target \
cargo +1.99.1 test --manifest-path apps/poms-api-rust/Cargo.toml --offline --locked --lib
```

这是本机构建缓存路径，其他环境应使用自己的Cargo缓存。Windows默认缓存缺失不代表Linux构建不可用；无需重跑历史验收工具或修改Cargo.toml/lock。

规则/计算、调整、发放、冻结争议/变更、离职特例和结算查询的24项接口，以及低首付款批准2项增量已做[独立测试库SQL/HTTP回归](../../tools/rust-commission/README.md)。当前Rust为298项/243路径，提成30项。多合同保留项目提成池，按冻结合同不含税金额占比分摊，各合同依冻结回款判断模式及自身质保比例限额；实际回款使用G确认时冻结的不含税依据。管理层独立权限可确认15%特例或50%回款后解除限制，后续仍须实际财务审批；原始发放与补发都固定实际批准的合同分摊，不能在执行时转至另一合同。未知历史分摊继续要求核实。

管理层页面在项目工作区和提成导航提供独立入口，只要求项目读取及新批准权限，不授予计算、发放或调整权限。本机已用生产Angular产物、真实Rust API与专用PG完成页面批准201及回读，合成账户不代表人工批准。完整producer贯穿与目标TEST发布/回滚尚未完成；本机开发二进制仍引用GLIBC_2.38，不能直接当成Debian12发布包。

结算快照的税务待闭合金额允许NULL表示未知，不再以数据库默认值补成0；新环境须包含`Migration20261117160000_commission_settlement_unknown_tax`。已有数据不改写，回滚在仍有NULL时会拒绝执行，须先有真实业务处置。本机已在独立测试库验证，未应用到旧开发库或目标TEST。

会话 token/CSRF 采用原 base64url 与 SHA-256 存储合同，bcryptjs 和 AES-256-GCM v1 密文按原实现互通。账户、角色、权限和组织读取直接使用现有 schema；未知 raw permission 不被强枚举过滤。每次会话解析重新读取当前权限，touch/轮换/撤销采用原 guarded SQL；后续审计保留原 MikroORM 的请求局部 dirty snapshot flush：安全事件与额外版本 CAS 同事务，失败只回滚这次 flush，先前 raw 会话更新仍保留，公共查询不额外写入。未匹配路由/方法按本轮实测原 Nest/Express 返回 HTML 404，详见 R1C 纠偏记录。[R1D](../../docs/design/archive/slices/rust-r1d-e2e-client-baseline.md)已交付通用多后端harness、完整client生成与真实Chromium启动/基础认证smoke；整体浏览器旅程与阶段集成验收仍属R1E。

配置沿用现有公开环境名与 dotenv 选择规则。`POMS_ENV_FILE` 显式文件覆盖进程环境；否则优先当前目录 `.env`，再 `apps/poms-api/.env`，文件值不覆盖已有进程值。缺失显式文件/非法配置退出 11。启动不会执行 migration/seed。使用自己的隔离配置启动前，明确检查 DB_HOST/DB_PORT/DB_DATABASE/DB_USER；本项目不要求迁移或清理原 PG17 开发库。

注意现行兼容行为：环境字符串 `DB_CONNECT=false` / `AUTH_COOKIE_SECURE=false` 都是非空字符串，得到 true；省略 DB_CONNECT 或传空字符串才是 false。DATABASE_URL 的定位字段由有效离散字段（含默认值）覆盖；DB_DATABASE → DB_NAME → poms。运行角色与凭据必须按目标环境配置，开发默认值不是部署凭据。

## 运行层参数

| 参数                    | 默认             | 合法范围 / 用途                          |
| ----------------------- | ---------------- | ---------------------------------------- |
| HOST / PORT             | 127.0.0.1 / 3333 | 明确绑定；PORT 1–65535                   |
| DB_MAX_CONNECTIONS      | 5                | 1–1024                                   |
| DB_ACQUIRE_TIMEOUT_MS   | 5000             | 1–300000；建连/借连接                    |
| DB_QUERY_TIMEOUT_MS     | 5000             | 1–300000；受控操作客户端时限             |
| DB_STATEMENT_TIMEOUT_MS | 5000             | 1–300000；每连接服务端 statement_timeout |
| SHUTDOWN_TIMEOUT_MS     | 10000            | 1–300000；在途 HTTP 与池关闭共用期限     |

DB_CONNECT=true 时在监听前建连；lazy 模式仍由 readiness 尝试真实连接。每条连接初始化 Etc/GMT-8 和固定 poms search_path。`Database::with_connection` 在失败、超时或 future 被取消时隔离并关闭连接；客户端超时不代表服务端立即停止，服务端 statement_timeout 提供独立上限。

事务必须使用 SQLx `Transaction` 的 begin/commit/rollback/drop，不在受控 operation 中执行 raw BEGIN/SAVEPOINT/COMMIT/ROLLBACK。SQLx 0.9 的 `is_in_transaction()` 只追踪自身 transaction depth，不是任意 SQL 的事务检测器。直接使用 `pool()` 的调用方负责事务和超时；本层不提供隐式提交或隐式成功回滚。

SIGTERM/SIGINT 在启动等待连接时可取消启动；运行后停止接收请求，在有界期限内排空请求并关闭连接池。超时退出失败，不能作为正常优雅退出。JSON 日志保留安全事件、请求标识、模板、状态与耗时，关闭 SQL/bind 内容日志；健康失败使用固定脱敏文本。
