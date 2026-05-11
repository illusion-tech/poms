import { Migration } from '@mikro-orm/migrations';

export class Migration20260511160000_ex65d_attachment_upload_session extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."attachment_upload_session" (
                "id" uuid not null default gen_random_uuid(),
                "operation_type" varchar(32) not null,
                "status" varchar(32) not null,
                "upload_mode" varchar(32) not null,
                "provider_type" varchar(32) not null,
                "storage_bucket" varchar(255) null,
                "storage_key" varchar(1024) not null,
                "target_type" varchar(64) null,
                "target_id" uuid null,
                "base_attachment_id" uuid null,
                "completed_attachment_id" uuid null,
                "original_name" varchar(255) not null,
                "display_name" varchar(255) not null,
                "extension" varchar(32) not null,
                "mime_type" varchar(255) not null,
                "size_bytes" int not null,
                "checksum_sha256" varchar(64) null,
                "category" varchar(64) null,
                "security_level" varchar(32) null,
                "relation_type" varchar(32) null,
                "description" text null,
                "change_note" text null,
                "expires_at" timestamptz not null,
                "uploaded_at" timestamptz null,
                "completed_at" timestamptz null,
                "aborted_at" timestamptz null,
                "failed_reason" text null,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                constraint "attachment_upload_session_pkey" primary key ("id")
            );
        `);

        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "attachment_upload_session_base_attachment_id_foreign" foreign key ("base_attachment_id") references "poms"."attachment" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "attachment_upload_session_completed_attachment_id_foreign" foreign key ("completed_attachment_id") references "poms"."attachment" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "chk_attachment_upload_session_operation_type" check ("operation_type" in ('create-attachment', 'create-version'));`);
        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "chk_attachment_upload_session_status" check ("status" in ('pending', 'uploading', 'uploaded', 'validating', 'completed', 'failed', 'expired', 'aborted'));`);
        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "chk_attachment_upload_session_upload_mode" check ("upload_mode" in ('proxy', 'presigned-put', 'multipart'));`);
        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "chk_attachment_upload_session_provider_type" check ("provider_type" in ('local', 'huawei-obs-s3'));`);
        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "chk_attachment_upload_session_target_type" check ("target_type" is null or "target_type" in ('lead', 'customer', 'project', 'contract', 'sales-follow-up', 'project-handover'));`);
        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "chk_attachment_upload_session_security_level" check ("security_level" is null or "security_level" in ('normal', 'internal', 'sensitive', 'confidential', 'restricted'));`);
        this.addSql(`alter table "poms"."attachment_upload_session" add constraint "chk_attachment_upload_session_relation_type" check ("relation_type" is null or "relation_type" in ('normal', 'source', 'evidence', 'final', 'handover'));`);

        this.addSql(`create index "idx_attachment_upload_session_status_expires" on "poms"."attachment_upload_session" ("status", "expires_at");`);
        this.addSql(`create index "idx_attachment_upload_session_created_by" on "poms"."attachment_upload_session" ("created_by", "created_at");`);
        this.addSql(`create index "idx_attachment_upload_session_target" on "poms"."attachment_upload_session" ("target_type", "target_id", "status");`);
        this.addSql(`create index "idx_attachment_upload_session_base_attachment" on "poms"."attachment_upload_session" ("base_attachment_id");`);
        this.addSql(`create index "idx_attachment_upload_session_completed_attachment" on "poms"."attachment_upload_session" ("completed_attachment_id");`);

        this.addSql(`comment on table "poms"."attachment_upload_session" is '附件上传会话';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."id" is '上传会话主键';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."operation_type" is '上传意图';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."status" is '上传会话状态';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."upload_mode" is '上传方式';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."provider_type" is '冻结的存储 provider';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."storage_bucket" is '冻结的存储桶';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."storage_key" is '冻结的对象 key';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."target_type" is '业务对象类型';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."target_id" is '业务对象标识';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."base_attachment_id" is '新版本上传的基准附件';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."completed_attachment_id" is '完成后创建的附件版本';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."original_name" is '原始文件名';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."display_name" is '展示名称';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."extension" is '文件扩展名';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."mime_type" is 'MIME 类型';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."size_bytes" is '声明文件大小，单位字节';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."checksum_sha256" is '客户端声明的 sha256 校验和';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."category" is '附件业务分类';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."security_level" is '附件安全等级';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."relation_type" is '附件关联类型';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."description" is '附件说明';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."change_note" is '版本变更说明';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."expires_at" is '会话过期时间';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."uploaded_at" is '对象上传完成时间';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."completed_at" is '会话完成时间';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."aborted_at" is '会话中止时间';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."failed_reason" is '失败或中止原因';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."attachment_upload_session"."updated_at" is '最后更新时间';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."attachment_upload_session" cascade;`);
    }
}
