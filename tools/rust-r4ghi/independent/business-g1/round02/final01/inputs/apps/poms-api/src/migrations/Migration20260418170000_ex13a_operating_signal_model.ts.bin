import { Migration } from '@mikro-orm/migrations';

/**
 * EX-13A: 建立经营数据成熟度、经营信号、gate binding 与 gate review 模型。
 *
 * 说明：
 * - 复用既有 `project_operating_snapshot` 作为 L2/L4 稳定锚点，不重复建快照表。
 * - 本次一次性补齐 `L4 -> L5` 结果链的五张核心表，避免后续只剩查询聚合、缺失可追溯来源。
 */
export class Migration20260418170000_ex13a_operating_signal_model extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."data_maturity_evaluation_result" (
                "id"                         uuid          not null default gen_random_uuid(),
                "project_id"                 uuid          not null,
                "referenced_snapshot_id"     uuid          not null,
                "data_maturity_level"        varchar(32)   not null,
                "cost_action_recommendation" varchar(32)   not null,
                "tax_impact_pending_amount"  decimal(18,2) not null default 0,
                "allocation_stability_summary" text        null,
                "unmapped_cost_summary"      text          null,
                "evaluation_basis_json"      jsonb         not null default '{}'::jsonb,
                "evaluated_at"               timestamptz   not null default now(),
                "status"                     varchar(32)   not null default 'active',
                "created_at"                 timestamptz   not null default now(),
                "created_by"                 uuid          null,
                "updated_at"                 timestamptz   not null default now(),
                "updated_by"                 uuid          null,
                "row_version"                integer       not null default 1,
                constraint "pk_data_maturity_evaluation_result" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."data_maturity_evaluation_result" is '经营数据成熟度结果';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."id" is '主键';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."project_id" is '关联项目';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."referenced_snapshot_id" is '引用经营快照';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."data_maturity_level" is '数据成熟度等级';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."cost_action_recommendation" is '成本侧动作建议';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."tax_impact_pending_amount" is '待闭合税务影响金额';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."allocation_stability_summary" is '分摊稳定性摘要';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."unmapped_cost_summary" is '未映射成本摘要';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."evaluation_basis_json" is '成熟度判定依据';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."evaluated_at" is '评估时间';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."data_maturity_evaluation_result"."row_version" is '乐观锁版本号';`);
        this.addSql(`alter table "poms"."data_maturity_evaluation_result" add constraint "data_maturity_evaluation_result_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
        this.addSql(`alter table "poms"."data_maturity_evaluation_result" add constraint "data_maturity_evaluation_result_referenced_snapshot_id_foreign" foreign key ("referenced_snapshot_id") references "poms"."project_operating_snapshot" ("id");`);
        this.addSql(`create index "idx_dmer_project_evaluated_at" on "poms"."data_maturity_evaluation_result" ("project_id", "evaluated_at" desc);`);
        this.addSql(`create index "idx_dmer_level_status" on "poms"."data_maturity_evaluation_result" ("data_maturity_level", "status");`);
        this.addSql(`create index "idx_dmer_referenced_snapshot" on "poms"."data_maturity_evaluation_result" ("referenced_snapshot_id");`);
        this.addSql(`
            create unique index "uq_dmer_project_snapshot_active"
            on "poms"."data_maturity_evaluation_result" ("project_id", "referenced_snapshot_id")
            where "status" = 'active';
        `);

        this.addSql(`
            create table "poms"."operating_signal_evaluation_result" (
                "id"                           uuid        not null default gen_random_uuid(),
                "project_id"                   uuid        not null,
                "referenced_snapshot_id"       uuid        not null,
                "data_maturity_evaluation_id"  uuid        not null,
                "signal_level"                 varchar(32) not null,
                "risk_level"                   varchar(32) not null,
                "formula_boundary_action"      varchar(32) not null,
                "variance_source_summary"      text        not null,
                "tax_impact_summary"           text        not null,
                "allocation_stability_summary" text        null,
                "unmapped_cost_summary"        text        null,
                "current_action_level"         varchar(32) not null,
                "recommended_action_summary"   text        null,
                "referenced_baseline_version"  varchar(64) not null,
                "referenced_snapshot_version"  varchar(64) not null,
                "review_required"              boolean     not null default false,
                "evaluated_at"                 timestamptz not null default now(),
                "status"                       varchar(32) not null default 'active',
                "created_at"                   timestamptz not null default now(),
                "created_by"                   uuid        null,
                "updated_at"                   timestamptz not null default now(),
                "updated_by"                   uuid        null,
                "row_version"                  integer     not null default 1,
                constraint "pk_operating_signal_evaluation_result" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."operating_signal_evaluation_result" is '经营信号与偏差解释结果';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."id" is '主键';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."project_id" is '关联项目';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."referenced_snapshot_id" is '引用经营快照';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."data_maturity_evaluation_id" is '引用数据成熟度结果';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."signal_level" is '经营信号等级';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."risk_level" is '风险等级';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."formula_boundary_action" is '公式边界动作';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."variance_source_summary" is '偏差来源摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."tax_impact_summary" is '税务影响摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."allocation_stability_summary" is '分摊稳定性摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."unmapped_cost_summary" is '未映射成本摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."current_action_level" is '当前动作等级';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."recommended_action_summary" is '建议动作摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."referenced_baseline_version" is '引用基线版本';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."referenced_snapshot_version" is '引用快照版本';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."review_required" is '是否需要人工复核';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."evaluated_at" is '评估时间';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."operating_signal_evaluation_result"."row_version" is '乐观锁版本号';`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" add constraint "operating_signal_evaluation_result_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" add constraint "oser_referenced_snapshot_fk" foreign key ("referenced_snapshot_id") references "poms"."project_operating_snapshot" ("id");`);
        this.addSql(`alter table "poms"."operating_signal_evaluation_result" add constraint "oser_data_maturity_evaluation_fk" foreign key ("data_maturity_evaluation_id") references "poms"."data_maturity_evaluation_result" ("id");`);
        this.addSql(`create index "idx_oser_project_evaluated_at" on "poms"."operating_signal_evaluation_result" ("project_id", "evaluated_at" desc);`);
        this.addSql(`create index "idx_oser_signal_status" on "poms"."operating_signal_evaluation_result" ("signal_level", "status");`);
        this.addSql(`create index "idx_oser_data_maturity" on "poms"."operating_signal_evaluation_result" ("data_maturity_evaluation_id");`);
        this.addSql(`create index "idx_oser_referenced_snapshot" on "poms"."operating_signal_evaluation_result" ("referenced_snapshot_id");`);
        this.addSql(`
            create unique index "uq_oser_project_snapshot_active"
            on "poms"."operating_signal_evaluation_result" ("project_id", "referenced_snapshot_id")
            where "status" = 'active';
        `);

        this.addSql(`
            create table "poms"."operating_signal_review_record" (
                "id"                                 uuid        not null default gen_random_uuid(),
                "signal_evaluation_id"               uuid        not null,
                "review_decision"                    varchar(32) not null,
                "resolved_data_maturity_level"       varchar(32) null,
                "resolved_cost_action_recommendation" varchar(32) null,
                "resolved_current_action_level"      varchar(32) not null,
                "referenced_baseline_version"        varchar(64) not null,
                "referenced_snapshot_version"        varchar(64) not null,
                "review_comment"                     text        null,
                "handled_at"                         timestamptz not null default now(),
                "handled_by"                         uuid        null,
                "status"                             varchar(32) not null default 'active',
                "created_at"                         timestamptz not null default now(),
                "created_by"                         uuid        null,
                "updated_at"                         timestamptz not null default now(),
                "updated_by"                         uuid        null,
                "row_version"                        integer     not null default 1,
                constraint "pk_operating_signal_review_record" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."operating_signal_review_record" is '经营信号人工复核记录';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."signal_evaluation_id" is '关联经营信号结果';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."review_decision" is '复核结论';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."resolved_data_maturity_level" is '复核后数据成熟度等级';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."resolved_cost_action_recommendation" is '复核后成本动作建议';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."resolved_current_action_level" is '复核后当前动作等级';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."referenced_baseline_version" is '引用基线版本';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."referenced_snapshot_version" is '引用快照版本';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."review_comment" is '复核说明';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."handled_at" is '处理时间';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."handled_by" is '处理人';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."operating_signal_review_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`alter table "poms"."operating_signal_review_record" add constraint "operating_signal_review_record_signal_evaluation_id_foreign" foreign key ("signal_evaluation_id") references "poms"."operating_signal_evaluation_result" ("id");`);
        this.addSql(`create index "idx_osrr_signal_handled_at" on "poms"."operating_signal_review_record" ("signal_evaluation_id", "handled_at" desc);`);
        this.addSql(`create index "idx_osrr_decision_status" on "poms"."operating_signal_review_record" ("review_decision", "status");`);
        this.addSql(`
            create unique index "uq_osrr_signal_active"
            on "poms"."operating_signal_review_record" ("signal_evaluation_id")
            where "status" = 'active';
        `);

        this.addSql(`
            create table "poms"."operating_signal_gate_binding" (
                "id"                           uuid          not null default gen_random_uuid(),
                "project_id"                   uuid          not null,
                "signal_evaluation_id"         uuid          not null,
                "binding_action"               varchar(32)   not null,
                "gate_stage_type"              varchar(32)   not null,
                "baseline_selection_source"    varchar(32)   not null,
                "tax_impact_summary"           text          not null,
                "tax_impact_pending_amount"    decimal(18,2) not null default 0,
                "allocation_stability_summary" text          null,
                "unmapped_cost_summary"        text          null,
                "data_maturity_level"          varchar(32)   not null,
                "cost_action_recommendation"   varchar(32)   not null,
                "current_action_level"         varchar(32)   not null,
                "next_action_summary"          text          null,
                "downstream_consumer_summary"  text          null,
                "referenced_baseline_version"  varchar(64)   not null,
                "referenced_snapshot_version"  varchar(64)   not null,
                "generated_at"                 timestamptz   not null default now(),
                "status"                       varchar(32)   not null default 'active',
                "created_at"                   timestamptz   not null default now(),
                "created_by"                   uuid          null,
                "updated_at"                   timestamptz   not null default now(),
                "updated_by"                   uuid          null,
                "row_version"                  integer       not null default 1,
                constraint "pk_operating_signal_gate_binding" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."operating_signal_gate_binding" is '经营信号到提成 gate 的绑定结果';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."id" is '主键';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."project_id" is '关联项目';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."signal_evaluation_id" is '关联经营信号结果';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."binding_action" is '绑定动作';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."gate_stage_type" is 'gate 阶段类型';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."baseline_selection_source" is '基线选择来源';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."tax_impact_summary" is '税务影响摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."tax_impact_pending_amount" is '待闭合税务影响金额';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."allocation_stability_summary" is '分摊稳定性摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."unmapped_cost_summary" is '未映射成本摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."data_maturity_level" is '数据成熟度等级';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."cost_action_recommendation" is '成本侧动作建议';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."current_action_level" is '当前动作等级';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."next_action_summary" is '下一步动作摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."downstream_consumer_summary" is '下游消费摘要';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."referenced_baseline_version" is '引用基线版本';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."referenced_snapshot_version" is '引用快照版本';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."generated_at" is '生成时间';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."operating_signal_gate_binding"."row_version" is '乐观锁版本号';`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" add constraint "operating_signal_gate_binding_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id");`);
        this.addSql(`alter table "poms"."operating_signal_gate_binding" add constraint "operating_signal_gate_binding_signal_evaluation_id_foreign" foreign key ("signal_evaluation_id") references "poms"."operating_signal_evaluation_result" ("id");`);
        this.addSql(`create index "idx_osgb_project_generated_at" on "poms"."operating_signal_gate_binding" ("project_id", "generated_at" desc);`);
        this.addSql(`create index "idx_osgb_binding_status" on "poms"."operating_signal_gate_binding" ("binding_action", "status");`);
        this.addSql(`create index "idx_osgb_signal_evaluation" on "poms"."operating_signal_gate_binding" ("signal_evaluation_id");`);
        this.addSql(`
            create unique index "uq_osgb_project_gate_stage_active"
            on "poms"."operating_signal_gate_binding" ("project_id", "gate_stage_type")
            where "status" = 'active';
        `);

        this.addSql(`
            create table "poms"."commission_gate_review_record" (
                "id"                   uuid        not null default gen_random_uuid(),
                "binding_id"           uuid        not null,
                "gate_review_decision" varchar(32) not null,
                "blocking_reason_code" varchar(64) null,
                "next_action_summary"  text        null,
                "handled_at"           timestamptz not null default now(),
                "handled_by"           uuid        null,
                "status"               varchar(32) not null default 'active',
                "created_at"           timestamptz not null default now(),
                "created_by"           uuid        null,
                "updated_at"           timestamptz not null default now(),
                "updated_by"           uuid        null,
                "row_version"          integer     not null default 1,
                constraint "pk_commission_gate_review_record" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."commission_gate_review_record" is '提成 gate 复核与阻断留痕';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."binding_id" is '关联 gate 绑定结果';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."gate_review_decision" is 'gate 复核结论';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."blocking_reason_code" is '阻断原因编码';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."next_action_summary" is '下一步动作摘要';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."handled_at" is '处理时间';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."handled_by" is '处理人';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."commission_gate_review_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`alter table "poms"."commission_gate_review_record" add constraint "commission_gate_review_record_binding_id_foreign" foreign key ("binding_id") references "poms"."operating_signal_gate_binding" ("id");`);
        this.addSql(`create index "idx_cgrr_binding_handled_at" on "poms"."commission_gate_review_record" ("binding_id", "handled_at" desc);`);
        this.addSql(`create index "idx_cgrr_decision_status" on "poms"."commission_gate_review_record" ("gate_review_decision", "status");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."commission_gate_review_record";`);
        this.addSql(`drop table if exists "poms"."operating_signal_gate_binding";`);
        this.addSql(`drop table if exists "poms"."operating_signal_review_record";`);
        this.addSql(`drop table if exists "poms"."operating_signal_evaluation_result";`);
        this.addSql(`drop table if exists "poms"."data_maturity_evaluation_result";`);
    }
}
