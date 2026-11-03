import { Migration } from '@mikro-orm/migrations';

export class Migration20260422031100_add_contract_term_snapshot_core_fields extends Migration {
    override async up(): Promise<void> {
        // commercial_release_baseline: 新增结构化条款列
        this.addSql(`alter table "poms"."commercial_release_baseline" add column "amount_tax_inclusive" numeric(18,2) null;`);
        this.addSql(`comment on column "poms"."commercial_release_baseline"."amount_tax_inclusive" is '含税金额';`);

        this.addSql(`alter table "poms"."commercial_release_baseline" add column "amount_tax_exclusive" numeric(18,2) null;`);
        this.addSql(`comment on column "poms"."commercial_release_baseline"."amount_tax_exclusive" is '未税金额';`);

        this.addSql(`alter table "poms"."commercial_release_baseline" add column "tax_rate" numeric(5,4) null;`);
        this.addSql(`comment on column "poms"."commercial_release_baseline"."tax_rate" is '税率，如 0.13';`);

        this.addSql(`alter table "poms"."commercial_release_baseline" add column "down_payment_rate" numeric(5,4) null;`);
        this.addSql(`comment on column "poms"."commercial_release_baseline"."down_payment_rate" is '首付款比例';`);

        this.addSql(`alter table "poms"."commercial_release_baseline" add column "retention_rate" numeric(5,4) null;`);
        this.addSql(`comment on column "poms"."commercial_release_baseline"."retention_rate" is '质保金比例';`);

        this.addSql(`alter table "poms"."commercial_release_baseline" add column "payment_terms" varchar(1000) null;`);
        this.addSql(`comment on column "poms"."commercial_release_baseline"."payment_terms" is '付款条款文本或 JSON 摘要';`);

        // contract_term_snapshot: 新增核心条款列与来源链
        this.addSql(`alter table "poms"."contract_term_snapshot" add column "amount_tax_inclusive" numeric(18,2) null;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."amount_tax_inclusive" is '含税金额';`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add column "amount_tax_exclusive" numeric(18,2) null;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."amount_tax_exclusive" is '未税金额';`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add column "tax_rate" numeric(5,4) null;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."tax_rate" is '税率';`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add column "down_payment_rate" numeric(5,4) null;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."down_payment_rate" is '首付款比例';`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add column "retention_rate" numeric(5,4) null;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."retention_rate" is '质保金比例';`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add column "payment_terms" varchar(1000) null;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."payment_terms" is '付款条款';`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add column "source_readiness_id" uuid null;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."source_readiness_id" is '来源签约就绪包 ID';`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add column "source_baseline_id" uuid null;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."source_baseline_id" is '来源商业放行基线 ID';`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add column "version" int not null default 1;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."version" is '快照版本号';`);

        // 补充索引与外键
        this.addSql(`create index "idx_contract_term_snapshot_baseline" on "poms"."contract_term_snapshot" ("source_baseline_id");`);
        this.addSql(`create index "idx_contract_term_snapshot_readiness" on "poms"."contract_term_snapshot" ("source_readiness_id");`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add constraint "contract_term_snapshot_source_readiness_fk" foreign key ("source_readiness_id") references "poms"."contract_readiness_package" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."contract_term_snapshot" add constraint "contract_term_snapshot_source_baseline_fk" foreign key ("source_baseline_id") references "poms"."commercial_release_baseline" ("id") on update cascade on delete restrict;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."contract_term_snapshot" drop constraint if exists "contract_term_snapshot_source_baseline_fk";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop constraint if exists "contract_term_snapshot_source_readiness_fk";`);

        this.addSql(`drop index if exists "poms"."idx_contract_term_snapshot_readiness";`);
        this.addSql(`drop index if exists "poms"."idx_contract_term_snapshot_baseline";`);

        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "version";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "source_baseline_id";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "source_readiness_id";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "payment_terms";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "retention_rate";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "down_payment_rate";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "tax_rate";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "amount_tax_exclusive";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "amount_tax_inclusive";`);

        this.addSql(`alter table "poms"."commercial_release_baseline" drop column if exists "payment_terms";`);
        this.addSql(`alter table "poms"."commercial_release_baseline" drop column if exists "retention_rate";`);
        this.addSql(`alter table "poms"."commercial_release_baseline" drop column if exists "down_payment_rate";`);
        this.addSql(`alter table "poms"."commercial_release_baseline" drop column if exists "tax_rate";`);
        this.addSql(`alter table "poms"."commercial_release_baseline" drop column if exists "amount_tax_exclusive";`);
        this.addSql(`alter table "poms"."commercial_release_baseline" drop column if exists "amount_tax_inclusive";`);
    }
}
