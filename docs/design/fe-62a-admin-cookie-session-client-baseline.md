# FE-62A AuthStore 与 API client Cookie credentials / CSRF 切换实施基线包

- Gate Status: `Pass`
- Parent: `FE-62`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-05-14`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-62A`

---

## 1. 范围

- 本次目标:
  1. 收口 Admin Web 运行时认证状态：`AuthStore` 只以 `CurrentAuthSessionView.user` / `GET /auth/session` 作为当前用户事实源，不再依赖浏览器 access token。
  2. 确认 generated API client 在 Admin Web 中固定 `withCredentials: true`，unsafe methods 通过 `PomsCsrfTokenStore` / `poms_csrf` cookie 自动附加 `X-CSRF-Token`。
  3. 补齐账号密码登录、外部登录 callback、初始化、登出、个人资料更新和 CSRF bootstrap 的 focused 前端测试。
  4. 清退 Admin Web 运行时代码中的 `localStorage.poms_access_token`、bearer header 和旧 token provider 假设。
- 本次明确不做:
  1. 不实现长时间 AFK 后的全局 `session_expired` / `unauthorized` 交互、登录页过期提示或 `returnUrl` 引导；这些由 `FE-62B` 承接。
  2. 不收口 Playwright / browser E2E 登录 helper 中的旧 token fixture；最终 E2E helper 与浏览器矩阵由 `EX-66E` 承接。
  3. 不新增或修改后端 route、OpenAPI、generated client、migration 或 session 数据模型。
  4. 不引入浏览器可读 access token、refresh token 或 bearer 兼容 fallback；产品未上线，本轮继续 direct cutover。
- 下游可依赖的交付边界:
  1. Admin Web 业务调用默认携带 Cookie credentials。
  2. Admin Web unsafe API call 会优先从内存 CSRF store，回退从 `poms_csrf` cookie 读取 token 并写入 `X-CSRF-Token`。
  3. `AuthStore.currentUser`、导航和待办初始化均基于服务端 session bootstrap。
- 不允许下游依赖的留白:
  1. 业务页面遇到 `401 / session_expired` 时的统一跳转和可感知提示仍未交付。
  2. 浏览器 E2E helper 仍可能保留旧 bearer fixture，不能作为最终 Cookie session 验收依据。

## 2. 正式输入

| Input Type                | Document / Source                                  | Section / Anchor                           | Status   | Notes                                             |
| ------------------------- | -------------------------------------------------- | ------------------------------------------ | -------- | ------------------------------------------------- |
| ADR                       | `docs/adr/017-admin-web-cookie-session-auth.md`    | accepted decision                          | Accepted | Admin Web 目标态为 HttpOnly Cookie + 服务端会话。 |
| Business design           | `ex-66a-admin-web-cookie-session-auth-baseline.md` | 1 / 5 / 7 / 8 / 10                         | Accepted | Cookie、CSRF、错误语义和 direct cutover 已冻结。  |
| Runtime contract          | `ex-66c-auth-session-contract-runtime-closeout.md` | 1 / 2 / 3                                  | Accepted | 登录、外部登录、当前会话和登出契约已落地。        |
| Runtime contract          | `ex-66d-auth-csrf-credentials-runtime-closeout.md` | 1 / 2 / 3                                  | Accepted | CSRF endpoint、guard、CORS 和结构化错误已落地。   |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                 | `B15` auth routes                          | Accepted | 本片只消费已对齐 routes，不变更 route surface。   |
| DTO / OpenAPI design      | `libs/shared/api-client` generated contracts       | `CurrentAuthSessionView` / `CsrfTokenView` | Accepted | 前端只消费 generated client。                     |
| Command design            | `phase2-development-execution-tracker.md`          | `FE-62A`                                   | Accepted | 本片负责前端 Cookie session hardening。           |
| Query boundary            | `AuthStore.currentUser` / navigation / todos       | current runtime                            | Accepted | 初始化后仍由 AuthStore 聚合前端只读状态。         |
| Data model / table freeze | `auth_session`                                     | `EX-66B`                                   | N/A      | 本片不改持久化，只消费 session runtime。          |
| Schema / DDL              | `N/A`                                              | `N/A`                                      | N/A      | 无 migration。                                    |

## 3. 本次 SSOT

| Concern                     | SSOT                                                    | Implementation Rule                                                      |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Auth state                  | `CurrentAuthSessionView`                                | `AuthStore` 只从 session bootstrap / login session response 建立认证态。 |
| Current user                | `CurrentAuthSessionView.user` / `AuthStore.currentUser` | 页面、菜单、顶部栏继续读取 `AuthStore.currentUser`。                     |
| CSRF token                  | `CsrfTokenView.token` / `poms_csrf` cookie              | unsafe methods 发送 `X-CSRF-Token`；不得把 access token 当 CSRF。        |
| Cookie credentials          | `PomsApiConfiguration.withCredentials`                  | Admin API client 固定启用 credentials。                                  |
| Public route canonical path | `api-route-canonical-inventory.md` `B15`                | 本片只消费，不新增或重命名 route。                                       |
| Route / command naming      | generated `AuthApi` methods                             | 不手写 URL，不绕过 generated client 调 auth routes。                     |
| DTO / contract naming       | `@poms/shared-api-client`                               | 不在前端复制 auth DTO。                                                  |
| Table / column naming       | `N/A`                                                   | 无持久化变更。                                                           |
| Date / time semantics       | `expiresAt` ISO datetime                                | 前端只展示或判断 session 结果，不自行计算服务端过期规则。                |
| Identifier semantics        | server session cookie                                   | 浏览器不可读 session id，前端不得持久化 opaque token。                   |
| Money / decimal semantics   | `N/A`                                                   | 无金额语义。                                                             |
| Status machine              | `CurrentAuthSessionView.authenticated/status`           | 未认证状态清空 AuthStore 聚合状态。                                      |

## 4. 命令与接口边界

| Route / Controller                   | Frontend Consumer                         | Request DTO / Contract              | Response DTO / Contract     | Guard / Permission           | Design Source  | Result |
| ------------------------------------ | ----------------------------------------- | ----------------------------------- | --------------------------- | ---------------------------- | -------------- | ------ |
| `POST /auth/sessions`                | `AuthStore.login`                         | `CreatePasswordAuthSessionRequest`  | `CurrentAuthSessionView`    | anonymous CSRF double-submit | EX-66C/D       | Reuse  |
| `POST /auth/external-login-sessions` | `AuthStore.completeExternalLoginCallback` | `CreateExternalLoginSessionRequest` | `CurrentAuthSessionView`    | anonymous CSRF double-submit | EX-66C/D       | Reuse  |
| `GET /auth/session`                  | `AuthStore.initialize`                    | `N/A`                               | `CurrentAuthSessionView`    | optional session cookie      | EX-66C         | Reuse  |
| `POST /auth/session:logout`          | `AuthStore.logout`                        | `LogoutAuthSessionRequest`          | `AuthSessionLogoutResult`   | session + CSRF               | EX-66C/D       | Reuse  |
| `GET /auth/csrf-token`               | `AuthStore` / `PomsCsrfTokenStore`        | `N/A`                               | `CsrfTokenView`             | public + session-aware       | EX-66D         | Reuse  |
| `PATCH /auth/profile`                | `AuthStore.updateCurrentUserProfile`      | `UpdateCurrentUserProfileRequest`   | `SanitizedUserWithOrgUnits` | session + CSRF               | EX-66D / FE-15 | Reuse  |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `B15` auth session routes.
- Current implemented route(s): no change in this slice.
- Inventory status: `aligned`
- Route governance source: `EX-66A` / `EX-66C` / `EX-66D`
- Blocker / exception: `N/A`

## 5. 读侧边界

| Query / View             | Consumer              | Fields                                                                | Filter / Sort   | Permission Boundary     | Design Source | Result |
| ------------------------ | --------------------- | --------------------------------------------------------------------- | --------------- | ----------------------- | ------------- | ------ |
| `CurrentAuthSessionView` | `AuthStore`           | `authenticated`, `status`, `user`, `permissions`, `expiresAt`, `csrf` | current session | session cookie optional | EX-66C/D      | Reuse  |
| `NavigationItem[]`       | `AuthStore.menuModel` | navigation tree fields                                                | server order    | current user session    | EX-04B        | Reuse  |
| `TodoItemSummary[]`      | `AuthStore.myTodos`   | todo summary fields                                                   | server default  | current user session    | FE-39         | Reuse  |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result       |
| ----- | --------- | ------------------- | ------------------- | ------------------ |
| `N/A` | `N/A`     | `N/A`               | `N/A`               | 本片无持久化变更。 |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result           |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ---------------- |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | 本片无字段变更。 |

## 7. 一致性结论

- Document -> code: 按 `ADR-017` 和 `EX-66C/D` 已落地契约收口前端调用方。
- ADR-015 inventory -> route: 本片不变更 route surface；`B15` 已由 `EX-66D` 回写 aligned。
- Migration -> entity: `N/A`，无 schema 变更。
- Entity -> contract: `N/A`，只消费 generated auth contracts。
- Route -> command: 所有 auth route 通过 generated `AuthApi` 调用。
- Query -> view: `AuthStore` 继续作为当前用户、导航、待办的前端聚合事实源。
- Guard / permission: 不新增前端权限规则；只保持登录态和权限读取来源稳定。
- OpenAPI / generated client: 不重新生成；若发现 generated client token fallback 影响 Admin runtime，需要在本片清退配置使用点而非修改后端契约。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                            | Result  | Gap / Reason                              |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`; `corepack pnpm nx lint admin-data-access --skip-nx-cache` | Planned | 覆盖 app 与 data-access runtime。         |
| Build                            | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                           | Planned | 验证 production compile。                 |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runTestsByPath src/app/core/auth/auth.store.spec.ts --skip-nx-cache`      | Planned | 覆盖 AuthStore session / CSRF 行为。      |
| Focused component tests          | Yes      | login / callback / profile affected specs as needed                                                           | Planned | 根据实际改动补充。                        |
| API / integration tests          | No       | `N/A`                                                                                                         | N/A     | 后端契约已由 `EX-66C/D` 覆盖。            |
| E2E                              | No       | `N/A`                                                                                                         | N/A     | Browser E2E helper 最终由 `EX-66E` 收口。 |
| OpenAPI generation / client diff | No       | `N/A`                                                                                                         | N/A     | 本片不改 OpenAPI。                        |
| Migration / schema check         | No       | `N/A`                                                                                                         | N/A     | 无持久化变化。                            |
| Markdown / diff sanity           | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                                       | Planned | docs touched。                            |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes          |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 暂无开放例外。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-05-14`
- Conditions:
  1. 本片不得重新引入浏览器可读 access token 或 bearer fallback。
  2. 业务 API 的 credentials / CSRF 行为必须在 shared Admin API client provider 或 interceptor 层统一处理，不能散落到业务页面。
  3. `FE-62B` 开始前必须能依赖 `AuthStore` 的 session 状态和结构化错误 code 来实现过期登录引导。
