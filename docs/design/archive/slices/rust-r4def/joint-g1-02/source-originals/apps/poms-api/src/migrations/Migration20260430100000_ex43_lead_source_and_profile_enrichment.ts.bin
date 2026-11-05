import { Migration } from '@mikro-orm/migrations';

export class Migration20260430100000_ex43_lead_source_and_profile_enrichment extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."lead_source" (
                "id" uuid not null default gen_random_uuid(),
                "code" varchar(64) not null,
                "name" varchar(128) not null,
                "description" text null,
                "status" varchar(32) not null default 'active',
                "sort_order" integer not null default 0,
                "row_version" integer not null default 1,
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
        this.addSql(`comment on table "poms"."lead_source" is '线索来源字典';`);
        this.addSql(`comment on column "poms"."lead_source"."id" is '线索来源主键';`);
        this.addSql(`comment on column "poms"."lead_source"."code" is '线索来源稳定编码';`);
        this.addSql(`comment on column "poms"."lead_source"."name" is '线索来源名称';`);
        this.addSql(`comment on column "poms"."lead_source"."description" is '线索来源说明';`);
        this.addSql(`comment on column "poms"."lead_source"."status" is '线索来源状态';`);
        this.addSql(`comment on column "poms"."lead_source"."sort_order" is '排序号';`);
        this.addSql(`comment on column "poms"."lead_source"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."lead_source"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."lead_source"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."lead_source"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."lead_source"."updated_by" is '最后更新人标识';`);

        this.addSql(`
            insert into "poms"."lead_source" ("id", "code", "name", "description", "sort_order")
            values
                ('51000000-0000-4000-8000-000000000001', 'customer-visit', '客户拜访', '销售主动拜访或客户现场接触产生的线索', 10),
                ('51000000-0000-4000-8000-000000000002', 'customer-referral', '老客户转介绍', '既有客户或联系人转介绍产生的线索', 20),
                ('51000000-0000-4000-8000-000000000003', 'website-inquiry', '官网/线上咨询', '官网、线上表单或线上咨询渠道产生的线索', 30),
                ('51000000-0000-4000-8000-000000000004', 'event', '展会/活动', '展会、沙龙、行业活动或市场活动产生的线索', 40),
                ('51000000-0000-4000-8000-000000000005', 'partner', '合作伙伴', '渠道伙伴、生态伙伴或合作方提供的线索', 50),
                ('51000000-0000-4000-8000-000000000006', 'bid-notice', '招投标公告', '公开招标、采购公告或商机平台发现的线索', 60),
                ('51000000-0000-4000-8000-000000000007', 'existing-customer-expansion', '存量客户增购', '既有客户新增范围、续购或扩容机会', 70),
                ('51000000-0000-4000-8000-000000000008', 'other', '其他', '无法归类到高频来源的线索', 999)
            on conflict ("code") do nothing;
        `);

        this.addSql(`alter table "poms"."lead" add column "source_id" uuid null;`);
        this.addSql(`alter table "poms"."lead" add column "demand_description" text null;`);
        this.addSql(`alter table "poms"."lead" add column "budget_status" varchar(32) not null default 'unknown';`);
        this.addSql(`alter table "poms"."lead" add column "estimated_amount" numeric(18,2) null;`);
        this.addSql(`alter table "poms"."lead" add column "urgency" varchar(32) not null default 'normal';`);
        this.addSql(`alter table "poms"."lead" add column "expected_decision_date" date null;`);

        this.addSql(`comment on table "poms"."lead" is 'POMS 销售线索事实源表';`);
        this.addSql(`comment on column "poms"."lead"."source_id" is '线索来源主数据标识';`);
        this.addSql(`comment on column "poms"."lead"."source_channel" is '线索来源名称快照';`);
        this.addSql(`comment on column "poms"."lead"."demand_description" is '客户需求描述';`);
        this.addSql(`comment on column "poms"."lead"."budget_status" is '预算状态';`);
        this.addSql(`comment on column "poms"."lead"."estimated_amount" is '预计金额';`);
        this.addSql(`comment on column "poms"."lead"."urgency" is '紧迫程度';`);
        this.addSql(`comment on column "poms"."lead"."expected_decision_date" is '预计决策日期';`);

        this.addSql(`
            update "poms"."lead" lead
            set "source_id" = coalesce(
                (
                    select source."id"
                    from "poms"."lead_source" source
                    where lower(source."name") = lower(btrim(coalesce(lead."source_channel", '')))
                    limit 1
                ),
                '51000000-0000-4000-8000-000000000008'
            ),
            "source_channel" = coalesce(nullif(btrim(lead."source_channel"), ''), '其他');
        `);

        this.addSql(`alter table "poms"."lead" alter column "source_id" set not null;`);
        this.addSql(`alter table "poms"."lead" add constraint "lead_source_id_foreign" foreign key ("source_id") references "poms"."lead_source" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."lead" add constraint "chk_lead_budget_status" check ("budget_status" in ('unknown', 'no-budget', 'rough-budget', 'budget-confirmed', 'budget-approved'));`);
        this.addSql(`alter table "poms"."lead" add constraint "chk_lead_urgency" check ("urgency" in ('low', 'normal', 'high', 'critical'));`);
        this.addSql(`alter table "poms"."lead" add constraint "chk_lead_estimated_amount_non_negative" check ("estimated_amount" is null or "estimated_amount" >= 0);`);
        this.addSql(`create index "idx_lead_source_id" on "poms"."lead" ("source_id");`);
        this.addSql(`create index "idx_lead_budget_status" on "poms"."lead" ("budget_status");`);
        this.addSql(`create index "idx_lead_urgency" on "poms"."lead" ("urgency");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."idx_lead_urgency";`);
        this.addSql(`drop index if exists "poms"."idx_lead_budget_status";`);
        this.addSql(`drop index if exists "poms"."idx_lead_source_id";`);
        this.addSql(`alter table "poms"."lead" drop constraint if exists "chk_lead_estimated_amount_non_negative";`);
        this.addSql(`alter table "poms"."lead" drop constraint if exists "chk_lead_urgency";`);
        this.addSql(`alter table "poms"."lead" drop constraint if exists "chk_lead_budget_status";`);
        this.addSql(`alter table "poms"."lead" drop constraint if exists "lead_source_id_foreign";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "expected_decision_date";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "urgency";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "estimated_amount";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "budget_status";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "demand_description";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "source_id";`);
        this.addSql(`comment on table "poms"."lead" is null;`);
        this.addSql(`drop table if exists "poms"."lead_source" cascade;`);
    }
}
