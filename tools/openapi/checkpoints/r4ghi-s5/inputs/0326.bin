import { Migration } from '@mikro-orm/migrations';

export class Migration20260501120000_ex56b_todo_approval_enum_checks extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_approval_type";`);
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_business_domain";`);
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_target_object_type";`);
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_current_status";`);
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_decision";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_source_type";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_todo_type";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_business_domain";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_target_object_type";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_status";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_priority";`);

        this.addSql(
            `alter table "poms"."approval_record" add constraint "chk_approval_record_approval_type" check ("approval_type" in ('contract-review', 'commission-payout-approval', 'commission-adjustment-approval'));`
        );
        this.addSql(
            `alter table "poms"."approval_record" add constraint "chk_approval_record_business_domain" check ("business_domain" in ('contract-finance', 'commission', 'sales', 'project-handover'));`
        );
        this.addSql(
            `alter table "poms"."approval_record" add constraint "chk_approval_record_target_object_type" check ("target_object_type" in ('Contract', 'CommissionPayout', 'CommissionAdjustment', 'Project', 'Lead', 'Customer', 'ProjectHandover'));`
        );
        this.addSql(
            `alter table "poms"."approval_record" add constraint "chk_approval_record_current_status" check ("current_status" in ('pending', 'approved', 'rejected'));`
        );
        this.addSql(
            `alter table "poms"."approval_record" add constraint "chk_approval_record_decision" check ("decision" in ('approved', 'rejected'));`
        );
        this.addSql(
            `alter table "poms"."todo_item" add constraint "chk_todo_item_source_type" check ("source_type" in ('ApprovalRecord', 'ConfirmationRecord', 'SalesFollowUpRecord'));`
        );
        this.addSql(
            `alter table "poms"."todo_item" add constraint "chk_todo_item_todo_type" check ("todo_type" in ('approval', 'confirmation', 'sales_follow_up_reminder'));`
        );
        this.addSql(
            `alter table "poms"."todo_item" add constraint "chk_todo_item_business_domain" check ("business_domain" in ('contract-finance', 'commission', 'sales', 'project-handover'));`
        );
        this.addSql(
            `alter table "poms"."todo_item" add constraint "chk_todo_item_target_object_type" check ("target_object_type" in ('Contract', 'CommissionPayout', 'CommissionAdjustment', 'Project', 'Lead', 'Customer', 'ProjectHandover'));`
        );
        this.addSql(
            `alter table "poms"."todo_item" add constraint "chk_todo_item_status" check ("status" in ('open', 'processing', 'completed', 'canceled'));`
        );
        this.addSql(`alter table "poms"."todo_item" add constraint "chk_todo_item_priority" check ("priority" in ('low', 'normal', 'high', 'urgent'));`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_priority";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_status";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_target_object_type";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_business_domain";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_todo_type";`);
        this.addSql(`alter table "poms"."todo_item" drop constraint if exists "chk_todo_item_source_type";`);
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_decision";`);
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_current_status";`);
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_target_object_type";`);
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_business_domain";`);
        this.addSql(`alter table "poms"."approval_record" drop constraint if exists "chk_approval_record_approval_type";`);
    }
}
