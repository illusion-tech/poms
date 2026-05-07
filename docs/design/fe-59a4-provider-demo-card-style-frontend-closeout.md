# FE-59A4 Provider Demo Card 风格对齐 G3 / G4 Closeout

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Date: `2026-05-07`
- Baseline: `fe-59a4-provider-demo-card-style-frontend-baseline.md`
- Tracker Row: `FE-59A4`

## 1. 交付范围

本片已完成 provider 卡片风格收敛:

1. `IdentityProviderCard` 外层容器改为 demo `listdemo` grid card 的实线 border、surface background、rounded、padding 组合。
2. 移除未配置 provider 的 `border-dashed` 容器状态。
3. 移除卡片容器 hover primary border，避免 provider 卡片形成独立视觉语言。
4. 未配置状态继续通过 `待配置` tag、字段状态和 `配置` CTA 表达。
5. 飞书 SVG logo、provider logo 映射、configured / unconfigured card、编辑、测试连接和配置动作保持不变。
6. 补充 focused test，断言未配置卡片不包含 dashed border。

## 2. 明确未交付

1. 未新增、修改或删除后端 public API route、OpenAPI、generated client 或 migration。
2. 未改变 provider 配置查询、创建、编辑、测试连接或固定卡片入口行为。
3. 未新增 provider enum、provider-specific 表单或登录入口。
4. 未实现 `FE-59C` 登录页外部 provider 入口或 callback 体验。

## 3. 关键一致性结论

| Edge                | Result | Evidence                                                                                                        |
| ------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| Demo card alignment | Pass   | 外层容器使用 `p-6 border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 rounded`。 |
| Unconfigured state  | Pass   | 未配置状态不再改变外层边框语义，只保留 `待配置` tag 和 `配置` CTA。                                             |
| Provider logo       | Pass   | 飞书仍通过 `/identity-providers/feishu.svg` 渲染。                                                              |
| Scope boundary      | Pass   | Only Admin card style, focused test and governance docs changed.                                                |

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

- `FE-59A4`: `Done / G4`
- `FE-59` parent remains `Doing`.
- `FE-59C` remains the next frontend slice after this visual refinement.
