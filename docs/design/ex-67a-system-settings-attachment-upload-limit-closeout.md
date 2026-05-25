# EX-67A 通用系统设置与附件上传上限 G3 / G4 收口

- 关卡状态：已通过（`Pass`）
- 父级切片：`EX-67`
- 执行板行：`EX-67A`
- 负责人：`Codex`
- 收口日期：`2026-05-26`

## 1. 交付结果

- 新增 `system_setting` 持久化、注册表、repository、service、controller 与权限 `platform:system-settings:manage`。
- 新增系统设置 API：
  - `GET /platform/system-settings`
  - `GET /platform/system-settings/{key}`
  - `PATCH /platform/system-settings/{key}`
- 首个注册 key 为 `attachment.max-upload-size-mb`，默认 `50 MB`，范围 `1-500 MB`。
- 附件上传大小上限不再读取 `POMS_ATTACHMENT_MAX_SIZE_MB`；后端从系统设置读取。
- `attachment_upload_session.max_size_bytes` 在创建会话时冻结，上传目标返回会话冻结值。
- Admin 新增 `/platform/system-settings` 页面、导航入口、route guard 和 data-access store。
- 部署模板移除旧环境变量，Nginx 测试模板调整为 `client_max_body_size 512m`。

## 2. 验证结果

| 检查项                                            | 结果   | 备注                                                              |
| ------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `corepack pnpm nx run poms-api:openapi`           | 已通过 | OpenAPI 已包含系统设置路由。                                      |
| `corepack pnpm nx run shared-api-client:generate` | 已通过 | 生成客户端新增 `SystemSettingApi`。                               |
| `corepack pnpm nx run shared-api-client:check`    | 已通过 | 生成客户端与 OpenAPI 同步。                                       |
| `corepack pnpm nx test poms-api`                  | 已通过 | 67 个测试套件 / 710 个测试通过。                                  |
| `corepack pnpm nx test poms-admin`                | 已通过 | 49 个测试套件 / 277 个测试通过。                                  |
| `corepack pnpm nx run poms-api:migration-up`      | 已通过 | 本地验证库已应用 `Migration20260526100000_ex67a_system_setting`。 |
| `corepack pnpm nx run poms-api:migration-check`   | 已通过 | Schema 已是最新状态。                                             |
| `corepack pnpm nx lint poms-api`                  | 已通过 | API lint 通过。                                                   |
| `corepack pnpm nx lint poms-admin`                | 已通过 | Admin lint 通过。                                                 |
| `corepack pnpm nx build poms-api`                 | 已通过 | API 生产构建通过。                                                |
| `corepack pnpm nx build poms-admin`               | 已通过 | Admin 生产构建通过。                                              |
| `corepack pnpm run format:md:check`               | 已通过 | Markdown 表格格式检查通过。                                       |
| `git diff --check`                                | 已通过 | 仅有 CRLF 规范化提示，无空白错误。                                |

## 3. 漂移 / 范围说明

| 事项                               | 分类           | 处理结果                                                     |
| ---------------------------------- | -------------- | ------------------------------------------------------------ |
| 实施期间补入 route inventory       | 治理时序风险   | Inventory 已有权威 `EX-67 平台系统设置` 行，状态已对齐。     |
| 移除 `POMS_ATTACHMENT_MAX_SIZE_MB` | 预期内直接切换 | 运行时不再消费该变量；文档仅在说明已移除旧 env 时提及。      |
| 迁移前已有上传 session             | 兼容处理       | 迁移用 `greatest(size_bytes, 50 MB)` 回填 `max_size_bytes`。 |

## 4. 收口结论

- `EX-67A`: `Done / G4`
- `EX-67`：当前单 key 系统设置最小闭环已达到 `Done / G4`。
- 未来新增系统设置必须在独立切片中补注册表定义；如需要接口变更，还需同步 route / contract、Admin 交互、测试和部署文档。
