import { Migration } from '@mikro-orm/migrations';

export class Migration20260415131000_ex08b3b0_rebaseline_amendment_fk extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "poms"."contract_handover_rebaseline_record" add constraint "contract_handover_rebaseline_record_contract_amendment_id_forei" foreign key ("contract_amendment_id") references "poms"."contract_amendment" ("id") on update cascade on delete restrict;`
        );
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."contract_amendment_id" is '合同变更版本 ID';`);
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "poms"."contract_handover_rebaseline_record" drop constraint if exists "contract_handover_rebaseline_record_contract_amendment_id_forei";`
        );
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."contract_amendment_id" is '合同变更版本 ID（FK 待合同变更表落地后补齐）';`);
    }
}
