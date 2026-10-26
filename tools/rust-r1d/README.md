# R1D 隔离验证环境

本目录只准备 R1D 的新 PG15 数据副本，配合 [通用 E2E 工具](../e2e/README.md) 与 [客户端工具](../openapi/README.md)。正式范围见 [G1](../../docs/design/archive/slices/rust-r1d-e2e-client-baseline.md)；不执行部署，不连接现有 PG17，不接管 migration。

`environment.sh` 必须由普通 WSL 用户在专用 Linux checkout 运行。它先调用 R0E 的只读身份检查，确认 `poms-r0e-pg15` 的固定镜像、volume、label 和 loopback:15432 绑定，再在容器网络中运行明确操作：

```sh
bash tools/rust-r1d/environment.sh provision
bash tools/rust-r1d/environment.sh migrate
bash tools/rust-r1d/environment.sh env
bash tools/rust-r1d/environment.sh seed
bash tools/rust-r1d/environment.sh status
bash tools/rust-r1d/environment.sh catalog
```

仅允许 `poms_r1d_nest` / `poms_r1d_rust`，R1D owner-only marker 为 `a6510dc4-e988-4cc8-a106-3bb134e36710`。准备入口核 PG15.12 / R0 marker / R1D marker。既有同名库身份不符即失败，不提供 reset/drop。迁移仍由固定原有 92 个 MikroORM migration 执行，seed 仍调用原 DatabaseSeeder；源文件、index 与冻结起点均需一致。其清理逻辑只获准作用于这两个专用库，不能作为普通 E2E 的隐式上游依赖。

`poms_r1d_app` 使用单独随机凭据，无超级用户、创建库/角色、BYPASSRLS、复制、角色成员或 schema CREATE 权限。文件存放于 `$HOME/.local/share/poms-r1d/private`，日志不提交凭据。已有凭据或环境不一致时拒绝静默覆盖。`env` 生成 Nest:4700 / Rust:4701 的专用文件；Windows 从本机私有位置显式指定对应副本，文件不进入 Git。

managed E2E 使用 `managed-environment.cjs`：要求显式 `POMS_ENV_FILE`，校验本切片库/角色/loopback:15432，禁止 DATABASE_URL、DB_NAME、PG/ORM/Node 启动覆盖。文件决定有效 HOST/PORT，子进程只收到允许的系统环境和该文件配置。external 模式跳过此模块，仅验证给定 HTTP origin，不读取 DB 配置。通用模式选择与进程所有权在 `tools/e2e`，本模块是本切片 managed 验收环境的准入规则。

文件键采用精确大写白名单，拒绝Windows大小写别名、loader和未知覆盖；初始化器的working/index/untracked保护覆盖同一完整源集合。`nest-full`会改变固定合成fixture，重复运行前显式调用本目录guarded seed，不能恢复普通E2E的隐式初始化。`verify-external-api.cjs`由独立controller持有服务，在external Jest退出后核ready与同PID存活，再由原owner清理。

```sh
node --test tools/rust-r1d/managed-environment.test.cjs
```

`Containerfile.browser` 从已验收 R1C 镜像派生 Node/Java/Chromium 环境。构建前需核 parent image 为 `ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273`；本轮产物为 `40946b3f8c4be299594da0968be9656f010b2e73df6be115c9555e155528997d`。固定 Playwright1.63.0 / Chromium1243（153.0.8010.12）；Linux浏览器及依赖只进入此镜像，Windows使用单独的 `PLAYWRIGHT_BROWSERS_PATH`，保留旧缓存和系统浏览器。每次运行均核实际版本，安装成功本身不算浏览器验收通过。

构建前还须确认本地`localhost/poms-r1c-build:1`实际解析为上述固定ID，不能仅信任可变tag。本轮Windows同一官方完整Chromium在原私有目录有14001，在新专用Temp缓存通过；未修改系统或官方文件。运行者显式选择已核的cache，四组真实Angular认证证据与失败限定见[机器报告](../../docs/design/rust-r1d-validation.json)。
