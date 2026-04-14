import { Migration } from '@mikro-orm/migrations';

/**
 * EX-08A2: 建立审批 / 移交摘要快照最小承接。
 *
 * 该切片提供 approval_summary_* 三张稳定表，并补齐 project_handover
 * 对合同承接摘要快照与移交确认摘要快照的 FK。
 */
export class Migration20260415100000_ex08a2_approval_summary_snapshot extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."approval_summary_package_definition" (
                "id"                    uuid         not null default gen_random_uuid(),
                "approval_scenario_key" varchar(128) not null,
                "summary_package_key"   varchar(64)  not null,
                "projection_level"      varchar(32)  not null,
                "export_policy"         varchar(32)  not null,
                "field_rule_version"    varchar(64)  not null,
                "status"                varchar(32)  not null default 'active',
                "created_at"            timestamptz  not null default now(),
                "created_by"            uuid         null,
                "updated_at"            timestamptz  not null default now(),
                "updated_by"            uuid         null,
                "row_version"           integer      not null default 1,
                constraint "pk_approval_summary_package_definition" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."approval_summary_package_definition" is '审批摘要包定义';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."id" is '主键';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."approval_scenario_key" is '审批场景键';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."summary_package_key" is '摘要包键';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."projection_level" is '摘要投影级别';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."export_policy" is '导出策略';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."field_rule_version" is '字段规则版本';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."status" is '状态：active/inactive/superseded';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."approval_summary_package_definition"."row_version" is '乐观锁版本号';`);
        this.addSql(`alter table "poms"."approval_summary_package_definition" add constraint "uq_aspd_scenario_package" unique ("approval_scenario_key", "summary_package_key");`);
        this.addSql(`create index "idx_aspd_scenario_status" on "poms"."approval_summary_package_definition" ("approval_scenario_key", "status");`);
        this.addSql(`create index "idx_aspd_scenario_projection_status" on "poms"."approval_summary_package_definition" ("approval_scenario_key", "projection_level", "status");`);

        this.addSql(`
            create table "poms"."approval_summary_snapshot" (
                "id"                          uuid         not null default gen_random_uuid(),
                "target_type"                 varchar(64)  not null,
                "target_id"                   uuid         not null,
                "approval_scenario_key"       varchar(128) not null,
                "summary_package_id"          uuid         not null,
                "summary_package_key"         varchar(64)  not null,
                "projection_level"            varchar(32)  not null,
                "export_policy"               varchar(32)  not null,
                "business_status_at_snapshot" varchar(32)  not null,
                "generated_at"                timestamptz  not null default now(),
                "status"                      varchar(32)  not null default 'active',
                "supersedes_id"               uuid         null,
                "created_at"                  timestamptz  not null default now(),
                "created_by"                  uuid         null,
                "updated_at"                  timestamptz  not null default now(),
                "updated_by"                  uuid         null,
                "row_version"                 integer      not null default 1,
                constraint "pk_approval_summary_snapshot" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."approval_summary_snapshot" is '审批摘要场景快照';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."id" is '主键';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."target_type" is '审批对象类型';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."target_id" is '审批对象 ID';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."approval_scenario_key" is '审批场景键';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."summary_package_id" is '摘要包定义 ID';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."summary_package_key" is '摘要包键';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."projection_level" is '摘要投影级别';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."export_policy" is '导出策略';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."business_status_at_snapshot" is '快照生成时业务状态';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."generated_at" is '生成时间';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."supersedes_id" is '被替代的摘要快照';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."approval_summary_snapshot"."row_version" is '乐观锁版本号';`);
        this.addSql(`
            alter table "poms"."approval_summary_snapshot"
            add constraint "approval_summary_snapshot_summary_package_id_foreign"
            foreign key ("summary_package_id") references "poms"."approval_summary_package_definition" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."approval_summary_snapshot"
            add constraint "approval_summary_snapshot_supersedes_id_foreign"
            foreign key ("supersedes_id") references "poms"."approval_summary_snapshot" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(`create index "idx_ass_target" on "poms"."approval_summary_snapshot" ("target_type", "target_id");`);
        this.addSql(`create index "idx_ass_scenario_generated" on "poms"."approval_summary_snapshot" ("approval_scenario_key", "generated_at" desc);`);
        this.addSql(`create index "idx_ass_package_status" on "poms"."approval_summary_snapshot" ("summary_package_id", "status");`);
        this.addSql(`
            create unique index "uq_ass_target_scenario_projection_active"
            on "poms"."approval_summary_snapshot" ("target_type", "target_id", "approval_scenario_key", "projection_level")
            where "status" = 'active';
        `);

        this.addSql(`
            create table "poms"."approval_summary_field_projection" (
                "id"                    uuid         not null default gen_random_uuid(),
                "summary_snapshot_id"   uuid         not null,
                "field_key"             varchar(128) not null,
                "visibility_level"      varchar(32)  not null,
                "masking_mode"          varchar(32)  not null,
                "export_policy"         varchar(32)  not null,
                "field_order"           integer      not null default 0,
                "channel_scope_summary" text         null,
                "created_at"            timestamptz  not null default now(),
                "created_by"            uuid         null,
                constraint "pk_approval_summary_field_projection" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."approval_summary_field_projection" is '审批摘要字段投影明细';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."id" is '主键';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."summary_snapshot_id" is '摘要快照 ID';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."field_key" is '字段键';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."visibility_level" is '可见级别';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."masking_mode" is '脱敏模式';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."export_policy" is '导出策略';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."field_order" is '字段排序';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."channel_scope_summary" is '渠道范围摘要';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."approval_summary_field_projection"."created_by" is '创建人';`);
        this.addSql(`
            alter table "poms"."approval_summary_field_projection"
            add constraint "approval_summary_field_projection_summary_snapshot_id_foreign"
            foreign key ("summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`alter table "poms"."approval_summary_field_projection" add constraint "uq_asfp_snapshot_field" unique ("summary_snapshot_id", "field_key");`);
        this.addSql(`create index "idx_asfp_snapshot_order" on "poms"."approval_summary_field_projection" ("summary_snapshot_id", "field_order");`);

        this.addSql(`
            alter table "poms"."project_handover"
            add constraint "project_handover_contract_summary_snapshot_id_foreign"
            foreign key ("contract_summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."project_handover"
            add constraint "project_handover_summary_snapshot_id_foreign"
            foreign key ("summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`create index "idx_project_handover_contract_summary_snapshot" on "poms"."project_handover" ("contract_summary_snapshot_id");`);
        this.addSql(`comment on column "poms"."project_handover"."contract_summary_snapshot_id" is '合同承接摘要快照 ID';`);
        this.addSql(`comment on column "poms"."project_handover"."summary_snapshot_id" is '移交确认摘要快照 ID';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."idx_project_handover_contract_summary_snapshot";`);
        this.addSql(`alter table "poms"."project_handover" drop constraint if exists "project_handover_summary_snapshot_id_foreign";`);
        this.addSql(`alter table "poms"."project_handover" drop constraint if exists "project_handover_contract_summary_snapshot_id_foreign";`);

        this.addSql(`drop table if exists "poms"."approval_summary_field_projection";`);
        this.addSql(`drop table if exists "poms"."approval_summary_snapshot";`);
        this.addSql(`drop table if exists "poms"."approval_summary_package_definition";`);
    }
}
