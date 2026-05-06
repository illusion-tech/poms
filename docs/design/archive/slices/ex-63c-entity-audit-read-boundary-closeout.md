# EX-63C 实体级审计读取权限与查询出口 Closeout

- Gate Status: `G4 / Done`
- Parent: `EX-63`
- Owner: `Codex`
- Date: `2026-05-06`
- Baseline: `ex-63c-entity-audit-read-boundary-baseline.md`
- Tracker Row: `EX-63C`

## 1. 交付范围

本片已完成实体级审计读取后端能力:

- 新增 `GET /audit-logs/targets/{targetType}/{targetId}`。
- 新增 `EntityAuditTargetTypeSchema` 和 `EntityAuditLogListQuerySchema`。
- Controller 使用 `customer:read` / `lead:read` / `project:read` 粗粒度保护。
- Service 依据 `targetType` 精确映射读权限, 拒绝平台治理类 targetType。
- 查询固定 `targetType + targetId`, 只允许按日期、事件类型、结果和 limit 缩小范围。
- 保留既有平台级 `GET /audit-logs` 的 `platform:users:manage` 权限不变。
- OpenAPI 和 generated `shared-api-client` 已同步。

## 2. 明确未交付

- 未新增前端编辑历史入口, 由 `FE-57` 承接。
- 未新增全局审计中心、导出、图表或跨对象检索。
- 未新增对象级数据范围 / 所有权过滤。
- 未新增 migration 或 `audit_log` DDL。
- 未改变线索评分历史、销售跟进版本历史等专门业务历史接口。

## 3. 权限边界

| Target Type                                                                    | Required Read Permission                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------ |
| `lead`                                                                         | `lead:read`                                      |
| `customer`, `customer-contact`                                                 | `customer:read`                                  |
| `opportunity-stakeholder`, `competitor-intelligence`, `sales-discovery-record` | `lead:read` or `project:read`                    |
| `sales-follow-up-record`                                                       | `customer:read` or `lead:read` or `project:read` |
| `project`, `contract`                                                          | `project:read`                                   |

Unsupported targetType, such as `PlatformUser`, returns a bad request instead of falling back to global audit querying.

## 4. Validation

| Check                       | Result | Evidence                                                                              |
| --------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Focused unit tests          | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=runtime-audit.service` |
| API lint                    | Pass   | `corepack pnpm nx lint poms-api`                                                      |
| API build                   | Pass   | `corepack pnpm nx build poms-api`                                                     |
| Admin build                 | Pass   | `corepack pnpm nx build poms-admin`                                                   |
| OpenAPI generation          | Pass   | `corepack pnpm nx run poms-api:openapi`                                               |
| Generated client generation | Pass   | `corepack pnpm nx run shared-api-client:generate`                                     |
| Generated client check      | Pass   | `corepack pnpm nx run shared-api-client:check`                                        |

## 5. Drift / Risk

- `new-real-drift`: none.
- `existing-baseline-drift`: OpenAPI generator still reports existing `propertyNames` warnings for several free-form schemas; generated client check passed and this slice did not introduce those warnings.
- `accepted-db-specific-difference`: N/A, no DDL.
- `tool-noise`: N/A.
- `design-change-required`: none.

## 6. G4 结论

`EX-63C` 已满足 `G4 / Done` 条件, 可作为 `FE-57` 编辑历史前端入口的后端依赖。
