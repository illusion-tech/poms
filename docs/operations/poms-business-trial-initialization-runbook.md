# POMS 业务试用环境初始化手册

本文档描述 `poms-test.illusiontech.cn` 面向业务人员试用前的数据库初始化、账号 seed 和演示数据 seed 流程。

## 适用边界

- 仅适用于共享测试环境或业务试用环境。
- 不使用 `poms-api:seeder-run` 初始化共享测试环境；该命令只保留给本地开发和 E2E。
- 不在仓库提交真实 env、数据库密码、JWT secret、业务试用账号密码或 OBS AK/SK。
- 本流程默认允许在业务人员正式试用前重置 `poms_test`。

## 本地私有文件

创建本地私有目录，目录已被 `.gitignore` 忽略：

```bash
mkdir -p deploy/private
```

准备 API 测试环境 env：

```bash
cp deploy/env/poms-api.env.example deploy/private/poms-test.env
```

编辑 `deploy/private/poms-test.env`，填入测试 RDS、JWT secret、附件本地目录等真实值。不要提交该文件。

准备试用账号 CSV：

```bash
cp deploy/env/poms-test-trial-users.csv.example deploy/private/poms-test-trial-users.csv
```

CSV 字段固定为：

```text
username,displayName,email,phone,orgCode,roleKeys,password
```

约束：

- `username` 不得使用开发账号名，例如 `admin`、`sales_rep`、`finance_ops`。
- `orgCode` 必须使用平台 bootstrap 已创建的组织编码：`SALES-HQ`、`SALES-SOUTH-1`、`PLATFORM-GOV`、`PRESALES-CENTER`、`BIZ-OPS`、`DELIVERY`、`FINANCE`、`MANAGEMENT`、`AUDIT`。
- `roleKeys` 使用 `|` 或 `;` 分隔，例如 `sales-rep|project-viewer`。
- CSV 至少包含一个 `platform-admin`、一个 `sales-rep`、一个 `business-admin`。
- `password` 必须替换为随机强密码，不能使用 `CHANGE_ME`、`replace-me` 或 `<replace-me>` 类占位符。

## 重置测试库

业务人员正式试用前，如果当前 `poms_test` 只是部署验证库，可以重置。重置前先停止 API：

```bash
ssh root@121.36.34.169 'pm2 stop poms-api-test'
```

由数据库管理员账号在 RDS 上执行：

```sql
drop database if exists poms_test;
drop role if exists poms_test_app;
create role poms_test_app login password '<replace-with-random-password>';
create database poms_test owner poms_test_app;
\c poms_test
create extension if not exists "pgcrypto";
grant create on database poms_test to poms_test_app;
```

随后同步更新：

- 本地 `deploy/private/poms-test.env`
- 服务器 `/srv/poms/test/shared/poms-api.env`

测试环境已暴露过的 JWT secret、数据库应用账号密码和默认 seed 账号密码都应轮换。

## 迁移与初始化

在仓库根目录执行：

```bash
deno task deploy:schema-gate-test
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm nx run poms-api:seed-platform-bootstrap
POMS_ENV_FILE=deploy/private/poms-test.env POMS_TRIAL_USERS_CSV=deploy/private/poms-test-trial-users.csv corepack pnpm nx run poms-api:seed-business-trial
```

Windows PowerShell 写法：

```powershell
deno task deploy:schema-gate-test
$env:POMS_ENV_FILE='deploy/private/poms-test.env'; corepack pnpm nx run poms-api:seed-platform-bootstrap
$env:POMS_ENV_FILE='deploy/private/poms-test.env'; $env:POMS_TRIAL_USERS_CSV='deploy/private/poms-test-trial-users.csv'; corepack pnpm nx run poms-api:seed-business-trial
```

## 启动与验证

启动 API：

```bash
ssh root@121.36.34.169 'pm2 startOrReload /opt/poms/deploy/pm2/poms-api-test.ecosystem.config.cjs --env production && pm2 save'
```

验证部署：

```bash
deno task deploy:verify-test
```

业务试用初始化验收项：

- `/api/health` 与 `/api/health/readiness` 正常。
- 至少一个 CSV 中的业务试用账号可以登录。
- 数据库中存在 `TRIAL-CUST-*`、`TRIAL-LD-*`、`TRIAL-PRJ-*`、`TRIAL-CT-*` 演示数据。
- 共享测试环境不包含由本流程生成的 `E2E-*` 数据。
- 重复执行 `seed-business-trial` 只 upsert 试用账号和 `TRIAL-*` 演示数据，不删除业务人员后续录入的数据。

## 回滚

如果 seed 失败：

1. 不要继续发放账号。
2. 修正 CSV、env 或权限后重新运行对应 seed。
3. 如果数据库已处于不可判断状态，重新执行“重置测试库”流程。

如果业务人员已经开始录入真实试用数据，不再重置数据库；后续只能通过显式数据修复脚本处理。
