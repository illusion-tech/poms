import { Migration } from '@mikro-orm/migrations';

export class Migration20260425103000_ex31_lead_minimal_fact_source extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "poms"."lead" ("id" uuid not null default gen_random_uuid(), "lead_code" varchar(64) not null, "lead_name" varchar(255) not null, "customer_name" varchar(255) not null, "source_channel" varchar(64) null, "status" varchar(32) not null default 'registered', "owner_org_id" uuid null, "owner_user_id" uuid null, "qualification_summary" text null, "qualified_at" timestamptz null, "qualified_by" uuid null, "closed_reason" text null, "closed_at" timestamptz null, "closed_by" uuid null, "converted_project_id" uuid null, "converted_at" timestamptz null, "converted_by" uuid null, "row_version" integer not null default 1, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, constraint "lead_pkey" primary key ("id"));`
        );

        this.addSql(`comment on table "poms"."lead" is 'POMS 销售线索最小事实源表';`);
        this.addSql(`comment on column "poms"."lead"."id" is '线索主键';`);
        this.addSql(`comment on column "poms"."lead"."lead_code" is '线索编号';`);
        this.addSql(`comment on column "poms"."lead"."lead_name" is '线索标题/机会名称';`);
        this.addSql(`comment on column "poms"."lead"."customer_name" is '客户名称';`);
        this.addSql(`comment on column "poms"."lead"."source_channel" is '线索来源渠道';`);
        this.addSql(`comment on column "poms"."lead"."status" is '线索状态';`);
        this.addSql(`comment on column "poms"."lead"."owner_org_id" is '线索主责组织标识';`);
        this.addSql(`comment on column "poms"."lead"."owner_user_id" is '线索主责人标识';`);
        this.addSql(`comment on column "poms"."lead"."qualification_summary" is '线索有效性说明';`);
        this.addSql(`comment on column "poms"."lead"."qualified_at" is '线索有效化时间';`);
        this.addSql(`comment on column "poms"."lead"."qualified_by" is '线索有效化操作人';`);
        this.addSql(`comment on column "poms"."lead"."closed_reason" is '线索关闭原因';`);
        this.addSql(`comment on column "poms"."lead"."closed_at" is '线索关闭时间';`);
        this.addSql(`comment on column "poms"."lead"."closed_by" is '线索关闭操作人';`);
        this.addSql(`comment on column "poms"."lead"."converted_project_id" is '已转项目标识';`);
        this.addSql(`comment on column "poms"."lead"."converted_at" is '线索转项目时间';`);
        this.addSql(`comment on column "poms"."lead"."converted_by" is '线索转项目操作人';`);
        this.addSql(`comment on column "poms"."lead"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."lead"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."lead"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."lead"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."lead"."updated_by" is '最后更新人标识';`);

        this.addSql(`alter table "poms"."lead" add constraint "lead_lead_code_unique" unique ("lead_code");`);
        this.addSql(`alter table "poms"."lead" add constraint "chk_lead_status" check ("status" in ('registered', 'qualified', 'converted', 'closed'));`);
        this.addSql(`create index "idx_lead_status" on "poms"."lead" ("status");`);
        this.addSql(`create index "idx_lead_owner_org_id" on "poms"."lead" ("owner_org_id");`);
        this.addSql(`create index "idx_lead_owner_user_id" on "poms"."lead" ("owner_user_id");`);
        this.addSql(`create index "idx_lead_converted_project_id" on "poms"."lead" ("converted_project_id");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."lead" cascade;`);
    }
}
