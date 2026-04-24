# EX-31 Lead 最小事实源、读写 API 与 generated client 落地

- Gate Status: `G1 = Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-31`
- Direct Input: `EX-30 Lead 主对象 route governance 与 EX17-E2 执行基线`

## 1. 范围

- 本次目标:
  1. 新增 `Lead` 最小事实源，支持线索登记、列表、详情、更新、有效化和关闭。
  2. 新增 `Lead` migration / entity / repository / service / query service / controller。
  3. 新增 shared contract、API DTO、OpenAPI、generated client 和 admin data-access 类型导出。
  4. 补 focused backend tests，证明状态机、唯一编号、查询映射和 controller DTO 转换成立。
- 本次明确不做:
  1. 不创建 `Project`。
  2. 不新增 `Lead -> Project` 转化命令。
  3. 不修改当前 `POST /projects` 行为。
  4. 不实现前端线索页面、菜单入口或浏览器 E2E。
- 下游可依赖的交付边界:
  1. `EX-32` 可依赖 `Lead` 表、状态机、`convertedProjectId` 字段和 generated client。
  2. `FE-27` 可依赖 `LeadApi`、`LeadListView`、`LeadDetailView`、`CreateLeadRequest`、`UpdateLeadRequest`、`QualifyLeadRequest`、`CloseLeadRequest`。

## 2. 正式输入

| Input Type      | Document / Source                         | Section / Anchor                 | Status    | Notes                                                                 |
| --------------- | ----------------------------------------- | -------------------------------- | --------- | --------------------------------------------------------------------- |
| Route baseline  | `ex-30-lead-route-governance-baseline.md` | §4                               | `frozen`  | `EX-31` 只实现 `/leads` collection / item routes，不实现 convert。    |
| Route inventory | `api-route-canonical-inventory.md`        | `EX-30 Lead / Project Bootstrap` | `planned` | `create/list/get/update/qualify/close Lead` 均已在 inventory 中冻结。 |
| Business design | `project-lifecycle-design.md`             | `Lead` lifecycle sections        | `active`  | `Lead` 是正式 Project 前置事实源。                                    |
| Authorization   | `business-authorization-matrix.md`        | `Lead` / Project bootstrap       | `active`  | 线索读写使用 `lead:read` / `lead:write`；不替代 Project 权限。        |
| Runtime fact    | current code                              | no `Lead` module                 | `fact`    | 当前代码无 Lead entity / contract / route / generated client。        |

## 3. SSOT

| Concern                     | SSOT                               | Implementation Rule                                                                         |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Public route canonical path | `api-route-canonical-inventory.md` | 本片只落地 `POST/GET /leads`、`GET/PATCH /leads/{id}`、`qualify`、`close`。                 |
| Status machine              | `EX-30` baseline                   | `registered -> qualified -> converted / closed`；本片只产生 `registered/qualified/closed`。 |
| DTO / contract naming       | `EX-30` baseline                   | 使用 `LeadSummary`、`LeadListView`、`LeadDetailView` 和对应 request 名称。                  |
| Persistence naming          | `EX-30` baseline                   | 表名 `poms.lead`；列名采用 snake_case；`converted_project_id` 预留给 `EX-32`。              |
| Date / time semantics       | current schema DDL                 | `createdAt`、`qualifiedAt`、`closedAt`、`convertedAt` 均为 datetime。                       |
| Identifier semantics        | current UUID convention            | `Lead.id`、owner id、`convertedProjectId` 均为系统内 UUID。                                 |
| Money / decimal semantics   | `N/A`                              | 本片不引入金额字段。                                                                        |

## 4. 命令与接口边界

| Route / Controller         | Command / Query                | Request DTO            | Response DTO / Contract | Guard / Permission | Result            |
| -------------------------- | ------------------------------ | ---------------------- | ----------------------- | ------------------ | ----------------- |
| `POST /leads`              | `LeadService.createLead`       | `CreateLeadRequest`    | `LeadSummary`           | `lead:write`       | `planned / EX-31` |
| `GET /leads`               | `LeadQueryService.listLeads`   | `LeadListQuery`        | `LeadListView[]`        | `lead:read`        | `planned / EX-31` |
| `GET /leads/{id}`          | `LeadQueryService.getLead`     | `N/A`                  | `LeadDetailView`        | `lead:read`        | `planned / EX-31` |
| `PATCH /leads/{id}`        | `LeadService.updateLead`       | `UpdateLeadRequest`    | `LeadSummary`           | `lead:write`       | `planned / EX-31` |
| `POST /leads/{id}:qualify` | `LeadService.qualifyLead`      | `QualifyLeadRequest`   | `LeadSummary`           | `lead:write`       | `planned / EX-31` |
| `POST /leads/{id}:close`   | `LeadService.closeLead`        | `CloseLeadRequest`     | `LeadSummary`           | `lead:write`       | `planned / EX-31` |
| `POST /projects`           | `ProjectService.createAndSave` | `CreateProjectRequest` | `ProjectSummary`        | `project:write`    | `unchanged`       |

## 5. 读侧边界

| Query / View     | Consumer              | Fields                                                                                                                                                 | Filter / Sort                                            | Permission Boundary | Result            |
| ---------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------- | ----------------- |
| `LeadListView`   | future `/leads` page  | `id`、`leadCode`、`leadName`、`customerName`、`status`、`ownerName`、`ownerOrgName`、`sourceChannel`、`createdAt`、`qualifiedAt`、`convertedProjectId` | `status`、`ownerOrgId`、`keyword`；默认 `updatedAt desc` | `lead:read`         | `planned / EX-31` |
| `LeadDetailView` | future lead detail UI | `LeadSummary` + `ownerName`、`ownerOrgName`、`sourceSummary`、`qualificationSummary`、`convertedProjectSummary`                                        | by `leadId`                                              | `lead:read`         | `planned / EX-31` |

## 6. 持久化边界

| Table       | Migration                                      | Entity | DDL / Freeze Source | Check Result      |
| ----------- | ---------------------------------------------- | ------ | ------------------- | ----------------- |
| `poms.lead` | `Migration20260425103000_ex31_lead_minimal...` | `Lead` | `EX-30` + this G1   | `planned / EX-31` |

| Field                        | Design Type / Meaning                         | Entity                      | Shared Contract / OpenAPI             | Result            |
| ---------------------------- | --------------------------------------------- | --------------------------- | ------------------------------------- | ----------------- |
| `lead.id`                    | 系统内线索 UUID                               | `Lead.id`                   | `LeadSummary.id`                      | `planned / EX-31` |
| `lead.lead_code`             | 业务线索编号，唯一                            | `Lead.leadCode`             | `LeadSummary.leadCode`                | `planned / EX-31` |
| `lead.lead_name`             | 线索标题 / 机会名称                           | `Lead.leadName`             | `LeadSummary.leadName`                | `planned / EX-31` |
| `lead.customer_name`         | 客户名称                                      | `Lead.customerName`         | `LeadSummary.customerName`            | `planned / EX-31` |
| `lead.source_channel`        | 线索来源渠道                                  | `Lead.sourceChannel`        | `LeadSummary.sourceChannel`           | `planned / EX-31` |
| `lead.status`                | `registered / qualified / converted / closed` | `Lead.status`               | `LeadStatus`                          | `planned / EX-31` |
| `lead.owner_org_id`          | 线索主责组织                                  | `Lead.ownerOrgId`           | `LeadSummary.ownerOrgId`              | `planned / EX-31` |
| `lead.owner_user_id`         | 线索主责人                                    | `Lead.ownerUserId`          | `LeadSummary.ownerUserId`             | `planned / EX-31` |
| `lead.qualification_summary` | 有效化说明                                    | `Lead.qualificationSummary` | `LeadDetailView.qualificationSummary` | `planned / EX-31` |
| `lead.qualified_at`          | 有效化时间                                    | `Lead.qualifiedAt`          | `LeadSummary.qualifiedAt`             | `planned / EX-31` |
| `lead.closed_reason`         | 关闭原因                                      | `Lead.closedReason`         | `LeadSummary.closedReason`            | `planned / EX-31` |
| `lead.closed_at`             | 关闭时间                                      | `Lead.closedAt`             | `LeadSummary.closedAt`                | `planned / EX-31` |
| `lead.converted_project_id`  | 已转项目引用                                  | `Lead.convertedProjectId`   | `LeadSummary.convertedProjectId`      | `planned / EX-31` |

## 7. 测试与校验

| Check                    | Required | Command / Evidence                              | Result | Gap / Reason                                        |
| ------------------------ | -------- | ----------------------------------------------- | ------ | --------------------------------------------------- |
| API lint                 | `yes`    | `corepack pnpm nx lint poms-api`                | `Pass` | 已执行并通过。                                      |
| API build                | `yes`    | `corepack pnpm nx build poms-api`               | `Pass` | 已执行并通过。                                      |
| API unit tests           | `yes`    | `corepack pnpm nx test poms-api`                | `Pass` | full suite `39 passed / 480 passed`。               |
| OpenAPI generation       | `yes`    | `corepack pnpm nx run poms-api:openapi`         | `Pass` | 已生成 `Lead` routes / schemas。                    |
| Generated client check   | `yes`    | `corepack pnpm nx run shared-api-client:check`  | `Pass` | 新增 `LeadApi` 与 Lead models 后同步。              |
| Migration / schema check | `yes`    | `corepack pnpm nx run poms-api:migration-check` | `Pass` | 先执行 `migration-up` 应用 EX-31 本地迁移后通过。   |
| E2E                      | `no`     | `N/A`                                           | `N/A`  | 最终浏览器链路归属 `FE-29`；本片以 API tests 为主。 |
| Markdown format          | `yes`    | `corepack pnpm run format:md:check`             | `Pass` | 已执行并通过。                                      |
| Diff hygiene             | `yes`    | `git diff --check`                              | `Pass` | 已执行并通过。                                      |

## 8. 例外与风险

| Exception ID             | Level | Scope                                                       | Approved By                | Cleanup Owner | Cleanup Due | Notes                                                                        |
| ------------------------ | ----- | ----------------------------------------------------------- | -------------------------- | ------------- | ----------- | ---------------------------------------------------------------------------- |
| `EX17-E2-LEAD-BOOTSTRAP` | `E2`  | `POST /projects` 仍可无 Lead bootstrap Project              | `Solo worktree checkpoint` | `Codex`       | `FE-29` G4  | 本片建立 Lead 事实源；正式转化和用户入口收口仍由 `EX-32` / `FE-28~29` 完成。 |
| `EX31-E1-NO-CONVERT`     | `E1`  | `convertedProjectSummary` 本片只定义 contract，不产生非空值 | `Solo worktree checkpoint` | `Codex`       | `EX-32` G4  | 转项目命令和 Project 摘要回填不属于本片。                                    |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-25`
- Conditions:
  1. `EX-31` 不得创建或修改 `Project`。
  2. `qualify` 和 `close` 必须维护 `Lead` 状态机，不得让 `closed` 或 `converted` 线索继续变更普通字段。
  3. `lead:read` / `lead:write` 必须进入 shared permission dictionary 和 dev role seed。
  4. OpenAPI / generated client 变更必须作为预期变更记录在 G3 close-out。
