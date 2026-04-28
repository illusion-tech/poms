# EX-41 Lead / Project 销售主责与登记人分离治理基线

- Gate Status: `G1 = Pass`
- Parent: `EX-40`
- Owner: `Codex`
- Slice Type: `docs-only / process-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-29`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-41`
- Direct Input:
  - `project-lifecycle-design.md`
  - `business-authorization-matrix.md`
  - `interface-command-design.md`
  - `interface-openapi-dto-design.md`
  - `data-model-prerequisites.md`
  - `table-structure-freeze-design.md`
  - `schema-ddl-design.md`
  - `api-route-canonical-inventory.md`

## 1. 背景

`EX-31 / EX-32 / FE-27 / FE-28 / FE-29` 已经把正式项目创建收口为 `Lead -> Project`。当前实现事实是:

1. `Lead.createdBy` 记录登记操作者，`Lead.ownerUserId / ownerOrgId` 表达线索主责人和主责组织。
2. `convertLeadToProject` 创建 `Project` 时把 `Lead.ownerUserId / ownerOrgId` 原样继承到 `Project.ownerUserId / ownerOrgId`。
3. 前端登记线索和转项目时没有显式负责人入口，项目创建后也没有受控入口变更 `Project.ownerUserId / ownerOrgId`。

这会把"登记人"和"销售主责人"在产品体验上混成一个概念，并让转项目后的销售主责变更只能依赖后台数据修正或普通字段覆盖。该口径不符合销售流程中"登记事实"与"责任归属"分离的审计要求。

## 2. G1 范围

本片只冻结设计和任务拆分，不改运行时代码。

### 2.1 本次目标

1. 固定四类概念边界:
   - `createdBy / updatedBy / convertedBy`: 登记人、操作人、转化人，属于审计事实。
   - `Lead.ownerUserId / ownerOrgId`: 线索销售主责人和线索主责组织。
   - `Project.ownerUserId / ownerOrgId`: 项目销售主责人和项目销售主责组织。
   - `ProjectHandover` 的执行负责人 / 项目负责人: 移交和执行承接角色，不等同于签约前销售主责。
2. 固定产品默认规则:
   - 登记线索时负责人默认当前登记人，但必须允许有权限用户选择或调整线索销售主责。
   - 确认有效和转入项目时必须展示即将继承的项目销售主责。
   - 转入项目时默认继承线索销售主责；若变更，必须走后端明确 DTO 和审计规则，不得前端静默改写。
3. 固定 Project 创建后的变更规则:
   - 项目销售主责变更不得进入 `PATCH /projects/{id}` 普通基础信息编辑。
   - 项目销售主责变更使用 `POST /projects/{id}:reassignOwner` 受控命令。
   - 命令必须保留变更原因、变更前后主责、操作者、时间和并发版本。
4. 回写 authoritative 设计文档、route inventory 和执行 tracker。

### 2.2 本次明确不做

1. 不实现 `POST /projects/{id}:reassignOwner` 运行时代码。
2. 不修改 `CreateLeadRequest`、`ConvertLeadToProjectRequest`、`ProjectDetailView` 或 generated client。
3. 不重做对象级授权模型；后续实现仍按现有权限体系和可落地 guard 分层推进。
4. 不变更提成角色分配、`CommissionRoleAssignment`、`ProjectHandover` 参与人或执行负责人模型。
5. 不清理历史数据中已有的空 owner 或旧项目归属异常。

## 3. SSOT

| Concern                          | SSOT                                                               | Implementation Rule                                                                                  |
| -------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 登记人与负责人语义               | 本基线 + `project-lifecycle-design.md`                             | `createdBy` 只表示审计操作者，不能被 UI 文案或权限逻辑解释为业务负责人。                             |
| 线索销售主责                     | `Lead.ownerUserId / ownerOrgId`                                    | 登记时默认当前用户，可在 `registered / qualified` 且未转化 / 关闭前维护。                            |
| 项目销售主责                     | `Project.ownerUserId / ownerOrgId`                                 | 转项目时默认继承 Lead owner；创建后只能通过受控命令变更。                                            |
| 执行期项目负责人                 | `ProjectHandover` 参与人 / 移交设计                                | 仅用于移交、执行和验收责任，不得替代 `Project.owner*` 的销售主责语义。                               |
| Project owner change route       | `api-route-canonical-inventory.md`                                 | Canonical route 为 `POST /projects/{id}:reassignOwner`。                                             |
| Project owner change DTO         | `interface-openapi-dto-design.md`                                  | 请求至少包含 `ownerUserId`、`ownerOrgId?`、`reason`、`expectedVersion`；响应返回变更记录与前后主责。 |
| Project owner change persistence | `data-model-prerequisites.md` + `table-structure-freeze-design.md` | 新增 `ProjectOwnerReassignmentRecord` 作为动作记录表，保留 append-only 审计事实。                    |

## 4. 命令与接口边界

| Route / Controller                  | Command / Service                | Request DTO                   | Response DTO                         | Guard / Permission                      | Design Source | Result            |
| ----------------------------------- | -------------------------------- | ----------------------------- | ------------------------------------ | --------------------------------------- | ------------- | ----------------- |
| `PATCH /leads/{id}`                 | `LeadService.updateLead`         | `UpdateLeadRequest`           | `LeadSummary`                        | `lead:write`                            | `EX-31`       | existing / reuse  |
| `POST /leads/{id}:convertToProject` | `LeadService.convertToProject`   | `ConvertLeadToProjectRequest` | `ProjectSummary`                     | `lead:write + project:write`            | `EX-32`       | existing / extend |
| `POST /projects/{id}:reassignOwner` | `ProjectService.reassignOwner`   | `ReassignProjectOwnerRequest` | `ProjectOwnerReassignmentResult`     | `project:write` + object responsibility | `EX-41`       | planned / EX-41A  |
| `GET /projects/{id}`                | `ProjectQueryService.getProject` | `N/A`                         | `ProjectDetailView` + allowed action | `project:read`                          | `EX-18`       | extend / EX-41A   |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- New canonical route:
  - `POST /projects/{id}:reassignOwner`
- Current implemented route:
  - `N/A`
- Inventory status:
  - `reassignProjectOwner`: `planned`
- Route governance source:
  - `ADR-015` + 本基线

## 5. 持久化边界

| Table                                    | Purpose                  | Minimum Fields                                                                                                                                             | Slice    |
| ---------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `poms.project`                           | 当前销售主责事实         | existing `owner_org_id`、`owner_user_id`                                                                                                                   | existing |
| `poms.project_owner_reassignment_record` | 项目销售主责变更动作记录 | `id`、`project_id`、`previous_owner_org_id`、`previous_owner_user_id`、`new_owner_org_id`、`new_owner_user_id`、`reason`、`reassigned_at`、`reassigned_by` | `EX-41A` |

`ProjectOwnerReassignmentRecord` 是动作记录，不是 Project 版本主表。变更命令成功后同时更新 `project.owner*` 当前事实，并追加一条变更记录。历史责任追溯以动作记录为准。

## 6. 读侧与前端边界

| Surface                   | Required Behavior                                                                | Slice      |
| ------------------------- | -------------------------------------------------------------------------------- | ---------- |
| 线索登记弹窗              | 显示负责人选择，默认当前用户；登记人不作为可编辑业务字段。                       | `FE-45`    |
| 线索详情 / 列表           | 负责人字段继续展示 `ownerName / ownerOrgName`，必要时提供维护入口。              | `FE-45`    |
| 确认有效                  | 展示当前线索销售主责，避免用户误以为确认人就是负责人。                           | `FE-45`    |
| 转入项目                  | 展示并确认项目销售主责；默认继承线索销售主责。                                   | `FE-45`    |
| 项目详情 / 工作区上下文   | 展示销售主责和主责组织；当后端返回 `reassign-project-owner` 时提供受控变更入口。 | `FE-45`    |
| 移交 / 执行负责人相关页面 | 继续使用移交参与人和执行责任术语，不用 `Project.owner*` 替代执行负责人。         | downstream |

## 7. 下游任务拆分

| Task ID  | Slice Type                    | Goal                                                                                             | Dependency |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| `EX-41A` | `api / command + persistence` | 落地项目销售主责变更命令、审计记录、contract / OpenAPI / generated client 和 action projection。 | `EX-41`    |
| `FE-45`  | `frontend-only`               | 补齐线索登记、确认有效、转项目和项目详情中的销售主责入口与浏览器验证。                           | `EX-41A`   |

## 8. G3 校验计划

### 8.1 本 docs-only 切片

| Check              | Required | Command                    | Result | Reason                                      |
| ------------------ | -------- | -------------------------- | ------ | ------------------------------------------- |
| Diff hygiene       | `yes`    | `git diff --check`         | `Pass` | 2026-04-29 已执行并通过。                   |
| Markdown format    | `yes`    | `pnpm run format:md:check` | `Pass` | 2026-04-29 已执行并通过。                   |
| API lint / build   | `no`     | `N/A`                      | `N/A`  | 本片不改运行时代码。                        |
| OpenAPI generation | `no`     | `N/A`                      | `N/A`  | 本片只新增 planned inventory，不改 schema。 |

### 8.2 `EX-41A` runtime 切片

`EX-41A` 至少需要:

1. `corepack pnpm nx lint poms-api`
2. `corepack pnpm nx build poms-api`
3. focused project / lead service and controller tests
4. `corepack pnpm nx run poms-api:openapi`
5. `corepack pnpm nx run shared-api-client:check`
6. `corepack pnpm nx run poms-api:migration-check`
7. `git diff --check`

### 8.3 `FE-45` frontend 切片

`FE-45` 至少需要:

1. `corepack pnpm nx lint poms-admin`
2. `corepack pnpm nx build poms-admin`
3. focused `lead-list` / `project-detail` tests
4. browser journey covering lead registration owner selection, conversion confirmation, and project owner reassignment visibility
5. `git diff --check`

## 9. 例外与风险

| Exception ID                        | Level | Scope                                                                                        | Approved By                | Cleanup Owner | Cleanup Due | Notes                                                                                         |
| ----------------------------------- | ----- | -------------------------------------------------------------------------------------------- | -------------------------- | ------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `EX41-E1-OBJECT-AUTH-GRANULARITY`   | `E1`  | 后续实现可先复用现有 `project:write` + 项目 active/blocked guard，不强行补全对象级授权模型。 | `Solo worktree checkpoint` | `Codex`       | `EX-41A` G3 | `business-authorization-matrix.md` 继续保留角色 / 组织范围目标口径。                          |
| `EX41-E2-CONVERSION-OWNER-OVERRIDE` | `E2`  | 转项目时是否允许同时覆盖项目销售主责需要在 `EX-41A` G1 冻结 DTO 后确认。                     | `Solo worktree checkpoint` | `Codex`       | `EX-41A` G1 | 若实现复杂度过高，`EX-41A` 可先落地项目创建后 reassignment 命令，`FE-45` 用后置变更入口承接。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-29`
- Conditions:
  1. 后续实现不得把 `ownerUserId / ownerOrgId` 加入 `PATCH /projects/{id}` 普通基础信息编辑。
  2. `POST /projects/{id}:reassignOwner` 必须先写入 route inventory 和 contract，再写 controller / generated client。
  3. 前端必须把"登记人"和"销售主责人"分开呈现；默认值可以相同，但文案和提交字段不能混用。
  4. "项目负责人"在移交 / 执行上下文中继续表示执行承接角色；销售主责统一使用"项目销售主责人"或"销售主责"。
