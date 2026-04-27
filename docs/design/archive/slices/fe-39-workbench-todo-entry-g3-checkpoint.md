# FE-39 工作台业务入口产品化与待办入口一致性 G3 Checkpoint

- Task ID: `FE-39`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation
- Baseline: `docs/design/archive/slices/fe-39-workbench-todo-entry-baseline.md`

---

## 1. 本地交付

`FE-39` 已按 G1 基线完成本地实现:

1. 新增共享待办导航解析器 `todo-navigation.ts`，以显式白名单解析 `TodoItemSummary.targetObjectType`。
2. `Workbench` 与 `AppTopbar` 均改为消费同一个 helper，不再各自维护不同路由分支。
3. `CommissionPayout` / `CommissionAdjustment` 待办统一进入 `/projects/:id/commission/operations`，并保留 `payoutId` / `adjustmentId` / `approvalRecordId` query params。
4. 缺少 `projectId` 或未知 target 类型的待办不会静默跳错页面，而是显示不可打开原因。
5. 顶栏待办触发入口补充 `aria-label="待办事项"`，便于真实入口 E2E 和辅助技术识别。

---

## 2. 文件范围

| Area | Files |
| --- | --- |
| Navigation helper | `apps/poms-admin/src/app/shared/navigation/todo-navigation.ts` |
| Unit tests | `apps/poms-admin/src/app/shared/navigation/todo-navigation.spec.ts` |
| Workbench | `apps/poms-admin/src/app/features/dashboard/workbench.ts` |
| Topbar | `apps/poms-admin/src/app/layout/components/app.topbar.ts` |
| E2E | `apps/poms-admin-e2e/src/workbench-todo-entry.journey.spec.ts` |
| Governance | `docs/design/archive/slices/fe-39-workbench-todo-entry-baseline.md`、本 checkpoint、tracker、progress |

---

## 3. 验证结果

| Check | Result | Notes |
| --- | --- | --- |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/shared/navigation/todo-navigation.spec.ts` | Pass | 6 tests passed，覆盖 Project / Contract / CommissionPayout / CommissionAdjustment / unknown target / missing project context。 |
| `corepack pnpm nx lint poms-admin` | Pass | No lint errors。 |
| `corepack pnpm nx build poms-admin` | Pass | Production build passed。 |
| `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/workbench-todo-entry.journey.spec.ts` | Pass | 2 tests passed，覆盖菜单进入工作台、工作台待办进入 Project / Contract / Commission、顶栏待办进入 CommissionAdjustment。 |
| `git diff --check` | Pass | No whitespace errors。 |
| Prettier check | Pass | Touched TS / E2E / Markdown files all match Prettier style。 |

Playwright webServer 输出 `NX Daemon is not running` 和 inspector port 占用提示，但 2 条测试均通过；该提示归类为本机工具环境噪声，不影响本片 G3 判定。

---

## 4. Drift 判断

| Edge | Result | Notes |
| --- | --- | --- |
| Document -> code | Pass | 实现遵循 FE-39 G1，只做 shared helper、Workbench、Topbar 和 E2E。 |
| Route -> target | Pass | 提成待办已进入正式 `/projects/:id/commission/operations` route。 |
| DTO / contract | No change | `TodoItemSummary.targetObjectType` 仍为 string；前端通过白名单 helper 收敛。 |
| API / generated client | No change | 不需要 `shared-api-client:check`。 |
| Permission / guard | No change | helper 只构造 route，不绕过既有 route guard。 |
| Persistence | No change | 不涉及 DDL / migration。 |

---

## 5. 例外与风险

| ID | Status | Decision |
| --- | --- | --- |
| `FE39-R1-TODO-TARGET-PLAIN-STRING` | Accepted | 后端 target 类型仍为 string；FE-39 用显式白名单 helper 控制前端可导航范围，不扩大契约。 |

---

## 6. G3 结论

`FE-39` 满足本地 G3。提交后可进入 G4 close-out；`FE-40` 可依赖本片提供的 operations URL 和 query params 继续处理提成操作页的行级上下文、滚动和审批解释。
