import { Migration } from '@mikro-orm/migrations';

export class Migration20260430160000_ex46_lead_owner_assignment_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."lead_owner_assignment_record" (
                "id" uuid not null default gen_random_uuid(),
                "lead_id" uuid not null,
                "previous_owner_org_id" uuid null,
                "previous_owner_user_id" uuid null,
                "new_owner_org_id" uuid null,
                "new_owner_user_id" uuid not null,
                "assignment_type" varchar(32) not null,
                "reason" text null,
                "assigned_at" timestamptz not null,
                "assigned_by" uuid not null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                constraint "lead_owner_assignment_record_pkey" primary key ("id"),
                constraint "chk_lead_owner_assignment_type" check ("assignment_type" in ('claimed', 'assigned', 'reassigned'))
            );
        `);
        this.addSql(`
            alter table "poms"."lead_owner_assignment_record"
                add constraint "lead_owner_assignment_record_lead_id_foreign"
                foreign key ("lead_id")
                references "poms"."lead" ("id")
                on update cascade
                on delete restrict;
        `);
        this.addSql(`create index "idx_lead_owner_assignment_lead_assigned" on "poms"."lead_owner_assignment_record" ("lead_id", "assigned_at");`);
        this.addSql(`create index "idx_lead_owner_assignment_assigned_by" on "poms"."lead_owner_assignment_record" ("assigned_by");`);
        this.addSql(`create index "idx_lead_owner_assignment_new_owner" on "poms"."lead_owner_assignment_record" ("new_owner_user_id");`);
        this.addSql(`comment on table "poms"."lead_owner_assignment_record" is '线索销售主责申领与分配动作记录';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."lead_id" is '线索 ID';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."previous_owner_org_id" is '动作前销售主责组织 ID';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."previous_owner_user_id" is '动作前销售主责人 ID';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."new_owner_org_id" is '动作后销售主责组织 ID';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."new_owner_user_id" is '动作后销售主责人 ID';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."assignment_type" is '负责人动作类型';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."reason" is '负责人动作原因';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."assigned_at" is '动作生效时间';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."assigned_by" is '动作操作人';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."lead_owner_assignment_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."lead"."owner_org_id" is '线索销售主责组织标识，可为空表示公共池';`);
        this.addSql(`comment on column "poms"."lead"."owner_user_id" is '线索销售主责人标识，可为空表示公共池';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."lead_owner_assignment_record";`);
        this.addSql(`comment on column "poms"."lead"."owner_org_id" is '线索主责组织标识';`);
        this.addSql(`comment on column "poms"."lead"."owner_user_id" is '线索主责人标识';`);
    }
}
