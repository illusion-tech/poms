import { Migration } from '@mikro-orm/migrations';

export class Migration20260503160000_ex58b_enum_code_value_direct_cutover extends Migration {
    override async up(): Promise<void> {
        this.dropAffectedConstraintsAndIndexes();

        this.addSql(`update "poms"."customer_alias" set "alias_type" = replace("alias_type", '_', '-') where "alias_type" in ('legal_name', 'short_name', 'legacy_input', 'import_name');`);
        this.addSql(`update "poms"."attachment_link" set "target_type" = 'sales-follow-up' where "target_type" = 'sales_follow_up';`);

        this.addSql(`
            update "poms"."approval_record"
            set "target_object_type" = case "target_object_type"
                when 'Contract' then 'contract'
                when 'CommissionPayout' then 'commission-payout'
                when 'CommissionAdjustment' then 'commission-adjustment'
                when 'Project' then 'project'
                when 'Lead' then 'lead'
                when 'Customer' then 'customer'
                when 'ProjectHandover' then 'project-handover'
                else "target_object_type"
            end
            where "target_object_type" in ('Contract', 'CommissionPayout', 'CommissionAdjustment', 'Project', 'Lead', 'Customer', 'ProjectHandover');
        `);
        this.addSql(`
            update "poms"."todo_item"
            set
                "source_type" = case "source_type"
                    when 'ApprovalRecord' then 'approval-record'
                    when 'ConfirmationRecord' then 'confirmation-record'
                    when 'SalesFollowUpRecord' then 'sales-follow-up-record'
                    else "source_type"
                end,
                "todo_type" = case "todo_type"
                    when 'sales_follow_up_reminder' then 'sales-follow-up-reminder'
                    else "todo_type"
                end,
                "target_object_type" = case "target_object_type"
                    when 'Contract' then 'contract'
                    when 'CommissionPayout' then 'commission-payout'
                    when 'CommissionAdjustment' then 'commission-adjustment'
                    when 'Project' then 'project'
                    when 'Lead' then 'lead'
                    when 'Customer' then 'customer'
                    when 'ProjectHandover' then 'project-handover'
                    else "target_object_type"
                end
            where "source_type" in ('ApprovalRecord', 'ConfirmationRecord', 'SalesFollowUpRecord')
               or "todo_type" = 'sales_follow_up_reminder'
               or "target_object_type" in ('Contract', 'CommissionPayout', 'CommissionAdjustment', 'Project', 'Lead', 'Customer', 'ProjectHandover');
        `);
        this.addSql(`
            update "poms"."confirmation_record"
            set "target_type" = case "target_type"
                when 'Contract' then 'contract'
                when 'CommissionPayout' then 'commission-payout'
                when 'CommissionAdjustment' then 'commission-adjustment'
                when 'Project' then 'project'
                when 'Lead' then 'lead'
                when 'Customer' then 'customer'
                when 'ProjectHandover' then 'project-handover'
                else "target_type"
            end
            where "target_type" in ('Contract', 'CommissionPayout', 'CommissionAdjustment', 'Project', 'Lead', 'Customer', 'ProjectHandover');
        `);
        this.addSql(`
            update "poms"."approval_summary_snapshot"
            set "target_type" = case "target_type"
                when 'Contract' then 'contract'
                when 'CommissionPayout' then 'commission-payout'
                when 'CommissionAdjustment' then 'commission-adjustment'
                when 'Project' then 'project'
                when 'Lead' then 'lead'
                when 'Customer' then 'customer'
                when 'ProjectHandover' then 'project-handover'
                else "target_type"
            end
            where "target_type" in ('Contract', 'CommissionPayout', 'CommissionAdjustment', 'Project', 'Lead', 'Customer', 'ProjectHandover');
        `);
        this.addSql(`update "poms"."audit_log" set "event_type" = replace("event_type", 'sales_follow_up.', 'sales-follow-up.') where "event_type" like 'sales\\_follow\\_up.%' escape '\\';`);
        this.addSql(`update "poms"."audit_log" set "target_type" = 'sales-follow-up-record' where "target_type" = 'sales_follow_up_record';`);

        this.addSql(`update "poms"."receipt_record" set "status" = 'voided' where "status" = 'void';`);
        this.addSql(`update "poms"."payment_record" set "status" = 'voided' where "status" = 'void';`);
        this.addSql(`update "poms"."contract_handover_rebaseline_record" set "status" = 'pending-effective' where "status" = 'pending_effective';`);
        this.addSql(`update "poms"."project_handover" set "status" = 'not-started' where "status" = 'not_started';`);
        this.addSql(`
            update "poms"."commission_departure_exception_decision"
            set "decision_code" = case "decision_code"
                when 'REQUIRE_HANDOVER_CONFIRMATION' then 'require-handover-confirmation'
                when 'ALLOW_RETENTION_WITH_SUCCESSOR' then 'allow-retention-with-successor'
                else "decision_code"
            end
            where "decision_code" in ('REQUIRE_HANDOVER_CONFIRMATION', 'ALLOW_RETENTION_WITH_SUCCESSOR');
        `);

        this.addSql(`
            update "poms"."internal_cost_rate_version"
            set
                "rate_scope_type" = case "rate_scope_type" when 'PERSON' then 'person' when 'ROLE' then 'role' else "rate_scope_type" end,
                "rate_unit" = case "rate_unit" when 'HOUR' then 'hour' when 'DAY' then 'day' else "rate_unit" end,
                "rate_key" = replace(replace(replace(replace("rate_key", 'PERSON:', 'person:'), 'ROLE:', 'role:'), ':HOUR', ':hour'), ':DAY', ':day')
            where "rate_scope_type" in ('PERSON', 'ROLE')
               or "rate_unit" in ('HOUR', 'DAY')
               or "rate_key" like 'PERSON:%'
               or "rate_key" like 'ROLE:%'
               or "rate_key" like '%:HOUR'
               or "rate_key" like '%:DAY';
        `);
        this.addSql(`
            update "poms"."project_actual_cost_record"
            set
                "cost_type" = case "cost_type"
                    when 'PROCUREMENT' then 'procurement'
                    when 'INVOICE' then 'invoice'
                    when 'EXPENSE' then 'expense'
                    when 'PAYMENT_FACT' then 'payment-fact'
                    when 'LABOR' then 'labor'
                    else "cost_type"
                end,
                "record_status" = case "record_status"
                    when 'DRAFT' then 'draft'
                    when 'REGISTERED' then 'registered'
                    when 'CONFIRMED' then 'confirmed'
                    when 'INCLUDED' then 'included'
                    when 'VOIDED' then 'voided'
                    when 'REPLACED' then 'replaced'
                    else "record_status"
                end,
                "source_type" = case "source_type"
                    when 'PAYMENT_RECORD' then 'payment-record'
                    when 'INVOICE_RECORD' then 'invoice-record'
                    when 'EXPENSE_RECORD' then 'expense-record'
                    when 'PAYABLE_RECORD' then 'payable-record'
                    when 'LABOR' then 'labor'
                    else "source_type"
                end,
                "labor_period_type" = case "labor_period_type"
                    when 'WEEK' then 'week'
                    when 'MONTH' then 'month'
                    else "labor_period_type"
                end,
                "source_ref_no" = replace(replace(replace(replace("source_ref_no", 'PERSON:', 'person:'), 'ROLE:', 'role:'), ':HOUR', ':hour'), ':DAY', ':day')
            where "cost_type" in ('PROCUREMENT', 'INVOICE', 'EXPENSE', 'PAYMENT_FACT', 'LABOR')
               or "record_status" in ('DRAFT', 'REGISTERED', 'CONFIRMED', 'INCLUDED', 'VOIDED', 'REPLACED')
               or "source_type" in ('PAYMENT_RECORD', 'INVOICE_RECORD', 'EXPENSE_RECORD', 'PAYABLE_RECORD', 'LABOR')
               or "labor_period_type" in ('WEEK', 'MONTH')
               or "source_ref_no" like 'PERSON:%'
               or "source_ref_no" like 'ROLE:%'
               or "source_ref_no" like '%:HOUR'
               or "source_ref_no" like '%:DAY';
        `);

        this.updateOperatingCodeValues();

        this.addSql(`alter table "poms"."receipt_record" alter column "status" drop default;`);
        this.addSql(`alter table "poms"."payment_record" alter column "status" drop default;`);
        this.addSql(`alter table "poms"."data_maturity_evaluation_result" alter column "data_maturity_level" set default 'insufficient';`);
        this.addSql(`alter table "poms"."data_maturity_evaluation_result" alter column "cost_action_recommendation" set default 'review';`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" alter column "signal_level" set default 'attention';`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" alter column "risk_level" set default 'attention';`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" alter column "formula_boundary_action" set default 'prompt';`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" alter column "current_action_level" set default 'review';`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" alter column "binding_action" set default 'review';`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" alter column "baseline_selection_source" set default 'original';`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" alter column "data_maturity_level" set default 'insufficient';`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" alter column "cost_action_recommendation" set default 'review';`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" alter column "current_action_level" set default 'review';`);
        this.addSql(`alter table "poms"."operating_signal_review_record" alter column "review_decision" set default 'approve';`);

        this.addTargetObjectConstraints();
        this.addCrmAttachmentConstraints();
        this.addFinanceConstraints();
        this.addCostRateConstraintsAndIndexes();
        this.addProjectCostOperatingConstraintsAndIndexes();
        this.addCommissionConstraints();
        this.updateColumnComments();
    }

    override async down(): Promise<void> {
        this.dropAffectedConstraintsAndIndexes();
    }

    private dropAffectedConstraintsAndIndexes(): void {
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_target_object_type";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_source_type";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_todo_type";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_target_object_type";`);
        this.addSql(`alter table "poms"."customer_alias" drop constraint if exists "chk_customer_alias_type";`);
        this.addSql(`alter table "poms"."attachment_link" drop constraint if exists "chk_attachment_link_target_type";`);
        this.addSql(`alter table "poms"."receipt_record" drop constraint if exists "chk_receipt_record_status";`);
        this.addSql(`alter table "poms"."payment_record" drop constraint if exists "chk_payment_record_status";`);

        this.addSql(`drop index if exists "poms"."uq_project_actual_cost_record_payment_fact_source_current";`);
        this.addSql(`drop index if exists "poms"."uq_project_actual_cost_record_invoice_source_current";`);
        this.addSql(`drop index if exists "poms"."uq_project_actual_cost_record_expense_source_current";`);
        this.addSql(`drop index if exists "poms"."uq_project_actual_cost_record_procurement_source_current";`);
        this.addSql(`alter table "poms"."project_actual_cost_record" drop constraint if exists "chk_project_actual_cost_record_cost_type";`);
        this.addSql(`alter table "poms"."project_actual_cost_record" drop constraint if exists "chk_project_actual_cost_record_record_status";`);
        this.addSql(`alter table "poms"."project_actual_cost_record" drop constraint if exists "chk_project_actual_cost_record_source_type";`);
        this.addSql(`alter table "poms"."project_actual_cost_record" drop constraint if exists "chk_project_actual_cost_record_labor_period_type";`);

        this.addSql(`alter table "poms"."internal_cost_rate_version" drop constraint if exists "internal_cost_rate_version_active_range_excl";`);
        this.addSql(`drop index if exists "poms"."internal_cost_rate_version_current_unique";`);
        this.addSql(`alter table "poms"."internal_cost_rate_version" drop constraint if exists "internal_cost_rate_version_rate_key_version_unique";`);
        this.addSql(`alter table "poms"."internal_cost_rate_version" drop constraint if exists "chk_internal_cost_rate_version_status";`);
        this.addSql(`alter table "poms"."internal_cost_rate_version" drop constraint if exists "chk_internal_cost_rate_version_scope_type";`);
        this.addSql(`alter table "poms"."internal_cost_rate_version" drop constraint if exists "chk_internal_cost_rate_version_rate_unit";`);

        this.addSql(`alter table "poms"."operating_baseline_package" drop constraint if exists "chk_operating_baseline_package_baseline_selection_source";`);
        this.addSql(`alter table "poms"."project_operating_snapshot" drop constraint if exists "chk_project_operating_snapshot_current_action_level";`);
        this.addSql(`alter table "poms"."project_operating_snapshot" drop constraint if exists "chk_project_operating_snapshot_baseline_selection_source";`);
        this.addSql(`alter table "poms"."period_closing_snapshot" drop constraint if exists "chk_period_closing_snapshot_current_action_level";`);
        this.addSql(`alter table "poms"."period_closing_snapshot" drop constraint if exists "chk_period_closing_snapshot_baseline_selection_source";`);
        this.addSql(`alter table "poms"."data_maturity_evaluation_result" drop constraint if exists "chk_data_maturity_evaluation_result_data_maturity_level";`);
        this.addSql(`alter table "poms"."data_maturity_evaluation_result" drop constraint if exists "chk_data_maturity_evaluation_result_cost_action_recommendation";`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" drop constraint if exists "chk_operating_signal_evaluation_result_signal_level";`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" drop constraint if exists "chk_operating_signal_evaluation_result_risk_level";`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" drop constraint if exists "chk_operating_signal_evaluation_result_formula_boundary_action";`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" drop constraint if exists "chk_operating_signal_evaluation_result_current_action_level";`);
        this.addSql(`alter table "poms"."operating_signal_review_record" drop constraint if exists "chk_os_review_review_decision";`);
        this.addSql(`alter table "poms"."operating_signal_review_record" drop constraint if exists "chk_os_review_resolved_cost_action";`);
        this.addSql(`alter table "poms"."operating_signal_review_record" drop constraint if exists "chk_os_review_resolved_current_action";`);
        this.addSql(`alter table "poms"."operating_signal_review_record" drop constraint if exists "chk_os_review_resolved_data_maturity";`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" drop constraint if exists "chk_operating_signal_gate_binding_binding_action";`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" drop constraint if exists "chk_operating_signal_gate_binding_baseline_selection_source";`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" drop constraint if exists "chk_operating_signal_gate_binding_data_maturity_level";`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" drop constraint if exists "chk_operating_signal_gate_binding_cost_action_recommendation";`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" drop constraint if exists "chk_operating_signal_gate_binding_current_action_level";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_data_maturity_level";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_baseline_selection_source";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_cost_action_recommendation";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_current_action_level";`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" drop constraint if exists "chk_cres_gate_decision_code";`);
    }

    private updateOperatingCodeValues(): void {
        this.addSql(`update "poms"."operating_baseline_package" set "baseline_selection_source" = 'handover-rebaseline' where "baseline_selection_source" = 'handover_rebaseline';`);
        this.addSql(`update "poms"."project_operating_snapshot" set "baseline_selection_source" = 'handover-rebaseline' where "baseline_selection_source" = 'handover_rebaseline';`);
        this.addSql(`update "poms"."period_closing_snapshot" set "baseline_selection_source" = 'handover-rebaseline' where "baseline_selection_source" = 'handover_rebaseline';`);
        this.addSql(`update "poms"."commission_final_settlement_snapshot" set "baseline_selection_source" = 'handover-rebaseline' where "baseline_selection_source" = 'handover_rebaseline';`);
        this.addSql(`update "poms"."operating_signal_gate_binding" set "baseline_selection_source" = 'handover-rebaseline' where "baseline_selection_source" = 'handover_rebaseline';`);

        for (const table of ['project_operating_snapshot', 'period_closing_snapshot'] as const) {
            this.addSql(`
                update "poms"."${table}"
                set "current_action_level" = case "current_action_level"
                    when 'PROMPT' then 'prompt'
                    when 'REVIEW' then 'review'
                    when 'BLOCK' then 'block'
                    else "current_action_level"
                end
                where "current_action_level" in ('PROMPT', 'REVIEW', 'BLOCK');
            `);
        }

        this.addSql(`
            update "poms"."data_maturity_evaluation_result"
            set
                "data_maturity_level" = case "data_maturity_level" when 'INSUFFICIENT' then 'insufficient' when 'PRELIMINARY' then 'preliminary' when 'MATURE' then 'mature' else "data_maturity_level" end,
                "cost_action_recommendation" = case "cost_action_recommendation" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "cost_action_recommendation" end
            where "data_maturity_level" in ('INSUFFICIENT', 'PRELIMINARY', 'MATURE')
               or "cost_action_recommendation" in ('PROMPT', 'REVIEW', 'BLOCK');
        `);
        this.addSql(`
            update "poms"."operating_signal_evaluation_result"
            set
                "signal_level" = case "signal_level" when 'ATTENTION' then 'attention' when 'ALERT' then 'alert' else "signal_level" end,
                "risk_level" = case "risk_level" when 'ATTENTION' then 'attention' when 'RISK' then 'risk' else "risk_level" end,
                "formula_boundary_action" = case "formula_boundary_action" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "formula_boundary_action" end,
                "current_action_level" = case "current_action_level" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "current_action_level" end
            where "signal_level" in ('ATTENTION', 'ALERT')
               or "risk_level" in ('ATTENTION', 'RISK')
               or "formula_boundary_action" in ('PROMPT', 'REVIEW', 'BLOCK')
               or "current_action_level" in ('PROMPT', 'REVIEW', 'BLOCK');
        `);
        this.addSql(`
            update "poms"."operating_signal_review_record"
            set
                "review_decision" = case "review_decision" when 'APPROVE' then 'approve' when 'MANUAL_CONFIRMED' then 'manual-confirmed' else "review_decision" end,
                "resolved_data_maturity_level" = case "resolved_data_maturity_level" when 'INSUFFICIENT' then 'insufficient' when 'PRELIMINARY' then 'preliminary' when 'MATURE' then 'mature' else "resolved_data_maturity_level" end,
                "resolved_cost_action_recommendation" = case "resolved_cost_action_recommendation" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "resolved_cost_action_recommendation" end,
                "resolved_current_action_level" = case "resolved_current_action_level" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "resolved_current_action_level" end
            where "review_decision" in ('APPROVE', 'MANUAL_CONFIRMED')
               or "resolved_data_maturity_level" in ('INSUFFICIENT', 'PRELIMINARY', 'MATURE')
               or "resolved_cost_action_recommendation" in ('PROMPT', 'REVIEW', 'BLOCK')
               or "resolved_current_action_level" in ('PROMPT', 'REVIEW', 'BLOCK');
        `);
        this.addSql(`
            update "poms"."operating_signal_gate_binding"
            set
                "binding_action" = case "binding_action" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "binding_action" end,
                "data_maturity_level" = case "data_maturity_level" when 'INSUFFICIENT' then 'insufficient' when 'PRELIMINARY' then 'preliminary' when 'MATURE' then 'mature' else "data_maturity_level" end,
                "cost_action_recommendation" = case "cost_action_recommendation" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "cost_action_recommendation" end,
                "current_action_level" = case "current_action_level" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "current_action_level" end
            where "binding_action" in ('PROMPT', 'REVIEW', 'BLOCK')
               or "data_maturity_level" in ('INSUFFICIENT', 'PRELIMINARY', 'MATURE')
               or "cost_action_recommendation" in ('PROMPT', 'REVIEW', 'BLOCK')
               or "current_action_level" in ('PROMPT', 'REVIEW', 'BLOCK');
        `);
        this.addSql(`
            update "poms"."commission_final_settlement_snapshot"
            set
                "data_maturity_level" = case "data_maturity_level" when 'INSUFFICIENT' then 'insufficient' when 'PRELIMINARY' then 'preliminary' when 'MATURE' then 'mature' else "data_maturity_level" end,
                "cost_action_recommendation" = case "cost_action_recommendation" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "cost_action_recommendation" end,
                "current_action_level" = case "current_action_level" when 'PROMPT' then 'prompt' when 'REVIEW' then 'review' when 'BLOCK' then 'block' else "current_action_level" end
            where "data_maturity_level" in ('INSUFFICIENT', 'PRELIMINARY', 'MATURE')
               or "cost_action_recommendation" in ('PROMPT', 'REVIEW', 'BLOCK')
               or "current_action_level" in ('PROMPT', 'REVIEW', 'BLOCK');
        `);
        this.addSql(`
            update "poms"."commission_rule_explanation_snapshot"
            set
                "gate_decision_code" = case "gate_decision_code"
                    when 'ALLOW_FINAL_SETTLEMENT' then 'allow-final-settlement'
                    when 'SETTLED_RETENTION' then 'settled-retention'
                    when 'BLOCK_RETENTION' then 'block-retention'
                    when 'REVIEW_RETENTION' then 'review-retention'
                    when 'ALLOW_RETENTION' then 'allow-retention'
                    else "gate_decision_code"
                end,
                "blocking_reason_code" = case "blocking_reason_code"
                    when 'FINAL_GATE_BLOCKED' then 'final-gate-blocked'
                    when 'FINAL_GATE_REVIEW_PENDING' then 'final-gate-review-pending'
                    when 'FREEZE_DISPUTE_PENDING' then 'freeze-dispute-pending'
                    when 'RETENTION_DUE_FACT_MISSING' then 'retention-due-fact-missing'
                    when 'RETENTION_DUE_PENDING' then 'retention-due-pending'
                    when 'DEPARTURE_EXCEPTION_PENDING' then 'departure-exception-pending'
                    when 'DEPARTURE_CONFIRMATION_PENDING' then 'departure-confirmation-pending'
                    when 'RETENTION_RECEIPT_PENDING' then 'retention-receipt-pending'
                    else "blocking_reason_code"
                end
            where "gate_decision_code" in ('ALLOW_FINAL_SETTLEMENT', 'SETTLED_RETENTION', 'BLOCK_RETENTION', 'REVIEW_RETENTION', 'ALLOW_RETENTION')
               or "blocking_reason_code" in (
                    'FINAL_GATE_BLOCKED',
                    'FINAL_GATE_REVIEW_PENDING',
                    'FREEZE_DISPUTE_PENDING',
                    'RETENTION_DUE_FACT_MISSING',
                    'RETENTION_DUE_PENDING',
                    'DEPARTURE_EXCEPTION_PENDING',
                    'DEPARTURE_CONFIRMATION_PENDING',
                    'RETENTION_RECEIPT_PENDING'
                );
        `);
    }

    private addTargetObjectConstraints(): void {
        this.addSql(`alter table "poms"."approval_record" add constraint "chk_approval_record_target_object_type" check ("target_object_type" in ('contract', 'commission-payout', 'commission-adjustment', 'project', 'lead', 'customer', 'project-handover'));`);
        this.addSql(`alter table "poms"."todo_item" add constraint "chk_todo_item_source_type" check ("source_type" in ('approval-record', 'confirmation-record', 'sales-follow-up-record'));`);
        this.addSql(`alter table "poms"."todo_item" add constraint "chk_todo_item_todo_type" check ("todo_type" in ('approval', 'confirmation', 'sales-follow-up-reminder'));`);
        this.addSql(`alter table "poms"."todo_item" add constraint "chk_todo_item_target_object_type" check ("target_object_type" in ('contract', 'commission-payout', 'commission-adjustment', 'project', 'lead', 'customer', 'project-handover'));`);
    }

    private addCrmAttachmentConstraints(): void {
        this.addSql(`alter table "poms"."customer_alias" add constraint "chk_customer_alias_type" check ("alias_type" in ('legal-name', 'short-name', 'legacy-input', 'import-name', 'alias'));`);
        this.addSql(`alter table "poms"."attachment_link" add constraint "chk_attachment_link_target_type" check ("target_type" in ('lead', 'customer', 'project', 'contract', 'sales-follow-up'));`);
    }

    private addFinanceConstraints(): void {
        this.addSql(`alter table "poms"."receipt_record" add constraint "chk_receipt_record_status" check ("status" in ('draft', 'pending-confirmation', 'confirmed', 'reversed', 'voided'));`);
        this.addSql(`alter table "poms"."payment_record" add constraint "chk_payment_record_status" check ("status" in ('draft', 'recorded', 'confirmed', 'voided'));`);
    }

    private addCostRateConstraintsAndIndexes(): void {
        this.addSql(`alter table "poms"."internal_cost_rate_version" add constraint "chk_internal_cost_rate_version_status" check ("status" in ('active', 'superseded', 'retired'));`);
        this.addSql(`alter table "poms"."internal_cost_rate_version" add constraint "chk_internal_cost_rate_version_scope_type" check ("rate_scope_type" in ('person', 'role'));`);
        this.addSql(`alter table "poms"."internal_cost_rate_version" add constraint "chk_internal_cost_rate_version_rate_unit" check ("rate_unit" in ('hour', 'day'));`);
        this.addSql(`alter table "poms"."internal_cost_rate_version" add constraint "internal_cost_rate_version_rate_key_version_unique" unique ("rate_key", "version");`);
        this.addSql(`create unique index "internal_cost_rate_version_current_unique" on "poms"."internal_cost_rate_version" ("rate_key") where "is_current" = true;`);
        this.addSql(`
            alter table "poms"."internal_cost_rate_version"
            add constraint "internal_cost_rate_version_active_range_excl"
            exclude using gist ("rate_key" with =, daterange("effective_from", coalesce("effective_to", 'infinity'::date), '[]') with &&)
            where ("status" = 'active');
        `);
    }

    private addProjectCostOperatingConstraintsAndIndexes(): void {
        this.addSql(`create unique index "uq_project_actual_cost_record_payment_fact_source_current" on "poms"."project_actual_cost_record" ("source_type", "source_id") where "cost_type" = 'payment-fact' and "record_status" in ('confirmed', 'included') and "source_type" is not null and "source_id" is not null;`);
        this.addSql(`create unique index "uq_project_actual_cost_record_invoice_source_current" on "poms"."project_actual_cost_record" ("source_type", "source_id") where "cost_type" = 'invoice' and "record_status" in ('confirmed', 'included') and "source_type" is not null and "source_id" is not null;`);
        this.addSql(`create unique index "uq_project_actual_cost_record_expense_source_current" on "poms"."project_actual_cost_record" ("source_type", "source_id") where "cost_type" = 'expense' and "record_status" in ('confirmed', 'included') and "source_type" is not null and "source_id" is not null;`);
        this.addSql(`create unique index "uq_project_actual_cost_record_procurement_source_current" on "poms"."project_actual_cost_record" ("source_type", "source_id") where "cost_type" = 'procurement' and "record_status" in ('registered', 'confirmed', 'included') and "source_type" is not null and "source_id" is not null;`);
        this.addSql(`alter table "poms"."project_actual_cost_record" add constraint "chk_project_actual_cost_record_cost_type" check ("cost_type" in ('procurement', 'invoice', 'expense', 'payment-fact', 'labor'));`);
        this.addSql(`alter table "poms"."project_actual_cost_record" add constraint "chk_project_actual_cost_record_record_status" check ("record_status" in ('draft', 'registered', 'confirmed', 'included', 'voided', 'replaced'));`);
        this.addSql(`alter table "poms"."project_actual_cost_record" add constraint "chk_project_actual_cost_record_labor_period_type" check ("labor_period_type" is null or ("labor_period_type")::text = any ((array['week'::character varying, 'month'::character varying])::text[]));`);
        this.addSql(`alter table "poms"."project_actual_cost_record" add constraint "chk_project_actual_cost_record_source_type" check ("source_type" is null or ("source_type")::text = any ((array['payment-record'::character varying, 'invoice-record'::character varying, 'expense-record'::character varying, 'payable-record'::character varying, 'labor'::character varying])::text[]));`);
        this.addSql(`alter table "poms"."operating_baseline_package" add constraint "chk_operating_baseline_package_baseline_selection_source" check ("baseline_selection_source" in ('original', 'handover-rebaseline'));`);
        this.addSql(`alter table "poms"."project_operating_snapshot" add constraint "chk_project_operating_snapshot_current_action_level" check ("current_action_level" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."project_operating_snapshot" add constraint "chk_project_operating_snapshot_baseline_selection_source" check ("baseline_selection_source" in ('original', 'handover-rebaseline'));`);
        this.addSql(`alter table "poms"."period_closing_snapshot" add constraint "chk_period_closing_snapshot_current_action_level" check ("current_action_level" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."period_closing_snapshot" add constraint "chk_period_closing_snapshot_baseline_selection_source" check ("baseline_selection_source" in ('original', 'handover-rebaseline'));`);
        this.addSql(`alter table "poms"."data_maturity_evaluation_result" add constraint "chk_data_maturity_evaluation_result_data_maturity_level" check ("data_maturity_level" in ('insufficient', 'preliminary', 'mature'));`);
        this.addSql(`alter table "poms"."data_maturity_evaluation_result" add constraint "chk_data_maturity_evaluation_result_cost_action_recommendation" check ("cost_action_recommendation" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" add constraint "chk_operating_signal_evaluation_result_signal_level" check ("signal_level" in ('attention', 'alert'));`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" add constraint "chk_operating_signal_evaluation_result_risk_level" check ("risk_level" in ('attention', 'risk'));`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" add constraint "chk_operating_signal_evaluation_result_formula_boundary_action" check ("formula_boundary_action" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" add constraint "chk_operating_signal_evaluation_result_current_action_level" check ("current_action_level" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."operating_signal_review_record" add constraint "chk_os_review_review_decision" check ("review_decision" in ('approve', 'manual-confirmed'));`);
        this.addSql(`alter table "poms"."operating_signal_review_record" add constraint "chk_os_review_resolved_cost_action" check ("resolved_cost_action_recommendation" is null or ("resolved_cost_action_recommendation")::text = any ((array['prompt'::character varying, 'review'::character varying, 'block'::character varying])::text[]));`);
        this.addSql(`alter table "poms"."operating_signal_review_record" add constraint "chk_os_review_resolved_current_action" check ("resolved_current_action_level" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."operating_signal_review_record" add constraint "chk_os_review_resolved_data_maturity" check ("resolved_data_maturity_level" is null or ("resolved_data_maturity_level")::text = any ((array['insufficient'::character varying, 'preliminary'::character varying, 'mature'::character varying])::text[]));`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" add constraint "chk_operating_signal_gate_binding_binding_action" check ("binding_action" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" add constraint "chk_operating_signal_gate_binding_baseline_selection_source" check ("baseline_selection_source" in ('original', 'handover-rebaseline'));`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" add constraint "chk_operating_signal_gate_binding_data_maturity_level" check ("data_maturity_level" in ('insufficient', 'preliminary', 'mature'));`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" add constraint "chk_operating_signal_gate_binding_cost_action_recommendation" check ("cost_action_recommendation" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" add constraint "chk_operating_signal_gate_binding_current_action_level" check ("current_action_level" in ('prompt', 'review', 'block'));`);
    }

    private addCommissionConstraints(): void {
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_data_maturity_level" check ("data_maturity_level" in ('insufficient', 'preliminary', 'mature'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_baseline_selection_source" check ("baseline_selection_source" in ('original', 'handover-rebaseline'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_cost_action_recommendation" check ("cost_action_recommendation" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_current_action_level" check ("current_action_level" in ('prompt', 'review', 'block'));`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" add constraint "chk_cres_gate_decision_code" check ("gate_decision_code" in ('allow-final-settlement', 'settled-retention', 'block-retention', 'review-retention', 'allow-retention'));`);
    }

    private updateColumnComments(): void {
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."status" is '状态：processing/pending-effective/effective/superseded/voided';`);
        this.addSql(`comment on column "poms"."internal_cost_rate_version"."rate_scope_type" is '生效范围类型：person / role';`);
        this.addSql(`comment on column "poms"."internal_cost_rate_version"."rate_unit" is '单位：hour / day';`);
        this.addSql(`comment on column "poms"."project_actual_cost_record"."cost_type" is '成本类型：procurement/invoice/expense/payment-fact/labor';`);
        this.addSql(`comment on column "poms"."project_actual_cost_record"."record_status" is '状态：draft/registered/confirmed/included/voided/replaced';`);
        this.addSql(`comment on column "poms"."project_actual_cost_record"."labor_period_type" is '人力成本-归集周期类型：week/month';`);
        this.addSql(`comment on column "poms"."operating_baseline_package"."baseline_selection_source" is '基线来源：original/handover-rebaseline';`);
        this.addSql(`comment on column "poms"."project_operating_snapshot"."current_action_level" is '当前动作等级：prompt/review/block';`);
        this.addSql(`comment on column "poms"."project_operating_snapshot"."baseline_selection_source" is '基线选择来源：original/handover-rebaseline';`);
        this.addSql(`comment on column "poms"."period_closing_snapshot"."current_action_level" is '当前动作等级：prompt/review/block';`);
        this.addSql(`comment on column "poms"."period_closing_snapshot"."baseline_selection_source" is '基线选择来源：original/handover-rebaseline';`);
    }
}
