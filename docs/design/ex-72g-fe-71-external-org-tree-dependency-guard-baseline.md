# EX-72G / FE-71 外部组织树形预览与父子依赖保护实施基线

- Gate Status: `Pass`
- Parent: `#8`
- GitHub Issue: `#18`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-18
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-72G/FE-71`

## 1. 范围

- 本次目标:
  - 在外部组织同步工作台的外部部门映射区域新增“表格 / 结构树”视图切换。
  - 用现有 `ExternalDepartmentMappingSummary.externalParentDepartmentId` 构建外部部门树，展示外部部门、POMS 映射组织、处理状态、冲突原因和最近发现时间。
  - 树节点复用已有映射、解除映射、忽略、恢复和查看来源差异操作，不新增 command route。
  - 在 Admin 应用选中预览差异前校验父子依赖，缺少父部门依赖时阻断并提示。
  - 在 API `applyOrgSyncRun` 写入前做同类父子依赖校验，并对 `create_org_unit` diff 进行父子拓扑排序，避免子部门先于父部门应用。
- 本次明确不做:
  - 不新增 public API route、OpenAPI 或 generated client 表面。
  - 不新增 migration、entity 字段或持久化表。
  - 不实现 DingTalk / WeCom adapter。
  - 不同步用户、权限或向飞书回写组织结构。
  - 不替换现有映射表格；树视图是补充视角。
- 下游可依赖的交付边界:
  - 管理员能以树形视图理解飞书部门层级和映射处理状态。
  - 应用预览时，父部门缺失或被跳过的选中集合会在前端和后端被阻断。
- 不允许下游依赖的留白:
  - 不保证树视图支持跨 source 全局对比。
  - 不提供拖拽重排、树上批量选择或外部 OA 回写。

## 2. 正式输入

| Input Type           | Document / Source                                                                           | Section / Anchor              | Status | Notes                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------- | ----------------------------- | ------ | -------------------------------------------------------------------------- |
| Business design      | GitHub issue `#18` + 测试环境反馈                                                           | scope / acceptance criteria   | Pass   | 线上飞书组织预览后暴露树结构不可见和父子依赖风险。                         |
| Parent program       | GitHub issue `#8`                                                                           | UX closure                    | Pass   | #18 是 #8 端到端冒烟前的补强子切片。                                       |
| Runtime baseline     | `docs/design/archive/slices/ex-72d-external-org-sync-runtime-baseline.md`                   | Preview / Apply rules         | Pass   | 已冻结 parent resolution、create / move / disable 和 apply 父子依赖排序。  |
| Workbench baseline   | `docs/design/archive/slices/fe-67-external-org-sync-workbench-baseline.md`                  | Admin workbench               | Pass   | 外部组织同步工作台是承载页面。                                             |
| Mapping baseline     | `docs/design/archive/slices/ex-72f-fe-70-department-mapping-conflict-workbench-baseline.md` | mapping workbench behavior    | Pass   | 行级映射命令与 reviewState 已交付，本片复用。                              |
| Route inventory      | `docs/design/api-route-canonical-inventory.md`                                              | B18 existing routes           | Pass   | 不新增 route；复用 `applyOrgSyncRun`、mapping list 和 row-level commands。 |
| Shared contracts     | `libs/shared/contracts/src/lib/shared-contracts.ts`                                         | mapping / diff item schemas   | Pass   | 复用已有字段，不扩展 OpenAPI。                                             |
| Admin implementation | `apps/poms-admin/src/app/features/platform/external-org-sync-workbench.ts`                  | mapping table / preview apply | Pass   | 新增树形视图和前端依赖校验。                                               |

## 3. 本次 SSOT

| Concern                     | SSOT                                     | Implementation Rule                                                                  |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Business semantics          | `#18` + 本基线                           | 树形视图用于理解外部部门层级；表格继续用于筛选和批量处理。                           |
| Public route canonical path | B18 route inventory                      | 不新增、删除或重命名 public route。                                                  |
| Route / command naming      | `EX-72C/F` 已交付 route                  | 复用 `applyOrgSyncRun` 和 mapping row commands。                                     |
| DTO / contract naming       | shared contracts                         | 不新增 DTO 字段；Admin 从 `candidateSnapshot` / mapping summary 派生视图模型。       |
| Table / column naming       | `EX-72B` persistence                     | 不改表结构；使用 `external_parent_department_id` 和 diff `candidate_snapshot_json`。 |
| Identifier semantics        | `EX-72A/D`                               | 外部部门 ID 仍为 string；POMS 组织 ID 仍为 UUID。                                    |
| Status machine              | `OrgSyncDiffItemStatus` / mapping status | 不新增状态；依赖校验失败时 apply command 直接拒绝，不进入部分写入。                  |

## 4. 命令与接口边界

| Route / Controller                                                  | Command / Service                | Request DTO / Contract   | Response DTO / Contract            | Guard / Permission                                       | Design Source  | Result |
| ------------------------------------------------------------------- | -------------------------------- | ------------------------ | ---------------------------------- | -------------------------------------------------------- | -------------- | ------ |
| `POST /platform/org-sync-runs/{id}:apply`                           | `applyOrgSyncRun`                | `ApplyOrgSyncRunRequest` | `OrgSyncRunDetail`                 | `platform:org-units:manage` + `platform:org-sync:manage` | `#18` + EX-72D | Reuse  |
| `GET /platform/external-org-sources/{sourceId}/department-mappings` | `listExternalDepartmentMappings` | existing query           | `ExternalDepartmentMappingList`    | same                                                     | `#18` + EX-72F | Reuse  |
| `POST /platform/external-department-mappings/{id}:map`              | `mapExternalDepartmentMapping`   | existing request         | `ExternalDepartmentMappingSummary` | same                                                     | `#18` + EX-72F | Reuse  |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing B18 routes only
- Current implemented route(s): existing B18 routes only
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-72A/C/F`
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View            | Consumer            | Fields                                                                                                                        | Filter / Sort                                                               | Permission Boundary | Design Source | Result |
| ----------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------- | ------------- | ------ |
| Mapping tree view model | Admin workbench     | mapping id, externalDepartmentId, externalParentDepartmentId, name, orgUnitId, reviewState, conflictReason, lastSeenAt, depth | Built client-side from loaded mapping page; stable by source order and name | existing page guard | `#18`         | New    |
| Apply dependency view   | Admin preview apply | diff id, action, externalDepartmentId, targetParentExternalDepartmentId, targetParentOrgUnitId                                | Built from loaded diff items before apply                                   | existing page guard | `#18`         | New    |

## 6. 持久化边界

| Table                         | Migration | Entity / Repository     | DDL / Freeze Source | Check Result |
| ----------------------------- | --------- | ----------------------- | ------------------- | ------------ |
| `external_department_mapping` | No        | existing                | `EX-72B`            | Reuse        |
| `org_sync_diff_item`          | No        | existing                | `EX-72B`            | Reuse        |
| `org_unit`                    | No        | existing platform model | OrgUnit runtime     | Reuse        |

| Field                                                                | Design Type / Meaning                      | Migration / DDL | Entity   | Shared Contract / OpenAPI | Result |
| -------------------------------------------------------------------- | ------------------------------------------ | --------------- | -------- | ------------------------- | ------ |
| `externalDepartmentMapping.externalParentDepartmentId`               | external parent department id, string/null | existing        | existing | existing                  | Reuse  |
| `orgSyncDiffItem.candidateSnapshot.targetParentExternalDepartmentId` | external parent dependency for create/move | existing jsonb  | existing | existing JSON object      | Reuse  |
| `orgSyncDiffItem.candidateSnapshot.targetParentOrgUnitId`            | resolved POMS parent UUID/null             | existing jsonb  | existing | existing JSON object      | Reuse  |

## 7. 一致性结论

- Document -> code: 本基线冻结 #18 的树形视图和父子依赖保护范围。
- ADR-015 inventory -> route: 不新增 route，B18 已 aligned。
- Migration -> entity: 不改 persistence。
- Entity -> contract: 不改 contract 字段。
- Route -> command: 复用 `applyOrgSyncRun`，新增写前校验和拓扑排序。
- Query -> view: Admin 从现有 mapping list 和 diff item list 派生树与依赖校验视图。
- Guard / permission: 沿用外部组织同步工作台既有权限。
- OpenAPI / generated client: 不应变化。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                            | Result | Gap / Reason                      |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------- |
| API focused tests                | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=external-org-sync --skip-nx-cache`             | Pass   |                                   |
| Admin focused tests              | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=external-org-sync-workbench --skip-nx-cache` | Pass   |                                   |
| API lint                         | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                              | Pass   |                                   |
| Admin lint                       | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                            | Pass   |                                   |
| API build                        | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                                             | Pass   |                                   |
| Admin build                      | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                           | Pass   | Existing bundle budget warning.   |
| OpenAPI generation / client diff | No       | N/A                                                                                                           | N/A    | No route/contract surface change. |
| Migration / schema check         | No       | N/A                                                                                                           | N/A    | No persistence change.            |
| Markdown format                  | Yes      | `corepack pnpm run format:md:check`                                                                           | Pass   |                                   |
| Diff sanity                      | Yes      | `git diff --check`                                                                                            | Pass   |                                   |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes               |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-18
- Conditions: 进入 G2 前不得扩展 public route / OpenAPI / generated client；若后续发现必须新增服务端树查询，需先回到 G1 更新 route inventory。
