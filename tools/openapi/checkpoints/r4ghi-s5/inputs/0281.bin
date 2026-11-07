import { Migration } from '@mikro-orm/migrations';

/**
 * EX-07A: 建立分摊、税务影响、实时 / 期末快照模型
 *
 * 新增表（8 张）：
 *   1. shared_cost_allocation_basis        — 共享成本分摊依据主表
 *   2. shared_cost_allocation_result       — 共享成本分摊结果表
 *   3. cost_stage_attribution_snapshot     — 成本阶段归属锁定快照
 *   4. accounting_tax_treatment_snapshot   — 税务处理与核算口径快照
 *   5. operating_baseline_package          — 经营基线包（原始基线 + 变更包汇总）
 *   6. change_package_baseline             — 已批准变更包基线明细
 *   7. project_operating_snapshot          — 项目实时 / 历史经营快照
 *   8. period_closing_snapshot             — 期末冻结快照
 *
 * 例外 EX-07A-E01:
 *   project_operating_snapshot.handover_rebaseline_record_id 与
 *   period_closing_snapshot.handover_rebaseline_record_id
 *   以 nullable uuid 创建，FK 约束延迟到 EX-08 落地
 *   contract_handover_rebaseline_record 表后补加。
 */
export class Migration20260414100000_ex07a_cost_accumulation_snapshot_model extends Migration {
    override async up(): Promise<void> {
        // ─── 1. shared_cost_allocation_basis ──────────────────────────────────
        this.addSql(`
            create table "poms"."shared_cost_allocation_basis" (
                "id"                    uuid        not null default gen_random_uuid(),
                "source_cost_scope_key" varchar(128) not null,
                "basis_type"            varchar(64)  not null,
                "allocation_method"     varchar(64)  not null,
                "basis_summary"         text         null,
                "status"                varchar(32)  not null default 'pending',
                "effective_at"          timestamptz  null,
                "effective_by"          uuid         null,
                "supersedes_id"         uuid         null,
                "created_at"            timestamptz  not null default now(),
                "created_by"            uuid         null,
                "updated_at"            timestamptz  not null default now(),
                "updated_by"            uuid         null,
                "row_version"           integer      not null default 1,
                constraint "pk_shared_cost_allocation_basis" primary key ("id")
            );
        `);
        this.addSql(`create index "idx_scab_scope_key" on "poms"."shared_cost_allocation_basis" ("source_cost_scope_key");`);
        this.addSql(`create index "idx_scab_status_effective" on "poms"."shared_cost_allocation_basis" ("status", "effective_at" desc);`);
        // 同一来源成本范围同时仅允许一条 active 分摊依据
        this.addSql(`
            create unique index "uq_scab_scope_current"
            on "poms"."shared_cost_allocation_basis" ("source_cost_scope_key")
            where "status" = 'active';
        `);

        // ─── 2. shared_cost_allocation_result ─────────────────────────────────
        this.addSql(`
            create table "poms"."shared_cost_allocation_result" (
                "id"                    uuid         not null default gen_random_uuid(),
                "basis_id"              uuid         not null,
                "project_id"            uuid         not null,
                "allocated_amount"      decimal(18,2) not null default 0,
                "allocation_ratio"      decimal(9,6)  null,
                "allocation_summary"    text          null,
                "status"                varchar(32)   not null default 'pending',
                "effective_at"          timestamptz   null,
                "supersedes_id"         uuid          null,
                "created_at"            timestamptz   not null default now(),
                "created_by"            uuid          null,
                "updated_at"            timestamptz   not null default now(),
                "updated_by"            uuid          null,
                "row_version"           integer       not null default 1,
                constraint "pk_shared_cost_allocation_result" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."shared_cost_allocation_result" add constraint "shared_cost_allocation_result_basis_id_foreign" foreign key ("basis_id") references "poms"."shared_cost_allocation_basis" ("id");`);
        this.addSql(`alter table "poms"."shared_cost_allocation_result" add constraint "shared_cost_allocation_result_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
        this.addSql(`create index "idx_scar_project_status" on "poms"."shared_cost_allocation_result" ("project_id", "status");`);
        this.addSql(`create index "idx_scar_basis_status" on "poms"."shared_cost_allocation_result" ("basis_id", "status");`);
        // 同一 basis_id + project_id 同时仅允许一条 active 分摊结果
        this.addSql(`
            create unique index "uq_scar_basis_project_current"
            on "poms"."shared_cost_allocation_result" ("basis_id", "project_id")
            where "status" = 'active';
        `);

        // ─── 3. cost_stage_attribution_snapshot ───────────────────────────────
        this.addSql(`
            create table "poms"."cost_stage_attribution_snapshot" (
                "id"                uuid        not null default gen_random_uuid(),
                "cost_record_id"    uuid        not null,
                "attributed_stage"  varchar(64) not null,
                "attribution_mode"  varchar(64) not null,
                "locked_by_snapshot_id" uuid    null,
                "attribution_summary"   text    null,
                "status"            varchar(32) not null default 'active',
                "supersedes_id"     uuid        null,
                "handled_at"        timestamptz null,
                "handled_by"        uuid        null,
                "created_at"        timestamptz not null default now(),
                "created_by"        uuid        null,
                "updated_at"        timestamptz not null default now(),
                "updated_by"        uuid        null,
                "row_version"       integer     not null default 1,
                constraint "pk_cost_stage_attribution_snapshot" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."cost_stage_attribution_snapshot" add constraint "cost_stage_attribution_snapshot_cost_record_id_foreign" foreign key ("cost_record_id") references "poms"."project_actual_cost_record" ("id");`);
        this.addSql(`create index "idx_csas_cost_record_handled" on "poms"."cost_stage_attribution_snapshot" ("cost_record_id", "handled_at" desc);`);
        this.addSql(`create index "idx_csas_stage_status" on "poms"."cost_stage_attribution_snapshot" ("attributed_stage", "status");`);
        // 同一成本记录同时仅允许一条 active 阶段归属快照
        this.addSql(`
            create unique index "uq_csas_cost_record_current"
            on "poms"."cost_stage_attribution_snapshot" ("cost_record_id")
            where "status" = 'active';
        `);

        // ─── 4. accounting_tax_treatment_snapshot ─────────────────────────────
        this.addSql(`
            create table "poms"."accounting_tax_treatment_snapshot" (
                "id"                        uuid          not null default gen_random_uuid(),
                "project_id"                uuid          not null,
                "tax_treatment_type"        varchar(64)   not null,
                "deductibility_status"      varchar(32)   not null,
                "tax_impact_amount"         decimal(18,2) not null default 0,
                "tax_pending_flag"          boolean       not null default false,
                "tax_impact_summary"        text          not null,
                "tax_impact_pending_amount" decimal(18,2) not null default 0,
                "basis_summary"             text          null,
                "status"                    varchar(32)   not null default 'pending',
                "supersedes_id"             uuid          null,
                "confirmed_at"              timestamptz   null,
                "confirmed_by"              uuid          null,
                "created_at"                timestamptz   not null default now(),
                "created_by"                uuid          null,
                "updated_at"                timestamptz   not null default now(),
                "updated_by"                uuid          null,
                "row_version"               integer       not null default 1,
                constraint "pk_accounting_tax_treatment_snapshot" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."accounting_tax_treatment_snapshot" add constraint "accounting_tax_treatment_snapshot_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
        this.addSql(`create index "idx_atts_project_status" on "poms"."accounting_tax_treatment_snapshot" ("project_id", "status");`);
        this.addSql(`create index "idx_atts_type_deductibility" on "poms"."accounting_tax_treatment_snapshot" ("tax_treatment_type", "deductibility_status");`);

        // ─── 5. operating_baseline_package ────────────────────────────────────
        this.addSql(`
            create table "poms"."operating_baseline_package" (
                "id"                             uuid          not null default gen_random_uuid(),
                "project_id"                     uuid          not null,
                "original_baseline_cost"         decimal(18,2) not null default 0,
                "change_package_total"           decimal(18,2) not null default 0,
                "current_effective_baseline_cost" decimal(18,2) not null default 0,
                "baseline_selection_source"      varchar(32)   not null default 'original',
                "effective_operating_baseline_id" uuid         null,
                "baseline_summary"               text          null,
                "is_current"                     boolean       not null default false,
                "status"                         varchar(32)   not null default 'draft',
                "effective_at"                   timestamptz   null,
                "effective_by"                   uuid          null,
                "created_at"                     timestamptz   not null default now(),
                "created_by"                     uuid          null,
                "updated_at"                     timestamptz   not null default now(),
                "updated_by"                     uuid          null,
                "row_version"                    integer       not null default 1,
                constraint "pk_operating_baseline_package" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."operating_baseline_package" add constraint "operating_baseline_package_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
        this.addSql(`create index "idx_obp_project_current" on "poms"."operating_baseline_package" ("project_id", "is_current");`);
        this.addSql(`create index "idx_obp_effective_baseline" on "poms"."operating_baseline_package" ("effective_operating_baseline_id");`);
        // 同一 project_id 同时仅允许一条 is_current = true 的基线包
        this.addSql(`
            create unique index "uq_obp_project_current"
            on "poms"."operating_baseline_package" ("project_id")
            where "is_current" = true;
        `);

        // ─── 6. change_package_baseline ───────────────────────────────────────
        this.addSql(`
            create table "poms"."change_package_baseline" (
                "id"                   uuid          not null default gen_random_uuid(),
                "baseline_package_id"  uuid          not null,
                "change_package_id"    uuid          not null,
                "change_amount"        decimal(18,2) not null default 0,
                "change_summary"       text          null,
                "status"               varchar(32)   not null default 'active',
                "effective_at"         timestamptz   null,
                "created_at"           timestamptz   not null default now(),
                "created_by"           uuid          null,
                "updated_at"           timestamptz   not null default now(),
                "updated_by"           uuid          null,
                "row_version"          integer       not null default 1,
                constraint "pk_change_package_baseline" primary key ("id"),
                constraint "uq_cpb_package_change" unique ("baseline_package_id", "change_package_id")
            );
        `);
        this.addSql(`alter table "poms"."change_package_baseline" add constraint "change_package_baseline_baseline_package_id_foreign" foreign key ("baseline_package_id") references "poms"."operating_baseline_package" ("id");`);
        this.addSql(`create index "idx_cpb_baseline_package" on "poms"."change_package_baseline" ("baseline_package_id", "status");`);

        // ─── 7. project_operating_snapshot ────────────────────────────────────
        // 注意：handover_rebaseline_record_id 字段以 nullable uuid 创建，
        // FK 约束延迟到 EX-08 落地 contract_handover_rebaseline_record 后补加
        // （例外 EX-07A-E01）
        this.addSql(`
            create table "poms"."project_operating_snapshot" (
                "id"                             uuid          not null default gen_random_uuid(),
                "project_id"                     uuid          not null,
                "snapshot_mode"                  varchar(32)   not null,
                "snapshot_at"                    timestamptz   not null default now(),
                "source_window_start"            date          null,
                "source_window_end"              date          null,
                "effective_contract_total"       decimal(18,2) not null default 0,
                "receivable_confirmed_total"     decimal(18,2) not null default 0,
                "included_cost_total"            decimal(18,2) not null default 0,
                "original_baseline_cost"         decimal(18,2) not null default 0,
                "current_effective_baseline_cost" decimal(18,2) not null default 0,
                "gross_margin_amount"            decimal(18,2) not null default 0,
                "gross_margin_rate"              decimal(9,6)  null,
                "tax_impact_summary"             text          not null,
                "tax_impact_pending_amount"      decimal(18,2) not null default 0,
                "allocation_stability_summary"   text          null,
                "unmapped_cost_summary"          text          null,
                "current_action_level"           varchar(32)   not null,
                "referenced_baseline_version"    varchar(64)   not null,
                "baseline_selection_source"      varchar(32)   not null,
                "handover_rebaseline_record_id"  uuid          null,  -- FK 延迟（EX-07A-E01）
                "status"                         varchar(32)   not null default 'active',
                "supersedes_id"                  uuid          null,
                "created_at"                     timestamptz   not null default now(),
                "created_by"                     uuid          null,
                "updated_at"                     timestamptz   not null default now(),
                "updated_by"                     uuid          null,
                "row_version"                    integer       not null default 1,
                constraint "pk_project_operating_snapshot" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."project_operating_snapshot" add constraint "project_operating_snapshot_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
        this.addSql(`create index "idx_pos_project_snapshot_at" on "poms"."project_operating_snapshot" ("project_id", "snapshot_at" desc);`);
        this.addSql(`create index "idx_pos_project_mode" on "poms"."project_operating_snapshot" ("project_id", "snapshot_mode");`);
        this.addSql(`create index "idx_pos_project_baseline_mode" on "poms"."project_operating_snapshot" ("project_id", "referenced_baseline_version", "snapshot_mode");`);

        // ─── 8. period_closing_snapshot ───────────────────────────────────────
        // 同上：handover_rebaseline_record_id FK 延迟（EX-07A-E01）
        this.addSql(`
            create table "poms"."period_closing_snapshot" (
                "id"                             uuid          not null default gen_random_uuid(),
                "project_id"                     uuid          not null,
                "period_key"                     varchar(32)   not null,
                "snapshot_mode"                  varchar(32)   not null default 'period-end',
                "snapshot_at"                    timestamptz   not null default now(),
                "effective_contract_total"       decimal(18,2) not null default 0,
                "receivable_confirmed_total"     decimal(18,2) not null default 0,
                "included_cost_total"            decimal(18,2) not null default 0,
                "original_baseline_cost"         decimal(18,2) not null default 0,
                "current_effective_baseline_cost" decimal(18,2) not null default 0,
                "gross_margin_amount"            decimal(18,2) not null default 0,
                "gross_margin_rate"              decimal(9,6)  null,
                "tax_impact_summary"             text          not null,
                "tax_impact_pending_amount"      decimal(18,2) not null default 0,
                "allocation_stability_summary"   text          null,
                "unmapped_cost_summary"          text          null,
                "current_action_level"           varchar(32)   not null,
                "referenced_baseline_version"    varchar(64)   not null,
                "baseline_selection_source"      varchar(32)   not null,
                "handover_rebaseline_record_id"  uuid          null,  -- FK 延迟（EX-07A-E01）
                "status"                         varchar(32)   not null default 'active',
                "created_at"                     timestamptz   not null default now(),
                "created_by"                     uuid          null,
                "updated_at"                     timestamptz   not null default now(),
                "updated_by"                     uuid          null,
                "row_version"                    integer       not null default 1,
                constraint "pk_period_closing_snapshot" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."period_closing_snapshot" add constraint "period_closing_snapshot_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
        this.addSql(`create index "idx_pcs_project_period" on "poms"."period_closing_snapshot" ("project_id", "period_key");`);
        this.addSql(`create index "idx_pcs_snapshot_at" on "poms"."period_closing_snapshot" ("project_id", "snapshot_at" desc);`);
        this.addSql(`create index "idx_pcs_project_baseline" on "poms"."period_closing_snapshot" ("project_id", "referenced_baseline_version");`);
        // 同一 project_id + period_key 同时仅允许一条 active period-end 快照
        this.addSql(`
            create unique index "uq_pcs_project_period_current"
            on "poms"."period_closing_snapshot" ("project_id", "period_key")
            where "snapshot_mode" = 'period-end' and "status" = 'active';
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."period_closing_snapshot";`);
        this.addSql(`drop table if exists "poms"."project_operating_snapshot";`);
        this.addSql(`drop table if exists "poms"."change_package_baseline";`);
        this.addSql(`drop table if exists "poms"."operating_baseline_package";`);
        this.addSql(`drop table if exists "poms"."accounting_tax_treatment_snapshot";`);
        this.addSql(`drop table if exists "poms"."cost_stage_attribution_snapshot";`);
        this.addSql(`drop table if exists "poms"."shared_cost_allocation_result";`);
        this.addSql(`drop table if exists "poms"."shared_cost_allocation_basis";`);
    }
}
