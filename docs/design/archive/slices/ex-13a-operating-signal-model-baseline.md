# EX-13A Operating Signal / Gate Binding Model 实施基线包

- Gate Status: `Pass`
- Parent: `EX-13`
- Owner: `Codex`
- Slice Type: `persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-13A`

---

## 1. 范围

- 本次目标:
  1. 为 `L4` 经营结果链补齐 `data_maturity_evaluation_result`、`operating_signal_evaluation_result`、`operating_signal_review_record`、`operating_signal_gate_binding` 与 `commission_gate_review_record` 五张核心表。
  2. 在 `project-cost` 模块中补齐对应 entity、repository、module 注册，使后续 `EX-13B` 可直接在正式模型上实现命令 / 查询。
  3. 对齐 migration、entity metadata、DDL / table freeze，并完成治理文档回写。
- 本次明确不做:
  1. 不新建 `L4` 查询 API、控制器 route 或前端页面。
  2. 不实现自动生成成熟度结果、经营信号或 gate 绑定的 service 逻辑；本切片只落模型。
  3. 不冻结 `reviewOperatingSignalEvaluation`、`reviewCommissionGateBinding` 的请求 / 响应 DTO 形状；该部分留给 `EX-13B`。
- 下游可依赖的交付边界:
  1. `ProjectOperatingSnapshot` 之后的 `L4 -> L5` 结果链有正式落表承接对象，不再只停留在设计文档或查询聚合假设。
  2. `OperatingSignalEvaluationResult` 与 `DataMaturityEvaluationResult`、`ProjectOperatingSnapshot` 之间有稳定引用链。
  3. `OperatingSignalToCommissionGateBinding` 与 `CommissionGateReviewRecord` 能作为后续 `L5 gate` 的正式输入与留痕主链。
- 不允许下游依赖的留白:
  1. 不接受只落 `operating_signal_*` 三张表而继续缺失 `commission_gate_review_record`。
  2. 不接受只写 migration、不补 entity / repository 注册的半完成状态。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor            | Status   | Notes                                                                                   |
| ------------------------- | ----------------------------------------------------------------- | --------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Business design           | `phase2-project-business-outcome-overview.md`                     | `3`, `5`, `9`, `11`         | Accepted | 总览页必须稳定消费成熟度、动作等级、基线 / 快照版本                                     |
| Business design           | `phase2-project-unified-accounting-view-caliber.md`               | `3`, `6`, `7`, `10`         | Accepted | 固定统一核算结果与数据成熟度层                                                          |
| Business design           | `phase2-project-variance-risk-explanation.md`                     | `3`, `4`, `5`, `7`, `11`    | Accepted | 固定偏差来源、风险层与动作等级解释输出                                                  |
| Business design           | `phase2-business-accounting-feedback-rules.md`                    | `3`, `5`, `8`               | Accepted | 固定 `L4 -> L5` 绑定矩阵与 feedback 输出链                                              |
| Command design            | `interface-command-design.md`                                     | `200-214`                   | Accepted | `reviewOperatingSignalEvaluation`、`reviewCommissionGateBinding` 后续必须消费本切片模型 |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | `259-275`                   | Accepted | 本切片不直接改 DTO，但后续 DTO 必须挂到本切片模型                                       |
| Query boundary            | `query-view-boundary-design.md`                                   | `179-185`, `196-200`, `241` | Accepted | `L4-T01 / T02 / T03 / T04` 读侧都要消费同一结果链                                       |
| Data model / table freeze | `data-model-prerequisites.md`                                     | `274-296`                   | Accepted | 明确 `L4` 第二批可信源对象链                                                            |
| Data model / table freeze | `table-structure-freeze-design.md`                                | `290-302`                   | Accepted | 冻结五张表的最小字段组与关系                                                            |
| Schema / DDL              | `schema-ddl-design.md`                                            | `592-649`                   | Accepted | 固定索引、强约束与 `L4 -> L5` 绑定链承接关系                                            |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | `gates`                     | Accepted | 新切片进入 `G1` 必须先冻结实施基线                                                      |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                                                                                                                                                                                | Implementation Rule                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business semantics        | `ProjectOperatingSnapshot / PeriodClosingSnapshot` 是 `L2` 稳定金额包锚点；`EX-13A` 在其后补齐 `L4` 成熟度、信号、绑定与 gate review 承接链                                                         | 不重复建经营快照表，只扩后续结果链                                                                                                                                                             |
| Route / command naming    | 本切片不新增 route；后续 `reviewOperatingSignalEvaluation` / `reviewCommissionGateBinding` 只能落在本切片表链上                                                                                     | 当前只做 persistence，不提前暴露接口                                                                                                                                                           |
| DTO / contract naming     | object 名称以设计文档为准：`DataMaturityEvaluationResult`、`OperatingSignalEvaluationResult`、`OperatingSignalReviewRecord`、`OperatingSignalToCommissionGateBinding`、`CommissionGateReviewRecord` | 表名保持 DDL 口径：`data_maturity_evaluation_result`、`operating_signal_evaluation_result`、`operating_signal_review_record`、`operating_signal_gate_binding`、`commission_gate_review_record` |
| Table / column naming     | `operating_signal_gate_binding` 是 `OperatingSignalToCommissionGateBinding` 的持久化 SSOT 表名                                                                                                      | 不再引入第二套 `commission_gate_binding` 物理表                                                                                                                                                |
| Date / time semantics     | `evaluatedAt` / `generatedAt` / `handledAt` 代表系统生成、绑定生成与人工处理时点                                                                                                                    | 使用 `datetime`，不退回 `date`                                                                                                                                                                 |
| Identifier semantics      | `referencedSnapshotId` 必须引用 `project_operating_snapshot.id`；`dataMaturityEvaluationId` 必须引用成熟度结果；`bindingId` 必须引用 gate binding                                                   | `L4 -> L5` 解释链只能沿正式 FK 追溯                                                                                                                                                            |
| Money / decimal semantics | `taxImpactPendingAmount` 统一使用 `numeric(18,2)`，默认 `0`                                                                                                                                         | 不允许在结果链中混用浮点或整数金额                                                                                                                                                             |
| Status machine            | 五张新表统一保留 `status`，当前有效记录通过 `status='active'` + 条件唯一 / 索引表达                                                                                                                 | 不接受无痕覆盖旧结果                                                                                                                                                                           |
| Enum token freeze         | `currentActionLevel` / `costActionRecommendation` 沿用 `PROMPT / REVIEW / BLOCK`；`dataMaturityLevel` 等其它字段当前只冻结语义，不在本切片额外创造 public token                                     | token 级 contract 冻结留给 `EX-13B`，但持久化字段与关系本切片必须先落地                                                                                                                        |

---

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission                                        | Design Source                 | Result |
| ------------------ | ----------------- | ---------------------- | ----------------------- | --------------------------------------------------------- | ----------------------------- | ------ |
| N/A                | N/A               | N/A                    | N/A                     | 本切片不新增命令接口；仅为 `EX-13B` 准备 persistence SSOT | `interface-command-design.md` | N/A    |

---

## 5. 读侧边界

| Query / View                                                          | Consumer                 | Fields                                                                                                   | Filter / Sort | Permission Boundary                            | Design Source                   | Result |
| --------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------- | ------------------------------- | ------ |
| `ProjectBusinessOutcomeOverviewView`                                  | `L4-T01` consumer        | 依赖 `dataMaturityLevel`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion` | N/A           | 本切片不实现 query，只保证字段有正式落点       | `query-view-boundary-design.md` | N/A    |
| `ProjectUnifiedAccountingView`                                        | `L4-T02` consumer        | 依赖 `taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`                           | N/A           | 本切片不实现 query，只保证字段有正式落点       | `query-view-boundary-design.md` | N/A    |
| `ProjectVarianceRiskExplanationView`                                  | `L4-T03` consumer        | 依赖 `signalLevel`、`riskLevel`、`varianceSourceSummary`、`recommendedActionSummary`                     | N/A           | 本切片不实现 query，只保证字段有正式落点       | `query-view-boundary-design.md` | N/A    |
| `BusinessAccountingFeedbackView` / `CommissionGateBindingHistoryView` | `L4-T04` / `L5` consumer | 依赖 `bindingAction`、`gateReviewDecision`、`nextActionSummary`、`summaryPackageKey` 系列                | N/A           | 本切片不实现 query，只保证 feedback 链正式落表 | `query-view-boundary-design.md` | N/A    |

---

## 6. 持久化边界

| Table                                | Migration                                                                                                | Entity / Repository                                                                           | DDL / Freeze Source                                                                       | Check Result |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------ |
| `data_maturity_evaluation_result`    | `Migration20260418170000_ex13a_operating_signal_model.ts` 建表、外键与索引                               | `DataMaturityEvaluationResult` / `DataMaturityEvaluationResultRepository`                     | `data-model-prerequisites.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md` | Pass         |
| `operating_signal_evaluation_result` | `Migration20260418170000_ex13a_operating_signal_model.ts` 建表、外键与索引                               | `OperatingSignalEvaluationResult` / `OperatingSignalEvaluationResultRepository`               | 同上                                                                                      | Pass         |
| `operating_signal_review_record`     | `Migration20260418170000_ex13a_operating_signal_model.ts` 建表、外键与 active review 条件唯一            | `OperatingSignalReviewRecord` / `OperatingSignalReviewRecordRepository`                       | 同上                                                                                      | Pass         |
| `operating_signal_gate_binding`      | `Migration20260418170000_ex13a_operating_signal_model.ts` 建表、外键与 project-stage active binding 约束 | `OperatingSignalToCommissionGateBinding` / `OperatingSignalToCommissionGateBindingRepository` | 同上                                                                                      | Pass         |
| `commission_gate_review_record`      | `Migration20260418170000_ex13a_operating_signal_model.ts` 建表、外键与索引                               | `CommissionGateReviewRecord` / `CommissionGateReviewRecordRepository`                         | `interface-command-design.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md` | Pass         |

| Field                      | Design Type / Meaning    | Migration / DDL                                   | Entity                                             | Shared Contract / OpenAPI                   | Result |
| -------------------------- | ------------------------ | ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- | ------ |
| `referencedSnapshotId`     | 结果链引用的经营快照     | FK -> `project_operating_snapshot.id`             | 成熟度结果、经营信号结果都必须显式持有             | 后续 `EX-13B` query / DTO 继续消费          | Pass   |
| `dataMaturityEvaluationId` | 经营信号引用的成熟度结果 | FK -> `data_maturity_evaluation_result.id`        | `OperatingSignalEvaluationResult` 强引用成熟度结果 | 后续 `EX-13B` query / DTO 继续消费          | Pass   |
| `gateStageType`            | `L5` gate 阶段类型       | `varchar(32)` + project-stage active binding 约束 | `OperatingSignalToCommissionGateBinding`           | 后续 `EX-13B` / `L5` route 使用             | Pass   |
| `taxImpactPendingAmount`   | 待闭合税务影响金额       | `numeric(18,2) not null default 0`                | 成熟度结果、gate binding 共用                      | 后续 `EX-13B` query / DTO 继续消费          | Pass   |
| `currentActionLevel`       | 聚合动作等级             | `varchar(32) not null`                            | 经营信号、gate binding、review record 共用         | 既有 `PROMPT / REVIEW / BLOCK` 语义保持一致 | Pass   |

---

## 7. 一致性结论

- Document -> code: 本切片必须把 `L4` 第二批可信源对象链从“设计已冻结”推进到“真实表结构存在”。
- Migration -> entity: migration、entity metadata、repository 注册必须同时完成；不接受只落 SQL。
- Entity -> contract: 本切片不直接改 contract，但后续 `EX-13B` 的 DTO / query 只能消费本切片表链，不得重新造对象。
- Route -> command: route 仍留给 `EX-13B`，当前不提前创造 API grammar drift。
- Query -> view: 读侧暂未实现，但 `query-view-boundary-design.md` 需要的字段在本切片必须有稳定列落点。
- Guard / permission: `commission_gate_review_record` 与 `operating_signal_gate_binding` 建成后，后续 `L5` guard 才有正式来源；当前不实现 guard 逻辑。
- OpenAPI / generated client: 当前无 public contract 变更；生成链暂不要求执行。

---

## 8. 测试与校验

| Check                            | Required    | Command / Evidence                                                                            | Result | Gap / Reason                                                              |
| -------------------------------- | ----------- | --------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Lint                             | Yes         | `corepack pnpm nx lint poms-api`                                                              | Pass   | `project-cost` entity / repository 变更已通过                             |
| Build                            | Yes         | `corepack pnpm nx build poms-api`                                                             | Pass   | 模块注册与实体 metadata 编译通过                                          |
| Unit tests                       | Conditional | N/A                                                                                           | N/A    | 本切片仅新增 entity / repository / migration，未引入独立 service 行为分支 |
| API / integration tests          | No          | N/A                                                                                           | N/A    | 本切片不新增 controller / service command                                 |
| E2E                              | No          | N/A                                                                                           | N/A    | 本切片不新增 public route                                                 |
| OpenAPI generation / client diff | No          | N/A                                                                                           | N/A    | 本切片不改 public contract                                                |
| Migration / schema check         | Yes         | `corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check` | Pass   | schema 已与 metadata 对齐                                                 |
| Diff / whitespace check          | Yes         | `git diff --check`                                                                            | Pass   | 无 whitespace error                                                       |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                          |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------------------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前不接受“先继续用查询聚合临时拼结果链，表以后再补”的过渡方案 |

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `EX-13A` 必须一次性补齐五张表；`commission_gate_review_record` 不得后置到 `EX-13B`。
  2. `project_operating_snapshot` 与 `period_closing_snapshot` 作为既有稳定输入继续沿用，本切片不得重复建模。
  3. 本切片完成时必须至少通过 `poms-api` lint/build、`migration-check`、tracker 回写与基线 close-out。

## 11. Close-out

- Status: `Done`
- Closed At: `2026-04-18`
- Evidence:
  1. `apps/poms-api/src/app/features/project-cost/` 已新增五个正式 entity，并完成 repository / module 注册。
  2. `apps/poms-api/src/migrations/Migration20260418170000_ex13a_operating_signal_model.ts` 已落地五张表、外键、索引、条件唯一与 comment。
  3. 已通过 `corepack pnpm nx lint poms-api`、`corepack pnpm nx build poms-api`、`corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check` 与 `git diff --check`。
  4. 下一步进入 `EX-13B`，在当前持久化 SSOT 上补命令 / 查询与 contract 闭环。
