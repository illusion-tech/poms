# FE-28 从有效线索创建项目的前端转化体验实施基线

- Gate Status: `Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-28`

## 1. 范围

- 本次目标:
  1. 在线索列表和线索详情中，为 `qualified` 线索提供“转入项目”动作。
  2. 调用现有 generated client `LeadApi.leadControllerConvertToProject`，提交 `ConvertLeadToProjectRequest`。
  3. 转化成功后进入项目详情或工作区，并刷新线索列表 / 详情状态。
  4. 项目列表不再把无 Lead 的“新建项目”作为主要用户入口，默认引导到线索登记 / 转化链路。
  5. 项目详情展示来源线索摘要，帮助用户理解项目从哪条线索转入。
- 本次明确不做:
  1. 不新增或修改后端 public API。
  2. 不删除 `POST /projects` legacy/dev/test route；该例外最终由 `FE-29` 浏览器验证和 G4 关闭。
  3. 不补全登录后浏览器 E2E 矩阵；归属 `FE-29`。
  4. 不改变 Lead / Project 持久化模型。
- 下游可依赖的交付边界:
  - `FE-29` 可基于本片验证菜单进入线索、有效线索转项目、跳转项目详情 / 工作区和直接 Project create UX 收口。
- 不允许下游依赖的留白:
  - 不得把 `ProjectStore.createProject` 视为正式用户创建入口；它仅保留为 legacy/dev/test 兼容和既有页面内部能力。

## 2. 正式输入

| Input Type                | Document / Source                                                            | Section / Anchor                      | Status | Notes                                               |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- | ------ | --------------------------------------------------- |
| Business design           | `docs/design/project-lifecycle-design.md`                                    | Lead before project lifecycle         | Pass   | 项目正式生命周期前必须先经过线索 / 商机入口。       |
| Command design            | `docs/design/archive/slices/ex-32-lead-to-project-conversion-g4-closeout.md` | Delivered boundary                    | Pass   | `Lead -> Project` 命令、来源映射和回写已完成。      |
| DTO / OpenAPI design      | `libs/shared/api-client/api/lead.service.ts`                                 | `leadControllerConvertToProject`      | Pass   | 本片只消费 generated client。                       |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                               | `POST /leads/{id}:convertToProject`   | Pass   | 已由 `EX-30/32` 冻结。                              |
| Query boundary            | `libs/shared/api-client/model/lead-detail-view.ts`                           | `convertedProjectSummary`             | Pass   | 用于转化后展示已转项目信息。                        |
| Query boundary            | `libs/shared/api-client/model/project-detail-view.ts`                        | `sourceLeadSummary`                   | Pass   | 用于项目详情来源线索摘要。                          |
| Frontend baseline         | `docs/design/archive/slices/fe-27-lead-entry-list-frontend-g3-checkpoint.md` | `FE-27 -> FE-28 boundary`             | Pass   | `/leads`、`LeadStore` 和线索列表 / 详情入口已存在。 |
| Data model / table freeze | `docs/design/archive/slices/ex-32-lead-to-project-conversion-g4-closeout.md` | `sourceLeadId` / `convertedProjectId` | Pass   | 本片不触碰持久化。                                  |
| Schema / DDL              | `docs/design/archive/slices/ex-32-lead-to-project-conversion-g4-closeout.md` | Validation evidence                   | Pass   | 已由后端切片验证。                                  |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                | command route grammar                 | Pass   | 继续使用既有 command route。                        |

## 3. 本次 SSOT

| Concern                     | SSOT                                                      | Implementation Rule                                           |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| Business semantics          | `EX-32` G4 + project lifecycle design                     | 只有 `qualified` 线索可由正式前端转项目。                     |
| Public route canonical path | `docs/design/api-route-canonical-inventory.md`            | 不新增 route，不绕过 `POST /leads/{id}:convertToProject`。    |
| Route / command naming      | generated client `LeadApi.leadControllerConvertToProject` | Store 方法命名为 `convertLeadToProject`。                     |
| DTO / contract naming       | `ConvertLeadToProjectRequest` / `ProjectSummary`          | 前端 view model 不新造 wire contract。                        |
| Table / column naming       | `N/A`                                                     | 本片不改数据库。                                              |
| Date / time semantics       | `plannedSignAt` optional string or null                   | 前端允许空值；如填写则以 HTML date 输入的 `yyyy-MM-dd` 传递。 |
| Identifier semantics        | `lead.id` / returned `project.id`                         | 成功后用返回的 `ProjectSummary.id` 跳转项目详情。             |
| Money / decimal semantics   | `N/A`                                                     | 本片无金额。                                                  |
| Status machine              | `LeadStatus.Qualified -> Converted`                       | UI 只暴露 qualified 转化，converted/closed 不可重复转化。     |

## 4. 命令与接口边界

| Route / Controller                      | Command / Service                | Request DTO / Contract        | Response DTO / Contract | Guard / Permission         | Design Source | Result |
| --------------------------------------- | -------------------------------- | ----------------------------- | ----------------------- | -------------------------- | ------------- | ------ |
| `POST /api/leads/{id}:convertToProject` | `LeadStore.convertLeadToProject` | `ConvertLeadToProjectRequest` | `ProjectSummary`        | `lead:write` UI visibility | `EX-32`       | Pass   |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `POST /leads/{id}:convertToProject`
- Current implemented route(s): `POST /api/leads/{id}:convertToProject`
- Inventory status: `aligned`
- Route governance source: `EX-30` / `EX-32`
- Blocker / exception: none for this slice

## 5. 读侧边界

| Query / View        | Consumer          | Fields                                        | Filter / Sort | Permission Boundary        | Design Source | Result |
| ------------------- | ----------------- | --------------------------------------------- | ------------- | -------------------------- | ------------- | ------ |
| `LeadListView[]`    | `/leads` table    | status, convertedProjectId                    | existing UI   | `lead:read` route guard    | `FE-27`       | Pass   |
| `LeadDetailView`    | lead detail modal | qualificationSummary, convertedProjectSummary | `lead.id`     | `lead:read` route guard    | `FE-27/28`    | Pass   |
| `ProjectDetailView` | project detail    | sourceLeadSummary                             | `project.id`  | `project:read` route guard | `EX-32`       | Pass   |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result     |
| ----- | --------- | ------------------- | ------------------- | ---------------- |
| `N/A` | `N/A`     | `N/A`               | `EX-32`             | 本片不改持久化。 |

| Field           | Design Type / Meaning | Migration / DDL | Entity                  | Shared Contract / OpenAPI                                             | Result |
| --------------- | --------------------- | --------------- | ----------------------- | --------------------------------------------------------------------- | ------ |
| `plannedSignAt` | 可选计划签约日期      | `EX-32`         | `Project.plannedSignAt` | `ConvertLeadToProjectRequest.plannedSignAt`                           | Pass   |
| `sourceLeadId`  | 项目来源线索 ID       | `EX-32`         | `Project.sourceLeadId`  | `ProjectSummary.sourceLeadId` / `ProjectDetailView.sourceLeadSummary` | Pass   |

## 7. 一致性结论

- Document -> code: `FE-28` 只补正式用户转化入口，不扩展后端语义。
- ADR-015 inventory -> route: 已由 `EX-30/32` 对齐。
- Migration -> entity: 不适用，本片不触碰。
- Entity -> contract: 消费 `EX-32` 已同步的 generated client。
- Route -> command: `LeadStore.convertLeadToProject` 直接调用 generated client command。
- Query -> view: 线索详情和项目详情只展示现有 summary 字段。
- Guard / permission: route 继续用 `lead:read`；转化按钮用 `lead:write` 且限定 `qualified` 状态。
- OpenAPI / generated client: 不需要重新生成，除非实现中发现缺口。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                | Result       | Gap / Reason                           |
| -------------------------------- | -------- | --------------------------------------------------------------------------------- | ------------ | -------------------------------------- |
| Lint                             | yes      | `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access`     | pending G3   | 前端与 store touched。                 |
| Build                            | yes      | `corepack pnpm nx build poms-admin`                                               | pending G3   | 前端切片必须跑。                       |
| Unit tests                       | yes      | focused lead/project/detail tests; `corepack pnpm nx test poms-admin --runInBand` | pending G3   | 覆盖按钮、请求 shape、跳转和来源摘要。 |
| API / integration tests          | no       | `N/A`                                                                             | not required | 本片不改 API runtime。                 |
| E2E                              | deferred | `FE-29`                                                                           | not required | 登录后完整 journey 归属 `FE-29`。      |
| OpenAPI generation / client diff | no       | `N/A`                                                                             | not required | 仅消费 `EX-32` generated client。      |
| Migration / schema check         | no       | `N/A`                                                                             | not required | 本片不改 persistence。                 |

## 9. 例外与风险

| Exception ID                               | Level | Scope                                                                  | Approved By | Cleanup Owner | Cleanup Due | Notes                                    |
| ------------------------------------------ | ----- | ---------------------------------------------------------------------- | ----------- | ------------- | ----------- | ---------------------------------------- |
| `FE28-E1-LEGACY-PROJECT-CREATE-ROUTE-OPEN` | E1    | `POST /projects` runtime route 和 store 方法仍保留给 legacy/dev/test。 | Codex       | Codex         | `FE-29` G4  | 本片收口正式用户入口，不删除后端 route。 |
| `FE28-E2-BROWSER-JOURNEY-DEFERRED`         | E1    | 登录后菜单 / 按钮 / 直接 URL 完整矩阵未在本片关闭。                    | Codex       | Codex         | `FE-29` G4  | 本片以 unit/lint/build 收口。            |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-25`
- Conditions:
  1. 不新增后端 API。
  2. 转化动作只对 `qualified` 线索、且有 `lead:write` 的用户可见。
  3. 成功后必须跳转到 returned `ProjectSummary.id` 对应项目页面，并保留已转化线索的只读解释。
