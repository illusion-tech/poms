import { Migration } from '@mikro-orm/migrations';

export class Migration20260415130000_ex08b3b0_contract_amendment extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "poms"."contract_amendment" ("id" uuid not null default gen_random_uuid(), "contract_id" uuid not null, "version" integer not null, "is_current" boolean not null default false, "supersedes_id" uuid null, "status" varchar(32) not null default 'draft', "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, "row_version" integer not null default 1, constraint "contract_amendment_pkey" primary key ("id"));`
        );
        this.addSql(`comment on table "poms"."contract_amendment" is '合同变更版本表';`);
        this.addSql(`comment on column "poms"."contract_amendment"."id" is '主键';`);
        this.addSql(`comment on column "poms"."contract_amendment"."contract_id" is '所属合同 ID';`);
        this.addSql(`comment on column "poms"."contract_amendment"."version" is '合同变更版本号';`);
        this.addSql(`comment on column "poms"."contract_amendment"."is_current" is '是否当前有效变更版本';`);
        this.addSql(`comment on column "poms"."contract_amendment"."supersedes_id" is '被替代的合同变更版本';`);
        this.addSql(`comment on column "poms"."contract_amendment"."status" is '状态：draft/submitted/approved/effective/superseded/voided';`);
        this.addSql(`comment on column "poms"."contract_amendment"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."contract_amendment"."created_by" is '创建人';`);
        this.addSql(`comment on column "poms"."contract_amendment"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."contract_amendment"."updated_by" is '最后更新人';`);
        this.addSql(`comment on column "poms"."contract_amendment"."row_version" is '乐观锁版本号';`);

        this.addSql(
            `alter table "poms"."contract_amendment" add constraint "contract_amendment_contract_id_foreign" foreign key ("contract_id") references "poms"."contract" ("id") on update cascade on delete restrict;`
        );
        this.addSql(
            `alter table "poms"."contract_amendment" add constraint "contract_amendment_supersedes_id_foreign" foreign key ("supersedes_id") references "poms"."contract_amendment" ("id") on update cascade on delete set null;`
        );
        this.addSql(`create index "idx_contract_amendment_contract" on "poms"."contract_amendment" ("contract_id");`);
        this.addSql(`create index "idx_contract_amendment_status" on "poms"."contract_amendment" ("status");`);
        this.addSql(`create index "idx_contract_amendment_supersedes" on "poms"."contract_amendment" ("supersedes_id");`);
        this.addSql(
            `alter table "poms"."contract_amendment" add constraint "uq_contract_amendment_contract_version" unique ("contract_id", "version");`
        );
        this.addSql(
            `create unique index "uq_contract_amendment_contract_current" on "poms"."contract_amendment" ("contract_id") where "is_current" = true;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."contract_amendment" cascade;`);
    }
}
