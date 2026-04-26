# FE-33 合同创建项目选择器与合同上下文体验实施基线包

- Gate Status: `Pass`
- Parent: `FE-30`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-33`

## 1. 范围

- 本次目标:
  1. 将合同创建弹窗中的项目 UUID 输入改为项目选择器。
  2. 选择器消费既有 `GET /projects` / `ProjectListView`，展示项目编号、项目名称、客户、阶段和状态上下文。
  3. 创建合同时仍只提交 `CreateContractRequest.projectId`，不提交项目编号、项目名称或客户信息。
  4. 保留客户合同编号 `customerContractNo` 的 optional 语义。
  5. 补 focused component tests 与登录后从菜单进入合同管理的 E2E。
- 本次明确不做:
  1. 不新增或修改后端 API、OpenAPI、generated client、DTO 或 DDL。
  2. 不允许在编辑合同中修改关联项目；当前 `UpdateContractBasicInfoRequest` 没有 `projectId`，关联项目保持不可变。
  3. 不新增项目搜索专用后端 query；若未来项目数量增长，需要另开后端分页 / 搜索切片。
  4. 不改变合同创建、审批、激活或资金条款业务规则。
- 下游可依赖的交付边界:
  1. 用户在新建合同弹窗中通过项目编号、项目名称或客户搜索并选择项目。
  2. 选择后能看到明确的项目上下文，减少 UUID 误填。
  3. 创建请求仍使用 authoritative project `id` 作为关联项目身份。
- 不允许下游依赖的留白:
  1. 不得把本片解读为合同项目可变更能力。
  2. 不得假定项目选择器已支持服务端分页、跨组织高级过滤或模糊搜索 API。

## 2. 正式输入

| Input Type                | Document / Source                                                             | Section / Anchor                               | Status      | Notes                                                             |
| ------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| Business design           | `docs/design/archive/slices/fe-30-business-number-frontend-g3-g4-closeout.md` | `FE30-E2-CONTRACT-PROJECT-PICKER-DEFERRED`     | Accepted    | FE-30 明确转交合同项目选择器。                                    |
| Command design            | `libs/shared/api-client/model/create-contract-request.ts`                     | `CreateContractRequest.projectId`              | Implemented | 创建合同仍以 project id 绑定项目。                                |
| DTO / OpenAPI design      | `libs/shared/api-client/model/project-list-view.ts`                           | `ProjectListView`                              | Implemented | 可展示 `projectNo/projectName/customerName/currentStage/status`。 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                | existing project list / contract create routes | Aligned     | 本片不新增 public route surface。                                 |
| Query boundary            | `libs/admin/data-access/src/lib/project/project.store.ts`                     | `ProjectStore.loadProjects()`                  | Implemented | Existing frontend data-access can load project list.              |
| Data model / table freeze | `N/A`                                                                         | `N/A`                                          | N/A         | Frontend-only; no persistence change.                             |
| Schema / DDL              | `N/A`                                                                         | `N/A`                                          | N/A         | Frontend-only; no schema change.                                  |
| ADR                       | `ADR-015`                                                                     | canonical route grammar                        | Accepted    | No route changes.                                                 |

## 3. 本次 SSOT

| Concern                     | SSOT                                                  | Implementation Rule                                                       |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Business semantics          | FE-30 close-out                                       | 合同创建不再让用户手填项目 UUID，而是选择真实项目。                       |
| Public route canonical path | Existing route inventory                              | Consume existing `GET /projects` and `POST /contracts`; no route changes. |
| Route / command naming      | generated client via `ProjectStore` / `ContractStore` | Load projects through `ProjectStore`; create through `ContractStore`.     |
| DTO / contract naming       | `CreateContractRequest.projectId`                     | Submit selected project `id`; do not submit display fields.               |
| Table / column naming       | N/A                                                   | No DDL/entity change.                                                     |
| Date / time semantics       | N/A                                                   | No date fields changed.                                                   |
| Identifier semantics        | `ProjectListView.id`                                  | Project `id` remains wire identity; `projectNo` is display only.          |
| Money / decimal semantics   | existing contract form validation                     | Keep current signed amount validation.                                    |
| Status machine              | existing contract command                             | Frontend does not change contract lifecycle status.                       |

## 4. 命令与接口边界

| Route / Controller | Command / Service          | Request DTO / Contract  | Response DTO / Contract | Guard / Permission               | Design Source | Result              |
| ------------------ | -------------------------- | ----------------------- | ----------------------- | -------------------------------- | ------------- | ------------------- |
| `GET /projects`    | `projectControllerList`    | N/A                     | `ProjectListView[]`     | existing project read boundary   | FE-33         | Existing; consumed. |
| `POST /contracts`  | `contractControllerCreate` | `CreateContractRequest` | `ContractSummary`       | existing contract write boundary | FE-30         | Existing; consumed. |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing `GET /projects`, `POST /contracts`
- Current implemented route(s): existing generated client routes
- Inventory status: `aligned`
- Route governance source: ADR-015
- Blocker / exception: none; FE-33 does not change route surface.

## 5. 读侧边界

| Query / View        | Consumer               | Fields                                                                     | Filter / Sort                             | Permission Boundary               | Design Source | Result                          |
| ------------------- | ---------------------- | -------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------- | ------------- | ------------------------------- |
| `ProjectListView[]` | contract create dialog | `id`、`projectNo`、`projectName`、`customerName`、`currentStage`、`status` | client-side autocomplete over loaded list | existing project list permissions | FE-33         | Existing fields are sufficient. |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result                          |
| ----- | --------- | ------------------- | ------------------- | ------------------------------------- |
| N/A   | N/A       | N/A                 | N/A                 | Frontend-only; no persistence change. |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result                           |
| ----- | --------------------- | --------------- | ------ | ------------------------- | -------------------------------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | Frontend-only; no schema change. |

## 7. 一致性结论

- Document -> code: FE-33 closes FE30-E2 by replacing raw project UUID input with project selector.
- ADR-015 inventory -> route: no route changes.
- Migration -> entity: N/A.
- Entity -> contract: N/A.
- Route -> command: create contract still submits `projectId`.
- Query -> view: project list fields are sufficient for selector and context display.
- Guard / permission: existing route guards and backend permissions remain authoritative.
- OpenAPI / generated client: no change.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                             | Result  | Gap / Reason                    |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access` if data-access touched           | Pending |                                 |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`                                                                            | Pending |                                 |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=contract-list`                                | Pending |                                 |
| API / integration tests          | No       | N/A                                                                                                            | N/A     | No backend behavior change.     |
| E2E                              | Yes      | targeted Playwright contract journey from menu -> contract list -> create dialog -> project selector -> create | Pending |                                 |
| OpenAPI generation / client diff | No       | N/A                                                                                                            | N/A     | Existing generated client only. |
| Migration / schema check         | No       | N/A                                                                                                            | N/A     | Frontend-only; no DDL.          |

## 9. 例外与风险

| Exception ID                   | Level | Scope          | Approved By | Cleanup Owner | Cleanup Due                 | Notes                                                                                    |
| ------------------------------ | ----- | -------------- | ----------- | ------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| `FE33-E1-CLIENT-SIDE-PROJECTS` | Low   | Project picker | Codex       | Codex         | Future project search scale | 本片复用 `GET /projects` 客户端过滤；若项目数量增长，应另开后端分页 / 搜索 query slice。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-26`
- Conditions:
  1. 不新增 public API / generated client。
  2. 创建请求只提交 selected project `id`。
  3. G3 需要明确 `FE30-E2-CONTRACT-PROJECT-PICKER-DEFERRED` 和 `FE33-E1-CLIENT-SIDE-PROJECTS` 的状态。
