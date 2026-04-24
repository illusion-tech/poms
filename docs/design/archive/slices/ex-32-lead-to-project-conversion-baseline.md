# EX-32 Lead -> Project 转化命令与直接创建 Project 收口

- Gate Status: `G1 = Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-32`
- Direct Input:
  - `EX-30 Lead 主对象 route governance 与 EX17-E2 执行基线`
  - `EX-31 Lead 最小事实源、读写 API 与 generated client`

## 1. 范围

- 本次目标:
  1. 新增 `Project.sourceLeadId`，使正式 Project 可追溯到来源 `Lead`。
  2. 新增 `POST /leads/{id}:convertToProject` 转化命令，只允许 `qualified` Lead 转入 Project。
  3. 转化时创建 Project，并把 `Lead` 状态更新为 `converted`，回写 `convertedProjectId`、`convertedAt`、`convertedBy`。
  4. Project 的客户、主责组织、主责人从 Lead 继承；Project 默认从 `assessment` 阶段开始。
  5. 更新 shared contract、API DTO、OpenAPI、generated client、admin data-access 导出和 focused backend tests。
- 本次明确不做:
  1. 不实现前端线索列表、详情、转项目按钮或菜单入口；归属 `FE-27/28`。
  2. 不删除 `POST /projects` runtime route；它临时保留为 legacy/dev/test/bootstrap 兼容入口，不再作为正式用户入口。
  3. 不补完整 CRM 机会金额、客户主数据或商机评分。
  4. 不关闭 `EX17-E2-LEAD-BOOTSTRAP`；最终关闭归属 `FE-29` 浏览器验证。
- 下游可依赖的交付边界:
  1. `FE-28` 可依赖 `LeadApi.convertLeadToProject` 和 `ProjectSummary.sourceLeadId`。
  2. 项目详情可依赖 `ProjectDetailView.sourceLeadSummary` 展示来源线索摘要。
  3. API consumer 可通过 `LeadDetailView.convertedProjectSummary` 判断 Lead 是否已转项目。
- 不允许下游依赖的留白:
  1. 不得继续把 `POST /projects` 作为正式用户创建项目入口。
  2. 不得允许非 `qualified` Lead 转项目。
  3. 不得允许同一 Lead 重复转项目。
  4. 不得在前端伪造 `sourceLeadId` 或从 Project 反推 Lead。

## 2. 正式输入

| Input Type                | Document / Source                         | Section / Anchor             | Status                 | Notes                                                                               |
| ------------------------- | ----------------------------------------- | ---------------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| Route baseline            | `ex-30-lead-route-governance-baseline.md` | §4、§6、§10                  | `frozen`               | `POST /leads/{id}:convertToProject` 已冻结为 item custom method。                   |
| Runtime baseline          | `ex-31-lead-minimal-fact-source-*`        | `Lead` entity / status / API | `committed`            | `Lead` 最小事实源已提交，状态机包含 `registered / qualified / converted / closed`。 |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`        | `convertLeadToProject`       | `implementation-drift` | 当前实现仍为 `POST /projects`；本片关闭正式 route drift。                           |
| Business design           | `project-lifecycle-design.md`             | `Lead` / `Project` lifecycle | `active`               | 有效 Lead 才能创建正式 Project；转化后 Project 从 `assessment` 开始。               |
| Authorization             | `business-authorization-matrix.md`        | `Lead` / Project bootstrap   | `active`               | 转化命令要求 `lead:write + project:write`。                                         |
| Runtime fact              | `project.service.ts`                      | `createAndSave`              | `fact`                 | 当前 `POST /projects` 按操作者主责组织创建 Project。                                |
| Runtime fact              | API E2E helpers                           | `createProjectForProfile` 等 | `fact`                 | 大量既有测试仍用 `POST /projects` 建测试项目；本片必须 grandfather。                |

## 3. SSOT

| Concern                     | SSOT                               | Implementation Rule                                                                                  |
| --------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Business semantics          | `EX-30` baseline                   | 正式 Project 创建来自有效 Lead 转化；legacy `POST /projects` 只服务兼容和测试 bootstrap。            |
| Public route canonical path | `api-route-canonical-inventory.md` | 转化命令为 `POST /leads/{id}:convertToProject`。                                                     |
| Route / command naming      | `ADR-015`                          | `convertToProject` 是 Lead item custom method，不是 Project collection create。                      |
| DTO / contract naming       | 本包 §4 / §5                       | 新增 `ConvertLeadToProjectRequest`，扩展 `ProjectSummary` / `ProjectDetailView` / `LeadDetailView`。 |
| Table / column naming       | `EX-30` baseline                   | `poms.project.source_lead_id`，实体字段 `sourceLeadId`。                                             |
| Date / time semantics       | 当前 schema DDL                    | `convertedAt` 与 Project audit fields 均为 datetime。                                                |
| Identifier semantics        | 当前 UUID convention               | `Lead.id`、`Project.id`、`Project.sourceLeadId` 均为系统内 UUID。                                    |
| Money / decimal semantics   | `N/A`                              | 本片不引入金额字段。                                                                                 |
| Status machine              | `EX-30` + `EX-31`                  | 只有 `qualified` 可转 `converted`；`registered`、`closed`、`converted` 都不可转项目。                |

## 4. 命令与接口边界

| Route / Controller                  | Command / Service                      | Request DTO / Contract        | Response DTO / Contract | Guard / Permission           | Design Source | Result             |
| ----------------------------------- | -------------------------------------- | ----------------------------- | ----------------------- | ---------------------------- | ------------- | ------------------ |
| `POST /leads/{id}:convertToProject` | `LeadService.convertToProject`         | `ConvertLeadToProjectRequest` | `ProjectSummary`        | `lead:write + project:write` | `EX-30`       | `planned / EX-32`  |
| `GET /leads/{id}`                   | `LeadQueryService.getLead`             | `N/A`                         | `LeadDetailView`        | `lead:read`                  | `EX-31`       | `extend summary`   |
| `GET /projects/{id}`                | `ProjectQueryService.getProjectDetail` | `N/A`                         | `ProjectDetailView`     | `project:read`               | `EX-30`       | `extend summary`   |
| `POST /projects`                    | `ProjectService.createAndSave`         | `CreateProjectRequest`        | `ProjectSummary`        | `project:write`              | `EX-17`       | `legacy-exception` |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `POST /leads/{id}:convertToProject`
  - `GET /leads/{id}`
  - `GET /projects/{id}`
- Current implemented route(s):
  - `POST /projects`
  - `GET /leads/{id}`
  - `GET /projects/{id}`
- Inventory status:
  - `convertLeadToProject`: `implementation-drift` before this slice; expected `aligned` at G4.
  - `POST /projects`: retained as `legacy-exception` until FE user entry is removed and E2E proves no formal path uses it.
- Route governance source: `ADR-015` + `EX-30`
- Blocker / exception:
  - `EX32-E1-LEGACY-PROJECT-CREATE-ROUTE`
  - `EX17-E2-LEAD-BOOTSTRAP`

## 5. 读侧边界

| Query / View        | Consumer                           | Fields                                                                       | Filter / Sort  | Permission Boundary | Design Source | Result           |
| ------------------- | ---------------------------------- | ---------------------------------------------------------------------------- | -------------- | ------------------- | ------------- | ---------------- |
| `LeadDetailView`    | Lead detail / FE-28                | existing fields + `convertedProjectSummary` populated after conversion       | by `leadId`    | `lead:read`         | `EX-30/31`    | `extend / EX-32` |
| `ProjectSummary`    | Project list / conversion response | existing fields + `sourceLeadId`                                             | existing       | `project:read`      | `EX-30`       | `extend / EX-32` |
| `ProjectDetailView` | Project detail / workspace         | existing fields + `sourceLeadSummary` with lead id/code/name/customer/status | by `projectId` | `project:read`      | `EX-30`       | `extend / EX-32` |

## 6. 持久化边界

| Table          | Migration                                 | Entity / Repository             | DDL / Freeze Source | Check Result      |
| -------------- | ----------------------------------------- | ------------------------------- | ------------------- | ----------------- |
| `poms.project` | new `EX-32` migration                     | `Project` / `ProjectRepository` | `EX-30` + this G1   | `planned / EX-32` |
| `poms.lead`    | existing `EX-31` migration, no new column | `Lead` / `LeadRepository`       | `EX-31`             | `reuse`           |

| Field                       | Design Type / Meaning                 | Migration / DDL             | Entity                    | Shared Contract / OpenAPI                                             | Result            |
| --------------------------- | ------------------------------------- | --------------------------- | ------------------------- | --------------------------------------------------------------------- | ----------------- |
| `project.source_lead_id`    | nullable UUID; Project 来源 Lead 引用 | add nullable column + index | `Project.sourceLeadId`    | `ProjectSummary.sourceLeadId` / `ProjectDetailView.sourceLeadSummary` | `planned / EX-32` |
| `lead.converted_project_id` | nullable UUID; Lead 已转 Project 引用 | existing                    | `Lead.convertedProjectId` | `LeadDetailView.convertedProjectSummary`                              | `write / EX-32`   |
| `lead.converted_at`         | nullable datetime; 转化发生时间       | existing                    | `Lead.convertedAt`        | `LeadSummary.convertedAt`                                             | `write / EX-32`   |
| `lead.converted_by`         | nullable UUID; 转化操作人             | existing                    | `Lead.convertedBy`        | `LeadSummary.convertedBy`                                             | `write / EX-32`   |

## 7. 一致性结论

- Document -> code: 当前代码已有 `Lead` 最小事实源，但 Project 仍无 `sourceLeadId`；本片修复。
- ADR-015 inventory -> route: canonical route 已存在，runtime route 未实现；本片实现并在 G4 更新 inventory 状态。
- Migration -> entity: 需要先写 migration，再补 `Project.sourceLeadId` entity/index。
- Entity -> contract: `Project.sourceLeadId` 必须进入 shared contract、OpenAPI 和 generated client。
- Route -> command: 转化命令必须由 Lead item route 驱动，不从 Project create route 接收 `leadId`。
- Query -> view: `LeadDetailView.convertedProjectSummary` 与 `ProjectDetailView.sourceLeadSummary` 必须互相可解释。
- Guard / permission: `POST /leads/{id}:convertToProject` 使用 `lead:write + project:write`；legacy `POST /projects` 暂不改 guard。
- OpenAPI / generated client: 预期变更，G3 必须记录 generate/check 结果。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                  | Result    | Gap / Reason                                              |
| -------------------------------- | -------- | ------------------------------------------------------------------- | --------- | --------------------------------------------------------- |
| API lint                         | `yes`    | `corepack pnpm nx lint poms-api`                                    | `Pending` | runtime implementation 后执行。                           |
| API build                        | `yes`    | `corepack pnpm nx build poms-api`                                   | `Pending` | runtime implementation 后执行。                           |
| API unit tests                   | `yes`    | focused lead/project tests + full poms-api tests                    | `Pending` | 覆盖成功转化、非 qualified 拒绝、重复转化拒绝、摘要回填。 |
| API / integration tests          | `yes`    | `corepack pnpm nx e2e poms-api-e2e` or focused route tests          | `Pending` | 至少覆盖登录 token 下转化 route 与权限/状态边界。         |
| E2E                              | `no`     | `N/A`                                                               | `N/A`     | 浏览器用户入口归属 `FE-28/29`。                           |
| OpenAPI generation / client diff | `yes`    | `corepack pnpm nx run poms-api:openapi` + `shared-api-client:check` | `Pending` | 新 route、新 DTO、新字段均为预期变更。                    |
| Migration / schema check         | `yes`    | `corepack pnpm nx run poms-api:migration-check`                     | `Pending` | 需要先应用/校验 EX-32 migration。                         |
| Markdown format                  | `yes`    | `corepack pnpm run format:md:check`                                 | `Pending` | G1/G3/G4 文档 touched。                                   |
| Diff hygiene                     | `yes`    | `git diff --check`                                                  | `Pending` | G3 前执行。                                               |

## 9. 例外与风险

| Exception ID                          | Level | Scope                                                                         | Approved By                | Cleanup Owner | Cleanup Due | Notes                                                                                    |
| ------------------------------------- | ----- | ----------------------------------------------------------------------------- | -------------------------- | ------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `EX32-E1-LEGACY-PROJECT-CREATE-ROUTE` | `E1`  | `POST /projects` runtime route 保留给既有数据、seed、dev 和 API E2E bootstrap | `Solo worktree checkpoint` | `Codex`       | `FE-29` G4  | 本片不删除 route，但正式用户入口必须在 `FE-28/29` 从项目创建切到 Lead 转化。             |
| `EX17-E2-LEAD-BOOTSTRAP`              | `E2`  | 端到端用户路径尚未证明 Lead bootstrap 完整替代直接项目创建                    | `Solo worktree checkpoint` | `Codex`       | `FE-29` G4  | `EX-32` 只关闭后端命令和数据来源；前端入口、浏览器验证和最终例外关闭由 `FE-27~29` 完成。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-25`
- Conditions:
  1. Runtime implementation 必须先落 `project.source_lead_id` migration，再改 entity/contract/controller。
  2. `convertToProject` 必须在同一命令内创建 Project 并回写 Lead converted 字段。
  3. `POST /projects` 可以保留，但不得新增为正式前端入口，也不得作为 FE-28 的实现依赖。
  4. G3 必须记录 OpenAPI/generated client 预期变更、migration drift 分类和 legacy route 例外状态。
