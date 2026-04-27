# FE-39 工作台业务入口产品化与待办入口一致性 G4 Close-out

- Task ID: `FE-39`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation
- Baseline: `docs/design/archive/slices/fe-39-workbench-todo-entry-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-39-workbench-todo-entry-g3-checkpoint.md`
- Runtime Commit: `59cf46a feat(admin): 完成 FE-39 工作台待办入口前端闭环`

---

## 1. G4 结论

`FE-39` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. `/dashboard` 继续作为 POMS 登录后业务工作台。
2. `Workbench` 与 `AppTopbar` 已统一消费 `todo-navigation` helper。
3. `Contract`、`Project`、`CommissionPayout`、`CommissionAdjustment` 待办 target 已进入显式白名单。
4. 提成待办进入 `/projects/:id/commission/operations`，并保留 `payoutId` / `adjustmentId` / `approvalRecordId` query params。
5. 未知 target 或缺少项目上下文时，前端给出不可打开原因，不静默跳转。

---

## 2. 提交证据

| Evidence         | Result                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------- |
| Commit           | `59cf46a feat(admin): 完成 FE-39 工作台待办入口前端闭环`                               |
| Runtime files    | `todo-navigation.ts`、`Workbench`、`AppTopbar`、`workbench-todo-entry.journey.spec.ts` |
| Governance files | FE-39 baseline、G3 checkpoint、tracker、progress                                       |
| Tracker update   | 本 close-out 后将 `FE-39` 标记为 `Done / G4`                                           |

---

## 3. G3 验证回放

G3 已在本地 checkpoint 记录，结果如下：

| Check                                                                                                                                               | Result |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/shared/navigation/todo-navigation.spec.ts`                                     | Pass   |
| `corepack pnpm nx lint poms-admin`                                                                                                                  | Pass   |
| `corepack pnpm nx build poms-admin`                                                                                                                 | Pass   |
| `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/workbench-todo-entry.journey.spec.ts` | Pass   |
| `git diff --check`                                                                                                                                  | Pass   |
| Prettier check                                                                                                                                      | Pass   |

`shared-api-client:check`、`poms-api` lint / build / test 与 `migration-check` 不适用：本片未修改后端 API、generated client、权限模型或 DDL。

---

## 4. Drift 与例外

| Item                               | Status            | Decision                                                                           |
| ---------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| Route drift                        | Closed            | FE-39 已把提成待办入口统一到 `/projects/:id/commission/operations`。               |
| `FE39-R1-TODO-TARGET-PLAIN-STRING` | Accepted boundary | `TodoItemSummary.targetObjectType` 仍为 string；前端用显式白名单收敛，不扩大契约。 |

未发现本片新增 API / DTO / permission / persistence drift。

---

## 5. 下游承接

`FE-40` 可依赖本片产出的 URL 与 query params，继续处理提成 operations 页内部的行级上下文、审批解释和浏览器入口链验证。
