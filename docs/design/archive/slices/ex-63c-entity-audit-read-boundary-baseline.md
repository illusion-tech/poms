# EX-63C 实体级审计读取权限与查询出口实施基线包

- Gate Status: `Pass`
- Parent: `EX-63`
- Owner: `Codex`
- Slice Type: `api / query`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-06`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-63C`

## 1. 范围

- 本次目标:
  - 新增实体级只读审计查询出口, 供详情页后续展示某个业务对象的编辑历史。
  - 复用 `audit_log` 持久化模型和 `AuditLogSummary` 返回结构。
  - 将 `targetType` 限定在销售 / 客户 / 项目合同相关业务对象, 并映射到现有读权限。
  - 保持平台级 `GET /audit-logs` 仍由 `platform:users:manage` 保护。
  - 补 focused tests 覆盖允许读取、权限拒绝和不支持 targetType。
- 本次明确不做:
  - 不新增全局审计中心、导出、图表或跨对象检索。
  - 不做前端编辑历史入口, 由 `FE-57` 承接。
  - 不改变 `audit_log` 表结构、写入时机或字段级 diff 策略。
  - 不新增对象级所有权 / 数据范围过滤, 仍沿用当前 POMS 读权限模型。
- 下游可依赖的交付边界:
  - 具备对应对象读权限的用户可以按 `targetType + targetId` 读取该对象审计历史。
  - 普通销售不能通过本接口传入平台治理 targetType 读取平台级审计。
  - 下游前端无需自行计算 diff, 只展示后端返回的 before / after / metadata。
- 不允许下游依赖的留白:
  - 本接口不保证存在审计记录; 无记录时返回空数组。
  - 本接口不做实体存在性校验或对象归属校验。
  - 本接口不替代线索评分历史、销售跟进版本历史等专门业务历史接口。

## 2. 正式输入

| Input Type                | Document / Source                                | Section / Anchor       | Status | Notes                                               |
| ------------------------- | ------------------------------------------------ | ---------------------- | ------ | --------------------------------------------------- |
| Business design           | `ex-63-field-level-audit-governance-baseline.md` | 6.3, 7                 | Pass   | 详情页需要实体级编辑历史读取边界。                  |
| Command design            | N/A                                              | N/A                    | Pass   | 本片为只读 query。                                  |
| DTO / OpenAPI design      | `EntityAuditLogListQuerySchema`                  | Shared contracts       | Pass   | 查询参数不暴露 `targetType` / `targetId` 覆盖能力。 |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`               | `listEntityAuditLogs`  | Pass   | 已新增 canonical row。                              |
| Query boundary            | `RuntimeAuditService.listEntityAuditLogs`        | Current implementation | Pass   | 只查询单个 target 的 audit logs。                   |
| Data model / table freeze | `audit_log`                                      | Existing entity        | Pass   | 无新增表或列。                                      |
| Schema / DDL              | Existing migrations                              | N/A                    | Pass   | 无 DDL 变更。                                       |
| ADR                       | `ADR-015`                                        | Route grammar          | Pass   | 名词型子资源 `audit-logs/targets`。                 |

## 3. 本次 SSOT

| Concern                     | SSOT                                                | Implementation Rule                                             |
| --------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Business semantics          | `EX-63` baseline                                    | 实体详情只读编辑历史, 不做全局审计检索。                        |
| Public route canonical path | `api-route-canonical-inventory.md`                  | `GET /audit-logs/targets/{targetType}/{targetId}`。             |
| Route / command naming      | `RuntimeAuditController.listEntityAuditLogs`        | Controller 只做 path / query 透传。                             |
| DTO / contract naming       | `EntityAuditLogListQuerySchema`                     | Query 只允许 `from`、`to`、`eventType`、`result`、`limit`。     |
| Table / column naming       | Existing `AuditLog` entity                          | 复用 `target_type`、`target_id`、`occurred_at`。                |
| Date / time semantics       | Shared contract `z.iso.datetime()`                  | `from` / `to` 为 ISO datetime。                                 |
| Identifier semantics        | `targetId` path param                               | 按审计写入时的业务对象 ID 字符串匹配。                          |
| Money / decimal semantics   | N/A                                                 | 本片不解析业务金额。                                            |
| Status machine              | `AuditLogResultSchema`                              | 可按 `success` / `rejected` / `failed` 过滤。                   |
| Permission semantics        | `ENTITY_AUDIT_TARGET_READ_PERMISSIONS` service 映射 | Controller 粗粒度授权, service 依据 targetType 做最终权限裁决。 |

## 4. 命令与接口边界

| Route / Controller                                | Command / Service                         | Request DTO / Contract       | Response DTO / Contract | Guard / Permission                             | Design Source | Result    |
| ------------------------------------------------- | ----------------------------------------- | ---------------------------- | ----------------------- | ---------------------------------------------- | ------------- | --------- |
| `GET /audit-logs/targets/{targetType}/{targetId}` | `RuntimeAuditService.listEntityAuditLogs` | `EntityAuditLogListQueryDto` | `AuditLogListDto`       | `customer:read` / `lead:read` / `project:read` | `EX-63` 6.3   | aligned   |
| `GET /audit-logs`                                 | `RuntimeAuditService.listAuditLogs`       | `AuditLogListQueryDto`       | `AuditLogListDto`       | `platform:users:manage`                        | Existing      | unchanged |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /audit-logs/targets/{targetType}/{targetId}`
- Current implemented route(s): `RuntimeAuditController.listEntityAuditLogs`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-63C`
- Blocker / exception: none

## 5. 读侧边界

| Query / View                  | Consumer               | Fields                                     | Filter / Sort                                                       | Permission Boundary                                | Design Source | Result    |
| ----------------------------- | ---------------------- | ------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------- | ------------- | --------- |
| `listEntityAuditLogs`         | `FE-57` future details | `AuditLogSummary`                          | target fixed by path; optional date/event/result; `occurredAt DESC` | targetType maps to existing domain read permission | `EX-63`       | aligned   |
| `listAuditLogs` platform list | platform governance    | `AuditLogSummary` with broad query filters | existing broad filters                                              | `platform:users:manage`                            | Existing      | unchanged |

Supported `targetType` values in this slice:

- `lead` -> `lead:read`
- `customer`, `customer-contact` -> `customer:read`
- `opportunity-stakeholder`, `competitor-intelligence`, `sales-discovery-record` -> `lead:read` or `project:read`
- `project`, `contract`, `sales-follow-up-record` -> `project:read` for project / contract scope; sales follow-up records additionally accept `customer:read` or `lead:read`

## 6. 持久化边界

| Table            | Migration | Entity / Repository                   | DDL / Freeze Source | Check Result |
| ---------------- | --------- | ------------------------------------- | ------------------- | ------------ |
| `poms.audit_log` | existing  | `AuditLog` / `RuntimeAuditRepository` | existing            | aligned      |

| Field         | Design Type / Meaning        | Migration / DDL | Entity       | Shared Contract / OpenAPI         | Result  |
| ------------- | ---------------------------- | --------------- | ------------ | --------------------------------- | ------- |
| `target_type` | entity audit target category | string          | `targetType` | `EntityAuditTargetTypeSchema`     | aligned |
| `target_id`   | audited entity identifier    | string          | `targetId`   | path param string                 | aligned |
| `event_type`  | audit event category         | string          | `eventType`  | optional query string             | aligned |
| `result`      | audit result                 | string enum     | `result`     | `AuditLogResultSchema`            | aligned |
| `occurred_at` | event timestamp              | datetime        | `occurredAt` | `z.iso.datetime()` query / output | aligned |

## 7. 一致性结论

- Document -> code: 本片按 `EX-63` 要求冻结实体级读取边界。
- ADR-015 inventory -> route: 已新增 canonical inventory row。
- Migration -> entity: 无 DDL 变更。
- Entity -> contract: 新增查询 DTO 和 targetType enum, 返回沿用 `AuditLogSummary`。
- Route -> command: controller 透传 target path、query 和当前用户。
- Query -> view: `RuntimeAuditRepository.findAuditLogs` 固定 `targetType + targetId` 并按 `occurredAt DESC`。
- Guard / permission: controller 使用三类业务读权限粗拦截, service 做 targetType 精确权限裁决。
- OpenAPI / generated client: 需要生成并检查 generated client。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                         | Result       | Gap / Reason                                      |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                                                                                                           | Pass G3      |                                                   |
| Build                            | Yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                                                     | Pass G3      |                                                   |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=runtime-audit.service`                                                      | Pass G3      |                                                   |
| API / integration tests          | No       | N/A                                                                                                                                        | Not required | Controller is thin and covered by OpenAPI.        |
| E2E                              | No       | N/A                                                                                                                                        | Not required | Backend query slice.                              |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check` | Pass G3      | Existing generator `propertyNames` warnings only. |
| Migration / schema check         | No       | N/A                                                                                                                                        | Not required | No DDL.                                           |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes         |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-06`
- Conditions: Implementation must keep platform global `GET /audit-logs` restricted to platform management permission and reject unsupported targetType at service level.
