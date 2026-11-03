import { Migration } from '@mikro-orm/migrations';

export class Migration20260429100000_ex41a_project_owner_reassignment_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."project_owner_reassignment_record" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "previous_owner_org_id" uuid null,
                "previous_owner_user_id" uuid null,
                "new_owner_org_id" uuid null,
                "new_owner_user_id" uuid not null,
                "reason" text not null,
                "reassigned_at" timestamptz not null,
                "reassigned_by" uuid not null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                constraint "project_owner_reassignment_record_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "poms"."project_owner_reassignment_record"
                add constraint "project_owner_reassignment_record_project_id_foreign"
                foreign key ("project_id")
                references "poms"."project" ("id")
                on update cascade
                on delete restrict;
        `);
        this.addSql(`create index "idx_project_owner_reassignment_project_reassigned" on "poms"."project_owner_reassignment_record" ("project_id", "reassigned_at");`);
        this.addSql(`create index "idx_project_owner_reassignment_reassigned_by" on "poms"."project_owner_reassignment_record" ("reassigned_by");`);
        this.addSql(`comment on table "poms"."project_owner_reassignment_record" is '项目销售主责变更动作记录';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."previous_owner_org_id" is '变更前销售主责组织 ID';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."previous_owner_user_id" is '变更前销售主责人 ID';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."new_owner_org_id" is '变更后销售主责组织 ID';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."new_owner_user_id" is '变更后销售主责人 ID';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."reason" is '销售主责变更原因';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."reassigned_at" is '变更生效时间';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."reassigned_by" is '变更操作人';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project_owner_reassignment_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."project"."owner_org_id" is '项目销售主责组织标识';`);
        this.addSql(`comment on column "poms"."project"."owner_user_id" is '项目销售主责人标识';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."project_owner_reassignment_record";`);
        this.addSql(`comment on column "poms"."project"."owner_org_id" is '项目归属组织标识';`);
        this.addSql(`comment on column "poms"."project"."owner_user_id" is '项目负责人标识';`);
    }
}
