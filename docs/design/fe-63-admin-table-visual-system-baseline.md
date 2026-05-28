# FE-63 Admin 表格视觉统一与共享组件基线

**状态**: G3 / Ready for Review

**日期**: 2026-05-28

**Owner**: Codex

**Slice 类型**: frontend-only

**Tracker Link / Row**: `docs/design/phase2-development-execution-tracker.md` / `FE-63`

## 1. 背景

平台配置与业务管理均大量使用表格作为基础业务模块落地形态，但当前 Admin 前端存在两套表格视觉:

1. 用户、角色、组织等较早页面采用整页单卡片、顶部搜索和表格主体分离的视觉。
2. 线索、客户、项目等较新页面采用页面头部、统计摘要、`p-table` caption toolbar 和 8px 表格 surface。

用户已明确希望把表格规范为共享组件，并且视觉应接近用户管理、角色管理这类平台配置表格，同时可借鉴 demo CRUD 顶部 toolbar 的组织方式。

## 2. 本片范围

本片交付 Admin 表格视觉统一的第一阶段基础:

1. 新增共享表格外壳和多功能列表工具栏组件。
2. 将用户管理、角色管理、组织管理迁移到共享组件。
3. 将客户管理、线索管理、项目管理、合同管理的主列表表格迁移到共享 table sheet 与列表工具栏。
4. 保持每个页面继续直接使用 `p-table` 列模板，避免在第一阶段把所有表格封装成不可扩展黑盒。
5. 去掉列表模块内容区的重复大标题；页面身份由顶栏 / 面包屑承担，内容区只保留工具栏、摘要事实和数据承载。
6. 将业务字典、导航治理的标题 / 工具栏形态同步收口，避免平台配置内继续保留旧式标题卡片。

## 3. 不在本片范围

1. 不新增或修改后端 public API route、OpenAPI、generated client、DTO、migration 或权限模型。
2. 不改变用户、角色、组织、客户、线索、项目、合同、业务字典、导航治理的读写行为、表单字段、权限动作和错误语义。
3. 不迁移业务工作区、详情页、提成页、附件 / 审计 / 跟进等内嵌或专用表格；这些表格后续按使用场景评估是否复用同一视觉 token。
4. 不引入批量删除、导出、图片、评分等 demo CRUD 示例业务能力。
5. 不把所有 `p-table` 二次封装成统一数据表组件；复杂表格仍保留各自列、筛选和操作模板。

## 4. 正式输入

| 输入                                                                   | 状态                   | 用途                                   |
| ---------------------------------------------------------------------- | ---------------------- | -------------------------------------- |
| 用户本轮表格统一诉求                                                   | frozen                 | 明确视觉统一目标和共享组件方向         |
| `apps/poms-admin/src/app/demo/crud/crud.ts`                            | reference              | 借鉴 `p-toolbar` start / end 组织方式  |
| `apps/poms-admin/src/app/demo/uikit/tabledemo.ts`                      | reference              | 借鉴 table caption、搜索和清空筛选位置 |
| `docs/design/archive/slices/fe-41-contract-list-tabledemo-baseline.md` | accepted reference     | 既有 TableDemo 交互基线                |
| `apps/poms-admin/src/app/features/user-management/user-list.ts`        | current implementation | 首批迁移页面                           |
| `apps/poms-admin/src/app/features/platform/role-list.ts`               | current implementation | 首批迁移页面                           |
| `apps/poms-admin/src/app/features/platform/org-unit-list.ts`           | current implementation | 首批迁移页面                           |
| `apps/poms-admin/src/app/features/customer/customer-list.ts`           | current implementation | 主列表表格迁移页面                     |
| `apps/poms-admin/src/app/features/lead/lead-list.ts`                   | current implementation | 主列表表格迁移页面                     |
| `apps/poms-admin/src/app/features/project/project-list.ts`             | current implementation | 主列表表格迁移页面                     |
| `apps/poms-admin/src/app/features/contract/contract-list.ts`           | current implementation | 主列表表格迁移页面                     |
| `apps/poms-admin/src/app/features/platform/dictionary-list.ts`         | current implementation | 工具栏参考与同步收口页面               |
| `apps/poms-admin/src/app/features/platform/navigation-governance.ts`   | current implementation | 旧式标题卡片纠偏页面                   |
| `apps/poms-admin/src/app/shared/ui/sectioncard.ts`                     | current shared UI      | 确认不复用 `.card` 的大圆角 page card  |

## 5. 视觉与交互基线

| 项           | 冻结口径                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------- |
| 页面形态     | 顶栏 / 面包屑承担模块标题；内容区第一层是工具栏、摘要事实或数据 sheet，不再重复放模块大标题    |
| 圆角         | 新共享 table sheet 使用 8px，避免继续扩散 `rounded-2xl` / `rounded-3xl`                        |
| 页面头部     | 不新增内容区标题 header；业务管理可保留真正有决策价值的统计摘要和流程提示                      |
| 列表 toolbar | 借鉴业务字典和 CRUD `p-toolbar`，在 sheet 顶部放清空筛选、搜索、局部筛选、刷新、新建和右侧计数 |
| 表格本体     | 继续使用 PrimeNG `p-table`，启用 row hover、paginator、responsive layout 和稳定 `dataKey`      |
| 分隔线       | 默认不使用业务页当前较重的 gridline；后续复杂业务表可按字段密度申请例外                        |
| 行操作       | 第一阶段保留现有页面操作形态；后续再抽象 row action primitive                                  |
| 空状态       | 保持现有空状态文案，不在本片引入新反馈态组件                                                   |

## 6. 共享组件边界

| 组件               | 责任                                                          | 不承担                     |
| ------------------ | ------------------------------------------------------------- | -------------------------- |
| `AdminListShell`   | 提供统一 sheet surface、边框、背景和圆角                      | 不读取数据、不控制表格状态 |
| `AdminListToolbar` | 基于 PrimeNG `p-toolbar` 统一搜索、筛选、刷新、新建和计数布局 | 不实现具体筛选逻辑         |

## 7. 代码边界

| 类型       | 路径                                                                 | 预期变更                       |
| ---------- | -------------------------------------------------------------------- | ------------------------------ |
| Shared UI  | `apps/poms-admin/src/app/shared/ui/admin-list-shell.ts`              | 新增                           |
| Shared UI  | `apps/poms-admin/src/app/shared/ui/admin-list-toolbar.ts`            | 新增                           |
| Feature UI | `apps/poms-admin/src/app/features/user-management/user-list.ts`      | 迁移共享 toolbar / shell       |
| Feature UI | `apps/poms-admin/src/app/features/platform/role-list.ts`             | 迁移共享 toolbar / shell       |
| Feature UI | `apps/poms-admin/src/app/features/platform/org-unit-list.ts`         | 迁移共享 toolbar / shell       |
| Feature UI | `apps/poms-admin/src/app/features/customer/customer-list.ts`         | 迁移主列表共享 toolbar / shell |
| Feature UI | `apps/poms-admin/src/app/features/lead/lead-list.ts`                 | 迁移主列表共享 toolbar / shell |
| Feature UI | `apps/poms-admin/src/app/features/project/project-list.ts`           | 迁移主列表共享 toolbar / shell |
| Feature UI | `apps/poms-admin/src/app/features/contract/contract-list.ts`         | 迁移共享 toolbar / shell       |
| Feature UI | `apps/poms-admin/src/app/features/platform/dictionary-list.ts`       | 移除重复标题，动作并入工具栏   |
| Feature UI | `apps/poms-admin/src/app/features/platform/navigation-governance.ts` | 迁移共享 toolbar / shell       |

## 8. 验证计划

| 检查                | 命令                                                                                                                                                                                                                                          | 预期 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Admin focused tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=user-list --testPathPatterns=customer-list --testPathPatterns=lead-list --testPathPatterns=project-list --testPathPatterns=contract-list --testPathPatterns=dictionary-list` | Pass |
| Admin lint          | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                                            | Pass |
| Admin build         | `corepack pnpm nx build poms-admin`                                                                                                                                                                                                           | Pass |
| Browser visual QA   | in-app browser desktop + 390px mobile for platform and business main list tables, business dictionary, navigation governance                                                                                                                  | Pass |
| Markdown format     | `corepack pnpm run format:md:check`                                                                                                                                                                                                           | Pass |
| Diff sanity         | `git diff --check`                                                                                                                                                                                                                            | Pass |

## 9. Drift 与例外

| ID                                  | 等级 | 范围                               | 处理                                                                     |
| ----------------------------------- | ---- | ---------------------------------- | ------------------------------------------------------------------------ |
| FE63-E1-SPECIALIZED-TABLES-DEFERRED | E1   | 内嵌或专用表格未在第一阶段全部迁移 | 主列表先统一；提成、详情工作区、附件、审计、跟进等专用表格后续按场景评估 |
| FE63-E1-GRIDLINE-COMPAT             | E1   | 复杂业务页仍可能保留 gridlines     | 仅当字段密度或对照阅读需要时保留，默认新共享表格不启用                   |

## 10. G1 结论

`FE-63` 可进入实现。该片为 frontend-only refactor / visual convergence，不改变后端契约、权限模型或数据语义；第一阶段以共享视觉组件、平台配置三张基础列表和业务管理四张主列表表格为可验证边界。

## 11. G3 本地验证结果

| 检查                | 命令                                                                                                                                                                                                                                          | 结果 | 备注                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| Admin focused tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=user-list --testPathPatterns=customer-list --testPathPatterns=lead-list --testPathPatterns=project-list --testPathPatterns=contract-list --testPathPatterns=dictionary-list` | Pass | 6 个列表 spec 通过，43 tests passed                   |
| Admin lint          | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                                            | Pass | No lint errors                                        |
| Admin build         | `corepack pnpm nx build poms-admin`                                                                                                                                                                                                           | Pass | Production build pass                                 |
| Browser visual QA   | in-app browser desktop + 390px mobile for users / roles / org-units / dictionaries / navigation / customers / leads / projects / contracts                                                                                                    | Pass | 内容区重复 `h1` 为 0；桌面和 390px 均无页面级横向溢出 |
| Markdown format     | `corepack pnpm run format:md:check`                                                                                                                                                                                                           | Pass | Docs table formatting pass                            |
| Diff sanity         | `git diff --check`                                                                                                                                                                                                                            | Pass | No whitespace errors                                  |

## 12. G3 结论

`FE-63` 已推进到本地 `G3 / Ready for Review`。共享组件、用户管理、角色管理、组织管理、业务字典、导航治理，以及客户、线索、项目、合同主列表表格均完成第一阶段视觉收敛；内容区重复大标题已移除，模块身份交给顶栏 / 面包屑表达，列表动作统一进入多功能工具栏。移动端继续使用表格内部横向滚动而不是压缩列内容。后续仅将内嵌或专用表格按 `FE63-E1-SPECIALIZED-TABLES-DEFERRED` 保留为独立评估工作。
