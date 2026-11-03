import { Migration } from '@mikro-orm/migrations';

export class Migration20260418194500_ex14a_nullable_reference_fk_rules extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            drop constraint if exists "cfss_departure_exception_fk";
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            drop constraint if exists "cfss_retention_receipt_fk";
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_departure_exception_fk"
            foreign key ("departure_exception_decision_id")
            references "poms"."commission_departure_exception_decision" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_retention_receipt_fk"
            foreign key ("retention_receipt_record_id")
            references "poms"."receipt_record" ("id")
            on update cascade on delete set null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            drop constraint if exists "cfss_departure_exception_fk";
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            drop constraint if exists "cfss_retention_receipt_fk";
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_departure_exception_fk"
            foreign key ("departure_exception_decision_id")
            references "poms"."commission_departure_exception_decision" ("id")
            on update cascade;
        `);
        this.addSql(`
            alter table "poms"."commission_final_settlement_snapshot"
            add constraint "cfss_retention_receipt_fk"
            foreign key ("retention_receipt_record_id")
            references "poms"."receipt_record" ("id")
            on update cascade;
        `);
    }
}
