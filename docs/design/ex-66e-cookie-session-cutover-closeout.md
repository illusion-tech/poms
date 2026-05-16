# EX-66E Cookie 会话 direct cutover 收口验证、E2E helper 与文档回写 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-16`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `auth-runtime` / `e2e-harness` / `governance-closeout`
- Tracker Row: `EX-66E`
- Parent: `EX-66`
- Baseline: `docs/design/ex-66e-cookie-session-cutover-validation-baseline.md`
- Corrective Checkpoint: `docs/design/ex-66e-cookie-session-cutover-corrective-checkpoint.md`
- Runtime Commit: `488c7f6 fix(auth): 修复 Cookie 会话刷新后的路由判定`

## 1. 交付范围

1. Admin browser E2E helper 已从旧 token 语义切换为 Cookie session：`GET /auth/csrf-token` + `POST /auth/sessions` + browser context cookie sync。
2. Browser E2E 不再读取 `localStorage.poms_access_token`、不再注入 `Authorization: Bearer`，也不再调用旧 `POST /api/auth/login`。
3. 外部登录 mocked E2E 改为验证 session view / CSRF header / Cookie session，不再断言前端接收 `accessToken`。
4. Project workspace smoke 改为真实 UI 登录 + seeded project id，覆盖 Cookie session 下整页进入业务路由的 bootstrap 路径。
5. Platform governance focused browser E2E 使用 Cookie session API helper 与 CSRF header，覆盖 profile self-service 和权限不足重定向路径。
6. `authGuard` / `permissionGuard` 已修复本地用户为空时未先 bootstrap Cookie session 的真实漂移，整页刷新后不再误跳登录。
7. ADR-017、tracker、progress 和 drift inventory 已回写 Cookie session direct cutover 结果。

## 2. 一致性结论

| Edge                            | Result | Evidence                                                                                                             |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| ADR-017 -> Admin Web runtime    | Pass   | 浏览器端不再持有 access token；登录态从 `GET /auth/session` + HttpOnly Cookie 恢复。                                 |
| Route inventory -> E2E helper   | Pass   | E2E helper 使用 `GET /auth/csrf-token` 和 `POST /auth/sessions`，旧 `POST /auth/login` 已从 Admin browser E2E 清退。 |
| Guard semantics -> page refresh | Pass   | `authGuard` / `permissionGuard` 在本地用户为空时先执行 `AuthStore.initialize()`，再做登录和权限判定。                |
| CSRF contract -> unsafe calls   | Pass   | Platform governance helper 通过 CSRF token store 为 unsafe API calls 附加 `X-CSRF-Token`。                           |
| FE-62B UX -> expired sessions   | Pass   | 会话失效交互已由 `FE-62B` 完成，本片验证 E2E helper 不再绕过 Cookie session。                                        |
| Governance docs -> tracker      | Pass   | `EX-66E` 与 parent `EX-66` 推进到 `Done / G4`；`D-20260513-001` 从 Open 改为 Closed。                                |

## 3. Drift / Exception 处理

| ID                               | Classification            | Resolution                                                                                                                                             |
| -------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EX66E-D1-GUARD-BOOTSTRAP-ORDER` | `new-real-drift`          | 已修复 `authGuard` / `permissionGuard` 初始化顺序，并新增 focused guard tests 覆盖 Cookie session bootstrap。                                          |
| `EX66E-D2-E2E-API-COOKIE-SYNC`   | `tooling-drift`           | 已在 Admin browser E2E helper 中显式同步 `Set-Cookie` 到 browser context，避免 API 前置登录与页面状态分裂。                                            |
| `D-20260513-001`                 | `planned-contract-drift`  | `EX-66C` 起已清退 Admin Web `POST /auth/login` / `accessToken`；本片完成 E2E helper 和文档回写后关闭 current drift inventory 中的 open 记录。          |
| `EX66E-E1-FULL-BROWSER-MATRIX`   | `validation-scope-record` | 未在本片重跑全部 36 条 browser E2E；本片执行 external-login、project-workspace、platform-governance 的关键 Cookie session paths，并完成 no-load 扫描。 |

## 4. 验证结果

| Check                           | Command / Evidence                                                                                                                                                                                       | Result                      |               |                 |                     |                                      |                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------- | --------------- | ------------------- | ------------------------------------ | ---------------- |
| Guard focused tests             | `corepack pnpm exec jest -c apps/poms-admin/jest.config.ts --runTestsByPath apps/poms-admin/src/app/core/auth/auth.guard.spec.ts apps/poms-admin/src/app/core/auth/permission.guard.spec.ts --runInBand` | Pass, 2 suites / 8 tests    |               |                 |                     |                                      |                  |
| Admin full tests                | `corepack pnpm nx test poms-admin --skip-nx-cache`                                                                                                                                                       | Pass, 48 suites / 272 tests |               |                 |                     |                                      |                  |
| Admin lint                      | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                                                                       | Pass                        |               |                 |                     |                                      |                  |
| Admin build                     | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                      | Pass                        |               |                 |                     |                                      |                  |
| External login mocked E2E       | `POMS_API_BASE_URL=http://localhost:5700 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/external-login.mocked.spec.ts --workers=1`         | Pass, 1 test                |               |                 |                     |                                      |                  |
| Project workspace smoke E2E     | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts --workers=1`                                               | Pass, 4 tests               |               |                 |                     |                                      |                  |
| Platform governance focused E2E | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/platform-governance.smoke.spec.ts --workers=1 --grep "profile self-service                 | viewer is redirected"`      | Pass, 2 tests |                 |                     |                                      |                  |
| E2E token scan                  | `rg "poms_access_token                                                                                                                                                                                   | Authorization               | Bearer        | /api/auth/login | authControllerLogin | accessToken" apps/poms-admin-e2e -S` | Pass, no matches |
| E2E load scan                   | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts --list`                                                                                                            | Pass, 36 tests listed       |               |                 |                     |                                      |                  |
| Markdown / diff sanity          | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                   | Pass                        |               |                 |                     |                                      |                  |

## 5. G4 结论

- `EX-66E`: `Done / G4`
- `EX-66`: `Done / G4`
- Admin Web Cookie + HttpOnly 服务端会话认证 direct cutover 已完成；产品未上线，因此未保留旧 bearer / localStorage / `POST /auth/login` 兼容路径。
- 后续若要提升置信度，可单独新增 browser regression slice 重跑全量 36 条 Admin browser E2E；它不是 `EX-66` closeout 的阻塞项。
