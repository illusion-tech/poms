# POMS 部署脚本

本目录保存 POMS 本地编排式发布脚本。脚本只在本地使用 Deno 2.8 执行，服务器不需要 POMS 仓库目录，也不需要安装
Deno。部署配置来自 `deploy/config/*.jsonc`。

## 边界

- `deploy/scripts/`：会影响发布包、远程 release、PM2 或 Nginx 的部署脚本。
- `deploy/config/`：非敏感部署配置，例如域名、目录、进程名和模板路径。
- `tools/`：仓库维护工具，不放服务器部署逻辑。

不要在脚本或配置中写入真实数据库密码、JWT secret、OBS AK/SK 或证书私钥。

## 测试环境命令

本地构建 release：

```bash
deno task deploy:build-test
```

远程前置检查：

```bash
deno task deploy:preflight-test
```

推送并安装 release：

```bash
deno task deploy:push-test --archive dist/releases/poms-test-20260526-120000.tar.gz
```

默认会在远端 release staging 完成后、远端切换 `current` 前执行：

```bash
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm exec mikro-orm migration:pending --config apps/poms-api/src/mikro-orm.config.ts
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm exec mikro-orm migration:up --config apps/poms-api/src/mikro-orm.config.ts
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm exec mikro-orm migration:pending --config apps/poms-api/src/mikro-orm.config.ts
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm exec mikro-orm migration:check --config apps/poms-api/src/mikro-orm.config.ts
```

只有 migration gate 通过后，脚本才会激活 release 并 reload PM2。确认本次不需要迁移时，才显式传
`--skip-migration`。

只需要验证目标库是否还有 pending migration 时：

```bash
deno task deploy:schema-gate-test --pending-only
```

首次安装或 Nginx 模板变化时：

```bash
deno task deploy:push-test --archive dist/releases/poms-test-20260526-120000.tar.gz --install-nginx
```

预演远程操作，不执行 `ssh` 或 `scp`：

```bash
deno task deploy:push-test --archive dist/releases/poms-test-20260526-120000.tar.gz --dry-run --install-nginx
```

回滚到上一版：

```bash
deno task deploy:rollback-test --previous
```

回滚到指定版本：

```bash
deno task deploy:rollback-test --to 20260526-110000
```

验证当前环境：

```bash
deno task deploy:verify-test
```

`deploy:verify-test` 默认也会执行 pending-only migration gate。只排查 HTTP 层时可临时追加
`--skip-migration-gate`。

临时证书阶段需要跳过 TLS 校验时，才使用：

```bash
deno task deploy:verify-test --insecure
```
