import { Migration } from '@mikro-orm/migrations';

export class Migration20260505113000_ex52a_attachment_handover_runtime extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."attachment_link" drop constraint if exists "chk_attachment_link_target_type";`);
        this.addSql(`alter table "poms"."attachment_link" add constraint "chk_attachment_link_target_type" check ("target_type" in ('lead', 'customer', 'project', 'contract', 'sales-follow-up', 'project-handover'));`);

        this.addSql(`
            create table "poms"."project_handover_attachment_selection" (
                "id" uuid not null default gen_random_uuid(),
                "handover_id" uuid not null,
                "project_id" uuid not null,
                "attachment_id" uuid null,
                "version_group_id" uuid null,
                "display_name" varchar(255) not null,
                "category" varchar(64) null,
                "security_level" varchar(32) null,
                "status" varchar(32) not null,
                "selection_reason" varchar(64) null,
                "exclusion_reason" text null,
                "source_refs" jsonb not null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                "row_version" int not null default 1,
                constraint "pk_project_handover_attachment_selection" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."project_handover_attachment_selection" add constraint "project_handover_attachment_selection_handover_id_foreign" foreign key ("handover_id") references "poms"."project_handover" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."project_handover_attachment_selection" add constraint "project_handover_attachment_selection_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."project_handover_attachment_selection" add constraint "project_handover_attachment_selection_attachment_id_foreign" foreign key ("attachment_id") references "poms"."attachment" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."project_handover_attachment_selection" add constraint "chk_phas_status" check ("status" in ('included', 'missing', 'excluded', 'sensitive-excluded', 'stale-version'));`);
        this.addSql(`create index "idx_phas_handover_status" on "poms"."project_handover_attachment_selection" ("handover_id", "status");`);
        this.addSql(`create index "idx_phas_project_handover" on "poms"."project_handover_attachment_selection" ("project_id", "handover_id");`);
        this.addSql(`create index "idx_phas_attachment" on "poms"."project_handover_attachment_selection" ("attachment_id");`);
        this.addSql(`create unique index "uq_phas_handover_version_group" on "poms"."project_handover_attachment_selection" ("handover_id", "version_group_id") where "version_group_id" is not null;`);

        this.addSql(`
            create table "poms"."attachment_download_package" (
                "id" uuid not null default gen_random_uuid(),
                "handover_id" uuid not null,
                "project_id" uuid not null,
                "status" varchar(32) not null default 'pending',
                "manifest_summary" jsonb not null,
                "storage_provider" varchar(32) null,
                "storage_bucket" varchar(255) null,
                "storage_key" varchar(1024) null,
                "file_name" varchar(255) null,
                "expires_at" timestamptz not null,
                "created_by" uuid null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "downloaded_at" timestamptz null,
                "download_count" int not null default 0,
                "failed_reason" text null,
                "row_version" int not null default 1,
                constraint "pk_attachment_download_package" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."attachment_download_package" add constraint "attachment_download_package_handover_id_foreign" foreign key ("handover_id") references "poms"."project_handover" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."attachment_download_package" add constraint "attachment_download_package_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."attachment_download_package" add constraint "chk_adp_status" check ("status" in ('pending', 'running', 'ready', 'failed', 'expired', 'cancelled'));`);
        this.addSql(`create index "idx_adp_handover_status" on "poms"."attachment_download_package" ("handover_id", "status");`);
        this.addSql(`create index "idx_adp_project_created" on "poms"."attachment_download_package" ("project_id", "created_at");`);
        this.addSql(`create index "idx_adp_expires_at" on "poms"."attachment_download_package" ("expires_at");`);

        this.addSql(`
            create table "poms"."attachment_download_package_item" (
                "id" uuid not null default gen_random_uuid(),
                "package_id" uuid not null,
                "handover_id" uuid not null,
                "attachment_id" uuid null,
                "version_group_id" uuid null,
                "status" varchar(32) not null,
                "source_refs" jsonb not null,
                "file_name" varchar(255) null,
                "exclusion_reason" text null,
                "created_at" timestamptz not null default now(),
                constraint "pk_attachment_download_package_item" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."attachment_download_package_item" add constraint "attachment_download_package_item_package_id_foreign" foreign key ("package_id") references "poms"."attachment_download_package" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."attachment_download_package_item" add constraint "attachment_download_package_item_handover_id_foreign" foreign key ("handover_id") references "poms"."project_handover" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."attachment_download_package_item" add constraint "attachment_download_package_item_attachment_id_foreign" foreign key ("attachment_id") references "poms"."attachment" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."attachment_download_package_item" add constraint "chk_adpi_status" check ("status" in ('included', 'excluded'));`);
        this.addSql(`create index "idx_adpi_package" on "poms"."attachment_download_package_item" ("package_id");`);
        this.addSql(`create index "idx_adpi_handover_attachment" on "poms"."attachment_download_package_item" ("handover_id", "attachment_id");`);

        this.addSql(`comment on table "poms"."project_handover_attachment_selection" is '项目移交附件清单选择项';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."id" is '清单选择项主键';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."handover_id" is '项目移交记录 ID';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."attachment_id" is '选中的附件版本 ID';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."version_group_id" is '附件版本组 ID';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."display_name" is '清单展示名';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."category" is '附件分类';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."security_level" is '附件安全等级';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."status" is '清单状态';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."selection_reason" is '版本选择原因';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."exclusion_reason" is '排除原因';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."source_refs" is '来源引用';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."project_handover_attachment_selection"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on table "poms"."attachment_download_package" is '附件批量下载包';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."id" is '下载包主键';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."handover_id" is '项目移交记录 ID';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."status" is '下载包状态';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."manifest_summary" is 'manifest 摘要';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."storage_provider" is '存储 provider';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."storage_bucket" is '存储桶';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."storage_key" is '内部存储 key';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."file_name" is '下载文件名';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."expires_at" is '过期时间';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."downloaded_at" is '最近下载时间';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."download_count" is '下载次数';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."failed_reason" is '失败原因';`);
        this.addSql(`comment on column "poms"."attachment_download_package"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on table "poms"."attachment_download_package_item" is '附件批量下载包明细';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."id" is '下载包明细主键';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."package_id" is '下载包 ID';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."handover_id" is '项目移交记录 ID';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."attachment_id" is '附件版本 ID';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."version_group_id" is '附件版本组 ID';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."status" is '明细状态';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."source_refs" is '来源引用';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."file_name" is '包内文件名';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."exclusion_reason" is '排除原因';`);
        this.addSql(`comment on column "poms"."attachment_download_package_item"."created_at" is '创建时间';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."attachment_download_package_item" cascade;`);
        this.addSql(`drop table if exists "poms"."attachment_download_package" cascade;`);
        this.addSql(`drop table if exists "poms"."project_handover_attachment_selection" cascade;`);
        this.addSql(`alter table "poms"."attachment_link" drop constraint if exists "chk_attachment_link_target_type";`);
        this.addSql(`alter table "poms"."attachment_link" add constraint "chk_attachment_link_target_type" check ("target_type" in ('lead', 'customer', 'project', 'contract', 'sales-follow-up'));`);
    }
}
