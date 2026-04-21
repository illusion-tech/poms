# FE-17 项目管理 PrimeNG 与表格体验基线纠偏实施基线

- Gate Status: `Pass`
- Parent: `FE-16`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-22`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-17`

## 1. 范围

- 本次目标:
  1. 统一关闭项目管理前端 8 条 PrimeNG / UIKit table demo 审查发现。
  2. 将项目列表筛选迁入 `p-table` caption，并采用 PrimeNG `Select` / table clear / global filter 交互。
  3. 抽出项目工作区与提成工作区共用的 PrimeNG 导航组件，不再在壳层内手写 tab-like anchor。
  4. 抽出工作区动作链接和 loading 反馈组件，页面内路由入口统一使用 PrimeNG button/link 语义。
  5. 将提成操作页三张表对齐 UIKit table demo 的分页、row hover、滚动宽度、稳定空态 / 加载态和表格搜索基线。
  6. 将发放 / 调整表密集行操作收口为表格操作菜单，避免多按钮直接撑宽表格。
- 本次明确不做:
  1. 不新增、修改或删除后端 API、shared contract、OpenAPI schema 或 generated client。
  2. 不改变提成计算、审批、登记、调整等业务行为。
  3. 不调整项目管理权限矩阵、route guard 或 Playwright 权限断言；这些已由 `FE-16D` 收口。
  4. 不把项目详情 / 工作区 / 提成页的信息架构重新设计为新体验，只做组件基线和表格交互纠偏。

## 2. 审查输入

| Finding                                                          | Priority | Source                                                                                  | G1 Decision                  |
| ---------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| Native selects bypass PrimeNG form controls                      | P2       | `apps/poms-admin/src/app/features/project/project-list.ts`                              | 本片必须修复                 |
| Workspace tabs are hand-rolled anchors                           | P2       | `apps/poms-admin/src/app/features/project/project-workspace-shell.ts`                   | 本片必须修复                 |
| Commission workspace repeats the same custom tab pattern         | P2       | `apps/poms-admin/src/app/features/commission/project-commission-shell.ts`               | 本片必须修复                 |
| Link actions are styled manually instead of PrimeNG buttons      | P3       | `apps/poms-admin/src/app/features/project/project-operating-overview.ts` and peer pages | 本片必须修复代表性工作区入口 |
| Loading and feedback states use raw icon markup                  | P3       | `apps/poms-admin/src/app/features/project/project-workspace-shell.ts` and peer pages    | 本片必须修复代表性 loading   |
| Project table filters are not aligned with UIKit table demo      | P2       | `apps/poms-admin/src/app/features/project/project-list.ts`                              | 本片必须修复                 |
| Commission operation tables lack table-demo interaction baseline | P2       | `apps/poms-admin/src/app/features/commission/project-commission.ts`                     | 本片必须修复                 |
| Dense row actions should use a table action pattern              | P3       | `apps/poms-admin/src/app/features/commission/project-commission.ts`                     | 本片必须修复                 |

## 3. 正式输入

| Input Type                  | Document / Source                                                                            | Status | Notes                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| FE corrective parent        | `docs/design/fe-16-project-management-frontend-corrective-checkpoint.md`                     | done   | 项目管理前端必须按用户任务与业务中文收口                                                      |
| FE routes / guard close-out | `docs/design/fe-16d-project-route-guard-browser-validation-baseline.md`                      | done   | 本片不得改 route guard 语义                                                                   |
| Table SSOT                  | `apps/poms-admin/src/app/demo/uikit/tabledemo.ts`                                            | fact   | 表格 caption、clear、global filter、paginator、rowHover、scroll 和 loading / empty state 基线 |
| Local action menu reference | `apps/poms-admin/src/app/features/user-management/user-list.ts`                              | fact   | `p-menu` 行操作模式参考                                                                       |
| Runtime target              | `apps/poms-admin/src/app/features/project/project-list.ts`                                   | fact   | 项目列表筛选和表格交互需要纠偏                                                                |
| Runtime target              | `apps/poms-admin/src/app/features/project/project-workspace-shell.ts`                        | fact   | 工作区导航和 loading 需要纠偏                                                                 |
| Runtime target              | `apps/poms-admin/src/app/features/commission/project-commission-shell.ts`                    | fact   | 提成工作区导航需要共享组件                                                                    |
| Runtime target              | `apps/poms-admin/src/app/features/commission/project-commission.ts`                          | fact   | 提成操作表格和行操作需要纠偏                                                                  |
| Runtime target              | `apps/poms-admin/src/app/features/project/project-operating-overview.ts` and peer read pages | fact   | 页面动作链接 / loading 需要统一                                                               |

## 4. 本次 SSOT

| Concern         | SSOT                       | Implementation Rule                                                           |
| --------------- | -------------------------- | ----------------------------------------------------------------------------- |
| 表格搜索 / 清空 | UIKit table demo           | `p-table` caption 承载搜索、筛选和 clear filter                               |
| 阶段 / 状态筛选 | PrimeNG `Select`           | 不使用原生 `select` 承载项目管理主筛选                                        |
| 表格增长态      | UIKit table demo           | 增长型表格必须具备 paginator、rowHover、scroll/min-width 与稳定 empty/loading |
| 行操作          | `user-list.ts` action menu | 多动作行使用 `p-menu` overflow，不在窄表格内堆按钮                            |
| 工作区导航      | Shared PrimeNG wrapper     | 项目 / 提成壳层使用同一导航组件和配置，不重复手写 active / disabled 样式      |
| 页面动作链接    | Shared PrimeNG wrapper     | 页面内路由入口保留 anchor 语义，但视觉和焦点行为走 PrimeNG button directive   |
| Loading         | PrimeNG `ProgressSpinner`  | 页面级 loading 不再直接写 `pi-spin pi-spinner` 图标                           |

## 5. 实施切分

| Step | Scope                                                  | Files                                                                                                    |
| ---- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1    | 新增 shared UI wrappers                                | `apps/poms-admin/src/app/shared/ui/workspace-nav.ts`, `workspace-action-link.ts`, `workspace-loading.ts` |
| 2    | 项目列表 table caption / PrimeNG Select / clear filter | `apps/poms-admin/src/app/features/project/project-list.ts`                                               |
| 3    | 项目 / 提成壳层导航和 loading 迁移                     | `project-workspace-shell.ts`, `project-commission-shell.ts`                                              |
| 4    | L4 / L5 读取页动作链接代表性迁移                       | operating / variance / gate / final settlement / rule explanation pages                                  |
| 5    | 提成操作表格基线和行操作菜单                           | `apps/poms-admin/src/app/features/commission/project-commission.ts`                                      |

## 6. 测试与校验要求

| Check            | Required Command                               | Notes                                        |
| ---------------- | ---------------------------------------------- | -------------------------------------------- |
| Diff hygiene     | `git diff --check`                             | 收口前必跑                                   |
| Admin unit tests | `corepack pnpm nx test poms-admin --runInBand` | 覆盖现有项目页 / store / route 测试不回退    |
| Admin lint       | `corepack pnpm nx lint poms-admin`             | Angular template / TS 检查                   |
| Admin build      | `corepack pnpm nx build poms-admin`            | PrimeNG module 与 template 编译              |
| Browser E2E      | `corepack pnpm nx e2e poms-admin-e2e`          | 如本片触及真实入口文本或可访问性选择器则补跑 |

## 7. 例外与风险

| Exception ID                       | Level | Scope                                                                | Cleanup Owner    | Notes                                                                 |
| ---------------------------------- | ----- | -------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| `FE17-E1-FEEDBACK-COMPONENT-SCOPE` | `low` | 本片优先关闭 loading 与动作入口，对所有业务提示框不做全量 Message 化 | 后续 UI 基线治理 | 只要代表性 raw loading 已迁移，剩余业务信息框可按后续页面切片逐步收口 |

- 风险:
  1. 若只替换样式而不迁入 `p-table` caption，项目列表仍会与表格过滤模型割裂。
  2. 若每个壳层继续维护自己的 active / disabled class，后续 FE 切片会继续产生导航漂移。
  3. 若提成操作表不补分页 / 滚动 / 操作菜单，数据增长后会出现可用性和窄屏布局风险。

## 8. G1 结论

- Gate Status: `Pass`
- 结论: 本片具备可编码输入，可进入实现。
- Drift classification: `corrective-implementation-required`
- Public interface impact: `None`
- Required trace before Done: tracker row、G3 checkpoint / validation evidence、G4 close-out evidence。
