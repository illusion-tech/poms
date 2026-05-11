# EX-65E 附件存储 Provider 收口验证、存量读取与回滚实施基线包

- Gate Status: `Pass`
- Parent: `EX-65`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `integration closeout + regression evidence`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-11`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-65E`
- Upstream Slices: `EX-65A` ~ `EX-65D`

## 1. 范围

- 本次目标:
  - 汇总 `EX-65B` provider config、`EX-65C` provider registry、`EX-65D` upload session runtime 的集成证据。
  - 证明历史 local 附件读路径仍可用：下载、预览、缩略图、版本列表和项目移交下载包仍经过 POMS backend 鉴权读取，不暴露 storage key、bucket 写权限或永久 URL。
  - 证明新上传按默认 provider 冻结 provider type / bucket / storage key，local 使用 proxy，OBS 使用短期 presigned PUT。
  - 补齐 OpenAPI / generated client、migration drift、focused/full tests、lint/build 和 markdown/diff sanity 证据。
  - 固化回滚策略：禁用 provider、切回 local default、回滚 upload session DDL、保留历史对象读取能力。
  - 关闭或重分类前序真实 OBS、multipart target 和历史 local 读取例外。
- 本次明确不做:
  - 不新增 public route、DTO、OpenAPI schema、generated client surface 或 DB migration。
  - 不实现 OBS multipart initiation / part target / complete-multipart；当前附件默认上限为 50MB，第一版以 presigned PUT 完成直传闭环，multipart 作为后续大文件增强评估。
  - 不迁移历史 local 文件本体到 OBS。
  - 不新增前端配置卡片页或完整上传 UX；`FE-60A` / `FE-60B` 承接。
- 下游可依赖的交付边界:
  - `FE-60A` 可开始附件存储 provider 配置卡片页。
  - `FE-60B` 可基于 generated upload session client 和当前 store adapter 补齐真实上传 UX。
  - 部署 / 运维可按本片回滚和真实 OBS 启用清单做生产前验证。

## 2. 正式输入

| Input Type          | Document / Source                                               | Section / Anchor                          | Status | Notes                                                           |
| ------------------- | --------------------------------------------------------------- | ----------------------------------------- | ------ | --------------------------------------------------------------- |
| Governance baseline | `ex-65a-attachment-storage-provider-upload-session-baseline.md` | `EX-65E` validation and read path rules   | Pass   | 要求证明历史 local 附件可读，并收口 OBS 替代证据。              |
| Provider config     | `ex-65b-attachment-storage-provider-config-runtime-closeout.md` | Provider config API / secret handling     | Pass   | 本片消费配置、密钥治理、testConnection 和默认 provider 语义。   |
| Provider registry   | `ex-65c-attachment-storage-provider-runtime-closeout.md`        | registry read/write integration           | Pass   | 本片验证 read fallback、disabled provider read 和 OBS mock。    |
| Upload session      | `ex-65d-attachment-upload-session-runtime-closeout.md`          | upload session API / direct cutover       | Pass   | 本片验证新上传路径、旧 upload route 移除和 multipart 例外处理。 |
| Route inventory     | `api-route-canonical-inventory.md`                              | `B14` attachment storage / upload session | Pass   | 不新增 route；只确认现有 rows 仍为 `aligned`。                  |

## 3. 本次 SSOT

| Concern             | SSOT                                | Implementation / Validation Rule                                                                                  |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Public routes       | `api-route-canonical-inventory.md`  | 本片不新增 / 删除 route；旧 upload routes 已由 `EX-65D` 记录 direct cutover。                                     |
| Read authorization  | Existing `AttachmentService` guards | 下载、预览、缩略图和下载包读取继续要求业务对象读取权限；对象存储只作为后端内部实现。                              |
| Provider resolution | `AttachmentStorageProviderRegistry` | 历史附件按 `storageProvider` / `storageBucket` / `storageKey` 解析，local 可 fallback，disabled provider 仍可读。 |
| New upload writes   | Upload session runtime              | create session 时冻结 provider snapshot；complete 前不创建 active attachment。                                    |
| OBS evidence        | Provider mock tests + ops checklist | 本地不持有真实 OBS 租户凭据；用 SigV4 URL/header tests 和 provider test path 作为替代证据。                       |
| Rollback            | Provider config + migrations        | 优先禁用 OBS / 切 local default；代码回滚时配合 migration down；历史对象位置不改写。                              |

## 4. 验证边界

| Area                       | Required Evidence                                                                                         | Result Before Execution |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------- |
| Historical local download  | Service focused test 断言 legacy local attachment download 调用 `openReadStream`。                        | Planned                 |
| Historical local preview   | Existing preview focused test 断言受控 preview 读取 storage stream。                                      | Planned                 |
| Historical local thumbnail | Focused test 断言 thumbnail 继续通过同一 storage location 读取。                                          | Planned                 |
| Attachment versions        | Existing version tests 验证 version chain / links；版本列表不需要读对象本体。                             | Planned                 |
| Download package read      | Focused test 断言 ready package download 使用 `storageLocationForDownloadPackage`。                       | Planned                 |
| New default provider write | Upload session / registry focused tests 断言 provider type、bucket、prefixed key 和 upload mode 被冻结。  | Planned                 |
| OBS mock evidence          | Huawei OBS provider tests 覆盖 SigV4 put/head/testConnection/presigned PUT，不暴露 authorization header。 | Planned                 |
| Migration / OpenAPI        | `migration-check`、`openapi`、`shared-api-client:check`。                                                 | Planned                 |
| Build / lint / full tests  | API lint/build/full tests；Admin build 作为 generated client 消费侧 smoke。                               | Planned                 |

## 5. 例外与风险

| Exception ID                                  | Level  | Scope                    | Approved By | Cleanup Owner               | Cleanup Due                    | Notes                                                                                                                        |
| --------------------------------------------- | ------ | ------------------------ | ----------- | --------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `EX65E-E1-REAL-OBS-TENANT-NOT-RUN`            | medium | real Huawei OBS tenant   | Codex local | Deployment / ops owner      | before production enablement   | 本地无真实 OBS App 凭据；本片以 mocked SigV4 / provider tests 替代，生产启用前必须运行真实 `testConnection` 和上传下载烟测。 |
| `EX65E-E2-MULTIPART-UPLOAD-ENHANCEMENT`       | low    | large-file upload target | Codex local | Future upload scaling owner | when max upload size is raised | 当前附件默认上限 50MB，第一版 OBS 直传用 presigned PUT；multipart 不作为 `EX-65` 最小闭环阻塞项。                            |
| `EX65A-E2-HISTORICAL-FILE-MIGRATION-DEFERRED` | low    | historical local files   | Codex local | Future migration owner      | not scheduled                  | 第一版只保证历史 local 附件可读，不搬迁文件本体。                                                                            |

## 6. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-11`
- Conditions:
  - 本片不得新增 public route / DTO / migration；若验证发现 drift，必须先记录 corrective checkpoint。
  - 读侧验证必须覆盖普通附件下载、预览 / 缩略图、项目移交下载包和 provider registry fallback。
  - `EX-65` parent 只有在 `EX-65E` 证据、tracker、progress 和 closeout 全部同步后才能推进 `Done / G4`。
