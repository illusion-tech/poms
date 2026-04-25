# EX-34 项目归档记录撤销 / 替代版本链治理基线

- Gate Status: `G1 = Pass`
- Slice Type: `api / command + persistence governance baseline`
- Owner: `Codex`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-34`
- Direct Trigger: `EX25-E3-ARCHIVE-REVERSAL-OUT-OF-SCOPE`

## 1. 范围

本次目标:

1. 冻结 `ProjectArchiveRecord` 撤销、替代和状态机边界。
2. 冻结归档记录撤销 / 替代的 public route inventory。
3. 冻结后续运行时实现应采用的命令、DTO、查询投影、审计和并发规则。
4. 将 `EX25-E3-ARCHIVE-REVERSAL-OUT-OF-SCOPE` 从未归口例外收敛为可执行后续切片。

本次明确不做:

1. 不修改运行时代码。
2. 不新增 migration、entity、service、controller、OpenAPI 或 generated client。
3. 不新增前端页面、按钮或 E2E。
4. 不改变 `EX-25` 已交付的归档事实 create/list route。
5. 不把归档扩展为新的主生命周期阶段；archive 仍是 `completed` 终态下的附属 milestone。

下游可依赖的交付边界:

1. 后续运行时切片可按本基线新增撤销 / 替代状态与命令。
2. 后续 public route 必须使用本基线写入 inventory 的 canonical route。
3. 项目时间线只能投影当前有效 `recorded` 归档记录。

不允许下游依赖的留白:

1. 本片没有交付可调用的撤销 / 替代 API。
2. 本片没有交付 UI 行为。
3. 本片没有确认数据库方言层面的 partial unique 语法，需在运行时实现中由 migration-check 验证。

## 2. 正式输入

| Input Type                | Document / Source                  | Section / Anchor                                           | Status | Notes                                                               |
| ------------------------- | ---------------------------------- | ---------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| Business design           | `project-lifecycle-design.md`      | 项目完成 / 归档终态语义                                    | Frozen | 归档是 terminal-state attached milestone。                          |
| Runtime precedent         | `EX-25`                            | `ProjectArchiveRecord` create/list + timeline 投影         | Frozen | 当前只有 `recorded` 状态与 latest recorded 投影。                   |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md` | `replaceProjectArchiveRecord` / `voidProjectArchiveRecord` | Frozen | 两条 route 已作为 `planned` authoritative inventory 行写入。        |
| ADR                       | `ADR-015`                          | resource-first + item `colon-action`                       | Frozen | 撤销 / 替代绑定稳定 archive record item identity。                  |
| Command precedent         | `EX-15E2B` / `EX-15E2C`            | replace chain route identity                               | Frozen | `replace*` path `{id}` 是被替代记录 identity SSOT。                 |
| Query boundary            | `ProjectQueryService`              | `getProjectTimeline` / archive list                        | Fact   | timeline 当前取 latest `recorded`；后续必须继续排除非当前有效记录。 |
| Data model / table freeze | `ProjectArchiveRecord` entity      | `status`、`rowVersion`、archive fields                     | Fact   | 当前 status 只有 `recorded`，后续 runtime 扩展为三态。              |

## 3. 本次 SSOT

| Concern                     | SSOT                                | Implementation Rule                                                          |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Business semantics          | 本基线 + `EX-25`                    | archive 不成为第九个生命周期阶段，只作为终态附属 milestone。                 |
| Public route canonical path | `api-route-canonical-inventory.md`  | `replace` / `void` 使用 top-level item `colon-action`。                      |
| Route / command naming      | 本基线                              | `replaceProjectArchiveRecord`、`voidProjectArchiveRecord`。                  |
| DTO / contract naming       | 本基线                              | `ReplaceProjectArchiveRecordRequest`、`VoidProjectArchiveRecordRequest`。    |
| Table / column naming       | 本基线                              | `supersedes_archive_record_id`、`voided_at`、`voided_by`、`void_reason`。    |
| Date / time semantics       | Existing archive datetime semantics | `archivedAt` / `voidedAt` 均为服务端可追溯 datetime；DTO 使用 ISO datetime。 |
| Identifier semantics        | Archive record `id`                 | route path `{id}` 始终指向被作废 / 被替代的 archive record。                 |
| Money / decimal semantics   | `N/A`                               | 本片不涉及金额。                                                             |
| Status machine              | 本基线                              | `recorded`、`voided`、`superseded`；只有 `recorded` 可作为当前有效归档事实。 |

## 4. 状态机

| Status       | Meaning                | May Be Timeline Current | Allowed Transition                              | Notes                                                  |
| ------------ | ---------------------- | ----------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| `recorded`   | 当前有效归档事实       | Yes                     | `recorded -> voided` / `recorded -> superseded` | 一个项目同一时间最多一个 current `recorded` archive。  |
| `voided`     | 归档事实被撤销         | No                      | Terminal                                        | 保留审计，不删除记录；后续 list 应可区分状态。         |
| `superseded` | 归档事实被替代版本取代 | No                      | Terminal                                        | replacement 新建一条 `recorded` 记录并反向指向旧记录。 |

规则:

1. 禁止物理删除归档记录。
2. 撤销只改变被撤销记录的状态和撤销元数据，不创建新的归档记录。
3. 替代必须在同一事务中把旧记录标为 `superseded`，并创建新的 `recorded` replacement 记录。
4. 如果项目已有 current `recorded` archive，则 create 新 archive 应被阻断或要求走 `replace`。
5. 时间线、项目详情终态归档面板和所有“当前归档事实”读取链路只消费 current `recorded`。

## 5. 命令与接口边界

| Route                                        | Command / Service             | Request DTO / Contract                                                                                                          | Response DTO / Contract       | Guard / Permission | Design Source       | Result |
| -------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------ | ------------------- | ------ |
| `POST /project-archive-records/{id}:replace` | `replaceProjectArchiveRecord` | `ReplaceProjectArchiveRecordRequest`: `archivedAt`、`archiveSummary`、`evidenceSummary`、`replacementReason`、`expectedVersion` | `ProjectArchiveRecordSummary` | `project:write`    | `ADR-015` + `EX-34` | Frozen |
| `POST /project-archive-records/{id}:void`    | `voidProjectArchiveRecord`    | `VoidProjectArchiveRecordRequest`: `reason`、`comment?`、`expectedVersion`                                                      | `ProjectArchiveRecordSummary` | `project:write`    | `ADR-015` + `EX-34` | Frozen |

### 5.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical routes:
  - `POST /project-archive-records/{id}:replace`
  - `POST /project-archive-records/{id}:void`
- Current implemented routes: `N/A`
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-34`
- Blocker / exception: runtime implementation deferred to `EX-34A`

## 6. 读侧边界

| Query / View                                | Consumer                          | Fields                                                                           | Filter / Sort                                     | Permission Boundary | Design Source   | Result |
| ------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------- | --------------- | ------ |
| `GET /projects/{projectId}/archive-records` | 项目详情 / 后续归档审计 UI        | 增补 `status`、`supersedesArchiveRecordId`、`voidedAt`、`voidedBy`、`voidReason` | 默认按 `archivedAt desc`；后续可显示 all statuses | `project:read`      | `EX-34`         | Frozen |
| `GET /projects/{projectId}/timeline`        | 项目生命周期 / 终态归档 milestone | 仅投影 current `recorded` archive                                                | latest current `recorded`                         | `project:read`      | `EX-25`+`EX-34` | Frozen |

读侧规则:

1. timeline 不展示 `voided` / `superseded`。
2. archive list 可返回历史记录，但必须携带 status，让前端不能把非当前记录误当成有效归档。
3. 如果 current `recorded` 不存在，前端终态归档区应继续显示 gap，而不是复用旧记录。

## 7. 持久化边界

| Table                         | Migration Target                                                      | Entity / Repository Target                  | DDL / Freeze Source | Check Result |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------- | ------------------- | ------------ |
| `poms.project_archive_record` | 扩展 status check/enum、替代链字段、撤销字段、current 唯一约束 / 索引 | `ProjectArchiveRecord`、`ProjectRepository` | `EX-34A`            | Deferred     |

| Field                          | Design Type / Meaning                        | Migration / DDL                                                          | Entity / Contract                         | Result |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------- | ------ |
| `status`                       | `recorded` / `voided` / `superseded`         | 扩展既有 status constraint                                               | enum 同步 shared contract                 | Frozen |
| `supersedes_archive_record_id` | nullable self reference to superseded record | FK 到 `project_archive_record.id`                                        | `supersedesArchiveRecordId` nullable uuid | Frozen |
| `voided_at`                    | nullable datetime                            | nullable timestamptz / datetime                                          | `voidedAt` nullable datetime              | Frozen |
| `voided_by`                    | nullable platform user id                    | nullable uuid                                                            | `voidedBy` nullable uuid                  | Frozen |
| `void_reason`                  | required when status becomes `voided`        | nullable text                                                            | `voidReason` nullable string              | Frozen |
| current uniqueness             | one current recorded archive per project     | partial unique on `project_id` where `status = 'recorded'` or equivalent | repository guard + DB constraint          | Frozen |

## 8. 一致性结论

- Document -> code: 当前代码只有 `recorded`，本片不改代码；差异作为后续 `EX-34A` runtime scope。
- ADR-015 inventory -> route: 已新增两条 `planned` route inventory 行。
- Migration -> entity: deferred；`EX-34A` 必须先写 migration，再同步 entity。
- Entity -> contract: deferred；`ProjectArchiveRecordStatus` 必须扩为三态并补新增字段。
- Route -> command: frozen；path `{id}` 绑定被作废 / 被替代 archive record。
- Query -> view: frozen；timeline 只消费 current `recorded`。
- Guard / permission: 沿用项目写权限 `project:write` 和读权限 `project:read`。
- OpenAPI / generated client: deferred；`EX-34A` 必须跑 openapi + generated client check。

## 9. 后续实施切片

| Slice    | 类型                    | 范围                                                                                                                                                      |
| -------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX-34A` | `cross-layer-high-risk` | migration/entity/shared contract/controller/service/repository/OpenAPI/generated client/tests，落地 archive `replace` / `void` 与 timeline current 投影。 |
| `FE-31`  | `frontend-only`         | 在 `EX-34A` 后提供归档撤销 / 替代入口、权限显隐、归档历史状态呈现和浏览器验证。                                                                           |

`EX-34A` 进入 `G2` 前必须确认:

1. inventory 两条 planned route 仍与本基线一致。
2. migration-check 可覆盖 status / self-FK / partial unique 或等价 current 约束。
3. 后端测试覆盖 replace、void、并发 expectedVersion、timeline 排除非 current 记录。

## 10. 验证要求

本治理基线本身需要:

1. `corepack pnpm run format:md`
2. `corepack pnpm run format:md:check`
3. `git diff --check`

后续 `EX-34A` runtime 实现至少需要:

1. `corepack pnpm nx lint poms-api`
2. `corepack pnpm nx build poms-api`
3. `corepack pnpm nx test poms-api`
4. `corepack pnpm nx e2e poms-api-e2e`
5. `corepack pnpm nx run poms-api:openapi`
6. `corepack pnpm nx run shared-api-client:check`
7. `corepack pnpm nx run poms-api:migration-check`
8. focused controller/service/query tests for archive replace / void / timeline current projection

## 11. 例外

| Exception ID                | Level | Scope                     | Approved By | Cleanup Owner  | Cleanup Due | Notes                                          |
| --------------------------- | ----- | ------------------------- | ----------- | -------------- | ----------- | ---------------------------------------------- |
| `EX34-E1-RUNTIME-DEFERRED`  | `E1`  | runtime implementation    | `Codex`     | `EX-34A owner` | `EX-34A G4` | 本片只冻结治理基线，不修改 API / persistence。 |
| `EX34-E2-FRONTEND-DEFERRED` | `E1`  | archive replace / void UI | `Codex`     | `FE-31 owner`  | `FE-31 G4`  | 当前没有前端入口诉求，先完成后端事实链与审计。 |

## 12. G1 结论

- `EX-34` 可作为项目归档撤销 / 替代运行时实现的正式输入。
- `ProjectArchiveRecordStatus` 目标状态冻结为 `recorded`、`voided`、`superseded`。
- 替代 route 冻结为 `POST /project-archive-records/{id}:replace`，path `{id}` 是被替代记录 identity。
- 撤销 route 冻结为 `POST /project-archive-records/{id}:void`，不删除记录，只写撤销状态与审计字段。
- 后续运行时代码必须拆入 `EX-34A` 或同等 tracker 切片后再开始。
