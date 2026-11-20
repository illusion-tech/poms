import { Migration } from '@mikro-orm/migrations';

export class Migration20260411120000_align_actual_cost_rate_version extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "poms"."internal_cost_rate_version" add column "rate_key" varchar(128) null, add column "version" int null, add column "status" varchar(32) not null default 'active', add column "is_current" boolean not null default true;`);

    this.addSql(`
      update "poms"."internal_cost_rate_version"
      set "rate_key" = case
        when "rate_scope_type" = 'PERSON' and "person_id" is not null then concat('PERSON:', "person_id"::text, ':', "rate_unit")
        when "rate_scope_type" = 'ROLE' and "role_code" is not null then concat('ROLE:', "role_code", ':', "rate_unit")
        else concat("rate_scope_type", ':UNSCOPED:', "rate_unit")
      end
      where "rate_key" is null;
    `);

    this.addSql(`
      with versioned as (
        select
          "id",
          row_number() over (partition by "rate_key" order by "effective_from" asc, "created_at" asc, "id" asc) as "next_version"
        from "poms"."internal_cost_rate_version"
      )
      update "poms"."internal_cost_rate_version" target
      set "version" = versioned."next_version"
      from versioned
      where target."id" = versioned."id";
    `);

    this.addSql(`
      with current_head as (
        select
          "id",
          row_number() over (partition by "rate_key" order by "effective_from" desc, "created_at" desc, "id" desc) as "head_rank"
        from "poms"."internal_cost_rate_version"
      )
      update "poms"."internal_cost_rate_version" target
      set
        "status" = case when current_head."head_rank" = 1 then 'active' else 'superseded' end,
        "is_current" = current_head."head_rank" = 1
      from current_head
      where target."id" = current_head."id";
    `);

    this.addSql(`alter table "poms"."internal_cost_rate_version" alter column "rate_key" set not null;`);
    this.addSql(`alter table "poms"."internal_cost_rate_version" alter column "version" set not null;`);

    this.addSql(`comment on column "poms"."internal_cost_rate_version"."rate_key" is '成本率唯一键：scope + identity + unit';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."version" is '成本率版本号';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."status" is '版本状态：active/superseded/retired';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."is_current" is '是否当前版本链头';`);

    this.addSql(`alter table "poms"."internal_cost_rate_version" add constraint "internal_cost_rate_version_rate_key_version_unique" unique ("rate_key", "version");`);
    this.addSql(`create unique index "internal_cost_rate_version_current_unique" on "poms"."internal_cost_rate_version" ("rate_key") where "is_current" = true;`);
    this.addSql(`create index "idx_cost_rate_key_current" on "poms"."internal_cost_rate_version" ("rate_key", "is_current");`);
    this.addSql(`create index "idx_cost_rate_status" on "poms"."internal_cost_rate_version" ("status");`);

    this.addSql(`create extension if not exists "btree_gist";`);
    this.addSql(`
      alter table "poms"."internal_cost_rate_version"
      add constraint "internal_cost_rate_version_active_range_excl"
      exclude using gist (
        "rate_key" with =,
        daterange("effective_from", coalesce("effective_to", 'infinity'::date), '[]') with &&
      )
      where ("status" = 'active');
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "poms"."internal_cost_rate_version" drop constraint if exists "internal_cost_rate_version_active_range_excl";`);
    this.addSql(`drop index if exists "poms"."idx_cost_rate_status";`);
    this.addSql(`drop index if exists "poms"."idx_cost_rate_key_current";`);
    this.addSql(`drop index if exists "poms"."internal_cost_rate_version_current_unique";`);
    this.addSql(`alter table "poms"."internal_cost_rate_version" drop constraint if exists "internal_cost_rate_version_rate_key_version_unique";`);
    this.addSql(`alter table "poms"."internal_cost_rate_version" drop column "rate_key", drop column "version", drop column "status", drop column "is_current";`);
  }

}
