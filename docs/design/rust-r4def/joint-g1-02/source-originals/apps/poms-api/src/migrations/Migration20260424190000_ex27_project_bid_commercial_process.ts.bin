import { Migration } from '@mikro-orm/migrations';

export class Migration20260424190000_ex27_project_bid_commercial_process extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."project_bid_commercial_process" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "version" integer not null,
                "is_current" boolean not null default true,
                "supersedes_id" uuid null,
                "status" varchar(32) not null default 'effective',
                "bid_mode" varchar(64) not null,
                "current_stage" varchar(64) not null,
                "decision" varchar(64) not null,
                "result_status" varchar(64) not null,
                "process_summary" text not null,
                "decision_summary" text null,
                "result_summary" text null,
                "owner_role" varchar(128) null,
                "blocker_count" integer not null default 0,
                "effective_at" timestamptz not null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                "row_version" integer not null default 1,
                constraint "project_bid_commercial_process_pkey" primary key ("id"),
                constraint "uq_project_bid_commercial_process_project_version" unique ("project_id", "version"),
                constraint "project_bid_commercial_process_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict,
                constraint "project_bid_commercial_process_supersedes_id_foreign" foreign key ("supersedes_id") references "poms"."project_bid_commercial_process" ("id") on update cascade on delete set null
            );
        `);
        this.addSql(`comment on table "poms"."project_bid_commercial_process" is '签约前招投标与商务竞标过程版本';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."version" is '版本号';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."is_current" is '是否当前有效版本';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."supersedes_id" is '替代的旧过程版本 ID';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."status" is '状态：effective/superseded';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."bid_mode" is '竞标 / 商务路径形态';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."current_stage" is '当前竞标阶段';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."decision" is '参与竞标决策';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."result_status" is '竞标结果状态';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."process_summary" is '过程摘要';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."decision_summary" is '决策说明';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."result_summary" is '结果说明';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."owner_role" is '责任角色';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."blocker_count" is '阻塞事项数量';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."effective_at" is '版本生效时间';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."row_version" is '乐观锁版本号';`);
        this.addSql(`create unique index "uq_project_bid_commercial_process_current" on "poms"."project_bid_commercial_process" ("project_id") where "is_current" = true;`);
        this.addSql(`create index "idx_project_bid_commercial_process_project_version" on "poms"."project_bid_commercial_process" ("project_id", "version");`);
        this.addSql(`create index "idx_project_bid_commercial_process_project_current" on "poms"."project_bid_commercial_process" ("project_id", "is_current");`);
        this.addSql(`create index "idx_project_bid_commercial_process_mode" on "poms"."project_bid_commercial_process" ("bid_mode");`);
        this.addSql(`create index "idx_project_bid_commercial_process_result" on "poms"."project_bid_commercial_process" ("result_status");`);

        this.addSql(`
            create table "poms"."project_bid_commercial_material_item" (
                "id" uuid not null default gen_random_uuid(),
                "process_id" uuid not null,
                "material_key" varchar(128) not null,
                "label" varchar(255) not null,
                "material_status" varchar(32) not null,
                "responsible_role" varchar(128) null,
                "due_at" timestamptz null,
                "blocks_next_step" boolean not null default false,
                "navigation_hint" varchar(255) null,
                "sort_order" integer not null default 0,
                constraint "project_bid_commercial_material_item_pkey" primary key ("id"),
                constraint "project_bid_commercial_material_item_process_id_foreign" foreign key ("process_id") references "poms"."project_bid_commercial_process" ("id") on update cascade on delete cascade
            );
        `);
        this.addSql(`comment on table "poms"."project_bid_commercial_material_item" is '签约前竞标材料齐备度条目';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."process_id" is '竞标过程版本 ID';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."material_key" is '材料键';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."label" is '材料名称';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."material_status" is '材料状态';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."responsible_role" is '责任角色';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."due_at" is '要求完成时间';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."blocks_next_step" is '是否阻塞下一步';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."navigation_hint" is '跳转提示';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_material_item"."sort_order" is '排序号';`);
        this.addSql(`create index "idx_project_bid_commercial_material_process" on "poms"."project_bid_commercial_material_item" ("process_id", "sort_order");`);
        this.addSql(`create index "idx_project_bid_commercial_material_status" on "poms"."project_bid_commercial_material_item" ("material_status");`);
        this.addSql(`create index "idx_project_bid_commercial_material_blocker" on "poms"."project_bid_commercial_material_item" ("process_id", "blocks_next_step");`);

        this.addSql(`
            create table "poms"."project_bid_commercial_timeline_item" (
                "id" uuid not null default gen_random_uuid(),
                "process_id" uuid not null,
                "event_key" varchar(128) not null,
                "label" varchar(255) not null,
                "summary" text null,
                "timeline_status" varchar(32) not null,
                "occurred_at" timestamptz null,
                "due_at" timestamptz null,
                "responsible_role" varchar(128) null,
                "sort_order" integer not null default 0,
                constraint "project_bid_commercial_timeline_item_pkey" primary key ("id"),
                constraint "project_bid_commercial_timeline_item_process_id_foreign" foreign key ("process_id") references "poms"."project_bid_commercial_process" ("id") on update cascade on delete cascade
            );
        `);
        this.addSql(`comment on table "poms"."project_bid_commercial_timeline_item" is '签约前竞标过程时间线条目';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."process_id" is '竞标过程版本 ID';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."event_key" is '事件键';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."label" is '事件名称';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."summary" is '事件摘要';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."timeline_status" is '时间线状态';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."occurred_at" is '实际发生时间';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."due_at" is '计划完成时间';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."responsible_role" is '责任角色';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_timeline_item"."sort_order" is '排序号';`);
        this.addSql(`create index "idx_project_bid_commercial_timeline_process" on "poms"."project_bid_commercial_timeline_item" ("process_id", "sort_order");`);
        this.addSql(`create index "idx_project_bid_commercial_timeline_status" on "poms"."project_bid_commercial_timeline_item" ("timeline_status");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."project_bid_commercial_timeline_item";`);
        this.addSql(`drop table if exists "poms"."project_bid_commercial_material_item";`);
        this.addSql(`drop table if exists "poms"."project_bid_commercial_process";`);
    }
}
