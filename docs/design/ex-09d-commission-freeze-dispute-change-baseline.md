# EX-09D 冻结后争议与受控变更链 实施基线包

- Gate Status: `Pass`
- Parent: `EX-09`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-16`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-09D`

## 1. 范围

- 本次目标:
  1. 裁决 `CommissionRoleChangeRequest` 的正式资源边界，关闭 direct-request 与 dispute-first 的设计冲突。
  2. 冻结 `CommissionFreezeDisputeRecord -> CommissionFreezeChangeRequest -> replacement freeze version` 的命令、查询、持久化与 route canonical 输入。
  3. 为 `EX-09D` 与 `EX-15D` 剩余实现部分提供可直接编码的 G1 基线。
- 本次明确不做:
  1. 本包不直接实现 migration、controller、service 或前端页面代码。
  2. 不保留 `POST /commission-role-change-requests` 作为正式 create 入口。
  3. 不允许前端直接提交预生成的 `replacementFreezeVersionId` 或权威影响摘要。
- 下游可依赖的交付边界:
  1. 冻结后变更主路径必须先创建 `CommissionFreezeDisputeRecord`，再经 `arbitrateCommissionFreezeDispute` 形成 `CommissionFreezeChangeRequest` 与可选替代冻结版本。
  2. canonical route 固定为 `POST /commission-freeze-disputes`、`GET /commission-freeze-disputes/{id}`、`POST /commission-freeze-disputes/{id}:arbitrate` 与 `GET /commission-freeze-change-requests/{id}`。
  3. `commission_freeze_dispute_record` 与 `commission_freeze_change_request` 必须共同承接同一条 `summaryPackageKey / summarySnapshotId / projectionLevel / exportPolicy` 稳定摘要链。
- 不允许下游依赖的留白:
  1. 不允许把 `CommissionRoleChangeRequest` 继续当作 direct create 资源。
  2. 不允许 query、审批通知或导出页各自重算争议影响摘要。
  3. 不允许 `CommissionRoleAssignment` 主表承担争议审批状态机。

## 2. 正式输入

| Input Type                | Document / Source                           | Section / Anchor                    | Status                      | Notes                                                                              |
| ------------------------- | ------------------------------------------- | ----------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| Business design           | `phase2-commission-freeze-at-handover.md`   | `5.5`, `6.7`, `8`, `9`              | Accepted                    | 明确要求冻结后问题先形成争议记录，再进入审批 / 仲裁链                              |
| Business design           | `phase2-handover-closure-rules.md`          | `7.4`, `8`                          | Accepted                    | `L4 / L5` 只能消费统一收口链                                                       |
| Command design            | `interface-command-design.md`               | `4.7`, `245-257`                    | Accepted                    | `submitCommissionFreezeDispute`、`arbitrateCommissionFreezeDispute` 为正式命令边界 |
| Command design            | `interface-command-design.md`               | `4.3`, `submitCommissionRoleChange` | `design-change-required`    | 旧 direct-request / assignment-action 说法被本基线取代                             |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`           | `5.5B`                              | Accepted                    | `EX-09D` 以 dispute-first DTO 为正式输入                                           |
| Query boundary            | `EX-09D` 本基线包                           | `§5`                                | Accepted                    | 仓库内此前无独立 dispute/change query 基线，本包首次冻结读侧边界                   |
| Data model / table freeze | `table-structure-freeze-design.md`          | `318-325`                           | Accepted                    | 两张表已明确定义为冻结后争议主链与受控变更链                                       |
| Schema / DDL              | `schema-ddl-design.md`                      | `722-758`                           | Accepted                    | DDL 已明确 dispute-first 约束、替代冻结版本链与公共摘要链                          |
| ADR                       | `../adr/015-api-route-canonical-grammar.md` | `4`, `6.3`                          | Accepted with clarification | 独立资源化原则保留，但 `EX-09` 的正式资源拆分更正为 dispute-first                  |

## 3. 本次 SSOT

| Concern                   | SSOT                                                                                                                                                                              | Implementation Rule                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Business semantics        | 冻结后问题先形成 `CommissionFreezeDisputeRecord`，仲裁后再形成 `CommissionFreezeChangeRequest` 与可选替代冻结版本                                                                 | `CommissionRoleAssignment` 只承载冻结版本事实与 `supersedes` 链，不承载争议 / 仲裁状态机          |
| Route / command naming    | `POST /commission-freeze-disputes`、`GET /commission-freeze-disputes/{id}`、`POST /commission-freeze-disputes/{id}:arbitrate`、`GET /commission-freeze-change-requests/{id}`      | 不再新增 `POST /commission-role-change-requests`；不把争议 create 退回为 assignment action suffix |
| DTO / contract naming     | `SubmitCommissionFreezeDisputeRequest/Result`、`CommissionFreezeDisputeDetailView`、`ArbitrateCommissionFreezeDisputeRequest/Result`、`CommissionFreezeChangeRequestDetailView`   | 新实现不再新增 `CommissionRoleChangeRequest` create DTO                                           |
| Table / column naming     | `commission_freeze_dispute_record`、`commission_freeze_change_request`、`freeze_version_id`、`dispute_record_id`、`superseded_freeze_version_id`、`replacement_freeze_version_id` | migration、entity、repository 与 OpenAPI 字段映射必须围绕这组名称冻结                             |
| Identifier semantics      | `freezeVersionId`、`disputeRecordId`、`changeRequestId`、`replacementFreezeVersionId` 全部为内部 UUID                                                                             | create / arbitrate request 不重复要求 `projectId` 或预生成 `replacementFreezeVersionId`           |
| Money / decimal semantics | `affectedCalculationSummary`、`affectedPayoutSummary`、`riskFlagSummary` 为服务端固化的稳定结果摘要                                                                               | 仲裁请求不得把影响评估摘要当作权威输入                                                            |
| Status machine            | 争议生命周期只落在 `commission_freeze_dispute_record`，受控变更生命周期只落在 `commission_freeze_change_request`                                                                  | 不新增 assignment 级“变更申请中”直写状态                                                          |

## 4. 命令与接口边界

| Route / Controller                                | Command / Service                  | Request DTO / Contract                                                                                                 | Response DTO / Contract                                                                                                                                                                               | Guard / Permission                                                                               | Design Source                                                                  | Result                                             |
| ------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| `POST /commission-freeze-disputes`                | `submitCommissionFreezeDispute`    | `freezeVersionId`、`disputeReason`、`affectedAssignmentIds[]`、`recalculationImpactMode`、`comment`、`expectedVersion` | `targetId`、`disputeRecordId`、`freezeVersionId`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`businessStatusAfter`                                                                       | 目标冻结版本存在且为可发起争议状态；同一 `freezeVersionId` 不存在未收口争议                      | `phase2-commission-freeze-at-handover.md §5.5`、`schema-ddl-design.md 751-752` | create 入口固定为 dispute-first                    |
| `GET /commission-freeze-disputes/{id}`            | `getCommissionFreezeDispute`       | `id` path param                                                                                                        | `CommissionFreezeDisputeDetailView`                                                                                                                                                                   | 读侧必须能回到同一冻结版本与统一摘要快照                                                         | `table-structure-freeze-design.md 318, 325`                                    | query 为稳定详情资源                               |
| `POST /commission-freeze-disputes/{id}:arbitrate` | `arbitrateCommissionFreezeDispute` | `arbitrationDecision`、`replacementAssignmentPayload`、`recalculationImpactMode`、`comment`、`expectedVersion`         | `targetId`、`disputeRecordId`、`changeRequestId`、`supersededFreezeVersionId`、`replacementFreezeVersionId`、`affectedCalculationSummary`、`affectedPayoutSummary`、`riskFlagSummary`、`resultStatus` | 争议记录已进入待处理态；若结论要求替代版本，则必须同步生成受控 change request 与 `supersedes` 链 | `interface-command-design.md 245-257`、`schema-ddl-design.md 747-758`          | 仲裁命令只产生稳定链路引用，不原地覆盖当前冻结版本 |
| `GET /commission-freeze-change-requests/{id}`     | `getCommissionFreezeChangeRequest` | `id` path param                                                                                                        | `CommissionFreezeChangeRequestDetailView`                                                                                                                                                             | 读侧必须可直接被后续重算 / 发放 / 解释链消费                                                     | `table-structure-freeze-design.md 319, 325`                                    | `CommissionFreezeChangeRequest` 为仲裁结果详情资源 |

## 5. 读侧边界

| Query / View                              | Consumer                               | Fields                                                                                                                                                                                                                                                                                          | Filter / Sort    | Permission Boundary                          | Design Source                                  | Result                   |
| ----------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------- | ---------------------------------------------- | ------------------------ |
| `CommissionFreezeDisputeDetailView`       | 争议详情页、审批通知、冻结阻断解释     | `projectId`、`freezeVersionId`、`disputeReason`、`affectedAssignmentSummary`、`arbitrationStatus`、`recalculationImpactMode`、`impactAssessmentSummary`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`allowedActions`                                          | 按 `id` 单条读取 | 提成冻结治理与审批相关角色可见               | `phase2-commission-freeze-at-handover.md §5.5` | 作为冻结后争议主视图     |
| `CommissionFreezeChangeRequestDetailView` | 仲裁结果页、后续重算 / 发放 / 调整读侧 | `disputeRecordId`、`supersededFreezeVersionId`、`replacementFreezeVersionId`、`arbitrationDecision`、`recalculationImpactMode`、`affectedCalculationSummary`、`affectedPayoutSummary`、`riskFlagSummary`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`status` | 按 `id` 单条读取 | 提成冻结治理、调整治理与最终结算相关角色可见 | `schema-ddl-design.md 752-758`                 | 作为仲裁后的稳定事实对象 |

## 6. 持久化边界

| Table                              | Migration                           | Entity / Repository                                      | DDL / Freeze Source                                        | Check Result |
| ---------------------------------- | ----------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- | ------------ |
| `commission_freeze_dispute_record` | `EX-09D` new migration              | `CommissionFreezeDisputeRecord` / `CommissionRepository` | `table-structure-freeze-design.md`、`schema-ddl-design.md` | Pending G2   |
| `commission_freeze_change_request` | `EX-09D` new migration              | `CommissionFreezeChangeRequest` / `CommissionRepository` | `table-structure-freeze-design.md`、`schema-ddl-design.md` | Pending G2   |
| `commission_role_assignment`       | `EX-09A` existing migration, reused | `CommissionRoleAssignment` / `CommissionRepository`      | `ex-09a-commission-freeze-version-baseline.md`             | Reused       |

| Field                                                                     | Design Type / Meaning             | Migration / DDL                             | Entity                       | Shared Contract / OpenAPI                             | Result     |
| ------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------- | ---------------------------- | ----------------------------------------------------- | ---------- |
| `commission_freeze_dispute_record.freeze_version_id`                      | 被争议冻结版本 UUID               | FK -> `commission_role_assignment.id`       | `freezeVersionId`            | `SubmitCommissionFreezeDisputeRequest` / `DetailView` | Pending G2 |
| `commission_freeze_dispute_record.summary_*`                              | 争议与通知共用的统一摘要链        | same snapshot chain as freeze/change        | `summaryPackageKey` 等       | `SubmitResult` / `DetailView`                         | Pending G2 |
| `commission_freeze_change_request.dispute_record_id`                      | 仲裁后受控变更归属的争议记录 UUID | FK -> `commission_freeze_dispute_record.id` | `disputeRecordId`            | `ArbitrateResult` / `ChangeRequestDetailView`         | Pending G2 |
| `commission_freeze_change_request.superseded_freeze_version_id`           | 被替代冻结版本 UUID               | FK -> `commission_role_assignment.id`       | `supersededFreezeVersionId`  | `ArbitrateResult` / `ChangeRequestDetailView`         | Pending G2 |
| `commission_freeze_change_request.replacement_freeze_version_id`          | 替代冻结版本 UUID，可空           | FK -> `commission_role_assignment.id`       | `replacementFreezeVersionId` | `ArbitrateResult` / `ChangeRequestDetailView`         | Pending G2 |
| `commission_freeze_change_request.affected_*_summary / risk_flag_summary` | 重算 / 发放 / 风险稳定摘要        | DDL required before effective               | 对应 entity 字段             | `ArbitrateResult` / `ChangeRequestDetailView`         | Pending G2 |

## 7. 一致性结论

- Document -> code: 旧 `createCommissionRoleChangeRequest` direct-request 规划归类为 `design-change-required`；`EX-09D` 代码必须按 dispute-first 基线实现。
- Migration -> entity: 必须先落 `commission_freeze_dispute_record` 与 `commission_freeze_change_request` migration，再接 controller / service / query。
- Entity -> contract: 新 contract 不再新增 direct `CommissionRoleChangeRequest` create DTO；争议与受控变更分为两个稳定资源。
- Route -> command: `resource-first + colon-action` 保持不变，但 `EX-09` 的资源拆分更正为 `CommissionFreezeDisputeRecord -> CommissionFreezeChangeRequest`。
- Query -> view: dispute detail 与 change-request detail 必须共享同一摘要快照链和替代冻结版本引用。
- Guard / permission: submit 与 arbitrate 必须分别校验争议唯一未收口约束、审批处理态与统一冻结追溯链。
- OpenAPI / generated client: `EX-09D` 实现时只暴露 dispute-first route；旧 `commission-role-change-requests` direct create 不得继续生成到 shared client。

## 8. 测试与校验

| Check                            | Required | Command / Evidence | Result       | Gap / Reason                                                      |
| -------------------------------- | -------- | ------------------ | ------------ | ----------------------------------------------------------------- |
| Build                            | No       | N/A                | not required | 本次为 G1 docs-only 裁决，不涉及运行时代码                        |
| Unit tests                       | No       | N/A                | not required | 同上                                                              |
| API / integration tests          | No       | N/A                | not required | 同上                                                              |
| E2E                              | No       | N/A                | not required | 同上                                                              |
| OpenAPI generation / client diff | No       | N/A                | not required | 本次仅冻结设计输入；`EX-09D` 实现时必须重新生成并检查             |
| Migration / schema check         | No       | N/A                | not required | migration 尚未开始；进入 G2 后必须执行 `poms-api:migration-check` |
| Diff hygiene                     | Yes      | `git diff --check` | Pending      | 文档回写完成后执行                                                |

## 9. 例外与风险

| Exception ID | Level  | Scope                                                          | Approved By                | Cleanup Owner | Cleanup Due     | Notes                                                                                                                                      |
| ------------ | ------ | -------------------------------------------------------------- | -------------------------- | ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `EX-09D-E01` | medium | `CommissionRoleAssignmentDetailView.allowedActions` 历史占位值 | `Solo worktree checkpoint` | `Codex`       | `EX-09D` 完成时 | 当前实现仍暴露 `submit-commission-role-change` 占位 action；已归类为 `existing-baseline-drift`，需在 `EX-09D` 代码实现时随争议资源一起更名 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-16`
- Conditions:
  1. `EX-09D` 进入编码时只能按本基线落 dispute-first，不得再恢复 direct `CommissionRoleChangeRequest` create 方案。
  2. `EX-15D` 剩余 route / resourceization 收口必须与本基线同轮完成，不接受 runtime / OpenAPI / client 三者拆开漂移。
  3. 若实现过程中发现 `replacementAssignmentPayload` 无法在现有冻结模型内表达，应先补设计 / baseline，再编码，不得退回“前端直接传 replacementFreezeVersionId”。
