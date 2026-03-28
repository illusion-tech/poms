# POMS 表结构冻结设计

**文档状态**: Active
**最后更新**: 2026-03-25
**适用范围**: `POMS` 第一阶段在查询视图边界与数据模型前提已形成基线后，用于进入 schema / DDL 细化前的逻辑表结构冻结设计
**关联文档**:

- 上游设计:
  - `poms-requirements-spec.md`
  - `poms-hld.md`
  - `poms-design-progress.md`
  - `design-review-follow-up-summary.md`
- 同级设计:
  - `query-view-boundary-design.md`
  - `data-model-prerequisites.md`
  - `interface-command-design.md`
  - `interface-openapi-dto-design.md`
  - `project-lifecycle-design.md`
  - `contract-finance-design.md`
  - `commission-settlement-design.md`
  - `workflow-and-approval-design.md`

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

| 逻辑表                       | 表角色     | 最小字段组                                                                                                      | 关键关系                                               | 说明                   |
| ---------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------- |
| `project`                    | 主体主表   | `id`、`project_code`、`project_name`、`customer_id`、`status`、`current_stage`、`owner_org_id`、`owner_user_id` | 可被 `contract`、`bid_process`、`approval_record` 引用 | 第一阶段核心主链路主表 |
| `project_assessment`         | 动作记录表 | `id`、`project_id`、`status`、`submitted_at`、`submitted_by`                                                    | 归属 `project`                                         | 用于评估提交与结论留痕 |
| `scope_confirmation_version` | 版本表     | `id`、`project_id`、`version`、`is_current`、`supersedes_id`、`status`                                          | 归属 `project`                                         | 已确认范围不应原地覆盖 |
| `bid_process`                | 主体主表   | `id`、`project_id`、`status`、`decision_status`、`result_status`                                                | 归属 `project`                                         | 第一类受控子流程       |
| `project_handover`           | 动作记录表 | `id`、`project_id`、`status`、`confirmed_at`                                                                    | 归属 `project`                                         | 移交里程碑事实         |
| `acceptance_record`          | 动作记录表 | `id`、`project_id`、`acceptance_type`、`status`、`confirmed_at`                                                 | 归属 `project`                                         | 阶段 / 最终验收留痕    |

### 4.2 合同资金域

| 逻辑表                    | 表角色     | 最小字段组                                                                                          | 关键关系                      | 说明                 |
| ------------------------- | ---------- | --------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------- |
| `contract`                | 主体主表   | `id`、`project_id`、`contract_no`、`status`、`signed_amount`、`current_snapshot_id`                 | 归属 `project`                | 合同主事实           |
| `contract_term_snapshot`  | 快照表     | `id`、`contract_id`、`effective_at`、`effective_by`、`snapshot_status`                              | 归属 `contract`               | 生效条款冻结源       |
| `contract_amendment`      | 版本表     | `id`、`contract_id`、`version`、`is_current`、`supersedes_id`、`status`                             | 归属 `contract`               | 变更版本链           |
| `receivable_plan_version` | 版本表     | `id`、`contract_id`、`snapshot_id`、`version`、`is_current`、`status`                               | 归属 `contract_term_snapshot` | 计划版本链           |
| `receipt_record`          | 动作记录表 | `id`、`project_id`、`contract_id`、`registered_amount`、`confirmed_amount`、`status`、`source_type` | 归属 `project` / `contract`   | 到账登记与确认事实   |
| `payable_record`          | 主体主表   | `id`、`project_id`、`status`、`registered_amount`                                                   | 归属 `project`                | 第一阶段成本台账主体 |
| `payment_record`          | 动作记录表 | `id`、`payable_record_id`、`registered_amount`、`status`、`confirmed_at`                            | 归属 `payable_record`         | 付款登记 / 确认事实  |
| `invoice_record`          | 主体主表   | `id`、`project_id`、`contract_id`、`invoice_no`、`invoice_amount`、`status`、`exception_status`     | 归属 `project` / `contract`   | 发票台账主体         |

### 4.3 提成治理域

| 逻辑表                            | 表角色     | 最小字段组                                                                                                          | 关键关系                                  | 说明                 |
| --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------- |
| `commission_rule_version`         | 版本表     | `id`、`rule_code`、`version`、`status`、`effective_at`                                                              | 被计算结果引用                            | 统一规则版本对象     |
| `commission_role_assignment`      | 版本表     | `id`、`project_id`、`version`、`is_current`、`role_type`、`user_id`、`weight`、`status`                             | 归属 `project`                            | 角色分配版本链       |
| `commission_calculation`          | 版本表     | `id`、`project_id`、`rule_version_id`、`version`、`is_current`、`status`、`recalculated_from_id`                    | 归属 `project`                            | 计算结果版本链       |
| `commission_calculation_snapshot` | 快照表     | `id`、`commission_calculation_id`、`snapshot_status`、`generated_at`                                                | 归属 `commission_calculation`             | 计算输入冻结口径     |
| `commission_payout`               | 动作记录表 | `id`、`project_id`、`calculation_id`、`stage_type`、`approved_amount`、`paid_record_amount`、`status`、`handled_at` | 归属 `project` / `commission_calculation` | 发放与冲销事实       |
| `commission_adjustment`           | 动作记录表 | `id`、`project_id`、`adjustment_type`、`related_payout_id`、`related_calculation_id`、`status`、`handled_at`        | 归属 `project` / 提成发放 / 计算结果      | 异常调整、补发、扣回 |

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

## 8. 进入 schema / DDL 级细化的门槛

建议满足以下条件后，再进入真正的 schema / DDL 级细化：

- 查询视图边界已形成首版基线
- 主表、版本表、快照表、动作记录表与派生支撑表的逻辑拆分已稳定
- 核心对象的关键字段组语义已稳定
- 关键外键关系、替代关系、冲销关系已明确
- 已确认不会因评审 follow-up 再次推翻核心对象边界

---

## 9. 当前结论

第一阶段现在已经可以进入“表结构冻结设计”这一步，但仍不应直接跳到最终 DDL。当前最稳妥的推进方式，是先把逻辑表职责、关键关系和字段组语义冻结下来，再进入真正的 schema / DDL 级细化，这样可以把后续返工控制在命名与物理实现层，而不是回退对象分层本身。
