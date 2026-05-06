import { Migration } from '@mikro-orm/migrations';

export class Migration20260507130000_ex64b_identity_provider_config extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."identity_provider_config" (
                "id" uuid not null default gen_random_uuid(),
                "provider" varchar(32) not null default 'feishu',
                "tenant_id" varchar(128) null,
                "display_name" varchar(128) not null,
                "status" varchar(32) not null default 'draft',
                "enabled" boolean not null default false,
                "login_enabled" boolean not null default false,
                "binding_enabled" boolean not null default false,
                "search_enabled" boolean not null default false,
                "client_id" varchar(255) not null,
                "encrypted_client_secret" text null,
                "secret_updated_at" timestamptz null,
                "redirect_uri" varchar(512) null,
                "login_scopes_json" jsonb not null default '[]'::jsonb,
                "search_scopes_json" jsonb not null default '[]'::jsonb,
                "tenant_allowlist_json" jsonb not null default '[]'::jsonb,
                "search_grant_mode" varchar(32) not null default 'per-admin',
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "identity_provider_config_pkey" primary key ("id")
            );
        `);

        this.addSql(`create unique index "uq_identity_provider_config_provider_tenant" on "poms"."identity_provider_config" ("provider", coalesce("tenant_id", ''));`);
        this.addSql(`alter table "poms"."identity_provider_config" add constraint "chk_identity_provider_config_provider" check ("provider" in ('feishu'));`);
        this.addSql(`alter table "poms"."identity_provider_config" add constraint "chk_identity_provider_config_status" check ("status" in ('draft', 'active', 'disabled', 'misconfigured'));`);
        this.addSql(`alter table "poms"."identity_provider_config" add constraint "chk_identity_provider_config_search_grant_mode" check ("search_grant_mode" in ('per-admin', 'service-account'));`);
        this.addSql(`create index "idx_identity_provider_config_provider_status" on "poms"."identity_provider_config" ("provider", "status");`);
        this.addSql(`create index "idx_identity_provider_config_enabled_login" on "poms"."identity_provider_config" ("enabled", "login_enabled");`);

        this.addSql(`comment on table "poms"."identity_provider_config" is '外部身份提供商配置';`);
        this.addSql(`comment on column "poms"."identity_provider_config"."encrypted_client_secret" is '加密后的 provider client secret，API 不返回明文';`);
        this.addIdentityProviderManagePermissionToPlatformAdmin();
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."identity_provider_config" cascade;`);
    }

    private addIdentityProviderManagePermissionToPlatformAdmin(): void {
        this.addSql(`
            insert into "poms"."role_permission_assignment" ("role_id", "permission_key")
            select "id", 'platform:identity-providers:manage'
            from "poms"."role"
            where "role_key" = 'platform-admin'
            on conflict do nothing;
        `);
    }
}
