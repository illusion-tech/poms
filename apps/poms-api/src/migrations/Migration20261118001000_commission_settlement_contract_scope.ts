import { Migration } from '@mikro-orm/migrations';

export class Migration20261118001000_commission_settlement_contract_scope extends Migration {
    override async up(): Promise<void> {
        this.addSql('alter table poms.commission_final_settlement_snapshot add column source_contract_scope jsonb null, add column retention_receipt_ids jsonb null;');
    }
    override async down(): Promise<void> {
        this.addSql(`do $$ begin
            if exists(select 1 from poms.commission_final_settlement_snapshot where source_contract_scope is not null or retention_receipt_ids is not null)
            then raise exception 'settlement contract and receipt evidence must be preserved'; end if;
        end $$;`);
        this.addSql('alter table poms.commission_final_settlement_snapshot drop column source_contract_scope, drop column retention_receipt_ids;');
    }
}
