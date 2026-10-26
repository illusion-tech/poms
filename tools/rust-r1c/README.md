# R1C 认证、会话和密文兼容工具

正式输入与完成证据见 [R1C 基线](../../docs/design/archive/slices/rust-r1c-auth-session-baseline.md)。本目录运行四个认证操作的兼容验证；TypeScript、完整 OpenAPI 以及 R1B 共享定义继续为权威来源。

## 固定运行环境

当前工具链为 Rust/Cargo **1.99.1**；`rust-toolchain.toml`、Cargo `rust-version` 和新增依赖版本均固定。构建镜像为 Debian12/glibc2.36，镜像 ID `ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273`，Node24.16.0。`build.sh` 先核验 R0E 父镜像 ID，再构建新的派生镜像；重建结果必须重新核验并更新验收绑定，不能仅按可变 tag 认定等价。

本轮 Linux checkout 为 `/home/wangzishi/projects/poms-rust-r1c`；缓存、产物、日志和私有凭据位于 `/home/wangzishi/.local/share/poms-r1c`。独立 Cargo target/registry 不覆盖历史 R1A/B 产物。Linux `node_modules` 使用现有 pnpm lock 安装；不链接 Windows checkout 的依赖目录。

旧 R0E/R1A/B 镜像、历史提交和验收记录仍保留其原版本含义。最新源码通过本目录入口回归；复算历史切片时使用相应历史提交及当时工具，不把当前 Rust1.99.1 的结果写回旧验收证据。

## 隔离数据库

入口只接受经原 R0E 容器身份核验的 PostgreSQL15.12（loopback15432），两个新库 `poms_r1c_nest` / `poms_r1c_rust` 及固定 owner-only marker。`environment.sh provision` 创建专用 runtime role、库、schema 和 marker；已有库必须通过标记校验，不自动 reset/drop。`migrate` 使用冻结的原 92 个 Nest migration 类和真实 MikroORM migrator；产品 migration 文件未改变，Rust 不取得 migration 管理权。`catalog` 逐项核对 R0F 10 表 121 字段和两库目录一致性。

owner 凭据仅用于环境核验和初始化。测试使用 `poms_r1c_app`，先检查固定 URL、目标版本/端口/GUC、session/current user、管理权限、role membership 和 schema 权限，再进行合成数据操作。app 无 marker 读取权，由 owner launcher 验证 marker。不能用 PG17 或 TEST 连接串替换此入口。已有 PG17 实例和数据不参与本轮操作。

```bash
bash tools/rust-r1c/environment.sh status
bash tools/rust-r1c/environment.sh catalog
bash tools/rust-r1c/check.sh fetch
bash tools/rust-r1c/check.sh check
bash tools/rust-r1c/check.sh oracles
bash tools/rust-r1c/check.sh crypto-roundtrip
bash tools/rust-r1c/check.sh db
bash tools/rust-r1c/check.sh http-db
bash tools/rust-r1c/check.sh foundation-db
bash tools/rust-r1c/check.sh foundation-system
bash tools/rust-r1c/check.sh openapi
```

`check` 为 fmt、clippy all-targets `-D warnings`、普通 Rust tests 和 release build。数据库 tests 在普通命令下明确标记 ignored，不能计为通过；`db` 才实际执行。`foundation-db` 在原 R0E 验收库使用临时表回归 R1A；`foundation-system` 重新检查启动、健康、信号与日志。`fetch` 保留现有 locked 版本；依赖变更需审阅 Cargo.lock 差异。

## 证据边界

- [密码/密文工具](crypto-README.md)：实际 bcryptjs/Node crypto oracle、旧 R0F witness、Rust→Node 随机密文互解。固定 IV 只用于公开合成测试。
- [会话桥](session-README.md)：原实体、repository、service 与真实 MikroORM，在专用库中双向验证 SQLx 写入；源文件变化和未知依赖拒绝执行。
- `http-oracle.mjs`：真实 Nest/Express socket、原 guards/controller/service、DTO pipe；repository 为 double，时间和熵固定，明确不连接数据库。`--check` 只比较，`--write` 显式刷新。保护 `.env`/deploy/private，拒绝非自有监听端口及额外网络/子进程。
- `http-database.mjs`：两个独立新库分别运行原 Nest HTTP 与 Rust release，使用真实 repository/MikroORM/SQLx；比较响应、Cookie、数据库会话状态与安全事件。动态 token/时间先核验形状、期限和数据库关系再归一，不把 double oracle 当成真实数据库验收。
- `http-openapi.json` 与 `http-profile-fallback.json`：从现有规范/原 DEV_USERS 单向导出的元信息；不能手改，也不证明运行时行为或构成认证种子数据。认证文档保留 OpenAPI3.0 语义，不经 Utoipa3.1 反序列化收窄。
- `projection-oracle.mjs`：原敏感字段策略/投影，记录 audit double；另有真实 PG15 单批事件写入与插入失败传播测试。

所有测试账号、token、密码和文本均为一次性合成输入；真实凭据不进入日志或提交。清理只限定本次 run ID 对应的数据，不清空表、不 reset 数据库。完整业务、外部 provider、浏览器、通用多后端 harness、部署与 migration 接管仍属于后续切片。
