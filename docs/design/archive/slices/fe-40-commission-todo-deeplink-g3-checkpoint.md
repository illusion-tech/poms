# FE-40 提成待办深链与行级上下文收口 G3 Checkpoint

- Task ID: `FE-40`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation
- Baseline: `docs/design/archive/slices/fe-40-commission-todo-deeplink-baseline.md`

---

## 1. 本地交付

`FE-40` 已按 G1 基线完成本地实现：

1. 新增 `commission-todo-deeplink` 纯 helper，集中处理 `payoutId`、`adjustmentId`、`approvalRecordId`、待办摘要和目标行存在性投影。
2. `ProjectCommission` operations 页改为订阅 `queryParamMap`，支持组件复用时的 query param 变化。
3. 页面新增“待办上下文”区块，解释待办来源、目标类型、目标对象、审批记录和当前节点。
4. 发放 / 调整目标行保留稳定高亮，并增加 `data-testid`，用于浏览器入口链验证。
5. 当目标行不存在或 URL 同时携带发放 / 调整目标时，页面显示可见 warning，不静默失败。
6. `workbench-todo-entry` E2E 已从工作台和顶栏真实入口继续验证 operations 页上下文与行高亮。

---

## 2. 文件范围

| Area                | Files                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deep-link helper    | `apps/poms-admin/src/app/features/commission/commission-todo-deeplink.ts`                                                                                                                                                               |
| Helper tests        | `apps/poms-admin/src/app/features/commission/commission-todo-deeplink.spec.ts`                                                                                                                                                          |
| Operations page     | `apps/poms-admin/src/app/features/commission/project-commission.ts`                                                                                                                                                                     |
| E2E                 | `apps/poms-admin-e2e/src/workbench-todo-entry.journey.spec.ts`                                                                                                                                                                          |
| Governance          | `docs/design/archive/slices/fe-39-workbench-todo-entry-g3-g4-closeout.md`、`docs/design/archive/slices/fe-40-commission-todo-deeplink-baseline.md`、本 checkpoint、`phase2-development-execution-tracker.md`、`poms-design-progress.md` |
| Markdown formatting | `docs/design/archive/slices/fe-39-workbench-todo-entry-baseline.md`、`docs/design/archive/slices/fe-39-workbench-todo-entry-g3-checkpoint.md` 仅由 `format:md` 表格格式化脚本改写；无内容语义变更。                                     |

---

## 3. 验证结果

| Check                                                                                                                                               | Result | Notes                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/commission/commission-todo-deeplink.spec.ts`                          | Pass   | 3 tests passed，覆盖发放上下文、目标行缺失、双 query 参数解析。                      |
| `corepack pnpm nx lint poms-admin`                                                                                                                  | Pass   | All files pass linting。                                                             |
| `corepack pnpm nx build poms-admin`                                                                                                                 | Pass   | Production build passed；未引入新的 bundle warning。                                 |
| `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/workbench-todo-entry.journey.spec.ts` | Pass   | 2 tests passed，覆盖工作台发放待办和顶栏调整待办进入 operations 后的上下文与行高亮。 |
| `corepack pnpm run format:md:check`                                                                                                                 | Pass   | 先运行 `format:md` 规范化 FE-39 / FE-40 切片表格。                                   |
| `git diff --check`                                                                                                                                  | Pass   | No whitespace errors。                                                               |

Playwright webServer 输出 `NX Daemon is not running` 和 inspector port 占用提示，但 2 条测试均通过；该提示归类为本机工具环境噪声，不影响本片 G3 判定。

---

## 4. Drift 判断

| Edge                    | Result    | Notes                                                                                    |
| ----------------------- | --------- | ---------------------------------------------------------------------------------------- |
| Document -> code        | Pass      | 实现遵循 FE-40 G1，只做 operations 页 deep-link context、行高亮和入口链验证。            |
| FE-39 URL -> FE-40 page | Pass      | `payoutId` / `adjustmentId` / `approvalRecordId` 已在 operations 页消费并可解释。        |
| DTO / contract          | No change | `TodoItemSummary.targetObjectType` 仍为 string；本片继续用显式 target 匹配，不扩大契约。 |
| API / generated client  | No change | 不需要 `shared-api-client:check`。                                                       |
| Permission / guard      | No change | 目标页面仍由既有 route guard 控制，本片不改变权限模型。                                  |
| Persistence             | No change | 不涉及 DDL / migration。                                                                 |

---

## 5. 例外与风险

| ID                                 | Status   | Decision                                                                |
| ---------------------------------- | -------- | ----------------------------------------------------------------------- |
| `FE40-R1-APPROVAL-SUMMARY-LIMITED` | Accepted | 本片只展示待办摘要与审批记录 ID，不展开完整审批流。                     |
| `FE40-R2-TODO-TARGET-STRING`       | Accepted | 后端 target 类型仍为 string；本片沿用显式 target 匹配，不扩大后端契约。 |

---

## 6. G3 结论

`FE-40` 满足本地 G3。提交后可进入 G4 close-out；`FE-42` 的权限与敏感字段可见性回归矩阵仍需等待 `FE-41` 合同列表 TableDemo 收口后再统一进入。
