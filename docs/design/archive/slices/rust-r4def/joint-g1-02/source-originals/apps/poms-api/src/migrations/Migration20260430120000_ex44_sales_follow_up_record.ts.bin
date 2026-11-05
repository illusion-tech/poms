import { Migration } from '@mikro-orm/migrations';

export class Migration20260430120000_ex44_sales_follow_up_record extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."sales_follow_up_record" (
                "id" uuid not null default gen_random_uuid(),
                "customer_id" uuid not null,
                "lead_id" uuid null,
                "project_id" uuid null,
                "follow_up_type" varchar(32) not null,
                "occurred_at" timestamptz not null,
                "summary" text not null,
                "detail" text null,
                "outcome" varchar(32) not null,
                "next_follow_up_at" timestamptz null,
                "owner_org_id" uuid null,
                "owner_user_id" uuid null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "sales_follow_up_record_pkey" primary key ("id")
            );
        `);

        this.addSql(`alter table "poms"."sales_follow_up_record" add constraint "sales_follow_up_customer_id_foreign" foreign key ("customer_id") references "poms"."customer" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."sales_follow_up_record" add constraint "sales_follow_up_lead_id_foreign" foreign key ("lead_id") references "poms"."lead" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."sales_follow_up_record" add constraint "sales_follow_up_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."sales_follow_up_record" add constraint "sales_follow_up_owner_org_id_foreign" foreign key ("owner_org_id") references "poms"."org_unit" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."sales_follow_up_record" add constraint "sales_follow_up_owner_user_id_foreign" foreign key ("owner_user_id") references "poms"."platform_user" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."sales_follow_up_record" add constraint "chk_sales_follow_up_type" check ("follow_up_type" in ('phone', 'meeting', 'wechat', 'email', 'onsite', 'other'));`);
        this.addSql(`alter table "poms"."sales_follow_up_record" add constraint "chk_sales_follow_up_outcome" check ("outcome" in ('progress', 'waiting-customer', 'risk-discovered', 'deferred', 'close-recommended', 'no-response', 'other'));`);

        this.addSql(`create index "idx_sales_follow_up_customer_occurred" on "poms"."sales_follow_up_record" ("customer_id", "occurred_at" desc);`);
        this.addSql(`create index "idx_sales_follow_up_lead_occurred" on "poms"."sales_follow_up_record" ("lead_id", "occurred_at" desc);`);
        this.addSql(`create index "idx_sales_follow_up_project_occurred" on "poms"."sales_follow_up_record" ("project_id", "occurred_at" desc);`);
        this.addSql(`create index "idx_sales_follow_up_owner_user_id" on "poms"."sales_follow_up_record" ("owner_user_id");`);
        this.addSql(`create index "idx_sales_follow_up_next_at" on "poms"."sales_follow_up_record" ("next_follow_up_at");`);

        this.addSql(`comment on table "poms"."sales_follow_up_record" is '客户/线索/项目共享销售跟进记录';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."id" is '销售跟进记录主键';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."customer_id" is '客户主数据标识';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."lead_id" is '线索上下文标识';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."project_id" is '项目上下文标识';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."follow_up_type" is '跟进方式';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."occurred_at" is '实际跟进时间';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."summary" is '跟进摘要';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."detail" is '跟进详情';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."outcome" is '跟进结果';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."next_follow_up_at" is '下次跟进时间';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."owner_org_id" is '跟进责任组织标识';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."owner_user_id" is '跟进责任人标识';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."sales_follow_up_record"."updated_by" is '最后更新人标识';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."sales_follow_up_record" cascade;`);
    }
}
