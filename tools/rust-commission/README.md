# 提成模块SQL回归

`emit-test-schema.cjs`读取项目现有migration类，只执行`up()`收集SQL并输出，不连接数据库，也不执行seed或`down()`。使用仓库已有的TypeScript依赖，无须调用pnpm。

`apps/poms-api-rust/tests/commission_database.rs`使用专用测试库`poms_commission_delivery`、角色`poms_commission_test`和端口`127.0.0.1:25477`。默认ignored，只有显式设置环境变量才执行；请先在自有空测试库中加载上述migration SQL。

```bash
node tools/rust-commission/emit-test-schema.cjs > /path/to/owned-test/schema.sql
psql -X -h 127.0.0.1 -p 25477 -U poms_commission_test \
  -d poms_commission_delivery -v ON_ERROR_STOP=1 -f /path/to/owned-test/schema.sql

POMS_COMMISSION_SQL_TEST=1 \
POMS_COMMISSION_PASSWORD_FILE=/path/to/owned-test/password \
cargo +1.99.1 test --manifest-path apps/poms-api-rust/Cargo.toml \
  --locked --test commission_database -- --ignored --nocapture
```

测试会通过真实登录、Cookie/CSRF、HTTP路由和SQL事务调用接口，使用随机命名空间创建自有数据，保留数据及失败日志。规则/计算覆盖版本与金额边界、并发重算和审计写入故障回滚；调整覆盖真实财务审批/待办、并发防重复执行、补发、暂停、冲销、累计扣回上限、缺失审批记录及历史金额未知。

计算用的已冻结角色和调整用的已发放primary记录属于显式的持久化测试输入，保留其legacy身份；这不验证角色冻结producer或尚未实现的发放producer。负例中的无审批状态、缺失金额是专用测试库中的故障数据，不作为业务成功证据。

2026-11-17本机使用解压在`/home/wangzishi/.cache/poms-commission-tests-20261117/runtime`中的官方Debian PostgreSQL17.11包及进程局部库路径，独立cluster/data/socket均在该测试目录。系统服务未安装；既有开发库及历史验收环境没有复用。
