# EX-09A 冻结版本主表升级 实施基线包

- Gate Status: `Pass`
- Parent: `EX-09`
- Owner: `Codex`
- Slice Type: `persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-16`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-09A`

## 1. 范围

- 本次目标:
  1. 把现有 `commission_role_assignment` 从第一阶段简化版本升级为 `L3` 冻结版本主表。
  2. 补齐冻结版本与移交收口链之间的稳定引用字段、索引与外键。
  3. 保留 `supersedes_id` 替代链，使后续 `EX-09B` 可以在不改表结构的前提下落冻结、再基线化与替代版本命令。
- 本次明确不做:
  1. 不实现 `freezeCommissionRoleAssignment` 与冻结后争议 / 受控变更命令链。
  2. 不实现 `CommissionRoleAssignmentDetailView`、`CommissionStageGateView` 等读侧。
  3. 不落地冻结后争议 / 仲裁 / 替代申请主链；该部分留给后续 `EX-09D` / `EX-12`。
  4. 不在本切片回写 OpenAPI / generated client。
- 下游可依赖的交付边界:
  1. `commission_role_assignment` 已具备冻结版本链所需的稳定引用字段与外键锚点。
  2. `EX-09B` 可以直接基于 `source_handover_id`、`source_handover_rebaseline_record_id`、`contract_summary_snapshot_id`、`handover_summary_snapshot_id`、`effective_handover_baseline_snapshot_id` 与 `supersedes_id` 实现命令 / query。
- 不允许下游依赖的留白:
  1. 当前新增引用字段在 `EX-09A` 阶段允许为空，直到 `EX-09B` 的冻结命令正式接管填充与 guard。
  2. 下游不得把现有 `createRoleAssignment` / `freezeRoleAssignment` 解释为已满足 `L3` 正式冻结链语义。

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor                                 | Status   | Notes                                                               |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------ | -------- | ------------------------------------------------------------------- |
| Business design           | `phase2-commission-freeze-at-handover.md`                         | `6.7`, `7`, `8`, `9`                             | Accepted | 固定冻结结果、联合追溯链与后续主线输入                              |
| Business design           | `phase2-handover-closure-rules.md`                                | `3.3`, `4`, `6.2`                                | Accepted | 固定移交完成与提成冻结联合收口条件                                  |
| Command design            | `interface-command-design.md`                                     | `4.3`, `§8`                                      | Accepted | `freezeCommissionRoleAssignment` 需消费移交收口链，但不在本切片实现 |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | 冻结版本字段、第三批 DTO 约束                    | Accepted | 本切片不回写 DTO，只确保后续字段有持久化落点                        |
| Query boundary            | `query-view-boundary-design.md`                                   | `5.3 CommissionRoleAssignmentDetailView`         | Accepted | 本切片只提供后续 query 所需持久化字段                               |
| Data model / table freeze | `table-structure-freeze-design.md`                                | `4.3`, `7.4H`                                    | Accepted | 固定 `commission_role_assignment` 最小字段组                        |
| Schema / DDL              | `schema-ddl-design.md`                                            | `4. commission_role_assignment 字段补点`, `7.4H` | Accepted | 固定新增字段、外键与索引                                            |
| Upstream implementation   | `ex-08-contract-handover-gate-baseline.md`                        | `210`, `232`                                     | Pass     | `EX-08` 已提供稳定的移交、摘要、再基线和条款快照引用                |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | `gates`                                          | Accepted | 本切片按新 slice 的 `G1` 基线执行                                   |

## 3. 本次 SSOT

| Concern                   | SSOT                                                                                                                                                                    | Implementation Rule                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Business semantics        | 冻结版本必须绑定同一条 `合同承接摘要 -> 移交确认摘要 -> 当前移交前有效基线 -> 可选再基线` 收口链                                                                        | 本切片先补稳定引用字段，不在 service 中伪造或推断这些引用                                        |
| Route / command naming    | `freezeCommissionRoleAssignment`、冻结后争议 / 受控变更命令链                                                                                                           | 本切片不新增 route / command                                                                     |
| DTO / contract naming     | 现有 `CommissionRoleAssignmentSummary` 暂不扩展                                                                                                                         | 本切片不改 shared contracts / OpenAPI                                                            |
| Table / column naming     | `source_handover_id`、`source_handover_rebaseline_record_id`、`contract_summary_snapshot_id`、`handover_summary_snapshot_id`、`effective_handover_baseline_snapshot_id` | 与 `schema-ddl-design.md` / `table-structure-freeze-design.md` 保持同名                          |
| Date / time semantics     | `frozen_at` 为 `timestamptz`；引用字段无日期语义                                                                                                                        | 不新增 `date` 字段                                                                               |
| Identifier semantics      | 所有新链路引用均为内部 UUID，可空再基线引用保留 nullable                                                                                                                | 仅 `source_handover_rebaseline_record_id` 允许长期可空；其余字段先物理可空、语义上待 EX-09B 填充 |
| Money / decimal semantics | 本切片不涉及金额字段                                                                                                                                                    | N/A                                                                                              |
| Status machine            | 维持现有 `draft / frozen / superseded`，替代链仍用 `supersedes_id`                                                                                                      | 不在本切片扩展新的业务状态                                                                       |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source                      | Result       |
| ------------------ | ----------------- | ---------------------- | ----------------------- | ------------------ | ---------------------------------- | ------------ |
| N/A                | N/A               | N/A                    | N/A                     | N/A                | `interface-command-design.md` §4.3 | 本切片不实现 |

## 5. 读侧边界

| Query / View                         | Consumer               | Fields                                                                                                              | Filter / Sort | Permission Boundary | Design Source                        | Result               |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------- | ------------------------------------ | -------------------- |
| `CommissionRoleAssignmentDetailView` | 冻结确认页、通知、导出 | `sourceHandoverId`、`contractSummarySnapshotId`、`handoverSummarySnapshotId`、`effectiveHandoverBaselineSummary` 等 | N/A           | 沿用后续 `EX-09B`   | `query-view-boundary-design.md` §5.3 | 本切片仅落持久化字段 |

## 6. 持久化边界

| Table                        | Migration                                                  | Entity / Repository                                 | DDL / Freeze Source                                                   | Check Result |
| ---------------------------- | ---------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- | ------------ |
| `commission_role_assignment` | `Migration20260416130000_ex09a_commission_freeze_chain.ts` | `CommissionRoleAssignment` / `CommissionRepository` | `table-structure-freeze-design.md` §4.3, `schema-ddl-design.md` §7.4H | Pass         |

| Field                                     | Design Type / Meaning      | Migration / DDL                 | Entity                                | Shared Contract / OpenAPI | Result |
| ----------------------------------------- | -------------------------- | ------------------------------- | ------------------------------------- | ------------------------- | ------ |
| `source_handover_id`                      | 冻结版本来源移交记录       | 新增 nullable uuid + FK + index | `sourceHandoverId`                    | 后续 `EX-09B` 回写        | Pass   |
| `source_handover_rebaseline_record_id`    | 来源移交前再基线记录，可空 | 新增 nullable uuid + FK + index | `sourceHandoverRebaselineRecordId`    | 后续 `EX-09B` 回写        | Pass   |
| `contract_summary_snapshot_id`            | 来源合同承接摘要快照       | 新增 nullable uuid + FK         | `contractSummarySnapshotId`           | 后续 `EX-09B` 回写        | Pass   |
| `handover_summary_snapshot_id`            | 来源移交确认摘要快照       | 新增 nullable uuid + FK + index | `handoverSummarySnapshotId`           | 后续 `EX-09B` 回写        | Pass   |
| `effective_handover_baseline_snapshot_id` | 来源移交前有效基线快照     | 新增 nullable uuid + FK         | `effectiveHandoverBaselineSnapshotId` | 后续 `EX-09B` 回写        | Pass   |
| `supersedes_id`                           | 替代冻结版本链             | 维持既有 FK + index             | `supersedesId`                        | 现有                      | Pass   |

## 7. 一致性结论

- Document -> code: 现有代码仅满足第一阶段简化角色分配版本表，尚未满足 `L3` 冻结版本联合追溯语义；本切片负责补齐字段锚点。
- Migration -> entity: 新增列、外键、索引需与 `CommissionRoleAssignment` 实体同名对齐。
- Entity -> contract: 本切片允许实体先超前于共享契约，公开 DTO / OpenAPI 延后到 `EX-09B`。
- Route -> command: 不新增 route / command。
- Query -> view: 不新增 query，只为后续 view 准备持久化来源。
- Guard / permission: 冻结前置条件、联合追溯一致性与必填校验留给 `EX-09B`。
- OpenAPI / generated client: 不在本切片执行。

## 8. 测试与校验

| Check                            | Required    | Command / Evidence                                  | Result | Gap / Reason                                  |
| -------------------------------- | ----------- | --------------------------------------------------- | ------ | --------------------------------------------- |
| Build                            | Yes         | `corepack pnpm nx build poms-api`                   | Pass   | 2026-04-16 已执行                             |
| Unit tests                       | Yes         | `corepack pnpm nx test poms-api --runInBand`        | Pass   | 2026-04-16 已执行，29 suites / 323 tests 通过 |
| API / integration tests          | No          | N/A                                                 | Waived | 本切片不改 controller / command               |
| E2E                              | Conditional | `corepack pnpm nx run poms-api-e2e:e2e --runInBand` | Pass   | 2026-04-16 已执行，10 suites / 58 tests 通过  |
| OpenAPI generation / client diff | No          | N/A                                                 | Waived | 本切片不改公开契约                            |
| Migration / schema check         | Yes         | `corepack pnpm nx run poms-api:migration-check`     | Pass   | 2026-04-16 已执行，schema is up-to-date       |

## 9. 例外与风险

| Exception ID | Level | Scope                                                   | Approved By                | Cleanup Owner | Cleanup Due     | Notes                                                                                                   |
| ------------ | ----- | ------------------------------------------------------- | -------------------------- | ------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `EX-09A-E01` | `L`   | `commission_role_assignment` 新增来源引用字段先物理可空 | `Solo worktree checkpoint` | `Codex`       | `EX-09B` 完成前 | 因现有冻结命令未落地，本切片先补持久化锚点；`EX-09B` 必须补 guard 与填充，之后再决定是否收紧为 not null |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-16`
- Conditions:
  1. `EX-09A` 仅交付持久化主表升级，不提前宣称冻结链命令 / query 已完成。
  2. `EX-09B` 必须承接本表新增来源引用字段，补齐冻结命令、读侧与 guard。
