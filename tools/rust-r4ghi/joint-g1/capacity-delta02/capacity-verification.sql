-- OPTIONAL READ-ONLY CATALOG CROSS-CHECK. NOT RUN BY THIS TASK.
-- Return actual versus source-expected types; never auto-correct discrepancies.
WITH expected(table_name,column_name,expected_precision,expected_scale) AS (
 VALUES
 ('operating_baseline_package','original_baseline_cost',18,2),
 ('operating_baseline_package','change_package_total',18,2),
 ('operating_baseline_package','current_effective_baseline_cost',18,2),
 ('change_package_baseline','change_amount',18,2),
 ('project_operating_snapshot','effective_contract_total',18,2),
 ('project_operating_snapshot','receivable_confirmed_total',18,2),
 ('project_operating_snapshot','included_cost_total',18,2),
 ('project_operating_snapshot','original_baseline_cost',18,2),
 ('project_operating_snapshot','current_effective_baseline_cost',18,2),
 ('project_operating_snapshot','gross_margin_amount',18,2),
 ('project_operating_snapshot','tax_impact_pending_amount',18,2),
 ('period_closing_snapshot','effective_contract_total',18,2),
 ('period_closing_snapshot','receivable_confirmed_total',18,2),
 ('period_closing_snapshot','included_cost_total',18,2),
 ('period_closing_snapshot','original_baseline_cost',18,2),
 ('period_closing_snapshot','current_effective_baseline_cost',18,2),
 ('period_closing_snapshot','gross_margin_amount',18,2),
 ('period_closing_snapshot','tax_impact_pending_amount',18,2),
 ('data_maturity_evaluation_result','tax_impact_pending_amount',18,2),
 ('operating_signal_gate_binding','tax_impact_pending_amount',18,2)
)
SELECT e.table_name,e.column_name,e.expected_precision,e.expected_scale,
       c.data_type,c.numeric_precision,c.numeric_scale,
       c.numeric_precision IS NOT DISTINCT FROM e.expected_precision
         AND c.numeric_scale IS NOT DISTINCT FROM e.expected_scale AS matches_source
FROM expected e LEFT JOIN information_schema.columns c
 ON c.table_schema='poms' AND c.table_name=e.table_name AND c.column_name=e.column_name
ORDER BY e.table_name,e.column_name;
