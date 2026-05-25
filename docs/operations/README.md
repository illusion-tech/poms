# POMS 运维文档

本目录保存 POMS 运行环境的部署与运维手册。

## 内容

- `poms-deployment-layout.md`：服务器目录结构、发布模型和环境命名规则。
- `poms-test-deployment-runbook.md`：测试环境发布、验证和回滚流程。

## 相关模板

- `deploy/README.md`
- `deploy/nginx/sites-available/poms-test.conf`
- `deploy/pm2/poms-api-test.ecosystem.config.cjs`
- `deploy/env/poms-api.env.example`

## 敏感信息处理

运维文档可以描述敏感信息路径和变量名，但真实值必须留在服务器或所选密钥管理系统中。不要提交证书、私钥、数据库密码、JWT
secret、附件存储凭据或仅服务器使用的 `.env` 文件。
