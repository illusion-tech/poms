# EX-67A 通用系统设置与附件上传上限 G1 基线

- 关卡状态：已通过（`Pass`）
- 父级切片：`EX-67`
- 负责人：`Codex`
- 切片类型：`cross-layer-high-risk`
- G1 评审人：`Codex local`
- G1 日期：`2026-05-26`
- 执行板链接 / 行：`docs/design/phase2-development-execution-tracker.md` / `EX-67A`

## 1. 范围

- 本次目标:
  - 新增平台通用系统设置能力，首个设置为 `attachment.max-upload-size-mb`。
  - 将附件上传大小上限从 API 环境变量迁入后台系统设置，支持运行时调整。
  - 新增 `system_setting` 持久化、权限、API、OpenAPI、生成客户端和 Admin 页面。
  - `attachment_upload_session` 冻结创建会话时的 `max_size_bytes`，后续设置变化只影响新会话。
  - 同步部署模板和运维文档，明确 Admin 系统设置是业务上限，Nginx `client_max_body_size` 是网关硬上限。
- 本次明确不做:
  - 不实现租户级、组织级或用户级覆盖。
  - 不开放任意 key 写入；所有 key 必须先在代码注册表声明。
  - 不把 OBS AK/SK 或 secret 类配置放入系统设置。
  - 不实现系统设置审计详情页。

## 2. 正式输入

| 输入类型     | 文档 / 来源                                       | 章节 / 锚点          | 状态   | 备注                                        |
| ------------ | ------------------------------------------------- | -------------------- | ------ | ------------------------------------------- |
| 命令设计     | `phase2-development-execution-tracker.md`         | `EX-67` / `EX-67A`   | 已通过 | 本片承接平台通用系统设置最小闭环。          |
| 路由清单     | `api-route-canonical-inventory.md`                | `EX-67 平台系统设置` | 已通过 | 新增三条 `platform-system-settings` route。 |
| 现有上传能力 | `attachment_upload_session`                       | `EX-65D`             | 已通过 | 会话已经冻结 provider / storage metadata。  |
| 部署文档     | `docs/operations/poms-test-deployment-runbook.md` | env / Nginx 章节     | 需同步 | 需要移除旧上传上限环境变量。                |

## 3. 设置注册表

| Key                             | 类型      | 默认值 | 范围    | 单位 | 作用域 | 备注                                                   |
| ------------------------------- | --------- | ------ | ------- | ---- | ------ | ------------------------------------------------------ |
| `attachment.max-upload-size-mb` | `integer` | `50`   | `1-500` | `MB` | 全局   | 控制新附件上传会话声明文件大小上限；不是 secret 配置。 |

## 4. 接口边界

| 路由                                    | 操作                  | 请求                         | 响应                     | 权限                              | 状态   |
| --------------------------------------- | --------------------- | ---------------------------- | ------------------------ | --------------------------------- | ------ |
| `GET /platform/system-settings`         | `listSystemSettings`  | N/A                          | `SystemSettingSummary[]` | `platform:system-settings:manage` | 计划中 |
| `GET /platform/system-settings/{key}`   | `getSystemSetting`    | N/A                          | `SystemSettingSummary`   | `platform:system-settings:manage` | 计划中 |
| `PATCH /platform/system-settings/{key}` | `updateSystemSetting` | `UpdateSystemSettingRequest` | `SystemSettingSummary`   | `platform:system-settings:manage` | 计划中 |

`UpdateSystemSettingRequest.expectedVersion` 使用乐观版本。冲突返回 `409`，未知 key 返回 `404`，非法值返回 `400`。

## 5. 持久化

| 表 / 字段                                  | 规则                                                    |
| ------------------------------------------ | ------------------------------------------------------- |
| `poms.system_setting.key`                  | 主键，只允许注册表声明的 key 被服务层读取 / 更新。      |
| `value_type`                               | 当前仅 `integer`，为未来扩展保留列。                    |
| `value_json`                               | JSONB 保存设置值；当前 key 必须为整数。                 |
| `row_version`                              | 乐观锁版本。                                            |
| `updated_by`                               | 写操作人。                                              |
| `attachment_upload_session.max_size_bytes` | 创建上传会话时冻结业务上限，完成 / 上传目标读取会话值。 |

## 6. Admin 边界

- 新增 `/platform/system-settings` 路由和菜单。
- 仅具备 `platform:system-settings:manage` 权限的用户可见和访问。
- 首期页面只展示附件上传大小上限，使用数字输入，范围 `1-500 MB`。
- 版本冲突展示明确失败状态，不静默覆盖。

## 7. 部署边界

- API env 保留 `POMS_ATTACHMENT_LOCAL_ROOT`。
- API env 删除 `POMS_ATTACHMENT_MAX_SIZE_MB`。
- 测试 Nginx 模板使用 `client_max_body_size 512m`，覆盖系统设置最大 `500 MB`。
- 运维手册说明两层限制关系：系统设置为业务上限，Nginx 为网关硬上限。

## 8. 验证矩阵

| 领域 | 必要证据                                                                                  |
| ---- | ----------------------------------------------------------------------------------------- |
| 后端 | 系统设置 service 测试、附件上传 session 冻结上限测试。                                    |
| 契约 | OpenAPI 重新生成、shared API client 重新生成 / 检查。                                     |
| 迁移 | `poms-api:migration-check`。                                                              |
| 前端 | route guard 规格测试、system setting 页面 focused 规格测试、poms-admin lint/build/tests。 |
| 部署 | env / Nginx / runbook 不再把 `POMS_ATTACHMENT_MAX_SIZE_MB` 作为运行时配置来源。           |

## 9. G1 结论

- `EX-67A` 可以在同一个跨层切片中落地后端、Admin 前端、生成客户端和部署文档。
- 任何新增系统设置 key 都必须先加入注册表；如涉及接口，也必须先补路由清单后再进入运行时使用。
