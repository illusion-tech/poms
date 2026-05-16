# FE-62B 会话过期、登出与登录页重新登录引导 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-14`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Tracker Row: `FE-62B`
- Baseline: `docs/design/fe-62b-session-expired-ux-baseline.md`

## 1. 交付范围

1. 新增 shared auth returnUrl helper，统一拒绝外部 URL、协议相对 URL 和非 `/` 开头路径。
2. 新增 auth session expired helpers，识别结构化 `401` code：
   - `session_missing`
   - `session_expired`
   - `session_revoked`
   - `account_disabled`
3. 新增全局 `authSessionExpiredInterceptor`，业务 API 返回上述认证失效错误时：
   - 清理 `AuthStore` 本地聚合状态和 CSRF token。
   - 跳转 `/auth/login` 并携带 safe `returnUrl` 与 `reason`。
   - 已在 `/auth/*` 页面时避免重复跳转。
   - 不拦截 `invalid_credentials`、`permission_denied` 或普通业务错误。
4. 登录页根据 `reason` query param 显示明确中文提示，AFK 后不再只停留在业务页普通读取失败反馈。
5. `providePomsApiClient` 支持 app 侧追加 HTTP interceptors，`poms-admin` 在 CSRF interceptor 后注册认证失效 interceptor。

## 2. 一致性结论

| Edge                          | Result | Evidence                                                                                                 |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| EX-66A/D error semantics      | Pass   | 前端只识别已冻结的 session/auth account 结构化 code，不把 `invalid_credentials` 当登录失效。             |
| AuthStore local state cleanup | Pass   | `clearSessionState()` 已公开给 interceptor 复用；不调用 logout 写侧，避免认证失效时再发 unsafe request。 |
| ReturnUrl safety              | Pass   | `sanitizeAuthReturnUrl` 覆盖内部路径、外部 URL、协议相对 URL、非斜杠路径和空值。                         |
| Login page UX                 | Pass   | 登录页展示 `session_expired` 等有限 reason 的中文提示。                                                  |
| Route / OpenAPI / migration   | Pass   | 本片未改后端 route、OpenAPI、generated client 或 migration。                                             |

## 3. Drift / Exception 处理

| ID                                     | Classification          | Resolution                                                                                                                |
| -------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `FE62B-D1-E2E-HELPER-DEFERRED`         | `expected-design-scope` | Playwright / browser E2E helper 旧 token fixture 仍按 `EX-66E` 收口；本片已完成前端 runtime UX 和 focused unit coverage。 |
| `FE62B-D2-PAGE-LOCAL-ERRORS-REMAINING` | `scope-boundary`        | 业务页面局部 401 文案可逐步删除，但全局 interceptor 已保证真实 session 失效会跳登录页，不再依赖页面级手工分支。           |

## 4. 验证结果

| Check                  | Command / Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Result                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Focused Admin tests    | `corepack pnpm exec jest -c apps/poms-admin/jest.config.ts --runTestsByPath apps/poms-admin/src/app/core/auth/auth-return-url.spec.ts apps/poms-admin/src/app/core/auth/auth-session-expired.spec.ts apps/poms-admin/src/app/core/auth/auth-session-expired.interceptor.spec.ts apps/poms-admin/src/app/features/auth/login.spec.ts apps/poms-admin/src/app/core/auth/auth.store.spec.ts apps/poms-admin/src/app/core/auth/poms-csrf.interceptor.spec.ts --runInBand` | Pass, 6 suites / 24 tests   |
| Full Admin tests       | `corepack pnpm nx test poms-admin --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                    | Pass, 47 suites / 269 tests |
| Admin lint             | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                    | Pass                        |
| Admin data-access lint | `corepack pnpm nx lint admin-data-access --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                             | Pass                        |
| Admin build            | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                   | Pass                        |
| Markdown / diff sanity | `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                                                                                                                                                                                                                                                               | Pass                        |

## 5. G4 结论

- `FE-62B`: `Done / G4`
- `FE-62` parent is complete from frontend runtime perspective; `EX-66E` still owns browser E2E helper and final direct-cutover validation.
- Next recommended slice: `EX-66E` Cookie session direct cutover closeout validation, E2E helper cleanup and final docs writeback.
