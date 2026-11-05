import { Migration } from '@mikro-orm/migrations';

export class Migration20260526100000_ex67a_system_setting extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."system_setting" (
                "key" varchar(128) not null,
                "value_type" varchar(32) not null,
                "value_json" jsonb not null,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "system_setting_pkey" primary key ("key")
            );
        `);
        this.addSql(`alter table "poms"."system_setting" add constraint "chk_system_setting_value_type" check ("value_type" in ('integer'));`);
        this.addSql(`comment on table "poms"."system_setting" is '平台通用系统设置';`);
        this.addSql(`comment on column "poms"."system_setting"."key" is '系统设置 key';`);
        this.addSql(`comment on column "poms"."system_setting"."value_type" is '设置值类型';`);
        this.addSql(`comment on column "poms"."system_setting"."value_json" is '设置值 JSON 表示';`);
        this.addSql(`comment on column "poms"."system_setting"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."system_setting"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."system_setting"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."system_setting"."updated_by" is '最后更新人';`);

        this.addSql(`
            insert into "poms"."system_setting" ("key", "value_type", "value_json")
            values ('attachment.max-upload-size-mb', 'integer', '50'::jsonb)
            on conflict do nothing;
        `);

        this.addSql(`alter table "poms"."attachment_upload_session" add column "max_size_bytes" int null;`);
        this.addSql(`update "poms"."attachment_upload_session" set "max_size_bytes" = greatest("size_bytes", 52428800) where "max_size_bytes" is null;`);
        this.addSql(`alter table "poms"."attachment_upload_session" alter column "max_size_bytes" set not null;`);
        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "chk_attachment_upload_session_max_size_bytes" check ("max_size_bytes" > 0);`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."max_size_bytes" is '创建上传会话时冻结的最大上传大小，单位字节';`);

        this.addSystemSettingManagePermissionToPlatformAdmin();
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."attachment_upload_session" drop constraint if exists "chk_attachment_upload_session_max_size_bytes";`);
        this.addSql(`alter table "poms"."attachment_upload_session" drop column if exists "max_size_bytes";`);
        this.addSql(`delete from "poms"."role_permission_assignment" where "permission_key" = 'platform:system-settings:manage';`);
        this.addSql(`drop table if exists "poms"."system_setting" cascade;`);
    }

    private addSystemSettingManagePermissionToPlatformAdmin(): void {
        this.addSql(`
            insert into "poms"."role_permission_assignment" ("role_id", "permission_key")
            select "id", 'platform:system-settings:manage'
            from "poms"."role"
            where "role_key" = 'platform-admin'
            on conflict do nothing;
        `);
    }
}
