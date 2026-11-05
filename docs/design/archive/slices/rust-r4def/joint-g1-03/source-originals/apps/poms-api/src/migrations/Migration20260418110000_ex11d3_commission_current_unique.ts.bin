import { Migration } from '@mikro-orm/migrations';

export class Migration20260418110000_ex11d3_commission_current_unique extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create unique index "uq_commission_role_assignment_project_current"
            on "poms"."commission_role_assignment" ("project_id")
            where "is_current" = true;
        `);
        this.addSql(`
            create unique index "uq_commission_calculation_project_current"
            on "poms"."commission_calculation" ("project_id")
            where "is_current" = true;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."uq_commission_calculation_project_current";`);
        this.addSql(`drop index if exists "poms"."uq_commission_role_assignment_project_current";`);
    }
}
