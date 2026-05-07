# FE-59A2 Provider 固定卡片入口 G3 / G4 Closeout

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Date: `2026-05-07`
- Baseline: `fe-59a2-provider-fixed-card-entry-frontend-baseline.md`
- Tracker Row: `FE-59A2`

## 1. 交付范围

本片已完成 provider 配置页入口纠偏:

1. 移除页面顶部“新增 Provider”按钮，配置入口不再表达为任意新增。
2. `IdentityProviderCard` 支持 configured / unconfigured 两种状态；未配置状态渲染固定 provider 卡片和“配置”操作。
3. `IdentityProviderList` 从 generated `IdentityProvider` enum 派生固定 provider 槽位；已有配置继续逐张展示，缺失 provider 自动补待配置卡片。
4. 通过待配置卡片打开创建弹窗时，provider 已预选并锁定；管理员只填写该 provider 的必要配置。
5. 已保留 provider / status 筛选、刷新、编辑、测试连接、secret 写入态和 `rowVersion` 乐观版本语义。
6. 补充 focused tests 覆盖未配置卡片、provider 锁定创建入口和既有 create / update / testConnection 行为。

## 2. 明确未交付

1. 未新增、修改或删除后端 public API route、OpenAPI、generated client 或 migration。
2. 未改变 provider 配置创建、编辑、测试连接的业务语义。
3. 未新增钉钉、企业微信等 provider enum 或 provider-specific 表单。
4. 未实现 `FE-59C` 登录页外部 provider 入口或 callback 体验。

## 3. 关键一致性结论

| Edge                 | Result | Evidence                                                                                   |
| -------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Fixed provider slots | Pass   | `IdentityProviderList.providerCards` 从 `PROVIDER_OPTIONS` 派生未配置槽位。                |
| Existing configs     | Pass   | 已有 `IdentityProviderConfigSummary` 仍逐张 card 展示，未压缩或隐藏多租户配置。            |
| Configure action     | Pass   | `IdentityProviderCard.configureRequested` 交回 provider，父页面打开 locked create dialog。 |
| Secret handling      | Pass   | 未配置和已配置卡片都只展示 `secretConfigured` / 未配置态，不展示 raw secret。              |
| Version semantics    | Pass   | `IdentityProviderList.testConnection` 仍按 config `rowVersion` 传 `expectedVersion`。      |
| Scope boundary       | Pass   | 未混入登录入口、callback、用户绑定或 backend contract 变更。                               |

## 4. 验证结果

| Check              | Command                                                                                                  | Result | Notes                     |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ------ | ------------------------- |
| Card focused tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-card --skip-nx-cache` | Pass   | 5 tests passed.           |
| Page focused tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list --skip-nx-cache` | Pass   | 7 tests passed.           |
| Admin lint         | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                       | Pass   | No lint errors.           |
| Admin build        | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                      | Pass   | Production build passed.  |
| Admin full tests   | `corepack pnpm nx test poms-admin --skip-nx-cache`                                                       | Pass   | 212 tests passed.         |
| Enum-like scan     | `corepack pnpm run check:enum-like-strings`                                                              | Pass   | 1279 findings classified. |

## 5. Drift 处理

No new drift found in this slice.

## 6. G4 结论

- `FE-59A2`: `Done / G4`
- `FE-59` parent remains `Doing`.
- `FE-59C` remains the next frontend slice after this UI refinement.
