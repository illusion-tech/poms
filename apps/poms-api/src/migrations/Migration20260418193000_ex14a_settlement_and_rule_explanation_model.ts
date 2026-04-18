import { Migration } from '@mikro-orm/migrations';

/**
 * EX-14A: 建立离职 / 特例结论、最终结算 / 质保金收口与统一规则解释模型。
 *
 * 说明：
 * - 复用 `EX-13` 已冻结的 `commission_gate_review_record` 与 `approval_summary_snapshot` 作为稳定依据链锚点。
 * - 补齐 `departureExceptionDecisionId` 的正式对象链，避免 `stage=retention` 命令继续依赖悬空设计引用。
 * - `CommissionRuleExplanationSnapshot` 通过 `finalSettlementSnapshotId` 绑定当前收口链，不单独复制另一套经营依据包。
 */
export class Migration20260418193000_ex14a_settlement_and_rule_explanation_model extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."commission_departure_exception_decision" (
                "id"                                 uuid        not null default gen_random_uuid(),
                "project_id"                         uuid        not null,
                "freeze_version_id"                  uuid        not null,
                "version"                            integer     not null,
                "is_current"                         boolean     not null default true,
                "departure_scenario_code"            varchar(64) not null,
                "decision_code"                      varchar(32) not null,
                "decision_summary"                   text        not null,
                "confirmation_requirement_summary"   text        null,
                "summary_package_key"                varchar(64) not null,
                "summary_snapshot_id"                uuid        not null,
                "projection_level"                   varchar(32) not null,
                "export_policy"                      varchar(32) not null,
                "handled_at"                         timestamptz not null default now(),
                "handled_by"                         uuid        null,
                "status"                             varchar(32) not null default 'active',
                "supersedes_id"                      uuid        null,
                "created_at"                         timestamptz not null default now(),
                "created_by"                         uuid        null,
                "updated_at"                         timestamptz not null default now(),
                "updated_by"                         uuid        null,
                "row_version"                        integer     not null default 1,
                constraint "pk_commission_departure_exception_decision" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."commission_departure_exception_decision" is '离职 / 特例结论';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."project_id" is '关联项目';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."freeze_version_id" is '关联当前冻结版本';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."version" is '版本号';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."is_current" is '是否当前有效';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."departure_scenario_code" is '离职 / 特例情形码';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."decision_code" is '结论码';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."decision_summary" is '结论摘要';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."confirmation_requirement_summary" is '责任承接确认要求摘要';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."summary_package_key" is '摘要包键';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."summary_snapshot_id" is '摘要快照 ID';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."projection_level" is '投影级别';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."export_policy" is '导出策略';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."handled_at" is '处理时间';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."handled_by" is '处理人';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."supersedes_id" is '被替代的旧结论';`);
        this.addSql(`comment on column "poms"."commission_departure_exception_decision"."row_version" is '乐观锁版本号';`);
        this.addSql(`
            alter table "poms"."commission_departure_exception_decision"
            add constraint "commission_departure_exception_decision_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_departure_exception_decision"
            add constraint "cded_freeze_version_fk"
            foreign key ("freeze_version_id") references "poms"."commission_role_assignment" ("id") on update cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_departure_exception_decision"
            add constraint "cded_summary_snapshot_fk"
            foreign key ("summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id") on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."commission_departure_exception_decision"
            add constraint "cded_supersedes_fk"
            foreign key ("supersedes_id") references "poms"."commission_departure_exception_decision" ("id") on update cascade on delete set null;
        `);
        this.addSql(`
            create index "idx_cded_project_handled_at"
            on "poms"."commission_departure_exception_decision" ("project_id", "handled_at" desc);
        `);
        this.addSql(`create index "idx_cded_project_current" on "poms"."commission_departure_exception_decision" ("project_id", "is_current");`);
        this.addSql(`create index "idx_cded_freeze_version_status" on "poms"."commission_departure_exception_decision" ("freeze_version_id", "status");`);
        this.addSql(`create index "idx_cded_summary_snapshot" on "poms"."commission_departure_exception_decision" ("summary_snapshot_id");`);
        this.addSql(`create index "idx_cded_decision_status" on "poms"."commission_departure_exception_decision" ("decision_code", "status");`);
        this.addSql(`
            alter table "poms"."commission_departure_exception_decision"
            add constraint "cded_project_version_unique"
            unique ("project_id", "version");
        `);
        this.addSql(`
            create unique index "uq_cded_project_current"
            on "poms"."commission_departure_exception_decision" ("project_id")
            where "is_current" = true;
        `);

        this.addSql(`
            create table "poms"."commission_final_settlement_snapshot" (
                "id"                               uuid          not null default gen_random_uuid(),
                "project_id"                       uuid          not null,
                "freeze_version_id"                uuid          not null,
                "gate_review_record_id"            uuid          not null,
                "retention_receipt_record_id"      uuid          null,
                "departure_exception_decision_id"  uuid          null,
                "version"                          integer       not null,
                "is_current"                       boolean       not null default true,
                "final_settlement_status"          varchar(32)   not null,
                "non_retention_settlement_status"  varchar(32)   not null,
                "retention_settlement_status"      varchar(32)   not null,
                "retention_requirement_summary"    text          null,
                "retention_receipt_summary"        text          null,
                "departure_exception_summary"      text          null,
                "baseline_selection_source"        varchar(32)   not null,
                "tax_impact_summary"               text          not null,
                "tax_impact_pending_amount"        decimal(18,2) not null default 0,
                "data_maturity_level"              varchar(32)   not null,
                "cost_action_recommendation"       varchar(32)   not null,
                "current_action_level"             varchar(32)   not null,
                "referenced_baseline_version"      varchar(64)   not null,
                "referenced_snapshot_version"      varchar(64)   not null,
                "summary_package_key"              varchar(64)   not null,
                "summary_snapshot_id"              uuid          not null,
                "projection_level"                 varchar(32)   not null,
                "export_policy"                    varchar(32)   not null,
                "generated_at"                     timestamptz   not null default now(),
                "status"                           varchar(32)   not null default 'active',
                "supersedes_id"                    uuid          null,
                "created_at"                       timestamptz   not null default now(),
                "created_by"                       uuid          null,
                "updated_at"                       timestamptz   not null default now(),
                "updated_by"                       uuid          null,
                "row_version"                      integer       not null default 1,
                constraint "pk_commission_final_settlement_snapshot" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."commission_final_settlement_snapshot" is '最终结算 / 质保金收口快照';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."project_id" is '关联项目';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."freeze_version_id" is '当前冻结版本';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."gate_review_record_id" is '当前 gate 复核记录';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."retention_receipt_record_id" is '质保金到账事实引用';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."departure_exception_decision_id" is '离职 / 特例结论引用';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."version" is '版本号';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."is_current" is '是否当前有效';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."final_settlement_status" is '项目级最终结算状态';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."non_retention_settlement_status" is '非质保部分结清状态';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."retention_settlement_status" is '质保金结算状态';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."retention_requirement_summary" is '质保金结算条件摘要';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."retention_receipt_summary" is '质保金到账摘要';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."departure_exception_summary" is '离职 / 特例摘要';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."baseline_selection_source" is '基线选择来源';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."tax_impact_summary" is '税务影响摘要';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."tax_impact_pending_amount" is '待闭合税务影响金额';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."data_maturity_level" is '数据成熟度等级';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."cost_action_recommendation" is '成本侧动作建议';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."current_action_level" is '当前动作等级';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."referenced_baseline_version" is '引用基线版本';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."referenced_snapshot_version" is '引用快照版本';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."summary_package_key" is '摘要包键';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."summary_snapshot_id" is '摘要快照 ID';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."projection_level" is '投影级别';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."export_policy" is '导出策略';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."generated_at" is '快照生成时间';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."supersedes_id" is '被替代的旧快照';`);
        this.addSql(`comment on column "poms"."commission_final_settlement_snapshot"."row_version" is '乐观锁版本号';`);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "commission_final_settlement_snapshot_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_freeze_version_fk"
            foreign key ("freeze_version_id") references "poms"."commission_role_assignment" ("id") on update cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_gate_review_fk"
            foreign key ("gate_review_record_id") references "poms"."commission_gate_review_record" ("id") on update cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_retention_receipt_fk"
            foreign key ("retention_receipt_record_id") references "poms"."receipt_record" ("id") on update cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_departure_exception_fk"
            foreign key ("departure_exception_decision_id") references "poms"."commission_departure_exception_decision" ("id") on update cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_summary_snapshot_fk"
            foreign key ("summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id") on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_supersedes_fk"
            foreign key ("supersedes_id") references "poms"."commission_final_settlement_snapshot" ("id") on update cascade on delete set null;
        `);
        this.addSql(`
            create index "idx_cfss_project_generated_at"
            on "poms"."commission_final_settlement_snapshot" ("project_id", "generated_at" desc);
        `);
        this.addSql(`create index "idx_cfss_project_current" on "poms"."commission_final_settlement_snapshot" ("project_id", "is_current");`);
        this.addSql(`create index "idx_cfss_status_generated_at" on "poms"."commission_final_settlement_snapshot" ("status", "generated_at");`);
        this.addSql(`create index "idx_cfss_freeze_version" on "poms"."commission_final_settlement_snapshot" ("freeze_version_id");`);
        this.addSql(`create index "idx_cfss_gate_review" on "poms"."commission_final_settlement_snapshot" ("gate_review_record_id");`);
        this.addSql(`create index "idx_cfss_summary_snapshot" on "poms"."commission_final_settlement_snapshot" ("summary_snapshot_id");`);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_project_version_unique"
            unique ("project_id", "version");
        `);
        this.addSql(`
            create unique index "uq_cfss_project_current"
            on "poms"."commission_final_settlement_snapshot" ("project_id")
            where "is_current" = true;
        `);

        this.addSql(`
            create table "poms"."commission_rule_explanation_snapshot" (
                "id"                           uuid        not null default gen_random_uuid(),
                "project_id"                   uuid        not null,
                "final_settlement_snapshot_id" uuid        not null,
                "version"                      integer     not null,
                "is_current"                   boolean     not null default true,
                "current_stage_status"         varchar(32) not null,
                "gate_decision_code"           varchar(32) not null,
                "blocking_reason_category"     varchar(32) null,
                "blocking_reason_code"         varchar(64) null,
                "blocking_reason_summary"      text        null,
                "gate_decision_summary"        text        not null,
                "next_action_summary"          text        null,
                "generated_at"                 timestamptz not null default now(),
                "status"                       varchar(32) not null default 'active',
                "supersedes_id"                uuid        null,
                "created_at"                   timestamptz not null default now(),
                "created_by"                   uuid        null,
                "updated_at"                   timestamptz not null default now(),
                "updated_by"                   uuid        null,
                "row_version"                  integer     not null default 1,
                constraint "pk_commission_rule_explanation_snapshot" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."commission_rule_explanation_snapshot" is '统一规则解释快照';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."project_id" is '关联项目';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."final_settlement_snapshot_id" is '关联最终结算收口快照';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."version" is '版本号';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."is_current" is '是否当前有效';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."current_stage_status" is '当前阶段状态';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."gate_decision_code" is 'gate 决策码';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."blocking_reason_category" is '阻断原因分类';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."blocking_reason_code" is '阻断原因编码';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."blocking_reason_summary" is '阻断原因摘要';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."gate_decision_summary" is 'gate 结论摘要';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."next_action_summary" is '下一步动作摘要';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."generated_at" is '快照生成时间';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."status" is '状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."supersedes_id" is '被替代的旧解释快照';`);
        this.addSql(`comment on column "poms"."commission_rule_explanation_snapshot"."row_version" is '乐观锁版本号';`);
        this.addSql(`
            alter table "poms"."commission_rule_explanation_snapshot"
            add constraint "commission_rule_explanation_snapshot_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_rule_explanation_snapshot"
            add constraint "cres_final_settlement_snapshot_fk"
            foreign key ("final_settlement_snapshot_id") references "poms"."commission_final_settlement_snapshot" ("id") on update cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_rule_explanation_snapshot"
            add constraint "cres_supersedes_fk"
            foreign key ("supersedes_id") references "poms"."commission_rule_explanation_snapshot" ("id") on update cascade on delete set null;
        `);
        this.addSql(`
            create index "idx_cres_project_generated_at"
            on "poms"."commission_rule_explanation_snapshot" ("project_id", "generated_at" desc);
        `);
        this.addSql(`create index "idx_cres_project_current" on "poms"."commission_rule_explanation_snapshot" ("project_id", "is_current");`);
        this.addSql(`create index "idx_cres_final_settlement" on "poms"."commission_rule_explanation_snapshot" ("final_settlement_snapshot_id");`);
        this.addSql(`create index "idx_cres_blocking_reason_code" on "poms"."commission_rule_explanation_snapshot" ("blocking_reason_code");`);
        this.addSql(`create index "idx_cres_gate_decision_status" on "poms"."commission_rule_explanation_snapshot" ("gate_decision_code", "status");`);
        this.addSql(`
            alter table "poms"."commission_rule_explanation_snapshot"
            add constraint "cres_project_version_unique"
            unique ("project_id", "version");
        `);
        this.addSql(`
            create unique index "uq_cres_project_current"
            on "poms"."commission_rule_explanation_snapshot" ("project_id")
            where "is_current" = true;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."commission_rule_explanation_snapshot";`);
        this.addSql(`drop table if exists "poms"."commission_final_settlement_snapshot";`);
        this.addSql(`drop table if exists "poms"."commission_departure_exception_decision";`);
    }
}
