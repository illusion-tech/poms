import { Migration } from '@mikro-orm/migrations';

export class Migration20260425113000_ex32_project_source_lead extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."project" add column "source_lead_id" uuid null;`);
        this.addSql(`comment on column "poms"."project"."source_lead_id" is '项目来源线索标识';`);
        this.addSql(
            `alter table "poms"."project" add constraint "project_source_lead_id_foreign" foreign key ("source_lead_id") references "poms"."lead" ("id") on update cascade on delete restrict;`
        );
        this.addSql(`create index "idx_project_source_lead_id" on "poms"."project" ("source_lead_id");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "poms"."idx_project_source_lead_id";`);
        this.addSql(`alter table "poms"."project" drop constraint if exists "project_source_lead_id_foreign";`);
        this.addSql(`alter table "poms"."project" drop column if exists "source_lead_id";`);
    }
}
