# EX-09B 提成冻结命令与详情 query 收口 实施基线包

- Gate Status: `Pass`
- Parent: `EX-09`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-16`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-09B`

## 1. 范围

- 本次目标:
  1. 实现正式的提成冻结命令，确保 `CommissionRoleAssignment` 冻结时绑定同一条 `合同承接摘要 -> 移交确认摘要 -> 当前移交前有效基线 -> 可选再基线` 收口链。
  2. 补齐 `CommissionRoleAssignmentDetailView` 最小读侧，向冻结确认页、通知和后续导出提供稳定的冻结追溯字段与 `allowedActions`。
  3. 回写 shared contract / DTO / controller / service / repository / 单测，使 `EX-09A` 新增字段真正被命令与 query 消费。
- 本次明确不做:
  1. 不实现 `submitCommissionRoleChange` 审批链与替代冻结版本命令；该部分留给后续 `EX-09D` / `EX-12`。
  2. 不引入新的持久化表或新的 migration；本切片只消费 `EX-09A` 已落的字段。
  3. 不把旧的 `/commission/projects/:projectId/role-assignment/:id/freeze` 兼容路由升级为强制联合追溯命令；旧路由仅保留兼容壳。
- 下游可依赖的交付边界:
  1. 新增正式冻结命令会强校验 `sourceHandoverId`、`handoverSummarySnapshotId`、当前回款判断冻结来源与再基线引用一致性。
  2. 新增详情 query 会暴露 `sourceHandoverId`、`contractSummarySnapshotId`、`handoverSummarySnapshotId`、`effectiveHandoverBaselineSummary`、`receiptJudgmentModeSummary`、`summarySnapshotId`、`projectionLevel`、`exportPolicy` 与 `allowedActions`。
  3. 旧兼容路由仍可供现有 e2e 与历史调用方使用，但不宣称满足 `L3` 正式冻结链语义。
- 不允许下游依赖的留白:
  1. 本切片不提供冻结后变更申请、争议仲裁或替代版本提交。
  2. 本切片不把 `CommissionStageGateView` 扩展到完整 `L4/L5` 阶段 gate。

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor                                               | Status   | Notes                                                        |
| ------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| Business design           | `phase2-commission-freeze-at-handover.md`                         | `6.7`, `7`, `8`, `9`                                           | Accepted | 固定冻结对象、冻结结果与追溯链                               |
| Business design           | `phase2-handover-closure-rules.md`                                | `3.3`, `4`, `6.2`                                              | Accepted | 提成冻结必须消费移交收口链                                   |
| Command design            | `interface-command-design.md`                                     | `4.3`, `§8`, `257`                                             | Accepted | `freezeCommissionRoleAssignment` 必须与移交链共用稳定引用    |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | `freezeCommissionRoleAssignment`, `submitCommissionRoleChange` | Accepted | 需补冻结命令 request / result DTO；`submitChange` 留后续切片 |
| Query boundary            | `query-view-boundary-design.md`                                   | `5.3 CommissionRoleAssignmentDetailView`                       | Accepted | 本切片实现最小详情 view                                      |
| Data model / table freeze | `table-structure-freeze-design.md`                                | `4.3`, `7.4H`                                                  | Accepted | `commission_role_assignment` 继续作为冻结版本主表            |
| Schema / DDL              | `schema-ddl-design.md`                                            | `7.4H`, 联合追溯字段与 `supersedes`                            | Accepted | `EX-09A` 已完成物理字段落点，本切片不新增 DDL                |
| Upstream implementation   | `ex-09a-commission-freeze-version-baseline.md`                    | 全文                                                           | Pass     | `EX-09A` 已交付冻结主表字段、FK、索引                        |
| Upstream implementation   | `ex-08-contract-handover-gate-baseline.md`                        | `EX-08B3A`, `EX-08B3B1`, `EX-08C1`                             | Pass     | `ProjectHandover`、摘要快照、回款判断冻结与再基线链已可用    |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | `gates`                                                        | Accepted | 本切片按 `G1/G2/G3` 继续推进                                 |

## 3. 本次 SSOT

| Concern                   | SSOT                                                                                                                                                                    | Implementation Rule                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Business semantics        | 正式冻结命令必须消费同一条 `合同承接摘要 -> 移交确认摘要 -> 冻结版本` 收口链，并与当前回款判断冻结来源、再基线引用保持一致                                              | 只有新正式命令写入来源字段；旧兼容路由不补全该语义                                                                      |
| Route / command naming    | 命令名为 `freezeCommissionRoleAssignment`；设计草案路由写作 `POST /commission-role-assignments/{id}:freeze`                                                             | API 实现采用 `POST /commission-role-assignments/:id/freeze`，保留旧 `/commission/projects/:projectId/.../freeze` 兼容壳 |
| DTO / contract naming     | `FreezeCommissionRoleAssignmentRequest`、`FreezeCommissionRoleAssignmentResult`、`CommissionRoleAssignmentDetailView`                                                   | shared contract、DTO、controller 返回类型必须同名收口                                                                   |
| Table / column naming     | `source_handover_id`、`source_handover_rebaseline_record_id`、`contract_summary_snapshot_id`、`handover_summary_snapshot_id`、`effective_handover_baseline_snapshot_id` | 不新增别名字段；service 与 query 直接消费 `EX-09A` 已落列                                                               |
| Date / time semantics     | `frozenAt`、`generatedAt`、摘要时间均为 `datetime` / ISO timestamp                                                                                                      | 不引入 `date` 级字段                                                                                                    |
| Identifier semantics      | 所有联合追溯引用为内部 UUID；`expectedVersion` 对应 `rowVersion`                                                                                                        | request / response / entity 全部用 UUID 与 rowVersion                                                                   |
| Money / decimal semantics | 本切片不新增金额口径                                                                                                                                                    | N/A                                                                                                                     |
| Status machine            | 持久化状态仍为 `draft / frozen / superseded`；允许动作由 query 解释，不在本切片扩展新状态                                                                               | `allowedActions` 收口为 `freeze-commission-role-assignment`、`submit-commission-role-change`                            |

## 4. 命令与接口边界

| Route / Controller                                                | Command / Service                | Request DTO / Contract                  | Response DTO / Contract                | Guard / Permission                                                                                                                                       | Design Source                                                                    | Result         |
| ----------------------------------------------------------------- | -------------------------------- | --------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------- |
| `POST /commission-role-assignments/:id/freeze`                    | `freezeCommissionRoleAssignment` | `FreezeCommissionRoleAssignmentRequest` | `FreezeCommissionRoleAssignmentResult` | `commission:assignments:manage`；校验 assignment draft、`expectedVersion`、来源 `ProjectHandover`、`handoverSummarySnapshotId`、当前回款判断冻结来源一致 | `interface-command-design.md` §4.3, `interface-openapi-dto-design.md` 冻结命令行 | 本切片实现     |
| `POST /commission/projects/:projectId/role-assignment/:id/freeze` | `freezeRoleAssignmentLegacy`     | N/A                                     | `CommissionRoleAssignmentSummary`      | 沿用现有阶段 guard                                                                                                                                       | 既有接口                                                                         | 本切片保留兼容 |

## 5. 读侧边界

| Query / View                                                                         | Consumer                             | Fields                                                                                                                                                                                                                                                                | Filter / Sort           | Permission Boundary             | Design Source                        | Result             |
| ------------------------------------------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------- | ------------------------------------ | ------------------ |
| `GET /commission-role-assignments/:id/detail` / `CommissionRoleAssignmentDetailView` | 冻结确认页、通知、打印材料、导出预览 | `freezeVersionSummary`、`sourceHandoverId`、`contractSummarySnapshotId`、`handoverSummarySnapshotId`、`effectiveHandoverBaselineSummary`、`receiptJudgmentModeSummary`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`allowedActions` | 按 `id` 单条读取        | `commission:assignments:manage` | `query-view-boundary-design.md` §5.3 | 本切片实现最小视图 |
| `GET /commission/projects/:projectId/role-assignment`                                | 既有项目页 current summary           | 扩展后的 `CommissionRoleAssignmentSummary`                                                                                                                                                                                                                            | `projectId + isCurrent` | `commission:assignments:manage` | 既有接口                             | 本切片沿用         |

## 6. 持久化边界

| Table                             | Migration                                                        | Entity / Repository                                              | DDL / Freeze Source                | Check Result |
| --------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- | ------------ |
| `commission_role_assignment`      | `Migration20260416130000_ex09a_commission_freeze_chain.ts`       | `CommissionRoleAssignment` / `CommissionRepository`              | `schema-ddl-design.md` §7.4H       | Pass         |
| `project_handover`                | `Migration20260415103000_ex08a1_project_handover.ts`             | `ProjectHandover` / `CommissionRepository` 只读消费              | `schema-ddl-design.md` / `EX-08A1` | Pass         |
| `project_receipt_judgment_freeze` | `Migration20260415152000_ex08b3b0_contract_amendment_minimal.ts` | `ProjectReceiptJudgmentFreeze` / `CommissionRepository` 只读消费 | `EX-08B3A` / `EX-08B3B1`           | Pass         |
| `approval_summary_snapshot`       | `Migration20260415120000_ex08a2_approval_summary.ts`             | `ApprovalSummarySnapshot` / `CommissionRepository` 只读消费      | `EX-08A2`                          | Pass         |

| Field                                                                              | Design Type / Meaning      | Migration / DDL                | Entity                                | Shared Contract / OpenAPI                                       | Result           |
| ---------------------------------------------------------------------------------- | -------------------------- | ------------------------------ | ------------------------------------- | --------------------------------------------------------------- | ---------------- |
| `commission_role_assignment.source_handover_id`                                    | 冻结版本来源移交记录       | `EX-09A` 已落 uuid FK          | `sourceHandoverId`                    | `CommissionRoleAssignmentSummary`、`DetailView`、`FreezeResult` | 本切片写入并读出 |
| `commission_role_assignment.source_handover_rebaseline_record_id`                  | 来源移交前再基线记录，可空 | `EX-09A` 已落 nullable uuid FK | `sourceHandoverRebaselineRecordId`    | `CommissionRoleAssignmentSummary`、`DetailView`                 | 本切片写入并读出 |
| `commission_role_assignment.contract_summary_snapshot_id`                          | 来源合同承接摘要快照       | `EX-09A` 已落 uuid FK          | `contractSummarySnapshotId`           | `CommissionRoleAssignmentSummary`、`DetailView`、`FreezeResult` | 本切片写入并读出 |
| `commission_role_assignment.handover_summary_snapshot_id`                          | 来源移交确认摘要快照       | `EX-09A` 已落 uuid FK          | `handoverSummarySnapshotId`           | `CommissionRoleAssignmentSummary`、`DetailView`、`FreezeResult` | 本切片写入并读出 |
| `commission_role_assignment.effective_handover_baseline_snapshot_id`               | 来源移交前有效基线快照     | `EX-09A` 已落 uuid FK          | `effectiveHandoverBaselineSnapshotId` | `CommissionRoleAssignmentSummary`、`DetailView`、`FreezeResult` | 本切片写入并读出 |
| `project_receipt_judgment_freeze.source_handover_*`                                | 当前回款判断冻结来源一致性 | `EX-08` 已落                   | 只读校验                              | 不直接对外暴露完整对象，仅映射为 `receiptJudgmentModeSummary`   | 本切片校验并摘要 |
| `approval_summary_snapshot.summary_package_key / projection_level / export_policy` | 冻结摘要输出策略           | `EX-08A2` 已落                 | 只读消费                              | `DetailView`、`FreezeResult`                                    | 本切片读出       |

## 7. 一致性结论

- Document -> code: `EX-09A` 前代码仍是简化冻结；`EX-09B` 开始把设计稿中的联合追溯字段、冻结结果和详情 view 真正接到写侧 / 读侧。
- Migration -> entity: 本切片不新增 migration，只允许消费 `EX-09A` 和 `EX-08` 已落字段；若 service / query 需要字段，必须来自现有实体。
- Entity -> contract: `CommissionRoleAssignmentSummary`、`FreezeCommissionRoleAssignmentResult` 与 `CommissionRoleAssignmentDetailView` 统一暴露来源链字段，禁止前端临时重构。
- Route -> command: 正式命令走新 top-level controller；旧 `/commission/projects/:projectId/...` 路由保留兼容，不宣称满足新 command 语义。
- Query -> view: `detail` query 必须输出 `summarySnapshotId`、`projectionLevel`、`exportPolicy` 和 `allowedActions`，并可回到同一 `handoverSummarySnapshotId`。
- Guard / permission: 正式冻结命令必须同时校验 assignment、handover、summary snapshot、receipt judgment freeze 来源与再基线链。
- OpenAPI / generated client: shared contract / DTO 变化需要同步 OpenAPI 生成与 client 检查。

## 8. 测试与校验

| Check                    | Required    | Command / Evidence                                                                                               | Result | Gap / Reason                                                                                                                         |
| ------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Build                    | Yes         | `corepack pnpm nx build poms-api`                                                                                | Pass   | 2026-04-16 已执行                                                                                                                    |
| Unit tests               | Yes         | `corepack pnpm nx test poms-api --runInBand`                                                                     | Pass   | 2026-04-16 已执行，30 suites / 330 tests 通过                                                                                        |
| API / integration tests  | Yes         | `commission.controller.spec.ts` / `commission-role-assignment.controller.spec.ts` / `commission.service.spec.ts` | Pass   | 已覆盖新 route、detail query 与联合追溯 guard                                                                                        |
| E2E                      | Conditional | `corepack pnpm nx run poms-api-e2e:e2e --runInBand`                                                              | Pass   | 2026-04-16 已执行，10 suites / 58 tests 通过；legacy 冻结路由未回归                                                                  |
| OpenAPI generation       | Yes         | `corepack pnpm nx run poms-api:openapi`                                                                          | Pass   | 2026-04-16 已执行                                                                                                                    |
| Generated client diff    | Yes         | `corepack pnpm nx run shared-api-client:check`                                                                   | Failed | 2026-04-16 已执行；命令已生成 `commission-role-assignments` client 与新增 models，并因存在预期生成 diff 返回非零，需随本切片一并提交 |
| Migration / schema check | Yes         | `corepack pnpm nx run poms-api:migration-check`                                                                  | Pass   | 2026-04-16 已执行，schema is up-to-date                                                                                              |
| Diff hygiene             | Yes         | `git diff --check`                                                                                               | Pass   | 2026-04-16 已执行；仅提示 generated client 文件 CRLF/LF 警告，无实际 diff error                                                      |

## 9. 例外与风险

| Exception ID | Level | Scope                                                                                      | Approved By                | Cleanup Owner | Cleanup Due          | Notes                                                                                                    |
| ------------ | ----- | ------------------------------------------------------------------------------------------ | -------------------------- | ------------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| `EX-09B-E01` | `L`   | 正式命令路由使用 `/commission-role-assignments/:id/freeze` 而非设计草案中的 `/{id}:freeze` | `Solo worktree checkpoint` | `Codex`       | `EX-09` close-out 前 | 现有 Nest 控制器与仓库接口统一使用 slash-action；若后续要完全对齐 colon-action，需在文档或网关层统一处理 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-16`
- Conditions:
  1. 正式冻结命令与兼容旧路由必须严格区分，不能把 legacy 行为冒充 `L3` 正式冻结链。
  2. 若实现期间发现 `handoverSummarySnapshotId`、回款判断冻结来源或再基线一致性无法通过现有数据拿到，需登记 corrective drift，不得默许前端重构或后端猜值。
