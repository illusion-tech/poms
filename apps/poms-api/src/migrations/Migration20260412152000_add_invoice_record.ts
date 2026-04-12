import { Migration } from '@mikro-orm/migrations';

export class Migration20260412152000_add_invoice_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."invoice_record" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "contract_id" uuid null,
                "invoice_type" varchar(16) not null,
                "invoice_no" varchar(128) not null,
                "invoice_amount" decimal(18,2) not null,
                "invoice_date" date not null,
                "status" varchar(32) not null,
                "exception_status" varchar(32) not null default 'none',
                "exception_reason" text null,
                "exception_resolution" text null,
                "closed_at" timestamptz null,
                "close_reason" text null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                constraint "invoice_record_pkey" primary key ("id"),
                constraint "invoice_record_invoice_no_unique" unique ("invoice_no")
            );
        `);
        this.addSql(`
            alter table "poms"."invoice_record"
            add constraint "invoice_record_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."invoice_record"
            add constraint "invoice_record_contract_id_foreign"
            foreign key ("contract_id") references "poms"."contract" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(`create index "invoice_record_project_status_idx" on "poms"."invoice_record" ("project_id", "status");`);
        this.addSql(`create index "invoice_record_contract_status_idx" on "poms"."invoice_record" ("contract_id", "status");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."invoice_record_contract_status_idx";`);
        this.addSql(`drop index if exists "poms"."invoice_record_project_status_idx";`);
        this.addSql(`alter table "poms"."invoice_record" drop constraint if exists "invoice_record_contract_id_foreign";`);
        this.addSql(`alter table "poms"."invoice_record" drop constraint if exists "invoice_record_project_id_foreign";`);
        this.addSql(`drop table if exists "poms"."invoice_record";`);
    }
}
