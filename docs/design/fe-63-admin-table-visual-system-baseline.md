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

本片交付 Admin 表格视觉统一的第一阶段基础，并在用户浏览器验收反馈后补充 surface / toolbar 视觉收口:

1. 新增共享表格外壳和多功能列表工具栏组件。
2. 将用户管理、角色管理、组织管理迁移到共享组件。
3. 将客户管理、线索管理、项目管理、合同管理的主列表表格迁移到共享 table sheet 与列表工具栏。
4. 保持每个页面继续直接使用 `p-table` 列模板，避免在第一阶段把所有表格封装成不可扩展黑盒。
5. 去掉列表模块内容区的重复大标题；页面身份由顶栏 / 面包屑承担，内容区只保留工具栏、摘要事实和数据承载。
6. 将业务字典、导航治理的标题 / 工具栏形态同步收口，避免平台配置内继续保留旧式标题卡片。
7. 将主列表工具栏从表格 sheet 中拆出，形成类似业务字典的独立多功能工具条。
8. 将统计卡、列表 sheet 和工具条 surface 回归 Poseidon 模板 `.card` / `SectionCard` 的圆角、阴影、背景和间距语言，避免继续扩散业务页手写 `rounded-[8px] border bg-surface-0` 外观。
9. 抽取共享指标条组件，避免客户、项目、附件、字典等页面继续重复手写统计卡 markup。

## 3. 不在本片范围

1. 不新增或修改后端 public API route、OpenAPI、generated client、DTO、migration 或权限模型。
2. 不改变用户、角色、组织、客户、线索、项目、合同、业务字典、导航治理的读写行为、表单字段、权限动作和错误语义。
3. 不迁移业务工作区、详情页、提成页、附件 / 审计 / 跟进等内嵌或专用表格；这些表格后续按使用场景评估是否复用同一视觉 token。
4. 不引入批量删除、导出、图片、评分等 demo CRUD 示例业务能力。
5. 不把所有 `p-table` 二次封装成统一数据表组件；复杂表格仍保留各自列、筛选和操作模板。

## 4. 正式输入

| 输入                                                                   | 状态                   | 用途                                                     |
| ---------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------- |
| 用户本轮表格统一诉求                                                   | frozen                 | 明确视觉统一目标和共享组件方向                           |
| `apps/poms-admin/src/app/demo/crud/crud.ts`                            | reference              | 借鉴 `p-toolbar` start / end 组织方式                    |
| `apps/poms-admin/src/app/demo/uikit/tabledemo.ts`                      | reference              | 借鉴 table caption、搜索和重置位置                       |
| `docs/design/archive/slices/fe-41-contract-list-tabledemo-baseline.md` | accepted reference     | 既有 TableDemo 交互基线                                  |
| `apps/poms-admin/src/app/features/user-management/user-list.ts`        | current implementation | 首批迁移页面                                             |
| `apps/poms-admin/src/app/features/platform/role-list.ts`               | current implementation | 首批迁移页面                                             |
| `apps/poms-admin/src/app/features/platform/org-unit-list.ts`           | current implementation | 首批迁移页面                                             |
| `apps/poms-admin/src/app/features/customer/customer-list.ts`           | current implementation | 主列表表格迁移页面                                       |
| `apps/poms-admin/src/app/features/lead/lead-list.ts`                   | current implementation | 主列表表格迁移页面                                       |
| `apps/poms-admin/src/app/features/project/project-list.ts`             | current implementation | 主列表表格迁移页面                                       |
| `apps/poms-admin/src/app/features/contract/contract-list.ts`           | current implementation | 主列表表格迁移页面                                       |
| `apps/poms-admin/src/app/features/platform/dictionary-list.ts`         | current implementation | 工具栏参考与同步收口页面                                 |
| `apps/poms-admin/src/app/features/platform/navigation-governance.ts`   | current implementation | 旧式标题卡片纠偏页面                                     |
| `apps/poms-admin/src/app/shared/ui/sectioncard.ts`                     | current shared UI      | Poseidon `.card` surface SSOT                            |
| `apps/poms-admin/src/assets/tailwind.css`                              | current shared style   | `.card` 圆角、surface、阴影和间距基线                    |
| 用户浏览器验收反馈                                                     | frozen                 | 业务字典独立工具条更精致；工作台卡片更接近 Poseidon 模板 |

## 5. 视觉与交互基线

| 项           | 冻结口径                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 页面形态     | 顶栏 / 面包屑承担模块标题；内容区第一层是工具栏、摘要事实或数据 sheet，不再重复放模块大标题                               |
| 圆角         | 主 surface 使用 Poseidon `.card`，跟随 `rounded-2xl lg:rounded-3xl`；局部输入、标签和内嵌小块仍可使用 8px                 |
| 页面头部     | 不新增内容区标题 header；业务管理可保留真正有决策价值的统计摘要和流程提示                                                 |
| 列表 toolbar | 借鉴业务字典和 CRUD `p-toolbar`，作为独立 `.card` surface 承载重置、搜索、局部筛选、刷新、新建和右侧计数                  |
| 表格本体     | 继续使用 PrimeNG `p-table`，启用 row hover、paginator、responsive layout 和稳定 `dataKey`                                 |
| 分隔线       | 默认不使用业务页当前较重的 gridline；后续复杂业务表可按字段密度申请例外                                                   |
| 行操作       | 主数据 / 基础资料页统一使用 `操作`；对象主文本承担详情入口，行尾只放编辑、启停等真实命令；`继续处理` 仅用于真实流程推进页 |
| 空状态       | 保持现有空状态文案，不在本片引入新反馈态组件                                                                              |

## 6. 共享组件边界

| 组件 / 结构               | 责任                                                                  | 不承担                       |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------- |
| `AdminTableCard`          | 为标准 `p-table` 页面提供 Poseidon `.card` surface 和内置 `p-toolbar` | 不读取数据、不控制表格状态   |
| `.card` + PrimeNG toolbar | 为业务字典等非表格主视图保留独立多功能工具条 surface                  | 不抽象业务筛选或卡片流布局   |
| `AdminMetricGrid`         | 统一统计指标条 markup、surface、响应式网格和数值样式                  | 不计算业务指标、不读取 store |

## 7. 代码边界

| 类型       | 路径                                                                 | 预期变更                                 |
| ---------- | -------------------------------------------------------------------- | ---------------------------------------- |
| Shared UI  | `apps/poms-admin/src/app/shared/ui/admin-table-card.ts`              | 标准表格卡片 + toolbar surface           |
| Shared UI  | `apps/poms-admin/src/app/shared/ui/admin-metric-grid.ts`             | 新增                                     |
| Feature UI | `apps/poms-admin/src/app/features/user-management/user-list.ts`      | 迁移到 `AdminTableCard`                  |
| Feature UI | `apps/poms-admin/src/app/features/platform/role-list.ts`             | 迁移到 `AdminTableCard`                  |
| Feature UI | `apps/poms-admin/src/app/features/platform/org-unit-list.ts`         | 迁移到 `AdminTableCard`                  |
| Feature UI | `apps/poms-admin/src/app/features/customer/customer-list.ts`         | 迁移主列表 table card                    |
| Feature UI | `apps/poms-admin/src/app/features/lead/lead-list.ts`                 | 迁移主列表 table card                    |
| Feature UI | `apps/poms-admin/src/app/features/project/project-list.ts`           | 迁移主列表 table card                    |
| Feature UI | `apps/poms-admin/src/app/features/contract/contract-list.ts`         | 迁移到 `AdminTableCard`                  |
| Feature UI | `apps/poms-admin/src/app/features/platform/dictionary-list.ts`       | 指标 + 原生 `.card` / `p-toolbar` 主视图 |
| Feature UI | `apps/poms-admin/src/app/features/platform/navigation-governance.ts` | 迁移到 `AdminTableCard`                  |
| Feature UI | `apps/poms-admin/src/app/features/attachment/attachment-center.ts`   | 移除重复标题，迁移共享指标 / table card  |

## 8. 验证计划

| 检查                | 命令                                                                                                                                                                                                                                          | 预期 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Admin focused tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=user-list --testPathPatterns=customer-list --testPathPatterns=lead-list --testPathPatterns=project-list --testPathPatterns=contract-list --testPathPatterns=dictionary-list` | Pass |
| Admin lint          | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                                            | Pass |
| Admin build         | `corepack pnpm nx build poms-admin`                                                                                                                                                                                                           | Pass |
| Browser visual QA   | in-app browser desktop + 390px mobile for platform and business main list tables, attachment center, business dictionary, navigation governance                                                                                               | Pass |
| Markdown format     | `corepack pnpm run format:md:check`                                                                                                                                                                                                           | Pass |
| Diff sanity         | `git diff --check`                                                                                                                                                                                                                            | Pass |

## 9. Drift 与例外

| ID                                  | 等级 | 范围                               | 处理                                                               |
| ----------------------------------- | ---- | ---------------------------------- | ------------------------------------------------------------------ |
| FE63-E1-SPECIALIZED-TABLES-DEFERRED | E1   | 内嵌或专用表格未在第一阶段全部迁移 | 主列表先统一；提成、详情工作区、审计、跟进等专用表格后续按场景评估 |
| FE63-E1-GRIDLINE-COMPAT             | E1   | 复杂业务页仍可能保留 gridlines     | 仅当字段密度或对照阅读需要时保留，默认新共享表格不启用             |

## 10. G1 结论

`FE-63` 可继续实现。该片为 frontend-only refactor / visual convergence，不改变后端契约、权限模型或数据语义；第一阶段以共享视觉组件、平台配置三张基础列表、业务管理四张主列表、附件中心和业务字典 / 导航治理为可验证边界。

## 11. G3 本地验证结果（已失效，继续实施中）

以下记录是第一轮本地验证结果。用户在浏览器验收后指出工具条与 surface 仍存在视觉混乱，本片继续回到 `G2 / Doing`，最终 `G3` 以新验证结果为准。

| 检查                | 命令                                                                                                                                                                                                                                          | 结果 | 备注                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| Admin focused tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=user-list --testPathPatterns=customer-list --testPathPatterns=lead-list --testPathPatterns=project-list --testPathPatterns=contract-list --testPathPatterns=dictionary-list` | Pass | 6 个列表 spec 通过，43 tests passed                   |
| Admin lint          | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                                            | Pass | No lint errors                                        |
| Admin build         | `corepack pnpm nx build poms-admin`                                                                                                                                                                                                           | Pass | Production build pass                                 |
| Browser visual QA   | in-app browser desktop + 390px mobile for users / roles / org-units / dictionaries / navigation / customers / leads / projects / contracts                                                                                                    | Pass | 内容区重复 `h1` 为 0；桌面和 390px 均无页面级横向溢出 |
| Markdown format     | `corepack pnpm run format:md:check`                                                                                                                                                                                                           | Pass | Docs table formatting pass                            |
| Diff sanity         | `git diff --check`                                                                                                                                                                                                                            | Pass | No whitespace errors                                  |

## 12. G3 本地验证结果（第二轮）

| 检查                         | 命令                                                                                                                                                                                                                                                                                                                                                                                      | 结果 | 备注                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| Admin focused tests          | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-list --testPathPatterns=project-list --testPathPatterns=lead-list --testPathPatterns=contract-list --testPathPatterns=user-list --testPathPatterns=role-list --testPathPatterns=org-unit-list --testPathPatterns=dictionary-list --testPathPatterns=navigation-governance --testPathPatterns=attachment-center` | Pass | 7 suites / 46 tests passed                                                           |
| Attachment responsive retest | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=attachment-center`                                                                                                                                                                                                                                                                                                       | Pass | 1 suite / 3 tests passed after toolbar grid correction                               |
| Admin lint                   | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                                                                                                                                                                                        | Pass | No lint errors                                                                       |
| Admin build                  | `corepack pnpm nx build poms-admin`                                                                                                                                                                                                                                                                                                                                                       | Pass | Production build pass                                                                |
| Browser visual QA            | in-app browser desktop + 390px mobile for dictionaries / navigation / attachments / leads / projects / users                                                                                                                                                                                                                                                                              | Pass | 内容区 `h1` 为 0；标准表格页使用同卡 toolbar + table；附件中心修正后无页面级横向溢出 |
| Markdown format              | `corepack pnpm run format:md:check`                                                                                                                                                                                                                                                                                                                                                       | Pass | Docs table formatting pass                                                           |
| Diff sanity                  | `git diff --check`                                                                                                                                                                                                                                                                                                                                                                        | Pass | No whitespace errors                                                                 |

## 13. G3 结论

`FE-63` 已推进到本地 `G3 / Ready for Review`。标准表格页统一到 `AdminTableCard`，业务字典保留原生 `.card` + PrimeNG toolbar 的非表格主视图；用户管理、角色管理、组织管理、业务字典、导航治理，以及客户、线索、项目、合同主列表表格均完成第一阶段视觉收敛。内容区重复大标题已移除，模块身份交给顶栏 / 面包屑表达，列表动作统一进入多功能工具栏。客户管理作为主数据页样板，行尾列名收口为 `操作`，详情入口放在客户名称主文本，行尾只保留编辑等真实命令；`继续处理` 不作为通用表格列名，仅保留给线索等流程推进页。移动端继续使用表格内部横向滚动而不是压缩列内容。后续仅将内嵌或专用表格按 `FE63-E1-SPECIALIZED-TABLES-DEFERRED` 保留为独立评估工作。
