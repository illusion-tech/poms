# EX-34A 项目归档记录撤销 / 替代版本链运行时实现基线

- Gate Status: `G1 = Pass`
- Parent: `EX-34`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-34A`

## 1. 范围

本次目标:

1. 扩展 `ProjectArchiveRecord` 为 `recorded` / `voided` / `superseded` 三态。
2. 新增归档记录 item-level `replace` / `void` public routes。
3. 新增替代链、撤销字段、当前有效归档唯一约束和后端守卫。
4. 更新 shared contract、API DTO、OpenAPI / generated client。
5. 更新后端 service / controller / query tests，验证 timeline 只投影 current `recorded`。

本次明确不做:

1. 不新增前端入口；`FE-31` 承接。
2. 不改变归档仍是 `completed` 终态附属 milestone 的设计。
3. 不新增项目生命周期第九个 stage。
4. 不做历史兼容迁移；当前系统处于开发期，可 direct cutover。

下游可依赖的交付边界:

1. `POST /project-archive-records/{id}:replace` 可创建 replacement 归档记录并 supersede 原记录。
2. `POST /project-archive-records/{id}:void` 可撤销当前有效归档记录。
3. `GET /projects/{projectId}/timeline` 不会投影 `voided` / `superseded` 归档记录。
4. `GET /projects/{projectId}/archive-records` 返回 status 与替代 / 撤销审计字段。

不允许下游依赖的留白:

1. 前端按钮、弹窗、权限显隐和浏览器验证仍在 `FE-31`。
2. 归档附件、审批流和多级撤销复核不在本片。

## 2. 正式输入

| Input Type                | Document / Source                                                                              | Section / Anchor                                           | Status | Notes                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------ | ---------------------------------------- |
| Business design           | `docs/design/archive/slices/ex-34-project-archive-reversal-replacement-governance-baseline.md` | 状态机 / 命令与接口边界 / 持久化边界                       | Frozen | 本片直接消费。                           |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                 | `replaceProjectArchiveRecord` / `voidProjectArchiveRecord` | Frozen | 两条 route 已为 `planned`。              |
| Runtime precedent         | `EX-25`                                                                                        | `ProjectArchiveRecord` create/list + timeline              | Frozen | 保留 project-scoped create/list。        |
| Command precedent         | `EX-15E2B` / `EX-15E2C`                                                                        | item `replace` path identity                               | Frozen | path `{id}` 是被替代记录 identity SSOT。 |
| Development policy        | `EX-35`                                                                                        | 开发期 direct cutover                                      | Frozen | 当前不做旧数据 / 旧 DTO 兼容层。         |

## 3. 本次 SSOT

| Concern                     | SSOT                               | Implementation Rule                                                                        |     |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ | --- |
| Business semantics          | `EX-34` baseline                   | archive 仍为 terminal-state attached milestone。                                           |     |
| Public route canonical path | `api-route-canonical-inventory.md` | `POST /project-archive-records/{id}:replace` / `POST /project-archive-records/{id}:void`。 |     |
| Route / command naming      | `EX-34` baseline                   | `replaceProjectArchiveRecord` / `voidProjectArchiveRecord`。                               |     |
| DTO / contract naming       | `@poms/shared-contracts`           | 新增 `ReplaceProjectArchiveRecordRequest` / `VoidProjectArchiveRecordRequest`。            |     |
| Table / column naming       | `EX-34` baseline + migration       | `supersedes_archive_record_id`、`replacement_reason`、`voided_*`。                         |     |
| Date / time semantics       | existing project archive datetime  | `archivedAt`、`voidedAt` 均使用 ISO datetime。                                             |     |
| Identifier semantics        | archive record `id`                | path `{id}` 指向被替代 / 被撤销 record。                                                   |     |
| Money / decimal semantics   | `N/A`                              | 本片不涉及金额。                                                                           |     |
| Status machine              | `EX-34` baseline                   | 只有 `recorded` 是 current archive。                                                       |     |

## 4. 命令与接口边界

| Route                                        | Command / Service             | Request DTO / Contract                                                                                                           | Response DTO / Contract       | Guard / Permission | Design Source | Result |
| -------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------ | ------------- | ------ |
| `POST /project-archive-records/{id}:replace` | `replaceProjectArchiveRecord` | `ReplaceProjectArchiveRecordRequest`: `archivedAt`、`archiveSummary`、`evidenceSummary`、`replacementReason`、`expectedVersion?` | `ProjectArchiveRecordSummary` | `project:write`    | `EX-34`       | Frozen |
| `POST /project-archive-records/{id}:void`    | `voidProjectArchiveRecord`    | `VoidProjectArchiveRecordRequest`: `reason`、`comment?`、`expectedVersion?`                                                      | `ProjectArchiveRecordSummary` | `project:write`    | `EX-34`       | Frozen |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `POST /project-archive-records/{id}:replace`
  - `POST /project-archive-records/{id}:void`
- Current implemented route(s): `N/A`
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-34`
- Blocker / exception: none

## 5. 读侧边界

| Query / View                                | Consumer                 | Fields                                                                                                           | Filter / Sort             | Permission Boundary | Design Source | Result |
| ------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------- | ------------- | ------ |
| `GET /projects/{projectId}/archive-records` | future archive audit UI  | `status`、`supersedesArchiveRecordId`、`replacementReason`、`voidedAt`、`voidedBy`、`voidedByName`、`voidReason` | all records, newest first | `project:read`      | `EX-34`       | Frozen |
| `GET /projects/{projectId}/timeline`        | project detail lifecycle | latest current `recorded` archive only                                                                           | latest recorded           | `project:read`      | `EX-34`       | Frozen |

## 6. 持久化边界

| Table                         | Migration                                                                   | Entity / Repository    | DDL / Freeze Source | Check Result |
| ----------------------------- | --------------------------------------------------------------------------- | ---------------------- | ------------------- | ------------ |
| `poms.project_archive_record` | `Migration20260426100000_ex34a_project_archive_record_reversal_replacement` | `ProjectArchiveRecord` | `EX-34`             | Pending      |

| Field                          | Design Type / Meaning                        | Migration / DDL                                                          | Entity / Contract                           | Result  |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ------- |
| `status`                       | `recorded` / `voided` / `superseded`         | check constraint                                                         | enum in entity + shared contract            | Pending |
| `supersedes_archive_record_id` | nullable self reference to superseded record | FK to same table + index                                                 | `supersedesArchiveRecordId` nullable uuid   | Pending |
| `replacement_reason`           | reason on replacement record                 | nullable text                                                            | `replacementReason` nullable string         | Pending |
| `voided_at`                    | nullable datetime                            | nullable timestamptz                                                     | `voidedAt` nullable ISO datetime            | Pending |
| `voided_by`                    | nullable platform user id                    | nullable uuid                                                            | `voidedBy` nullable uuid                    | Pending |
| `void_reason`                  | reason/comment for void action               | nullable text                                                            | `voidReason` nullable string                | Pending |
| current uniqueness             | one current recorded archive per project     | partial unique on `project_id` where `status = 'recorded'` or equivalent | entity unique expression + repository guard | Pending |

## 7. 一致性结论

- Document -> code: pending implementation.
- ADR-015 inventory -> route: planned rows exist and must become aligned after implementation.
- Migration -> entity: migration first, then entity.
- Entity -> contract: shared contract must expose all new audit fields.
- Route -> command: controller must bind top-level item route to service command.
- Query -> view: list includes audit fields; timeline only current `recorded`.
- Guard / permission: `project:write` for commands, `project:read` for queries.
- OpenAPI / generated client: must be regenerated / checked.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                 | Result  | Gap / Reason |
| -------------------------------- | -------- | -------------------------------------------------- | ------- | ------------ |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                   | Pending |              |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                  | Pending |              |
| Unit tests                       | Yes      | focused project service/controller/query specs     | Pending |              |
| API / integration tests          | Yes      | focused API E2E if route test harness is available | Pending |              |
| E2E                              | No       | admin UI unchanged                                 | N/A     | `FE-31`      |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi` + `shared-api-client:check`     | Pending |              |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-check`    | Pending |              |
| Markdown                         | Yes      | `corepack pnpm run format:md:check`                | Pending |              |
| Diff whitespace                  | Yes      | `git diff --check`                                 | Pending |              |

## 9. 例外与风险

| Exception ID                 | Level | Scope             | Approved By | Cleanup Owner | Cleanup Due | Notes                                       |
| ---------------------------- | ----- | ----------------- | ----------- | ------------- | ----------- | ------------------------------------------- |
| `EX34A-E1-NO-FRONTEND-ENTRY` | `E1`  | UI entry deferred | `Codex`     | `FE-31 owner` | `FE-31 G4`  | 后端事实链先落地；前端入口由 `FE-31` 处理。 |

## 10. G1 结论

- Gate Status: `G1 = Pass`
- Approved By: `Codex`
- Approved At: `2026-04-26`
- Conditions:
  1. 先写 migration，再同步 entity / contract / controller。
  2. route implementation 后将 inventory status 从 `planned` 改为 `aligned`。
  3. 若 migration-check 暴露 partial unique 表达式 drift，必须分类并修复，不能静默放行。
