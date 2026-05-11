# EX-64F 外部身份集成收口验证实施基线包

- Gate Status: `Pass`
- Parent: `EX-64`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `integration closeout + api contract + persistence refinement`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-11`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-64F`

## 1. 范围

- 本次目标:
  - 汇总 `EX-64B` ~ `EX-64E` 与 `FE-59` 的 route inventory、OpenAPI、generated client、测试、构建、e2e、运维配置与回滚策略证据。
  - 收口前序 closeout 留下的 OAuth callback 配置差异，避免登录 callback 与当前管理员搜索授权 callback 共用单一 `redirectUri` 后互相进入错误入口。
  - 明确 Feishu 第一版仍采用后端 confidential authorization code flow、HMAC state、短时一次性 ticket，不把外部 provider token 作为 POMS 业务授权。
  - 更新 docs / tracker，将 `EX-64` 最小闭环推进到 `Done / G4`。
- 本次明确不做:
  - 不新增新的 public route surface；既有 EX-64 route inventory 必须保持 `aligned`。
  - 不实现钉钉、企业微信、通讯录同步、自助绑定、自动创建 POMS 用户或自动赋权。
  - 不把 Feishu access token / refresh token 暴露给前端、审计快照或 POMS JWT。
  - 不做真实 Feishu 租户在线 e2e；真实租户验证依赖外部 AppID / AppSecret、回调白名单和可用管理员账号，作为运维验证步骤记录。
- 下游可依赖的交付边界:
  - Provider 配置将区分登录 OAuth redirect URI 与搜索授权 OAuth redirect URI。
  - 登录、管理员搜索授权、用户绑定和 POMS JWT 会话桥接的 route / contract / UI 消费证据完整可追溯。
  - 运维可按本片 closeout 配置 Feishu AppID / AppSecret、两个回调地址、scope、租户 allowlist、secret 轮换和回滚。
- 不允许下游依赖的留白:
  - 不承诺离线通讯录或 Feishu 组织架构是 POMS 用户事实源。
  - 不承诺 search grant 可跨管理员复用；第一版仍是 per-admin grant。
  - 不承诺 PKCE 已强制启用；当前风险以 confidential flow + signed state + one-time ticket 控制。

## 2. 正式输入

| Input Type                | Document / Source                                                      | Section / Anchor              | Status | Notes                                                               |
| ------------------------- | ---------------------------------------------------------------------- | ----------------------------- | ------ | ------------------------------------------------------------------- |
| Business design           | `ex-64a-external-identity-provider-governance-baseline.md`             | Sections 1 / 7                | Pass   | 外部身份只证明身份，POMS 用户 / 角色 / 权限仍是授权 SSOT。          |
| Runtime closeouts         | `ex-64b` ~ `ex-64e` closeout docs                                      | G4 conclusions                | Pass   | Provider config、绑定、搜索授权、登录会话桥接均已完成。             |
| Frontend closeouts        | `fe-59b`、`fe-59c`、`fe-59d` closeout docs                             | G4 conclusions / Drift        | Pass   | 用户绑定、登录 callback 和配置提示已完成；callback URI 待本片收口。 |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`                    | Identity provider contracts   | Active | 本片允许新增 `searchRedirectUri` 字段并重新生成 OpenAPI / client。  |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                                     | `EX-64 External Identity`     | Pass   | 本片不新增路由，只复核 existing aligned routes。                    |
| Query boundary            | `identity-provider.service.ts` + FE stores                             | Provider / grant / login flow | Active | 登录 provider list 与管理员 grant / search 查询分离。               |
| Data model / table freeze | `identity_provider_config`、`external_identity`、`oauth_grant`、ticket | EX-64 migrations / entities   | Active | 本片仅补 provider config 的搜索授权 redirect URI 列。               |
| ADR                       | `../adr/015-api-route-canonical-grammar.md`                            | Resource-first grammar        | Pass   | OAuth callback 继续使用既有 collection hook routes。                |

## 3. 本次 SSOT

| Concern                     | SSOT                                             | Implementation Rule                                                                                                                 |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Business semantics          | POMS `PlatformUser` / role / permission          | 外部 provider 只认证外部主体；POMS JWT 和权限仍只来自 POMS。                                                                        |
| Public route canonical path | `api-route-canonical-inventory.md`               | 不新增、不改名、不删除 EX-64 public routes。                                                                                        |
| Route / command naming      | `EX-64A` route inventory                         | 管理配置、绑定、搜索授权和登录 route 继续使用已 aligned canonical route。                                                           |
| DTO / contract naming       | Shared contracts                                 | 新字段命名为 `searchRedirectUri`；既有 `redirectUri` 保持登录 OAuth redirect URI 语义。                                             |
| Table / column naming       | `identity_provider_config` entity / migration    | 新列使用 `search_redirect_uri`，nullable URL string，长度与 `redirect_uri` 一致。                                                   |
| Date / time semantics       | ISO datetime / `timestamptz`                     | 本片不改 token expiry、ticket expiry 或 audit 时间语义。                                                                            |
| Identifier semantics        | POMS UUID + external subject string              | POMS 内部 id 仍是 UUID；Feishu `open_id` / `union_id` 仍为 string。                                                                 |
| Money / decimal semantics   | N/A                                              | 本片不涉及金额。                                                                                                                    |
| Status machine              | Existing identity provider statuses              | 不新增状态；配置完整性由 login/search redirect URI 分别约束。                                                                       |
| OAuth callback config       | Provider config + Feishu Open Platform allowlist | 登录配置 `/auth/identity-providers:callback`；搜索授权配置 `/api/platform/identity-provider-oauth-grants:callback` 或部署等价地址。 |

## 4. 命令与接口边界

| Route / Controller                                                            | Command / Service                    | Request DTO / Contract                | Response DTO / Contract                | Guard / Permission                   | Design Source | Result              |
| ----------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------- | -------------------------------------- | ------------------------------------ | ------------- | ------------------- |
| `GET /platform/identity-providers`                                            | `listIdentityProviderConfigs`        | `IdentityProviderConfigListQuery`     | `IdentityProviderConfigList`           | `platform:identity-providers:manage` | `EX-64B`      | aligned / rechecked |
| `POST /platform/identity-providers`                                           | `createIdentityProviderConfig`       | `CreateIdentityProviderConfigRequest` | `IdentityProviderConfigDetail`         | `platform:identity-providers:manage` | `EX-64B`      | field refined       |
| `PATCH /platform/identity-providers/{id}`                                     | `updateIdentityProviderConfig`       | `UpdateIdentityProviderConfigRequest` | `IdentityProviderConfigDetail`         | `platform:identity-providers:manage` | `EX-64B`      | field refined       |
| `GET /platform/identity-provider-oauth-grants/{identityProviderId}:authorize` | `authorizeCurrentAdminProviderGrant` | path `identityProviderId`             | `IdentityProviderOAuthAuthorizeResult` | `platform:users:manage`              | `EX-64D`      | uses search URI     |
| `GET /auth/identity-providers/{id}:authorize`                                 | `authorizeExternalLogin`             | path `id`                             | `ExternalLoginAuthorizeResult`         | public                               | `EX-64E`      | uses login URI      |
| All other EX-64 routes                                                        | Existing services                    | Existing contracts                    | Existing contracts                     | Existing guards                      | `EX-64A`      | aligned / rechecked |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing `EX-64 External Identity / Provider` section.
- Current implemented route(s): existing controller routes under `auth` and `platform`.
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-64A`
- Blocker / exception: no route exception; this slice changes DTO / persistence field semantics only.

## 5. 读侧边界

| Query / View                | Consumer             | Fields                                       | Filter / Sort                   | Permission Boundary                    | Design Source   | Result    |
| --------------------------- | -------------------- | -------------------------------------------- | ------------------------------- | -------------------------------------- | --------------- | --------- |
| Provider config list/detail | Provider config page | Existing config fields + `searchRedirectUri` | status, provider                | `platform:identity-providers:manage`   | EX-64B / FE-59A | refined   |
| OAuth grant status          | User binding dialog  | grant status, scopes, expiry, owner          | current admin + provider config | `platform:users:manage`                | EX-64D / FE-59B | unchanged |
| Public login provider list  | Login page           | id, provider, display name, login scopes     | enabled login providers only    | public                                 | EX-64E / FE-59C | unchanged |
| External user search        | User binding dialog  | transient external candidates                | keyword, limit                  | `platform:users:manage` + active grant | EX-64D / FE-59B | unchanged |

## 6. 持久化边界

| Table                           | Migration                 | Entity / Repository         | DDL / Freeze Source | Check Result                       |
| ------------------------------- | ------------------------- | --------------------------- | ------------------- | ---------------------------------- |
| `identity_provider_config`      | `EX-64F` corrective field | `IdentityProviderConfig`    | this baseline       | add nullable `search_redirect_uri` |
| `external_identity`             | N/A                       | Existing `ExternalIdentity` | `EX-64C`            | unchanged                          |
| `identity_provider_oauth_grant` | N/A                       | Existing grant entity       | `EX-64D`            | unchanged                          |
| `external_login_ticket`         | N/A                       | Existing ticket entity      | `EX-64E`            | unchanged                          |

| Field                 | Design Type / Meaning                         | Migration / DDL           | Entity              | Shared Contract / OpenAPI | Result |
| --------------------- | --------------------------------------------- | ------------------------- | ------------------- | ------------------------- | ------ |
| `redirect_uri`        | Login OAuth redirect URI                      | existing nullable varchar | `redirectUri`       | `redirectUri`             | keep   |
| `search_redirect_uri` | Current-admin search OAuth grant redirect URI | new nullable varchar(512) | `searchRedirectUri` | `searchRedirectUri`       | add    |

## 7. 一致性结论

- Document -> code: `searchRedirectUri` must be added where provider config is created, updated, returned, audited and rendered.
- ADR-015 inventory -> route: no route change; all existing EX-64 rows remain `aligned`.
- Migration -> entity: `search_redirect_uri` migration and entity field must match.
- Entity -> contract: summary/detail/create/update request contracts and generated client must include `searchRedirectUri`.
- Route -> command: authorize login must use `redirectUri`; authorize current-admin grant must use `searchRedirectUri`.
- Query -> view: provider config page must expose both callback URIs and explain Feishu allowlist requirements.
- Guard / permission: unchanged.
- OpenAPI / generated client: expected to change only for the new provider config field.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                          | Result     | Gap / Reason                                   |
| -------------------------------- | -------- | --------------------------------------------------------------------------- | ---------- | ---------------------------------------------- |
| API lint                         | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                            | Pending G3 | Cross-layer API change.                        |
| API build                        | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                           | Pending G3 | Cross-layer API change.                        |
| API tests                        | Yes      | `corepack pnpm nx test poms-api --skip-nx-cache`                            | Pending G3 | Provider service and adapter regression.       |
| Admin lint                       | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`                          | Pending G3 | Provider config UI change.                     |
| Admin build                      | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                         | Pending G3 | Provider config UI change.                     |
| Admin tests                      | Yes      | `corepack pnpm nx test poms-admin --skip-nx-cache`                          | Pending G3 | Provider config and binding/login regression.  |
| E2E                              | Yes      | Mocked external login journey; real Feishu ops checklist                    | Pending G3 | Real tenant e2e requires external credentials. |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi`; `shared-api-client:generate`; `shared-api-client:check` | Pending G3 | DTO field expected.                            |
| Migration / schema check         | Yes      | `poms-api:migration-check`                                                  | Pending G3 | New provider config column.                    |
| Markdown / diff sanity           | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                     | Pending G3 | Docs and tracker touched.                      |

## 9. 例外与风险

| Exception ID               | Level | Scope                                                                     | Approved By | Cleanup Owner                            | Cleanup Due                     | Notes                                                                                           |
| -------------------------- | ----- | ------------------------------------------------------------------------- | ----------- | ---------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `EX64F-E1-PKCE`            | E1    | Feishu OAuth PKCE not enforced in first version                           | Codex local | Future provider security hardening owner | Future security hardening slice | Confidential backend code exchange + signed state + one-time ticket accepted for first version. |
| `EX64F-E2-REAL-FEISHU-E2E` | E2    | Real Feishu tenant OAuth e2e not runnable locally without app credentials | Codex local | Deployment / ops owner                   | Before production enablement    | Local mocked browser e2e plus documented ops checklist substitutes for local real-tenant e2e.   |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-11`
- Conditions:
  - Fix the callback URI field split before marking `EX-64F` `Done`.
  - Keep route inventory unchanged unless verification finds an actual implemented route mismatch.
  - Classify OpenAPI generator warnings and migration-check results explicitly in closeout.
