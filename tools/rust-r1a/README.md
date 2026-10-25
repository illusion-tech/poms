# R1A 固定环境验收入口

先准备 [R0E](../rust-r0e/README.md) 的固定镜像与专用 PG15。原 Windows PG17 的服务、开发测试库及数据目录不在这些命令的操作范围。PG15 仅用于与 TEST PostgreSQL 15.12 的兼容验收。

在普通 WSL 用户的 Linux checkout 中运行：

```bash
bash tools/rust-r1a/check.sh check
bash tools/rust-r1a/check.sh db
bash tools/rust-r1a/check.sh system
bash tools/rust-r1a/check.sh openapi > /tmp/poms-r1a-openapi.json
node tools/rust-r1a/verify-openapi.mjs /tmp/poms-r1a-openapi.json
```

若宿主没有 Node，最后一步也可使用 R0E 构建镜像中的 Node 24.16.0，将 checkout 与输出文件按只读方式挂载后执行。`check` 执行 fmt/clippy/unit tests/release build；`db` 显式运行默认 ignored 的真实数据库测试；`system` 使用镜像中 Node 启动本次持有的子进程，检查 HTTP、退出、配置失败、占用端口和日志。它不按端口查杀进程，也不写入产品数据。

Linux 状态目录固定在 `$HOME/.local/share/poms-r1a`；target/Cargo 缓存与 R0E 分离。首次可复制 R0E Cargo cache 来节省下载，不覆盖 R0E target 或旧源码快照。`lock` 仅用于明确的依赖更新；正常检查始终 `--locked`。`fmt` 为维护命令，验证使用 `check`。

数据库命令先用 R0E `environment.sh status` 核对专用容器 image/scope/volume/loopback 15432，并通过既有本地 owner 连接在 `BEGIN READ ONLY` 中核对归档的数据库 marker UUID，再注入已有受限 app secret。没有给 app 增加 marker 读取权限。真实 DB 测试还要求 `POMS_R1A_DATABASE_TEST=1` 与 `POMS_R1A_DATABASE_TEST_URL`，并在写入前核验 URL、server isolation GUC、版本、身份/权限；不允许默认 poms、5432、管理员、socket、启动参数或 PGOPTIONS。仅 poms_r0e_rust 的 TEMP 表合成数据可写。直接执行 ignored tests 而缺少显式环境将失败，不会静默算通过。

本工具不安装依赖、不升级 PostgreSQL、不初始化完整业务 schema、不执行迁移或 seed、不部署服务。当前完整阶段状态与验收证据见 [R1A 基线](../../docs/design/archive/slices/rust-r1a-application-baseline.md)。
