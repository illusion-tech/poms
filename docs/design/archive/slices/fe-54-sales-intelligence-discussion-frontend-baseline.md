# FE-54 Sales Intelligence And Discussion Frontend G1 Baseline

- Task ID: `FE-54`
- Slice type: `frontend-only`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `FE-54`
- Public route surface: no new or changed public API route.
- Status: `G1`
- G1 Date: 2026-05-04

## 1. Scope

本片承接 `EX-61A` / `EX-61B` / `EX-61C` 已交付的 generated client，把销售情报和业务讨论板补齐到销售推进页面:

1. 新增 Admin data-access store，消费 `SalesIntelligenceApi` 与 `BusinessDiscussionApi`。
2. 新增共享销售情报面板，展示客户联系人、机会关系人、竞争态势、销售情报缺口和最近销售发现记录。
3. 新增共享业务讨论面板，展示客户 / 线索 / 项目讨论时间线，并允许新增讨论评论。
4. 客户详情展示客户联系人和客户讨论板。
5. 线索详情展示联系人、决策链、竞争态势、情报缺口、销售发现记录和线索讨论板。
6. 项目详情展示同一组机会情报；若项目来自 Lead，项目讨论读侧连续展示来源 Lead 历史讨论，新讨论默认写入 Project。
7. 补齐 focused component / page tests；浏览器验证以现有 Admin 关键入口为证据，不扩大 API 或数据库范围。

## 2. Out Of Scope

1. 不新增或修改 public API route、shared contract、OpenAPI 或 generated client。
2. 不新增 migration、entity、后端服务或权限模型。
3. 不实现主管辅导任务流、点评关闭、强制回复、截止时间或绩效评价。
4. 不采集敏感个人信息或私人画像字段。
5. 不实现物理删除、批量维护、AI 建议、胜率预测或评分硬闸口。
6. 不把业务讨论混入 `ProjectTimelineView` 生命周期里程碑。

## 3. SSOT

| Concern                | Source Of Truth                                           | Frontend Rule                                                                      |
| ---------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| API surface            | EX-61 generated client                                    | 前端只注入 generated service，不手写 URL。                                         |
| Contact fact source    | `CustomerContactSummary`                                  | 联系人属于客户主档，只展示业务身份、岗位和工作联系方式。                           |
| Opportunity context    | `leadId` / `projectId` query anchors                      | 线索用 `leadId`，项目用 `projectId`，不在前端伪造关系。                            |
| Project continuity     | `BusinessDiscussionApi.businessDiscussionControllerList`  | 项目查询传 `projectId`；后端负责聚合来源 Lead 历史讨论。                           |
| New project discussion | `CreateBusinessDiscussionCommentRequest.targetObjectType` | 项目详情新增讨论只写 `project + project.id`。                                      |
| Labels / options       | `@poms/shared-contracts` enum definitions                 | 前端展示和表单选项使用 shared metadata，不新增本地枚举值 SSOT。                    |
| Permissions            | Existing host page write permissions                      | 客户写入看 `customer:write`，线索写入看 `lead:write`，项目写入看 `project:write`。 |
| UI pattern             | Existing `SalesFollowUpPanel` and detail-page panels      | 使用紧凑业务面板、PrimeNG 控件、页面内嵌，不新增菜单或独立落地页。                 |

## 4. UI Boundary

### Shared Sales Intelligence Panel

Inputs:

- `customerId`
- `leadId?`
- `projectId?`
- `canWrite`
- `title`
- `description`

Behavior:

- 有 `customerId` 时读取客户联系人。
- 有 `leadId` 或 `projectId` 时读取机会关系人、竞争态势、销售发现记录和情报缺口。
- 缺少机会锚点时只展示客户联系人，并明确不渲染机会关系、竞争态势和缺口区。
- 写入口使用当前上下文创建联系人、机会关系人、竞争态势和销售发现记录。
- 项目上下文创建机会资料只写 `projectId`；线索上下文创建机会资料只写 `leadId`。

### Shared Business Discussion Panel

Inputs:

- `customerId?`
- `leadId?`
- `projectId?`
- `targetObjectType`
- `targetObjectId`
- `canWrite`
- `title`
- `description`

Behavior:

- list query 传入当前页面可用锚点。
- create request 使用 `targetObjectType + targetObjectId`。
- 项目详情新增讨论固定写 `project + project.id`；来源 Lead 历史讨论只由后端 list 聚合展示。
- 讨论类型选项使用 `BusinessDiscussionTypeOptions`。
- 支持标记置顶和关键结论，但不做任务流或确认关闭。

## 5. Page Integration

| Page            | Intelligence Context             | Discussion Context                                                                    | Write Permission |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------- | ---------------- |
| Customer detail | `customerId = customer.id`       | `customerId = customer.id`, target `customer/customer.id`                             | `customer:write` |
| Lead detail     | `customerId + leadId`            | `customerId + leadId`, target `lead/lead.id`                                          | `lead:write`     |
| Project detail  | `customerId + sourceLeadId + id` | list uses `customerId + sourceLeadId + projectId`; create target `project/project.id` | `project:write`  |

## 6. Data Access Boundary

Add stores under `libs/admin/data-access`:

- `SalesIntelligenceStore`
  - list / create / update customer contacts
  - list / create / update opportunity stakeholders
  - list / create / update competitor intelligence records
  - list / create / update sales discovery records
  - list sales intelligence gaps
- `BusinessDiscussionStore`
  - list comments
  - create comment

`@poms/admin-data-access` must re-export the stores and the generated enums / request / summary types consumed by Admin components.

## 7. Tests And Checks

Required:

- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-intelligence-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=business-discussion-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-list`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm run format:md:check`
- `git diff --check`

Not required:

- `poms-api` lint/build/test, because this slice does not modify backend code.
- `poms-api:migration-check`, because this slice does not modify persistence.
- `shared-api-client:check`, because this slice consumes the current generated client without changing OpenAPI.

## 8. Exceptions And Risks

| ID                           | Level | Area              | Owner | Cleanup Due  | Decision                                                                                   |
| ---------------------------- | ----- | ----------------- | ----- | ------------ | ------------------------------------------------------------------------------------------ |
| `FE54-E1-NO-DEDICATED-MENU`  | `E1`  | Navigation        | Codex | N/A          | 销售情报和讨论板嵌入客户 / 线索 / 项目详情，不新增一级菜单或目录。                         |
| `FE54-E2-NO-SUPERVISOR-FLOW` | `E1`  | Coaching workflow | Codex | Future slice | 用户已确认先用讨论板承载主管指导，不做结构化主管辅导任务流。                               |
| `FE54-R1-BROWSER-SCOPE`      | `E1`  | E2E evidence      | Codex | G3           | 若本地浏览器环境不可用，以 focused page tests + Admin build 作为最低验证，并记录阻塞原因。 |

## 9. G1 Decision

`FE-54` 可以进入实现。实施顺序为 data-access stores -> shared panels -> customer / lead / project integration -> focused tests -> lint/build -> tracker / closeout 回写。

## 10. G4 Closeout

Status: `Done` / `G4` on 2026-05-04.

Delivered:

1. `@poms/admin-data-access` 新增 `SalesIntelligenceStore` 和 `BusinessDiscussionStore`，并重导出前端需要的 generated services、request / summary types 与枚举。
2. Admin 新增共享 `SalesIntelligencePanel`，支持客户联系人、机会关系人、竞争态势、销售发现记录和情报缺口展示，并提供受权限控制的新增入口。
3. Admin 新增共享 `BusinessDiscussionPanel`，支持客户 / 线索 / 项目讨论时间线展示与新增讨论；项目详情新增讨论写入 Project，读侧连续展示来源 Lead 历史讨论。
4. 客户、线索、项目详情页已嵌入对应面板；线索转项目后项目侧使用 `sourceLeadId + projectId` 查询连续讨论。
5. `lead-bootstrap` E2E 旅程已扩展覆盖项目详情页的销售情报 / 业务讨论入口，并验证项目讨论发布后回显。

Validation:

- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-intelligence-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=business-discussion-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-list`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm nx e2e poms-admin-e2e -- --grep "admin can enter leads"`
- `corepack pnpm run format:md:check`
- `git diff --check`

Notes:

- `FE54-R1-BROWSER-SCOPE` closed: local Playwright E2E passed.
- `FE54-E1-NO-DEDICATED-MENU` remains accepted by design: the feature is embedded into existing sales context pages.
- `FE54-E2-NO-SUPERVISOR-FLOW` remains a future-slice boundary: current implementation uses business discussion as lightweight guidance /点评 carrier.
- `poms-admin` build still reports the existing initial bundle budget warning; it does not block this frontend slice.
