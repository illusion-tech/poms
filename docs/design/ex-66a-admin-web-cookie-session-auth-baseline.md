# EX-66A Admin Web 会话认证 G1 baseline、route inventory 与 direct cutover 边界冻结

- Gate Status: `Pass`
- Parent: `EX-66`
- Owner: `Codex`
- Slice Type: `docs-only / process-only / cross-layer-high-risk input freeze`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-13`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-66A`

## 1. 范围

- 本次目标:
  - 冻结 Admin Web 认证目标态: `HttpOnly Cookie + 服务端 opaque session`，浏览器 JavaScript 不再持有 POMS access token、refresh token 或 self-contained JWT。
  - 冻结 session cookie 名称、CSRF token 传递方式、Cookie flags、session 生命周期、错误语义、OpenAPI security scheme 和测试迁移边界。
  - 冻结账号密码登录、外部登录 ticket exchange、当前会话读取、登出和 CSRF bootstrap 的 canonical route surface。
  - 在 `api-route-canonical-inventory.md` 登记 `B15` 认证会话 direct cutover routes，并标清旧 `POST /auth/login` 与 Admin Web bearer flow 清退口径。
- 本次明确不做:
  - 不写运行时代码、migration、entity、DTO、controller、OpenAPI 或 generated client。
  - 不实现 session store、guard、CSRF guard、Cookie 写入工具或前端 API client 切换。
  - 不定义外部 API / CLI / 移动端 / 第三方系统 bearer 认证体系；这些入口若需要，后续另拆治理切片。
  - 不保留 Admin Web 旧 `localStorage.poms_access_token`、`Authorization: Bearer` 或 `POST /auth/login` 兼容路径。
- 下游可依赖的交付边界:
  - `EX-66B` 可按本文件实现 `auth_session` 持久化、session token hash、Cookie lifecycle、session guard 和基础审计。
  - `EX-66C` 可按本文件将账号密码登录、飞书外部登录 ticket exchange、当前会话和登出契约直接切到 Cookie session。
  - `EX-66D` 可按本文件实现 CSRF token 发放 / 校验、credentials CORS 和结构化认证错误。
  - `FE-62A` 可按本文件把 `AuthStore`、generated API client 调用习惯和 unsafe method CSRF header 切到 Cookie credentials。
  - `FE-62B` 可按本文件收口 AFK / session expired / logout / unauthorized 的统一前端引导。
  - `EX-66E` 可按本文件完成 E2E helper、API helper、route inventory、tracker、ADR 实现结果和 closeout 回写。
- 不允许下游依赖的留白:
  - 不允许继续通过 `LoginResponse.accessToken` 承接 Admin Web 登录成功态。
  - 不允许把 JWT 放进 HttpOnly Cookie 作为本次目标态替代。
  - 不允许使用 `SameSite` 替代 CSRF 校验。
  - 不允许前端读取、拼接或缓存 POMS session token。

## 2. 正式输入

| Input Type                | Document / Source                                    | Section / Anchor                            | Status | Notes                                                               |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------- | ------ | ------------------------------------------------------------------- |
| ADR                       | `../adr/017-admin-web-cookie-session-auth.md`        | Accepted decision                           | Pass   | 方案 C 已接受；产品未上线，Admin Web direct cutover，不保留旧兼容。 |
| Command design            | `phase2-development-execution-tracker.md`            | `EX-66` / `EX-66A` ~ `EX-66E` / `FE-62A/B`  | Pass   | 切片顺序已登记；runtime slices 等待本 G1。                          |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                   | `EX-66 Admin Web Cookie Session`            | Pass   | `B15` routes 已登记为 `planned` / `implementation-drift`。          |
| Existing runtime          | `apps/poms-api/src/app/core/auth/auth.controller.ts` | `POST /auth/login` / external login session | Active | 当前返回 `LoginResponse.accessToken`，由 `EX-66C` direct cutover。  |
| Existing guard            | `JwtAuthGuard` + `PermissionsGuard`                  | app-wide guard chain                        | Active | 浏览器会话职责由 `EX-66B` 迁移为 session guard。                    |
| Existing frontend         | `AuthStore` / generated API client / Admin E2E       | token in `localStorage` + bearer header     | Active | 由 `FE-62A/B` 和 `EX-66E` 清退。                                    |
| DTO / OpenAPI design      | 本文件 4 / 5                                         | Planned contracts                           | Pass   | DTO 必须先进入 shared contracts，再生成 OpenAPI / client。          |
| Data model / table freeze | 本文件 6                                             | `auth_session`                              | Pass   | 新表由 `EX-66B` 落地。                                              |
| Security design           | 本文件 7 / 8                                         | Cookie / CSRF / error semantics             | Pass   | `SameSite=Lax` 是辅助防线；unsafe method 必须校验 CSRF token。      |

## 3. 本次 SSOT

| Concern                     | SSOT                                          | Implementation Rule                                                                                        |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Business semantics          | POMS `PlatformUser` / role / permission facts | 外部 IdP 只做身份断言；POMS 本地 session 绑定 POMS user 并从平台权限事实源构造授权上下文。                 |
| Public route canonical path | `api-route-canonical-inventory.md`            | 后续 controller / OpenAPI / client 不得继续使用未登记 route 或旧 Admin Web bearer login alias。            |
| Session cookie              | 本文件 7.1                                    | Cookie name 为 `poms_session`；值为高熵 opaque token；服务端只保存 hash。                                  |
| CSRF token                  | 本文件 7.2                                    | Header name 为 `X-CSRF-Token`；可读 cookie name 为 `poms_csrf`；token 与 session 或匿名浏览器上下文绑定。  |
| DTO / contract naming       | Shared contracts                              | 使用 `CreatePasswordAuthSessionRequest`、`CurrentAuthSessionView`、`CsrfTokenView` 等 session 语义命名。   |
| Table / column naming       | 本文件 6                                      | 表名使用 snake_case；session token 明文不得落库。                                                          |
| Date / time semantics       | ISO datetime                                  | idle / absolute expiry、last seen、revoked / created / updated 时间均用 `timestamptz` / ISO datetime。     |
| Status machine              | 本文件 6.3                                    | session 状态使用 closed enum；过期、撤销和登出必须可区分。                                                 |
| OpenAPI security scheme     | 本文件 5                                      | Admin Web 使用 cookie session scheme + CSRF header scheme；未来外部 API bearer scheme 不在本片定义。       |
| Compatibility boundary      | ADR-017 + 本文件                              | 产品未上线，直接切走 Admin Web JWT session bridge；不提供浏览器 bearer fallback、legacy alias 或双写过渡。 |
| Error semantics             | 本文件 8                                      | 认证失败、会话过期、CSRF 失败和权限不足必须使用结构化错误码，前端不能再只展示普通业务列表读取失败。        |

## 4. 命令与接口边界

### 4.1 Admin Web Session API

| Route / Controller                   | Command / Service            | Request DTO / Contract              | Response DTO / Contract     | Guard / Permission               | Design Source | Result  |
| ------------------------------------ | ---------------------------- | ----------------------------------- | --------------------------- | -------------------------------- | ------------- | ------- |
| `POST /auth/sessions`                | `createPasswordAuthSession`  | `CreatePasswordAuthSessionRequest`  | `CurrentAuthSessionView`    | public + CSRF bootstrap required | `EX-66C`      | planned |
| `GET /auth/session`                  | `getCurrentAuthSession`      | N/A                                 | `CurrentAuthSessionView`    | optional session guard           | `EX-66C`      | planned |
| `POST /auth/session:logout`          | `logoutCurrentAuthSession`   | `LogoutAuthSessionRequest`          | `AuthSessionLogoutResult`   | session guard + CSRF             | `EX-66C`      | planned |
| `GET /auth/csrf-token`               | `getCsrfToken`               | N/A                                 | `CsrfTokenView`             | public or session-aware          | `EX-66D`      | planned |
| `POST /auth/external-login-sessions` | `createExternalLoginSession` | `CreateExternalLoginSessionRequest` | `CurrentAuthSessionView`    | public + CSRF bootstrap required | `EX-66C`      | planned |
| `GET /auth/profile`                  | `getCurrentUserProfile`      | N/A                                 | `SanitizedUserWithOrgUnits` | session guard                    | `EX-66C`      | planned |
| `PATCH /auth/profile`                | `updateCurrentUserProfile`   | `UpdateCurrentUserProfileRequest`   | `SanitizedUserWithOrgUnits` | session guard + CSRF             | `EX-66D`      | planned |

Rules:

1. `POST /auth/sessions` replaces Admin Web `POST /auth/login`; response does not contain `accessToken`.
2. `POST /auth/external-login-sessions` keeps the existing route path but changes the response and side effect: consume one-time external login ticket, set `poms_session`, return current POMS session view.
3. `GET /auth/session` is the frontend bootstrap source for "am I authenticated"; it must not expose session token, token hash, raw cookie attributes or bearer credentials.
4. `GET /auth/profile` remains a user profile query, not a token refresh endpoint.
5. Login and external login ticket exchange are unsafe public operations and must use CSRF bootstrap rather than relying on `SameSite` alone.

### 4.2 Public route补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): see `EX-66 Admin Web Cookie Session` section.
- Current implemented route(s):
  - Existing password login: `POST /auth/login`.
  - Existing external login ticket exchange: `POST /auth/external-login-sessions` returning `LoginResponse.accessToken`.
  - Existing profile routes: `GET /auth/profile`, `PATCH /auth/profile` guarded by JWT auth.
- Inventory status:
  - `POST /auth/sessions`: `implementation-drift` until `EX-66C` removes `POST /auth/login`.
  - `GET /auth/session`, `POST /auth/session:logout`, `GET /auth/csrf-token`: `planned` until `EX-66C/D`.
  - `POST /auth/external-login-sessions`: route path is aligned, response / session side effect changes in `EX-66C`.
- Route governance source: `ADR-015` + `ADR-017` + this baseline.
- Blocker / exception: runtime slices are blocked until they consume this inventory; no compatibility alias is allowed for old Admin Web token flow after `EX-66C`.

## 5. 读侧与 OpenAPI 边界

| Query / View              | Consumer             | Fields                                                                                      | Filter / Sort | Permission Boundary                | Design Source | Result  |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------- | ------------- | ---------------------------------- | ------------- | ------- |
| Current auth session      | Admin bootstrap      | authenticated flag, session status, user summary, permissions summary, expiresAt, csrf hint | current       | optional session guard             | `EX-66C`      | planned |
| Current user profile      | profile page / shell | user id, username, displayName, email, phone, org units, role summaries                     | current       | session guard                      | `EX-66C`      | planned |
| CSRF token view           | API client bootstrap | token, headerName, cookieName, expiresAt                                                    | current       | public or session-aware            | `EX-66D`      | planned |
| Login provider list       | login page           | provider id, code, display name, enabled login entry                                        | enabled only  | public                             | `EX-64E`      | aligned |
| Navigation / todos / data | existing pages       | unchanged business views                                                                    | existing      | session-derived current user guard | `FE-62A/B`    | planned |

OpenAPI rules:

1. Add an Admin Web cookie session security scheme for protected Admin routes.
2. Add a CSRF header parameter / security helper for unsafe methods; do not model CSRF as an application business field.
3. Remove `LoginResponse.accessToken` from Admin Web login / external login success flows during direct cutover.
4. Generated client must support `withCredentials` / credentials include semantics for browser calls.
5. Future external API bearer schemes must be named and documented separately; they must not be inferred from Admin Web cookie session.

## 6. 持久化边界

### 6.1 Table freeze

| Table          | Migration Slice | Entity / Repository  | DDL / Freeze Source | Check Result |
| -------------- | --------------- | -------------------- | ------------------- | ------------ |
| `auth_session` | `EX-66B`        | future `AuthSession` | this baseline       | planned      |

### 6.2 Field semantics

| Field / Concern                 | Design Type / Meaning                     | Migration / DDL Rule                         | Entity / Contract Rule                                                 | Result  |
| ------------------------------- | ----------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- | ------- |
| `id`                            | POMS session identity                     | UUID primary key                             | May be referenced by audit; not exposed as cookie value                | planned |
| `token_hash`                    | hash of high-entropy opaque session token | unique, indexed, never nullable              | raw token only exists in `Set-Cookie`; never logged or returned        | planned |
| `csrf_token_hash`               | hash of current CSRF token                | nullable before bootstrap, indexed if needed | raw CSRF token returned only through CSRF view / readable cookie       | planned |
| `user_id`                       | POMS `PlatformUser` FK                    | FK + index                                   | user facts remain SSOT for authorization                               | planned |
| `status`                        | `active`, `revoked`, `expired`            | closed enum + index                          | drives structured auth error mapping                                   | planned |
| `idle_expires_at`               | no-activity expiry                        | `timestamptz` + index                        | first version default: 15 minutes, configurable                        | planned |
| `absolute_expires_at`           | maximum session lifetime                  | `timestamptz` + index                        | first version default: 8 hours, configurable                           | planned |
| `last_seen_at`                  | latest accepted request time              | `timestamptz`                                | may be throttled to avoid write amplification                          | planned |
| `revoked_at` / `revoked_reason` | revoke / logout metadata                  | nullable timestamp + reason enum / string    | logout, admin force revoke, password reset and account disabled differ | planned |
| `created_ip` / `last_ip`        | request IP snapshot                       | nullable string                              | audit and security event support                                       | planned |
| `created_user_agent`            | browser user-agent snapshot               | nullable string                              | audit and session management support                                   | planned |
| `created_at` / `updated_at`     | audit timestamps                          | existing timestamp convention                | standard entity timestamps                                             | planned |
| `row_version`                   | optimistic concurrency                    | existing row version convention              | revoke / rotate / update should be concurrency-safe                    | planned |

Minimum constraints:

1. `token_hash` must be unique and generated from a random token with at least 256 bits of entropy.
2. Active session lookup must use hash equality, not raw token persistence.
3. Session cleanup may physically purge expired / revoked rows after retention, but must not erase security-event audit records.
4. Account disabled, password reset or administrator force logout must be able to revoke all sessions for a user.

### 6.3 Session status machine

| Status    | Meaning                            | Allowed Transitions  |
| --------- | ---------------------------------- | -------------------- |
| `active`  | session can authenticate requests  | `revoked`, `expired` |
| `revoked` | session was explicitly terminated  | terminal             |
| `expired` | idle or absolute expiry has passed | terminal             |

Lifecycle rules:

1. A request after `idle_expires_at` or `absolute_expires_at` must fail with `session_expired`, then persist terminal expiry best-effort.
2. Logout sets `revoked` and clears cookies in the same response.
3. Session rotation creates a new token, stores only the new hash and invalidates the old token path.
4. Permission checks must read current user / role / permission facts; browser session state must not cache authoritative permission claims.

## 7. Cookie、CSRF 与 CORS

### 7.1 Cookie policy

| Cookie Name    | HttpOnly | Secure                         | SameSite | Path                   | Value             | Owner   |
| -------------- | -------- | ------------------------------ | -------- | ---------------------- | ----------------- | ------- |
| `poms_session` | yes      | yes except local dev exception | `Lax`    | deployed API base path | opaque token      | backend |
| `poms_csrf`    | no       | yes except local dev exception | `Lax`    | deployed API base path | CSRF token mirror | backend |

Rules:

1. Production and non-local environments must set `Secure`; local development may disable `Secure` only behind explicit environment config.
2. Cookie `Path` must match deployed API base path, normally `/api`; do not use a wider path unless API deployment requires it.
3. `SameSite=None` is not allowed in first version unless a later ADR / G1 exception proves a real cross-site embedding need.
4. Cookie domain should be host-only by default; shared parent domains require explicit security review.

### 7.2 CSRF policy

1. `GET /auth/csrf-token` issues or refreshes a CSRF token for either an anonymous login bootstrap context or an authenticated session.
2. Unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) must send `X-CSRF-Token`.
3. The server validates token hash against the current session or pre-login CSRF context.
4. Missing, mismatched or expired CSRF token returns `403` with code `csrf_failed`.
5. CSRF failure must be logged as a security event with redacted details.

### 7.3 CORS / credentials policy

1. Same-origin production deployment is preferred.
2. Cross-origin local development must explicitly allow configured Admin origin and credentials.
3. Wildcard origin is forbidden when credentials are enabled.
4. Preflight must include `X-CSRF-Token`.

## 8. 错误与前端交互语义

| Condition                | HTTP Status | Error Code            | Frontend Rule                                                   |
| ------------------------ | ----------- | --------------------- | --------------------------------------------------------------- |
| No session cookie        | `401`       | `session_missing`     | Redirect to login with safe `returnUrl`                         |
| Session expired          | `401`       | `session_expired`     | Redirect to login and show "登录已过期，请重新登录后继续"       |
| Session revoked / logout | `401`       | `session_revoked`     | Clear local non-sensitive auth state and show login             |
| Account disabled         | `401`       | `account_disabled`    | Show blocked login message, do not retry automatically          |
| CSRF missing / invalid   | `403`       | `csrf_failed`         | Refresh CSRF once only if safe; otherwise show security failure |
| Permission denied        | `403`       | `permission_denied`   | Keep current session; show no-permission message                |
| Bad credentials          | `401`       | `invalid_credentials` | Stay on login form                                              |

Rules:

1. Business pages must not turn `session_expired` into generic "列表读取失败".
2. Frontend global auth interceptor owns session-expired UX; feature stores may still show domain errors for non-auth failures.
3. `returnUrl` must be same-origin / internal route only; external URLs are rejected or normalized to dashboard.

## 9. 一致性结论

- Document -> code: no runtime code in this slice; future code must consume this baseline.
- ADR-017 -> route inventory: `B15` session routes have been registered in `api-route-canonical-inventory.md`.
- Route -> command: controller routes and command names are frozen in section 4.
- Migration -> entity: blocked until `EX-66B`; table and field semantics are frozen here.
- Entity -> contract: future shared contracts must remove Admin Web `LoginResponse.accessToken` from success flows.
- Guard / permission:
  - Session guard replaces browser `JwtAuthGuard` responsibilities.
  - Existing `PermissionsGuard` remains authorization input consumer but reads a session-derived current user context.
  - CSRF guard applies to unsafe methods after authentication / pre-login bootstrap.
- OpenAPI / generated client: runtime slices must regenerate and check client after contract changes.
- Frontend state: `AuthStore` must model current session / current user, not browser token.

## 10. 测试与校验

| Check                            | Required | Command / Evidence                                      | Result       | Gap / Reason                     |
| -------------------------------- | -------- | ------------------------------------------------------- | ------------ | -------------------------------- |
| Lint                             | No       | N/A                                                     | Not required | Docs-only slice.                 |
| Build                            | No       | N/A                                                     | Not required | No runtime code.                 |
| Unit tests                       | No       | N/A                                                     | Not required | No runtime code.                 |
| API / integration tests          | No       | N/A                                                     | Not required | No runtime code.                 |
| E2E                              | No       | N/A                                                     | Not required | No runtime code.                 |
| OpenAPI generation / client diff | No       | N/A                                                     | Not required | Inventory only; no OpenAPI code. |
| Migration / schema check         | No       | N/A                                                     | Not required | No DDL.                          |
| Markdown                         | Yes      | `corepack pnpm run format:md:check`; `git diff --check` | Planned      | Run after document edits.        |

Future required validation:

1. `EX-66B`: focused session repository / service / guard tests, migration checks, security event tests.
2. `EX-66C`: login, external login ticket exchange, current session, logout, account disabled and forced revoke API tests.
3. `EX-66D`: CSRF success / failure, CORS credentials and structured error tests.
4. `FE-62A/B`: AuthStore / API client focused tests plus AFK session-expired UX tests.
5. `EX-66E`: Admin E2E helper and at least one browser smoke covering login -> authenticated route -> logout / expired redirect.

## 11. 例外与风险

| ID                      | Type | Severity | Description                                                                                  | Owner | Disposition        |
| ----------------------- | ---- | -------- | -------------------------------------------------------------------------------------------- | ----- | ------------------ |
| `EX66A-R1-LOCAL-CORS`   | Risk | Medium   | Local dev may require cross-origin credentials and CSRF header preflight tuning.             | Codex | Track in `EX-66D`. |
| `EX66A-R2-E2E-HELPER`   | Risk | Medium   | Existing E2E helpers read `localStorage.poms_access_token`; direct cutover will break them.  | Codex | Track in `EX-66E`. |
| `EX66A-R3-CLIENT-CREDS` | Risk | Medium   | Generated client / Angular HttpClient defaults may omit credentials unless explicitly wired. | Codex | Track in `FE-62A`. |

No G1 exceptions are accepted for Admin Web legacy bearer compatibility.

## 12. G1 结论

- Verdict: `Pass`
- `EX-66A` freezes the accepted ADR-017 target architecture, B15 canonical route surface, session persistence semantics, Cookie / CSRF security rules and frontend/error migration boundaries.
- `EX-66B` may start next and must not reintroduce Admin Web JWT / bearer compatibility.
