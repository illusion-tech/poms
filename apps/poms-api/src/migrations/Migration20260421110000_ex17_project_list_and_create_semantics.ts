import { Migration } from '@mikro-orm/migrations';

export class Migration20260421110000_ex17_project_list_and_create_semantics extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."project" add column "customer_name" varchar(255) null;`);
        this.addSql(`comment on column "poms"."project"."customer_name" is '客户名称';`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."project" drop column if exists "customer_name";`);
    }
}
