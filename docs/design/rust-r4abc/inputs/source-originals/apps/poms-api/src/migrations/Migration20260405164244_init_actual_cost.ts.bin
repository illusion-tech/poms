import { Migration } from '@mikro-orm/migrations';

export class Migration20260405164244_init_actual_cost extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "poms"."internal_cost_rate_version" ("id" uuid not null default gen_random_uuid(), "rate_scope_type" varchar(32) not null, "person_id" uuid null, "role_code" varchar(64) null, "rate_unit" varchar(32) not null, "rate_value" numeric(15,4) not null, "currency" varchar(16) not null default 'CNY', "effective_from" date not null, "effective_to" date null, "published_at" timestamptz null, "published_by" uuid null, "supersedes_rate_version_id" uuid null, "change_reason" text null, "row_version" int not null default 1, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, primary key ("id"));`);
    this.addSql(`comment on table "poms"."internal_cost_rate_version" is 'POMS 内部成本率版本';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."id" is '主键';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."rate_scope_type" is '生效范围类型：PERSON / ROLE';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."person_id" is '人员标识';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."role_code" is '角色编码';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."rate_unit" is '单位：HOUR / DAY';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."rate_value" is '成本率';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."currency" is '币种';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."effective_from" is '生效开始日期';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."effective_to" is '生效结束日期';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."published_at" is '发布时间';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."published_by" is '发布人';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."supersedes_rate_version_id" is '替代的旧版本';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."change_reason" is '变更原因';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."row_version" is '乐观锁版本号';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."created_at" is '创建时间';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."created_by" is '创建人标识';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."updated_at" is '最后更新时间';`);
    this.addSql(`comment on column "poms"."internal_cost_rate_version"."updated_by" is '最后更新人标识';`);
    this.addSql(`create index "idx_cost_rate_scope" on "poms"."internal_cost_rate_version" ("rate_scope_type");`);
    this.addSql(`create index "idx_cost_rate_effective" on "poms"."internal_cost_rate_version" ("effective_from", "effective_to");`);

    this.addSql(`create table "poms"."project_actual_cost_record" ("id" uuid not null default gen_random_uuid(), "project_id" uuid not null, "record_no" varchar(64) null, "cost_type" varchar(32) not null, "cost_subtype" varchar(64) null, "occurred_on" date null, "accounting_period" varchar(32) null, "registered_at" timestamptz null, "confirmed_at" timestamptz null, "included_at" timestamptz null, "execution_stage_code" varchar(64) null, "stage_derived_from_type" varchar(64) null, "stage_derived_from_id" varchar(64) null, "stage_derived_at" timestamptz null, "stage_locked_at" timestamptz null, "currency" varchar(16) not null default 'CNY', "amount_excluding_tax" numeric(15,4) null, "tax_cost_amount" numeric(15,4) null, "amount_including_tax" numeric(15,4) null, "record_status" varchar(32) not null default 'DRAFT', "is_included_in_project_cost" boolean not null default false, "is_high_risk" boolean not null default false, "source_type" varchar(64) null, "source_id" varchar(64) null, "source_ref_no" varchar(128) null, "evidence_summary" text null, "attachment_count" int not null default 0, "registered_by" uuid null, "confirmed_by" uuid null, "included_by" uuid null, "owner_role" varchar(64) null, "cost_description" text null, "tax_impact_summary" text null, "risk_note" text null, "supersedes_record_id" uuid null, "void_reason" text null, "labor_person_id" uuid null, "labor_role" varchar(64) null, "labor_period_type" varchar(32) null, "labor_period_start" date null, "labor_period_end" date null, "actual_hours" numeric(10,2) null, "actual_person_days" numeric(10,2) null, "internal_cost_rate" numeric(15,4) null, "labor_amount" numeric(15,4) null, "work_summary" text null, "delivery_stage" varchar(64) null, "rate_version_id" uuid null, "row_version" int not null default 1, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, primary key ("id"));`);
    this.addSql(`comment on table "poms"."project_actual_cost_record" is 'POMS 项目级实际成本记录';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."id" is '主键';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."project_id" is '关联项目';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."record_no" is '记录编号';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."cost_type" is '成本类型：PROCUREMENT/INVOICE/EXPENSE/PAYMENT_FACT/LABOR';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."cost_subtype" is '成本子类型';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."occurred_on" is '发生日期';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."accounting_period" is '核算期间';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."registered_at" is '登记时间';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."confirmed_at" is '确认时间';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."included_at" is '纳入口径时间';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."execution_stage_code" is '执行阶段';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."stage_derived_from_type" is '阶段推导来源类型';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."stage_derived_from_id" is '阶段推导来源标识';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."stage_derived_at" is '阶段推导时间';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."stage_locked_at" is '阶段锁定时间';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."currency" is '币种';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."amount_excluding_tax" is '不含税金额';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."tax_cost_amount" is '税金成本';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."amount_including_tax" is '含税总额（实际成本主要金额）';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."record_status" is '状态：DRAFT/REGISTERED/CONFIRMED/INCLUDED/VOIDED/REPLACED';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."is_included_in_project_cost" is '是否已纳入项目成本';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."is_high_risk" is '是否高风险';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."source_type" is '来源类型';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."source_id" is '来源标识';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."source_ref_no" is '来源引用号';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."evidence_summary" is '依据摘要';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."attachment_count" is '附件数量';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."registered_by" is '登记人';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."confirmed_by" is '确认人';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."included_by" is '纳入口径操作人';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."owner_role" is '责任角色';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."cost_description" is '成本说明';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."tax_impact_summary" is '税务影响说明';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."risk_note" is '风险提示';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."supersedes_record_id" is '替代的旧记录';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."void_reason" is '作废原因';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."labor_person_id" is '人力成本-人员标识';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."labor_role" is '人力成本-角色';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."labor_period_type" is '人力成本-归集周期类型：WEEK/MONTH';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."labor_period_start" is '人力成本-周期开始';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."labor_period_end" is '人力成本-周期结束';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."actual_hours" is '人力成本-实际工时';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."actual_person_days" is '人力成本-实际人天';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."internal_cost_rate" is '人力成本-采用成本率';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."labor_amount" is '人力成本-计算金额';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."work_summary" is '人力成本-工作摘要';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."delivery_stage" is '人力成本-交付阶段';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."rate_version_id" is '人力成本-对应成本率版本';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."row_version" is '乐观锁版本号';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."created_at" is '创建时间';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."created_by" is '创建人标识';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."updated_at" is '最后更新时间';`);
    this.addSql(`comment on column "poms"."project_actual_cost_record"."updated_by" is '最后更新人标识';`);
    this.addSql(`create index "idx_cost_record_project" on "poms"."project_actual_cost_record" ("project_id");`);
    this.addSql(`create index "idx_cost_record_status" on "poms"."project_actual_cost_record" ("record_status");`);
    this.addSql(`create index "idx_cost_record_stage" on "poms"."project_actual_cost_record" ("execution_stage_code");`);
    this.addSql(`create index "idx_cost_record_type" on "poms"."project_actual_cost_record" ("cost_type");`);

    this.addSql(`alter table "poms"."internal_cost_rate_version" add constraint "internal_cost_rate_version_supersedes_rate_version_id_foreign" foreign key ("supersedes_rate_version_id") references "poms"."internal_cost_rate_version" ("id") on delete set null;`);

    this.addSql(`alter table "poms"."project_actual_cost_record" add constraint "project_actual_cost_record_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
    this.addSql(`alter table "poms"."project_actual_cost_record" add constraint "project_actual_cost_record_supersedes_record_id_foreign" foreign key ("supersedes_record_id") references "poms"."project_actual_cost_record" ("id") on delete set null;`);
    this.addSql(`alter table "poms"."project_actual_cost_record" add constraint "project_actual_cost_record_rate_version_id_foreign" foreign key ("rate_version_id") references "poms"."internal_cost_rate_version" ("id") on delete set null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "poms"."project_actual_cost_record" drop constraint "project_actual_cost_record_rate_version_id_foreign";`);
    this.addSql(`alter table "poms"."project_actual_cost_record" drop constraint "project_actual_cost_record_supersedes_record_id_foreign";`);
    this.addSql(`alter table "poms"."internal_cost_rate_version" drop constraint "internal_cost_rate_version_supersedes_rate_version_id_foreign";`);

    this.addSql(`drop table if exists "poms"."project_actual_cost_record" cascade;`);
    this.addSql(`drop table if exists "poms"."internal_cost_rate_version" cascade;`);
  }

}
