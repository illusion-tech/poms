# POMS 部署模板

本目录保存 POMS 各环境可版本化管理的部署模板。启用前，先将模板复制到本文档约定的服务器路径。

不要把真实证书、私钥、数据库密码、JWT secret、附件存储凭据或生产环境配置文件提交到本目录。

## 文件说明

- `nginx/sites-available/poms-test.conf`：测试环境 Nginx 站点模板。
- `pm2/poms-api-test.ecosystem.config.cjs`：测试环境 `poms-api` 的 PM2 进程模板。
- `env/poms-api.env.example`：`/srv/poms/test/shared/poms-api.env` 的环境变量示例。

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

## 安装 Nginx 站点

```bash
cp deploy/nginx/sites-available/poms-test.conf /etc/nginx/sites-available/poms-test.conf
ln -s /etc/nginx/sites-available/poms-test.conf /etc/nginx/sites-enabled/poms-test.conf
nginx -t
systemctl reload nginx
```

如果软链接已经存在，替换前先确认它当前指向的目标。

## 安装 API 环境变量

```bash
mkdir -p /srv/poms/test/shared/logs /srv/poms/test/shared/uploads
cp deploy/env/poms-api.env.example /srv/poms/test/shared/poms-api.env
chmod 600 /srv/poms/test/shared/poms-api.env
```

随后在服务器上编辑 `/srv/poms/test/shared/poms-api.env`，把所有 `<replace-me>` 占位符替换为真实值。

附件存储 Provider 凭据在 API 启动后通过 POMS 平台配置管理。除非未来明确新增启动引导工具并消费
`HUAWEI_OBS_*`，否则不要把这类凭据写入 API 环境变量文件。

附件上传大小上限是 POMS Admin 系统设置（`attachment.max-upload-size-mb`），不是环境变量。每个站点模板中的
Nginx `client_max_body_size` 必须大于或等于系统设置允许的最大值。

## 启动或重载 API

```bash
pm2 startOrReload deploy/pm2/poms-api-test.ecosystem.config.cjs --env production
pm2 save
```

可以使用服务器本地仓库副本，也可以把 PM2 模板复制到服务器发布工具目录。模板从
`/srv/poms/test/shared/poms-api.env` 读取敏感配置，不内联真实密钥。

## 验证

```bash
nginx -t
systemctl reload nginx
pm2 status poms-api-test
curl -k https://poms-test.illusiontech.cn/api/health
curl -k https://poms-test.illusiontech.cn/api/health/readiness
curl -k -I https://poms-test.illusiontech.cn/api-docs/
curl -k -I https://poms-test.illusiontech.cn/projects
```

完整发布与回滚步骤见 `docs/operations/poms-test-deployment-runbook.md`。
