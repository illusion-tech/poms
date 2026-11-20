import { Migration } from '@mikro-orm/migrations';

export class Migration20260501100000_ex48a_sales_follow_up_change_lifecycle extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "poms"."sales_follow_up_record"
                add column "status" varchar(32) not null default 'active',
                add column "supersedes_record_id" uuid null,
                add column "replaced_by_record_id" uuid null,
                add column "replacement_reason" text null,
                add column "voided_at" timestamptz null,
                add column "voided_by" uuid null,
                add column "void_reason" text null;
        `);

        this.addSql(`
            alter table "poms"."sales_follow_up_record"
                add constraint "sales_follow_up_supersedes_foreign"
                foreign key ("supersedes_record_id")
                references "poms"."sales_follow_up_record" ("id")
                on update cascade
                on delete restrict;
        `);

        this.addSql(`
            alter table "poms"."sales_follow_up_record"
                add constraint "sales_follow_up_replaced_by_foreign"
                foreign key ("replaced_by_record_id")
                references "poms"."sales_follow_up_record" ("id")
                on update cascade
                on delete restrict;
        `);

        this.addSql(`
            alter table "poms"."sales_follow_up_record"
                add constraint "chk_sales_follow_up_record_status"
                check ("status" in ('active', 'superseded', 'voided'));
        `);

        this.addSql(`create index "idx_sales_follow_up_status_occurred" on "poms"."sales_follow_up_record" ("status", "occurred_at" desc);`);
        this.addSql(`create index "idx_sales_follow_up_supersedes" on "poms"."sales_follow_up_record" ("supersedes_record_id");`);
        this.addSql(`create index "idx_sales_follow_up_replaced_by" on "poms"."sales_follow_up_record" ("replaced_by_record_id");`);
        this.addSql(`
            create unique index "uq_sales_follow_up_supersedes_once"
            on "poms"."sales_follow_up_record" ("supersedes_record_id")
            where "supersedes_record_id" is not null;
        `);
        this.addSql(`
            create unique index "uq_sales_follow_up_replaced_by_once"
            on "poms"."sales_follow_up_record" ("replaced_by_record_id")
            where "replaced_by_record_id" is not null;
        `);

        this.addSql(`comment on column "poms"."sales_follow_up_record"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."supersedes_record_id" is '替代的旧跟进记录 ID';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."replaced_by_record_id" is '替代当前记录的新跟进记录 ID';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."replacement_reason" is '替代原因';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."voided_at" is '作废时间';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."voided_by" is '作废操作人';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."void_reason" is '作废原因';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."uq_sales_follow_up_replaced_by_once";`);
        this.addSql(`drop index if exists "poms"."uq_sales_follow_up_supersedes_once";`);
        this.addSql(`drop index if exists "poms"."idx_sales_follow_up_replaced_by";`);
        this.addSql(`drop index if exists "poms"."idx_sales_follow_up_supersedes";`);
        this.addSql(`drop index if exists "poms"."idx_sales_follow_up_status_occurred";`);
        this.addSql(`alter table "poms"."sales_follow_up_record" drop constraint if exists "chk_sales_follow_up_record_status";`);
        this.addSql(`alter table "poms"."sales_follow_up_record" drop constraint if exists "sales_follow_up_replaced_by_foreign";`);
        this.addSql(`alter table "poms"."sales_follow_up_record" drop constraint if exists "sales_follow_up_supersedes_foreign";`);
        this.addSql(`
            alter table "poms"."sales_follow_up_record"
                drop column if exists "status",
                drop column if exists "supersedes_record_id",
                drop column if exists "replaced_by_record_id",
                drop column if exists "replacement_reason",
                drop column if exists "voided_at",
                drop column if exists "voided_by",
                drop column if exists "void_reason";
        `);
    }
}
