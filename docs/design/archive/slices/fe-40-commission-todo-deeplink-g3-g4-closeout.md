# FE-40 提成待办深链与行级上下文收口 G4 Close-out

- Task ID: `FE-40`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation
- Baseline: `docs/design/archive/slices/fe-40-commission-todo-deeplink-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-40-commission-todo-deeplink-g3-checkpoint.md`
- Runtime Commit: `e850415 feat(commission): 完成 FE-40 提成待办深链前端闭环`

---

## 1. G4 结论

`FE-40` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. 提成 operations 页消费 `payoutId`、`adjustmentId`、`approvalRecordId` query params。
2. 页面提供待办上下文区块，解释待办来源、目标类型、目标对象、审批记录和当前节点。
3. 发放 / 调整目标行具备稳定高亮与浏览器测试定位。
4. 目标行缺失或 query 参数冲突时有可见提示，不静默失败。
5. 工作台和顶栏待办入口已通过登录后 Playwright journey 验证。

---

## 2. 提交证据

| Evidence         | Result                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Commit           | `e850415 feat(commission): 完成 FE-40 提成待办深链前端闭环`                                                                        |
| Runtime files    | `commission-todo-deeplink.ts`、`commission-todo-deeplink.spec.ts`、`project-commission.ts`、`workbench-todo-entry.journey.spec.ts` |
| Governance files | FE-39 G4 close-out、FE-40 baseline、FE-40 G3 checkpoint、tracker、progress                                                         |
| Tracker update   | 本 close-out 后将 `FE-40` 标记为 `Done / G4`                                                                                       |

---

## 3. G3 验证回放

G3 已在本地 checkpoint 记录，结果如下：

| Check                                                                                                                                               | Result |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/commission/commission-todo-deeplink.spec.ts`                          | Pass   |
| `corepack pnpm nx lint poms-admin`                                                                                                                  | Pass   |
| `corepack pnpm nx build poms-admin`                                                                                                                 | Pass   |
| `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/workbench-todo-entry.journey.spec.ts` | Pass   |
| `corepack pnpm run format:md:check`                                                                                                                 | Pass   |
| `git diff --check`                                                                                                                                  | Pass   |

`shared-api-client:check`、`poms-api` lint / build / test 与 `migration-check` 不适用：本片未修改后端 API、generated client、权限模型或 DDL。

---

## 4. Drift 与例外

| Item                               | Status            | Decision                                                               |
| ---------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| Route / query drift                | Closed            | FE-39 产出的 operations URL 已由 FE-40 页面消费并解释。                |
| `FE40-R1-APPROVAL-SUMMARY-LIMITED` | Accepted boundary | 本片只展示待办摘要与审批记录 ID，不展开完整审批流。                    |
| `FE40-R2-TODO-TARGET-STRING`       | Accepted boundary | `TodoItemSummary.targetObjectType` 仍为 string；前端显式 target 匹配。 |

未发现本片新增 API / DTO / permission / persistence drift。

---

## 5. 下游承接

`FE-42` 可以在 `FE-41` 完成后依赖本片验证提成待办入口、operations 页上下文和目标行可见性。`FE-41` 不依赖 FE-40，可独立进入合同列表 TableDemo 收口。
