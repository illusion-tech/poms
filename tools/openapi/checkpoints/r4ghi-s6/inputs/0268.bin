import { Migration } from '@mikro-orm/migrations';

export class Migration20260327170000_init_contract_finance_facts extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."receipt_record" (
                "id" uuid not null default gen_random_uuid(),
                "contract_id" uuid not null,
                "project_id" uuid not null,
                "receipt_amount" decimal(18,2) not null,
                "receipt_date" timestamptz not null,
                "source_type" varchar(32) not null,
                "status" varchar(32) not null,
                "confirmed_at" timestamptz null,
                "confirmed_by" uuid null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                constraint "receipt_record_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "poms"."receipt_record"
            add constraint "receipt_record_contract_id_foreign"
            foreign key ("contract_id") references "poms"."contract" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."receipt_record"
            add constraint "receipt_record_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`create index "receipt_record_project_status_idx" on "poms"."receipt_record" ("project_id", "status");`);

        this.addSql(`
            create table "poms"."payment_record" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "contract_id" uuid null,
                "payment_amount" decimal(18,2) not null,
                "payment_date" timestamptz not null,
                "cost_category" varchar(64) not null,
                "source_type" varchar(32) not null,
                "status" varchar(32) not null,
                "confirmed_at" timestamptz null,
                "confirmed_by" uuid null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                constraint "payment_record_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "poms"."payment_record"
            add constraint "payment_record_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."payment_record"
            add constraint "payment_record_contract_id_foreign"
            foreign key ("contract_id") references "poms"."contract" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(`create index "payment_record_project_status_idx" on "poms"."payment_record" ("project_id", "status");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."payment_record_project_status_idx";`);
        this.addSql(`alter table "poms"."payment_record" drop constraint if exists "payment_record_contract_id_foreign";`);
        this.addSql(`alter table "poms"."payment_record" drop constraint if exists "payment_record_project_id_foreign";`);
        this.addSql(`drop table if exists "poms"."payment_record";`);

        this.addSql(`drop index if exists "poms"."receipt_record_project_status_idx";`);
        this.addSql(`alter table "poms"."receipt_record" drop constraint if exists "receipt_record_project_id_foreign";`);
        this.addSql(`alter table "poms"."receipt_record" drop constraint if exists "receipt_record_contract_id_foreign";`);
        this.addSql(`drop table if exists "poms"."receipt_record";`);
    }
}
