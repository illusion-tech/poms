# EX-65C 附件存储 Provider Registry 与对象运行时实施基线包

- Gate Status: `Pass`
- Parent: `EX-65`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk / backend runtime + provider abstraction`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-11`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-65C`
- Upstream Baselines: `docs/design/ex-65a-attachment-storage-provider-upload-session-baseline.md`, `docs/design/ex-65b-attachment-storage-provider-config-runtime-baseline.md`

## 1. 范围

- 本次目标:
  - 新增附件对象存储 provider interface、registry、local provider 和 `huawei-obs-s3` provider。
  - Provider runtime 支持 `put` / `head` / `read` / `delete` / `test` 能力，并以统一错误映射返回给上层服务。
  - 现有附件下载、预览、缩略图、批量下载包读取、旧 multipart 上传写入和 best-effort delete 全部通过 registry，不再直接假设 local filesystem。
  - 华为云 OBS provider 按 S3-compatible endpoint、bucket、region、keyPrefix、forcePathStyle、AK / SK 配置进行 SigV4 header signing。
  - Provider config 的 `testConnection` 从配置完整性检查升级为调用 provider runtime 的本地路径或 OBS 网络探测。
- 本次明确不做:
  - 不新增 public route、DTO、OpenAPI 或 generated client。
  - 不实现 upload session、presigned URL、multipart 上传、local proxy upload route 或旧上传入口移除。
  - 不新增 `attachment.storage_provider_config_id` migration；本片按 provider type + bucket + keyPrefix 解析读取配置，legacy local 继续 fallback。
  - 不迁移历史附件文件本体。
  - 不新增前端页面。
- 下游可依赖的交付边界:
  - `EX-65D` 可消费 registry 的对象 `put` / `head` / `read` / `delete` 能力和默认 provider 解析。
  - `EX-65E` 可基于本片验证历史 local 附件仍可读，OBS provider 可用 mock 或真实租户替代证据。
- 不允许下游依赖的留白:
  - 前端仍不能拿到 AK / SK、内部 storage key、bucket 写权限或永久对象 URL。
  - OBS presigned / multipart upload target 仍未实现，不能把本片 server-side `put` 当成最终上传体验。

## 2. 正式输入

| Input Type                | Document / Source                                               | Section / Anchor                                     | Status | Notes                                                                             |
| ------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Business design           | `ex-65a-attachment-storage-provider-upload-session-baseline.md` | Storage read path / provider rules                   | Pass   | 附件元数据仍由 POMS 控制，对象存储只保存二进制对象。                              |
| Runtime config            | `ex-65b-attachment-storage-provider-config-runtime-baseline.md` | provider config entity / secret semantics            | Pass   | 本片消费配置表与 `SecretCipherService`，不得暴露 secret。                         |
| Tracker row               | `phase2-development-execution-tracker.md`                       | `EX-65C`                                             | Pass   | 本片交付 provider registry、local provider 和 Huawei OBS S3-compatible provider。 |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                              | `EX-65 Attachment Storage Provider / Upload Session` | Pass   | 本片不新增 route；既有 provider config routes 已在 `EX-65B` aligned。             |
| Existing runtime          | `AttachmentStorageService` / `AttachmentService`                | local filesystem reads and writes                    | Active | 当前直接读写本地文件；本片改为 provider registry，但 public route surface 不变。  |

## 3. 本次 SSOT

| Concern               | SSOT                                             | Implementation Rule                                                                      |
| --------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Provider identity     | Shared contracts `AttachmentStorageProviderType` | 仅支持 `local` 与 `huawei-obs-s3`，registry 对未知 provider fail closed。                |
| Object key semantics  | Backend-generated storage key                    | `AttachmentStorageService` 生成相对 key；registry 按 config `keyPrefix` 前缀化。         |
| Default provider      | `attachment_storage_provider_config.is_default`  | 新写入优先使用 enabled + active default；无配置时 fallback 到 implicit local。           |
| Historical local read | Existing `attachment.storage_provider = local`   | 旧 local 附件在无 config 时仍可读；disabled provider 不能阻断已有对象读取。              |
| OBS credentials       | `SecretCipherService` + encrypted config columns | 运行时解密只在后端 provider 内部发生，日志、API、audit 不返回 secret。                   |
| Error mapping         | Provider runtime                                 | missing object -> `NotFoundException`；remote/storage failure -> gateway/service error。 |
| Route / OpenAPI       | No public surface change                         | 不改 controller route、DTO 或 generated client。                                         |
| Upload session        | `EX-65D`                                         | 本片只提供 runtime 能力，不签发前端 upload target。                                      |

## 4. 运行时接口边界

| Runtime API / Class                               | Responsibility                                                     | Consumer                                | Result      |
| ------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------- | ----------- |
| `AttachmentObjectStorageProvider`                 | provider-neutral `put` / `head` / `read` / `delete` / `test`       | Registry                                | implemented |
| `AttachmentStorageProviderRegistry`               | resolve default/read config, dispatch provider, apply key prefix   | `AttachmentStorageService`, config API  | implemented |
| `LocalAttachmentObjectStorageProvider`            | local filesystem path validation, write, read stream, head, delete | Registry                                | implemented |
| `HuaweiObsS3AttachmentObjectStorageProvider`      | S3-compatible SigV4 request signing and object operations          | Registry                                | implemented |
| `AttachmentStorageService`                        | keep existing high-level attachment storage API while delegating   | `AttachmentService`, handover packaging | implemented |
| `AttachmentStorageProviderService.testConnection` | call runtime provider test instead of configuration-only result    | provider config API                     | implemented |

## 5. 读写边界

| Path                             | Storage Input                             | Provider Resolution                                      | Result      |
| -------------------------------- | ----------------------------------------- | -------------------------------------------------------- | ----------- |
| Existing upload original/version | generated key + buffer                    | enabled active default, fallback implicit local          | implemented |
| Download / preview / thumbnail   | attachment storageProvider / bucket / key | exact provider + bucket + longest matching keyPrefix     | implemented |
| Handover package archive read    | attachment storageProvider / bucket / key | same read resolution                                     | implemented |
| Handover package archive write   | package key + buffer                      | enabled active default, fallback implicit local          | implemented |
| Best-effort remove               | stored provider / bucket / key            | same read resolution; suppress cleanup failures upstream | implemented |
| Provider config testConnection   | provider config row                       | direct config, including decrypted secret for OBS        | implemented |

## 6. 持久化边界

本片不新增 migration。

| Table                                | Owner Slice | Usage In This Slice                                      | Check Result |
| ------------------------------------ | ----------- | -------------------------------------------------------- | ------------ |
| `attachment_storage_provider_config` | `EX-65B`    | runtime config resolution and secret decrypt             | Pass         |
| `attachment`                         | existing    | read provider snapshot fields; no schema change          | Pass         |
| `attachment_download_package`        | existing    | read/write package object via registry; no schema change | Pass         |

## 7. 测试与校验

| Check                  | Required | Command / Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Result                      | Gap / Reason                                     |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------ |
| API lint               | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pass, no warnings           | Runtime code.                                    |
| API focused tests      | Yes      | `corepack pnpm nx test poms-api --runTestsByPath src/app/features/attachment/attachment-storage-provider-registry.service.spec.ts src/app/features/attachment/local-attachment-object-storage.provider.spec.ts src/app/features/attachment/huawei-obs-s3-attachment-object-storage.provider.spec.ts src/app/features/attachment/attachment-storage-provider.service.spec.ts src/app/features/attachment/attachment.service.spec.ts src/app/features/attachment/attachment-handover.service.spec.ts --skip-nx-cache` | Pass, 6 suites / 28 tests   | Registry/providers/storage/config service tests. |
| API build              | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Pass                        | Runtime code.                                    |
| API full tests         | Yes      | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pass, 62 suites / 661 tests | Attachment read/write regression path.           |
| Migration check        | Yes      | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Pass, schema is up-to-date  | No migration expected; proved no drift.          |
| OpenAPI/client check   | No       | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Not required                | No public API contract change.                   |
| Markdown / diff sanity | Yes      | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                                                                                                                                                                                                                                                                              | Pass                        | Docs touched.                                    |

## 8. 例外与风险

| Exception ID                             | Level  | Scope                               | Approved By | Cleanup Owner | Cleanup Due        | Notes                                                                                              |
| ---------------------------------------- | ------ | ----------------------------------- | ----------- | ------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| `EX65C-E1-NO-PRESIGNED-UPLOAD`           | medium | OBS upload user experience          | Codex local | `EX-65D`      | before `EX-65D` G4 | 本片只实现后端对象操作能力；前端直传和 presigned / multipart target 由 upload session slice 实现。 |
| `EX65C-E2-NO-REAL-OBS-TENANT-BY-DEFAULT` | medium | real Huawei OBS tenant verification | Codex local | `EX-65E`      | before `EX-65E` G4 | 本地验证优先使用 mocked fetch / unit tests；真实租户凭据由部署或收口验证补证据。                   |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-11`
- Conditions:
  - 本片不得新增 upload session public routes。
  - 本片不得把 OBS AK / SK、内部 object key 或永久 URL 暴露到 API response。
  - 完成后必须证明 legacy local 附件读取路径仍可用。
