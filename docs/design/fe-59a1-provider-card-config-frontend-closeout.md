# FE-59A1 Provider 配置卡片化组件抽象 G3 / G4 Closeout

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Date: `2026-05-07`
- Baseline: `fe-59a1-provider-card-config-frontend-baseline.md`
- Tracker Row: `FE-59A1`

## 1. 交付范围

本片已完成 provider 配置页卡片化调整:

1. 新增 `IdentityProviderCard` standalone 组件，负责单个 provider config 的展示、状态标签、能力标签、secret 配置态、scope、redirect URI、版本和最近测试结果。
2. `IdentityProviderCard` 使用 signal input 和 function output；只负责展示与 edit / test 事件发出，不直接注入 store。
3. `IdentityProviderList` 主体从表格替换为 responsive card grid，保留 provider / status 筛选、刷新、新增 Provider、创建 / 编辑弹窗和错误态。
4. 每张卡片保留“编辑”和“测试连接”操作，测试连接仍使用当前 `rowVersion` 作为 `expectedVersion`。
5. 创建 / 编辑弹窗的 secret 写入态保持不变；编辑时 secret 留空仍不会覆盖既有 secret。
6. 空状态从表格空行调整为页面内空配置提示。
7. 补充 card focused tests，并确认既有 provider list focused tests 继续覆盖 create / update / testConnection 边界。

## 2. 明确未交付

1. 未新增、修改或删除后端 public API route、OpenAPI、generated client 或 migration。
2. 未改变 provider 配置查询、新建、编辑、测试连接的业务语义。
3. 未实现 provider marketplace 或 provider-specific 插件渲染。
4. 未实现 `FE-59C` 登录页外部 provider 入口或 callback 体验。

## 3. 关键一致性结论

| Edge                   | Result | Evidence                                                                                 |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------- |
| Component boundary     | Pass   | `IdentityProviderCard` 只通过 `config` / `testing` / `testResult` inputs 接收数据。      |
| Action orchestration   | Pass   | Card 通过 `editRequested` / `testRequested` outputs 交回父页面；store 调用仍在 list 页。 |
| UI -> generated client | Pass   | 本片未修改 `IdentityProviderStore` generated client 调用边界。                           |
| Secret handling        | Pass   | Card 只展示 `secretConfigured`；编辑弹窗 secret 写入态未变。                             |
| Version semantics      | Pass   | `IdentityProviderList.testConnection` 仍按 config `rowVersion` 传 `expectedVersion`。    |
| Scope boundary         | Pass   | 未混入用户绑定、登录入口或 callback 体验。                                               |

## 4. 验证结果

| Check              | Command                                                                                                  | Result | Notes                     |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ------ | ------------------------- |
| Card focused tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-card --skip-nx-cache` | Pass   | 3 tests passed.           |
| Page focused tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list --skip-nx-cache` | Pass   | 5 tests passed.           |
| Admin lint         | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                       | Pass   | No lint errors.           |
| Admin build        | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                      | Pass   | Production build passed.  |
| Admin full tests   | `corepack pnpm nx test poms-admin --skip-nx-cache`                                                       | Pass   | 208 tests passed.         |
| Enum-like scan     | `corepack pnpm run check:enum-like-strings`                                                              | Pass   | 1279 findings classified. |

## 5. Drift 处理

No new drift found in this slice.

## 6. G4 结论

- `FE-59A1`: `Done / G4`
- `FE-59` parent remains `Doing`.
- `FE-59C` remains the next frontend slice after this UI refinement.
