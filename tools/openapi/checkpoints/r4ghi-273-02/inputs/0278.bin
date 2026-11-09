import { Migration } from '@mikro-orm/migrations';

export class Migration20260412193000_add_expense_record extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`
      create table "poms"."expense_record" (
        "id" uuid not null default gen_random_uuid(),
        "project_id" uuid not null,
        "contract_id" uuid null,
        "expense_category" varchar(32) not null,
        "expense_description" text not null,
        "expense_date" date not null,
        "currency" varchar(16) not null default 'CNY',
        "amount_including_tax" numeric(15,4) not null,
        "tax_amount" numeric(15,4) null,
        "amount_excluding_tax" numeric(15,4) null,
        "source_type" varchar(32) not null default 'manual',
        "status" varchar(32) not null,
        "evidence_summary" text null,
        "attachment_count" int not null default 0,
        "confirmed_at" timestamptz null,
        "confirmed_by" uuid null,
        "voided_at" timestamptz null,
        "void_reason" text null,
        "row_version" int not null default 1,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "expense_record_pkey" primary key ("id")
      );
    `);
    this.addSql(`
      alter table "poms"."expense_record"
      add constraint "expense_record_project_id_foreign"
      foreign key ("project_id") references "poms"."project" ("id")
      on update cascade on delete cascade;
    `);
    this.addSql(`
      alter table "poms"."expense_record"
      add constraint "expense_record_contract_id_foreign"
      foreign key ("contract_id") references "poms"."contract" ("id")
      on update cascade on delete set null;
    `);
    this.addSql(`create index "expense_record_project_date_idx" on "poms"."expense_record" ("project_id", "expense_date");`);
    this.addSql(`create index "expense_record_project_status_idx" on "poms"."expense_record" ("project_id", "status");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "poms"."expense_record_project_date_idx";`);
    this.addSql(`drop index if exists "poms"."expense_record_project_status_idx";`);
    this.addSql(`alter table "poms"."expense_record" drop constraint if exists "expense_record_project_id_foreign";`);
    this.addSql(`alter table "poms"."expense_record" drop constraint if exists "expense_record_contract_id_foreign";`);
    this.addSql(`drop table if exists "poms"."expense_record" cascade;`);
  }

}
