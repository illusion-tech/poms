# EX-56D3 提成计算、发放、调整与结算枚举收口基线

## 1. 元信息

| Item       | Value                                     |
| ---------- | ----------------------------------------- |
| Slice      | `EX-56D3`                                 |
| Parent     | `EX-56D` 财务、提成与项目成本状态枚举收口 |
| Type       | `cross-layer-high-risk`                   |
| Owner      | `Codex`                                   |
| Gate       | `G1`                                      |
| Date       | `2026-05-02`                              |
| Public API | 不新增、不删除、不改 route surface        |

## 2. 正式输入

| Source                                       | Usage                                                  |
| -------------------------------------------- | ------------------------------------------------------ |
| `EX-56D` tracker row                         | 父级范围：财务、项目成本、提成拆片收口                 |
| `EX-56D1` / `EX-56D2` G4                     | 复用 shared value object、entity check、migration 模式 |
| `table-structure-freeze-design.md`           | 提成相关表结构、状态字段与摘要链字段                   |
| `schema-ddl-design.md`                       | 提成冻结、争议、最终结算、规则解释的 schema 约束语义   |
| `commission.service.ts` / entity 当前实现    | 当前业务状态机与写入路径事实源                         |
| `shared-contracts.ts` / generated api-client | OpenAPI 与前端消费枚举边界                             |

## 3. 范围

本片收敛提成域中已经具备闭合值集的字段：

| Area               | Fields                                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule version       | `commission_rule_version.status`                                                                                                                                                                                              |
| Role assignment    | `commission_role_assignment.status`                                                                                                                                                                                           |
| Calculation        | `commission_calculation.status`                                                                                                                                                                                               |
| Payout             | `commission_payout.status`、`stage_type`、`selected_tier`、`payout_kind`                                                                                                                                                      |
| Adjustment         | `commission_adjustment.status`、`adjustment_type`                                                                                                                                                                             |
| Freeze dispute     | `commission_freeze_dispute_record.status`、`arbitration_status`                                                                                                                                                               |
| Freeze change      | `commission_freeze_change_request.status`                                                                                                                                                                                     |
| Departure decision | `commission_departure_exception_decision.status`                                                                                                                                                                              |
| Final settlement   | `commission_final_settlement_snapshot.status`、`final_settlement_status`、`non_retention_settlement_status`、`retention_settlement_status`、`baseline_selection_source`、`cost_action_recommendation`、`current_action_level` |
| Rule explanation   | `commission_rule_explanation_snapshot.status`、`current_stage_status`、`gate_decision_code`                                                                                                                                   |
| Query-only status  | `retentionDueStatus`                                                                                                                                                                                                          |

## 4. 不在本片处理

| Field / Area                                                                                        | Reason                                                                                      |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ruleCode`、`roleType`、`departureScenarioCode`、`decisionCode` request input、`blockingReasonCode` | 业务规则 / 场景 / 阻断原因编码，属于开放 taxonomy，不是闭合枚举。                           |
| `summaryPackageKey`、`summarySnapshotId`                                                            | 审批摘要包事实链，不在提成域内定义枚举。                                                    |
| `projectionLevel`、`exportPolicy`                                                                   | 当前由 `approval_summary_package_definition` 配置驱动，跨域值集尚未冻结；本片只透传不收窄。 |
| `arbitrationDecision`、`recalculationImpactMode`                                                    | 仲裁结论与回溯影响模式仍是业务口径编码，等待后续冻结。                                      |
| 金额计算、审批流程、敏感投影、权限、路由、前端交互                                                  | 本片只做 enum convergence，不改行为。                                                       |
| 兼容旧值 / 中文值迁移                                                                               | 当前系统处开发期，migration 按 direct cutover；非基线数据只允许重置或人工修正。             |

## 5. 值集冻结

| Domain                              | Values                                                                                                      | Code Source                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `CommissionRuleVersionStatus`       | `draft` / `active` / `stopped`                                                                              | existing entity + service            |
| `CommissionRoleAssignmentStatus`    | `draft` / `frozen` / `superseded`                                                                           | existing entity + service            |
| `CommissionCalculationStatus`       | `pending` / `calculated` / `effective` / `superseded`                                                       | existing entity + service            |
| `CommissionPayoutStatus`            | `draft` / `pending-approval` / `approved` / `paid` / `suspended` / `reversed`                               | existing entity + service            |
| `CommissionPayoutStage`             | `first` / `second` / `final` / `retention`                                                                  | existing shared contract             |
| `NonRetentionCommissionPayoutStage` | `first` / `second` / `final`                                                                                | request-only subset                  |
| `CommissionPayoutTier`              | `basic` / `mid` / `premium`                                                                                 | existing shared contract             |
| `CommissionPayoutKind`              | `primary` / `supplement`                                                                                    | existing shared contract             |
| `CommissionAdjustmentType`          | `suspend-payout` / `reverse-payout` / `clawback` / `supplement` / `recalculate`                             | existing shared contract             |
| `CommissionAdjustmentStatus`        | `draft` / `pending-approval` / `approved` / `executed` / `rejected` / `closed`                              | existing entity + service            |
| `CommissionFreezeDisputeStatus`     | `submitted` / `closed`                                                                                      | existing entity + service            |
| `CommissionFreezeArbitrationStatus` | `pending` / `arbitrated`                                                                                    | existing shared contract             |
| `CommissionFreezeChangeStatus`      | `effective` / `closed`                                                                                      | existing entity + service            |
| `CommissionLifecycleSnapshotStatus` | `active` / `superseded` / `voided`                                                                          | departure / final / rule explanation |
| `CommissionFinalSettlementStatus`   | `pending-final-settlement` / `pending-retention-settlement` / `settled-all`                                 | settlement write chain               |
| `CommissionNonRetentionStatus`      | `pending-non-retention` / `settled-non-retention`                                                           | settlement write chain               |
| `CommissionRetentionStatus`         | `waiting-retention` / `ready-retention` / `settled-retention`                                               | settlement write chain               |
| `BaselineSelectionSource`           | `original` / `handover_rebaseline`                                                                          | EX-56D2 shared contract              |
| `OperatingSnapshotActionLevel`      | `PROMPT` / `REVIEW` / `BLOCK`                                                                               | EX-56D2 shared contract              |
| `CommissionRuleExplanationStage`    | `pending-final-settlement` / `blocked-retention` / `ready-retention` / `settled-retention`                  | settlement write chain               |
| `CommissionRuleExplanationDecision` | `ALLOW_FINAL_SETTLEMENT` / `SETTLED_RETENTION` / `BLOCK_RETENTION` / `REVIEW_RETENTION` / `ALLOW_RETENTION` | settlement write chain               |
| `CommissionRetentionDueStatus`      | `missing` / `pending` / `due`                                                                               | settlement write chain query result  |

## 6. 实施边界

| Layer                | Required Change                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Shared contracts     | 为本片闭合字段新增 `as const` values、schema、type、value object；替换 commission view / request inline enum。 |
| API entities         | 引用 shared types；为闭合持久化字段补齐 MikroORM `checks`。                                                    |
| Migration            | 新增 `EX-56D3` check/default migration；只 drop/add constraints，不做兼容数据转换。                            |
| Service / repository | 写入路径使用 shared value object，减少裸字符串；不改变业务状态机。                                             |
| OpenAPI / API client | 重新生成，期望新增 dedicated generated enum files，Admin 使用 generated enum。                                 |
| Admin                | 只处理 generated enum 命名变化或已暴露枚举消费，不改页面交互。                                                 |
| Tests                | 更新 focused unit/e2e fixtures 中的 enum import 或值引用。                                                     |

## 7. 一致性检查

| Edge                     | Expected                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Document -> code         | 值集与本基线一致；不引入中文 enum value。                                                    |
| Route -> command         | 无 public route surface 变化；请求 DTO 的 enum 语义保持原路由。                              |
| DTO -> service           | request schema 的 payout stage / tier / adjustment type 使用 shared enum；service 行为不变。 |
| Migration -> entity      | 每个 closed persistence field 都有同名或等价 DB check；migration 不做旧值兼容映射。          |
| Entity -> OpenAPI/client | entity typed field、shared contract、OpenAPI/generated client 枚举一致。                     |
| Query -> view            | response status/stage/type 字段使用 dedicated schema，Admin 使用 generated enum 或类型。     |
| Guard / permission       | 不改权限；现有 permission tests 仅因 enum import 更新而调整。                                |

## 8. 验证计划

| Check                 | Required | Command                                                                                                               |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Markdown              | yes      | `corepack pnpm run format:md:check`; `git diff --check`                                                               |
| OpenAPI / client      | yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:generate`; `shared-api-client:check` |
| Migration             | yes      | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check`                         |
| API lint/build/test   | yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx build poms-api`; `corepack pnpm nx test poms-api --runInBand`     |
| Admin lint/build/test | targeted | 如果 generated enum 影响 Admin imports，则运行 `lint/build/test poms-admin`                                           |
| API e2e               | targeted | `commission-workflow.e2e-spec.ts`                                                                                     |

## 9. 例外

| Exception ID | Level | Scope                                                                   | Approved By | Cleanup Owner | Cleanup Due | Notes                                                  |
| ------------ | ----- | ----------------------------------------------------------------------- | ----------- | ------------- | ----------- | ------------------------------------------------------ |
| EX56D3-E1    | E1    | `projectionLevel` / `exportPolicy` 保持开放字符串                       | Codex       | `EX-57`       | 2026-05-10  | 跨审批摘要包配置字段，需在全局摘要治理中统一冻结。     |
| EX56D3-E2    | E1    | `decisionCode` request、`blockingReasonCode`、`recalculationImpactMode` | Codex       | `EX-57`       | 2026-05-10  | 当前属于业务 taxonomy / 人工结论编码，本片不强行闭合。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-02`
- Conditions:
  - 不新增 route / guard / approval flow。
  - 不改变提成金额计算、状态流转和敏感投影语义。
  - 不写兼容旧值 / 中文值转换。
