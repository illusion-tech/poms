import { Migration } from '@mikro-orm/migrations';

export class Migration20261118010000_commission_supplement_approval_scope extends Migration {
    override async up(): Promise<void> {
        this.addSql('alter table poms.commission_adjustment add column source_contract_scope jsonb null, add column approved_contract_allocations jsonb null;');
    }
    override async down(): Promise<void> {
        this.addSql(`do $$ begin
            if exists(select 1 from poms.commission_adjustment where source_contract_scope is not null or approved_contract_allocations is not null)
            then raise exception 'supplement approval evidence must be preserved'; end if;
        end $$;`);
        this.addSql('alter table poms.commission_adjustment drop column source_contract_scope, drop column approved_contract_allocations;');
    }
}
