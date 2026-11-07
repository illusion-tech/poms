import { Migration } from '@mikro-orm/migrations';

export class Migration20260424100000_ex24_project_completion_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."project_completion_record" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "acceptance_record_id" uuid not null,
                "completion_result" varchar(32) not null,
                "status" varchar(32) not null default 'confirmed',
                "completed_at" timestamptz not null,
                "completed_by" uuid null,
                "completion_summary" text not null,
                "evidence_summary" text not null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                "row_version" integer not null default 1,
                constraint "project_completion_record_pkey" primary key ("id"),
                constraint "project_completion_record_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict,
                constraint "project_completion_record_acceptance_record_id_foreign" foreign key ("acceptance_record_id") references "poms"."acceptance_record" ("id") on update cascade on delete restrict
            );
        `);
        this.addSql(`comment on table "poms"."project_completion_record" is '项目完成结论记录';`);
        this.addSql(`comment on column "poms"."project_completion_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_completion_record"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."project_completion_record"."acceptance_record_id" is '验收记录 ID';`);
        this.addSql(`comment on column "poms"."project_completion_record"."completion_result" is '完成结论';`);
        this.addSql(`comment on column "poms"."project_completion_record"."status" is '状态：confirmed';`);
        this.addSql(`comment on column "poms"."project_completion_record"."completed_at" is '完成确认时间';`);
        this.addSql(`comment on column "poms"."project_completion_record"."completed_by" is '确认人';`);
        this.addSql(`comment on column "poms"."project_completion_record"."completion_summary" is '完成结论摘要';`);
        this.addSql(`comment on column "poms"."project_completion_record"."evidence_summary" is '证据摘要';`);
        this.addSql(`comment on column "poms"."project_completion_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project_completion_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."project_completion_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."project_completion_record"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."project_completion_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`create index "idx_project_completion_record_project_completed" on "poms"."project_completion_record" ("project_id", "status", "completed_at");`);
        this.addSql(`create index "idx_project_completion_record_acceptance" on "poms"."project_completion_record" ("acceptance_record_id");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."project_completion_record";`);
    }
}
