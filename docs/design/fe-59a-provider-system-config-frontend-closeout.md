# FE-59A Provider 系统配置页面 G3 / G4 Closeout

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Date: `2026-05-07`
- Baseline: `fe-59a-provider-system-config-frontend-baseline.md`
- Tracker Row: `FE-59A`

## 1. 交付范围

本片已完成外部身份提供商配置前端第一版:

1. 新增 Admin 路由 `/platform/identity-providers`，使用 `platform:identity-providers:manage` 权限保护。
2. 新增动态导航 SSOT 和静态 fallback 菜单入口“外部身份提供商”。
3. 新增 `IdentityProviderStore`，通过 generated `IdentityProviderApi` 调用 provider config list / create / update / testConnection。
4. 新增 `IdentityProviderList` standalone 页面，支持 provider / status 筛选、刷新、汇总计数和配置表格。
5. 新增创建 / 编辑弹窗，覆盖 display name、tenant id、client id、client secret 写入态、redirect URI、login / search scopes、tenant allowlist、启用开关、search grant mode 和 status。
6. 编辑时 client secret 留空不会覆盖既有 secret；UI 只展示 `secretConfigured`，不显示 raw secret。
7. 测试连接按 `rowVersion` 传 `expectedVersion`，并展示 success / failed 结果。
8. 补齐配置页、Admin route 和 navigation focused tests。

## 2. 明确未交付

1. 未新增后端 public API route、OpenAPI、generated client 或 migration。
2. 未实现用户详情绑定弹窗、飞书姓名模糊搜索、候选确认、绑定或解绑；这些由 `FE-59B` 承接。
3. 未实现登录页 provider 入口、callback 页面或 AuthStore 会话落地；这些由 `FE-59C` 承接。
4. 未引入多 provider marketplace 或 provider-specific 前端插件机制；当前按 generated enum 消费 Feishu。

## 3. 关键一致性结论

| Edge                   | Result | Evidence                                                                                     |
| ---------------------- | ------ | -------------------------------------------------------------------------------------------- |
| UI -> generated client | Pass   | `IdentityProviderStore` 只调用 generated `IdentityProviderApi`，不手写 provider config URL。 |
| Route -> permission    | Pass   | `/platform/identity-providers` 使用 `platform:identity-providers:manage` guard。             |
| Navigation -> route    | Pass   | dynamic navigation SSOT 和 static fallback menu 均指向 `/platform/identity-providers`。      |
| Secret handling        | Pass   | 表格只展示 `secretConfigured`；编辑弹窗 secret 留空不提交 `clientSecret` 字段。              |
| Version semantics      | Pass   | update / testConnection 均使用当前 `rowVersion` 作为 `expectedVersion`。                     |
| Scope boundary         | Pass   | 未混入 `FE-59B` 用户绑定或 `FE-59C` 登录 callback 体验。                                     |

## 4. 验证结果

| Check               | Command                                                                                                  | Result | Notes                     |
| ------------------- | -------------------------------------------------------------------------------------------------------- | ------ | ------------------------- |
| Provider page test  | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list --skip-nx-cache` | Pass   | 5 tests passed.           |
| Admin route test    | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes --skip-nx-cache`             | Pass   | 6 tests passed.           |
| Navigation API test | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=navigation.service --skip-nx-cache`       | Pass   | 18 tests passed.          |
| Admin data lint     | `corepack pnpm nx lint admin-data-access --skip-nx-cache`                                                | Pass   | No lint errors.           |
| Admin lint          | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                       | Pass   | No lint errors.           |
| API lint            | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                         | Pass   | No lint errors.           |
| Admin build         | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                      | Pass   | Production build passed.  |
| API build           | `corepack pnpm nx build poms-api --skip-nx-cache`                                                        | Pass   | Webpack build passed.     |
| Admin full tests    | `corepack pnpm nx test poms-admin --skip-nx-cache`                                                       | Pass   | 198 tests passed.         |
| API full tests      | `corepack pnpm nx test poms-api --skip-nx-cache`                                                         | Pass   | 640 tests passed.         |
| Enum-like scan      | `corepack pnpm run check:enum-like-strings`                                                              | Pass   | 1279 findings classified. |

## 5. Drift 处理

| Drift ID                      | Classification            | Resolution                                                                                                                                              |
| ----------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FE59A-D1-ENUM-SCAN-BASELINE` | `existing-baseline-drift` | Enum-like scan had pre-existing FE-57 / attachment fixture gaps and backend baseline overflows; allowlist was updated without runtime behavior changes. |

## 6. G4 结论

- `FE-59A`: `Done / G4`
- `FE-59` parent remains `Doing`.
- `FE-59B` is the next frontend slice and may consume provider config list plus existing external identity / current-admin grant APIs.
