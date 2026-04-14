import { Migration } from '@mikro-orm/migrations';

export class Migration20260414131000_ex07b_operating_restatement_comments extends Migration {
    override async up(): Promise<void> {
        this.addSql(`comment on table "poms"."operating_restatement_record" is '经营快照重述记录（期末冻结后的补录 / 替代链）';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."project_id" is '关联项目';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."period_end_snapshot_id" is '关联期末冻结快照';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."restates_snapshot_id" is '被重述 / 被替代的经营快照';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."restated_snapshot_id" is '新生成的重述经营快照';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."restatement_reason" is '重述原因';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."restatement_summary" is '重述摘要';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."handled_at" is '处理时间';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."handled_by" is '处理人';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."row_version" is '乐观锁版本号';`);
    }

    override async down(): Promise<void> {
        this.addSql(`comment on column "poms"."operating_restatement_record"."row_version" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."updated_by" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."updated_at" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."created_by" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."created_at" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."handled_by" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."handled_at" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."status" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."restatement_summary" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."restatement_reason" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."restated_snapshot_id" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."restates_snapshot_id" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."period_end_snapshot_id" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."project_id" is null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."id" is null;`);
        this.addSql(`comment on table "poms"."operating_restatement_record" is '';`);
    }
}
