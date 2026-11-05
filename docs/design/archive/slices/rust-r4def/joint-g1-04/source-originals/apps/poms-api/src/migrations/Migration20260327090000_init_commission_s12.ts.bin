import { Migration } from '@mikro-orm/migrations';

export class Migration20260327090000_init_commission_s12 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "poms"."commission_adjustment" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "adjustment_type" varchar(32) not null,
                "related_payout_id" uuid null,
                "related_calculation_id" uuid null,
                "amount" decimal(18,2) null,
                "reason" varchar(256) not null,
                "status" varchar(32) not null default 'draft',
                "executed_at" timestamptz null,
                "executed_by" uuid null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "commission_adjustment_pkey" primary key ("id")
            );`
        );
        this.addSql(`create index "idx_commission_adjustment_project_status" on "poms"."commission_adjustment" ("project_id", "status");`);
        this.addSql(`create index "idx_commission_adjustment_related_payout_id" on "poms"."commission_adjustment" ("related_payout_id");`);
        this.addSql(`create index "idx_commission_adjustment_related_calculation_id" on "poms"."commission_adjustment" ("related_calculation_id");`);
        this.addSql(`alter table "poms"."commission_adjustment" add constraint "commission_adjustment_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."commission_adjustment" add constraint "commission_adjustment_related_payout_id_foreign" foreign key ("related_payout_id") references "poms"."commission_payout" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."commission_adjustment" add constraint "commission_adjustment_related_calculation_id_foreign" foreign key ("related_calculation_id") references "poms"."commission_calculation" ("id") on update cascade on delete set null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."commission_adjustment" drop constraint if exists "commission_adjustment_related_calculation_id_foreign";`);
        this.addSql(`alter table "poms"."commission_adjustment" drop constraint if exists "commission_adjustment_related_payout_id_foreign";`);
        this.addSql(`alter table "poms"."commission_adjustment" drop constraint if exists "commission_adjustment_project_id_foreign";`);
        this.addSql(`drop table if exists "poms"."commission_adjustment" cascade;`);
    }
}
