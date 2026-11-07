import { Migration } from '@mikro-orm/migrations';

export class Migration20260610120000_ex72b_external_org_sync_persistence extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."external_org_source" (
                "id" uuid not null default gen_random_uuid(),
                "provider" varchar(32) not null default 'feishu',
                "external_tenant_id" varchar(128) null,
                "display_name" varchar(128) not null,
                "status" varchar(32) not null default 'draft',
                "provider_config_id" uuid null,
                "authoritative_org_unit_id" uuid null,
                "external_root_department_id" varchar(255) null,
                "sync_scopes_json" jsonb not null default '[]'::jsonb,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "external_org_source_pkey" primary key ("id")
            );
        `);
        this.addSql(`create unique index "uq_external_org_source_provider_tenant" on "poms"."external_org_source" ("provider", coalesce("external_tenant_id", ''));`);
        this.addSql(
            `create unique index "uq_external_org_source_active_authoritative_org" on "poms"."external_org_source" (coalesce("authoritative_org_unit_id", '00000000-0000-0000-0000-000000000000'::uuid)) where "status" = 'active';`
        );
        this.addSql(`create index "idx_external_org_source_provider_status" on "poms"."external_org_source" ("provider", "status");`);
        this.addSql(`create index "idx_external_org_source_provider_config_id" on "poms"."external_org_source" ("provider_config_id");`);
        this.addSql(`create index "idx_external_org_source_authoritative_org" on "poms"."external_org_source" ("authoritative_org_unit_id");`);
        this.addSql(`alter table "poms"."external_org_source" add constraint "chk_external_org_source_provider" check ("provider" in ('feishu', 'dingtalk', 'wecom'));`);
        this.addSql(`alter table "poms"."external_org_source" add constraint "chk_external_org_source_status" check ("status" in ('draft', 'active', 'paused', 'archived'));`);
        this.addSql(`comment on table "poms"."external_org_source" is '外部组织同步源';`);

        this.addSql(`
            create table "poms"."external_department_mapping" (
                "id" uuid not null default gen_random_uuid(),
                "source_id" uuid not null,
                "external_department_id" varchar(255) not null,
                "external_parent_department_id" varchar(255) null,
                "external_department_name" varchar(255) not null,
                "org_unit_id" uuid null,
                "status" varchar(32) not null default 'unmapped',
                "external_snapshot_json" jsonb not null default '{}'::jsonb,
                "last_seen_at" timestamptz null,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "external_department_mapping_pkey" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."external_department_mapping" add constraint "chk_external_department_mapping_status" check ("status" in ('unmapped', 'mapped', 'conflict', 'ignored'));`);
        this.addSql(`alter table "poms"."external_department_mapping" add constraint "uq_external_department_mapping_source_department" unique ("source_id", "external_department_id");`);
        this.addSql(`create unique index "uq_external_department_mapping_mapped_org" on "poms"."external_department_mapping" ("source_id", "org_unit_id") where "org_unit_id" is not null and "status" = 'mapped';`);
        this.addSql(`create index "idx_external_department_mapping_source_status" on "poms"."external_department_mapping" ("source_id", "status");`);
        this.addSql(`create index "idx_external_department_mapping_org_unit_id" on "poms"."external_department_mapping" ("org_unit_id");`);
        this.addSql(`create index "idx_external_department_mapping_last_seen_at" on "poms"."external_department_mapping" ("last_seen_at");`);
        this.addSql(`comment on table "poms"."external_department_mapping" is '外部部门到 POMS 组织单元的映射';`);

        this.addSql(`
            create table "poms"."org_sync_run" (
                "id" uuid not null default gen_random_uuid(),
                "source_id" uuid not null,
                "status" varchar(32) not null default 'previewing',
                "requested_by" uuid null,
                "started_at" timestamptz not null default now(),
                "finished_at" timestamptz null,
                "total_item_count" int not null default 0,
                "approved_item_count" int not null default 0,
                "skipped_item_count" int not null default 0,
                "failed_item_count" int not null default 0,
                "error_summary" text null,
                "request_snapshot_json" jsonb not null default '{}'::jsonb,
                "result_summary_json" jsonb not null default '{}'::jsonb,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "org_sync_run_pkey" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."org_sync_run" add constraint "chk_org_sync_run_status" check ("status" in ('previewing', 'previewed', 'applying', 'applied', 'failed', 'cancelled'));`);
        this.addSql(`create index "idx_org_sync_run_source_status" on "poms"."org_sync_run" ("source_id", "status");`);
        this.addSql(`create index "idx_org_sync_run_status_started_at" on "poms"."org_sync_run" ("status", "started_at");`);
        this.addSql(`create index "idx_org_sync_run_requested_by" on "poms"."org_sync_run" ("requested_by");`);
        this.addSql(`comment on table "poms"."org_sync_run" is '外部组织同步预览或应用运行记录';`);

        this.addSql(`
            create table "poms"."org_sync_diff_item" (
                "id" uuid not null default gen_random_uuid(),
                "run_id" uuid not null,
                "external_department_id" varchar(255) not null,
                "action" varchar(64) not null default 'conflict',
                "status" varchar(32) not null default 'pending',
                "org_unit_id" uuid null,
                "before_snapshot_json" jsonb null,
                "candidate_snapshot_json" jsonb not null default '{}'::jsonb,
                "error_message" text null,
                "applied_at" timestamptz null,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "org_sync_diff_item_pkey" primary key ("id")
            );
        `);
        this.addSql(
            `alter table "poms"."org_sync_diff_item" add constraint "chk_org_sync_diff_item_action" check ("action" in ('create_org_unit', 'update_org_unit', 'move_org_unit', 'disable_org_unit', 'map_existing_org_unit', 'ignore', 'conflict'));`
        );
        this.addSql(`alter table "poms"."org_sync_diff_item" add constraint "chk_org_sync_diff_item_status" check ("status" in ('pending', 'approved', 'skipped', 'applied', 'failed'));`);
        this.addSql(`alter table "poms"."org_sync_diff_item" add constraint "uq_org_sync_diff_item_run_department_action" unique ("run_id", "external_department_id", "action");`);
        this.addSql(`create index "idx_org_sync_diff_item_run_status" on "poms"."org_sync_diff_item" ("run_id", "status");`);
        this.addSql(`create index "idx_org_sync_diff_item_action_status" on "poms"."org_sync_diff_item" ("action", "status");`);
        this.addSql(`create index "idx_org_sync_diff_item_org_unit_id" on "poms"."org_sync_diff_item" ("org_unit_id");`);
        this.addSql(`comment on table "poms"."org_sync_diff_item" is '外部组织同步候选变更项';`);

        this.addSql(
            `alter table "poms"."external_org_source" add constraint "external_org_source_provider_config_id_foreign" foreign key ("provider_config_id") references "poms"."identity_provider_config" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "poms"."external_org_source" add constraint "external_org_source_authoritative_org_unit_id_foreign" foreign key ("authoritative_org_unit_id") references "poms"."org_unit" ("id") on update cascade on delete restrict;`
        );
        this.addSql(
            `alter table "poms"."external_department_mapping" add constraint "external_department_mapping_source_id_foreign" foreign key ("source_id") references "poms"."external_org_source" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "poms"."external_department_mapping" add constraint "external_department_mapping_org_unit_id_foreign" foreign key ("org_unit_id") references "poms"."org_unit" ("id") on update cascade on delete set null;`
        );
        this.addSql(`alter table "poms"."org_sync_run" add constraint "org_sync_run_source_id_foreign" foreign key ("source_id") references "poms"."external_org_source" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."org_sync_run" add constraint "org_sync_run_requested_by_foreign" foreign key ("requested_by") references "poms"."platform_user" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."org_sync_diff_item" add constraint "org_sync_diff_item_run_id_foreign" foreign key ("run_id") references "poms"."org_sync_run" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."org_sync_diff_item" add constraint "org_sync_diff_item_org_unit_id_foreign" foreign key ("org_unit_id") references "poms"."org_unit" ("id") on update cascade on delete set null;`);

        this.addOrgSyncManagePermissionToPlatformAdmin();
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."org_sync_diff_item" drop constraint if exists "org_sync_diff_item_org_unit_id_foreign";`);
        this.addSql(`alter table "poms"."org_sync_diff_item" drop constraint if exists "org_sync_diff_item_run_id_foreign";`);
        this.addSql(`alter table "poms"."org_sync_run" drop constraint if exists "org_sync_run_requested_by_foreign";`);
        this.addSql(`alter table "poms"."org_sync_run" drop constraint if exists "org_sync_run_source_id_foreign";`);
        this.addSql(`alter table "poms"."external_department_mapping" drop constraint if exists "external_department_mapping_org_unit_id_foreign";`);
        this.addSql(`alter table "poms"."external_department_mapping" drop constraint if exists "external_department_mapping_source_id_foreign";`);
        this.addSql(`alter table "poms"."external_org_source" drop constraint if exists "external_org_source_authoritative_org_unit_id_foreign";`);
        this.addSql(`alter table "poms"."external_org_source" drop constraint if exists "external_org_source_provider_config_id_foreign";`);
        this.addSql(`drop table if exists "poms"."org_sync_diff_item" cascade;`);
        this.addSql(`drop table if exists "poms"."org_sync_run" cascade;`);
        this.addSql(`drop table if exists "poms"."external_department_mapping" cascade;`);
        this.addSql(`drop table if exists "poms"."external_org_source" cascade;`);
    }

    private addOrgSyncManagePermissionToPlatformAdmin(): void {
        this.addSql(`
            insert into "poms"."role_permission_assignment" ("role_id", "permission_key")
            select "id", 'platform:org-sync:manage'
            from "poms"."role"
            where "role_key" = 'platform-admin'
            on conflict do nothing;
        `);
    }
}
