# FE-40 提成待办深链与行级上下文收口实施基线包

- Task ID: `FE-40`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-40`
- Upstream: `FE-39`

---

## 1. 背景

`FE-39` 已统一工作台与顶栏待办入口，并把 `CommissionPayout` / `CommissionAdjustment` 待办导向 `/projects/:id/commission/operations`，同时保留以下 query params：

1. `payoutId`
2. `adjustmentId`
3. `approvalRecordId`

当前 operations 页已有最小行高亮能力，但仍不足以作为完整的待办深链体验：

1. 页面只读取初始 snapshot query params，未形成稳定的深链上下文模型。
2. `approvalRecordId` 没有在页面中解释，用户无法确认自己从哪个审批待办进入。
3. 行高亮缺少页面级上下文提示；当目标行不存在时，页面没有明确解释。
4. E2E 已验证从工作台 / 顶栏能进入提成 operations，但还没有验证 operations 页内部的待办上下文和目标行。

---

## 2. G1 范围

### In Scope

1. 在 `ProjectCommission` operations 页消费 `payoutId`、`adjustmentId`、`approvalRecordId` query params。
2. 建立页面级 deep-link context，明确展示：
   - 来源为待办入口；
   - target 类型为提成发放或提成调整；
   - 目标对象 ID；
   - 审批记录 ID；
   - 若 `AuthStore.myTodos()` 中存在匹配待办，则展示待办标题、目标标题或当前节点。
3. 保留并收紧目标行高亮，避免 payout / adjustment 两类 target 同时混淆。
4. 当 query param 指向的目标行不存在时，给出可见提示，而不是只显示空高亮。
5. 支持浏览器直接访问与从工作台 / 顶栏进入两类路径。
6. 补充 focused unit 或 component tests，覆盖 deep-link context 派生逻辑。
7. 补充 Playwright E2E，覆盖登录后从正式入口进入提成待办并落到 operations 页的行级上下文。

### Out Of Scope

1. 不新增后端 API、DTO、generated client、permission key 或 DDL。
2. 不改变提成发放、登记、调整、审批、拒绝、重提等业务命令。
3. 不重构提成操作表格的 TableDemo 交互基线；该范围已在此前 review 中记录，后续另片处理。
4. 不实现审批详情抽屉、审批流图或审批命令处理。
5. 不处理跨页面权限 / 敏感字段完整矩阵；该范围属于 `FE-42`。

---

## 3. 正式输入

| 输入            | 文件 / 证据                                                         | 当前事实                                                                               | FE-40 使用方式                              |
| --------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| Tracker         | `phase2-development-execution-tracker.md`                           | `FE-40` 已由 `FE-38` 创建为 `Todo / G0`。                                              | 本基线通过后转为 `Doing / G1`。             |
| FE-39 runtime   | `todo-navigation.ts`                                                | 提成待办生成 operations route 和 query params。                                        | 作为深链 URL 输入。                         |
| FE-39 G4        | `fe-39-workbench-todo-entry-g3-g4-closeout.md`                      | FE-39 已提交并关闭。                                                                   | 作为进入 FE-40 的上游证据。                 |
| Operations page | `apps/poms-admin/src/app/features/commission/project-commission.ts` | 已有 `highlightedPayoutId` / `highlightedAdjustmentId` 信号和行级 class。              | 在此基础上补上下文、缺失提示和验证。        |
| Auth store      | `libs/admin/data-access/src/lib/auth/auth.store.ts`                 | `myTodos()` 提供待办 title、target、source、current node 等摘要字段。                  | 用于匹配当前 deep-link 对应的审批待办摘要。 |
| Generated DTO   | `TodoItemSummary`                                                   | `targetObjectType`、`targetObjectId`、`sourceType`、`sourceId`、`projectId` 均已存在。 | 不新增 DTO；前端只做投影解释。              |

---

## 4. 数据与状态边界

### 4.1 Query Params

| Param              | Required For                  | Meaning                                 |
| ------------------ | ----------------------------- | --------------------------------------- |
| `payoutId`         | `CommissionPayout` target     | 需要定位的提成发放行。                  |
| `adjustmentId`     | `CommissionAdjustment` target | 需要定位的提成调整行。                  |
| `approvalRecordId` | optional                      | 待办来源审批记录 ID，仅用于上下文解释。 |

若同时存在 `payoutId` 与 `adjustmentId`，页面优先保留两者中实际匹配当前表数据的一项；若两者都匹配，按 URL 中的显式 target context 展示冲突提示，不执行自动业务动作。

### 4.2 Todo Matching

| Target     | Matching Rule                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Payout     | `todo.targetObjectType === 'CommissionPayout' && todo.targetObjectId === payoutId`                                    |
| Adjustment | `todo.targetObjectType === 'CommissionAdjustment' && todo.targetObjectId === adjustmentId`                            |
| Approval   | 当 `approvalRecordId` 存在时，优先匹配 `todo.sourceType === 'ApprovalRecord' && todo.sourceId === approvalRecordId`。 |

匹配不到待办不阻塞 deep-link。页面仍应展示 target ID 与目标行状态；只是不展示待办标题 / 当前节点等摘要。

---

## 5. UI 与交互边界

1. 页面顶部或目标表格前应出现轻量上下文提示，说明当前是从待办进入。
2. 目标行应有稳定高亮 class，不依赖 hover 或瞬时 toast。
3. 目标行不存在时，应显示 warning/info 反馈，提示该待办目标可能已处理、被过滤或数据未同步。
4. 不使用 Tailwind 手搓新控件；优先复用现有 PrimeNG / 项目共享反馈组件。
5. 本片不引入自动业务提交，也不在进入页面时改变待办状态。

---

## 6. 文件影响范围

Expected runtime files:

1. `apps/poms-admin/src/app/features/commission/project-commission.ts`
2. `apps/poms-admin/src/app/features/commission/project-commission.spec.ts` 或等价 focused test 文件
3. `apps/poms-admin-e2e/src/workbench-todo-entry.journey.spec.ts` 或新增 focused journey

Expected docs:

1. `docs/design/archive/slices/fe-40-commission-todo-deeplink-baseline.md`
2. `docs/design/archive/slices/fe-40-commission-todo-deeplink-g3-checkpoint.md`
3. `docs/design/phase2-development-execution-tracker.md`
4. `docs/design/poms-design-progress.md`

---

## 7. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm nx lint poms-admin`
3. `corepack pnpm nx build poms-admin`
4. Focused admin test for deep-link context projection.
5. Targeted Playwright E2E covering:
   - login 后从工作台或顶栏待办进入 `/projects/:id/commission/operations`
   - URL 中存在 `payoutId` 或 `adjustmentId`
   - 页面显示待办上下文
   - 目标行被高亮或缺失时给出可见提示

Not required unless implementation touches the corresponding layer:

1. `shared-api-client:check`：不改 API / generated client。
2. `poms-api` lint / build / test：不改后端。
3. `migration-check`：不改 DDL。

---

## 8. 例外与风险

| ID                                 | Level | Scope              | Owner | Cleanup Due               | Decision                                                                  |
| ---------------------------------- | ----- | ------------------ | ----- | ------------------------- | ------------------------------------------------------------------------- |
| `FE40-R1-APPROVAL-SUMMARY-LIMITED` | Low   | Approval context   | Codex | 后续审批详情页 / 抽屉切片 | Accepted for FE-40：本片只解释待办摘要与审批记录 ID，不展开完整审批流。   |
| `FE40-R2-TODO-TARGET-STRING`       | Low   | Todo target typing | Codex | 后端 target enum 治理切片 | Accepted for FE-40：继续复用 FE-39 的显式 target 白名单，不扩大后端契约。 |

---

## 9. G1 结论

`FE-40` 可以进入 frontend implementation。

冻结条件:

1. 不新增后端接口、DTO、generated client、permission key 或 DDL。
2. 实现只消费 FE-39 已产出的 operations route 和 query params。
3. 页面必须把待办来源、审批记录和目标行状态解释清楚。
4. 若目标行不存在，必须明确提示，而不是静默失败。
