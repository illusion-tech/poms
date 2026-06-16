# EX-72C 外部组织同步 API 契约与管理命令基线

- Gate Status: `G4 Pass`
- Parent: `EX-72`
- Owner: `Codex`
- Slice Type: `api / command`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-10
- G4 Reviewer: `Codex`
- G4 Date: 2026-06-10
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-72C`

## 1. 范围

- 本次目标:
  - 消费 `EX-72A` 的 B18 planned route inventory 和 `EX-72B` 的持久化模型。
  - 新增外部组织同步 shared contracts、API DTO、controller、repository、service 与 backend focused tests。
  - 实现外部组织源 list / create / detail / update。
  - 实现同一 source 下部门映射 list / replace。
  - 实现同步 run 创建、run detail、diff item list 和 apply route 的受控 API 壳层。
  - 同步 OpenAPI / generated client，并将 B18 route inventory 从 planned 推进到 aligned。
- 本次明确不做:
  - 不调用 Feishu / DingTalk / WeCom 通讯录 API。
  - 不生成真实 preview diff，不执行外部部门快照拉取。
  - 不把 diff item 自动应用到 `OrgUnit`；`apply` 在本片只做状态 / 版本校验与 adapter-slice 阻断。
  - 不新增 Admin UI；`FE-67` 继续承接工作台页面。
  - 不新增 migration；本片只消费 `EX-72B` 已提交 schema。

## 2. 正式输入

| Input Type        | Document / Source                                  | Section / Anchor      | Status | Notes                                                |
| ----------------- | -------------------------------------------------- | --------------------- | ------ | ---------------------------------------------------- |
| Governance input  | `ex-72a-external-org-sync-governance-baseline.md`  | 7 / 8 / 12            | Pass   | 冻结 B18 route、权限、状态机和后续切片拆分。         |
| Persistence input | `ex-72b-external-org-sync-persistence-baseline.md` | 4 / 7 / 9             | Pass   | 已交付四张表、entity、module 和 permission key。     |
| Route inventory   | `api-route-canonical-inventory.md`                 | B18 external org sync | Pass   | 本片必须实现全部 B18 canonical route。               |
| Org unit runtime  | `platform.service.ts` / `org-unit.entity.ts`       | OrgUnit commands      | Reuse  | 本片只读 `OrgUnit` 引用并校验存在，不调用写命令。    |
| Provider runtime  | `identity-provider-config.entity.ts`               | provider config       | Reuse  | 仅保存可选 provider config id，不调用 provider API。 |

## 3. 本次 SSOT

| Concern              | SSOT                                   | Implementation Rule                                                                 |
| -------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Route surface        | `api-route-canonical-inventory.md` B18 | controller path、OpenAPI operation 和 generated client 必须与 B18 对齐。            |
| Permission guard     | `EX-72A`                               | 所有 B18 管理 route 使用 `platform:org-units:manage` + `platform:org-sync:manage`。 |
| DTO naming           | `EX-72A`                               | 使用 `ExternalOrgSource*`、`ExternalDepartmentMapping*`、`OrgSyncRun*`。            |
| External identifiers | shared contracts                       | external tenant / department / parent department id 均为 string。                   |
| Apply behavior       | 本基线                                 | `applyOrgSyncRun` route 存在，但真实应用到 `OrgUnit` 由 `EX-72D` 完成。             |
| OpenAPI / API client | generated artifacts                    | 本片必须执行 openapi generation 与 shared-api-client check。                        |

## 4. API 交付边界

| Route                                                               | Result in EX-72C                                                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET /platform/external-org-sources`                                | 返回外部组织源列表，支持 provider / status 筛选。                                                          |
| `POST /platform/external-org-sources`                               | 创建 source，校验 provider + tenant 唯一、provider config / authoritative org unit 存在。                  |
| `GET /platform/external-org-sources/{id}`                           | 返回 source detail。                                                                                       |
| `PATCH /platform/external-org-sources/{id}`                         | 更新展示名、状态、provider config、authoritative org unit、外部根部门、sync scopes，并做 rowVersion 校验。 |
| `GET /platform/external-org-sources/{sourceId}/department-mappings` | 返回 source 下部门映射，支持 status / externalDepartmentId / orgUnitId 筛选。                              |
| `PUT /platform/external-org-sources/{sourceId}/department-mappings` | 以请求 items 全量替换当前 source 映射集合，校验引用的 `OrgUnit` 存在。                                     |
| `POST /platform/external-org-sources/{sourceId}/org-sync-runs`      | 创建一次 preview run 壳层，状态为 `previewed`，不拉取外部 API，不生成 diff。                               |
| `GET /platform/org-sync-runs/{id}`                                  | 返回 run detail。                                                                                          |
| `GET /platform/org-sync-runs/{id}/diff-items`                       | 返回 run 下 diff item 列表，支持 action / status 筛选。                                                    |
| `POST /platform/org-sync-runs/{id}:apply`                           | 校验 run 存在、状态和版本后返回 `409 Conflict`，说明真实 apply 由 `EX-72D` 承接。                          |

## 5. 不变量

- `ExternalOrgSource.provider + externalTenantId` 不允许重复。
- `ExternalOrgSource.status = active` 时必须有 `providerConfigId` 或 `externalRootDepartmentId` 之一，避免无来源的 active sync。
- `replaceExternalDepartmentMappings` 不绕过 preview / apply；它只维护人工 mapping 关系。
- `OrgUnit` 仍是 POMS 正式组织事实源；本片不会自动创建、移动、停用 `OrgUnit`。
- `applyOrgSyncRun` 的 route / contract 先稳定，但真实 apply 行为必须等待 `EX-72D`。

## 6. 测试与校验

| Check                       | Required | Command / Evidence                                                                | Result | Gap / Reason                                   |
| --------------------------- | -------- | --------------------------------------------------------------------------------- | ------ | ---------------------------------------------- |
| API focused tests           | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=external-org-sync` | Pass   | 2 suites / 8 tests passed。                    |
| API lint                    | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                  | Pass   | 无新增 lint failure。                          |
| Shared contracts lint       | Yes      | `corepack pnpm nx run shared-contracts:eslint:lint --skip-nx-cache`               | Pass   | 本片新增 shared schemas 已通过 eslint target。 |
| API contracts lint          | Yes      | `corepack pnpm nx run api-contracts:eslint:lint --skip-nx-cache`                  | Pass   | DTO export / decorator metadata 已验证。       |
| API build                   | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                 | Pass   | controller / DTO / repository compile passed。 |
| OpenAPI generation          | Yes      | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`                           | Pass   | B18 route surface 已写入 OpenAPI。             |
| Generated client generation | Yes      | `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`                 | Pass   | generated client 已同步。                      |
| Generated client build      | Yes      | `corepack pnpm nx build shared-api-client --skip-nx-cache`                        | Pass   | 新增 ExternalOrgSyncService 已通过 build。     |
| Generated client check      | Yes      | `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                    | Pass   | API client 与 OpenAPI 一致。                   |
| Admin build                 | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                               | Pass   | 验证 generated client metadata 未破坏 Admin。  |
| Migration check             | Yes      | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                   | Pass   | 使用本地 `edb_v2`，schema up-to-date。         |
| Markdown format             | Yes      | `corepack pnpm run format:md:check`                                               | Pass   | 本片新增 Markdown 已格式化。                   |
| Diff sanity                 | Yes      | `git diff --check`                                                                | Pass   | 无 whitespace error。                          |

## 7. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-10
- Conditions:
  - 本片可以实现 B18 route surface，但不得把真实 Feishu adapter 和 apply-to-OrgUnit 行为混入。
  - `applyOrgSyncRun` 必须以明确错误阻断真实应用，避免前端误认为同步已落地。
  - OpenAPI / generated client 是本片完成条件，不允许只提交后端 controller。

## 8. G3 Drift Classification

| Drift                          | Classification      | Resolution                                                                                                                                   |
| ------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI command 无法解析别名   | `new-real-drift`    | `poms-api:openapi` 运行时 `tsconfig-paths` 将 baseUrl 解析到 app 目录，已在 `tsconfig.base.json` 明确设置 `baseUrl: "."`。                   |
| generated client metadata 丢失 | `new-real-drift`    | generator / check 脚本执行 mirror 时未保留 `tsconfig.json` / `tsconfig.lib.json`，已在两个脚本中将 Nx metadata 文件纳入保留清单并重新验证。  |
| apply route 只返回 409         | `accepted-boundary` | 这是 G1 冻结边界，不是实现漂移；本片只稳定 route / contract / audit shell，真实 adapter-backed diff application 继续由 `EX-72D` 冻结后实现。 |

## 9. G4 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-10
- Delivered Boundary:
  - 已交付 B18 外部组织同步全部 API route surface、shared contracts、API DTO、controller、repository、service、OpenAPI 和 generated client。
  - 已交付 source 管理、部门映射替换、preview run 壳层、run detail、diff item query 和 apply route 阻断语义。
  - `api-route-canonical-inventory.md` 已将 B18 route 从 planned 推进到 aligned。
- Deferred Boundary:
  - Feishu / DingTalk / WeCom adapter、真实通讯录拉取、preview diff 生成、diff 应用到 `OrgUnit` 和 Admin UI 继续由 `EX-72D` / `FE-67` 承接。
