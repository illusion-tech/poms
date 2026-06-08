# EX-71C 客户工作台页面信息架构打磨实施基线包

## Gate Status

- Gate: G1
- Slice Type: frontend-only
- Owner: Codex
- G1 Date: 2026-06-08
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-71C`
- Parent Inputs: `FE-64` 客户工作台信息架构、`EX-71A` 聚合读模型、`EX-71B` 推荐动作与动态时间线、用户要求开始客户工作台页面信息架构打磨

## Scope

- 本次目标: 打磨 Admin 客户工作台页面信息架构，让首屏优先呈现客户身份、关键经营数字、下一步动作和客户动态，并降低低频档案信息对页面纵向空间的占用。
- 下游可依赖的交付边界: `/customers/:id` 客户工作台继续消费既有客户详情和 `CustomerWorkspaceOverviewView`，但页面组织收口为“客户摘要 / 分区导航 / 经营工作台 / 客户档案 / 客户关系 / 讨论 / 跟进 / 附件”。
- 不允许下游依赖的留白: 不新增或修改 API、DTO、OpenAPI、generated client、后端查询、数据库、权限或路由；不在前端重新拼接跨表聚合；不引入兼容旧布局的双实现。

## Frozen Inputs

| Input Type                  | Source                                                            | Frozen Value        | Status | Notes                                              |
| --------------------------- | ----------------------------------------------------------------- | ------------------- | ------ | -------------------------------------------------- |
| Business design             | User request                                                      | 客户工作台 IA 打磨  | frozen | 站在用户操作路径优化，而不是新增业务能力           |
| Existing route              | `apps/poms-admin/src/app/app.routes.ts`                           | `/customers/:id`    | frozen | 路由不变                                           |
| Frontend component boundary | `apps/poms-admin/src/app/features/customer/customer-workspace.ts` | `CustomerWorkspace` | frozen | 本片只改页面组织、文案和局部呈现                   |
| Read model                  | `CustomerWorkspaceOverviewView`                                   | existing fields     | frozen | 复用 `summary` / `recommendedActions` / `timeline` |
| Shared panels               | Customer relation, discussion, follow-up, attachment panels       | existing components | frozen | 不把共享组件内聚合逻辑复制到工作台                 |

## Route / API Boundary

| Public Route | Inventory Status | Action                                    |
| ------------ | ---------------- | ----------------------------------------- |
| N/A          | N/A              | 本片不新增、修改或删除 public API route。 |

`docs/design/api-route-canonical-inventory.md` 无需更新。

## UI Boundary

| Area         | Before                                     | After                                              |
| ------------ | ------------------------------------------ | -------------------------------------------------- |
| Header       | 客户身份和操作                             | 客户身份、主责信息、编辑 / 审计入口、关键经营数字  |
| Metrics      | 独立指标卡                                 | 折叠为 header 内紧凑事实，减少一层页面堆叠         |
| Overview     | 经营概览、推荐动作、四列事实、动态串行堆叠 | 经营工作台: 左侧下一步动作和经营事实，右侧客户动态 |
| Profile      | 基础档案和客户别名分为两个卡片             | 合并为客户档案区，用内部分隔表达主档和别名         |
| Lower panels | 依次长列表堆叠                             | 保留共享面板职责，增加分区导航改善可达性           |

## DRY / SOLID Guardrails

- `DRY-1`: 推荐动作、动态、经营数字仍只来自 `CustomerWorkspaceOverviewView`，前端不复制后端规则或排序语义。
- `DRY-2`: 客户关系、讨论、跟进、附件继续复用既有共享面板，不在客户工作台重新实现面板逻辑。
- `SOLID-1`: `CustomerWorkspace` 负责页面编排和交互锚点，不承担跨对象查询、写侧业务规则或权限规则。
- `SOLID-2`: 低频档案维护仍归属客户主档和别名操作，经营工作台只承担发现和跳转。

## Validation Plan

- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-workspace`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm run format:md`
- `corepack pnpm run format:md:check`
- `git diff --check`
- Browser smoke on `/customers/11000000-0000-4000-8000-000000000001` when local dev servers are available.

## G1 Decision

`EX-71C` 可以进入实现。本片为 frontend-only 信息架构打磨，冻结为不改变后端契约、不改变 API surface、不改变 generated client、不改变数据模型和权限；以客户工作台页面层级、focused tests、Admin lint/build、Markdown 和 diff check 作为 G3 验证边界。

## G3 Local Checkpoint

- Result: Pass
- Scope Delivered: 客户工作台首屏去掉独立指标卡，关键经营数字内嵌到客户摘要；新增分区导航；经营区重组为“下一步动作 / 经营事实 / 客户动态”；基础档案和客户别名合并为客户档案区；共享客户关系、讨论、跟进和附件面板继续复用既有组件。
- API / Contract / DB Impact: N/A，本片未修改 API route、DTO、OpenAPI、generated client、后端、数据库、权限或路由。
- Tests:
  - `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-workspace` — Pass
  - `corepack pnpm nx lint poms-admin` — Pass
  - `corepack pnpm nx build poms-admin` — Pass
  - `corepack pnpm run format:md` — Pass, formatted touched docs
  - `corepack pnpm run format:md:check` — Pass
  - `git diff --check` — Pass
- Browser Evidence: Playwright smoke opened `http://127.0.0.1:4302/customers/11000000-0000-4000-8000-000000000001` at 1440px width and verified `经营工作台`、`下一步动作`、`经营事实`、`客户动态`、`客户档案`、`客户关系`、`业务讨论`、`销售跟进`、`客户附件` all rendered without page error; `客户动态` heading was in the first-screen working area. Screenshot: `dist/playwright/ex71c-customer-workspace.png`.
- G4 Status: Not yet marked Done because this local work has not been committed.
