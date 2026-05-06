# EX-64E 飞书 OAuth 登录与 POMS JWT 会话桥接 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-07`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `auth + persistence + provider adapter + generated client`
- Tracker Row: `EX-64E`
- Baseline: `docs/design/ex-64a-external-identity-provider-governance-baseline.md`
- Upstream Runtime Slices: `EX-64B`、`EX-64C`、`EX-64D`

## 1. 交付范围

1. 新增 `external_login_ticket` 表、MikroORM entity、repository 方法和 migration。
2. Auth public API 已落地：
   - `GET /auth/identity-providers`
   - `GET /auth/identity-providers/{id}:authorize`
   - `GET /auth/identity-providers:callback`
   - `POST /auth/external-login-sessions`
3. provider list 只返回已启用、已激活、允许登录的 provider 配置摘要，不返回 client secret 或 token。
4. authorize 通过 provider adapter 生成浏览器 OAuth URL，并用 HMAC state 绑定 provider config 与短 TTL。
5. callback 使用 authorization code 换取 provider user token，仅用于读取外部用户身份，不持久化为 POMS 业务 token。
6. callback 按 provider、tenant、subject 解析 `external_identity` 绑定；未绑定、绑定停用或 POMS 用户停用均拒绝登录。
7. callback 成功后签发短时一次性 external login ticket；数据库仅保存 SHA-256 摘要，明文 ticket 只返回给前端 callback 页面。
8. session exchange 消费一次性 ticket 后调用既有 `resolveActiveAuthUser` 与 JWT 签发逻辑返回 POMS `LoginResponse`。
9. Feishu adapter 增加登录身份读取能力，默认调用 `authen/v1/user_info` 并归一化 subject、union、display name、avatar、email、mobile。
10. Route inventory 中 `EX-64E` 四条 auth route 已由 `planned` 切为 `aligned`。

本片不实现登录页按钮、callback 页面、AuthStore 会话落地或浏览器 E2E；这些由 `FE-59C` 承接。

## 2. 一致性结论

| Edge                        | Result | Evidence                                                                                                      |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Route inventory -> route    | Pass   | 四条 `EX-64E` auth route 已使用 `EX-64A` canonical route 并切为 `aligned`。                                   |
| DTO -> controller / service | Pass   | Shared contracts -> API DTO -> auth controller -> service -> OpenAPI -> generated client 已贯通。             |
| Migration -> entity -> DDL  | Pass   | `external_login_ticket` 的 FK、status check、unique ticket hash 和 indexes 已与 Mikro metadata 对齐。         |
| Provider abstraction        | Pass   | external login 继续通过 `IdentityProviderAdapterRegistry` 分发，Feishu adapter 只负责 provider token 与身份。 |
| POMS session boundary       | Pass   | Feishu user token 不作为 POMS token；只有绑定后的 POMS 用户才能通过一次性 ticket 换取 POMS JWT。              |
| Secret / token redaction    | Pass   | client secret、provider access token、one-time ticket hash 不进入 API response 或 audit 明文 snapshot。       |

## 3. Drift 处理

| Drift ID                         | Classification            | Resolution                                                                                                                                              |
| -------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX64E-D1-PKCE-DEFERRED`         | `accepted-design-choice`  | 当前落地为后端 confidential authorization code flow，使用 HMAC state、server-side code exchange 和一次性 ticket；未在 Feishu 请求中强制追加 PKCE 参数。 |
| `EX64E-D2-LOGIN-TICKET-STATEFUL` | `implementation-choice`   | callback 后新增短时 ticket 表以保证 session exchange 一次性消费、可审计和可拒绝重放；ticket 明文不落库。                                                |
| `EX64E-D3-OPENAPI-GEN-WARNINGS`  | `existing-baseline-drift` | OpenAPI generator 仍提示既有 `propertyNames` warning；client generate / check 均通过，本片不改既有 schema。                                             |

## 4. 验证结果

| Check                  | Command                                                                                                                                                                                                                                                      | Result |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| API focused tests      | `corepack pnpm nx test poms-api --runTestsByPath src/app/core/auth/auth.controller.spec.ts src/app/features/identity-provider/identity-provider.service.spec.ts src/app/features/identity-provider/feishu-identity-provider.adapter.spec.ts --skip-nx-cache` | Pass   |
| API lint               | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                                                             | Pass   |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                                                            | Pass   |
| API full tests         | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                                                             | Pass   |
| Generated client       | `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`                                                                                                                                                                                            | Pass   |
| Generated client check | `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                                                                                                                                                               | Pass   |
| Migration apply        | `corepack pnpm nx run poms-api:migration-up --skip-nx-cache`                                                                                                                                                                                                 | Pass   |
| Migration drift        | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                                                              | Pass   |
| Admin build            | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                                                                          | Pass   |

## 5. G4 结论

- `EX-64E`: `Done / G4`
- `EX-64` parent remains `Doing` until `FE-59` and `EX-64F` close the full minimum loop.
- `FE-59C` may consume `GET /auth/identity-providers`、`GET /auth/identity-providers/{id}:authorize`、`GET /auth/identity-providers:callback` and `POST /auth/external-login-sessions` delivered by this slice.
