import { Migration } from '@mikro-orm/migrations';

export class Migration20260507143000_ex64c_external_identity_binding extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."external_identity" (
                "id" uuid not null default gen_random_uuid(),
                "identity_provider_config_id" uuid not null,
                "provider" varchar(32) not null default 'feishu',
                "tenant_id" varchar(128) null,
                "poms_user_id" uuid not null,
                "subject_id" varchar(255) not null,
                "union_id" varchar(255) null,
                "subject_display_name" varchar(255) null,
                "avatar_url" varchar(512) null,
                "email" varchar(255) null,
                "mobile" varchar(64) null,
                "status" varchar(32) not null default 'active',
                "bound_at" timestamptz not null default now(),
                "bound_by" uuid null,
                "revoked_at" timestamptz null,
                "revoked_by" uuid null,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "external_identity_pkey" primary key ("id")
            );
        `);

        this.addSql(
            `alter table "poms"."external_identity" add constraint "external_identity_provider_config_id_foreign" foreign key ("identity_provider_config_id") references "poms"."identity_provider_config" ("id") on update cascade on delete restrict;`
        );
        this.addSql(`alter table "poms"."external_identity" add constraint "external_identity_poms_user_id_foreign" foreign key ("poms_user_id") references "poms"."platform_user" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."external_identity" add constraint "chk_external_identity_provider" check ("provider" in ('feishu'));`);
        this.addSql(`alter table "poms"."external_identity" add constraint "chk_external_identity_status" check ("status" in ('active', 'revoked'));`);
        this.addSql(`create index "idx_external_identity_user_status" on "poms"."external_identity" ("poms_user_id", "status");`);
        this.addSql(`create index "idx_external_identity_provider_subject" on "poms"."external_identity" ("identity_provider_config_id", "subject_id", "status");`);
        this.addSql(`create unique index "uq_external_identity_active_subject" on "poms"."external_identity" ("identity_provider_config_id", coalesce("tenant_id", ''), "subject_id") where "status" = 'active';`);
        this.addSql(`create unique index "uq_external_identity_active_user_provider" on "poms"."external_identity" ("poms_user_id", "identity_provider_config_id") where "status" = 'active';`);

        this.addSql(`comment on table "poms"."external_identity" is 'POMS 用户与外部身份主体绑定';`);
        this.addSql(`comment on column "poms"."external_identity"."id" is '外部身份绑定主键';`);
        this.addSql(`comment on column "poms"."external_identity"."identity_provider_config_id" is '外部身份提供商配置标识';`);
        this.addSql(`comment on column "poms"."external_identity"."provider" is '外部身份提供商代码';`);
        this.addSql(`comment on column "poms"."external_identity"."tenant_id" is '外部租户标识';`);
        this.addSql(`comment on column "poms"."external_identity"."poms_user_id" is '绑定的 POMS 用户标识';`);
        this.addSql(`comment on column "poms"."external_identity"."subject_id" is '外部用户主体标识';`);
        this.addSql(`comment on column "poms"."external_identity"."union_id" is '外部统一用户标识';`);
        this.addSql(`comment on column "poms"."external_identity"."subject_display_name" is '外部用户展示名快照';`);
        this.addSql(`comment on column "poms"."external_identity"."avatar_url" is '外部头像地址快照';`);
        this.addSql(`comment on column "poms"."external_identity"."email" is '外部邮箱快照';`);
        this.addSql(`comment on column "poms"."external_identity"."mobile" is '外部手机号快照';`);
        this.addSql(`comment on column "poms"."external_identity"."status" is '绑定状态';`);
        this.addSql(`comment on column "poms"."external_identity"."bound_at" is '绑定时间';`);
        this.addSql(`comment on column "poms"."external_identity"."bound_by" is '绑定操作人';`);
        this.addSql(`comment on column "poms"."external_identity"."revoked_at" is '解绑时间';`);
        this.addSql(`comment on column "poms"."external_identity"."revoked_by" is '解绑操作人';`);
        this.addSql(`comment on column "poms"."external_identity"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."external_identity"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."external_identity"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."external_identity"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."external_identity"."updated_by" is '最后更新人标识';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."external_identity" cascade;`);
    }
}
