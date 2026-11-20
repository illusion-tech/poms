import { Migration } from '@mikro-orm/migrations';

export class Migration20260412174000_add_invoice_source_current_unique extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`
      create unique index "uq_project_actual_cost_record_invoice_source_current"
      on "poms"."project_actual_cost_record" ("source_type", "source_id")
      where "cost_type" = 'INVOICE'
        and "record_status" in ('CONFIRMED', 'INCLUDED')
        and "source_type" is not null
        and "source_id" is not null;
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "poms"."uq_project_actual_cost_record_invoice_source_current";`);
  }

}
