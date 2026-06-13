# EX-73A 平台接入可用性与外部组织同步消费收口实施基线包

- Gate Status: `Pass`
- Parent: `EX-64` / `EX-72` integration closeout follow-up
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-06-13`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-73A`

## 1. 范围

- 本次目标:
  - 将企业协同接入配置的生命周期状态从“管理员手工选择”收口为后端按配置内容和总开关派生。
  - 外部组织同步只允许启用或运行可用于组织同步的接入配置，避免草稿、停用、缺少 secret 或未支持 provider 被下游误用。
  - 管理端在组织同步配置处给出不可用原因和企业协同接入快捷入口，并透出后端结构化错误消息。
- 本次明确不做:
  - 不新增 public route，不新增 command route，不改 URL grammar。
  - 不新增表、字段、migration 或持久化健康检查历史。
  - 不重构附件 / OBS 对象存储接入配置。
  - 不实现 DingTalk / WeCom 组织同步 adapter、用户同步或权限同步。
- 下游可依赖的交付边界:
  - `UpdateIdentityProviderConfigRequest` 不再由调用方提交 `status`。
  - `IdentityProviderService` 更新配置后统一派生 `draft / active / disabled / misconfigured`。
  - `ExternalOrgSyncService` 在同步源启用和预览运行前强校验 provider config 可用于组织同步。
  - Admin 外部组织同步工作台不会让不可用的企业协同接入配置成为正常可选项。
- 不允许下游依赖的留白:
  - 不应依赖本片记录真实飞书网络连通性或权限开通状态。
  - 不应依赖本片提供跨接入类型的通用 readiness 表或审计历史。

## 2. 正式输入

| Input Type                | Document / Source                                     | Section / Anchor                         | Status | Notes                                                 |
| ------------------------- | ----------------------------------------------------- | ---------------------------------------- | ------ | ----------------------------------------------------- |
| Business design           | User-approved platform integration analysis in thread | 外部系统接入 / 企业协同接入 / 组织同步   | Pass   | 用户确认不做补丁式方案，要求系统级收口。              |
| Command design            | `EX-64B`, `EX-72C`, `EX-72D`, `FE-67`                 | provider config update, org source/run   | Pass   | 复用既有 routes 和 commands。                         |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`   | `UpdateIdentityProviderConfigRequest`    | Pass   | 去除手工 status 写入，保留响应 status。               |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`        | B13 identity provider, B18 org sync      | Pass   | 本片不新增或更改 route path；既有 rows 保持 aligned。 |
| Query boundary            | `FE-67` external org sync workbench                   | provider config list consumption         | Pass   | 组织同步页面消费企业协同接入配置列表。                |
| Data model / table freeze | `EX-64B`, `EX-72B`                                    | `identity_provider_config`, org sync     | Pass   | 不改持久化结构。                                      |
| Schema / DDL              | N/A                                                   | N/A                                      | Pass   | 无 migration。                                        |
| ADR                       | `ADR-015`, `ADR-017`                                  | route grammar, external identity session | Pass   | route 不变；外部 provider 仍只是接入来源。            |

## 3. 本次 SSOT

| Concern                     | SSOT                                         | Implementation Rule                                                                      |
| --------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Business semantics          | 本基线 + EX-64 / EX-72                       | 企业协同接入负责 provider 凭证与能力开关；外部组织同步只消费已可用接入。                 |
| Public route canonical path | `api-route-canonical-inventory.md` B13 / B18 | 不新增 route，不改 path。                                                                |
| Route / command naming      | Existing controllers                         | 继续使用 `updateIdentityProviderConfig`, `createExternalOrgSource`, `createOrgSyncRun`。 |
| DTO / contract naming       | Shared contracts                             | `status` 是输出状态和查询筛选，不是 provider update input。                              |
| Table / column naming       | Existing migrations/entities                 | 不改表字段。                                                                             |
| Date / time semantics       | Existing ISO datetime fields                 | 不新增日期字段。                                                                         |
| Identifier semantics        | Existing UUID + external string model        | provider config id 是 POMS UUID；外部租户 / 部门 id 仍为 string。                        |
| Money / decimal semantics   | N/A                                          | 本片不涉及金额。                                                                         |
| Status machine              | 本基线                                       | provider config 状态由后端派生；org source `active` 表示当前可运行。                     |

## 4. 命令与接口边界

| Route / Controller                                             | Command / Service                | Request DTO / Contract                                 | Response DTO / Contract                              | Guard / Permission                   | Design Source | Result                                                  |
| -------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------ | ------------- | ------------------------------------------------------- |
| `PATCH /platform/identity-providers/{id}`                      | `updateIdentityProviderConfig`   | `UpdateIdentityProviderConfigRequest` without `status` | `IdentityProviderConfigDetail` with derived `status` | `platform:identity-providers:manage` | B13 / EX-64B  | Update DTO semantics only                               |
| `POST /platform/identity-providers/{id}:testConnection`        | `testIdentityProviderConnection` | unchanged                                              | unchanged                                            | `platform:identity-providers:manage` | B13 / EX-64B  | Reuse for local readiness feedback                      |
| `POST /platform/external-org-sources`                          | `createExternalOrgSource`        | unchanged                                              | unchanged                                            | `platform:org-sync:manage`           | B18 / EX-72C  | Active source requires org-sync-ready provider config   |
| `PATCH /platform/external-org-sources/{id}`                    | `updateExternalOrgSource`        | unchanged                                              | unchanged                                            | `platform:org-sync:manage`           | B18 / EX-72C  | Enabling source requires org-sync-ready provider config |
| `POST /platform/external-org-sources/{sourceId}/org-sync-runs` | `createOrgSyncRun`               | unchanged                                              | unchanged                                            | `platform:org-sync:manage`           | B18 / EX-72D  | Preview run requires org-sync-ready provider config     |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): B13 identity provider routes and B18 external organization sync routes.
- Current implemented route(s): same as canonical routes.
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-64A` + `EX-72A`
- Blocker / exception: No route-surface exception. OpenAPI/client diffs are expected only for removing `status` from identity provider update request.

## 5. 读侧边界

| Query / View                   | Consumer                    | Fields                                                                | Filter / Sort                     | Permission Boundary                                         | Design Source          | Result                                     |
| ------------------------------ | --------------------------- | --------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------- | ---------------------- | ------------------------------------------ |
| Provider config list           | External org sync workbench | id, provider, displayName, status, enabled, secretConfigured          | provider = Feishu                 | `platform:identity-providers:manage` through existing store | FE-67 + this baseline  | Mark unusable configs disabled with reason |
| Provider config edit form      | Identity provider list      | status displayed through cards/list; update form does not edit status | provider/status filters unchanged | `platform:identity-providers:manage`                        | FE-59A + this baseline | No manual status dropdown                  |
| Source active/preview feedback | External org sync workbench | API error message or local readiness reason                           | selected source/config            | `platform:org-sync:manage`                                  | FE-67 + this baseline  | Show actionable message and link           |

## 6. 持久化边界

| Table                      | Migration         | Entity / Repository                                     | DDL / Freeze Source | Check Result  |
| -------------------------- | ----------------- | ------------------------------------------------------- | ------------------- | ------------- |
| `identity_provider_config` | Existing `EX-64B` | `IdentityProviderConfig` / `IdentityProviderRepository` | Existing            | No DDL change |
| `external_org_source`      | Existing `EX-72B` | `ExternalOrgSource` / `ExternalOrgSyncRepository`       | Existing            | No DDL change |

| Field                              | Design Type / Meaning                     | Migration / DDL      | Entity   | Shared Contract / OpenAPI                      | Result                                    |
| ---------------------------------- | ----------------------------------------- | -------------------- | -------- | ---------------------------------------------- | ----------------------------------------- |
| `identity_provider_config.status`  | Derived lifecycle/readiness status        | Existing enum string | Existing | Response/query only; removed from update input | Tightened                                 |
| `identity_provider_config.enabled` | Admin total switch                        | Existing boolean     | Existing | Update input remains                           | Drives status derivation                  |
| `external_org_source.status`       | Source lifecycle; `active` means runnable | Existing enum string | Existing | Request unchanged                              | Active now requires ready provider config |

## 7. 一致性结论

- Document -> code: 本片按 EX-64 / EX-72 已有对象模型补齐跨能力消费不变量。
- ADR-015 inventory -> route: route path 不变，B13 / B18 保持 aligned。
- Migration -> entity: N/A, no migration.
- Entity -> contract: `status` 仍在 response；identity provider update input 去除手工状态写入。
- Route -> command: existing routes still call existing commands.
- Query -> view: Admin dropdown/readiness derives from provider config list fields.
- Guard / permission: permissions unchanged.
- OpenAPI / generated client: expected update request model diff; must regenerate/check.

## 8. 测试与校验

| Check                            | Required          | Command / Evidence                                                                                                                                                                                                                                                                                                   | Result       | Gap / Reason                                                                                 |
| -------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| Lint                             | Yes               | `corepack pnpm nx run shared-contracts:eslint:lint --skip-nx-cache`; `corepack pnpm nx run api-contracts:eslint:lint --skip-nx-cache`; `corepack pnpm nx lint poms-api --skip-nx-cache`; `corepack pnpm nx lint poms-admin --skip-nx-cache`; `corepack pnpm nx run admin-data-access:eslint:lint --skip-nx-cache`    | Pass         | N/A                                                                                          |
| Build                            | Yes               | `corepack pnpm nx build poms-api --skip-nx-cache`; `corepack pnpm nx build poms-admin --skip-nx-cache`; `corepack pnpm nx build shared-api-client --skip-nx-cache`                                                                                                                                                   | Pass         | N/A                                                                                          |
| Unit tests                       | Yes               | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=identity-provider.service external-org-sync.service`; `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list external-org-sync-workbench`                                                                            | Pass         | API focused suites: 2 / 37 tests; Admin focused suites: 2 / 17 tests                         |
| API / integration tests          | Yes               | Focused service-level API behavior tests for `IdentityProviderService` and `ExternalOrgSyncService`                                                                                                                                                                                                                  | Pass         | Covered derived provider status, active source guard and preview-run guard                   |
| E2E / browser smoke              | Decision required | Started local API/Admin with the provided DB env; opened `http://localhost:4200/platform/identity-providers`; login attempted through the real page. Read-only DB probe showed `edb_v2.poms` has no `admin`, `viewer` or `biz_admin` dev users, so browser smoke cannot proceed without mutating the local database. | Blocked      | Local seed data unavailable; no DB mutation performed. Component tests cover the changed UI. |
| OpenAPI generation / client diff | Yes               | `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`; `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                                                                                                                                                    | Pass         | Expected diff only removes `status` from identity provider update input                      |
| Formatting / diff sanity         | Yes               | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                                                                               | Pass         | N/A                                                                                          |
| Migration / schema check         | No                | N/A                                                                                                                                                                                                                                                                                                                  | Not required | No persistence change                                                                        |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No accepted exception at G1. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local after user approval`
- Approved At: `2026-06-13`
- Conditions:
  - Do not add route surface in this slice.
  - Keep OBS / attachment storage status UX as a follow-up slice.
  - Treat OpenAPI/generated client diff as expected only for identity provider update DTO status removal.

## 11. G4 收口结论

- Gate Status: `Pass`
- Closed By: `Codex local`
- Closed At: `2026-06-13`
- Implementation Result:
  - `UpdateIdentityProviderConfigRequest` 已移除手工 `status` 写入；OpenAPI 和 generated client 已同步。
  - `IdentityProviderService` 在更新后按总开关、secret 与能力配置派生 `draft / active / disabled / misconfigured`。
  - `ExternalOrgSyncService` 在同步源启用和预览运行前统一校验 provider config 可用于组织同步。
  - Admin 企业协同接入编辑弹窗不再暴露生命周期状态选择；外部组织同步工作台禁用不可用接入配置，并提示原因和“前往企业协同接入”入口。
- Residual Risk:
  - 本地浏览器 smoke 被当前数据库缺少开发账号阻断；未运行 seed，避免污染本地数据。
