import { Migration } from '@mikro-orm/migrations';

export class Migration20260501110000_ex56a_project_status_stage_checks extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."project" drop constraint if exists "chk_project_status";`);
        this.addSql(`alter table "poms"."project" drop constraint if exists "chk_project_current_stage";`);

        this.addSql(`
            update "poms"."project"
            set "current_stage" = case "current_stage"
                when 'lead' then 'assessment'
                when 'opportunity' then 'scope-confirmation'
                when 'proposal' then 'commercial-closure'
                when 'negotiation' then 'contracting'
                else "current_stage"
            end
            where "current_stage" in ('lead', 'opportunity', 'proposal', 'negotiation');
        `);

        this.addSql(`
            update "poms"."project"
            set
                "status" = case "status"
                    when 'draft' then 'active'
                    when 'suspended' then 'on-hold'
                    when 'closed_won' then 'completed'
                    when 'closed_lost' then 'closed'
                    when 'closed-lost' then 'closed'
                    when 'closed-terminated' then 'closed'
                    else "status"
                end,
                "current_stage" = case
                    when "status" = 'closed_won' then 'completed'
                    when "status" in ('closed_lost', 'closed-lost') then 'closed-lost'
                    when "status" = 'closed-terminated' then 'closed-terminated'
                    else "current_stage"
                end
            where "status" in ('draft', 'suspended', 'closed_won', 'closed_lost', 'closed-lost', 'closed-terminated');
        `);

        this.addSql(`alter table "poms"."project" add constraint "chk_project_status" check ("status" in ('active', 'pending-approval', 'blocked', 'on-hold', 'completed', 'closed'));`);
        this.addSql(
            `alter table "poms"."project" add constraint "chk_project_current_stage" check ("current_stage" in ('assessment', 'scope-confirmation', 'commercial-closure', 'contracting', 'handover', 'execution', 'acceptance', 'completed', 'closed-lost', 'closed-terminated'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."project" drop constraint if exists "chk_project_current_stage";`);
        this.addSql(`alter table "poms"."project" drop constraint if exists "chk_project_status";`);
    }
}
