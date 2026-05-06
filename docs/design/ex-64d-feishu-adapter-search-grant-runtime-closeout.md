# EX-64D Provider adapter、飞书姓名模糊搜索与 per-admin grant G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-07`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `api + persistence + provider adapter + generated client`
- Tracker Row: `EX-64D`
- Baseline: `docs/design/ex-64a-external-identity-provider-governance-baseline.md`
- Upstream Runtime Slices: `EX-64B`、`EX-64C`

## 1. 交付范围

1. 新增 `identity_provider_oauth_grant` 表、MikroORM entity、repository 方法和 migration。
2. 新增 provider-neutral adapter interface、adapter registry 与 Feishu adapter。
3. Feishu adapter 覆盖：
   - 生成 current-admin OAuth authorize URL。
   - 使用 authorization code 交换用户级 token。
   - 调用 Feishu `search/v1/user` 搜索接口并归一化候选用户字段。
4. current-admin grant API 已落地：
   - `GET /platform/identity-provider-oauth-grants/{identityProviderId}`
   - `GET /platform/identity-provider-oauth-grants/{identityProviderId}:authorize`
   - `GET /platform/identity-provider-oauth-grants:callback`
5. 姓名模糊搜索 API 已落地：
   - `GET /platform/identity-providers/{id}/external-users?q={name}`
6. Grant token 继续使用 AES-GCM 加密存储；API / audit 不返回 access token 或 refresh token。
7. OAuth state 使用 HMAC 签名并设置短 TTL；callback 通过 state 绑定 provider config 与当前管理员。
8. 搜索只使用当前管理员已授权的 user-level token；没有 grant、grant 过期或 provider 未启用 search 时拒绝搜索。
9. Route inventory 中 `EX-64D` 四条 route 已由 `planned` 切为 `aligned`。

本片不实现飞书登录页入口、外部登录 callback / session 交换、POMS JWT 签发或前端页面；这些由 `EX-64E` 和 `FE-59` 承接。

## 2. 一致性结论

| Edge                        | Result | Evidence                                                                                                  |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Route inventory -> route    | Pass   | 四条 `EX-64D` route 已使用 `EX-64A` canonical route 并切为 `aligned`。                                    |
| DTO -> controller / service | Pass   | Shared contracts -> API DTO -> controller input / output -> OpenAPI -> generated client 已贯通。          |
| Migration -> entity -> DDL  | Pass   | `identity_provider_oauth_grant` 的 FK、check、partial unique index 和 comments 已与 Mikro metadata 对齐。 |
| Provider abstraction        | Pass   | Runtime 通过 `IdentityProviderAdapterRegistry` 获取 provider adapter；Feishu 是第一个 adapter。           |
| Current-admin search grant  | Pass   | grant 绑定 POMS 管理员、provider config 和加密 token；搜索必须走当前管理员授权。                          |
| Secret / token redaction    | Pass   | client secret、access token、refresh token 不进入 API response 或 audit 明文 snapshot。                   |

## 3. Drift 处理

| Drift ID                         | Classification            | Resolution                                                                                                                             |
| -------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `EX64D-D1-STATELESS-OAUTH-STATE` | `accepted-design-choice`  | 本片使用 HMAC 签名短 TTL state，不新增 state 表；authorization code 一次性消费，grant 持久化仍落库并审计。                             |
| `EX64D-D2-FEISHU-ENDPOINTS`      | `implementation-choice`   | Feishu endpoint 默认值集中在 adapter，允许通过 `FEISHU_OAUTH_AUTHORIZE_URL`、`FEISHU_OAUTH_TOKEN_URL`、`FEISHU_USER_SEARCH_URL` 覆盖。 |
| `EX64D-D3-OPENAPI-GEN-WARNINGS`  | `existing-baseline-drift` | OpenAPI generator 仍提示既有 `propertyNames` warning；client generate / check 均通过，本片不改既有 schema。                            |

## 4. 验证结果

| Check                  | Command                                                                                                                                                                                                                                                                                                                                                                                                                                                | Result |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| API focused tests      | `corepack pnpm nx test poms-api --runTestsByPath src/app/features/identity-provider/identity-provider.service.spec.ts src/app/features/identity-provider/identity-provider.controller.spec.ts src/app/features/identity-provider/external-identity.controller.spec.ts src/app/features/identity-provider/identity-provider-oauth-grant.controller.spec.ts src/app/features/identity-provider/feishu-identity-provider.adapter.spec.ts --skip-nx-cache` | Pass   |
| API lint               | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                       | Pass   |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                      | Pass   |
| API full tests         | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                       | Pass   |
| Generated client       | `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                      | Pass   |
| Generated client check | `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                         | Pass   |
| Migration apply        | `corepack pnpm nx run poms-api:migration-up --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                           | Pass   |
| Migration drift        | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                        | Pass   |
| Admin build            | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                    | Pass   |

## 5. G4 结论

- `EX-64D`: `Done / G4`
- `EX-64` parent remains `Doing`.
- `EX-64E` is the next backend slice and may consume provider config, external identity binding, adapter registry, grant state and generated client delivered by `EX-64B` ~ `EX-64D`.
