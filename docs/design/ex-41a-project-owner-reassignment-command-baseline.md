# EX-41A Project Owner Reassignment Command 实施基线包

- Gate Status: `G1 = Pass`
- Parent: `EX-41`
- Owner: `Codex`
- Slice Type: `api / command + persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-29`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-41A`

## 1. 范围

- 本次目标:
  1. 落地 `POST /projects/{id}:reassignOwner` 受控命令。
  2. 新增 `ProjectOwnerReassignmentRecord` 实体、migration 和 repository 写入路径。
  3. 新增 shared contract、API DTO、OpenAPI 和 generated client。
  4. 在 `ProjectDetailView.allowedActions` 中暴露 `reassign-project-owner`。
  5. 补 focused backend service / controller / query tests。
- 本次明确不做:
  1. 不把 `ownerUserId / ownerOrgId` 加入 `PATCH /projects/{id}`。
  2. 不修改 `ConvertLeadToProjectRequest`，转项目时继续默认继承 `Lead.owner*`。
  3. 不实现完整对象级授权模型，先按 `project:write` + active / blocked 前置条件落地。
  4. 不做前端入口、表单或浏览器验证，交给 `FE-45`。
- 下游可依赖的交付边界:
  1. 前端可调用 generated client 的项目销售主责变更命令。
  2. 项目详情可通过 `allowedActions` 判断是否展示销售主责变更入口。
  3. 数据库可追溯每次销售主责变更的前后 owner、原因、操作者和时间。
- 不允许下游依赖的留白:
  1. `FE-45` 之前不保证用户界面已经提供变更入口。
  2. 本片不承诺转项目当场覆盖项目销售主责。

## 2. 正式输入

| Input Type                | Document / Source                                                                          | Section / Anchor                 | Status   | Notes                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------- | -------- | ---------------------------------------------------------- |
| Business design           | `docs/design/ex-41-lead-project-owner-responsibility-governance-baseline.md`               | `§2` / `§3`                      | Accepted | 登记人、线索销售主责、项目销售主责和执行负责人边界已冻结。 |
| Command design            | `docs/design/interface-command-design.md`                                                  | Project / `reassignProjectOwner` | Accepted | 命令必须更新 Project 当前 owner 并追加动作记录。           |
| DTO / OpenAPI design      | `docs/design/interface-openapi-dto-design.md`                                              | Project command table            | Accepted | 请求 / 响应字段已冻结。                                    |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                             | `reassignProjectOwner`           | Planned  | Canonical route 已存在，implementation 为空。              |
| Query boundary            | `docs/design/query-view-boundary-design.md`                                                | `ProjectDetailView`              | Accepted | 仅扩展 `allowedActions`，不新增详情字段。                  |
| Data model / table freeze | `docs/design/data-model-prerequisites.md` + `docs/design/table-structure-freeze-design.md` | `ProjectOwnerReassignmentRecord` | Accepted | 动作记录表，不是 Project 版本表。                          |
| Schema / DDL              | `docs/design/schema-ddl-design.md`                                                         | 动作记录表公共字段               | Accepted | 使用 PostgreSQL `poms` schema、uuid、timestamptz。         |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                              | Command route grammar            | Accepted | 使用 colon action route。                                  |

## 3. 本次 SSOT

| Concern                     | SSOT                                        | Implementation Rule                                                                       |
| --------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Business semantics          | `EX-41` baseline                            | `createdBy` 是审计操作者，`Project.owner*` 是项目销售主责。                               |
| Public route canonical path | `api-route-canonical-inventory.md`          | 实现 `POST /projects/{id}:reassignOwner`，Nest path 使用 `@Post(':id\\:reassignOwner')`。 |
| Route / command naming      | `interface-command-design.md`               | 命令名为 `reassignProjectOwner`，service 方法为 `ProjectService.reassignOwner`。          |
| DTO / contract naming       | `interface-openapi-dto-design.md`           | `ReassignProjectOwnerRequest` / `ProjectOwnerReassignmentResult`。                        |
| Table / column naming       | `table-structure-freeze-design.md` + 本基线 | 表名 `project_owner_reassignment_record`，列名使用 `previous_owner_*` / `new_owner_*`。   |
| Date / time semantics       | `schema-ddl-design.md`                      | `reassigned_at` 为 `timestamptz`，contract 返回 ISO datetime。                            |
| Identifier semantics        | `data-model-prerequisites.md`               | 所有 owner、project、operator 字段均为内部 UUID；`ownerOrgId` 可空，`ownerUserId` 必填。  |
| Money / decimal semantics   | `N/A`                                       | 本片不涉及金额。                                                                          |
| Status machine              | `business-authorization-matrix.md`          | 只允许 `Project.status in (active, blocked)` 的项目变更销售主责。                         |

## 4. 命令与接口边界

| Route / Controller                  | Command / Service                | Request DTO / Contract          | Response DTO / Contract          | Guard / Permission             | Design Source | Result    |
| ----------------------------------- | -------------------------------- | ------------------------------- | -------------------------------- | ------------------------------ | ------------- | --------- |
| `POST /projects/{id}:reassignOwner` | `ProjectService.reassignOwner`   | `ReassignProjectOwnerRequest`   | `ProjectOwnerReassignmentResult` | `project:write` + status guard | `EX-41`       | planned   |
| `PATCH /projects/{id}`              | `ProjectService.updateBasicInfo` | `UpdateProjectBasicInfoRequest` | `ProjectSummary`                 | `project:write`                | `EX-41`       | unchanged |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `POST /projects/{id}:reassignOwner`
- Current implemented route(s): `N/A`
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-41`
- Blocker / exception: no route blocker; `EX41-E1-OBJECT-AUTH-GRANULARITY` remains accepted for this slice.

## 5. 读侧边界

| Query / View                           | Consumer       | Fields                          | Filter / Sort | Permission Boundary          | Design Source                      | Result  |
| -------------------------------------- | -------------- | ------------------------------- | ------------- | ---------------------------- | ---------------------------------- | ------- |
| `ProjectQueryService.getProjectDetail` | Project detail | `allowedActions` append only    | by project id | `project:read` + action calc | `query-view-boundary-design.md`    | extend  |
| `ProjectDetailView`                    | `FE-45`        | `reassign-project-owner` action | N/A           | active / blocked + write     | `business-authorization-matrix.md` | planned |

## 6. 持久化边界

| Table                                    | Migration                                                         | Entity / Repository                                       | DDL / Freeze Source                         | Check Result                   |
| ---------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------- | ------------------------------ |
| `poms.project_owner_reassignment_record` | `Migration20260429100000_ex41a_project_owner_reassignment_record` | `ProjectOwnerReassignmentRecord` + repository create/save | `table-structure-freeze-design.md` + 本基线 | planned                        |
| `poms.project`                           | existing                                                          | `Project`                                                 | existing                                    | update owner current fact only |

| Field                    | Design Type / Meaning         | Migration / DDL | Entity                | Shared Contract / OpenAPI          | Result  |
| ------------------------ | ----------------------------- | --------------- | --------------------- | ---------------------------------- | ------- |
| `id`                     | record UUID                   | `uuid`          | `uuid`                | `projectOwnerReassignmentRecordId` | planned |
| `project_id`             | target project UUID           | `uuid not null` | `projectId`           | `targetId`                         | planned |
| `previous_owner_user_id` | previous sales owner user     | `uuid null`     | `previousOwnerUserId` | `previousOwnerUserId`              | planned |
| `previous_owner_org_id`  | previous sales owner org      | `uuid null`     | `previousOwnerOrgId`  | `previousOwnerOrgId`               | planned |
| `new_owner_user_id`      | new sales owner user          | `uuid not null` | `newOwnerUserId`      | `newOwnerUserId`                   | planned |
| `new_owner_org_id`       | new sales owner org           | `uuid null`     | `newOwnerOrgId`       | `newOwnerOrgId`                    | planned |
| `reason`                 | mandatory reassignment reason | `text not null` | `reason`              | request only                       | planned |
| `reassigned_at`          | command effective timestamp   | `timestamptz`   | `reassignedAt`        | response may omit                  | planned |
| `reassigned_by`          | operator user UUID            | `uuid not null` | `reassignedBy`        | response may omit                  | planned |

## 7. 一致性结论

- Document -> code: implement exactly the EX-41 runtime slice; no FE behavior in this slice.
- ADR-015 inventory -> route: inventory already has `POST /projects/{id}:reassignOwner`; implementation must use the same grammar.
- Migration -> entity: migration SQL is written before entity mapping.
- Entity -> contract: response exposes record id, previous/new owner and resulting business status; internal `reason` remains audit table field.
- Route -> command: controller delegates only to `ProjectService.reassignOwner`.
- Query -> view: only `allowedActions` is extended.
- Guard / permission: `project:write` + `active / blocked` guard implements accepted `EX41-E1` boundary.
- OpenAPI / generated client: expected diff includes one project command operation and two model files.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                       | Result  | Gap / Reason                                           |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------ |
| Lint                             | yes      | `corepack pnpm nx lint poms-api`                                                         | planned |                                                        |
| Build                            | yes      | `corepack pnpm nx build poms-api`                                                        | planned |                                                        |
| Unit tests                       | yes      | `corepack pnpm nx test poms-api --testFile=...` or full                                  | planned |                                                        |
| API / integration tests          | no       | `N/A`                                                                                    | N/A     | focused unit coverage is sufficient for command wiring |
| E2E                              | no       | `N/A`                                                                                    | N/A     | frontend journey belongs to `FE-45`                    |
| OpenAPI generation / client diff | yes      | `corepack pnpm nx run poms-api:openapi` + `corepack pnpm nx run shared-api-client:check` | planned |                                                        |
| Migration / schema check         | yes      | `corepack pnpm nx run poms-api:migration-check`                                          | planned |                                                        |
| Diff hygiene                     | yes      | `git diff --check`                                                                       | planned |                                                        |
| Markdown format                  | yes      | `corepack pnpm run format:md:check`                                                      | planned | docs touched                                           |

## 9. 例外与风险

| Exception ID                        | Level | Scope                                                                   | Approved By                | Cleanup Owner | Cleanup Due                  | Notes                                                   |
| ----------------------------------- | ----- | ----------------------------------------------------------------------- | -------------------------- | ------------- | ---------------------------- | ------------------------------------------------------- |
| `EX41-E1-OBJECT-AUTH-GRANULARITY`   | `E1`  | 本片先复用 `project:write` + active / blocked guard。                   | `Solo worktree checkpoint` | `Codex`       | downstream object auth slice | 不阻塞本片 G3，但不得宣称已实现完整对象级组织范围授权。 |
| `EX41-E2-CONVERSION-OWNER-OVERRIDE` | `E2`  | 本片不改 `ConvertLeadToProjectRequest`，转项目 owner 覆盖交给后续决策。 | `Solo worktree checkpoint` | `Codex`       | `FE-45` G1 review            | `FE-45` 可用后置 reassignment 入口承接。                |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-29`
- Conditions:
  1. 不新增 `PATCH /projects/{id}` 的 owner 字段。
  2. migration、entity、contract、controller 和 generated client 必须同批对齐。
  3. 若 migration-check 发现既有 drift，需要在 G3 明确分类，不用本片静默改写无关 schema。
