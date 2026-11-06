import { Migration } from '@mikro-orm/migrations';

export class Migration20260418183000_ex13b1_gate_review_summary_anchor extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."commission_gate_review_record" add column "summary_package_key" varchar(64) null;`);
        this.addSql(`alter table "poms"."commission_gate_review_record" add column "summary_snapshot_id" uuid null;`);
        this.addSql(`alter table "poms"."commission_gate_review_record" add column "projection_level" varchar(32) null;`);
        this.addSql(`alter table "poms"."commission_gate_review_record" add column "export_policy" varchar(32) null;`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."summary_package_key" is '摘要包键';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."summary_snapshot_id" is '摘要快照 ID';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."projection_level" is '投影级别';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."export_policy" is '导出策略';`);
        this.addSql(`
            do $$
            begin
                if exists (select 1 from "poms"."commission_gate_review_record") then
                    raise exception 'EX-13B1 requires commission_gate_review_record to be empty before backfilling summary anchors';
                end if;
            end
            $$;
        `);
        this.addSql(`alter table "poms"."commission_gate_review_record" alter column "summary_package_key" set not null;`);
        this.addSql(`alter table "poms"."commission_gate_review_record" alter column "summary_snapshot_id" set not null;`);
        this.addSql(`alter table "poms"."commission_gate_review_record" alter column "projection_level" set not null;`);
        this.addSql(`alter table "poms"."commission_gate_review_record" alter column "export_policy" set not null;`);
        this.addSql(`
            alter table "poms"."commission_gate_review_record"
            add constraint "commission_gate_review_record_summary_snapshot_id_foreign"
            foreign key ("summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id") on update cascade on delete restrict;
        `);
        this.addSql(`create index "idx_cgrr_summary_snapshot" on "poms"."commission_gate_review_record" ("summary_snapshot_id");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."idx_cgrr_summary_snapshot";`);
        this.addSql(`
            alter table "poms"."commission_gate_review_record"
            drop constraint if exists "commission_gate_review_record_summary_snapshot_id_foreign";
        `);
        this.addSql(`alter table "poms"."commission_gate_review_record" drop column if exists "export_policy";`);
        this.addSql(`alter table "poms"."commission_gate_review_record" drop column if exists "projection_level";`);
        this.addSql(`alter table "poms"."commission_gate_review_record" drop column if exists "summary_snapshot_id";`);
        this.addSql(`alter table "poms"."commission_gate_review_record" drop column if exists "summary_package_key";`);
    }
}
