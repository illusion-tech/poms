# EX-65B 附件存储 Provider 配置运行时实施基线包

- Gate Status: `Pass`
- Parent: `EX-65`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk / api + persistence + generated client`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-11`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-65B`
- Upstream Baseline: `docs/design/ex-65a-attachment-storage-provider-upload-session-baseline.md`

## 1. 范围

- 本次目标:
  - 新增 `attachment_storage_provider_config` 表、entity、repository、service、controller 和 module wiring。
  - 新增 `local` / `huawei-obs-s3` provider config shared contracts、API DTO、OpenAPI schema 和 generated shared API client。
  - 新增 `platform:attachment-storage-providers:manage` 权限，并在 migration 中给 `platform-admin` 角色补齐权限。
  - 落地 provider 配置 API：list / create / detail / update / testConnection / set-default。
  - 抽象可复用 `SecretCipherService`，让外部身份 provider 与附件存储 provider 共享密钥加密能力。
- 本次明确不做:
  - 不实现 provider registry、OBS SDK / S3 client、对象读写、presigned URL 或 multipart 上传。
  - 不改现有附件上传 / 下载 / 预览 / 批量下载运行时。
  - 不迁移历史附件文件，也不新增 upload session 表。
  - 不新增前端配置页面。
- 下游可依赖的交付边界:
  - `EX-65C` 可消费 provider config entity / service、默认 provider 查询、secret 解密工具和 generated contracts。
  - `FE-60A` 可消费 generated client 配置卡片接口。
  - `EX-65D` 仍需等待 `EX-65C` provider registry 完成后再接 upload session。
- 不允许下游依赖的留白:
  - `testConnection` 在本片只做本地配置完整性校验；真实 OBS 连通性由 `EX-65C` / `EX-65E` 提供替代证据。
  - API 不返回 AK / SK 原文、加密密文、bucket 写权限或永久对象 URL。

## 2. 正式输入

| Input Type                | Document / Source                                               | Section / Anchor                                     | Status | Notes                                                   |
| ------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- | ------ | ------------------------------------------------------- |
| Business design           | `ex-65a-attachment-storage-provider-upload-session-baseline.md` | Provider config / secret semantics                   | Pass   | provider 只管理配置和密钥，不承担业务附件事实源。       |
| Command design            | `phase2-development-execution-tracker.md`                       | `EX-65B`                                             | Pass   | 本片负责配置持久化、密钥治理与测试连接 API。            |
| DTO / OpenAPI design      | 本文件 4                                                        | Provider config planned contracts                    | Pass   | shared contracts 是 DTO SSOT。                          |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                              | `EX-65 Attachment Storage Provider / Upload Session` | Pass   | `EX-65B` 六条 provider config routes 已登记为 planned。 |
| Query boundary            | 本文件 5                                                        | Provider config list/detail                          | Pass   | 只返回配置元数据和 secret configured 状态。             |
| Data model / table freeze | 本文件 6                                                        | `attachment_storage_provider_config`                 | Pass   | 本片落地 migration + entity。                           |
| Schema / DDL              | 本文件 6                                                        | Field semantics                                      | Pass   | migration 与 Mikro metadata 必须对齐。                  |
| ADR                       | `../adr/015-api-route-canonical-grammar.md`                     | Resource-first grammar                               | Pass   | set-default 和 testConnection 使用 colon action。       |

## 3. 本次 SSOT

| Concern                     | SSOT                                    | Implementation Rule                                                                                                |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Business semantics          | `EX-65A` baseline                       | POMS 附件仍是业务事实源；provider config 只决定对象写入 / 读取位置。                                               |
| Public route canonical path | `api-route-canonical-inventory.md`      | 后续 controller / OpenAPI / client 必须使用 `B14` canonical route。                                                |
| Route / command naming      | 本文件 4                                | provider config 管理统一走 `/platform/attachment-storage-providers`。                                              |
| DTO / contract naming       | Shared contracts                        | 使用 `AttachmentStorageProviderConfig*`、`AttachmentStorageProviderConnectionTestResult`。                         |
| Table / column naming       | 本文件 6                                | 表名 `attachment_storage_provider_config`；secret 列为 `encrypted_access_key_id` / `encrypted_secret_access_key`。 |
| Date / time semantics       | ISO datetime                            | secret 更新时间、测试时间、创建 / 更新时间均用 timestamptz / ISO datetime。                                        |
| Identifier semantics        | POMS UUID + provider string identifiers | config id 是 UUID；provider endpoint / bucket / key prefix 是 string。                                             |
| Money / decimal semantics   | N/A                                     | 本片不涉及金额。                                                                                                   |
| Status machine              | `EX-65A` provider status                | `draft` / `active` / `disabled` / `misconfigured` closed enum。                                                    |
| Secret semantics            | `SecretCipherService`                   | 加密写入、只返回 configured booleans；audit snapshot 不含原文或密文。                                              |

## 4. 命令与接口边界

| Route / Controller                                                | Command / Service                         | Request DTO / Contract                           | Response DTO / Contract                         | Guard / Permission                             | Design Source | Result      |
| ----------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------- | ------------- | ----------- |
| `GET /platform/attachment-storage-providers`                      | `listAttachmentStorageProviderConfigs`    | `AttachmentStorageProviderConfigListQuery`       | `AttachmentStorageProviderConfigList`           | `platform:attachment-storage-providers:manage` | `EX-65B`      | implemented |
| `POST /platform/attachment-storage-providers`                     | `createAttachmentStorageProviderConfig`   | `CreateAttachmentStorageProviderConfigRequest`   | `AttachmentStorageProviderConfigDetail`         | `platform:attachment-storage-providers:manage` | `EX-65B`      | implemented |
| `GET /platform/attachment-storage-providers/{id}`                 | `getAttachmentStorageProviderConfig`      | path `id`                                        | `AttachmentStorageProviderConfigDetail`         | `platform:attachment-storage-providers:manage` | `EX-65B`      | implemented |
| `PATCH /platform/attachment-storage-providers/{id}`               | `updateAttachmentStorageProviderConfig`   | `UpdateAttachmentStorageProviderConfigRequest`   | `AttachmentStorageProviderConfigDetail`         | `platform:attachment-storage-providers:manage` | `EX-65B`      | implemented |
| `POST /platform/attachment-storage-providers/{id}:testConnection` | `testAttachmentStorageProviderConnection` | `TestAttachmentStorageProviderConnectionRequest` | `AttachmentStorageProviderConnectionTestResult` | `platform:attachment-storage-providers:manage` | `EX-65B`      | implemented |
| `POST /platform/attachment-storage-providers/{id}:set-default`    | `setDefaultAttachmentStorageProvider`     | `SetDefaultAttachmentStorageProviderRequest`     | `AttachmentStorageProviderConfigDetail`         | `platform:attachment-storage-providers:manage` | `EX-65B`      | implemented |

## 5. 读侧边界

| Query / View                | Consumer | Fields                                                                                                        | Filter / Sort                 | Permission Boundary                            | Design Source | Result      |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------- | ------------- | ----------- |
| Provider config list/detail | FE-60A   | providerType, displayName, status, enabled, isDefault, endpoint, region, bucket, keyPrefix, secret configured | providerType, status, enabled | `platform:attachment-storage-providers:manage` | `EX-65B`      | implemented |
| Connection test result      | FE-60A   | status, message, checkedAt                                                                                    | by config id                  | `platform:attachment-storage-providers:manage` | `EX-65B`      | implemented |

## 6. 持久化边界

| Table                                | Migration Slice | Entity / Repository                 | DDL / Freeze Source | Check Result |
| ------------------------------------ | --------------- | ----------------------------------- | ------------------- | ------------ |
| `attachment_storage_provider_config` | `EX-65B`        | `AttachmentStorageProviderConfig`   | this baseline       | Pass         |
| `role_permission_assignment`         | `EX-65B`        | existing `RolePermissionAssignment` | migration           | Pass         |

| Field / Concern                  | Design Type / Meaning            | Migration / DDL Rule                                  | Entity / Contract Rule                                      | Result |
| -------------------------------- | -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- | ------ |
| `provider_type`                  | `local` / `huawei-obs-s3`        | varchar + check                                       | shared closed enum                                          | Pass   |
| `display_name`                   | admin-facing label               | varchar(128)                                          | returned to FE                                              | Pass   |
| `status`                         | provider config lifecycle        | varchar + check + default `draft`                     | closed enum                                                 | Pass   |
| `enabled` / `is_default`         | operational flags                | boolean defaults; unique active default partial index | default requires enabled + active                           | Pass   |
| `endpoint` / `region` / `bucket` | OBS S3-compatible config         | nullable for local; required before active OBS        | visible to admin                                            | Pass   |
| `key_prefix`                     | backend-controlled object prefix | varchar(512) nullable                                 | normalized trim, no leading slash requirement in this slice | Pass   |
| `force_path_style`               | S3-compatible client option      | boolean default false                                 | visible to admin                                            | Pass   |
| `encrypted_access_key_id`        | OBS AK or compatible access key  | text nullable                                         | write-only; response returns `accessKeyConfigured`          | Pass   |
| `encrypted_secret_access_key`    | OBS SK or compatible secret key  | text nullable                                         | write-only; response returns `secretAccessKeyConfigured`    | Pass   |
| `credentials_updated_at`         | latest secret write time         | timestamptz nullable                                  | returned as ISO datetime nullable                           | Pass   |
| `row_version`                    | optimistic lock                  | int version                                           | update / test / set-default can pass expectedVersion        | Pass   |

## 7. 一致性结论

- Document -> code: implementation must stay within provider config runtime only.
- ADR-015 inventory -> route: six provider config routes already exist as `planned`.
- Migration -> entity: migration and Mikro metadata must include table comment, checks and indexes.
- Entity -> contract: contracts expose configured booleans, not encrypted columns.
- Route -> command: controller delegates directly to service methods in section 4.
- Query -> view: list/detail response is bounded and admin-only.
- Guard / permission: all routes use `platform:attachment-storage-providers:manage`.
- OpenAPI / generated client: must regenerate and check after DTO/controller changes.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                                                                                                                                                                                                          | Result                      | Gap / Reason                                        |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------- |
| API lint                         | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                            | Pass                        | N/A                                                 |
| API focused tests                | Yes      | `corepack pnpm nx test poms-api --runTestsByPath src/app/core/secret/secret-cipher.service.spec.ts src/app/features/attachment/attachment-storage-provider.service.spec.ts src/app/features/attachment/attachment-storage-provider.controller.spec.ts src/app/features/identity-provider/identity-provider.service.spec.ts --skip-nx-cache` | Pass, 4 suites / 36 tests   | N/A                                                 |
| API full tests                   | Yes      | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                            | Pass, 59 suites / 650 tests | N/A                                                 |
| API build                        | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                           | Pass                        | N/A                                                 |
| Admin build                      | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                                                                                                                                                         | Pass                        | N/A                                                 |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`; `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`; `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                                                                                                                  | Pass                        | Existing `propertyNames` generator warning remains. |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-up --skip-nx-cache`; `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                                                                               | Pass, schema is up-to-date  | N/A                                                 |
| Markdown / diff sanity           | Yes      | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                                                                                                      | Pass                        | N/A                                                 |

## 9. 例外与风险

| Exception ID                        | Level  | Scope                | Approved By | Cleanup Owner       | Cleanup Due        | Notes                                                               |
| ----------------------------------- | ------ | -------------------- | ----------- | ------------------- | ------------------ | ------------------------------------------------------------------- |
| `EX65B-E1-NO-REAL-OBS-NETWORK-TEST` | medium | testConnection route | Codex local | `EX-65C` / `EX-65E` | before `EX-65E` G4 | 本片只做本地配置完整性校验；真实 provider network test 后续补证据。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-11`
- Conditions:
  - 本片不得改 upload session 或附件上传入口。
  - `testConnection` 必须显式说明网络校验 deferred，不伪装成真实 OBS 连通性验证。
  - 完成后 route inventory 中 `EX-65B` 六条 provider config route 才能从 `planned` 切到 `aligned`。
