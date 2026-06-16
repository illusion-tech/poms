# EX-72A 外部组织同步与部门映射治理基线

- Gate Status: `Pass`
- Parent: `EX-72`
- Owner: `Codex`
- Slice Type: `docs-only + route-governance`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-10
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-72A`

## 1. 范围

- 本次目标:
  - 冻结 POMS 外部组织同步第一版的业务边界、对象模型、权限口径和 public API route inventory。
  - 明确“组织同步”是组织架构域工作流，“部门映射”是该工作流中的配置 / 事实关系。
  - 支持未来 Feishu / DingTalk / WeCom 多来源接入，但第一版运行时建议只先落 Feishu adapter。
  - 明确 POMS 仍是组织、用户、权限和业务归属的业务事实源；外部 OA 只提供候选组织数据和同步建议。
- 本次明确不做:
  - 不写运行时代码、migration、entity、controller、DTO、OpenAPI 或 generated client。
  - 不调用飞书 / 钉钉 / 企业微信真实通讯录 API。
  - 不自动创建用户、不自动赋权、不自动改变用户组织归属。
  - 不把 OBS / local 文件存储 provider 并入企业协同或组织同步后端模型。
  - 不把外部系统作为 POMS 业务事实源。
- 下游可依赖的交付边界:
  - `ExternalOrgSource`、`ExternalDepartmentMapping`、`OrgSyncRun`、`OrgSyncDiffItem` 四类对象的第一版语义。
  - B18 planned public API route inventory。
  - 后续 runtime slices 的切片顺序和验证门槛。
- 不允许下游依赖的留白:
  - 不得认为第一版必须同时支持 Feishu、DingTalk、WeCom。
  - 不得绕过 preview / diff / apply 工作流直接把外部部门写入 `OrgUnit`。
  - 不得通过身份提供商配置页直接应用组织事实变更。

## 2. 正式输入

| Input Type                | Document / Source                                             | Section / Anchor                     | Status | Notes                                                                         |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------ | ------ | ----------------------------------------------------------------------------- |
| Business design           | `fe-66-platform-config-integration-navigation-ia-baseline.md` | 4.2 组织同步与部门映射后续关系       | Pass   | 冻结组织同步属于组织架构工作流，连接授权属于企业协同接入。                    |
| Navigation design         | `platform-governance/navigation-design.md`                    | 平台配置 IA 树                       | Pass   | 组织架构入口是后续外部同步工作流承载域。                                      |
| Org unit design           | `platform-governance/org-unit-design.md`                      | 组织单元正式模型                     | Pass   | `OrgUnit` 是 POMS 正式组织管理实体，第一版树结构已存在。                      |
| Identity provider design  | `ex-64a-external-identity-provider-governance-baseline.md`    | Provider abstraction / Feishu scope  | Reuse  | 复用 provider config 和 Feishu adapter 思路，但不复用身份绑定语义。           |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                            | B18 external org sync planned routes | Pass   | 本片新增 planned inventory 行，runtime coding 必须消费这些 canonical routes。 |
| Data model / table freeze | 本文件                                                        | 6. 持久化边界                        | Pass   | 只冻结语义，DDL 由后续 runtime slice 落地。                                   |
| Schema / DDL              | `N/A`                                                         | `N/A`                                | N/A    | 本片不写 migration。                                                          |
| ADR                       | `ADR-015`                                                     | resource-first + colon-action        | Pass   | sync apply 使用 custom method；run/diff/mapping 使用资源。                    |

## 3. 本次 SSOT

| Concern                     | SSOT                                   | Implementation Rule                                                                               |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Business semantics          | 本 baseline                            | POMS 是组织事实源；外部 OA 是候选数据源和同步建议来源。                                           |
| Public route canonical path | `api-route-canonical-inventory.md` B18 | 后续 controller / OpenAPI / generated client 必须与 B18 planned routes 对齐。                     |
| Route / command naming      | 本 baseline + ADR-015                  | resource-first；`POST /platform/org-sync-runs/{id}:apply` 是唯一第一版 custom method。            |
| DTO / contract naming       | 本 baseline                            | 使用 `ExternalOrgSource*`、`ExternalDepartmentMapping*`、`OrgSyncRun*`、`OrgSyncDiffItem*`。      |
| Table / column naming       | 本 baseline                            | 使用 `external_org_source`、`external_department_mapping`、`org_sync_run`、`org_sync_diff_item`。 |
| Date / time semantics       | UTC ISO datetime                       | `startedAt`、`finishedAt`、`lastSeenAt`、`createdAt`、`updatedAt` 均为 datetime。                 |
| Identifier semantics        | Internal UUID + external string id     | POMS 主键用 UUID；外部部门 / 租户 / source record id 一律用 string，不误建为 UUID。               |
| Money / decimal semantics   | `N/A`                                  | 不涉及。                                                                                          |
| Status machine              | 本 baseline 5.3 / 5.4                  | run / diff 状态必须按冻结枚举实现，不用自由字符串。                                               |

## 4. 业务边界

### 4.1 组织同步与部门映射关系

- `组织同步` 是管理员工作流:
  1. 选择一个外部组织源。
  2. 拉取外部部门快照。
  3. 生成差异预览。
  4. 管理员确认应用。
  5. 记录同步结果和失败项。
- `部门映射` 是同步工作流中的关系数据:
  - 一个外部部门 ID 可以映射到一个 POMS `OrgUnit`。
  - 未映射、冲突、忽略、已映射是映射状态，不是同步运行状态。
  - 映射记录保存外部部门名称、父部门 ID、最近一次外部快照和最后发现时间。
- `OrgSyncRun` 是一次同步预览或应用的审计边界。
- `OrgSyncDiffItem` 是一次运行中的单条候选变更。

### 4.2 多来源规则

- POMS 可以存在多个 `ExternalOrgSource`，例如 Feishu、DingTalk、WeCom。
- 默认一个 POMS 组织子树只能有一个 `authoritative` 同步源。
- 同一外部部门不能在同一个 source 内映射到多个 active `OrgUnit`。
- 跨 source 对同一 POMS 组织子树产生候选变更时，不自动合并，必须进入人工确认。
- 第一版 runtime 建议先只实现 Feishu source adapter；DingTalk / WeCom adapter 作为后续 provider 扩展。

### 4.3 不自动处理的内容

- 不自动创建 POMS 用户。
- 不自动给用户授权或分配角色。
- 不自动改变用户主责 / 附属组织关系。
- 不删除 `OrgUnit`；外部部门消失时第一版只允许候选停用或人工忽略。
- 不向外部 OA 回写 POMS 组织结构。

## 5. 状态模型

### 5.1 `ExternalOrgSourceStatus`

| Status     | Meaning          | Rule                                        |
| ---------- | ---------------- | ------------------------------------------- |
| `draft`    | 已创建但不可同步 | 缺少连接、外部根部门或权限配置时使用。      |
| `active`   | 可用于同步       | 可以创建 sync run。                         |
| `paused`   | 暂停同步         | 不允许新建 sync run，但保留映射和历史记录。 |
| `archived` | 归档             | 不允许新建 sync run；历史记录只读。         |

### 5.2 `ExternalDepartmentMappingStatus`

| Status     | Meaning                     | Rule                                  |
| ---------- | --------------------------- | ------------------------------------- |
| `unmapped` | 尚未映射到 POMS 组织        | 可在 preview 中产生 create 候选。     |
| `mapped`   | 已映射到一个 active OrgUnit | 可产生 update / move / disable 候选。 |
| `conflict` | 映射或外部层级存在冲突      | apply 前必须人工处理或跳过。          |
| `ignored`  | 管理员明确忽略              | 后续 preview 默认不产生写入候选。     |

### 5.3 `OrgSyncRunStatus`

| Status       | Meaning          | Rule                   |
| ------------ | ---------------- | ---------------------- |
| `previewing` | 正在生成差异预览 | 不允许 apply。         |
| `previewed`  | 差异预览已生成   | 允许管理员确认应用。   |
| `applying`   | 正在应用         | 不允许重复 apply。     |
| `applied`    | 应用完成         | 只读。                 |
| `failed`     | 预览或应用失败   | 保留错误摘要和失败项。 |
| `cancelled`  | 管理员取消       | 不再允许 apply。       |

### 5.4 `OrgSyncDiffAction` / `OrgSyncDiffItemStatus`

| Concern | Values                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Action  | `create_org_unit`、`update_org_unit`、`move_org_unit`、`disable_org_unit`、`map_existing_org_unit`、`ignore`、`conflict` |
| Status  | `pending`、`approved`、`skipped`、`applied`、`failed`                                                                    |

## 6. 持久化边界

| Table                         | Purpose                    | Key Constraints                                                                    |
| ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| `external_org_source`         | 外部组织同步源             | `id` UUID；`provider + externalTenantId` 可唯一；active source 按组织子树互斥。    |
| `external_department_mapping` | 外部部门到 POMS 组织的映射 | `sourceId + externalDepartmentId` 唯一；`orgUnitId` 可为空。                       |
| `org_sync_run`                | 同步预览 / 应用运行记录    | `sourceId` FK；状态机受控；记录 actor、时间、统计和错误摘要。                      |
| `org_sync_diff_item`          | 单条候选变更               | `runId + externalDepartmentId + action` 可定位；保存 before / candidate snapshot。 |

| Field                        | Design Type / Meaning | Runtime Rule                        |
| ---------------------------- | --------------------- | ----------------------------------- |
| `externalTenantId`           | string                | 外部租户 ID，不建为 UUID。          |
| `externalRootDepartmentId`   | string nullable       | 外部根部门 ID，不建为 UUID。        |
| `externalDepartmentId`       | string                | 外部部门 ID，不建为 UUID。          |
| `externalParentDepartmentId` | string nullable       | 外部父部门 ID，不建为 UUID。        |
| `orgUnitId`                  | UUID nullable         | 指向 POMS `OrgUnit`，未映射时为空。 |
| `sourceId` / `runId`         | UUID                  | POMS 内部主键引用。                 |
| `beforeSnapshot`             | JSON nullable         | 应用前 POMS 组织或映射摘要。        |
| `candidateSnapshot`          | JSON                  | 外部部门候选快照和建议变更。        |
| `rowVersion`                 | integer               | 写命令 optimistic concurrency。     |

## 7. 命令与接口边界

| Route / Controller                                                  | Command / Service                   | Request DTO / Contract                     | Response DTO / Contract              | Guard / Permission                                       | Design Source | Result  |
| ------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------ | ------------------------------------ | -------------------------------------------------------- | ------------- | ------- |
| `GET /platform/external-org-sources`                                | `listExternalOrgSources`            | query filters                              | `ExternalOrgSourceSummary[]`         | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |
| `POST /platform/external-org-sources`                               | `createExternalOrgSource`           | `CreateExternalOrgSourceRequest`           | `ExternalOrgSourceDetail`            | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |
| `GET /platform/external-org-sources/{id}`                           | `getExternalOrgSource`              | N/A                                        | `ExternalOrgSourceDetail`            | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |
| `PATCH /platform/external-org-sources/{id}`                         | `updateExternalOrgSource`           | `UpdateExternalOrgSourceRequest`           | `ExternalOrgSourceDetail`            | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |
| `GET /platform/external-org-sources/{sourceId}/department-mappings` | `listExternalDepartmentMappings`    | query filters                              | `ExternalDepartmentMappingSummary[]` | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |
| `PUT /platform/external-org-sources/{sourceId}/department-mappings` | `replaceExternalDepartmentMappings` | `ReplaceExternalDepartmentMappingsRequest` | `ExternalDepartmentMappingSummary[]` | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |
| `POST /platform/external-org-sources/{sourceId}/org-sync-runs`      | `createOrgSyncRun`                  | `CreateOrgSyncRunRequest`                  | `OrgSyncRunDetail`                   | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |
| `GET /platform/org-sync-runs/{id}`                                  | `getOrgSyncRun`                     | N/A                                        | `OrgSyncRunDetail`                   | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |
| `GET /platform/org-sync-runs/{id}/diff-items`                       | `listOrgSyncDiffItems`              | query filters                              | `OrgSyncDiffItemSummary[]`           | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |
| `POST /platform/org-sync-runs/{id}:apply`                           | `applyOrgSyncRun`                   | `ApplyOrgSyncRunRequest`                   | `OrgSyncRunDetail`                   | `platform:org-units:manage` + `platform:org-sync:manage` | B18           | planned |

### 7.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): B18 rows in `6.23 EX-72 External Organization Sync`
- Current implemented route(s): none
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-72A`
- Blocker / exception: runtime coding is blocked until a runtime slice consumes this baseline and implements contracts, permissions, migration, OpenAPI and generated client together.

## 8. 后续实施切片建议

| Slice    | Type                    | Scope                                                                                                   |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `EX-72B` | `persistence`           | 新增 tables、entities、repositories、permission key、migration 和 seed / registry。                     |
| `EX-72C` | `api / command`         | 实现 source / mapping / run / diff / apply API、contracts、OpenAPI、generated client 和 backend tests。 |
| `EX-72D` | `cross-layer-high-risk` | 实现 Feishu organization adapter、preview diff 生成和 apply-to-OrgUnit 工作流。                         |
| `FE-67`  | `frontend-only`         | 在组织架构下新增外部同步工作台 UI，展示同步源、部门映射、差异预览和同步记录。                           |
| `EX-72E` | `e2e / closeout`        | 覆盖 preview -> apply、冲突、权限、审计、route inventory 和 tracker / progress G4 回写。                |

## 9. 一致性结论

- Document -> code: 本片只新增治理文档与 planned route inventory，不改 runtime code。
- ADR-015 inventory -> route: B18 planned routes 已冻结；runtime 未实现。
- Migration -> entity: 不涉及，后续 `EX-72B` 承接。
- Entity -> contract: 不涉及，后续 `EX-72B/C` 承接。
- Route -> command: planned route-command matrix 已冻结。
- Query -> view: planned query / response naming 已冻结。
- Guard / permission: 第一版冻结为 `platform:org-units:manage` + `platform:org-sync:manage`。
- OpenAPI / generated client: 本片不生成；后续 runtime slice 必须同步。

## 10. 测试与校验

| Check                            | Required | Command / Evidence                  | Result | Gap / Reason                          |
| -------------------------------- | -------- | ----------------------------------- | ------ | ------------------------------------- |
| Lint                             | No       | `N/A`                               | N/A    | docs-only。                           |
| Build                            | No       | `N/A`                               | N/A    | docs-only。                           |
| Unit tests                       | No       | `N/A`                               | N/A    | docs-only。                           |
| API / integration tests          | No       | `N/A`                               | N/A    | runtime 未实现。                      |
| E2E                              | No       | `N/A`                               | N/A    | runtime 未实现。                      |
| OpenAPI generation / client diff | No       | `N/A`                               | N/A    | 本片只登记 planned routes，不写 DTO。 |
| Migration / schema check         | No       | `N/A`                               | N/A    | 不改 schema。                         |
| Markdown format                  | Yes      | `corepack pnpm run format:md:check` | Pass   | 已执行并通过。                        |
| Diff sanity                      | Yes      | `git diff --check`                  | Pass   | 已执行并通过。                        |

## 11. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 当前无例外。 |

## 12. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-10
- Conditions:
  - 后续 runtime slice 不得绕过 B18 route inventory。
  - 外部部门 ID、租户 ID、source record ID 必须按 string 处理，不得误用 UUID。
  - Feishu runtime adapter 实现前必须重新核对官方通讯录 API 当前文档。
  - 不允许在企业协同接入配置页直接应用组织事实变更；应用动作必须在组织架构 / 外部同步工作流中完成。
