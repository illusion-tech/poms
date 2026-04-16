import { Migration } from '@mikro-orm/migrations';

export class Migration20260416111000_ex08d1_project_rebaseline_effective_unique extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create unique index "uq_chrr_project_effective"
            on "poms"."contract_handover_rebaseline_record" ("project_id")
            where "status" = 'effective';
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."uq_chrr_project_effective";`);
    }
}
