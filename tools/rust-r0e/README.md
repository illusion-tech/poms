# R0E 本地构建与 PostgreSQL 15 环境

本目录提供独立验证工具。产品后端仍是现有 NestJS 应用；本目录不执行产品 migration、seed 或发布。

## 当前环境

- Windows 原 PostgreSQL 17.4 保留在 5432，原 `poms` 及其他开发测试库可继续用于日常开发；PG15 专用于 TEST 兼容验收，不要求把所有开发工作迁到 PG15。
- Debian WSL 内使用 rootless Podman，专用容器 `poms-r0e-pg15`，卷 `poms-r0e-pg15-data`，仅发布 `127.0.0.1:15432`。Windows 与 WSL loopback 连接均已核验。
- PostgreSQL 15.12 / glibc 2.34，两个独立数据库为 `poms_r0e_nest`、`poms_r0e_rust`；UTF8、libc `en_US.UTF-8`、stored/actual collation 2.34、`Etc/GMT-8`；扩展 `pgcrypto 1.3`、`btree_gist 1.7`。
- 构建镜像 Debian 12 / glibc 2.36 / Rust 1.97.1；Node 24.16.0、pnpm 12.3.4、Corepack 0.35.0、Deno 2.9.1、Java 17.0.21。psql 客户端为 15.19，服务器由独立源码构建固定为 15.12。
- Linux 状态目录为 `/home/wangzishi/.local/share/poms-r0e`。源码快照、Cargo 缓存、target 和日志在此；私有凭据位于其 `private/`，不写入 Git。

镜像 ID、锁文件和验收范围见 [R0E 基线](../../docs/design/archive/slices/rust-r0e-environment-baseline.md)。脚本固定本次已审查镜像 ID。重新构建镜像后须记录新 ID、复核版本与验收，再更新脚本中的 ID；当前 Containerfile 的发行版包仓库不会保证日后重建得到逐字节相同镜像。

## 日常命令

在 Windows PowerShell 中运行；脚本必须由普通 WSL 用户执行。

```powershell
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/environment.sh status
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/environment.sh start
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/environment.sh verify
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/probe.sh build
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/probe.sh run poms_r0e_rust
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/probe.sh run poms_r0e_nest
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/probe.sh guards
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/probe.sh abi
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/probe.sh tools
wsl.exe -d Debian --exec bash /mnt/e/projects/poms/tools/rust-r0e/environment.sh stop
```

`stop` 保留数据卷与凭据；`start` 复用原卷，不重建数据库。首次受控初始化由 `environment.sh provision` 创建两库、owner/runtime 角色、扩展和 `r0e_control.marker`，不创建产品业务表。它不读取根 `.env`，也不接受任意连接目标。完整产品 schema 的初始化仍属于 R1 的受控验证步骤。

管理员是数据库角色 `poms_r0e_owner`；运行角色 `poms_r0e_app` 没有 superuser、CREATEDB、CREATEROLE、BYPASSRLS 或持久 schema CREATE 权限。TEMP 权限供 smoke 使用。容器操作系统用户为 `postgres`（UID 1000），与数据库角色分开。

Rust probe 使用私有 app secret 自动连接，输出不含口令。直接调用二进制时，必须使用专用 `R0E_DATABASE_URL` 与 `R0E_EXPECT_DATABASE`；不接受 5432、其他库、管理员角色、socket、URL startup 参数或继承的 `PGOPTIONS`。SQLx 0.9 启动时默认 UTC；目标身份通过后显式设置 `Etc/GMT-8` 并回读。R1 的连接池须对每条新连接做同样的会话初始化。

## 构建与回收边界

`Containerfile.build` 使用 digest 固定的官方 Rust bookworm 镜像；`Containerfile.pg15` 使用 digest 固定的 UBI9 镜像和 SHA-256 校验的官方 PostgreSQL 15.12 源码。PG 配置启用 OpenSSL，禁用 readline，仅影响 psql 交互编辑；本次 loopback probe 没有认证 TLS 握手行为。

构建入口（在 Debian 中执行，工作目录为本目录的 Linux 快照）为：

```bash
podman --cgroup-manager=cgroupfs build --network=slirp4netns --pull=never -t localhost/poms-r0e-build:1 -f Containerfile.build .
podman --cgroup-manager=cgroupfs build --network=slirp4netns --pull=never -t localhost/poms-r0e-pg15:1 -f Containerfile.pg15 .
```

使用前需拉取 Containerfile 中指定的基础镜像 digest。工具不提供自动删除数据入口，也不执行全局 prune。以后完整回收应先核对本次容器、卷、secret 的名称、scope 标签和记录的 ID，再显式删除这些资源；现有 Windows PG17 不属于回收范围。
