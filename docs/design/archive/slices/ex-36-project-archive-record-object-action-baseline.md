# EX-36 项目归档记录对象动作授权与前端显隐治理实施基线包

- Gate Status: `G1 = Pass`
- Parent: `FE-31`
- Owner: `Codex`
- Slice Type: `api / contract / frontend`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-36`

## 1. 范围

- 本次目标:
  1. 为项目归档记录 replace / void 建立 dedicated object-action key。
  2. 在 `GET /projects/{projectId}/archive-records` 返回的 `ProjectArchiveRecordSummary` 中增加 per-record `allowedActions`。
  3. 前端项目详情页归档记录按钮只消费记录自身 `allowedActions`，不再用项目详情页泛化 `edit-project-basic-info` 推导归档动作显隐。
- 本次明确不做:
  1. 不新增 public route，不修改现有 `POST /project-archive-records/{id}:replace|void` route。
  2. 不修改 `project_archive_record` DDL、状态机、替代链或撤销语义。
  3. 不新增首次创建归档入口；该方向由 `FE-32` 承接。
  4. 不引入新的 permission key；后端 guard 仍使用 `project:write`。
- 下游可依赖的交付边界:
  - 归档记录列表中的 current `recorded` 记录，在满足项目终态和 `project:write` 时返回 `replace-project-archive-record` / `void-project-archive-record`。
  - 非 current 记录、非终态项目或无写权限账号返回空 `allowedActions`。
- 不允许下游依赖的留白:
  - 不代表首次创建归档能力已产品化。
  - 不代表后端 command guard 从 `project:write` 拆成独立 permission。

## 2. 正式输入

| Input Type                | Document / Source                                                                                  | Section / Anchor                                                                         | Status   | Notes                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| Business design           | `docs/design/archive/slices/fe-31-project-archive-reversal-replacement-frontend-g3-g4-closeout.md` | `FE31-E1-DETAIL-ACTION-PROXY`                                                            | G4       | 当前前端用详情页泛化写动作 gate，是本片要关闭的精确例外。 |
| Command design            | `docs/design/archive/slices/ex-34a-project-archive-reversal-replacement-runtime-baseline.md`       | replace / void command                                                                   | G4       | replace / void route 与 command 已落地。                  |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`                                                | `ProjectArchiveRecordSummarySchema`                                                      | Current  | 本片只追加 `allowedActions: string[]`。                   |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                     | `listProjectArchiveRecords` / `replaceProjectArchiveRecord` / `voidProjectArchiveRecord` | aligned  | 现有 routes 已 aligned；本片不新增 route。                |
| Query boundary            | `apps/poms-api/src/app/features/project/project-query.service.ts`                                  | `listProjectArchiveRecords` / `mapProjectArchiveRecord`                                  | Current  | 需要把 `UserPayload` permissions 带入 action projection。 |
| Data model / table freeze | `docs/design/archive/slices/ex-34a-project-archive-reversal-replacement-runtime-baseline.md`       | project archive record persistence                                                       | G4       | 不改 DDL。                                                |
| Schema / DDL              | `apps/poms-api/src/migrations/*project_archive_record*`                                            | N/A                                                                                      | Current  | 不改 migration。                                          |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                                      | resource-first + colon action                                                            | Accepted | route surface 不变。                                      |

## 3. 本次 SSOT

| Concern                     | SSOT                                          | Implementation Rule                                                                   |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Business semantics          | `EX-34A` runtime baseline + `FE-31` close-out | replace / void 只针对 current `recorded` 归档记录。                                   |
| Public route canonical path | `api-route-canonical-inventory.md`            | 不新增 route；沿用现有 aligned routes。                                               |
| Route / command naming      | `EX-34A` baseline                             | command 仍为 `replaceProjectArchiveRecord` / `voidProjectArchiveRecord`。             |
| DTO / contract naming       | 本基线                                        | action keys 固定为 `replace-project-archive-record` / `void-project-archive-record`。 |
| Table / column naming       | `EX-34A` migration                            | 不变。                                                                                |
| Date / time semantics       | `EX-34A` baseline                             | 不变。                                                                                |
| Identifier semantics        | `ProjectArchiveRecord.id`                     | item action anchor 是 archive record id，不是 project id。                            |
| Money / decimal semantics   | N/A                                           | 本片无金额字段。                                                                      |
| Status machine              | `PROJECT_ARCHIVE_RECORD_STATUSES`             | 只有 `recorded` 记录可返回 replace / void actions。                                   |

## 4. 命令与接口边界

| Route / Controller                           | Command / Service             | Request DTO / Contract               | Response DTO / Contract                      | Guard / Permission | Design Source | Result                     |
| -------------------------------------------- | ----------------------------- | ------------------------------------ | -------------------------------------------- | ------------------ | ------------- | -------------------------- |
| `GET /projects/{projectId}/archive-records`  | `listProjectArchiveRecords`   | path `projectId`                     | `ProjectArchiveRecordSummary.allowedActions` | `project:read`     | `EX-36`       | Update response projection |
| `POST /project-archive-records/{id}:replace` | `replaceProjectArchiveRecord` | `ReplaceProjectArchiveRecordRequest` | `ProjectArchiveRecordSummary`                | `project:write`    | `EX-34A`      | No route change            |
| `POST /project-archive-records/{id}:void`    | `voidProjectArchiveRecord`    | `VoidProjectArchiveRecordRequest`    | `ProjectArchiveRecordSummary`                | `project:write`    | `EX-34A`      | No route change            |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  - `GET /projects/{projectId}/archive-records`
  - `POST /project-archive-records/{id}:replace`
  - `POST /project-archive-records/{id}:void`
- Current implemented route(s): same as canonical
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-25` + `EX-34A`
- Blocker / exception: none; response model extension still requires OpenAPI / generated client sync.

## 5. 读侧边界

| Query / View                                | Consumer                  | Fields                     | Filter / Sort            | Permission Boundary                         | Design Source | Result                 |
| ------------------------------------------- | ------------------------- | -------------------------- | ------------------------ | ------------------------------------------- | ------------- | ---------------------- |
| `GET /projects/{projectId}/archive-records` | project detail archive UI | `allowedActions: string[]` | existing record ordering | `project:read` plus projected write actions | `EX-36`       | Add per-record actions |

## 6. 持久化边界

| Table                         | Migration | Entity / Repository | DDL / Freeze Source | Check Result  |
| ----------------------------- | --------- | ------------------- | ------------------- | ------------- |
| `poms.project_archive_record` | N/A       | N/A                 | `EX-34A`            | No DDL change |

| Field            | Design Type / Meaning        | Migration / DDL | Entity | Shared Contract / OpenAPI | Result          |
| ---------------- | ---------------------------- | --------------- | ------ | ------------------------- | --------------- |
| `allowedActions` | derived UI action projection | N/A             | N/A    | `string[]`                | Add to DTO only |

## 7. 一致性结论

- Document -> code: 进入 G2 后按本基线落地。
- ADR-015 inventory -> route: routes 不变，inventory 已 aligned。
- Migration -> entity: N/A，不改 DDL。
- Entity -> contract: `allowedActions` 是 derived projection，不落实体。
- Route -> command: replace / void command 不变。
- Query -> view: `listProjectArchiveRecords` 返回 per-record action list。
- Guard / permission: command guard 仍由 `project:write` 保护；读侧 action projection 只作为 UI 可见性，不替代 guard。
- OpenAPI / generated client: 必须重新生成并通过 `shared-api-client:check`。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                      | Result  | Gap / Reason  |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------- | ------- | ------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`                    | Pending |               |
| Build                            | Yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                  | Pending |               |
| Unit tests                       | Yes      | focused project API/query + project detail tests                                        | Pending |               |
| API / integration tests          | Yes      | focused project archive workflow E2E or existing project controller/service tests       | Pending |               |
| E2E                              | Yes      | targeted admin journey for archive audit actions                                        | Pending |               |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:check` | Pending |               |
| Migration / schema check         | No       | N/A                                                                                     | N/A     | No DDL change |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                  |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------------------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 本片目标是关闭 `FE31-E1`，不新增例外。 |

## 10. G1 结论

- Gate Status: `G1 = Pass`
- Approved By: `Codex`
- Approved At: `2026-04-26`
- Conditions:
  1. G2 只能扩展 archive record summary 的 derived action projection，不得改 route grammar 或 DDL。
  2. 前端按钮显隐必须消费 `record.allowedActions`，不得继续从项目详情 `edit-project-basic-info` 或全局 `project:write` 推断 replace / void。
  3. OpenAPI 与 generated client 必须同步。
