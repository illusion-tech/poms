# EX-66D CSRF 防护、credentials CORS 与认证错误语义实施基线包

- Gate Status: `Pass`
- Parent: `EX-66`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `api-command` / `auth-runtime`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-14`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-66D`

## 1. 范围

- 本次目标:
  - 新增 `GET /auth/csrf-token`，为当前浏览器会话发放或刷新 `poms_csrf` token，并返回前端可消费的 CSRF header / cookie 元信息。
  - 新增全局 unsafe method CSRF 校验，覆盖 `POST`、`PUT`、`PATCH`、`DELETE`，校验 `X-CSRF-Token` 与 `poms_csrf` cookie，并在已认证会话下校验 token hash 与当前 session 绑定关系。
  - 收口 `session_missing`、`session_expired`、`session_revoked`、`account_disabled`、`csrf_failed` 和 `permission_denied` 的结构化错误语义。
  - 收口 credentials CORS：启用 credentials 时只允许显式 origin，preflight 支持 `X-CSRF-Token`。
  - 同步 shared contracts、API DTO、OpenAPI / generated client 与后端 focused tests。
- 本次明确不做:
  - 不实现完整前端会话过期跳转、toast 提示和 `returnUrl` 交互；由 `FE-62B` 承接。
  - 不收口 Admin browser E2E helper；由 `EX-66E` 承接。
  - 不恢复 Admin Web bearer / localStorage 兼容路径。
  - 不新增外部 API / CLI / 第三方 bearer 认证入口。
- 下游可依赖的交付边界:
  - 后端 unsafe method 在 Cookie session 下必须携带 CSRF header，否则返回 `403 / csrf_failed`。
  - `FE-62A` 可依赖固定的 `poms_csrf` cookie、`X-CSRF-Token` header、`GET /auth/csrf-token` route 和 generated client 契约。
  - `FE-62B` 可依赖认证错误 code 区分登录失效、权限不足和 CSRF 失败。
- 不允许下游依赖的留白:
  - 不允许业务 feature store 继续把认证过期统一呈现为普通列表读取失败。
  - 不允许用 `SameSite=Lax` 替代 unsafe method CSRF 校验。

## 2. 正式输入

| Input Type                | Document / Source                                  | Section / Anchor                     | Status | Notes                                                          |
| ------------------------- | -------------------------------------------------- | ------------------------------------ | ------ | -------------------------------------------------------------- |
| ADR                       | `docs/adr/017-admin-web-cookie-session-auth.md`    | 5.3 / 5.4 / 5.5 / 7.1 / 7.3          | Pass   | Cookie session 必须配套 CSRF，前端 unsafe method 发送 header。 |
| Business design           | `ex-66a-admin-web-cookie-session-auth-baseline.md` | 7 / 8 / 10                           | Pass   | 冻结 Cookie、CSRF、CORS、错误语义与验证矩阵。                  |
| Command design            | `phase2-development-execution-tracker.md`          | `EX-66D`                             | Pass   | 本片负责 CSRF、credentials CORS、错误语义和后端测试。          |
| DTO / OpenAPI design      | `ex-66a-admin-web-cookie-session-auth-baseline.md` | 4 / 5                                | Pass   | `CsrfTokenView` 和 cookie / CSRF security scheme。             |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                 | `B15` / `getCsrfToken`               | Pass   | `GET /auth/csrf-token` 已登记为 `planned`。                    |
| Data model / table freeze | `ex-66b-auth-session-store-runtime-baseline.md`    | session `csrf_token_hash`            | Pass   | 已有 session-bound CSRF hash 字段。                            |
| Existing runtime          | `ex-66c-auth-session-contract-runtime-closeout.md` | section 1 / 3                        | Pass   | 登录、当前会话和登出已 direct cutover；CSRF 强校验已明确延后。 |
| Query boundary            | `AuthController`                                   | `GET /auth/session` / profile routes | Active | 读侧保持 session bootstrap 和 profile 语义。                   |

## 3. 本次 SSOT

| Concern                     | SSOT                               | Implementation Rule                                                                             |
| --------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| Business semantics          | ADR-017 + EX-66A                   | Admin Web 使用 Cookie session；浏览器不持有 bearer token。                                      |
| Public route canonical path | `api-route-canonical-inventory.md` | `GET /auth/csrf-token` 必须按 `B15` canonical route 落地。                                      |
| Route / command naming      | EX-66A section 4                   | 使用 `getCsrfToken`，不新增 legacy alias。                                                      |
| DTO / contract naming       | Shared contracts                   | 新增 `CsrfTokenView`，字段使用 `token`、`cookieName`、`headerName`、`expiresAt`。               |
| Cookie / header naming      | EX-66A section 7                   | Cookie 固定为 `poms_session` / `poms_csrf`，header 固定为 `X-CSRF-Token`。                      |
| Date / time semantics       | EX-66A / EX-66B                    | `expiresAt` 使用 ISO datetime；session expiry 取 idle / absolute 较早时间。                     |
| Identifier semantics        | `auth_session.id`                  | CSRF 校验使用已解析 session 的服务端记录，不暴露 session id。                                   |
| Money / decimal semantics   | N/A                                | 本片不触及金额。                                                                                |
| Status machine              | EX-66B session status              | `active` 可校验；`expired` / `revoked` 映射到结构化 401。                                       |
| CORS credentials            | ADR-017 + environment schema       | credentials=true 时禁止 wildcard origin；local dev origin 必须显式配置。                        |
| Error semantics             | EX-66A section 8                   | CSRF 失败统一 `403 / csrf_failed`；认证失败继续 `401`，权限失败保持 `403 / permission_denied`。 |

## 4. 命令与接口边界

| Route / Controller                   | Command / Service             | Request DTO / Contract              | Response DTO / Contract     | Guard / Permission                     | Design Source   | Result  |
| ------------------------------------ | ----------------------------- | ----------------------------------- | --------------------------- | -------------------------------------- | --------------- | ------- |
| `GET /auth/csrf-token`               | `getCsrfToken` / CSRF refresh | N/A                                 | `CsrfTokenView`             | public + session-aware                 | EX-66A / B15    | planned |
| All unsafe protected routes          | `AuthCsrfGuard`               | `X-CSRF-Token` header               | structured error            | `SessionAuthGuard` + CSRF + permission | EX-66A          | planned |
| `POST /auth/session:logout`          | `logoutCurrentAuthSession`    | `LogoutAuthSessionRequest`          | `AuthSessionLogoutResult`   | session guard + CSRF                   | EX-66C / EX-66D | planned |
| `PATCH /auth/profile`                | `updateCurrentUserProfile`    | `UpdateCurrentUserProfileRequest`   | `SanitizedUserWithOrgUnits` | session guard + CSRF                   | EX-66A / EX-66D | planned |
| `POST /auth/sessions`                | `createPasswordAuthSession`   | `CreatePasswordAuthSessionRequest`  | `CurrentAuthSessionView`    | public + anonymous CSRF double-submit  | ADR-017         | planned |
| `POST /auth/external-login-sessions` | `createExternalLoginSession`  | `CreateExternalLoginSessionRequest` | `CurrentAuthSessionView`    | public + anonymous CSRF double-submit  | ADR-017         | planned |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /auth/csrf-token`
- Current implemented route(s): `N/A`
- Inventory status: `planned`
- Route governance source: `ADR-017` + `EX-66A` + `B15`
- Blocker / exception: none.

## 5. 读侧边界

| Query / View         | Consumer                   | Fields                                   | Filter / Sort | Permission Boundary     | Design Source | Result  |
| -------------------- | -------------------------- | ---------------------------------------- | ------------- | ----------------------- | ------------- | ------- |
| CSRF token view      | Admin API client bootstrap | token, cookieName, headerName, expiresAt | current       | public or session-aware | EX-66A        | planned |
| Current auth session | Admin bootstrap            | current session view + csrf hint         | current       | optional session cookie | EX-66C        | aligned |

## 6. 持久化边界

| Table          | Migration                          | Entity / Repository        | DDL / Freeze Source | Check Result |
| -------------- | ---------------------------------- | -------------------------- | ------------------- | ------------ |
| `auth_session` | `Migration20260513100000_ex66b...` | `AuthSession` / repository | EX-66B              | aligned      |

| Field                                     | Design Type / Meaning              | Migration / DDL         | Entity            | Shared Contract / OpenAPI                  | Result  |
| ----------------------------------------- | ---------------------------------- | ----------------------- | ----------------- | ------------------------------------------ | ------- |
| `csrf_token_hash`                         | SHA-256 hash of current CSRF token | `varchar(128)` nullable | `string` nullable | raw token only in `CsrfTokenView` / cookie | aligned |
| `idle_expires_at` / `absolute_expires_at` | CSRF response expiry source        | `timestamptz`           | `Date`            | ISO datetime                               | aligned |

## 7. 一致性结论

- Document -> code: EX-66A / ADR-017 冻结规则，本片实现对应 guard、route、CORS 和契约。
- ADR-015 inventory -> route: `GET /auth/csrf-token` 已在 `B15` 登记，实施后回写为 `aligned`。
- Migration -> entity: 复用 EX-66B `auth_session.csrf_token_hash`，不新增 migration。
- Entity -> contract: raw CSRF token 只通过 response / readable cookie 发放，不落库。
- Route -> command: `AuthController.getCsrfToken` 调用 session service 刷新或发放 token。
- Query -> view: `CsrfTokenView` 字段与 shared contract / API DTO / OpenAPI 一致。
- Guard / permission: `SessionAuthGuard` 解析 session；`AuthCsrfGuard` 负责 unsafe method；`PermissionsGuard` 继续授权。
- OpenAPI / generated client: 新增 response model 和 route；OpenAPI 增加 `pomsCsrf` header security scheme。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                          | Result       | Gap / Reason                                                         |
| -------------------------------- | -------- | --------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| API lint                         | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                            | Planned      | Runtime guard/controller changes.                                    |
| API build                        | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                           | Planned      | Runtime + contract changes.                                          |
| Unit tests                       | Yes      | focused auth session / CSRF guard / controller specs                        | Planned      | Cover success, missing, mismatch and expired session paths.          |
| API full tests                   | Yes      | `corepack pnpm nx test poms-api --skip-nx-cache`                            | Planned      | Global guard can affect many routes.                                 |
| E2E                              | Decision | API helper / Admin browser E2E final sweep in `EX-66E`                      | Deferred     | This slice focuses backend runtime; helper closeout remains tracked. |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi`, `shared-api-client:generate`, `shared-api-client:check` | Planned      | New public route and model.                                          |
| Migration / schema check         | No       | N/A                                                                         | Not required | No DDL change.                                                       |
| Markdown                         | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                     | Planned      | Baseline + tracker edits.                                            |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                     |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No G1 exception accepted. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-14`
- Conditions:
  - 实施必须先保证 `GET /auth/csrf-token` 与 `B15` inventory 对齐。
  - CSRF guard 必须在 `PermissionsGuard` 前完成 unsafe method 拒绝，避免业务层误报。
  - 若 OpenAPI / generated client 出现 diff，按预期契约变更解释并回写 G3 evidence。
