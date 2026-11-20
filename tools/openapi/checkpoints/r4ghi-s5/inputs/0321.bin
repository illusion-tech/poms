import { Migration } from '@mikro-orm/migrations';

export class Migration20260430140000_ex45_attachment_evidence_repository extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."attachment" (
                "id" uuid not null default gen_random_uuid(),
                "original_name" varchar(255) not null,
                "display_name" varchar(255) not null,
                "extension" varchar(32) not null,
                "mime_type" varchar(255) not null,
                "size_bytes" integer not null,
                "checksum_sha256" varchar(64) not null,
                "category" varchar(64) not null,
                "security_level" varchar(32) not null,
                "storage_provider" varchar(32) not null,
                "storage_bucket" varchar(255) null,
                "storage_key" varchar(1024) not null,
                "status" varchar(32) not null,
                "description" text null,
                "version_group_id" uuid null,
                "version_no" integer not null default 1,
                "is_latest" boolean not null default true,
                "is_final" boolean not null default false,
                "previous_attachment_id" uuid null,
                "change_note" text null,
                "uploaded_by" uuid null,
                "uploaded_at" timestamptz not null default now(),
                "deleted_by" uuid null,
                "deleted_at" timestamptz null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                constraint "attachment_pkey" primary key ("id")
            );
        `);

        this.addSql(`alter table "poms"."attachment" add constraint "chk_attachment_category" check ("category" in ('customer_profile', 'demand', 'communication', 'technical', 'solution', 'quotation', 'bid', 'contract', 'delivery', 'acceptance', 'finance', 'internal_assessment', 'other'));`);
        this.addSql(`alter table "poms"."attachment" add constraint "chk_attachment_security_level" check ("security_level" in ('normal', 'internal', 'sensitive', 'confidential', 'restricted'));`);
        this.addSql(`alter table "poms"."attachment" add constraint "chk_attachment_status" check ("status" in ('active', 'voided', 'deleted', 'failed'));`);
        this.addSql(`create index "idx_attachment_uploaded_at" on "poms"."attachment" ("uploaded_at");`);
        this.addSql(`create index "idx_attachment_uploaded_by" on "poms"."attachment" ("uploaded_by");`);
        this.addSql(`create index "idx_attachment_category_status" on "poms"."attachment" ("category", "status");`);
        this.addSql(`create index "idx_attachment_checksum_sha256" on "poms"."attachment" ("checksum_sha256");`);

        this.addSql(`
            create table "poms"."attachment_link" (
                "id" uuid not null default gen_random_uuid(),
                "attachment_id" uuid not null,
                "target_type" varchar(64) not null,
                "target_id" uuid not null,
                "relation_type" varchar(32) not null,
                "status" varchar(32) not null,
                "linked_by" uuid null,
                "linked_at" timestamptz not null default now(),
                "unlinked_by" uuid null,
                "unlinked_at" timestamptz null,
                constraint "attachment_link_pkey" primary key ("id")
            );
        `);

        this.addSql(`alter table "poms"."attachment_link" add constraint "attachment_link_attachment_id_foreign" foreign key ("attachment_id") references "poms"."attachment" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."attachment_link" add constraint "chk_attachment_link_target_type" check ("target_type" in ('lead', 'customer', 'project', 'contract', 'sales_follow_up'));`);
        this.addSql(`alter table "poms"."attachment_link" add constraint "chk_attachment_link_relation_type" check ("relation_type" in ('normal', 'source', 'evidence', 'final', 'handover'));`);
        this.addSql(`alter table "poms"."attachment_link" add constraint "chk_attachment_link_status" check ("status" in ('active', 'unlinked'));`);
        this.addSql(`create index "idx_attachment_link_target" on "poms"."attachment_link" ("target_type", "target_id", "status", "linked_at" desc);`);
        this.addSql(`create index "idx_attachment_link_attachment_status" on "poms"."attachment_link" ("attachment_id", "status");`);
        this.addSql(`create unique index "uq_attachment_link_active_relation" on "poms"."attachment_link" ("attachment_id", "target_type", "target_id", "relation_type") where "status" = 'active';`);

        this.addSql(`comment on table "poms"."attachment" is '统一附件元数据';`);
        this.addSql(`comment on table "poms"."attachment_link" is '附件与业务对象挂载关系';`);
        this.addSql(`comment on column "poms"."attachment"."id" is '附件主键';`);
        this.addSql(`comment on column "poms"."attachment"."original_name" is '原始文件名';`);
        this.addSql(`comment on column "poms"."attachment"."display_name" is '展示名称';`);
        this.addSql(`comment on column "poms"."attachment"."extension" is '文件扩展名';`);
        this.addSql(`comment on column "poms"."attachment"."mime_type" is 'MIME 类型';`);
        this.addSql(`comment on column "poms"."attachment"."size_bytes" is '文件大小，单位字节';`);
        this.addSql(`comment on column "poms"."attachment"."checksum_sha256" is '文件 sha256 校验和';`);
        this.addSql(`comment on column "poms"."attachment"."category" is '附件业务分类';`);
        this.addSql(`comment on column "poms"."attachment"."security_level" is '附件安全等级';`);
        this.addSql(`comment on column "poms"."attachment"."storage_provider" is '存储 provider';`);
        this.addSql(`comment on column "poms"."attachment"."storage_bucket" is '存储桶';`);
        this.addSql(`comment on column "poms"."attachment"."storage_key" is '对象存储 key';`);
        this.addSql(`comment on column "poms"."attachment"."status" is '附件状态';`);
        this.addSql(`comment on column "poms"."attachment"."description" is '附件说明';`);
        this.addSql(`comment on column "poms"."attachment"."version_group_id" is '版本组标识，一期预留';`);
        this.addSql(`comment on column "poms"."attachment"."version_no" is '版本号，一期默认 1';`);
        this.addSql(`comment on column "poms"."attachment"."is_latest" is '是否最新版本，一期默认 true';`);
        this.addSql(`comment on column "poms"."attachment"."is_final" is '是否最终版，一期默认 false';`);
        this.addSql(`comment on column "poms"."attachment"."previous_attachment_id" is '上一版本附件，一期预留';`);
        this.addSql(`comment on column "poms"."attachment"."change_note" is '版本变更说明，一期预留';`);
        this.addSql(`comment on column "poms"."attachment"."uploaded_by" is '上传人标识';`);
        this.addSql(`comment on column "poms"."attachment"."uploaded_at" is '上传时间';`);
        this.addSql(`comment on column "poms"."attachment"."deleted_by" is '删除/作废操作人标识';`);
        this.addSql(`comment on column "poms"."attachment"."deleted_at" is '删除/作废时间';`);
        this.addSql(`comment on column "poms"."attachment"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."attachment"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."attachment"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."attachment_link"."id" is '附件关联主键';`);
        this.addSql(`comment on column "poms"."attachment_link"."attachment_id" is '附件标识';`);
        this.addSql(`comment on column "poms"."attachment_link"."target_type" is '业务对象类型';`);
        this.addSql(`comment on column "poms"."attachment_link"."target_id" is '业务对象标识';`);
        this.addSql(`comment on column "poms"."attachment_link"."relation_type" is '关联关系类型';`);
        this.addSql(`comment on column "poms"."attachment_link"."status" is '关联状态';`);
        this.addSql(`comment on column "poms"."attachment_link"."linked_by" is '关联操作人标识';`);
        this.addSql(`comment on column "poms"."attachment_link"."linked_at" is '关联时间';`);
        this.addSql(`comment on column "poms"."attachment_link"."unlinked_by" is '取消关联操作人标识';`);
        this.addSql(`comment on column "poms"."attachment_link"."unlinked_at" is '取消关联时间';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."attachment_link" cascade;`);
        this.addSql(`drop table if exists "poms"."attachment" cascade;`);
    }
}
