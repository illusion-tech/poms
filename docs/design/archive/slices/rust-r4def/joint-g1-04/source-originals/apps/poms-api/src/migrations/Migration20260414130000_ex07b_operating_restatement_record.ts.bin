import { Migration } from '@mikro-orm/migrations';

/**
 * EX-07B: 建立经营快照重述记录表。
 *
 * 本表把期末冻结快照、被替代经营快照与新生成的 restated 快照串成
 * append-only 重述链；不覆盖 period_closing_snapshot 的原始冻结事实。
 */
export class Migration20260414130000_ex07b_operating_restatement_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."operating_restatement_record" (
                "id"                     uuid         not null default gen_random_uuid(),
                "project_id"             uuid         not null,
                "period_end_snapshot_id" uuid         not null,
                "restates_snapshot_id"   uuid         not null,
                "restated_snapshot_id"   uuid         not null,
                "restatement_reason"     varchar(256) not null,
                "restatement_summary"    text         not null,
                "status"                 varchar(32)  not null default 'active',
                "handled_at"             timestamptz  not null default now(),
                "handled_by"             uuid         null,
                "created_at"             timestamptz  not null default now(),
                "created_by"             uuid         null,
                "updated_at"             timestamptz  not null default now(),
                "updated_by"             uuid         null,
                "row_version"            integer      not null default 1,
                constraint "pk_operating_restatement_record" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."operating_restatement_record" add constraint "operating_restatement_record_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
        this.addSql(`alter table "poms"."operating_restatement_record" add constraint "operating_restatement_record_period_end_snapshot_id_foreign" foreign key ("period_end_snapshot_id") references "poms"."period_closing_snapshot" ("id");`);
        this.addSql(`alter table "poms"."operating_restatement_record" add constraint "operating_restatement_record_restates_snapshot_id_foreign" foreign key ("restates_snapshot_id") references "poms"."project_operating_snapshot" ("id");`);
        this.addSql(`alter table "poms"."operating_restatement_record" add constraint "operating_restatement_record_restated_snapshot_id_foreign" foreign key ("restated_snapshot_id") references "poms"."project_operating_snapshot" ("id");`);
        this.addSql(`create index "idx_orr_project_handled" on "poms"."operating_restatement_record" ("project_id", "handled_at" desc);`);
        this.addSql(`create index "idx_orr_period_snapshot" on "poms"."operating_restatement_record" ("period_end_snapshot_id");`);
        this.addSql(`create index "idx_orr_restates_snapshot" on "poms"."operating_restatement_record" ("restates_snapshot_id");`);
        this.addSql(`create index "idx_orr_restated_snapshot" on "poms"."operating_restatement_record" ("restated_snapshot_id");`);
        this.addSql(`
            create unique index "uq_orr_restates_current"
            on "poms"."operating_restatement_record" ("restates_snapshot_id")
            where "status" = 'active';
        `);
        this.addSql(`
            create unique index "uq_orr_restated_current"
            on "poms"."operating_restatement_record" ("restated_snapshot_id")
            where "status" = 'active';
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."operating_restatement_record";`);
    }
}
