import { Migration } from '@mikro-orm/migrations';

export class Migration20260506100000_ex54a_lead_score_history_override extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."lead_score_snapshot" (
                "id" uuid not null default gen_random_uuid(),
                "lead_id" uuid not null,
                "snapshot_kind" varchar(32) not null default 'system',
                "override_id" uuid null,
                "formula_version" varchar(64) not null default 'lead-score-v1',
                "system_score" int not null default 0,
                "system_rating" varchar(8) not null default 'D',
                "effective_score" int not null default 0,
                "effective_rating" varchar(8) not null default 'D',
                "effective_score_source" varchar(32) not null default 'system',
                "score_reason" text not null,
                "component_breakdown" jsonb not null default '{}'::jsonb,
                "gate_summary_snapshot" jsonb not null,
                "source_command" varchar(64) not null,
                "source_record_id" uuid null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                constraint "pk_lead_score_snapshot" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."lead_score_snapshot" add constraint "lead_score_snapshot_lead_id_foreign" foreign key ("lead_id") references "poms"."lead" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."lead_score_snapshot" add constraint "chk_lss_snapshot_kind" check ("snapshot_kind" in ('system', 'manual-override', 'override-revoked'));`);
        this.addSql(`alter table "poms"."lead_score_snapshot" add constraint "chk_lss_system_score_range" check ("system_score" >= 0 and "system_score" <= 100);`);
        this.addSql(`alter table "poms"."lead_score_snapshot" add constraint "chk_lss_effective_score_range" check ("effective_score" >= 0 and "effective_score" <= 100);`);
        this.addSql(`alter table "poms"."lead_score_snapshot" add constraint "chk_lss_system_rating" check ("system_rating" in ('A', 'B', 'C', 'D'));`);
        this.addSql(`alter table "poms"."lead_score_snapshot" add constraint "chk_lss_effective_rating" check ("effective_rating" in ('A', 'B', 'C', 'D'));`);
        this.addSql(`alter table "poms"."lead_score_snapshot" add constraint "chk_lss_effective_score_source" check ("effective_score_source" in ('system', 'manual-override'));`);
        this.addSql(`create index "idx_lss_lead_created" on "poms"."lead_score_snapshot" ("lead_id", "created_at");`);
        this.addSql(`create index "idx_lss_kind_created" on "poms"."lead_score_snapshot" ("snapshot_kind", "created_at");`);
        this.addSql(`create index "idx_lss_source_record" on "poms"."lead_score_snapshot" ("source_record_id");`);

        this.addSql(`
            create table "poms"."lead_score_override" (
                "id" uuid not null default gen_random_uuid(),
                "lead_id" uuid not null,
                "requested_score" int not null,
                "requested_rating" varchar(8) not null,
                "reason" text not null,
                "status" varchar(32) not null default 'pending',
                "system_score_at_request" int not null,
                "system_rating_at_request" varchar(8) not null,
                "requested_by" uuid null,
                "requested_at" timestamptz not null default now(),
                "approved_by" uuid null,
                "approved_at" timestamptz null,
                "approval_note" text null,
                "rejected_by" uuid null,
                "rejected_at" timestamptz null,
                "reject_reason" text null,
                "revoked_by" uuid null,
                "revoked_at" timestamptz null,
                "revoke_reason" text null,
                "superseded_by_id" uuid null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                "row_version" int not null default 1,
                constraint "pk_lead_score_override" primary key ("id")
            );
        `);
        this.addSql(`alter table "poms"."lead_score_override" add constraint "lead_score_override_lead_id_foreign" foreign key ("lead_id") references "poms"."lead" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."lead_score_override" add constraint "chk_lso_status" check ("status" in ('pending', 'approved', 'rejected', 'revoked', 'superseded'));`);
        this.addSql(`alter table "poms"."lead_score_override" add constraint "chk_lso_requested_score_range" check ("requested_score" >= 0 and "requested_score" <= 100);`);
        this.addSql(`alter table "poms"."lead_score_override" add constraint "chk_lso_requested_rating" check ("requested_rating" in ('A', 'B', 'C', 'D'));`);
        this.addSql(`alter table "poms"."lead_score_override" add constraint "chk_lso_system_score_at_request_range" check ("system_score_at_request" >= 0 and "system_score_at_request" <= 100);`);
        this.addSql(`alter table "poms"."lead_score_override" add constraint "chk_lso_system_rating_at_request" check ("system_rating_at_request" in ('A', 'B', 'C', 'D'));`);
        this.addSql(`create index "idx_lso_lead_status" on "poms"."lead_score_override" ("lead_id", "status");`);
        this.addSql(`create index "idx_lso_requested_at" on "poms"."lead_score_override" ("requested_at");`);
        this.addSql(`create index "idx_lso_superseded_by" on "poms"."lead_score_override" ("superseded_by_id");`);
        this.addSql(`create unique index "uq_lso_lead_pending" on "poms"."lead_score_override" ("lead_id") where "status" = 'pending';`);
        this.addSql(`create unique index "uq_lso_lead_approved" on "poms"."lead_score_override" ("lead_id") where "status" = 'approved';`);

        this.addSql(`comment on table "poms"."lead_score_snapshot" is '线索评分历史快照';`);
        this.addSql(`comment on table "poms"."lead_score_override" is '线索评分人工覆盖记录';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."id" is '评分快照主键';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."lead_id" is '线索 ID';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."snapshot_kind" is '快照类型';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."override_id" is '关联人工覆盖记录 ID';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."formula_version" is '评分公式版本';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."system_score" is '当时系统评分';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."system_rating" is '当时系统评级';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."effective_score" is '当时有效评分';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."effective_rating" is '当时有效评级';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."effective_score_source" is '有效评分来源';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."score_reason" is '评分说明';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."component_breakdown" is '评分组件摘要';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."gate_summary_snapshot" is '硬闸口摘要快照';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."source_command" is '触发命令';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."source_record_id" is '触发记录 ID';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."lead_score_snapshot"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."lead_score_override"."id" is '人工覆盖记录主键';`);
        this.addSql(`comment on column "poms"."lead_score_override"."lead_id" is '线索 ID';`);
        this.addSql(`comment on column "poms"."lead_score_override"."requested_score" is '请求覆盖评分';`);
        this.addSql(`comment on column "poms"."lead_score_override"."requested_rating" is '请求覆盖评级';`);
        this.addSql(`comment on column "poms"."lead_score_override"."reason" is '提交原因';`);
        this.addSql(`comment on column "poms"."lead_score_override"."status" is '覆盖审批状态';`);
        this.addSql(`comment on column "poms"."lead_score_override"."system_score_at_request" is '提交时系统评分';`);
        this.addSql(`comment on column "poms"."lead_score_override"."system_rating_at_request" is '提交时系统评级';`);
        this.addSql(`comment on column "poms"."lead_score_override"."requested_by" is '提交人';`);
        this.addSql(`comment on column "poms"."lead_score_override"."requested_at" is '提交时间';`);
        this.addSql(`comment on column "poms"."lead_score_override"."approved_by" is '批准人';`);
        this.addSql(`comment on column "poms"."lead_score_override"."approved_at" is '批准时间';`);
        this.addSql(`comment on column "poms"."lead_score_override"."approval_note" is '批准说明';`);
        this.addSql(`comment on column "poms"."lead_score_override"."rejected_by" is '驳回人';`);
        this.addSql(`comment on column "poms"."lead_score_override"."rejected_at" is '驳回时间';`);
        this.addSql(`comment on column "poms"."lead_score_override"."reject_reason" is '驳回原因';`);
        this.addSql(`comment on column "poms"."lead_score_override"."revoked_by" is '撤销人';`);
        this.addSql(`comment on column "poms"."lead_score_override"."revoked_at" is '撤销时间';`);
        this.addSql(`comment on column "poms"."lead_score_override"."revoke_reason" is '撤销原因';`);
        this.addSql(`comment on column "poms"."lead_score_override"."superseded_by_id" is '替代本记录的新覆盖记录 ID';`);
        this.addSql(`comment on column "poms"."lead_score_override"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."lead_score_override"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."lead_score_override"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."lead_score_override"."row_version" is '乐观锁版本号';`);
    }
}
