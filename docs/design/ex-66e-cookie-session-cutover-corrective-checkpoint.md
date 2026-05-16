# EX-66E Cookie 会话 direct cutover G3 Corrective Checkpoint

- Gate Status: `Pass`
- Parent: `EX-66`
- Owner: `Codex`
- Date: `2026-05-16`
- Baseline: `docs/design/ex-66e-cookie-session-cutover-validation-baseline.md`
- Tracker Row: `EX-66E`

## 1. Drift 发现

| ID                               | Classification   | Surface               | Evidence                                                                                                                                                                |
| -------------------------------- | ---------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX66E-D1-GUARD-BOOTSTRAP-ORDER` | `new-real-drift` | Admin route guards    | `project-workspace.smoke.spec.ts` 在 Cookie session 下整页进入 `/projects/{id}` 后被重定向到 `/auth/login`；trace 显示 cookie 已随 `/api/auth/session` 发送且返回 200。 |
| `EX66E-D2-E2E-API-COOKIE-SYNC`   | `tooling-drift`  | Playwright API helper | Admin browser E2E helper 通过 `page.request` 建立 session 时，需要显式把 `Set-Cookie` 同步到 browser context，避免 API 前置与浏览器页面状态分裂。                       |

## 2. 根因

1. `authGuard` 在 `AuthStore.currentUser` 为空时直接判定未登录，没有先执行 `AuthStore.initialize()` 从 Cookie session 恢复用户。
2. `permissionGuard` 仍保留旧 token 时代的判断顺序：本地未认证时先跳登录，再尝试初始化。
3. 部分 browser E2E 旧 helper 把 API 前置登录视为 bearer token 准备动作；Cookie session 下必须同步 cookie context，或者改用真实 UI 登录 / seeded id。

## 3. 修复

1. `authGuard` 改为本地未认证时先执行 `AuthStore.initialize()`，恢复成功后允许导航，否则跳转登录并保留 `returnUrl`。
2. `permissionGuard` 改为本地用户为空时先执行 `AuthStore.initialize()`，再执行登录和权限判定。
3. 新增 `auth.guard.spec.ts`，覆盖已登录、不存在 session 和 bootstrap 恢复 session。
4. 更新 `permission.guard.spec.ts`，从旧 token 语义改为 `currentUser` / Cookie bootstrap 语义。
5. Admin browser E2E helper 改为 `GET /auth/csrf-token` + `POST /auth/sessions`，并同步 `Set-Cookie` 到 browser context。
6. `project-workspace.smoke.spec.ts` 不再用旧 API token 查询项目 id，改为真实 UI 登录 + seeded project id。

## 4. 验证

- Guard focused tests: `corepack pnpm exec jest -c apps/poms-admin/jest.config.ts --runTestsByPath apps/poms-admin/src/app/core/auth/auth.guard.spec.ts apps/poms-admin/src/app/core/auth/permission.guard.spec.ts --runInBand`
  - Result: Pass, 2 suites / 8 tests.
- Admin full tests: `corepack pnpm nx test poms-admin --skip-nx-cache`
  - Result: Pass, 48 suites / 272 tests.
- Admin lint: `corepack pnpm nx lint poms-admin --skip-nx-cache`
  - Result: Pass.
- Admin build: `corepack pnpm nx build poms-admin --skip-nx-cache`
  - Result: Pass.
- External login mocked E2E: `POMS_API_BASE_URL=http://localhost:5700 playwright ... external-login.mocked.spec.ts --workers=1`
  - Result: Pass, 1 test.
- Project workspace smoke E2E: `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts --workers=1`
  - Result: Pass, 4 tests.
- Platform governance focused E2E: `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/platform-governance.smoke.spec.ts --workers=1 --grep "profile self-service|viewer is redirected"`
  - Result: Pass, 2 tests.
- E2E token scan: `rg "poms_access_token|Authorization|Bearer|/api/auth/login|authControllerLogin|accessToken" apps/poms-admin-e2e -S`
  - Result: Pass, no matches.
- Markdown: `corepack pnpm run format:md:check`
  - Result: Pass.

## 5. 结论

- Drift has been corrected in the current slice.
- `EX-66E` can continue to final G4 closeout after `git diff --check`, ADR implementation note and tracker / progress final state are written back.
