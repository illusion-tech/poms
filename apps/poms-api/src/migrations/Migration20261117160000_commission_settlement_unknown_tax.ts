import { Migration } from '@mikro-orm/migrations';

export class Migration20261117160000_commission_settlement_unknown_tax extends Migration {
    override async up(): Promise<void> {
        this.addSql('alter table "poms"."commission_final_settlement_snapshot" alter column "tax_impact_pending_amount" drop not null, alter column "tax_impact_pending_amount" drop default;');
        this.addSql('comment on column "poms"."commission_final_settlement_snapshot"."tax_impact_pending_amount" is \'待闭合税务影响金额；NULL表示未知，不等同于零\';');
    }

    override async down(): Promise<void> {
        // PostgreSQL refuses this atomically while unknown values exist.
        // A rollback must never manufacture a zero for an unknown amount.
        this.addSql('alter table "poms"."commission_final_settlement_snapshot" alter column "tax_impact_pending_amount" set not null, alter column "tax_impact_pending_amount" set default 0;');
        this.addSql('comment on column "poms"."commission_final_settlement_snapshot"."tax_impact_pending_amount" is \'待闭合税务影响金额\';');
    }
}
