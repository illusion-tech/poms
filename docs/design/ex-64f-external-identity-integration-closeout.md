# EX-64F 外部身份集成收口验证、文档与 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-11`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `integration closeout + api contract + persistence refinement`
- Tracker Row: `EX-64F`
- Baseline: `docs/design/ex-64f-external-identity-integration-closeout-baseline.md`
- Upstream Slices: `EX-64B` ~ `EX-64E`, `FE-59`

## 1. 交付范围

本片完成外部身份最小闭环收口:

1. 将 provider 配置从单一 `redirectUri` 收敛为登录 OAuth redirect URI 与搜索授权 OAuth redirect URI 两个配置项:
   - `redirectUri`: 登录联调使用的前端 callback，例如 `/auth/identity-providers:callback`。
   - `searchRedirectUri`: 当前管理员搜索授权使用的后端 callback，例如 `/api/platform/identity-provider-oauth-grants:callback` 或部署网关等价地址。
2. 新增 `identity_provider_config.search_redirect_uri` migration、entity 字段、shared contract、OpenAPI 与 generated client 字段。
3. 后端登录授权继续使用 `redirectUri`; 当前管理员搜索授权使用 `searchRedirectUri`; token exchange 使用与 authorize 完全一致的 redirect URI。
4. Provider 配置页新增 Search Redirect URI 输入和飞书 tooltip; provider card 展示两个 callback URI。
5. 保持 `EX-64` route inventory 不变，所有新增/既有 routes 仍为 `aligned`。
6. 固化运维配置口径、secret / token redaction、PKCE 例外、真实 Feishu 租户 e2e 例外和回滚策略。
7. 修正 identity provider service 测试夹具中的固定过期时间，避免当前日期推进导致 grant / ticket 测试漂移。

本片不新增 provider 类型、不做通讯录同步、不做自助绑定、不自动创建 POMS 用户、不把外部 provider token 作为 POMS 业务授权。

## 2. 一致性结论

| Edge                        | Result | Evidence                                                                                                                                         |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route inventory -> route    | Pass   | `api-route-canonical-inventory.md` 的 `EX-64 External Identity / Provider` rows 保持 `aligned`; 本片未新增 public route。                        |
| DTO -> controller / service | Pass   | Shared contracts、API DTO、OpenAPI、generated client、service create/update/detail 均包含 `searchRedirectUri`。                                  |
| Migration -> entity -> DDL  | Pass   | `Migration20260511100000_ex64f_identity_provider_search_redirect_uri` 与 `IdentityProviderConfig.searchRedirectUri` 对齐。                       |
| OAuth callback split        | Pass   | `authorizeExternalLogin` / `exchangeExternalLoginCode` 使用 `redirectUri`; current-admin grant authorize / exchange 使用 `searchRedirectUri`。   |
| Frontend view -> contract   | Pass   | 配置表单、卡片、store payload 和 focused tests 消费 generated client 新字段。                                                                    |
| Guard / permission          | Pass   | 权限边界未变: provider 配置仍为 `platform:identity-providers:manage`; 绑定 / 搜索仍为 `platform:users:manage`; 登录 routes 公开但不暴露 secret。 |
| Secret / token redaction    | Pass   | AppSecret、provider access token、refresh token、external login ticket hash 均不进入 API response 或明文 audit snapshot。                        |

## 3. 运维配置口径

| Concern                     | Required Configuration                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feishu AppID                | 填入 provider 配置页 `Client ID`。                                                                                                                                     |
| Feishu AppSecret            | 填入 provider 配置页 `Client Secret`; POMS 使用加密字段保存，保存后不回显明文。                                                                                        |
| Secret encryption key       | 生产环境必须配置 `IDENTITY_PROVIDER_SECRET_KEY`; 缺失时会回退 `JWT_SECRET` / dev fallback，不适合生产。                                                                |
| Login Redirect URI          | 配置为前端可访问地址，例如 `https://<admin-host>/auth/identity-providers:callback`; 必须加入飞书开放平台重定向 URL 白名单。                                            |
| Search Redirect URI         | 配置为后端搜索授权 callback 的外部可访问地址，例如 `https://<api-host>/api/platform/identity-provider-oauth-grants:callback`; 必须加入飞书开放平台重定向 URL 白名单。  |
| Login scopes                | 按 Feishu 登录身份读取所需权限填写，例如 `openid` 或实际开通的用户信息读取 scope。                                                                                     |
| Search scopes               | 第一版 per-admin 搜索通常需要 `contact:user:search`; 管理员本人在飞书侧的可见范围决定搜索结果。                                                                        |
| Tenant allowlist            | 默认租户可留空; 多租户限制时填写外部租户 ID。                                                                                                                          |
| Provider endpoint overrides | 可通过 `FEISHU_OAUTH_AUTHORIZE_URL`, `FEISHU_OAUTH_TOKEN_URL`, `FEISHU_USER_INFO_URL`, `FEISHU_USER_SEARCH_URL`, `FEISHU_API_TIMEOUT_MS` 覆盖默认 endpoint / timeout。 |

## 4. 回滚策略

1. UI 层回滚: 关闭 provider 配置的 `loginEnabled` / `bindingEnabled` / `searchEnabled`，公开登录入口和管理员搜索入口会停止消费该 provider。
2. 密钥回滚: 轮换 Feishu AppSecret 后在 provider 配置页重新填写 `Client Secret`; 旧 secret 不会回显。
3. 授权回滚: 管理员搜索授权 token 存在 `identity_provider_oauth_grant`; 可通过后续管理动作撤销，第一版也可通过禁用 search 阻断继续使用。
4. 登录回滚: 外部登录成功前只会签发短时一次性 ticket; ticket hash 落库，明文不持久化，过期或已消费 ticket 会拒绝重放。
5. Schema 回滚: 本片仅新增 nullable `search_redirect_uri`; migration down 可删除该列，不影响已有 `redirect_uri`、binding、grant 或 ticket 数据。

## 5. Drift 处理

| Drift ID                        | Classification            | Resolution                                                                                                                                    |
| ------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX64F-D1-CALLBACK-URI-SPLIT`   | `new-real-drift`          | 单一 `redirectUri` 无法同时支持前端登录 callback 与后端管理员搜索授权 callback; 已新增 `searchRedirectUri` 并拆分 authorize / exchange 使用。 |
| `EX64F-D2-TIME-SENSITIVE-TESTS` | `new-real-drift`          | 固定 2026-05-07 的 grant / ticket 过期夹具在 2026-05-11 后失效; 已改为相对当前时间。                                                          |
| `EX64F-D3-OPENAPI-GEN-WARNINGS` | `existing-baseline-drift` | OpenAPI generator 仍提示既有 `propertyNames` warning; generate / check 均通过，本片不改既有 schema 形态。                                     |

## 6. 例外

| Exception ID               | Level | Scope                                | Approved By | Cleanup Owner                  | Cleanup Due                     | Notes                                                                                                                  |
| -------------------------- | ----- | ------------------------------------ | ----------- | ------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `EX64F-E1-PKCE`            | E1    | 第一版未强制 Feishu OAuth PKCE       | Codex local | Future provider security owner | Future security hardening slice | 当前为后端 confidential authorization code flow，使用 HMAC state、server-side exchange 和一次性 ticket。               |
| `EX64F-E2-REAL-FEISHU-E2E` | E2    | 本地未运行真实 Feishu 租户 OAuth e2e | Codex local | Deployment / ops owner         | Before production enablement    | 真实 e2e 依赖外部 AppID / AppSecret、回调白名单和可用管理员账号; 本片以 mocked browser journey + 运维 checklist 替代。 |

## 7. 验证结果

| Check                   | Command / Evidence                                                                                                                                                                                                                                                                         | Result                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| API focused tests       | `corepack pnpm nx test poms-api --runTestsByPath src/app/features/identity-provider/identity-provider.service.spec.ts src/app/features/identity-provider/feishu-identity-provider.adapter.spec.ts src/app/features/identity-provider/identity-provider.controller.spec.ts --skip-nx-cache` | Pass, 35 tests              |
| Admin focused tests     | `identity-provider-list`, `identity-provider-card`, `user-external-identity-panel` focused runs                                                                                                                                                                                            | Pass, 8 + 5 + 6 tests       |
| API lint                | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                                                                                           | Pass, no warnings           |
| Admin lint              | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                                                                                                                                                         | Pass                        |
| Shared contracts build  | `corepack pnpm nx build shared-contracts --skip-nx-cache`                                                                                                                                                                                                                                  | Pass                        |
| API build               | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                                                                                          | Pass                        |
| Admin build             | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                                                                                                        | Pass                        |
| API full tests          | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                                                                                           | Pass, 56 suites / 641 tests |
| Admin full tests        | `corepack pnpm nx test poms-admin --skip-nx-cache`                                                                                                                                                                                                                                         | Pass, 40 suites / 223 tests |
| OpenAPI generation      | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`                                                                                                                                                                                                                                    | Pass                        |
| Generated client        | `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`; `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                                                                                                                          | Pass                        |
| Migration apply / drift | `corepack pnpm nx run poms-api:migration-up --skip-nx-cache`; `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                              | Pass                        |
| Mocked browser e2e      | `$env:POMS_API_BASE_URL='http://127.0.0.1:59999'; corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/external-login.mocked.spec.ts --workers=1`                                                                                  | Pass, 1 test                |
| Markdown / diff sanity  | `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                                                                                    | Pass                        |

## 8. G4 结论

- `EX-64F`: `Done / G4`
- `EX-64`: `Done / G4`
- `FE-59`: remains `Done / G4`
- 外部身份 / 飞书登录与绑定第一版最小闭环可以作为后续真实租户联调和生产启用输入。
