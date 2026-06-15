# POMS 部署模板

本目录保存 POMS 各环境可版本化管理的部署模板和本地编排式部署脚本。Deno 只在本地执行；服务器不需要 POMS
仓库目录，也不需要安装 Deno。

不要把真实证书、私钥、数据库密码、JWT secret、附件存储凭据或生产环境配置文件提交到本目录。

## 文件说明

- `nginx/sites-available/poms-test.conf`：测试环境 Nginx 站点模板。
- `pm2/poms-api-test.ecosystem.config.cjs`：测试环境 `poms-api` 的 PM2 进程模板。
- `env/poms-api.env.example`：`/srv/poms/test/shared/poms-api.env` 的环境变量示例。
- `env/poms-test-trial-users.csv.example`：业务试用账号 CSV 示例，只能复制到本地私有目录后填真实密码。
- `config/poms-test.jsonc`：测试环境非敏感部署配置。
- `scripts/`：Deno 本地编排式发布、推送、回滚和验证脚本。

## 脚本组织

部署相关脚本统一放在 `deploy/scripts/`，仓库维护工具继续放在 `tools/`。Deno 任务入口集中在根
`deno.jsonc`，根 `package.json` 只保留常用短命令。

本地构建测试环境 release：

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

推送脚本会先把 release 解包到远端 `.incoming-*`，再用本地 `deploy/private/poms-test.env` 执行直接
MikroORM migration gate：先检查 pending，再执行 `migration:up`，随后确认 pending 为空并执行
`migration:check`。只有 migration gate 通过后，才切换 `/srv/poms/test/current` 并 reload PM2。

远程回滚：

```bash
deno task deploy:rollback-test --previous
```

更多脚本说明见 `deploy/scripts/README.md`。

## 服务器目录

POMS 运行时文件统一放在 `/srv/poms/<env>` 下：

```text
/srv/poms/
  test/
    releases/
      <timestamp>/
        admin/browser/
        api/
    current -> releases/<timestamp>
    shared/
      poms-api.env
      logs/
      uploads/
  prod/
    releases/
    current -> releases/<timestamp>
    shared/
      poms-api.env
      logs/
      uploads/
```

测试环境使用：

- 前端根目录：`/srv/poms/test/current/admin/browser`
- API 工作目录：`/srv/poms/test/current/api`
- API 环境变量文件：`/srv/poms/test/shared/poms-api.env`
- 远程部署模板目录：`/opt/poms/deploy`
- 远程 PM2 模板路径：`/opt/poms/deploy/pm2/poms-api-test.ecosystem.config.cjs`

## 安装 Nginx 站点

优先使用本地编排脚本上传模板并 reload Nginx：

```bash
deno task deploy:push-test --archive dist/releases/poms-test-<timestamp>.tar.gz --install-nginx
```

手工安装时，才在服务器执行：

```bash
scp deploy/nginx/sites-available/poms-test.conf root@121.36.34.169:/etc/nginx/sites-available/poms-test.conf
ssh root@121.36.34.169 'ln -sfn /etc/nginx/sites-available/poms-test.conf /etc/nginx/sites-enabled/poms-test.conf && nginx -t && systemctl reload nginx'
```

如果软链接已经存在，替换前先确认它当前指向的目标。

## 安装 API 环境变量

该文件只存在于服务器，首次部署前手工创建并填入真实值：

```bash
ssh root@121.36.34.169 'mkdir -p /srv/poms/test/shared/logs /srv/poms/test/shared/uploads'
scp deploy/env/poms-api.env.example root@121.36.34.169:/srv/poms/test/shared/poms-api.env
ssh root@121.36.34.169 'chmod 600 /srv/poms/test/shared/poms-api.env'
```

随后在服务器上编辑 `/srv/poms/test/shared/poms-api.env`，把所有 `<replace-me>` 占位符替换为真实值。

附件存储 Provider 凭据在 API 启动后通过 POMS 平台配置管理。除非未来明确新增启动引导工具并消费
`HUAWEI_OBS_*`，否则不要把这类凭据写入 API 环境变量文件。

附件上传大小上限是 POMS Admin 系统设置（`attachment.max-upload-size-mb`），不是环境变量。每个站点模板中的
Nginx `client_max_body_size` 必须大于或等于系统设置允许的最大值。

## 业务试用账号与演示数据

共享测试环境不要执行开发 / E2E 专用的 `poms-api:seeder-run`。业务试用前先把 CSV 示例复制到本地私有目录并填入真实随机密码：

```bash
mkdir -p deploy/private
cp deploy/env/poms-test-trial-users.csv.example deploy/private/poms-test-trial-users.csv
```

然后按 `docs/operations/poms-business-trial-initialization-runbook.md` 执行数据库迁移、平台 bootstrap 和业务试用 seed。
正常 release 发布不需要手工执行数据库迁移；`deploy:push-test` 会在切换版本前自动执行 migration gate。

只验证测试库 migration 状态时执行：

```bash
deno task deploy:schema-gate-test --pending-only
```

## 启动或重载 API

正常部署时由 `deploy:push-test` 自动上传 PM2 模板并执行：

```bash
ssh root@121.36.34.169 'pm2 startOrReload /opt/poms/deploy/pm2/poms-api-test.ecosystem.config.cjs --env production && pm2 save'
```

PM2 模板从 `/srv/poms/test/shared/poms-api.env` 读取敏感配置，不内联真实密钥。

## 验证

```bash
ssh root@121.36.34.169 'nginx -t && systemctl reload nginx && pm2 status poms-api-test'
deno task deploy:verify-test
```

`deploy:verify-test` 默认会同时验证 HTTP 路由与目标库 pending migration。只排查 HTTP 层时可临时追加
`--skip-migration-gate`。

完整发布与回滚步骤见 `docs/operations/poms-test-deployment-runbook.md`。
