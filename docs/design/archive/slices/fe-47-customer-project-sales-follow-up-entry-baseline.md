# FE-47 Customer / Project Sales Follow-Up Entry G1 Baseline

- Task ID: `FE-47`
- Slice type: `frontend-only`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `FE-47`
- Public route surface: no change.
- Status: `G1`
- G1 Date: 2026-05-01

## 1. Scope

本片承接 `EX-44` 已交付的共享 `SalesFollowUpRecord` 事实源，把销售跟进入口补齐到客户详情和项目详情:

1. 新增可复用销售跟进面板组件，消费既有 `SalesFollowUpStore`。
2. 客户详情展示 / 创建客户维度销售跟进记录。
3. 项目详情展示 / 创建项目维度销售跟进记录。
4. 项目详情读取范围必须包含 `customerId`、`projectId` 和 `sourceLeadId`，形成线索转项目后的连续销售跟进视图。
5. 新增记录时按当前上下文挂载:
   - 客户详情: `customerId` only。
   - 项目详情: `customerId + projectId`，不再新挂 `leadId`。
6. 保留线索详情既有跟进入口；本片不强制重构线索详情。

## 2. Out Of Scope

1. 不新增或修改 public API route。
2. 不修改 shared contract、OpenAPI、generated client 或数据库 migration。
3. 不实现跟进记录修改、作废、删除、替代链。
4. 不实现提醒、日程、工作台待办或消息通知。
5. 不把销售跟进混入 `ProjectTimelineView` 项目生命周期里程碑。
6. 不改变线索转项目命令或项目详情 DTO。

## 3. SSOT

| Concern                 | Source Of Truth                         | Rule                                                              |
| ----------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| Follow-up fact source   | `SalesFollowUpRecord` / `EX-44`         | 销售跟进是共享事实源，可按客户、线索、项目锚点查询。              |
| API                     | `/sales-follow-up-records`              | 本片只消费既有 list / create API。                                |
| Customer detail context | `CustomerDetailView.id`                 | 客户详情创建记录只挂客户维度。                                    |
| Project detail context  | `ProjectDetailView.customerId / id`     | 项目详情创建记录挂客户和项目维度。                                |
| Continuous view         | `ProjectDetailView.sourceLeadId`        | 若存在来源线索，项目详情查询包含该 `leadId` 以展示早期跟进。      |
| Permission              | Existing object permissions             | 客户详情写入看 `customer:write`，项目详情写入看 `project:write`。 |
| UI pattern              | Existing Lead detail follow-up timeline | 复用相同中文标签、时间格式、结果 / 方式枚举展示。                 |

## 4. UI Boundary

### Shared Panel

`SalesFollowUpPanel` should support:

- inputs: `customerId`, `leadId?`, `projectId?`, `canWrite`, `title`, `description`, `createContextDetail`
- internal state: loading, saving, error, dialog visibility, attempted form state
- list rendering: occurred time, follow-up type, context label, owner, outcome, next follow-up
- create form: type, occurred time, summary, detail, outcome, next follow-up time

### Customer Detail

Add the panel near customer operational context, after aliases and before / near attachments.

Query:

- `customerId = customer.id`

Create:

- `customerId = customer.id`
- `leadId = null`
- `projectId = null`

### Project Detail

Add the panel near project evidence / operational context.

Query:

- `customerId = project.customerId`
- `leadId = project.sourceLeadId`
- `projectId = project.id`

Create:

- `customerId = project.customerId`
- `leadId = null`
- `projectId = project.id`

If `project.customerId` is missing, show a warning feedback and disable create, because `CreateSalesFollowUpRecordRequest.customerId` is required.

## 5. Tests And Checks

Required:

- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-follow-up-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-list`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm run format:md:check`
- `git diff --check`

Not required:

- `poms-api` tests, because this slice does not modify API code.
- `migration-check`, because this slice does not modify persistence.
- `shared-api-client:check`, because this slice does not modify contracts or OpenAPI.

## 6. Exceptions

| ID                            | Level | Area           | Owner | Cleanup Due            | Decision                                                                                            |
| ----------------------------- | ----- | -------------- | ----- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `FE47-E1-LEAD-NOT-REFACTORED` | `E1`  | Frontend reuse | Codex | Future lead UI cleanup | 线索详情已有可用跟进入口；本片只新增共享面板并接入客户 / 项目详情，不强制重构线索详情以降低回归面。 |

## 7. G1 Decision

`FE-47` 可以进入实现。实施顺序为 shared panel -> customer detail integration -> project detail integration -> focused tests -> lint/build -> G4 closeout。

## 8. G4 Closeout

Status: `Done`

Delivered:

1. 新增 `SalesFollowUpPanel` 共享组件，封装销售跟进列表、刷新、创建表单、上下文标签和错误反馈。
2. 客户详情接入客户维度销售跟进面板，创建记录只挂 `customerId`。
3. 项目详情接入项目维度销售跟进面板，查询包含 `customerId`、`sourceLeadId`、`projectId`，创建记录挂 `customerId + projectId`。
4. 对项目缺少客户绑定的场景给出不可新增跟进的前端反馈。
5. 补齐共享面板、客户详情和项目详情 focused tests。

Validation evidence:

- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-follow-up-panel` passed, 1 suite / 2 tests.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-list` passed, 1 suite / 1 test.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail` passed, 1 suite / 22 tests.
- `corepack pnpm nx lint poms-admin` passed.
- `corepack pnpm nx build poms-admin` passed with existing initial bundle budget warning.
- `corepack pnpm run format:md:check` passed.
- `git diff --check` passed.

Known notes:

1. `customer-list` spec stubs the child panel template because the real panel contains its own dialog inside the customer detail dialog; the panel behavior is covered by `sales-follow-up-panel.spec.ts`.
2. No API / DTO / DDL / generated client changes were made.
