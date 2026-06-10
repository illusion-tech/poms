# EX-72B 外部组织同步持久化基线

- Gate Status: `G4 Pass`
- Parent: `EX-72`
- Owner: `Codex`
- Slice Type: `persistence`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-10
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-72B`

## 1. 范围

- 本次目标:
  - 基于 `EX-72A` 新增外部组织同步的最小持久化层。
  - 新增 `ExternalOrgSource`、`ExternalDepartmentMapping`、`OrgSyncRun`、`OrgSyncDiffItem` entity 与 migration。
  - 新增 `platform:org-sync:manage` permission key，并授予 `platform-admin`。
  - 补齐 `@poms/shared-contracts` 对 `zod` 的 package dependency，使 touched project lint 可通过。
  - 注册最小 Nest feature module，使实体可被 runtime ORM 发现。
- 本次明确不做:
  - 不实现 controller、service、repository、DTO、OpenAPI、generated client 或 Admin UI。
  - 不调用 Feishu / DingTalk / WeCom 通讯录 API。
  - 不生成同步 preview、diff 或 apply 行为。
  - 不修改 `OrgUnit` 写命令，不自动创建 / 停用 / 移动 POMS 组织单元。
  - 不重构 OBS / attachment storage provider。

## 2. 正式输入

| Input Type       | Document / Source                                              | Section / Anchor         | Status | Notes                                                          |
| ---------------- | -------------------------------------------------------------- | ------------------------ | ------ | -------------------------------------------------------------- |
| G1 parent input  | `ex-72a-external-org-sync-governance-baseline.md`              | 4 / 5 / 6 / 7            | Pass   | 冻结业务边界、状态机、表名、权限和 B18 routes。                |
| Route inventory  | `api-route-canonical-inventory.md`                             | 6.23 EX-72               | Pass   | 本片只消费 route inventory，不新增 controller。                |
| Org unit model   | `platform-governance/org-unit-design.md`、`org-unit.entity.ts` | OrgUnit / current entity | Pass   | `OrgUnit` 是 POMS 组织事实源，外部源只能产生候选。             |
| Provider pattern | `identity-provider-config.entity.ts`                           | provider config pattern  | Reuse  | 复用 provider enum/check/tenant 约束思路，不复用身份绑定语义。 |
| Storage pattern  | `attachment-storage-provider-config.entity.ts`                 | provider persistence     | Reuse  | 复用 provider 配置的 status、rowVersion、审计字段模式。        |

## 3. 本次 SSOT

| Concern               | SSOT                           | Implementation Rule                                                              |
| --------------------- | ------------------------------ | -------------------------------------------------------------------------------- |
| Table / column naming | `EX-72A` + 本文件              | 表名和关键列必须与 `external_org_source` 等冻结名一致。                          |
| Provider enum         | `ExternalOrgProvider`          | 组织源 provider 独立于 `IdentityProvider` 命名，值先覆盖 Feishu/DingTalk/WeCom。 |
| Status enum           | `EX-72A` + shared-contracts    | entity checks 和 migration checks 必须使用同一枚举值。                           |
| External IDs          | string                         | external tenant / department / parent department ID 不得建模为 UUID。            |
| Internal IDs          | UUID                           | source、run、OrgUnit、operator 均使用 POMS UUID。                                |
| Date / time           | UTC timestamptz / ISO datetime | migration 使用 `timestamptz`，entity 使用 `p.datetime()`。                       |
| Permissions           | `platform:org-sync:manage`     | 作为组织同步管理权限，迁移授予 `platform-admin`。                                |

## 4. 持久化交付边界

| Table                         | Purpose                    | Required Constraints                                                                                                     |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `external_org_source`         | 外部组织同步源             | provider/status check；`provider + externalTenantId` 唯一；active authoritative subtree 唯一；可选关联 provider config。 |
| `external_department_mapping` | 外部部门到 POMS 组织的映射 | `sourceId + externalDepartmentId` 唯一；mapped `sourceId + orgUnitId` 唯一；外部 ID string；保存 snapshot。              |
| `org_sync_run`                | 同步预览 / 应用运行记录    | `sourceId` FK；run 状态 check；保存 actor、时间、统计、错误摘要和请求 / 结果 snapshot。                                  |
| `org_sync_diff_item`          | 单条候选变更               | `runId` FK；action/status check；保存 before / candidate snapshot；可定位 externalDepartmentId + action。                |

## 5. 实现顺序

1. 扩展 shared contracts 中的权限和外部组织同步枚举 SSOT。
2. 新增四个 entity，按 EX-72A 冻结字段实现 UUID、string、datetime、JSON 与 rowVersion。
3. 新增 `ExternalOrgSyncModule` 并加入 `AppModule`，只注册 entity，不暴露 controller。
4. 新增 migration，先建 source，再 mapping/run，最后 diff item；补 FK、check、unique / partial index。
5. migration 将 `platform:org-sync:manage` 授予 `platform-admin`，bootstrap seed 通过 `PERMISSION_KEYS` 自动包含新权限。

## 6. 不变量

- `external_department_id`、`external_parent_department_id`、`external_tenant_id` 一律为 string。
- `OrgUnit` 不新增字段，不直接持久化外部 source ID。
- `org_sync_run` 与 `org_sync_diff_item` 是审计 / preview 边界，不能替代 `AuditLog`。
- `identity_provider_config_id` 只表示复用连接配置，不表示组织同步属于身份绑定域。
- `status = active` 的 source 才能在后续切片创建 sync run。

## 7. 测试与校验

| Check                      | Required | Command / Evidence                                  | Result | Gap / Reason                                  |
| -------------------------- | -------- | --------------------------------------------------- | ------ | --------------------------------------------- |
| API lint                   | Yes      | `corepack pnpm nx lint poms-api`                    | Pass   | 已执行并通过。                                |
| Shared contracts lint      | Yes      | `corepack pnpm nx run shared-contracts:eslint:lint` | Pass   | 已执行并通过；同步补齐 `zod` 依赖声明。       |
| API build                  | Yes      | `corepack pnpm nx build poms-api`                   | Pass   | 已执行并通过，包含 shared-contracts build。   |
| Migration up               | Yes      | `corepack pnpm nx run poms-api:migration-up`        | Pass   | 已使用本地 `edb_v2` 执行并迁移到最新版本。    |
| Migration check            | Yes      | `corepack pnpm nx run poms-api:migration-check`     | Pass   | 已使用本地 `edb_v2` 执行，schema up-to-date。 |
| Focused tests              | No       | `N/A`                                               | N/A    | 本片无 service/controller 行为。              |
| OpenAPI / generated client | No       | `N/A`                                               | N/A    | 不新增 DTO 或 public route 实现。             |
| Markdown format            | Yes      | `corepack pnpm run format:md:check`                 | Pass   | 已执行并通过。                                |
| Diff sanity                | Yes      | `git diff --check`                                  | Pass   | 已执行并通过。                                |

## 8. 例外与风险

| Exception ID           | Level | Scope                      | Status | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                                                                         |
| ---------------------- | ----- | -------------------------- | ------ | ----------- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| EX72B-E1-LOCAL-DB-AUTH | E2    | migration-check validation | Closed | Codex       | Codex         | 2026-06-10  | 已由本地 `edb_v2` 凭据解除；`migration-up` 和 `migration-check` 均通过。历史阻塞原因为默认 `postgres/postgres` 返回 `28P01`。 |

## 9. G3 / G4 结论

- Gate Status: `G4 Pass`
- Completed At: 2026-06-10
- Validation Evidence:
  - `corepack pnpm nx run poms-api:migration-up --skip-nx-cache` 已使用本地 `edb_v2` 执行并迁移到最新版本。
  - `corepack pnpm nx run poms-api:migration-check --skip-nx-cache` 返回 schema up-to-date。
  - `corepack pnpm nx lint poms-api`、`corepack pnpm nx run shared-contracts:eslint:lint`、`corepack pnpm nx build poms-api`、`corepack pnpm run format:md:check` 与 `git diff --check` 已作为本片 G3 证据通过。
- Drift Classification:
  - `migration-up` 和 `migration-check` 未发现 schema drift。
  - 关闭 `EX72B-E1-LOCAL-DB-AUTH`；该例外仅保留为已解除的本地验证环境阻塞留痕。
- Delivered Boundary:
  - EX-72B 只交付外部组织同步 source / mapping / run / diff item 持久化基础、`platform:org-sync:manage` 权限和最小 module 注册。
  - Controller、service、adapter、OpenAPI、generated client 与 Admin UI 仍由后续 `EX-72C/D` 和 `FE-67` 承接。
