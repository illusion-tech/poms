# EX-45 Attachment Evidence Repository 实施基线包

- Gate Status: `Pass`
- Parent: Lead / Customer / Project / Contract business evidence continuity
- Owner: Codex
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: User-approved direction in current workspace thread
- G1 Date: 2026-04-30
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-45`

## 1. 范围

- 本次目标:
  1. 新增统一 `Attachment` 附件元数据与 `AttachmentLink` 业务挂载关系，作为 POMS 销售过程证据库一期。
  2. 新增附件上传、按业务对象查询、元数据更新、下载、作废、取消关联和新增关联 API。
  3. 文件本体先支持本地存储 provider，接口按 provider 抽象设计，后续可替换 OBS / S3 / MinIO。
  4. 线索转项目后，把可移交线索附件以 `source` 关系关联到新项目，不复制文件本体。
  5. 前端交付可复用附件面板，并先接入线索详情 / 跟进区域。
- 本次明确不做:
  1. 不做全局网盘 / 目录树 / 外链分享。
  2. 不做 Office 在线预览、OCR、全文检索、水印、病毒扫描服务集成。
  3. 不做完整版本管理流程；仅预留版本字段并写入默认 V1。
  4. 不把附件变成线索转项目硬闸口。
  5. 不把附件评论独立成新协作体系；销售过程说明继续使用 `SalesFollowUpRecord`。
- 下游可依赖的交付边界:
  - 一个附件可挂多个业务对象，业务对象上下文通过 `attachment_link` 表表达。
  - 文件下载必须经过后端鉴权和审计，不暴露永久公开 URL。
  - 删除类操作一期采用作废或取消关联，不物理删除文件。
- 不允许下游依赖的留白:
  - 当前没有附件版本替换、最终版审批或批量移交清单。
  - 当前前端只接入线索上下文，客户 / 项目 / 合同详情入口拆后续切片。

## 2. 正式输入

| Input Type                | Document / Source                              | Section / Anchor                       | Status | Notes                                                             |
| ------------------------- | ---------------------------------------------- | -------------------------------------- | ------ | ----------------------------------------------------------------- |
| Business design           | Current user decision                          | Attachment first phase discussion      | Frozen | 附件定位为业务证据库，不是网盘。                                  |
| Command design            | This baseline                                  | Sections 4-6                           | Frozen | 顶层 attachment resource + link relation。                        |
| DTO / OpenAPI design      | This baseline                                  | Sections 3-5                           | Frozen | 新增 shared contract / OpenAPI / generated client。               |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md` | `EX-45 Attachment Evidence Repository` | Frozen | 顶层 `/attachments` resource。                                    |
| Query boundary            | This baseline                                  | Section 5                              | Frozen | 列表查询必须提供 targetType + targetId。                          |
| Data model / table freeze | `docs/design/data-model-prerequisites.md`      | `Attachment` support table             | Frozen | 独立附件对象 + 独立挂载关系。                                     |
| Schema / DDL              | Migration planned in this slice                | `attachment`, `attachment_link`        | Frozen | FK only for attachment link to attachment; target is polymorphic. |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`  | resource / custom method grammar       | Frozen | `:void` 使用 colon action。                                       |

## 3. 本次 SSOT

| Concern                     | SSOT                | Implementation Rule                                                                                                                                                                                                                       |
| --------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business semantics          | This baseline       | 附件是围绕业务对象沉淀的证据资料，不是独立网盘。                                                                                                                                                                                          |
| Public route canonical path | Route inventory     | `POST /attachments`, `GET /attachments`, `GET /attachments/{id}`, `GET /attachments/{id}/download`, `PATCH /attachments/{id}`, `POST /attachments/{id}:void`, `POST /attachments/{id}/links`, `DELETE /attachments/{id}/links/{linkId}`。 |
| Route / command naming      | This baseline       | 上传=create attachment + initial link；取消关联不等于物理删除。                                                                                                                                                                           |
| DTO / contract naming       | Shared contracts    | `AttachmentSummary`, `AttachmentLinkSummary`, `AttachmentListQuery`, `UpdateAttachmentRequest`, `CreateAttachmentLinkRequest`, `VoidAttachmentRequest`。                                                                                  |
| Table / column naming       | Migration           | snake_case: `attachment`, `attachment_link`。                                                                                                                                                                                             |
| Date / time semantics       | Shared contracts    | All date-time fields are ISO datetime.                                                                                                                                                                                                    |
| Identifier semantics        | Existing entity IDs | targetId is internal UUID; targetType controls service-side existence validation.                                                                                                                                                         |
| Money / decimal semantics   | N/A                 | No money fields in this slice.                                                                                                                                                                                                            |
| Status machine              | This baseline       | Attachment: `active / voided / deleted / failed`; Link: `active / unlinked`。                                                                                                                                                             |

## 4. 命令与接口边界

| Route / Controller                        | Command / Service          | Request DTO / Contract        | Response DTO / Contract | Guard / Permission                                          | Design Source | Result |
| ----------------------------------------- | -------------------------- | ----------------------------- | ----------------------- | ----------------------------------------------------------- | ------------- | ------ |
| `POST /attachments`                       | `uploadAttachment`         | multipart form + metadata     | `AttachmentSummary`     | any target write permission, service validates exact target | This baseline | Pass   |
| `GET /attachments`                        | `listAttachments`          | `AttachmentListQuery`         | `AttachmentList`        | any target read permission, service validates exact target  | This baseline | Pass   |
| `GET /attachments/{id}`                   | `getAttachment`            | id                            | `AttachmentSummary`     | any readable active link                                    | This baseline | Pass   |
| `GET /attachments/{id}/download`          | `downloadAttachment`       | id                            | file stream             | any readable active link + security check                   | This baseline | Pass   |
| `PATCH /attachments/{id}`                 | `updateAttachmentMetadata` | `UpdateAttachmentRequest`     | `AttachmentSummary`     | target write or uploader                                    | This baseline | Pass   |
| `POST /attachments/{id}:void`             | `voidAttachment`           | `VoidAttachmentRequest`       | `AttachmentSummary`     | target write, stricter for sensitive categories             | This baseline | Pass   |
| `POST /attachments/{id}/links`            | `linkAttachmentToTarget`   | `CreateAttachmentLinkRequest` | `AttachmentSummary`     | source read + target write                                  | This baseline | Pass   |
| `DELETE /attachments/{id}/links/{linkId}` | `unlinkAttachment`         | id + linkId                   | `AttachmentSummary`     | target write                                                | This baseline | Pass   |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): see Section 4
- Current implemented route(s): `POST /attachments`, `GET /attachments`, `GET /attachments/{id}`, `GET /attachments/{id}/download`, `PATCH /attachments/{id}`, `POST /attachments/{id}:void`, `POST /attachments/{id}/links`, `DELETE /attachments/{id}/links/{linkId}`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + this baseline
- Blocker / exception: none

## 5. 读侧边界

| Query / View     | Consumer                     | Fields                                                            | Filter / Sort                                                  | Permission Boundary                            | Design Source | Result |
| ---------------- | ---------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------- | ------------- | ------ |
| `AttachmentList` | Lead detail attachment panel | file metadata, category, security, active links, uploader, status | required `targetType` + `targetId`; optional category / status | target object read + attachment security check | This baseline | Pass   |

## 6. 持久化边界

| Table             | Migration                                                     | Entity / Repository                       | DDL / Freeze Source | Check Result |
| ----------------- | ------------------------------------------------------------- | ----------------------------------------- | ------------------- | ------------ |
| `attachment`      | `Migration20260430140000_ex45_attachment_evidence_repository` | `Attachment` / `AttachmentRepository`     | This baseline       | Pass         |
| `attachment_link` | `Migration20260430140000_ex45_attachment_evidence_repository` | `AttachmentLink` / `AttachmentRepository` | This baseline       | Pass         |

| Field                                       | Design Type / Meaning                 | Migration / DDL        | Entity           | Shared Contract / OpenAPI       | Result |
| ------------------------------------------- | ------------------------------------- | ---------------------- | ---------------- | ------------------------------- | ------ |
| `attachment.category`                       | business evidence category            | `varchar(64)` check    | `category`       | `AttachmentCategory`            | Pass   |
| `attachment.security_level`                 | attachment sensitivity                | `varchar(32)` check    | `securityLevel`  | `AttachmentSecurityLevel`       | Pass   |
| `attachment.storage_*`                      | provider location                     | string columns         | same             | summary excludes raw bucket/key | Pass   |
| `attachment.checksum_sha256`                | integrity / dedup basis               | `varchar(64)`          | `checksumSha256` | string                          | Pass   |
| `attachment.status`                         | active / voided / deleted / failed    | `varchar(32)` check    | `status`         | `AttachmentStatus`              | Pass   |
| `attachment_link.target_type` / `target_id` | polymorphic business anchor           | `varchar(64)` + `uuid` | same             | `AttachmentTargetType` + UUID   | Pass   |
| `attachment_link.relation_type`             | normal/source/evidence/final/handover | `varchar(32)` check    | `relationType`   | `AttachmentRelationType`        | Pass   |
| `attachment_link.status`                    | active / unlinked                     | `varchar(32)` check    | `status`         | `AttachmentLinkStatus`          | Pass   |

## 7. 一致性结论

- Document -> code: pass; implementation follows this baseline.
- ADR-015 inventory -> route: pass; `EX-45` inventory rows are `aligned`.
- Migration -> entity: pass; `migration-up` and `migration-check` passed on the local development database.
- Entity -> contract: pass; shared contracts, OpenAPI, generated client and admin data-access exports are aligned.
- Route -> command: pass; `AttachmentController` delegates to `AttachmentService`.
- Query -> view: pass; first consumer is lead detail attachment panel.
- Guard / permission: pass; route-level any-permission gate plus service-level target permission and security validation.
- OpenAPI / generated client: pass; multipart upload uses generated API wrapper and manual blob download wrapper in admin data-access.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                            | Result              | Gap / Reason                                                                                                   |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`                          | Pass                | No new lint warnings.                                                                                          |
| Build                            | Yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                        | Pass with warning   | Admin build keeps existing initial bundle budget warning: 1.01 MB vs 1.00 MB budget.                           |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`; `corepack pnpm nx test poms-admin --runInBand`  | Pass                | API: 45 suites / 540 tests. Admin: 26 suites / 147 tests.                                                      |
| API / integration tests          | Yes      | `attachment.service.spec.ts`; `lead.service.spec.ts`                                          | Pass                | Upload/list/security/void/copy-link and lead conversion copy behavior covered.                                 |
| E2E                              | Optional | Browser smoke                                                                                 | Not run             | No browser server smoke was required for this backend-heavy slice; admin build and component tests passed.     |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:check`       | Pass                | Generator emitted existing schema warnings for `propertyNames`; check concluded client and spec are in sync.   |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check` | Pass                | Migration applied to local development database; schema is up to date.                                         |
| Markdown format                  | Yes      | Targeted `format-md-tables --check` on touched docs; full `corepack pnpm run format:md:check` | Pass with exception | Touched docs pass; full docs check still fails on pre-existing unmodified `ex-42` and `ex-44` formatting debt. |

## 9. 例外与风险

| Exception ID                       | Level | Scope                                                | Approved By    | Cleanup Owner | Cleanup Due                                | Notes                                                  |
| ---------------------------------- | ----- | ---------------------------------------------------- | -------------- | ------------- | ------------------------------------------ | ------------------------------------------------------ |
| `EX45-E1-NO-GLOBAL-FILES-CENTER`   | Low   | No global attachment center in phase 1               | User direction | Codex         | Future attachment UX slice                 | Phase 1 embeds attachment panel in lead context first. |
| `EX45-E2-NO-FULL-VERSION-WORKFLOW` | Low   | Version fields are reserved but not workflow-enabled | User direction | Codex         | Future quotation/contract attachment slice | Avoids premature DMS complexity.                       |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: User direction in current thread
- Approved At: 2026-04-30
- Conditions: implement first-phase business evidence repository; do not turn it into a standalone netdisk.

## 11. G4 结论

- Gate Status: `Pass`
- Closed At: 2026-04-30
- Delivered:
  1. `Attachment` / `AttachmentLink` persistence, local storage provider, service, controller, DTOs, OpenAPI and generated client.
  2. Business-object scoped upload/list/get/download/update/void/link/unlink APIs with service-level target permission and sensitive security checks.
  3. Lead-to-project conversion copies eligible lead attachment links to the created project as `source` links without file duplication.
  4. Reusable admin `AttachmentPanel` is connected to lead detail as the first UI consumer.
- Remaining follow-up slices: customer/project/contract attachment panels, preview, version workflow, final-file governance, batch handover, OCR/full-text and non-local object storage provider.
