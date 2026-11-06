import { Migration } from '@mikro-orm/migrations';

export class Migration20260325153000_init_platform_governance_core extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "poms"."org_unit" ("id" uuid not null default gen_random_uuid(), "name" varchar(128) not null, "code" varchar(64) not null, "description" text null, "parent_id" uuid null, "is_active" boolean not null default true, "display_order" integer not null default 0, "row_version" integer not null default 1, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, constraint "org_unit_pkey" primary key ("id"));`
        );
        this.addSql(`alter table "poms"."org_unit" add constraint "org_unit_code_unique" unique ("code");`);
        this.addSql(`create index "idx_org_unit_parent_id" on "poms"."org_unit" ("parent_id");`);
        this.addSql(`create index "idx_org_unit_is_active" on "poms"."org_unit" ("is_active");`);

        this.addSql(
            `create table "poms"."role" ("id" uuid not null default gen_random_uuid(), "role_key" varchar(64) not null, "name" varchar(128) not null, "description" text null, "is_active" boolean not null default true, "is_system_role" boolean not null default false, "display_order" integer not null default 0, "row_version" integer not null default 1, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, constraint "role_pkey" primary key ("id"));`
        );
        this.addSql(`alter table "poms"."role" add constraint "role_role_key_unique" unique ("role_key");`);
        this.addSql(`create index "idx_role_is_active" on "poms"."role" ("is_active");`);

        this.addSql(
            `create table "poms"."platform_user" ("id" uuid not null default gen_random_uuid(), "username" varchar(64) not null, "display_name" varchar(128) not null, "email" varchar(255) null, "phone" varchar(64) null, "avatar_url" varchar(512) null, "is_active" boolean not null default true, "primary_org_unit_id" uuid null, "last_login_at" timestamptz null, "row_version" integer not null default 1, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, constraint "platform_user_pkey" primary key ("id"));`
        );
        this.addSql(`alter table "poms"."platform_user" add constraint "platform_user_username_unique" unique ("username");`);
        this.addSql(`create index "idx_platform_user_is_active" on "poms"."platform_user" ("is_active");`);
        this.addSql(`create index "idx_platform_user_primary_org_unit_id" on "poms"."platform_user" ("primary_org_unit_id");`);

        this.addSql(
            `create table "poms"."user_role_assignment" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "role_id" uuid not null, "status" varchar(32) not null default 'active', "assigned_at" timestamptz not null default now(), "assigned_by" uuid null, "revoked_at" timestamptz null, "revoked_by" uuid null, "change_reason" text null, "created_at" timestamptz not null default now(), "created_by" uuid null, constraint "user_role_assignment_pkey" primary key ("id"));`
        );
        this.addSql(`create index "idx_user_role_assignment_user_id_status" on "poms"."user_role_assignment" ("user_id", "status");`);
        this.addSql(`create index "idx_user_role_assignment_role_id_status" on "poms"."user_role_assignment" ("role_id", "status");`);
        this.addSql(`create unique index "uq_user_role_assignment_active" on "poms"."user_role_assignment" ("user_id", "role_id") where "status" = 'active';`);

        this.addSql(
            `create table "poms"."user_org_membership" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "org_unit_id" uuid not null, "membership_type" varchar(32) not null, "status" varchar(32) not null default 'active', "assigned_at" timestamptz not null default now(), "assigned_by" uuid null, "revoked_at" timestamptz null, "revoked_by" uuid null, "change_reason" text null, "created_at" timestamptz not null default now(), "created_by" uuid null, constraint "user_org_membership_pkey" primary key ("id"));`
        );
        this.addSql(`create index "idx_user_org_membership_user_id_status" on "poms"."user_org_membership" ("user_id", "status");`);
        this.addSql(`create index "idx_user_org_membership_org_unit_id_status" on "poms"."user_org_membership" ("org_unit_id", "status");`);
        this.addSql(`create unique index "uq_user_org_membership_active" on "poms"."user_org_membership" ("user_id", "org_unit_id") where "status" = 'active';`);
        this.addSql(`create unique index "uq_user_primary_org_membership_active" on "poms"."user_org_membership" ("user_id") where "status" = 'active' and "membership_type" = 'primary';`);

        this.addSql(
            `create table "poms"."role_permission_assignment" ("id" uuid not null default gen_random_uuid(), "role_id" uuid not null, "permission_key" varchar(128) not null, "status" varchar(32) not null default 'active', "assigned_at" timestamptz not null default now(), "assigned_by" uuid null, "revoked_at" timestamptz null, "revoked_by" uuid null, "change_reason" text null, "created_at" timestamptz not null default now(), "created_by" uuid null, constraint "role_permission_assignment_pkey" primary key ("id"));`
        );
        this.addSql(`create index "idx_role_permission_assignment_role_id_status" on "poms"."role_permission_assignment" ("role_id", "status");`);
        this.addSql(`create index "idx_role_permission_assignment_permission_key" on "poms"."role_permission_assignment" ("permission_key");`);
        this.addSql(`create unique index "uq_role_permission_assignment_active" on "poms"."role_permission_assignment" ("role_id", "permission_key") where "status" = 'active';`);

        this.addSql(`alter table "poms"."org_unit" add constraint "org_unit_parent_id_foreign" foreign key ("parent_id") references "poms"."org_unit" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."platform_user" add constraint "platform_user_primary_org_unit_id_foreign" foreign key ("primary_org_unit_id") references "poms"."org_unit" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."user_role_assignment" add constraint "user_role_assignment_user_id_foreign" foreign key ("user_id") references "poms"."platform_user" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."user_role_assignment" add constraint "user_role_assignment_role_id_foreign" foreign key ("role_id") references "poms"."role" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."user_org_membership" add constraint "user_org_membership_user_id_foreign" foreign key ("user_id") references "poms"."platform_user" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."user_org_membership" add constraint "user_org_membership_org_unit_id_foreign" foreign key ("org_unit_id") references "poms"."org_unit" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."role_permission_assignment" add constraint "role_permission_assignment_role_id_foreign" foreign key ("role_id") references "poms"."role" ("id") on update cascade on delete cascade;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."role_permission_assignment" drop constraint if exists "role_permission_assignment_role_id_foreign";`);
        this.addSql(`alter table "poms"."user_org_membership" drop constraint if exists "user_org_membership_org_unit_id_foreign";`);
        this.addSql(`alter table "poms"."user_org_membership" drop constraint if exists "user_org_membership_user_id_foreign";`);
        this.addSql(`alter table "poms"."user_role_assignment" drop constraint if exists "user_role_assignment_role_id_foreign";`);
        this.addSql(`alter table "poms"."user_role_assignment" drop constraint if exists "user_role_assignment_user_id_foreign";`);
        this.addSql(`alter table "poms"."platform_user" drop constraint if exists "platform_user_primary_org_unit_id_foreign";`);
        this.addSql(`alter table "poms"."org_unit" drop constraint if exists "org_unit_parent_id_foreign";`);
        this.addSql(`drop table if exists "poms"."role_permission_assignment" cascade;`);
        this.addSql(`drop table if exists "poms"."user_org_membership" cascade;`);
        this.addSql(`drop table if exists "poms"."user_role_assignment" cascade;`);
        this.addSql(`drop table if exists "poms"."platform_user" cascade;`);
        this.addSql(`drop table if exists "poms"."role" cascade;`);
        this.addSql(`drop table if exists "poms"."org_unit" cascade;`);
    }
}
