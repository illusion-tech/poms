import { Migration } from '@mikro-orm/migrations';

export class Migration20260322193000_init_project extends Migration {
    override async up(): Promise<void> {
        this.addSql(`create extension if not exists "pgcrypto";`);
        this.addSql(`create schema if not exists "poms";`);

        this.addSql(
            `create table "poms"."project" ("id" uuid not null default gen_random_uuid(), "project_code" varchar(64) not null, "project_name" varchar(255) not null, "customer_id" uuid null, "status" varchar(32) not null, "current_stage" varchar(64) not null, "owner_org_id" uuid null, "owner_user_id" uuid null, "planned_sign_at" timestamptz null, "closed_at" timestamptz null, "closed_reason" text null, "row_version" integer not null default 1, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, constraint "project_pkey" primary key ("id"));`
        );

        this.addSql(`comment on table "poms"."project" is 'POMS 第一阶段项目主链路主体表';`);
        this.addSql(`comment on column "poms"."project"."id" is '项目主键';`);
        this.addSql(`comment on column "poms"."project"."project_code" is '项目编号';`);
        this.addSql(`comment on column "poms"."project"."project_name" is '项目名称';`);
        this.addSql(`comment on column "poms"."project"."customer_id" is '客户标识，第一阶段先保留业务引用';`);
        this.addSql(`comment on column "poms"."project"."status" is '项目当前主状态';`);
        this.addSql(`comment on column "poms"."project"."current_stage" is '项目当前阶段';`);
        this.addSql(`comment on column "poms"."project"."owner_org_id" is '项目归属组织标识';`);
        this.addSql(`comment on column "poms"."project"."owner_user_id" is '项目负责人标识';`);
        this.addSql(`comment on column "poms"."project"."planned_sign_at" is '预计签约时间';`);
        this.addSql(`comment on column "poms"."project"."closed_at" is '项目关闭时间';`);
        this.addSql(`comment on column "poms"."project"."closed_reason" is '项目关闭原因';`);
        this.addSql(`comment on column "poms"."project"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."project"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."project"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."project"."updated_by" is '最后更新人标识';`);

        this.addSql(`alter table "poms"."project" add constraint "project_project_code_unique" unique ("project_code");`);
        this.addSql(`create index "idx_project_status" on "poms"."project" ("status");`);
        this.addSql(`create index "idx_project_current_stage" on "poms"."project" ("current_stage");`);
        this.addSql(`create index "idx_project_owner_org_id" on "poms"."project" ("owner_org_id");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."project" cascade;`);
        this.addSql(`drop schema if exists "poms";`);
    }
}
