# EX-30 Lead 主对象 route governance 与 EX17-E2 执行基线

- Gate Status: `G1 = Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `process-only / route-governance`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-30`

## 1. 范围

- 本次目标:
  1. 为 `EX17-E2-LEAD-BOOTSTRAP` 冻结可执行切片边界。
  2. 在 authoritative API inventory 中新增 `Lead` 相关 canonical routes。
  3. 冻结 `Lead` 最小状态机、字段边界、权限边界和 `Lead -> Project` 转化命令。
  4. 明确当前 `POST /projects` 是无 `Lead` 的 bootstrap create drift，后续由 `EX-32` 收口。
- 本次明确不做:
  1. 不写运行时代码。
  2. 不新增 migration、entity、controller、contract、OpenAPI 或 generated client。
  3. 不修改现有 `POST /projects` 行为。
  4. 不实现 `ProjectAssessment`、`ScopeConfirmation` 或完整销售线索 CRM 能力。
- 下游可依赖的交付边界:
  1. `EX-31` 可按本包实现 `Lead` 最小事实源。
  2. `EX-32` 可按本包实现 `Lead -> Project` 转化命令，并收口 `POST /projects` bootstrap 漂移。
  3. `FE-27~29` 可按本包设计前端入口、转化体验和最终浏览器验证。
- 不允许下游依赖的留白:
  1. 不得继续把无 `Lead` 的 `POST /projects` 当作正式用户入口。
  2. 不得在前端本地伪造 `Lead` 状态或从 `Project` 反推线索。
  3. 不得把 `Lead` 直接等价为立项已通过；转化后 `Project` 仍从 `assessment` 开始。

## 2. 正式输入

| Input Type                | Document / Source                              | Section / Anchor                 | Status     | Notes                                                                 |
| ------------------------- | ---------------------------------------------- | -------------------------------- | ---------- | --------------------------------------------------------------------- |
| Business design           | `project-lifecycle-design.md`                  | §3、§6、§9、§13                  | `active`   | `Lead` 负责最初线索阶段；无有效线索不得创建 `Project`。               |
| Business task map         | `phase2-user-task-map.md`                      | §4.1、§5.2、§7                   | `active`   | 销售人员从线索登记开始推进签约前主线。                                |
| Business authorization    | `business-authorization-matrix.md`             | §5.3                             | `active`   | `Project` 创建触发条件为已存在有效 `Lead`，组织范围来自 `Lead`。      |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md` + `ADR-015` | `EX-30 Lead / Project Bootstrap` | `aligned`  | 本片新增 planned routes 和 `POST /projects` implementation drift 行。 |
| Runtime fact              | `project.service.ts` + `project.controller.ts` | 当前 `createAndSave`             | `fact`     | 当前仍通过 `POST /projects` 直接创建 `Project`。                      |
| Runtime fact              | `shared-contracts.ts` + `project-list.ts`      | `CreateProjectRequest`           | `fact`     | 当前创建请求无 `leadId`，前端直接弹窗创建项目。                       |
| ADR                       | `adr/015-api-route-canonical-grammar.md`       | §4                               | `accepted` | 稳定资源使用 resource-first，转化命令使用 item custom method。        |

## 3. 本次 SSOT

| Concern                     | SSOT                                                               | Implementation Rule                                                                                   |
| --------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Business semantics          | `project-lifecycle-design.md`                                      | `Lead` 是线索入口；只有有效 `Lead` 才能转入正式 `Project`。                                           |
| Public route canonical path | `api-route-canonical-inventory.md`                                 | `Lead` 使用 `/leads` collection / item routes；转项目使用 `POST /leads/{id}:convertToProject`。       |
| Route / command naming      | `ADR-015` + `business-authorization-matrix.md`                     | 普通线索登记是 create；有效性、关闭和转项目是 item custom methods。                                   |
| DTO / contract naming       | 本包 §4 / §5                                                       | `LeadSummary`、`LeadListView`、`LeadDetailView`、`ConvertLeadToProjectRequest` 是后续 contract 名称。 |
| Table / column naming       | `project-lifecycle-design.md` + `table-structure-freeze-design.md` | `lead` 为新表；`project.source_lead_id` 在 `EX-32` 增加。                                             |
| Date / time semantics       | `schema-ddl-design.md` 当前 datetime 口径                          | `createdAt`、`qualifiedAt`、`convertedAt`、`closedAt` 均为 datetime。                                 |
| Identifier semantics        | 当前仓库 UUID 口径                                                 | `Lead.id` 与 `Project.sourceLeadId` 均为系统内 UUID。                                                 |
| Money / decimal semantics   | `N/A`                                                              | `EX-30~32` 不冻结线索金额字段；商机金额后续另开扩展，不阻断转化链。                                   |
| Status machine              | `project-lifecycle-design.md`                                      | `registered -> qualified -> converted / closed`；只有 `qualified` 可转项目。                          |

## 4. 命令与接口边界

| Route / Controller                  | Command / Service                | Request DTO / Contract        | Response DTO / Contract | Guard / Permission           | Design Source                                                      | Result                 |
| ----------------------------------- | -------------------------------- | ----------------------------- | ----------------------- | ---------------------------- | ------------------------------------------------------------------ | ---------------------- |
| `POST /leads`                       | `LeadService.createLead`         | `CreateLeadRequest`           | `LeadSummary`           | `lead:write`                 | `project-lifecycle-design.md` + `business-auth`                    | `planned / EX-31`      |
| `GET /leads`                        | `LeadQueryService.listLeads`     | `LeadListQuery`               | `LeadListView[]`        | `lead:read`                  | `phase2-user-task-map.md`                                          | `planned / EX-31`      |
| `GET /leads/{id}`                   | `LeadQueryService.getLeadDetail` | `N/A`                         | `LeadDetailView`        | `lead:read`                  | `project-lifecycle-design.md`                                      | `planned / EX-31`      |
| `PATCH /leads/{id}`                 | `LeadService.updateLead`         | `UpdateLeadRequest`           | `LeadSummary`           | `lead:write`                 | `business-authorization-matrix.md`                                 | `planned / EX-31`      |
| `POST /leads/{id}:qualify`          | `LeadService.qualifyLead`        | `QualifyLeadRequest`          | `LeadSummary`           | `lead:write`                 | `project-lifecycle-design.md`                                      | `planned / EX-31`      |
| `POST /leads/{id}:close`            | `LeadService.closeLead`          | `CloseLeadRequest`            | `LeadSummary`           | `lead:write`                 | `project-lifecycle-design.md`                                      | `planned / EX-31`      |
| `POST /leads/{id}:convertToProject` | `LeadService.convertToProject`   | `ConvertLeadToProjectRequest` | `ProjectSummary`        | `lead:write + project:write` | `business-authorization-matrix.md` + `project-lifecycle-design.md` | `planned / EX-32`      |
| `POST /projects`                    | `ProjectService.createAndSave`   | `CreateProjectRequest`        | `ProjectSummary`        | `project:write`              | `EX-17`                                                            | `implementation-drift` |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `POST /leads`
  - `GET /leads`
  - `GET /leads/{id}`
  - `PATCH /leads/{id}`
  - `POST /leads/{id}:qualify`
  - `POST /leads/{id}:close`
  - `POST /leads/{id}:convertToProject`
  - `GET /projects`
- Current implemented route(s):
  - `POST /projects`
  - `GET /projects`
- Inventory status:
  - `Lead` routes: `planned`
  - `convertLeadToProject`: `implementation-drift` because current implementation is `POST /projects`
  - `listProjects`: `aligned`
- Route governance source: `ADR-015` + `EX-30`
- Blocker / exception: `EX17-E2-LEAD-BOOTSTRAP` remains open until `FE-29` G4 closes the end-to-end chain.

## 5. 读侧边界

| Query / View     | Consumer                        | Fields                                                                                                                                                 | Filter / Sort                                         | Permission Boundary | Design Source                 | Result            |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------- | ----------------------------- | ----------------- |
| `LeadListView`   | `/leads`、项目管理入口          | `id`、`leadCode`、`leadName`、`customerName`、`status`、`ownerName`、`ownerOrgName`、`sourceChannel`、`createdAt`、`qualifiedAt`、`convertedProjectId` | `status`、`ownerOrgId`、`keyword`；默认按更新时间倒序 | `lead:read`         | `phase2-user-task-map.md`     | `planned / EX-31` |
| `LeadDetailView` | `/leads/{id}`、转项目前确认视图 | `LeadSummary` + `sourceSummary`、`qualificationSummary`、`closedReason`、`convertedAt`、`convertedProjectSummary`                                      | `N/A`                                                 | `lead:read`         | `project-lifecycle-design.md` | `planned / EX-31` |

## 6. 持久化边界

| Table          | Migration | Entity / Repository | DDL / Freeze Source                          | Check Result      |
| -------------- | --------- | ------------------- | -------------------------------------------- | ----------------- |
| `poms.lead`    | `EX-31`   | `Lead`              | `EX-30` + `table-structure-freeze-design.md` | `planned / EX-31` |
| `poms.project` | `EX-32`   | `Project`           | `EX-30` + `project-lifecycle-design.md`      | `planned / EX-32` |

| Field                       | Design Type / Meaning                         | Migration / DDL | Entity                    | Shared Contract / OpenAPI                                             | Result            |
| --------------------------- | --------------------------------------------- | --------------- | ------------------------- | --------------------------------------------------------------------- | ----------------- |
| `lead.id`                   | 系统内线索 UUID                               | `EX-31`         | `Lead.id`                 | `LeadSummary.id`                                                      | `planned / EX-31` |
| `lead.lead_code`            | 业务线索编号，创建后唯一                      | `EX-31`         | `Lead.leadCode`           | `CreateLeadRequest.leadCode` / `LeadSummary.leadCode`                 | `planned / EX-31` |
| `lead.lead_name`            | 线索标题 / 机会名称                           | `EX-31`         | `Lead.leadName`           | `CreateLeadRequest.leadName` / `LeadSummary.leadName`                 | `planned / EX-31` |
| `lead.customer_name`        | 当前无客户主数据时的客户名称事实              | `EX-31`         | `Lead.customerName`       | `CreateLeadRequest.customerName`                                      | `planned / EX-31` |
| `lead.status`               | `registered / qualified / converted / closed` | `EX-31`         | `Lead.status`             | `LeadStatus` enum                                                     | `planned / EX-31` |
| `lead.owner_org_id`         | 线索主责组织                                  | `EX-31`         | `Lead.ownerOrgId`         | `LeadSummary.ownerOrgId`                                              | `planned / EX-31` |
| `lead.owner_user_id`        | 线索主责人                                    | `EX-31`         | `Lead.ownerUserId`        | `LeadSummary.ownerUserId`                                             | `planned / EX-31` |
| `lead.converted_project_id` | 已转项目引用；转化后不可重复转化              | `EX-31`         | `Lead.convertedProjectId` | `LeadDetailView.convertedProjectSummary`                              | `planned / EX-31` |
| `project.source_lead_id`    | Project 来源线索引用                          | `EX-32`         | `Project.sourceLeadId`    | `ProjectSummary.sourceLeadId` / `ProjectDetailView.sourceLeadSummary` | `planned / EX-32` |

## 7. 一致性结论

- Document -> code: 当前代码缺 `Lead` 主对象，且 `POST /projects` 绕过有效线索前置；该 drift 由 `EX-31/32` 关闭。
- ADR-015 inventory -> route: `EX-30` 已新增 `Lead` planned routes 和 `convertLeadToProject` drift 行。
- Migration -> entity: 当前无 `Lead` migration/entity；由 `EX-31` 实施。
- Entity -> contract: 当前无 `Lead` contract；由 `EX-31` 实施。
- Route -> command: 当前 `POST /projects` 不是正式 `Lead -> Project` 转化命令；由 `EX-32` 收口。
- Query -> view: 当前无 `LeadListView` / `LeadDetailView`；由 `EX-31` 实施。
- Guard / permission: 本包冻结 `lead:read` / `lead:write` 与 `project:write` 组合；具体权限 seed / guard 由 `EX-31/32` 实施。
- OpenAPI / generated client: 本片不生成；由 `EX-31/32` 实施。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                  | Result | Gap / Reason                          |
| -------------------------------- | -------- | ----------------------------------- | ------ | ------------------------------------- |
| Lint                             | `no`     | `N/A`                               | `N/A`  | 本片不改代码。                        |
| Build                            | `no`     | `N/A`                               | `N/A`  | 本片不改代码。                        |
| Unit tests                       | `no`     | `N/A`                               | `N/A`  | 本片不改代码；`EX-31/32` 必须补测试。 |
| API / integration tests          | `no`     | `N/A`                               | `N/A`  | 本片不改 API runtime。                |
| E2E                              | `no`     | `N/A`                               | `N/A`  | 浏览器验证归属 `FE-29`。              |
| OpenAPI generation / client diff | `no`     | `N/A`                               | `N/A`  | 本片只冻结 planned routes。           |
| Migration / schema check         | `no`     | `N/A`                               | `N/A`  | 本片不新增 DDL。                      |
| Markdown format                  | `yes`    | `corepack pnpm run format:md:check` | `Pass` | 已执行并通过。                        |
| Diff hygiene                     | `yes`    | `git diff --check`                  | `Pass` | 已执行并通过。                        |

## 9. 例外与风险

| Exception ID             | Level | Scope                                               | Approved By                | Cleanup Owner | Cleanup Due | Notes                                                                    |
| ------------------------ | ----- | --------------------------------------------------- | -------------------------- | ------------- | ----------- | ------------------------------------------------------------------------ |
| `EX17-E2-LEAD-BOOTSTRAP` | `E2`  | 当前 `POST /projects` 仍可无 Lead bootstrap Project | `Solo worktree checkpoint` | `Codex`       | `FE-29` G4  | `EX-30` 只冻结关闭路径；真正运行时收口由 `EX-31/32` 与 `FE-27~29` 完成。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-25`
- Conditions:
  1. `EX-31` 不得创建 Project，只能实现 `Lead` 最小事实源、状态与读写 API。
  2. `EX-32` 必须把正式项目创建收口到 `POST /leads/{id}:convertToProject`，并记录 `Project.sourceLeadId`。
  3. `POST /projects` 后续不得继续作为正式用户创建入口；如为测试或 seed 保留，必须在 `EX-32` 明确 grandfathering 策略。
  4. `FE-29` G4 前不得清空 `EX-17` 的 `EX17-E2-LEAD-BOOTSTRAP` 例外。
