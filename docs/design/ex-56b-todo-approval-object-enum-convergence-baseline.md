# EX-56B Todo / Approval / Object Enum Convergence 实施基线包

- Gate Status: `Pass`
- Parent: `EX-56`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-01`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-56B`

## 1. 范围

- 本次目标:
  - 将统一待办、审批和跨域业务对象标识收敛为 `shared-contracts` 单一事实源。
  - 为 `TodoStatus`、`TodoPriority`、`TodoType`、`TodoSourceType`、`BusinessDomain`、`TargetObjectType`、`ApprovalType`、`ApprovalStatus`、`ApprovalDecision` 增加 schema / value object。
  - 将 `ApprovalRecordSummary` 与 `TodoItemSummary` 中对应字段从宽泛 `z.string()` 收紧为显式枚举 schema，使 OpenAPI 与 generated client 生成 enum。
  - 为 `poms.approval_record` 与 `poms.todo_item` 的 enum-like 字段补齐 DB check constraint，并让 entity `$type<T>()` 与 shared contract 对齐。
  - 替换审批、确认、销售跟进提醒和 Admin 待办展示 / deep-link 中的关键裸字符串。
  - 保护 `GET /me/todos`、工作台、顶栏和 `FE-51` 深链入口行为不漂移。
- 本次明确不做:
  - 不新增、删除或改名 public API route。
  - 不改审批、确认、合同、提成、项目、线索或客户的业务状态机含义。
  - 不治理 `ConfirmationRecord.status` / participant status / confirmation type，本次只治理其派生 `TodoItem` 写入边界。
  - 不治理合同、提成、成本等业务对象自己的状态字段；这些继续由 `EX-56D` 承接。
  - 不将 `CommandResult.resultStatus` / `businessStatusAfter` 收窄为单一枚举，因为它们承载不同业务域结果。
  - 不引入 PostgreSQL enum type，继续使用 `varchar + check constraint`。
- 下游可依赖的交付边界:
  - 统一待办 / 审批列表返回值中的核心分类、状态、优先级和对象类型在 contract、OpenAPI、generated client、entity、DB check 之间一致。
  - 后端写入 `ApprovalRecord` / `TodoItem` 时使用 shared value object，不再在关键路径手写裸字符串。
  - Admin 工作台、顶栏和 `todo-navigation` 以 generated enum 消费待办状态和类型。
- 不允许下游依赖的留白:
  - 不代表所有 `targetType` / `sourceType` 字段都已治理；审计、附件、成本、财务等域另片处理。
  - 不代表所有 UI 文案 key / action key 都需要被强制枚举化；`allowedActions` 仍是操作动作集合，本片保持原 contract。

## 2. 正式输入

| Input Type                | Document / Source                                                              | Section / Anchor                          | Status | Notes                                                                        |
| ------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| Business design           | `docs/design/ex-56-domain-enum-literal-governance-baseline.md`                 | Downstream slicing / `EX-56B`             | Active | 冻结待办 / 审批 / target object type 为第二优先级枚举治理域。                |
| Command design            | `apps/poms-api/src/app/features/approval/approval.service.ts`                  | approval and todo commands                | Active | 本片仅替换值表达，不新增审批命令。                                           |
| Command design            | `apps/poms-api/src/app/features/approval/confirmation.service.ts`              | confirmation todo derivation              | Active | 本片只治理确认流派生 `TodoItem` 的 source/type/status/priority。             |
| Command design            | `apps/poms-api/src/app/features/sales-follow-up/sales-follow-up.repository.ts` | reminder todo sync                        | Active | 本片治理销售跟进提醒写入 `TodoItem` 的 enum-like 字段。                      |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`                            | Approval / Todo section                   | Active | 当前 `ApprovalRecordSummary` / `TodoItemSummary` 多个字段仍为 `z.string()`。 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                 | approval and todo routes                  | N/A    | 不新增、删除或改名 route surface；仅响应 schema enum 收紧。                  |
| Query boundary            | `ApprovalService.findOpenTodosForUser`                                         | `GET /me/todos` projection                | Active | 需要保护工作台、顶栏与 deep-link 消费字段。                                  |
| Data model / table freeze | `approval-record.entity.ts` / `todo-item.entity.ts`                            | enum-like columns                         | Active | 需要 `$type<T>()` 与 check constraint 对齐。                                 |
| Schema / DDL              | `Migration20260322235500_init_approval_and_todo`                               | `poms.approval_record` / `poms.todo_item` | Active | 初始表未带 check constraint，本片新增前滚迁移补齐。                          |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                  | route grammar                             | Active | route surface 不变。                                                         |

## 3. 本次 SSOT

| Concern                     | SSOT                                                                    | Implementation Rule                                                             |
| --------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Business semantics          | `shared-contracts` 中 EX-56B 新增的 const array / schema / value object | 后端写入和比较统一使用 value object；前端消费 generated enum。                  |
| Public route canonical path | `api-route-canonical-inventory.md`                                      | 本片不改 route。                                                                |
| Route / command naming      | Existing approval controller / service                                  | 不新增命令，现有命名保持。                                                      |
| DTO / contract naming       | `ApprovalRecordSummarySchema` / `TodoItemSummarySchema`                 | 宽泛 `z.string()` 改为对应 enum schema。                                        |
| Table / column naming       | Existing `poms.approval_record` / `poms.todo_item` columns              | 不改列名，仅补 check。                                                          |
| Date / time semantics       | Existing approval / todo schemas                                        | 不改变时间字段。                                                                |
| Identifier semantics        | Existing UUID semantics                                                 | `sourceId` / `targetObjectId` 保持 UUID，不改通用引用模型。                     |
| Money / decimal semantics   | N/A                                                                     | 不触及金额字段。                                                                |
| Status machine              | `ApprovalStatusValue` / `ApprovalDecisionValue` / `TodoStatusValue`     | `pending/approved/rejected` 与 `open/processing/completed/canceled` 固定。      |
| Target object registry      | `TargetObjectTypeValue`                                                 | 本片仅纳入当前 Todo / Approval / Confirmation / Sales reminder 已使用对象类型。 |

## 4. 命令与接口边界

| Route / Controller                         | Command / Service                                                       | Request DTO / Contract              | Response DTO / Contract       | Guard / Permission | Design Source  | Result                    |
| ------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------- | ----------------------------- | ------------------ | -------------- | ------------------------- |
| `GET /me/todos`                            | `ApprovalService.findOpenTodosForUser`                                  | N/A                                 | `TodoItemListSchema`          | authenticated      | existing route | route unchanged, enum DTO |
| `GET /approval-records/:id`                | `ApprovalService.findApprovalRecordById`                                | N/A                                 | `ApprovalRecordSummarySchema` | `project:read`     | existing route | route unchanged, enum DTO |
| `POST /approval-records/:id:approve`       | `ApprovalService.approveRecord`                                         | `ApproveRecordRequestSchema`        | `CommandResultSchema`         | `project:write`    | existing route | route unchanged           |
| `POST /approval-records/:id:reject`        | `ApprovalService.rejectRecord`                                          | `RejectApprovalRecordRequestSchema` | `CommandResultSchema`         | `project:write`    | existing route | route unchanged           |
| existing contract review submission route  | `ApprovalService.submitContractReview`                                  | `SubmitContractReviewRequestSchema` | `CommandResultSchema`         | existing guard     | existing route | route unchanged           |
| existing commission approval submit routes | `submitCommissionPayoutApproval` / `submitCommissionAdjustmentApproval` | existing request schemas            | `CommandResultSchema`         | existing guard     | existing route | route unchanged           |
| internal confirmation service calls        | `ConfirmationService.create/confirm/close`                              | internal input interfaces           | `CommandResultSchema`         | caller-owned       | existing code  | no public route change    |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing approval, contract, commission and `GET /me/todos` routes only.
- Current implemented route(s): existing routes only.
- Inventory status: `aligned`
- Route governance source: `ADR-015`
- Blocker / exception: N/A; no route surface change.

## 5. 读侧边界

| Query / View                  | Consumer                     | Fields                                                                               | Filter / Sort          | Permission Boundary | Design Source    | Result                                  |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------ | ---------------------- | ------------------- | ---------------- | --------------------------------------- |
| `findOpenTodosForUser`        | Admin topbar / workbench     | `sourceType`, `todoType`, `businessDomain`, `targetObjectType`, `status`, `priority` | open / processing only | current user        | shared contracts | typed enum result                       |
| `mapTodoItemToSummary`        | Admin deep-link navigation   | same as above plus `allowedActions`                                                  | N/A                    | current user        | shared contracts | enum fields, action list remains string |
| `findApprovalRecordById`      | Contract / commission stores | `approvalType`, `businessDomain`, `targetObjectType`, `currentStatus`, `decision`    | by id                  | `project:read`      | shared contracts | typed enum result                       |
| `findLatestApprovalForTarget` | Contract current approval    | same as approval summary                                                             | latest by target       | caller-owned        | shared contracts | typed enum result                       |
| `todo-navigation.ts`          | Admin route decision         | `sourceType`, `todoType`, `targetObjectType`, `status`                               | N/A                    | frontend only       | generated client | consume generated enum                  |

## 6. 持久化边界

| Table                  | Migration                                                     | Entity / Repository | DDL / Freeze Source         | Check Result |
| ---------------------- | ------------------------------------------------------------- | ------------------- | --------------------------- | ------------ |
| `poms.approval_record` | new `Migration20260501120000_ex56b_todo_approval_enum_checks` | `ApprovalRecord`    | EX-56B shared value objects | add checks   |
| `poms.todo_item`       | new `Migration20260501120000_ex56b_todo_approval_enum_checks` | `TodoItem`          | EX-56B shared value objects | add checks   |

| Field                                | Design Type / Meaning | Migration / DDL                                                                                 | Entity | Shared Contract / OpenAPI | Result |
| ------------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------- | ------ | ------------------------- | ------ |
| `approval_record.approval_type`      | `ApprovalType`        | check in `contract-review,commission-payout-approval,commission-adjustment-approval`            | typed  | `ApprovalTypeSchema`      | align  |
| `approval_record.business_domain`    | `BusinessDomain`      | check in `contract-finance,commission,sales,project-handover`                                   | typed  | `BusinessDomainSchema`    | align  |
| `approval_record.target_object_type` | `TargetObjectType`    | check in `Contract,CommissionPayout,CommissionAdjustment,Project,Lead,Customer,ProjectHandover` | typed  | `TargetObjectTypeSchema`  | align  |
| `approval_record.current_status`     | `ApprovalStatus`      | check in `pending,approved,rejected`                                                            | typed  | `ApprovalStatusSchema`    | align  |
| `approval_record.decision`           | `ApprovalDecision`    | nullable check in `approved,rejected`                                                           | typed  | `ApprovalDecisionSchema`  | align  |
| `todo_item.source_type`              | `TodoSourceType`      | check in `ApprovalRecord,ConfirmationRecord,SalesFollowUpRecord`                                | typed  | `TodoSourceTypeSchema`    | align  |
| `todo_item.todo_type`                | `TodoType`            | check in `approval,confirmation,sales_follow_up_reminder`                                       | typed  | `TodoTypeSchema`          | align  |
| `todo_item.business_domain`          | `BusinessDomain`      | check in `contract-finance,commission,sales,project-handover`                                   | typed  | `BusinessDomainSchema`    | align  |
| `todo_item.target_object_type`       | `TargetObjectType`    | check in `Contract,CommissionPayout,CommissionAdjustment,Project,Lead,Customer,ProjectHandover` | typed  | `TargetObjectTypeSchema`  | align  |
| `todo_item.status`                   | `TodoStatus`          | check in `open,processing,completed,canceled`                                                   | typed  | `TodoStatusSchema`        | align  |
| `todo_item.priority`                 | `TodoPriority`        | check in `low,normal,high,urgent`; current writers only emit `normal/high`                      | typed  | `TodoPrioritySchema`      | align  |

### 6.1 开发库取值证据

`2026-05-01` 用 `D:\Program Files\PostgreSQL\17\bin\psql.exe` 只读查询开发库:

- `approval_record`: `approval_type = contract-review`; `business_domain = contract-finance`; `target_object_type = Contract`; `current_status = pending/approved/rejected`; `decision = approved/rejected/null`。
- `todo_item`: `source_type = ApprovalRecord`; `todo_type = approval`; `business_domain = contract-finance`; `target_object_type = Contract`; `status = open/completed/canceled`; `priority = high`。
- 代码路径还会写入 `commission`、`sales`、`project-handover`、`CommissionPayout`、`CommissionAdjustment`、`Project`、`Lead`、`Customer`、`ProjectHandover`、`ConfirmationRecord`、`SalesFollowUpRecord`、`confirmation`、`sales_follow_up_reminder`、`normal`，因此 migration check 不能只按当前库已有值收窄。

## 7. 一致性结论

- Document -> code: `EX-56` 要求待办、审批、目标对象类型在 `EX-56B` 收口；本片范围与 tracker 一致。
- ADR-015 inventory -> route: 不变更 route，未发现 route governance blocker。
- Migration -> entity: 需要新增 check migration 并同步 entity `checks`。
- Entity -> contract: 需要 entity `$type<T>()` 与 shared schema 对齐。
- Route -> command: 命令不变，仅返回 DTO enum 表达和运行时常量来源收紧。
- Query -> view: `GET /me/todos` 必须继续返回工作台、顶栏和 deep-link 所需字段，不允许丢失销售跟进提醒入口。
- Guard / permission: 不改变权限。
- OpenAPI / generated client: 需要运行 `shared-api-client:generate` 与 `shared-api-client:check`，确认 generated client 生成并导出新增 enum。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                                      | Result  | Gap / Reason |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------ |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access`                                                         | Pending |              |
| Build                            | Yes      | `corepack pnpm nx build shared-contracts`; `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                                       | Pending |              |
| Focused backend tests            | Yes      | `corepack pnpm nx test poms-api --runInBand --runTestsByPath src/app/features/approval/approval.service.spec.ts src/app/features/approval/confirmation.service.spec.ts` | Pending |              |
| Focused frontend tests           | Yes      | `corepack pnpm nx test poms-admin --runInBand --runTestsByPath src/app/shared/navigation/todo-navigation.spec.ts`                                                       | Pending |              |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`; `corepack pnpm nx test poms-admin --runInBand`                                                                            | Pending |              |
| API / integration tests          | Optional | No route surface change; focused service/controller and full unit suites are sufficient unless OpenAPI or migration check exposes drift.                                | Pending |              |
| E2E                              | No       | Not required; no new browser workflow or route.                                                                                                                         | N/A     |              |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check`                                                                       | Pending |              |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check`                                                                           | Pending |              |
| Markdown                         | Yes      | `corepack pnpm run format:md:check`                                                                                                                                     | Pending |              |
| Whitespace                       | Yes      | `git diff --check`                                                                                                                                                      | Pending |              |

## 9. 例外与风险

| Exception ID                         | Level  | Scope                                            | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                   |
| ------------------------------------ | ------ | ------------------------------------------------ | ----------- | ------------- | ----------- | ----------------------------------------------------------------------- |
| `EX56B-E1-COMMAND-RESULT-OPEN`       | Medium | `CommandResult.resultStatus/businessStatusAfter` | Codex       | `EX-56D`      | Future      | 该 DTO 是跨业务命令结果承载，不在本片强制收窄为统一 enum。              |
| `EX56B-E2-CONFIRMATION-STATUS-DEFER` | Low    | `ConfirmationRecord.status` / participant status | Codex       | Future slice  | Future      | 本片只治理确认流派生 `TodoItem`，不调整确认实例状态机。                 |
| `EX56B-E3-ACTION-LIST-OPEN`          | Low    | `TodoItemSummary.allowedActions`                 | Codex       | `EX-57`       | G1          | 当前只包含 approval actions，未来可由 action registry / enum 单独治理。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-01`
- Conditions:
  - Implementation must not introduce new route surface.
  - Runtime comparisons for Todo / Approval / business object identifiers should use shared value object or generated enum equivalent.
  - Generated client changes must be produced by OpenAPI generation, not hand-edited.
  - Migration must add check constraints after confirming existing dev DB values are compatible.
