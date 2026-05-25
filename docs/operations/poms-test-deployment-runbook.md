# POMS 测试环境部署运行手册

本文档描述 `poms-test.illusiontech.cn` 测试环境的部署流程。

## 前置条件

- DNS 已将 `poms-test.illusiontech.cn` 指向 ECS 公网 IP。
- systemd 管理的 Nginx 是唯一运行中的 Nginx 实例，并监听 `80` 和 `443`。
- TLS 证书文件已放在服务器：
  - `/etc/nginx/ssl/poms-test/fullchain.pem`
  - `/etc/nginx/ssl/poms-test/privkey.pem`
- 服务器已安装 Node.js、Corepack、pnpm、PM2 和 Deno。
- 服务器可以访问 PostgreSQL/RDS。
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

## 创建服务器目录

```bash
stamp=$(date +%Y%m%d-%H%M%S)
release=/srv/poms/test/releases/$stamp

mkdir -p "$release/admin" "$release/api"
mkdir -p /srv/poms/test/shared/logs /srv/poms/test/shared/uploads
```

上传 release 包到服务器，例如：

```bash
scp dist/releases/poms-test-<timestamp>.tar.gz root@121.36.34.169:/tmp/
```

在服务器仓库目录执行安装脚本：

```bash
deno task deploy:install-test --archive /tmp/poms-test-<timestamp>.tar.gz
```

脚本会解包到 `/srv/poms/test/releases/<timestamp>/`，检查 `admin/browser/index.html` 和 `api/main.js`，如
API 产物包含 `package.json` 则安装生产依赖，然后切换 `/srv/poms/test/current` 并重载 PM2。

## 配置 API 环境变量

创建仅服务器保存的环境变量文件：

```bash
cp deploy/env/poms-api.env.example /srv/poms/test/shared/poms-api.env
chmod 600 /srv/poms/test/shared/poms-api.env
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

迁移应从拥有完整源码和 TypeScript 工具链的本地 checkout 或 CI 任务执行。不要依赖服务器上纯
`dist/apps/poms-api` 运行时产物执行迁移。

使用指向测试 RDS 的生产形态数据库环境变量后执行：

```bash
corepack pnpm nx run poms-api:migration-up
```

切换 `current` 前记录迁移结果。

## 切换发布版本

如果不用脚本，手工切换方式为：

```bash
ln -sfn "$release" /srv/poms/test/current
readlink -f /srv/poms/test/current
test -f /srv/poms/test/current/admin/browser/index.html
test -f /srv/poms/test/current/api/main.js
```

## 启动或重载 API

```bash
pm2 startOrReload deploy/pm2/poms-api-test.ecosystem.config.cjs --env production
pm2 status poms-api-test
```

进程健康后保存 PM2 状态：

```bash
pm2 save
```

## 安装或重载 Nginx

首次安装站点，或 Nginx 模板发生变化时，可以让安装脚本复制站点配置并 reload Nginx：

```bash
deno task deploy:install-test --archive /tmp/poms-test-<timestamp>.tar.gz --install-nginx
```

手工安装方式为：

```bash
cp deploy/nginx/sites-available/poms-test.conf /etc/nginx/sites-available/poms-test.conf
ln -s /etc/nginx/sites-available/poms-test.conf /etc/nginx/sites-enabled/poms-test.conf
nginx -t
systemctl reload nginx
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

`deno task deploy:verify-test` 会检查 `/index.html` 与 `/api/health` 的 `Cache-Control`。也可以手工执行：

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
ls -1 /srv/poms/test/releases
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
