import { Migration } from '@mikro-orm/migrations';

export class Migration20260322233000_init_contract extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "poms"."contract" ("id" uuid not null default gen_random_uuid(), "project_id" uuid not null, "contract_no" varchar(64) not null, "status" varchar(32) not null, "signed_amount" numeric(18,2) not null default 0, "currency_code" varchar(16) not null default 'CNY', "current_snapshot_id" uuid null, "signed_at" timestamptz null, "row_version" integer not null default 1, "created_at" timestamptz not null default now(), "created_by" uuid null, "updated_at" timestamptz not null default now(), "updated_by" uuid null, constraint "contract_pkey" primary key ("id"), constraint "contract_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict);`
        );

        this.addSql(`comment on table "poms"."contract" is 'POMS 第一阶段合同主表';`);
        this.addSql(`comment on column "poms"."contract"."id" is '合同主键';`);
        this.addSql(`comment on column "poms"."contract"."project_id" is '所属项目标识';`);
        this.addSql(`comment on column "poms"."contract"."contract_no" is '合同编号';`);
        this.addSql(`comment on column "poms"."contract"."status" is '合同状态';`);
        this.addSql(`comment on column "poms"."contract"."signed_amount" is '合同签约金额';`);
        this.addSql(`comment on column "poms"."contract"."currency_code" is '币种代码';`);
        this.addSql(`comment on column "poms"."contract"."current_snapshot_id" is '当前生效条款快照标识';`);
        this.addSql(`comment on column "poms"."contract"."signed_at" is '签约时间';`);
        this.addSql(`comment on column "poms"."contract"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."contract"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."contract"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."contract"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."contract"."updated_by" is '最后更新人标识';`);

        this.addSql(`alter table "poms"."contract" add constraint "contract_contract_no_unique" unique ("contract_no");`);
        this.addSql(`create index "idx_contract_project_id" on "poms"."contract" ("project_id");`);
        this.addSql(`create index "idx_contract_status" on "poms"."contract" ("status");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."contract" cascade;`);
    }
}
