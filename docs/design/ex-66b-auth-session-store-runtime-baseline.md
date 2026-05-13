# EX-66B Auth Session Store、Cookie lifecycle 与 Session Guard 运行时实施基线包

- Gate Status: `Pass`
- Parent: `EX-66`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk / persistence + auth infrastructure`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-13`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-66B`
- Upstream Baseline: `docs/design/ex-66a-admin-web-cookie-session-auth-baseline.md`

## 1. 范围

- 本次目标:
  - 新增 `auth_session` 表、MikroORM entity、repository 和 migration。
  - 新增 session token / CSRF token hash、idle timeout、absolute timeout、revoke、expire、last seen 刷新能力。
  - 新增 Cookie lifecycle helper，统一生成 `poms_session` / `poms_csrf` 的 set / clear header。
  - 新增 `SessionAuthGuard` 类，可从 Cookie 解析 session 并写入 `req.user`。
  - 补 focused tests 覆盖 session 创建 / 解析 / 过期 / 撤销、Cookie header 和 guard security event。
- 本次明确不做:
  - 不替换全局 `JwtAuthGuard`；全局切换由 `EX-66C` 在登录契约 direct cutover 时完成。
  - 不新增 `POST /auth/sessions`、`GET /auth/session`、logout 或 CSRF public controller。
  - 不改 `LoginResponse`、OpenAPI、generated client 或 Admin Web `AuthStore`。
  - 不实现完整 CSRF guard；`EX-66D` 承接 unsafe method 校验。
- 下游可依赖的交付边界:
  - `EX-66C` 可复用 `AuthSessionService` 创建账号密码 / 外部登录 session，并在完成后启用 session guard。
  - `EX-66D` 可复用 `csrfTokenHash`、`AuthSessionCookieService` 和 guard 错误语义实现 CSRF 校验。
  - `FE-62A/B` 可等待 `EX-66C/D` 暴露 public routes 后接入 Cookie credentials。

## 2. 正式输入

| Input Type              | Document / Source                                  | Section / Anchor             | Status | Notes                                               |
| ----------------------- | -------------------------------------------------- | ---------------------------- | ------ | --------------------------------------------------- |
| Architecture ADR        | `../adr/017-admin-web-cookie-session-auth.md`      | Decision / Detailed Rules    | Pass   | Admin Web 目标态为 opaque server session。          |
| Upstream G1             | `ex-66a-admin-web-cookie-session-auth-baseline.md` | sections 6 / 7 / 8           | Pass   | 表、Cookie、CSRF 和错误语义已冻结。                 |
| Tracker                 | `phase2-development-execution-tracker.md`          | `EX-66B`                     | Pass   | 本片负责 session store、Cookie lifecycle 和 guard。 |
| Existing runtime        | `AuthModule`, `JwtAuthGuard`, `PermissionsGuard`   | current auth stack           | Active | 本片新增基础设施，但不替换 APP_GUARD。              |
| Existing platform facts | `PlatformService.resolveActiveAuthUser`            | user / permission resolution | Pass   | session guard 必须从平台事实源构造 `UserPayload`。  |

## 3. 本次 SSOT

| Concern                | SSOT                       | Implementation Rule                                                               |
| ---------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| Session table          | `EX-66A` section 6         | `auth_session` 按冻结字段落地，token / CSRF 只存 hash。                           |
| Token generation       | `AuthSessionService`       | 生成 256-bit random opaque token，SHA-256 hash 后持久化。                         |
| Cookie header          | `AuthSessionCookieService` | 使用 `poms_session` / `poms_csrf`、`Path=/api`、`SameSite=Lax` 和生产 `Secure`。  |
| Guard behavior         | `SessionAuthGuard`         | 尊重 `@Public()`，成功时设置 `req.user`，失败时抛结构化 `UnauthorizedException`。 |
| Authorization input    | `PlatformService`          | 不信任 session 内缓存权限；解析时重新读取 active user permissions。               |
| Compatibility boundary | `EX-66A` + tracker         | 本片不激活全局 guard，避免在 `EX-66C` 前破坏现有 bearer routes。                  |

## 4. 持久化边界

| Table          | Migration Slice | Entity / Repository                     | DDL / Freeze Source | Result      |
| -------------- | --------------- | --------------------------------------- | ------------------- | ----------- |
| `auth_session` | `EX-66B`        | `AuthSession` / `AuthSessionRepository` | `EX-66A`            | implemented |

## 5. 验证矩阵

| Check                    | Required | Command / Evidence                                                                                                                                                                                                         | Result | Gap / Reason                                    |
| ------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| API focused tests        | Yes      | `corepack pnpm nx test poms-api --runTestsByPath src/app/core/auth/auth-session.service.spec.ts src/app/core/auth/auth-session-cookie.service.spec.ts src/app/core/auth/guards/session-auth.guard.spec.ts --skip-nx-cache` | Pass   | 3 suites / 12 tests passed.                     |
| API full tests           | Yes      | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                           | Pass   | 65 suites / 684 tests passed.                   |
| API lint                 | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                           | Pass   | All files pass linting.                         |
| API build                | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                          | Pass   | `shared-contracts` and `poms-api` build passed. |
| Migration / schema check | Yes      | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                            | Pass   | Schema is up-to-date.                           |
| Markdown / diff sanity   | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                    | Pass   | Markdown tables and diff sanity passed.         |

## 6. G1 结论

- Verdict: `Pass`
- `EX-66B` may implement the backend session foundation.
- It must not activate the global session guard or change Admin Web login response; those are `EX-66C` responsibilities.
