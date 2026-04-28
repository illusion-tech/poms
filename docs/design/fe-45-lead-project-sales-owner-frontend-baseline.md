# FE-45 Lead / Project 销售主责前端收口实施基线包

- Gate Status: `G1 = Pass`
- Parent: `EX-41`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-29`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-45`

## 1. 范围

- 本次目标:
  1. 在线索登记表单中显式选择线索销售主责，默认当前登记用户；登记人继续由审计字段表达，不作为可编辑业务字段。
  2. 在线索列表、详情、确认有效和转项目入口统一使用“销售主责 / 主责组织”文案，并在转项目前展示将被继承的项目销售主责。
  3. 在项目详情展示项目销售主责和主责组织；当 `ProjectDetailView.allowedActions` 含 `reassign-project-owner` 时，显示受控“变更销售主责”入口。
  4. 通过 `ProjectStore.reassignProjectOwner` 消费 generated client 的 `projectControllerReassignOwner`，提交 `ReassignProjectOwnerRequest` 的目标主责、原因和并发版本。
  5. 补 focused unit 覆盖线索登记 owner request、转项目 owner 继承展示、项目详情按钮显隐和 reassign request shape。
- 本次明确不做:
  1. 不新增、修改或删除后端 public API route。
  2. 不把 `ownerUserId / ownerOrgId` 加入 `PATCH /projects/{id}` 普通基础信息编辑。
  3. 不修改 `ConvertLeadToProjectRequest`；转项目当场覆盖项目销售主责仍由 `EX41-E2-CONVERSION-OWNER-OVERRIDE` 保持后续决策。
  4. 不改提成角色、移交参与人或执行期项目负责人模型。
- 下游可依赖的交付边界:
  1. 销售可以在登记线索时明确线索销售主责。
  2. 转项目前能看见项目将继承的销售主责，不再把确认人 / 转化人误认为负责人。
  3. 项目创建后可在项目详情通过受控命令变更项目销售主责。
- 不允许下游依赖的留白:
  1. 本片不提供转项目时直接覆盖 owner 的 DTO 或后端能力。
  2. 本片不承诺完整对象级组织范围授权已在前端本地实现；最终可操作性以后端 `allowedActions` 和 command guard 为准。

## 2. 正式输入

| Input Type                | Document / Source                                                                     | Section / Anchor                                       | Status | Notes                                                          |
| ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------ | -------------------------------------------------------------- |
| Business design           | `docs/design/ex-41-lead-project-owner-responsibility-governance-baseline.md`          | `§2` / `§6` / `§10`                                    | Pass   | 冻结登记人、线索销售主责、项目销售主责和执行负责人边界。       |
| Command design            | `docs/design/interface-command-design.md`                                             | `Project.reassignProjectOwner`                         | Pass   | 项目销售主责变更走受控命令。                                   |
| DTO / OpenAPI design      | `docs/design/interface-openapi-dto-design.md`                                         | `POST /projects/{id}:reassignOwner`                    | Pass   | request 包含 owner、reason、expectedVersion。                  |
| Runtime close-out         | `docs/design/archive/slices/ex-41a-project-owner-reassignment-command-g4-closeout.md` | `Downstream Readiness`                                 | Pass   | generated client 和 `reassign-project-owner` action key 可用。 |
| Frontend baseline         | `docs/design/archive/slices/fe-27-lead-entry-list-frontend-baseline.md`               | Lead list / registration boundary                      | Pass   | `/leads`、`LeadStore` 和登记弹窗已存在。                       |
| Frontend baseline         | `docs/design/archive/slices/fe-28-lead-to-project-frontend-baseline.md`               | Lead conversion boundary                               | Pass   | 转项目前端入口已存在。                                         |
| Query boundary            | `docs/design/query-view-boundary-design.md`                                           | `ProjectDetailView`                                    | Pass   | 详情通过 `allowedActions` 控制销售主责变更入口。               |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                        | `POST /projects/{id}:reassignOwner`                    | Pass   | `EX-41A` 已对齐；本片只消费。                                  |
| Data model / table freeze | `docs/design/table-structure-freeze-design.md`                                        | `project.owner*` / `project_owner_reassignment_record` | Pass   | 前端不改 persistence。                                         |
| Schema / DDL              | `docs/design/schema-ddl-design.md`                                                    | project owner fields and reassignment record           | Pass   | 由 `EX-41A` 验证。                                             |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                         | item custom method route grammar                       | Pass   | 不新增 route surface。                                         |

## 3. 本次 SSOT

| Concern                     | SSOT                                                             | Implementation Rule                                                                  |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Business semantics          | `EX-41` baseline                                                 | `createdBy` 是审计操作者；UI 业务文案统一称 `销售主责`，不称登记人为负责人。         |
| Public route canonical path | `api-route-canonical-inventory.md`                               | 只消费已实现的 `POST /projects/{id}:reassignOwner`。                                 |
| Route / command naming      | generated client `ProjectApi.projectControllerReassignOwner`     | Store 方法命名为 `reassignProjectOwner`，组件不直接调用 generated API。              |
| DTO / contract naming       | `ReassignProjectOwnerRequest` / `ProjectOwnerReassignmentResult` | 前端 request 使用 `ownerUserId`、`ownerOrgId`、`reason`、`expectedVersion`。         |
| Table / column naming       | `N/A`                                                            | 本片不改数据库。                                                                     |
| Date / time semantics       | `N/A`                                                            | 本片不新增日期输入；继续显示后端时间字段。                                           |
| Identifier semantics        | generated DTO ids                                                | 用户下拉以姓名 / 组织名显示，提交稳定 id；页面不把 UUID 当业务文案。                 |
| Money / decimal semantics   | `N/A`                                                            | 本片无金额。                                                                         |
| Status machine              | `ProjectDetailView.allowedActions` + backend command guard       | 只有 action key 存在时显示变更入口；前端不本地猜测 active / blocked 之外的可操作性。 |

## 4. 命令与接口边界

| Route / Controller                      | Command / Service                   | Request DTO / Contract        | Response DTO / Contract          | Guard / Permission               | Design Source | Result                          |
| --------------------------------------- | ----------------------------------- | ----------------------------- | -------------------------------- | -------------------------------- | ------------- | ------------------------------- |
| `POST /api/projects/{id}:reassignOwner` | `ProjectStore.reassignProjectOwner` | `ReassignProjectOwnerRequest` | `ProjectOwnerReassignmentResult` | `allowedActions` + backend guard | `EX-41A`      | planned                         |
| `POST /api/leads`                       | `LeadStore.createLead`              | `CreateLeadRequest`           | `LeadSummary`                    | `lead:write` UI visibility       | `FE-27`       | reuse / extend request          |
| `POST /api/leads/{id}:convertToProject` | `LeadStore.convertLeadToProject`    | `ConvertLeadToProjectRequest` | `ProjectSummary`                 | `lead:write` UI visibility       | `FE-28`       | reuse / display inherited owner |
| `GET /api/projects/{id}`                | `ProjectStore.loadProject`          | `N/A`                         | `ProjectDetailView`              | `project:read` route guard       | `EX-41A`      | reuse                           |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `POST /projects/{id}:reassignOwner`
- Current implemented route(s): `POST /api/projects/{id}:reassignOwner`
- Inventory status: `aligned`
- Route governance source: `EX-41A`
- Blocker / exception: none for frontend consumption

## 5. 读侧边界

| Query / View               | Consumer              | Fields                                                      | Filter / Sort | Permission Boundary        | Design Source | Result            |
| -------------------------- | --------------------- | ----------------------------------------------------------- | ------------- | -------------------------- | ------------- | ----------------- |
| `LeadListView[]`           | `/leads` table        | `ownerName`、`ownerOrgName`                                 | existing UI   | `lead:read` route guard    | `FE-27`       | reuse             |
| `LeadDetailView`           | lead detail / convert | `ownerUserId`、`ownerOrgId`、`ownerName`、`ownerOrgName`    | `lead.id`     | `lead:read` route guard    | `EX-41`       | reuse             |
| `PlatformUserSummary[]`    | owner selectors       | `id`、`displayName`、`primaryOrgUnitId`、`isActive`         | active only   | existing platform API      | Current code  | planned           |
| `PlatformOrgUnitSummary[]` | owner org selectors   | `id`、`name`、`isActive`                                    | active only   | existing platform API      | Current code  | planned           |
| `ProjectDetailView`        | project detail        | `ownerName`、`ownerOrgName`、`rowVersion`、`allowedActions` | `project.id`  | `project:read` route guard | `EX-41A`      | reuse / extend UI |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result     |
| ----- | --------- | ------------------- | ------------------- | ---------------- |
| `N/A` | `N/A`     | `N/A`               | `EX-41A`            | 本片不改持久化。 |

| Field                 | Design Type / Meaning | Migration / DDL | Entity                                  | Shared Contract / OpenAPI                          | Result            |
| --------------------- | --------------------- | --------------- | --------------------------------------- | -------------------------------------------------- | ----------------- |
| `Lead.ownerUserId`    | 线索销售主责用户      | existing        | `Lead.ownerUserId`                      | `CreateLeadRequest.ownerUserId` / `LeadDetailView` | planned UI submit |
| `Lead.ownerOrgId`     | 线索主责组织          | existing        | `Lead.ownerOrgId`                       | `CreateLeadRequest.ownerOrgId` / `LeadDetailView`  | planned UI submit |
| `Project.ownerUserId` | 项目销售主责用户      | `EX-41A`        | `Project.ownerUserId`                   | `ReassignProjectOwnerRequest.ownerUserId`          | planned command   |
| `Project.ownerOrgId`  | 项目主责组织          | `EX-41A`        | `Project.ownerOrgId`                    | `ReassignProjectOwnerRequest.ownerOrgId`           | planned command   |
| `reason`              | 项目销售主责变更原因  | `EX-41A`        | `ProjectOwnerReassignmentRecord.reason` | `ReassignProjectOwnerRequest.reason`               | planned command   |
| `expectedVersion`     | 项目并发版本          | existing        | `Project.rowVersion`                    | `ReassignProjectOwnerRequest.expectedVersion`      | planned command   |

## 7. 一致性结论

- Document -> code: 本片只实现 `EX-41` / `EX-41A` 前端消费边界。
- ADR-015 inventory -> route: 不新增 route；消费已 aligned 的 `POST /projects/{id}:reassignOwner`。
- Migration -> entity: 不适用，本片不触碰。
- Entity -> contract: 消费 `EX-41A` 已同步的 generated client。
- Route -> command: `ProjectStore.reassignProjectOwner` 直接调用 generated client command，并刷新项目详情。
- Query -> view: owner 文案来自 `ownerName / ownerOrgName`，操作边界来自 `allowedActions`。
- Guard / permission: 按 route guard + button visibility 控制；最终以后端 command guard 为准。
- OpenAPI / generated client: 不重新生成；本片仅消费已有 client。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                             | Result       | Gap / Reason                                                    |
| -------------------------------- | -------- | -------------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| Lint                             | yes      | `corepack pnpm nx lint poms-admin`                             | pending G3   | 前端切片必须跑。                                                |
| Build                            | yes      | `corepack pnpm nx build poms-admin`                            | pending G3   | Angular template / generated types 编译。                       |
| Unit tests                       | yes      | focused `lead-list` / `project-detail` / `project-store` specs | pending G3   | 覆盖 owner request 和受控变更入口。                             |
| API / integration tests          | no       | `N/A`                                                          | not required | 本片不改 API runtime。                                          |
| E2E / browser journey            | yes      | browser check or explicit local exception                      | pending G3   | 覆盖登记 owner、转项目 owner 展示、项目详情 action visibility。 |
| OpenAPI generation / client diff | no       | `N/A`                                                          | not required | 已由 `EX-41A` 生成并检查。                                      |
| Migration / schema check         | no       | `N/A`                                                          | not required | 本片不改 persistence。                                          |
| Markdown format                  | yes      | `corepack pnpm run format:md:check`                            | pending G3   | 本片触碰 docs。                                                 |
| Diff hygiene                     | yes      | `git diff --check`                                             | pending G3   | 收口前必跑。                                                    |

## 9. 例外与风险

| Exception ID                                 | Level | Scope                                                                                           | Approved By                | Cleanup Owner | Cleanup Due             | Notes                                                                                   |
| -------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- | -------------------------- | ------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `FE45-E1-CONVERSION-OWNER-OVERRIDE-DEFERRED` | `E1`  | 转项目 dialog 只展示继承的销售主责，不提供当场覆盖字段。                                        | `Solo worktree checkpoint` | `Codex`       | downstream DTO decision | `ConvertLeadToProjectRequest` 没有 owner 字段，项目创建后用受控 reassignment 入口承接。 |
| `FE45-E1-BROWSER-SCOPE`                      | `E1`  | 若本地完整登录 journey 受数据或服务环境阻塞，可用 focused browser / unit 证据替代并在 G3 说明。 | `Solo worktree checkpoint` | `Codex`       | `FE-45` G3              | 不影响 unit / lint / build 必跑。                                                       |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-29`
- Conditions:
  1. 前端不得把登记人和销售主责混写为同一可编辑字段。
  2. 项目销售主责变更只能调用 `reassignProjectOwner`，不得进入普通编辑项目 dialog。
  3. 转项目时仅展示继承 owner；若后续需要当场覆盖，必须先补后端 DTO / 审计设计。
  4. 项目详情按钮显隐必须依赖 `allowedActions.includes('reassign-project-owner')`。
