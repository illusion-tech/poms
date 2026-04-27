# FE-41 合同列表 TableDemo 交互基线收口 G3 Checkpoint

- Task ID: `FE-41`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation
- Baseline: `docs/design/archive/slices/fe-41-contract-list-tabledemo-baseline.md`

---

## 1. 本地交付

`FE-41` 已按 G1 基线完成本地实现：

1. 合同列表搜索已迁入 `p-table` caption，不再放在页面 header。
2. 表格 caption 新增 `清空筛选`，会重置全局搜索、本地页码并调用 `Table.clear()`。
3. 合同表格启用 `rowHover`、`showGridlines`、`responsiveLayout="scroll"` 和稳定 `min-width`。
4. 表头补齐 `p-columnFilter`：
   - POMS 合同编号；
   - 客户合同编号；
   - 项目名称；
   - 客户名称；
   - 状态。
5. 状态列 filter 使用 PrimeNG `p-select`，并保持严格 `ContractStatus` 字面量类型。
6. 表格补充稳定 `loadingbody`，empty state 保持在 `p-table` 内。
7. 新建合同 dialog、项目选择器、系统生成 POMS 合同编号提示和行操作 menu 保持原行为。
8. 合同管理 Playwright journey 已覆盖登录后从菜单进入合同列表、caption 搜索、清空筛选、列表数据和新建合同流程。

---

## 2. 文件范围

| Area            | Files                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract list   | `apps/poms-admin/src/app/features/contract/contract-list.ts`                                                                                                                            |
| Component tests | `apps/poms-admin/src/app/features/contract/contract-list.spec.ts`                                                                                                                       |
| E2E             | `apps/poms-admin-e2e/src/contract-management.journey.spec.ts`                                                                                                                           |
| Governance      | `docs/design/archive/slices/fe-40-commission-todo-deeplink-g3-g4-closeout.md`、`docs/design/archive/slices/fe-41-contract-list-tabledemo-baseline.md`、本 checkpoint、tracker、progress |

---

## 3. 验证结果

| Check                                                                                                                                              | Result         | Notes                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-list.spec.ts`                                      | Pass           | 6 tests passed，覆盖合同编号展示、TableDemo filter baseline、clear filter 和创建链。  |
| `corepack pnpm nx lint poms-admin`                                                                                                                 | Pass           | All files pass linting。                                                              |
| `corepack pnpm nx build poms-admin`                                                                                                                | Pass           | Production build passed；状态 filter options 已保持严格 `ContractStatus` 字面量类型。 |
| `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/contract-management.journey.spec.ts` | Pass           | 1 test passed，覆盖菜单进入合同列表、caption 搜索 / 清空和新建合同。                  |
| `corepack pnpm run format:md:check`                                                                                                                | Pass           | Markdown tables are formatted。                                                       |
| `git diff --check`                                                                                                                                 | Pass           | No whitespace errors。                                                                |
| `corepack pnpm nx lint poms-admin-e2e`                                                                                                             | Not configured | Nx 当前没有 `poms-admin-e2e:lint` target；E2E 语法通过 Playwright 编译运行覆盖。      |

Playwright webServer 输出 `NX Daemon is not running` 和 inspector port 占用提示，但目标 journey 通过；该提示归类为本机工具环境噪声，不影响本片 G3 判定。

---

## 4. Drift 判断

| Edge                   | Result    | Notes                                                                                        |
| ---------------------- | --------- | -------------------------------------------------------------------------------------------- |
| Document -> code       | Pass      | 实现遵循 FE-41 G1，只调整合同列表 table interaction baseline。                               |
| UIKit TableDemo -> UI  | Pass      | 合同列表采用 caption / clear / global search / column filter / rowHover / scroll/min-width。 |
| API / generated client | No change | 不需要 `shared-api-client:check`。                                                           |
| Contract command       | No change | 新建合同流程保持原 request shape。                                                           |
| Permission / guard     | No change | 不改变 `/contracts` route guard 或权限模型。                                                 |
| Persistence            | No change | 不涉及 DDL / migration。                                                                     |

---

## 5. 例外与风险

| ID                                   | Status   | Decision                                                             |
| ------------------------------------ | -------- | -------------------------------------------------------------------- |
| `FE41-R1-CLIENT-SIDE-FILTERING-ONLY` | Accepted | 本片只做 `p-table` 客户端筛选；服务端分页 / 筛选需未来独立切片决策。 |

---

## 6. G3 结论

`FE-41` 满足本地 G3。提交后可进入 G4 close-out；`FE-42` 可在 FE-41 G4 后进入权限与敏感字段可见性回归矩阵。
