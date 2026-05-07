# FE-59C 登录页外部 provider 入口与 callback 体验 G3 / G4 Closeout

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Date: `2026-05-07`
- Baseline: `fe-59c-external-login-frontend-baseline.md`
- Tracker Row: `FE-59C`

## 1. 交付范围

本片已完成外部 provider 登录前端闭环:

1. 登录页调用 `AuthStore.loadEnabledLoginProviders()` 读取后端公开 enabled provider list。
2. 登录页按 provider 渲染企业登录入口，移除 demo 里的 Google / Apple 静态入口，避免误导。
3. provider label / icon / logo 抽到 `shared/ui/identity-provider-presentation.ts`，配置卡片和登录页复用同一 presentation。
4. 点击 provider 调用 `AuthStore.authorizeExternalLogin()` 并跳转后端返回的 authorize URL。
5. 外部登录开始前保存 returnUrl，且只允许本应用内相对路径。
6. 新增 `/auth/identity-providers:callback` route 和 `IdentityProviderCallback` 页面。
7. Callback 页面读取 provider query 参数，调用 generated callback API 换取一次性 ticket，再调用 external login session exchange 落 POMS JWT。
8. AuthStore 复用既有 token storage、profile / navigation / todo load 逻辑，外部登录和账号密码登录落在同一 POMS 会话模型。
9. Callback 页面覆盖加载态、缺失 state、provider error passthrough、HTTP 失败文案和返回登录页动作。
10. 增加 mocked Playwright journey，验证登录页 provider 按钮、authorize 跳转、callback session exchange 和 token 落地。

## 2. 明确未交付

1. 未新增、修改或删除后端 public API route、OpenAPI、generated client 或 migration。
2. 未实现真实 Feishu 租户 OAuth e2e；真实第三方授权依赖环境配置，由 `EX-64F` 收口运维验证承接。
3. 未改变 provider 配置页、用户绑定弹窗、Feishu 姓名搜索或外部身份绑定 API。
4. 未实现自助绑定、自动创建 POMS 用户、通讯录同步或外部 provider token 业务授权。

## 3. 关键一致性结论

| Edge                          | Result | Evidence                                                                      |
| ----------------------------- | ------ | ----------------------------------------------------------------------------- |
| Generated client -> AuthStore | Pass   | AuthStore 只调用 `AuthApi` generated methods，不手写 HTTP path。              |
| Provider presentation         | Pass   | `IdentityProviderCard` 和 `Login` 复用 `identity-provider-presentation`。     |
| Callback route                | Pass   | `/auth/identity-providers:callback` 为 public auth layout child route。       |
| Session boundary              | Pass   | Callback ticket 交换后只保存 POMS JWT；不保存外部 provider token。            |
| Return URL                    | Pass   | returnUrl 通过 `sanitizeAuthReturnUrl` 限制为本应用内相对路径。               |
| Browser journey               | Pass   | Mocked OAuth journey 覆盖 provider list -> authorize -> callback -> session。 |

## 4. 验证结果

| Check               | Command                                                                                                                                                                                                   | Result | Notes                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| AuthStore tests     | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=auth.store --skip-nx-cache`                                                                                                              | Pass   | 5 tests passed.               |
| Login tests         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=login --skip-nx-cache`                                                                                                                   | Pass   | 3 tests passed.               |
| Callback tests      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-callback --skip-nx-cache`                                                                                              | Pass   | 3 tests passed.               |
| Route tests         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes --skip-nx-cache`                                                                                                              | Pass   | 7 tests passed.               |
| Provider card tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-card --skip-nx-cache`                                                                                                  | Pass   | 5 tests passed.               |
| Provider list tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list --skip-nx-cache`                                                                                                  | Pass   | 7 tests passed.               |
| Admin lint          | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                                                                        | Pass   | No lint errors.               |
| Admin build         | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                       | Pass   | Production build passed.      |
| Browser journey     | `$env:POMS_API_BASE_URL='http://127.0.0.1:59999'; corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/external-login.mocked.spec.ts --workers=1` | Pass   | 1 mocked external login test. |

## 5. Drift 处理

| Drift ID                        | Classification            | Resolution                                                                                                 |
| ------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `FE59C-D1-RETURN-TO-NOT-IN-API` | `existing-baseline-drift` | Generated authorize API 当前不接收 `returnTo`；前端以 sessionStorage 保存本地 returnUrl 并做相对路径限制。 |

## 6. G4 结论

- `FE-59C`: `Done / G4`
- `FE-59`: `Done / G4`
- `EX-64` parent remains `Doing` until `EX-64F` completes route / OpenAPI / e2e / ops closeout.
- Next ordered slice: `EX-64F` 外部身份集成收口验证、文档与 G3/G4 证据。
