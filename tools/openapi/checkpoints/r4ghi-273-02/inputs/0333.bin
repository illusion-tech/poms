import { Migration } from '@mikro-orm/migrations';

export class Migration20260502133000_ex56d3_commission_enum_checks extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."commission_rule_version" drop constraint if exists "chk_commission_rule_version_status";`);
        this.addSql(`alter table "poms"."commission_role_assignment" drop constraint if exists "chk_commission_role_assignment_status";`);
        this.addSql(`alter table "poms"."commission_calculation" drop constraint if exists "chk_commission_calculation_status";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "chk_commission_payout_stage_type";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "chk_commission_payout_payout_kind";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "chk_commission_payout_selected_tier";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "chk_commission_payout_status";`);
        this.addSql(`alter table "poms"."commission_adjustment" drop constraint if exists "chk_commission_adjustment_adjustment_type";`);
        this.addSql(`alter table "poms"."commission_adjustment" drop constraint if exists "chk_commission_adjustment_status";`);
        this.addSql(`alter table "poms"."commission_freeze_dispute_record" drop constraint if exists "chk_cfdr_arbitration_status";`);
        this.addSql(`alter table "poms"."commission_freeze_dispute_record" drop constraint if exists "chk_cfdr_status";`);
        this.addSql(`alter table "poms"."commission_freeze_change_request" drop constraint if exists "chk_cfcr_status";`);
        this.addSql(`alter table "poms"."commission_departure_exception_decision" drop constraint if exists "chk_cded_status";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_final_settlement_status";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_non_retention_settlement_status";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_retention_settlement_status";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_baseline_selection_source";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_cost_action_recommendation";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_current_action_level";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_status";`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" drop constraint if exists "chk_cres_current_stage_status";`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" drop constraint if exists "chk_cres_gate_decision_code";`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" drop constraint if exists "chk_cres_status";`);

        this.addSql(`alter table "poms"."commission_rule_version" add constraint "chk_commission_rule_version_status" check ("status" in ('draft', 'active', 'stopped'));`);
        this.addSql(`alter table "poms"."commission_role_assignment" add constraint "chk_commission_role_assignment_status" check ("status" in ('draft', 'frozen', 'superseded'));`);
        this.addSql(`alter table "poms"."commission_calculation" add constraint "chk_commission_calculation_status" check ("status" in ('pending', 'calculated', 'effective', 'superseded'));`);
        this.addSql(`alter table "poms"."commission_payout" add constraint "chk_commission_payout_stage_type" check ("stage_type" in ('first', 'second', 'final', 'retention'));`);
        this.addSql(`alter table "poms"."commission_payout" add constraint "chk_commission_payout_payout_kind" check ("payout_kind" in ('primary', 'supplement'));`);
        this.addSql(`alter table "poms"."commission_payout" add constraint "chk_commission_payout_selected_tier" check ("selected_tier" in ('basic', 'mid', 'premium'));`);
        this.addSql(`alter table "poms"."commission_payout" add constraint "chk_commission_payout_status" check ("status" in ('draft', 'pending-approval', 'approved', 'paid', 'suspended', 'reversed'));`);
        this.addSql(`alter table "poms"."commission_adjustment" add constraint "chk_commission_adjustment_adjustment_type" check ("adjustment_type" in ('suspend-payout', 'reverse-payout', 'clawback', 'supplement', 'recalculate'));`);
        this.addSql(`alter table "poms"."commission_adjustment" add constraint "chk_commission_adjustment_status" check ("status" in ('draft', 'pending-approval', 'approved', 'executed', 'rejected', 'closed'));`);
        this.addSql(`alter table "poms"."commission_freeze_dispute_record" add constraint "chk_cfdr_arbitration_status" check ("arbitration_status" in ('pending', 'arbitrated'));`);
        this.addSql(`alter table "poms"."commission_freeze_dispute_record" add constraint "chk_cfdr_status" check ("status" in ('submitted', 'closed'));`);
        this.addSql(`alter table "poms"."commission_freeze_change_request" add constraint "chk_cfcr_status" check ("status" in ('effective', 'closed'));`);
        this.addSql(`alter table "poms"."commission_departure_exception_decision" add constraint "chk_cded_status" check ("status" in ('active', 'superseded', 'voided'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_final_settlement_status" check ("final_settlement_status" in ('pending-final-settlement', 'pending-retention-settlement', 'settled-all'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_non_retention_settlement_status" check ("non_retention_settlement_status" in ('pending-non-retention', 'settled-non-retention'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_retention_settlement_status" check ("retention_settlement_status" in ('waiting-retention', 'ready-retention', 'settled-retention'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_baseline_selection_source" check ("baseline_selection_source" in ('original', 'handover_rebaseline'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_cost_action_recommendation" check ("cost_action_recommendation" in ('PROMPT', 'REVIEW', 'BLOCK'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_current_action_level" check ("current_action_level" in ('PROMPT', 'REVIEW', 'BLOCK'));`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" add constraint "chk_cfss_status" check ("status" in ('active', 'superseded', 'voided'));`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" add constraint "chk_cres_current_stage_status" check ("current_stage_status" in ('pending-final-settlement', 'blocked-retention', 'ready-retention', 'settled-retention'));`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" add constraint "chk_cres_gate_decision_code" check ("gate_decision_code" in ('ALLOW_FINAL_SETTLEMENT', 'SETTLED_RETENTION', 'BLOCK_RETENTION', 'REVIEW_RETENTION', 'ALLOW_RETENTION'));`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" add constraint "chk_cres_status" check ("status" in ('active', 'superseded', 'voided'));`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" drop constraint if exists "chk_cres_status";`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" drop constraint if exists "chk_cres_gate_decision_code";`);
        this.addSql(`alter table "poms"."commission_rule_explanation_snapshot" drop constraint if exists "chk_cres_current_stage_status";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_status";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_current_action_level";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_cost_action_recommendation";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_baseline_selection_source";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_retention_settlement_status";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_non_retention_settlement_status";`);
        this.addSql(`alter table "poms"."commission_final_settlement_snapshot" drop constraint if exists "chk_cfss_final_settlement_status";`);
        this.addSql(`alter table "poms"."commission_departure_exception_decision" drop constraint if exists "chk_cded_status";`);
        this.addSql(`alter table "poms"."commission_freeze_change_request" drop constraint if exists "chk_cfcr_status";`);
        this.addSql(`alter table "poms"."commission_freeze_dispute_record" drop constraint if exists "chk_cfdr_status";`);
        this.addSql(`alter table "poms"."commission_freeze_dispute_record" drop constraint if exists "chk_cfdr_arbitration_status";`);
        this.addSql(`alter table "poms"."commission_adjustment" drop constraint if exists "chk_commission_adjustment_status";`);
        this.addSql(`alter table "poms"."commission_adjustment" drop constraint if exists "chk_commission_adjustment_adjustment_type";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "chk_commission_payout_status";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "chk_commission_payout_selected_tier";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "chk_commission_payout_payout_kind";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "chk_commission_payout_stage_type";`);
        this.addSql(`alter table "poms"."commission_calculation" drop constraint if exists "chk_commission_calculation_status";`);
        this.addSql(`alter table "poms"."commission_role_assignment" drop constraint if exists "chk_commission_role_assignment_status";`);
        this.addSql(`alter table "poms"."commission_rule_version" drop constraint if exists "chk_commission_rule_version_status";`);
    }
}
