# EX-76A 飞书能力驱动授权与用户搜索诊断实施基线包

- Gate Status: `Pass`
- Parent: GitHub issue `#28`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-07-02`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-76A`

## 1. 范围

- 本次目标:
  - 将飞书用户搜索 / 绑定从“管理员手填 OAuth scopes”收口为“管理员启用业务能力，POMS 自动请求 required scopes”。
  - 让当前管理员搜索授权自动包含飞书搜索用户所需 OAuth scopes，并在 grant 摘要中暴露缺失必需 scope 的诊断。
  - 将飞书搜索 API 的 HTTP / payload 错误归一化为脱敏 `IdentityProviderAdapterError`，避免 AxiosError 泄露 token / secret 并避免 500。
  - Admin 用户绑定弹窗展示“缺少飞书搜索权限 / 需要重新授权 / 飞书返回错误”等真实原因。
  - 搜索授权 callback 在浏览器场景回到 POMS 页面，不再展示裸 JSON；API / 测试场景保留 JSON 兼容。
- 本次明确不做:
  - 不实现飞书用户自动同步、自动创建 POMS 用户或自动分配 POMS 权限。
  - 不改变 POMS RBAC 授权来源；飞书身份只作为登录 / 绑定候选识别来源。
  - 不新增 DingTalk / WeCom adapter。
  - 不新增数据库表、migration 或新权限 key。
  - 不重构外部组织同步 runtime。
- 下游可依赖的交付边界:
  - 后续企业协同接入能力配置可依赖后端 Feishu capability registry 作为 OAuth scope SSOT。
  - 用户绑定搜索失败时，下游前端可依赖后端 4xx 业务错误和 grant `missingRequiredScopes` 判断下一步动作。
- 不允许下游依赖的留白:
  - 本片不承诺飞书开放平台权限可由 POMS 自动开通；POMS 只能提示需要在飞书开放平台开通并重新授权。
  - 本片不承诺完整 OAuth 授权结果页；第一版回到用户管理页并以 toast / 状态提示承接。

## 2. 正式输入

| Input Type                | Document / Source                                                                                                      | Section / Anchor                                  | Status | Notes                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Business design           | 线上测试反馈                                                                                                           | 飞书用户绑定搜索失败                              | Active | active grant 仍搜索失败，真实原因为飞书 `99991679 Unauthorized`。                     |
| Provider official docs    | Feishu open platform                                                                                                   | `search/v1/user`                                  | Active | 搜索用户必须使用 `user_access_token`，需要 `contact:user:search`。                    |
| Command design            | `docs/design/api-route-canonical-inventory.md`                                                                         | B13 `platform-identity`                           | Active | 复用既有 authorize / callback / search routes，不新增 route。                         |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`                                                                    | `IdentityProviderOAuthGrantSummary` / search APIs | Active | 可扩展 grant 摘要诊断字段；如 contract 变更必须生成 OpenAPI / client。                |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                                         | `6.18 EX-64 External Identity / Provider`         | Active | Existing B13 rows aligned；本片不新增 public route surface。                          |
| Query boundary            | `apps/poms-api/src/app/features/identity-provider/identity-provider.service.ts`                                        | `searchExternalUsers`                             | Active | 搜索用户必须先有 active current-admin grant，后端是最终 guard。                       |
| Data model / table freeze | `identity_provider_config` / `identity_provider_oauth_grant`                                                           | existing EX-64 persistence                        | Active | 不新增字段；required scopes 由 runtime registry 派生，grant `scopes` 继续保存授权值。 |
| Schema / DDL              | Existing migrations                                                                                                    | EX-64B / EX-64D                                   | N/A    | 本片无 migration。                                                                    |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md` / `docs/adr/001-platform-permission-model-and-authorization-boundary.md` | route grammar / POMS RBAC                         | Active | 不改变路由 identity anchor；不把飞书权限作为 POMS 授权源。                            |

## 3. 本次 SSOT

| Concern                     | SSOT                                                   | Implementation Rule                                                                |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Business semantics          | 本基线 + issue `#28`                                   | 管理员选择能力，POMS 管理 OAuth scopes。                                           |
| Public route canonical path | `api-route-canonical-inventory.md` B13                 | 不新增 route；沿用既有 `identity-provider-oauth-grants:*` 与 `external-users`。    |
| Route / command naming      | Existing EX-64 controller / service naming             | callback / search / authorize 方法名不改。                                         |
| DTO / contract naming       | `@poms/shared-contracts`                               | 新诊断字段使用 `requiredScopes` / `missingRequiredScopes`，表达 OAuth scope 事实。 |
| Table / column naming       | Existing EX-64 entities                                | 不新增列；runtime 派生不落库。                                                     |
| Date / time semantics       | Existing `z.iso.datetime()` fields                     | 不新增时间字段。                                                                   |
| Identifier semantics        | POMS UUID vs Feishu subject / open_id                  | POMS grant / config 使用 UUID；飞书用户仍使用外部 subject id 字符串。              |
| Money / decimal semantics   | N/A                                                    | 不涉及金额。                                                                       |
| Status machine              | `IdentityProviderOAuthGrantStatus`                     | grant status 仍表示授权生命周期；scope 缺失由 `missingRequiredScopes` 表示。       |
| Feishu OAuth scopes         | POMS Feishu capability registry + Feishu official docs | `userSearchBinding` required scopes 必须包含 `contact:user:search`。               |

## 4. 命令与接口边界

| Route / Controller                                            | Command / Service                         | Request DTO / Contract               | Response DTO / Contract                      | Guard / Permission                   | Design Source | Result             |
| ------------------------------------------------------------- | ----------------------------------------- | ------------------------------------ | -------------------------------------------- | ------------------------------------ | ------------- | ------------------ |
| `GET /platform/identity-provider-oauth-grants/{id}:authorize` | `authorizeCurrentAdminProviderGrant`      | path `identityProviderId`            | `IdentityProviderOAuthAuthorizeResult`       | `platform:users:manage`              | B13 / EX-64D  | reuse + scope auto |
| `GET /platform/identity-provider-oauth-grants:callback`       | `handleCurrentAdminProviderGrantCallback` | `IdentityProviderOAuthCallbackQuery` | JSON grant summary or browser redirect       | signed state + public callback       | B13 / EX-64D  | reuse + UX fix     |
| `GET /platform/identity-provider-oauth-grants/{id}`           | `getCurrentAdminProviderGrant`            | path `identityProviderId`            | `IdentityProviderOAuthGrantSummary`          | `platform:users:manage`              | B13 / EX-64D  | extend diagnostics |
| `GET /platform/identity-providers/{id}/external-users`        | `searchExternalUsers`                     | `ExternalUserSearchQuery`            | `ExternalUserSearchResult` or structured 4xx | `platform:users:manage` + grant      | B13 / EX-64D  | normalize errors   |
| `PATCH /platform/identity-providers/{id}`                     | `updateIdentityProviderConfig`            | existing config update request       | `IdentityProviderConfigDetail`               | `platform:identity-providers:manage` | B13 / EX-64B  | no route change    |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `GET /platform/identity-provider-oauth-grants/{identityProviderId}:authorize`
  - `GET /platform/identity-provider-oauth-grants:callback`
  - `GET /platform/identity-provider-oauth-grants/{identityProviderId}`
  - `GET /platform/identity-providers/{id}/external-users`
- Current implemented route(s): same as canonical.
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-64A/D`
- Blocker / exception:
  - No new public route surface.
  - Browser callback redirect is a response-mode correction under existing callback route; API JSON compatibility must be retained for generated client / tests unless OpenAPI is intentionally updated.

## 5. 读侧边界

| Query / View                         | Consumer                        | Fields                                                | Filter / Sort             | Permission Boundary                              | Design Source | Result   |
| ------------------------------------ | ------------------------------- | ----------------------------------------------------- | ------------------------- | ------------------------------------------------ | ------------- | -------- |
| Current admin provider grant summary | User external identity panel    | status, scopes, requiredScopes, missingRequiredScopes | config id                 | current POMS session + `platform:users:manage`   | this baseline | in-scope |
| External user search candidates      | User external identity panel    | subject id, display name, avatar, email, mobile, orgs | query, limit              | current POMS session + active grant + Feishu API | EX-64D        | in-scope |
| Identity provider config detail      | Enterprise collaboration config | capability flags, raw advanced scopes                 | provider / status filters | `platform:identity-providers:manage`             | EX-64B/FE-59  | in-scope |

## 6. 持久化边界

| Table                           | Migration | Entity / Repository          | DDL / Freeze Source | Check Result |
| ------------------------------- | --------- | ---------------------------- | ------------------- | ------------ |
| `identity_provider_config`      | existing  | `IdentityProviderConfig`     | EX-64B              | no change    |
| `identity_provider_oauth_grant` | existing  | `IdentityProviderOAuthGrant` | EX-64D              | no change    |

| Field           | Design Type / Meaning                      | Migration / DDL | Entity   | Shared Contract / OpenAPI                           | Result |
| --------------- | ------------------------------------------ | --------------- | -------- | --------------------------------------------------- | ------ |
| `scopes`        | provider returned / effective grant scopes | existing json   | existing | existing `IdentityProviderOAuthGrantSummary.scopes` | keep   |
| required scopes | runtime required OAuth scopes              | N/A             | N/A      | add derived field if needed                         | derive |
| missing scopes  | runtime required scopes not in grant       | N/A             | N/A      | add derived field if needed                         | derive |

## 7. 一致性结论

- Document -> code: 本片以 issue `#28` 与本基线冻结“能力驱动 scopes”边界。
- ADR-015 inventory -> route: 复用 B13 aligned routes；不新增 route。
- Migration -> entity: 无 persistence 变更。
- Entity -> contract: 若新增 grant 派生诊断字段，只扩展 shared contract，不改 entity。
- Route -> command: existing controller methods continue delegating to `IdentityProviderService`。
- Query -> view: Admin 用户绑定弹窗消费 grant 诊断和 search 4xx message。
- Guard / permission: POMS 后端 guard 仍是 `platform:users:manage`；Feishu scope 只影响 provider 调用可用性。
- OpenAPI / generated client: 若 shared contract / DTO 变更，必须运行 openapi generate 和 client check。

## 8. 测试与校验

| Check                            | Required            | Command / Evidence                                                                                                                         | Result | Gap / Reason          |
| -------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------- |
| API lint                         | Yes                 | `corepack pnpm nx lint poms-api`                                                                                                           | Pass   |                       |
| Admin lint                       | Yes                 | `corepack pnpm nx lint poms-admin`                                                                                                         | Pass   |                       |
| Admin data-access lint           | If touched          | `corepack pnpm nx lint admin-data-access`                                                                                                  | Pass   | store generated types |
| API build                        | Yes                 | `corepack pnpm nx build poms-api`                                                                                                          | Pass   |                       |
| Admin build                      | Yes                 | `corepack pnpm nx build poms-admin`                                                                                                        | Pass   |                       |
| API focused tests                | Yes                 | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=identity-provider`                                                          | Pass   | 57 tests              |
| Admin focused tests              | Yes                 | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=user-external-identity-panel identity-provider-list`                      | Pass   | 20 tests              |
| OpenAPI generation / client diff | If contract changed | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check` | Pass   |                       |
| Migration / schema check         | No                  | N/A                                                                                                                                        | N/A    | no persistence change |
| Markdown check                   | Yes                 | `pnpm run format:md:check`                                                                                                                 | Pass   | docs touched          |
| Diff sanity                      | Yes                 | `git diff --check`                                                                                                                         | Pass   |                       |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                               |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------------------------------------------------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 当前无例外；如 callback redirect 无法保持 JSON 兼容，必须在 G3 记录 OpenAPI drift。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-07-02`
- Conditions:
  - 不新增 public route surface。
  - 后端不得再让 AxiosError 原样逃逸到全局异常处理。
  - 管理员普通路径不得依赖手填 raw Feishu scopes。
