import { Migration } from '@mikro-orm/migrations';

export class Migration20260419120000_ex14d_retention_due_fact_source extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."contract" add column "retention_due_date" date null;`);
        this.addSql(`comment on column "poms"."contract"."retention_due_date" is '质保期届满日期';`);

        this.addSql(`alter table "poms"."contract_term_snapshot" add column "retention_due_date" date null;`);
        this.addSql(`comment on column "poms"."contract_term_snapshot"."retention_due_date" is '质保期届满日期';`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."contract_term_snapshot" drop column if exists "retention_due_date";`);
        this.addSql(`alter table "poms"."contract" drop column if exists "retention_due_date";`);
    }
}
