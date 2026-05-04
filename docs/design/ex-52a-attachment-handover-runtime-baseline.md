# EX-52A 附件移交清单与批量下载后端运行时实施基线包

- Gate Status: `Pass`
- Parent: `EX-52`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: 2026-05-05
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-52A`

## 1. 范围

- 本次目标:
  1. 落地项目移交附件清单读取、刷新、清单选择持久化和短期下载包后端运行时。
  2. 扩展 `AttachmentTargetType = project-handover`，让 `handover` 关系挂到具体 `project_handover` 记录。
  3. 同步 shared contracts、DTO、OpenAPI、generated client、migration、审计和 focused tests。
- 本次明确不做:
  1. 前端项目移交入口、附件中心入口或批量下载交互。
  2. 敏感附件导出例外审批流。
  3. 对象存储迁移、异步任务平台、长期外链、Office 在线预览、OCR、全文检索。
  4. 把附件清单改成项目移交确认的唯一硬闸口。
- 下游可依赖的交付边界:
  1. 可读取某次项目移交的附件清单、缺口、敏感排除项和可下载项。
  2. 可重新扫描来源附件并保留人工排除 / 历史选择语义。
  3. 可创建短期下载包、查询状态并通过受控 route 下载 ready 包。
  4. `project-handover` 附件 target、`handover` link、清单选择表和下载包表成为后续 FE 入口输入。
- 不允许下游依赖的留白:
  1. 下载包不承诺长期可访问 URL。
  2. 首片可同步生成小包，但合同必须保持 package resource 形态，不能把归档生成结果简化成直接附件下载。
  3. 敏感附件只进入清单和排除 manifest，不进入普通批量包。

## 2. 正式输入

| Input Type                | Document / Source                                                                                                                   | Section / Anchor                                            | Status  | Notes                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| Business design           | `docs/design/ex-52-attachment-handover-batch-download-baseline.md`                                                                  | `4` - `7`                                                   | Frozen  | 冻结来源、版本选择、清单状态、`handover` 关系、敏感排除和下载包语义。 |
| Command design            | `docs/design/ex-52-attachment-handover-batch-download-baseline.md`                                                                  | `8`                                                         | Frozen  | 五条 planned route 已登记。                                           |
| DTO / OpenAPI design      | `docs/design/ex-52-attachment-handover-batch-download-baseline.md`                                                                  | `9`                                                         | Frozen  | 合同命名以 EX-52 planned contracts 为输入。                           |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                                                      | `6.16 EX-52 Attachment Handover Checklist / Batch Download` | Planned | EX-52A 消费 planned rows 并在实现后切为 `aligned`。                   |
| Query boundary            | `ProjectHandoverQueryService`、`AttachmentService` / repository                                                                     | current code                                                | Review  | 需复用项目移交读取权限和附件安全等级读取规则。                        |
| Data model / table freeze | `docs/design/ex-52-attachment-handover-batch-download-baseline.md`                                                                  | `10`                                                        | Frozen  | 三张新增表和 `attachment_link.target_type` check 扩展。               |
| Schema / DDL              | `Migration20260430140000_ex45_attachment_evidence_repository.ts`、`Migration20260503160000_ex58b_enum_code_value_direct_cutover.ts` | current DB check history                                    | Review  | 当前 check 不含 `project-handover`，EX-52A 必须扩展。                 |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                                                                       | route grammar                                               | Active  | 新 route 必须保持 resource + command suffix 语法。                    |

## 3. 本次 SSOT

| Concern                     | SSOT                                 | Implementation Rule                                                                                                   |
| --------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Business semantics          | EX-52 baseline                       | `handover` 表示附件版本被纳入某次项目移交，不表示普通项目附件归属。                                                   |
| Public route canonical path | API route canonical inventory `6.16` | controller 可使用 Nest `:handoverId`，public canonical 文档使用 `{id}`。                                              |
| Route / command naming      | EX-52 planned API                    | 使用 `getProjectHandoverAttachmentChecklist` 等 planned capability 名。                                               |
| DTO / contract naming       | EX-52 planned contracts              | 新增 `ProjectHandoverAttachmentChecklistView`、`ProjectHandoverAttachmentChecklistItem`、下载包 summary 等。          |
| Table / column naming       | EX-52 planned persistence            | 新表使用 `project_handover_attachment_selection`、`attachment_download_package`、`attachment_download_package_item`。 |
| Date / time semantics       | existing API date-time convention    | `createdAt`、`updatedAt`、`expiresAt`、`downloadedAt` 统一为 datetime / ISO string。                                  |
| Identifier semantics        | existing internal UUID               | `handoverId`、`projectId`、`attachmentId`、`packageId` 均为内部 UUID。                                                |
| Money / decimal semantics   | N/A                                  | 本片不处理金额。                                                                                                      |
| Status machine              | EX-52 baseline `4.3` / `7.2`         | 清单 item status 和 package status 必须使用 shared value object / schema，不写裸字符串。                              |

## 4. 命令与接口边界

| Route / Controller                                                 | Command / Service                                | Request DTO / Contract                                  | Response DTO / Contract                  | Guard / Permission                               | Design Source | Result  |
| ------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ | ------------- | ------- |
| `GET /project-handovers/:handoverId/attachment-checklist`          | `getProjectHandoverAttachmentChecklist`          | Path `handoverId`                                       | `ProjectHandoverAttachmentChecklistView` | 项目移交读取 + 附件读取安全等级                  | EX-52 `8`     | Planned |
| `POST /project-handovers/:handoverId/attachment-checklist:refresh` | `refreshProjectHandoverAttachmentChecklist`      | `RefreshProjectHandoverAttachmentChecklistRequest`      | `ProjectHandoverAttachmentChecklistView` | 项目移交写入 / 准备权限 + 附件读取安全等级       | EX-52 `8`     | Planned |
| `POST /project-handovers/:handoverId/attachment-download-packages` | `createProjectHandoverAttachmentDownloadPackage` | `CreateProjectHandoverAttachmentDownloadPackageRequest` | `AttachmentDownloadPackageSummary`       | 项目移交读取 + 每个附件版本可读 + 敏感排除确认   | EX-52 `8`     | Planned |
| `GET /attachment-download-packages/:packageId`                     | `getAttachmentDownloadPackage`                   | Path `packageId`                                        | `AttachmentDownloadPackageSummary`       | 创建人或项目移交读取权限，且不得泄露 storage key | EX-52 `8`     | Planned |
| `GET /attachment-download-packages/:packageId/download`            | `downloadAttachmentDownloadPackage`              | Path `packageId`                                        | controlled archive stream                | package `ready` + 未过期 + 权限复核 + 审计       | EX-52 `8`     | Planned |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `GET /project-handovers/{id}/attachment-checklist`
  - `POST /project-handovers/{id}/attachment-checklist:refresh`
  - `POST /project-handovers/{id}/attachment-download-packages`
  - `GET /attachment-download-packages/{id}`
  - `GET /attachment-download-packages/{id}/download`
- Current implemented route(s): `N/A`
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-52` G1
- Blocker / exception: coding may start only after this `EX-52A` G1 baseline is present; implementation must flip inventory rows to `aligned` after routes exist.

## 5. 读侧边界

| Query / View                             | Consumer                 | Fields                                                               | Filter / Sort                                   | Permission Boundary                                 | Design Source | Result  |
| ---------------------------------------- | ------------------------ | -------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | ------------- | ------- |
| `ProjectHandoverAttachmentChecklistView` | future FE handover entry | summary counts, source groups, items, missing items, excluded items  | by `handoverId`; stable grouping by source type | project handover read + attachment security read    | EX-52 `4`     | Planned |
| `ProjectHandoverAttachmentChecklistItem` | future FE handover entry | attachment version, source refs, status, selection reason, exclusion | group by source / category; no global search    | item only visible if target/source is readable      | EX-52 `4`     | Planned |
| `AttachmentDownloadPackageSummary`       | future FE handover entry | status, manifest summary, expiresAt, counts, failed reason           | by package id                                   | creator or project handover readable                | EX-52 `7`     | Planned |
| `GET .../download` stream                | future FE handover entry | archive stream + safe filename                                       | package id, only ready / non-expired            | recheck package access and included attachment read | EX-52 `7`     | Planned |

## 6. 持久化边界

| Table                                   | Migration | Entity / Repository | DDL / Freeze Source | Check Result                                 |
| --------------------------------------- | --------- | ------------------- | ------------------- | -------------------------------------------- |
| `project_handover_attachment_selection` | New       | New                 | EX-52 `10`          | Required                                     |
| `attachment_download_package`           | New       | New                 | EX-52 `10`          | Required                                     |
| `attachment_download_package_item`      | New       | New                 | EX-52 `10`          | Required                                     |
| `attachment_link`                       | Alter     | Existing            | EX-45 + EX-52 `5`   | Add `project-handover` to target type check. |

| Field / Concern                        | Design Type / Meaning                                                        | Migration / DDL                                                       | Entity | Shared Contract / OpenAPI | Result  |
| -------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ | ------------------------- | ------- |
| `AttachmentTargetType.ProjectHandover` | 附件挂到具体项目移交记录                                                     | alter `chk_attachment_link_target_type` to include `project-handover` | Update | Update                    | Planned |
| `selection.status`                     | `included` / `missing` / `excluded` / `sensitive-excluded` / `stale-version` | check enum                                                            | New    | New                       | Planned |
| `selection.selected_attachment_id`     | 被选择的明确附件版本                                                         | FK `attachment.id`, nullable for missing / excluded expected item     | New    | New                       | Planned |
| `selection.version_group_id`           | 附件版本组，支撑 final/latest/stale 判断                                     | uuid / nullable only for non-attachment missing item                  | New    | New                       | Planned |
| `selection.source_refs`                | 来源引用，记录 lead/project/contract/sales-follow-up 来源                    | jsonb                                                                 | New    | New                       | Planned |
| `package.status`                       | `pending` / `running` / `ready` / `failed` / `expired` / `cancelled`         | check enum                                                            | New    | New                       | Planned |
| `package.storage_key`                  | 后端内部归档存储 key                                                         | varchar, never returned to API                                        | New    | Excluded                  | Planned |
| `package.expires_at`                   | 短期包过期时间                                                               | timestamptz not null                                                  | New    | datetime                  | Planned |
| `package_item.excluded_reason`         | 敏感 / 权限 / 状态导致未进入包的原因                                         | text nullable                                                         | New    | New                       | Planned |

## 7. 一致性结论

- Document -> code: EX-52A 尚未写代码，本基线冻结后方可进入 G2。
- ADR-015 inventory -> route: planned rows 已存在；实现后必须切为 `aligned`。
- Migration -> entity: 新 migration 必须先定义表 / check / FK，再补实体映射。
- Entity -> contract: package `storage_key` 不得暴露到 shared contract / OpenAPI。
- Route -> command: 五条 route 与 EX-52 planned capability 一一对应。
- Query -> view: 读侧只按某次 project handover 聚合，不做全局附件检索。
- Guard / permission: 必须同时满足项目移交上下文权限和附件安全等级读取权限；敏感附件不进入普通批量包。
- OpenAPI / generated client: 后端实现后必须运行 OpenAPI 和 generated client check。

## 8. 测试与校验

| Check                            | Required    | Command / Evidence                                                                      | Result          | Gap / Reason                                                     |
| -------------------------------- | ----------- | --------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| Lint                             | Yes         | `corepack pnpm nx lint poms-api`                                                        | Not run at G1   | G2/G3 after code changes.                                        |
| Build                            | Yes         | `corepack pnpm nx build poms-api`                                                       | Not run at G1   | G2/G3 after code changes.                                        |
| Unit tests                       | Yes         | focused attachment handover service tests                                               | Not run at G1   | Must cover version selection and sensitive exclusion.            |
| API / integration tests          | Yes         | controller focused tests                                                                | Not run at G1   | Must cover routes, guards, package lifecycle.                    |
| E2E                              | Conditional | `corepack pnpm nx e2e poms-api-e2e`                                                     | Deferred        | Required if route wiring or seed journey needs end-to-end proof. |
| OpenAPI generation / client diff | Yes         | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:check` | Not run at G1   | Required after DTO/controller implementation.                    |
| Migration / schema check         | Yes         | `corepack pnpm nx run poms-api:migration-check`                                         | Not run at G1   | Required after migration.                                        |
| Markdown / diff check            | Yes         | `corepack pnpm run format:md:check`; `git diff --check`                                 | Required for G1 | Run after docs update.                                           |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No accepted exception at G1. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-05-05
- Conditions:
  1. 先扩展 `AttachmentTargetType` / DB check / target resolver，再接入 `project-handover` link 写入。
  2. 任何下载包实现都必须保留 package resource 与受控 download route，不得退化成直接返回附件列表。
  3. 敏感附件默认排除，且排除项必须进入 manifest / 审计载荷。
  4. 后端完成后必须回写 route inventory、tracker 和 G3/G4 evidence。
