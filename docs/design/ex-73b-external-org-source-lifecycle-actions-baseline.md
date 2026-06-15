# EX-73B 外部组织同步源生命周期动作收口实施基线包

- Gate Status: `Pass`
- Parent: `EX-72` / `EX-73A` external organization sync closeout follow-up
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-06-15`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-73B`

## 1. 范围

- 本次目标:
  - 将外部组织同步源的生命周期状态从“新建 / 编辑表单字段”收口为显式命令动作。
  - 新建同步源只创建 `draft`；Admin 提供“保存草稿”和“保存并启用”两个明确动作。
  - `active / paused / archived` 只能通过 `activate / pause / archive` command route 更新，并统一走乐观锁和 readiness 校验。
  - Admin 工作台区分生命周期状态和运行就绪原因，避免管理员把配置编辑误解为状态流转。
- 本次明确不做:
  - 不新增表、字段、migration 或状态历史表。
  - 不实现 DingTalk / WeCom 组织同步 adapter、用户同步或权限同步。
  - 不新增自动定时同步、自动重试、归档恢复或强制归档能力。
  - 不重构企业协同接入、文件存储接入或 OBS 配置。
- 下游可依赖的交付边界:
  - `CreateExternalOrgSourceRequest` 和 `UpdateExternalOrgSourceRequest` 不再接受 `status`。
  - 新增 source lifecycle command routes：`:activate`、`:pause`、`:archive`。
  - `activate` 是唯一会把 source 置为 `active` 的公共命令，并要求 provider config 可用于组织同步。
  - Admin 新建 / 编辑弹窗不暴露任意状态下拉。
- 不允许下游依赖的留白:
  - 不应依赖本片提供真实飞书网络连通性健康状态。
  - 不应依赖本片支持从 `archived` 恢复。
  - 不应依赖本片保留 create/update status 的兼容 alias。

## 2. 正式输入

| Input Type                | Document / Source                                   | Section / Anchor                        | Status | Notes                                                  |
| ------------------------- | --------------------------------------------------- | --------------------------------------- | ------ | ------------------------------------------------------ |
| Business design           | User-approved lifecycle action analysis in thread   | 外部组织同步源状态不应出现在配置表单    | Pass   | 用户明确要求正确方案，不接受补丁式隐藏字段。           |
| Command design            | `EX-72A`, `EX-72C`, `EX-72D`, `EX-73A`              | source status, source update, readiness | Pass   | source status 是 lifecycle；readiness 由系统判断。     |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts` | `ExternalOrgSource*Request`             | Pass   | 移除 create/update status，新增 lifecycle command DTO. |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`      | B18 external organization sync          | Pass   | 本片先补 authoritative inventory 行，再写 controller。 |
| Query boundary            | `FE-67` external org sync workbench                 | source list / selected source           | Pass   | 工作台消费 lifecycle status 和 readiness issue。       |
| Data model / table freeze | `EX-72B`                                            | `external_org_source.status`            | Pass   | 不改 DDL；只改变公共写入命令入口。                     |
| Schema / DDL              | Existing `EX-72B` migration                         | `chk_external_org_source_status`        | Pass   | 现有 enum 值保持不变。                                 |
| ADR                       | `ADR-015`                                           | custom method grammar                   | Pass   | 使用 resource custom method：`{id}:activate` 等。      |

## 3. 本次 SSOT

| Concern                     | SSOT                                   | Implementation Rule                                                                                                            |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Business semantics          | 本基线 + `EX-72A`                      | `status` 是同步源 lifecycle；运行就绪由 provider config 和 provider support 派生。                                             |
| Public route canonical path | `api-route-canonical-inventory.md` B18 | 新增 `POST /platform/external-org-sources/{id}:activate/pause/archive`。                                                       |
| Route / command naming      | 本基线 + ADR-015                       | Controller 方法使用 `activateExternalOrgSource`、`pauseExternalOrgSource`、`archiveExternalOrgSource`。                        |
| DTO / contract naming       | Shared contracts                       | 使用独立 `*ExternalOrgSourceRequest`，当前仅承载 `expectedVersion`。                                                           |
| Table / column naming       | Existing `external_org_source.status`  | 不新增字段；命令更新既有 status。                                                                                              |
| Date / time semantics       | Existing ISO datetime fields           | 命令更新 `updatedAt`，响应仍返回 ISO datetime。                                                                                |
| Identifier semantics        | Existing UUID + external string model  | source id / provider config id / org unit id 是 UUID；外部租户和部门 id 是 string。                                            |
| Money / decimal semantics   | N/A                                    | 本片不涉及金额。                                                                                                               |
| Status machine              | 本基线                                 | `draft -> active`、`active -> paused`、`paused -> active`、`draft/paused -> archived`；`active -> archived` 阻断，要求先暂停。 |

## 4. 命令与接口边界

| Route / Controller                                             | Command / Service           | Request DTO / Contract                            | Response DTO / Contract   | Guard / Permission                                       | Design Source          | Result                               |
| -------------------------------------------------------------- | --------------------------- | ------------------------------------------------- | ------------------------- | -------------------------------------------------------- | ---------------------- | ------------------------------------ |
| `POST /platform/external-org-sources`                          | `createExternalOrgSource`   | `CreateExternalOrgSourceRequest` without `status` | `ExternalOrgSourceDetail` | `platform:org-units:manage` + `platform:org-sync:manage` | EX-72C / this baseline | Always creates `draft`               |
| `PATCH /platform/external-org-sources/{id}`                    | `updateExternalOrgSource`   | `UpdateExternalOrgSourceRequest` without `status` | `ExternalOrgSourceDetail` | same                                                     | EX-72C / this baseline | Updates config only                  |
| `POST /platform/external-org-sources/{id}:activate`            | `activateExternalOrgSource` | `ActivateExternalOrgSourceRequest`                | `ExternalOrgSourceDetail` | same                                                     | this baseline          | Readiness-gated lifecycle command    |
| `POST /platform/external-org-sources/{id}:pause`               | `pauseExternalOrgSource`    | `PauseExternalOrgSourceRequest`                   | `ExternalOrgSourceDetail` | same                                                     | this baseline          | Active source only                   |
| `POST /platform/external-org-sources/{id}:archive`             | `archiveExternalOrgSource`  | `ArchiveExternalOrgSourceRequest`                 | `ExternalOrgSourceDetail` | same                                                     | this baseline          | Draft/paused source only             |
| `POST /platform/external-org-sources/{sourceId}/org-sync-runs` | `createOrgSyncRun`          | unchanged                                         | `OrgSyncRunDetail`        | same                                                     | EX-72D / EX-73A        | Still requires active + ready source |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `POST /platform/external-org-sources/{id}:activate`
  - `POST /platform/external-org-sources/{id}:pause`
  - `POST /platform/external-org-sources/{id}:archive`
- Current implemented route(s): none before this slice.
- Inventory status: `aligned` at G4.
- Route governance source: `ADR-015` + `EX-72A` + this baseline.
- Blocker / exception: No exception. Inventory rows are added before controller implementation.

## 5. 读侧边界

| Query / View              | Consumer                    | Fields                                      | Filter / Sort   | Permission Boundary                                         | Design Source | Result                               |
| ------------------------- | --------------------------- | ------------------------------------------- | --------------- | ----------------------------------------------------------- | ------------- | ------------------------------------ |
| Source list               | External org sync workbench | status, providerConfigId, provider          | existing        | `platform:org-sync:manage`                                  | FE-67         | Lifecycle status display and actions |
| Provider config list      | External org sync workbench | enabled, secretConfigured, status, provider | provider=Feishu | `platform:identity-providers:manage` through existing store | EX-73A        | Readiness issue derivation           |
| Source create/edit dialog | External org sync workbench | config fields only                          | N/A             | `platform:org-sync:manage`                                  | this baseline | No status dropdown                   |

## 6. 持久化边界

| Table                 | Migration         | Entity / Repository                               | DDL / Freeze Source | Check Result  |
| --------------------- | ----------------- | ------------------------------------------------- | ------------------- | ------------- |
| `external_org_source` | Existing `EX-72B` | `ExternalOrgSource` / `ExternalOrgSyncRepository` | Existing            | No DDL change |

| Field                        | Design Type / Meaning                     | Migration / DDL      | Entity   | Shared Contract / OpenAPI                         | Result               |
| ---------------------------- | ----------------------------------------- | -------------------- | -------- | ------------------------------------------------- | -------------------- |
| `external_org_source.status` | Source lifecycle                          | Existing enum string | Existing | Response/query only plus lifecycle command result | Tightened            |
| `row_version`                | Optimistic concurrency evidence           | Existing             | Existing | `expectedVersion` on commands                     | Reused               |
| `provider_config_id`         | Enterprise collaboration config reference | Existing UUID        | Existing | Create/update config field                        | Reused for readiness |

## 7. 一致性结论

- Document -> code: 本片消费 EX-72A 状态模型并补齐 EX-73A 留下的 source lifecycle UX drift。
- ADR-015 inventory -> route: 新增 custom method inventory rows before implementation。
- Migration -> entity: N/A, no migration.
- Entity -> contract: status 仍是 response/query field；不再是 create/update 普通配置字段。
- Route -> command: lifecycle route 一对一映射 service command。
- Query -> view: Admin 只投影 generated DTO，不造第二套 wire contract。
- Guard / permission: 复用 existing org sync permission boundary。
- OpenAPI / generated client: Expected diff removes `status` from create/update source request and adds three lifecycle command operations.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                          | Result       | Gap / Reason                                 |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------- |
| Lint                             | Yes      | `shared-contracts` / `api-contracts` / `poms-api` / `admin-data-access` / `poms-admin` lint | Pass         | Cross-layer source + generated client change |
| Build                            | Yes      | `poms-api`, `poms-admin`, `shared-api-client` build                                         | Pass         | `shared-api-client` covered by Admin build   |
| Unit tests                       | Yes      | API external-org-sync focused tests; Admin workbench focused tests                          | Pass         | Covers command route/service/store/UI        |
| API / integration tests          | Yes      | Controller/service focused specs                                                            | Pass         | Route-command-DTO alignment                  |
| E2E                              | Decision | Browser smoke if local account data allows                                                  | Not run      | Build + focused tests covered this slice     |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi`, `shared-api-client:check`                                               | Pass         | Generated client synchronized                |
| Migration / schema check         | No       | N/A                                                                                         | Not required | No persistence change                        |
| Formatting / diff sanity         | Yes      | Markdown format/check and `git diff --check`                                                | Pass         | Docs touched                                 |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No accepted exception at G1. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local after user approval`
- Approved At: `2026-06-15`
- Conditions:
  - Add route inventory rows before controller code.
  - Do not add persistence or migration.
  - Do not implement archived restore or force archive in this slice.
  - Treat OpenAPI/generated client diff as expected for source lifecycle direct cutover.

## 11. G4 结论

- Gate Status: `Pass`
- Completed By: `Codex local`
- Completed At: `2026-06-15`
- Delivered:
  - `CreateExternalOrgSourceRequest` / `UpdateExternalOrgSourceRequest` no longer accept `status`.
  - Added `activateExternalOrgSource` / `pauseExternalOrgSource` / `archiveExternalOrgSource` command routes, DTOs, OpenAPI spec, generated client methods, data-access store commands and backend service guards.
  - Admin workbench no longer exposes source status as a form field; new sources use `保存草稿` or `保存并启用`, while list actions handle enable / pause / archive.
  - Non-Feishu source forms disable enterprise collaboration config binding before save and still guard the backend contract.
- Validation evidence:
  - `corepack pnpm nx test poms-api --runInBand --testPathPatterns=external-org-sync.service external-org-sync.controller --skip-nx-cache`
  - `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=external-org-sync-workbench --skip-nx-cache`
  - `corepack pnpm nx run shared-contracts:eslint:lint --skip-nx-cache`
  - `corepack pnpm nx run api-contracts:eslint:lint --skip-nx-cache`
  - `corepack pnpm nx run admin-data-access:eslint:lint --skip-nx-cache`
  - `corepack pnpm nx run poms-admin:eslint:lint --skip-nx-cache`
  - `corepack pnpm nx run poms-api:eslint:lint --skip-nx-cache`
  - `corepack pnpm nx run poms-api:openapi --skip-nx-cache`
  - `corepack pnpm nx run shared-api-client:check --skip-nx-cache`
  - `corepack pnpm nx build poms-api --skip-nx-cache`
  - `corepack pnpm nx build poms-admin --skip-nx-cache`
