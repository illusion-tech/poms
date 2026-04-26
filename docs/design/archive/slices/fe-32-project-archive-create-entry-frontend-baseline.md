# FE-32 项目归档首次创建入口产品化实施基线包

- Gate Status: `Pass`
- Parent: `FE-31`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-32`

## 1. 范围

- 本次目标:
  1. 在项目详情终态归档区域补齐首次创建归档记录入口。
  2. 复用既有 `POST /projects/{projectId}/archive-records` generated client，不新增后端 API / DTO / permission key。
  3. 创建成功后刷新项目详情、项目生命周期 timeline 和归档记录列表。
  4. 补齐 focused unit tests 与登录后从项目列表进入详情页的 E2E 入口链验证。
- 本次明确不做:
  1. 不新增 dedicated `create-project-archive-record` action projection。
  2. 不改变 `ProjectArchiveRecord` 状态机、替代链、撤销链或 `expectedVersion` 规则。
  3. 不改后端 create command、OpenAPI、generated client、migration 或 route inventory。
  4. 不新增附件、审批流或多级复核。
- 下游可依赖的交付边界:
  1. 当前项目为终态且无 current `recorded` 归档时，用户可从项目详情看到归档创建入口。
  2. 前端提交 `archivedAt`、`archiveSummary`、`evidenceSummary` 到既有 create API。
  3. 创建成功后详情页能立即显示新归档事实和归档历史。
- 不允许下游依赖的留白:
  1. 不得假定 FE-32 已提供独立 create object-action key。
  2. 不得把首次创建入口扩展为归档附件、审批或文档库能力。

## 2. 正式输入

| Input Type                | Document / Source                                                                                  | Section / Anchor                    | Status      | Notes                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------- | -------------------------------------------------------------------- |
| Business design           | `docs/design/archive/slices/fe-31-project-archive-reversal-replacement-frontend-g3-g4-closeout.md` | `FE31-E2-NO-ARCHIVE-CREATE-ENTRY`   | Accepted    | FE-31 明确转交首次创建入口。                                         |
| Business design           | `docs/design/archive/slices/ex-25-project-archive-fact-source-g3-g4-closeout.md`                   | `ProjectArchiveRecord` fact source  | Accepted    | 归档是终态附属 milestone，不新增主生命周期 stage。                   |
| Command design            | `apps/poms-api/src/app/features/project/project.controller.ts`                                     | `createProjectArchiveRecord`        | Implemented | Existing command route, guarded by `project:write`.                  |
| DTO / OpenAPI design      | `libs/shared/api-client/model/create-project-archive-record-request.ts`                            | `CreateProjectArchiveRecordRequest` | Implemented | Request contains `archivedAt`、`archiveSummary`、`evidenceSummary`。 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                     | `createProjectArchiveRecord`        | Aligned     | `POST /projects/{projectId}/archive-records` already aligned.        |
| Query boundary            | `libs/shared/api-client/api/project.service.ts`                                                    | list / create archive records       | Implemented | Frontend can create and then reload archive records.                 |
| Data model / table freeze | `docs/design/archive/slices/ex-25-project-archive-fact-source-g3-g4-closeout.md`                   | archive milestone                   | Accepted    | No persistence change in this slice.                                 |
| Schema / DDL              | `N/A`                                                                                              | `N/A`                               | N/A         | Frontend-only slice.                                                 |
| ADR                       | `docs/design/api-route-canonical-inventory.md`                                                     | ADR-015 canonical route grammar     | Accepted    | Existing route surface is stable.                                    |

## 3. 本次 SSOT

| Concern                     | SSOT                                                               | Implementation Rule                                                                 |
| --------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Business semantics          | EX-25 / FE-31                                                      | 终态项目无 current recorded 归档时允许从详情页创建首次归档事实。                    |
| Public route canonical path | API route canonical inventory                                      | Use `POST /projects/{projectId}/archive-records`; no new route.                     |
| Route / command naming      | generated `ProjectApi.projectControllerCreateProjectArchiveRecord` | Store calls generated client directly.                                              |
| DTO / contract naming       | `CreateProjectArchiveRecordRequest`                                | Submit only `archivedAt`、`archiveSummary`、`evidenceSummary`。                     |
| Table / column naming       | N/A                                                                | No DDL/entity change.                                                               |
| Date / time semantics       | Existing API contract                                              | Frontend normalizes `datetime-local` to ISO string.                                 |
| Identifier semantics        | Project ID from route / selected project                           | Project ID anchors the create command; no archive record ID exists before creation. |
| Money / decimal semantics   | N/A                                                                | No money fields.                                                                    |
| Status machine              | Backend `ProjectService.createProjectArchiveRecord`                | Frontend does not set status; backend creates `recorded` or rejects invalid state.  |

## 4. 命令与接口边界

| Route / Controller                           | Command / Service            | Request DTO / Contract              | Response DTO / Contract       | Guard / Permission | Design Source | Result              |
| -------------------------------------------- | ---------------------------- | ----------------------------------- | ----------------------------- | ------------------ | ------------- | ------------------- |
| `POST /projects/{projectId}/archive-records` | `createProjectArchiveRecord` | `CreateProjectArchiveRecordRequest` | `ProjectArchiveRecordSummary` | `project:write`    | `EX-25`       | Existing; consumed. |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `POST /projects/{projectId}/archive-records`
- Current implemented route(s): `POST /projects/{projectId}/archive-records`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-25`
- Blocker / exception: none; FE-32 does not change route surface.

## 5. 读侧边界

| Query / View                                | Consumer                     | Fields                           | Filter / Sort             | Permission Boundary                             | Design Source | Result                       |
| ------------------------------------------- | ---------------------------- | -------------------------------- | ------------------------- | ----------------------------------------------- | ------------- | ---------------------------- |
| `GET /projects/{projectId}`                 | project detail archive panel | `stageSummary`、`allowedActions` | by project id             | existing `project:read` detail boundary         | FE-31         | Use existing detail context. |
| `GET /projects/{projectId}/timeline`        | project detail archive panel | archive milestone events         | authoritative latest fact | existing `project:read` timeline boundary       | EX-25 / FE-24 | Refresh after create.        |
| `GET /projects/{projectId}/archive-records` | project detail archive panel | archive records                  | backend audit order       | existing `project:read` plus per-record actions | EX-36         | Refresh after create.        |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result                          |
| ----- | --------- | ------------------- | ------------------- | ------------------------------------- |
| N/A   | N/A       | N/A                 | N/A                 | Frontend-only; no persistence change. |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result                           |
| ----- | --------------------- | --------------- | ------ | ------------------------- | -------------------------------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | Frontend-only; no schema change. |

## 7. 一致性结论

- Document -> code: FE-32 only closes `FE31-E2` by adding first-create frontend entry.
- ADR-015 inventory -> route: existing row is aligned; no route change.
- Migration -> entity: N/A.
- Entity -> contract: N/A.
- Route -> command: generated client maps to existing create command.
- Query -> view: after create, frontend reloads detail / timeline / archive records.
- Guard / permission: frontend visibility uses current user `project:write` plus terminal/no-current-record state; backend guard remains authoritative.
- OpenAPI / generated client: no change; only consume existing generated client.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                    | Result  | Gap / Reason                    |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access`                                         | Pending |                                 |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`                                                                                   | Pending |                                 |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`; `...project-store`                  | Pending |                                 |
| API / integration tests          | No       | N/A                                                                                                                   | N/A     | No backend behavior change.     |
| E2E                              | Yes      | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts -g "archive audit" --workers=1` | Pending |                                 |
| OpenAPI generation / client diff | No       | N/A                                                                                                                   | N/A     | Existing generated client only. |
| Migration / schema check         | No       | N/A                                                                                                                   | N/A     | Frontend-only; no DDL.          |

## 9. 例外与风险

| Exception ID                  | Level | Scope         | Approved By | Cleanup Owner | Cleanup Due                  | Notes                                                                                                                              |
| ----------------------------- | ----- | ------------- | ----------- | ------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `FE32-E1-CREATE-ACTION-PROXY` | Low   | UI visibility | Codex       | Codex         | Future permission governance | 首次创建归档没有 record 对象可投影 action；本片使用 `project:write` + 终态 + 无 current record 做保守显隐，后端 guard 是最终保护。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-26`
- Conditions:
  1. 不新增 public route / OpenAPI / generated client。
  2. 创建成功后必须刷新 detail / timeline / archive records。
  3. G3 必须明确 `FE32-E1-CREATE-ACTION-PROXY` 是关闭、保留还是转交。
