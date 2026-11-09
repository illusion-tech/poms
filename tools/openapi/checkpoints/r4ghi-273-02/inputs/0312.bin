import { Migration } from '@mikro-orm/migrations';

export class Migration20260424170000_ex26_project_technical_cost_package extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."project_technical_cost_package" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "version" integer not null,
                "is_current" boolean not null default true,
                "supersedes_id" uuid null,
                "status" varchar(32) not null default 'effective',
                "technical_feasibility_decision" varchar(32) not null,
                "technical_conclusion_summary" text not null,
                "allow_next_stage" boolean not null default false,
                "currency_code" varchar(16) not null,
                "total_estimated_amount_excluding_tax" numeric(18,2) not null,
                "total_tax_cost_amount" numeric(18,2) not null,
                "total_estimated_amount_including_tax" numeric(18,2) not null,
                "tax_assumption_summary" text not null,
                "tax_review_status" varchar(32) not null,
                "highest_risk_level" varchar(16) null,
                "blocker_count" integer not null default 0,
                "effective_at" timestamptz not null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                "row_version" integer not null default 1,
                constraint "project_technical_cost_package_pkey" primary key ("id"),
                constraint "uq_project_technical_cost_package_project_version" unique ("project_id", "version"),
                constraint "project_technical_cost_package_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict,
                constraint "project_technical_cost_package_supersedes_id_foreign" foreign key ("supersedes_id") references "poms"."project_technical_cost_package" ("id") on update cascade on delete set null
            );
        `);
        this.addSql(`comment on table "poms"."project_technical_cost_package" is '签约前技术与成本测算版本包';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."version" is '版本号';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."is_current" is '是否当前有效版本';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."supersedes_id" is '替代的旧版本包 ID';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."status" is '状态：effective/superseded';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."technical_feasibility_decision" is '技术可行性结论';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."technical_conclusion_summary" is '技术结论摘要';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."allow_next_stage" is '是否允许进入下一阶段';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."currency_code" is '币种';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."total_estimated_amount_excluding_tax" is '估算总额（不含税）';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."total_tax_cost_amount" is '税金成本总额';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."total_estimated_amount_including_tax" is '估算总额（含税）';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."tax_assumption_summary" is '税务假设摘要';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."tax_review_status" is '税务复核状态';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."highest_risk_level" is '最高风险等级';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."blocker_count" is '阻塞事项数量';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."effective_at" is '版本生效时间';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."project_technical_cost_package"."row_version" is '乐观锁版本号';`);
        this.addSql(`create unique index "uq_project_technical_cost_package_current" on "poms"."project_technical_cost_package" ("project_id") where "is_current" = true;`);
        this.addSql(`create index "idx_project_technical_cost_package_project_version" on "poms"."project_technical_cost_package" ("project_id", "version");`);
        this.addSql(`create index "idx_project_technical_cost_package_project_current" on "poms"."project_technical_cost_package" ("project_id", "is_current");`);
        this.addSql(`create index "idx_project_technical_cost_package_status" on "poms"."project_technical_cost_package" ("status");`);

        this.addSql(`
            create table "poms"."project_technical_scope_item" (
                "id" uuid not null default gen_random_uuid(),
                "package_id" uuid not null,
                "scope_type" varchar(32) not null,
                "label" varchar(255) not null,
                "description" text not null,
                "sort_order" integer not null default 0,
                constraint "project_technical_scope_item_pkey" primary key ("id"),
                constraint "project_technical_scope_item_package_id_foreign" foreign key ("package_id") references "poms"."project_technical_cost_package" ("id") on update cascade on delete cascade
            );
        `);
        this.addSql(`comment on table "poms"."project_technical_scope_item" is '签约前技术范围条目';`);
        this.addSql(`comment on column "poms"."project_technical_scope_item"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_technical_scope_item"."package_id" is '技术成本版本包 ID';`);
        this.addSql(`comment on column "poms"."project_technical_scope_item"."scope_type" is '范围类型';`);
        this.addSql(`comment on column "poms"."project_technical_scope_item"."label" is '条目名称';`);
        this.addSql(`comment on column "poms"."project_technical_scope_item"."description" is '条目说明';`);
        this.addSql(`comment on column "poms"."project_technical_scope_item"."sort_order" is '排序号';`);
        this.addSql(`create index "idx_project_technical_scope_item_package" on "poms"."project_technical_scope_item" ("package_id", "sort_order");`);
        this.addSql(`create index "idx_project_technical_scope_item_type" on "poms"."project_technical_scope_item" ("scope_type");`);

        this.addSql(`
            create table "poms"."project_technical_risk_item" (
                "id" uuid not null default gen_random_uuid(),
                "package_id" uuid not null,
                "risk_category" varchar(128) not null,
                "risk_level" varchar(16) not null,
                "risk_description" text not null,
                "impact_scope" text not null,
                "mitigation_plan" text not null,
                "owner_role" varchar(128) not null,
                "risk_status" varchar(32) not null,
                "blocks_next_stage" boolean not null default false,
                "sort_order" integer not null default 0,
                constraint "project_technical_risk_item_pkey" primary key ("id"),
                constraint "project_technical_risk_item_package_id_foreign" foreign key ("package_id") references "poms"."project_technical_cost_package" ("id") on update cascade on delete cascade
            );
        `);
        this.addSql(`comment on table "poms"."project_technical_risk_item" is '签约前技术风险条目';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."package_id" is '技术成本版本包 ID';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."risk_category" is '风险类别';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."risk_level" is '风险等级';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."risk_description" is '风险说明';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."impact_scope" is '影响范围';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."mitigation_plan" is '缓解计划';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."owner_role" is '责任角色';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."risk_status" is '风险状态';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."blocks_next_stage" is '是否阻塞下一阶段';`);
        this.addSql(`comment on column "poms"."project_technical_risk_item"."sort_order" is '排序号';`);
        this.addSql(`create index "idx_project_technical_risk_item_package" on "poms"."project_technical_risk_item" ("package_id", "sort_order");`);
        this.addSql(`create index "idx_project_technical_risk_item_level" on "poms"."project_technical_risk_item" ("risk_level");`);
        this.addSql(`create index "idx_project_technical_risk_item_blocker" on "poms"."project_technical_risk_item" ("package_id", "blocks_next_stage");`);

        this.addSql(`
            create table "poms"."project_technical_cost_item" (
                "id" uuid not null default gen_random_uuid(),
                "package_id" uuid not null,
                "cost_category" varchar(128) not null,
                "cost_subcategory" varchar(128) null,
                "cost_description" text not null,
                "estimation_basis" text not null,
                "quantity" numeric(18,4) null,
                "unit" varchar(32) null,
                "unit_price" numeric(18,4) null,
                "amount_excluding_tax" numeric(18,2) not null,
                "tax_cost_amount" numeric(18,2) not null,
                "amount_including_tax" numeric(18,2) not null,
                "currency_code" varchar(16) not null,
                "confidence_level" varchar(32) not null,
                "high_uncertainty" boolean not null default false,
                "responsible_role" varchar(128) null,
                "sort_order" integer not null default 0,
                constraint "project_technical_cost_item_pkey" primary key ("id"),
                constraint "project_technical_cost_item_package_id_foreign" foreign key ("package_id") references "poms"."project_technical_cost_package" ("id") on update cascade on delete cascade
            );
        `);
        this.addSql(`comment on table "poms"."project_technical_cost_item" is '签约前成本估算条目';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."package_id" is '技术成本版本包 ID';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."cost_category" is '成本类别';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."cost_subcategory" is '成本子类';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."cost_description" is '成本说明';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."estimation_basis" is '估算依据';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."quantity" is '数量';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."unit" is '单位';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."unit_price" is '单价';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."amount_excluding_tax" is '不含税金额';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."tax_cost_amount" is '税金成本';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."amount_including_tax" is '含税金额';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."currency_code" is '币种';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."confidence_level" is '估算置信度';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."high_uncertainty" is '是否高不确定性';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."responsible_role" is '责任角色';`);
        this.addSql(`comment on column "poms"."project_technical_cost_item"."sort_order" is '排序号';`);
        this.addSql(`create index "idx_project_technical_cost_item_package" on "poms"."project_technical_cost_item" ("package_id", "sort_order");`);
        this.addSql(`create index "idx_project_technical_cost_item_category" on "poms"."project_technical_cost_item" ("cost_category");`);
        this.addSql(`create index "idx_project_technical_cost_item_uncertainty" on "poms"."project_technical_cost_item" ("package_id", "high_uncertainty");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."project_technical_cost_item";`);
        this.addSql(`drop table if exists "poms"."project_technical_risk_item";`);
        this.addSql(`drop table if exists "poms"."project_technical_scope_item";`);
        this.addSql(`drop table if exists "poms"."project_technical_cost_package";`);
    }
}
