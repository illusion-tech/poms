# POMS 表结构冻结设计

**文档状态**: Active
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第一阶段逻辑表结构冻结设计，以及第二阶段第一批、第二批、第三批实现映射写回前的逻辑表补点基线
**关联文档**:

- 上游设计:
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
  - `interface-command-design.md`
  - `interface-openapi-dto-design.md`
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`
  - `phase2-data-permission-and-sensitive-visibility-design.md`

---

## 1. 文档目标

本文档用于把 `data-model-prerequisites.md` 中“是否可以开始冻结”的前提，继续下钻为第一阶段可执行的逻辑表结构冻结基线，重点回答以下问题：

- 哪些逻辑表必须在第一阶段明确存在
- 主表、版本表、快照表、动作记录表、派生支撑表如何分层
- 哪些关键字段组必须在进入 DDL 前稳定下来
- 哪些内容仍应留到真正的 schema / DDL 级细化再定

本文档不是最终 DDL，也不直接给出具体数据库方言；它的作用是先冻结逻辑表边界、主键关系、核心字段组和读写支撑要求，再进入真正的 schema 命名、字段类型、索引与约束细化。

补充当前阶段判断：

- 本文档当前必须直接服务于平台治理域与提成治理域的第一阶段补齐实施
- 因此需要把平台治理域主数据逻辑表与提成治理域补齐对象正式纳入表结构冻结范围
- 第二阶段第一批 6 个专题已完成写回，第二阶段第二批 7 个专题也已进入实现设计下钻，因此需要把相关逻辑表、关键字段组与读写支撑关系正式纳入冻结范围

---

## 2. 冻结范围与基本原则

第一阶段建议按以下原则冻结逻辑表结构：

1. 先冻结逻辑表职责，不先冻结数据库方言细节。
2. 先冻结主键关系、版本关系、快照关系、动作留痕关系，再冻结字段类型与索引。
3. 读侧高频列表、详情、经营看板、待办追溯必须反向约束逻辑表拆分。
4. 任何会导致“写模型被读侧视图反推同形”的设计，都不应在此阶段冻结。
5. 动作事实优先独立留痕，不把审批、确认、关闭、作废、冲销、重算全部挤进主表状态字段。

---

## 3. 逻辑表分层基线

第一阶段建议统一采用以下逻辑分层：

| 分层          | 作用                                         | 典型表                                                                                                   | 冻结要求                                               |
| ------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 主体主表      | 承载当前主体事实与当前主状态                 | `project`、`contract`、`invoice_record`                                                                  | 必须明确主键、归属关系、当前状态字段组                 |
| 版本表        | 承载可替代版本与当前有效版本关系             | `scope_confirmation_version`、`contract_amendment`、`receivable_plan_version`、`commission_rule_version` | 必须明确 `version`、`is_current`、`supersedes_id` 语义 |
| 快照表        | 承载生效时点冻结输入                         | `contract_term_snapshot`、`commission_calculation_snapshot`                                              | 必须明确生成时点与引用关系                             |
| 动作记录表    | 承载审批、确认、关闭、作废、冲销、重算等事实 | `approval_record`、`confirmation_record`、`receipt_record_action`                                        | 必须追加式留痕，不能被普通更新覆盖                     |
| 派生 / 支撑表 | 承载待办、通知、附件、审计、汇总缓存等       | `todo_item`、`notification_record`、`audit_log`                                                          | 必须明确其派生来源，不反向决定主体事实                 |

补充说明：

- 平台治理域中的关系表（用户-角色、用户-组织、角色-权限）在第一阶段应视为正式关系事实源，而不是临时映射层
- 提成治理域中的规则、分配、计算、发放、调整对象在第一阶段都应进入正式冻结范围，不能继续停留在专题设计层

---

## 4. 第一阶段必须冻结的逻辑表清单

### 4.1 销售流程域

| 逻辑表                       | 表角色     | 最小字段组                                                                                                                                     | 关键关系                                                             | 说明                       |
| ---------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------- |
| `project`                    | 主体主表   | `id`、`project_code`、`project_name`、`customer_id`、`status`、`current_stage`、`owner_org_id`、`owner_user_id`                                | 可被 `contract`、`bid_process`、`approval_record` 引用               | 第一阶段核心主链路主表     |
| `project_assessment`         | 动作记录表 | `id`、`project_id`、`status`、`submitted_at`、`submitted_by`                                                                                   | 归属 `project`                                                       | 用于评估提交与结论留痕     |
| `scope_confirmation_version` | 版本表     | `id`、`project_id`、`version`、`is_current`、`supersedes_id`、`status`                                                                         | 归属 `project`                                                       | 已确认范围不应原地覆盖     |
| `bid_process`                | 主体主表   | `id`、`project_id`、`status`、`decision_status`、`result_status`                                                                               | 归属 `project`                                                       | 第一类受控子流程           |
| `project_handover`           | 动作记录表 | `id`、`project_id`、`contract_summary_snapshot_id`、`effective_handover_baseline_snapshot_id`、`summary_snapshot_id`、`status`、`confirmed_at` | 归属 `project`；引用合同承接摘要 / 当前移交前有效基线 / 移交确认摘要 | 移交里程碑事实与确认收口链 |
| `acceptance_record`          | 动作记录表 | `id`、`project_id`、`acceptance_type`、`status`、`confirmed_at`                                                                                | 归属 `project`                                                       | 阶段 / 最终验收留痕        |

### 4.2 合同资金域

| 逻辑表                    | 表角色     | 最小字段组                                                                                                      | 关键关系                      | 说明                 |
| ------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------- |
| `contract`                | 主体主表   | `id`、`project_id`、`contract_no`、`status`、`signed_amount`、`current_snapshot_id`                             | 归属 `project`                | 合同主事实           |
| `contract_term_snapshot`  | 快照表     | `id`、`contract_id`、`effective_at`、`effective_by`、`snapshot_status`                                          | 归属 `contract`               | 生效条款冻结源       |
| `contract_amendment`      | 版本表     | `id`、`contract_id`、`version`、`is_current`、`supersedes_id`、`status`                                         | 归属 `contract`               | 变更版本链           |
| `receivable_plan_version` | 版本表     | `id`、`contract_id`、`snapshot_id`、`version`、`is_current`、`status`                                           | 归属 `contract_term_snapshot` | 计划版本链           |
| `receipt_record`          | 动作记录表 | `id`、`project_id`、`contract_id`、`registered_amount`、`confirmed_amount`、`status`、`source_type`             | 归属 `project` / `contract`   | 到账登记与确认事实   |
| `payable_record`          | 主体主表   | `id`、`project_id`、`status`、`registered_amount`                                                               | 归属 `project`                | 第一阶段成本台账主体 |
| `payment_record`          | 动作记录表 | `id`、`payable_record_id`、`registered_amount`、`status`、`confirmed_at`                                        | 归属 `payable_record`         | 付款登记 / 确认事实  |
| `invoice_record`          | 主体主表   | `id`、`project_id`、`contract_id`、`invoice_type`、`invoice_no`、`invoice_amount`、`status`、`exception_status` | 归属 `project` / `contract`   | 发票台账主体         |

### 4.3 提成治理域

| 逻辑表                            | 表角色     | 最小字段组                                                                                                                                                                                                               | 关键关系                                                                        | 说明                 |
| --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------- |
| `commission_rule_version`         | 版本表     | `id`、`rule_code`、`version`、`status`、`effective_at`                                                                                                                                                                   | 被计算结果引用                                                                  | 统一规则版本对象     |
| `commission_role_assignment`      | 版本表     | `id`、`project_id`、`version`、`is_current`、`role_type`、`user_id`、`weight`、`source_handover_id`、`contract_summary_snapshot_id`、`handover_summary_snapshot_id`、`effective_handover_baseline_snapshot_id`、`status` | 归属 `project`；引用移交记录 / 合同承接摘要 / 移交确认摘要 / 当前移交前有效基线 | 角色分配冻结版本链   |
| `commission_calculation`          | 版本表     | `id`、`project_id`、`rule_version_id`、`version`、`is_current`、`status`、`recalculated_from_id`                                                                                                                         | 归属 `project`                                                                  | 计算结果版本链       |
| `commission_calculation_snapshot` | 快照表     | `id`、`commission_calculation_id`、`snapshot_status`、`generated_at`                                                                                                                                                     | 归属 `commission_calculation`                                                   | 计算输入冻结口径     |
| `commission_payout`               | 动作记录表 | `id`、`project_id`、`calculation_id`、`stage_type`、`approved_amount`、`paid_record_amount`、`status`、`handled_at`                                                                                                      | 归属 `project` / `commission_calculation`                                       | 发放与冲销事实       |
| `commission_adjustment`           | 动作记录表 | `id`、`project_id`、`adjustment_type`、`related_payout_id`、`related_calculation_id`、`status`、`handled_at`                                                                                                             | 归属 `project` / 提成发放 / 计算结果                                            | 异常调整、补发、扣回 |

### 4.3A 平台治理域

| 逻辑表                       | 表角色        | 最小字段组                                                                               | 关键关系                          | 说明                   |
| ---------------------------- | ------------- | ---------------------------------------------------------------------------------------- | --------------------------------- | ---------------------- |
| `platform_user`              | 主体主表      | `id`、`username`、`display_name`、`is_active`、`primary_org_unit_id`                     | 归属 `org_unit`                   | 平台用户主体           |
| `role`                       | 主体主表      | `id`、`role_key`、`name`、`is_active`、`is_system_role`                                  | 被 `user_role_assignment` 引用    | 平台角色主体           |
| `org_unit`                   | 主体主表      | `id`、`name`、`code`、`parent_id`、`is_active`、`display_order`                          | 自引用树结构；被用户关系引用      | 平台组织树主体         |
| `user_role_assignment`       | 动作 / 关系表 | `id`、`user_id`、`role_id`、`status`、`assigned_at`、`revoked_at`                        | 归属 `platform_user` / `role`     | 用户与角色正式关系来源 |
| `user_org_membership`        | 动作 / 关系表 | `id`、`user_id`、`org_unit_id`、`membership_type`、`status`、`assigned_at`、`revoked_at` | 归属 `platform_user` / `org_unit` | 用户与组织正式关系来源 |
| `role_permission_assignment` | 动作 / 关系表 | `id`、`role_id`、`permission_key`、`status`、`assigned_at`、`revoked_at`                 | 归属 `role`                       | 角色与权限正式关系来源 |

说明：

- 第一阶段权限字典仍可保持共享契约 + 种子事实源，不强制单独冻结为可维护主表
- 但 `role_permission_assignment` 必须进入正式关系表冻结范围

### 4.4 横切支撑域

| 逻辑表                     | 表角色         | 最小字段组                                                                            | 关键关系                   | 说明         |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------- | -------------------------- | ------------ |
| `approval_record`          | 动作记录表     | `id`、`target_type`、`target_id`、`status`、`current_node_key`、`submitted_at`        | 通用引用业务对象           | 统一审批实例 |
| `approval_record_node`     | 动作记录表子表 | `id`、`approval_record_id`、`node_key`、`node_status`、`handled_at`                   | 归属 `approval_record`     | 审批节点历史 |
| `confirmation_record`      | 动作记录表     | `id`、`target_type`、`target_id`、`status`、`confirmed_count`                         | 通用引用业务对象           | 统一确认实例 |
| `confirmation_participant` | 动作记录表子表 | `id`、`confirmation_record_id`、`participant_id`、`participant_status`                | 归属 `confirmation_record` | 多方确认明细 |
| `todo_item`                | 派生 / 支撑表  | `id`、`source_type`、`source_id`、`target_type`、`target_id`、`status`、`assignee_id` | 由审批 / 确认派生          | 统一待办     |
| `notification_record`      | 派生 / 支撑表  | `id`、`target_type`、`target_id`、`notification_type`、`status`                       | 由业务动作派生             | 统一通知     |
| `attachment`               | 派生 / 支撑表  | `id`、`storage_key`、`biz_type`、`biz_id`、`uploaded_at`                              | 被业务对象或动作记录引用   | 通用附件     |
| `audit_log`                | 派生 / 支撑表  | `id`、`event_type`、`target_type`、`target_id`、`operator_id`、`occurred_at`          | 通用引用业务对象           | 统一审计     |
| `security_event`           | 派生 / 支撑表  | `id`、`event_type`、`actor_id`、`path`、`result`、`occurred_at`                       | 通用引用用户或匿名访问主体 | 安全事件     |

---

## 5. 关键字段组冻结要求

在进入 schema / DDL 级细化前，建议至少固定以下字段组语义：

### 5.1 主体标识字段组

- `id`
- 业务编码字段，如 `project_code`、`contract_no`
- `project_id`、`contract_id`、`rule_version_id` 等核心引用字段

### 5.2 状态字段组

- 主体状态，如 `status`、`current_stage`
- 版本状态，如 `is_current`
- 动作处理状态，如 `handled_status`、`node_status`

### 5.3 版本与替代关系字段组

- `version`
- `supersedes_id`
- `recalculated_from_id`
- `reversed_from_id`
- `voided_from_id`

### 5.4 审计与并发控制字段组

- `created_at`、`created_by`
- `updated_at`、`updated_by`
- `expected_version` 或等价乐观锁字段

### 5.5 平台治理域关键字段组

- `platform_user.username / is_active / primary_org_unit_id`
- `role.role_key / is_active / is_system_role`
- `org_unit.code / parent_id / is_active / display_order`
- `user_role_assignment.status / assigned_at / revoked_at`
- `user_org_membership.membership_type / status / assigned_at / revoked_at`
- `role_permission_assignment.permission_key / status / assigned_at / revoked_at`

### 5.6 提成治理域关键字段组补充

- `commission_rule_version.rule_code / version / status / effective_at`
- `commission_role_assignment.role_type / user_id / weight / version / is_current`
- `commission_calculation.rule_version_id / version / is_current / recalculated_from_id`
- `commission_payout.calculation_id / stage_type / approved_amount / paid_record_amount / status`
- `commission_adjustment.adjustment_type / related_payout_id / related_calculation_id / status`

说明：

- 字段名可在 DDL 阶段做轻微统一调整，但字段组语义不应再被推翻。

---

## 6. 面向查询视图的冻结要求

逻辑表结构冻结必须同时支撑 `query-view-boundary-design.md` 中已确认的读侧需求：

1. `project`、`contract`、`invoice_record` 等主体主表必须能高效支撑列表摘要字段。
2. 详情视图所需的版本摘要、快照摘要和动作历史，必须能通过明确关系查询到，而不是依赖 JSON 大字段一次塞满。
3. 统一待办和审批 / 确认追溯所需字段，必须来自独立动作记录表或其子表。
4. 经营看板所需汇总若不直接实时计算，应在后续 schema / DDL 级细化时明确是否引入派生汇总表，但本阶段先冻结“允许有派生层，不强迫主表承载全部汇总”。

---

## 7. 第二阶段第一批逻辑表补点

第一批不是要新建一套孤立模型，而是要把会决定 `L1 ~ L5` 主事实稳定性的表和子表正式纳入冻结清单。

### 7.1 多合同与冻结模式补点

| 逻辑表                            | 表角色        | 最小字段组                                                                                                                               | 关键关系                                                     | 说明                       |
| --------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| `project_effective_contract_link` | 关系 / 版本表 | `id`、`project_id`、`contract_id`、`is_current`、`linked_at`、`unlinked_at`                                                              | 归属 `project` / `contract`                                  | 表达项目当前有效合同集合   |
| `project_receipt_judgment_freeze` | 动作记录表    | `id`、`project_id`、`receipt_judgment_mode`、`source_type`、`source_id`、`source_handover_summary_snapshot_id`、`frozen_at`、`frozen_by` | 归属 `project`；可追溯 `project_handover` 与移交确认摘要快照 | 表达项目级回款判断模式冻结 |

`L3` 强节点统一收口链最小冻结字段组：

- `contract_summary_snapshot_id`
- `effective_handover_baseline_snapshot_id`
- `summary_snapshot_id`
- `source_handover_id`
- `handover_summary_snapshot_id`

### 7.2 签约就绪承接补点

| 逻辑表                            | 表角色        | 最小字段组                                                                                                                                   | 关键关系                                                   | 说明                                           |
| --------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| `contract_readiness_package`      | 快照 / 版本表 | `id`、`project_id`、`contract_id`、`status`、`source_baseline_id`、`latest_diff_result_id`、`guard_decision`、`generated_at`、`generated_by` | 归属 `project` / `contract`；强关联商业放行基线 / 差异结果 | 承载 `签约就绪` 的结构化承接包与初始化守卫     |
| `contract_readiness_package_item` | 子表          | `id`、`package_id`、`item_type`、`item_key`、`source_workspace_key`、`item_status`、`summary_value`                                          | 归属 `contract_readiness_package`                          | 承接包明细、六工作区来源、阻断原因和初始化输入 |
| `contract_snapshot_init_record`   | 动作记录表    | `id`、`package_id`、`snapshot_id`、`init_decision`、`blocked_reason_code`、`status`、`initialized_at`                                        | 归属承接包 / 合同快照                                      | 正式合同快照初始化留痕与守卫结论               |
| `receivable_plan_init_record`     | 动作记录表    | `id`、`package_id`、`receivable_plan_version_id`、`init_decision`、`blocked_reason_code`、`status`、`initialized_at`                         | 归属承接包 / 应收计划版本                                  | 正式应收计划初始化留痕与守卫结论               |

### 7.3 商业放行基线补点

| 逻辑表                              | 表角色        | 最小字段组                                                                                  | 关键关系                            | 说明                       |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------- |
| `commercial_release_baseline`       | 快照表        | `id`、`project_id`、`quotation_review_id`、`status`、`released_at`、`released_by`           | 归属 `project` / `quotation_review` | 商业放行基线主表           |
| `commercial_baseline_diff_result`   | 动作 / 结果表 | `id`、`baseline_id`、`contract_id`、`diff_level`、`diff_status`、`generated_at`             | 归属基线 / 合同                     | 合同草稿相对基线的差异结果 |
| `commercial_baseline_diff_item`     | 子表          | `id`、`diff_result_id`、`field_key`、`old_value_summary`、`new_value_summary`、`diff_level` | 归属差异结果                        | 必比字段差异明细           |
| `commercial_baseline_review_record` | 动作记录表    | `id`、`diff_result_id`、`review_decision`、`reviewed_by`、`reviewed_at`                     | 归属差异结果                        | 差异复核与放行留痕         |

### 7.4 第二阶段验收与发放补点

| 逻辑表                    | 表角色           | 最小字段组                                                                       | 关键关系                   | 说明                 |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------- | -------------------------- | -------------------- |
| `acceptance_evidence_ref` | 子表             | `id`、`acceptance_record_id`、`evidence_type`、`evidence_ref_id`、`summary_text` | 归属 `acceptance_record`   | 阶段成果验收证据链   |
| `commission_payout` 补点  | 动作记录表补字段 | `acceptance_record_id`、`evidence_summary`                                       | 外键到 `acceptance_record` | 第二阶段发放前置引用 |

### 7.5 成本率治理补点

| 逻辑表                            | 表角色         | 最小字段组                                                                               | 关键关系                             | 说明                     |
| --------------------------------- | -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------ |
| `internal_cost_rate_version`      | 版本表         | `id`、`rate_key`、`version`、`status`、`effective_from`、`effective_to`、`supersedes_id` | 被 `project_actual_cost_record` 引用 | 人力成本率版本链         |
| `project_actual_cost_record` 补点 | 主体主表补字段 | `rate_version_id`、`supersedes_record_id`、`labor_period_start`、`labor_period_end`      | 外键到成本率版本 / 自引用            | `LABOR` 成本追溯与替代链 |

### 7.6 敏感导出与守卫补点

| 逻辑表                          | 表角色     | 最小字段组                                                                                      | 关键关系                 | 说明                |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- | ------------------------ | ------------------- |
| `sensitive_data_export_request` | 动作记录表 | `id`、`target_type`、`target_id`、`field_package_key`、`status`、`requested_by`、`requested_at` | 可关联 `approval_record` | 高敏导出 / 打印申请 |
| `sensitive_data_export_audit`   | 审计表     | `id`、`request_id`、`result_status`、`exported_at`、`exported_by`                               | 归属导出申请             | 导出执行留痕        |

说明：

- 第一批不强制把字段级可见策略完全做成可维护后台，但逻辑表结构必须允许其有稳定来源和审计对象。

### 7.7 第二阶段第二批逻辑表补点

| 逻辑表                                                   | 表角色            | 最小字段组                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 关键关系                                                                                | 说明                                             |
| -------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `shared_cost_allocation_basis`                           | 快照 / 版本表     | `id`、`source_cost_scope_key`、`basis_type`、`allocation_method`、`status`、`effective_at`、`supersedes_id`                                                                                                                                                                                                                                                                                                                                                                                                                                          | 被 `shared_cost_allocation_result` 引用                                                 | 共享分摊依据主表                                 |
| `shared_cost_allocation_result`                          | 结果 / 版本表     | `id`、`basis_id`、`project_id`、`allocated_amount`、`allocation_ratio`、`status`、`supersedes_id`                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 归属分摊依据 / 项目                                                                     | 项目级分摊结果与替代链                           |
| `cost_stage_attribution_snapshot`                        | 快照表            | `id`、`cost_record_id`、`attributed_stage`、`attribution_mode`、`locked_by_snapshot_id`、`status`、`supersedes_id`                                                                                                                                                                                                                                                                                                                                                                                                                                   | 归属 `project_actual_cost_record`                                                       | 阶段归属锁定与重分类                             |
| `accounting_tax_treatment_snapshot`                      | 快照表            | `id`、`project_id`、`tax_treatment_type`、`deductibility_status`、`tax_impact_amount`、`tax_pending_flag`、`tax_impact_summary`、`tax_impact_pending_amount`、`supersedes_id`                                                                                                                                                                                                                                                                                                                                                                        | 归属项目；被经营核算视图与经营信号结果引用                                              | 税务处理与核算口径                               |
| `operating_baseline_package`                             | 版本表            | `id`、`project_id`、`original_baseline_id`、`effective_operating_baseline_id`、`status`、`is_current`、`supersedes_id`                                                                                                                                                                                                                                                                                                                                                                                                                               | 可被 `change_package_baseline` 与经营桥接视图引用                                       | 当前有效经营基线包                               |
| `change_package_baseline`                                | 子表 / 版本表     | `id`、`baseline_package_id`、`change_package_id`、`baseline_amount`、`status`、`supersedes_id`                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 归属 `operating_baseline_package`                                                       | 变更包基线明细                                   |
| `project_operating_snapshot` / `period_closing_snapshot` | 快照表 / 快照表   | `id`、`project_id`、`snapshot_mode`、`snapshot_at`、`source_window_start`、`source_window_end`、`effective_contract_total`、`receivable_confirmed_total`、`included_cost_total`、`original_baseline_cost`、`current_effective_baseline_cost`、`gross_margin_amount`、`gross_margin_rate`、`tax_impact_summary`、`tax_impact_pending_amount`、`allocation_stability_summary`、`unmapped_cost_summary`、`current_action_level`、`referenced_baseline_version`、`baseline_selection_source`、`handover_rebaseline_record_id`、`status`、`supersedes_id` | 归属项目；可关联移交前再基线化记录；被 `operating_restatement_record`、经营信号结果引用 | 实时与期末经营口径及 `L4-T01 / T02` 稳定结果锚点 |
| `operating_restatement_record`                           | 动作记录表        | `id`、`project_id`、`period_end_snapshot_id`、`restates_snapshot_id`、`restated_snapshot_id`、`restatement_reason`、`restatement_summary`、`status`、`handled_at`                                                                                                                                                                                                                                                                                                                                                                                    | 归属项目；强关联期末快照 / 被替代快照 / 新重述快照                                      | 补录 / 重述替代链                                |
| `operating_signal_evaluation_result`                     | 派生 / 结果表     | `id`、`project_id`、`referenced_snapshot_id`、`data_maturity_evaluation_id`、`signal_level`、`risk_level`、`formula_boundary_action`、`variance_source_summary`、`tax_impact_summary`、`allocation_stability_summary`、`unmapped_cost_summary`、`current_action_level`、`recommended_action_summary`、`referenced_baseline_version`、`referenced_snapshot_version`、`review_required`、`evaluated_at`、`status`                                                                                                                                      | 归属项目；强关联经营快照 / 成熟度结果；被 gate 绑定表与复核记录消费                     | 经营信号与偏差解释结果                           |
| `operating_signal_review_record`                         | 动作记录表        | `id`、`signal_evaluation_id`、`review_decision`、`resolved_data_maturity_level`、`resolved_cost_action_recommendation`、`resolved_current_action_level`、`referenced_baseline_version`、`referenced_snapshot_version`、`review_comment`、`handled_at`、`handled_by`、`status`                                                                                                                                                                                                                                                                        | 归属经营信号结果；可被解释页与 gate 绑定结果引用                                        | 经营信号人工复核历史                             |
| `data_maturity_evaluation_result`                        | 派生 / 结果表     | `id`、`project_id`、`referenced_snapshot_id`、`data_maturity_level`、`cost_action_recommendation`、`tax_impact_pending_amount`、`allocation_stability_summary`、`unmapped_cost_summary`、`evaluation_basis_json`、`evaluated_at`、`status`                                                                                                                                                                                                                                                                                                           | 归属项目；可与经营信号结果一对一，并强关联当前经营快照                                  | 数据成熟度结果                                   |
| `operating_signal_gate_binding`                          | 派生 / 绑定结果表 | `id`、`project_id`、`signal_evaluation_id`、`binding_action`、`gate_stage_type`、`baseline_selection_source`、`tax_impact_summary`、`tax_impact_pending_amount`、`allocation_stability_summary`、`unmapped_cost_summary`、`data_maturity_level`、`cost_action_recommendation`、`current_action_level`、`next_action_summary`、`downstream_consumer_summary`、`referenced_baseline_version`、`referenced_snapshot_version`、`status`、`generated_at`                                                                                                  | 归属项目 / 经营信号结果；被 `commission_gate_review_record` 与 `L4-T04` 反馈链引用      | `L4 -> L5` gate 绑定结果                         |
| `commission_gate_review_record`                          | 动作记录表        | `id`、`binding_id`、`gate_review_decision`、`blocking_reason_code`、`next_action_summary`、`handled_at`、`handled_by`、`status`                                                                                                                                                                                                                                                                                                                                                                                                                      | 归属 gate 绑定结果；可被 `commission_payout` / 审批记录引用                             | gate 复核、阻断与放行留痕                        |

说明：

- `project_operating_snapshot / period_closing_snapshot` 直接承接 `ProjectBusinessOutcomeOverviewView` 与 `ProjectUnifiedAccountingView` 的稳定金额包和基线 / 快照引用，不得只保留快照元数据后让查询层回算。
- `operating_signal_evaluation_result / operating_signal_review_record` 直接承接 `ProjectVarianceRiskExplanationView` 的偏差来源、风险等级、推荐动作与当前动作等级，不得只留 `signal_level` 再由页面补解释。
- `operating_signal_gate_binding / commission_gate_review_record` 直接承接 `BusinessAccountingFeedbackView` 的反馈链和下游动作摘要，并作为后续 `L5` gate 的稳定消费入口。

### 7.8 第二阶段第三批逻辑表补点

| 逻辑表                                | 表角色              | 最小字段组                                                                                                                                                                                                                                                                                                                                 | 关键关系                                                                            | 说明                         |
| ------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------- |
| `contract_handover_rebaseline_record` | 动作 / 版本表       | `id`、`contract_amendment_id`、`rebaseline_reason`、`effective_baseline_after_id`、`status`、`handled_at`、`supersedes_id`                                                                                                                                                                                                                 | 归属合同变更；被 `handover_baseline_impact_item` 引用                               | 合同变更再基线化主链         |
| `handover_baseline_impact_item`       | 子表 / 影响项表     | `id`、`rebaseline_record_id`、`affected_handover_item_id`、`impact_type`、`impact_summary`、`supersedes_baseline_id`                                                                                                                                                                                                                       | 归属再基线化记录                                                                    | 受影响移交前事实项明细       |
| `presigning_rollback_request`         | 动作记录表          | `id`、`project_id`、`rollback_from_stage`、`rollback_to_stage`、`rollback_reason_code`、`status`、`handled_at`、`invalidates_decision_id`                                                                                                                                                                                                  | 归属项目；被 `presigning_workspace_reopen_record` 引用                              | 签约前回退请求主链           |
| `presigning_workspace_reopen_record`  | 动作记录表 / 子表   | `id`、`rollback_request_id`、`workspace_key`、`reopened_at`、`reopened_by`、`pending_reevaluation_owner_id`                                                                                                                                                                                                                                | 归属回退请求                                                                        | 回退后的工作区重开记录       |
| `sensitive_field_reveal_request`      | 动作记录表          | `id`、`target_type`、`target_id`、`approval_record_id`、`source_summary_snapshot_id`、`projection_level`、`field_package_key`、`usage_reason`、`reveal_scope_summary`、`requested_expires_at`、`status`、`requested_by`                                                                                                                    | 可关联 `approval_record` / 当前场景摘要快照；被 `sensitive_field_reveal_grant` 引用 | 短时揭示申请主表             |
| `sensitive_field_reveal_grant`        | 动作记录表 / 授权表 | `id`、`request_id`、`grant_decision`、`granted_field_package_key`、`summary_snapshot_id`、`projection_level`、`export_policy`、`effective_at`、`expires_at`、`revoked_at`、`revocation_reason_code`、`status`                                                                                                                              | 归属揭示申请；被 `sensitive_field_reveal_audit` 引用                                | 短时揭示授权与失效链         |
| `sensitive_field_reveal_audit`        | 审计表              | `id`、`grant_id`、`summary_snapshot_id`、`viewer_id`、`access_result`、`grant_status_at_access`、`accessed_at`、`target_field_summary`                                                                                                                                                                                                     | 归属揭示授权 / 摘要快照                                                             | 揭示访问审计                 |
| `approval_summary_package_definition` | 配置 / 定义表       | `id`、`approval_scenario_key`、`summary_package_key`、`projection_level`、`export_policy`、`field_rule_version`、`status`                                                                                                                                                                                                                  | 被 `approval_summary_snapshot` 引用                                                 | 审批摘要包定义               |
| `approval_summary_snapshot`           | 快照 / 派生表       | `id`、`target_type`、`target_id`、`approval_scenario_key`、`summary_package_id`、`summary_package_key`、`projection_level`、`export_policy`、`business_status_at_snapshot`、`generated_at`、`status`、`supersedes_id`                                                                                                                      | 归属审批对象；被 `approval_summary_field_projection` 与争议 / 揭示链引用            | 场景级摘要快照               |
| `approval_summary_field_projection`   | 子表 / 派生表       | `id`、`summary_snapshot_id`、`field_key`、`visibility_level`、`masking_mode`、`export_policy`、`field_order`、`channel_scope_summary`                                                                                                                                                                                                      | 归属摘要快照                                                                        | 摘要字段投影明细             |
| `commission_freeze_dispute_record`    | 动作记录表          | `id`、`project_id`、`freeze_version_id`、`summary_package_key`、`summary_snapshot_id`、`projection_level`、`export_policy`、`dispute_reason`、`affected_assignment_summary`、`arbitration_status`、`recalculation_impact_mode`、`impact_assessment_summary`、`status`、`handled_at`                                                        | 归属项目 / 冻结版本；被 `commission_freeze_change_request` 引用                     | 冻结后争议主链               |
| `commission_freeze_change_request`    | 动作 / 版本表       | `id`、`dispute_record_id`、`superseded_freeze_version_id`、`replacement_freeze_version_id`、`summary_package_key`、`summary_snapshot_id`、`projection_level`、`export_policy`、`arbitration_decision`、`recalculation_impact_mode`、`affected_calculation_summary`、`affected_payout_summary`、`risk_flag_summary`、`status`、`handled_at` | 归属争议记录；可关联既有计算 / 发放对象                                             | 争议后的受控变更与替代版本链 |

说明：

- `sensitive_field_reveal_request / sensitive_field_reveal_grant / sensitive_field_reveal_audit` 必须共同保留字段包粒度、到期 / 撤销链和访问留痕，查询层只能在有效授权范围内临时放宽，不得把结果固化为长期默认可见。
- `approval_summary_package_definition / approval_summary_snapshot / approval_summary_field_projection` 必须共同保留 `summaryPackageKey / summarySnapshotId / projectionLevel / exportPolicy`，保证审批页、通知、打印材料、导出预览与冻结争议摘要消费同一份场景快照。
- `commission_freeze_dispute_record / commission_freeze_change_request` 必须共同保留争议原因、仲裁状态、被替代 / 替代冻结版本、回溯影响模式、影响评估摘要与同一份摘要快照引用，后续发放 / 调整不得再由前端二次拼装影响结论。

---

## 8. 第一批关键字段组冻结要求

除原有字段组外，第二阶段第一批建议额外冻结以下字段组语义：

1. 多合同冻结字段组：
  - `receipt_judgment_mode`
  - `source_type`
  - `source_id`
  - `is_current`

2. 承接包字段组：
  - `source_baseline_id`
  - `latest_diff_result_id`
  - `guard_decision`
  - `package_status`
  - `item_type`
  - `source_workspace_key`
  - `item_status`

3. 差异复核字段组：
  - `diff_level`
  - `diff_status`
  - `review_decision`

4. 第二阶段发放前置字段组：
  - `acceptance_record_id`
  - `evidence_type`
  - `evidence_ref_id`

5. 人力成本率字段组：
  - `rate_key`
  - `effective_from`
  - `effective_to`
  - `rate_version_id`
  - `supersedes_record_id`

6. 敏感导出字段组：
  - `field_package_key`
  - `result_status`
  - `requested_at`
  - `exported_at`

### 8.1 第二阶段第二批关键字段组冻结要求

除第一批字段组外，第二阶段第二批建议额外冻结以下字段组语义：

1. 共享分摊字段组：
  - `basis_type`
  - `allocation_method`
  - `allocation_ratio`
  - `supersedes_id`

2. 阶段归属字段组：
  - `attributed_stage`
  - `attribution_mode`
  - `locked_by_snapshot_id`
  - `reclassify_reason`

3. 税务处理字段组：
  - `tax_treatment_type`
  - `deductibility_status`
  - `tax_impact_amount`
  - `tax_pending_flag`
  - `tax_impact_summary`

4. 经营基线字段组：
  - `original_baseline_id`
  - `change_package_id`
  - `effective_operating_baseline_id`
  - `is_current`

5. 时点快照 / 期末 / 重述字段组：
  - `snapshot_mode`
  - `snapshot_at`
  - `period_end_snapshot_id`
  - `restates_snapshot_id`
  - `restated_snapshot_id`
  - `referenced_baseline_version`
  - `baseline_selection_source`
  - `handover_rebaseline_record_id`
  - `restatement_reason`

6. 经营信号与 gate 绑定字段组：
  - `signal_level`
  - `data_maturity_level`
  - `cost_action_recommendation`
  - `binding_action`
  - `referenced_baseline_version`
  - `referenced_snapshot_version`
  - `gate_review_decision`
  - `blocking_reason_code`

### 8.2 第二阶段第三批关键字段组冻结要求

除前两批字段组外，第二阶段第三批建议额外冻结以下字段组语义：

1. 再基线化字段组：
  - `contract_amendment_id`
  - `rebaseline_reason`
  - `effective_baseline_after_id`
  - `supersedes_id`

2. 回退与重开字段组：
  - `rollback_from_stage`
  - `rollback_to_stage`
  - `rollback_reason_code`
  - `invalidates_decision_id`
  - `workspace_key`

3. 短时揭示字段组：
  - `field_package_key`
  - `requested_expires_at`
  - `granted_field_package_key`
  - `expires_at`
  - `access_result`

4. 审批摘要包字段组：
  - `approval_scenario_key`
  - `summary_package_key`
  - `projection_level`
  - `masking_mode`
  - `export_policy`

5. 冻结后争议字段组：
  - `freeze_version_id`
  - `dispute_reason`
  - `arbitration_decision`
  - `replacement_freeze_version_id`
  - `recalculation_impact_mode`
6. `L3` 强节点统一收口字段组：
  - `contract_summary_snapshot_id`
  - `effective_handover_baseline_snapshot_id`
  - `summary_snapshot_id`
  - `source_handover_id`
  - `handover_summary_snapshot_id`

---

## 7. 当前不宜在本阶段冻结的内容

当前不建议在本文件中直接写死以下内容：

- 最终字段类型与长度
- 唯一索引、组合索引、覆盖索引细节
- 物理命名规范中的前缀、后缀与缩写规则
- 分区、分库分表、冷热分层策略
- 缓存表、物化视图或宽表的最终形态
- 外部系统同步落地表

这些内容应放到真正的 schema / DDL 级细化中处理。

---

## 9. 进入 schema / DDL 级细化的门槛

建议满足以下条件后，再进入真正的 schema / DDL 级细化：

- 查询视图边界已形成首版基线
- 主表、版本表、快照表、动作记录表与派生支撑表的逻辑拆分已稳定
- 核心对象的关键字段组语义已稳定
- 关键外键关系、替代关系、冲销关系已明确
- 已确认不会因评审 follow-up 再次推翻核心对象边界
- 第二阶段第一批的关键逻辑表与补字段不会再反向推翻 `L1 / L3 / L4 / L5` 的主事实前提

---

## 10. 当前结论

第一阶段现在已经可以进入“表结构冻结设计”这一步，第二阶段第一批与第二批也已经具备把关键逻辑表补点写入冻结设计的条件。当前最稳妥的推进方式，是先把逻辑表职责、关键关系、字段组语义和两批主事实补点冻结下来，再进入真正的 schema / DDL 级细化，这样可以把后续返工控制在命名与物理实现层，而不是回退对象分层本身。
