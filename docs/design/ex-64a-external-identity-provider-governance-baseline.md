# EX-64A 外部身份提供商 G1 baseline、route inventory 与权限口径冻结

- Gate Status: `Pass`
- Parent: `EX-64`
- Owner: `Codex`
- Slice Type: `docs-only / process-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-64A`

## 1. 范围

- 本次目标:
  - 冻结 POMS 外部身份提供商的模块化架构、数据边界、权限边界、公共 route surface 和后续切片顺序。
  - 固定第一版 Feishu 集成策略: 外部 OAuth 只证明身份, POMS 仍签发自己的 JWT; 管理员绑定前可通过 Feishu 姓名模糊搜索定位候选用户。
  - 明确第一版不做 POMS 与 Feishu 通讯录全量同步, 不要求管理员预先知道手机号或邮箱。
  - 将后续运行时和前端切片拆为 `EX-64B` ~ `EX-64F` 与 `FE-59A` ~ `FE-59C`。
- 本次明确不做:
  - 不写运行时代码、migration、entity、DTO、controller、OpenAPI 或 generated client。
  - 不实现钉钉、企业微信, 但 provider 抽象必须允许后续增加 adapter。
  - 不允许外部 provider token 进入 POMS 业务授权链路。
  - 不做自动创建 POMS 用户、自动赋权、通讯录同步、全局外部用户缓存或离职同步。
- 下游可依赖的交付边界:
  - 后续切片必须使用本文件和 route inventory 中的 canonical route。
  - `EX-64B` 可按本文件实现 provider 配置、密钥写入态和配置 API。
  - `EX-64C` 可按本文件实现 POMS 用户与外部主体绑定。
  - `EX-64D` 可按本文件实现 Feishu adapter、per-admin search grant 和姓名模糊搜索。
  - `EX-64E` 可按本文件实现外部登录到 POMS JWT 的会话桥接。
- 不允许下游依赖的留白:
  - 不承诺外部通讯录是 POMS 用户事实源。
  - 不承诺一个 provider 能支持多个租户同时登录; 第一版按一个 Feishu app / tenant 配置落地, schema 保留扩展点。
  - 不承诺用户可自助绑定; 第一版绑定动作由具备平台管理权限的管理员执行。

## 2. 正式输入

| Input Type                | Document / Source                                      | Section / Anchor            | Status | Notes                                                                   |
| ------------------------- | ------------------------------------------------------ | --------------------------- | ------ | ----------------------------------------------------------------------- |
| Business design           | 本轮 Feishu 登录 / 绑定方案                            | Conversation decision       | Pass   | 外部身份只做认证, POMS 用户 / 角色 / 权限仍是业务授权 SSOT。            |
| Command design            | `phase2-development-execution-tracker.md`              | `EX-64` / `EX-64A` ~ `F`    | Pass   | 切片顺序已登记; runtime slices 等待本 G1。                              |
| DTO / OpenAPI design      | 本文件 4.1 / 4.2                                       | Planned contracts           | Pass   | 后续 DTO 必须先进入 shared contracts, 再生成 OpenAPI / client。         |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                     | `EX-64 External Identity`   | Pass   | 所有新增 public route 先登记为 `planned`。                              |
| Query boundary            | 本文件 5                                               | Provider / binding / search | Pass   | 管理查询、外部搜索和公开登录 provider 列表分离。                        |
| Data model / table freeze | 本文件 6                                               | Three-table model           | Pass   | `identity_provider_config`、`external_identity`、`oauth_grant`。        |
| Schema / DDL              | `EX-64B` / `EX-64C` / `EX-64D` future migrations       | Planned                     | Pass   | migration 由对应 runtime slice 分别落地。                               |
| ADR                       | `../adr/015-api-route-canonical-grammar.md`            | Resource-first grammar      | Pass   | provider config 使用平台资源; OAuth callback 使用受控 collection hook。 |
| External API              | Feishu Open Platform user search and OAuth user access | Feishu docs                 | Pass   | Feishu 搜索用户需要 user access token 和 `contact:user:search` scope。  |

## 3. 本次 SSOT

| Concern                     | SSOT                                       | Implementation Rule                                                                    |
| --------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Business semantics          | POMS `PlatformUser` / role / permission    | 外部 provider 只证明身份; 成功登录后仍按 POMS 用户签发 JWT。                           |
| Public route canonical path | `api-route-canonical-inventory.md`         | 后续 controller / OpenAPI / client 不得使用未登记或别名 route。                        |
| Route / command naming      | `EX-64A` route inventory                   | 管理配置走 `/platform/identity-providers`; 登录公开入口走 `/auth/identity-providers`。 |
| DTO / contract naming       | Shared contracts                           | provider、binding、grant、login session 都使用 provider-neutral 命名。                 |
| Table / column naming       | 本文件 6                                   | 表名使用 snake_case; provider code 使用 kebab-case value object。                      |
| Date / time semantics       | ISO datetime                               | token expiry、绑定 / 撤销时间均用 `timestamptz` / `z.iso.datetime()`。                 |
| Identifier semantics        | POMS UUID + external subject string        | POMS 内部 id 为 UUID; Feishu `open_id` / `union_id` 等外部 ID 只能作为 string。        |
| Money / decimal semantics   | N/A                                        | 本片不涉及金额。                                                                       |
| Status machine              | Provider config / binding / grant statuses | 使用 closed enum; 不用中文状态值。                                                     |
| Provider abstraction        | `ExternalIdentityProviderAdapter`          | Feishu 只是 adapter; 后续 DingTalk / WeCom 不改 POMS 绑定模型。                        |

## 4. 命令与接口边界

### 4.1 后台管理与绑定 API

| Route / Controller                                                            | Command / Service                         | Request DTO / Contract                  | Response DTO / Contract                       | Guard / Permission                       | Design Source | Result  |
| ----------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------- | --------------------------------------------- | ---------------------------------------- | ------------- | ------- |
| `GET /platform/identity-providers`                                            | `listIdentityProviderConfigs`             | `IdentityProviderConfigListQuery`       | `IdentityProviderConfigList`                  | `platform:identity-providers:manage`     | `EX-64B`      | planned |
| `POST /platform/identity-providers`                                           | `createIdentityProviderConfig`            | `CreateIdentityProviderConfigRequest`   | `IdentityProviderConfigDetail`                | `platform:identity-providers:manage`     | `EX-64B`      | planned |
| `GET /platform/identity-providers/{id}`                                       | `getIdentityProviderConfig`               | path `id`                               | `IdentityProviderConfigDetail`                | `platform:identity-providers:manage`     | `EX-64B`      | planned |
| `PATCH /platform/identity-providers/{id}`                                     | `updateIdentityProviderConfig`            | `UpdateIdentityProviderConfigRequest`   | `IdentityProviderConfigDetail`                | `platform:identity-providers:manage`     | `EX-64B`      | planned |
| `POST /platform/identity-providers/{id}:testConnection`                       | `testIdentityProviderConnection`          | `TestIdentityProviderConnectionRequest` | `IdentityProviderConnectionTestResult`        | `platform:identity-providers:manage`     | `EX-64B`      | planned |
| `GET /platform/users/{id}/external-identities`                                | `listUserExternalIdentities`              | path `id`                               | `ExternalIdentityBindingList`                 | `platform:users:manage`                  | `EX-64C`      | planned |
| `POST /platform/users/{id}/external-identities`                               | `bindUserExternalIdentity`                | `BindUserExternalIdentityRequest`       | `ExternalIdentityBindingSummary`              | `platform:users:manage`                  | `EX-64C`      | planned |
| `POST /platform/external-identities/{id}:unbind`                              | `unbindExternalIdentity`                  | `UnbindExternalIdentityRequest`         | `ExternalIdentityBindingSummary`              | `platform:users:manage`                  | `EX-64C`      | planned |
| `GET /platform/identity-providers/{id}/external-users`                        | `searchExternalUsers`                     | `ExternalUserSearchQuery`               | `ExternalUserSearchResult`                    | `platform:users:manage`                  | `EX-64D`      | planned |
| `GET /platform/identity-provider-oauth-grants/{identityProviderId}`           | `getCurrentAdminProviderGrant`            | path `identityProviderId`               | `IdentityProviderOAuthGrantStatus`            | `platform:users:manage`                  | `EX-64D`      | planned |
| `GET /platform/identity-provider-oauth-grants/{identityProviderId}:authorize` | `authorizeCurrentAdminProviderGrant`      | path `identityProviderId`, `returnTo?`  | browser redirect / `ExternalAuthorizationUrl` | `platform:users:manage`                  | `EX-64D`      | planned |
| `GET /platform/identity-provider-oauth-grants:callback`                       | `handleCurrentAdminProviderGrantCallback` | `code`, `state`                         | browser redirect                              | signed state + authenticated grant owner | `EX-64D`      | planned |

### 4.2 登录 API

| Route / Controller                            | Command / Service             | Request DTO / Contract              | Response DTO / Contract                       | Guard / Permission | Design Source | Result  |
| --------------------------------------------- | ----------------------------- | ----------------------------------- | --------------------------------------------- | ------------------ | ------------- | ------- |
| `GET /auth/identity-providers`                | `listEnabledLoginProviders`   | N/A                                 | `PublicIdentityProviderList`                  | public             | `EX-64E`      | planned |
| `GET /auth/identity-providers/{id}:authorize` | `authorizeExternalLogin`      | path `id`, `returnTo?`              | browser redirect / `ExternalAuthorizationUrl` | public             | `EX-64E`      | planned |
| `GET /auth/identity-providers:callback`       | `handleExternalLoginCallback` | `code`, `state`                     | browser redirect with one-time ticket         | signed state       | `EX-64E`      | planned |
| `POST /auth/external-login-sessions`          | `createExternalLoginSession`  | `CreateExternalLoginSessionRequest` | existing `LoginResponse`                      | public             | `EX-64E`      | planned |

### 4.3 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): see `EX-64 External Identity / Provider` section.
- Current implemented route(s): N/A, all planned.
- Inventory status: `planned`
- Route governance source: `ADR-015` + this baseline.
- Blocker / exception: no route exception; runtime slices are blocked until they consume this inventory.

## 5. 读侧边界

| Query / View                | Consumer       | Fields                                                                                                                | Filter / Sort                   | Permission Boundary                           | Design Source | Result  |
| --------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------- | ------------- | ------- |
| Provider config list/detail | `FE-59A`       | provider code, display name, status, flags, client id, secret write state, scopes, redirect URI, grant mode           | status, provider                | `platform:identity-providers:manage`          | `EX-64B`      | planned |
| Public login provider list  | login page     | id, provider, display name, icon, login enabled                                                                       | enabled login providers only    | public, no secret fields                      | `EX-64E`      | planned |
| User external identity list | user detail    | provider, tenant, subject display name, binding status, bound / revoked metadata                                      | by POMS user id                 | `platform:users:manage`                       | `EX-64C`      | planned |
| External user search        | binding dialog | external subject id, union id, display name, avatar, department hints, optional email / mobile if provider returns it | keyword, page token, page size  | `platform:users:manage` + current admin grant | `EX-64D`      | planned |
| OAuth grant status          | binding dialog | grant exists, scopes, expiry, provider, owner                                                                         | current admin + provider config | `platform:users:manage`                       | `EX-64D`      | planned |

Feishu search rule:

- Search source is Feishu user search, not a synced local address book.
- The request must use the current POMS admin's Feishu user access token.
- The first version requires Feishu search scope `contact:user:search`.
- Search results are transient candidates; binding persists only the chosen external subject.
- If the admin grant is missing or expired, POMS returns a grant-required error and the frontend opens the grant flow.

## 6. 持久化边界

### 6.1 Table freeze

| Table                           | Migration Slice | Entity / Repository                 | DDL / Freeze Source | Check Result |
| ------------------------------- | --------------- | ----------------------------------- | ------------------- | ------------ |
| `identity_provider_config`      | `EX-64B`        | future `IdentityProviderConfig`     | this baseline       | planned      |
| `external_identity`             | `EX-64C`        | future `ExternalIdentity`           | this baseline       | planned      |
| `identity_provider_oauth_grant` | `EX-64D`        | future `IdentityProviderOAuthGrant` | this baseline       | planned      |

### 6.2 Field semantics

| Field / Concern                                        | Design Type / Meaning                              | Migration / DDL Rule                           | Entity / Contract Rule                                        | Result  |
| ------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- | ------- |
| `provider`                                             | closed provider code, first value `feishu`         | varchar, check / shared enum                   | provider-neutral enum; future `dingtalk` / `wecom` add values | planned |
| `tenant_id`                                            | external tenant identifier                         | nullable string; not UUID                      | Feishu tenant id / app tenant key stays string                | planned |
| `client_id`                                            | provider app id                                    | string, visible to admin                       | may be returned in admin detail                               | planned |
| `encrypted_client_secret`                              | provider app secret                                | encrypted at rest; write-only output           | API never returns raw secret                                  | planned |
| `login_enabled` / `binding_enabled` / `search_enabled` | capability toggles                                 | booleans with default false                    | public provider list only uses active + login enabled         | planned |
| `search_grant_mode`                                    | `per-admin` first; `service-account` future option | closed enum                                    | first runtime only implements `per-admin`                     | planned |
| `external_identity.subject_id`                         | provider user subject                              | string, unique with provider config and tenant | Feishu first version uses `open_id`; `union_id` optional      | planned |
| `external_identity.poms_user_id`                       | bound POMS user                                    | UUID FK to `platform_user`                     | binding is not authorization; POMS roles still control access | planned |
| `oauth_grant.poms_user_id`                             | POMS admin who authorized search                   | UUID FK to `platform_user`                     | grant is personal to admin; not reused across administrators  | planned |
| token fields                                           | encrypted Feishu access / refresh token            | encrypted at rest; expiry indexed              | never returned to frontend or stored in audit snapshots       | planned |

Minimum constraints:

1. `identity_provider_config`: unique active provider + tenant combination.
2. `external_identity`: unique active provider config + tenant + subject; unique active POMS user + provider config.
3. `identity_provider_oauth_grant`: unique current admin + provider config + purpose.
4. Secret and token columns must never be logged in `audit_log.beforeSnapshot` / `afterSnapshot`.

## 7. Adapter 与安全边界

| Boundary            | Rule                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Adapter interface   | `ExternalIdentityProviderAdapter` exposes login authorization, token exchange, profile normalize, external user search, connection test. |
| Normalized identity | `{ provider, tenantId, subjectId, unionId?, displayName?, avatarUrl?, email?, mobile? }`.                                                |
| Feishu login        | Adapter maps Feishu profile to normalized identity; POMS matches active `external_identity`.                                             |
| Feishu admin search | Adapter calls Feishu user search with the admin's user access token.                                                                     |
| POMS session        | Only POMS signs JWT; JWT payload remains POMS `sub`, `username`, `permissions`.                                                          |
| Error model         | unconfigured, disabled, grant-required, grant-expired, unbound, inactive-user, subject-conflict are explicit machine codes.              |
| Audit               | Config changes, bind / unbind, grant create / revoke, login success / failure all emit audit or security events with secret redaction.   |

## 8. 一致性结论

- Document -> code: no runtime code in this slice; future code must consume this baseline.
- ADR-015 inventory -> route: all planned public routes are added to `api-route-canonical-inventory.md`.
- Migration -> entity: blocked until `EX-64B` / `EX-64C` / `EX-64D`; DDL semantics are frozen here.
- Entity -> contract: future shared contracts must use provider-neutral names and string external identifiers.
- Route -> command: controller names and command names are frozen in section 4.
- Query -> view: FE-59 pages only consume bounded query views in section 5.
- Guard / permission:
  - `platform:identity-providers:manage` for provider config.
  - `platform:users:manage` for binding and external user search.
  - public auth routes expose no secrets and perform only login initiation / session exchange.
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

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes               |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1. |

Known risks for runtime slices:

1. Feishu visible search scope depends on the admin's Feishu permissions; POMS must surface "grant required / insufficient visibility" instead of silently returning a misleading empty result.
2. External IDs are strings, not UUIDs; contract and DB layers must not coerce them into POMS IDs.
3. Secret encryption needs an explicit application key / crypto utility before `EX-64B` writes secrets.
4. Public login provider list must not leak disabled providers, client secrets, token status, tenant allowlist internals or admin grant state.

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Conditions:
  - `EX-64B` must implement provider config first and introduce `platform:identity-providers:manage`.
  - `EX-64C` must not auto-create POMS users or bypass existing role / permission checks.
  - `EX-64D` must implement Feishu search through per-admin grant; no address book sync in first version.
  - `EX-64E` must issue only POMS JWT and reject unbound or inactive users.
