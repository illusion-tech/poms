import { Migration } from '@mikro-orm/migrations';

export class Migration20260423130000_ex23_acceptance_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."acceptance_record" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "acceptance_type" varchar(64) not null,
                "acceptance_result" varchar(32) not null,
                "status" varchar(32) not null default 'confirmed',
                "scope_summary" text not null,
                "evidence_summary" text not null,
                "comment" text null,
                "confirmation_record_id" uuid null,
                "confirmed_at" timestamptz not null,
                "confirmed_by" uuid null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                "row_version" integer not null default 1,
                constraint "acceptance_record_pkey" primary key ("id"),
                constraint "acceptance_record_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict
            );
        `);
        this.addSql(`comment on table "poms"."acceptance_record" is '项目验收确认记录';`);
        this.addSql(`comment on column "poms"."acceptance_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."acceptance_record"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."acceptance_record"."acceptance_type" is '验收类型';`);
        this.addSql(`comment on column "poms"."acceptance_record"."acceptance_result" is '验收结论';`);
        this.addSql(`comment on column "poms"."acceptance_record"."status" is '状态：confirmed/voided';`);
        this.addSql(`comment on column "poms"."acceptance_record"."scope_summary" is '验收范围摘要';`);
        this.addSql(`comment on column "poms"."acceptance_record"."evidence_summary" is '证据摘要';`);
        this.addSql(`comment on column "poms"."acceptance_record"."comment" is '确认备注';`);
        this.addSql(`comment on column "poms"."acceptance_record"."confirmation_record_id" is '关联确认实例 ID';`);
        this.addSql(`comment on column "poms"."acceptance_record"."confirmed_at" is '确认时间';`);
        this.addSql(`comment on column "poms"."acceptance_record"."confirmed_by" is '确认人';`);
        this.addSql(`comment on column "poms"."acceptance_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."acceptance_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."acceptance_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."acceptance_record"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."acceptance_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`create index "idx_acceptance_record_project_confirmed" on "poms"."acceptance_record" ("project_id", "status", "confirmed_at");`);
        this.addSql(`create index "idx_acceptance_record_project_type" on "poms"."acceptance_record" ("project_id", "acceptance_type");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."acceptance_record";`);
    }
}
