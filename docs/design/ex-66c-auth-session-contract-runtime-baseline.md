# EX-66C 登录、外部登录与当前会话契约 Direct Cutover G1 Baseline

- Gate Status: `Pass`
- Parent: `EX-66`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `api contract + auth runtime`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-13`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-66C`
- Upstream Baseline: `docs/design/ex-66a-admin-web-cookie-session-auth-baseline.md`
- Upstream Runtime: `docs/design/ex-66b-auth-session-store-runtime-closeout.md`

## 1. 范围

- 本次目标:
  - 将账号密码登录从 `POST /auth/login` direct cutover 到 `POST /auth/sessions`。
  - 登录与外部登录 ticket exchange 成功后创建服务端 `auth_session`，写入 `poms_session` HttpOnly Cookie 与 `poms_csrf` 可读 Cookie。
  - 将 `POST /auth/external-login-sessions` 响应从 JWT `LoginResponse` 改为 `CurrentAuthSessionView`。
  - 新增 `GET /auth/session` 当前会话 bootstrap 查询，不返回 session token、token hash 或 bearer credentials。
  - 新增 `POST /auth/session:logout`，撤销当前 session 并清理 session / CSRF Cookie。
  - 将 protected Admin Web routes 的认证来源切到 `SessionAuthGuard`；`PermissionsGuard` 继续消费 `req.user`。
  - 同步 shared contracts、API DTO、OpenAPI、generated client、Admin AuthStore 最小登录调用方、API E2E helper、route inventory、focused tests 和治理文档。
- 本次明确不做:
  - 不实现 unsafe method CSRF 强校验；`EX-66D` 承接 `X-CSRF-Token` 校验、CORS credentials 细化与 `csrf_failed`。
  - 不实现全局登录失效 UX、unsafe method CSRF header 自动附加或 Admin E2E 浏览器 helper 全量收口；这些由 `EX-66D`、`FE-62A/B` 与 `EX-66E` 承接。
  - 不保留 `POST /auth/login` alias、`LoginResponse.accessToken`、localStorage token 或 browser bearer fallback。
  - 不定义外部 API / CLI 的 bearer 认证体系。

## 2. 正式输入

| Input Type       | Document / Source                                              | Section / Anchor                          | Status | Notes                                                        |
| ---------------- | -------------------------------------------------------------- | ----------------------------------------- | ------ | ------------------------------------------------------------ |
| Architecture ADR | `../adr/017-admin-web-cookie-session-auth.md`                  | Accepted decision                         | Pass   | Admin Web 目标态为 HttpOnly Cookie + 服务端 opaque session。 |
| Route inventory  | `api-route-canonical-inventory.md`                             | `B15`                                     | Pass   | `POST /auth/sessions`、`GET /auth/session`、logout 已登记。  |
| Upstream G1      | `ex-66a-admin-web-cookie-session-auth-baseline.md`             | sections 4 / 5 / 7 / 8                    | Pass   | 契约、Cookie、错误语义和 direct cutover 边界已冻结。         |
| Runtime input    | `ex-66b-auth-session-store-runtime-closeout.md`                | G4 conclusion                             | Pass   | `AuthSessionService` / Cookie helper / guard 可消费。        |
| Existing runtime | `AuthController`, `IdentityProviderService`, `PlatformService` | current login / profile / external ticket | Active | 旧 JWT response 由本片替换。                                 |

## 3. 本次 SSOT

| Concern              | SSOT                                      | Implementation Rule                                                       |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| Password login route | `B15` route inventory                     | 只保留 `POST /auth/sessions`；移除 `POST /auth/login` controller route。  |
| Success response     | `CurrentAuthSessionView`                  | 登录 / 外部登录都返回当前 session view，不返回 `accessToken`。            |
| Cookie write         | `AuthSessionCookieService`                | 每次创建 session 同时写 `poms_session` 与 `poms_csrf`。                   |
| Current user facts   | `PlatformService.getSanitizedUserProfile` | 当前会话 view 的用户资料来自 POMS 平台事实源。                            |
| Auth guard           | `SessionAuthGuard`                        | 本片把 APP_GUARD 从 `JwtAuthGuard` 切到 `SessionAuthGuard`。              |
| CSRF                 | `EX-66A` / `EX-66D`                       | 本片只发放 session-bound CSRF Cookie；unsafe method 强校验留给 `EX-66D`。 |
| Compatibility        | `ADR-017`                                 | 产品未上线，不保留 Admin Web bearer / JWT 兼容 route 或 fallback。        |

## 4. 命令与接口边界

| Route                                | Command / Service            | Request Contract                    | Response Contract           | Guard / Permission | Result      |
| ------------------------------------ | ---------------------------- | ----------------------------------- | --------------------------- | ------------------ | ----------- |
| `POST /auth/sessions`                | `createPasswordAuthSession`  | `CreatePasswordAuthSessionRequest`  | `CurrentAuthSessionView`    | public             | implemented |
| `GET /auth/session`                  | `getCurrentAuthSession`      | N/A                                 | `CurrentAuthSessionView`    | public optional    | implemented |
| `POST /auth/session:logout`          | `logoutCurrentAuthSession`   | `LogoutAuthSessionRequest`          | `AuthSessionLogoutResult`   | session guard      | implemented |
| `POST /auth/external-login-sessions` | `createExternalLoginSession` | `CreateExternalLoginSessionRequest` | `CurrentAuthSessionView`    | public             | implemented |
| `GET /auth/profile`                  | `getCurrentUserProfile`      | N/A                                 | `SanitizedUserWithOrgUnits` | session guard      | implemented |
| `PATCH /auth/profile`                | `updateCurrentUserProfile`   | `UpdateCurrentUserProfileRequest`   | `SanitizedUserWithOrgUnits` | session guard      | implemented |

## 5. 契约冻结

| Contract                           | Fields / Notes                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `CreatePasswordAuthSessionRequest` | `username`, `password`；语义等同旧账号密码登录，但命名改为 session create。                           |
| `CurrentAuthSessionView`           | `authenticated`, `status`, `user`, `permissions`, `expiresAt`, `csrf.cookieName`, `csrf.headerName`。 |
| `LogoutAuthSessionRequest`         | 空对象，预留后续客户端显式登出原因但第一版不接受业务字段。                                            |
| `AuthSessionLogoutResult`          | `authenticated: false`, `resultStatus`, `revoked`。                                                   |

Rules:

1. `CurrentAuthSessionView` 不暴露 session id、raw session token、token hash 或 JWT。
2. `permissions` 来自当前平台权限事实源，不来自浏览器缓存。
3. `expiresAt` 使用当前 session 的 idle / absolute 两者中较早者。
4. 登录失败返回 `401` + `invalid_credentials` 结构化错误。
5. 会话缺失、过期、撤销和禁用账号沿用 `SessionAuthGuard` / `AuthSessionService` 的结构化错误码。

## 6. OpenAPI / Generated Client

- OpenAPI security scheme 从 Admin Web bearer 语义切到 cookie session scheme。
- 所有受保护 controller 的 Swagger auth 注解统一为 `ApiCookieAuth('pomsSession')`，OpenAPI 不再输出 `bearer` security reference。
- `shared-api-client` 必须生成 `authControllerCreatePasswordAuthSession`、`authControllerGetCurrentAuthSession`、`authControllerLogoutCurrentAuthSession`。
- 旧 `authControllerLogin` 不应继续出现在 generated client。

## 7. 验证矩阵

| Check                  | Required | Command / Evidence                                                                                                                                                                         | Result | Gap / Reason             |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------ |
| Auth focused tests     | Yes      | `corepack pnpm nx test poms-api --runTestsByPath src/app/core/auth/auth.controller.spec.ts src/app/core/auth/guards/session-auth.guard.spec.ts --skip-nx-cache`                            | Pass   | 2 suites / 11 tests.     |
| Admin AuthStore tests  | Yes      | `corepack pnpm nx test poms-admin --runTestsByPath src/app/core/auth/auth.store.spec.ts --skip-nx-cache`                                                                                   | Pass   | 43 suites / 253 tests.   |
| API lint               | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                           | Pass   | Completed.               |
| Admin lint             | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                                                         | Pass   | Completed.               |
| API build              | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                          | Pass   | Completed.               |
| Admin build            | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                        | Pass   | Completed.               |
| OpenAPI / client       | Yes      | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`; `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`; `corepack pnpm nx run shared-api-client:check --skip-nx-cache` | Pass   | Generated client synced. |
| Migration check        | No       | N/A                                                                                                                                                                                        | N/A    | No DDL in this slice.    |
| Markdown / diff sanity | Yes      | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                     | Pass   | Completed.               |

## 8. G1 结论

- Verdict: `Pass`
- `EX-66C` may implement backend auth session contract direct cutover.
- The implementation must not reintroduce `POST /auth/login`, browser JWT response, localStorage token fallback, or bearer compatibility for Admin Web.
