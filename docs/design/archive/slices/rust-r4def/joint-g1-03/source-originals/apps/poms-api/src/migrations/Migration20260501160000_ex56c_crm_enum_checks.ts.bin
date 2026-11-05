import { Migration } from '@mikro-orm/migrations';

export class Migration20260501160000_ex56c_crm_enum_checks extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."customer_alias" drop constraint if exists "chk_customer_alias_type";`);
        this.addSql(
            `alter table "poms"."customer_alias" add constraint "chk_customer_alias_type" check ("alias_type" in ('legal_name', 'short_name', 'legacy_input', 'import_name', 'alias'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."customer_alias" drop constraint if exists "chk_customer_alias_type";`);
    }
}
