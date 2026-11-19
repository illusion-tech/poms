import { Migration } from '@mikro-orm/migrations';

export class Migration20260513100000_ex66b_auth_session extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."auth_session" (
                "id" uuid not null default gen_random_uuid(),
                "token_hash" varchar(128) not null,
                "csrf_token_hash" varchar(128) null,
                "user_id" uuid not null,
                "status" varchar(32) not null default 'active',
                "idle_expires_at" timestamptz not null,
                "absolute_expires_at" timestamptz not null,
                "last_seen_at" timestamptz not null,
                "revoked_at" timestamptz null,
                "revoked_reason" varchar(64) null,
                "created_ip" varchar(128) null,
                "last_ip" varchar(128) null,
                "created_user_agent" varchar(512) null,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                constraint "auth_session_pkey" primary key ("id")
            );
        `);

        this.addSql(`alter table "poms"."auth_session" add constraint "auth_session_user_id_foreign" foreign key ("user_id") references "poms"."platform_user" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."auth_session" add constraint "chk_auth_session_status" check ("status" in ('active', 'revoked', 'expired'));`);
        this.addSql(`alter table "poms"."auth_session" add constraint "chk_auth_session_revoked_reason" check (("revoked_reason" is null or ("revoked_reason")::text = any ((array['logout'::character varying, 'admin-revoked'::character varying, 'password-reset'::character varying, 'account-disabled'::character varying, 'session-rotated'::character varying])::text[])));`);

        this.addSql(`create unique index "auth_session_token_hash_unique" on "poms"."auth_session" ("token_hash");`);
        this.addSql(`create index "idx_auth_session_token_hash" on "poms"."auth_session" ("token_hash");`);
        this.addSql(`create index "idx_auth_session_user_status" on "poms"."auth_session" ("user_id", "status");`);
        this.addSql(`create index "idx_auth_session_status_idle_expires" on "poms"."auth_session" ("status", "idle_expires_at");`);
        this.addSql(`create index "idx_auth_session_status_absolute_expires" on "poms"."auth_session" ("status", "absolute_expires_at");`);

        this.addSql(`comment on table "poms"."auth_session" is 'Admin Web 服务端 opaque 认证会话';`);
        this.addSql(`comment on column "poms"."auth_session"."id" is '认证会话主键';`);
        this.addSql(`comment on column "poms"."auth_session"."token_hash" is 'opaque session token SHA-256 摘要';`);
        this.addSql(`comment on column "poms"."auth_session"."csrf_token_hash" is '当前 CSRF token SHA-256 摘要';`);
        this.addSql(`comment on column "poms"."auth_session"."user_id" is '绑定的 POMS 用户标识';`);
        this.addSql(`comment on column "poms"."auth_session"."status" is '会话状态';`);
        this.addSql(`comment on column "poms"."auth_session"."idle_expires_at" is '空闲超时时间';`);
        this.addSql(`comment on column "poms"."auth_session"."absolute_expires_at" is '绝对超时时间';`);
        this.addSql(`comment on column "poms"."auth_session"."last_seen_at" is '最近一次成功认证时间';`);
        this.addSql(`comment on column "poms"."auth_session"."revoked_at" is '撤销时间';`);
        this.addSql(`comment on column "poms"."auth_session"."revoked_reason" is '撤销原因';`);
        this.addSql(`comment on column "poms"."auth_session"."created_ip" is '创建会话时的请求 IP';`);
        this.addSql(`comment on column "poms"."auth_session"."last_ip" is '最近一次成功认证 IP';`);
        this.addSql(`comment on column "poms"."auth_session"."created_user_agent" is '创建会话时的 User-Agent';`);
        this.addSql(`comment on column "poms"."auth_session"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."auth_session"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."auth_session"."updated_at" is '最后更新时间';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."auth_session" cascade;`);
    }
}
