# EX-15E2A Project Cost Round 1 canonical route 收口实施基线包

- Gate Status: `Pass`
- Parent: `EX-15E2`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-16`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-15E2A`

## 1. 范围

- 本次目标:
  - 把 `project-cost` 中已具备稳定语义、且无需先改 DTO 才能 canonical 化的第一组 route 收口到 `ADR-015`。
  - 同轮回写 inventory、authoritative 设计文档、controller、OpenAPI、generated client 与 HTTP E2E support。
- 本次明确纳入:
  - `publishInternalCostRateVersion` -> `POST /internal-cost-rate-versions`
  - `activateOperatingBaselinePackage` -> `POST /operating-baseline-packages`
  - `getCurrentOperatingBaselinePackage` -> `GET /projects/{projectId}/operating-baseline-package`
  - `createProjectOperatingSnapshot` -> `POST /project-operating-snapshots`
  - `createPeriodClosingSnapshot` -> `POST /period-closing-snapshots`
  - `createOperatingRestatement` -> `POST /operating-restatements`
  - `confirmExpenseRecord` / `voidExpenseRecord` -> `POST /expense-records/{id}:confirm|void`
- 本次明确不做:
  - 不处理 `registerPaymentFactCostRecord`、`registerInvoiceCostRecord`、`registerExpenseCostRecord`、`registerProcurementCostRecord`、`registerLaborCostRecord`。
  - 不处理 `replaceLaborCostRecord`、`confirmSharedCostAllocationBasis`、`replaceSharedCostAllocationResult`、`confirmCostStageAttribution`、`reclassifyCostStageAttribution`、`confirmAccountingTaxTreatment`。
  - 不保留 legacy alias；本轮默认直接切换。
- 下游可依赖的交付边界:
  - 上述已纳入能力全部以 canonical route 作为唯一正式入口。
  - `project-cost` 的“资源创建类命令应优先建模为 collection POST”这一裁决，在本轮覆盖的命令上冻结生效。
- 不允许下游依赖的留白:
  - 不得继续把 `project-cost/*` 的旧 action path、`/operating-baseline-package/current`、`/expense-records/{id}/confirm|void` 当作正式入口。
  - 未纳入能力仍需在 `EX-15E2B / EX-15E2C` 完成 route 与 identity 冻结后再切换。

## 2. 正式输入

| Input Type                | Document / Source                                     | Section / Anchor                       | Status    | Notes                                                                                    |
| ------------------------- | ----------------------------------------------------- | -------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| Business design           | `phase2-project-actual-cost-records.md`               | 实际成本记录与内部成本率版本主线       | Accepted  | 冻结 `InternalCostRateVersion`、`ProjectActualCostRecord` 与费用事实边界                 |
| Business design           | `phase2-estimated-to-actual-cost-bridge.md`           | 经营基线 / 快照 / 重述主线             | Accepted  | 冻结经营基线包、快照、重述对象的业务含义                                                 |
| Command design            | `interface-command-design.md`                         | `ProjectActualCostRecord` / `EX-07` 段 | Accepted  | 冻结当前命令职责；本片只改 route grammar，不改状态机                                     |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                     | `project-cost` 命令 DTO 草案           | Corrected | 本轮回写与当前服务语义一致的 canonical route；纠正“创建命令误建模为 item action”的旧表述 |
| Query boundary            | `ex-06-expense-fact-prerequisite-baseline.md`         | 费用记录读写边界                       | Accepted  | 费用记录确认 / 作废命令保持 item action 语义                                             |
| Query boundary            | `ex-07b-operating-restatement-rebaseline-baseline.md` | 经营基线 / 快照 / 重述边界             | Corrected | 本轮回写 `/api` 前缀、`/current` page suffix 与资源创建 route                            |
| Data model / table freeze | `EX-06`、`EX-07` 已交付 persistence                   | N/A                                    | N/A       | 本片不新增 persistence 变更                                                              |
| Schema / DDL              | `EX-06`、`EX-07` 既有 migration / entity              | N/A                                    | N/A       | 本片不涉及 DDL                                                                           |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`         | §4.1, §4.2, §4.3                       | Accepted  | `resource-first + colon-action as exception` 为 route grammar SSOT                       |

## 3. 本次 SSOT

| Concern                   | SSOT                                                                   | Implementation Rule                                                                                   |
| ------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Business semantics        | `EX-06` / `EX-07` 已冻结设计与当前 service 语义                        | 不改业务状态机与金额语义，只把 route 收口到 canonical grammar                                         |
| Route / command naming    | `ADR-015` + 本基线 + `api-route-canonical-inventory.md`                | 创建稳定资源统一优先用 `POST /collection`；确属 item command 的动作统一用 `POST /resources/{id}:verb` |
| DTO / contract naming     | 现有 shared contract DTO                                               | 本轮不改 DTO 名称，仅回写 route 与文档字段描述                                                        |
| Table / column naming     | `EX-06` / `EX-07` 既有实体与 migration                                 | 不改 persistence                                                                                      |
| Date / time semantics     | 现有 shared contract                                                   | 不改日期 / 时间字段语义                                                                               |
| Identifier semantics      | `InternalCostRateVersion.id`、`OperatingBaselinePackage.id` 等稳定主键 | 创建命令不伪造 item action path；已有 item 命令继续用稳定主键                                         |
| Money / decimal semantics | `EX-06` / `EX-07` 冻结金额与税额语义                                   | 本片不改金额精度与计算规则                                                                            |
| Status machine            | 现有服务逻辑                                                           | 只改入口，不改 `active/superseded/voided` 等状态推进规则                                              |

## 4. 命令与接口边界

| Route / Controller                   | Command / Service                                     | Request DTO / Contract                       | Response DTO / Contract              | Guard / Permission        | Design Source          | Result   |
| ------------------------------------ | ----------------------------------------------------- | -------------------------------------------- | ------------------------------------ | ------------------------- | ---------------------- | -------- |
| `POST /internal-cost-rate-versions`  | `ProjectCostService.publishInternalCostRateVersion`   | `PublishInternalCostRateVersionRequestDto`   | `CommandResultDto` / `CommandResult` | `contract:finance:manage` | `ADR-015` + `EX-15E2A` | 本轮切换 |
| `POST /operating-baseline-packages`  | `ProjectCostService.activateOperatingBaselinePackage` | `ActivateOperatingBaselinePackageRequestDto` | `CommandResultDto` / `CommandResult` | `contract:finance:manage` | `ADR-015` + `EX-15E2A` | 本轮切换 |
| `POST /project-operating-snapshots`  | `ProjectCostService.createProjectOperatingSnapshot`   | `CreateProjectOperatingSnapshotRequestDto`   | `CommandResultDto` / `CommandResult` | `contract:finance:manage` | `ADR-015` + `EX-15E2A` | 本轮切换 |
| `POST /period-closing-snapshots`     | `ProjectCostService.createPeriodClosingSnapshot`      | `CreatePeriodClosingSnapshotRequestDto`      | `CommandResultDto` / `CommandResult` | `contract:finance:manage` | `ADR-015` + `EX-15E2A` | 本轮切换 |
| `POST /operating-restatements`       | `ProjectCostService.createOperatingRestatement`       | `CreateOperatingRestatementRequestDto`       | `CommandResultDto` / `CommandResult` | `contract:finance:manage` | `ADR-015` + `EX-15E2A` | 本轮切换 |
| `POST /expense-records/{id}:confirm` | `ProjectCostService.confirmExpenseRecord`             | `ConfirmExpenseRecordRequestDto`             | `ExpenseRecordDto`                   | `contract:finance:manage` | `ADR-015` + `EX-15E2A` | 本轮切换 |
| `POST /expense-records/{id}:void`    | `ProjectCostService.voidExpenseRecord`                | `VoidExpenseRecordRequestDto`                | `ExpenseRecordDto`                   | `contract:finance:manage` | `ADR-015` + `EX-15E2A` | 本轮切换 |

## 5. 读侧边界

| Query / View                                           | Consumer           | Fields                                                     | Permission Boundary       | Design Source                | Result   |
| ------------------------------------------------------ | ------------------ | ---------------------------------------------------------- | ------------------------- | ---------------------------- | -------- |
| `GET /projects/{projectId}/operating-baseline-package` | 项目经营当前基线页 | 当前有效基线包、变更包明细、`currentEffectiveBaselineCost` | `contract:finance:manage` | `ADR-015` stable subresource | 本轮切换 |
| `GET /project-operating-snapshots/{id}`                | 项目经营快照详情   | 快照金额、窗口、动作等级、基线引用                         | `contract:finance:manage` | `EX-07` 既有查询边界         | 保持     |
| `GET /period-closing-snapshots/{id}`                   | 期末冻结快照详情   | 期末快照口径、期间键、动作等级                             | `contract:finance:manage` | `EX-07` 既有查询边界         | 保持     |
| `GET /projects/{projectId}/operating-restatements`     | 经营重述历史列表   | 重述原因、被重述快照、重述后快照引用                       | `contract:finance:manage` | `EX-07` 既有查询边界         | 保持     |
| `GET /operating-restatements/{id}`                     | 经营重述详情       | 重述链路、原因、引用快照                                   | `contract:finance:manage` | `EX-07` 既有查询边界         | 保持     |
| `GET /expense-records/{id}`                            | 费用记录详情       | 台账字段、`allowedActions`、作废原因                       | `contract:finance:manage` | `EX-06` 既有查询边界         | 保持     |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result           |
| ----- | --------- | ------------------- | ------------------- | ---------------------- |
| `N/A` | `N/A`     | `N/A`               | `N/A`               | 本片不涉及 persistence |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | 本片不新增字段        | `N/A`           | `N/A`  | `N/A`                     | 保持   |

## 7. 一致性结论

- Document -> code: `project-cost` 第一组 route drift 由本片统一按 canonical route 收口。
- Migration -> entity: N/A，本片不触达 persistence。
- Entity -> contract: N/A，本片不改 entity / contract 结构。
- Route -> command: 资源创建类命令不再伪装成 `project-cost/*` action path，费用确认 / 作废切到 colon-action。
- Query -> view: 项目当前经营基线 query 作为稳定名词型子资源暴露，不再保留 `/current` page suffix。
- Guard / permission: 保持现有 `contract:finance:manage` 边界不变。
- OpenAPI / generated client: 必须同轮回写，不接受 runtime / OpenAPI / client 分叉。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                              | Result  | Gap / Reason        |
| -------------------------------- | -------- | ----------------------------------------------- | ------- | ------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`               | Pending | 实施后运行          |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`    | Pending | 实施后运行          |
| API / integration tests          | Yes      | `corepack pnpm nx run poms-api:openapi`         | Pending | 实施后运行          |
| E2E                              | Yes      | `corepack pnpm nx e2e poms-api-e2e --runInBand` | Pending | 实施后运行          |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:check`  | Pending | 实施后运行          |
| Migration / schema check         | No       | `N/A`                                           | N/A     | 无 persistence 变更 |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                             |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------------------------------------------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 默认直接切换，不保留过渡 alias；其余 route 另由 `EX-15E2B/C` 处理 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-16`
- Conditions:
  - runtime route、OpenAPI、generated client、HTTP E2E 与 tracker / progress 必须在同一轮一起回写。
  - `EX-15E2B / EX-15E2C` 必须继续处理 `project-cost` 其余 identity / route drift，不得把本轮未纳入能力默认为已完成。
