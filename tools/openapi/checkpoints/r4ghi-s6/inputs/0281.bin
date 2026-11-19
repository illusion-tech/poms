import { Migration } from '@mikro-orm/migrations';

export class Migration20260412233000_add_procurement_source_current_unique extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create unique index "uq_project_actual_cost_record_procurement_source_current"
      on "poms"."project_actual_cost_record" ("source_type", "source_id")
      where "cost_type" = 'PROCUREMENT'
        and "record_status" in ('REGISTERED', 'CONFIRMED', 'INCLUDED')
        and "source_type" is not null
        and "source_id" is not null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "poms"."uq_project_actual_cost_record_procurement_source_current";`);
  }
}
