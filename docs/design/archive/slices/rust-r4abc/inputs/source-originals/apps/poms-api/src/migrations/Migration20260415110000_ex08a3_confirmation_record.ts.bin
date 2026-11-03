import { Migration } from '@mikro-orm/migrations';

export class Migration20260415110000_ex08a3_confirmation_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "poms"."confirmation_record" ("id" uuid not null default gen_random_uuid(), "confirmation_type" varchar(64) not null, "business_domain" varchar(64) not null, "target_type" varchar(64) not null, "target_id" uuid not null, "project_id" uuid null, "status" varchar(32) not null default 'pending', "required_count" integer not null, "confirmed_count" integer not null default 0, "confirmation_comment" text null, "submitted_at" timestamptz not null default now(), "confirmed_at" timestamptz null, "closed_at" timestamptz null, "closed_by" uuid null, "close_reason" text null, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, "row_version" integer not null default 1, constraint "confirmation_record_pkey" primary key ("id"));`
        );
        this.addSql(`comment on table "poms"."confirmation_record" is '统一确认实例';`);
        this.addSql(`comment on column "poms"."confirmation_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."confirmation_record"."confirmation_type" is '确认类型';`);
        this.addSql(`comment on column "poms"."confirmation_record"."business_domain" is '业务域';`);
        this.addSql(`comment on column "poms"."confirmation_record"."target_type" is '确认目标类型';`);
        this.addSql(`comment on column "poms"."confirmation_record"."target_id" is '确认目标 ID';`);
        this.addSql(`comment on column "poms"."confirmation_record"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."confirmation_record"."status" is '状态：pending/confirmed/closed';`);
        this.addSql(`comment on column "poms"."confirmation_record"."required_count" is '需确认人数';`);
        this.addSql(`comment on column "poms"."confirmation_record"."confirmed_count" is '已确认人数';`);
        this.addSql(`comment on column "poms"."confirmation_record"."confirmation_comment" is '确认发起备注';`);
        this.addSql(`comment on column "poms"."confirmation_record"."submitted_at" is '发起时间';`);
        this.addSql(`comment on column "poms"."confirmation_record"."confirmed_at" is '全部确认时间';`);
        this.addSql(`comment on column "poms"."confirmation_record"."closed_at" is '关闭时间';`);
        this.addSql(`comment on column "poms"."confirmation_record"."closed_by" is '关闭人';`);
        this.addSql(`comment on column "poms"."confirmation_record"."close_reason" is '关闭原因';`);
        this.addSql(`comment on column "poms"."confirmation_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."confirmation_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."confirmation_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."confirmation_record"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."confirmation_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`create index "idx_confirmation_record_target" on "poms"."confirmation_record" ("target_type", "target_id");`);
        this.addSql(`create index "idx_confirmation_record_status" on "poms"."confirmation_record" ("status");`);
        this.addSql(`create index "idx_confirmation_record_project_status" on "poms"."confirmation_record" ("project_id", "status");`);
        this.addSql(
            `create unique index "uq_confirmation_record_open_target" on "poms"."confirmation_record" ("confirmation_type", "target_type", "target_id") where "status" = 'pending';`
        );

        this.addSql(
            `create table "poms"."confirmation_participant" ("id" uuid not null default gen_random_uuid(), "confirmation_record_id" uuid not null, "participant_id" uuid not null, "participant_role_key" varchar(64) not null, "participant_display_name" varchar(128) null, "participant_status" varchar(32) not null default 'pending', "confirmed_at" timestamptz null, "confirmed_comment" text null, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, constraint "confirmation_participant_pkey" primary key ("id"));`
        );
        this.addSql(`comment on table "poms"."confirmation_participant" is '统一确认参与人明细';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."id" is '主键';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."confirmation_record_id" is '确认实例 ID';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."participant_id" is '确认参与人 ID';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."participant_role_key" is '参与人角色键';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."participant_display_name" is '参与人展示名';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."participant_status" is '参与状态：pending/confirmed/closed';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."confirmed_at" is '确认时间';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."confirmed_comment" is '确认意见';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."confirmation_participant"."updated_by" is '最后更新人';`);
        this.addSql(`alter table "poms"."confirmation_participant" add constraint "confirmation_participant_confirmation_record_id_foreign" foreign key ("confirmation_record_id") references "poms"."confirmation_record" ("id") on update cascade on delete cascade;`);
        this.addSql(`create index "idx_confirmation_participant_record_status" on "poms"."confirmation_participant" ("confirmation_record_id", "participant_status");`);
        this.addSql(`create index "idx_confirmation_participant_user_status" on "poms"."confirmation_participant" ("participant_id", "participant_status");`);
        this.addSql(
            `alter table "poms"."confirmation_participant" add constraint "uq_confirmation_participant_record_user" unique ("confirmation_record_id", "participant_id");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."confirmation_participant" cascade;`);
        this.addSql(`drop table if exists "poms"."confirmation_record" cascade;`);
    }
}
