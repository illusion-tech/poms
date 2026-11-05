import { Migration } from '@mikro-orm/migrations';

export class Migration20260502100000_ex56d1_contract_finance_enum_checks extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."contract" drop constraint if exists "chk_contract_status";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop constraint if exists "chk_contract_term_snapshot_status";`);
        this.addSql(`alter table "poms"."receipt_record" drop constraint if exists "chk_receipt_record_status";`);
        this.addSql(`alter table "poms"."payable_record" drop constraint if exists "chk_payable_record_status";`);
        this.addSql(`alter table "poms"."payment_record" drop constraint if exists "chk_payment_record_status";`);
        this.addSql(`alter table "poms"."invoice_record" drop constraint if exists "chk_invoice_record_invoice_type";`);
        this.addSql(`alter table "poms"."invoice_record" drop constraint if exists "chk_invoice_record_status";`);
        this.addSql(`alter table "poms"."invoice_record" drop constraint if exists "chk_invoice_record_exception_status";`);
        this.addSql(`alter table "poms"."expense_record" drop constraint if exists "chk_expense_record_expense_category";`);
        this.addSql(`alter table "poms"."expense_record" drop constraint if exists "chk_expense_record_source_type";`);
        this.addSql(`alter table "poms"."expense_record" drop constraint if exists "chk_expense_record_status";`);

        this.addSql(`alter table "poms"."contract" add constraint "chk_contract_status" check ("status" in ('draft', 'pending-review', 'active', 'terminated', 'completed'));`);
        this.addSql(`alter table "poms"."contract_term_snapshot" add constraint "chk_contract_term_snapshot_status" check ("snapshot_status" in ('active', 'superseded', 'voided'));`);
        this.addSql(`alter table "poms"."receipt_record" add constraint "chk_receipt_record_status" check ("status" in ('draft', 'pending-confirmation', 'confirmed', 'reversed', 'void'));`);
        this.addSql(`alter table "poms"."payable_record" add constraint "chk_payable_record_status" check ("status" in ('draft', 'recorded', 'partially-paid', 'completed', 'closed', 'voided'));`);
        this.addSql(`alter table "poms"."payment_record" add constraint "chk_payment_record_status" check ("status" in ('draft', 'recorded', 'confirmed', 'void'));`);
        this.addSql(`alter table "poms"."invoice_record" add constraint "chk_invoice_record_invoice_type" check ("invoice_type" in ('input', 'output'));`);
        this.addSql(`alter table "poms"."invoice_record" add constraint "chk_invoice_record_status" check ("status" in ('draft', 'pending-issue', 'issued', 'received', 'verified', 'exception', 'closed'));`);
        this.addSql(`alter table "poms"."invoice_record" add constraint "chk_invoice_record_exception_status" check ("exception_status" in ('none', 'open', 'resolved'));`);
        this.addSql(`alter table "poms"."expense_record" add constraint "chk_expense_record_expense_category" check ("expense_category" in ('travel', 'onsite-service', 'deployment-logistics', 'temporary-spend', 'misc'));`);
        this.addSql(`alter table "poms"."expense_record" add constraint "chk_expense_record_source_type" check ("source_type" in ('manual', 'reimbursement', 'import'));`);
        this.addSql(`alter table "poms"."expense_record" add constraint "chk_expense_record_status" check ("status" in ('draft', 'recorded', 'confirmed', 'voided'));`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."expense_record" drop constraint if exists "chk_expense_record_status";`);
        this.addSql(`alter table "poms"."expense_record" drop constraint if exists "chk_expense_record_source_type";`);
        this.addSql(`alter table "poms"."expense_record" drop constraint if exists "chk_expense_record_expense_category";`);
        this.addSql(`alter table "poms"."invoice_record" drop constraint if exists "chk_invoice_record_exception_status";`);
        this.addSql(`alter table "poms"."invoice_record" drop constraint if exists "chk_invoice_record_status";`);
        this.addSql(`alter table "poms"."invoice_record" drop constraint if exists "chk_invoice_record_invoice_type";`);
        this.addSql(`alter table "poms"."payment_record" drop constraint if exists "chk_payment_record_status";`);
        this.addSql(`alter table "poms"."payable_record" drop constraint if exists "chk_payable_record_status";`);
        this.addSql(`alter table "poms"."receipt_record" drop constraint if exists "chk_receipt_record_status";`);
        this.addSql(`alter table "poms"."contract_term_snapshot" drop constraint if exists "chk_contract_term_snapshot_status";`);
        this.addSql(`alter table "poms"."contract" drop constraint if exists "chk_contract_status";`);
    }
}
