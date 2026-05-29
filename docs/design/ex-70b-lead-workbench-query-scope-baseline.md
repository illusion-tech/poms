# EX-70B 线索工作台查询 Scope Direct Cutover 实施基线包

- Gate Status: `G4 Done`
- Parent: `EX-31` / `EX-32` / `EX-47` / `EX-70A`
- Owner: Codex
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: User-approved second-phase product plan
- G1 Date: 2026-05-30
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-70B`

## 1. 范围

- 本次目标: 将线索管理从前端全量列表过滤升级为后端驱动的线索工作台查询模型，`GET /leads` 返回当前 scope 的线索、各工作台 scope 计数和已转项目摘要；默认进入 `/leads` 时只展示仍需推进的 `active` 线索。
- 本次明确不做: 不新增 route；不新增权限；不改变 Lead 状态机；不改变确认有效、关闭、转项目命令；不改变评分公式或硬闸口业务规则；不做兼容数组响应；不保留前端全量拉取后过滤作为正式路径。
- 下游可依赖的交付边界: `GET /leads` 是线索工作台唯一列表查询，默认 `scope=active`；已转项目线索在 `scope=converted` 或 `scope=all` 中可查，并返回 `LeadConvertedProjectSummary` 供前端展示和跳转。
- 不允许下游依赖的留白: 不允许 Admin 组件自行重新判断 `ready-to-convert` / `blocked-conversion` 归类；不允许 repository 或 mapper 承担工作台业务语义；不允许 `GET /leads` 同时返回旧数组和新对象两种响应。

## 2. 正式输入

| Input Type                | Document / Source                                   | Section / Anchor           | Status  | Notes                                                      |
| ------------------------- | --------------------------------------------------- | -------------------------- | ------- | ---------------------------------------------------------- |
| Business design           | User-approved product plan                          | 第二期线索工作台查询 scope | frozen  | 默认展示待推进线索，已转项目作为来源链归档                 |
| Command design            | `docs/design/api-route-canonical-inventory.md`      | `lead.listLeads`           | aligned | 不新增 route，只改变既有 list query / response contract    |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts` | Lead workbench schemas     | frozen  | `LeadListResponse` direct cutover 替代 `LeadListView[]`    |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`      | `GET /leads`               | updated | Canonical route 不变，Action 补充 EX-70B 工作台响应语义    |
| Query boundary            | `LeadQueryService.listLeads`                        | workbench scope + summary  | frozen  | 权限 / 归属 / keyword / rating 先收敛，再按 scope 查询     |
| Data model / table freeze | `lead` + `project`                                  | existing columns           | frozen  | 不新增迁移；复用 `lead.converted_*` 与 Project 摘要        |
| Schema / DDL              | N/A                                                 | N/A                        | N/A     | 本片不改 DDL；如 migration-check 出现 drift 按既有漂移分类 |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`       | Existing collection query  | pass    | `GET /leads` 仍为 collection read                          |

## 3. 本次 SSOT

| Concern                     | SSOT                                                  | Implementation Rule                                                          |
| --------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Business semantics          | `LeadWorkbenchScope` + `resolveLeadWorkbenchScopes()` | 工作台 scope 是后端业务查询语义，不是前端视觉 tab                            |
| Public route canonical path | `GET /leads`                                          | 路径和 method 不变；response contract direct cutover 为 `LeadListResponse`   |
| Route / command naming      | `LeadController.list`                                 | 不新增 controller action；`listLeads` capability 保持                        |
| DTO / contract naming       | `LeadListQuery` / `LeadListResponse`                  | `scope` 替代 `status` 作为主列表视图语义；`status` 不再作为前端工作台主筛选  |
| Table / column naming       | Existing `lead` and `project` columns                 | 不新增表或字段；已转项目摘要来自 `convertedProjectId` 关联 Project           |
| Date / time semantics       | Existing ISO datetime fields                          | `convertedAt` 继续使用 ISO datetime；列表新增该字段时与 `LeadSummary` 同语义 |
| Identifier semantics        | Existing UUIDs                                        | Lead / Project id 均为系统 UUID；source 使用 EX-70A 的 `sourceCode`          |
| Money / decimal semantics   | Existing `estimatedAmount` string decimal             | 不改金额字段                                                                 |
| Status machine              | `LeadStatus` + `buildLeadGateSummary()`               | 不新增状态；`ready-to-convert` / `blocked-conversion` 由闸口 summary 派生    |

## 4. 命令与接口边界

| Route / Controller | Command / Service            | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source | Result         |
| ------------------ | ---------------------------- | ---------------------- | ----------------------- | ------------------ | ------------- | -------------- |
| `GET /leads`       | `LeadQueryService.listLeads` | `LeadListQuery`        | `LeadListResponse`      | `lead:read`        | EX-70B        | direct cutover |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /leads`
- Current implemented route(s): `GET /leads`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-30` + `EX-31` + `EX-70B`
- Blocker / exception: none; response breaking change is intentional direct cutover.

## 5. 读侧边界

| Query / View       | Consumer        | Fields                                                     | Filter / Sort                                                          | Permission Boundary | Design Source | Result    |
| ------------------ | --------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------- | ------------- | --------- |
| `LeadListResponse` | Admin lead list | `scope`, `items`, `summary`, `totalItems`                  | `scope`, `ownershipScope`, `rating`, `keyword`; default `scope=active` | `lead:read`         | EX-70B        | replace   |
| `LeadListView`     | Admin table row | existing fields + `convertedAt`, `convertedProjectSummary` | server returned order `updatedAt desc, createdAt desc`                 | `lead:read`         | EX-70B        | extend    |
| `LeadDetailView`   | Admin detail    | existing detail including `convertedProjectSummary`        | by id                                                                  | `lead:read`         | EX-70B        | unchanged |

### 5.1 Workbench Scope Definitions

| Scope                | Label    | Definition                                                       | Default |
| -------------------- | -------- | ---------------------------------------------------------------- | ------- |
| `active`             | 处理中   | `registered` or `qualified`                                      | Yes     |
| `registered`         | 待确认   | `status=registered`                                              | No      |
| `qualified`          | 已有效   | `status=qualified`                                               | No      |
| `ready-to-convert`   | 可转项目 | `status=qualified` and conversion gate is `ready`                | No      |
| `blocked-conversion` | 待补齐   | `status=qualified` and conversion gate is `blocked`              | No      |
| `converted`          | 已转项目 | `status=converted` or `convertedProjectId` exists                | No      |
| `closed`             | 已关闭   | `status=closed`                                                  | No      |
| `all`                | 全部     | all visible leads after permission / ownership / search / rating | No      |

## 6. 持久化边界

| Table     | Migration | Entity / Repository          | DDL / Freeze Source         | Check Result |
| --------- | --------- | ---------------------------- | --------------------------- | ------------ |
| `lead`    | N/A       | `Lead` / `LeadRepository`    | Existing EX-31 / EX-70A DDL | unchanged    |
| `project` | N/A       | `Project` / `LeadRepository` | Existing EX-32 DDL          | unchanged    |

| Field / Object                         | Design Type / Meaning       | Migration / DDL   | Entity   | Shared Contract / OpenAPI              | Result |
| -------------------------------------- | --------------------------- | ----------------- | -------- | -------------------------------------- | ------ |
| `LeadListQuery.scope`                  | workbench business scope    | N/A               | N/A      | `LeadWorkbenchScope`                   | add    |
| `LeadListResponse.summary`             | scope count summary         | N/A               | N/A      | `LeadWorkbenchSummary`                 | add    |
| `LeadListView.convertedAt`             | conversion datetime         | existing          | existing | ISO datetime nullable                  | expose |
| `LeadListView.convertedProjectSummary` | converted project list hint | existing relation | existing | `LeadConvertedProjectSummary` nullable | expose |

## 7. DRY / SOLID 约束

- `DRY-1`: Lead workbench scope classification has one business source: `resolveLeadWorkbenchScopes()`, which reuses `buildLeadGateSummary()`.
- `DRY-2`: Admin must not reimplement `ready-to-convert` / `blocked-conversion` classification.
- `DRY-3`: `LeadWorkbenchScope` labels, order and hints are defined in shared contracts.
- `DRY-4`: Converted project list display reuses `LeadConvertedProjectSummary`.
- `SOLID-1`: `LeadRepository` owns database predicates only; it does not own business scope semantics.
- `SOLID-2`: `lead.mapper.ts` maps entity/context to DTO only; it does not decide workbench membership.
- `SOLID-3`: `LeadList` component displays `LeadListResponse`; it does not compute backend business scope membership.
- `SOLID-4`: Adding a future scope should require changes to scope definitions / resolver and targeted tests, not unrelated row rendering or command logic.

## 8. 一致性结论

- Document -> code: G1 freezes `EX-70B` scope definitions and direct cutover.
- ADR-015 inventory -> route: `GET /leads` remains canonical and aligned; response semantics updated in inventory.
- Migration -> entity: N/A; no DDL change.
- Entity -> contract: existing `convertedAt` and `convertedProjectId` must be exposed consistently in list DTO.
- Route -> command: `LeadController.list` delegates only to `LeadQueryService.listLeads`.
- Query -> view: `LeadQueryService` returns `LeadListResponse`; Admin consumes response directly.
- Guard / permission: unchanged `lead:read`.
- OpenAPI / generated client: expected breaking diff from `Array<LeadListView>` to `LeadListResponse`.

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                | Result | Gap / Reason                                                                               |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`                                                                              | Pass   | No new lint warnings                                                                       |
| Build                            | Yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                                                            | Pass   | No build regression                                                                        |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`; `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list` | Pass   | Admin lead-list now covers 22 tests                                                        |
| API / integration tests          | Yes      | `$env:PORT='3344'; corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPatterns=lead-workflow`                                            | Pass   | First `nx e2e` attempt was blocked by existing local `3333` listener, then rerun on `3344` |
| E2E                              | Yes      | Browser smoke on isolated `3345` API + `4201` Admin: `/leads`, `scope=converted`, `conversion=ready`; screenshots in `tmp/ex-70b-leads-*.png`     | Pass   | Converted rows no longer show conversion gap text                                          |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check`        | Pass   | Expected breaking diff to `LeadListResponse`                                               |
| Migration / schema check         | No       | N/A                                                                                                                                               | N/A    | No persistence change in EX-70B                                                            |
| Markdown                         | Yes      | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`                                                                                | Pass   | Docs touched                                                                               |
| Diff sanity                      | Yes      | `git diff --check`                                                                                                                                | Pass   | No whitespace errors                                                                       |

## 10. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                     |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | --------------------------------------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No compatibility exception; direct cutover is intentional |

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: User direct request
- Approved At: 2026-05-30
- Conditions: Implement as one direct cutover; do not leave array response compatibility, frontend full-list filtering, duplicated scope classification, or extra route surface.

## 12. G3 结论

- Gate Status: `Pass`
- Scope Delivered: `GET /leads` direct cutover to `LeadListResponse`; default `scope=active`; Admin consumes backend `summary` / `facets` and no longer performs formal scope membership filtering locally.
- DRY / SOLID Result: `resolveLeadWorkbenchScopes()` is the single backend scope classifier and reuses `buildLeadGateSummary()`; repository remains database-predicate only; mapper remains DTO projection only; Admin renders response scope data and does not recompute ready / blocked membership.
- Browser Result: isolated smoke on `127.0.0.1:4201` against current API `127.0.0.1:3345` confirmed active, converted, and conversion-guide views. Converted rows show `已转入项目` / `查看项目` and do not show conversion gap text.
- Drift Classification: no `new-real-drift` found. Residual scan for old lead-list client state (`LeadListSchema`, `LeadListDto`, `statusFilter`, `visibleLeads`, `data-lead-distribution-status`, `query.status`) is clean in lead-related app / library paths.
- G4 Status: done in the local changeset; downstream work can rely on `LeadListResponse` workbench query semantics.

## 13. G4 结论

- Gate Status: `Done`
- Done Boundary: `EX-70B` is complete as a direct cutover of `GET /leads` to workbench query semantics.
- Downstream Contract: consumers should use `LeadListResponse.scope`, `items`, `summary`, `facets`, `totalItems`, `page`, and `pageSize`; the old array response is no longer part of the contract.
- Governance Writeback: route inventory, phase2 execution tracker, progress log, shared contracts, OpenAPI, generated client, API tests, Admin tests, and E2E tests are synchronized.
- Residual Work: none for this slice.
