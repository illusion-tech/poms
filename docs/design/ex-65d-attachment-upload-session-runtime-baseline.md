# EX-65D Upload Session API、OBS 签名上传与旧上传入口 Direct Cutover 实施基线包

- Gate Status: `Pass`
- Parent: `EX-65`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk / public api + persistence + upload runtime`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-11`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-65D`
- Upstream Baselines: `docs/design/ex-65a-attachment-storage-provider-upload-session-baseline.md`, `docs/design/ex-65c-attachment-storage-provider-runtime-baseline.md`

## 1. 范围

- 本次目标:
  - 新增 `attachment_upload_session` 表、entity、repository、service、controller、shared contracts、API DTO、OpenAPI 和 generated client。
  - 落地 create / get / upload-target / local proxy object / complete / abort upload session API。
  - 新建附件和上传新版本统一走 create session -> upload target -> object upload -> complete / abort。
  - Local provider 使用 POMS backend proxy 上传对象；OBS S3-compatible provider 使用短期 presigned put 或 multipart part targets。
  - `complete` 时由后端 `headObject` 校验对象存在、size 和可选 checksum，成功后才创建 active attachment 或新版本。
  - 移除旧 `POST /attachments` 和 `POST /attachments/{id}/versions` multipart public upload 契约，不保留兼容 upload alias。
- 本次明确不做:
  - 不新增前端附件面板交互；`FE-60B` 负责 UI 体验迁移。
  - 不迁移历史附件文件本体。
  - 不暴露永久对象 URL、AK / SK、bucket 写权限或 provider 内部 config。
  - 不关闭 `EX-65` parent；存量读取与回滚证据由 `EX-65E` 收口。
- 下游可依赖的交付边界:
  - `FE-60B` 可消费 generated upload session client，并移除旧 multipart upload client 调用。
  - `EX-65E` 可验证新上传按默认 provider 写入、历史 local 附件仍可读、回滚路径和 OBS 替代证据。

## 2. 正式输入

| Input Type                | Document / Source                                               | Section / Anchor                                     | Status | Notes                                                                 |
| ------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| Business design           | `ex-65a-attachment-storage-provider-upload-session-baseline.md` | upload session status / direct cutover               | Pass   | 新旧上传入口 direct cutover，不保留旧 multipart compatibility alias。 |
| Provider runtime          | `ex-65c-attachment-storage-provider-runtime-baseline.md`        | provider registry `put` / `head` / `read` / `delete` | Pass   | 本片消费 registry 和 provider metadata，不重新实现 storage provider。 |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                              | `EX-65 Attachment Storage Provider / Upload Session` | Pass   | 六条 upload session routes 已登记为 `planned`。                       |
| Existing attachment model | `Attachment` / `AttachmentLink` / `AttachmentService`           | metadata, versioning, links, audit                   | Active | complete 是唯一创建 active attachment / version 的入口。              |
| FE dependency             | `libs/admin/data-access/src/lib/attachment/attachment.store.ts` | existing multipart calls                             | Active | `FE-60B` 迁移 UI；本片生成 client 后必须明确 frontend build impact。  |

## 3. 本次 SSOT

| Concern                     | SSOT                                          | Implementation Rule                                                                                           |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Public route canonical path | `api-route-canonical-inventory.md`            | 新 routes 使用 `/attachment-upload-sessions`；旧 multipart upload routes 在实现完成后记录 direct cutover。    |
| DTO / contract naming       | Shared contracts                              | 使用 `AttachmentUploadSession*`、`AttachmentUploadTarget*`、`CompleteAttachmentUploadSessionRequest`。        |
| Status machine              | `EX-65A` section 7                            | `pending` -> `uploading` -> `uploaded` -> `validating` -> `completed`，失败 / 过期 / 中止为 terminal。        |
| Provider selection          | `AttachmentStorageProviderRegistry`           | session 创建时冻结 provider type、bucket、key 和 upload mode；complete 不再重新选择 default provider。        |
| Versioning                  | Existing `AttachmentService` semantics        | create-version 复制最新 active links、递增 versionNo、更新 latest / final 语义。                              |
| Target permission           | Existing target read/write permission mapping | create / target / complete / abort 均要求 session owner + target write guard；get 允许 owner + target guard。 |
| Object validation           | Provider `headObject`                         | complete 必须验证 size；checksum 在 provider 可支持时校验或作为后续 evidence 记录。                           |
| Secret handling             | Provider registry                             | 前端只拿短期 upload target；永不拿 AK / SK 或 permanent URL。                                                 |

## 4. Public Route 与命令边界

| Route / Controller                                     | Command / Service                 | Request DTO / Contract                   | Response DTO / Contract        | Guard / Permission                                | Inventory Status | Result  |
| ------------------------------------------------------ | --------------------------------- | ---------------------------------------- | ------------------------------ | ------------------------------------------------- | ---------------- | ------- |
| `POST /attachment-upload-sessions`                     | `createAttachmentUploadSession`   | `CreateAttachmentUploadSessionRequest`   | `AttachmentUploadSession`      | `customer:write` / `lead:write` / `project:write` | `B14 planned`    | planned |
| `GET /attachment-upload-sessions/{id}`                 | `getAttachmentUploadSession`      | path `id`                                | `AttachmentUploadSession`      | session owner + target read/write guard           | `B14 planned`    | planned |
| `POST /attachment-upload-sessions/{id}/upload-targets` | `createAttachmentUploadTarget`    | `CreateAttachmentUploadTargetRequest`    | `AttachmentUploadTarget`       | session owner + target write guard                | `B14 planned`    | planned |
| `PUT /attachment-upload-sessions/{id}/object`          | `proxyUploadAttachmentObject`     | binary body                              | `AttachmentUploadTargetResult` | session owner + target write guard                | `B14 planned`    | planned |
| `POST /attachment-upload-sessions/{id}:complete`       | `completeAttachmentUploadSession` | `CompleteAttachmentUploadSessionRequest` | `AttachmentSummary`            | session owner + target write guard                | `B14 planned`    | planned |
| `POST /attachment-upload-sessions/{id}:abort`          | `abortAttachmentUploadSession`    | `AbortAttachmentUploadSessionRequest`    | `AttachmentUploadSession`      | session owner + target write guard                | `B14 planned`    | planned |

旧上传入口 direct cutover:

| Old Route                         | Current Inventory | Target Result In This Slice                                                   |
| --------------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| `POST /attachments`               | `B9 aligned`      | remove controller / OpenAPI upload operation; route inventory records cutover |
| `POST /attachments/{id}/versions` | `B11 aligned`     | remove controller / OpenAPI upload operation; route inventory records cutover |

## 5. 持久化边界

| Table                       | Migration Slice | Entity / Repository       | DDL / Freeze Source | Check Result             |
| --------------------------- | --------------- | ------------------------- | ------------------- | ------------------------ |
| `attachment_upload_session` | `EX-65D`        | `AttachmentUploadSession` | this baseline       | planned                  |
| `attachment`                | existing        | `Attachment`              | existing schema     | no schema change planned |
| `attachment_link`           | existing        | `AttachmentLink`          | existing schema     | no schema change planned |

| Field / Concern                            | Design Type / Meaning                             | Rule                                                                                    | Result  |
| ------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------- | ------- |
| `operation_type`                           | `create-attachment` / `create-version`            | Decides complete path.                                                                  | planned |
| `status`                                   | upload session lifecycle enum                     | Closed enum, indexed with expiry.                                                       | planned |
| `upload_mode`                              | `proxy` / `presigned-put` / `multipart`           | Local uses proxy; OBS chooses put vs multipart by size threshold.                       | planned |
| `provider_type` / `bucket` / `storage_key` | provider snapshot and object key                  | Frozen at session creation or upload-target creation; not exposed as public object URL. | planned |
| `target_type` / `target_id`                | create attachment target                          | Required for `create-attachment`; inferred/copy links for `create-version`.             | planned |
| `base_attachment_id`                       | version upload base                               | Required for `create-version`.                                                          | planned |
| `file metadata`                            | originalName, mimeType, sizeBytes, checksumSha256 | Used for validation and eventual attachment row.                                        | planned |
| `multipart_upload_id` / `parts_json`       | OBS multipart coordination                        | Stored only for backend completion / abort; no secret.                                  | planned |
| `expires_at`                               | session TTL                                       | Expired sessions cannot complete.                                                       | planned |
| `row_version`                              | optimistic lock                                   | target / complete / abort may pass expectedVersion.                                     | planned |

## 6. 测试与校验

| Check                  | Required | Command / Evidence | Result  | Gap / Reason                                                                 |
| ---------------------- | -------- | ------------------ | ------- | ---------------------------------------------------------------------------- |
| API lint               | Yes      | Pending            | Pending | Runtime code.                                                                |
| API focused tests      | Yes      | Pending            | Pending | Session service/controller/provider signing tests.                           |
| API full tests         | Yes      | Pending            | Pending | Old upload direct cutover regression.                                        |
| API build              | Yes      | Pending            | Pending | Runtime + DTO.                                                               |
| OpenAPI generation     | Yes      | Pending            | Pending | Public route surface changed.                                                |
| Generated client check | Yes      | Pending            | Pending | Public route surface changed.                                                |
| Migration apply/check  | Yes      | Pending            | Pending | New table.                                                                   |
| Admin build decision   | Yes      | Pending            | Pending | Generated client removal may require FE-60B or accepted temporary exception. |
| Markdown / diff sanity | Yes      | Pending            | Pending | Docs touched.                                                                |

## 7. 例外与风险

| Exception ID                      | Level  | Scope                        | Approved By | Cleanup Owner | Cleanup Due        | Notes                                                                                                 |
| --------------------------------- | ------ | ---------------------------- | ----------- | ------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| `EX65D-E1-FE60B-FRONTEND-CUTOVER` | medium | Admin attachment panel calls | Codex local | `FE-60B`      | before `FE-60B` G4 | 本片移除旧 upload API 后，frontend 若未同步迁移，需要明确 build impact 或在本片补最小 store adapter。 |
| `EX65D-E2-REAL-OBS-INTEGRATION`   | medium | real Huawei OBS tenant       | Codex local | `EX-65E`      | before `EX-65E` G4 | 本片可以用 mocked SigV4 / provider tests 替代真实租户；真实环境证据由 `EX-65E` 收口。                 |

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-11`
- Conditions:
  - 不保留旧 `POST /attachments` / `POST /attachments/{id}/versions` upload compatibility alias。
  - complete 前不得创建 active attachment row。
  - upload target 必须短期有效，且不得泄露 provider secret 或 permanent object URL。
