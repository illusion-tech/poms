# EX-63B CRM 销售事实字段级审计扩展实施基线包

- Gate Status: `Pass`
- Parent: `EX-63`
- Owner: `Codex`
- Slice Type: `api / command`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-06`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-63B`

## 1. 范围

- 本次目标:
  - 为 CRM 销售事实的既有编辑命令补字段级审计。
  - 覆盖 `PATCH /customer-contacts/{id}`、`PATCH /opportunity-stakeholders/{id}`、`PATCH /competitor-intelligence-records/{id}`、`PATCH /sales-discovery-records/{id}`。
  - 成功编辑时写入 `audit_log`, 使用 `*.updated` 事件、`targetType + targetId`、`metadata.changedFields`、`beforeSnapshot`、`afterSnapshot`、`sourceCommand` 和业务上下文。
  - 业务写入和审计写入在同一事务提交。
  - 无实际字段变化时不写成功审计, 不刷新 `updatedBy`。
  - 对联系方式、备注、关系说明、竞争说明、销售发现长文本使用最小化审计摘要, 不复制全文。
- 本次明确不做:
  - 不新增 public route、DTO、OpenAPI、generated client 或 migration。
  - 不新增前端入口或编辑表单。
  - 不改变销售情报缺口、评分、闸口或转项目算法。
  - 不引入婚姻、籍贯、私人偏好等私人画像字段。
  - 不覆盖 create / void / replace 等非编辑命令。
- 下游可依赖的交付边界:
  - `FE-57` 的实体编辑历史入口可读取 CRM 销售事实编辑历史。
  - 后续项目 / 合同核心字段审计可复用本片 helper 形态。

## 2. 正式输入

| Input Type         | Document / Source                                | Section / Anchor                   | Status | Notes                                    |
| ------------------ | ------------------------------------------------ | ---------------------------------- | ------ | ---------------------------------------- |
| Business design    | `ex-63-field-level-audit-governance-baseline.md` | `4.2 第二优先级: CRM 销售事实`     | Pass   | 冻结字段审计、脱敏和事件命名要求。       |
| Runtime precedent  | `ex-63a-lead-field-audit-runtime-closeout.md`    | `1. 交付内容`                      | Pass   | 复用同事务写入和 changedFields payload。 |
| Read-side boundary | `ex-63c-entity-audit-read-boundary-closeout.md`  | Entity target type whitelist       | Pass   | 已支持本片 targetType 的实体级读取。     |
| Current runtime    | `sales-intelligence.service.ts`                  | Existing update methods            | Pass   | 已有四类编辑命令, 本片只增强写侧审计。   |
| Route inventory    | `api-route-canonical-inventory.md`               | Existing sales intelligence routes | Pass   | 本片不新增或改动 public route surface。  |

## 3. 本次 SSOT

| Concern               | SSOT / Rule                                   | Implementation Rule                                                                                                                |
| --------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Audit event naming    | `EX-63` event table                           | `customer-contact.updated`, `opportunity-stakeholder.updated`, `competitor-intelligence.updated`, `sales-discovery-record.updated` |
| Audit target type     | `EntityAuditTargetTypeValue`                  | 使用 `customer-contact`, `opportunity-stakeholder`, `competitor-intelligence`, `sales-discovery-record`                            |
| Changed fields        | Existing entity fields                        | 只比较本次命令可编辑字段, 只记录真实变化字段。                                                                                     |
| Snapshot semantics    | `EX-63A`                                      | before / after 只包含 changed fields。                                                                                             |
| Sensitive text policy | `EX-63` sensitive strategy                    | 联系方式与自由文本使用脱敏值、长度摘要或 changed flag。                                                                            |
| Transaction boundary  | `RuntimeAuditService.recordAuditLog(..., em)` | 业务实体和 audit log 在同一 MikroORM transaction flush。                                                                           |
| Request traceability  | `getRequestId(req)`                           | Controller 将 requestId 传给 service, 没有 requestId 时写 `null`。                                                                 |

## 4. 字段审计策略

| Object                         | Event Type                        | Changed Fields                                                                                                                                               | Redacted / Summary Fields                                                              |
| ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `CustomerContact`              | `customer-contact.updated`        | `name`, `gender`, `department`, `title`, `workPhone`, `mobile`, `wechat`, `email`, `remark`, `status`                                                        | `workPhone`, `mobile`, `wechat`, `email`, `remark`                                     |
| `OpportunityStakeholder`       | `opportunity-stakeholder.updated` | `role`, `attitude`, `influenceLevel`, `accessLevel`, `focusAreas`, `communicationNotes`, `isPrimary`                                                         | `focusAreas`, `communicationNotes`                                                     |
| `CompetitorIntelligenceRecord` | `competitor-intelligence.updated` | `competitorName`, `position`, `customerPreference`, `competitorStrengths`, `competitorWeaknesses`, `ourAdvantages`, `ourRisks`, `winProbability`, `evidence` | `competitorStrengths`, `competitorWeaknesses`, `ourAdvantages`, `ourRisks`, `evidence` |
| `SalesDiscoveryRecord`         | `sales-discovery-record.updated`  | `procurementProcess`, `budgetSource`, `customerPainPoints`, `decisionCycle`, `nextContactPlan`, `remark`                                                     | all long text fields                                                                   |

## 5. 技术边界

| Area        | Boundary                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------- |
| API surface | No new or changed public route, DTO, OpenAPI, generated client.                                 |
| Persistence | No DDL / migration. Reuse existing `audit_log`.                                                 |
| Service     | `SalesIntelligenceService` injects `RuntimeAuditService` and writes audit from update commands. |
| Repository  | Add minimal transaction helper / entity manager support for sales intelligence writes.          |
| Controller  | Add requestId propagation for update methods only.                                              |
| Frontend    | N/A. Existing FE-57 can read the records through EX-63C.                                        |

## 6. 测试与校验

| Check                  | Required | Command / Evidence                                                                         | Result       | Gap / Reason                 |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------ | ------------ | ---------------------------- |
| API focused tests      | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=sales-intelligence.service` | Pass G3      |                              |
| Runtime audit tests    | No       | N/A                                                                                        | Not required | Runtime audit API unchanged. |
| API lint               | Yes      | `corepack pnpm nx lint poms-api`                                                           | Pass G3      |                              |
| API build              | Yes      | `corepack pnpm nx build poms-api`                                                          | Pass G3      |                              |
| OpenAPI / client check | No       | N/A                                                                                        | Not required | No public contract change.   |
| Migration check        | No       | N/A                                                                                        | Not required | No DDL change.               |
| Markdown / diff check  | Yes      | `format:md:check`, `git diff --check`                                                      | Pass G3      |                              |

## 7. 例外与风险

| Exception ID                 | Level | Scope         | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                   |
| ---------------------------- | ----- | ------------- | ----------- | ------------- | ----------- | ----------------------------------------------------------------------- |
| `EX63B-E1-EXPECTED-VERSION`  | Low   | CRM edit DTOs | Codex local | `EX-63B+`     | TBD         | 现有 CRM 编辑 DTO 尚无 `expectedVersion`; 本片不扩大 DTO / OpenAPI 面。 |
| `EX63B-E2-TEXT-SUMMARY-ONLY` | Low   | 自由文本审计  | Codex local | `EX-63B`      | 2026-05-06  | 长文本仅记录长度摘要和 changed flag, 不支持前端逐字对比。               |

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-06`
- Conditions: implementation must not copy redacted text values into audit snapshots and must not change public API surface.

## 9. G3 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-06`
- Evidence: see `ex-63b-crm-sales-fact-field-audit-closeout.md`.
- Remaining condition: code review before G4 / Done.

## 10. G4 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Evidence: see `ex-63b-crm-sales-fact-field-audit-closeout.md`.
- Conditions: none.
