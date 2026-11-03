import { Migration } from '@mikro-orm/migrations';

export class Migration20260412212000_add_payable_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."payable_record" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "contract_id" uuid null,
                "vendor_name" varchar(200) not null,
                "cost_category" varchar(64) not null,
                "payable_description" text not null,
                "currency" varchar(16) not null default 'CNY',
                "registered_amount" decimal(18,2) not null,
                "paid_amount" decimal(18,2) not null default '0',
                "expected_payment_date" date not null,
                "status" varchar(32) not null,
                "evidence_summary" text null,
                "attachment_count" integer not null default 0,
                "closed_at" timestamptz null,
                "close_reason" text null,
                "voided_at" timestamptz null,
                "void_reason" text null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                constraint "payable_record_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "poms"."payable_record"
            add constraint "payable_record_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."payable_record"
            add constraint "payable_record_contract_id_foreign"
            foreign key ("contract_id") references "poms"."contract" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(`create index "payable_record_project_status_idx" on "poms"."payable_record" ("project_id", "status");`);

        this.addSql(`alter table "poms"."payment_record" add column "payable_record_id" uuid null;`);
        this.addSql(`
            alter table "poms"."payment_record"
            add constraint "payment_record_payable_record_id_foreign"
            foreign key ("payable_record_id") references "poms"."payable_record" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(`create index "payment_record_payable_record_id_idx" on "poms"."payment_record" ("payable_record_id");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."payment_record_payable_record_id_idx";`);
        this.addSql(`alter table "poms"."payment_record" drop constraint if exists "payment_record_payable_record_id_foreign";`);
        this.addSql(`alter table "poms"."payment_record" drop column if exists "payable_record_id";`);

        this.addSql(`drop index if exists "poms"."payable_record_project_status_idx";`);
        this.addSql(`alter table "poms"."payable_record" drop constraint if exists "payable_record_contract_id_foreign";`);
        this.addSql(`alter table "poms"."payable_record" drop constraint if exists "payable_record_project_id_foreign";`);
        this.addSql(`drop table if exists "poms"."payable_record";`);
    }
}
