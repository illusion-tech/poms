import { Migration } from '@mikro-orm/migrations';

export class Migration20260505100000_ex51_attachment_version_final_runtime extends Migration {
    override async up(): Promise<void> {
        this.addSql(`update "poms"."attachment" set "version_group_id" = "id" where "version_group_id" is null;`);
        this.addSql(`alter table "poms"."attachment" alter column "version_group_id" set not null;`);

        this.addSql(`create index "idx_attachment_version_group_uploaded_at" on "poms"."attachment" ("version_group_id", "uploaded_at");`);
        this.addSql(`create unique index "uq_attachment_version_no" on "poms"."attachment" ("version_group_id", "version_no");`);
        this.addSql(`create unique index "uq_attachment_latest_active" on "poms"."attachment" ("version_group_id") where "status" = 'active' and "is_latest" = true;`);
        this.addSql(`create unique index "uq_attachment_final_active" on "poms"."attachment" ("version_group_id") where "status" = 'active' and "is_final" = true;`);

        this.addSql(`comment on column "poms"."attachment"."version_group_id" is '版本组标识';`);
        this.addSql(`comment on column "poms"."attachment"."version_no" is '版本号';`);
        this.addSql(`comment on column "poms"."attachment"."is_latest" is '是否最新版本';`);
        this.addSql(`comment on column "poms"."attachment"."is_final" is '是否最终版';`);
        this.addSql(`comment on column "poms"."attachment"."previous_attachment_id" is '上一版本附件';`);
        this.addSql(`comment on column "poms"."attachment"."change_note" is '版本变更说明';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."uq_attachment_final_active";`);
        this.addSql(`drop index if exists "poms"."uq_attachment_latest_active";`);
        this.addSql(`drop index if exists "poms"."uq_attachment_version_no";`);
        this.addSql(`drop index if exists "poms"."idx_attachment_version_group_uploaded_at";`);

        this.addSql(`alter table "poms"."attachment" alter column "version_group_id" drop not null;`);
        this.addSql(`comment on column "poms"."attachment"."version_group_id" is '版本组标识，一期预留';`);
        this.addSql(`comment on column "poms"."attachment"."version_no" is '版本号，一期默认 1';`);
        this.addSql(`comment on column "poms"."attachment"."is_latest" is '是否最新版本，一期默认 true';`);
        this.addSql(`comment on column "poms"."attachment"."is_final" is '是否最终版，一期默认 false';`);
        this.addSql(`comment on column "poms"."attachment"."previous_attachment_id" is '上一版本附件，一期预留';`);
        this.addSql(`comment on column "poms"."attachment"."change_note" is '版本变更说明，一期预留';`);
    }
}
