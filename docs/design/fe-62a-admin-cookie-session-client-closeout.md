# FE-62A AuthStore 与 API client Cookie credentials / CSRF 切换 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-14`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Tracker Row: `FE-62A`
- Baseline: `docs/design/fe-62a-admin-cookie-session-client-baseline.md`

## 1. 交付范围

1. 新增 `FE-62A` G1 baseline，冻结 Admin Web 前端 Cookie session hardening 范围。
2. 补强 `AuthStore` focused tests：
   - 账号密码登录先 bootstrap CSRF，再创建 Cookie session，并验证不写入 `localStorage.poms_access_token`。
   - 初始化从 `GET /auth/session` 建立当前用户状态，不再通过旧 token profile fallback 建立认证态。
   - 匿名 session bootstrap 会清空当前用户、导航、待办和内存 CSRF token。
   - profile update 先刷新 CSRF token，再调用 `PATCH /auth/profile`。
   - logout 调用 `POST /auth/session:logout` 后清空前端聚合状态。
3. 新增 `pomsCsrfInterceptor` focused tests，覆盖 unsafe method header attachment、`poms_csrf` cookie fallback、safe method 跳过和显式 header 不覆盖。
4. 扫描 Admin Web runtime 确认 `apps/poms-admin` 与 `libs/admin/data-access` 中不再保留 `localStorage.poms_access_token`、browser bearer header、旧登录响应或 `authControllerLogin` 运行时引用。

## 2. 一致性结论

| Edge                        | Result | Evidence                                                                                              |
| --------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| ADR-017 / EX-66C/D -> Admin | Pass   | `AuthStore` 认证态继续从 `CurrentAuthSessionView` 建立，不消费浏览器 access token。                   |
| API client credentials      | Pass   | `providePomsApiClient` 已固定 `withCredentials: true`；本片通过 lint/build 和 runtime scan 确认。     |
| CSRF header attachment      | Pass   | `pomsCsrfInterceptor` focused tests 覆盖内存 token、cookie fallback、safe method 和 explicit header。 |
| Auth aggregate state        | Pass   | `AuthStore` tests 覆盖登录、初始化、匿名清空、profile update 和 logout。                              |
| Route / OpenAPI / migration | Pass   | 本片不改后端 route、OpenAPI、generated client 或 migration。                                          |

## 3. Drift / Exception 处理

| ID                                     | Classification          | Resolution                                                                                                                     |
| -------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `FE62A-D1-CSRF-RUNTIME-PRE-PULLED`     | `scope-adjustment`      | `EX-66D` 为避免后端 CSRF guard 切断 Admin Web，已提前拉入最小 CSRF token store / interceptor；本片补齐 G1、tests 和 closeout。 |
| `FE62A-D2-BROWSER-E2E-HELPER-DEFERRED` | `expected-design-scope` | Playwright / browser E2E helper 旧 token fixture 仍按 `EX-66E` 收口；本片只关闭 Admin Web runtime 和 focused unit coverage。   |

## 4. 验证结果

| Check                  | Command / Evidence                                                                                                                                                                                            | Result                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Focused Admin tests    | `corepack pnpm exec jest -c apps/poms-admin/jest.config.ts --runTestsByPath apps/poms-admin/src/app/core/auth/auth.store.spec.ts apps/poms-admin/src/app/core/auth/poms-csrf.interceptor.spec.ts --runInBand` | Pass, 2 suites / 13 tests   |
| Full Admin tests       | `corepack pnpm nx test poms-admin --skip-nx-cache`                                                                                                                                                            | Pass, 44 suites / 261 tests |
| Admin lint             | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                                                                            | Pass                        |
| Admin data-access lint | `corepack pnpm nx lint admin-data-access --skip-nx-cache`                                                                                                                                                     | Pass                        |
| Admin build            | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                           | Pass                        |
| Runtime token scan     | `rg -n <token/bearer runtime patterns> apps\poms-admin libs\admin\data-access -g "!*.spec.ts"`                                                                                                                | Pass, no runtime matches    |
| Markdown / diff sanity | `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                       | Pass                        |

Runtime token scan patterns: `poms_access_token`, `authControllerLogin`, `LoginResponse`, `Authorization:`, `Bearer`.

## 5. G4 结论

- `FE-62A`: `Done / G4`
- `FE-62` parent remains `Doing`.
- Next recommended slice: `FE-62B` session expired / unauthorized UX, so long AFK failures route users back to login with a clear reason and safe `returnUrl`.
