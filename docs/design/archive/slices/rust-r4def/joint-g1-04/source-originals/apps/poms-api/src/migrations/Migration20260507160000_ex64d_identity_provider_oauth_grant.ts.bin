import { Migration } from '@mikro-orm/migrations';

export class Migration20260507160000_ex64d_identity_provider_oauth_grant extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."identity_provider_oauth_grant" (
                "id" uuid not null default gen_random_uuid(),
                "identity_provider_config_id" uuid not null,
                "provider" varchar(32) not null default 'feishu',
                "tenant_id" varchar(128) null,
                "poms_user_id" uuid not null,
                "encrypted_access_token" text not null,
                "encrypted_refresh_token" text null,
                "scopes_json" jsonb not null default '[]'::jsonb,
                "status" varchar(32) not null default 'active',
                "granted_at" timestamptz not null default now(),
                "expires_at" timestamptz null,
                "refresh_expires_at" timestamptz null,
                "last_used_at" timestamptz null,
                "revoked_at" timestamptz null,
                "last_error" varchar(1024) null,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "identity_provider_oauth_grant_pkey" primary key ("id")
            );
        `);

        this.addSql(
            `alter table "poms"."identity_provider_oauth_grant" add constraint "identity_provider_oauth_grant_provider_config_id_foreign" foreign key ("identity_provider_config_id") references "poms"."identity_provider_config" ("id") on update cascade on delete restrict;`
        );
        this.addSql(
            `alter table "poms"."identity_provider_oauth_grant" add constraint "identity_provider_oauth_grant_poms_user_id_foreign" foreign key ("poms_user_id") references "poms"."platform_user" ("id") on update cascade on delete restrict;`
        );
        this.addSql(`alter table "poms"."identity_provider_oauth_grant" add constraint "chk_identity_provider_oauth_grant_provider" check ("provider" in ('feishu'));`);
        this.addSql(`alter table "poms"."identity_provider_oauth_grant" add constraint "chk_identity_provider_oauth_grant_status" check ("status" in ('missing', 'active', 'expired', 'revoked'));`);
        this.addSql(`create index "idx_identity_provider_oauth_grant_user_status" on "poms"."identity_provider_oauth_grant" ("poms_user_id", "status");`);
        this.addSql(`create index "idx_identity_provider_oauth_grant_provider_user" on "poms"."identity_provider_oauth_grant" ("identity_provider_config_id", "poms_user_id");`);
        this.addSql(`create unique index "uq_identity_provider_oauth_grant_active_user_provider" on "poms"."identity_provider_oauth_grant" ("identity_provider_config_id", "poms_user_id") where "status" = 'active';`);

        this.addSql(`comment on table "poms"."identity_provider_oauth_grant" is '管理员对外部身份提供商的用户级搜索授权';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."id" is '授权记录主键';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."identity_provider_config_id" is '外部身份提供商配置标识';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."provider" is '外部身份提供商代码';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."tenant_id" is '外部租户标识';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."poms_user_id" is '授予搜索授权的 POMS 管理员';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."encrypted_access_token" is '加密后的用户级 access token';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."encrypted_refresh_token" is '加密后的用户级 refresh token';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."scopes_json" is '授权 scope 快照';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."status" is '授权状态';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."granted_at" is '授权时间';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."expires_at" is 'access token 过期时间';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."refresh_expires_at" is 'refresh token 过期时间';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."last_used_at" is '最近一次搜索使用时间';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."revoked_at" is '授权撤销时间';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."last_error" is '最近一次 provider 调用错误摘要';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."identity_provider_oauth_grant"."updated_by" is '最后更新人标识';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."identity_provider_oauth_grant" cascade;`);
    }
}
