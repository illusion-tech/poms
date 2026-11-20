import { Migration } from '@mikro-orm/migrations';

export class Migration20260322235500_init_approval_and_todo extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "poms"."approval_record" ("id" uuid not null default gen_random_uuid(), "approval_type" varchar(64) not null, "business_domain" varchar(64) not null, "target_object_type" varchar(64) not null, "target_object_id" uuid not null, "project_id" uuid null, "current_status" varchar(32) not null, "current_node_key" varchar(64) not null, "initiator_user_id" uuid not null, "current_approver_user_id" uuid null, "decision" varchar(32) null, "decision_comment" text null, "submitted_at" timestamptz not null, "decided_at" timestamptz null, "closed_at" timestamptz null, "row_version" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "approval_record_pkey" primary key ("id"));`
        );
        this.addSql(`comment on table "poms"."approval_record" is 'POMS 第一阶段统一审批记录表';`);
        this.addSql(`create index "idx_approval_record_target" on "poms"."approval_record" ("target_object_type", "target_object_id");`);
        this.addSql(`create index "idx_approval_record_status" on "poms"."approval_record" ("current_status");`);
        this.addSql(`create index "idx_approval_record_approver" on "poms"."approval_record" ("current_approver_user_id");`);

        this.addSql(
            `create table "poms"."todo_item" ("id" uuid not null default gen_random_uuid(), "source_type" varchar(64) not null, "source_id" uuid not null, "todo_type" varchar(64) not null, "business_domain" varchar(64) not null, "target_object_type" varchar(64) not null, "target_object_id" uuid not null, "project_id" uuid null, "title" varchar(255) not null, "summary" text null, "assignee_user_id" uuid not null, "status" varchar(32) not null, "priority" varchar(16) not null, "due_at" timestamptz null, "completed_at" timestamptz null, "row_version" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "todo_item_pkey" primary key ("id"));`
        );
        this.addSql(`comment on table "poms"."todo_item" is 'POMS 第一阶段统一待办表';`);
        this.addSql(`create index "idx_todo_item_assignee_status" on "poms"."todo_item" ("assignee_user_id", "status");`);
        this.addSql(`create index "idx_todo_item_target" on "poms"."todo_item" ("target_object_type", "target_object_id");`);
        this.addSql(
            `create unique index "uq_todo_item_open_source" on "poms"."todo_item" ("source_type", "source_id", "assignee_user_id") where "status" in ('open', 'processing');`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."todo_item" cascade;`);
        this.addSql(`drop table if exists "poms"."approval_record" cascade;`);
    }
}
