# EX-66C 登录、外部登录与当前会话契约 Direct Cutover G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-13`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `api contract + auth runtime`
- Tracker Row: `EX-66C`
- Baseline: `docs/design/ex-66c-auth-session-contract-runtime-baseline.md`
- Upstream Runtime: `docs/design/ex-66b-auth-session-store-runtime-closeout.md`

## 1. 交付范围

1. `AuthController` 已移除 `POST /auth/login`，账号密码登录改为 `POST /auth/sessions` 并创建服务端 `auth_session`。
2. 飞书外部登录 ticket exchange 改为创建本地 session cookie，响应统一为 `CurrentAuthSessionView`，不再返回 `accessToken`。
3. 新增 `GET /auth/session` 当前会话 bootstrap 与 `POST /auth/session:logout` 登出撤销，成功和清理路径都通过 `AuthSessionCookieService` 写入 / 清除 `poms_session` 与 `poms_csrf`。
4. `AuthModule` 全局 APP_GUARD 已从旧 JWT guard 切换为 `SessionAuthGuard`，`PermissionsGuard` 继续消费 `req.user`。
5. shared contracts、API DTO、OpenAPI、generated client 已删除 `LoginRequest` / `LoginResponse` / `authControllerLogin` 生成面，新增 session request / view / logout result 模型。
6. 所有 protected controller 的 Swagger auth 注解已从 bearer 收口为 `ApiCookieAuth('pomsSession')`，OpenAPI security scheme 只保留 `poms_session` cookie。
7. Admin AuthStore 最小调用方已切到 Cookie session：不再读写 `localStorage.poms_access_token`，登录 / 外部登录消费 session view，初始化通过 `GET /auth/session` bootstrap，API client 默认 `withCredentials: true`。
8. API E2E helper 已改为从 `Set-Cookie` 提取 Cookie header，平台治理 E2E 的失败登录与 invalid session 安全事件断言同步到新 route / event。

## 2. 一致性结论

| Edge                      | Result | Evidence                                                                                               |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| Auth route contract       | Pass   | `POST /auth/sessions`、`GET /auth/session`、`POST /auth/session:logout` 已进入 OpenAPI / client。      |
| Legacy token response     | Pass   | `LoginResponse`、`LoginRequest`、`authControllerLogin` 已从 shared contracts / generated client 清退。 |
| Cookie security scheme    | Pass   | OpenAPI protected routes 使用 `pomsSession`，generated client 不再注入 `Authorization: Bearer`。       |
| Runtime guard             | Pass   | 全局 guard 使用 `SessionAuthGuard`，旧 JWT guard / strategy runtime 文件与 specs 已删除。              |
| Admin minimal integration | Pass   | `AuthStore` 认证态以 current session / current user 为准，API client 使用 credentials。                |
| Deferred CSRF enforcement | Pass   | 本片只发放 CSRF hint / cookie；unsafe method token 校验留给 `EX-66D`。                                 |

## 3. Drift / Exception 处理

| ID                                    | Classification          | Resolution                                                                                                                         |
| ------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `EX66C-D1-AUTHSTORE-MINIMAL-PULL-IN`  | `scope-adjustment`      | generated client 删除旧登录 API 后，Admin AuthStore 必须同片最小切换以保持仓库可编译；CSRF header 与过期 UX 仍归 `EX-66D/FE-62B`。 |
| `EX66C-D2-SWAGGER-AUTH-FULL-SWEEP`    | `scope-tightening`      | 不保留部分 `ApiBearerAuth` 延后清理，改为同片全量切到 `ApiCookieAuth('pomsSession')`，避免 OpenAPI 混合认证语义。                  |
| `EX66C-D3-ADMIN-E2E-BROWSER-DEFERRED` | `expected-design-scope` | Playwright Admin 浏览器 E2E 中仍有 localStorage token helper，按 `EX-66E` 做最终浏览器链路收口。                                   |
| `EX66C-D4-CSRF-VALIDATION-DEFERRED`   | `expected-design-scope` | 当前 unsafe methods 仍未强校验 `X-CSRF-Token`；`EX-66D` 负责 guard / error / credentials CORS 收口。                               |

## 4. 验证结果

| Check                  | Command                                                                                                                                                                                    | Result                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| API focused tests      | `corepack pnpm nx test poms-api --runTestsByPath src/app/core/auth/auth.controller.spec.ts src/app/core/auth/guards/session-auth.guard.spec.ts --skip-nx-cache`                            | Pass, 2 suites / 11 tests   |
| API full tests         | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                           | Pass, 63 suites / 683 tests |
| Admin AuthStore tests  | `corepack pnpm nx test poms-admin --runTestsByPath src/app/core/auth/auth.store.spec.ts --skip-nx-cache`                                                                                   | Pass, 43 suites / 253 tests |
| API lint               | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                           | Pass                        |
| Admin lint             | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                                                         | Pass                        |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                          | Pass                        |
| Admin build            | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                        | Pass                        |
| OpenAPI / client check | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`; `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`; `corepack pnpm nx run shared-api-client:check --skip-nx-cache` | Pass                        |
| Markdown / diff sanity | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                     | Pass                        |

## 5. G4 结论

- `EX-66C`: `Done / G4`
- `EX-66` parent remains `Doing`.
- `EX-66D` can now add unsafe method CSRF validation, credentials CORS hardening and final auth error semantics on top of the Cookie session runtime.
- `FE-62A/B` and `EX-66E` should finish frontend CSRF header attachment, expired-session UX and Admin browser E2E helper cleanup.
