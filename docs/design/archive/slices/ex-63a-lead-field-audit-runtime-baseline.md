# EX-63A Lead 基础信息字段级审计后端运行时实施基线包

- Gate Status: `Pass`
- Parent: `EX-63`
- Owner: `Codex`
- Slice Type: `api / command`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-06`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-63A`

## 1. 范围

- 本次目标:
  - 为 `PATCH /leads/{id}` 的线索基础信息编辑写入 `lead.updated` 字段级审计。
  - 记录真实变化字段的 `beforeSnapshot` / `afterSnapshot`、`metadata.changedFields`、`operatorId`、`requestId`、`expectedVersion` 和脱敏字段列表。
  - 保证业务更新、系统评分快照和审计日志在同一事务内提交。
  - 补充后端 focused tests 覆盖有变化、无变化、长文本脱敏摘要和版本冲突。
- 本次明确不做:
  - 不新增前端编辑历史入口。
  - 不实现 CRM 销售事实字段审计。
  - 不新增实体级审计读取 route。
  - 不改变评分算法、线索状态机、转项目规则或销售情报缺口算法。
- 下游可依赖的交付边界:
  - `PATCH /leads/{id}` 成功修改字段时会写入可查询的字段级审计事件。
  - 无实际字段变化时不写 `lead.updated` 成功事件。
  - 版本冲突或业务规则拒绝不会写成功审计。
- 不允许下游依赖的留白:
  - 普通销售在详情页读取编辑历史的 route / 权限仍由 `EX-63C` 冻结。
  - 前端展示和交互入口仍由 `FE-57` 冻结。

## 2. 正式输入

| Input Type                | Document / Source                                | Section / Anchor       | Status | Notes                                            |
| ------------------------- | ------------------------------------------------ | ---------------------- | ------ | ------------------------------------------------ |
| Business design           | `ex-63-field-level-audit-governance-baseline.md` | 4.1, 5                 | Pass   | Lead 基础信息是首批字段审计优先级。              |
| Command design            | `LeadService.updateLead`                         | Current implementation | Pass   | 当前命令已存在, 本次补审计和事务一致性。         |
| DTO / OpenAPI design      | `UpdateLeadRequestSchema`                        | Shared contracts       | Pass   | 增补可选 `expectedVersion`, 不新增 route。       |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`               | Existing lead update   | Pass   | `PATCH /leads/{id}` 既有 route, 无新增 surface。 |
| Query boundary            | N/A                                              | N/A                    | Pass   | 本次不做审计读取。                               |
| Data model / table freeze | `audit_log`, `lead`, `lead_score_snapshot`       | Existing entities      | Pass   | 不新增表或列。                                   |
| Schema / DDL              | Existing migrations                              | N/A                    | Pass   | 无 DDL 变更。                                    |
| ADR                       | `ADR-015`                                        | Existing route grammar | Pass   | 不新增 public route。                            |

## 3. 本次 SSOT

| Concern                     | SSOT                                               | Implementation Rule                                            |
| --------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Business semantics          | `ex-63-field-level-audit-governance-baseline.md`   | 只审计基础信息编辑命令, 不替代评分历史或状态历史。             |
| Public route canonical path | Existing `PATCH /leads/{id}`                       | 不新增 route, 保持当前 controller method。                     |
| Route / command naming      | `LeadController.update` / `LeadService.updateLead` | 审计 `sourceCommand = update-lead`。                           |
| DTO / contract naming       | `UpdateLeadRequestSchema`                          | `expectedVersion` 为可选乐观锁输入。                           |
| Table / column naming       | Existing MikroORM entities                         | 复用 `audit_log.before_snapshot / after_snapshot / metadata`。 |
| Date / time semantics       | Shared contract `z.iso.date()`                     | `expectedDecisionDate` 继续使用 ISO date 字符串。              |
| Identifier semantics        | Internal UUID                                      | `lead`, `customer`, `source`, `operator` 均使用系统内 UUID。   |
| Money / decimal semantics   | `LeadEstimatedAmountStringSchema`, `numeric(18,2)` | 审计金额字符串值, 读取权限由后续 `EX-63C` 控制。               |
| Status machine              | `LEAD_MUTABLE_STATUSES`                            | 只有 `registered` / `qualified` 可编辑。                       |

## 4. 命令与接口边界

| Route / Controller  | Command / Service        | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source | Result  |
| ------------------- | ------------------------ | ---------------------- | ----------------------- | ------------------ | ------------- | ------- |
| `PATCH /leads/{id}` | `LeadService.updateLead` | `UpdateLeadRequestDto` | `LeadDto`               | `lead:write`       | `EX-63` 4.1   | aligned |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing `PATCH /leads/{id}`
- Current implemented route(s): `LeadController.update`
- Inventory status: `aligned`
- Route governance source: existing Lead route surface
- Blocker / exception: none

## 5. 读侧边界

| Query / View | Consumer | Fields | Filter / Sort | Permission Boundary | Design Source | Result |
| ------------ | -------- | ------ | ------------- | ------------------- | ------------- | ------ |
| N/A          | N/A      | N/A    | N/A           | N/A                 | N/A           | N/A    |

本片只写运行时审计, 不提供详情页审计读取。

## 6. 持久化边界

| Table                      | Migration | Entity / Repository                | DDL / Freeze Source | Check Result |
| -------------------------- | --------- | ---------------------------------- | ------------------- | ------------ |
| `poms.audit_log`           | existing  | `AuditLog` / `RuntimeAuditService` | existing            | aligned      |
| `poms.lead`                | existing  | `Lead` / `LeadRepository`          | existing            | aligned      |
| `poms.lead_score_snapshot` | existing  | `LeadScoreService`                 | existing            | aligned      |

| Field                  | Design Type / Meaning          | Migration / DDL | Entity     | Shared Contract / OpenAPI | Result              |
| ---------------------- | ------------------------------ | --------------- | ---------- | ------------------------- | ------------------- |
| `leadName`             | short business title           | string          | string     | optional string           | aligned             |
| `sourceId`             | source UUID                    | uuid            | uuid       | optional uuid             | aligned             |
| `demandDescription`    | long customer need description | text            | text       | optional string           | redacted summary    |
| `budgetStatus`         | budget enum                    | enum check      | enum       | optional enum             | aligned             |
| `estimatedAmount`      | money string / numeric(18,2)   | numeric         | string     | optional decimal string   | aligned             |
| `urgency`              | urgency enum                   | enum check      | enum       | optional enum             | aligned             |
| `expectedDecisionDate` | ISO date                       | date            | date       | optional iso date         | aligned             |
| `expectedVersion`      | optimistic lock input          | N/A             | rowVersion | optional number           | contract-only input |

## 7. 一致性结论

- Document -> code: 本片按 `EX-63` 首批 Lead 字段白名单实现。
- ADR-015 inventory -> route: 既有 route, 无新增 surface。
- Migration -> entity: 无 DDL 变更。
- Entity -> contract: `expectedVersion` 只作为请求输入, 不新增实体字段。
- Route -> command: controller 透传 `requestId`、字段输入和 `expectedVersion`。
- Query -> view: N/A。
- Guard / permission: 继续使用 `lead:write`。
- OpenAPI / generated client: 需要生成并检查 generated client 以同步 `expectedVersion`。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                      | Result       | Gap / Reason           |
| -------------------------------- | -------- | ------------------------------------------------------- | ------------ | ---------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                        | Pass G3      |                        |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                       | Pass G3      |                        |
| Unit tests                       | Yes      | focused `lead.service` / `runtime-audit.service`        | Pass G3      |                        |
| API / integration tests          | No       | N/A                                                     | Not required | No new route.          |
| E2E                              | No       | N/A                                                     | Not required | Backend command slice. |
| OpenAPI generation / client diff | Yes      | `shared-api-client:generate`, `shared-api-client:check` | Pass G3      | DTO input changes.     |
| Migration / schema check         | No       | N/A                                                     | Not required | No DDL.                |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes         |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-06`
- Conditions: Implementation must keep audit write in the same transaction as lead update and score snapshot; no-change updates must not write `lead.updated`.
