import { Migration } from '@mikro-orm/migrations';

export class Migration20260426100000_ex34a_project_archive_record_reversal_replacement extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "poms"."project_archive_record"
                add column "supersedes_archive_record_id" uuid null,
                add column "replacement_reason" text null,
                add column "voided_at" timestamptz null,
                add column "voided_by" uuid null,
                add column "void_reason" text null;
        `);
        this.addSql(`
            alter table "poms"."project_archive_record"
                add constraint "project_archive_record_supersedes_foreign"
                foreign key ("supersedes_archive_record_id")
                references "poms"."project_archive_record" ("id")
                on update cascade
                on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."project_archive_record"
                add constraint "chk_project_archive_record_status"
                check ("status" in ('recorded', 'voided', 'superseded'));
        `);
        this.addSql(`comment on column "poms"."project_archive_record"."status" is '状态：recorded/voided/superseded';`);
        this.addSql(`comment on column "poms"."project_archive_record"."supersedes_archive_record_id" is '替代的旧归档记录 ID';`);
        this.addSql(`comment on column "poms"."project_archive_record"."replacement_reason" is '替代原因';`);
        this.addSql(`comment on column "poms"."project_archive_record"."voided_at" is '撤销时间';`);
        this.addSql(`comment on column "poms"."project_archive_record"."voided_by" is '撤销操作人';`);
        this.addSql(`comment on column "poms"."project_archive_record"."void_reason" is '撤销原因';`);
        this.addSql(`create index "idx_project_archive_record_supersedes" on "poms"."project_archive_record" ("supersedes_archive_record_id");`);
        this.addSql(`
            create unique index "uq_project_archive_record_project_current_recorded"
            on "poms"."project_archive_record" ("project_id")
            where "status" = 'recorded';
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."uq_project_archive_record_project_current_recorded";`);
        this.addSql(`drop index if exists "poms"."idx_project_archive_record_supersedes";`);
        this.addSql(`alter table "poms"."project_archive_record" drop constraint if exists "chk_project_archive_record_status";`);
        this.addSql(`alter table "poms"."project_archive_record" drop constraint if exists "project_archive_record_supersedes_foreign";`);
        this.addSql(`
            alter table "poms"."project_archive_record"
                drop column if exists "supersedes_archive_record_id",
                drop column if exists "replacement_reason",
                drop column if exists "voided_at",
                drop column if exists "voided_by",
                drop column if exists "void_reason";
        `);
        this.addSql(`comment on column "poms"."project_archive_record"."status" is '状态：recorded';`);
    }
}
