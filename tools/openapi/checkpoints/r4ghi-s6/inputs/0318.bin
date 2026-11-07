import { Migration } from '@mikro-orm/migrations';

export class Migration20260426113000_ex35a_business_number_generation extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."business_number_sequence" (
                "id" uuid not null default gen_random_uuid(),
                "scope" varchar(64) not null,
                "period" varchar(16) not null,
                "next_value" integer not null default 1,
                "prefix" varchar(32) not null,
                "padding" integer not null default 6,
                "description" varchar(255) null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                constraint "business_number_sequence_pkey" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."business_number_sequence" is 'POMS 业务编号序列表';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."id" is '主键';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."scope" is '编号范围';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."period" is '编号周期';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."next_value" is '下一个可用序号';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."prefix" is '编号前缀';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."padding" is '序号补零宽度';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."description" is '说明';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."business_number_sequence"."updated_at" is '最后更新时间';`);
        this.addSql(`alter table "poms"."business_number_sequence" add constraint "uq_business_number_sequence_scope_period" unique ("scope", "period");`);

        this.addSql(`alter table "poms"."lead" rename column "lead_code" to "lead_no";`);
        this.addSql(`alter table "poms"."lead" rename constraint "lead_lead_code_unique" to "lead_lead_no_unique";`);
        this.addSql(`comment on column "poms"."lead"."lead_no" is '线索编号';`);

        this.addSql(`alter table "poms"."project" rename column "project_code" to "project_no";`);
        this.addSql(`alter table "poms"."project" rename constraint "project_project_code_unique" to "project_project_no_unique";`);
        this.addSql(`alter table "poms"."project" add column "customer_project_no" varchar(128) null;`);
        this.addSql(`comment on column "poms"."project"."project_no" is '项目编号';`);
        this.addSql(`comment on column "poms"."project"."customer_project_no" is '客户项目编号';`);

        this.addSql(`alter table "poms"."contract" add column "customer_contract_no" varchar(128) null;`);
        this.addSql(`comment on column "poms"."contract"."contract_no" is '合同编号';`);
        this.addSql(`comment on column "poms"."contract"."customer_contract_no" is '客户合同编号';`);

        this.addSql(`alter table "poms"."project_bid_commercial_process" add column "tender_no" varchar(128) null, add column "bid_package_no" varchar(128) null;`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."tender_no" is '招标编号';`);
        this.addSql(`comment on column "poms"."project_bid_commercial_process"."bid_package_no" is '标段/包件编号';`);

        this.addSql(`
            with numbered as (
                select
                    id,
                    case
                        when cost_type = 'PAYMENT_FACT' then 'AC-PAY'
                        when cost_type = 'INVOICE' then 'AC-INV'
                        when cost_type = 'EXPENSE' then 'AC-EXP'
                        when cost_type = 'PROCUREMENT' then 'AC-PRC'
                        when cost_type = 'LABOR' then 'AC-LBR'
                        else 'AC-CST'
                    end as prefix,
                    extract(year from coalesce(created_at, now()))::text as period,
                    row_number() over (
                        partition by cost_type, extract(year from coalesce(created_at, now()))
                        order by coalesce(created_at, now()), id
                    ) as rn
                from "poms"."project_actual_cost_record"
            )
            update "poms"."project_actual_cost_record" record
            set "record_no" = numbered.prefix || '-' || numbered.period || '-' || lpad(numbered.rn::text, 6, '0')
            from numbered
            where record.id = numbered.id;
        `);
        this.addSql(`alter table "poms"."project_actual_cost_record" alter column "record_no" set not null;`);
        this.addSql(`alter table "poms"."project_actual_cost_record" add constraint "project_actual_cost_record_record_no_unique" unique ("record_no");`);

        this.addSql(`
            insert into "poms"."business_number_sequence" ("scope", "period", "next_value", "prefix", "padding", "description")
            select scope, period, max(rn)::int + 1, prefix, 6, description
            from (
                select 'lead' as scope, extract(year from coalesce(created_at, now()))::text as period, 'LD' as prefix, '线索编号' as description,
                    row_number() over (partition by extract(year from coalesce(created_at, now())) order by coalesce(created_at, now()), id) as rn
                from "poms"."lead"
                union all
                select 'project', extract(year from coalesce(created_at, now()))::text, 'PRJ', '项目编号',
                    row_number() over (partition by extract(year from coalesce(created_at, now())) order by coalesce(created_at, now()), id)
                from "poms"."project"
                union all
                select 'contract', extract(year from coalesce(created_at, now()))::text, 'CT', '合同编号',
                    row_number() over (partition by extract(year from coalesce(created_at, now())) order by coalesce(created_at, now()), id)
                from "poms"."contract"
                union all
                select
                    case
                        when cost_type = 'PAYMENT_FACT' then 'cost-payment-fact'
                        when cost_type = 'INVOICE' then 'cost-invoice'
                        when cost_type = 'EXPENSE' then 'cost-expense'
                        when cost_type = 'PROCUREMENT' then 'cost-procurement'
                        when cost_type = 'LABOR' then 'cost-labor'
                        else 'cost-unknown'
                    end,
                    extract(year from coalesce(created_at, now()))::text,
                    case
                        when cost_type = 'PAYMENT_FACT' then 'AC-PAY'
                        when cost_type = 'INVOICE' then 'AC-INV'
                        when cost_type = 'EXPENSE' then 'AC-EXP'
                        when cost_type = 'PROCUREMENT' then 'AC-PRC'
                        when cost_type = 'LABOR' then 'AC-LBR'
                        else 'AC-CST'
                    end,
                    '实际成本编号',
                    row_number() over (partition by cost_type, extract(year from coalesce(created_at, now())) order by coalesce(created_at, now()), id)
                from "poms"."project_actual_cost_record"
            ) seeded
            where scope <> 'cost-unknown'
            group by scope, period, prefix, description
            on conflict ("scope", "period") do update set "next_value" = excluded."next_value";
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."project_actual_cost_record" drop constraint if exists "project_actual_cost_record_record_no_unique";`);
        this.addSql(`alter table "poms"."project_actual_cost_record" alter column "record_no" drop not null;`);
        this.addSql(`alter table "poms"."project_bid_commercial_process" drop column if exists "tender_no", drop column if exists "bid_package_no";`);
        this.addSql(`alter table "poms"."contract" drop column if exists "customer_contract_no";`);
        this.addSql(`alter table "poms"."project" drop column if exists "customer_project_no";`);
        this.addSql(`alter table "poms"."project" rename constraint "project_project_no_unique" to "project_project_code_unique";`);
        this.addSql(`alter table "poms"."project" rename column "project_no" to "project_code";`);
        this.addSql(`alter table "poms"."lead" rename constraint "lead_lead_no_unique" to "lead_lead_code_unique";`);
        this.addSql(`alter table "poms"."lead" rename column "lead_no" to "lead_code";`);
        this.addSql(`drop table if exists "poms"."business_number_sequence" cascade;`);
    }
}
