# POMS 部署目录规范

POMS 运行时文件统一放在 `/srv/poms/<env>` 下，让测试环境、正式环境和未来新增环境共享同一套可预期结构。
服务器不保留完整 POMS 仓库目录，也不需要安装 Deno；Deno 部署脚本只在本地执行，通过 `scp` 和 `ssh`
编排远程安装、回滚和验证。

## 目录结构

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

部署脚本和进程模板在服务器侧的固定落点为：

```text
/opt/poms/
  deploy/
    pm2/
      poms-api-test.ecosystem.config.cjs
```

## 目录职责

- `releases/<timestamp>/`：单次部署的不可变发布包。
- `current`：指向当前生效发布包的软链接。
- `shared/poms-api.env`：仅服务器保存的 API 环境变量文件。
- `shared/logs/`：当前环境的 PM2 日志目录。
- `shared/uploads/`：部署模式需要本地共享存储时使用的目录。
- `/opt/poms/deploy/`：本地编排脚本上传的非敏感部署模板，例如 PM2 ecosystem 文件。

Nginx 和 PM2 都指向 `current`，不直接指向带时间戳的 release。发布切换因此只需要一次原子软链接更新，以及一次
API 进程的 PM2 reload。

## 前端根目录

测试环境前端根目录为：

```text
/srv/poms/test/current/admin/browser
```

`admin/browser` 对应 Angular 生产构建产物 `dist/apps/poms-admin/browser`。Nginx 必须服务
`browser` 目录，因为 `index.html` 和带 hash 的静态资源都在这个目录内。

## API 工作目录

测试环境 API 工作目录为：

```text
/srv/poms/test/current/api
```

构建后的 API 入口文件为 `main.js`，对应当前 `dist/apps/poms-api/main.js` webpack 输出。

## 环境同构

正式环境应使用同构目录：

```text
/srv/poms/prod/current/admin/browser
/srv/poms/prod/current/api
/srv/poms/prod/shared/poms-api.env
```

只有环境相关值应该不同：域名、证书路径、数据库 URL、附件存储 Provider 配置、密钥和 PM2 进程名。

## 回滚模型

回滚时不要移动 release 目录内的文件。只需把 `current` 指回上一版 release，重载 PM2，Nginx 保持不变。

建议使用部署脚本：

```bash
deno task deploy:rollback-test --previous
```

手工示例需要通过 SSH 在服务器执行：

```bash
ssh root@121.36.34.169 'ln -sfn /srv/poms/test/releases/<previous-timestamp> /srv/poms/test/current && pm2 startOrReload /opt/poms/deploy/pm2/poms-api-test.ecosystem.config.cjs --env production'
```
