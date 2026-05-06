import { Migration } from '@mikro-orm/migrations';

export class Migration20260507173000_ex64e_external_login_ticket extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."external_login_ticket" (
                "id" uuid not null default gen_random_uuid(),
                "ticket_hash" varchar(128) not null,
                "identity_provider_config_id" uuid not null,
                "external_identity_id" uuid not null,
                "poms_user_id" uuid not null,
                "provider" varchar(32) not null default 'feishu',
                "tenant_id" varchar(128) null,
                "subject_id" varchar(255) not null,
                "status" varchar(32) not null default 'issued',
                "expires_at" timestamptz not null,
                "consumed_at" timestamptz null,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                constraint "external_login_ticket_pkey" primary key ("id")
            );
        `);

        this.addSql(`alter table "poms"."external_login_ticket" add constraint "external_login_ticket_ticket_hash_unique" unique ("ticket_hash");`);
        this.addSql(
            `alter table "poms"."external_login_ticket" add constraint "external_login_ticket_provider_config_id_foreign" foreign key ("identity_provider_config_id") references "poms"."identity_provider_config" ("id") on update cascade on delete restrict;`
        );
        this.addSql(
            `alter table "poms"."external_login_ticket" add constraint "external_login_ticket_external_identity_id_foreign" foreign key ("external_identity_id") references "poms"."external_identity" ("id") on update cascade on delete restrict;`
        );
        this.addSql(`alter table "poms"."external_login_ticket" add constraint "external_login_ticket_poms_user_id_foreign" foreign key ("poms_user_id") references "poms"."platform_user" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."external_login_ticket" add constraint "chk_external_login_ticket_provider" check ("provider" in ('feishu'));`);
        this.addSql(`alter table "poms"."external_login_ticket" add constraint "chk_external_login_ticket_status" check ("status" in ('issued', 'consumed', 'expired'));`);
        this.addSql(`create index "idx_external_login_ticket_hash" on "poms"."external_login_ticket" ("ticket_hash");`);
        this.addSql(`create index "idx_external_login_ticket_user_status" on "poms"."external_login_ticket" ("poms_user_id", "status");`);

        this.addSql(`comment on table "poms"."external_login_ticket" is '外部登录 callback 后用于交换 POMS JWT 的短时一次性票据';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."id" is '外部登录票据主键';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."ticket_hash" is '一次性票据 SHA-256 摘要';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."identity_provider_config_id" is '外部身份提供商配置标识';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."external_identity_id" is '匹配到的外部身份绑定标识';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."poms_user_id" is '即将登录的 POMS 用户标识';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."provider" is '外部身份提供商代码';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."tenant_id" is '外部租户标识';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."subject_id" is '外部用户主体标识';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."status" is '票据状态';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."expires_at" is '票据过期时间';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."consumed_at" is '票据消费时间';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."external_login_ticket"."updated_at" is '最后更新时间';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."external_login_ticket" cascade;`);
    }
}
