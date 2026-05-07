# FE-59B 用户详情外部身份绑定与飞书姓名模糊搜索弹窗 G3 / G4 Closeout

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Date: `2026-05-07`
- Baseline: `fe-59b-user-external-identity-binding-frontend-baseline.md`
- Tracker Row: `FE-59B`

## 1. 交付范围

本片已完成用户详情外部身份绑定前端体验:

1. 扩展 `IdentityProviderStore`，通过 generated client 接入 external identity list / bind / unbind、current-admin grant get / authorize、external user search。
2. 新增 `UserExternalIdentityPanel` standalone 组件，在用户详情弹窗展示当前 POMS 用户的外部身份绑定状态。
3. 支持在绑定弹窗选择 active + enabled + bindingEnabled + searchEnabled 的 Feishu provider config。
4. 支持展示当前管理员搜索授权状态，发起 Feishu 授权 URL，并刷新授权状态。
5. 支持按姓名关键字调用 Feishu external user fuzzy search，展示候选人的姓名、部门、邮箱、手机号、unionId 和 subjectId。
6. 支持从候选人确认绑定到当前 POMS 用户；bind request 直接使用候选人 subjectId / unionId / displayName / avatar / email / mobile，不要求管理员预先掌握手机号或邮箱。
7. 支持解绑 active 外部身份绑定，并按 binding `rowVersion` 传 `expectedVersion`。
8. 在用户详情弹窗嵌入外部身份面板，不新增 Admin route。
9. 补充 focused component tests，覆盖展示、授权、搜索、绑定和解绑的 store 调用边界。

## 2. 明确未交付

1. 未新增、修改或删除后端 public API route、OpenAPI、generated client 或 migration。
2. 未实现通讯录同步、后台导入、组织映射或外部用户缓存。
3. 未实现登录页 provider 入口、登录 callback、票据交换或 AuthStore 会话落地；这些由 `FE-59C` 承接。
4. 未把 current-admin grant callback 做成专门前端落地页；当前第一版使用既有 backend callback，并在绑定弹窗内提供授权状态刷新。
5. 未扩展多 provider marketplace；组件按 generated enum 和 provider config eligibility 保持模块化入口。

## 3. 关键一致性结论

| Edge                       | Result | Evidence                                                                                                                 |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| UI -> generated client     | Pass   | `IdentityProviderStore` 只调用 generated `ExternalIdentityApi`、`IdentityProviderApi`、`IdentityProviderOAuthGrantApi`。 |
| Binding candidate -> bind  | Pass   | `bindCandidate` 从 `ExternalUserCandidate` 生成 `BindUserExternalIdentityRequest`，不依赖手机号或邮箱。                  |
| Search authorization       | Pass   | 搜索前要求 current-admin grant 为 `active`；missing / expired / revoked 走授权入口。                                     |
| Version semantics          | Pass   | `unbindExternalIdentity` 使用 binding `rowVersion` 作为 `expectedVersion`。                                              |
| User detail integration    | Pass   | `UserList` 详情弹窗嵌入面板；不新增 Admin route 或 route guard。                                                         |
| Scope boundary             | Pass   | 未混入 `FE-59C` 登录入口 / callback 会话体验。                                                                           |
| OpenAPI / generated client | Pass   | 本片只消费现有 generated client；未修改契约生成物。                                                                      |

## 4. 验证结果

| Check                  | Command                                                                                                  | Result | Notes                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------ | --------------------------- |
| External identity test | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=user-external-identity --skip-nx-cache` | Pass   | 6 tests passed.             |
| User list integration  | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=user-list --skip-nx-cache`              | Pass   | 1 test passed.              |
| Admin data lint        | `corepack pnpm nx lint admin-data-access --skip-nx-cache`                                                | Pass   | No lint errors.             |
| Admin lint             | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                       | Pass   | No lint errors or warnings. |
| Admin build            | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                      | Pass   | Production build passed.    |
| Admin full tests       | `corepack pnpm nx test poms-admin --skip-nx-cache`                                                       | Pass   | 205 tests passed.           |
| Enum-like scan         | `corepack pnpm run check:enum-like-strings`                                                              | Pass   | 1279 findings classified.   |

## 5. Drift 处理

No new drift found in this slice.

## 6. G4 结论

- `FE-59B`: `Done / G4`
- `FE-59` parent remains `Doing`.
- `FE-59C` is the next frontend slice and may consume `EX-64E` public provider login / authorize / callback session exchange APIs plus the login page AuthStore integration.
