import { Migration } from '@mikro-orm/migrations';

export class Migration20260529120000_ex70a_lead_source_dictionary_direct_cutover extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."dictionary_item" drop constraint if exists "chk_dictionary_item_domain";`);
        this.addSql(`alter table "poms"."dictionary_item" add constraint "chk_dictionary_item_domain" check ("domain" in ('attachment-category', 'sales-follow-up-type', 'expense-category', 'lead-source'));`);

        this.addSql(`
            insert into "poms"."dictionary_item" ("domain", "code", "name", "description", "status", "sort_order", "is_system", "created_at", "created_by", "updated_at", "updated_by")
            select
                'lead-source',
                "code",
                "name",
                "description",
                "status",
                "sort_order",
                true,
                "created_at",
                "created_by",
                "updated_at",
                "updated_by"
            from "poms"."lead_source"
            on conflict ("domain", "code") do update set
                "name" = excluded."name",
                "description" = excluded."description",
                "status" = excluded."status",
                "sort_order" = excluded."sort_order",
                "is_system" = excluded."is_system",
                "updated_at" = excluded."updated_at",
                "updated_by" = excluded."updated_by";
        `);

        this.seedDefaultLeadSources();

        this.addSql(`alter table "poms"."lead" add column "source_code" varchar(64) null;`);
        this.addSql(`
            update "poms"."lead" lead
            set "source_code" = coalesce(
                (
                    select source."code"
                    from "poms"."lead_source" source
                    where source."id" = lead."source_id"
                ),
                (
                    select item."code"
                    from "poms"."dictionary_item" item
                    where item."domain" = 'lead-source'
                      and lower(item."name") = lower(btrim(coalesce(lead."source_channel", '')))
                    order by item."sort_order" asc, item."code" asc
                    limit 1
                ),
                'other'
            );
        `);
        this.addSql(`alter table "poms"."lead" alter column "source_code" set not null;`);
        this.addSql(`comment on column "poms"."lead"."source_code" is '线索来源字典编码';`);
        this.addSql(`create index "idx_lead_source_code" on "poms"."lead" ("source_code");`);

        this.addSql(`drop index if exists "poms"."idx_lead_source_id";`);
        this.addSql(`alter table "poms"."lead" drop constraint if exists "lead_source_id_foreign";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "source_id";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "source_channel";`);
        this.addSql(`drop table if exists "poms"."lead_source" cascade;`);

        this.addSql(`delete from "poms"."role_permission_assignment" where "permission_key" = 'lead:source:manage';`);
    }

    override async down(): Promise<void> {
        this.addSql(`
            create table "poms"."lead_source" (
                "id" uuid not null default gen_random_uuid(),
                "code" varchar(64) not null,
                "name" varchar(128) not null,
                "description" text null,
                "status" varchar(32) not null default 'active',
                "sort_order" int not null default 0,
                "row_version" int not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "lead_source_pkey" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."lead_source" add constraint "lead_source_code_unique" unique ("code");`);
        this.addSql(`alter table "poms"."lead_source" add constraint "chk_lead_source_status" check ("status" in ('active', 'inactive'));`);
        this.addSql(`create index "idx_lead_source_status_sort" on "poms"."lead_source" ("status", "sort_order");`);

        this.addSql(`
            insert into "poms"."lead_source" ("code", "name", "description", "status", "sort_order", "created_at", "created_by", "updated_at", "updated_by")
            select "code", "name", "description", "status", "sort_order", "created_at", "created_by", "updated_at", "updated_by"
            from "poms"."dictionary_item"
            where "domain" = 'lead-source'
            order by "sort_order" asc, "code" asc;
        `);

        this.addSql(`alter table "poms"."lead" add column "source_id" uuid null;`);
        this.addSql(`alter table "poms"."lead" add column "source_channel" varchar(64) null;`);
        this.addSql(`
            update "poms"."lead" lead
            set
                "source_id" = source."id",
                "source_channel" = source."name"
            from "poms"."lead_source" source
            where source."code" = lead."source_code";
        `);
        this.addSql(`alter table "poms"."lead" alter column "source_id" set not null;`);
        this.addSql(`alter table "poms"."lead" add constraint "lead_source_id_foreign" foreign key ("source_id") references "poms"."lead_source" ("id") on update cascade on delete restrict;`);
        this.addSql(`comment on column "poms"."lead"."source_id" is '线索来源主数据标识';`);
        this.addSql(`comment on column "poms"."lead"."source_channel" is '线索来源名称快照';`);
        this.addSql(`create index "idx_lead_source_id" on "poms"."lead" ("source_id");`);

        this.addSql(`drop index if exists "poms"."idx_lead_source_code";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "source_code";`);
        this.addSql(`delete from "poms"."dictionary_item" where "domain" = 'lead-source';`);

        this.addSql(`alter table "poms"."dictionary_item" drop constraint if exists "chk_dictionary_item_domain";`);
        this.addSql(`alter table "poms"."dictionary_item" add constraint "chk_dictionary_item_domain" check ("domain" in ('attachment-category', 'sales-follow-up-type', 'expense-category'));`);
    }

    private seedDefaultLeadSources(): void {
        this.addSql(`
            insert into "poms"."dictionary_item" ("domain", "code", "name", "description", "sort_order", "is_system")
            values
                ('lead-source', 'customer-visit', '客户拜访', '客户现场或线上拜访产生的线索', 10, true),
                ('lead-source', 'customer-referral', '客户转介绍', '既有客户、伙伴或联系人转介绍', 20, true),
                ('lead-source', 'website-inquiry', '官网咨询', '官网、表单或公开入口咨询', 30, true),
                ('lead-source', 'event', '市场活动', '展会、会议或市场活动产生的线索', 40, true),
                ('lead-source', 'partner', '合作伙伴', '渠道或生态伙伴提供的线索', 50, true),
                ('lead-source', 'bid-notice', '招标公告', '招标公告、采购公告或公开商机', 60, true),
                ('lead-source', 'existing-customer-expansion', '老客户增购', '既有客户扩展、复购或增购机会', 70, true),
                ('lead-source', 'other', '其他', '无法归入其他来源的线索', 900, true)
            on conflict ("domain", "code") do nothing;
        `);
    }
}
