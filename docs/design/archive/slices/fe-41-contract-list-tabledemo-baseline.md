# FE-41 合同列表 TableDemo 交互基线收口实施基线包

- Task ID: `FE-41`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-41`
- Upstream: `FE-38`

---

## 1. 背景

`FE-38` 盘点确认合同列表已经具备 `p-table`、分页、排序、全局搜索和 action menu，但仍与 UIKit `TableDemo` 基线存在差距：

1. 搜索位于页面 header，而不是 `p-table` caption。
2. 缺少 `Clear filter` 入口。
3. 缺少列级 filter。
4. 缺少 `rowHover`、`responsiveLayout="scroll"` 与稳定 `min-width`。
5. 缺少稳定 `loadingbody`。

项目列表、线索列表和提成操作表格已经在此前切片中采用 `p-table caption / globalFilterFields / p-columnFilter / clear / paginator / rowHover / scroll` 的模式；合同列表应对齐同一交互基线。

---

## 2. G1 范围

### In Scope

1. 将合同列表搜索迁入 `p-table` caption。
2. 增加 `清空筛选` 按钮，调用 `Table.clear()` 并重置本地搜索值 / 页码。
3. 保留并明确 `globalFilterFields`，覆盖合同编号、客户合同编号、项目、客户、状态和币种。
4. 增加列级 filter：
   - POMS 合同编号：text filter；
   - 客户合同编号：text filter；
   - 项目名称：text filter；
   - 客户名称：text filter；
   - 状态：PrimeNG `p-select` equals filter。
5. 增加 `rowHover`、`showGridlines`、`responsiveLayout="scroll"` 与表格 `min-width`。
6. 增加稳定 `loadingbody` 和保持稳定 empty state。
7. 保留现有新建合同 dialog、项目选择器、系统生成 POMS 合同编号提示和行操作 menu。
8. 补充 component test，覆盖 caption 搜索 / clear filter 基线与列级 filter 元素。
9. 补充或扩展合同管理 Playwright journey，覆盖登录后从菜单进入合同列表并能看到 caption 搜索 / clear filter / 表格数据。

### Out Of Scope

1. 不新增后端 API、DTO、generated client、permission key 或 DDL。
2. 不把筛选状态同步到 URL query params。
3. 不改合同创建 / 编辑 / 审批命令语义。
4. 不改合同详情页。
5. 不做服务端分页、服务端筛选或服务端排序。
6. 不改变敏感字段策略；完整权限和敏感字段矩阵属于 `FE-42`。

---

## 3. 正式输入

| 输入              | 文件 / 证据                                                                 | 当前事实                                                                                                  | FE-41 使用方式                            |
| ----------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Tracker           | `phase2-development-execution-tracker.md`                                   | `FE-41` 已由 `FE-38` 创建为 `Todo / G0`。                                                                 | 本基线通过后转为 `Doing / G1`。           |
| FE-38 sweep       | `fe-38-frontend-backlog-sweep-g1-g3.md`                                     | 合同列表缺 caption / clear / column filter / rowHover / scroll min-width / loadingbody。                  | 作为本片问题来源。                        |
| UIKit TableDemo   | `apps/poms-admin/src/app/demo/uikit/tabledemo.ts`                           | 参考模式为 caption 承载 clear + global search，列头承载 `p-columnFilter`，表格具备 paginator / rowHover。 | 作为 table interaction SSOT。             |
| Project list      | `apps/poms-admin/src/app/features/project/project-list.ts`                  | 已采用 POMS 业务页面版本的 TableDemo baseline。                                                           | 作为本仓业务页面实现参考。                |
| Lead list         | `apps/poms-admin/src/app/features/lead/lead-list.ts`                        | 已采用 caption / clear / column filter / PrimeNG select status filter。                                   | 作为状态筛选和 clear pattern 参考。       |
| Contract list     | `apps/poms-admin/src/app/features/contract/contract-list.ts`                | 当前搜索仍在外层 header，已有 `p-table`、paginator、sort、global filter 和 action menu。                  | 本片只调整表格交互层。                    |
| Contract E2E      | `apps/poms-admin-e2e/src/contract-management.journey.spec.ts`               | 已覆盖登录后从菜单进入合同管理并创建合同。                                                                | 扩展验证表格 caption / clear / 数据入口。 |
| Contract contract | `libs/shared/contracts/src/lib/shared-contracts.ts`、generated client files | 合同列表 DTO 已包含本片所需字段；不需要新增 API。                                                         | 只消费现有 `ContractSummary`。            |

---

## 4. 数据与路由边界

| Boundary             | Decision                                                              |
| -------------------- | --------------------------------------------------------------------- |
| Route                | 保持 `/contracts` 不变。                                              |
| API                  | 继续使用现有 `ContractStore.loadContracts()` / `GET /api/contracts`。 |
| Filtering            | 仅在 PrimeNG `p-table` 客户端层处理；不新增 query params。            |
| Pagination / Sorting | 继续使用 `p-table` 客户端 paginator 与 sort。                         |
| Permissions          | 不改 route guard；合同列表仍由现有 `contract:read` 入口控制。         |
| Sensitive fields     | 不新增字段；客户合同编号仍按现有列表展示。                            |

---

## 5. UI 基线

合同列表表格应使用以下模式：

1. 页面 header 保留标题和“新建合同”主动作。
2. `p-table` caption 内放置：
   - `清空筛选`；
   - 全局搜索输入。
3. 表格 header 使用 `pSortableColumn` + `p-sortIcon` + `p-columnFilter`。
4. 状态列 filter 使用 PrimeNG `p-select`，不使用原生 select。
5. 表格启用 `rowHover`、`showGridlines`、`responsiveLayout="scroll"` 与 `min-width`。
6. loading 与 empty 均在 `p-table` template 内稳定呈现。

---

## 6. 文件影响范围

Expected runtime files:

1. `apps/poms-admin/src/app/features/contract/contract-list.ts`
2. `apps/poms-admin/src/app/features/contract/contract-list.spec.ts`
3. `apps/poms-admin-e2e/src/contract-management.journey.spec.ts`

Expected docs:

1. `docs/design/archive/slices/fe-40-commission-todo-deeplink-g3-g4-closeout.md`
2. `docs/design/archive/slices/fe-41-contract-list-tabledemo-baseline.md`
3. `docs/design/archive/slices/fe-41-contract-list-tabledemo-g3-checkpoint.md`
4. `docs/design/phase2-development-execution-tracker.md`
5. `docs/design/poms-design-progress.md`

---

## 7. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm run format:md:check`
3. `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-list.spec.ts`
4. `corepack pnpm nx lint poms-admin`
5. `corepack pnpm nx build poms-admin`
6. Targeted Playwright E2E covering:
   - login 后从菜单进入 `/contracts`；
   - 合同列表显示 caption 搜索和清空筛选；
   - 合同数据在表格中可见；
   - 新建合同入口仍可用。

Not required unless implementation touches the corresponding layer:

1. `shared-api-client:check`：不改 API / generated client。
2. `poms-api` lint / build / test：不改后端。
3. `migration-check`：不改 DDL。

---

## 8. 例外与风险

| ID                                   | Level | Scope                  | Owner | Cleanup Due         | Decision                                                              |
| ------------------------------------ | ----- | ---------------------- | ----- | ------------------- | --------------------------------------------------------------------- |
| `FE41-R1-CLIENT-SIDE-FILTERING-ONLY` | Low   | Filtering architecture | Codex | 服务端分页/筛选切片 | Accepted for FE-41：合同列表当前数据量和 API 形态支持前端表格层筛选。 |

---

## 9. G1 结论

`FE-41` 可以进入 frontend implementation。

冻结条件：

1. 不新增或修改后端接口。
2. 不把筛选状态同步进 URL。
3. 优先对齐 UIKit `TableDemo` 与项目 / 线索列表已有业务模式。
4. 保留现有合同创建与项目选择器行为。
