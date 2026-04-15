import { Migration } from '@mikro-orm/migrations';

export class Migration20260415142000_ex08b3b1_rebaseline_project_chain extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."contract_handover_rebaseline_record" add column "project_id" uuid null;`);
        this.addSql(`
            update "poms"."contract_handover_rebaseline_record" chrr
            set "project_id" = c."project_id"
            from "poms"."contract_amendment" ca
            inner join "poms"."contract" c on c."id" = ca."contract_id"
            where chrr."contract_amendment_id" = ca."id";
        `);
        this.addSql(`alter table "poms"."contract_handover_rebaseline_record" alter column "project_id" set not null;`);
        this.addSql(`comment on column "poms"."contract_handover_rebaseline_record"."project_id" is '项目 ID';`);
        this.addSql(`
            alter table "poms"."contract_handover_rebaseline_record"
            add constraint "contract_handover_rebaseline_record_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`create index "idx_chrr_project_handled" on "poms"."contract_handover_rebaseline_record" ("project_id", "handled_at" desc);`);
        this.addSql(`create index "idx_chrr_project_status" on "poms"."contract_handover_rebaseline_record" ("project_id", "status");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."idx_chrr_project_status";`);
        this.addSql(`drop index if exists "poms"."idx_chrr_project_handled";`);
        this.addSql(`alter table "poms"."contract_handover_rebaseline_record" drop constraint if exists "contract_handover_rebaseline_record_project_id_foreign";`);
        this.addSql(`alter table "poms"."contract_handover_rebaseline_record" drop column if exists "project_id";`);
    }
}
