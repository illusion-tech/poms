# FE-38 前端 Backlog Sweep 与后续切片建档 G1/G3 记录

- Task ID: `FE-38`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend governance / docs-only
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-38`

---

## 1. 目标

`FE-37` 关闭后，前端执行板已经没有开放切片。`FE-38` 的目标不是继续编码，而是基于当前代码事实重新盘点正式前端入口，创建下一批可执行 frontend backlog。

本片输出:

1. 明确哪些前端缺口应进入 tracker。
2. 明确哪些历史例外 / future boundary 不应在没有产品化决策时强行进入 tracker。
3. 为 `FE-39+` 提供 `G0` 切片定义，后续每片仍需单独 `G1` 冻结后才能编码。

---

## 2. 事实输入

| 输入         | 文件 / 证据                                                                                                                  | 当前事实                                                                                                                                                                                       | 结论                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 正式路由     | `apps/poms-admin/src/app.routes.ts`                                                                                          | 正式业务入口为 `/dashboard`、`/leads`、`/projects`、`/contracts`、`/profile`、`/platform/*`；项目工作区和提成工作区已进入正式 route tree。                                                     | 后续前端 backlog 应围绕正式业务入口，不把 demo/template 页面混入主线。                       |
| 正式导航     | `apps/poms-api/src/app/features/navigation/navigation.constants.ts`、`apps/poms-admin/src/app/layout/components/app.menu.ts` | 动态导航和静态 fallback 都只暴露工作台、线索、项目、合同、平台配置和个人中心。                                                                                                                 | `landing` / `cms` / `mail` / `chat` / `files` / `tasklist` / uikit demo 当前不是用户导航面。 |
| 工作台       | `apps/poms-admin/src/app/features/dashboard/workbench.ts`                                                                    | `/dashboard` 已消费 `ProjectStore` 与 `AuthStore.myTodos()`，但待办跳转逻辑在组件内本地实现。                                                                                                  | 工作台已经是正式入口，应产品化为 POMS 业务工作台，而不是继续作为轻量 dashboard。             |
| 顶栏待办     | `apps/poms-admin/src/app/layout/components/app.topbar.ts`                                                                    | 顶栏待办只支持 `Contract` / `Project`，未覆盖 `CommissionPayout` / `CommissionAdjustment`。                                                                                                    | 待办入口存在跨组件行为不一致，需要独立切片统一。                                             |
| 提成待办深链 | `workbench.ts`、`project-commission.ts`、`app.routes.ts`                                                                     | 工作台把 `payoutId` / `adjustmentId` 放入 query params，但跳到 `/projects/:id/commission`；`ProjectCommission` 只在 `/projects/:id/commission/operations` 读取并高亮这些 query params。        | 当前存在可验证的深链断点，应单独收口。                                                       |
| 合同列表     | `apps/poms-admin/src/app/features/contract/contract-list.ts`                                                                 | 合同列表已有 `p-table`、paginator、sort、global filter 和 action menu，但搜索仍在表格外层 header，缺少 table caption / clear filter / column filter / scroll min-width / rowHover 的统一基线。 | 合同列表应补一个 TableDemo 交互基线切片。                                                    |
| E2E          | `apps/poms-admin-e2e/src/*.spec.ts`                                                                                          | 项目工作区、合同管理、线索 bootstrap、平台治理已有 journey / smoke；未看到从工作台/顶栏待办进入提成操作行级上下文的覆盖。                                                                      | 后续必须补真实登录入口链，而不只测 direct URL。                                              |

---

## 3. 不进入本轮 Tracker 的事项

| 事项                                                  | 判断       | 原因                                                                         |
| ----------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| Poseidon demo / uikit severity literal                | 不新增切片 | `FE-37` 已判定保留为组件 API 示例；只有产品化或模板移除时再治理。            |
| landing / cms / mail / chat / files / tasklist 模板页 | 不新增切片 | 当前正式路由和正式导航没有暴露这些页面，强行清理会制造无业务收益的 churn。   |
| `FE36-E1` actor display-name enrichment               | 不新增切片 | 当前 DTO 只有 actor ID；姓名 enrichment 需要后端 / 用户投影产品决策。        |
| `FE36-E2` 字段级 diff                                 | 不新增切片 | 当前用户需求只到版本链和 metadata；字段级 diff 应等待审计体验决策。          |
| `FE36-E3` restore / revert command                    | 不新增切片 | 当前后端只支持 append replacement；这是后端 command 能力，不是单独前端切片。 |

---

## 4. 新增 Backlog 切片

| Task ID | 切片                                 | 状态        | 说明                                                                                                              |
| ------- | ------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `FE-39` | 工作台业务入口产品化与待办入口一致性 | `Todo / G0` | 将 `/dashboard` 冻结为 POMS 业务工作台，统一工作台和顶栏待办跳转行为，补真实入口 E2E。                            |
| `FE-40` | 提成待办深链与行级上下文收口         | `Todo / G0` | 修正 `CommissionPayout` / `CommissionAdjustment` 待办进入 operations 的路径、query params、行高亮与审批上下文。   |
| `FE-41` | 合同列表 TableDemo 交互基线收口      | `Todo / G0` | 按 UIKit table demo 基线补 caption / clear / column filter / rowHover / scroll min-width / stable loading empty。 |
| `FE-42` | 前端权限与敏感字段可见性回归矩阵     | `Todo / G0` | 围绕工作台、项目、合同、线索、提成关键入口补 admin / viewer / anonymous 与敏感字段可见性回归。                    |

---

## 5. Gate 结论

| Gate | 结论                                                                                       |
| ---- | ------------------------------------------------------------------------------------------ |
| `G1` | Pass for governance-only sweep. 本片只创建 backlog，不写 runtime code。                    |
| `G2` | Not applicable. 无代码设计实现。                                                           |
| `G3` | Pass locally after tracker / progress / this record are updated and docs-only checks pass. |
| `G4` | Pending commit. 提交后才能把 `FE-38` 标记为 `Done / G4`。                                  |

---

## 6. 测试与校验计划

Docs-only:

1. `corepack pnpm exec prettier --check docs/design/phase2-development-execution-tracker.md docs/design/poms-design-progress.md docs/design/archive/slices/fe-38-frontend-backlog-sweep-g1-g3.md`
2. `git diff --check`

Runtime lint / build 不适用，因为本片不改 runtime code。

---

## 7. G3 结论

`FE-38` 已完成前端 backlog sweep，并把下一批正式前端任务收敛为 `FE-39` 到 `FE-42`。后续应优先进入 `FE-39` 的 `G1`，因为工作台是登录后的默认入口，且顶栏 / 工作台待办行为不一致会直接影响用户从任务进入业务上下文。
