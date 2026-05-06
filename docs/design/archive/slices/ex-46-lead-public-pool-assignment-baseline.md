# EX-46 Lead Public Pool And Assignment Governance G1 Baseline

- Task ID: `EX-46`
- Slice type: `cross-layer-high-risk`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-46`
- Public route surface: yes
- Status: `G1`
- G1 Date: 2026-04-30

## 1. Scope

本片把线索负责人从普通资料维护中拆出来，形成公共池、销售申领和主管分配的受控闭环:

1. 允许线索以无负责人状态进入公共池。
2. 新增公共池查询视角，支持销售筛选公共池 / 我的线索 / 全部线索。
3. 新增 `POST /leads/{id}:claim`，销售可申领无负责人线索。
4. 新增 `POST /leads/{id}:assignOwner`，具备分配权限的人员可分配或改派线索负责人。
5. 新增 `LeadOwnerAssignmentRecord` 动作记录表，记录前后负责人、动作类型、原因、操作者和时间。
6. `PATCH /leads/{id}` 不再承担负责人变更，避免真实数据上线后出现静默覆盖。
7. 前端线索列表和详情提供公共池筛选、申领和分配入口。

## 2. Out Of Scope

1. 不实现自动派单、轮转规则、区域规则或 SLA。
2. 不实现线索评分评级。
3. 不实现负责人释放回公共池；后续若需要，应作为单独命令建模。
4. 不改变确认有效和转项目硬闸口；仍要求线索有销售负责人和负责人组织。
5. 不新增审批流；本片只做权限控制和动作审计。

## 3. SSOT

| Concern            | Source Of Truth                            | Rule                                                             |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------- |
| Current owner      | `lead.owner_user_id` / `lead.owner_org_id` | 表示线索当前销售主责，允许为空；为空即公共池。                   |
| Assignment history | `lead_owner_assignment_record`             | 所有申领、分配和改派必须追加动作记录。                           |
| Claim command      | `POST /leads/{id}:claim`                   | 仅无负责人且状态为 `registered` / `qualified` 的线索可申领。     |
| Assignment command | `POST /leads/{id}:assignOwner`             | 分配 / 改派必须走受控命令，不能走 `PATCH /leads/{id}`。          |
| Public pool query  | `LeadListQuery.ownershipScope`             | `public-pool` 返回无负责人线索，`mine` 返回当前登录人的线索。    |
| Lead gate          | Existing lead gate                         | 缺少负责人或负责人组织时，仍不能确认有效或转项目。               |
| Permission         | `lead:assign`                              | 销售主管分配 / 改派使用独立权限；普通销售申领使用 `lead:write`。 |

## 4. API Boundary

| Capability        | Route                          | Request                  | Response                    | Guard         |
| ----------------- | ------------------------------ | ------------------------ | --------------------------- | ------------- |
| `listLeads`       | `GET /leads`                   | `LeadListQuery`          | `LeadListView[]`            | `lead:read`   |
| `createLead`      | `POST /leads`                  | `CreateLeadRequest`      | `LeadSummary`               | `lead:write`  |
| `updateLead`      | `PATCH /leads/{id}`            | `UpdateLeadRequest`      | `LeadSummary`               | `lead:write`  |
| `claimLeadOwner`  | `POST /leads/{id}:claim`       | `ClaimLeadOwnerRequest`  | `LeadOwnerAssignmentResult` | `lead:write`  |
| `assignLeadOwner` | `POST /leads/{id}:assignOwner` | `AssignLeadOwnerRequest` | `LeadOwnerAssignmentResult` | `lead:assign` |

`UpdateLeadRequest` 从本片开始不得包含 `ownerUserId` / `ownerOrgId`。创建线索仍可指定负责人；如果显式传入 `ownerUserId: null`，线索进入公共池。

## 5. Persistence Boundary

### New Table

`poms.lead_owner_assignment_record`

- `id`
- `lead_id`
- `previous_owner_user_id`
- `previous_owner_org_id`
- `new_owner_user_id`
- `new_owner_org_id`
- `assignment_type`: `claimed` / `assigned` / `reassigned`
- `reason`
- `assigned_at`
- `assigned_by`
- `created_at`

### Existing Table

`poms.lead`

- keep `owner_user_id` nullable
- keep `owner_org_id` nullable
- update owner only through `claimLeadOwner` / `assignLeadOwner` after create
- increment row version on successful owner assignment command

## 6. Frontend Boundary

1. 线索登记时销售主责不再强制必填，留空进入公共池。
2. 线索列表提供 `全部 / 我的 / 公共池` 视角。
3. 公共池线索展示 `申领` 动作。
4. 具备 `lead:assign` 的用户可打开分配弹窗，选择销售主责和组织，并填写原因。
5. 线索详情展示当前负责人状态，公共池线索明确显示未分配。
6. 前端只按 `allowedActions` 和权限做显隐，最终状态校验以后端为准。

## 7. Tests And Checks

Required:

- `corepack pnpm nx run poms-api:migration-up`
- `corepack pnpm nx run poms-api:migration-check`
- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`
- `corepack pnpm nx e2e poms-api-e2e --testPathPattern=lead-workflow`
- `corepack pnpm nx run poms-api:openapi`
- `corepack pnpm nx run shared-api-client:generate`
- `corepack pnpm nx run shared-api-client:check`
- `corepack pnpm nx lint poms-api`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`
- `corepack pnpm nx build poms-admin`

## 8. Exceptions

| ID                           | Level | Area                  | Owner | Cleanup Due          | Decision                                       |
| ---------------------------- | ----- | --------------------- | ----- | -------------------- | ---------------------------------------------- |
| `EX46-E1-NO-AUTO-ASSIGNMENT` | `E1`  | Lead assignment rules | Codex | Future routing slice | 本片不做自动派单、轮转或区域规则。             |
| `EX46-E2-NO-RELEASE-TO-POOL` | `E1`  | Lead owner release    | Codex | Future owner slice   | 释放回池需要独立命令和原因治理，本片先不提供。 |
| `EX46-E3-NO-SCORING`         | `E1`  | Lead scoring          | Codex | Future scoring slice | 公共池先解决责任归属；评分评级后续独立设计。   |

## 9. G1 Decision

`EX-46` 可以进入实现。实现顺序为 route inventory / tracker -> migration/entity/repository -> shared contract/API DTO -> controller/service/query -> OpenAPI/generated client -> admin UI -> focused tests。

## 10. G4 Closeout

| Field     | Value        |
| --------- | ------------ |
| Status    | Pass         |
| Closed At | `2026-04-30` |
| Owner     | `Codex`      |

Delivered:

1. 新增 `LeadOwnerAssignmentRecord` 持久化模型与迁移，负责人变更形成追加式动作记录。
2. 新增 `lead:assign` 权限，并通过 `POST /leads/{id}:claim` / `POST /leads/{id}:assignOwner` 承接申领、分配和改派。
3. `PATCH /leads/{id}` 不再承载负责人静默覆盖；普通字段更新和负责人治理分离。
4. `LeadListQuery.ownershipScope` 支持 `all` / `mine` / `public-pool`，列表与详情返回 `allowedActions`。
5. 前端支持登记公共池线索、公共池筛选、线索申领、主管分配 / 改派和公共池负责人展示。

## 11. Validation Evidence

| Check                 | Result                  | Evidence                                                                                                                                         |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| DB migration          | Pass                    | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check`                                                    |
| OpenAPI / client      | Pass                    | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check`       |
| API focused tests     | Pass                    | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`                                                                             |
| Admin focused tests   | Pass                    | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`                                                                      |
| API E2E               | Pass                    | `corepack pnpm nx e2e poms-api-e2e --testPathPattern=lead-workflow`                                                                              |
| API/admin lint        | Pass                    | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`                                                                             |
| API/admin build       | Pass with known warning | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin` passed; admin build still reports existing initial bundle budget warning. |
| Markdown format check | Pass with exception     | Touched EX-46 docs formatted; full `corepack pnpm run format:md:check` still reports existing EX-42 / EX-44 markdown table formatting debt.      |

## 12. Remaining Boundaries

| Boundary              | Status   | Next Slice Candidate                       |
| --------------------- | -------- | ------------------------------------------ |
| Auto assignment / SLA | Deferred | 自动派单、轮转、超时未跟进提醒和区域规则。 |
| Release to pool       | Deferred | 释放回公共池命令、原因记录和权限治理。     |
| Lead scoring          | Deferred | 线索评分评级、转项目硬闸口和评分解释。     |
