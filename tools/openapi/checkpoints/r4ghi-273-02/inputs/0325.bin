import { Migration } from '@mikro-orm/migrations';

export class Migration20260430180000_ex47_lead_scoring_and_gate_explanation extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."lead" add column "score" integer not null default 0;`);
        this.addSql(`alter table "poms"."lead" add column "rating" varchar(8) not null default 'D';`);
        this.addSql(`alter table "poms"."lead" add column "score_reason" text not null default '暂无有效评分事实';`);
        this.addSql(`alter table "poms"."lead" add column "score_updated_at" timestamptz not null default now();`);

        this.addSql(`
            with scored as (
                select
                    "id",
                    least(
                        100,
                        (case when "source_id" is not null then 10 else 0 end) +
                        (case
                            when length(btrim(coalesce("demand_description", ''))) >= 30 then 15
                            when length(btrim(coalesce("demand_description", ''))) > 0 then 10
                            else 0
                        end) +
                        (case "budget_status"
                            when 'rough-budget' then 15
                            when 'budget-confirmed' then 20
                            when 'budget-approved' then 25
                            else 0
                        end) +
                        (case when "estimated_amount" is not null and "estimated_amount" > 0 then 15 else 0 end) +
                        (case "urgency"
                            when 'low' then 5
                            when 'normal' then 10
                            when 'high' then 15
                            when 'critical' then 15
                            else 0
                        end) +
                        (case when "expected_decision_date" is not null then 10 else 0 end) +
                        (case when "owner_user_id" is not null and "owner_org_id" is not null then 10 else 0 end)
                    ) as "score"
                from "poms"."lead"
            )
            update "poms"."lead" lead
            set
                "score" = scored."score",
                "rating" = case
                    when scored."score" >= 80 then 'A'
                    when scored."score" >= 60 then 'B'
                    when scored."score" >= 40 then 'C'
                    else 'D'
                end,
                "score_reason" = concat('历史数据按 EX-47 规则回填，当前评分 ', scored."score"),
                "score_updated_at" = now()
            from scored
            where lead."id" = scored."id";
        `);

        this.addSql(`alter table "poms"."lead" add constraint "chk_lead_score_range" check ("score" >= 0 and "score" <= 100);`);
        this.addSql(`alter table "poms"."lead" add constraint "chk_lead_rating" check ("rating" in ('A', 'B', 'C', 'D'));`);
        this.addSql(`create index "idx_lead_rating_score" on "poms"."lead" ("rating", "score");`);
        this.addSql(`comment on column "poms"."lead"."score" is '线索评分，范围 0-100';`);
        this.addSql(`comment on column "poms"."lead"."rating" is '线索评级';`);
        this.addSql(`comment on column "poms"."lead"."score_reason" is '线索评分说明';`);
        this.addSql(`comment on column "poms"."lead"."score_updated_at" is '线索评分更新时间';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."idx_lead_rating_score";`);
        this.addSql(`alter table "poms"."lead" drop constraint if exists "chk_lead_rating";`);
        this.addSql(`alter table "poms"."lead" drop constraint if exists "chk_lead_score_range";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "score_updated_at";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "score_reason";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "rating";`);
        this.addSql(`alter table "poms"."lead" drop column if exists "score";`);
    }
}
