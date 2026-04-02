# POMS Schema 与 DDL 细化设计

**文档状态**: Active
**最后更新**: 2026-04-02
**适用范围**: `POMS` 第一阶段 schema / DDL 级细化基线，以及第二阶段第一批、第二批、第三批实现映射写回前的 DDL 补点输入
**关联文档**:

- 上游设计:
  - `../adr/012-data-persistence-technology-selection.md`
  - `../adr/013-platform-governance-physical-schema-boundary.md`
  - `poms-requirements-spec.md`
  - `poms-hld.md`
  - `poms-design-progress.md`
  - `design-review-follow-up-summary.md`
  - `phase2-first-batch-implementation-mapping.md`
  - `phase2-second-batch-implementation-mapping.md`
  - `phase2-third-batch-implementation-mapping.md`
- 同级设计:
  - `query-view-boundary-design.md`
  - `data-model-prerequisites.md`
  - `table-structure-freeze-design.md`
  - `interface-openapi-dto-design.md`
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `phase2-data-permission-and-sensitive-visibility-design.md`

---

## 1. 文档目标

本文档用于把逻辑表冻结设计继续下钻为可执行的 schema / DDL 级基线，重点回答以下问题：

- 第一阶段真实建表时应采用什么命名约定
- 公共字段、主键、外键、版本字段、审计字段应如何统一
- 哪些表应设唯一约束、哪些表应设高频索引
- 哪些约束应在 DDL 中强绑定，哪些仅保留业务引用

本文档仍不是最终数据库迁移脚本，但它已经是写建表 SQL、ORM schema 或迁移文件前的直接输入。第一阶段默认数据库能力以 `ADR-012` 已接受的 `PostgreSQL` 方案为准，应用层 ORM 默认采用 `MikroORM`。

补充当前阶段判断：

- 本文档当前不仅服务于已完成主干链路，也直接服务于平台治理域与提成治理域的第一阶段补齐实施
- 因此需要把平台治理域主数据表与提成治理域核心表明确补入 DDL 级输入
- 第二阶段第一批 6 个专题已完成写回，第二阶段第二批 7 个专题也已进入实现设计下钻，因此还需要把关键主事实补字段、唯一约束与索引要求继续写回 DDL 级输入

---

## 2. Schema 与命名基线

第一阶段建议采用以下命名规则：

1. 物理表统一使用小写 `snake_case`。
2. 主键字段统一命名为 `id`。
3. 外键字段统一命名为 `xxx_id`。
4. 版本替代关系统一命名为 `supersedes_id`、`recalculated_from_id`、`reversed_from_id`、`voided_from_id`。
5. 时间字段统一命名为 `created_at`、`updated_at`、`handled_at`、`effective_at`、`submitted_at`、`confirmed_at`。
6. 操作人字段统一命名为 `created_by`、`updated_by`、`handled_by`、`submitted_by`、`confirmed_by`。
7. 状态字段优先统一命名为 `status`，若有子状态再使用 `xxx_status`。
8. 布尔字段统一使用 `is_xxx` 风格，如 `is_current`、`is_deleted`。

第一阶段物理 schema 建议采用单一业务 schema：

- 逻辑名称建议为 `poms`
- 不按域拆多个数据库 schema
- 通过表名和外键关系表达域分层，而不是通过物理 schema 强隔离

补充约束：

- 平台治理域第一阶段继续使用 `poms` schema，不单独拆出 `core` schema，详见 `ADR-013`

这样做的原因是：

- 当前还处于第一阶段闭环建设，跨域查询和统一待办较多
- 单 schema 更利于先稳定一致命名与迁移管理
- 后续若确需拆分，可在不推翻表名语义的前提下再做物理演进

同时，第一阶段数据库产品选型已固定为 `PostgreSQL 16+`，因此本文件中涉及条件唯一索引、部分索引和复杂约束时，默认按 `PostgreSQL` 能力假设编写。

---

## 3. 公共字段模板

### 3.1 主体主表公共字段

主体主表建议默认包含以下字段组：

| 字段          | 建议类型族   | 说明         |
| ------------- | ------------ | ------------ |
| `id`          | 全局唯一标识 | 主键         |
| `status`      | 短字符串枚举 | 当前主状态   |
| `created_at`  | 时间戳       | 创建时间     |
| `created_by`  | 全局唯一标识 | 创建人       |
| `updated_at`  | 时间戳       | 最后更新时间 |
| `updated_by`  | 全局唯一标识 | 最后更新人   |
| `row_version` | 整型         | 乐观锁版本   |

### 3.2 版本表公共字段

版本表建议在主体字段外，统一补充：

| 字段            | 建议类型族         | 说明             |
| --------------- | ------------------ | ---------------- |
| `version`       | 整型               | 业务版本号       |
| `is_current`    | 布尔               | 是否当前有效版本 |
| `supersedes_id` | 全局唯一标识       | 被替代版本       |
| `effective_at`  | 时间戳，可空       | 生效时间         |
| `effective_by`  | 全局唯一标识，可空 | 生效操作人       |

### 3.3 快照表公共字段

快照表建议统一补充：

| 字段              | 建议类型族         | 说明           |
| ----------------- | ------------------ | -------------- |
| `snapshot_status` | 短字符串枚举       | 快照状态       |
| `effective_at`    | 时间戳             | 快照生效时间   |
| `effective_by`    | 全局唯一标识       | 快照生效操作人 |
| `supersedes_id`   | 全局唯一标识，可空 | 被替代快照     |

### 3.4 动作记录表公共字段

动作记录表建议统一补充：

| 字段         | 建议类型族         | 说明         |
| ------------ | ------------------ | ------------ |
| `status`     | 短字符串枚举       | 当前动作状态 |
| `reason`     | 文本，可空         | 动作原因     |
| `comment`    | 文本，可空         | 动作意见     |
| `handled_at` | 时间戳，可空       | 处理完成时间 |
| `handled_by` | 全局唯一标识，可空 | 处理人       |

### 3.5 金额与比例字段

金额与比例字段建议统一采用定点数类型族：

- 金额字段建议按 `decimal(18, 2)` 等价精度设计
- 比例字段建议按 `decimal(8, 4)` 等价精度设计
- 不建议使用浮点类型承载金额、税率、提成比例

---

## 4. 主键与外键策略

### 4.1 主键策略

第一阶段建议所有业务主表使用单列主键 `id`，不使用复合主键。

原因：

- 更利于跨域引用
- 更利于动作记录和附件、审计等支撑表引用
- 更利于后续服务拆分或数据同步

### 4.2 强外键策略

以下关系建议在 DDL 中使用强外键：

- `contract.project_id -> project.id`
- `bid_process.project_id -> project.id`
- `project_assessment.project_id -> project.id`
- `contract_term_snapshot.contract_id -> contract.id`
- `contract_amendment.contract_id -> contract.id`
- `receivable_plan_version.contract_id -> contract.id`
- `receivable_plan_version.snapshot_id -> contract_term_snapshot.id`
- `payment_record.payable_record_id -> payable_record.id`
- `platform_user.primary_org_unit_id -> org_unit.id`
- `user_role_assignment.user_id -> platform_user.id`
- `user_role_assignment.role_id -> role.id`
- `user_org_membership.user_id -> platform_user.id`
- `user_org_membership.org_unit_id -> org_unit.id`
- `role_permission_assignment.role_id -> role.id`
- `commission_calculation.project_id -> project.id`
- `commission_calculation.rule_version_id -> commission_rule_version.id`
- `commission_role_assignment.project_id -> project.id`
- `commission_role_assignment.user_id -> platform_user.id`
- `commission_payout.project_id -> project.id`
- `commission_payout.calculation_id -> commission_calculation.id`
- `commission_adjustment.project_id -> project.id`
- `commission_adjustment.related_payout_id -> commission_payout.id`
- `commission_adjustment.related_calculation_id -> commission_calculation.id`
- `commission_calculation_snapshot.commission_calculation_id -> commission_calculation.id`
- `approval_record_node.approval_record_id -> approval_record.id`
- `confirmation_participant.confirmation_record_id -> confirmation_record.id`

### 4.3 弱引用策略

以下关系建议保留业务引用字段，不在 DDL 中做强外键：

- `approval_record.target_type + target_id`
- `confirmation_record.target_type + target_id`
- `todo_item.target_type + target_id`
- `notification_record.target_type + target_id`
- `attachment.biz_type + biz_id`
- `audit_log.target_type + target_id`

原因：

- 这些表横跨多个业务对象
- 若强行做多态强外键，会让 DDL 和迁移复杂度明显上升
- 第一阶段更适合使用业务约束 + 应用层校验保持一致性

---

## 5. 唯一约束基线

第一阶段建议至少固定以下唯一约束：

| 表                           | 唯一约束建议                                   | 目的                                           |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `project`                    | `project_code`                                 | 项目编号唯一                                   |
| `contract`                   | `contract_no`                                  | 合同编号唯一                                   |
| `platform_user`              | `username`                                     | 登录名唯一                                     |
| `role`                       | `role_key`                                     | 角色稳定键唯一                                 |
| `org_unit`                   | `code`                                         | 组织编码唯一                                   |
| `user_role_assignment`       | `user_id + role_id`（有效关系条件唯一）        | 同一用户同一角色有效关系唯一                   |
| `user_org_membership`        | `user_id + org_unit_id`（有效关系条件唯一）    | 同一用户同一组织有效关系唯一                   |
| `role_permission_assignment` | `role_id + permission_key`（有效关系条件唯一） | 同一角色同一权限有效关系唯一                   |
| `invoice_record`             | `invoice_no`                                   | 发票编号唯一，若业务允许外部重复则改为条件唯一 |
| `scope_confirmation_version` | `project_id + version`                         | 项目范围版本唯一                               |
| `contract_amendment`         | `contract_id + version`                        | 合同变更版本唯一                               |
| `receivable_plan_version`    | `contract_id + version`                        | 应收计划版本唯一                               |
| `commission_role_assignment` | `project_id + version`                         | 提成角色分配版本唯一                           |
| `commission_calculation`     | `project_id + version`                         | 提成计算版本唯一                               |
| `commission_rule_version`    | `version` 或 `rule_code + version`             | 规则版本唯一                                   |
| `commission_payout`          | `project_id + calculation_id + stage_type`     | 同一项目同一计算版本同一发放阶段唯一           |
| `approval_record_node`       | `approval_record_id + node_key`                | 审批节点唯一                                   |
| `confirmation_participant`   | `confirmation_record_id + participant_id`      | 确认参与人唯一                                 |

对于 `is_current = true` 的版本表，第一阶段建议直接使用 `PostgreSQL` 的部分唯一索引表达“同一主体同一时刻只能存在一条当前有效记录”，例如：

- 同一主体同一时刻只能存在一条 `is_current = true`

仅当后续明确切换数据库产品时，才重新评估是否退回应用层与事务逻辑保证。

---

## 6. 高频索引基线

### 6.1 列表与详情查询索引

以下字段建议默认建立普通索引或联合索引：

- `project.status`
- `project.current_stage`
- `project.owner_org_id`
- `platform_user.username`
- `platform_user.is_active`
- `platform_user.primary_org_unit_id`
- `role.role_key`
- `role.is_active`
- `org_unit.parent_id`
- `org_unit.is_active`
- `contract.project_id`
- `contract.status`
- `receipt_record.project_id`
- `receipt_record.contract_id`
- `receipt_record.status`
- `invoice_record.project_id`
- `invoice_record.contract_id`
- `invoice_record.status`
- `user_role_assignment.user_id + status`
- `user_org_membership.user_id + status`
- `role_permission_assignment.role_id + status`
- `commission_calculation.project_id`
- `commission_calculation.is_current`
- `commission_role_assignment.project_id + is_current`
- `commission_payout.project_id + status`
- `commission_adjustment.project_id + status`

### 6.2 动作追溯与待办索引

以下字段建议建立索引：

- `approval_record.target_type + target_id`
- `approval_record.status`
- `confirmation_record.target_type + target_id`
- `todo_item.assignee_id + status`
- `todo_item.target_type + target_id`
- `audit_log.target_type + target_id`
- `audit_log.occurred_at`

### 6.3 版本与快照索引

以下字段建议建立索引：

- `scope_confirmation_version.project_id + is_current`
- `contract_amendment.contract_id + is_current`
- `receivable_plan_version.contract_id + is_current`
- `commission_role_assignment.project_id + is_current`
- `commission_calculation.project_id + is_current`
- `contract_term_snapshot.contract_id + effective_at`

---

## 7. 第一阶段核心表 DDL 细化草案

### 7.1 `project`

建议最小字段：

- `id`
- `project_code`
- `project_name`
- `customer_id`
- `status`
- `current_stage`
- `owner_org_id`
- `owner_user_id`
- `planned_sign_at`
- `closed_at`
- `closed_reason`
- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

约束建议：

- 主键：`id`
- 唯一：`project_code`
- 索引：`status`、`current_stage`、`owner_org_id`

### 7.2 `contract`

建议最小字段：

- `id`
- `project_id`
- `contract_no`
- `status`
- `signed_amount`
- `currency_code`
- `current_snapshot_id`
- `signed_at`
- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

约束建议：

- 主键：`id`
- 外键：`project_id -> project.id`
- 唯一：`contract_no`
- 索引：`project_id`、`status`

### 7.3 `receipt_record`

建议最小字段：

- `id`
- `project_id`
- `contract_id`
- `receipt_no`
- `source_type`
- `registered_amount`
- `confirmed_amount`
- `status`
- `confirmed_at`
- `confirmed_by`
- `reversed_from_id`

---

## 8. 第二阶段第一批 DDL 补点

第二阶段第一批不要求现在就给出最终 SQL migration，但应至少把会影响唯一约束、外键关系和高频查询的 DDL 级输入固定下来。

### 8.1 多合同与冻结模式 DDL 补点

建议补充以下表或字段：

1. `project_effective_contract_link`
  - 主键：`id`
  - 外键：`project_id -> project.id`、`contract_id -> contract.id`
  - 唯一建议：`project_id + contract_id + is_current(true)` 条件唯一
  - 索引建议：`project_id + is_current`、`contract_id + is_current`

2. `project_receipt_judgment_freeze`
  - 主键：`id`
  - 外键：`project_id -> project.id`
  - 唯一建议：同一 `project_id` 仅允许一条当前有效冻结记录，可用条件唯一索引表达
  - 索引建议：`project_id + frozen_at desc`

### 8.2 承接包 DDL 补点

建议补充以下表：

1. `contract_readiness_package`
  - 主键：`id`
  - 外键：`project_id -> project.id`、`contract_id -> contract.id`
  - 索引建议：`project_id + created_at desc`、`contract_id + status`

2. `contract_readiness_package_item`
  - 主键：`id`
  - 外键：`package_id -> contract_readiness_package.id`
  - 唯一建议：`package_id + item_key`

3. `contract_snapshot_init_record`
  - 外键：`package_id -> contract_readiness_package.id`、`snapshot_id -> contract_term_snapshot.id`

4. `receivable_plan_init_record`
  - 外键：`package_id -> contract_readiness_package.id`、`receivable_plan_version_id -> receivable_plan_version.id`

### 8.3 商业放行基线 DDL 补点

建议补充以下表：

1. `commercial_release_baseline`
  - 主键：`id`
  - 外键：`project_id -> project.id`、`quotation_review_id -> quotation_review.id`
  - 索引建议：`project_id + released_at desc`

2. `commercial_baseline_diff_result`
  - 主键：`id`
  - 外键：`baseline_id -> commercial_release_baseline.id`、`contract_id -> contract.id`
  - 唯一建议：同一 `baseline_id + contract_id + diff_status(active)` 条件唯一

3. `commercial_baseline_diff_item`
  - 主键：`id`
  - 外键：`diff_result_id -> commercial_baseline_diff_result.id`
  - 唯一建议：`diff_result_id + field_key`

4. `commercial_baseline_review_record`
  - 主键：`id`
  - 外键：`diff_result_id -> commercial_baseline_diff_result.id`
  - 索引建议：`diff_result_id + reviewed_at desc`

### 8.4 第二阶段验收与发放 DDL 补点

建议补充以下表或字段：

1. `acceptance_evidence_ref`
  - 主键：`id`
  - 外键：`acceptance_record_id -> acceptance_record.id`
  - 索引建议：`acceptance_record_id + evidence_type`

2. `commission_payout.acceptance_record_id`
  - 外键建议：`acceptance_record_id -> acceptance_record.id`
  - 约束建议：当 `stage_type = 'second'` 时非空，可通过 `check constraint` 或应用层 + migration 注释约束表达

### 8.5 成本率治理 DDL 补点

建议补充以下表或字段：

1. `internal_cost_rate_version`
  - 主键：`id`
  - 唯一建议：`rate_key + version`
  - 条件唯一建议：同一 `rate_key` 同一时间仅允许一条当前有效记录
  - 索引建议：`rate_key + is_current`、`effective_from`、`effective_to`

2. `project_actual_cost_record.rate_version_id`
  - 外键建议：`rate_version_id -> internal_cost_rate_version.id`
  - 索引建议：`project_id + rate_version_id`、`cost_type + rate_version_id`

3. `project_actual_cost_record.supersedes_record_id`
  - 自引用外键：`supersedes_record_id -> project_actual_cost_record.id`

### 8.6 敏感导出与审计 DDL 补点

建议补充以下表：

1. `sensitive_data_export_request`
  - 主键：`id`
  - 索引建议：`target_type + target_id`、`requested_by + status`

2. `sensitive_data_export_audit`
  - 主键：`id`
  - 外键：`request_id -> sensitive_data_export_request.id`
  - 索引建议：`request_id`、`exported_at desc`

### 8.7 第一批 DDL 级强约束建议

第一批建议至少额外固定以下约束：

1. 同一项目同时只能存在一条当前有效 `project_receipt_judgment_freeze`。
2. 同一承接包内同一 `item_key` 只能存在一条当前明细。
3. 同一差异结果内同一必比字段只允许一条差异明细。
4. `commission_payout` 在第二阶段类型下必须引用有效 `acceptance_record_id`。
5. `LABOR` 类型的 `project_actual_cost_record` 必须引用 `rate_version_id`。

### 8.8 第二阶段第二批 DDL 补点

第二阶段第二批应继续把会影响历史回看、可信口径与 gate 绑定的表、字段、唯一约束和索引要求固定下来。

#### 8.8.1 共享分摊与阶段归属

1. `shared_cost_allocation_basis`
  - 主键：`id`
  - 索引建议：`source_cost_scope_key`、`status + effective_at desc`
  - 条件唯一建议：同一来源事实范围同一时刻仅允许一条当前有效分摊依据

2. `shared_cost_allocation_result`
  - 主键：`id`
  - 外键：`basis_id -> shared_cost_allocation_basis.id`、`project_id -> project.id`
  - 唯一建议：同一 `basis_id + project_id + status(active)` 条件唯一
  - 索引建议：`project_id + status`、`basis_id + status`

3. `cost_stage_attribution_snapshot`
  - 主键：`id`
  - 外键：`cost_record_id -> project_actual_cost_record.id`
  - 索引建议：`cost_record_id + handled_at desc`、`attributed_stage + status`

#### 8.8.2 税务处理与经营基线

1. `accounting_tax_treatment_snapshot`
  - 主键：`id`
  - 外键建议：`project_id -> project.id`
  - 索引建议：`project_id + status`、`tax_treatment_type + deductibility_status`

2. `operating_baseline_package`
  - 主键：`id`
  - 外键建议：`project_id -> project.id`
  - 条件唯一建议：同一 `project_id` 同时仅允许一条 `is_current = true`
  - 索引建议：`project_id + is_current`、`effective_operating_baseline_id`

3. `change_package_baseline`
  - 主键：`id`
  - 外键：`baseline_package_id -> operating_baseline_package.id`
  - 唯一建议：`baseline_package_id + change_package_id`

#### 8.8.3 `as-of`、期末冻结与重述

1. `project_operating_snapshot`
  - 主键：`id`
  - 外键建议：`project_id -> project.id`
  - 索引建议：`project_id + snapshot_at desc`、`project_id + snapshot_mode`

2. `period_closing_snapshot`
  - 主键：`id`
  - 外键建议：`project_id -> project.id`
  - 唯一建议：`project_id + period_key + snapshot_mode(period-end)` 条件唯一
  - 索引建议：`project_id + period_key`、`snapshot_at desc`

3. `operating_restatement_record`
  - 主键：`id`
  - 外键：`project_id -> project.id`、`period_end_snapshot_id -> period_closing_snapshot.id`
  - 外键建议：`restates_snapshot_id -> project_operating_snapshot.id`
  - 索引建议：`project_id + handled_at desc`、`period_end_snapshot_id`

#### 8.8.4 经营信号与 gate 绑定

1. `operating_signal_evaluation_result`
  - 主键：`id`
  - 外键建议：`project_id -> project.id`
  - 索引建议：`project_id + evaluated_at desc`、`signal_level + status`

2. `data_maturity_evaluation_result`
  - 主键：`id`
  - 外键建议：`project_id -> project.id`
  - 索引建议：`project_id + evaluated_at desc`、`data_maturity_level + status`

3. `operating_signal_gate_binding`
  - 主键：`id`
  - 外键：`project_id -> project.id`、`signal_evaluation_id -> operating_signal_evaluation_result.id`
  - 索引建议：`project_id + generated_at desc`、`binding_action + status`

4. `commission_gate_review_record`
  - 主键：`id`
  - 外键：`binding_id -> operating_signal_gate_binding.id`
  - 索引建议：`binding_id + handled_at desc`、`gate_review_decision + status`

### 8.9 第二批 DDL 级强约束建议

第二批建议至少额外固定以下约束：

1. 同一来源事实范围同一时刻只能存在一条当前有效 `shared_cost_allocation_basis`。
2. 同一 `basis_id + project_id` 只能存在一条当前有效 `shared_cost_allocation_result`。
3. 同一成本记录同一时刻只能存在一条当前有效 `cost_stage_attribution_snapshot`。
4. 同一项目同一期末只允许一条当前有效 `period_closing_snapshot`。
5. 每条 `operating_restatement_record` 都必须引用明确的 `period_end_snapshot_id` 与被替代历史口径。
6. `operating_signal_gate_binding` 的 `BLOCK` 结论一旦生效，必须能被第二阶段发放命令消费为真实 guard，而不是页面提示。

### 8.10 第二阶段第三批 DDL 补点

第二阶段第三批应继续把会影响负路径追溯、最小可见授权、审批摘要包和冻结后争议处理的表、字段、唯一约束和索引要求固定下来。

#### 8.10.1 再基线化与签约前回退

1. `contract_handover_rebaseline_record`
  - 主键：`id`
  - 外键：`contract_amendment_id -> contract_amendment.id`
  - 外键建议：`effective_baseline_after_id -> contract_term_snapshot.id`
  - 索引建议：`contract_amendment_id + handled_at desc`、`effective_baseline_after_id`

2. `handover_baseline_impact_item`
  - 主键：`id`
  - 外键：`rebaseline_record_id -> contract_handover_rebaseline_record.id`
  - 唯一建议：`rebaseline_record_id + affected_handover_item_id`

3. `presigning_rollback_request`
  - 主键：`id`
  - 外键：`project_id -> project.id`
  - 索引建议：`project_id + handled_at desc`、`rollback_from_stage + rollback_to_stage`

4. `presigning_workspace_reopen_record`
  - 主键：`id`
  - 外键：`rollback_request_id -> presigning_rollback_request.id`
  - 唯一建议：`rollback_request_id + workspace_key`

#### 8.10.2 短时揭示与审批摘要包

1. `sensitive_field_reveal_request`
  - 主键：`id`
  - 索引建议：`target_type + target_id`、`requested_by + status`、`requested_expires_at`

2. `sensitive_field_reveal_grant`
  - 主键：`id`
  - 外键：`request_id -> sensitive_field_reveal_request.id`
  - 索引建议：`request_id + status`、`expires_at desc`

3. `sensitive_field_reveal_audit`
  - 主键：`id`
  - 外键：`grant_id -> sensitive_field_reveal_grant.id`
  - 索引建议：`grant_id + accessed_at desc`、`viewer_id + accessed_at desc`

4. `approval_summary_package_definition`
  - 主键：`id`
  - 唯一建议：`approval_scenario_key + summary_package_key`
  - 索引建议：`approval_scenario_key + status`

5. `approval_summary_snapshot`
  - 主键：`id`
  - 外键：`summary_package_id -> approval_summary_package_definition.id`
  - 索引建议：`target_type + target_id`、`approval_scenario_key + generated_at desc`

6. `approval_summary_field_projection`
  - 主键：`id`
  - 外键：`summary_snapshot_id -> approval_summary_snapshot.id`
  - 唯一建议：`summary_snapshot_id + field_key`

#### 8.10.3 冻结后争议与受控变更

1. `commission_freeze_dispute_record`
  - 主键：`id`
  - 外键：`project_id -> project.id`
  - 外键建议：`freeze_version_id -> commission_role_assignment.id`
  - 索引建议：`project_id + handled_at desc`、`freeze_version_id + status`

2. `commission_freeze_change_request`
  - 主键：`id`
  - 外键：`dispute_record_id -> commission_freeze_dispute_record.id`
  - 外键建议：`replacement_freeze_version_id -> commission_role_assignment.id`
  - 索引建议：`dispute_record_id + handled_at desc`、`replacement_freeze_version_id`

### 8.11 第三批 DDL 级强约束建议

第三批建议至少额外固定以下约束：

1. 同一 `contract_amendment_id` 在同一承接链上同一时刻只能存在一条当前有效 `contract_handover_rebaseline_record`。
2. 每条已批准的 `presigning_rollback_request` 至少必须对应一条 `presigning_workspace_reopen_record`，且必须显式保留被失效结论引用。
3. 每条有效 `sensitive_field_reveal_grant` 都必须带 `expires_at`，且到期后不得继续作为详情查询放宽边界的依据。
4. 同一审批对象、同一 `approval_scenario_key + projection_level` 在同一时刻只允许一条当前有效 `approval_summary_snapshot`。
5. `commission_freeze_change_request` 生效前必须存在明确的 `arbitration_decision` 与 `recalculation_impact_mode`，不得直接原地覆盖当前冻结版本。
- `row_version`
- `created_at`
- `created_by`

约束建议：

- 主键：`id`
- 外键：`project_id -> project.id`、`contract_id -> contract.id`
- 索引：`project_id`、`contract_id`、`status`
- 反向关系：`reversed_from_id` 建议自引用索引

### 7.4 `commission_calculation`

建议最小字段：

- `id`
- `project_id`
- `rule_version_id`
- `version`
- `is_current`
- `status`
- `calculated_amount`
- `recalculated_from_id`
- `approved_at`
- `approved_by`
- `row_version`
- `created_at`
- `created_by`

约束建议：

- 主键：`id`
- 外键：`project_id -> project.id`、`rule_version_id -> commission_rule_version.id`
- 唯一：`project_id + version`
- 索引：`project_id + is_current`、`status`

### 7.4A `platform_user`

建议最小字段：

- `id`
- `username`
- `display_name`
- `email`
- `phone`
- `avatar_url`
- `is_active`
- `primary_org_unit_id`
- `last_login_at`
- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

约束建议：

- 主键：`id`
- 外键：`primary_org_unit_id -> org_unit.id`
- 唯一：`username`
- 索引：`username`、`is_active`、`primary_org_unit_id`

### 7.4B `role`

建议最小字段：

- `id`
- `role_key`
- `name`
- `description`
- `is_active`
- `is_system_role`
- `display_order`
- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

约束建议：

- 主键：`id`
- 唯一：`role_key`
- 索引：`role_key`、`is_active`

### 7.4C `org_unit`

建议最小字段：

- `id`
- `name`
- `code`
- `description`
- `parent_id`
- `is_active`
- `display_order`
- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

约束建议：

- 主键：`id`
- 外键：`parent_id -> org_unit.id`
- 唯一：`code`
- 索引：`parent_id`、`is_active`

### 7.4D `user_role_assignment`

建议最小字段：

- `id`
- `user_id`
- `role_id`
- `status`
- `assigned_at`
- `assigned_by`
- `revoked_at`
- `revoked_by`
- `change_reason`
- `created_at`
- `created_by`

约束建议：

- 主键：`id`
- 外键：`user_id -> platform_user.id`、`role_id -> role.id`
- 条件唯一：同一 `user_id + role_id` 仅允许一条 `status = active`
- 索引：`user_id + status`、`role_id + status`

### 7.4E `user_org_membership`

建议最小字段：

- `id`
- `user_id`
- `org_unit_id`
- `membership_type`
- `status`
- `assigned_at`
- `assigned_by`
- `revoked_at`
- `revoked_by`
- `change_reason`
- `created_at`
- `created_by`

约束建议：

- 主键：`id`
- 外键：`user_id -> platform_user.id`、`org_unit_id -> org_unit.id`
- 条件唯一：同一 `user_id + org_unit_id` 仅允许一条 `status = active`
- 条件唯一：同一 `user_id` 仅允许一条 `membership_type = primary and status = active`
- 索引：`user_id + status`、`org_unit_id + status`

### 7.4F `role_permission_assignment`

建议最小字段：

- `id`
- `role_id`
- `permission_key`
- `status`
- `assigned_at`
- `assigned_by`
- `revoked_at`
- `revoked_by`
- `change_reason`
- `created_at`
- `created_by`

约束建议：

- 主键：`id`
- 外键：`role_id -> role.id`
- 条件唯一：同一 `role_id + permission_key` 仅允许一条 `status = active`
- 索引：`role_id + status`、`permission_key`

### 7.4G `commission_rule_version`

建议最小字段：

- `id`
- `rule_code`
- `version`
- `status`
- `effective_from`
- `tier_definition_json`
- `first_stage_cap_rule_json`
- `second_stage_cap_rule_json`
- `retention_rule_json`
- `low_down_payment_rule_json`
- `exception_rule_json`
- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

约束建议：

- 主键：`id`
- 唯一：`rule_code + version`
- 索引：`status`、`effective_from`

### 7.4H `commission_role_assignment`

建议最小字段：

- `id`
- `project_id`
- `version`
- `is_current`
- `role_type`
- `user_id`
- `weight`
- `status`
- `frozen_at`
- `supersedes_id`
- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

约束建议：

- 主键：`id`
- 外键：`project_id -> project.id`、`user_id -> platform_user.id`
- 唯一：`project_id + version`
- 索引：`project_id + is_current`、`status`

### 7.4I `commission_payout`

建议最小字段：

- `id`
- `project_id`
- `calculation_id`
- `stage_type`
- `selected_tier`
- `theoretical_cap_amount`
- `approved_amount`
- `paid_record_amount`
- `status`
- `approved_at`
- `approved_by`
- `handled_at`
- `handled_by`
- `reversed_from_id`
- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

约束建议：

- 主键：`id`
- 外键：`project_id -> project.id`、`calculation_id -> commission_calculation.id`
- 唯一：`project_id + calculation_id + stage_type`
- 索引：`project_id + status`、`calculation_id`

### 7.4J `commission_adjustment`

建议最小字段：

- `id`
- `project_id`
- `adjustment_type`
- `related_payout_id`
- `related_calculation_id`
- `amount`
- `reason`
- `status`
- `executed_at`
- `executed_by`
- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

约束建议：

- 主键：`id`
- 外键：`project_id -> project.id`、`related_payout_id -> commission_payout.id`、`related_calculation_id -> commission_calculation.id`
- 索引：`project_id + status`、`related_payout_id`、`related_calculation_id`

### 7.5 `approval_record`

建议最小字段：

- `id`
- `target_type`
- `target_id`
- `status`
- `current_node_key`
- `submitted_at`
- `submitted_by`
- `closed_at`
- `closed_by`
- `row_version`
- `created_at`
- `created_by`

约束建议：

- 主键：`id`
- 索引：`target_type + target_id`、`status`
- 不做多态强外键

---

## 8. 派生汇总表策略

对经营看板、首页统计和高频摘要查询，第一阶段建议采用以下原则：

1. 默认先按稳定事实源实时聚合，不预设大量宽表。
2. 只有在高频查询已明确成为性能瓶颈时，才考虑增加少量派生汇总表。
3. 若引入派生汇总表，应明确其是“可重建缓存层”，不是新的业务权威源。

第一阶段允许后续新增但当前不强制的派生表类型：

- `project_operating_snapshot`
- `project_receivable_summary`
- `project_commission_summary`

---

## 9. 当前不在本文档中写死的内容

当前仍不在本文件中写死以下内容：

- `PostgreSQL` 内部更细的方言实现细节，例如在线索引策略、表分区细节、扩展插件选型
- 迁移工具选型与版本号
- 触发器、存储过程、物化视图是否启用
- 分区表、冷热归档、全文索引和搜索引擎落地方案
- 全量枚举值域与 check constraint 明细

这些内容应在真正编写迁移脚本时，结合技术栈再继续落地。

---

## 10. 当前结论

第一阶段已经具备进入真实建表脚本前的 schema / DDL 级基线，第二阶段第一批与第二批也已经具备把关键约束、外键和索引要求写入 DDL 输入的条件。当前最稳妥的推进方式，是在 `ADR-012` 已接受 `PostgreSQL + SQL-first migration + MikroORM` 的前提下，按本文件固定命名规则、公共字段模板、主外键、唯一约束、高频索引以及两批 DDL 补点推进 migration 设计，并同步开始应用层实体映射与仓储建模。
