# FE-41 合同列表 TableDemo 交互基线收口 G4 Close-out

- Task ID: `FE-41`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation
- Baseline: `docs/design/archive/slices/fe-41-contract-list-tabledemo-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-41-contract-list-tabledemo-g3-checkpoint.md`
- Runtime Commit: `1a4cc5d feat(contract): 完成 FE-41 合同列表表格示例前端闭环`

---

## 1. G4 结论

`FE-41` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. 合同列表搜索已迁入 `p-table` caption。
2. 表格具备 `清空筛选`、全局搜索、列级 filter、rowHover、gridline、scroll/min-width 和 loadingbody。
3. 状态 filter 使用 PrimeNG `p-select`，不再引入原生 select。
4. 新建合同、项目选择器、系统生成 POMS 合同编号提示和行操作 menu 保持原行为。
5. 合同管理 journey 覆盖登录后从菜单进入、caption 搜索、清空筛选和新建合同链路。

---

## 2. 提交证据

| Evidence         | Result                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Commit           | `1a4cc5d feat(contract): 完成 FE-41 合同列表表格示例前端闭环`                                    |
| Runtime files    | `contract-list.ts`、`contract-list.spec.ts`、`contract-management.journey.spec.ts`               |
| Governance files | FE-40 G4 close-out、FE-41 baseline、FE-41 G3 checkpoint、tracker、progress                       |
| Tracker update   | 本 close-out 后将 `FE-41` 标记为 `Done / G4`，并允许 `FE-42` 进入 `G1` 权限 / 敏感字段回归矩阵。 |

---

## 3. G3 验证回放

G3 已在本地 checkpoint 记录，结果如下：

| Check                                                                                                                                              | Result         |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-list.spec.ts`                                      | Pass           |
| `corepack pnpm nx lint poms-admin`                                                                                                                 | Pass           |
| `corepack pnpm nx build poms-admin`                                                                                                                | Pass           |
| `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/contract-management.journey.spec.ts` | Pass           |
| `corepack pnpm run format:md:check`                                                                                                                | Pass           |
| `git diff --check`                                                                                                                                 | Pass           |
| `corepack pnpm nx lint poms-admin-e2e`                                                                                                             | Not configured |

`shared-api-client:check`、`poms-api` lint / build / test 与 `migration-check` 不适用：本片未修改后端 API、generated client、权限模型或 DDL。

---

## 4. Drift 与例外

| Item                                 | Status            | Decision                                                              |
| ------------------------------------ | ----------------- | --------------------------------------------------------------------- |
| UIKit TableDemo interaction drift    | Closed            | 合同列表已对齐 caption / clear / global search / column filter 基线。 |
| `FE41-R1-CLIENT-SIDE-FILTERING-ONLY` | Accepted boundary | 本片只做 `p-table` 客户端筛选，服务端分页 / 筛选需未来独立切片决策。  |
| API / DTO / permission / persistence | No change         | 未发现本片新增 public contract 或权限漂移。                           |

---

## 5. 下游承接

`FE-42` 可以进入 `G1`，围绕工作台、项目、合同、线索、提成关键入口补 admin / viewer / anonymous 权限矩阵，并验证敏感经营金额在前端可见面上不会越权展示。
