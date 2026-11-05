# ORM28 字段范围矩阵

正式 SQL 的 83 项列动作：{'ADD COLUMN': 72, 'TYPE': 7, 'DEFAULT': 4}。field-matrix28.json / .csv 列出 168 个新增表字段及既有变更字段，包含实际 catalog 类型、精度、scale、length、nullable、最终 default、property / 文件和 builder。26 表共 515 个 catalog 列均做存在性核对；其余既有列保持输入原实现，没有宣称重新证明其全部语义。

| 表                                       | 列动作数 | 映射重点字段数 |
| ---------------------------------------- | -------- | -------------- |
| `accounting_tax_treatment_snapshot`      | 5        | 5              |
| `confirmation_participant`               | 0        | 0              |
| `contract_amendment`                     | 11       | 11             |
| `contract_handover_rebaseline_record`    | 5        | 5              |
| `contract_readiness_package`             | 1        | 1              |
| `contract_review_binding`                | 1        | 1              |
| `contract_term_preparation`              | 2        | 2              |
| `contract_term_snapshot`                 | 1        | 1              |
| `cost_governance_evidence`               | 0        | 14             |
| `cost_stage_attribution_snapshot`        | 4        | 4              |
| `expense_record`                         | 3        | 3              |
| `handover_baseline_impact_item`          | 3        | 3              |
| `internal_cost_rate_version`             | 0        | 0              |
| `invoice_record`                         | 3        | 3              |
| `project_actual_cost_record`             | 8        | 8              |
| `project_handover`                       | 10       | 10             |
| `project_handover_basis_item`            | 0        | 11             |
| `project_handover_basis_snapshot`        | 0        | 12             |
| `project_handover_contract_basis`        | 0        | 15             |
| `project_handover_participant_role`      | 0        | 9              |
| `project_handover_summary_payload`       | 0        | 10             |
| `project_receipt_judgment_freeze`        | 3        | 3              |
| `receivable_plan_version`                | 0        | 0              |
| `shared_cost_allocation_basis`           | 12       | 12             |
| `shared_cost_allocation_result`          | 11       | 11             |
| `shared_cost_allocation_source_snapshot` | 0        | 14             |

金额只按 SQL 把 expense 三层和 actual-cost 三层 / labor_amount 改成 numeric(18,2)。rate_value / internal_cost_rate 保持 numeric(15,4)，actual_hours / actual_person_days 保持 numeric(10,2)。allocation_weight 是 numeric(18,6)，原 allocation_ratio 仍 numeric(9,6)。没有统一把所有小数改成 2 位。

四个 governance_schema_version 的最终 default=1，迁移中用于历史行的初始 default=0 不是最终 ORM default。labor_scope_key 使用 generated AS (...) STORED，不能作为可写普通 text 字段；Root 实跑还应对照实际 generation_expression。
