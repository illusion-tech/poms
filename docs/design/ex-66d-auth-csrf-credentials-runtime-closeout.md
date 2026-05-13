# EX-66D CSRF 防护、credentials CORS 与认证错误语义 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-14`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `api-command` / `auth-runtime`
- Tracker Row: `EX-66D`
- Baseline: `docs/design/ex-66d-auth-csrf-credentials-runtime-baseline.md`

## 1. 交付范围

1. 新增 `GET /auth/csrf-token`，支持匿名登录前 CSRF bootstrap 与已认证 session-bound CSRF token refresh。
2. 新增 `AuthCsrfGuard` 全局 guard，覆盖 unsafe methods (`POST` / `PUT` / `PATCH` / `DELETE`)；先校验 `X-CSRF-Token` 与 `poms_csrf` double-submit，再对已认证 session 校验 `csrf_token_hash` 绑定。
3. `SessionAuthGuard` 将已解析 session 写入 request，供 CSRF guard 复用，避免再次信任浏览器输入。
4. 结构化错误语义补齐 `statusCode + code + message`：`session_missing`、`session_expired`、`session_revoked`、`account_disabled`、`csrf_failed`、`permission_denied`。
5. credentials CORS 收口为显式 origin 列表，启用 credentials 时禁止 wildcard origin，并允许 `X-CSRF-Token` preflight。
6. OpenAPI 增加 `pomsCsrf` header security scheme 和 `CsrfTokenView`，generated client 增加 `authControllerGetCsrfToken`。
7. Admin data-access 增加最小 `PomsCsrfTokenStore` 与 HTTP interceptor：登录前获取匿名 CSRF token，登录后刷新 session-bound CSRF token，并为 unsafe API calls 自动附加 `X-CSRF-Token`。
8. API E2E helper 改为先 bootstrap CSRF，再使用 Cookie + header 进行账号密码登录和后续写操作。

## 2. 一致性结论

| Edge                       | Result | Evidence                                                                                                     |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| ADR-017 / EX-66A -> code   | Pass   | Cookie session unsafe methods 不再只依赖 `SameSite=Lax`，新增 CSRF token endpoint + guard。                  |
| Route inventory -> route   | Pass   | `GET /auth/csrf-token` 已落地并在 `api-route-canonical-inventory.md` 从 `planned` 回写为 `aligned`。         |
| Entity -> contract         | Pass   | raw CSRF token 只通过 `CsrfTokenView` / readable cookie 发放；`auth_session.csrf_token_hash` 继续只存 hash。 |
| Guard ordering             | Pass   | `SessionAuthGuard` -> `AuthCsrfGuard` -> `PermissionsGuard`；CSRF 拒绝先于业务授权。                         |
| CORS credentials           | Pass   | `main.ts` 显式解析 `CORS_ORIGIN`，credentials=true 时不允许 `*`。                                            |
| OpenAPI / generated client | Pass   | `poms-api:openapi`、`shared-api-client:generate`、`shared-api-client:check` 已通过。                         |
| Admin minimal integration  | Pass   | `AuthStore` 和 `pomsCsrfInterceptor` 已保证当前登录 / 外部登录 / profile update 不会因 CSRF guard 立即断链。 |

## 3. Drift / Exception 处理

| ID                                     | Classification            | Resolution                                                                                                                                                     |
| -------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX66D-D1-FE-CSRF-MINIMAL-PULL-IN`     | `scope-adjustment`        | 后端强制 CSRF 后，Admin 必须同片具备最小 token bootstrap / header attachment 才能保持运行时可用；完整 session-expired UX 仍归 `FE-62B`。                       |
| `EX66D-D2-E2E-HELPER-CSRF-PULL-IN`     | `scope-adjustment`        | API E2E helper 同步增加 CSRF bootstrap，避免后端 guard 导致所有写侧 E2E 失真；浏览器 E2E helper 最终收口仍归 `EX-66E`。                                        |
| `EX66D-D3-NX-E2E-FULL-UNRELATED-DRIFT` | `existing-baseline-drift` | `nx e2e poms-api-e2e --runTestsByPath ...` 实际触发全套 E2E，剩余失败为版本冲突错误文案大小写断言 drift；受影响的 `platform-governance` 直接 Jest 路径已通过。 |

## 4. 验证结果

| Check                  | Command / Evidence                                                                                                                                                                                                                                                                                                 | Result                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| API focused tests      | `corepack pnpm nx test poms-api --runTestsByPath src/app/core/auth/auth-session.service.spec.ts src/app/core/auth/auth.controller.spec.ts src/app/core/auth/guards/session-auth.guard.spec.ts src/app/core/auth/guards/auth-csrf.guard.spec.ts src/app/core/auth/guards/permissions.guard.spec.ts --skip-nx-cache` | Pass, 5 suites / 29 tests   |
| API full tests         | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                   | Pass, 64 suites / 692 tests |
| API lint               | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                   | Pass                        |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                  | Pass                        |
| Admin AuthStore tests  | `corepack pnpm nx test poms-admin --runTestsByPath src/app/core/auth/auth.store.spec.ts --skip-nx-cache`                                                                                                                                                                                                           | Pass, 43 suites / 253 tests |
| Admin lint / build     | `corepack pnpm nx lint poms-admin --skip-nx-cache`; `corepack pnpm nx build poms-admin --skip-nx-cache`; `corepack pnpm nx lint admin-data-access --skip-nx-cache`                                                                                                                                                 | Pass                        |
| OpenAPI / client check | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`; `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`; `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                                                                                         | Pass                        |
| Focused API E2E        | `corepack pnpm exec jest -c apps/poms-api-e2e/jest.config.ts --runTestsByPath apps/poms-api-e2e/src/poms-api/platform-governance.e2e-spec.ts --runInBand`                                                                                                                                                          | Pass, 1 suite / 14 tests    |
| Markdown / diff sanity | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                                                                             | Planned final check         |

## 5. G4 结论

- `EX-66D`: `Done / G4`
- `EX-66` parent remains `Doing`.
- `FE-62A` remains open for fuller frontend Cookie session hardening, but its CSRF header substrate has been pulled into this slice as a runtime safety prerequisite.
- Next recommended slice: `FE-62A` frontend Cookie session hardening closeout, then `FE-62B` session-expired / unauthorized UX so AFK 401 no longer appears as ordinary business-list failure.
