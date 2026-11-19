import { Migration } from '@mikro-orm/migrations';

export class Migration20260416143000_ex09d_commission_freeze_dispute_chain extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "poms"."commission_freeze_dispute_record" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "freeze_version_id" uuid not null,
                "summary_package_key" varchar(64) not null,
                "summary_snapshot_id" uuid not null,
                "projection_level" varchar(32) not null,
                "export_policy" varchar(32) not null,
                "dispute_reason" text not null,
                "affected_assignment_summary" text not null,
                "arbitration_status" varchar(32) not null default 'pending',
                "recalculation_impact_mode" varchar(64) not null,
                "impact_assessment_summary" text null,
                "status" varchar(32) not null default 'submitted',
                "handled_at" timestamptz not null default now(),
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "commission_freeze_dispute_record_pkey" primary key ("id")
            );`
        );
        this.addSql(
            `create index "idx_cfdr_project_handled" on "poms"."commission_freeze_dispute_record" ("project_id", "handled_at" desc);`
        );
        this.addSql(
            `create index "idx_cfdr_freeze_version_status" on "poms"."commission_freeze_dispute_record" ("freeze_version_id", "status");`
        );
        this.addSql(
            `create index "idx_cfdr_summary_snapshot" on "poms"."commission_freeze_dispute_record" ("summary_snapshot_id");`
        );
        this.addSql(
            `create unique index "uq_cfdr_open_freeze_version" on "poms"."commission_freeze_dispute_record" ("freeze_version_id") where "status" = 'submitted';`
        );
        this.addSql(
            `alter table "poms"."commission_freeze_dispute_record" add constraint "cfdr_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "poms"."commission_freeze_dispute_record" add constraint "cfdr_freeze_version_id_foreign" foreign key ("freeze_version_id") references "poms"."commission_role_assignment" ("id") on update cascade on delete restrict;`
        );
        this.addSql(
            `alter table "poms"."commission_freeze_dispute_record" add constraint "cfdr_summary_snapshot_id_foreign" foreign key ("summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id") on update cascade on delete restrict;`
        );

        this.addSql(
            `create table "poms"."commission_freeze_change_request" (
                "id" uuid not null default gen_random_uuid(),
                "dispute_record_id" uuid not null,
                "superseded_freeze_version_id" uuid not null,
                "replacement_freeze_version_id" uuid null,
                "summary_package_key" varchar(64) not null,
                "summary_snapshot_id" uuid not null,
                "projection_level" varchar(32) not null,
                "export_policy" varchar(32) not null,
                "arbitration_decision" varchar(64) not null,
                "recalculation_impact_mode" varchar(64) not null,
                "affected_calculation_summary" text null,
                "affected_payout_summary" text null,
                "risk_flag_summary" text null,
                "status" varchar(32) not null default 'closed',
                "handled_at" timestamptz not null default now(),
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "commission_freeze_change_request_pkey" primary key ("id")
            );`
        );
        this.addSql(
            `create index "idx_cfcr_dispute_handled" on "poms"."commission_freeze_change_request" ("dispute_record_id", "handled_at" desc);`
        );
        this.addSql(
            `create index "idx_cfcr_replacement_freeze" on "poms"."commission_freeze_change_request" ("replacement_freeze_version_id");`
        );
        this.addSql(
            `create index "idx_cfcr_superseded_freeze" on "poms"."commission_freeze_change_request" ("superseded_freeze_version_id");`
        );
        this.addSql(
            `create index "idx_cfcr_summary_snapshot" on "poms"."commission_freeze_change_request" ("summary_snapshot_id");`
        );
        this.addSql(
            `create index "idx_cfcr_status_handled" on "poms"."commission_freeze_change_request" ("status", "handled_at" desc);`
        );
        this.addSql(
            `alter table "poms"."commission_freeze_change_request" add constraint "cfcr_dispute_record_id_foreign" foreign key ("dispute_record_id") references "poms"."commission_freeze_dispute_record" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "poms"."commission_freeze_change_request" add constraint "cfcr_superseded_freeze_version_id_foreign" foreign key ("superseded_freeze_version_id") references "poms"."commission_role_assignment" ("id") on update cascade on delete restrict;`
        );
        this.addSql(
            `alter table "poms"."commission_freeze_change_request" add constraint "cfcr_replacement_freeze_version_id_foreign" foreign key ("replacement_freeze_version_id") references "poms"."commission_role_assignment" ("id") on update cascade on delete restrict;`
        );
        this.addSql(
            `alter table "poms"."commission_freeze_change_request" add constraint "cfcr_summary_snapshot_id_foreign" foreign key ("summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id") on update cascade on delete restrict;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."commission_freeze_change_request" drop constraint if exists "cfcr_summary_snapshot_id_foreign";`);
        this.addSql(`alter table "poms"."commission_freeze_change_request" drop constraint if exists "cfcr_replacement_freeze_version_id_foreign";`);
        this.addSql(`alter table "poms"."commission_freeze_change_request" drop constraint if exists "cfcr_superseded_freeze_version_id_foreign";`);
        this.addSql(`alter table "poms"."commission_freeze_change_request" drop constraint if exists "cfcr_dispute_record_id_foreign";`);
        this.addSql(`drop table if exists "poms"."commission_freeze_change_request" cascade;`);

        this.addSql(`alter table "poms"."commission_freeze_dispute_record" drop constraint if exists "cfdr_summary_snapshot_id_foreign";`);
        this.addSql(`alter table "poms"."commission_freeze_dispute_record" drop constraint if exists "cfdr_freeze_version_id_foreign";`);
        this.addSql(`alter table "poms"."commission_freeze_dispute_record" drop constraint if exists "cfdr_project_id_foreign";`);
        this.addSql(`drop table if exists "poms"."commission_freeze_dispute_record" cascade;`);
    }
}
