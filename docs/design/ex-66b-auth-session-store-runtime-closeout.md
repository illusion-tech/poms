# EX-66B Session Store、Cookie Lifecycle 与 Session Guard 后端基础 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-13`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `persistence + auth infrastructure`
- Tracker Row: `EX-66B`
- Baseline: `docs/design/ex-66b-auth-session-store-runtime-baseline.md`
- Upstream Baseline: `docs/design/ex-66a-admin-web-cookie-session-auth-baseline.md`

## 1. 交付范围

1. 新增 `auth_session` 表、MikroORM entity、repository 和 direct cutover migration。
2. `AuthSessionService` 支持 opaque session token / CSRF token 生成、SHA-256 hash 持久化、idle timeout、absolute timeout、last seen throttle、expire 和 revoke。
3. `AuthSessionCookieService` 统一生成与清理 `poms_session` / `poms_csrf` Cookie header，固定 `Path=/api`、`SameSite=Lax` 和生产 `Secure` 默认。
4. 新增 `SessionAuthGuard`，支持从 Cookie 解析 session、重新读取 active user permission fact、写入 `req.user`，并对失效 session 写入安全事件。
5. `AuthModule` 已注册 session entity / repository / service / cookie helper / guard，但本片不替换全局 `JwtAuthGuard`。
6. 环境配置新增 session idle / absolute timeout、last seen throttle、Cookie path 与 secure override。

本片不新增或切换 public auth routes，不修改 `LoginResponse`、OpenAPI、generated client 或 Admin Web `AuthStore`；登录契约 direct cutover 由 `EX-66C` 承接，unsafe method CSRF guard 由 `EX-66D` 承接。

## 2. 一致性结论

| Edge                      | Result | Evidence                                                                                      |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Baseline -> persistence   | Pass   | `auth_session` 字段、索引、check、FK 和 comments 按 `EX-66A` / `EX-66B` baseline 落地。       |
| Session token handling    | Pass   | 运行时只返回 raw opaque token；数据库只保存 SHA-256 hash，不保存 bearer JWT 或明文 token。    |
| Cookie lifecycle          | Pass   | session Cookie 为 HttpOnly；CSRF Cookie 可读但与 session hash 绑定，后续由 `EX-66D` 校验。    |
| Guard behavior            | Pass   | guard 尊重 `@Public()`，成功写入 `req.user`，失败返回结构化认证错误并记录 session invalid。   |
| Global auth activation    | Pass   | `JwtAuthGuard` 仍为当前 APP_GUARD；本片只提供可复用 session guard，避免提前破坏当前登录链路。 |
| Migration -> entity -> DB | Pass   | `migration-up` 已应用，`migration-check` 显示 schema is up-to-date。                          |

## 3. Drift / Exception 处理

| ID                                        | Classification          | Resolution                                                                                                       |
| ----------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `EX66B-D1-CHECK-CONSTRAINT-NORMALIZATION` | `implementation-detail` | `revoked_reason` check 使用 PostgreSQL 回读的 `ANY (ARRAY...)` 规范表达式，避免 `migration-check` 反复误报漂移。 |
| `EX66B-D2-GLOBAL-GUARD-NOT-ACTIVATED`     | `expected-design-scope` | 本片不把 `SessionAuthGuard` 注册为 APP_GUARD；全局认证切换和登录响应 direct cutover 属于 `EX-66C`。              |
| `EX66B-D3-CSRF-VALIDATION-DEFERRED`       | `expected-design-scope` | 本片生成并存储 session-bound CSRF token；unsafe method 强校验由 `EX-66D` 落地。                                  |

## 4. 验证结果

| Check                  | Command                                                                                                                                                                                                                    | Result                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| API focused tests      | `corepack pnpm nx test poms-api --runTestsByPath src/app/core/auth/auth-session.service.spec.ts src/app/core/auth/auth-session-cookie.service.spec.ts src/app/core/auth/guards/session-auth.guard.spec.ts --skip-nx-cache` | Pass, 3 suites / 12 tests   |
| API full tests         | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                           | Pass, 65 suites / 684 tests |
| API lint               | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                           | Pass                        |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                          | Pass                        |
| Migration apply        | `corepack pnpm nx run poms-api:migration-up --skip-nx-cache`                                                                                                                                                               | Pass                        |
| Migration drift        | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                            | Pass, schema is up-to-date  |
| Markdown / diff sanity | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                     | Pass                        |

## 5. G4 结论

- `EX-66B`: `Done / G4`
- `EX-66` parent remains `Doing`.
- `EX-66C` can now consume `AuthSessionService` and `AuthSessionCookieService` to switch 账号密码登录、飞书外部登录 ticket exchange、current session 和 logout contracts to Cookie session direct cutover.
