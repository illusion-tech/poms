import { Migration } from '@mikro-orm/migrations';

export class Migration20260415152000_ex08b3c_snapshot_and_receipt_freeze extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."contract_term_snapshot" (
                "id"              uuid         not null default gen_random_uuid(),
                "contract_id"     uuid         not null,
                "effective_at"    timestamptz  not null default now(),
                "effective_by"    uuid         null,
                "snapshot_status" varchar(32)  not null default 'active',
                "created_at"      timestamptz  not null default now(),
                "created_by"      uuid         null,
                "row_version"     integer      not null default 1,
                constraint "pk_contract_term_snapshot" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."contract_term_snapshot" is '合同条款生效快照';`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."id" is '主键';`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."contract_id" is '所属合同 ID';`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."effective_at" is '生效时间';`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."effective_by" is '生效操作人';`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."snapshot_status" is '快照状态：active/superseded/voided';`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."row_version" is '乐观锁版本号';`);
        this.addSql(`
            alter table "poms"."contract_term_snapshot"
            add constraint "contract_term_snapshot_contract_id_foreign"
            foreign key ("contract_id") references "poms"."contract" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`create index "idx_contract_term_snapshot_contract_effective" on "poms"."contract_term_snapshot" ("contract_id", "effective_at" desc);`);
        this.addSql(`create index "idx_contract_term_snapshot_status" on "poms"."contract_term_snapshot" ("snapshot_status");`);
        this.addSql(`
            create unique index "uq_contract_term_snapshot_contract_active"
            on "poms"."contract_term_snapshot" ("contract_id")
            where "snapshot_status" = 'active';
        `);

        this.addSql(`
            alter table "poms"."project_handover"
            add constraint "project_handover_effective_handover_baseline_snapshot_id_foreig"
            foreign key ("effective_handover_baseline_snapshot_id") references "poms"."contract_term_snapshot" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."contract_handover_rebaseline_record"
            add constraint "contract_handover_rebaseline_record_effective_baseline_after_id"
            foreign key ("effective_baseline_after_id") references "poms"."contract_term_snapshot" ("id")
            on update cascade on delete restrict;
        `);

        this.addSql(`
            create table "poms"."project_receipt_judgment_freeze" (
                "id"                                  uuid         not null default gen_random_uuid(),
                "project_id"                          uuid         not null,
                "receipt_judgment_mode"               varchar(64)  not null,
                "source_type"                         varchar(64)  not null,
                "source_id"                           uuid         not null,
                "source_handover_id"                  uuid         not null,
                "source_handover_summary_snapshot_id" uuid         not null,
                "source_handover_rebaseline_record_id" uuid        null,
                "is_current"                          boolean      not null default true,
                "frozen_at"                           timestamptz  not null default now(),
                "frozen_by"                           uuid         null,
                "supersedes_id"                       uuid         null,
                "created_at"                          timestamptz  not null default now(),
                "created_by"                          uuid         null,
                "updated_at"                          timestamptz  not null default now(),
                "updated_by"                          uuid         null,
                "row_version"                         integer      not null default 1,
                constraint "pk_project_receipt_judgment_freeze" primary key ("id")
            );
        `);
        this.addSql(`comment on table "poms"."project_receipt_judgment_freeze" is '项目回款判断模式冻结记录';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."id" is '主键';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."project_id" is '项目 ID';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."receipt_judgment_mode" is '回款判断模式';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."source_type" is '来源类型';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."source_id" is '来源记录 ID';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."source_handover_id" is '来源移交记录 ID';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."source_handover_summary_snapshot_id" is '来源移交确认摘要快照 ID';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."source_handover_rebaseline_record_id" is '来源移交前再基线化记录 ID';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."is_current" is '是否当前有效冻结';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."frozen_at" is '冻结时间';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."frozen_by" is '冻结操作人';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."supersedes_id" is '被替代冻结记录 ID';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."project_receipt_judgment_freeze"."row_version" is '乐观锁版本号';`);
        this.addSql(`
            alter table "poms"."project_receipt_judgment_freeze"
            add constraint "project_receipt_judgment_freeze_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."project_receipt_judgment_freeze"
            add constraint "project_receipt_judgment_freeze_source_handover_id_foreign"
            foreign key ("source_handover_id") references "poms"."project_handover" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."project_receipt_judgment_freeze"
            add constraint "project_receipt_judgment_freeze_source_handover_summary_snapsh"
            foreign key ("source_handover_summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."project_receipt_judgment_freeze"
            add constraint "project_receipt_judgment_freeze_source_handover_rebaseline_"
            foreign key ("source_handover_rebaseline_record_id") references "poms"."contract_handover_rebaseline_record" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."project_receipt_judgment_freeze"
            add constraint "project_receipt_judgment_freeze_supersedes_id_foreign"
            foreign key ("supersedes_id") references "poms"."project_receipt_judgment_freeze" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(`create index "idx_prjf_project_frozen" on "poms"."project_receipt_judgment_freeze" ("project_id", "frozen_at" desc);`);
        this.addSql(`create index "idx_prjf_source_handover" on "poms"."project_receipt_judgment_freeze" ("source_handover_id");`);
        this.addSql(`create index "idx_prjf_handover_summary" on "poms"."project_receipt_judgment_freeze" ("source_handover_summary_snapshot_id");`);
        this.addSql(`create index "idx_prjf_handover_rebaseline" on "poms"."project_receipt_judgment_freeze" ("source_handover_rebaseline_record_id");`);
        this.addSql(`create index "idx_prjf_supersedes" on "poms"."project_receipt_judgment_freeze" ("supersedes_id");`);
        this.addSql(`
            create unique index "uq_prjf_project_current"
            on "poms"."project_receipt_judgment_freeze" ("project_id")
            where "is_current" = true;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."project_receipt_judgment_freeze";`);
        this.addSql(`alter table "poms"."contract_handover_rebaseline_record" drop constraint if exists "contract_handover_rebaseline_record_effective_baseline_after_id";`);
        this.addSql(`alter table "poms"."project_handover" drop constraint if exists "project_handover_effective_handover_baseline_snapshot_id_foreig";`);
        this.addSql(`drop table if exists "poms"."contract_term_snapshot";`);
    }
}
