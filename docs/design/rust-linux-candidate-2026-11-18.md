# Rust Linux候选版本

## 当前本地候选

`poms-rust-candidate-02e860ec-bookworm.tar.gz`（68,486,628 字节）对应应用源码 `02e860ecf51464c598cc4468bad5a339d29d6d5b`。正常 release 配置，Rust 1.99.1，使用已有编译缓存离线构建。最高要求 GLIBC 2.34，实际使用提取的 2.36 运行库完成登录、发放列表、最终结算与规则解释读取，核对导出的 298 项操作、243 条路径。

Angular 生产产物沿用 `b49805d5` 已验证构建。两个提交的前端输入一致，并已用 Chromium 156 连接本地新 release 确认「全部结清」与规则解释页面。截图仍显示 PrimeUI 许可提示，测试使用系统回退字体。独立 API 和 PostgreSQL 已停止，原件与失败记录保留。

包内包含本地验证结果和 10 项迁移。候选已在 TEST 验证 ABI 后用于发布 `20261119-230100`，并通过 HTTPS 就绪、CSRF 和首页检查。数据库 10 项迁移均已应用，累计 102 项。旧应用 `20260804-163850` 保留用于回退。详见 [交付清单](rust-fast-delivery-2026-11-16.md)。

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

## TEST 回退与业务样本

隔离迁移与回退演练已经通过。旧应用可在迁移后的副本读取同一历史项目。应用回退保留迁移后的数据库和已经产生的业务记录。

2026-11-20 核对 TEST 本库和两份既有备份，缺少合格的关账依据与实付记录。在 TEST 隔离副本以临时权限读取现存历史项目，`2026-W46` 返回 `period_baseline_reconciliation_required` 且未开放关账，发放列表为空。临时权限已撤销，隔离进程已停止。

同日用 TEST 同版本 Rust `02e860ec` 和独立 PostgreSQL 补验成功路径。验收方通过业务接口准备测试合同、移交依据、回款、成本及提成审批和登记。隔离进程模拟 `2026-11-23 00:01`（香港时间）。`2026-W47` 周关账返回 HTTP 201，快照 `0ef018b4-3c3b-46e8-b522-a9b09d1991f0` 的 API 读回与独立库记录一致。关账前后均读到三笔测试实付 1,200 元、2,825 元、1,725 元，总计 5,750 元，结算状态为 `settled-all`。原始请求结果保存在 Debian 独立测试目录 `~/.cache/poms-commission-tests-20261117/period-accept-20261120-02/`。

同日使用独立 PostgreSQL 副本，复用同一 `2026-W47` 关账快照完成 #114 本轮验收。快照对应的成熟度为 `mature`，定性风险因重要性未复核保留 `unknown`。首次、二次、最终、质保四阶段均能读回历史反馈依据。对历史经营信号和历史阶段发起复核，均返回 HTTP 409。经营总览、统一核算、偏差风险和经营反哺均指向同一当前快照。

Chromium `156.0.8078.4` 提交一次实时质保阶段复核，HTTP 200，复核记录 `8c2cf0b3-720f-4f07-a4c8-edc18e9abacb`。重新打开页面并读回独立库，已确认状态与新摘要一致。在副本临时撤去财务敏感字段权限后，金额、原因依据和后续动作文本脱敏，复核写入返回 HTTP 403。测试权限已恢复。原期末记录、实时快照引用及合计 5,750 元的三笔测试提成实付登记与验收前一致。

浏览器提交与回读证据分别保存在 `apps/poms-api-rust/target/delivery-dependencies/period-evaluation-20261120-03/browser.json` 和 `apps/poms-api-rust/target/delivery-dependencies/period-evaluation-20261120-04/result.json`，对应的 Debian 隔离运行目录保留完整响应和失败记录。详见 [#111](https://github.com/illusion-tech/poms/issues/111)、[#112](https://github.com/illusion-tech/poms/issues/112) 和 [#114](https://github.com/illusion-tech/poms/issues/114)。

Swagger 的 `/api-docs/`、`/api-docs-json` 和 `/api-docs-yaml` 已恢复。静态文档取自实际 Rust 发行二进制导出的规范，Chromium 实际渲染 298 项操作。候选打包把文档放入 `admin/browser/.swagger`，Nginx 与对应版本的静态页面一同提供文档。

### 已关期间重述与首次角色冻结

在隔离副本沿用 `2026-W47` 的原关账快照。通过业务接口补录、确认并归属一笔业务日期为 `2026-11-18` 的 1,000 元费用。服务端确认同一费用影响已关期间和实时两项，漏报实时目标时返回 HTTP 409。对完整请求在写入最终回执时注入故障，接口返回 HTTP 500，提交前后核对快照、头指针、成本分类、评价、阶段绑定、审计及回执等业务记录一致。关闭故障开关后，同一业务请求返回 HTTP 201，期末和实时重述在同一批次保存。原期末冻结与原提成实付登记保留，W47 成本由 71,250 元变为 72,250 元，截止日仍为 `2026-11-22`。期末重述为 `dfdf3ae8-c796-499b-b295-742683874bcb`，实时反馈读到新的实时快照。

#117 沿用已验证的同人多职责和精确权重，新增 `r4_native_initial_role_freeze_boundaries` 单独覆盖首次冻结。跨项目角色请求返回 HTTP 404，替换移交摘要返回 HTTP 409，审计写入失败后草稿、冻结数据、摘要及字段完整回滚。并发同版本请求一次返回 HTTP 200，一次返回 HTTP 409，最终只生成一套有效冻结。通过实际执行准入读回该冻结。

完整响应与失败在 Debian 的 `~/.cache/poms-commission-tests-20261117/period-restate-20261120-01/` 至 `period-restate-20261120-03/`，首次冻结专项结果及日志在 `~/.cache/poms-commission-tests-20261117/role-freeze-20261120-02/`。本轮 TEST 业务验收状态见 [#114](https://github.com/illusion-tech/poms/issues/114)、[#111](https://github.com/illusion-tech/poms/issues/111) 和 [#117](https://github.com/illusion-tech/poms/issues/117)。

## 构建复现

从Windows Git读取实际完整HEAD，并通过`--source-revision`传给WSL构建器。Windows worktree的`.git`指向Windows路径，WSL Git不能直接解释；首次在编译后的元信息阶段因此失败，原日志保留，已有二进制随后经独立运行和目标运行复核，没有重编。

`tools/rust-commission/build-linux-release.py`接受`--packages`、`--output`、`--cargo-home`、`--source-revision`；输出目录必须是新的。所需四份官方amd64包为libc6、libc6-dev、linux-libc-dev、libgcc-s1。当前验证版本为2.36-9+deb12u14、6.1.192-1及12.2.0-14+deb12u1；文件从[Debian libc6](https://packages.debian.org/bookworm/amd64/libc6/download)、[开发头文件](https://packages.debian.org/bookworm/amd64/libc6-dev/download)、[内核用户态头文件](https://packages.debian.org/bookworm/amd64/linux-libc-dev/download)、[libgcc](https://packages.debian.org/bookworm/amd64/libgcc-s1/download)的官方镜像取得。

`inspect-test-target.cjs`只读现有TEST配置与迁移元数据，不载入API入口、不打印凭据或业务内容。`package-candidate.mjs`只生成本地候选包，不执行迁移或部署。
