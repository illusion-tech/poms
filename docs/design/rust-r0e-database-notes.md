# Rust R0E PostgreSQL 隔离验收方案与证据边界

## 1. 当前状态与授权边界

2026-10-26，**rootless Podman + UBI9/glibc 2.34 + PostgreSQL 15.12 官方源码** 的两库基础验收已通过：SQL smoke、真实 app 角色 SQLx probe、错误目标拒绝和 stop/start marker 保留均有主代理实际执行结果。两个 v2 inventory 也已在独立 Linux checkout 通过复算。完整环境、构建和执行证据以 [R0E 环境基线](rust-r0e-environment-baseline.md) 为准，第 6 节列出本文对应结果。

构建环境另用 Debian 12/glibc 2.36。数据库服务与 Rust 构建容器分开记录，不能用构建容器的 glibc 推断数据库排序行为；这些通过结果不代表产品 schema、完整 locale 或业务迁移已获认证。

本切片新增 [pg-smoke.sql](../../tools/rust-r0e/pg-smoke.sql) 和本文。初版研究阶段由本文作者只读核实方案、编写模板；后续环境安装/启停、建库、数据库验证与 TEST 元数据查询均由主代理执行。本文作者没有另连数据库，也未修改 Windows PostgreSQL 17.4 或其数据。文中保留的初始 guard 拒绝属于历史过程，不再作为当前待办。

| 项目                     | 主代理提供的 TEST 基线        | 本地隔离验收目标                                                   |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------ |
| PostgreSQL               | 15.12                         | 精确 `server_version_num = 150012`                                 |
| Encoding / provider      | UTF8 / libc                   | UTF8 / `datlocprovider = c`                                        |
| LC_COLLATE / LC_CTYPE    | en_US.UTF-8                   | 两库创建时显式设 en_US.UTF-8                                       |
| stored collation version | 2.34                          | stored 与 actual 均须为 2.34                                       |
| actual collation version | 2.34，主代理已只读核实        | 两库 stored / actual 均已核实为 2.34                               |
| 初始 session TimeZone    | Etc/GMT-8                     | Etc/GMT-8，即 UTC+08；不改成同义名称后掩盖元数据差异               |
| 扩展                     | pgcrypto 1.3 / btree_gist 1.7 | 精确版本并验证 digest/GiST 行为                                    |
| DB 服务器 OS / locale 包 | 未核实                        | UBI9 的实际 OS、RPM 与 locale 文件独立留证；不宣称与 TEST 完整相同 |
| DB / schema              | 真实 TEST 库不用于写验收      | `poms_r0e_nest`、`poms_r0e_rust`；各自 `poms` schema               |
| owner / runtime          | 本轮不调整 TEST 角色          | `poms_r0e_owner` / `poms_r0e_app`                                  |
| 管理执行者 / 端口        | 本轮不调整 TEST 服务          | 数据库管理员 poms_r0e_owner；容器与宿主均 15432                    |
| 隔离标记                 | 不在 TEST 设置                | `poms.r0e_isolated=on` 为 smoke 强制前置                           |

两个数据库属于同一专用隔离集群，但数据与 schema 分开；它们不是正式环境的数据副本。通过基础 smoke 只证明环境与合成约束样本，不代表已运行 POMS 全部迁移、ORM/SQLx 对照或 R1–R6 业务验收。

## 2. 官方镜像与源码方案比较

Docker 的 `postgres` 是 Docker Official Image，由 PostgreSQL Docker Community 维护，并非 PostgreSQL 上游发布的独立“官方服务器镜像”。其仓库明确说明这一来源边界。[镜像维护仓库](https://github.com/docker-library/postgres)

历史固定提交 `807e218040cfae401cb0ed2e866a1efe9d6cc48d` 将 15 更新为 15.12。这里核实的是镜像配方；没有在本研究中拉取镜像、核实 registry manifest 或杜撰 digest。[固定提交](https://github.com/docker-library/postgres/commit/807e218040cfae401cb0ed2e866a1efe9d6cc48d)

| 路径                        | 固定来源能证明什么                                                                                           | 对本次的适用性                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `postgres:15.12-bookworm`   | 历史 Dockerfile 基于 `debian:bookworm-slim`，PG 包为 `15.12-1.pgdg120+1`；Debian bookworm libc6 为 2.36 系列 | 可做 PG15 基础验证，但不能认证 TEST collation 2.34 目标    |
| `postgres:15.12-bullseye`   | 同一提交的配方基于 Debian bullseye，PG 包为 `15.12-1.pgdg110+1`                                              | 没有建立 2.34 对齐依据，不作为选定环境                     |
| `postgres:15.12-alpine3.21` | 同一提交基于 Alpine，源码版本和 SHA 固定                                                                     | libc 实现与 libc/glibc 目标不同，不用于本轮排序规则对照    |
| UBI9 + 校验 PG15.12 源码    | 由我方冻结基础镜像 digest、RPM/locale 清单、源码 SHA、configure 参数与最终镜像                               | 已选；能复现版本/环境输入，但需保留相对未知 TEST OS 的差异 |

来源：[bookworm 配方](https://raw.githubusercontent.com/docker-library/postgres/807e218040cfae401cb0ed2e866a1efe9d6cc48d/15/bookworm/Dockerfile)、[bullseye 配方](https://raw.githubusercontent.com/docker-library/postgres/807e218040cfae401cb0ed2e866a1efe9d6cc48d/15/bullseye/Dockerfile)、[Alpine 配方](https://raw.githubusercontent.com/docker-library/postgres/807e218040cfae401cb0ed2e866a1efe9d6cc48d/15/alpine3.21/Dockerfile)、[Debian bookworm libc6](https://packages.debian.org/bookworm/libc6)。

RHEL9 的系统 glibc 基线为 2.34；UBI 提供标准/精简等不同镜像形态。本轮实际基础为 `registry.access.redhat.com/ubi9/ubi@sha256:e9a31af6530caffa3551f266c51a0d43b602e8f76a0dc12826dbeebceb487c92`，PG 镜像 ID 为 `b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a`；实际 OS 为 UBI 9.7，glibc/locale 包为 `2.34-283.el9_8`，见 [Containerfile.pg15](../../tools/rust-r0e/Containerfile.pg15) 和 R0E 环境基线。[RHEL9 系统工具链](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/overview)、[UBI 镜像类型](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_types-of-container-images_building-running-and-managing-containers)

**glibc 2.34 不足以证明完整排序等价。** PostgreSQL 文档明确说明 glibc 版本只是 collation version 的代理，发行版维护者可能回移新排序定义而不改变 glibc 主版本。因此 actual/stored 均为 2.34 是必要的环境检查，但仍需保留发行版、glibc/locale RPM 的实际修订与合成排序结果。不能通过 `ALTER DATABASE ... REFRESH COLLATION VERSION` 把不匹配“修成通过”；该操作只是更新记录，不证明相关索引已正确重建。[PostgreSQL 15 collation 版本说明](https://www.postgresql.org/docs/15/sql-altercollation.html)

## 3. 精确源码构建与可复现层次

### 3.1 固定 PostgreSQL 输入

- 官方归档：[v15.12 source](https://ftp.postgresql.org/pub/source/v15.12/)。
- 源码文件：`postgresql-15.12.tar.bz2`，SHA-256：`3bc8462a38ca0857270cc88b949a3f6659f0d5c44c029c482355835b61a0f6f7`。[官方 checksum](https://ftp.postgresql.org/pub/source/v15.12/postgresql-15.12.tar.bz2.sha256)
- 同版本源码 control：pgcrypto 的 default_version 为 1.3，btree_gist 为 1.7，恰与 TEST 提供基线一致。[pgcrypto.control](https://raw.githubusercontent.com/postgres/postgres/REL_15_12/contrib/pgcrypto/pgcrypto.control)、[btree_gist.control](https://raw.githubusercontent.com/postgres/postgres/REL_15_12/contrib/btree_gist/btree_gist.control)

在固定 UBI9 镜像中安装构建所需的 C 编译器、GNU make、解压工具、OpenSSL/zlib 开发库与英文 locale 数据；具体 RPM 版本由实际构建清单记录。`pgcrypto` 必须有 OpenSSL 支持。PG15 的现行 configure 写法为 `--with-ssl=openssl`，`--with-openssl` 是旧等价别名；本轮实际采用后者并指定 `--without-readline`，只关闭 psql 的交互编辑能力。[PG15 构建要求](https://www.postgresql.org/docs/15/install-requirements.html)、[configure 与安装过程](https://www.postgresql.org/docs/15/install-procedure.html)、[pgcrypto OpenSSL 要求](https://www.postgresql.org/docs/15/pgcrypto.html)

下列片段说明已选源码校验与安装流程；实际执行由主代理的 Containerfile/构建记录负责，prefix 和 configure 参数与本次产物一致：

```sh
# Before this fragment: pin UBI9 by digest and record installed RPM NEVRAs.
curl --fail --location --output postgresql-15.12.tar.bz2 \
  https://ftp.postgresql.org/pub/source/v15.12/postgresql-15.12.tar.bz2
printf '%s  %s\n' \
  3bc8462a38ca0857270cc88b949a3f6659f0d5c44c029c482355835b61a0f6f7 \
  postgresql-15.12.tar.bz2 | sha256sum --check --strict
tar -xjf postgresql-15.12.tar.bz2
cd postgresql-15.12
./configure --prefix=/opt/pgsql --with-openssl --without-readline
make -j2
make install
make -C contrib/pgcrypto
make -C contrib/pgcrypto install
make -C contrib/btree_gist
make -C contrib/btree_gist install
```

选择只编译所需 contrib，不使用未固定的系统 PostgreSQL server 包；`make install` 本身不等于已安装全部 contrib。也可以依官方文档使用 `world-bin/install-world-bin`，但应记录更大的模块范围与依赖差异。

### 3.2 必须留存的环境证据

1. 基础镜像完整 repository digest、平台/架构及最终镜像 ID/digest；实际构建日志与 Containerfile hash。
2. `rpm -q` 的 glibc、glibc-common、glibc-langpack-en（及实际 locale 包）、openssl、readline、zlib、编译器清单；`ldd --version`、`locale -a`、`locale -k LC_COLLATE`；locale 文件及 `/usr/lib/locale/locale-archive` 存在时的 hash。
3. 已安装 `/opt/.../bin/postgres --version`、`pg_config --configure`、`ldd postgres`，确认没有从 Debian12 构建容器复制依赖 glibc2.36 的 server 二进制到 UBI9。
4. 使用独立 named volume/数据目录和非 root 的 Linux `postgres` 用户初始化，`initdb --username=poms_r0e_owner` 指定数据库管理员；显式 UTF8/libc/en_US.UTF-8。专用集群端口 15432，自定义隔离 GUC，session TimeZone Etc/GMT-8；不能挂载 Windows PG17 的数据目录。此身份与 `pg-entrypoint.sh`、`provision.sql`、`provision-database.sql` 一致。
5. 两个全新数据库从 template0 创建，owner 为 poms_r0e_owner；其 poms schema 由同 owner 持有；扩展安装在 public 或 poms，smoke 显式检查实际 schema。
6. 运行角色 poms_r0e_app 具有 CONNECT/TEMP 与 poms/public USAGE 以及后续业务所需 DML；不得因基础 probe 给 runtime 持久 DDL、SUPERUSER、CREATEDB、CREATEROLE 或 BYPASSRLS。

`initdb` 不能作为 root 运行，数据库 locale 创建后不可用普通 SET 改写。[initdb](https://www.postgresql.org/docs/15/app-initdb.html)、[CREATE DATABASE locale/provider](https://www.postgresql.org/docs/15/sql-createdatabase.html)

固定基础镜像 digest 但使用漂移的 RPM 仓库，只能称为“可重复执行构建步骤 + 已留存本次产物”，不能保证未来得到同一输入。需要长期重建时，保存本次 RPM/仓库元数据或使用经核实的仓库快照，并导出最终镜像与 sha256；只有 PostgreSQL tarball hash 不能证明整个镜像可重建，更不自动证明二进制字节一致。

## 4. smoke SQL 的使用合同

[pg-smoke.sql](../../tools/rust-r0e/pg-smoke.sql) 由主代理通过已核验的 [environment.sh](../../tools/rust-r0e/environment.sh) 执行；每个库使用独立 `psql -X` 会话，`ON_ERROR_STOP` 启用。实际入口固定容器/镜像/卷身份、端口和两个数据库，不通过全局默认连接定位数据库：

```sh
bash tools/rust-r0e/environment.sh status
bash tools/rust-r0e/environment.sh verify
```

上述入口本轮已执行并获得第 6 节的两库结果。后续复用时仍须核实本次专用实例，不得关闭前置断言来接受环境差异。

SQL 会在任何 probe DDL 前检查：数据库严格属于两个允许名；PG150012；服务端 port15432；隔离 GUC on；session/current user 为 poms_r0e_owner 管理员；UTF8/libc/LC_COLLATE/LC_CTYPE、stored/actual2.34 与初始 TimeZone；DB/schema owner；两扩展精确版本。任何不符立即失败。

通过前置后，SQL 在一个事务中 `SET LOCAL ROLE poms_r0e_app`。这按运行角色检查权限，且事务回滚后恢复管理员角色；SQL smoke 单独不能证明该角色的密码/SCRAM/TCP 登录路径，本轮另外通过真实 app 连接 probe 完成该基础验证，见第 6 节。[SET ROLE 的权限含义](https://www.postgresql.org/docs/15/sql-set-role.html)

### 4.1 合成验收覆盖

| 项目                     | 验证方法                                                                                    | 证据限制                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 数据库/端口/隔离         | 硬性 metadata/GUC/role 断言                                                                 | GUC 本身不是安全边界，仍须专用集群/volume 与明确连接目标                                             |
| runtime schema 边界      | TEMP/USAGE 必须存在，persistent CREATE 必须不存在                                           | 不创建或查询 poms 业务表；DML 权限需后续 migration/业务测试                                          |
| pgcrypto                 | 对合成 abc 计算 SHA-256，核对已知 digest                                                    | 不认证应用密码哈希或 v1 密文格式                                                                     |
| UUID / version / current | UUID 主键、业务 version unique、partial unique、supersedes FK、显式 row_version CAS         | CAS 是单会话条件更新基础检查，不是双连接并发验收                                                     |
| GiST 排斥                | active 同 key 闭区间相交必须 23P01，次日区间和 superseded 重叠允许                          | 验证 btree_gist 真实可用，不代替完整成本率业务用例                                                   |
| numeric                  | 18,2 / 15,4 / 18,8、正负 tie rounding、尾零/NULL、精确加法、22003 overflow                  | 数据库原生 numeric 语义，不是批准改变旧 JS number/toFixed 行为                                       |
| date / timestamptz       | +08/UTC 跨日、date 不变、Etc/GMT-8 offset=28800                                             | 不能代替应用 Asia/Hong_Kong 与字符串 slice 分支兼容测试                                              |
| JSON                     | JSON null、缺 key、SQL NULL、空对象与 number                                                | 不认证所有 snapshot 字段与业务解释                                                                   |
| lower 与排序             | ASCII lower 表达式唯一；固定中英/重音字面量排序 fingerprint                                 | 记录候选环境结果；即便有限样本与 TEST 相同也不证明全量 collation 等价                                |
| rollback                 | SAVEPOINT 插入回滚；最终 ROLLBACK、TEMP 表消失、poms/public relation catalog signature 不变 | catalog signature 只覆盖关系身份，不证明任意第三方会话没有改业务数据；隔离实例验收时不得并发运行迁移 |

PostgreSQL numeric 对超出 scale 的值舍入，tie 向远离零方向处理；smoke 的 `1.005 -> 1.01` 等预期来自 DB 类型语义，不能与旧 JavaScript 的 `Number(...).toFixed(...)` 输出混为一谈。[PG15 numeric](https://www.postgresql.org/docs/15/datatype-numeric.html)

SQL 只查询系统目录或自建 TEMP 行，所有 probe 数据与 DDL 最终回滚。它不做 CREATE EXTENSION、数据库 provision、业务迁移、清理现有对象或持久 fixture marker。失败时 `ON_ERROR_STOP` 使会话退出，未提交 probe 事务由数据库回滚。

### 4.2 排序样本与 TEST 只读比较

主代理已在获准的 TEST 元数据会话中单独执行以下纯字面量查询，不读取业务行；结果与本地两库输出一致，见第 6 节。本文件作者未另连 TEST：

```sql
SELECT array_agg(value ORDER BY value COLLATE "default", value COLLATE "C") AS synthetic_sort_order,
       md5(string_agg(value, E'\n' ORDER BY value COLLATE "default", value COLLATE "C")) AS synthetic_sort_md5
FROM (VALUES ('a'), ('A'), ('á'), ('ä'), ('Z'), ('中'), ('文'), ('ss'), ('ß'), ('İ'), ('i')) AS fixture(value);
```

### 4.3 重启与持久性分开验收

TEMP 回滚不能证明 volume 重启持久性。本轮由主代理在两个新库的专用 `r0e_control.marker` 提交 `database_name`、`instance_id`、`created_at` 合成记录；stop/start 同一容器/volume 后，两条 marker 的 UUID 和 created_at 均未改变，详见第 6 节。没有借此读取 POMS 业务表或让 runtime 获得整个 schema 的 CREATE。marker 由 provision/运维入口管理，smoke 不代行创建或清理。

## 5. 当前完成范围与后续边界

- 已完成：官方来源核验、镜像/源码方案比较与固定产物、两库 metadata/SQL smoke、独立 app SQLx 正例与四类错误目标负例、stop/start marker 保留、Windows/Linux v2 inventory 独立复算，以及 guard 修复的非作者复审；执行证据由主代理记录。
- 本文作者负责方案、SQL 与文档编写、离线清单规范化及非作者源码审查；没有另行安装/启停环境或连接数据库。已完成的实际环境操作和结果由主代理记录在第 6 节。
- 保留的兼容边界：TEST 数据库发行版/locale 包补丁没有据此推断为 UBI 相同，有限排序样本不代表全 locale；产品 schema/全部历史迁移、业务规则与 R1–R6 集成仍由后续切片验收。
- R0E 的 G3/G4 状态与归档/提交以环境基线和任务状态为准；本文不提前标记父任务完成。
- 继续保持 Windows PG17.4/已有数据、TEST schema/业务行及正式环境不变；没有性能或吞吐实测。

## 6. 本轮执行结果补录

以下依据主代理在 2026-10-26 的真实执行结果和 [R0E 环境基线](rust-r0e-environment-baseline.md) 收口；本文作者没有另行连接 TEST 或隔离数据库。早期 guard 拒绝与后续修复分开记录，当前完成范围以本节为准。

| 证据                                    | 本轮结果                                                                                                                                           | 可使用的结论                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `poms_r0e_nest` 管理员执行 pg-smoke.sql | PASS；切到 poms_r0e_app 后 TEMP/低权限、pgcrypto、partial/business unique、CAS、FK、GiST、numeric、date/JSON、SAVEPOINT 与最终回滚均通过           | 此库已完成合成基础 DB smoke                                        |
| `poms_r0e_rust` 管理员执行 pg-smoke.sql | 同上 PASS                                                                                                                                          | 此库已完成同一组基础 DB smoke                                      |
| 两个隔离库与 TEST locale 版本           | 两个隔离库 stored / actual 均为 2.34；TEST actual 也已由主代理只读核实为 2.34                                                                      | 满足 collation proxy 前置；不消除未知 TEST OS/locale 包修订差异    |
| 两库与 TEST 的第 4.2 节字面量排序样本   | 三方 `synthetic_sort_md5` 同为 `d66142528ed50eca27104827cdf9e6a2`；TEST 为仅读 VALUES 与 metadata                                                  | 该有限合成样本一致，不认证所有 locale 定义、业务索引或数据         |
| 停止/重启及 r0e_control marker          | PASS；nest `80287e39-abf5-4c2f-b514-79c08816b29d`、rust `f055884e-5eaf-44ad-a51e-ab9d3a2627ff`；两库 UUID 与 created_at 在 stop/start 前后完全不变 | 专用卷与已提交合成 marker 的重启持久性已验证                       |
| 最终独立依赖 probe 正例                 | PASS；同一最终 release 在纯 Debian 12 运行镜像分别用真实 app 角色连接两库；WSL host 路径也通过                                                     | 固定样本的 HTTP/Serde/Utoipa/SQLx 类型映射与回滚可运行             |
| 最终身份/目标 guard 负例                | PASS；5432、已有 `poms` 库、owner 用户、继承 PGOPTIONS 四类输入均被拒绝                                                                            | 对这些错误目标/身份 fail-closed；不对其他业务安全路径作推断        |
| Windows/Linux v2 inventory 复算         | PASS；主代理在独立 Linux checkout 的 Debian12 构建镜像，用 Node 24.16.0 / TypeScript 6.0.3 执行两个 v2 `--check`，均与 Windows 冻结结果一致        | CRLF→LF 文本规则可跨 checkout 复算；没有放宽固定 HEAD/source guard |

本次 SQL 文件在管理员身份统一为 `poms_r0e_owner` 后的 SHA-256 为 `9f44697169c114cbcdb44153871ec0e2995bd989c1751d21486bdbde7841ea09`。第一次使用旧管理员 guard 的执行在 probe DDL 之前被拒绝；纠正身份后重新执行获得上述 PASS，不将首次拒绝隐藏或误标为数据库能力失败。

独立依赖 probe 的类型映射与会话时区另行审查：`Decimal`/`Option<Decimal>`、`NaiveDate`、`DateTime<Utc>`、`Uuid`、`Json<Value>` 对应其 TEMP 表类型，数值相等与 Serde 投影同时比较，适合作为固定依赖样本。SQLx 0.9.0 的官方实现确实在 startup 发送 `TimeZone=UTC`；保留驱动初始值，再在确认隔离目标后显式设置该连接为 `Etc/GMT-8` 是会话合同初始化，不是修改/证明服务器默认。R1 若使用连接池，应对每条新连接初始化，而不是仅执行一次。[SQLx 0.9.0 startup 源码](https://raw.githubusercontent.com/launchbadge/sqlx/v0.9.0/sqlx-postgres/src/connection/establish.rs)

本轮非作者审查发现依赖 probe 的运行角色 guard 最初未独立断言实际 session/current user 和低权限状态，已反馈主代理。另一个作者完成修复后，本文作者复审 `main.rs` SHA-256 `0261fb1f9bb8e715d0eee660d68e769c044312644949197655737580fafcc30e`：连接前必须为 app 用户、无 socket/继承 PGOPTIONS；metadata 必须为 app 的 session/current identity 且四项高权限标志均 false，所有检查位于 SET TIME ZONE 与 TEMP 写入之前。对应最终 release 二进制 SHA-256 为 `f766df98d876158b62f7116eb0968bbf72653c1d34996d9ea97a1a743f1b4c61`；主代理已重新构建，并完成上述两库/host 正例与四类负例。原 P2 已以非作者静态复审加真实运行证据关闭，本文作者没有修改 probe 源码。

跨平台清单的 v2 规范化文本 SHA-256 已固定：DB JSON 为 `4796b8a0eca31f6d59e7d36d3de5a2653ab2ab4dc5d818346c0ebe3de965cbc3`，API JSON 为 `a044a5c9b0ecbd9dd0f28c92fd6e7237bf69645c2160c73c295e363e0d756fac`。两个工具仅在 UTF-8 文本读入时将 CRLF 改为 LF，保留 BOM/裸 CR/Unicode 与显式转义语义；v1/v2 业务集合与统计不变。原始字节口径和新规范化文本口径分别保留，不能把 hash 变化误报成业务数据变化。

上述通过范围均不包含产品 schema 初始化、全部 92 个 migration 执行、旧写新读/新写旧读、业务金额规则、连接池、会话/权限全链路、真实外部服务或性能。原有 Windows PG17 与正式/TEST 业务行没有因这些合成验收取得写入授权。
