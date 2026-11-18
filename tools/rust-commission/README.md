# 提成模块SQL回归

`emit-test-schema.cjs`读取项目现有migration类，只执行`up()`收集SQL并输出，不连接数据库，也不执行seed或`down()`。使用仓库已有的TypeScript依赖，无须调用pnpm。

默认输出全部migration，供空库初始化。已有独立测试库需要应用具体新增迁移时，可以使用`node tools/rust-commission/emit-test-schema.cjs --only Migration20261117160000_commission_settlement_unknown_tax.ts`；它仍只输出该迁移实际`up()`的SQL，不自动执行数据库操作。

`apps/poms-api-rust/tests/commission_database.rs`使用专用测试库`poms_commission_delivery`、角色`poms_commission_test`和端口`127.0.0.1:25477`。默认ignored，只有显式设置环境变量才执行；请先在自有空测试库中加载上述migration SQL。

```bash
node tools/rust-commission/emit-test-schema.cjs > /path/to/owned-test/schema.sql
psql -X -h 127.0.0.1 -p 25477 -U poms_commission_test \
  -d poms_commission_delivery -v ON_ERROR_STOP=1 -f /path/to/owned-test/schema.sql

POMS_COMMISSION_SQL_TEST=1 \
POMS_COMMISSION_PASSWORD_FILE=/path/to/owned-test/password \
cargo +1.99.1 test --manifest-path apps/poms-api-rust/Cargo.toml \
  --locked --test commission_database -- --ignored --nocapture --test-threads=1
```

测试会通过真实登录、Cookie/CSRF、HTTP路由和SQL事务调用接口，使用随机命名空间创建自有数据，保留数据及失败日志。规则/计算覆盖版本与金额边界、并发重算和审计写入故障回滚；调整覆盖真实财务审批/待办、并发防重复执行、补发、暂停、冲销、累计扣回上限、缺失审批记录及历史金额未知。测试共用专用库中的合成finance_mgr账户，场景之间串行执行；场景内部仍明确测试并发。

发放新增5个场景，与上述2个场景共7个：覆盖首期→二期→尾款→质保金、两种审批入口及其并发、跨重算版本累计余额、暂停后已付款、零金额尾款确认、零质保金、低首付款、未来质保到期日、旧质保已付款及大额小数精度。审批、登记和结算写入中的受控故障验证事务回滚。登记必须对应实际批准记录，不能仅凭approved状态通过。

计算用的已冻结角色、交接/合同条款、经营绑定/评审和离职决策，以及调整场景的已发放primary记录，均属于显式的legacy持久化测试输入，不伪装为新producer产物；这些上游producer的完整集成尚未验收。发放场景本身通过真实Rust接口创建草稿、提交审批、批准与登记。合成审批账户不代表人工财务批准，负例中的无审批状态、缺失金额也不作为业务成功证据。

当时发放实现限定单一有效合同；最新多合同与管理层批准状态见下文2026-11-18记录。

2026-11-17本机使用解压在`/home/wangzishi/.cache/poms-commission-tests-20261117/runtime`中的官方Debian PostgreSQL17.11包及进程局部库路径，独立cluster/data/socket均在该测试目录。系统服务未安装；既有开发库及历史验收环境没有复用。

本轮发放验证：库553、HTTP层18、SQL场景7通过，Clippy及Linux开发二进制构建通过。另在127.0.0.1:29477启动一次真实API进程，通过健康、CSRF、登录与发放列表查询后正常退出。该验证没有进行前端联调或目标TEST部署。日志保留于`apps/poms-api-rust/target/delivery-dependencies/payout-*.log`，实际规范导出为`openapi-linux289.json`。

2026-11-17后续新增冻结争议/变更、离职结论与结算查询7项，累计24项新提成接口。SQL共10个场景，新增3个覆盖：并发争议提交/仲裁与替代冻结整体回滚；离职结论连续换版及并发单current、到账/到期日/争议实时查询、读操作不创建结算快照与敏感税额投影；真实调整执行后的结算刷新及其故障回滚。角色详情会按当前状态给出提交争议动作。组织及上游冻结/移交输入仍是明确的测试数据；legacy替代保持producer_version=0，新producer替代复用既有职责验证与冻结函数，未声称完整producer链路已验收。

首次查询测试发现旧结算税额列不允许NULL，新增迁移与ORM映射修复后，通过真实结算写入验证未知税额仍为NULL，并验证回滚不得把它补成0。新增迁移仅应用于本轮独立库。失败与后续修复日志保留为`r5-tail-sql-01..03.log`、`r5-tail-sql-all-01..02.log`及`r5-tail-tax-migration-01.log`；Rust库554、HTTP层18、SQL10以及相关TypeScript类型检查、ESLint通过。

Clippy和Linux开发build通过，实际`openapi-linux296.json`与完整规范的296项method/path/operationId一致。一次独立真实TCP进程通过登录、发放列表、最终结算和规则解释查询后正常退出，记录为`r5-tail-network-smoke-01.log`；仍不代表目标TEST发布或前端联调完成。

2026-11-18增量已支持冻结合同集合、按不含税金额分配项目池、分别/汇总回款判断，以及独立管理层特例/解除权限。实际回款由G的不可变净额依据读取；不得直接使用receipt_amount含税现金。财务批准冻结原始发放及补发的合同分摊，执行时不能换合同；历史多合同已付款缺少分摊仍返回409。新迁移只在本轮专用库执行。

Rust库557、HTTP18、共享枚举333组及SQL12通过。新增两项SQL场景验证20%/50%净额分钱边界、独立管理层权限、批准不可改写、财务审批独立性、已付跨计算版本分摊、未知历史及“批准B后不得改付A”。多合同完整FK输入仍明确标为legacy，G回款确认、财务审批与新提成操作均走实际Rust处理函数，不代表完整上游producer验收。

当前契约更新使用普通工具，不重跑历史Source/prepare/API/rebind：

```bash
node tools/rust-commission/export-business-contracts.cjs --write
node tools/rust-commission/generate-business-client.mjs --write apps/poms-api-rust/target/delivery-dependencies/new-client-staging
node tools/rust-commission/build-admin.mjs apps/poms-api-rust/target/delivery-dependencies/new-admin-build
```

本机须显式使用已有Node24.19；客户端使用已有Java17和7.20.0 generator缓存，不下载依赖。客户端uniqueItems仍用JSON数组，避免Set序列化为空对象。构建工具从实际project.json生成临时Angular CLI配置，保留每次配置、产物和失败，拒绝覆盖已有配置，直接运行ng build，不调用pnpm或Nx。

Angular生产构建通过，两个现有入口单元套件6项通过。真实Chromium156以只有项目读取、独立管理层权限及敏感读取权限的合成角色完成页面合同选择、条件确认、批准201和历史回读；记录为`commission-manager-browser-02.json`，前次缺少默认浏览器未发出业务命令且保留失败。API与静态页面服务均正常停止。目标Debian12发布及完整producer贯穿仍待完成。

Linux兼容release及本机真实网络检查、目标ABI检查见[候选版本说明](../../docs/design/rust-linux-candidate-2026-11-18.md)。`build-linux-release.py`使用解压的sysroot，不安装宿主包；Windows Git实际HEAD通过`--source-revision`传给WSL，避免解释Windows worktree指针。目标只读元数据确认待执行10项迁移，`inspect-test-target.cjs`不打印凭据或业务行。`package-candidate.mjs`只组装本地已验证产物和实际pending迁移，不部署、不执行迁移。

2026-11-18增加实际正常完工业务链 `r4_native_business_delivery_chain`：新建客户/项目，完成真实合同审批/激活及应收计划、移交本人确认、职责冻结与执行准入，确认G净回款和付款，确认成本阶段、排除关联应付重复计入，生成经营快照/信号并实际审批登记首笔提成，再通过真实本地附件上传/下载走到最终验收、普通完工和归档。账户/组织和通用报价摘要属于测试基础配置，后续业务状态不由SQL伪造；既有12项中的legacy输入仍保持原标签。附件根目录在密码文件所在的自有测试目录下 `r4-native-attachments/<test-user-id>/`，保留文件，不使用默认业务存储目录或外部对象存储。

现共13个SQL/HTTP场景，通过28.44秒，相关集成测试严格Clippy通过。单独主链约5.63秒；这些时间不作Rust/Node性能对比。新增越权、缺证据、陈旧重放及拒绝不新增阶段事实断言。长测试的路由future装箱以避免测试线程栈溢出，未调整后端栈配置。此前输入、断言及栈溢出失败均保留，记录为既有target目录中的 `r4-native-chain-01..14.log`、`r4-functional-sql-all-01.log` 和 `r4-functional-clippy-01.log`。只运行新链可在上方命令的 `--test commission_database` 后增加过滤器 `r4_native_business_delivery_chain`；仍需明确环境变量和 `--ignored --test-threads=1`。