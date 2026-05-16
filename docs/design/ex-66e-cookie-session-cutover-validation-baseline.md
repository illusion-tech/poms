# EX-66E Cookie 会话 direct cutover 收口验证 G1 Baseline

- Gate Status: `Pass`
- Parent: `EX-66`
- Owner: `Codex`
- Slice Type: `cross-layer-validation` / `e2e-helper` / `docs-closeout`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-16`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-66E`

## 1. 范围

- 本次目标:
  - 更新 Admin browser E2E 登录 helper 和 API helper，不再读取 `localStorage.poms_access_token`，不再发送 `Authorization: Bearer`。
  - 统一 browser E2E 的认证前置为 `GET /auth/csrf-token` -> `POST /auth/sessions` -> Cookie session。
  - 验证账号密码登录、外部登录 callback session exchange、CSRF header、会话缺失 / 过期跳转、登出、权限不足和核心业务 smoke。
  - 回写 route inventory、ADR 实施结果、tracker、进度板和 `EX-66` parent closeout 结论。
- 本次明确不做:
  - 不恢复 `POST /auth/login`、`LoginResponse.accessToken`、浏览器 bearer 或 localStorage token 兼容。
  - 不修改后端 session / CSRF 运行时契约，除非验证发现真实漂移并创建 corrective checkpoint。
  - 不新增外部 API / CLI bearer 认证方案；这类方案未来必须另建 ADR / route inventory。
- 下游可依赖的交付边界:
  - Admin Web browser E2E 与 API E2E 的认证 helper 均以 Cookie session 为唯一基线。
  - `EX-66` parent 可基于本片验证结果进入 G4，或明确记录剩余异常。

## 2. 正式输入

| Input Type          | Document / Source                                  | Section / Anchor   | Status | Notes                                                                    |
| ------------------- | -------------------------------------------------- | ------------------ | ------ | ------------------------------------------------------------------------ |
| ADR                 | `docs/adr/017-admin-web-cookie-session-auth.md`    | Accepted           | Pass   | Admin Web 目标态为 `HttpOnly Cookie + opaque session + CSRF`。           |
| Business baseline   | `ex-66a-admin-web-cookie-session-auth-baseline.md` | section 7 / 8 / 10 | Pass   | 冻结 Cookie、CSRF、错误语义、验证矩阵和 direct cutover 边界。            |
| Runtime closeout    | `ex-66c-auth-session-contract-runtime-closeout.md` | section 3 / 5      | Pass   | 登录 / 当前会话 / 外部登录已改为 Cookie session。                        |
| Runtime closeout    | `ex-66d-auth-csrf-credentials-runtime-closeout.md` | section 1 / 4      | Pass   | CSRF route、guard、credentials CORS 和结构化错误已落地。                 |
| Frontend closeout   | `fe-62a-admin-cookie-session-client-closeout.md`   | section 1 / 4      | Pass   | Admin runtime 清退旧 token；browser E2E helper 留给本片。                |
| Frontend closeout   | `fe-62b-session-expired-ux-closeout.md`            | section 1 / 5      | Pass   | 会话失效 UX 已落地；browser matrix 留给本片。                            |
| Command design      | `phase2-development-execution-tracker.md`          | `EX-66E`           | Pass   | 本片负责最终 E2E helper、验证矩阵和文档回写。                            |
| Route inventory     | `api-route-canonical-inventory.md`                 | `B15`              | Pass   | Auth session direct cutover routes 已登记；本片只验证 / 回写状态。       |
| Current implemented | `apps/poms-admin-e2e`                              | token scan         | Active | 仍有旧 `localStorage.poms_access_token` 和 bearer helper，需要本片清退。 |

## 3. 本次 SSOT

| Concern               | SSOT                               | Implementation Rule                                                                     |
| --------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| Browser auth state    | ADR-017 + EX-66A                   | Browser only stores `poms_session` HttpOnly cookie and readable `poms_csrf` token.      |
| API helper auth       | EX-66D + API E2E helper pattern    | Unsafe method must carry `X-CSRF-Token`; protected reads rely on session cookie.        |
| Login route           | `POST /api/auth/sessions`          | E2E must not call removed `POST /api/auth/login`.                                       |
| Current session route | `GET /api/auth/session`            | Used to confirm login completion when URL transition is temporarily delayed.            |
| Error semantics       | EX-66D + FE-62B                    | `session_missing` / `session_expired` redirect to login; `permission_denied` stays 403. |
| Public route grammar  | `api-route-canonical-inventory.md` | 本片不新增 route；如发现 route drift，先记录 corrective checkpoint。                    |

## 4. 现状扫描

| File                                                        | Drift Pattern                                                     | Planned Resolution                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| `apps/poms-admin-e2e/src/support/auth.ts`                   | login helper fallback reads `localStorage.poms_access_token`      | Replace with `GET /api/auth/session` check.     |
| `apps/poms-admin-e2e/src/external-login.mocked.spec.ts`     | mocked external session returns `accessToken`; asserts token save | Return `CurrentAuthSessionView`; assert no JWT. |
| `apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts`   | helper calls `/api/auth/login` and sends bearer                   | Use cookie session API helper.                  |
| `apps/poms-admin-e2e/src/platform-governance.smoke.spec.ts` | profile / security-event setup reads tokens and sends bearer      | Use current cookie context and CSRF header.     |

## 5. 接口边界

| Route / Controller                       | Use In This Slice                 | Auth / CSRF Boundary                    | Expected Result |
| ---------------------------------------- | --------------------------------- | --------------------------------------- | --------------- |
| `GET /api/auth/csrf-token`               | Browser API helper bootstrap      | Anonymous or session-aware              | 200 + token     |
| `POST /api/auth/sessions`                | Browser API helper login          | Requires `X-CSRF-Token` double submit   | 200 + cookies   |
| `POST /api/auth/external-login-sessions` | Mocked external login callback    | Requires `X-CSRF-Token` in runtime path | session view    |
| `GET /api/auth/session`                  | Login completion fallback         | Cookie session                          | current session |
| `GET /api/auth/profile`                  | E2E setup / restore               | Cookie session                          | profile view    |
| `PATCH /api/auth/profile`                | E2E restore                       | Cookie session + CSRF                   | profile view    |
| `GET /api/security-events`               | Permission denied audit assertion | Admin cookie session                    | event list      |

## 6. 一致性结论

- Document -> code: 前序 closeout 已把运行时切到 Cookie session，本片只清理 E2E helper 的旧 token 假设。
- Route inventory -> route: 本片不新增 route；`B15` 状态只在 G3/G4 验证后回写。
- DTO / contract -> E2E mocks: mocked external session 必须返回 `CurrentAuthSessionView`，不能再返回 `accessToken`。
- Guard / permission -> browser behavior: 权限不足仍进入 `/auth/access`；会话缺失或失效进入 `/auth/login?returnUrl=...`。
- Persistence / migration: N/A，本片不修改 DDL、entity 或 migration。

## 7. 测试与校验

| Check                    | Required | Command / Evidence                                        | Result                  | Gap / Reason                                 |         |                            |
| ------------------------ | -------- | --------------------------------------------------------- | ----------------------- | -------------------------------------------- | ------- | -------------------------- |
| Browser E2E focused scan | Yes      | `rg "poms_access_token                                    | Authorization: \`Bearer | /api/auth/login" apps/poms-admin-e2e`        | Planned | 确认旧 token helper 清退。 |
| Admin E2E focused tests  | Yes      | targeted Playwright specs where practical                 | Planned                 | 受本地服务启动和 seed 约束，失败需记录原因。 |         |                            |
| Admin app tests          | Decision | focused/full Admin tests only if app runtime code changes | Not required            | 本片只改 E2E helper 和 docs。                |         |                            |
| API tests                | Decision | API focused tests only if backend runtime changes         | Not required            | 本片不改后端。                               |         |                            |
| Markdown                 | Yes      | `corepack pnpm run format:md:check`                       | Planned                 | 新增 baseline + tracker/progress edits.      |         |                            |
| Diff sanity              | Yes      | `git diff --check`                                        | Planned                 | 文档和 TypeScript edits。                    |         |                            |

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                     |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No G1 exception accepted. |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-16`
- Conditions:
  - Any remaining bearer / localStorage references in Admin browser E2E must be either removed or explicitly classified as non-runtime documentation evidence.
  - If browser E2E cannot run locally, record the concrete blocker and at minimum provide typecheck / scan / affected spec evidence.
  - `EX-66` parent cannot close until the final validation result and route / ADR writeback are recorded.
