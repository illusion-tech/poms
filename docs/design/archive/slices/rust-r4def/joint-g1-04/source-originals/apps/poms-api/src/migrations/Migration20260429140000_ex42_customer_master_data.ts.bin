import { Migration } from '@mikro-orm/migrations';

export class Migration20260429140000_ex42_customer_master_data extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."customer" (
                "id" uuid not null default gen_random_uuid(),
                "customer_no" varchar(64) not null,
                "display_name" varchar(255) not null,
                "legal_name" varchar(255) null,
                "short_name" varchar(128) null,
                "status" varchar(32) not null default 'active',
                "owner_org_id" uuid null,
                "owner_user_id" uuid null,
                "source_channel" varchar(64) null,
                "remark" text null,
                "merged_into_customer_id" uuid null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "customer_pkey" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."customer" add constraint "customer_customer_no_unique" unique ("customer_no");`);
        this.addSql(`alter table "poms"."customer" add constraint "chk_customer_status" check ("status" in ('active', 'inactive', 'merged'));`);
        this.addSql(`alter table "poms"."customer" add constraint "customer_owner_org_id_foreign" foreign key ("owner_org_id") references "poms"."org_unit" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."customer" add constraint "customer_owner_user_id_foreign" foreign key ("owner_user_id") references "poms"."platform_user" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."customer" add constraint "customer_merged_into_customer_id_foreign" foreign key ("merged_into_customer_id") references "poms"."customer" ("id") on update cascade on delete restrict;`);
        this.addSql(`create index "idx_customer_status" on "poms"."customer" ("status");`);
        this.addSql(`create index "idx_customer_owner_org_id" on "poms"."customer" ("owner_org_id");`);
        this.addSql(`create index "idx_customer_owner_user_id" on "poms"."customer" ("owner_user_id");`);
        this.addSql(`create index "idx_customer_merged_into_customer_id" on "poms"."customer" ("merged_into_customer_id");`);
        this.addSql(`comment on table "poms"."customer" is '客户主数据表';`);
        this.addSql(`comment on column "poms"."customer"."id" is '客户主键';`);
        this.addSql(`comment on column "poms"."customer"."customer_no" is '客户编号';`);
        this.addSql(`comment on column "poms"."customer"."display_name" is '客户显示名称';`);
        this.addSql(`comment on column "poms"."customer"."legal_name" is '客户法定名称';`);
        this.addSql(`comment on column "poms"."customer"."short_name" is '客户简称';`);
        this.addSql(`comment on column "poms"."customer"."status" is '客户状态';`);
        this.addSql(`comment on column "poms"."customer"."owner_org_id" is '客户主责组织标识';`);
        this.addSql(`comment on column "poms"."customer"."owner_user_id" is '客户主责人标识';`);
        this.addSql(`comment on column "poms"."customer"."source_channel" is '客户来源渠道';`);
        this.addSql(`comment on column "poms"."customer"."remark" is '客户备注';`);
        this.addSql(`comment on column "poms"."customer"."merged_into_customer_id" is '合并后客户标识';`);
        this.addSql(`comment on column "poms"."customer"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."customer"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."customer"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."customer"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."customer"."updated_by" is '最后更新人标识';`);

        this.addSql(`
            create table "poms"."customer_alias" (
                "id" uuid not null default gen_random_uuid(),
                "customer_id" uuid not null,
                "alias_name" varchar(255) not null,
                "alias_type" varchar(32) not null default 'alias',
                "normalized_name" varchar(255) not null,
                "is_primary" boolean not null default false,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                constraint "customer_alias_pkey" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."customer_alias" add constraint "customer_alias_customer_id_foreign" foreign key ("customer_id") references "poms"."customer" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."customer_alias" add constraint "uq_customer_alias_customer_normalized_type" unique ("customer_id", "normalized_name", "alias_type");`);
        this.addSql(`create unique index "uq_customer_alias_primary" on "poms"."customer_alias" ("customer_id") where "is_primary" = true;`);
        this.addSql(`create index "idx_customer_alias_customer_id" on "poms"."customer_alias" ("customer_id");`);
        this.addSql(`create index "idx_customer_alias_normalized_name" on "poms"."customer_alias" ("normalized_name");`);
        this.addSql(`comment on table "poms"."customer_alias" is '客户别名表';`);
        this.addSql(`comment on column "poms"."customer_alias"."id" is '客户别名主键';`);
        this.addSql(`comment on column "poms"."customer_alias"."customer_id" is '客户主数据标识';`);
        this.addSql(`comment on column "poms"."customer_alias"."alias_name" is '客户别名';`);
        this.addSql(`comment on column "poms"."customer_alias"."alias_type" is '别名类型';`);
        this.addSql(`comment on column "poms"."customer_alias"."normalized_name" is '规范化别名';`);
        this.addSql(`comment on column "poms"."customer_alias"."is_primary" is '是否主别名';`);
        this.addSql(`comment on column "poms"."customer_alias"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."customer_alias"."created_by" is '创建人标识';`);

        this.addSql(`alter table "poms"."lead" add column "customer_id" uuid null;`);
        this.addSql(`comment on column "poms"."lead"."customer_id" is '客户主数据标识';`);

        this.addSql(`
            with raw_names as (
                select "customer_name", "created_at" from "poms"."lead"
                union all
                select "customer_name", "created_at" from "poms"."project" where "customer_name" is not null
            ),
            normalized as (
                select
                    coalesce(nullif(regexp_replace(btrim("customer_name"), '[[:space:]]+', ' ', 'g'), ''), '未命名客户') as "display_name",
                    lower(coalesce(nullif(regexp_replace(btrim("customer_name"), '[[:space:]]+', ' ', 'g'), ''), '未命名客户')) as "normalized_name",
                    coalesce("created_at", now()) as "first_seen_at"
                from raw_names
                where "customer_name" is not null
            ),
            grouped as (
                select
                    "normalized_name",
                    (array_agg("display_name" order by "first_seen_at", "display_name"))[1] as "display_name",
                    min("first_seen_at") as "first_seen_at"
                from normalized
                group by "normalized_name"
            ),
            numbered as (
                select
                    "display_name",
                    extract(year from "first_seen_at")::text as "period",
                    row_number() over (
                        partition by extract(year from "first_seen_at")
                        order by "first_seen_at", "normalized_name"
                    ) as "sequence_value",
                    "first_seen_at"
                from grouped
            )
            insert into "poms"."customer" (
                "customer_no",
                "display_name",
                "status",
                "created_at",
                "updated_at"
            )
            select
                'CUST-' || "period" || '-' || lpad("sequence_value"::text, 6, '0'),
                "display_name",
                'active',
                "first_seen_at",
                "first_seen_at"
            from numbered;
        `);

        this.addSql(`
            insert into "poms"."customer_alias" ("customer_id", "alias_name", "alias_type", "normalized_name", "is_primary", "created_at")
            select
                "id",
                "display_name",
                'alias',
                lower(regexp_replace(btrim("display_name"), '[[:space:]]+', ' ', 'g')),
                true,
                "created_at"
            from "poms"."customer";
        `);

        this.addSql(`
            update "poms"."lead" lead
            set "customer_id" = customer."id"
            from "poms"."customer" customer
            where lower(coalesce(nullif(regexp_replace(btrim(lead."customer_name"), '[[:space:]]+', ' ', 'g'), ''), '未命名客户')) =
                lower(regexp_replace(btrim(customer."display_name"), '[[:space:]]+', ' ', 'g'));
        `);
        this.addSql(`alter table "poms"."lead" alter column "customer_id" set not null;`);
        this.addSql(`alter table "poms"."lead" add constraint "lead_customer_id_foreign" foreign key ("customer_id") references "poms"."customer" ("id") on update cascade on delete restrict;`);
        this.addSql(`create index "idx_lead_customer_id" on "poms"."lead" ("customer_id");`);

        this.addSql(`
            update "poms"."project" project
            set "customer_id" = customer."id"
            from "poms"."customer" customer
            where project."customer_name" is not null
              and lower(coalesce(nullif(regexp_replace(btrim(project."customer_name"), '[[:space:]]+', ' ', 'g'), ''), '未命名客户')) =
                  lower(regexp_replace(btrim(customer."display_name"), '[[:space:]]+', ' ', 'g'));
        `);
        this.addSql(`update "poms"."project" set "customer_id" = null where "customer_name" is null;`);
        this.addSql(`comment on column "poms"."project"."customer_id" is '客户主数据标识';`);
        this.addSql(`alter table "poms"."project" add constraint "project_customer_id_foreign" foreign key ("customer_id") references "poms"."customer" ("id") on update cascade on delete restrict;`);
        this.addSql(`create index "idx_project_customer_id" on "poms"."project" ("customer_id");`);

        this.addSql(`
            insert into "poms"."business_number_sequence" ("scope", "period", "next_value", "prefix", "padding", "description")
            select 'customer', "period", max("sequence_value")::int + 1, 'CUST', 6, '客户编号'
            from (
                select
                    substring("customer_no" from '^CUST-([0-9]{4})-') as "period",
                    substring("customer_no" from '^CUST-[0-9]{4}-([0-9]+)$')::int as "sequence_value"
                from "poms"."customer"
                where "customer_no" ~ '^CUST-[0-9]{4}-[0-9]+$'
            ) numbered
            where "period" is not null and "sequence_value" is not null
            group by "period"
            on conflict ("scope", "period") do update
            set
                "next_value" = greatest("poms"."business_number_sequence"."next_value", excluded."next_value"),
                "prefix" = excluded."prefix",
                "padding" = excluded."padding",
                "description" = excluded."description",
                "updated_at" = now();
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."idx_project_customer_id";`);
        this.addSql(`alter table "poms"."project" drop constraint if exists "project_customer_id_foreign";`);
        this.addSql(`comment on column "poms"."project"."customer_id" is '客户标识，第一阶段先保留业务引用';`);
        this.addSql(`drop index if exists "poms"."idx_lead_customer_id";`);
        this.addSql(`alter table "poms"."lead" drop constraint if exists "lead_customer_id_foreign";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "customer_id";`);
        this.addSql(`drop table if exists "poms"."customer_alias" cascade;`);
        this.addSql(`drop table if exists "poms"."customer" cascade;`);
        this.addSql(`delete from "poms"."business_number_sequence" where "scope" = 'customer';`);
    }
}
