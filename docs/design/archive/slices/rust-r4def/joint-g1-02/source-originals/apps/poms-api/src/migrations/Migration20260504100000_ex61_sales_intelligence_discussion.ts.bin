import { Migration } from '@mikro-orm/migrations';

export class Migration20260504100000_ex61_sales_intelligence_discussion extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."customer_contact" (
                "id" uuid not null default gen_random_uuid(),
                "customer_id" uuid not null,
                "name" varchar(128) not null,
                "department" varchar(128) null,
                "title" varchar(128) null,
                "work_phone" varchar(64) null,
                "mobile" varchar(64) null,
                "wechat" varchar(128) null,
                "email" varchar(255) null,
                "remark" text null,
                "status" varchar(32) not null default 'active',
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "customer_contact_pkey" primary key ("id")
            );
        `);

        this.addSql(`
            create table "poms"."opportunity_stakeholder" (
                "id" uuid not null default gen_random_uuid(),
                "customer_id" uuid not null,
                "lead_id" uuid null,
                "project_id" uuid null,
                "contact_id" uuid not null,
                "role" varchar(64) not null,
                "attitude" varchar(32) not null default 'unknown',
                "influence_level" varchar(32) not null default 'unknown',
                "access_level" varchar(32) not null default 'unknown',
                "focus_areas_json" jsonb not null default '[]'::jsonb,
                "communication_notes" text null,
                "is_primary" boolean not null default false,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "opportunity_stakeholder_pkey" primary key ("id")
            );
        `);

        this.addSql(`
            create table "poms"."competitor_intelligence_record" (
                "id" uuid not null default gen_random_uuid(),
                "customer_id" uuid not null,
                "lead_id" uuid null,
                "project_id" uuid null,
                "competitor_name" varchar(255) not null,
                "position" varchar(64) not null default 'unknown',
                "customer_preference" varchar(64) not null default 'unknown',
                "competitor_strengths" text null,
                "competitor_weaknesses" text null,
                "our_advantages" text null,
                "our_risks" text null,
                "win_probability" varchar(32) not null default 'unknown',
                "evidence" text null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "competitor_intelligence_record_pkey" primary key ("id")
            );
        `);

        this.addSql(`
            create table "poms"."sales_discovery_record" (
                "id" uuid not null default gen_random_uuid(),
                "customer_id" uuid not null,
                "lead_id" uuid null,
                "project_id" uuid null,
                "procurement_process" text null,
                "budget_source" text null,
                "customer_pain_points" text null,
                "decision_cycle" text null,
                "next_contact_plan" text null,
                "remark" text null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "sales_discovery_record_pkey" primary key ("id")
            );
        `);

        this.addSql(`
            create table "poms"."business_discussion_thread" (
                "id" uuid not null default gen_random_uuid(),
                "target_object_type" varchar(64) not null,
                "target_object_id" uuid not null,
                "customer_id" uuid null,
                "lead_id" uuid null,
                "project_id" uuid null,
                "target_title" varchar(255) not null,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                constraint "business_discussion_thread_pkey" primary key ("id")
            );
        `);

        this.addSql(`
            create table "poms"."business_discussion_comment" (
                "id" uuid not null default gen_random_uuid(),
                "thread_id" uuid not null,
                "discussion_type" varchar(64) not null,
                "body" text not null,
                "related_contact_id" uuid null,
                "related_competitor_record_id" uuid null,
                "related_follow_up_record_id" uuid null,
                "is_pinned" boolean not null default false,
                "is_key_conclusion" boolean not null default false,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                constraint "business_discussion_comment_pkey" primary key ("id")
            );
        `);

        this.addSql(`alter table "poms"."customer_contact" add constraint "customer_contact_customer_id_foreign" foreign key ("customer_id") references "poms"."customer" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."customer_contact" add constraint "chk_customer_contact_status" check ("status" in ('active', 'inactive'));`);

        this.addSql(`alter table "poms"."opportunity_stakeholder" add constraint "opportunity_stakeholder_customer_id_foreign" foreign key ("customer_id") references "poms"."customer" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."opportunity_stakeholder" add constraint "opportunity_stakeholder_lead_id_foreign" foreign key ("lead_id") references "poms"."lead" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."opportunity_stakeholder" add constraint "opportunity_stakeholder_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."opportunity_stakeholder" add constraint "opportunity_stakeholder_contact_id_foreign" foreign key ("contact_id") references "poms"."customer_contact" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."opportunity_stakeholder" add constraint "chk_opportunity_stakeholder_anchor" check ("lead_id" is not null or "project_id" is not null);`);
        this.addSql(`alter table "poms"."opportunity_stakeholder" add constraint "chk_opportunity_stakeholder_role" check ("role" in ('decision-maker', 'influencer', 'end-user', 'technical-evaluator', 'procurement-contact', 'finance-legal', 'sponsor', 'blocker', 'unknown', 'other'));`);
        this.addSql(`alter table "poms"."opportunity_stakeholder" add constraint "chk_opportunity_stakeholder_attitude" check ("attitude" in ('supportive', 'neutral', 'resistant', 'unknown'));`);
        this.addSql(`alter table "poms"."opportunity_stakeholder" add constraint "chk_opportunity_stakeholder_influence" check ("influence_level" in ('high', 'medium', 'low', 'unknown'));`);
        this.addSql(`alter table "poms"."opportunity_stakeholder" add constraint "chk_opportunity_stakeholder_access" check ("access_level" in ('direct', 'indirect', 'unknown', 'blocked'));`);

        this.addSql(`alter table "poms"."competitor_intelligence_record" add constraint "competitor_intelligence_customer_id_foreign" foreign key ("customer_id") references "poms"."customer" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."competitor_intelligence_record" add constraint "competitor_intelligence_lead_id_foreign" foreign key ("lead_id") references "poms"."lead" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."competitor_intelligence_record" add constraint "competitor_intelligence_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."competitor_intelligence_record" add constraint "chk_competitor_intelligence_anchor" check ("lead_id" is not null or "project_id" is not null);`);
        this.addSql(`alter table "poms"."competitor_intelligence_record" add constraint "chk_competitor_position" check ("position" in ('incumbent', 'active-competitor', 'potential-competitor', 'unknown'));`);
        this.addSql(`alter table "poms"."competitor_intelligence_record" add constraint "chk_competitor_customer_preference" check ("customer_preference" in ('toward-us', 'neutral', 'toward-competitor', 'unknown'));`);
        this.addSql(`alter table "poms"."competitor_intelligence_record" add constraint "chk_competitor_win_probability" check ("win_probability" in ('high', 'medium', 'low', 'unknown'));`);

        this.addSql(`alter table "poms"."sales_discovery_record" add constraint "sales_discovery_customer_id_foreign" foreign key ("customer_id") references "poms"."customer" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."sales_discovery_record" add constraint "sales_discovery_lead_id_foreign" foreign key ("lead_id") references "poms"."lead" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."sales_discovery_record" add constraint "sales_discovery_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."sales_discovery_record" add constraint "chk_sales_discovery_anchor" check ("lead_id" is not null or "project_id" is not null);`);

        this.addSql(`alter table "poms"."business_discussion_thread" add constraint "business_discussion_thread_customer_id_foreign" foreign key ("customer_id") references "poms"."customer" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."business_discussion_thread" add constraint "business_discussion_thread_lead_id_foreign" foreign key ("lead_id") references "poms"."lead" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."business_discussion_thread" add constraint "business_discussion_thread_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."business_discussion_thread" add constraint "chk_business_discussion_thread_target" check ("target_object_type" in ('customer', 'lead', 'project'));`);
        this.addSql(`alter table "poms"."business_discussion_thread" add constraint "uq_business_discussion_thread_target" unique ("target_object_type", "target_object_id");`);

        this.addSql(`alter table "poms"."business_discussion_comment" add constraint "business_discussion_comment_thread_id_foreign" foreign key ("thread_id") references "poms"."business_discussion_thread" ("id") on update cascade on delete restrict;`);
        this.addSql(`alter table "poms"."business_discussion_comment" add constraint "business_discussion_comment_contact_id_foreign" foreign key ("related_contact_id") references "poms"."customer_contact" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."business_discussion_comment" add constraint "business_discussion_comment_competitor_id_foreign" foreign key ("related_competitor_record_id") references "poms"."competitor_intelligence_record" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."business_discussion_comment" add constraint "business_discussion_comment_follow_up_id_foreign" foreign key ("related_follow_up_record_id") references "poms"."sales_follow_up_record" ("id") on update cascade on delete set null;`);
        this.addSql(`alter table "poms"."business_discussion_comment" add constraint "chk_business_discussion_type" check ("discussion_type" in ('intelligence-supplement', 'decision-chain', 'competition', 'strategy', 'risk', 'general'));`);

        this.addSql(`comment on table "poms"."customer_contact" is '客户联系人基础资料';`);
        this.addSql(`comment on column "poms"."customer_contact"."id" is '客户联系人主键';`);
        this.addSql(`comment on column "poms"."customer_contact"."customer_id" is '客户主数据标识';`);
        this.addSql(`comment on column "poms"."customer_contact"."name" is '联系人姓名';`);
        this.addSql(`comment on column "poms"."customer_contact"."department" is '客户单位部门';`);
        this.addSql(`comment on column "poms"."customer_contact"."title" is '客户单位职务 / 岗位';`);
        this.addSql(`comment on column "poms"."customer_contact"."work_phone" is '工作电话';`);
        this.addSql(`comment on column "poms"."customer_contact"."mobile" is '手机号 / 工作手机';`);
        this.addSql(`comment on column "poms"."customer_contact"."wechat" is '微信 / IM 联系方式';`);
        this.addSql(`comment on column "poms"."customer_contact"."email" is '工作邮箱';`);
        this.addSql(`comment on column "poms"."customer_contact"."remark" is '业务备注';`);
        this.addSql(`comment on column "poms"."customer_contact"."status" is '联系人状态';`);
        this.addSql(`comment on column "poms"."customer_contact"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."customer_contact"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."customer_contact"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."customer_contact"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."customer_contact"."updated_by" is '最后更新人标识';`);

        this.addSql(`comment on table "poms"."opportunity_stakeholder" is '线索 / 项目机会关系人与决策链记录';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."id" is '机会关系人主键';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."customer_id" is '客户主数据标识';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."lead_id" is '线索上下文标识';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."project_id" is '项目上下文标识';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."contact_id" is '客户联系人标识';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."role" is '当前机会中的角色';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."attitude" is '对当前机会的态度';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."influence_level" is '影响力等级';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."access_level" is '可接触程度';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."focus_areas_json" is '关注重点标签';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."communication_notes" is '业务沟通偏好 / 注意事项';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."is_primary" is '是否关键关系人';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."opportunity_stakeholder"."updated_by" is '最后更新人标识';`);

        this.addSql(`comment on table "poms"."competitor_intelligence_record" is '线索 / 项目竞争态势记录';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."id" is '竞争态势记录主键';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."customer_id" is '客户主数据标识';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."lead_id" is '线索上下文标识';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."project_id" is '项目上下文标识';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."competitor_name" is '竞争对手名称';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."position" is '竞争位置';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."customer_preference" is '客户倾向';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."competitor_strengths" is '对手优势';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."competitor_weaknesses" is '对手弱点';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."our_advantages" is '我方优势';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."our_risks" is '我方风险';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."win_probability" is '胜率判断';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."evidence" is '判断依据';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."competitor_intelligence_record"."updated_by" is '最后更新人标识';`);

        this.addSql(`comment on table "poms"."sales_discovery_record" is '线索 / 项目销售情报记录';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."id" is '销售情报记录主键';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."customer_id" is '客户主数据标识';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."lead_id" is '线索上下文标识';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."project_id" is '项目上下文标识';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."procurement_process" is '采购流程';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."budget_source" is '预算来源';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."customer_pain_points" is '客户核心痛点';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."decision_cycle" is '决策周期';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."next_contact_plan" is '下一步接触计划';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."remark" is '备注';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."row_version" is '乐观锁版本号';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."created_by" is '创建人标识';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."updated_at" is '最后更新时间';`);
        this.addSql(`comment on column "poms"."sales_discovery_record"."updated_by" is '最后更新人标识';`);

        this.addSql(`comment on table "poms"."business_discussion_thread" is '业务对象讨论板线程';`);
        this.addSql(`comment on column "poms"."business_discussion_thread"."id" is '讨论线程主键';`);
        this.addSql(`comment on column "poms"."business_discussion_thread"."target_object_type" is '目标对象类型';`);
        this.addSql(`comment on column "poms"."business_discussion_thread"."target_object_id" is '目标对象标识';`);
        this.addSql(`comment on column "poms"."business_discussion_thread"."customer_id" is '客户主数据标识';`);
        this.addSql(`comment on column "poms"."business_discussion_thread"."lead_id" is '线索标识';`);
        this.addSql(`comment on column "poms"."business_discussion_thread"."project_id" is '项目标识';`);
        this.addSql(`comment on column "poms"."business_discussion_thread"."target_title" is '目标对象标题快照';`);
        this.addSql(`comment on column "poms"."business_discussion_thread"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."business_discussion_thread"."created_by" is '创建人标识';`);

        this.addSql(`comment on table "poms"."business_discussion_comment" is '业务对象讨论评论';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."id" is '讨论评论主键';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."thread_id" is '讨论线程标识';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."discussion_type" is '讨论类型';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."body" is '讨论正文';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."related_contact_id" is '关联客户联系人标识';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."related_competitor_record_id" is '关联竞争态势记录标识';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."related_follow_up_record_id" is '关联销售跟进记录标识';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."is_pinned" is '是否置顶';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."is_key_conclusion" is '是否关键结论';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."created_at" is '创建时间';`);
        this.addSql(`comment on column "poms"."business_discussion_comment"."created_by" is '创建人标识';`);

        this.addSql(`create index "idx_customer_contact_customer_status" on "poms"."customer_contact" ("customer_id", "status");`);
        this.addSql(`create index "idx_opportunity_stakeholder_lead" on "poms"."opportunity_stakeholder" ("lead_id", "is_primary" desc, "updated_at" desc);`);
        this.addSql(`create index "idx_opportunity_stakeholder_project" on "poms"."opportunity_stakeholder" ("project_id", "is_primary" desc, "updated_at" desc);`);
        this.addSql(`create index "idx_opportunity_stakeholder_contact" on "poms"."opportunity_stakeholder" ("contact_id");`);
        this.addSql(`create index "idx_competitor_intelligence_lead" on "poms"."competitor_intelligence_record" ("lead_id", "updated_at" desc);`);
        this.addSql(`create index "idx_competitor_intelligence_project" on "poms"."competitor_intelligence_record" ("project_id", "updated_at" desc);`);
        this.addSql(`create index "idx_sales_discovery_lead" on "poms"."sales_discovery_record" ("lead_id", "updated_at" desc);`);
        this.addSql(`create index "idx_sales_discovery_project" on "poms"."sales_discovery_record" ("project_id", "updated_at" desc);`);
        this.addSql(`create index "idx_business_discussion_thread_customer" on "poms"."business_discussion_thread" ("customer_id");`);
        this.addSql(`create index "idx_business_discussion_thread_lead" on "poms"."business_discussion_thread" ("lead_id");`);
        this.addSql(`create index "idx_business_discussion_thread_project" on "poms"."business_discussion_thread" ("project_id");`);
        this.addSql(`create index "idx_business_discussion_comment_thread_created" on "poms"."business_discussion_comment" ("thread_id", "created_at" asc);`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."business_discussion_comment" cascade;`);
        this.addSql(`drop table if exists "poms"."business_discussion_thread" cascade;`);
        this.addSql(`drop table if exists "poms"."sales_discovery_record" cascade;`);
        this.addSql(`drop table if exists "poms"."competitor_intelligence_record" cascade;`);
        this.addSql(`drop table if exists "poms"."opportunity_stakeholder" cascade;`);
        this.addSql(`drop table if exists "poms"."customer_contact" cascade;`);
    }
}
