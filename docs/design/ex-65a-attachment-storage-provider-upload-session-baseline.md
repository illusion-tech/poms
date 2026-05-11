# EX-65A 附件存储 Provider 与上传会话实施基线包

- Gate Status: `Pass`
- Parent: `EX-65`
- Owner: `Codex`
- Slice Type: `docs-only / process-only / cross-layer-high-risk input freeze`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-11`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-65A`

## 1. 范围

- 本次目标:
  - 冻结附件存储 provider 配置模型、密钥治理、默认 provider 选择、local provider 与华为云 OBS S3-compatible provider 的职责边界。
  - 冻结 upload session 状态机，明确新建附件和上传新版本都必须走 create session -> upload target -> complete / abort 流程。
  - 冻结旧 multipart 上传接口的 direct cutover 口径: 不保留 `POST /attachments` 和 `POST /attachments/{id}/versions` 作为上传入口。
  - 在 `api-route-canonical-inventory.md` 登记后续运行时需要落地的 public route surface。
- 本次明确不做:
  - 不写运行时代码、migration、entity、DTO、controller、OpenAPI 或 generated client。
  - 不实现真实 OBS SDK / S3 client，也不验证真实华为云租户凭据。
  - 不迁移历史本地文件本体，不做 local -> OBS 批量迁移。
  - 不新增前端页面或附件面板交互；这些由 `FE-60A` / `FE-60B` 承接。
- 下游可依赖的交付边界:
  - `EX-65B` 可按本文件实现 provider config 持久化、密钥加密、测试连接和默认 provider API。
  - `EX-65C` 可按本文件抽象 storage provider registry，并实现 local 与 `huawei-obs-s3` provider。
  - `EX-65D` 可按本文件实现 upload session API、OBS presigned / multipart 上传、local proxy 上传和旧上传接口 direct cutover。
  - `EX-65E` 可按本文件验证历史 local 附件读取、下载包读取、OpenAPI / client、测试矩阵和回滚策略。
- 不允许下游依赖的留白:
  - 不承诺附件对象拥有永久公开 URL。
  - 不承诺前端可拿到 AK / SK、内部 storage key、bucket 写权限或 provider 永久配置。
  - 不承诺所有 provider 无限扩展；第一版只冻结 `local` 与 `huawei-obs-s3`，抽象为有限 provider registry。

## 2. 正式输入

| Input Type                | Document / Source                                   | Section / Anchor                                     | Status | Notes                                                                                  |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Business design           | 本轮附件存储 provider / OBS / 上传会话方案          | Conversation decision                                | Pass   | 管理员可配置华为云 OBS；上传最佳实践为后端签发短期上传目标，前端直传或走 local proxy。 |
| Command design            | `phase2-development-execution-tracker.md`           | `EX-65` / `EX-65A` ~ `EX-65E` / `FE-60`              | Pass   | 切片顺序已登记；runtime slices 等待本 G1。                                             |
| DTO / OpenAPI design      | 本文件 4 / 5                                        | Planned contracts                                    | Pass   | DTO 必须先进入 shared contracts，再生成 OpenAPI / client。                             |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                  | `EX-65 Attachment Storage Provider / Upload Session` | Pass   | 新增 public routes 已登记为 `planned`。                                                |
| Query boundary            | 本文件 5                                            | Config list / session detail                         | Pass   | 管理配置、上传会话和附件元数据读取分离。                                               |
| Data model / table freeze | 本文件 6                                            | Provider config + upload session                     | Pass   | 新表由 `EX-65B` / `EX-65D` 分别落地。                                                  |
| Schema / DDL              | `EX-65B` / `EX-65D` future migrations               | Planned                                              | Pass   | migration 由对应 runtime slice 实现。                                                  |
| ADR                       | `../adr/015-api-route-canonical-grammar.md`         | Resource-first grammar                               | Pass   | 配置为平台资源；上传会话为顶层业务资源；动作使用 colon action。                        |
| Existing runtime          | `AttachmentStorageService` / `AttachmentController` | local storage + multipart upload                     | Active | 当前只支持本地文件系统和 multipart 上传；后续 direct cutover。                         |

## 3. 本次 SSOT

| Concern                     | SSOT                                                   | Implementation Rule                                                                                 |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Business semantics          | POMS `Attachment` / `AttachmentLink`                   | 附件元数据、关联、权限和审计仍由 POMS 控制；对象存储只保存二进制对象。                              |
| Public route canonical path | `api-route-canonical-inventory.md`                     | 后续 controller / OpenAPI / client 不得使用未登记 route 或旧上传 alias。                            |
| Route / command naming      | 本文件 4                                               | 管理配置走 `/platform/attachment-storage-providers`；上传走 `/attachment-upload-sessions`。         |
| DTO / contract naming       | Shared contracts                                       | 使用 `AttachmentStorageProviderConfig`、`AttachmentUploadSession`、`AttachmentUploadTarget`。       |
| Table / column naming       | 本文件 6                                               | 表名使用 snake_case；provider code 使用 lower-kebab value object。                                  |
| Date / time semantics       | ISO datetime                                           | session expiry、upload target expiry、completed / aborted 时间均用 `timestamptz` / ISO datetime。   |
| Identifier semantics        | POMS UUID + provider object key string                 | POMS 内部 id 为 UUID；bucket、endpoint、object key 均为 string，不得伪装成 POMS id。                |
| Money / decimal semantics   | N/A                                                    | 本片不涉及金额。                                                                                    |
| Status machine              | 本文件 7                                               | provider config 和 upload session 使用 closed enum；附件 `active` 只在 session `completed` 后生成。 |
| Secret semantics            | `EX-64B` 密钥治理模式 + `EX-65B` shared secret utility | AK / SK 加密落库、写入态回显；API、审计、日志和前端状态不得返回原文 secret。                        |
| Storage read path           | `AttachmentStorageProviderRegistry`                    | 下载、预览、缩略图、批量下载包读取都通过 provider registry，不再直接假设 local filesystem。         |

## 4. 命令与接口边界

### 4.1 Provider 配置 API

| Route / Controller                                                | Command / Service                         | Request DTO / Contract                           | Response DTO / Contract                         | Guard / Permission                             | Design Source | Result  |
| ----------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------- | ------------- | ------- |
| `GET /platform/attachment-storage-providers`                      | `listAttachmentStorageProviderConfigs`    | `AttachmentStorageProviderConfigListQuery`       | `AttachmentStorageProviderConfigList`           | `platform:attachment-storage-providers:manage` | `EX-65B`      | planned |
| `POST /platform/attachment-storage-providers`                     | `createAttachmentStorageProviderConfig`   | `CreateAttachmentStorageProviderConfigRequest`   | `AttachmentStorageProviderConfigDetail`         | `platform:attachment-storage-providers:manage` | `EX-65B`      | planned |
| `GET /platform/attachment-storage-providers/{id}`                 | `getAttachmentStorageProviderConfig`      | path `id`                                        | `AttachmentStorageProviderConfigDetail`         | `platform:attachment-storage-providers:manage` | `EX-65B`      | planned |
| `PATCH /platform/attachment-storage-providers/{id}`               | `updateAttachmentStorageProviderConfig`   | `UpdateAttachmentStorageProviderConfigRequest`   | `AttachmentStorageProviderConfigDetail`         | `platform:attachment-storage-providers:manage` | `EX-65B`      | planned |
| `POST /platform/attachment-storage-providers/{id}:testConnection` | `testAttachmentStorageProviderConnection` | `TestAttachmentStorageProviderConnectionRequest` | `AttachmentStorageProviderConnectionTestResult` | `platform:attachment-storage-providers:manage` | `EX-65B`      | planned |
| `POST /platform/attachment-storage-providers/{id}:set-default`    | `setDefaultAttachmentStorageProvider`     | `SetDefaultAttachmentStorageProviderRequest`     | `AttachmentStorageProviderConfigDetail`         | `platform:attachment-storage-providers:manage` | `EX-65B`      | planned |

### 4.2 Upload Session API

| Route / Controller                                     | Command / Service                 | Request DTO / Contract                   | Response DTO / Contract        | Guard / Permission                                | Design Source | Result  |
| ------------------------------------------------------ | --------------------------------- | ---------------------------------------- | ------------------------------ | ------------------------------------------------- | ------------- | ------- |
| `POST /attachment-upload-sessions`                     | `createAttachmentUploadSession`   | `CreateAttachmentUploadSessionRequest`   | `AttachmentUploadSession`      | `customer:write` / `lead:write` / `project:write` | `EX-65D`      | planned |
| `GET /attachment-upload-sessions/{id}`                 | `getAttachmentUploadSession`      | path `id`                                | `AttachmentUploadSession`      | session owner + target read/write guard           | `EX-65D`      | planned |
| `POST /attachment-upload-sessions/{id}/upload-targets` | `createAttachmentUploadTarget`    | `CreateAttachmentUploadTargetRequest`    | `AttachmentUploadTarget`       | session owner + target write guard                | `EX-65D`      | planned |
| `PUT /attachment-upload-sessions/{id}/object`          | `proxyUploadAttachmentObject`     | binary body                              | `AttachmentUploadTargetResult` | session owner + target write guard                | `EX-65D`      | planned |
| `POST /attachment-upload-sessions/{id}:complete`       | `completeAttachmentUploadSession` | `CompleteAttachmentUploadSessionRequest` | `AttachmentSummary`            | session owner + target write guard                | `EX-65D`      | planned |
| `POST /attachment-upload-sessions/{id}:abort`          | `abortAttachmentUploadSession`    | `AbortAttachmentUploadSessionRequest`    | `AttachmentUploadSession`      | session owner + target write guard                | `EX-65D`      | planned |

### 4.3 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): see `EX-65 Attachment Storage Provider / Upload Session` section.
- Current implemented route(s):
  - Existing upload: `POST /attachments`, `POST /attachments/{id}/versions`.
  - Existing read / metadata routes remain unchanged.
- Inventory status: `planned` for new routes; old upload routes remain `aligned` until `EX-65D` direct cutover removes them.
- Route governance source: `ADR-015` + this baseline.
- Blocker / exception: runtime slices are blocked until they consume this inventory; no compatibility alias is allowed for old upload routes after `EX-65D`.

## 5. 读侧边界

| Query / View                         | Consumer          | Fields                                                                                                         | Filter / Sort                          | Permission Boundary                            | Design Source       | Result  |
| ------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------- | ------------------- | ------- |
| Provider config list/detail          | `FE-60A`          | provider type, display name, enabled, status, default flag, endpoint, region, bucket, key prefix, secret state | provider type, status, enabled         | `platform:attachment-storage-providers:manage` | `EX-65B`            | planned |
| Upload session detail                | attachment panel  | operation type, target, file metadata, provider type, upload mode, status, expiresAt, progress metadata        | by session id                          | session owner + target read/write guard        | `EX-65D`            | planned |
| Upload target response               | attachment panel  | local proxy URL or OBS presigned URL / multipart part URLs, method, headers, expiresAt, part numbers           | by session id                          | session owner + target write guard             | `EX-65D`            | planned |
| Existing attachment list/detail/read | current UI / APIs | existing `AttachmentSummary`, download / preview / thumbnail streams                                           | existing target filters                | existing target read guard                     | `EX-65C` / `EX-65E` | planned |
| Download package read                | project handover  | existing package status, manifest, controlled download stream                                                  | existing package id / handover filters | existing handover read guard                   | `EX-65C` / `EX-65E` | planned |

Read path rules:

1. Existing attachment list / detail DTOs do not expose bucket, object key, endpoint, presigned URL, AK / SK or provider internal config.
2. Download, preview, thumbnail and batch download keep POMS backend authorization as the entry point.
3. Object reads may internally stream from local filesystem or OBS, but the caller observes the same authenticated POMS response contract.
4. Presigned upload targets are write-only, short-lived and scoped to the generated object key for one upload session.

## 6. 持久化边界

### 6.1 Table freeze

| Table                                | Migration Slice | Entity / Repository                      | DDL / Freeze Source | Check Result   |
| ------------------------------------ | --------------- | ---------------------------------------- | ------------------- | -------------- |
| `attachment_storage_provider_config` | `EX-65B`        | future `AttachmentStorageProviderConfig` | this baseline       | planned        |
| `attachment_upload_session`          | `EX-65D`        | future `AttachmentUploadSession`         | this baseline       | planned        |
| `attachment`                         | `EX-65D`        | existing `Attachment`                    | this baseline       | planned alter  |
| `attachment_download_package`        | `EX-65E`        | existing `AttachmentDownloadPackage`     | this baseline       | planned review |

### 6.2 Field semantics

| Field / Concern                         | Design Type / Meaning                          | Migration / DDL Rule                                      | Entity / Contract Rule                                                 | Result  |
| --------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- | ------- |
| `provider_type`                         | closed provider code: `local`, `huawei-obs-s3` | varchar + check / shared enum                             | finite registry, no free-form provider id                              | planned |
| `display_name`                          | administrator-facing name                      | varchar                                                   | returned to FE config card                                             | planned |
| `enabled` / `status` / `is_default`     | operational control and health                 | booleans + closed status enum + unique default constraint | only one enabled default may be selected                               | planned |
| `endpoint` / `region` / `bucket`        | OBS S3-compatible address metadata             | nullable for `local`, required for `huawei-obs-s3`        | visible to admin except secret fields                                  | planned |
| `key_prefix`                            | backend-controlled object key prefix           | nullable / string                                         | backend prepends; frontend never chooses full object key               | planned |
| `force_path_style`                      | S3-compatible client option                    | boolean                                                   | required option for compatible endpoints when needed                   | planned |
| `encrypted_access_key_id`               | OBS AK or compatible access key                | encrypted at rest; write-only output                      | API returns `accessKeyConfigured`, not raw value                       | planned |
| `encrypted_secret_access_key`           | OBS SK or compatible secret key                | encrypted at rest; write-only output                      | API returns `secretAccessKeyConfigured`, not raw value                 | planned |
| `attachment.storage_provider_config_id` | provider config used by this object            | nullable FK; legacy rows may stay null                    | new rows must set it; legacy local rows fallback by `storage_provider` | planned |
| `attachment.storage_provider`           | provider type snapshot                         | existing column retained                                  | set from config provider type                                          | planned |
| `attachment.storage_bucket`             | bucket snapshot                                | existing nullable column retained                         | local remains null; OBS stores bucket                                  | planned |
| `attachment.storage_key`                | provider object key                            | existing column retained                                  | generated by backend; never exposed as public URL                      | planned |
| `operation_type`                        | `create-attachment` or `create-version`        | closed enum                                               | decides whether complete creates first attachment or new version       | planned |
| `upload_mode`                           | `proxy`, `presigned-put`, `multipart`          | closed enum                                               | local uses proxy; OBS chooses presigned put or multipart by size       | planned |
| `session.status`                        | upload session lifecycle                       | closed enum + indexed expiry                              | see section 7                                                          | planned |
| `multipart_upload_id` / `parts`         | OBS multipart coordination                     | nullable encrypted or JSON as needed                      | never returned beyond signed upload target metadata                    | planned |

Minimum constraints:

1. `attachment_storage_provider_config`: unique provider type + bucket + key prefix for enabled configs; unique partial default where `enabled = true` and `is_default = true`.
2. `attachment_upload_session`: indexed by `status`, `expires_at`, `created_by`, `target_type + target_id`; one session may create exactly one attachment version.
3. `attachment`: new rows must store `storage_provider_config_id` unless created from legacy fallback logic during a controlled migration window.
4. Secret columns must never be logged in `audit_log.beforeSnapshot` / `afterSnapshot`.

## 7. 状态机与 provider 行为

### 7.1 Provider config status

| Status          | Meaning                                          | Allowed Transitions         |
| --------------- | ------------------------------------------------ | --------------------------- |
| `draft`         | config saved but incomplete or not enabled       | `active`, `disabled`        |
| `active`        | config enabled, testable and eligible as default | `disabled`, `misconfigured` |
| `disabled`      | config retained but not used for new uploads     | `active`, `misconfigured`   |
| `misconfigured` | latest test or runtime health failed             | `active`, `disabled`        |

Provider rules:

1. `local` provider writes through POMS backend proxy to the configured local root and keeps existing path traversal protections.
2. `huawei-obs-s3` provider uses S3-compatible endpoint semantics, backend-generated object keys and short-lived signed upload targets.
3. New uploads use the current enabled default provider unless the backend command explicitly selects another enabled provider for an admin operation.
4. Disabling a provider blocks new upload sessions but must not block reading existing attachments that reference it.

### 7.2 Upload session status

| Status       | Meaning                                                      | Allowed Transitions                          |
| ------------ | ------------------------------------------------------------ | -------------------------------------------- |
| `pending`    | session created; no upload target issued yet                 | `uploading`, `aborted`, `expired`            |
| `uploading`  | upload target issued; client may upload bytes                | `uploaded`, `failed`, `aborted`, `expired`   |
| `uploaded`   | client reports upload finished; backend has not validated    | `validating`, `failed`, `aborted`, `expired` |
| `validating` | backend is verifying size, checksum and object existence     | `completed`, `failed`                        |
| `completed`  | attachment row / version row and links have been created     | terminal                                     |
| `failed`     | upload or validation failed                                  | terminal                                     |
| `expired`    | session passed expiry before completion                      | terminal                                     |
| `aborted`    | caller cancelled the session; best-effort object cleanup run | terminal                                     |

Completion rules:

1. `complete` must verify object existence and size; checksum verification is required when the client supplied checksum and provider can support it.
2. `complete` is the only point that creates an `active` attachment row or new attachment version.
3. If `complete` fails after object upload, the session moves to `failed` and provider cleanup is best-effort.
4. Existing attachment read / metadata / void / final routes continue to operate on the resulting `Attachment` rows.

## 8. 一致性结论

- Document -> code: no runtime code in this slice; future code must consume this baseline.
- ADR-015 inventory -> route: all new public routes are added to `api-route-canonical-inventory.md` as `planned`.
- Migration -> entity: blocked until `EX-65B` / `EX-65D`; table and field semantics are frozen here.
- Entity -> contract: future shared contracts must use provider-neutral names and closed enum provider codes.
- Route -> command: controller names and command names are frozen in section 4.
- Query -> view: `FE-60A` and `FE-60B` only consume bounded read views in section 5.
- Guard / permission:
  - `platform:attachment-storage-providers:manage` for provider config management.
  - Existing target write permissions for upload sessions.
  - Existing target read permissions for download / preview / thumbnail / package read.
- OpenAPI / generated client: runtime slices must regenerate and check client after contract changes.

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                      | Result       | Gap / Reason                     |
| -------------------------------- | -------- | ------------------------------------------------------- | ------------ | -------------------------------- |
| Lint                             | No       | N/A                                                     | Not required | Docs-only slice.                 |
| Build                            | No       | N/A                                                     | Not required | No runtime code.                 |
| Unit tests                       | No       | N/A                                                     | Not required | No runtime code.                 |
| API / integration tests          | No       | N/A                                                     | Not required | No runtime code.                 |
| E2E                              | No       | N/A                                                     | Not required | No runtime code.                 |
| OpenAPI generation / client diff | No       | N/A                                                     | Not required | Inventory only; no OpenAPI code. |
| Migration / schema check         | No       | N/A                                                     | Not required | No DDL.                          |
| Markdown                         | Yes      | `corepack pnpm run format:md:check`; `git diff --check` | Pass         | Docs-only validation passed.     |

## 10. 例外与风险

| Exception ID                                  | Level  | Scope                      | Approved By | Cleanup Owner       | Cleanup Due        | Notes                                                                                             |
| --------------------------------------------- | ------ | -------------------------- | ----------- | ------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `EX65A-E1-REAL-OBS-INTEGRATION-DEFERRED`      | medium | Huawei OBS real tenant     | Codex local | `EX-65C` / `EX-65D` | before `EX-65E` G4 | G1 不验证真实云租户；runtime slice 必须使用 mock、localstack-like S3 或真实环境凭据提供替代证据。 |
| `EX65A-E2-HISTORICAL-FILE-MIGRATION-DEFERRED` | low    | Existing local attachments | Codex local | future slice        | not scheduled      | 第一版只保证历史 local 附件可读；不做文件本体迁移。                                               |

Known risks for runtime slices:

1. OBS presigned URL 的过期、CORS、multipart part size 和 checksum 能力必须在 `EX-65D` 明确测试替代证据。
2. Provider config 禁用后仍要支持旧附件读取；读取路径不能只依赖当前默认 provider。
3. 旧 multipart 上传 direct cutover 会影响所有现有附件面板调用点，`FE-60B` 必须覆盖线索、客户、项目、合同和项目移交入口。
4. Secret 加密工具应从 `EX-64B` 的身份 provider 密钥治理抽象为可复用能力，避免每个 provider 模块重复实现。

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-11`
- Conditions:
  - `EX-65B` must implement provider config first and introduce `platform:attachment-storage-providers:manage`.
  - `EX-65C` must route all attachment object reads and writes through a provider registry.
  - `EX-65D` must remove old multipart upload public entry points from frontend usage and backend contract; no compatibility upload alias.
  - `EX-65E` must prove historical local attachment reads still work before closing `EX-65`.
