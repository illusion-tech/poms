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

当前发放实现限定匹配冻结基线的单一有效合同，多合同项目返回409。低首付款首期仅使用10%/15%保守上限，不自动解锁20%/25%/30%。最终结算/规则解释查询及调整后的结算刷新已实现；完整上游producer贯穿和前端联调仍待完成。

2026-11-17本机使用解压在`/home/wangzishi/.cache/poms-commission-tests-20261117/runtime`中的官方Debian PostgreSQL17.11包及进程局部库路径，独立cluster/data/socket均在该测试目录。系统服务未安装；既有开发库及历史验收环境没有复用。

本轮发放验证：库553、HTTP层18、SQL场景7通过，Clippy及Linux开发二进制构建通过。另在127.0.0.1:29477启动一次真实API进程，通过健康、CSRF、登录与发放列表查询后正常退出。该验证没有进行前端联调或目标TEST部署。日志保留于`apps/poms-api-rust/target/delivery-dependencies/payout-*.log`，实际规范导出为`openapi-linux289.json`。

2026-11-17后续新增冻结争议/变更、离职结论与结算查询7项，累计24项新提成接口。SQL共10个场景，新增3个覆盖：并发争议提交/仲裁与替代冻结整体回滚；离职结论连续换版及并发单current、到账/到期日/争议实时查询、读操作不创建结算快照与敏感税额投影；真实调整执行后的结算刷新及其故障回滚。角色详情会按当前状态给出提交争议动作。组织及上游冻结/移交输入仍是明确的测试数据；legacy替代保持producer_version=0，新producer替代复用既有职责验证与冻结函数，未声称完整producer链路已验收。

首次查询测试发现旧结算税额列不允许NULL，新增迁移与ORM映射修复后，通过真实结算写入验证未知税额仍为NULL，并验证回滚不得把它补成0。新增迁移仅应用于本轮独立库。失败与后续修复日志保留为`r5-tail-sql-01..03.log`、`r5-tail-sql-all-01..02.log`及`r5-tail-tax-migration-01.log`；Rust库554、HTTP层18、SQL10以及相关TypeScript类型检查、ESLint通过。

Clippy和Linux开发build通过，实际`openapi-linux296.json`与完整规范的296项method/path/operationId一致。一次独立真实TCP进程通过登录、发放列表、最终结算和规则解释查询后正常退出，记录为`r5-tail-network-smoke-01.log`；仍不代表目标TEST发布或前端联调完成。
