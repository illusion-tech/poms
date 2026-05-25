# POMS 部署脚本

本目录保存 POMS 发布、安装、回滚和验证脚本。脚本使用 Deno 执行，部署配置来自 `deploy/config/*.jsonc`。

## 边界

- `deploy/scripts/`：会影响发布包、服务器 release、PM2 或 Nginx 的部署脚本。
- `deploy/config/`：非敏感部署配置，例如域名、目录、进程名和模板路径。
- `tools/`：仓库维护工具，不放服务器部署逻辑。

不要在脚本或配置中写入真实数据库密码、JWT secret、OBS AK/SK 或证书私钥。

## 测试环境命令

本地构建 release：

```bash
deno task deploy:build-test
```

服务器安装 release：

```bash
deno task deploy:install-test --archive /tmp/poms-test-20260526-120000.tar.gz
```

首次安装或 Nginx 模板变化时：

```bash
deno task deploy:install-test --archive /tmp/poms-test-20260526-120000.tar.gz --install-nginx
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
