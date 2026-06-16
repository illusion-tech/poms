# EX-73D 企业协同接入组织同步可用性诊断基线

- Gate Status: `G3 Ready for Review`
- Parent: `EX-73`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-16
- G3 Reviewer: `Codex`
- G3 Date: 2026-06-16
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-73D`
- GitHub Issue: `#11`

## 1. 范围

- 本次目标:
  - 在企业协同接入层提供结构化的“组织同步可用性诊断”，让管理员能直接判断飞书配置是否可用于外部组织同步。
  - 复用既有 `POST /platform/identity-providers/{id}:testConnection` route，通过 request capability 区分基础连接检查和外部组织同步检查。
  - 外部组织同步检查必须覆盖本地配置、secret、总开关、派生状态、tenant token、根部门可访问性和部门读取权限。
  - Admin 企业协同接入页展示组织同步诊断结果；外部组织同步工作台选择接入配置时复用同一诊断能力和修复入口。
- 本次明确不做:
  - 不新增 public route，不修改 B13 route grammar。
  - 不新增 migration，不保存 token，不写入 `OrgUnit`、同步源、映射或运行记录。
  - 不实现 DingTalk / WeCom 诊断。
  - 不实现完整配置向导、运行历史和部门映射冲突处理；这些由 `#9`、`#12`、`#10` 承接。
- 下游可依赖的交付边界:
  - `testConnection` 可作为组织同步配置向导的 readiness SSOT。
  - 诊断结果包含稳定 check key、状态、message 和 next actions，可被 Admin 两处页面消费。
- 不允许下游依赖的留白:
  - 不保证持续健康监控；本片只提供管理员触发的即时诊断。
  - 不把诊断成功等同于同步一定无差异或 apply 一定成功。

## 2. 正式输入

| Input Type                | Document / Source                       | Section / Anchor                       | Status | Notes                                           |
| ------------------------- | --------------------------------------- | -------------------------------------- | ------ | ----------------------------------------------- |
| Business design           | GitHub issue `#11`                      | Scope / acceptance criteria            | Pass   | 明确诊断项、Admin 展示和外部组织同步页复用。    |
| Command design            | `identity-provider.service.ts`          | `testIdentityProviderConnection`       | Pass   | 复用现有 command，不新增 route。                |
| DTO / OpenAPI design      | `shared-contracts.ts`                   | `IdentityProviderConnectionTestResult` | Pass   | 扩展 response 为结构化诊断结果。                |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`      | B13 `testIdentityProviderConnection`   | Pass   | 当前 route 已 aligned；本片不变更 public path。 |
| Query boundary            | `identity-provider-list.ts` / workbench | Admin provider selection               | Pass   | Admin 消费诊断结果，不复制后端 readiness 判断。 |
| Data model / table freeze | `N/A`                                   | `N/A`                                  | N/A    | 不改持久化模型。                                |
| Schema / DDL              | `N/A`                                   | `N/A`                                  | N/A    | 不新增 migration。                              |
| ADR                       | `ADR-015`                               | command route grammar                  | Pass   | 继续使用 `{id}:testConnection` command route。  |

## 3. 本次 SSOT

| Concern                     | SSOT                                 | Implementation Rule                                                            |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Business semantics          | `#11` + 本基线                       | 企业协同接入诊断连接能力；外部组织同步仍负责同步源、预览和应用。               |
| Public route canonical path | B13 route inventory                  | 不新增 route；复用 `POST /platform/identity-providers/{id}:testConnection`。   |
| Route / command naming      | `testIdentityProviderConnection`     | request 通过 `capability` 区分 `basic` 与 `external-org-sync`。                |
| DTO / contract naming       | `@poms/shared-contracts`             | check key / status / capability 由 shared contract 定义并生成 OpenAPI/client。 |
| Table / column naming       | `N/A`                                | 不改表结构。                                                                   |
| Date / time semantics       | `checkedAt`                          | 使用 ISO datetime 字符串记录本次诊断时间。                                     |
| Identifier semantics        | `IdentityProviderConfig.id` / Feishu | route id 是 POMS UUID；`externalRootDepartmentId` 是外部部门 ID 字符串。       |
| Money / decimal semantics   | `N/A`                                | 不涉及金额。                                                                   |
| Status machine              | Diagnostic check status contract     | `passed / failed / warning / skipped` 仅表示本次检查结果，不持久化。           |

## 4. 命令与接口边界

| Route / Controller                                      | Command / Service                  | Request DTO / Contract                         | Response DTO / Contract                | Guard / Permission                   | Design Source | Result  |
| ------------------------------------------------------- | ---------------------------------- | ---------------------------------------------- | -------------------------------------- | ------------------------------------ | ------------- | ------- |
| `POST /platform/identity-providers/{id}:testConnection` | `testIdentityProviderConnection()` | `TestIdentityProviderConnectionRequest`        | `IdentityProviderConnectionTestResult` | `platform:identity-providers:manage` | B13 / `#11`   | aligned |
| same route                                              | same command                       | `capability='external-org-sync'` optional root | structured checks and next actions     | same                                 | `#11`         | aligned |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `POST /platform/identity-providers/{id}:testConnection`
- Current implemented route(s): `POST /platform/identity-providers/{id}:testConnection`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + B13
- Blocker / exception: none; this slice changes DTO semantics, not route path.

## 5. 读侧边界

| Query / View                 | Consumer           | Fields                                           | Filter / Sort | Permission Boundary                  | Design Source | Result    |
| ---------------------------- | ------------------ | ------------------------------------------------ | ------------- | ------------------------------------ | ------------- | --------- |
| Identity provider card       | 企业协同接入页     | `status/message/checks/nextActions/checkedAt`    | N/A           | `platform:identity-providers:manage` | `#11`         | delivered |
| Provider config option state | 外部组织同步工作台 | latest org-sync diagnostic result and issue text | N/A           | page route permissions               | `#11`         | delivered |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result     |
| ----- | --------- | ------------------- | ------------------- | ---------------- |
| N/A   | N/A       | N/A                 | N/A                 | no schema change |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result                |
| ----- | --------------------- | --------------- | ------ | ------------------------- | --------------------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | no persistence change |

## 7. 一致性结论

- Document -> code: 本基线冻结 `#11` 范围，后续实现必须按 check contract 交付。
- ADR-015 inventory -> route: B13 route 已 aligned，不新增路由。
- Migration -> entity: N/A，不改 schema。
- Entity -> contract: N/A，不新增持久化字段。
- Route -> command: controller 继续调用 `IdentityProviderService.testIdentityProviderConnection()`。
- Query -> view: Admin 两处消费同一诊断结果，不在前端重复实现 readiness 判断。
- Guard / permission: 沿用 `platform:identity-providers:manage`；外部组织同步页只调用平台接入诊断，不提升权限。
- OpenAPI / generated client: 需要同步生成并检查，因为 shared contract response 扩展。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                           | Result | Gap / Reason                                                            |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------- |
| API focused tests                | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=identity-provider.service` / `identity-provider.controller` / `feishu-external-org-directory` | Pass   | 覆盖 basic、external-org-sync 诊断、controller 契约和 Feishu 只读探测。 |
| Admin focused tests              | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-card` / `identity-provider-list`                                          | Pass   | 覆盖诊断展示、基础测试和组织同步测试 CTA。                              |
| External org workbench tests     | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=external-org-sync-workbench`                                                                | Pass   | 覆盖选择接入配置时的诊断触发和启用前阻断。                              |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api` / `corepack pnpm nx lint poms-admin` / `corepack pnpm nx lint admin-data-access`                                            | Pass   | `shared-contracts` 无 lint target，契约经 API/Admin build 覆盖。        |
| Build                            | Yes      | `corepack pnpm nx build poms-api` / `corepack pnpm nx build poms-admin`                                                                                      | Pass   | API + Admin compile。                                                   |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` / `corepack pnpm nx run shared-api-client:generate` / `shared-api-client:check`                                      | Pass   | DTO contract changes 已同步 OpenAPI 与 generated client。               |
| Migration / schema check         | No       | `N/A`                                                                                                                                                        | N/A    | 不改 persistence。                                                      |
| Markdown / diff sanity           | Yes      | `pnpm run format:md:check` / `git diff --check`                                                                                                              | Pass   | 文档格式和 whitespace 检查通过。                                        |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes      |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 暂无例外。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-16
- Conditions:
  - 诊断错误不得泄露 client secret、tenant token、user access token 或 OAuth code。
  - `external-org-sync` 诊断只做最小只读探测，不写入同步运行记录。
  - 如果 Feishu 网络探测失败，必须回传 provider code/message 的安全摘要和可行动提示。

## 11. G3 结论

- Gate Status: `Ready for Review`
- Reviewed By: `Codex`
- Reviewed At: 2026-06-16
- Drift Classification: `design-aligned`
- Delivered:
  - B13 `testConnection` 已支持 `basic` 与 `external-org-sync` capability，返回结构化 checks、nextActions 和 capability。
  - Feishu adapter 复用 tenant token，并以根部门 children 读取作为组织同步只读可用性探测；诊断不写同步运行记录。
  - 企业协同接入卡片展示诊断明细与修复提示，外部组织同步工作台在选择接入配置和启用前复用同一诊断能力。
  - Shared contracts、OpenAPI、generated client 和 Admin data-access export 已同步。
- Deferred:
  - DingTalk / WeCom 诊断、配置向导、运行历史、映射冲突工作台和持续健康监控继续由后续切片承接。
