# FE-64 客户工作台信息架构重整基线

**状态**: G1 / Pass

**日期**: 2026-06-01

**Owner**: Codex

**Slice 类型**: frontend-only

**Tracker Link / Row**: `docs/design/phase2-development-execution-tracker.md` / `FE-64`

## 1. 背景

客户详情当前仍嵌在客户管理列表弹窗中，但该弹窗已经承载客户主档、关联数量、客户别名、客户联系人、业务讨论、销售跟进、附件和编辑历史。用户从产品体验角度确认，客户管理需要从“详情弹窗”升级为面向长期经营的客户工作台。

本片承接该产品判断，把客户详情从列表组件中拆出为独立 `/customers/:id` 工作台页面，并收口客户上下文中的“销售情报”命名和边界。

## 2. 本片范围

1. 新增 `/customers/:id` 客户工作台路由和独立页面。
2. 客户列表点击客户名称直接进入客户工作台。
3. 从客户列表中移除重型客户详情弹窗、别名维护、客户联系人、讨论、跟进和附件承载职责。
4. 客户工作台承载客户摘要、基础档案、客户别名、客户关系、互动记录和客户附件。
5. 客户上下文中将“客户销售情报”文案收口为“客户关系 / 客户联系人”，只表达客户长期关系资产。
6. 销售跟进待办导航中的客户对象入口 direct cutover 到 `/customers/:id`，通过 query 保留 `followUpId` / `todoId` 的当前处理上下文。
7. 更新客户列表和客户工作台 focused tests。

## 3. 不在本片范围

1. 不新增、修改或删除后端 public API route、OpenAPI、generated client、DTO、migration 或权限模型。
2. 不新增客户经营聚合读模型，不在前端拼接活跃线索、在推项目、合同摘要或跨对象情报聚合。
3. 不改变客户主档、客户别名、客户联系人、讨论、跟进或附件的写入语义。
4. 不允许在客户页创建机会级销售情报；决策链、竞争态势、销售发现和情报缺口仍归属于线索 / 项目上下文。
5. 不保留 `/customers?customerId=...` 自动打开详情弹窗的旧入口。

## 4. 正式输入

| 输入                                                                                  | 状态                   | 用途                                                 |
| ------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------- |
| 用户确认的客户详情信息架构判断                                                        | frozen                 | 客户详情升级为客户工作台                             |
| `apps/poms-admin/src/app/features/customer/customer-list.ts`                          | current implementation | 当前列表与详情弹窗混合实现                           |
| `apps/poms-admin/src/app/shared/ui/sales-intelligence-panel.ts`                       | current implementation | 明确客户上下文只展示客户联系人，机会事实需要机会锚点 |
| `docs/design/archive/slices/fe-54-sales-intelligence-discussion-frontend-baseline.md` | accepted reference     | 既有销售情报 / 讨论前端边界和客户联系人语义          |
| `docs/design/fe-63-admin-table-visual-system-baseline.md`                             | accepted reference     | 客户列表主数据页视觉和操作列基线                     |
| `apps/poms-admin/src/app/shared/navigation/todo-navigation.ts`                        | current implementation | 销售跟进待办客户对象跳转入口                         |

## 5. 本次 SSOT

| Concern        | SSOT                                             | Implementation Rule                                        |
| -------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| 客户工作台路由 | `/customers/:id`                                 | 客户长期经营动作只落到独立工作台页面                       |
| 客户列表职责   | `CustomerList`                                   | 只负责检索、新建、编辑和进入工作台                         |
| 客户详情事实源 | `CustomerStore.loadCustomer(id)`                 | 工作台读取现有 `CustomerDetailView`，不引入新读模型        |
| 客户关系事实源 | `SalesIntelligencePanel` customer-only           | 在客户工作台以“客户关系”展示，不传 `leadId` 或 `projectId` |
| 机会级销售情报 | 线索 / 项目详情上下文                            | 客户工作台不创建决策链、竞争态势、销售发现或情报缺口       |
| 客户互动记录   | `BusinessDiscussionPanel` + `SalesFollowUpPanel` | 复用现有共享面板，保持客户维度写入语义                     |
| 客户附件       | `AttachmentPanel`                                | 继续使用 `targetType=customer` 和 `targetId=customer.id`   |
| 权限           | 现有 `customer:read` / `customer:write`          | 不新增权限；工作台沿用客户管理读写权限                     |

## 6. 页面与组件边界

| 组件 / 页面         | 责任                                                         | 不承担                                           |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `CustomerList`      | 客户列表、新建客户、编辑客户、跳转客户工作台                 | 不再承载详情弹窗、别名、联系人、讨论、跟进或附件 |
| `CustomerWorkspace` | 读取客户详情，组织摘要、档案、别名、客户关系、互动记录和附件 | 不做跨对象聚合，不伪造客户 360 读模型            |
| 客户关系区          | 展示和新增客户联系人                                         | 不展示或创建机会级销售情报                       |
| 互动记录区          | 展示客户业务讨论和客户销售跟进                               | 不改变讨论或跟进生命周期                         |
| 附件区              | 展示 / 上传 / 下载 / 作废客户附件                            | 不改变附件存储或上传会话语义                     |

## 7. 读写边界

| Query / View                   | Consumer            | Fields / Context                  | Result |
| ------------------------------ | ------------------- | --------------------------------- | ------ |
| `GET /customers`               | `CustomerList`      | 客户列表字段、关联计数            | 不变   |
| `GET /customers/{id}`          | `CustomerWorkspace` | `CustomerDetailView` + aliases    | 不变   |
| `GET /customer-contacts`       | 客户关系区          | `customerId` only                 | 不变   |
| `GET /business-discussions`    | 互动记录区          | `customerId` only                 | 不变   |
| `GET /sales-follow-up-records` | 互动记录区          | `customerId` only                 | 不变   |
| `GET /attachments`             | 附件区              | `targetType=customer`, `targetId` | 不变   |

## 8. 验证计划

| 检查                | 命令                                                                       | 预期 |
| ------------------- | -------------------------------------------------------------------------- | ---- |
| Admin focused tests | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer` | Pass |
| Admin lint          | `corepack pnpm nx lint poms-admin`                                         | Pass |
| Admin build         | `corepack pnpm nx build poms-admin`                                        | Pass |
| Markdown format     | `corepack pnpm run format:md:check`                                        | Pass |
| Diff sanity         | `git diff --check`                                                         | Pass |

## 9. 例外与风险

| ID                          | 等级 | 范围                             | 处理                                                                 |
| --------------------------- | ---- | -------------------------------- | -------------------------------------------------------------------- |
| FE64-E1-NO-CUSTOMER-360-API | E1   | 客户工作台第一阶段不做聚合读模型 | 先完成信息架构 direct cutover；客户经营聚合读模型如需要另开 `EX-71A` |

## 10. G1 结论

`FE-64` 可以进入实现。该片为 frontend-only 信息架构重整，不改变后端契约、数据库、权限或 generated client；以客户列表职责收敛、独立客户工作台路由、客户关系命名收口和 focused tests 作为 G3 验证边界。

## 11. G3 本地验证结果

| 检查                       | 命令                                                                              | 结果 | 备注                                         |
| -------------------------- | --------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| Admin customer tests       | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer`        | Pass | 2 suites / 5 tests passed                    |
| Todo navigation tests      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=todo-navigation` | Pass | 1 suite / 9 tests passed；客户待办进入工作台 |
| Admin lint                 | `corepack pnpm nx lint poms-admin`                                                | Pass | All files pass linting                       |
| Admin build                | `corepack pnpm nx build poms-admin`                                               | Pass | Production build pass                        |
| Browser visual QA          | `http://localhost:4200/customers` + `/customers/:id`                              | Pass | 客户列表和客户工作台桌面视口验收通过         |
| Markdown format            | `corepack pnpm run format:md:check`                                               | Pass | Docs table formatting pass                   |
| Diff sanity                | `git diff --check`                                                                | Pass | No whitespace errors                         |
| OpenAPI / generated client | N/A                                                                               | N/A  | 本片不改 public API、DTO、OpenAPI 或 client  |
| Migration / schema check   | N/A                                                                               | N/A  | 本片不改 DB / entity / migration             |

## 12. G3 结论

`FE-64` 已达到本地 `G3 / Ready for Review`。客户列表已退出重型详情承载职责，客户名称进入 `/customers/:id` 工作台；客户工作台承载摘要、基础档案、客户别名、客户关系、讨论、跟进和附件。客户上下文文案已从“客户销售情报”收口为“客户关系”，机会级销售情报仍归属线索 / 项目上下文。

## 13. G4 结论

- Gate Status: `Done`
- Commit Evidence: local commit `d4794d4b feat(admin): 将客户详情从列表弹窗迁移至独立工作台`.
- Browser Evidence: `dist/screenshots/fe64-customers-list.png`, `dist/screenshots/fe64-customer-workspace.png`.
- Done Boundary: `/customers/:id` 客户工作台、客户列表跳转入口、客户待办入口和客户关系文案均已完成 direct cutover；未新增后端 API、OpenAPI、generated client、数据库或权限变更。
- Downstream Contract: 后续客户经营聚合读模型如需落地，应另开 `EX-71A` 或后续 cross-layer slice；不得把重型客户详情重新塞回客户列表弹窗。
- Residual Work: none for this slice.
