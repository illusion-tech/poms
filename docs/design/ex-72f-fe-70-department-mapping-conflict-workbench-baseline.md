# EX-72F / FE-70 部门映射与冲突处理工作台实施基线

- Gate Status: `Pass`
- Parent: `#8`
- GitHub Issue: `#10`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-17
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-72F/FE-70`

## 1. 范围

- 本次目标:
  - 将外部组织同步工作台中的部门映射从只读表升级为可处理的映射工作台。
  - 支持管理员按外部部门逐条完成映射、重新映射、解除映射、忽略和恢复忽略。
  - 显示未映射、已映射、冲突、已忽略和已失效等用户可理解的处理状态，并给出冲突原因和下一步动作。
  - 映射变更后明确提示当前预览可能过期，提供重新生成预览或跳转到相关预览差异的入口。
  - 新增 row-level command routes，避免继续把单行操作建模为整表替换。
- 本次明确不做:
  - 不新增外部 OA adapter，不实现 DingTalk / WeCom 组织同步。
  - 不同步用户、不创建用户、不自动赋权、不改变用户组织归属。
  - 不向飞书或其他外部 OA 回写 POMS 组织结构。
  - 不新增持久化表；优先复用 `external_department_mapping`、`org_sync_run`、`org_sync_diff_item`。
  - 不实现跨 source 全局冲突中心、批量自动匹配或长期历史保留策略。
- 下游可依赖的交付边界:
  - 管理员可以在 `/platform/external-org-sync` 内处理一个 source 下的部门映射和冲突。
  - 行级 mapping command 具备 `expectedVersion` 乐观并发边界和行级审计。
  - `replaceExternalDepartmentMappings` 仍保留为受控批量维护接口，不再作为 Admin 主交互写入路径。
- 不允许下游依赖的留白:
  - 不得依赖本片完成用户同步、权限同步或多 OA adapter。
  - 不得依赖前端自行模拟后端 preview / apply diff 规则。
  - 不得依赖 ignored 部门继续保持 POMS OrgUnit 绑定关系。

## 2. 正式输入

| Input Type                | Document / Source                                                                      | Section / Anchor               | Status | Notes                                                       |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------ | ------ | ----------------------------------------------------------- |
| Business design           | GitHub issue `#10`                                                                     | Scope / acceptance criteria    | Pass   | 明确映射、忽略、恢复、冲突原因、状态筛选和重新预览入口。    |
| Parent program            | GitHub issue `#8`                                                                      | External org sync UX closure   | Pass   | #10 是外部组织同步体验闭环剩余核心切片。                    |
| Governance input          | `docs/design/archive/slices/ex-72a-external-org-sync-governance-baseline.md`           | 4 / 5 / 6 / 7                  | Pass   | 冻结部门映射是同步工作流中的关系数据，POMS 是组织事实源。   |
| Persistence input         | `docs/design/archive/slices/ex-72b-external-org-sync-persistence-baseline.md`          | mapping table / constraints    | Pass   | 已有 `external_department_mapping`、rowVersion 和唯一约束。 |
| API input                 | `docs/design/archive/slices/ex-72c-external-org-sync-api-baseline.md`                  | mapping list / replace         | Rework | bulk replace 不适合作为行级用户操作，需要新增 command。     |
| Runtime input             | `docs/design/archive/slices/ex-72d-external-org-sync-runtime-baseline.md`              | preview diff / conflict rules  | Pass   | 冲突由 preview diff 发现，mapping 工作台负责人工处理。      |
| Admin workbench input     | `docs/design/archive/slices/fe-67-external-org-sync-workbench-baseline.md`             | mapping panel                  | Rework | 当前 mapping panel 只读，需要升级为处理工作台。             |
| Wizard input              | `docs/design/archive/slices/fe-68-external-org-sync-configuration-wizard-baseline.md`  | downstream handoff             | Pass   | 配置向导明确部门冲突处理由 #10 承接。                       |
| Run history input         | `docs/design/archive/slices/ex-72e-fe-69-org-sync-run-history-diagnostics-baseline.md` | run detail / diff links        | Pass   | 复用运行历史和 diff items 作为“跳转到相关预览差异”入口。    |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                         | B18 External Organization Sync | Rework | 需新增 row-level mapping command routes。                   |

## 3. 本次 SSOT

| Concern                     | SSOT                                       | Implementation Rule                                                                                            |
| --------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Business semantics          | `#10` + 本基线                             | 部门映射处理是组织同步工作台能力，不属于企业协同接入配置。                                                     |
| Public route canonical path | B18 route inventory                        | 新增 `map`、`unmap`、`ignore`、`restore` 四条 `POST /platform/external-department-mappings/{id}:action` 命令。 |
| Route / command naming      | ADR-015 custom method                      | 用户动作使用命令 route；`replaceExternalDepartmentMappings` 不再承载 Admin 行级交互。                          |
| DTO / contract naming       | `@poms/shared-contracts`                   | 新增 `MapExternalDepartmentMappingRequest`、`Unmap...`、`Ignore...`、`Restore...` 和 mapping review fields。   |
| Table / column naming       | Existing `external_department_mapping`     | 不新增表；复用 `status`、`orgUnitId`、`externalSnapshot`、`lastSeenAt`、`rowVersion`。                         |
| Date / time semantics       | Existing UTC datetime                      | `lastSeenAt`、`createdAt`、`updatedAt` 仍输出 ISO datetime。                                                   |
| Identifier semantics        | Existing UUID + external string id         | route `id` 是 mapping UUID；externalDepartmentId 仍是外部 string，不作为 route identity。                      |
| Money / decimal semantics   | N/A                                        | 不涉及金额。                                                                                                   |
| Status machine              | `ExternalDepartmentMappingStatus` + 本基线 | persisted status 保持 `unmapped/mapped/conflict/ignored`；`stale` 是读侧 review state，不新增 DDL enum。       |

## 4. 状态与冲突语义

### 4.1 持久化状态

| Status     | Meaning                    | Command / Runtime Rule                                                                       |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `unmapped` | 外部部门尚未绑定 POMS 组织 | 可通过 `map` 绑定；preview 可继续产生 create 候选。                                          |
| `mapped`   | 外部部门已绑定 POMS 组织   | 可通过 `map` 重新映射、`unmap` 解除、`ignore` 忽略；preview 可产生 update / move / disable。 |
| `conflict` | 当前映射需要人工处理       | preview 发现父级无法解析、目标组织不存在或失效等风险时写入；必须 map / unmap / ignore 处理。 |
| `ignored`  | 管理员明确不纳入同步       | preview 默认不产生写入候选；只允许 restore 或重新 map。                                      |

### 4.2 派生 review state

| Review State | Source                                                               | User Meaning                                     |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------ |
| `unmapped`   | persisted `status = unmapped`                                        | 需要选择 POMS 组织，或允许后续创建。             |
| `mapped`     | persisted `status = mapped` 且无 stale diff                          | 当前绑定有效。                                   |
| `conflict`   | persisted `status = conflict` 或最新 conflict diff                   | 当前不能直接应用，需要人工处理。                 |
| `ignored`    | persisted `status = ignored`                                         | 已主动跳过，不应作为同步失败展示。               |
| `stale`      | 最新 preview 对该 mapping 生成 `disable_org_unit` 或外部部门缺失摘要 | 外部部门最近未发现，需要确认是否保留 POMS 组织。 |

### 4.3 冲突类型

| Conflict Type                 | Detection Source                             | Required User Path                          |
| ----------------------------- | -------------------------------------------- | ------------------------------------------- |
| `mapped_org_unit_missing`     | mapped org unit 不存在或 FK 置空             | 重新映射、解除映射或忽略。                  |
| `mapped_org_unit_inactive`    | mapped org unit 已停用                       | 重新映射到 active OrgUnit、解除映射或忽略。 |
| `parent_mapping_missing`      | 外部父部门无法解析为 POMS 父组织             | 先处理父部门映射，或手动映射当前部门。      |
| `parent_cycle_risk`           | 目标父组织会造成循环或非法移动               | 重新选择 POMS 组织或跳过该 diff。           |
| `mapped_org_unique_conflict`  | 同一 source 下多个外部部门指向同一 POMS 组织 | 解除旧映射或重新映射其中一个部门。          |
| `external_department_missing` | mapping 对应外部部门最近未发现               | 确认停用、忽略或恢复后重新预览。            |

## 5. 命令与接口边界

| Route / Controller                                                  | Command / Query                     | Request DTO / Contract                    | Response DTO / Contract            | Guard / Permission                                       | Result  |
| ------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------- | ---------------------------------- | -------------------------------------------------------- | ------- |
| `GET /platform/external-org-sources/{sourceId}/department-mappings` | `listExternalDepartmentMappings`    | `ExternalDepartmentMappingListQuery`      | `ExternalDepartmentMappingList`    | `platform:org-units:manage` + `platform:org-sync:manage` | rework  |
| `PUT /platform/external-org-sources/{sourceId}/department-mappings` | `replaceExternalDepartmentMappings` | existing                                  | existing                           | same                                                     | legacy  |
| `POST /platform/external-department-mappings/{id}:map`              | `mapExternalDepartmentMapping`      | `MapExternalDepartmentMappingRequest`     | `ExternalDepartmentMappingSummary` | same                                                     | planned |
| `POST /platform/external-department-mappings/{id}:unmap`            | `unmapExternalDepartmentMapping`    | `UnmapExternalDepartmentMappingRequest`   | `ExternalDepartmentMappingSummary` | same                                                     | planned |
| `POST /platform/external-department-mappings/{id}:ignore`           | `ignoreExternalDepartmentMapping`   | `IgnoreExternalDepartmentMappingRequest`  | `ExternalDepartmentMappingSummary` | same                                                     | planned |
| `POST /platform/external-department-mappings/{id}:restore`          | `restoreExternalDepartmentMapping`  | `RestoreExternalDepartmentMappingRequest` | `ExternalDepartmentMappingSummary` | same                                                     | planned |
| `GET /platform/org-sync-runs/{id}/diff-items`                       | `listOrgSyncDiffItems`              | existing                                  | existing                           | same                                                     | reused  |
| `POST /platform/external-org-sources/{sourceId}/org-sync-runs`      | `createOrgSyncRun`                  | existing                                  | existing                           | same                                                     | reused  |

### 5.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `POST /platform/external-department-mappings/{id}:map`
  - `POST /platform/external-department-mappings/{id}:unmap`
  - `POST /platform/external-department-mappings/{id}:ignore`
  - `POST /platform/external-department-mappings/{id}:restore`
- Current implemented route(s): none for the four commands.
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-72A/C` + `#10`
- Blocker / exception: implementation is blocked until these planned rows, request contracts and OpenAPI generation are added together in G2.

### 5.2 Request contract rules

| Request                                   | Fields                         | Rule                                                                                     |
| ----------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| `MapExternalDepartmentMappingRequest`     | `orgUnitId`, `expectedVersion` | `orgUnitId` required；target OrgUnit must exist and be active；expectedVersion required. |
| `UnmapExternalDepartmentMappingRequest`   | `expectedVersion`              | Clears `orgUnitId` and sets status to `unmapped`；expectedVersion required.              |
| `IgnoreExternalDepartmentMappingRequest`  | `expectedVersion`              | Clears `orgUnitId` and sets status to `ignored`；expectedVersion required.               |
| `RestoreExternalDepartmentMappingRequest` | `expectedVersion`              | Restores ignored mapping to `unmapped`；expectedVersion required.                        |

## 6. 读侧边界

| Query / View                | Consumer                | Fields / Behavior                                                                                            | Filter / Sort                             | Result  |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ------- |
| Mapping list                | Admin mapping workbench | Existing summary plus `reviewState`、`conflictReason`、`lastConflictRunId`、`lastConflictDiffItemId`。       | status / reviewState / search / orgUnitId | rework  |
| Latest conflict diff lookup | API service read model  | For each mapping, derive latest conflict/stale reason from latest source run diff item when available.       | source-scoped, newest run first           | planned |
| Current preview diff jump   | Admin mapping workbench | Row action opens current run detail or filters diff list by `externalDepartmentId` when related diff exists. | externalDepartmentId                      | reused  |
| OrgUnit selection           | Admin mapping dialog    | Reuse loaded org units; disabled/inactive org units cannot be selected as target mapping.                    | local search                              | reused  |

## 7. 持久化边界

| Table                         | Migration | Entity / Repository                       | DDL / Freeze Source | Check Result                                     |
| ----------------------------- | --------- | ----------------------------------------- | ------------------- | ------------------------------------------------ |
| `external_department_mapping` | No        | `ExternalDepartmentMapping`               | EX-72B migration    | reuse existing status / orgUnitId / rowVersion   |
| `org_sync_diff_item`          | No        | `OrgSyncDiffItem`                         | EX-72B migration    | reuse latest conflict / stale reason source      |
| `org_sync_run`                | No        | `OrgSyncRun`                              | EX-72B migration    | reuse run status and startedAt for latest lookup |
| `org_unit`                    | No        | existing platform `OrgUnit` read boundary | platform model      | target OrgUnit must exist and be active          |

| Field / Shape                                  | Design Type / Meaning                  | Migration / DDL | Entity         | Shared Contract / OpenAPI    | Result   |
| ---------------------------------------------- | -------------------------------------- | --------------- | -------------- | ---------------------------- | -------- |
| `ExternalDepartmentMapping.status`             | persisted mapping lifecycle            | existing check  | existing       | existing enum                | reuse    |
| `ExternalDepartmentMapping.orgUnitId`          | nullable POMS OrgUnit UUID             | existing FK     | existing       | existing nullable UUID       | reuse    |
| `ExternalDepartmentMapping.rowVersion`         | optimistic concurrency                 | existing int    | existing       | request `expectedVersion`    | required |
| `reviewState`                                  | derived mapping review state           | N/A             | N/A            | new response field           | planned  |
| `conflictReason`                               | latest conflict / stale display reason | N/A             | from diff item | new nullable response field  | planned  |
| `lastConflictRunId` / `lastConflictDiffItemId` | jump target                            | N/A             | from diff item | new nullable response fields | planned  |

## 8. UI 与交互边界

| Area                | FE-70 Behavior                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Mapping panel title | Use “外部部门映射” and source provider label; avoid hard-coded “飞书部门映射” for all providers.                        |
| Filters             | Tabs or segmented controls for all / unmapped / mapped / conflict / ignored / stale; search by external name / id.      |
| Row actions         | `map` / `remap` / `unmap` / `ignore` / `restore` are shown by row state; disabled states explain why.                   |
| Mapping dialog      | Uses OrgUnit selector, shows current external department and existing target, submits row command with expectedVersion. |
| Conflict reason     | Shows reason and next action inline; provides “查看预览差异” when linked diff item exists.                              |
| Preview freshness   | After any mapping command, mark current preview as stale and show “重新生成预览” primary recovery action.               |
| Empty states        | Distinguish no mappings yet, no rows for selected filter, all conflicts resolved, and ignored rows.                     |
| Feedback            | Success toast names the department and command result; conflict toast explains rowVersion refresh path.                 |

## 9. 一致性结论

- Document -> code: 本基线冻结 #10 的业务、command、read model 和 Admin 行为。
- ADR-015 inventory -> route: 新增四条 B18 planned command route；实现前不得写 controller / DTO / OpenAPI。
- Migration -> entity: 不新增 DDL；如实现发现必须持久化 ignore reason 或 stale 状态，应先回到 G1 重开设计。
- Entity -> contract: `ExternalDepartmentMappingSummary` 需要新增 derived review fields；entity 不新增字段。
- Route -> command: 行级用户动作必须走 command route，不能继续通过 bulk replace 间接实现。
- Query -> view: Admin mapping table 以 `reviewState` 和 latest diff metadata 驱动筛选、原因和跳转。
- Guard / permission: 沿用 `platform:org-units:manage` + `platform:org-sync:manage`。
- OpenAPI / generated client: G2 必须同步生成并检查。

## 10. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                      | Result  | Gap / Reason                                                      |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| API focused tests                | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=external-org-sync --skip-nx-cache`                       | Pending | 覆盖 map / unmap / ignore / restore、rowVersion、唯一约束和审计。 |
| Admin focused tests              | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=external-org-sync-workbench --skip-nx-cache`           | Pending | 覆盖筛选、行操作、冲突原因、预览 stale 提示和重新预览入口。       |
| Admin data-access lint           | Yes      | `corepack pnpm nx lint admin-data-access --skip-nx-cache`                                                               | Pending | store 新 command 方法和状态。                                     |
| API lint / build                 | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache` / `corepack pnpm nx build poms-api --skip-nx-cache`                    | Pending | 新 controller / service / contract。                              |
| Admin lint / build               | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache` / `corepack pnpm nx build poms-admin --skip-nx-cache`                | Pending | Angular template 和 PrimeNG form/dialog。                         |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` / `corepack pnpm nx run shared-api-client:generate` / `shared-api-client:check` | Pending | 新 command routes 和 mapping response fields。                    |
| Migration / schema check         | No       | N/A                                                                                                                     | N/A     | G1 冻结为无 DDL 变更。                                            |
| Markdown / diff sanity           | Yes      | `corepack pnpm run format:md:check` / `git diff --check`                                                                | Pending | 本片新增 Markdown，提交前必跑。                                   |

## 11. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes      |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 暂无例外。 |

## 12. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-17
- Conditions:
  - G2 必须先实现 shared contracts、DTO、route inventory aligned、OpenAPI / generated client，再接 Admin store 和 UI。
  - `replaceExternalDepartmentMappings` 不得作为 Admin 行级映射操作的实现捷径。
  - `expectedVersion` 是四个 row-level command 的必填并发边界。
  - `ignore` 必须清空 `orgUnitId`，避免 ignored 关系继续占用 POMS 组织映射唯一性。
  - `stale` 只作为 derived review state；不得在没有设计回滚的情况下新增 DDL enum。
