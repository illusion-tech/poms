import { Migration } from '@mikro-orm/migrations';

export class Migration20260416110000_ex07d3_tax_treatment_active_unique extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create unique index "uq_atts_project_type_active"
            on "poms"."accounting_tax_treatment_snapshot" ("project_id", "tax_treatment_type")
            where "status" = 'active';
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."uq_atts_project_type_active";`);
    }
}
