# POMS 测试环境部署运行手册

本文档描述 `poms-test.illusiontech.cn` 测试环境的部署流程。

## 前置条件

- DNS 已将 `poms-test.illusiontech.cn` 指向 ECS 公网 IP。
- systemd 管理的 Nginx 是唯一运行中的 Nginx 实例，并监听 `80` 和 `443`。
- TLS 证书文件已放在服务器：
  - `/etc/nginx/ssl/poms-test/fullchain.pem`
  - `/etc/nginx/ssl/poms-test/privkey.pem`
- 本地已安装 Deno 2.8，并可通过 SSH 登录 `root@121.36.34.169`。
- 服务器已安装 Node.js、Corepack、pnpm、PM2、Nginx、tar 和 readlink。
- 服务器可以访问 PostgreSQL/RDS。
- 服务器不需要 POMS 仓库目录，也不需要安装 Deno。
- 如果使用华为云 OBS，负责配置 POMS 平台附件存储 Provider 的运维人员需要拿到 endpoint、region、bucket、AK 和 SK。
- 健康检查端点已存在：
  - `/api/health`
  - `/api/health/readiness`

## 本地构建

在仓库根目录执行：

```bash
deno task deploy:build-test
```

预期构建产物：

- 前端：`dist/apps/poms-admin/browser`
- API: `dist/apps/poms-api/main.js`
- release 包：`dist/releases/poms-test-<timestamp>.tar.gz`

## 远程前置检查

正式推送前先检查远程依赖、env 文件和证书文件：

```bash
deno task deploy:preflight-test
```

只查看将要执行的 SSH 脚本时：

```bash
deno task deploy:preflight-test --dry-run
```

## 推送并安装 release

本地脚本会上传 release 包和 PM2 模板，再通过 SSH 在服务器执行安装：

```bash
deno task deploy:push-test --archive dist/releases/poms-test-<timestamp>.tar.gz
```

脚本会执行这些动作：

- 上传 release 到 `/tmp/poms/releases/`。
- 上传 PM2 模板到 `/opt/poms/deploy/pm2/poms-api-test.ecosystem.config.cjs`。
- 创建 `/srv/poms/test/releases`、`shared/logs` 和 `shared/uploads`。
- 检查 `/srv/poms/test/shared/poms-api.env` 存在、权限可收敛且没有 `<replace-me>`。
- 解包到 `.incoming-<timestamp>`，检查 `admin/browser/index.html` 和 `api/main.js`。
- 如 API release 内包含 `package.json`，在远程执行 `corepack pnpm install --prod --frozen-lockfile`。
- 在本地 checkout / CI 使用 `deploy/private/poms-test.env` 执行 migration gate：先检查 pending，再执行
  `migration:up`，随后确认 pending 为空并执行 `migration:check`。
- migration 通过后才把 `.incoming-<timestamp>` 移为正式 release，原子切换 `/srv/poms/test/current`，执行
  `pm2 startOrReload` 和 `pm2 save`。

如果 migration 失败，脚本不会切换 `/srv/poms/test/current`，也不会 reload PM2。线上会继续运行旧 release。

预演推送计划，不执行 `scp` 或 `ssh`：

```bash
deno task deploy:push-test --archive dist/releases/poms-test-<timestamp>.tar.gz --dry-run
```

## 配置 API 环境变量

创建仅服务器保存的环境变量文件：

```bash
ssh root@121.36.34.169 'mkdir -p /srv/poms/test/shared/logs /srv/poms/test/shared/uploads'
scp deploy/env/poms-api.env.example root@121.36.34.169:/srv/poms/test/shared/poms-api.env
ssh root@121.36.34.169 'chmod 600 /srv/poms/test/shared/poms-api.env'
```

编辑 `/srv/poms/test/shared/poms-api.env` 并替换所有占位符。测试环境必要默认值：

```text
NODE_ENV=production
HOST=127.0.0.1
PORT=3333
CORS_ORIGIN=https://poms-test.illusiontech.cn
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_PATH=/api
DB_CONNECT=true
DB_SCHEMA=poms
POMS_ATTACHMENT_LOCAL_ROOT=/srv/poms/test/shared/uploads
```

不要提交填入真实值后的 env 文件。

API 不从 `HUAWEI_OBS_*` 环境变量读取华为云 OBS 凭据。OBS endpoint、bucket、AK 和 SK 应保存在
POMS 平台附件存储 Provider 配置中；凭据会加密保存，API 不会以明文返回。

## 配置附件存储 Provider

API 启动且运维人员可以登录后：

1. 打开 POMS 平台附件存储 Provider 管理页面。
2. 如需使用 OBS，创建或更新 `huawei-obs-s3` Provider。
3. 在平台表单中填写 endpoint、region、bucket、可选 key prefix、AK 和 SK。
4. 执行 Provider 连接测试。
5. 启用该 Provider，并将其设置为默认 Provider。

如果没有配置 Provider，API 会回退到本地附件存储。测试环境的本地 root 应为
`/srv/poms/test/shared/uploads`，与 `POMS_ATTACHMENT_LOCAL_ROOT` 保持一致。

附件上传大小由 POMS Admin 系统设置 `attachment.max-upload-size-mb` 控制。默认值为 `50 MB`，允许范围为
`1-500 MB`。Nginx 网关硬上限 `client_max_body_size` 必须大于或等于系统设置值。测试环境 Nginx 模板使用
`512m`。

## 数据库迁移

正常发布时，`deploy:push-test` 会从拥有完整源码和 TypeScript 工具链的本地 checkout 或 CI 任务执行数据库迁移。不要依赖服务器上纯
`dist/apps/poms-api` 运行时产物执行迁移。

默认读取本地未提交的生产形态环境变量文件：

```text
deploy/private/poms-test.env
```

发布脚本会在切换 `current` 前执行 migration gate。该 gate 直接调用 MikroORM CLI，不经过 Nx target，避免本地
`.env` 被 Nx 预加载后污染目标数据库连接：

```bash
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm exec mikro-orm migration:pending --config apps/poms-api/src/mikro-orm.config.ts
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm exec mikro-orm migration:up --config apps/poms-api/src/mikro-orm.config.ts
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm exec mikro-orm migration:pending --config apps/poms-api/src/mikro-orm.config.ts
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm exec mikro-orm migration:check --config apps/poms-api/src/mikro-orm.config.ts
```

手工只验证目标库是否还有 pending migration 时，优先执行：

```bash
deno task deploy:schema-gate-test --pending-only
```

只有确认同一份 migration 已经人工执行过，或本次发布是纯 PM2 / Nginx 修复时，才显式跳过 migration gate：

```bash
deno task deploy:push-test --archive dist/releases/poms-test-<timestamp>.tar.gz --skip-migration
```

不要把 release rollback 和 `migration-down` 绑定在一起。回滚默认只切换 release symlink；需要数据库回退时单独评估。

## 业务试用初始化

共享测试环境面向业务人员试用时，不执行开发 / E2E 专用的 `poms-api:seeder-run`。首次发放账号前按
`docs/operations/poms-business-trial-initialization-runbook.md` 执行：

```bash
POMS_ENV_FILE=deploy/private/poms-test.env corepack pnpm nx run poms-api:seed-platform-bootstrap
POMS_ENV_FILE=deploy/private/poms-test.env POMS_TRIAL_USERS_CSV=deploy/private/poms-test-trial-users.csv corepack pnpm nx run poms-api:seed-business-trial
```

业务试用账号必须来自未提交的本地 CSV，不能使用 `admin123`、`sales_rep123` 等开发默认密码。

## 切换发布版本

如果不用脚本，手工切换方式为：

```bash
ssh root@121.36.34.169 'ln -sfn /srv/poms/test/releases/<timestamp> /srv/poms/test/current && readlink -f /srv/poms/test/current && test -f /srv/poms/test/current/admin/browser/index.html && test -f /srv/poms/test/current/api/main.js'
```

## 启动或重载 API

```bash
ssh root@121.36.34.169 'pm2 startOrReload /opt/poms/deploy/pm2/poms-api-test.ecosystem.config.cjs --env production && pm2 status poms-api-test'
```

进程健康后保存 PM2 状态：

```bash
ssh root@121.36.34.169 'pm2 save'
```

## 安装或重载 Nginx

首次安装站点，或 Nginx 模板发生变化时，可以让本地编排脚本上传站点配置并 reload Nginx：

```bash
deno task deploy:push-test --archive dist/releases/poms-test-<timestamp>.tar.gz --install-nginx
```

只需要 reload Nginx 但不重新安装站点 symlink 时：

```bash
deno task deploy:push-test --archive dist/releases/poms-test-<timestamp>.tar.gz --reload-nginx
```

手工安装时，先把模板上传到服务器，再在服务器执行：

```bash
scp deploy/nginx/sites-available/poms-test.conf root@121.36.34.169:/etc/nginx/sites-available/poms-test.conf
ssh root@121.36.34.169 'ln -sfn /etc/nginx/sites-available/poms-test.conf /etc/nginx/sites-enabled/poms-test.conf && nginx -t && systemctl reload nginx'
```

如果软链接已经存在，先确认它指向 `/etc/nginx/sites-available/poms-test.conf`。

## 健康检查与路由验证

```bash
deno task deploy:verify-test
```

预期结果：

- `/api/health` 返回 liveness JSON。
- `/api/health/readiness` 返回 ready JSON；如果依赖不可用，则返回带依赖详情的 `503`。
- `/api-docs/` 返回 Swagger UI。
- `/projects` 返回 SPA `index.html`。

## 缓存验证

`deno task deploy:verify-test` 会检查 `/index.html` 与 `/api/health` 的 `Cache-Control`，并用
`deploy/private/poms-test.env` 确认目标库无 pending migration。只排查 HTTP 路由时可临时加
`--skip-migration-gate`。也可以手工执行：

```bash
curl -k -I https://poms-test.illusiontech.cn/index.html
curl -k -I https://poms-test.illusiontech.cn/api/health
```

预期响应头：

- `index.html`: `Cache-Control: no-store, no-cache, must-revalidate`
- `/api/health`: `Cache-Control: no-store`
- 带 hash 的 JavaScript 和 CSS 资源：`Cache-Control` 包含 `immutable`

## 回滚

列出发布版本：

```bash
ssh root@121.36.34.169 'ls -1 /srv/poms/test/releases'
```

将 `current` 切回上一版 release：

```bash
deno task deploy:rollback-test --previous
```

切回指定 release：

```bash
deno task deploy:rollback-test --to <previous-timestamp>
```

正常发布回滚不需要改 Nginx 配置，因为 Nginx 服务的是 `/srv/poms/test/current/admin/browser`。

## 故障排查

- `502 Bad Gateway`：检查 `pm2 status poms-api-test` 和 `ss -lntup | grep 3333`。
- 登录 Cookie 缺失：检查 `CORS_ORIGIN`、`AUTH_COOKIE_SECURE` 和 `AUTH_COOKIE_PATH`。
- SPA 深链返回 404：检查 Nginx `location /` 是否 fallback 到 `/index.html`。
- 上传被 Nginx 拒绝：提高 `client_max_body_size`，并确保它大于或等于 Admin 系统设置
  `attachment.max-upload-size-mb`。
- Swagger 不可用：检查 `/api-docs/`、`/api-docs-json` 和 `/api-docs-yaml` 是否在 `/api/`
  之外单独反代。
