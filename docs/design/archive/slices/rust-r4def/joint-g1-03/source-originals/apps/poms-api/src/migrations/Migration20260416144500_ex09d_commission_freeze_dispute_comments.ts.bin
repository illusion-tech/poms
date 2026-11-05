import { Migration } from '@mikro-orm/migrations';

export class Migration20260416144500_ex09d_commission_freeze_dispute_comments extends Migration {
    override async up(): Promise<void> {
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."freeze_version_id" is '被争议冻结版本 ID';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."summary_package_key" is '摘要包键';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."summary_snapshot_id" is '摘要快照 ID';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."projection_level" is '投影级别';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."export_policy" is '导出策略';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."dispute_reason" is '争议原因';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."affected_assignment_summary" is '影响角色摘要';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."arbitration_status" is '仲裁状态';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."recalculation_impact_mode" is '回溯影响模式';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."impact_assessment_summary" is '影响评估摘要';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."status" is '状态';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."handled_at" is '处理时间';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."updated_by" is '最后更新人';`);
        this.addSql(`comment on table "poms"."commission_freeze_dispute_record" is '提成冻结后争议记录';`);

        this.addSql(`comment on column "poms"."commission_freeze_change_request"."id" is '主键';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."dispute_record_id" is '归属争议记录';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."superseded_freeze_version_id" is '被替代冻结版本 ID';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."replacement_freeze_version_id" is '替代冻结版本 ID';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."summary_package_key" is '摘要包键';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."summary_snapshot_id" is '摘要快照 ID';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."projection_level" is '投影级别';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."export_policy" is '导出策略';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."arbitration_decision" is '仲裁结论';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."recalculation_impact_mode" is '回溯影响模式';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."affected_calculation_summary" is '受影响计算摘要';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."affected_payout_summary" is '受影响发放摘要';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."risk_flag_summary" is '风险标记摘要';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."status" is '状态';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."handled_at" is '处理时间';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."updated_by" is '最后更新人';`);
        this.addSql(`comment on table "poms"."commission_freeze_change_request" is '提成冻结后受控变更记录';`);
    }

    override async down(): Promise<void> {
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."id" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."dispute_record_id" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."superseded_freeze_version_id" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."replacement_freeze_version_id" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."summary_package_key" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."summary_snapshot_id" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."projection_level" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."export_policy" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."arbitration_decision" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."recalculation_impact_mode" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."affected_calculation_summary" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."affected_payout_summary" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."risk_flag_summary" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."status" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."handled_at" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."row_version" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."created_at" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."created_by" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."updated_at" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_change_request"."updated_by" is null;`);
        this.addSql(`comment on table "poms"."commission_freeze_change_request" is '';`);

        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."id" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."project_id" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."freeze_version_id" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."summary_package_key" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."summary_snapshot_id" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."projection_level" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."export_policy" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."dispute_reason" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."affected_assignment_summary" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."arbitration_status" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."recalculation_impact_mode" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."impact_assessment_summary" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."status" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."handled_at" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."row_version" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."created_at" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."created_by" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."updated_at" is null;`);
        this.addSql(`comment on column "poms"."commission_freeze_dispute_record"."updated_by" is null;`);
        this.addSql(`comment on table "poms"."commission_freeze_dispute_record" is '';`);
    }
}
