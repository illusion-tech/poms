# FE-60A 附件存储 Provider 配置卡片页实施基线包

- Gate Status: `Pass`
- Parent: `FE-60`
- Owner: `Codex`
- Slice Type: `frontend-only` / `platform configuration UI`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-11`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-60A`
- Upstream Slices: `EX-65B`, `EX-65C`, `EX-65E`

## 1. 范围

- 本次目标:
  - 新增 `/platform/attachment-storage-providers` 平台配置入口。
  - 以固定卡片展示 `local` 和 `huawei-obs-s3` 两类附件存储 provider，不提供任意新增 provider 入口。
  - 支持创建 / 编辑 provider 配置、启停、状态提示、write-only AK / SK、连接测试和设为默认。
  - 复用现有 demo card 风格：普通实线边框卡片、tag 状态、紧凑按钮、无虚线未配置卡片。
  - 前端只消费 `EX-65B` 已生成的 provider config API，不新增后端 route、DTO、OpenAPI schema 或 migration。
- 本次明确不做:
  - 不实现附件面板上传 UX、进度、失败重试或 abort 入口；由 `FE-60B` 承接。
  - 不迁移历史 local 附件到 OBS。
  - 不在前端保存、回显或拼接对象 storage key、bucket 写权限、永久对象 URL 或 secret 明文。
  - 不接入真实华为云租户联调；页面只触发后端 `testConnection`。
- 下游可依赖的交付边界:
  - `FE-60B` 可以在 provider 配置页完成后继续改造附件面板 upload session 体验。
  - 运维 / 管理员可以通过配置页填写 Huawei OBS S3-compatible endpoint、bucket、region、AK / SK，并用后端连接测试确认配置完整性。

## 2. 正式输入

| Input Type      | Document / Source                                               | Section / Anchor                               | Status | Notes                                                                  |
| --------------- | --------------------------------------------------------------- | ---------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Business design | `ex-65a-attachment-storage-provider-upload-session-baseline.md` | Provider config list/detail                    | Pass   | 首版 provider 固定为 local 与 Huawei OBS S3-compatible。               |
| Runtime API     | `ex-65b-attachment-storage-provider-config-runtime-baseline.md` | Provider config list/detail, connection test   | Pass   | list/create/update/test/set-default API 已进入 generated client。      |
| Runtime rules   | `ex-65c-attachment-storage-provider-runtime-closeout.md`        | Provider registry and runtime `testConnection` | Pass   | 页面测试连接只调用后端 provider runtime，不在前端实现 OBS SDK 逻辑。   |
| Closeout        | `ex-65e-attachment-storage-provider-integration-closeout.md`    | Rollback and production OBS checklist          | Pass   | 真实 OBS 租户验证留给生产启用前运维 smoke。                            |
| Existing UI     | `apps/poms-admin/src/app/features/platform/identity-provider-*` | Card grid, write-only secret, tooltip pattern  | Pass   | 复用固定 provider card、表单 dialog、help icon、focused tests 的模式。 |

## 3. 本次 SSOT

| Concern               | SSOT                                           | Implementation / Validation Rule                                                 |
| --------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| Provider enum         | Generated `AttachmentStorageProviderType`      | 页面固定渲染 `Local` 与 `HuaweiObsS3`，不允许自由输入 provider type。            |
| Config fields         | Generated request / summary models             | create/update 只提交 API 支持字段；AK / SK 只写入，不从 summary 回显明文。       |
| Status/default rules  | `AttachmentStorageProviderService`             | active/default 规则由后端兜底；前端只做提交前提示，设默认仍以 API 响应为准。     |
| Visual style          | Existing provider/demo card style              | 卡片使用实线 border + rounded card + tag；未配置卡片不用 dashed border。         |
| Permissions and route | Existing `permissionGuard` route data and menu | route 使用 `platform:attachment-storage-providers:manage`；菜单落在平台配置。    |
| Tests                 | Admin focused component tests + lint/build     | 覆盖固定卡片、write-only secret、创建/编辑/test/set-default 请求和 route guard。 |

## 4. 验证边界

| Area            | Required Evidence                                                                                  | Result Before Execution |
| --------------- | -------------------------------------------------------------------------------------------------- | ----------------------- |
| Route/menu      | `/platform/attachment-storage-providers` route guard + fallback menu entry。                       | Planned                 |
| Card rendering  | local / Huawei OBS 固定卡片，未配置卡片无 dashed border，已配置卡片不暴露 secret 明文。            | Planned                 |
| Create/update   | 创建 local / OBS 配置；编辑时 secret 留空不覆盖已有 AK / SK。                                      | Planned                 |
| Connection test | 点击测试连接传入 `expectedVersion` 并展示后端结果。                                                | Planned                 |
| Set default     | 点击设为默认传入 `expectedVersion`，只对 active + enabled 配置启用按钮。                           | Planned                 |
| Static checks   | `poms-admin` focused tests、`poms-admin` lint/build、`admin-data-access` lint、markdown/diff check | Planned                 |

## 5. 例外与风险

| Exception ID                          | Level  | Scope                 | Approved By | Cleanup Owner          | Cleanup Due                  | Notes                                                                                    |
| ------------------------------------- | ------ | --------------------- | ----------- | ---------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `FE60A-E1-REAL-OBS-TENANT-NOT-RUN`    | medium | real Huawei OBS smoke | Codex local | Deployment / ops owner | before production enablement | 本地无真实 OBS 租户凭据；页面只证明可填写配置并触发后端 `testConnection`。               |
| `FE60A-E2-UPLOAD-SESSION-UX-DEFERRED` | low    | attachment upload UX  | Codex local | `FE-60B` owner         | before FE-60 parent G4       | 本片不改附件面板上传流程；完整 create session -> upload -> complete 体验由 `FE-60B` 做。 |

## 6. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-11`
- Conditions:
  - 不新增后端 public route、DTO、OpenAPI schema、generated client 或 migration。
  - 前端不得展示 secret 明文、内部 storage key 或永久对象 URL。
  - 完成后必须同步 tracker、progress 和 focused validation；若发现 API 字段漂移，先记录 drift 再改运行时代码。
