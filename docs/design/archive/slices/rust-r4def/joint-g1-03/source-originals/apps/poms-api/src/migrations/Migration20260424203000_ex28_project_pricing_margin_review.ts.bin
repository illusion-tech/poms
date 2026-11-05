import { Migration } from '@mikro-orm/migrations';

export class Migration20260424203000_ex28_project_pricing_margin_review extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."project_pricing_margin_review" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "version" integer not null,
                "is_current" boolean not null default true,
                "supersedes_id" uuid null,
                "status" varchar(32) not null default 'effective',
                "technical_cost_package_id" uuid not null,
                "bid_commercial_process_id" uuid null,
                "commercial_release_baseline_id" uuid null,
                "pricing_path" varchar(32) not null,
                "quote_version" varchar(64) not null,
                "currency_code" varchar(16) not null,
                "quote_amount_tax_inclusive" numeric(18,2) not null,
                "quote_amount_tax_exclusive" numeric(18,2) not null,
                "tax_rate" numeric(18,8) not null,
                "tax_condition_summary" text not null,
                "payment_terms_summary" text not null,
                "gross_margin_rate" numeric(18,8) null,
                "gross_margin_band" varchar(32) not null,
                "gross_margin_summary" text not null,
                "decision" varchar(32) not null,
                "decision_summary" text not null,
                "approval_scenario_key" varchar(128) null,
                "summary_package_key" varchar(64) null,
                "summary_snapshot_id" uuid null,
                "projection_level" varchar(32) null,
                "export_policy" varchar(32) null,
                "ready_for_contracting" boolean not null default false,
                "owner_role" varchar(128) null,
                "blocker_count" integer not null default 0,
                "effective_at" timestamptz not null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                "row_version" integer not null default 1,
                constraint "project_pricing_margin_review_pkey" primary key ("id"),
                constraint "uq_project_pricing_margin_review_project_version" unique ("project_id", "version"),
                constraint "project_pricing_margin_review_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict,
                constraint "project_pricing_margin_review_supersedes_id_foreign" foreign key ("supersedes_id") references "poms"."project_pricing_margin_review" ("id") on update cascade on delete set null,
                constraint "project_pricing_margin_review_technical_cost_package_id_foreign" foreign key ("technical_cost_package_id") references "poms"."project_technical_cost_package" ("id") on update cascade on delete restrict,
                constraint "project_pricing_margin_review_bid_commercial_process_id_foreign" foreign key ("bid_commercial_process_id") references "poms"."project_bid_commercial_process" ("id") on update cascade on delete set null,
                constraint "project_pricing_margin_review_commercial_release_baseline_id_fo" foreign key ("commercial_release_baseline_id") references "poms"."commercial_release_baseline" ("id") on update cascade on delete restrict,
                constraint "project_pricing_margin_review_summary_snapshot_id_foreign" foreign key ("summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id") on update cascade on delete restrict
            );
        `);
        this.addSql(`comment on table "poms"."project_pricing_margin_review" is '签约前报价与毛利评审版本';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."version" is '版本号';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."is_current" is '是否当前有效版本';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."supersedes_id" is '替代的旧评审版本 ID';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."status" is '状态：effective/superseded';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."technical_cost_package_id" is '来源技术与成本版本包 ID';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."bid_commercial_process_id" is '来源招投标 / 商务竞标过程 ID';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."commercial_release_baseline_id" is '商业放行基线 ID';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."pricing_path" is '报价路径';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."quote_version" is '报价版本号';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."currency_code" is '币种';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."quote_amount_tax_inclusive" is '报价含税金额';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."quote_amount_tax_exclusive" is '报价不含税金额';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."tax_rate" is '税率';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."tax_condition_summary" is '税务条件摘要';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."payment_terms_summary" is '回款条件摘要';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."gross_margin_rate" is '预计毛利率';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."gross_margin_band" is '毛利区间';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."gross_margin_summary" is '毛利判断摘要';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."decision" is '评审结论';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."decision_summary" is '评审结论说明';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."approval_scenario_key" is '审批场景键';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."summary_package_key" is '审批摘要包键';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."summary_snapshot_id" is '审批摘要快照 ID';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."projection_level" is '投影级别';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."export_policy" is '导出策略';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."ready_for_contracting" is '是否可进入签约就绪';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."owner_role" is '责任角色';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."blocker_count" is '阻塞事项数量';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."effective_at" is '版本生效时间';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_review"."row_version" is '乐观锁版本号';`);
        this.addSql(`create unique index "uq_project_pricing_margin_review_current" on "poms"."project_pricing_margin_review" ("project_id") where "is_current" = true;`);
        this.addSql(`create index "idx_project_pricing_margin_review_project_version" on "poms"."project_pricing_margin_review" ("project_id", "version");`);
        this.addSql(`create index "idx_project_pricing_margin_review_project_current" on "poms"."project_pricing_margin_review" ("project_id", "is_current");`);
        this.addSql(`create index "idx_project_pricing_margin_review_decision" on "poms"."project_pricing_margin_review" ("decision");`);
        this.addSql(`create index "idx_project_pricing_margin_review_cost_package" on "poms"."project_pricing_margin_review" ("technical_cost_package_id");`);
        this.addSql(`create index "idx_project_pricing_margin_review_baseline" on "poms"."project_pricing_margin_review" ("commercial_release_baseline_id");`);
        this.addSql(`create index "idx_project_pricing_margin_review_summary_snapshot" on "poms"."project_pricing_margin_review" ("summary_snapshot_id");`);

        this.addSql(`
            create table "poms"."project_pricing_margin_condition_item" (
                "id" uuid not null default gen_random_uuid(),
                "review_id" uuid not null,
                "condition_key" varchar(128) not null,
                "condition_type" varchar(32) not null,
                "label" varchar(255) not null,
                "condition_summary" text not null,
                "condition_status" varchar(32) not null,
                "required_for_contracting" boolean not null default false,
                "responsible_role" varchar(128) null,
                "due_at" timestamptz null,
                "resolution_summary" text null,
                "sort_order" integer not null default 0,
                constraint "project_pricing_margin_condition_item_pkey" primary key ("id"),
                constraint "project_pricing_margin_condition_item_review_id_foreign" foreign key ("review_id") references "poms"."project_pricing_margin_review" ("id") on update cascade on delete cascade
            );
        `);
        this.addSql(`comment on table "poms"."project_pricing_margin_condition_item" is '签约前报价与毛利评审条件项';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."review_id" is '报价与毛利评审版本 ID';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."condition_key" is '条件键';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."condition_type" is '条件类型';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."label" is '条件名称';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."condition_summary" is '条件说明';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."condition_status" is '条件状态';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."required_for_contracting" is '是否阻塞进入签约就绪';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."responsible_role" is '责任角色';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."due_at" is '要求完成时间';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."resolution_summary" is '关闭或豁免说明';`);
        this.addSql(`comment on column "poms"."project_pricing_margin_condition_item"."sort_order" is '排序号';`);
        this.addSql(`create index "idx_project_pricing_margin_condition_review" on "poms"."project_pricing_margin_condition_item" ("review_id", "sort_order");`);
        this.addSql(`create index "idx_project_pricing_margin_condition_status" on "poms"."project_pricing_margin_condition_item" ("condition_status");`);
        this.addSql(`create index "idx_project_pricing_margin_condition_blocker" on "poms"."project_pricing_margin_condition_item" ("review_id", "required_for_contracting");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."project_pricing_margin_condition_item";`);
        this.addSql(`drop table if exists "poms"."project_pricing_margin_review";`);
    }
}
