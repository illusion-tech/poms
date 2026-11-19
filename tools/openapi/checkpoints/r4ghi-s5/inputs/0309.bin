import { Migration } from '@mikro-orm/migrations';

export class Migration20260424143000_ex25_project_archive_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."project_archive_record" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "archive_anchor_stage" varchar(32) not null,
                "archive_anchor_source_type" varchar(32) not null,
                "archive_anchor_source_id" uuid not null,
                "status" varchar(32) not null default 'recorded',
                "archived_at" timestamptz not null,
                "archived_by" uuid null,
                "archive_summary" text not null,
                "evidence_summary" text not null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                "row_version" integer not null default 1,
                constraint "project_archive_record_pkey" primary key ("id"),
                constraint "project_archive_record_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict
            );
        `);
        this.addSql(`comment on table "poms"."project_archive_record" is '项目归档记录';`);
        this.addSql(`comment on column "poms"."project_archive_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_archive_record"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."project_archive_record"."archive_anchor_stage" is '归档锚定终态阶段';`);
        this.addSql(`comment on column "poms"."project_archive_record"."archive_anchor_source_type" is '归档锚定来源类型';`);
        this.addSql(`comment on column "poms"."project_archive_record"."archive_anchor_source_id" is '归档锚定来源 ID';`);
        this.addSql(`comment on column "poms"."project_archive_record"."status" is '状态：recorded';`);
        this.addSql(`comment on column "poms"."project_archive_record"."archived_at" is '归档时间';`);
        this.addSql(`comment on column "poms"."project_archive_record"."archived_by" is '归档操作人';`);
        this.addSql(`comment on column "poms"."project_archive_record"."archive_summary" is '归档结论摘要';`);
        this.addSql(`comment on column "poms"."project_archive_record"."evidence_summary" is '归档证据摘要';`);
        this.addSql(`comment on column "poms"."project_archive_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project_archive_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."project_archive_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."project_archive_record"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."project_archive_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`create index "idx_project_archive_record_project_archived" on "poms"."project_archive_record" ("project_id", "status", "archived_at");`);
        this.addSql(`create index "idx_project_archive_record_project_anchor_stage" on "poms"."project_archive_record" ("project_id", "archive_anchor_stage");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."project_archive_record";`);
    }
}
