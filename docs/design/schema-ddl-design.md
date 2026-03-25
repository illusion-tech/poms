# POMS Schema 与 DDL 细化设计

**文档状态**: Active
**最后更新**: 2026-03-25
**适用范围**: `POMS` 第一阶段在接口、查询视图与逻辑表结构边界稳定后，用于进入真实建表脚本前的 schema / DDL 级细化基线
**关联文档**:

- 上游设计:
  - `../adr/012-data-persistence-technology-selection.md`
  - `poms-requirements-spec.md`
  - `poms-hld.md`
  - `poms-design-progress.md`
  - `design-review-follow-up-summary.md`
- 同级设计:
  - `query-view-boundary-design.md`
  - `data-model-prerequisites.md`
  - `table-structure-freeze-design.md`
  - `interface-openapi-dto-design.md`
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`

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

第一阶段已经具备进入真实建表脚本前的 schema / DDL 级基线。当前最稳妥的推进方式，是在 `ADR-012` 已接受 `PostgreSQL + SQL-first migration + MikroORM` 的前提下，按本文件固定命名规则、公共字段模板、主外键、唯一约束和高频索引基线推进 migration 设计，并同步开始应用层实体映射与仓储建模。
