import { Migration } from '@mikro-orm/migrations';

export class Migration20260325200000_init_commission_s11 extends Migration {
    override async up(): Promise<void> {
        // commission_calculation: versioned computation result
        this.addSql(
            `create table "poms"."commission_calculation" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "rule_version_id" uuid not null,
                "version" integer not null,
                "is_current" boolean not null default true,
                "status" varchar(32) not null default 'pending',
                "recognized_revenue_tax_exclusive" decimal(18,2) not null,
                "recognized_cost_tax_exclusive" decimal(18,2) not null,
                "contribution_margin" decimal(18,2) not null,
                "contribution_margin_rate" decimal(8,4) not null,
                "commission_pool" decimal(18,2) not null,
                "recalculated_from_id" uuid null,
                "approved_at" timestamptz null,
                "approved_by" uuid null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "commission_calculation_pkey" primary key ("id")
            );`
        );
        this.addSql(`alter table "poms"."commission_calculation" add constraint "commission_calculation_project_version_unique" unique ("project_id", "version");`);
        this.addSql(`create index "idx_commission_calculation_project_current" on "poms"."commission_calculation" ("project_id", "is_current");`);
        this.addSql(`create index "idx_commission_calculation_status" on "poms"."commission_calculation" ("status");`);
        this.addSql(`alter table "poms"."commission_calculation" add constraint "commission_calculation_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."commission_calculation" add constraint "commission_calculation_rule_version_id_foreign" foreign key ("rule_version_id") references "poms"."commission_rule_version" ("id") on update cascade;`);
        this.addSql(`alter table "poms"."commission_calculation" add constraint "commission_calculation_recalculated_from_id_foreign" foreign key ("recalculated_from_id") references "poms"."commission_calculation" ("id") on update cascade on delete set null;`);

        // commission_payout: staged business payout record
        this.addSql(
            `create table "poms"."commission_payout" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "calculation_id" uuid not null,
                "stage_type" varchar(32) not null,
                "selected_tier" varchar(32) not null default 'basic',
                "theoretical_cap_amount" decimal(18,2) not null,
                "approved_amount" decimal(18,2) null,
                "paid_record_amount" decimal(18,2) null,
                "status" varchar(32) not null default 'draft',
                "approved_at" timestamptz null,
                "approved_by" uuid null,
                "handled_at" timestamptz null,
                "handled_by" uuid null,
                "reversed_from_id" uuid null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "commission_payout_pkey" primary key ("id")
            );`
        );
        this.addSql(`alter table "poms"."commission_payout" add constraint "commission_payout_project_calc_stage_unique" unique ("project_id", "calculation_id", "stage_type");`);
        this.addSql(`create index "idx_commission_payout_project_status" on "poms"."commission_payout" ("project_id", "status");`);
        this.addSql(`create index "idx_commission_payout_calculation_id" on "poms"."commission_payout" ("calculation_id");`);
        this.addSql(`alter table "poms"."commission_payout" add constraint "commission_payout_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."commission_payout" add constraint "commission_payout_calculation_id_foreign" foreign key ("calculation_id") references "poms"."commission_calculation" ("id") on update cascade;`);
        this.addSql(`alter table "poms"."commission_payout" add constraint "commission_payout_reversed_from_id_foreign" foreign key ("reversed_from_id") references "poms"."commission_payout" ("id") on update cascade on delete set null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "commission_payout_reversed_from_id_foreign";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "commission_payout_calculation_id_foreign";`);
        this.addSql(`alter table "poms"."commission_payout" drop constraint if exists "commission_payout_project_id_foreign";`);
        this.addSql(`alter table "poms"."commission_calculation" drop constraint if exists "commission_calculation_recalculated_from_id_foreign";`);
        this.addSql(`alter table "poms"."commission_calculation" drop constraint if exists "commission_calculation_rule_version_id_foreign";`);
        this.addSql(`alter table "poms"."commission_calculation" drop constraint if exists "commission_calculation_project_id_foreign";`);
        this.addSql(`drop table if exists "poms"."commission_payout" cascade;`);
        this.addSql(`drop table if exists "poms"."commission_calculation" cascade;`);
    }
}
