# FE-59C 登录页外部 provider 入口与 callback 体验实施基线包

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-59C`

## 1. 范围

本片负责把 `EX-64E` 已落地的外部登录会话桥接能力接入 Admin 登录体验。

Included:

1. 登录页读取 enabled external login providers。
2. 登录页按 provider 显示企业登录入口，并复用本地 provider logo / label presentation。
3. 点击 provider 后调用 generated `authControllerAuthorizeExternalLogin`，并跳转 provider authorize URL。
4. 保存登录前 returnUrl，callback 成功后只回跳本应用内相对路径。
5. 新增 `/auth/identity-providers:callback` 前端 route。
6. Callback 页面读取 `code` / `state` / `error` / `error_description`，调用 generated callback API 换取一次性 ticket。
7. Callback 页面调用 generated external login session exchange，把 POMS JWT 落到既有 AuthStore 会话状态。
8. 展示 callback 加载态、失败态和返回登录页动作。
9. 补 AuthStore / route / component tests，并提供最小浏览器级 mocked OAuth journey evidence。

Out of scope:

1. 不新增、修改或删除后端 public API route。
2. 不改 identity provider migration、entity、DTO、OpenAPI 或 generated client。
3. 不修改 provider 配置页、用户详情绑定弹窗或 Feishu 姓名搜索行为。
4. 不实现自助绑定、自动创建 POMS 用户或外部 provider token 持久化。
5. 不要求真实 Feishu OAuth e2e；真实外部授权依赖租户配置和第三方环境，本片只做浏览器级 mocked journey。

## 2. 正式输入

| Input Type       | Document / Source                                          | Status | Notes                                                      |
| ---------------- | ---------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| Runtime API      | `ex-64e-external-login-session-bridge-runtime-closeout.md` | G4     | enabled provider list、authorize、callback、session 已完成 |
| Governance       | `ex-64a-external-identity-provider-governance-baseline.md` | G1     | 外部 provider 只做认证，POMS JWT / 权限仍为 SSOT           |
| Tracker          | `phase2-development-execution-tracker.md` / `FE-59C`       | Active | `FE-59` 最后一个前端运行时切片                             |
| Generated client | `libs/shared/api-client/api/auth.service.ts`               | Stable | external login 四个 auth API 已生成                        |
| Existing UI      | `features/auth/login.ts`、`AuthStore`                      | Active | 登录页和 token 落地逻辑已存在                              |

## 3. SSOT

| Concern               | SSOT                                          | Implementation Rule                                                       |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Provider identity     | generated `IdentityProvider`                  | 前端只消费 generated enum；Feishu 只是当前 provider value                 |
| Provider presentation | `shared/ui/identity-provider-presentation.ts` | logo、label、fallback icon 统一供配置卡片和登录页使用                     |
| Login providers       | `EnabledLoginProviderSummary`                 | 登录页只展示后端返回的 enabled providers，不展示未启用配置                |
| Session token         | existing `AuthStore` token handling           | external session exchange 后复用同一 token storage、profile/nav/todo load |
| Return URL            | local relative route                          | 外部登录前保存 returnUrl；callback 只允许 `/` 开头且非 `//` 的本地路径    |
| Callback route        | `app.routes.ts`                               | `/auth/identity-providers:callback` 承接 provider redirect URI            |
| Error handling        | machine HTTP/API errors                       | 显示用户可理解中文错误；不暴露 provider token、ticket hash 或 secret      |

## 4. 路由与权限边界

| Route / Surface                     | Permission | Source        | Result    |
| ----------------------------------- | ---------- | ------------- | --------- |
| `/auth/login`                       | public     | Existing      | Consumed  |
| `/auth/identity-providers:callback` | public     | This baseline | G1 frozen |

No public API route is added or changed in this slice.

Existing consumed API surfaces:

| Surface                                           | Permission | Source | Result   |
| ------------------------------------------------- | ---------- | ------ | -------- |
| `GET /api/auth/identity-providers`                | public     | EX-64E | Consumed |
| `GET /api/auth/identity-providers/{id}:authorize` | public     | EX-64E | Consumed |
| `GET /api/auth/identity-providers:callback`       | public     | EX-64E | Consumed |
| `POST /api/auth/external-login-sessions`          | public     | EX-64E | Consumed |

## 5. 读写边界

| Operation              | Generated API                               | UI Behavior                                     | Result    |
| ---------------------- | ------------------------------------------- | ----------------------------------------------- | --------- |
| List enabled providers | `authControllerListEnabledLoginProviders`   | 登录页显示可用企业登录方式                      | G1 frozen |
| Authorize login        | `authControllerAuthorizeExternalLogin`      | 点击 provider 后跳转 authorize URL              | G1 frozen |
| Handle callback        | `authControllerHandleExternalLoginCallback` | callback 页面换取一次性 external login ticket   | G1 frozen |
| Exchange session       | `authControllerCreateExternalLoginSession`  | ticket 换 POMS JWT 并加载当前用户 / 导航 / 待办 | G1 frozen |

## 6. 持久化边界

N/A. 本片不触及 migration、entity、DDL 或 seed。

## 7. 测试与校验

| Check                     | Required | Command / Evidence                                                                           | Result     |
| ------------------------- | -------- | -------------------------------------------------------------------------------------------- | ---------- |
| AuthStore tests           | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=auth.store`                 | Pending G3 |
| Login tests               | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=login`                      | Pending G3 |
| Callback tests            | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-callback` | Pending G3 |
| Route tests               | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`                 | Pending G3 |
| Admin lint                | Yes      | `corepack pnpm nx lint poms-admin`                                                           | Pending G3 |
| Admin build               | Yes      | `corepack pnpm nx build poms-admin`                                                          | Pending G3 |
| Admin full tests          | Yes      | `corepack pnpm nx test poms-admin`                                                           | Pending G3 |
| Browser journey           | Yes      | focused Playwright mocked external login journey                                             | Pending G3 |
| Markdown                  | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                      | Pending G3 |
| API / OpenAPI / migration | No       | N/A                                                                                          | N/A        |

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes              |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1 |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Conditions:
  - 只消费 `EX-64E` 既有 generated client，不修改后端契约。
  - Callback 页面必须通过一次性 ticket 换取 POMS JWT，不保存外部 provider token。
  - Return URL 必须限制为本应用内相对路径。
  - `EX-64F` 收口前，真实 Feishu OAuth 端到端验证可由运维配置和回调地址检查承接。
