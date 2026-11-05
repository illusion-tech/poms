import { Migration } from '@mikro-orm/migrations';

export class Migration20260418143000_ex12d1_commission_payout_compensating_chain extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."commission_payout" add column "payout_kind" varchar(32) not null default 'primary';`);
        this.addSql(`alter table "poms"."commission_payout" add column "source_payout_id" uuid null;`);
        this.addSql(`alter table "poms"."commission_payout" add constraint "commission_payout_source_payout_id_foreign" foreign key ("source_payout_id") references "poms"."commission_payout" ("id") on update cascade on delete set null;`);
        this.addSql(`create index "idx_commission_payout_source_payout_id" on "poms"."commission_payout" ("source_payout_id");`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "commission_payout_project_calc_stage_unique";`);
        this.addSql(`
            create unique index "uq_commission_payout_primary_stage"
            on "poms"."commission_payout" ("project_id", "calculation_id", "stage_type")
            where "payout_kind" = 'primary';
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."uq_commission_payout_primary_stage";`);
        this.addSql(`alter table "poms"."commission_payout" add constraint "commission_payout_project_calc_stage_unique" unique ("project_id", "calculation_id", "stage_type");`);
        this.addSql(`drop index if exists "poms"."idx_commission_payout_source_payout_id";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "commission_payout_source_payout_id_foreign";`);
        this.addSql(`alter table "poms"."commission_payout" drop column if exists "source_payout_id";`);
        this.addSql(`alter table "poms"."commission_payout" drop column if exists "payout_kind";`);
    }
}
