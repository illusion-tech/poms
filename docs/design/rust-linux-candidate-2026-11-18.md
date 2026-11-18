# Rust Linux候选版本

## 当前本地候选

`poms-rust-candidate-02e860ec-bookworm.tar.gz`（68,486,628 字节）对应应用源码 `02e860ecf51464c598cc4468bad5a339d29d6d5b`。正常 release 配置，Rust 1.99.1，使用已有编译缓存离线构建。最高要求 GLIBC 2.34，实际使用提取的 2.36 运行库完成登录、发放列表、最终结算与规则解释读取，核对导出的 298 项操作、243 条路径。

Angular 生产产物沿用 `b49805d5` 已验证构建。两个提交的前端输入一致，并已用 Chromium 156 连接本地新 release 确认「全部结清」与规则解释页面。截图仍显示 PrimeUI 许可提示，测试使用系统回退字体。独立 API 和 PostgreSQL 已停止，原件与失败记录保留。

包内包含本地验证结果，以及此前 TEST 只读快照所列的 10 项迁移。新候选的 TEST ABI 验证、目标迁移和切换均待执行；实施前重新核对目标迁移记录。完整原因与顺序见[当前交付清单](rust-fast-delivery-2026-11-16.md)。

## 首版构建及目标检查记录

应用源码版本：`b07b6b529c020e20a798925a1f82e03684aed021`。本轮完成多合同项目池分摊、真实G净回款判断、管理层独立批准及页面、原始发放/补发的批准合同分摊核对。298项接口、243条路径；完整producer贯穿和业务收口仍待完成，#57/#116保持开放。

正常release配置、Rust1.99.1、离线固定Cargo依赖、两个编译作业，使用单独解压的Debian12开发头文件和库。没有安装或更换主机运行库，没有修改Cargo.toml/lock。正常编译耗时5分39秒；二进制最高必需GLIBC版本为2.34，在2.36环境运行通过。未裁剪的原件和编译日志保留于本机cache，打包使用裁剪符号后的56,730,728字节副本。

本机以实际GLIBC2.36 loader运行release产物，完成健康、CSRF、登录、管理层记录及项目查询，正常停止。目标TEST经只读检查确认是Debian12/x86_64/glibc2.36；候选程序在独立`/tmp/poms-rust-b07b6b52-abi-20261118-01/`中直接执行`--openapi`成功，退出0，没有启动服务或访问目标数据库。目标current仍为`/srv/poms/test/releases/20260804-163850`。

Angular22生产产物已构建；真实Chromium156连接Rust及独立PG，管理层专用角色完成合同选择、确认条件、批准201及历史回读。该角色没有计算、发放或调整权限。上游移交包含明确legacy测试材料，G回款、财务批准及新业务操作走真实处理函数；合成账户不代表人工批准。

2026-11-18后续已在工作分支修复经营协调栈占用与归档表单终态判断，完成有条件完工/闭合、经营重述及核心页面实际联调，见[当前交付清单](rust-fast-delivery-2026-11-16.md)。这两处修复均已包含在本页首段的新候选。此前在 TEST 的直接 ABI 验证适用于 `b07b6b52`。

## 候选包

`poms-rust-candidate-b07b6b52-bookworm.tar.gz`包含：

- `api/poms-api-rust`：已验证的release二进制；`api/openapi.json`为实际导出。
- `admin/browser/`：生产Angular产物；第三方许可说明随包保留。
- `migrations/`和`migrations-up/`：目标当前缺少的10份真实应用迁移，分别为机械转译的JS类及实际up SQL。
- `target-state.json`：只读取得的迁移/表存在性与当前release路径，没有环境变量、凭据或业务行。
- `poms-api-rust-test.ecosystem.config.cjs`：待批准切换使用的PM2候选配置，`autorestart=false`。运行读取现有服务器私有配置；包中不含私有env文件。

迁移清单取自目标实际`MIGRATIONS_TABLE_NAME`配置对应的表，与本次checkout比较。待执行项包括R4合同生命周期、实施/成本、经营生命周期、条件附件、项目初始归属、冻结父锁，以及四份R5结算税额/合同分摊迁移。SQL仅作为逐项审阅材料；应用迁移须由迁移运行器记录，不能绕过版本记录把整个目录直接执行到现有库。

## 切换前剩余工作

按用户2026-11-18本轮明确要求，迁移演练放在功能及页面联调之后、TEST切换之前，不作为继续开发的前置。

1. 当前候选在本地通过普通及有条件完工、共享分摊整批更正、下游提成结算、归档与核心页面联调。已结束期间正例随迁移副本验证，见[当前交付清单](rust-fast-delivery-2026-11-16.md)。
2. 最后在隔离副本演练这10项迁移与应用回退，保留旧数据、未知金额与失败，处理实际数据不满足约束的情况；在演练成功前不修改目标库。
3. 最后审阅具体目标、迁移演练结果、候选包及回退版本，再批准服务切换。新业务记录存在时不自动down删除表列；应用回退必须保留财务和管理层批准历史。

本轮没有执行目标迁移、切换current或重启旧服务。本机独立测试服务均按所属进程停止，原件及失败保留。旧Root/nonce/Main工具与I工作树未使用，不运行pnpm。

## 构建复现

从Windows Git读取实际完整HEAD，并通过`--source-revision`传给WSL构建器。Windows worktree的`.git`指向Windows路径，WSL Git不能直接解释；首次在编译后的元信息阶段因此失败，原日志保留，已有二进制随后经独立运行和目标运行复核，没有重编。

`tools/rust-commission/build-linux-release.py`接受`--packages`、`--output`、`--cargo-home`、`--source-revision`；输出目录必须是新的。所需四份官方amd64包为libc6、libc6-dev、linux-libc-dev、libgcc-s1。当前验证版本为2.36-9+deb12u14、6.1.192-1及12.2.0-14+deb12u1；文件从[Debian libc6](https://packages.debian.org/bookworm/amd64/libc6/download)、[开发头文件](https://packages.debian.org/bookworm/amd64/libc6-dev/download)、[内核用户态头文件](https://packages.debian.org/bookworm/amd64/linux-libc-dev/download)、[libgcc](https://packages.debian.org/bookworm/amd64/libgcc-s1/download)的官方镜像取得。

`inspect-test-target.cjs`只读现有TEST配置与迁移元数据，不载入API入口、不打印凭据或业务内容。`package-candidate.mjs`只生成本地候选包，不执行迁移或部署。
