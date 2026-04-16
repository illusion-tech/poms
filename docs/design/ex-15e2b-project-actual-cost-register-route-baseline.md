# EX-15E2B ProjectActualCostRecord 注册 / 替代链 canonical route 裁决基线包

- Gate Status: `Pass`
- Parent: `EX-15E2`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-16`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-15E2B`

## 1. 范围

- 本次目标:
  - 冻结 `registerPaymentFactCostRecord`、`registerInvoiceCostRecord`、`registerExpenseCostRecord`、`registerProcurementCostRecord`、`registerLaborCostRecord`、`replaceLaborCostRecord` 的 canonical route 与 request identity。
  - 纠正“创建 `ProjectActualCostRecord` 却继续使用 action-style create route”与“path / body 双重携带 supersedes identity”两类 drift。
  - 为 `EX-15E2B` 后续 controller / contract / OpenAPI / client 直接切换提供单一实施输入。
- 本次明确纳入:
  - `ProjectActualCostRecord` 五种创建入口的统一 collection create route。
  - `replaceLaborCostRecord` 的 item-action route、path identity 与 request 并发字段语义。
  - source-mapping create 场景中的 `projectId`、source identity 与 optimistic locking 字段归属。
- 本次明确不做:
  - 不实现本轮 runtime / DTO / OpenAPI 切换；本片先完成 G1 裁决。
  - 不处理 `confirmSharedCostAllocationBasis`、`replaceSharedCostAllocationResult`、`confirmCostStageAttribution`、`reclassifyCostStageAttribution`、`confirmAccountingTaxTreatment`。
  - 不重做 `ProjectActualCostRecord` query boundary。
- 下游可依赖的交付边界:
  - `EX-15E2B` 进入编码时，`ProjectActualCostRecord` 创建统一视为“在项目下创建新的实际成本记录”，而不是“在 source 上执行 action”。
  - `replaceLaborCostRecord` 的 route identity 明确挂在被替代的 `ProjectActualCostRecord` item 上。
- 不允许下游依赖的留白:
  - 不得再把 `/project-actual-cost-records/register-*`、`/project-actual-cost-records:registerLabor`、`/project-cost/register-labor-cost-record`、`/project-cost/replace-labor-cost-record` 当作正式目标 route。
  - 不得继续保留 `supersedesRecordId` 与 path `{id}` 双重定义同一 identity 的 contract 设计。

## 2. 正式输入

| Input Type           | Document / Source                                 | Section / Anchor                                | Status    | Notes                                                                                                      |
| -------------------- | ------------------------------------------------- | ----------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| Business design      | `phase2-project-actual-cost-records.md`           | §4, §5                                          | Accepted  | `ProjectActualCostRecord` 是统一实际成本资源，持有 `sourceType/sourceId/supersedesRecordId`                |
| Business design      | `phase2-cost-source-to-project-record-mapping.md` | §11.1                                           | Accepted  | `PAYMENT_FACT / INVOICE / EXPENSE / PROCUREMENT` 已冻结为统一映射进入 `ProjectActualCostRecord`            |
| Command design       | `interface-command-design.md`                     | `ProjectActualCostRecord` 命令表                | Accepted  | 六个命令的业务职责已冻结；本片只裁 route / contract grammar                                                |
| Query boundary       | `query-view-boundary-design.md`                   | `ProjectActualCostRecordListView/DetailView`    | Accepted  | 读侧 item identity 已冻结为 `ProjectActualCostRecord`                                                      |
| DTO / OpenAPI design | `interface-openapi-dto-design.md`                 | `register*CostRecord`、`replaceLaborCostRecord` | Corrected | 当前 route 设计需按本基线纠偏                                                                              |
| ADR                  | `docs/adr/015-api-route-canonical-grammar.md`     | §4.1, §4.3                                      | Accepted  | 创建资源优先用 `POST /collection`；custom method 只保留给无法自然表达的 item command                       |
| Governance draft     | `api-route-governance-discussion-draft.md`        | §4.1                                            | Accepted  | 已明确记录 `registerLaborCostRecord` 的 action-style create 偏离 resource-first 原则                       |
| Runtime fact         | `ProjectCostService` / `ProjectCostController`    | `register*CostRecord`、`replaceLaborCostRecord` | Fact      | 当前五个 `register*` 全部返回新 `ProjectActualCostRecord.id`；`replaceLabor` 创建新记录并 supersede 旧记录 |

## 3. 本次 SSOT

| Concern                    | SSOT                                            | Implementation Rule                                                                                                  |
| -------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Resource identity          | `ProjectActualCostRecord`                       | 创建命令围绕 `ProjectActualCostRecord` collection 建模；source 对象只作为创建依据，不作为新资源的 canonical identity |
| Parent ownership           | `ProjectActualCostRecord.projectId`             | 创建 route 挂在项目父资源下：`POST /projects/{projectId}/actual-cost-records`                                        |
| Source reference semantics | `sourceType/sourceId/sourceRefNo`               | source-driven create 由 body 提供 source identity，由 service 负责校验 source 与 path `projectId` 一致               |
| Replacement semantics      | `supersedesRecordId`                            | replace route 的 path `{id}` 就是被替代的原记录 id；request body 不再重复携带同一 identity                           |
| Concurrency semantics      | source record / superseded record 的 rowVersion | source-driven create 使用 `expectedSourceVersion?`；`replaceLabor` 使用 `expectedSupersededRecordVersion?`           |
| Labor create semantics     | `rateVersionId` + labor period + quantity basis | `RegisterLaborCostRecordRequest.expectedVersion` 当前未被 service 使用，本轮裁决移除，不保留语义不明字段             |
| Route grammar              | `ADR-015`                                       | 创建资源不用 action suffix；item replace 统一用 `POST /project-actual-cost-records/{id}:replace`                     |

## 4. 裁决结论

### 4.1 统一创建 route

以下五个命令全部冻结为共享同一条 collection create route：

- `POST /projects/{projectId}/actual-cost-records`

适用能力：

- `registerPaymentFactCostRecord`
- `registerInvoiceCostRecord`
- `registerExpenseCostRecord`
- `registerProcurementCostRecord`
- `registerLaborCostRecord`

裁决理由：

1. 当前 service 事实表明五个命令全部新建 `ProjectActualCostRecord`，返回的 `targetType` 也统一为 `ProjectActualCostRecord`。
2. `query-view-boundary-design.md` 已把 list/detail 的正式资源身份冻结为 `ProjectActualCostRecord`，创建入口应与资源身份一致。
3. 继续使用 `register-*` action route 会把“创建资源”误建模成 custom method，违反 `ADR-015`。
4. 改为 source-nested create route 会把 `project-cost` slice 绑定到 `contract-finance` 等 source domain 仍未完成 canonical 收口的 route 上，扩大跨 slice 依赖。

### 4.2 创建 request contract

创建 request 冻结为一个 discriminated-union 风格的 canonical contract，建议名称：

- `CreateProjectActualCostRecordRequest`

判别字段：

- `costType`

各 variant：

1. `costType = PAYMENT_FACT`
   - `paymentRecordId`
   - `costDescription?`
   - `evidenceSummary?`
   - `expectedSourceVersion?`
2. `costType = INVOICE`
   - `invoiceRecordId`
   - `costDescription?`
   - `evidenceSummary?`
   - `taxImpactSummary?`
   - `expectedSourceVersion?`
3. `costType = EXPENSE`
   - `expenseRecordId`
   - `costDescription?`
   - `evidenceSummary?`
   - `taxImpactSummary?`
   - `expectedSourceVersion?`
4. `costType = PROCUREMENT`
   - `payableRecordId`
   - `costDescription?`
   - `evidenceSummary?`
   - `taxImpactSummary?`
   - `expectedSourceVersion?`
5. `costType = LABOR`
   - `laborPersonId?`
   - `laborRole?`
   - `laborPeriodType`
   - `laborPeriodStart`
   - `laborPeriodEnd`
   - `actualHours?`
   - `actualPersonDays?`
   - `workSummary?`
   - `rateVersionId`
   - `costDescription?`
   - `attachmentIds?`

补充约束：

- path `{projectId}` 是项目归属 SSOT，source-driven variant 不再在 body 中重复传 `projectId`
- `RegisterLaborCostRecordRequest.expectedVersion` 在当前 service 中未被消费，本轮裁决删除；若后续确有 rate-version optimistic locking 需要，必须显式新增 `expectedRateVersion?`，不得复用语义不清的 `expectedVersion`

### 4.3 替代命令 route 与 request

`replaceLaborCostRecord` 冻结为：

- route: `POST /project-actual-cost-records/{id}:replace`
- path `{id}`: 被替代的原 `ProjectActualCostRecord.id`

request body 建议字段：

- `laborPeriodStart`
- `laborPeriodEnd`
- `actualHours?`
- `actualPersonDays?`
- `workSummary?`
- `rateVersionId`
- `replaceReason`
- `expectedSupersededRecordVersion?`

裁决理由：

1. 当前 runtime 事实是先读取 `supersedesRecordId` 指向的旧记录，再创建新记录并把旧记录标记为 `REPLACED`。
2. path 与 body 同时携带同一 superseded identity 会制造双 SSOT，违反 canonical contract 清晰度。
3. `replace` 本质是 item command，符合 `ADR-015` 的 `POST /resources/{id}:verb`。

### 4.4 拒绝方案

以下方案本轮明确拒绝：

1. 保留 `/project-actual-cost-records/register-*`
   - 原因：action-style create，不符合 resource-first
2. 保留 `POST /project-actual-cost-records:registerLabor`
   - 原因：`LABOR` 也是创建资源，不构成 custom method 例外
3. 保留 `/project-cost/register-labor-cost-record`、`/project-cost/replace-labor-cost-record`
   - 原因：脱离正式资源 identity，属于历史实现残留
4. 改为 source-nested create，例如 `/payment-records/{id}/cost-records`
   - 原因：会把 `project-cost` canonical route 绑定到尚未在 `EX-15E4` 完成收口的 source domain route 上；当前不是最小依赖边界

## 5. 命令与接口边界

| Capability                      | Canonical Route                                  | Request Identity SSOT                     | Response Result                         | Result   |
| ------------------------------- | ------------------------------------------------ | ----------------------------------------- | --------------------------------------- | -------- |
| `registerPaymentFactCostRecord` | `POST /projects/{projectId}/actual-cost-records` | path `projectId` + body `paymentRecordId` | `targetId = ProjectActualCostRecord.id` | 本轮裁定 |
| `registerInvoiceCostRecord`     | `POST /projects/{projectId}/actual-cost-records` | path `projectId` + body `invoiceRecordId` | `targetId = ProjectActualCostRecord.id` | 本轮裁定 |
| `registerExpenseCostRecord`     | `POST /projects/{projectId}/actual-cost-records` | path `projectId` + body `expenseRecordId` | `targetId = ProjectActualCostRecord.id` | 本轮裁定 |
| `registerProcurementCostRecord` | `POST /projects/{projectId}/actual-cost-records` | path `projectId` + body `payableRecordId` | `targetId = ProjectActualCostRecord.id` | 本轮裁定 |
| `registerLaborCostRecord`       | `POST /projects/{projectId}/actual-cost-records` | path `projectId` + labor basis fields     | `targetId = ProjectActualCostRecord.id` | 本轮裁定 |
| `replaceLaborCostRecord`        | `POST /project-actual-cost-records/{id}:replace` | path `id = superseded record id`          | `targetId = replacement record id`      | 本轮裁定 |

## 6. 读侧 / source 边界

| Query / Resource                                | Boundary Rule                                                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /projects/{projectId}/actual-cost-records` | create 与 list 同属项目子集合，route grammar 一致                                                                                  |
| `GET /project-actual-cost-records/{id}`         | item detail 继续以统一 `ProjectActualCostRecord` resource identity 暴露                                                            |
| source resources                                | `PaymentRecord` / `InvoiceRecord` / `ExpenseRecord` / `PayableRecord` 仅作为 create 依据，不承载本 slice 的 canonical create route |

## 7. 持久化边界

| Table | Migration | Entity / Repository | Result                                      |
| ----- | --------- | ------------------- | ------------------------------------------- |
| `N/A` | `N/A`     | `N/A`               | 本片只裁 route / contract，不改 persistence |

## 8. 测试与校验

| Check                            | Required | Command / Evidence                              | Result  | Gap / Reason              |
| -------------------------------- | -------- | ----------------------------------------------- | ------- | ------------------------- |
| Build                            | Later    | `corepack pnpm nx build poms-api`               | Pending | 待实现切换后执行          |
| Unit tests                       | Later    | `corepack pnpm nx test poms-api --runInBand`    | Pending | 待实现切换后执行          |
| API / integration tests          | Later    | `corepack pnpm nx run poms-api:openapi`         | Pending | 待实现切换后执行          |
| E2E                              | Later    | `corepack pnpm nx e2e poms-api-e2e --runInBand` | Pending | 待实现切换后执行          |
| OpenAPI generation / client diff | Later    | `corepack pnpm nx run shared-api-client:check`  | Pending | 待实现切换后执行          |
| Migration / schema check         | No       | `N/A`                                           | N/A     | 本片不含 persistence 变更 |
| Diff hygiene                     | Yes      | `git diff --check`                              | Pending | 文档回写后执行            |

## 9. 风险与后续条件

| Risk / Condition                                  | Notes                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| controller 需要合并 create entry                  | 五个 `register*` 当前是五个 handler；后续实现必须合并为一个 create handler 或等价统一入口 |
| shared contract 需要 one-of / discriminated union | 本轮裁决会引入 contract 结构性变化，必须同步 OpenAPI 与 generated client                  |
| 旧 e2e helper 需要改造                            | 当前 `actual-cost-api.ts` 仍按 source-specific route 调用，后续要改为统一 create helper   |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-16`
- Conditions:
  - `EX-15E2B` 进入编码时，必须按本基线同时回写 controller、shared contract、OpenAPI、generated client、e2e support 与 inventory。
  - 不接受为仓库内可控调用方保留 source-specific legacy alias。
