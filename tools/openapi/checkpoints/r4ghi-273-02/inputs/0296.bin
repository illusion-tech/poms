import { Migration } from '@mikro-orm/migrations';

export class Migration20260416130000_ex09a_commission_freeze_chain extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            'alter table "poms"."commission_role_assignment" add column "source_handover_id" uuid null, add column "source_handover_rebaseline_record_id" uuid null, add column "contract_summary_snapshot_id" uuid null, add column "handover_summary_snapshot_id" uuid null, add column "effective_handover_baseline_snapshot_id" uuid null;'
        );
        this.addSql(
            'alter table "poms"."commission_role_assignment" add constraint "cra_source_handover_fk" foreign key ("source_handover_id") references "poms"."project_handover" ("id") on update cascade on delete restrict;'
        );
        this.addSql(
            'alter table "poms"."commission_role_assignment" add constraint "cra_source_handover_rebaseline_fk" foreign key ("source_handover_rebaseline_record_id") references "poms"."contract_handover_rebaseline_record" ("id") on update cascade on delete restrict;'
        );
        this.addSql(
            'alter table "poms"."commission_role_assignment" add constraint "cra_contract_summary_snapshot_fk" foreign key ("contract_summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id") on update cascade on delete restrict;'
        );
        this.addSql(
            'alter table "poms"."commission_role_assignment" add constraint "cra_handover_summary_snapshot_fk" foreign key ("handover_summary_snapshot_id") references "poms"."approval_summary_snapshot" ("id") on update cascade on delete restrict;'
        );
        this.addSql(
            'alter table "poms"."commission_role_assignment" add constraint "cra_effective_handover_baseline_fk" foreign key ("effective_handover_baseline_snapshot_id") references "poms"."contract_term_snapshot" ("id") on update cascade on delete restrict;'
        );

        this.addSql('create index "idx_cra_source_handover" on "poms"."commission_role_assignment" ("source_handover_id");');
        this.addSql(
            'create index "idx_cra_source_handover_rebaseline" on "poms"."commission_role_assignment" ("source_handover_rebaseline_record_id");'
        );
        this.addSql(
            'create index "idx_cra_handover_summary_snapshot" on "poms"."commission_role_assignment" ("handover_summary_snapshot_id");'
        );
        this.addSql('create index "idx_cra_supersedes" on "poms"."commission_role_assignment" ("supersedes_id");');
    }

    override async down(): Promise<void> {
        this.addSql('drop index if exists "poms"."idx_cra_supersedes";');
        this.addSql('drop index if exists "poms"."idx_cra_handover_summary_snapshot";');
        this.addSql('drop index if exists "poms"."idx_cra_source_handover_rebaseline";');
        this.addSql('drop index if exists "poms"."idx_cra_source_handover";');

        this.addSql('alter table "poms"."commission_role_assignment" drop constraint if exists "cra_effective_handover_baseline_fk";');
        this.addSql('alter table "poms"."commission_role_assignment" drop constraint if exists "cra_handover_summary_snapshot_fk";');
        this.addSql('alter table "poms"."commission_role_assignment" drop constraint if exists "cra_contract_summary_snapshot_fk";');
        this.addSql('alter table "poms"."commission_role_assignment" drop constraint if exists "cra_source_handover_rebaseline_fk";');
        this.addSql('alter table "poms"."commission_role_assignment" drop constraint if exists "cra_source_handover_fk";');

        this.addSql(
            'alter table "poms"."commission_role_assignment" drop column "source_handover_id", drop column "source_handover_rebaseline_record_id", drop column "contract_summary_snapshot_id", drop column "handover_summary_snapshot_id", drop column "effective_handover_baseline_snapshot_id";'
        );
    }
}
