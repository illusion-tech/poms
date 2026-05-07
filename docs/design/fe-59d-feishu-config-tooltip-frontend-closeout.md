# FE-59D 飞书配置提示浮层 G3 / G4 Closeout

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Date: `2026-05-07`
- Baseline: `fe-59d-feishu-config-tooltip-frontend-baseline.md`
- Tracker Row: `FE-59D`

## 1. 交付范围

本片已完成飞书配置提示浮层:

1. `IdentityProviderList` 引入 PrimeNG `TooltipModule`。
2. 在 Client ID、Client Secret、Redirect URI、搜索授权模式、Login scopes、Search scopes、Tenant allowlist 旁增加圆形问号图标。
3. Tooltip 文案明确飞书 AppID / AppSecret 与 POMS 字段的对应关系。
4. Redirect URI tooltip 明确需要同步配置到飞书开放平台白名单，且登录联调用 `/auth/identity-providers:callback`。
5. Search scopes / 搜索授权模式 tooltip 明确第一版使用管理员个人授权和 `contact:user:search` 方向。
6. 补充 focused test，确认 tooltip 入口和关键文案可用。

## 2. 明确未交付

1. 未新增、修改或删除后端 public API route、OpenAPI、generated client 或 migration。
2. 未改变 provider config 保存、编辑、测试连接或登录行为。
3. 未拆分登录 callback URI 和管理员搜索授权 callback URI；该既有设计差异仍留给 `EX-64F` 收口评估。

## 3. 验证结果

| Check               | Command                                                                                                  | Result | Notes               |
| ------------------- | -------------------------------------------------------------------------------------------------------- | ------ | ------------------- |
| Provider list tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list --skip-nx-cache` | Pass   | Focused tests pass. |
| Admin lint          | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                       | Pass   | No lint errors.     |
| Admin build         | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                      | Pass   | Production build.   |
| Markdown            | `corepack pnpm run format:md:check`; `git diff --check`                                                  | Pass   | No format drift.    |

## 4. Drift 处理

No new drift found in this slice. Existing single `redirectUri` limitation is documented as out of scope and should be evaluated in `EX-64F`.

## 5. G4 结论

- `FE-59D`: `Done / G4`
- `FE-59` remains `Done / G4`
- Next ordered slice remains `EX-64F` external identity integration closeout.
