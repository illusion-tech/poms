-- REVIEW ONLY; Root concrete G2 approval required, never execute this file directly.
-- One new producer0 PK per case; all created/effective timestamps are DB clock.
-- Exact parameter bindings and locks are enforced by external driver284.

-- baseline INSERT SHA256 99d9bbe10b8925019d554b303638573cf010a86a168fdc0c6960333b5d685633
WITH stamp AS (SELECT clock_timestamp() t)
INSERT INTO poms.operating_baseline_package
(id,project_id,original_baseline_cost,change_package_total,current_effective_baseline_cost,baseline_selection_source,effective_operating_baseline_id,baseline_summary,is_current,status,effective_at,effective_by,created_at,created_by,updated_at,updated_by,row_version,producer_version,source_context_id,currency,source_hash,handover_baseline_cost,execution_change_package_total)
SELECT $1::uuid,$2::uuid,c.total_estimated_amount_excluding_tax,0::numeric,c.total_estimated_amount_excluding_tax,'original',NULL,$5::text,true,'active',stamp.t,$3::uuid,stamp.t,$3::uuid,stamp.t,$3::uuid,1,0,NULL,c.currency_code,NULL,c.total_estimated_amount_excluding_tax,0::numeric
FROM poms.project_technical_cost_package c CROSS JOIN stamp
WHERE c.id=$4::uuid AND c.project_id=$2::uuid AND c.row_version=$6::integer RETURNING id::text;

-- period INSERT SHA256 862ae9b29066ae53c1b0dec004c61d2557d29f92eb21741c5349d8d3573cf91d
WITH stamp AS (SELECT clock_timestamp() t)
INSERT INTO poms.period_closing_snapshot
(id,project_id,period_key,snapshot_mode,snapshot_at,effective_contract_total,receivable_confirmed_total,included_cost_total,original_baseline_cost,current_effective_baseline_cost,gross_margin_amount,gross_margin_rate,tax_impact_summary,tax_impact_pending_amount,allocation_stability_summary,unmapped_cost_summary,current_action_level,referenced_baseline_version,baseline_selection_source,handover_rebaseline_record_id,status,created_at,created_by,updated_at,updated_by,row_version,producer_version,project_snapshot_id,period_start,period_end,business_timezone,source_context_id,source_hash,tax_pending_knowledge)
SELECT $1::uuid,$2::uuid,$5::text,'period-end',stamp.t,s.effective_contract_total,s.receivable_confirmed_total,s.included_cost_total,s.original_baseline_cost,s.current_effective_baseline_cost,s.gross_margin_amount,s.gross_margin_rate,$8::text,s.tax_impact_pending_amount,$8::text,$8::text,s.current_action_level,s.referenced_baseline_version,s.baseline_selection_source,s.handover_rebaseline_record_id,'active',stamp.t,$3::uuid,stamp.t,$3::uuid,1,0,s.id,$6::date,$7::date,'Asia/Hong_Kong',NULL,NULL,s.tax_pending_knowledge
FROM poms.project_operating_snapshot s CROSS JOIN stamp
WHERE s.id=$4::uuid AND s.project_id=$2::uuid AND s.producer_version=1 AND s.row_version=$9::integer AND s.status='active' RETURNING id::text;

-- exact baseline fixture DELETE only
DELETE FROM poms.operating_baseline_package WHERE id=$1::uuid AND project_id=$2::uuid AND producer_version=0 AND xmin::text=$3::text RETURNING id::text;

-- exact period fixture DELETE only
DELETE FROM poms.period_closing_snapshot WHERE id=$1::uuid AND project_id=$2::uuid AND producer_version=0 AND xmin::text=$3::text RETURNING id::text;
