import { Migration } from '@mikro-orm/migrations';

export class Migration20260511140000_ex65b_attachment_storage_provider_config extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."attachment_storage_provider_config" (
                "id" uuid not null default gen_random_uuid(),
                "provider_type" varchar(32) not null default 'local',
                "display_name" varchar(128) not null,
                "status" varchar(32) not null default 'draft',
                "enabled" boolean not null default false,
                "is_default" boolean not null default false,
                "endpoint" varchar(512) null,
                "region" varchar(128) null,
                "bucket" varchar(255) null,
                "key_prefix" varchar(512) null,
                "force_path_style" boolean not null default false,
                "encrypted_access_key_id" text null,
                "encrypted_secret_access_key" text null,
                "credentials_updated_at" timestamptz null,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "attachment_storage_provider_config_pkey" primary key ("id")
            );
        `);

        this.addSql(`create unique index "uq_attachment_storage_provider_enabled_location" on "poms"."attachment_storage_provider_config" ("provider_type", coalesce("bucket", ''), coalesce("key_prefix", '')) where "enabled" = true;`);
        this.addSql(`create unique index "uq_attachment_storage_provider_default" on "poms"."attachment_storage_provider_config" ("is_default") where "enabled" = true and "is_default" = true;`);
        this.addSql(`create index "idx_attachment_storage_provider_type_status" on "poms"."attachment_storage_provider_config" ("provider_type", "status");`);
        this.addSql(`create index "idx_attachment_storage_provider_enabled_default" on "poms"."attachment_storage_provider_config" ("enabled", "is_default");`);
        this.addSql(`alter table "poms"."attachment_storage_provider_config" add constraint "chk_attachment_storage_provider_type" check ("provider_type" in ('local', 'huawei-obs-s3'));`);
        this.addSql(`alter table "poms"."attachment_storage_provider_config" add constraint "chk_attachment_storage_provider_status" check ("status" in ('draft', 'active', 'disabled', 'misconfigured'));`);

        this.addSql(`comment on table "poms"."attachment_storage_provider_config" is '附件存储 Provider 配置';`);
        this.addSql(`comment on column "poms"."attachment_storage_provider_config"."encrypted_access_key_id" is '加密后的 OBS access key id，API 不返回明文';`);
        this.addSql(`comment on column "poms"."attachment_storage_provider_config"."encrypted_secret_access_key" is '加密后的 OBS secret access key，API 不返回明文';`);
        this.addAttachmentStorageProviderManagePermissionToPlatformAdmin();
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."attachment_storage_provider_config" cascade;`);
    }

    private addAttachmentStorageProviderManagePermissionToPlatformAdmin(): void {
        this.addSql(`
            insert into "poms"."role_permission_assignment" ("role_id", "permission_key")
            select "id", 'platform:attachment-storage-providers:manage'
            from "poms"."role"
            where "role_key" = 'platform-admin'
            on conflict do nothing;
        `);
    }
}
