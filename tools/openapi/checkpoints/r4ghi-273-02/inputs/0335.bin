import { Migration } from '@mikro-orm/migrations';

export class Migration20260503170000_ex58c_configurable_dictionary_runtime extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."dictionary_item" (
                "id" uuid not null default gen_random_uuid(),
                "domain" varchar(64) not null,
                "code" varchar(64) not null,
                "name" varchar(128) not null,
                "description" text null,
                "status" varchar(32) not null default 'active',
                "sort_order" int not null default 100,
                "is_system" boolean not null default false,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "dictionary_item_pkey" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."dictionary_item" add constraint "uq_dictionary_item_domain_code" unique ("domain", "code");`);
        this.addSql(`alter table "poms"."dictionary_item" add constraint "chk_dictionary_item_domain" check ("domain" in ('attachment-category', 'sales-follow-up-type', 'expense-category'));`);
        this.addSql(`alter table "poms"."dictionary_item" add constraint "chk_dictionary_item_status" check ("status" in ('active', 'inactive'));`);
        this.addSql(`alter table "poms"."dictionary_item" add constraint "chk_dictionary_item_code_format" check ("code" ~ '^[a-z][a-z0-9-]*$');`);
        this.addSql(`create index "idx_dictionary_item_domain_status_sort" on "poms"."dictionary_item" ("domain", "status", "sort_order");`);
        this.addSql(`create index "idx_dictionary_item_domain_code" on "poms"."dictionary_item" ("domain", "code");`);

        this.addSql(`comment on table "poms"."dictionary_item" is '可运营维护的业务配置字典项';`);
        this.addSql(`comment on column "poms"."dictionary_item"."id" is '字典项主键';`);
        this.addSql(`comment on column "poms"."dictionary_item"."domain" is '字典域';`);
        this.addSql(`comment on column "poms"."dictionary_item"."code" is '稳定业务编码';`);
        this.addSql(`comment on column "poms"."dictionary_item"."name" is '展示名称';`);
        this.addSql(`comment on column "poms"."dictionary_item"."description" is '说明';`);
        this.addSql(`comment on column "poms"."dictionary_item"."status" is '状态：active/inactive';`);
        this.addSql(`comment on column "poms"."dictionary_item"."sort_order" is '排序号';`);
        this.addSql(`comment on column "poms"."dictionary_item"."is_system" is '是否系统初始化字典项';`);
        this.addSql(`comment on column "poms"."dictionary_item"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."dictionary_item"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."dictionary_item"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."dictionary_item"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."dictionary_item"."updated_by" is '最后更新人标识';`);

        this.addSql(`alter table "poms"."attachment" drop constraint if exists "chk_attachment_category";`);
        this.addSql(`alter table "poms"."sales_follow_up_record" drop constraint if exists "chk_sales_follow_up_type";`);
        this.addSql(`alter table "poms"."expense_record" drop constraint if exists "chk_expense_record_expense_category";`);

        this.addSql(`update "poms"."attachment" set "category" = 'customer-profile' where "category" = 'customer_profile';`);
        this.addSql(`update "poms"."attachment" set "category" = 'internal-assessment' where "category" = 'internal_assessment';`);

        this.seedDictionaryItems();
        this.addDictionaryManagePermissionToPlatformAdmin();
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."dictionary_item" cascade;`);
    }

    private seedDictionaryItems(): void {
        this.addSql(`
            insert into "poms"."dictionary_item" ("domain", "code", "name", "description", "sort_order", "is_system")
            values
                ('attachment-category', 'customer-profile', '客户资料', '营业执照、开票资料、客户介绍等长期客户资料', 10, true),
                ('attachment-category', 'demand', '需求资料', '需求文档、流程图、现场图片等需求材料', 20, true),
                ('attachment-category', 'communication', '沟通资料', '会议纪要、聊天截图、邮件记录等沟通材料', 30, true),
                ('attachment-category', 'technical', '技术资料', '接口文档、系统架构、图纸等技术材料', 40, true),
                ('attachment-category', 'solution', '方案资料', '技术方案、实施方案、原型等方案材料', 50, true),
                ('attachment-category', 'quotation', '报价资料', '报价单、成本测算、报价审批等报价材料', 60, true),
                ('attachment-category', 'bid', '招投标资料', '招标文件、投标文件、中标通知等招投标材料', 70, true),
                ('attachment-category', 'contract', '合同资料', '合同草案、盖章合同、补充协议等合同材料', 80, true),
                ('attachment-category', 'delivery', '交付资料', '部署文档、源码包、安装包等交付材料', 90, true),
                ('attachment-category', 'acceptance', '验收资料', '验收单、验收报告等验收材料', 100, true),
                ('attachment-category', 'finance', '财务资料', '发票、回款凭证、付款截图等财务材料', 110, true),
                ('attachment-category', 'internal-assessment', '内部评估', '内部成本、风险、商务判断等内部材料', 120, true),
                ('attachment-category', 'other', '其他资料', '无法归入其他分类的附件', 900, true),
                ('sales-follow-up-type', 'phone', '电话', '电话沟通', 10, true),
                ('sales-follow-up-type', 'meeting', '会议', '线上或线下会议沟通', 20, true),
                ('sales-follow-up-type', 'wechat', '微信', '微信或即时通讯沟通', 30, true),
                ('sales-follow-up-type', 'email', '邮件', '邮件沟通', 40, true),
                ('sales-follow-up-type', 'onsite', '现场拜访', '客户现场拜访', 50, true),
                ('sales-follow-up-type', 'other', '其他', '其他跟进方式', 900, true),
                ('expense-category', 'travel', '差旅', '差旅费用', 10, true),
                ('expense-category', 'onsite-service', '现场服务', '现场服务费用', 20, true),
                ('expense-category', 'deployment-logistics', '部署物流', '部署、运输和物流费用', 30, true),
                ('expense-category', 'temporary-spend', '临时支出', '项目临时性支出', 40, true),
                ('expense-category', 'misc', '其他费用', '无法归入其他分类的费用', 900, true);
        `);
    }

    private addDictionaryManagePermissionToPlatformAdmin(): void {
        this.addSql(`
            insert into "poms"."role_permission_assignment" ("role_id", "permission_key")
            select "id", 'platform:dictionaries:manage'
            from "poms"."role"
            where "role_key" = 'platform-admin'
            on conflict do nothing;
        `);
    }
}
