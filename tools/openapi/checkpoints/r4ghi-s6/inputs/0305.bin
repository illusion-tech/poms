import { Migration } from '@mikro-orm/migrations';

export class Migration20260418195000_ex14a_rule_explanation_parent_fk_delete_rule extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "poms"."commission_rule_explanation_snapshot"
            drop constraint if exists "cres_final_settlement_snapshot_fk";
        `);
        this.addSql(`
            alter table "poms"."commission_rule_explanation_snapshot"
            add constraint "cres_final_settlement_snapshot_fk"
            foreign key ("final_settlement_snapshot_id")
            references "poms"."commission_final_settlement_snapshot" ("id")
            on update cascade on delete cascade;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "poms"."commission_rule_explanation_snapshot"
            drop constraint if exists "cres_final_settlement_snapshot_fk";
        `);
        this.addSql(`
            alter table "poms"."commission_rule_explanation_snapshot"
            add constraint "cres_final_settlement_snapshot_fk"
            foreign key ("final_settlement_snapshot_id")
            references "poms"."commission_final_settlement_snapshot" ("id")
            on update cascade;
        `);
    }
}
