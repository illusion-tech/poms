import { Migration } from '@mikro-orm/migrations';

/**
 * EX-08A1: 建立移交与再基线化核心 DDL。
 *
 * 本迁移先落地 contract_handover_rebaseline_record，再补回 EX-07
 * 已预留的 handover_rebaseline_record_id 引用，关闭 EX-07A/B/C 的
 * 延迟 FK 例外。approval_summary_snapshot 与 contract_term_snapshot
 * 尚未在代码侧落表，相关列先保留 uuid，后续切片补齐 FK。
 */
export class Migration20260415090000_ex08a1_project_handover_core extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."contract_handover_rebaseline_record" (
                "id"                          uuid         not null default gen_random_uuid(),
                "contract_amendment_id"       uuid         not null,
                "rebaseline_reason"           text         not null,
                "effective_baseline_after_id" uuid         not null,
                "status"                      varchar(32)  not null default 'processing',
                "handled_at"                  timestamptz  not null default now(),
                "handled_by"                  uuid         null,
                "supersedes_id"               uuid         null,
                "created_at"                  timestamptz  not null default now(),
                "created_by"                  uuid         null,
                "updated_at"                  timestamptz  not null default now(),
                "updated_by"                  uuid         null,
                "row_version"                 integer      not null default 1,
                constraint "pk_contract_handover_rebaseline_record" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."contract_handover_rebaseline_record" is '合同移交前再基线化记录';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."id" is '主键';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."contract_amendment_id" is '合同变更版本 ID（FK 待合同变更表落地后补齐）';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."rebaseline_reason" is '再基线化原因';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."effective_baseline_after_id" is '再基线化后生效基线快照 ID';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."status" is '状态：processing/pending_effective/effective/superseded/voided';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."handled_at" is '处理时间';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."handled_by" is '处理人';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."supersedes_id" is '被替代的再基线化记录';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`
            alter table "poms"."contract_handover_rebaseline_record"
            add constraint "contract_handover_rebaseline_record_supersedes_id_foreign"
            foreign key ("supersedes_id") references "poms"."contract_handover_rebaseline_record" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(`create index "idx_chrr_amendment_handled" on "poms"."contract_handover_rebaseline_record" ("contract_amendment_id", "handled_at" desc);`);
        this.addSql(`create index "idx_chrr_amendment_status" on "poms"."contract_handover_rebaseline_record" ("contract_amendment_id", "status");`);
        this.addSql(`create index "idx_chrr_effective_baseline_after" on "poms"."contract_handover_rebaseline_record" ("effective_baseline_after_id");`);
        this.addSql(`create index "idx_chrr_supersedes" on "poms"."contract_handover_rebaseline_record" ("supersedes_id");`);
        this.addSql(`
            create unique index "uq_chrr_amendment_effective"
            on "poms"."contract_handover_rebaseline_record" ("contract_amendment_id")
            where "status" = 'effective';
        `);

        this.addSql(`
            create table "poms"."project_handover" (
                "id"                                     uuid         not null default gen_random_uuid(),
                "project_id"                             uuid         not null,
                "contract_summary_snapshot_id"           uuid         not null,
                "effective_handover_baseline_snapshot_id" uuid        not null,
                "summary_snapshot_id"                    uuid         not null,
                "handover_rebaseline_record_id"          uuid         null,
                "status"                                 varchar(32)  not null default 'draft',
                "confirmed_at"                           timestamptz  null,
                "confirmed_by"                           uuid         null,
                "comment"                                text         null,
                "created_at"                             timestamptz  not null default now(),
                "created_by"                             uuid         null,
                "updated_at"                             timestamptz  not null default now(),
                "updated_by"                             uuid         null,
                "row_version"                            integer      not null default 1,
                constraint "pk_project_handover" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."project_handover" is '项目移交确认记录';`);
        this.addSql(`comment on column "poms"."project_handover"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_handover"."project_id" is '关联项目';`);
        this.addSql(`comment on column "poms"."project_handover"."contract_summary_snapshot_id" is '合同承接摘要快照 ID（EX-08A2 补齐 FK）';`);
        this.addSql(`comment on column "poms"."project_handover"."effective_handover_baseline_snapshot_id" is '移交前有效基线快照 ID';`);
        this.addSql(`comment on column "poms"."project_handover"."summary_snapshot_id" is '移交确认摘要快照 ID（EX-08A2 补齐 FK）';`);
        this.addSql(`comment on column "poms"."project_handover"."handover_rebaseline_record_id" is '最近一次已生效移交前再基线化记录';`);
        this.addSql(`comment on column "poms"."project_handover"."status" is '状态：draft/confirmed/superseded/voided';`);
        this.addSql(`comment on column "poms"."project_handover"."confirmed_at" is '确认时间';`);
        this.addSql(`comment on column "poms"."project_handover"."confirmed_by" is '确认人';`);
        this.addSql(`comment on column "poms"."project_handover"."comment" is '确认备注';`);
        this.addSql(`comment on column "poms"."project_handover"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project_handover"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."project_handover"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."project_handover"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."project_handover"."row_version" is '乐观锁版本号';`);
        this.addSql(`
            alter table "poms"."project_handover"
            add constraint "project_handover_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."project_handover"
            add constraint "project_handover_handover_rebaseline_record_id_foreign"
            foreign key ("handover_rebaseline_record_id") references "poms"."contract_handover_rebaseline_record" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`create index "idx_project_handover_project_confirmed" on "poms"."project_handover" ("project_id", "confirmed_at" desc);`);
        this.addSql(`create index "idx_project_handover_summary_snapshot" on "poms"."project_handover" ("summary_snapshot_id");`);
        this.addSql(`create index "idx_project_handover_rebaseline" on "poms"."project_handover" ("handover_rebaseline_record_id");`);

        this.addSql(`
            create table "poms"."handover_baseline_impact_item" (
                "id"                        uuid        not null default gen_random_uuid(),
                "rebaseline_record_id"      uuid        not null,
                "affected_handover_item_id" uuid        not null,
                "impact_type"               varchar(64) not null,
                "impact_summary"            text        not null,
                "supersedes_baseline_id"    uuid        null,
                "created_at"                timestamptz not null default now(),
                "created_by"                uuid        null,
                constraint "pk_handover_baseline_impact_item" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."handover_baseline_impact_item" is '移交前再基线化影响项';`);
        this.addSql(`comment on column "poms"."handover_baseline_impact_item"."id" is '主键';`);
        this.addSql(`comment on column "poms"."handover_baseline_impact_item"."rebaseline_record_id" is '所属再基线化记录';`);
        this.addSql(`comment on column "poms"."handover_baseline_impact_item"."affected_handover_item_id" is '受影响移交前事实项 ID';`);
        this.addSql(`comment on column "poms"."handover_baseline_impact_item"."impact_type" is '影响类型';`);
        this.addSql(`comment on column "poms"."handover_baseline_impact_item"."impact_summary" is '影响摘要';`);
        this.addSql(`comment on column "poms"."handover_baseline_impact_item"."supersedes_baseline_id" is '被替代基线 ID';`);
        this.addSql(`comment on column "poms"."handover_baseline_impact_item"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."handover_baseline_impact_item"."created_by" is '创建人';`);
        this.addSql(`
            alter table "poms"."handover_baseline_impact_item"
            add constraint "handover_baseline_impact_item_rebaseline_record_id_foreign"
            foreign key ("rebaseline_record_id") references "poms"."contract_handover_rebaseline_record" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`create index "idx_hbii_rebaseline_record" on "poms"."handover_baseline_impact_item" ("rebaseline_record_id");`);
        this.addSql(`create index "idx_hbii_affected_item" on "poms"."handover_baseline_impact_item" ("affected_handover_item_id");`);

        this.addSql(`
            alter table "poms"."project_operating_snapshot"
            add constraint "project_operating_snapshot_handover_rebaseline_record_id_foreig"
            foreign key ("handover_rebaseline_record_id") references "poms"."contract_handover_rebaseline_record" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`create index "idx_pos_handover_rebaseline" on "poms"."project_operating_snapshot" ("handover_rebaseline_record_id");`);
        this.addSql(`comment on column "poms"."project_operating_snapshot"."handover_rebaseline_record_id" is '移交前再基线化记录 ID';`);

        this.addSql(`
            alter table "poms"."period_closing_snapshot"
            add constraint "period_closing_snapshot_handover_rebaseline_record_id_foreign"
            foreign key ("handover_rebaseline_record_id") references "poms"."contract_handover_rebaseline_record" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`create index "idx_pcs_handover_rebaseline" on "poms"."period_closing_snapshot" ("handover_rebaseline_record_id");`);
        this.addSql(`comment on column "poms"."period_closing_snapshot"."handover_rebaseline_record_id" is '移交前再基线化记录 ID';`);

        this.addSql(`alter table "poms"."operating_restatement_record" add column "handover_rebaseline_record_id" uuid null;`);
        this.addSql(`comment on column "poms"."operating_restatement_record"."handover_rebaseline_record_id" is '移交前再基线化记录 ID';`);
        this.addSql(`
            alter table "poms"."operating_restatement_record"
            add constraint "operating_restatement_record_handover_rebaseline_record_id_fore"
            foreign key ("handover_rebaseline_record_id") references "poms"."contract_handover_rebaseline_record" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`create index "idx_orr_handover_rebaseline" on "poms"."operating_restatement_record" ("handover_rebaseline_record_id");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."idx_orr_handover_rebaseline";`);
        this.addSql(`alter table "poms"."operating_restatement_record" drop constraint if exists "operating_restatement_record_handover_rebaseline_record_id_fore";`);
        this.addSql(`alter table "poms"."operating_restatement_record" drop column if exists "handover_rebaseline_record_id";`);

        this.addSql(`drop index if exists "poms"."idx_pcs_handover_rebaseline";`);
        this.addSql(`alter table "poms"."period_closing_snapshot" drop constraint if exists "period_closing_snapshot_handover_rebaseline_record_id_foreign";`);

        this.addSql(`drop index if exists "poms"."idx_pos_handover_rebaseline";`);
        this.addSql(`alter table "poms"."project_operating_snapshot" drop constraint if exists "project_operating_snapshot_handover_rebaseline_record_id_foreig";`);

        this.addSql(`drop table if exists "poms"."handover_baseline_impact_item";`);
        this.addSql(`drop table if exists "poms"."project_handover";`);
        this.addSql(`drop table if exists "poms"."contract_handover_rebaseline_record";`);
    }
}
